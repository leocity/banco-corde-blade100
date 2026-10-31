const { openPage, stateOf, bodyText, BAD, test, assert } = require('./ui.cjs');

const goMontata = async (page) => { await page.locator('#tab-montata').click(); await page.waitForSelector('#diary .rate'); };
const rate = (page, cat, v) => page.locator(`#diary .rate[data-cat="${cat}"] .rb[data-v="${v}"]`).click();
const diaryOf = async (page) => (await stateOf(page)).equipped.diary;
// db a raccolta simulato (stesso schema degli altri test)
const FAKE = `(() => { const P = 'fakedb:'; const subs = [];
  const all = () => Object.keys(localStorage).filter((k) => k.startsWith(P)).sort().map((k) => { const id = k.slice(P.length); const v = JSON.parse(localStorage.getItem(k)); return { id, exists: true, data: () => v }; });
  const notify = () => subs.forEach((cb) => cb({ docs: all() }));
  window.__ext = (id, d) => { localStorage.setItem(P + id, JSON.stringify(d)); notify(); };
  const col = { get: async () => ({ docs: all() }), onSnapshot: (cb) => { subs.push(cb); return () => {}; }, doc: (id) => ({ set: async (d) => { localStorage.setItem(P + id, JSON.stringify(d)); notify(); }, delete: async () => { localStorage.removeItem(P + id); notify(); } }) };
  window.claude = { use: async (n) => n === 'db' ? { collection: () => col } : n === 'user' ? { id: async () => 'u1' } : null }; })()`;

test('diario: si trova in Montata senza cercarlo, a 390 px', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await page.locator('#tab-montata').click();
  const card = await page.locator('#diary').boundingBox();
  assert.ok(card.y < 900, `la card Voti e sensazioni sta a ${card.y}px: troppo in basso`);
  assert.match(await page.innerText('#diary'), /Voti e sensazioni/);
  for (const m of ['Primo colpo', 'Metà vita', 'Fine vita']) assert.match(await page.innerText('#diary .moments'), new RegExp(m, 'i'));
  await ctx.close();
});

test('diario: cinque voti al primo colpo, media sul momento, restano dopo il reload', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  for (const [c, v] of [['spin', 4], ['control', 3], ['power', 2], ['comfort', 5], ['durability', 4]]) await rate(page, c, v);
  assert.deepEqual((await diaryOf(page)).ratings.first, { spin: 4, control: 3, power: 2, comfort: 5, durability: 4 });
  assert.match(await page.innerText('#diary .mom[data-moment="first"]'), /3,6/);
  assert.equal(await page.locator('#diary .rate[data-cat="spin"] .rb[data-v="4"]').getAttribute('aria-pressed'), 'true');
  await page.reload();
  await page.waitForFunction(() => window.__bancoReady === true);
  await goMontata(page);
  assert.equal(await page.locator('#diary .rate[data-cat="spin"] .rb[data-v="4"]').getAttribute('aria-pressed'), 'true');
  await ctx.close();
});

test('diario: ritoccare lo stesso voto lo toglie; i pulsanti sono da 44 px', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await rate(page, 'spin', 4);
  await rate(page, 'spin', 4);
  assert.equal((await diaryOf(page)).ratings.first, undefined);
  const b = await page.locator('#diary .rb').first().boundingBox();
  assert.ok(b.width >= 40 && b.height >= 40, `bersaglio ${b.width}x${b.height}`);
  await ctx.close();
});

test('diario: i tre momenti sono separati', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await rate(page, 'spin', 5);
  await page.locator('#diary .mom[data-moment="end"]').click();
  assert.equal(await page.locator('#diary .rate[data-cat="spin"] .rb[aria-pressed="true"]').count(), 0);
  await rate(page, 'spin', 2);
  const r = (await diaryOf(page)).ratings;
  assert.deepEqual([r.first.spin, r.end.spin], [5, 2]);
  await ctx.close();
});

