const { openPage, stateOf, bodyText, BAD, test, assert } = require('./ui.cjs');

const goMontata = async (page) => { await page.locator('#tab-montata').click(); await page.waitForSelector('#diary .rate'); };
const rate = (page, cat, v) => page.locator(`#diary .rate[data-cat="${cat}"] .rb[data-v="${v}"]`).click();
const diaryOf = async (page) => (await stateOf(page)).equipped.diary;
// db a raccolta simulato (stesso schema degli altri test)
const FAKE = `(() => { const P = 'fakedb:'; const subs = [];
  const all = () => Object.keys(localStorage).filter((k) => k.startsWith(P)).sort().map((k) => { const id = k.slice(P.length); const v = JSON.parse(localStorage.getItem(k)); return { id, exists: true, data: () => v }; });
  const notify = () => subs.forEach((cb) => cb({ docs: all() }));
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
  assert.ok(await page.locator('#d-error').isVisible());
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
  for (const [h, v] of [['0', '25'], ['10', '22,5']]) { await page.locator('#d-meter-h').fill(h); await page.locator('#d-meter-v').fill(v); await page.locator('[data-dmeter-add]').click(); }
  assert.match(await page.innerText('#diary details[data-dsec="meter"]'), /−10/);
  await page.locator('#d-meter-h').fill('x'); await page.locator('#d-meter-v').fill('0'); await page.locator('[data-dmeter-add]').click();
  assert.ok(await page.locator('#d-error').isVisible());
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
