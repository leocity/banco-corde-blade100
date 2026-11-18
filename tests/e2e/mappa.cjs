const { openPage, test, assert } = require('./ui.cjs');

test('Mappa: cerchi una corda, la vedi su ogni righello accanto alla tua, con i segni misurata / ricavata', async () => {
  const { page, ctx, errors } = await openPage({ hash: '#mappa' });
  await page.locator('#map-q').fill('o-toro tour 1,20');
  await page.locator('#map-results [data-map-add]').first().click();
  const table = await page.innerText('#mappa .mtable');
  assert.match(table, /Re-String Slap 1,23/);
  assert.match(table, /O-Toro Tour 1,20/);
  assert.equal(await page.locator('#mappa .rl.sel').count() >= 2, true, 'la corda scelta ha il nome sui righelli');
  assert.ok(await page.locator('#mappa .mk-der').count() > 0);
  assert.ok(await page.locator('#mappa .mk-phys').count() > 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Mappa: la rigidità in campo e lo spin hanno quasi tutte le corde (misurate o ricavate)', async () => {
  const { page, ctx } = await openPage({ hash: '#mappa' });
  const n = await page.evaluate(() => window.STRINGS_DATA.strings.length);
  for (const key of ['twu.stiffness', 'twu.spin']) {
    const h = await page.innerText(`#mappa [data-ruler="${key}"] h3`);
    const m = Number(/(\d+) corde/.exec(h)[1]);
    assert.ok(m >= n - 3, `${key}: ${m} su ${n}`);
  }
  await ctx.close();
});

test('Mappa: le etichette dei righelli non si sovrappongono e restano dentro lo schermo', async () => {
  const { page, ctx } = await openPage({ hash: '#mappa' });
  for (const q of ['confidential 1,25', 'o-toro 1,23', 'zero 1,23']) { await page.locator('#map-q').fill(q); await page.locator('#map-results [data-map-add]').first().click(); }
  const boxes = await page.evaluate(() => [...document.querySelectorAll('.ruler')].map((r) => [...r.querySelectorAll('.rl')].map((l) => l.getBoundingClientRect()).map((b) => ({ l: b.left, r: b.right, t: b.top }))));
  for (const lab of boxes) {
    for (const b of lab) assert.ok(b.l >= 0 && b.r <= 390, 'etichetta fuori dallo schermo');
    for (let i = 0; i < lab.length; i += 1) for (let j = i + 1; j < lab.length; j += 1) {
      const a = lab[i], b = lab[j];
      if (Math.abs(a.t - b.t) < 2) assert.ok(a.r <= b.l || b.r <= a.l, 'etichette sovrapposte');
    }
  }
  await ctx.close();
});

test('Mappa: toccando il righello si vede la corda più vicina, con Evidenzia e Confronta', async () => {
  const { page, ctx } = await openPage({ hash: '#mappa' });
  const track = page.locator('#mappa [data-track="twu.stiffness"]');
  await track.scrollIntoViewIfNeeded();
  const b = await track.boundingBox();
  await page.mouse.click(b.x + b.width * 0.9, b.y + b.height / 2);
  const pick = await page.innerText('#mappa [data-ruler="twu.stiffness"] .r-pick');
  assert.match(pick, /lb\/in/);
  await page.locator('#mappa [data-ruler="twu.stiffness"] .r-pick [data-map-add]').click();
  assert.equal(await page.locator('#mappa .mrow').count(), 2);
  await ctx.close();
});

test('Tooltip: si apre al tocco con fonte e tipo di dato, si chiude con Esc e il focus torna', async () => {
  const { page, ctx } = await openPage({ hash: '#mappa' });
  await page.locator('#mappa .ruler .tip').first().click();
  await page.waitForSelector('#tip:not([hidden])');
  const txt = await page.innerText('#tip');
  assert.match(txt, /Misura di laboratorio/i);
  assert.match(txt, /Fonte/);
  await page.keyboard.press('Escape');
  await page.waitForSelector('#tip[hidden]', { state: 'attached' });
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('tip')), true);
  await ctx.close();
});
