// Test della pagina costruita (dist/preview.html) con Playwright. Prima: python3 -m pipeline.build_page
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
async function openPage(opts = {}) {
  const { width = 390, height = 844, claude, storage, hash = '', colorScheme = 'light' } = opts;
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme });
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (storage) await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); }, storage);
  if (claude) await page.addInitScript(claude);
  await page.goto(URL + hash);
  if (!opts.noWait) await page.waitForFunction(() => window.__bancoReady === true);
  return { page, ctx, errors };
}
const stateOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('banco-corde:state') || 'null'));
const tab = async (page, id) => { await page.locator(`#tab-${id}`).click(); await page.waitForSelector(`#${id}:not([hidden])`); };

// db a raccolta simulato (data/users/u1): sopravvive al reload (usa localStorage); `extra` aggiunge altre capability
const FAKE_CLAUDE = (extra = '', delayGet = 0) => `(() => {
  const P = 'fakedb:'; const subs = [];
  const all = () => Object.keys(localStorage).filter((k) => k.startsWith(P)).sort().map((k) => { const id = k.slice(P.length); const v = JSON.parse(localStorage.getItem(k)); return { id, exists: true, data: () => v }; });
  const notify = () => subs.forEach((cb) => cb({ docs: all() }));
  const col = { get: async () => { await new Promise((r) => setTimeout(r, ${delayGet})); return { docs: all() }; }, onSnapshot: (cb) => { subs.push(cb); return () => {}; },
    doc: (id) => ({ set: async (d) => { localStorage.setItem(P + id, JSON.stringify(d)); notify(); }, delete: async () => { localStorage.removeItem(P + id); notify(); } }) };
  const caps = { db: { collection: () => col }, user: { id: async () => 'u1' } ${extra} };
  window.claude = { use: async (n) => caps[n] || null };
})()`;
const dbDocs = (page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('fakedb:')).map((k) => [k.slice(7), JSON.parse(localStorage.getItem(k))])));

module.exports = { openPage, stateOf, tab, FAKE_CLAUDE, dbDocs, BAD, test, assert };

if (require.main === module) {
  for (const f of ['oggi', 'prossima', 'prove', 'mappa', 'qualita']) require(`./${f}.cjs`);
}
