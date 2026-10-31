// Screenshot di audit in docs/audit/ (390 e 1280 px). Uso: python3 -m pipeline.build_page && node tests/e2e/shots.cjs
const path = require('node:path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '../../dist/preview.html');
const OUT = path.resolve(__dirname, '../../docs/audit');
const STATE = JSON.stringify({ v: 1, equipped: { id: 're-string-zero-17', kg: [22.5, 21.5], since: '2026-10-01T10:00:00.000Z', hours0: 0 }, liked: ['solinco-confidential-16l', 'toroline-o-toro-17'], disliked: ['babolat-rpm-blast-16', 'babolat-rpm-blast-17'],
  sessions: [{ ts: 'a', date: '2026-10-20', hours: 6, note: 'doppio', life: '2026-10-01T10:00:00.000Z' }, { ts: 'b', date: '2026-10-27', hours: 4.5, note: '', life: '2026-10-01T10:00:00.000Z' }], lives: [] });

(async () => {
  const browser = await chromium.launch();
  for (const [n, vp] of [['m', { width: 390, height: 844 }], ['d', { width: 1280, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: n === 'm' });
    const page = await ctx.newPage();
    await page.addInitScript((s) => localStorage.setItem('banco-corde:state', s), STATE);
    await page.goto(URL);
    await page.waitForFunction(() => window.__bancoReady === true);
    const shot = (name, opts = {}) => page.screenshot({ path: path.join(OUT, `v3-${name}-${n}.png`), ...opts });
    await shot('scegli');
    await page.locator('#tab-mappa').click();
    await page.waitForSelector('#scatter circle.dot');
    if (n === 'd') await page.locator('#scatter circle.dot[data-id="re-string-zero-17"]').hover(); else await page.locator('#scatter circle.dot[data-id="re-string-zero-17"]').tap();
    await page.waitForTimeout(200);
    await shot('mappa', { fullPage: n === 'd' });
    await page.mouse.move(2, 2);
    await page.locator('#tab-banco').click();
    await page.waitForSelector('input.cmp');
    for (const i of [0, 1, 2]) await page.locator('input.cmp').nth(i).check();
    await page.waitForTimeout(150);
    await shot('banco');
    await page.locator('#cmp-clear').click();
    await page.locator('#tab-montata').click();
    await page.waitForSelector('#wear .wearbar');
    await shot('montata', { fullPage: true });
    await page.locator('#tab-scegli').click();
    await page.locator('#top3 [data-open]').first().click();
    await page.waitForSelector('dialog#sheet[open]');
    await shot('scheda');
    await ctx.close();
  }
  await browser.close();
})();
