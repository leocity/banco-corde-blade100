// Smoke test della pagina costruita (dist/preview.html) con Playwright. Prima: python3 -m pipeline.build_page
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '../../dist/preview.html');
const BAD = /\b(NaN|undefined|null)\b/;
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

// claude: sorgente di una funzione eseguita prima della pagina per simulare window.claude
async function openPage({ width = 1280, height = 900, claude, hasTouch = false, storage, clock = false, waitReady = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch });
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (storage) await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); }, storage);
  if (claude) await page.addInitScript(claude);
  if (clock) await page.clock.install();
  await page.goto(URL);
  if (waitReady) await page.waitForFunction(() => window.__bancoReady === true && window.__aiReady === true);
  return { page, ctx, errors };
}
const bodyText = (page) => page.innerText('body');
// Apre la scheda di una corda dalla ricerca di Scegli (con il nome, non serve conoscere la posizione in lista)
async function openSheetById(page, id) {
  const name = await page.evaluate((i) => { const r = window.STRINGS_DATA.strings.find((x) => x.id === i); return `${r.brand} ${r.model}`; }, id);
  await page.locator('#tab-scegli').click();
  await page.locator('#q').fill(name);
  for (let k = 0; k < 6 && !(await page.locator(`#list [data-open="${id}"]`).count()); k++) { if (await page.locator('#more').isVisible()) await page.locator('#more').click(); else break; }
  await page.locator(`#list [data-open="${id}"]`).first().click();
  await page.waitForSelector('dialog#sheet[open]');
}
const stateOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('banco-corde:state') || 'null'));
// In Montata le parti secondarie stanno in sezioni chiuse: i test che le usano le aprono tutte
const expandMontata = (page) => page.evaluate(() => document.querySelectorAll('#montata details.more').forEach((d) => { d.open = true; }));
module.exports = { openPage, openSheetById, expandMontata, bodyText, stateOf, BAD, test, assert };

if (require.main === module) {
  for (const f of ['scegli', 'compare', 'montata', 'mappa', 'ai', 'sheet', 'nav', 'diario']) require(`./${f}.cjs`);
}
