// Controllo della pagina v3 (spec §3, criteri 1–3 e 6): node tests/ui/check_page.mjs dist/preview.html
// Salva gli screenshot in docs/audit/v3/ ed esce con 1 se un criterio fallisce.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const page = resolve(process.argv[2] || 'dist/preview.html');
const shots = resolve('docs/audit/v3');
mkdirSync(shots, { recursive: true });
const COMPARE = ['toroline-o-toro-tour-17', 'toroline-o-toro-spin-17', 'solinco-mach-10-16'];
const fails = [], report = [];
const check = (ok, what, value) => { report.push(`${ok ? 'OK  ' : 'FAIL'} ${what}: ${value}`); if (!ok) fails.push(what); };

const browser = await chromium.launch();
async function open(vp, hash, storage = {}) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`file://${page}#${hash}`);
  await p.waitForTimeout(400);
  return { p, errors, ctx };
}
const cmpStore = { 'banco-corde:compare': JSON.stringify(COMPARE) };

for (const [name, vp] of [['telefono', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]]) {
  const { p, errors, ctx } = await open(vp, 'casa');
  if (name === 'telefono') {
    const fold = await p.evaluate(() => {
      const b = (s) => document.querySelector(s)?.getBoundingClientRect().bottom ?? Infinity;
      return { current: b('#current'), name: b('.pick .scard-name'), why: b('.pick .why') };
    });
    check(Math.max(fold.current, fold.name, fold.why) <= vp.height, '1. prima schermata: corda attuale + nome e perché della 1ª', JSON.stringify(fold));
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    check(h <= 2500, '2. altezza di "La tua corda" a 390 px ≤ 2500', h);
  }
  await p.screenshot({ path: `${shots}/${name}-casa.png`, fullPage: true });
  await p.click('.pick .val');
  const popOpen = await p.$eval('#prov-pop', (e) => !e.hidden);
  await p.keyboard.press('Escape');
  const popClosed = await p.$eval('#prov-pop', (e) => e.hidden);
  check(popOpen && popClosed, `popover della provenienza (${name})`, `aperto ${popOpen}, chiuso con Esc ${popClosed}`);
  for (const tab of ['casa', 'confronta', 'esplora']) {
    await p.click(`#tab-${tab}`);
    await p.waitForTimeout(150);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(sw <= vp.width, `6. nessuno scroll orizzontale in ${tab} (${name})`, `${sw} px`);
    if (tab !== 'casa') await p.screenshot({ path: `${shots}/${name}-${tab}.png`, fullPage: true });
  }
  check(!errors.length, `nessun errore in console (${name})`, errors.join(' | ') || 'nessuno');
  await ctx.close();
}

for (const vp of [{ width: 375, height: 812 }, { width: 1280, height: 900 }]) {
  const { p, errors, ctx } = await open(vp, 'confronta', cmpStore);
  const cols = await p.$$eval('.cmp thead th', (x) => x.length);
  const words = await p.$eval('#cmp', (e) => e.innerText.split(/\s+/).filter(Boolean).length);
  check(cols === 4 && words <= 600, `3. confronto a 4 colonne ≤ 600 parole (${vp.width} px)`, `${cols} colonne, ${words} parole`);
  for (const tab of ['casa', 'confronta', 'esplora']) {
    await p.click(`#tab-${tab}`);
    await p.waitForTimeout(150);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(sw <= vp.width, `6. nessuno scroll orizzontale in ${tab} (${vp.width} px)`, `${sw} px`);
  }
  check(!errors.length, `nessun errore in console (confronto, ${vp.width} px)`, errors.join(' | ') || 'nessuno');
  await ctx.close();
}

{
  const { p, ctx } = await open({ width: 1280, height: 900 }, 'casa');
  const opts = await p.$$eval('#cur-id option', (x) => x.map((o) => o.textContent));
  const dup = opts.filter((t, i) => opts.indexOf(t) !== i);
  check(!dup.length, 'nomi delle corde tutti distinti nel selettore', dup.join(', ') || 'nessun doppione');
  await ctx.close();
}

{
  const { p, errors, ctx } = await open({ width: 390, height: 844 }, 'casa', { 'banco-corde:current': '{"id":"sparita","kg":[22,21]}', 'banco-corde:compare': '["sparita", 7]' });
  const id = await p.$eval('#cur-id', (s) => s.value);
  await p.click('#tab-confronta');
  check(id === 'solinco-confidential-16l' && !errors.length, 'corda salvata che non esiste più → default, senza errori', `${id}; errori: ${errors.join(' | ') || 'nessuno'}`);
  await ctx.close();
}

await browser.close();
console.log(report.join('\n'));
if (fails.length) { console.log(`\n${fails.length} criteri falliti`); process.exit(1); }
console.log('\nTutti i criteri OK');
