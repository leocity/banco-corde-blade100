const fs = require('node:fs');
const path = require('node:path');
const { openPage, bodyText, stateOf, BAD, test, assert } = require('./ui.cjs');

const DATA = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/strings.json'), 'utf8'));
const goMontata = async (page) => { await page.locator('#tab-montata').click(); await page.waitForSelector('#hours-input'); };
const addHours = async (page, value) => { await page.locator('#hours-input').fill(value); await page.locator('#hours-add').click(); };
const stateWith = (patch) => JSON.stringify({ v: 1, equipped: { id: 're-string-zero-17', kg: [22.5, 21.5], since: '2026-10-01T10:00:00.000Z', hours0: 0 }, liked: ['solinco-confidential-16l', 'toroline-o-toro-17'], disliked: [], sessions: [], lives: [], ...patch });
// db simulato che sopravvive al reload (usa localStorage) e downloads opzionale
const FAKE_CLAUDE = (withDownloads, { delayGet = 0, failSet = false } = {}) => `(() => { window.claude = { use: async (n) => n === 'db' ? { doc: (p) => ({ get: async () => { await new Promise((r) => setTimeout(r, ${delayGet})); const v = localStorage.getItem('fakedb:' + p); return { exists: v !== null, data: () => (v ? JSON.parse(v) : undefined) }; }, set: async (d) => { if (${failSet}) throw { code: 'unavailable', message: 'giù' }; localStorage.setItem('fakedb:' + p, JSON.stringify(d)); } }) } : n === 'user' ? { id: async () => 'u1' } : (n === 'downloads' && ${withDownloads}) ? { save: async (r) => { window.__saved = r; return { status: 'saved' }; } } : null }; })()`;

test('montata: ore scritte con la virgola', async () => {
  const { page, ctx } = await openPage();
  await goMontata(page);
  await addHours(page, '1,5');
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 1);
  assert.match(await page.innerText('#sessions'), /1,5 h/);
  assert.match(await page.innerText('#wear'), /1,5/);
  assert.equal((await stateOf(page)).sessions[0].hours, 1.5);
  await ctx.close();
});

test('montata: ore non valide o data futura non scrivono nulla', async () => {
  const { page, ctx } = await openPage();
  await goMontata(page);
  for (const bad of ['0', '-2', '30', '', 'abc']) {
    await addHours(page, bad);
    assert.ok(await page.locator('#hours-error').isVisible(), `"${bad}" doveva essere rifiutato`);
  }
  await page.locator('#hours-date').fill('2999-01-01');
  await addHours(page, '2');
  assert.match(await page.innerText('#hours-error'), /futuro/);
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 0);
  await ctx.close();
});

test('montata: pulsanti rapidi +1 h', async () => {
  const { page, ctx } = await openPage();
  await goMontata(page);
  await page.locator('[data-add-hours="1"]').click();
  await page.locator('[data-add-hours="1.5"]').click();
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 2);
  assert.match(await page.innerText('#mine-summary'), /Re-String Zero/);
  assert.match(await page.innerText('#wear'), /2,5 h/);
  await ctx.close();
});

test('montata: modifica e cancella una sessione, con annulla', async () => {
  const { page, ctx } = await openPage();
  await goMontata(page);
  await addHours(page, '2');
  await page.locator('#sessions [data-edit-ts]').click();
  await page.locator('#sessions input[name="hours"]').fill('3');
  await page.locator('#sessions [data-save-ts]').click();
  assert.match(await page.innerText('#sessions'), /3 h/);
  await page.locator('#sessions [data-del-ts]').click();
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 0);
  await page.locator('#toast button').click();
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 1);
  await ctx.close();
});

test('montata: cambio corda da "Monta", storico con le ore e annulla', async () => {
  const { page, ctx } = await openPage();
  await goMontata(page);
  await addHours(page, '2');
  await page.locator('#tab-scegli').click();
  const id = await page.locator('#list .scard').first().getAttribute('data-id');
  await page.locator(`#list .scard[data-id="${id}"] [data-equip]`).click();
  assert.ok(await page.locator('#equip-dialog[open]').count());
  assert.equal(await page.locator('#eq-pick').inputValue(), id);
  await page.locator('#eq-ok').click();
  const name = await page.evaluate((i) => { const r = window.STRINGS_DATA.strings.find((x) => x.id === i); return `${r.brand} ${r.model}`; }, id);
  assert.match(await page.innerText('#strip'), new RegExp(name));
  await goMontata(page);
  assert.equal(await page.locator('#history li:not(.muted)').count(), 1);
  assert.match(await page.innerText('#history'), /Re-String Zero/);
  assert.match(await page.innerText('#history'), /2 h/);
  await page.locator('#toast button').click();
  assert.match(await page.innerText('#strip'), /Re-String Zero/);
  assert.equal(await page.locator('#history li:not(.muted)').count(), 0);
  await ctx.close();
});

test('montata: tensione non valida nel cambio corda viene rifiutata', async () => {
  const { page, ctx } = await openPage();
  await goMontata(page);
  await page.locator('#equip-btn').click();
  await page.locator('#eq-kgv').fill('abc');
  await page.locator('#eq-ok').click();
  assert.ok(await page.locator('#eq-error').isVisible());
  assert.ok(await page.locator('#equip-dialog[open]').count());
  assert.equal((await stateOf(page)) === null || (await stateOf(page)).lives.length === 0, true);
  await ctx.close();
});

