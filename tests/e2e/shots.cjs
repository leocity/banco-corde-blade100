// Screenshot v6 in docs/audit/ (390 px telefono e 1280 px). Prima: python3 -m pipeline.build_page
const path = require('node:path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, '../../dist/preview.html');
const OUT = path.resolve(__dirname, '../../docs/audit');
(async () => {
  const b = await chromium.launch();
  for (const [w, h, s] of [[390, 844, 'm'], [1280, 900, 'd']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(URL); await p.waitForFunction(() => window.__bancoReady === true);
    await p.locator('#quick-add').click(); await p.locator('#oggi .face[data-feel="4"]').click();
    await p.waitForTimeout(100); await p.locator('#toast').evaluate((t) => { t.hidden = true; });
    await p.screenshot({ path: `${OUT}/v6-oggi-${s}.png` });
    await p.locator('#tab-prossima').click(); await p.waitForTimeout(150);
    await p.screenshot({ path: `${OUT}/v6-prossima-${s}.png` });
    await p.locator('#next-list [data-cmp]').first().click(); await p.waitForTimeout(150);
    await p.screenshot({ path: `${OUT}/v6-confronto-${s}.png` });
    await p.keyboard.press('Escape');
    await p.locator('#tab-mappa').click(); await p.waitForTimeout(150);
    await p.fill('#map-q', 'o-toro tour 1,20'); await p.locator('#map-results [data-map-add]').first().click();
    await p.screenshot({ path: `${OUT}/v6-mappa-${s}.png` });
    await p.close();
  }
  await b.close();
})();