test('diario: verdetto Sì segna la preferita con Annulla, Forse non cambia nulla', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  const before = (await stateOf(page)) || { liked: [] };
  await page.locator('#diary [data-verdict="forse"]').click();
  const maybe = await stateOf(page);
  assert.deepEqual(maybe.liked, ['solinco-confidential-16l', 'toroline-o-toro-17']);
  await page.locator('#diary [data-verdict="si"]').click();
  assert.ok((await stateOf(page)).liked.includes('re-string-zero-17'));
  assert.match(await page.innerText('#toast'), /preferita/);
  await page.locator('#toast button').click();
  assert.equal((await stateOf(page)).liked.includes('re-string-zero-17'), false);
  await page.locator('#diary [data-verdict="no"]').click();
  assert.ok((await stateOf(page)).disliked.includes('re-string-zero-17'));
  await ctx.close();
});

test('diario: la tensione usata si modifica, 99 kg viene rifiutata con un messaggio', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await page.locator('#diary details[data-dsec="setup"] summary').click();
  await page.locator('#diary [data-dkg="v"]').fill('99');
  await page.locator('#diary [data-dkg="v"]').dispatchEvent('change');
  assert.ok(await page.locator('#diary .d-error').isVisible());
  assert.deepEqual((await stateOf(page) || { equipped: { kg: [22.5, 21.5] } }).equipped.kg, [22.5, 21.5]);
  await page.locator('#diary [data-dkg="v"]').fill('23,5');
  await page.locator('#diary [data-dkg="v"]').dispatchEvent('change');
  assert.deepEqual((await stateOf(page)).equipped.kg, [23.5, 21.5]);
  assert.match(await page.innerText('#strip'), /23,5/);
  await ctx.close();
});

test('diario: setup, tag, note e prossima volta, con HTML che resta testo', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await page.locator('#diary [data-tag="secca"]').click();
  await page.locator('#diary [data-tag="precisa"]').click();
  await page.locator('#diary [data-dnotes]').fill('<img src=x onerror="window.__p=1"> spin ottimo');
  await page.locator('#diary [data-dnotes]').dispatchEvent('change');
  await page.locator('#diary details[data-dsec="setup"] summary').click();
  await page.locator('#diary [data-dsetup="surface"]').selectOption('terra');
  await page.locator('#diary [data-dsetup="stringer"]').fill('Marco');
  await page.locator('#diary [data-dsetup="stringer"]').dispatchEvent('change');
  await page.locator('#diary [data-dnext]').selectOption('-1');
  const d = await diaryOf(page);
  assert.deepEqual(d.tags, ['secca', 'precisa']);
  assert.equal(d.setup.surface, 'terra');
  assert.equal(d.setup.stringer, 'Marco');
  assert.equal(d.nextKgDelta, -1);
  assert.match(d.notes, /<img/);
  assert.equal(await page.evaluate(() => window.__p), undefined);
  assert.equal(await page.locator('#diary img').count(), 0);
  await page.reload();
  await page.waitForFunction(() => window.__bancoReady === true);
  await goMontata(page);
  assert.match(await page.inputValue('#diary [data-dnotes]'), /<img src=x/);
  await ctx.close();
});

test('diario: tensiometro con la perdita calcolata e letture non valide rifiutate', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await page.locator('#diary details[data-dsec="meter"] summary').click();
  for (const [h, v] of [['0', '25'], ['10', '22,5']]) { await page.locator('#diary .d-meter-h').fill(h); await page.locator('#diary .d-meter-v').fill(v); await page.locator('#diary [data-dmeter-add]').click(); }
  assert.match(await page.innerText('#diary details[data-dsec="meter"]'), /−10/);
  await page.locator('#diary .d-meter-h').fill('x'); await page.locator('#diary .d-meter-v').fill('0'); await page.locator('#diary [data-dmeter-add]').click();
  assert.ok(await page.locator('#diary .d-error').isVisible());
  assert.equal((await diaryOf(page)).meter.length, 2);
  await page.locator('[data-dmeter-del="0"]').click();
  assert.equal((await diaryOf(page)).meter.length, 1);
  await ctx.close();
});

