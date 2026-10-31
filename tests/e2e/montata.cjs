const fs = require('node:fs');
const path = require('node:path');
const { openPage, bodyText, stateOf, BAD, test, assert } = require('./ui.cjs');

const DATA = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/strings.json'), 'utf8'));
const goMontata = async (page) => { await page.locator('#tab-montata').click(); await page.waitForSelector('#hours-input'); };
const addHours = async (page, value) => { await page.locator('#hours-input').fill(value); await page.locator('#hours-add').click(); };
const stateWith = (patch) => JSON.stringify({ v: 1, equipped: { id: 're-string-zero-17', kg: [22.5, 21.5], since: '2026-10-01T10:00:00.000Z', hours0: 0 }, liked: ['solinco-confidential-16l', 'toroline-o-toro-17'], disliked: [], sessions: [], lives: [], ...patch });
// db a raccolta simulato (data/users/u1): sopravvive al reload (usa localStorage) e `window.__external` simula un altro dispositivo
const FAKE_CLAUDE = (withDownloads, { delayGet = 0, failSet = false } = {}) => `(() => {
  const P = 'fakedb:'; const subs = [];
  const all = () => Object.keys(localStorage).filter((k) => k.startsWith(P)).sort().map((k) => { const id = k.slice(P.length); const v = JSON.parse(localStorage.getItem(k)); return { id, exists: true, data: () => v }; });
  const notify = () => subs.forEach((cb) => cb({ docs: all() }));
  window.__external = (op) => { for (const [id, d] of Object.entries(op.set || {})) localStorage.setItem(P + id, JSON.stringify(d)); for (const id of op.delete || []) localStorage.removeItem(P + id); notify(); };
  const col = { get: async () => { await new Promise((r) => setTimeout(r, ${delayGet})); return { docs: all() }; },
    onSnapshot: (cb) => { subs.push(cb); return () => {}; },
    doc: (id) => ({ set: async (d) => { if (${failSet}) throw { code: 'unavailable', message: 'giù' }; localStorage.setItem(P + id, JSON.stringify(d)); notify(); }, delete: async () => { localStorage.removeItem(P + id); notify(); } }) };
  window.claude = { use: async (n) => n === 'db' ? { collection: () => col } : n === 'user' ? { id: async () => 'u1' } : (n === 'downloads' && ${withDownloads}) ? { save: async (r) => { window.__saved = r; return { status: 'saved' }; } } : null };
})()`;
const dbKeys = (page, prefix) => page.evaluate((pre) => Object.keys(localStorage).filter((k) => k.startsWith('fakedb:' + pre)), prefix);
const SINCE = '2026-10-01T10:00:00.000Z';
const coreDoc = (extra = {}) => JSON.stringify({ v: 2, equipped: { id: 're-string-zero-17', kg: [22.5, 21.5], since: SINCE, hours0: 0 }, liked: ['solinco-confidential-16l', 'toroline-o-toro-17'], disliked: [], ...extra });
const sessionDoc = (ts, hours, date = '2026-10-20') => JSON.stringify({ ts, date, hours, note: '', life: SINCE });
// il documento unico (v1) trovato nel database dell'utente il 2026-10-31: 10 sessioni, 17,5 h
const USER_V1 = { v: 1, equipped: { id: 're-string-zero-17', kg: [22.5, 21.5], since: '2026-10-31T10:39:49.706Z', hours0: 0 }, liked: ['solinco-confidential-16l', 'toroline-o-toro-17'],
  disliked: ['solinco-confidential-soft-16', 'solinco-confidential-soft-17', 'babolat-rpm-blast-16', 'babolat-rpm-blast-17'], lives: [],
  sessions: [['2026-10-08', 1.5], ['2026-10-08', 1.5], ['2026-10-10', 4], ['2026-10-15', 1.5], ['2026-10-17', 1.5], ['2026-10-20', 1.5], ['2026-10-22', 1.5], ['2026-10-27', 1.5], ['2026-10-29', 1.5], ['2026-10-30', 1.5]]
    .map(([date, hours], i) => ({ date, hours, life: '2026-10-31T10:39:49.706Z', note: i === 2 ? 'Torneo' : '', ts: `17934466${i}0000-${i + 1}` })) };

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
  const id = await page.locator('#list .crow2wrap').first().getAttribute('data-id');
  await page.locator(`#list .crow2wrap[data-id="${id}"] .crow2`).click();
  await page.locator('#sheet-body [data-equip]').click();
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

test('sync: con db simulato scrive documenti separati e ricarica', async () => {
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(false) });
  await goMontata(page);
  await addHours(page, '2');
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('fakedb:s-')));
  assert.ok((await dbKeys(page, 'state')).length === 1);
  assert.equal((JSON.parse(await page.evaluate(() => localStorage.getItem('fakedb:state')))).sessions, undefined);
  await page.reload();
  await page.waitForFunction(() => window.__bancoReady === true);
  await goMontata(page);
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 1);
  await ctx.close();
});

test('sync: una sessione aggiunta da un altro dispositivo compare senza ricaricare', async () => {
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(false), storage: { 'fakedb:state': coreDoc(), 'fakedb:s-100-1': sessionDoc('100-1', 2) } });
  await goMontata(page);
  assert.match(await page.innerText('#wear'), /2 h su/);
  await page.evaluate((d) => window.__external({ set: { 's-200-2': d } }), JSON.parse(sessionDoc('200-2', 3)));
  await page.waitForFunction(() => /5 h su/.test(document.querySelector('#wear').innerText));
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 2);
  await ctx.close();
});

