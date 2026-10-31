const { openPage, bodyText, BAD, test, assert } = require('./ui.cjs');

const REFS = ['re-string-zero-17', 'toroline-o-toro-17', 'solinco-confidential-16l'];
const goMappa = async (page) => { await page.locator('#tab-mappa').click(); await page.waitForSelector('#scatter circle.dot'); };
const dots = (page) => page.locator('#scatter circle.dot');
const filterDo = async (page, fn) => { await page.locator('#map-filter-btn').click(); await page.waitForSelector('#filter-dialog[open]'); await fn(); await page.locator('#flt-ok').click(); await page.waitForFunction(() => !document.getElementById('filter-dialog').open); };

test('mappa: un solo grafico con spin in verticale e un pulsante Filtra', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  const titles = (await page.$$eval('#scatter text.axis-title', (els) => els.map((e) => e.textContent))).join('|');
  assert.match(titles, /Rigidità/);
  assert.match(titles, /Spin/);
  assert.equal((await page.innerText('#map-filter-btn')).trim(), 'Filtra');
  assert.equal(await page.locator('#map-chips, #map-gauge, #map-shape, #map-table, #tip').count(), 0, 'niente controlli doppi');
  await ctx.close();
});

test('mappa: passando con il mouse sulla montata compare la sua riga sotto il grafico', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  await page.locator('#scatter circle.dot[data-id="re-string-zero-17"]').hover();
  await page.waitForSelector('#map-pick .crow2wrap');
  const txt = await page.innerText('#map-pick');
  assert.match(txt, /Re-String Zero/);
  assert.match(txt, /montata/);
  assert.doesNotMatch(txt, BAD);
  await ctx.close();
});

test('mappa: la montata e le preferite hanno un\'etichetta e sono nel grafico', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  for (const id of REFS) assert.equal(await page.locator(`#scatter circle.dot[data-id="${id}"]`).count(), 1, id);
  const labels = await page.$$eval('#scatter text.lbl', (els) => els.map((e) => e.textContent));
  assert.ok(labels.some((l) => /montata/.test(l)));
  assert.ok(labels.some((l) => /★/.test(l)));
  await ctx.close();
});

test('mappa: il filtro marca (lo stesso di Scegli) mantiene la montata e le preferite', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  const before = await dots(page).count();
  const brand = await page.evaluate(() => { const D = window.STRINGS_DATA.strings; const refB = new Set(['re-string-zero-17', 'toroline-o-toro-17', 'solinco-confidential-16l'].map((i) => D.find((r) => r.id === i).brand)); return [...new Set(D.filter((r) => r.is_target).map((r) => r.brand))].find((b) => !refB.has(b)); });
  await filterDo(page, () => page.locator(`#flt-brands [data-brand="${brand}"]`).click());
  const after = await dots(page).count();
  assert.ok(after < before && after >= 3, `${before} -> ${after}`);
  for (const id of REFS) assert.equal(await page.locator(`#scatter circle.dot[data-id="${id}"]`).count(), 1, id);
  assert.equal((await page.innerText('#map-filter-btn')).trim(), 'Filtra (1)');
  await page.locator('#tab-scegli').click();
  assert.equal((await page.innerText('#filter-btn')).trim(), 'Filtra (1)', 'il filtro è condiviso con Scegli');
  await ctx.close();
});

test('mappa: solo misurate e pairing buono riducono i punti', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  const all = await dots(page).count();
  await filterDo(page, () => page.locator('#flt-measured').check());
  const m = await dots(page).count();
  assert.ok(m < all);
  await filterDo(page, async () => { await page.locator('#flt-measured').uncheck(); await page.locator('#flt-good').check(); });
  assert.ok((await dots(page).count()) < all);
  await ctx.close();
});

test('mappa: Rigidità / Tenuta cambia l\'asse orizzontale', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  await page.locator('#map-presets [data-axes="ts"]').click();
  const titles = (await page.$$eval('#scatter text.axis-title', (els) => els.map((e) => e.textContent))).join('|');
  assert.match(titles, /Tenuta/);
  assert.match(titles, /Spin/);
  assert.equal(await page.locator('#map-presets [data-axes="ts"]').getAttribute('aria-pressed'), 'true');
  await ctx.close();
});

test('mappa: una riga di stato corta, senza NaN', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  const t = await page.innerText('#map-status');
  assert.match(t, /\d+ corde/);
  assert.ok(t.split(/\s+/).length <= 18, t);
  assert.doesNotMatch(t, BAD);
  await ctx.close();
});

test('mappa: tocco su telefono mostra la riga sotto il grafico e toccandola si apre la scheda', async () => {
  const { page, ctx } = await openPage({ width: 360, height: 740, hasTouch: true });
  await goMappa(page);
  await page.locator('#scatter circle.dot[data-id="re-string-zero-17"]').tap();
  await page.waitForSelector('#map-pick .crow2wrap');
  assert.match(await page.innerText('#map-pick'), /Re-String Zero/);
  await page.locator('#map-pick .crow2').tap();
  await page.waitForSelector('dialog#sheet[open]');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await ctx.close();
});

test('mappa: tocco su un punto vicino ad altri sceglie il più vicino e un tocco nel vuoto lo toglie', async () => {
  const { page, ctx } = await openPage({ width: 360, height: 740, hasTouch: true });
  await goMappa(page);
  await page.locator('#scatter circle.dot[data-id="toroline-o-toro-17"]').tap();
  await page.waitForSelector('#map-pick .crow2wrap');
  assert.match(await page.innerText('#map-pick'), /O-Toro/);
  const box = await page.locator('#scatter').boundingBox();
  await page.touchscreen.tap(box.x + 4, box.y + box.height - 4);
  await page.waitForFunction(() => document.querySelector('#map-pick').children.length === 0);
  await ctx.close();
});

test('mappa: frecce da tastiera passano da un punto all\'altro', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  await page.locator('#scatter circle.dot[data-id="re-string-zero-17"]').focus();
  await page.keyboard.press('ArrowRight');
  const id = await page.evaluate(() => document.activeElement.dataset.id);
  assert.ok(id && id !== 're-string-zero-17');
  await ctx.close();
});

test('mappa: nessun NaN/undefined/null e nessuno scroll orizzontale a 320, 360 e 390 px', async () => {
  for (const w of [320, 360, 390]) {
    const { page, ctx } = await openPage({ width: w, height: 740 });
    await goMappa(page);
    assert.doesNotMatch(await bodyText(page), BAD);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `a ${w}`);
    await ctx.close();
  }
});