test('diario: con db simulato i voti stanno nel documento state e tornano dopo il reload', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, claude: FAKE });
  await goMontata(page);
  await rate(page, 'control', 5);
  await page.waitForFunction(() => { const v = localStorage.getItem('fakedb:state'); return v && JSON.parse(v).equipped.diary; });
  await page.reload();
  await page.waitForFunction(() => window.__bancoReady === true);
  await goMontata(page);
  assert.equal(await page.locator('#diary .rate[data-cat="control"] .rb[data-v="5"]').getAttribute('aria-pressed'), 'true');
  await ctx.close();
});

test('diario: nessun NaN e nessuno scroll orizzontale a 390 px', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await rate(page, 'spin', 3);
  assert.doesNotMatch(await page.innerText('#diary'), BAD);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await ctx.close();
});

const pastRate = (page, cat, v) => page.locator(`#past-diary .rate[data-cat="${cat}"] .rb[data-v="${v}"]`).click();

test('diario: cambiando corda si possono dare i voti di fine vita, che restano nello storico', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await rate(page, 'spin', 4);
  await page.locator('[data-add-hours="2"]').click();
  await page.locator('#equip-btn').click();
  await page.locator('#eq-rate').check();
  await page.locator('#eq-ok').click();
  await page.waitForSelector('#past-dialog[open]');
  assert.equal(await page.locator('#past-diary .mom[data-moment="end"]').getAttribute('aria-pressed'), 'true');
  await pastRate(page, 'spin', 3);
  await pastRate(page, 'comfort', 2);
  await page.locator('#past-close').click();
  const st = await stateOf(page);
  assert.equal(st.lives.length, 1);
  assert.deepEqual(st.lives[0].diary.ratings, { first: { spin: 4 }, end: { spin: 3, comfort: 2 } });
  assert.equal(st.equipped.diary, undefined, 'la nuova montata parte senza diario');
  assert.match(await page.innerText('#history'), /Re-String Zero/);
  await ctx.close();
});

test('diario: dallo storico si riapre e si modifica il diario di una corda finita', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await rate(page, 'control', 5);
  await page.locator('#equip-btn').click();
  await page.locator('#eq-ok').click();
  await page.locator('#history [data-past-open]').first().click();
  await page.waitForSelector('#past-dialog[open]');
  assert.equal(await page.locator('#past-diary .rate[data-cat="control"] .rb[data-v="5"]').getAttribute('aria-pressed'), 'true');
  await page.locator('#past-diary [data-verdict="si"]').click();
  await page.locator('#past-close').click();
  const st = await stateOf(page);
  assert.equal(st.lives[0].diary.verdict, 'si');
  assert.ok(st.liked.includes('re-string-zero-17'), 'il verdetto della corda finita aggiorna le preferite');
  await ctx.close();
});

test('diario: aggiungere una prova passata con tensione, date, ore e voti', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await page.locator('#past-add').click();
  await page.locator('#tr-q').fill('Hyper-G');
  const pick = await page.locator('#tr-pick option').first().getAttribute('value');
  await page.locator('#tr-pick').selectOption(pick);
  await page.locator('#tr-kgv').fill('99'); await page.locator('#tr-kgh').fill('22');
  await page.locator('#tr-from').fill('2026-09-01'); await page.locator('#tr-to').fill('2026-09-20'); await page.locator('#tr-hours').fill('12');
  await page.locator('#tr-ok').click();
  assert.ok(await page.locator('#tr-error').isVisible(), 'tensione 99 kg rifiutata');
  await page.locator('#tr-kgv').fill('23,5');
  await page.locator('#tr-to').fill('2026-08-01');
  await page.locator('#tr-ok').click();
  assert.match(await page.innerText('#tr-error'), /date/i);
  await page.locator('#tr-to').fill('2026-09-20');
  await page.locator('#tr-ok').click();
  await page.waitForSelector('#past-dialog[open]');
  await pastRate(page, 'spin', 5);
  await page.locator('#past-close').click();
  const st = await stateOf(page);
  const life = st.lives.find((l) => l.id === pick);
  assert.deepEqual([life.kg, life.hours, life.reason], [[23.5, 22], 12, 'consumata']);
  assert.equal(life.diary.ratings.end.spin, 5);
  assert.match(await page.innerText('#history'), /Hyper-G/);
  await ctx.close();
});

