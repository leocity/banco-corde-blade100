const { openPage, openSheetById, BAD, test, assert } = require('./ui.cjs');

const addFromSheet = async (page, id) => { await openSheetById(page, id); await page.locator('#sheet-body [data-compare]').click(); };

test('confronto: «Confronta» nella scheda aggiunge la corda, chiude la scheda e mostra il pannello con un invito', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, hasTouch: true });
  await addFromSheet(page, 'toroline-o-toro-17');
  assert.equal(await page.locator('dialog#sheet[open]').count(), 0, 'la scheda si chiude');
  assert.ok(await page.locator('#tray').isVisible());
  assert.match(await page.innerText('#tray'), /1 corda · aggiungine un'altra/);
  await page.locator('#tray-toggle').click();
  assert.match(await page.innerText('#tray'), /O-Toro[\s\S]*apri un'altra corda/);
  assert.equal(await page.locator('#tray .tcol').count(), 0, 'con una sola corda non c\'è ancora il confronto');
  await ctx.close();
});

test('confronto: con due corde il pannello mostra i valori, il riepilogo e il bottone nella scheda dice «In confronto»', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, hasTouch: true });
  await addFromSheet(page, 'toroline-o-toro-17');
  await addFromSheet(page, 'solinco-hyper-g-round-17');
  assert.equal(await page.locator('#tray .tcol').count(), 0, 'chiuso: solo la barra');
  assert.match(await page.innerText('#tray'), /2 corde/);
  await page.locator('#tray-toggle').click();
  assert.equal(await page.locator('#tray .tcol').count(), 2);
  assert.match(await page.innerText('#tray'), /Passando da/);
  await page.locator('#tray-toggle').click();
  await openSheetById(page, 'toroline-o-toro-17');
  assert.match(await page.innerText('#sheet-body [data-compare]'), /In confronto/);
  assert.equal(await page.locator('#sheet-body [data-compare]').getAttribute('aria-pressed'), 'true');
  await ctx.close();
});

test('confronto: togliere una corda, svuotare, e massimo 4 con un messaggio', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, hasTouch: true });
  for (const id of ['toroline-o-toro-17', 'solinco-hyper-g-round-17', 'solinco-confidential-17', 'grapplesnake-tour-m8-17']) await addFromSheet(page, id);
  assert.match(await page.innerText('#tray'), /4 corde/);
  await openSheetById(page, 're-string-zero-17');
  await page.locator('#sheet-body [data-compare]').click();
  assert.match(await page.innerText('#tray'), /Al massimo 4/);
  await page.locator('#sheet-close').click();
  await page.locator('#tray-toggle').click();
  assert.equal(await page.locator('#tray .tcol').count(), 4);
  await page.locator('#tray [data-uncmp]').first().click();
  assert.equal(await page.locator('#tray .tcol').count(), 3);
  await page.locator('#cmp-clear').click();
  assert.equal(await page.locator('#tray').isVisible(), false);
  await ctx.close();
});

test('confronto: marcatori e dati mancanti con il motivo, senza NaN', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, hasTouch: true });
  const id = await page.evaluate(() => window.STRINGS_DATA.strings.find((d) => d.derived.dims.durability === null && d.is_target).id);
  await addFromSheet(page, id);
  await addFromSheet(page, 'toroline-o-toro-17');
  await page.locator('#tray-toggle').click();
  const txt = await page.innerText('#tray');
  assert.match(txt, /manca/);
  assert.match(txt, /[●◐○]/);
  assert.match(txt, /Non confrontabili/);
  assert.doesNotMatch(txt, BAD);
  await ctx.close();
});

test('confronto: il pannello non copre la barra di navigazione né allarga la pagina', async () => {
  const { page, ctx } = await openPage({ width: 360, height: 740, hasTouch: true });
  await addFromSheet(page, 'toroline-o-toro-17');
  await addFromSheet(page, 'solinco-hyper-g-round-17');
  await page.locator('#tray-toggle').click();
  const r = await page.evaluate(() => { const t = document.getElementById('tray').getBoundingClientRect(), n = document.querySelector('.tabs').getBoundingClientRect(); return { trayBottom: Math.round(t.bottom), navTop: Math.round(n.top), w: document.documentElement.scrollWidth }; });
  assert.ok(r.trayBottom <= r.navTop + 1, `il pannello (${r.trayBottom}) scende sotto la barra (${r.navTop})`);
  assert.ok(r.w <= 360);
  await ctx.close();
});