test('montata: stato salvato corrotto, la pagina si apre con Zero e avvisa', async () => {
  const { page, ctx, errors } = await openPage({ storage: { 'banco-corde:state': '{rotto' } });
  await goMontata(page);
  assert.match(await page.innerText('#strip'), /Re-String Zero/);
  assert.match(await page.innerText('#persist-note'), /non è leggibile/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('montata: corda senza tenuta usa 14 ore dichiarate come ipotesi, senza NaN', async () => {
  const r = DATA.strings.find((x) => x.derived.dims.durability === null && x.is_target);
  const { page, ctx } = await openPage({ storage: { 'banco-corde:state': stateWith({ equipped: { id: r.id, kg: [22, 21], since: '2026-10-01T10:00:00.000Z', hours0: 0 } }) } });
  await goMontata(page);
  const txt = await page.innerText('#wear');
  assert.match(txt, /ipotesi/);
  assert.match(txt, /14/);
  assert.doesNotMatch(await bodyText(page), BAD);
  await ctx.close();
});

test('montata: senza db si salva in locale, lo dice e i dati restano dopo il reload', async () => {
  const { page, ctx } = await openPage();
  await goMontata(page);
  assert.match(await page.innerText('#persist-note'), /questo browser/);
  await addHours(page, '2');
  await page.reload();
  await page.waitForFunction(() => window.__bancoReady === true);
  await goMontata(page);
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 1);
  await ctx.close();
});

test('montata: con db simulato scrive su data/users/u1/state e ricarica', async () => {
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(false) });
  await goMontata(page);
  assert.equal(await page.locator('#persist-note').isVisible(), false);
  await addHours(page, '2');
  await page.waitForFunction(() => localStorage.getItem('fakedb:data/users/u1/state') !== null);
  await page.reload();
  await page.waitForFunction(() => window.__bancoReady === true);
  await goMontata(page);
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 1);
  await ctx.close();
});

test('montata: esporta lo storico solo se downloads è disponibile', async () => {
  const none = await openPage();
  await goMontata(none.page);
  assert.equal(await none.page.locator('#export-btn').isVisible(), false);
  await none.ctx.close();
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(true) });
  await goMontata(page);
  await addHours(page, '2');
  await page.locator('#export-btn').click();
  const saved = await page.evaluate(() => window.__saved);
  assert.equal(saved.filename, 'banco-corde-storico.json');
  assert.equal(JSON.parse(saved.data).sessions.length, 1);
  await ctx.close();
});

test('montata: la striscia in Scegli mostra le ore e l\'usura', async () => {
  const { page, ctx } = await openPage({ storage: { 'banco-corde:state': stateWith({ sessions: [{ ts: 'a', date: '2026-10-20', hours: 12, note: '', life: '2026-10-01T10:00:00.000Z' }] }) } });
  const txt = await page.innerText('#strip');
  assert.match(txt, /12 h/);
  assert.match(txt, /Da controllare|Da cambiare|In uso/);
  await ctx.close();
});

test('montata: nessun NaN/undefined/null a 390 px e nessuno scroll orizzontale', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await addHours(page, '1,5');
  assert.doesNotMatch(await bodyText(page), BAD);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await ctx.close();
});

test('montata: se il salvataggio online fallisce lo dice (non fa credere che sia sincronizzato)', async () => {
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(false, { failSet: true }) });
  await goMontata(page);
  await addHours(page, '2');
  await page.waitForFunction(() => /salvare online/.test(document.querySelector('#persist-note').innerText));
  assert.ok(await page.locator('#persist-note').isVisible());
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 1);
  await ctx.close();
});

test('montata: azioni fatte prima che il db risponda non cancellano lo storico salvato', async () => {
  const saved = stateWith({ sessions: [1, 2, 3].map((n) => ({ ts: `s${n}`, date: '2026-10-2' + n, hours: 2, note: '', life: '2026-10-01T10:00:00.000Z' })) });
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(false, { delayGet: 1500 }), storage: { 'fakedb:data/users/u1/state': saved }, waitReady: false });
  await page.waitForSelector('#list .scard');
  const id = await page.locator('#list .scard').first().getAttribute('data-id');
  await page.locator(`#list .scard[data-id="${id}"] [data-dislike]`).click();
  await page.waitForFunction(() => window.__bancoReady === true);
  const doc = JSON.parse(await page.evaluate(() => localStorage.getItem('fakedb:data/users/u1/state')));
  assert.equal(doc.sessions.length, 3, 'lo storico salvato è sparito');
  assert.ok(doc.disliked.includes(id), 'la modifica fatta prima del caricamento è andata persa');
  await ctx.close();
});

test('montata: una nuova modifica chiude "Annulla", così non si ripristina uno stato vecchio', async () => {
  const { page, ctx } = await openPage();
  await goMontata(page);
  await page.locator('#equip-btn').click();
  await page.locator('#eq-ok').click();
  assert.ok(await page.locator('#toast').isVisible());
  await page.locator('[data-add-hours="1"]').click();
  assert.equal(await page.locator('#toast').isVisible(), false);
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 1);
  await ctx.close();
});
