const { openPage, tab, test, assert } = require('./ui.cjs');

test('Scienza: schede con livello di prova, 4 righelli, fonti e verifiche a mano', async () => {
  const { page, ctx, errors } = await openPage({ hash: '#scienza' });
  assert.ok(await page.locator('#scienza details.sci').count() >= 8);
  assert.equal(await page.locator('#scienza .ruler').count(), 4);
  const txt = await page.innerText('#scienza');
  assert.match(txt, /Dimostrata/);
  assert.match(txt, /Ipotesi/);
  assert.match(txt, /Verifiche a mano del 17\/11\/2026/);
  assert.match(txt, /Slap: \d+ª più morbida a riposo/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Scienza: le etichette dei righelli non si sovrappongono e restano dentro lo schermo', async () => {
  const { page, ctx } = await openPage({ hash: '#scienza' });
  const boxes = await page.evaluate(() => [...document.querySelectorAll('.ruler')].map((r) => [...r.querySelectorAll('.rl')].map((l) => l.getBoundingClientRect()).map((b) => ({ l: b.left, r: b.right, t: b.top }))));
  for (const lab of boxes) {
    for (const b of lab) { assert.ok(b.l >= 0 && b.r <= 390, 'etichetta fuori dallo schermo'); }
    for (let i = 0; i < lab.length; i += 1) for (let j = i + 1; j < lab.length; j += 1) {
      const a = lab[i], b = lab[j];
      if (Math.abs(a.t - b.t) < 2) assert.ok(a.r <= b.l || b.r <= a.l, 'etichette sovrapposte');
    }
  }
  await ctx.close();
});

test('Scienza: toccando il righello si vede la corda più vicina, con Confronta', async () => {
  const { page, ctx } = await openPage({ hash: '#scienza' });
  const track = page.locator('#scienza [data-track="rp.kgmm"]');
  await track.scrollIntoViewIfNeeded();
  const b = await track.boundingBox();
  await page.mouse.click(b.x + b.width * 0.9, b.y + b.height / 2);
  const pick = await page.innerText('#scienza [data-ruler="rp.kgmm"] .r-pick');
  assert.match(pick, /kg\/mm/);
  assert.ok(await page.locator('#scienza [data-ruler="rp.kgmm"] .r-pick [data-cmp]').count() === 1);
  await ctx.close();
});

test('Tooltip: si apre al tocco con fonte e tipo di dato, si chiude con Esc e il focus torna', async () => {
  const { page, ctx } = await openPage({ hash: '#scienza' });
  const t = page.locator('#scienza .ruler .tip').first();
  await t.click();
  await page.waitForSelector('#tip:not([hidden])');
  const txt = await page.innerText('#tip');
  assert.match(txt, /Misura di laboratorio/i); // in maiuscolo via CSS
  assert.match(txt, /Fonte/);
  await page.keyboard.press('Escape');
  await page.waitForSelector('#tip[hidden]', { state: 'attached' });
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('tip')), true);
  await ctx.close();
});
