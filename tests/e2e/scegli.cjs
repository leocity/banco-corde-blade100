const { openPage, openSheetById, bodyText, stateOf, BAD, test, assert } = require('./ui.cjs');

const openFilter = async (page) => { await page.locator('#filter-btn').click(); await page.waitForSelector('#filter-dialog[open]'); };
const closeFilter = async (page) => { await page.locator('#flt-ok').click(); await page.waitForFunction(() => !document.getElementById('filter-dialog').open); };

test('scegli: striscia montata e top 3', async () => {
  const { page, ctx, errors } = await openPage();
  assert.match(await page.innerText('#strip'), /Re-String Zero/);
  assert.equal(await page.locator('#top3 .crow2wrap').count(), 3);
  for (const card of await page.locator('#top3 .crow2wrap').all()) assert.ok(await card.locator('.pair').count());
  const top = await page.$$eval('#top3 .crow2wrap', (els) => els.map((e) => e.dataset.id));
  const list = await page.$$eval('#list .crow2wrap', (els) => els.map((e) => e.dataset.id));
  assert.deepEqual(top.filter((id) => list.includes(id)), []);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('scegli: nessuno scroll orizzontale a 390 px', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await ctx.close();
});

test('scegli: nessun NaN/undefined/null nel testo', async () => {
  const { page, ctx } = await openPage();
  assert.doesNotMatch(await bodyText(page), BAD);
  await ctx.close();
});

test('scegli: «Filtra» apre un solo pannello con marca e solo misurate, il conteggio si vede e si azzera', async () => {
  const { page, ctx } = await openPage();
  assert.equal((await page.innerText('#filter-btn')).trim(), 'Filtra');
  await openFilter(page);
  const brand = await page.locator('#flt-brands button[data-brand]').first().getAttribute('data-brand');
  await page.locator(`#flt-brands button[data-brand="${brand}"]`).click();
  assert.match(await page.innerText('#flt-ok'), /Mostra \d+ cord/);
  await closeFilter(page);
  assert.equal((await page.innerText('#filter-btn')).trim(), 'Filtra (1)');
  const names = await page.$$eval('#list .nm', (els) => els.map((e) => e.textContent));
  assert.ok(names.length > 0 && names.every((n) => n.startsWith(brand)), names.join('|'));
  await openFilter(page);
  await page.locator('#flt-measured').check();
  await closeFilter(page);
  const classes = await page.$$eval('#list .crow2wrap .m[data-k="spin"]', (els) => els.map((e) => e.className));
  assert.ok(classes.length > 0 && classes.every((c) => c.includes('measured')), classes.join('|'));
  await openFilter(page);
  await page.locator('#flt-reset').click();
  await closeFilter(page);
  assert.equal((await page.innerText('#filter-btn')).trim(), 'Filtra');
  await ctx.close();
});

test('scegli: "non mi piace" cambia lo stato, resta dopo il reload ed è annullabile dalla scheda', async () => {
  const { page, ctx } = await openPage();
  const id = await page.locator('#list .crow2wrap').first().getAttribute('data-id');
  await page.locator(`#list .crow2wrap[data-id="${id}"] .crow2`).click();
  await page.locator('#sheet-body [data-dislike]').click();
  await page.locator('#sheet-close').click();
  await page.waitForFunction((i) => (JSON.parse(localStorage.getItem('banco-corde:state') || '{}').disliked || []).includes(i), id);
  await page.reload();
  await page.waitForFunction(() => window.__bancoReady === true);
  await openSheetById(page, id);
  assert.equal(await page.locator('#sheet-body [data-dislike]').getAttribute('aria-pressed'), 'true');
  await page.locator('#sheet-body [data-dislike]').click();
  assert.equal((await stateOf(page)).disliked.includes(id), false);
  await ctx.close();
});

test('scegli: senza "mi piace" invita a segnarne una, senza errori', async () => {
  const st = JSON.stringify({ v: 2, equipped: { id: 're-string-zero-17', kg: [22.5, 21.5], since: '2026-10-01T10:00:00.000Z', hours0: 0 }, liked: [], disliked: [], sessions: [], lives: [] });
  const { page, ctx, errors } = await openPage({ storage: { 'banco-corde:state': st } });
  assert.ok(await page.locator('#no-refs').isVisible());
  assert.equal(await page.locator('#top3 .crow2wrap').count(), 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('scegli: le 3 da provare sono delle marche valutate; «Anche altre marche» aggiunge marche', async () => {
  const { page, ctx } = await openPage();
  const flags = await page.evaluate(() => { const D = window.STRINGS_DATA.strings; return [...document.querySelectorAll('#top3 .crow2wrap')].map((e) => D.find((r) => r.id === e.dataset.id).is_target); });
  assert.deepEqual(flags, [true, true, true]);
  await openFilter(page);
  const before = await page.locator('#flt-brands [data-brand]').count();
  await page.locator('#flt-others').check();
  assert.ok((await page.locator('#flt-brands [data-brand]').count()) > before);
  await ctx.close();
});

test('scegli: ricerca e Filtra stanno in cima e la prima scelta si vede subito sul telefono', async () => {
  const { page, ctx } = await openPage({ width: 360, height: 740 });
  const q = await page.locator('#q').boundingBox(), f = await page.locator('#filter-btn').boundingBox();
  assert.ok(q.y < 200 && f.y < 200, `ricerca a ${q.y}, filtra a ${f.y}`);
  assert.ok(q.height >= 44 && f.height >= 44, 'tocchi da 44 px');
  const top = await page.locator('#top3 .crow2wrap').first().boundingBox();
  assert.ok(top.y < 330, `la prima scheda inizia a ${top.y}px: deve stare nella prima schermata`);
  await ctx.close();
});

test('scegli: righe compatte, tutta la riga apre la scheda, almeno 6 righe in due schermate scarse', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, hasTouch: true });
  const rows = await page.locator('#list .crow2wrap').all();
  const hs = [];
  for (const r of rows.slice(0, 6)) hs.push((await r.boundingBox()).height);
  assert.ok(hs.every((h) => h <= 80), `altezze: ${hs.join(',')}`);
  assert.ok(hs.reduce((a, b) => a + b, 0) <= 6 * 80);
  assert.equal(await page.locator('#list .crow2wrap button').count(), await page.locator('#list .crow2wrap').count(), 'un solo pulsante per riga');
  await page.locator('#list .crow2').first().tap();
  assert.ok(await page.locator('dialog#sheet[open]').count());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await ctx.close();
});
