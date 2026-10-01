const assert = require('node:assert/strict');

module.exports = async function checkHomepageExample(browser, baseUrl) {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  await context.addInitScript(() => localStorage.setItem('codeprettify-analytics-consent', 'denied'));
  const page = await context.newPage();
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`${baseUrl}/index.html`);
      const formatted = await page.locator('#demo-output pre').textContent();
      assert.equal(JSON.parse(formatted).regions[1].latency_ms, 68);
      assert(await page.locator('.demo-code-line').count() > 1);
      await page.getByRole('button', { name: 'Raw', exact: true }).click();
      assert.equal(await page.locator('.demo-code-line').count(), 1);
      const raw = await page.locator('#demo-output pre').textContent();
      assert.deepEqual(JSON.parse(raw), JSON.parse(formatted));
      await page.getByRole('button', { name: 'Copy JSON', exact: true }).click();
      await page.waitForFunction(() => document.getElementById('demo-status').textContent.includes('copied'));
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), raw);
      await page.getByRole('button', { name: 'Tree', exact: true }).click();
      const root = page.locator('.demo-tree > details');
      await root.locator(':scope > summary').click();
      assert.equal(await root.getAttribute('open'), null);
      await root.locator(':scope > summary').click();
      assert(await page.locator('.demo-tree-leaf').first().isVisible());
      await page.getByRole('button', { name: 'Formatted', exact: true }).click();
      assert.equal(await page.locator('#demo-output pre').textContent(), formatted);
      await page.getByRole('link', { name: 'View all formats' }).click();
      assert(await page.locator('#compatibility .supported-section').isVisible());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('button', { name: 'Scroll screenshots right', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.screenshot-tabs').scrollLeft > 0);
      await page.goto(`${baseUrl}/index.html#json-to-code-feature`);
      assert(await page.locator('#json-to-code-feature').isVisible());
    }
    await page.goto(`${baseUrl}/index.html`);
    const expected = JSON.parse(await page.locator('#demo-output pre').textContent());
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Unavailable')) } }));
    for (const view of ['tree', 'raw', 'formatted']) {
      await page.locator(`[data-demo-view="${view}"]`).click();
      await page.getByRole('button', { name: 'Copy JSON', exact: true }).click();
      await page.waitForFunction(() => document.getElementById('demo-status').textContent.includes('JSON is selected'));
      const selected = await page.evaluate(() => getSelection().toString());
      assert.deepEqual(JSON.parse(selected), expected, `${view}: fallback must select complete, valid JSON`);
      if (view === 'raw') assert(!selected.includes('\n'), 'Raw fallback must preserve the compact output');
      assert.equal(await page.locator('[data-demo-view][aria-pressed="true"]').getAttribute('data-demo-view'), view === 'raw' ? 'raw' : 'formatted');
    }
    for (const reject of [false, true]) {
      await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise((resolve, reject) => { window.finishCopy = resolve; window.rejectCopy = reject; }) } }));
      await page.getByRole('button', { name: 'Copy JSON', exact: true }).click();
      await page.getByRole('button', { name: 'Tree', exact: true }).click();
      await page.evaluate((reject) => reject ? window.rejectCopy(new Error('Unavailable')) : window.finishCopy(), reject);
      assert.equal(await page.locator('#demo-status').textContent(), 'Tree view · Select a branch to fold it', 'A delayed clipboard result must not overwrite the new view');
      assert(await page.locator('.demo-tree').isVisible());
      await page.getByRole('button', { name: 'Formatted', exact: true }).click();
    }
    console.log('Homepage example: views, tree folding, clipboard success/failure, gallery scrolling, disclosure links, and mobile layout passed.');
  } finally {
    await context.close();
  }
};
