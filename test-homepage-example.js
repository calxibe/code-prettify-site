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
    await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { value: () => Promise.reject(new Error('Unavailable')) }));
    await page.getByRole('button', { name: 'Copy JSON', exact: true }).click();
    await page.waitForFunction(() => document.getElementById('demo-status').textContent.includes('Copy unavailable'));
    console.log('Homepage example: views, tree folding, clipboard success/failure, gallery scrolling, disclosure links, and mobile layout passed.');
  } finally {
    await context.close();
  }
};
