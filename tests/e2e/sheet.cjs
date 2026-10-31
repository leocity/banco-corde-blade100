const { openPage, BAD, test, assert } = require('./ui.cjs');

const goBancoPhone = async (page) => { await page.locator('#tab-banco').click(); await page.waitForSelector('#bank-cards .crow2wrap'); };

test('scheda a 390 px: Monta questa sempre visibile, tessere, nessuna etichetta sovrapposta', async () => {
  const { page, ctx, errors } = await openPage({ width: 390, height: 844, hasTouch: true });
  await goBancoPhone(page);
  const ids = await page.$$eval('#bank-cards .crow2wrap', (els) => els.slice(0, 40).filter((_, i) => i % 8 === 1).map((e) => e.dataset.id));
  assert.ok(ids.length >= 4);
  for (const id of ids) {
    await page.locator(`#bank-cards .crow2wrap[data-id="${id}"] .crow2`).first().scrollIntoViewIfNeeded();
    await page.locator(`#bank-cards .crow2wrap[data-id="${id}"] .crow2`).tap();
    await page.waitForSelector('dialog#sheet[open]');
    const y0 = await page.evaluate(() => Math.round(scrollY)); // il tocco può far scorrere la pagina: si confronta da scheda aperta a scheda chiusa
    assert.equal(await page.locator('#sheet-body .tile').count(), 4, id);
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
  await goBancoPhone(page);
  await page.locator('#bank-cards .crow2').first().tap();
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
  await goBancoPhone(page);
  await page.locator('#b-q').fill('RPM Blast');
  await page.locator('#bank-cards .crow2wrap[data-id="babolat-rpm-blast-17"] .crow2').tap();
  await page.waitForSelector('dialog#sheet[open]');
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
  assert.ok(await page.locator('#equip-dialog[open]').count());
  await ctx.close();
});
