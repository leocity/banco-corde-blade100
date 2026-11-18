const fs = require('node:fs');
const path = require('node:path');
const { openPage, stateOf, FAKE_CLAUDE, dbDocs, test, assert } = require('./ui.cjs');

const REAL = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/state_real_2026-11-18.json'), 'utf8'));
// il db reale del 18/11/2026 caricato nel db simulato
const realStorage = () => {
  const s = { 'fakedb:state': JSON.stringify(REAL.core) };
  for (const [k, v] of Object.entries(REAL.sessions)) s[`fakedb:${k}`] = JSON.stringify(v);
  for (const [k, v] of Object.entries(REAL.lives)) s[`fakedb:${k}`] = JSON.stringify(v);
  return s;
};

test('Oggi: montata e «+ Uscita» visibili senza scroll a 390 px; la pagina parte in cima', async () => {
  const { page, ctx, errors } = await openPage();
  assert.equal(await page.evaluate(() => window.scrollY), 0);
  assert.match(await page.innerText('#oggi .hero-name'), /Slap 1,23/);
  const box = await page.locator('#quick-add').boundingBox();
  const nav = await page.locator('.tabs').boundingBox();
  assert.ok(box.y + box.height <= nav.y, 'il pulsante sta sopra la barra in basso');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Oggi: uscita e voto in 2 tocchi, salvati sulla stessa sessione; Annulla toglie l\'uscita', async () => {
  const { page, ctx } = await openPage();
  await page.locator('#quick-add').click();
  await page.locator('#oggi .face[data-feel="4"]').click();
  let st = await stateOf(page);
  assert.equal(st.sessions.length, 1);
  assert.equal(st.sessions[0].hours, 1.5);
  assert.equal(st.sessions[0].feel, 4);
  await page.locator('#oggi [data-stag="pastosa"]').evaluate((b) => b.closest('details').setAttribute('open', ''));
  await page.locator('#oggi [data-stag="pastosa"]').click();
  st = await stateOf(page);
  assert.equal(st.sessions[0].tag, 'pastosa');
  await page.locator('#quick-add').click();
  await page.locator('#toast-undo').click();
  assert.equal((await stateOf(page)).sessions.length, 1);
  await ctx.close();
});

test('Oggi: ore non valide mostrano un errore in italiano', async () => {
  const { page, ctx } = await openPage();
  await page.locator('#other-hours').click();
  await page.locator('#hours-input').fill('tanto');
  await page.locator('#hours-add').click();
  assert.match(await page.innerText('#hours-error'), /numero/);
  await ctx.close();
});

test('Oggi: corde in casa, aggiunta e conto; cambio corda dalla scorta con verdetto', async () => {
  const { page, ctx } = await openPage();
  await page.locator('#stock-add').click();
  await page.locator('#pk-q').fill('O-Toro 1,23');
  await page.locator('#pk-list [data-pick="toroline-o-toro-17"]').click();
  await page.locator('#pick-dialog [data-size="mezza"]').click();
  await page.locator('#pk-ok').click();
  await page.locator('#oggi [data-stock-inc="toroline-o-toro-17"]').click();
  assert.deepEqual((await stateOf(page)).stock, [{ id: 'toroline-o-toro-17', size: 'mezza', n: 2 }]);
  await page.locator('#change-btn').click();
  // le corde in casa sono in cima all'elenco
  assert.equal(await page.locator('#pk-list [data-pick]').first().getAttribute('data-pick'), 'toroline-o-toro-17');
  await page.locator('#pk-list [data-pick="toroline-o-toro-17"]').click();
  await page.locator('#pick-dialog [data-verdict="no"]').click();
  await page.locator('#pk-ok').click();
  const st = await stateOf(page);
  assert.equal(st.equipped.id, 'toroline-o-toro-17');
  assert.deepEqual(st.stock, [{ id: 'toroline-o-toro-17', size: 'mezza', n: 1 }]);
  assert.ok(st.disliked.includes('re-string-slap-17'));
  assert.equal(st.lives[0].diary.verdict, 'no');
  assert.match(await page.innerText('#toast'), /non ti piacciono/);
  await ctx.close();
});

test('Oggi: lo stato reale salvato si legge (Slap, 10 h, 6 uscite) e i documenti esistenti restano intatti', async () => {
  const { page, ctx, errors } = await openPage({ claude: FAKE_CLAUDE(), storage: realStorage() });
  await page.waitForFunction(() => /Sincronizzato/.test(document.querySelector('#sync-badge').textContent));
  const txt = await page.innerText('#oggi');
  assert.match(txt, /Re-String Slap 1,23/);
  assert.match(txt, /22,0\/21,0 kg/);
  assert.match(txt, /10 h/);
  assert.match(txt, /6 uscite/);
  assert.match(txt, /durata 17,5 h/);
  await page.locator('#quick-add').click();
  await page.locator('#oggi .face[data-feel="3"]').click();
  await page.waitForTimeout(150);
  const docs = await dbDocs(page);
  for (const [k, v] of Object.entries(REAL.sessions)) assert.deepEqual(docs[k], { ts: v.ts, date: v.date, hours: v.hours, note: v.note, life: v.life }, k);
  assert.deepEqual(docs['l-1793453383457'].diary, REAL.lives['l-1793453383457'].diary);
  assert.deepEqual(docs.state.equipped.diary, REAL.core.equipped.diary);
  assert.equal(Object.keys(docs).filter((k) => k.startsWith('s-')).length, 17);
  assert.deepEqual(errors, []);
  await ctx.close();
});