test('diario: nello storico nessun NaN e nessuno scroll orizzontale', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await page.locator('#equip-btn').click();
  await page.locator('#eq-ok').click();
  assert.doesNotMatch(await page.innerText('#history'), BAD);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await ctx.close();
});

// ---- Task 9: prove nella scheda, laboratorio contro sensazioni, CSV ----
const DATA = require('../../data/strings.json');
const EQ_ID = DATA.defaults.equipped.id;
const stateJson = (lives, extra = {}) => JSON.stringify({ v: 2, equipped: { id: EQ_ID, kg: [22.5, 21.5], since: '2026-10-01T10:00:00.000Z', hours0: 0 }, liked: DATA.defaults.liked, disliked: [], sessions: [], lives, ...extra });
const life = (lid, id, kgv, ratings, extra = {}) => ({ lid, id, kg: [kgv, kgv - 1], from: `2026-0${(lid.length % 8) + 1}-01T12:00:00.000Z`, to: `2026-0${(lid.length % 8) + 1}-20T12:00:00.000Z`, hours: 10, reason: 'consumata', note: '', diary: { setup: {}, meter: [], ratings, tags: [], notes: '', verdict: null, nextKgDelta: null, ...extra } });
const withSpin = DATA.strings.filter((r) => r.twu && typeof r.twu.spin_potential === 'number' && r.id !== EQ_ID);
const bySpin = (n) => [...new Map(withSpin.map((r) => [r.twu.spin_potential, r])).values()].sort((a, b) => a.twu.spin_potential - b.twu.spin_potential).filter((_, i, a) => i % Math.floor(a.length / n) === 0).slice(0, n);

test('diario: la scheda mostra «Le tue prove» per tensione, con la frase neutra', async () => {
  const lives = [life('L1', EQ_ID, 23.5, { end: { spin: 3, control: 4 } }, { verdict: 'no' }), life('L22', EQ_ID, 22.5, { end: { spin: 4, control: 3 } }, { verdict: 'si' })];
  const { page, ctx } = await openPage({ width: 390, height: 844, storage: { 'banco-corde:state': stateJson(lives) } });
  await goMontata(page);
  await page.locator('#mine-summary [data-open]').first().click();
  await page.waitForSelector('dialog#sheet[open] .trials-sec');
  const t = await page.innerText('#sheet-body .trials-sec');
  assert.match(t, /Le tue prove \(2\)/);
  assert.ok(t.indexOf('22,5') < t.indexOf('23,5'), 'ordinate per tensione');
  assert.match(t, /a 22,5 kg: spin 4, controllo 3 · a 23,5 kg: spin 3, controllo 4/);
  assert.match(t, /sensazioni, non misure/i);
  assert.doesNotMatch(t, BAD);
  assert.ok(await page.evaluate(() => document.getElementById('sheet').scrollWidth <= document.getElementById('sheet').clientWidth));
  await ctx.close();
});

test('diario: senza prove la scheda non mostra la sezione', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, storage: { 'banco-corde:state': stateJson([]) } });
  await goMontata(page);
  await page.locator('#mine-summary [data-open]').first().click();
  await page.waitForSelector('dialog#sheet[open]');
  assert.equal(await page.locator('#sheet-body .trials-sec').count(), 0);
  await ctx.close();
});

