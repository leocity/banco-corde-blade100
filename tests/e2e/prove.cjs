// Scheda «Prove»: piano valutato, montare una prova (anche ibrida) con ore e durata, schede di campo, ordine in arrivo.
const { openPage, tab, FAKE_CLAUDE, dbDocs, BAD, test, assert } = require('./ui.cjs');

test('Prove: prossima prova, piano per finestre, numeri marcati, nessun valore rotto', async () => {
  const { page, ctx, errors } = await openPage({ hash: '#prove' });
  await page.waitForSelector('#prove:not([hidden])');
  assert.match(await page.locator('#prove .hero').innerText(), /PROSSIMA PROVA · N° 1[\s\S]*O-Toro Tour 1,23, full bed[\s\S]*ipotesi del piano 12–16 h/i);
  const n = await page.locator('#prove .pv-row').count();
  const rows = await page.evaluate(() => window.STRINGS_DATA.plan.rows.length);
  assert.equal(n, rows);
  await page.locator('#prove [data-pv-show]').click();
  assert.ok(await page.locator('#prove .pv-row').first().evaluate((d) => d.open));
  assert.ok(await page.locator('#prove .pv-row').first().locator('.mk').count() >= 5); // ogni numero dice se è misurato o ricavato
  const txt = await page.locator('#prove').innerText();
  assert.match(txt, /22 mezze in arrivo, il piano ne usa 22/);
  assert.match(txt, /Head Lynx Tour 1,25, 3 mezze \(2 matassine\)/);
  assert.doesNotMatch(txt, BAD);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Prove: montare un ibrido del piano collega le uscite alla prova (ore, durata) e toglie una mezza per lato', async () => {
  const { page, ctx, errors } = await openPage({ claude: FAKE_CLAUDE(), hash: '#prove' });
  await page.waitForSelector('#prove:not([hidden])');
  await page.locator('#prove [data-pv-arrived], #pv-arrived').click();
  await page.waitForFunction(() => !document.querySelector('#pv-arrived'));
  let docs = await dbDocs(page);
  assert.deepEqual(docs['x-prove'].received, ['ordine-2026-12-15']);
  const octa0 = docs.prefs.stock.find((x) => x.id === 'toroline-o-toro-octa-16l' && x.size === 'mezza').n;
  const row = page.locator('#prove [data-pv-row="ib-heavy-balls"]');
  await row.locator('summary').click();
  await row.locator('[data-pv-mount]').click();
  await page.waitForSelector('#pick-dialog[open]');
  assert.match(await page.locator('#pk-title').innerText(), /prova n° 6/);
  assert.equal(await page.locator('#pk-kgv').inputValue(), '22,0');
  assert.ok(await page.locator('#pk-from-stock').isHidden());
  await page.locator('#pk-ok').click();
  await page.waitForSelector('#oggi:not([hidden])');
  assert.match(await page.locator('#oggi .hero').innerText(), /prova n° 6 del piano · ibrido, orizzontali Toroline O-Toro Snap 1,25/i);
  await page.locator('#quick-add').click();
  await page.waitForFunction(() => JSON.stringify(Object.keys(localStorage)).includes('fakedb:s-'));
  docs = await dbDocs(page);
  assert.equal(docs.state.equipped.id, 'toroline-o-toro-octa-16l');
  assert.equal(docs['x-prove'].links[docs.state.equipped.since], 'ib-heavy-balls');
  assert.equal(docs.prefs.stock.find((x) => x.id === 'toroline-o-toro-octa-16l' && x.size === 'mezza').n, octa0 - 1);
  await tab(page, 'prove');
  const hero = await page.locator('#prove .hero').innerText();
  assert.match(hero, /PROVA IN CORSO · N° 6/i);
  assert.match(hero, /1,5 h in 1 uscita · 0 giorni/);
  assert.match(hero, /ipotesi del piano 12–14 h in corso, 12,5 h al massimo dell'ipotesi/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Prove: scheda di campo con calo %, soglia e voti; si aggiorna, si toglie con Annulla e resta dopo il reload', async () => {
  const { page, ctx, errors } = await openPage({ claude: FAKE_CLAUDE(), hash: '#prove' });
  await page.waitForSelector('#prove:not([hidden])');
  await page.locator('#prove .hero [data-pv-show]').waitFor();
  await page.locator('#prove [data-pv-new=""]').click();
  await page.waitForSelector('#field-dialog[open]');
  await page.locator('#pvf-plan').selectOption('full-o-toro-tour');
  await page.locator('#pvf-dt-4h').fill('36');
  await page.locator('#pvf-save').click();
  assert.match(await page.locator('#pvf-err').innerText(), /appena montata \(0 h\)/);
  await page.locator('#pvf-dt-0h').fill('40');
  await page.locator('#pvf-dt-8h').fill('33');
  await page.locator('[data-pv-chips="feel-arm_comfort"] [data-pv-val="4"]').click();
  await page.locator('[data-pv-chips="verdict"] [data-pv-val="liked"]').click();
  await page.locator('#pvf-save').click();
  await page.waitForSelector('#field-dialog:not([open])', { state: 'attached' });
  const card = page.locator('#prove .pv-card').first();
  const t = await card.innerText();
  assert.match(t, /O-Toro Tour 1,23, full bed[\s\S]*mi piace/);
  assert.match(t, /calo 17,5%/);
  assert.match(t, /superata dopo circa 6,7 h di gioco/);
  assert.match(t, /Comfort del braccio\s*4\/5/);
  assert.match(t, /perdita di laboratorio del letto/);
  let docs = await dbDocs(page);
  const fid = Object.keys(docs).find((k) => k.startsWith('f-'));
  assert.equal(docs[fid].plan, 'full-o-toro-tour');
  assert.deepEqual(docs[fid].dt_log, { '0h': 40, '4h': 36, '8h': 33 });
  assert.match(await page.locator('#prove [data-pv-row="full-o-toro-tour"] summary').innerText(), /fatta/);
  // aggiorna: aggiunge la 12 h
  await card.locator('[data-pv-edit]').click();
  await page.locator('#pvf-dt-12h').fill('31');
  await page.locator('#pvf-save').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('fakedb:f-')))).dt_log['12h'] === 31);
  await page.reload();
  await page.waitForFunction(() => window.__bancoReady === true);
  await page.waitForSelector('#prove .pv-card [data-pv-del]');
  await page.locator('#prove .pv-card [data-pv-del]').first().click();
  await page.waitForFunction(() => !Object.keys(localStorage).some((k) => k.startsWith('fakedb:f-')));
  await page.locator('#toast-undo').click();
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('fakedb:f-')));
  docs = await dbDocs(page);
  assert.equal(Object.values(docs).find((d) => d.fid).dt_log['12h'], 31);
  assert.deepEqual(errors, []);
  await ctx.close();
});
