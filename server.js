const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const sessions = new Map();
const attempts = new Map();
const allowedOrigins = new Set((process.env.SYNC_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean));
let mutationQueue = Promise.resolve();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json'
};

async function readStore() {
  try {
    return JSON.parse(await fs.readFile(STORE_FILE, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { profiles: {} };
    throw error;
  }
}

async function writeStore(store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${STORE_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(store, null, 2));
  await fs.rename(tempFile, STORE_FILE);
}

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(JSON.stringify(body));
}

async function bodyJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 6_000_000) throw new Error('PAYLOAD_TOO_LARGE');
  }
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw new Error('INVALID_JSON');
  }
}

function normalizeProfileId(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function hashPin(pin, salt) {
  return crypto.pbkdf2Sync(pin, salt, 120_000, 32, 'sha256').toString('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(a || '', 'hex');
  const right = Buffer.from(b || '', 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function cookieMap(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value)
  );
}

function sessionProfile(req) {
  const token = requestToken(req);
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  return session.profileId;
}

function requestToken(req) {
  const bearer = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  return bearer ? bearer[1] : cookieMap(req).learn_session;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((stamp) => now - stamp < 10 * 60 * 1000);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length <= 20;
}

function validProgress(progress) {
  return progress && typeof progress === 'object' && !Array.isArray(progress) &&
    JSON.stringify(progress).length <= 5_000_000;
}

function mergeProgress(base, incoming) {
  if (!base) return incoming;
  const mergedMastered = { ...(base.mastered || {}) };
  for (const [key, value] of Object.entries(incoming.mastered || {})) {
    const existing = mergedMastered[key];
    const existingTime = new Date(existing?.lastReviewed || existing?.learnedAt || 0).getTime();
    const incomingTime = new Date(value?.lastReviewed || value?.learnedAt || 0).getTime();
    if (!existing || incomingTime >= existingTime) mergedMastered[key] = value;
  }
  const mergedActivity = { ...(base.activity || {}) };
  for (const [date, value] of Object.entries(incoming.activity || {})) {
    mergedActivity[date] = Math.max(mergedActivity[date] || 0, Number(value) || 0);
  }
  const history = [...(base.reviewHistory || []), ...(incoming.reviewHistory || [])];
  const uniqueHistory = Array.from(new Map(history.map((item) => [`${item.key}:${item.grade}:${item.at}`, item])).values()).slice(-500);
  return {
    ...base,
    ...incoming,
    mastered: mergedMastered,
    completed: Array.from(new Set([...(base.completed || []), ...(incoming.completed || [])])),
    activity: mergedActivity,
    reviewHistory: uniqueHistory,
    startedAt: new Date(base.startedAt || Date.now()) < new Date(incoming.startedAt || Date.now()) ? base.startedAt : incoming.startedAt
  };
}

function newerSimpleRecord(left, right) {
  if (!left) return right;
  if (!right) return left;
  const leftTime = new Date(left.updatedAt || left.at || 0).getTime();
  const rightTime = new Date(right.updatedAt || right.at || 0).getTime();
  return rightTime >= leftTime ? right : left;
}

function mergeSimpleDailyEntry(base = {}, incoming = {}) {
  const answers = { ...(base.answers || {}) };
  for (const [id, answer] of Object.entries(incoming.answers || {})) {
    answers[id] = newerSimpleRecord(answers[id], answer);
  }
  const learned = new Set([...(base.learned || []), ...(incoming.learned || [])]);
  const again = new Set([...(base.again || []), ...(incoming.again || [])]);
  const reviewed = new Set([...(base.reviewed || []), ...(incoming.reviewed || [])]);
  for (const [id, answer] of Object.entries(answers)) {
    if (answer.result === 'known') {
      learned.add(id);
      again.delete(id);
    } else if (answer.result === 'again') {
      again.add(id);
    } else if (answer.result === 'failed') {
      learned.delete(id);
      reviewed.delete(id);
      again.add(id);
    }
  }
  const newer = newerSimpleRecord(base, incoming) || incoming;
  return {
    ...base,
    ...incoming,
    words: newer.words?.length ? newer.words : (base.words || incoming.words || []),
    newWords: newer.newWords?.length ? newer.newWords : (base.newWords || incoming.newWords || []),
    learned: Array.from(learned),
    again: Array.from(again),
    reviewed: Array.from(reviewed),
    difficult: Array.from(new Set([...(base.difficult || []), ...(incoming.difficult || [])])),
    answers,
    updatedAt: newer.updatedAt || new Date().toISOString()
  };
}

function mergeSimpleProgress(base, incoming) {
  if (!base) return incoming;
  const daily = { ...(base.daily || {}) };
  for (const [date, entry] of Object.entries(incoming.daily || {})) {
    daily[date] = mergeSimpleDailyEntry(daily[date], entry);
  }
  const cards = { ...(base.cards || {}) };
  for (const [id, card] of Object.entries(incoming.cards || {})) {
    cards[id] = newerSimpleRecord(cards[id], card);
  }
  const recalls = { ...(base.recalls || {}) };
  for (const [id, recall] of Object.entries(incoming.recalls || {})) {
    recalls[id] = newerSimpleRecord(recalls[id], recall);
  }
  const exampleHistory = Array.from(new Set([...(base.exampleHistory || []), ...(incoming.exampleHistory || [])]));
  return { ...base, ...incoming, version: Math.max(base.version || 1, incoming.version || 1), daily, cards, recalls, exampleHistory };
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/health') return json(res, 200, { service: 'vocab-sync', version: 1 });
  if (req.method === 'POST' && pathname === '/api/auth') {
    const ip = req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) return json(res, 429, { error: 'Thử lại sau 10 phút.' });
    const body = await bodyJson(req);
    const profileId = normalizeProfileId(body.profileId);
    const pin = String(body.pin || '');
    const displayName = String(body.displayName || 'Bạn').trim().slice(0, 40);
    if (profileId.length < 4 || pin.length < 4 || pin.length > 64) {
      return json(res, 400, { error: 'Mã hồ sơ và PIN cần có ít nhất 4 ký tự.' });
    }
    const store = await readStore();
    let profile = store.profiles[profileId];
    if (!profile) {
      const salt = crypto.randomBytes(16).toString('hex');
      profile = {
        displayName,
        salt,
        pinHash: hashPin(pin, salt),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        progress: null
      };
      store.profiles[profileId] = profile;
      await writeStore(store);
    } else if (!safeEqual(profile.pinHash, hashPin(pin, profile.salt))) {
      return json(res, 401, { error: 'PIN không đúng.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { profileId, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return json(res, 200, {
      profileId,
      token,
      displayName: profile.displayName,
      createdAt: profile.createdAt,
      progress: profile.progress
    }, { 'Set-Cookie': `learn_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure}` });
  }

  if (req.method === 'POST' && pathname === '/api/logout') {
    const token = requestToken(req);
    if (token) sessions.delete(token);
    return json(res, 200, { ok: true }, {
      'Set-Cookie': 'learn_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
    });
  }

  if (req.method === 'GET' && pathname === '/api/progress') {
    const profileId = sessionProfile(req);
    if (!profileId) return json(res, 401, { error: 'Chưa đăng nhập.' });
    const profile = (await readStore()).profiles[profileId];
    if (!profile) return json(res, 404, { error: 'Không tìm thấy hồ sơ.' });
    return json(res, 200, {
      profileId,
      displayName: profile.displayName,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      progress: profile.progress
    });
  }

  if (req.method === 'GET' && pathname === '/api/simple-progress') {
    const profileId = sessionProfile(req);
    if (!profileId) return json(res, 401, { error: 'Chưa đăng nhập.' });
    const profile = (await readStore()).profiles[profileId];
    if (!profile) return json(res, 404, { error: 'Không tìm thấy hồ sơ.' });
    return json(res, 200, { progress: profile.simpleProgress || null, updatedAt: profile.updatedAt });
  }

  if (req.method === 'PUT' && pathname === '/api/progress') {
    const profileId = sessionProfile(req);
    if (!profileId) return json(res, 401, { error: 'Chưa đăng nhập.' });
    const body = await bodyJson(req);
    if (!validProgress(body.progress)) return json(res, 400, { error: 'Dữ liệu tiến độ không hợp lệ.' });
    const store = await readStore();
    const profile = store.profiles[profileId];
    if (!profile) return json(res, 404, { error: 'Không tìm thấy hồ sơ.' });
    profile.progress = mergeProgress(profile.progress, body.progress);
    profile.updatedAt = new Date().toISOString();
    await writeStore(store);
    return json(res, 200, { ok: true, updatedAt: profile.updatedAt, progress: profile.progress });
  }

  if (req.method === 'PUT' && pathname === '/api/simple-progress') {
    const profileId = sessionProfile(req);
    if (!profileId) return json(res, 401, { error: 'Chưa đăng nhập.' });
    const body = await bodyJson(req);
    if (!validProgress(body.progress)) return json(res, 400, { error: 'Dữ liệu tiến độ không hợp lệ.' });
    const store = await readStore();
    const profile = store.profiles[profileId];
    if (!profile) return json(res, 404, { error: 'Không tìm thấy hồ sơ.' });
    profile.simpleProgress = mergeSimpleProgress(profile.simpleProgress, body.progress);
    profile.updatedAt = new Date().toISOString();
    await writeStore(store);
    return json(res, 200, { ok: true, progress: profile.simpleProgress, updatedAt: profile.updatedAt });
  }

  return json(res, 404, { error: 'Không tìm thấy API.' });
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${requested}`);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`) && filePath !== path.join(PUBLIC_DIR, 'index.html')) {
    return json(res, 403, { error: 'Forbidden' });
  }
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const immutable = /icon-\d+\.svg$/.test(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': immutable ? 'public, max-age=86400' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self' https://www.gstatic.com; img-src 'self' data: https://*.googleusercontent.com; connect-src 'self' https://api.tatoeba.org https://*.googleapis.com https://*.firebaseio.com https://*.firebasedatabase.app; frame-src https://*.firebaseapp.com; media-src 'self'; manifest-src 'self'"
    });
    res.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return json(res, 404, { error: 'Không tìm thấy tệp.' });
    }
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      const origin = req.headers.origin;
      const sameOrigin = origin === `http://${req.headers.host}` || origin === `https://${req.headers.host}`;
      if (origin && !sameOrigin) {
        if (!allowedOrigins.has(origin)) return json(res, 403, { error: 'Máy chủ chưa cho phép kết nối từ trang này.' });
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (['POST', 'PUT'].includes(req.method)) {
        // Serialize read/merge/write operations so simultaneous devices cannot overwrite each other.
        const operation = mutationQueue.then(() => handleApi(req, res, url.pathname));
        mutationQueue = operation.catch(() => {});
        return await operation;
      }
      return await handleApi(req, res, url.pathname);
    }
    return await serveStatic(req, res, decodeURIComponent(url.pathname));
  } catch (error) {
    const status = error.message === 'PAYLOAD_TOO_LARGE' ? 413 : error.message === 'INVALID_JSON' ? 400 : 500;
    console.error(error);
    return json(res, status, { error: status === 413 ? 'Dữ liệu quá lớn.' : 'Máy chủ gặp lỗi.' });
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`English Flow đang chạy tại http://localhost:${PORT}`);
  });
}

module.exports = { server, normalizeProfileId, hashPin, mergeProgress, mergeSimpleProgress };