test('diario: Metodo mostra il laboratorio solo con 5 corde con voti di fine vita, con n e la cautela', async () => {
  const five = bySpin(6), ratings = [1, 2, 3, 4, 5, 5];
  const mk = (strs) => strs.map((r, i) => life(`M${i}`, r.id, 22.5, { end: { spin: ratings[i] } }));
  let o = await openPage({ storage: { 'banco-corde:state': stateJson(mk(five.slice(0, 4))) } });
  await o.page.locator('[data-goto="metodo"]').first().click();
  assert.equal(await o.page.locator('#m-sensazioni').count(), 0, 'con 4 corde non c\'è');
  await o.ctx.close();
  o = await openPage({ storage: { 'banco-corde:state': stateJson(mk(five)) } });
  await o.page.locator('[data-goto="metodo"]').first().click();
  const t = await o.page.innerText('#m-sensazioni');
  assert.match(t, /Laboratorio contro sensazioni/);
  assert.match(t, /Spin ↔ spin TWU/);
  assert.match(t, /0,9\d/);
  assert.match(t, /\b6\b/);
  assert.match(t, /troppo poche corde per fidarsi/);
  assert.doesNotMatch(t, BAD);
  await o.ctx.close();
});

const DL = `(() => { window.claude = { use: async (n) => n === 'downloads' ? { save: async (r) => { window.__saved = r; return { status: 'saved' }; } } : null }; })()`;

test('diario: esporta il diario in CSV solo con downloads, una riga per prova e momento', async () => {
  const lives = [life('C1', 'solinco-confidential-16l', 22.5, { first: { spin: 4 }, end: { spin: 3 } }, { notes: 'a, "b"', tags: ['secca'] })];
  let o = await openPage({ storage: { 'banco-corde:state': stateJson(lives) } });
  await o.page.locator('#tab-montata').click();
  assert.equal(await o.page.locator('#export-diary').isVisible(), false, 'senza downloads è nascosto');
  await o.ctx.close();
  o = await openPage({ claude: DL, storage: { 'banco-corde:state': stateJson(lives) } });
  await o.page.locator('#tab-montata').click();
  await o.page.locator('#export-diary').click();
  const saved = await o.page.evaluate(() => window.__saved);
  assert.equal(saved.filename, 'banco-corde-diario.csv');
  const rows = saved.data.replace(/^﻿/, '').split('\r\n');
  assert.match(rows[0], /^corda,/i);
  assert.equal(rows.length - 1, 3, 'montata senza voti + 2 momenti della prova passata');
  assert.match(saved.data, /"a, ""b"""/);
  await o.ctx.close();
});

test('diario: nel dialogo dei voti di una corda finita i cinque tondi stanno dentro lo schermo a 390 px', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMontata(page);
  await page.locator('#equip-btn').click();
  await page.locator('#eq-ok').click();
  await page.locator('#history [data-past-open]').first().click();
  await page.waitForSelector('#past-dialog[open] .rate');
  const bad = await page.evaluate(() => [...document.querySelectorAll('#past-diary .rb')].filter((b) => { const r = b.getBoundingClientRect(); return r.right > window.innerWidth - 4 || r.width < 40 || r.height < 40; }).length);
  assert.equal(bad, 0, 'tondi tagliati o sotto i 40 px');
  assert.ok(await page.evaluate(() => { const d = document.getElementById('past-dialog'); return d.scrollWidth <= d.clientWidth; }));
  await ctx.close();
});

