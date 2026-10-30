const { openPage, bodyText, stateOf, BAD, test, assert } = require('./ui.cjs');

test('scegli: striscia montata e top 3', async () => {
  const { page, ctx, errors } = await openPage();
  assert.match(await page.innerText('#strip'), /Re-String Zero/);
  assert.equal(await page.locator('#top3 .scard').count(), 3);
  for (const card of await page.locator('#top3 .scard').all()) assert.ok(await card.locator('.pair').count());
  const top = await page.$$eval('#top3 .scard', (els) => els.map((e) => e.dataset.id));
  const list = await page.$$eval('#list .scard', (els) => els.map((e) => e.dataset.id));
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

test('scegli: filtro marca e solo misurate', async () => {
  const { page, ctx } = await openPage();
  const brand = await page.locator('#chips button[data-brand]').first().getAttribute('data-brand');
  await page.locator(`#chips button[data-brand="${brand}"]`).click();
  const names = await page.$$eval('#list .scard-name', (els) => els.map((e) => e.textContent));
  assert.ok(names.length > 0 && names.every((n) => n.startsWith(brand)), names.join('|'));
  await page.locator(`#chips button[data-brand="${brand}"]`).click(); // di nuovo: toglie il filtro
  await page.locator('#only-measured').check();
  const classes = await page.$$eval('#list .scard .val[data-k="spin"]', (els) => els.map((e) => e.className));
  assert.ok(classes.length > 0 && classes.every((c) => c.includes('measured')), classes.join('|'));
  await ctx.close();
});

test('scegli: "non mi piace" cambia lo stato, resta dopo il reload ed è annullabile', async () => {
  const { page, ctx } = await openPage();
  const id = await page.locator('#list .scard').first().getAttribute('data-id');
  await page.locator(`#list .scard[data-id="${id}"] [data-dislike]`).click();
  await page.waitForFunction((i) => (JSON.parse(localStorage.getItem('banco-corde:state') || '{}').disliked || []).includes(i), id);
  await page.reload();
  await page.waitForFunction(() => window.__bancoReady === true);
  await page.locator('#myrefs-sum').click();
  assert.ok(await page.locator(`#myrefs .chip.disliked[data-dislike="${id}"]`).count());
  await page.locator(`#myrefs .chip.disliked[data-dislike="${id}"]`).click();
  assert.equal((await stateOf(page)).disliked.includes(id), false);
  await ctx.close();
});

test('scegli: senza "mi piace" invita a segnarne una, senza errori', async () => {
  const { page, ctx, errors } = await openPage();
  await page.locator('#myrefs-sum').click();
  while (await page.locator('#myrefs .chip.liked').count()) await page.locator('#myrefs .chip.liked').first().click();
  assert.ok(await page.locator('#no-refs').isVisible());
  assert.equal(await page.locator('#top3 .scard').count(), 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('scegli: le 3 da provare sono delle marche valutate; il filtro si toglie', async () => {
  const { page, ctx } = await openPage();
  const flags = await page.evaluate(() => { const D = window.STRINGS_DATA.strings; return [...document.querySelectorAll('#top3 .scard')].map((e) => D.find((r) => r.id === e.dataset.id).is_target); });
  assert.deepEqual(flags, [true, true, true]);
  const before = await page.locator('#chips [data-brand]').count();
  await page.locator('#only-target').uncheck();
  assert.ok((await page.locator('#chips [data-brand]').count()) > before);
  await ctx.close();
});

test('scegli: le preferite stanno in un riquadro chiuso e la prima scelta si vede sul telefono', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  assert.equal(await page.locator('#myrefs-box').evaluate((e) => e.open), false);
  const top = await page.locator('#top3 .scard').first().boundingBox();
  assert.ok(top.y < 450, `la prima scheda inizia a ${top.y}px: deve stare nella prima schermata`);
  await ctx.close();
});