test('sync: una sessione tolta altrove sparisce', async () => {
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(false), storage: { 'fakedb:state': coreDoc(), 'fakedb:s-100-1': sessionDoc('100-1', 2), 'fakedb:s-200-2': sessionDoc('200-2', 3) } });
  await goMontata(page);
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 2);
  await page.evaluate(() => window.__external({ delete: ['s-200-2'] }));
  await page.waitForFunction(() => document.querySelectorAll('#sessions li[data-ts]').length === 1);
  await ctx.close();
});

test('sync: pagina vecchia aperta sul PC, una modifica non cancella ciò che il telefono ha aggiunto', async () => {
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(false), storage: { 'fakedb:state': coreDoc(), 'fakedb:s-100-1': sessionDoc('100-1', 1) } });
  await page.evaluate((d) => window.__external({ set: { 's-tel-1': d['a'], 's-tel-2': d['b'] } }), { a: JSON.parse(sessionDoc('tel-1', 2)), b: JSON.parse(sessionDoc('tel-2', 4)) });
  await page.waitForTimeout(500);
    await page.locator('#myrefs-sum').click();
  await page.locator('#myrefs .chip.liked').first().click();   // una modifica locale qualunque
  await page.waitForTimeout(700);
  const keys = await dbKeys(page, 's-');
  assert.deepEqual(keys.sort(), ['fakedb:s-100-1', 'fakedb:s-tel-1', 'fakedb:s-tel-2']);
  await goMontata(page);
  assert.match(await page.innerText('#wear'), /7 h su/);
  await ctx.close();
});

test('sync: il documento v1 dell\'utente si migra senza perdere ore', async () => {
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(false), storage: { 'fakedb:state': JSON.stringify(USER_V1) } });
  await goMontata(page);
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 10);
  assert.match(await page.innerText('#wear'), /17,5 h su/);
  assert.equal((await dbKeys(page, 's-')).length, 10);
  const core = JSON.parse(await page.evaluate(() => localStorage.getItem('fakedb:state')));
  assert.equal(core.sessions, undefined);
  assert.equal(core.v, 2);
  await ctx.close();
});

test('sync: indicatore di stato (sincronizzato, solo browser, errore)', async () => {
  const a = await openPage({ claude: FAKE_CLAUDE(false) });
  await a.page.waitForFunction(() => /Sincronizzato/.test(document.querySelector('#sync-badge').innerText));
  await a.ctx.close();
  const b = await openPage();
  assert.match(await b.page.innerText('#sync-badge'), /Solo su questo browser/);
  await b.ctx.close();
  const c = await openPage({ claude: FAKE_CLAUDE(false, { failSet: true }) });
  await goMontata(c.page);
  await addHours(c.page, '2');
  await c.page.waitForFunction(() => /Errore di salvataggio/.test(document.querySelector('#sync-badge').innerText));
  await c.page.waitForFunction(() => /salvare online/.test(document.querySelector('#persist-note').innerText));
  assert.equal(await c.page.locator('#sessions li[data-ts]').count(), 1);
  await c.ctx.close();
});

test('sync: azioni fatte prima che il db risponda non cancellano lo storico salvato', async () => {
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(false, { delayGet: 1200 }), storage: { 'fakedb:state': coreDoc(), 'fakedb:s-1-1': sessionDoc('1-1', 2), 'fakedb:s-2-2': sessionDoc('2-2', 2), 'fakedb:s-3-3': sessionDoc('3-3', 2) }, waitReady: false });
  await page.waitForSelector('#list .crow2wrap');
  await page.locator('#myrefs-sum').click();
  await page.locator('#myrefs .chip.liked').first().click();
  await page.waitForFunction(() => window.__bancoReady === true);
  await page.waitForTimeout(600);
  assert.equal((await dbKeys(page, 's-')).length, 3, 'lo storico salvato è sparito');
  const core = JSON.parse(await page.evaluate(() => localStorage.getItem('fakedb:state')));
  assert.equal(core.liked.length, 1, 'la modifica fatta prima del caricamento è andata persa');
  await ctx.close();
});

test('sync: un annulla in sospeso sparisce quando un altro dispositivo cambia qualcosa (non cancella le sue aggiunte)', async () => {
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(false), storage: { 'fakedb:state': coreDoc(), 'fakedb:s-100-1': sessionDoc('100-1', 2), 'fakedb:s-200-2': sessionDoc('200-2', 3) } });
  await goMontata(page);
  await page.locator('#sessions li[data-ts="200-2"] [data-del-ts]').click();
  assert.equal(await page.locator('#toast').isVisible(), true);
  await page.evaluate((d) => window.__external({ set: { 's-tel-9': d } }), JSON.parse(sessionDoc('tel-9', 4)));
  await page.waitForFunction(() => /6 h su/.test(document.querySelector('#wear').innerText));
  assert.equal(await page.locator('#toast').isVisible(), false, 'il toast di annulla è stato nascosto');
  assert.deepEqual((await dbKeys(page, 's-')).sort(), ['fakedb:s-100-1', 'fakedb:s-tel-9']);
  await ctx.close();
});

test('sync: salvataggio online fallito, la modifica resta a schermo e non viene sostituita dal server', async () => {
  const { page, ctx } = await openPage({ claude: FAKE_CLAUDE(false, { failSet: true }), storage: { 'fakedb:state': coreDoc(), 'fakedb:s-100-1': sessionDoc('100-1', 2) } });
  await goMontata(page);
  await addHours(page, '1,5');
  await page.waitForTimeout(900);
  assert.match(await page.innerText('#wear'), /3,5 h su/, 'le 1,5 ore aggiunte sono ancora lì');
  assert.equal(await page.locator('#sessions li[data-ts]').count(), 2);
  await ctx.close();
});