test('diario: le righe di «Le tue prove» non hanno altezze vuote', async () => {
  const lives = [life('H1', EQ_ID, 22.5, { end: { spin: 4 } }), life('H22', EQ_ID, 23.5, { end: { spin: 3 } })];
  const { page, ctx } = await openPage({ width: 390, height: 844, storage: { 'banco-corde:state': stateJson(lives) } });
  await goMontata(page);
  await page.locator('#mine-summary [data-open]').first().click();
  await page.waitForSelector('#sheet-body .trials-sec li');
  const hs = await page.$$eval('#sheet-body .trials-sec li', (els) => els.map((e) => e.getBoundingClientRect().height));
  assert.ok(hs.every((h) => h < 110), `altezze righe: ${hs}`);
  await ctx.close();
});

test('diario: dopo aver scritto una nota, il primo tocco su un voto, un tag o il verdetto non va perso', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, hasTouch: true });
  await goMontata(page);
  await page.locator('#diary [data-dnotes]').fill('suona secca');
  await page.locator('#diary .rate[data-cat="spin"] .rb[data-v="4"]').click();
  let d = await diaryOf(page);
  assert.equal(d.notes, 'suona secca');
  assert.equal(d.ratings.first && d.ratings.first.spin, 4, 'il tocco sul voto è arrivato');
  await page.locator('#diary [data-dnotes]').fill('suona secca e vibra');
  await page.locator('#diary [data-tag="vibra"]').click();
  d = await diaryOf(page);
  assert.deepEqual([d.notes, d.tags], ['suona secca e vibra', ['vibra']]);
  await page.locator('#diary [data-dnotes]').fill('ok');
  await page.locator('#diary [data-verdict="forse"]').click();
  assert.equal((await diaryOf(page)).verdict, 'forse');
  await ctx.close();
});

test('diario: un aggiornamento da un altro dispositivo non cancella il testo che stai scrivendo', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, claude: FAKE });
  await goMontata(page);
  await rate(page, 'spin', 3);                       // un primo salvataggio crea il documento state nel db simulato
  await page.waitForFunction(() => localStorage.getItem('fakedb:state'));
  const since = await page.evaluate(() => JSON.parse(localStorage.getItem('fakedb:state')).equipped.since);
  await page.locator('#diary [data-dnotes]').focus();
  await page.keyboard.type('testo non ancora salvato');
  await page.evaluate((life) => window.__ext('s-9-9', { date: '2026-10-29', hours: 2, note: '', life, ts: '9-9' }), since);
  await page.waitForFunction(() => document.querySelectorAll('#sessions li[data-ts]').length >= 1);
  assert.equal(await page.locator('#diary [data-dnotes]').inputValue(), 'testo non ancora salvato');
  assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-dnotes')), true, 'la tastiera resta aperta');
  await ctx.close();
});

