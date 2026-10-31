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
async function openPage({ width = 1280, height = 900, claude, hasTouch = false, storage } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch });
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (storage) await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); }, storage);
  if (claude) await page.addInitScript(claude);
  await page.goto(URL);
  await page.waitForFunction(() => window.__bancoReady === true);
  return { page, ctx, errors };
}
const bodyText = (page) => page.innerText('body');
const stateOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('banco-corde:state') || 'null'));
module.exports = { openPage, bodyText, stateOf, BAD, test, assert };

if (require.main === module) {
  for (const f of ['scegli', 'banco', 'montata', 'mappa']) require(`./${f}.cjs`);
}
