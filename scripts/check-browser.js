// Optional browser regression suite: npm install --no-save playwright, then npm run test:browser.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
process.env.DATA_DIR = path.join(os.tmpdir(), `vocab-browser-${process.pid}`);
const { server } = require('../server');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.clock.install({ time: new Date('2026-09-29T12:00:00+07:00') });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('https://api.tatoeba.org/**', async (route) => {
      const word = new URL(route.request().url()).searchParams.get('q').replaceAll('"', '');
      await route.fulfill({ json: { data: Array.from({ length: 18 }, (_, i) => ({ id: i + 1, lang: 'eng', text: `We talked about the ${word} near house number ${i + 1}.`, owner: 'fixture', license: 'CC BY 2.0 FR', translations: [{ id: i + 101, lang: 'vie', text: 'Chúng tôi thảo luận về chủ đề này trên đường đi tới ngôi nhà ở cuối phố.', owner: 'translator', license: 'CC BY 2.0 FR' }] })), paging: { next: null } } });
    });
    await page.goto(`${base}/simple/`);
    const word = await page.locator('.word-display strong').textContent();
    await page.locator('[data-study-face="front"]').click();
    await page.waitForFunction(() => document.querySelectorAll('#learnCard .example-row').length === 3);
    const firstExamples = await page.locator('#learnCard .example-copy > span').allTextContents();
    await page.locator('#learnCard [data-new-examples]').click();
    await page.waitForFunction(() => document.querySelectorAll('#learnCard .example-row').length === 3);
    const nextExamples = await page.locator('#learnCard .example-copy > span').allTextContents();
    assert.equal(firstExamples.filter((text) => nextExamples.includes(text)).length, 0);
    await page.locator('[data-learn]').click();
    assert.equal(await page.locator('#quizBody').textContent().then((text) => text.includes(word)), false);
    assert.equal(await page.locator('.answer-mask').textContent(), word.replace(/[a-z]/gi, '_'));
    for (let i = 0; i < 2; i++) { await page.locator('#quizAnswer').fill('wrong'); await page.locator('#answerForm button').click(); }
    await page.reload();
    await page.locator('[data-learn]').click();
    assert.match(await page.locator('#quizFeedback').textContent(), /Còn 1/);
    await page.locator('#quizAnswer').fill('wrong');
    await page.locator('#answerForm button').click();
    assert.equal(await page.locator('#quizAnswer').count(), 0);
    assert.equal(await page.locator('.restudy-word').textContent(), word);
    await page.reload();
    await page.locator('[data-learn]').click();
    assert.equal(await page.locator('#retryQuiz').count(), 1);
    await page.locator('#retryQuiz').click();
    await page.locator('#quizAnswer').fill(` ${word.toUpperCase()} `);
    await page.locator('#answerForm button').click();
    await page.locator('#finishQuiz').click();
    assert.equal(await page.locator('#cardCount').textContent(), '1');
    await page.locator('[data-mode="review"]').click();
    const reviewWord = await page.locator('.word-display strong').textContent();
    await page.locator('[data-learn]').click();
    await page.locator('#quizAnswer').fill('wrong');
    await page.locator('#answerForm button').click();
    assert.match(await page.locator('#quizFeedback').textContent(), /Còn 2/);
    await page.locator('#quizAnswer').fill(reviewWord);
    await page.locator('#answerForm button').click();
    await page.locator('#finishQuiz').click();
    await page.locator('.desktop-nav [data-view="cards"]').click();
    await page.locator('#cardSearch').fill(word);
    await page.locator('#startLibraryTest').click();
    await page.locator('#quizAnswer').fill(word);
    await page.locator('#answerForm button').click();
    await page.locator('#finishQuiz').click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('daily-deck-progress-v2')));
    assert.equal(saved.daily['2026-09-29'].reviewed.length, 2);
    assert.equal(Object.keys(saved.recalls).length, 2);
    const metrics = [];
    for (const size of [{width: 1366,height: 768}, {width: 1280,height: 720}, {width: 1920,height: 1080}, {width: 390,height: 844}, {width: 375,height: 667}]) {
      await page.setViewportSize(size);
      for (const view of ['today', 'cards', 'week']) {
        await page.locator(`${size.width > 800 ? '.desktop-nav' : '.mobile-nav'} [data-view="${view}"]`).click();
        if (view === 'today' && await page.locator('[data-study-face="front"]').isVisible()) await page.locator('[data-study-face="front"]').click();
        if (view === 'cards') await page.locator('.deck-card.is-active .deck-front [data-card-flip]').click();
        await page.waitForTimeout(100);
        const measure = await page.evaluate(() => ({
          view: document.body.dataset.activeView,
          page: document.documentElement.scrollHeight - innerHeight,
          horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
          scrollbar: getComputedStyle(document.documentElement).scrollbarWidth,
          inner: [...document.querySelectorAll('.view.active .meaning-view, .view.active .deck-card.is-active .deck-back-content')].map((el) => ({ delta: el.scrollHeight - el.clientHeight, height: el.clientHeight }))
        }));
        metrics.push({ ...size, ...measure });
        assert.equal(measure.horizontalOverflow, 0, `Horizontal overflow: ${JSON.stringify(measure)}`);
        assert.equal(measure.scrollbar, 'none');
        if (size.width > 800 && view !== 'week') {
          assert.ok(measure.page <= 1, `Page scroll: ${JSON.stringify({ ...size, ...measure })}`);
          assert.ok(measure.inner.every((el) => el.delta <= 1), `Card scroll: ${JSON.stringify({ ...size, ...measure })}`);
        }
      }
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.locator('#profileButton').click();
    assert.match(await page.locator('#syncAvailability').textContent(), /Chưa cấu hình Firebase/);
    assert.equal(await page.locator('#googleSyncButton').isDisabled(), true);
    await page.locator('.server-sync summary').click();
    await page.route('**/api/health', (route) => route.fulfill({ status: 404, contentType: 'text/html', body: '<html>Not Found</html>' }));
    await page.locator('#profileIdInput').fill('browser-test');
    await page.locator('#pinInput').fill('1234');
    await page.locator('#profileForm button').click();
    await page.waitForFunction(() => document.querySelector('#profileError').textContent.includes('GitHub Pages'));
    assert.match(await page.locator('#profileError').textContent(), /GitHub Pages/);
    await page.unroute('**/api/health');
    await page.locator('#profileForm button').click();
    await page.waitForFunction(() => !document.querySelector('#profileDialog').open);
    assert.equal(await page.locator('#syncText').textContent(), 'Đã lưu');
    await page.locator('#profileButton').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportProgress').click();
    const download = await downloadPromise;
    const backup = await fs.readFile(await download.path(), 'utf8');
    assert.equal(JSON.parse(backup).format, 'vocab-backup');
    assert.ok(!backup.includes('token'));
    await page.locator('#importProgress').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('<html>bad</html>') });
    await page.waitForFunction(() => document.querySelector('#profileError').textContent.includes('JSON'));
    await page.locator('#importProgress').setInputFiles({ name: 'progress.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
    await page.waitForFunction(() => document.querySelector('#profileError').textContent === '');
    await page.locator('#closeProfile').click();

    // Simulate GitHub Pages at its real subpath, serving our local assets only.
    const staticPage = await context.newPage();
    let staticApiCalls = 0;
    await staticPage.route('https://soainq.github.io/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) staticApiCalls++;
      const response = await fetch(`${base}${url.pathname.replace('/english-flashcards', '')}${url.search}`);
      await route.fulfill({ status: response.status, contentType: response.headers.get('content-type'), body: Buffer.from(await response.arrayBuffer()) });
    });
    await staticPage.goto('https://soainq.github.io/english-flashcards/simple/');
    await staticPage.locator('#profileButton').click();
    await staticPage.locator('.server-sync summary').click();
    await staticPage.locator('#profileIdInput').fill('pages-test');
    await staticPage.locator('#pinInput').fill('1234');
    await staticPage.locator('#profileForm button').click();
    assert.match(await staticPage.locator('#profileError').textContent(), /GitHub Pages/);
    assert.equal(staticApiCalls, 0);
    await staticPage.locator('#importProgress').setInputFiles({ name: 'progress.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
    await staticPage.waitForFunction(() => document.querySelector('#cardCount').textContent === '2');
    await staticPage.close();
    await fs.mkdir(path.join(__dirname, '..', 'artifacts'), { recursive: true });
    await page.locator('.desktop-nav [data-view="today"]').click();
    if (await page.locator('[data-study-face="front"]').isVisible()) await page.locator('[data-study-face="front"]').click();
    await page.screenshot({ path: path.join(__dirname, '..', 'artifacts', 'desktop-flashcard.png') });
    console.log(JSON.stringify(metrics));
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: recall, reload, review, library, examples, sync and responsive layout.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(process.env.DATA_DIR, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
