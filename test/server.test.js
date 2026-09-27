const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = path.join(os.tmpdir(), `fluent-test-${process.pid}`);
const { server, normalizeProfileId, mergeProgress, mergeSimpleProgress } = require('../server');

test('normalizes a Vietnamese profile id safely', () => {
  assert.equal(normalizeProfileId('  Ánh UI/UX  '), 'anh-ui-ux');
  assert.equal(normalizeProfileId('../../bad'), 'bad');
});

test('merges learning progress without dropping work from another device', () => {
  const merged = mergeProgress(
    { mastered: { '0:0': { box: 1, learnedAt: '2026-01-01' } }, completed: [0], activity: { '2026-01-01': 1 } },
    { mastered: { '0:1': { box: 0, learnedAt: '2026-01-02' } }, completed: [1], activity: { '2026-01-01': 2 } }
  );
  assert.deepEqual(Object.keys(merged.mastered).sort(), ['0:0', '0:1']);
  assert.deepEqual(merged.completed, [0, 1]);
  assert.equal(merged.activity['2026-01-01'], 2);
});

test('ships a real audio file instead of relying on browser speech', async () => {
  const audioDirectory = path.join(__dirname, '..', 'public', 'audio');
  const files = await fs.readdir(audioDirectory, { recursive: true });
  assert.ok(files.filter((file) => file.endsWith('.mp3')).length >= 550);
  const audio = path.join(audioDirectory, '1-1-sentence.mp3');
  const stat = await fs.stat(audio);
  assert.ok(stat.size > 5_000);
  const themedAudio = await fs.stat(path.join(audioDirectory, 'themes', 'animals-1-1.mp3'));
  assert.ok(themedAudio.size > 2_000);
});

test('builds four weekly topics with seven ten-word daily groups', () => {
  global.window = {};
  require('../public/content.js');
  require('../public/simple/curriculum.js');
  require('../public/simple/content.js');
  assert.equal(window.SIMPLE_CONTENT.topics.length, 34);
  assert.equal(window.SIMPLE_CONTENT.curriculum.length, 4);
  assert.ok(window.SIMPLE_CONTENT.curriculum.every((topic) => topic.days.length === 7));
  assert.ok(window.SIMPLE_CONTENT.curriculum.every((topic) => topic.days.every((day) => day.words.length === 10)));
  assert.equal(window.SIMPLE_CONTENT.basic.length, 310);
  assert.equal(window.SIMPLE_CONTENT.uiux.length, 70);
  assert.equal(window.SIMPLE_CONTENT.all.length, 380);
  assert.ok(window.SIMPLE_CONTENT.all.every((item) => item.examples.length === 3));
  delete global.window;
});

test('adds open-data topics with complete meanings and pronunciation', () => {
  global.window = {};
  require('../public/simple/open-vocabulary.js');
  assert.equal(window.OPEN_VOCABULARY.curriculum.length, 2);
  assert.ok(window.OPEN_VOCABULARY.curriculum.every((topic) => topic.days.length === 7));
  const words = window.OPEN_VOCABULARY.curriculum.flatMap((topic) => topic.days.flatMap((day) => day.words));
  assert.equal(words.length, 140);
  assert.ok(words.every((word) => word.meaning && word.ipa && word.examples.length >= 3));
  delete global.window;
});

test('merges learned cards from two devices in the same week', () => {
  const merged = mergeSimpleProgress(
    { daily: { '2026-09-21': { words: ['0:0', '0:1'], learned: ['0:0'] } } },
    { daily: { '2026-09-21': { words: ['0:0', '0:1'], learned: ['0:1'] } } }
  );
  assert.deepEqual(merged.daily['2026-09-21'].learned.sort(), ['0:0', '0:1']);
});

test('keeps learned progress when a word is temporarily skipped', () => {
  const merged = mergeSimpleProgress(
    {
      version: 2,
      daily: {
        '2026-09-27': {
          learned: ['word:1'],
          again: [],
          answers: { 'word:1': { result: 'known', at: '2026-09-27T08:00:00.000Z' } }
        }
      }
    },
    {
      version: 2,
      daily: {
        '2026-09-27': {
          learned: [],
          again: ['word:1'],
          answers: { 'word:1': { result: 'again', at: '2026-09-27T08:01:00.000Z' } }
        }
      }
    }
  );
  assert.deepEqual(merged.daily['2026-09-27'].learned, ['word:1']);
  assert.deepEqual(merged.daily['2026-09-27'].again, ['word:1']);
});

test('merges completed review cards from multiple devices', () => {
  const merged = mergeSimpleProgress(
    { daily: { '2026-09-27': { reviewed: ['word:1'] } } },
    { daily: { '2026-09-27': { reviewed: ['word:2'] } } }
  );
  assert.deepEqual(merged.daily['2026-09-27'].reviewed.sort(), ['word:1', 'word:2']);
});

test('keeps the newest flashcard review schedule across devices', () => {
  const merged = mergeSimpleProgress(
    { version: 2, daily: {}, cards: { 'word:1': { nextReview: '2026-09-28', updatedAt: '2026-09-27T08:00:00.000Z' } } },
    { version: 2, daily: {}, cards: { 'word:1': { nextReview: '2026-09-30', updatedAt: '2026-09-27T09:00:00.000Z' } } }
  );
  assert.equal(merged.cards['word:1'].nextReview, '2026-09-30');
});

test('service worker caches audio on demand instead of preloading the full library', async () => {
  const worker = await fs.readFile(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
  assert.doesNotMatch(worker, /AUDIO_ASSETS|THEME_AUDIO_ASSETS|OPEN_AUDIO_ASSETS/);
  assert.match(worker, /request\.destination === 'audio'/);
});

test('creates a profile, saves progress, and restores it', async (t) => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(process.env.DATA_DIR, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const auth = await fetch(`${base}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'An', profileId: 'an-uiux', pin: '2468' })
  });
  assert.equal(auth.status, 200);
  const cookie = auth.headers.get('set-cookie').split(';')[0];
  const payload = await auth.json();
  assert.equal(payload.displayName, 'An');
  assert.equal(payload.progress, null);

  const progress = { version: 1, currentLesson: 2, mastered: { '0:0': { box: 1 } } };
  const saved = await fetch(`${base}/api/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ progress })
  });
  assert.equal(saved.status, 200);

  const restored = await fetch(`${base}/api/progress`, { headers: { Cookie: cookie } });
  assert.equal(restored.status, 200);
  assert.deepEqual((await restored.json()).progress, progress);

  const simpleProgress = { version: 1, daily: { '2026-09-25': { words: ['0:0'], learned: ['0:0'] } } };
  const simpleSaved = await fetch(`${base}/api/simple-progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ progress: simpleProgress })
  });
  assert.equal(simpleSaved.status, 200);
  const simpleRestored = await fetch(`${base}/api/simple-progress`, { headers: { Cookie: cookie } });
  assert.deepEqual((await simpleRestored.json()).progress, simpleProgress);

  const wrongPin = await fetch(`${base}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'An', profileId: 'an-uiux', pin: '9999' })
  });
  assert.equal(wrongPin.status, 401);
});