// ---- mobile first: si parte da 360 px (la larghezza più comune), non da 390 ----
const LONG = 'https://esempio.example.com/' + 'a'.repeat(140);
const hostileState = () => stateJson([life('W1', EQ_ID, 22.5, { end: { spin: 4 } }, { notes: LONG, stringer: LONG })], { sessions: [{ ts: 'w-1', date: '2026-10-20', hours: 2, note: LONG, life: '2026-10-01T10:00:00.000Z' }] });
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const w of [320, 360, 375, 390]) {
  test(`mobile ${w}px: Montata, diario, dialoghi e scheda senza scroll laterale e con tocchi da 44 px`, async () => {
    const { page, ctx } = await openPage({ width: w, height: 800, hasTouch: true, storage: { 'banco-corde:state': hostileState() } });
    await goMontata(page);
    assert.ok(await noSideScroll(page), `Montata più larga di ${w}px (${await page.evaluate(() => document.documentElement.scrollWidth)})`);
    const small = await page.evaluate(() => [...document.querySelectorAll('#diary .rb, #diary .mom, #diary .chipbtn, #diary .tg')].filter((b) => { const r = b.getBoundingClientRect(); return r.width < 40 || r.height < 36 || r.right > window.innerWidth; }).length);
    assert.equal(small, 0, 'pulsanti del diario tagliati o troppo piccoli');
    assert.ok(await page.evaluate(() => { const r = document.querySelector('.rate .rb:last-child').getBoundingClientRect(); return r.right <= window.innerWidth - 4; }), 'il 5° tondo è dentro lo schermo');
    // header: il pulsante Metodo non è tagliato
    assert.ok(await page.evaluate(() => { const b = document.querySelector('.guide-btn'); const r = b.getBoundingClientRect(); return r.right <= window.innerWidth && r.left >= 0; }), 'Metodo visibile');
    // dialogo dei voti di una corda finita
    await page.locator('#history [data-past-open]').first().click();
    await page.waitForSelector('#past-dialog[open] .rate');
    assert.ok(await page.evaluate(() => { const d = document.getElementById('past-dialog'); return d.scrollWidth <= d.clientWidth && [...d.querySelectorAll('.rb')].every((b) => b.getBoundingClientRect().right <= innerWidth); }), 'dialogo dei voti dentro lo schermo');
    await page.locator('#past-close').click();
    // dialogo prova passata e cambio corda
    for (const [open, dlg] of [['#past-add', '#trial-dialog'], ['#equip-btn', '#equip-dialog']]) {
      await page.locator(open).click();
      await page.waitForSelector(`${dlg}[open]`);
      assert.ok(await page.evaluate((s) => { const d = document.querySelector(s); return d.scrollWidth <= d.clientWidth && d.getBoundingClientRect().right <= innerWidth; }, dlg), `${dlg} dentro lo schermo`);
      await page.keyboard.press('Escape');
    }
    // scheda con «Le tue prove» e testo lunghissimo
    await page.locator('#mine-summary [data-open]').first().click();
    await page.waitForSelector('#sheet-body .trials-sec li');
    assert.ok(await page.evaluate(() => { const d = document.getElementById('sheet'); return d.scrollWidth <= d.clientWidth; }), 'scheda senza scroll laterale');
    await ctx.close();
  });
}

// ---- «Cambia corda» su telefoni piccoli: il pulsante Monta e l'errore sono sempre in vista ----
for (const [w, h] of [[360, 520], [360, 640], [320, 568]]) {
  test(`mobile ${w}x${h}: nei dialoghi i pulsanti d'azione e gli errori restano in vista senza scorrere`, async () => {
    const { page, ctx } = await openPage({ width: w, height: h, hasTouch: true });
    await goMontata(page);
    const inView = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; }, sel);
    await page.locator('#equip-btn').click();
    await page.waitForSelector('#equip-dialog[open]');
    assert.ok(await inView('#eq-ok'), 'Monta in vista');
    assert.ok(await inView('#eq-cancel'), 'Annulla in vista');
    await page.locator('#eq-kgv').fill('99');
    await page.locator('#eq-ok').tap();
    assert.ok(await page.locator('#eq-error').isVisible(), 'messaggio di errore mostrato');
    assert.ok(await inView('#eq-error'), 'il messaggio è in vista, accanto al pulsante');
    await page.locator('#eq-kgv').fill('22,5');
    await page.locator('#eq-ok').tap();
    await page.waitForFunction(() => !document.getElementById('equip-dialog').open);
    assert.notEqual((await stateOf(page)).lives.length, 0, 'il cambio è avvenuto');
    // prova passata e voti di una corda finita
    await page.locator('#past-add').tap();
    await page.waitForSelector('#trial-dialog[open]');
    assert.ok(await inView('#tr-ok') && await inView('#tr-cancel'), 'Aggiungi/Annulla in vista');
    await page.locator('#tr-cancel').tap();
    await page.locator('#history [data-past-open]').first().tap();
    await page.waitForSelector('#past-dialog[open]');
    assert.ok(await inView('#past-close'), 'Fatto in vista');
    await page.locator('#past-close').tap();
    await ctx.close();
  });
}
