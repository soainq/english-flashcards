const test = require('node:test');
const assert = require('node:assert/strict');
const Recall = require('../public/simple/learning');
const Examples = require('../public/simple/examples');
const Sync = require('../public/api-client');
const { mergeSimpleProgress } = require('../server');

test('recall accepts case and whitespace without accepting wrong spelling', () => {
  assert.equal(Recall.submit({}, '  WAKE   UP ', 'wake up', '2026-01-01').passedAt, '2026-01-01');
  assert.equal(Recall.submit({}, 'wakeup', 'wake up').attempts, 1);
  assert.equal(Recall.submit({}, '  ', 'wake up').attempts, undefined);
  assert.equal(Recall.mask('wake up'), '____ __');
  assert.equal(Recall.mask('trade-off'), '_____-___');
});

test('three errors require relearning, including after serialization/reload', () => {
  let record = {};
  for (let i = 1; i <= 3; i++) {
    record = Recall.submit(JSON.parse(JSON.stringify(record)), 'wrong', 'cat');
    assert.equal(record.attempts, i);
  }
  assert.equal(record.needsStudy, true);
  assert.deepEqual(Recall.submit(record, 'cat', 'cat'), record);
  record = Recall.restudied(record);
  assert.equal(record.needsStudy, false);
  assert.ok(Recall.submit(record, 'cat', 'cat').passedAt);
});

test('sync unions example history and does not resurrect a failed test from an older device', () => {
  const id = 'word:1';
  const old = { daily: { '2026-09-29': { learned: [id], reviewed: [id], answers: { [id]: { result: 'known', at: '2026-09-29T10:00:00Z' } } } },
    recalls: { [id]: { attempts: 0, updatedAt: '2026-09-29T10:00:00Z' } }, exampleHistory: ['a', 'b'] };
  const failed = { daily: { '2026-09-29': { learned: [], reviewed: [], answers: { [id]: { result: 'failed', at: '2026-09-29T11:00:00Z' } } } },
    recalls: { [id]: { attempts: 3, needsStudy: true, updatedAt: '2026-09-29T11:00:00Z' } }, exampleHistory: ['b', 'c'] };
  for (const merged of [mergeSimpleProgress(old, failed), mergeSimpleProgress(failed, old)]) {
    assert.deepEqual(merged.daily['2026-09-29'].learned, []);
    assert.deepEqual(merged.daily['2026-09-29'].reviewed, []);
    assert.equal(merged.recalls[id].needsStudy, true);
    assert.deepEqual(merged.exampleHistory.sort(), ['a', 'b', 'c']);
  }
});

test('HTML responses and malformed JSON become useful errors', async () => {
  await assert.rejects(Sync.readJSON(new Response('<html>Oops', { status: 404, headers: { 'content-type': 'text/html' } })), /GitHub Pages/);
  await assert.rejects(Sync.readJSON(new Response('<html>Oops', { headers: { 'content-type': 'application/json' } })), /GitHub Pages/);
  await assert.rejects(Sync.readJSON(new Response('{', { headers: { 'content-type': 'application/json' } })), /không hợp lệ/);
  await assert.rejects(Sync.readJSON(new Response('{"error":"PIN không đúng."}', { status: 401, headers: { 'content-type': 'application/json' } })), /PIN không đúng/);
  assert.throws(() => Sync.serverOrigin('https://user:secret@example.com/'), /địa chỉ gốc/);
  assert.throws(() => Sync.serverOrigin('http://example.com/'), /HTTPS/);
  assert.equal(Sync.serverOrigin('https://example.com'), 'https://example.com');
});

const item = { id: 'cat', word: 'cat', examples: [] };
const corpus = Array.from({ length: 9 }, (_, index) => ({ id: index + 1, text: `The cat sleeps beside window ${index + 1}.`, lang: 'eng', owner: 'author', license: 'CC BY 2.0 FR', translations: [] }));
function storage() { const values = new Map(); return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) }; }

test('examples are random, never repeated across reloads, and never recycled when exhausted', async () => {
  const local = storage(); let history = [];
  const options = { storage: local, items: [item], seen: () => history, remember: (rows) => { history.push(...rows); },
    fetcher: async () => Response.json({ data: corpus, paging: { next: null } }), random: () => 0.3 };
  for (let batch = 0; batch < 3; batch++) {
    const bank = Examples.create(options);
    const result = await bank.get(item);
    assert.equal(result.rows.length, 3);
    bank.commit(result.rows);
    assert.equal(new Set(history).size, (batch + 1) * 3);
  }
  const exhausted = await Examples.create(options).get(item);
  assert.equal(exhausted.rows.length, 0);
  assert.equal(exhausted.exhausted, true);
});

test('examples follow pagination and retain a safe offline fallback', async () => {
  let calls = 0; let history = corpus.slice(0, 6).map((row) => Examples.canonical(row.text));
  const next = 'https://api.tatoeba.org/v1/sentences?lang=eng&sort=relevance&after=abc';
  const bank = Examples.create({ storage: storage(), items: [item], seen: () => history, remember: () => {},
    fetcher: async (url) => { calls++; return Response.json({ data: calls === 1 ? corpus.slice(0, 6) : corpus.slice(6), paging: { next: calls === 1 ? next : null } }); } });
  assert.equal((await bank.get(item)).rows.length, 3);
  assert.equal(calls, 2);
  assert.equal(Examples.safeNext('https://evil.example/api'), null);
  const offline = Examples.create({ storage: storage(), items: [{ ...item, examples: ['The cat is hiding under the bed.'] }], seen: () => [], remember: () => {}, fetcher: async () => { throw new Error('offline'); } });
  const result = await offline.get(item);
  assert.equal(result.rows.length, 1);
  assert.equal(result.offline, true);
});

test('old word substitution templates and partial word matches are excluded', () => {
  const words = ['cat', 'dog', 'cow'].map((word) => ({ id: word, word, examples: [`I can see a ${word}.`] }));
  assert.equal(Examples.localPools(words).get('cat').length, 0);
  assert.equal(Examples.containsWord('The cathedral is old.', 'cat'), false);
  assert.equal(Examples.containsWord('I wake up early.', 'wake up'), true);
  assert.equal(Examples.fromResponse({ data: [{ id: 1, lang: 'eng', text: 'The cathedral is old.' }] }, 'cat').length, 0);
});
