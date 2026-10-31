const { openPage, openSheetById, BAD, test, assert } = require('./ui.cjs');

test('scheda a 390 px: Monta questa sempre visibile, tessere, nessuna etichetta sovrapposta', async () => {
  const { page, ctx, errors } = await openPage({ width: 390, height: 844, hasTouch: true });
  const ids = await page.evaluate(() => window.STRINGS_DATA.strings.filter((r) => r.is_target).filter((_, i) => i % 9 === 1).map((r) => r.id));
  assert.ok(ids.length >= 4);
  for (const id of ids) {
    await openSheetById(page, id);
    const y0 = await page.evaluate(() => Math.round(scrollY)); // il tocco può far scorrere la pagina: si confronta da scheda aperta a scheda chiusa
    assert.equal(await page.locator('#sheet-body .tile').count(), 3, id);
    const equip = await page.locator('#sheet-body .sheet-actions button').first().boundingBox();
    assert.ok(equip && equip.y >= 0 && equip.y + equip.height <= 844 + 1, `${id}: la barra azioni non è visibile senza scorrere (${JSON.stringify(equip)})`);
    const overlaps = await page.evaluate(() => {
      const bad = [];
      for (const kv of document.querySelectorAll('#sheet-body .kv')) {
        const dts = [...kv.children].filter((c) => c.tagName === 'DT'), dds = [...kv.children].filter((c) => c.tagName === 'DD');
        dts.forEach((dt, i) => { const a = dt.getBoundingClientRect(), b = dds[i].getBoundingClientRect(); if (a.width && b.width && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push(dt.textContent); });
      }
      return bad;
    });
    assert.deepEqual(overlaps, [], `${id}: etichette sovrapposte`);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow), 'hidden', 'la pagina dietro deve restare ferma');
    await page.locator('#sheet-close').tap();
    assert.equal(await page.locator('dialog#sheet[open]').count(), 0);
    assert.ok(Math.abs((await page.evaluate(() => Math.round(scrollY))) - y0) <= 2, `${id}: la pagina è saltata dopo la chiusura`);
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('scheda: il pulsante di chiusura resta in vista scorrendo la scheda, Esc chiude', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, hasTouch: true });
  await page.locator('#top3 [data-open]').first().tap();
  await page.waitForSelector('dialog#sheet[open]');
  await page.evaluate(() => { document.querySelector('dialog#sheet').scrollTop = 600; });
  const c = await page.locator('#sheet-close').boundingBox();
  assert.ok(c.y >= 0 && c.y < 200, `il pulsante × è fuori vista (${c.y})`);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog#sheet[open]').count(), 0);
  await ctx.close();
});

test('scheda: le sezioni sono chiuse tranne recensioni in conflitto, e si aprono con un tocco', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, hasTouch: true });
  await openSheetById(page, 'babolat-rpm-blast-17');
  assert.equal(await page.locator('#sheet-body details.reviews-sec').evaluate((d) => d.open), true);
  assert.match(await page.innerText('#sheet-body details.reviews-sec'), /I tester dicono/);
  assert.equal(await page.locator('#sheet-body details.lab-sec').evaluate((d) => d.open), false);
  await page.locator('#sheet-body details.lab-sec summary').tap();
  assert.equal(await page.locator('#sheet-body details.lab-sec').evaluate((d) => d.open), true);
  assert.doesNotMatch(await page.innerText('#sheet-body'), BAD.source.length ? /\b(NaN|undefined)\b/ : BAD);
  await ctx.close();
});

test('scheda: Monta questa dal telefono porta al cambio corda', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, hasTouch: true });
  await page.locator('#list .crow2').first().tap();
  await page.locator('#sheet-body .sheet-actions [data-equip]').tap();
  await page.waitForSelector('#equip-dialog[open]');
  await ctx.close();
});

const openBancoSheet = async (page, id) => openSheetById(page, id);

test('metodo: controllo e potenza vengono solo dai tester, nessun indice di controllo', async () => {
  const { page, ctx } = await openPage();
  await page.locator('[data-goto="metodo"]').first().click();
  const t = await page.innerText('#metodo');
  assert.match(t, /Controllo e potenza/);
  assert.doesNotMatch(t, /indice di controllo|Controllo ◄► potenza/);
  assert.doesNotMatch(t, /NaN|undefined/);
  await ctx.close();
});
test('tester: la scheda della Slap riporta il confronto con la Zero e dice che i pareri sono pochi, senza inventare livelli', async () => {
  const { page, ctx } = await openPage();
  await openBancoSheet(page, 're-string-slap-17', 'slap');
  const t = await page.innerText('#sheet-body .community-sec');
  assert.match(t, /meno controllo di Zero/);
  assert.match(t, /1 parere/);
  assert.match(t, /Controllo[^\n]*nessun parere/);
  assert.match(t, /Opinioni, non misure/i);
  assert.ok(await page.locator('#sheet-body .community-sec a[href*="tennisnerd.net"]').count() >= 1, 'link alla fonte');
  assert.doesNotMatch(t, /NaN|undefined/);
  await ctx.close();
});

