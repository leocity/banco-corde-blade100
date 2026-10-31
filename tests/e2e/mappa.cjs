const { openPage, bodyText, BAD, test, assert } = require('./ui.cjs');

const REFS = ['re-string-zero-17', 'toroline-o-toro-17', 'solinco-confidential-16l'];
const goMappa = async (page) => { await page.locator('#tab-mappa').click(); await page.waitForSelector('#scatter circle.dot'); };
const dots = (page) => page.locator('#scatter circle.dot');

test('mappa: hover sulla montata apre la scheda corta', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  await page.locator('#scatter circle.dot[data-id="re-string-zero-17"]').hover();
  await page.waitForSelector('#tip:not([hidden])');
  const txt = await page.innerText('#tip');
  assert.match(txt, /Re-String Zero/);
  assert.match(txt, /montata/);
  assert.match(txt, /Spin/);
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

test('mappa: filtro marca mantiene la montata e le preferite', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  const before = await dots(page).count();
  const brand = await page.evaluate(() => { const D = window.STRINGS_DATA.strings; const refB = new Set(['re-string-zero-17', 'toroline-o-toro-17', 'solinco-confidential-16l'].map((i) => D.find((r) => r.id === i).brand)); return [...document.querySelectorAll('#map-chips [data-brand]')].map((b) => b.dataset.brand).find((b) => !refB.has(b)); });
  await page.locator(`#map-chips [data-brand="${brand}"]`).click();
  const after = await dots(page).count();
  assert.ok(after < before && after >= 3, `${before} -> ${after}`);
  for (const id of REFS) assert.equal(await page.locator(`#scatter circle.dot[data-id="${id}"]`).count(), 1, id);
  await ctx.close();
});

test('mappa: solo misurate e pairing Buono riducono i punti', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  const all = await dots(page).count();
  await page.locator('#map-measured').check();
  const m = await dots(page).count();
  assert.ok(m < all);
  await page.locator('#map-measured').uncheck();
  await page.locator('#map-good').check();
  assert.ok((await dots(page).count()) < all);
  await ctx.close();
});

test('mappa: preset Tenuta × Spin cambia gli assi', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  await page.locator('#map-presets [data-axes="ts"]').click();
  const titles = (await page.$$eval('#scatter text.axis-title', (els) => els.map((e) => e.textContent))).join('|');
  assert.match(titles, /Tenuta/);
  assert.match(titles, /Spin/);
  assert.equal(await page.locator('#map-presets [data-axes="ts"]').getAttribute('aria-pressed'), 'true');
  await ctx.close();
});

test('mappa: a riposo nessuna barra d\'errore, al passaggio sì per le stime', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  assert.equal(await page.locator('#scatter line.err').count(), 0);
  await page.locator('#scatter circle.dot[data-id="re-string-zero-17"]').hover();
  await page.waitForSelector('#scatter line.err', { state: 'attached' }); // una linea orizzontale ha altezza 0: per Playwright non è "visibile"
  assert.ok((await page.locator('#scatter line.err').count()) >= 1);
  await page.mouse.move(5, 5);
  await page.waitForFunction(() => document.querySelectorAll('#scatter line.err').length === 0);
  await ctx.close();
});

test('mappa: tabella alternativa con tante righe quanti sono i punti', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  await page.locator('#map-table summary').click();
  assert.equal(await page.locator('#map-table tbody tr').count(), await dots(page).count());
  await ctx.close();
});

test('mappa: riga di stato con i conteggi', async () => {
  const { page, ctx } = await openPage();
  await goMappa(page);
  const t = await page.innerText('#map-status');
  assert.match(t, /nel grafico/);
  assert.match(t, /nascoste dai filtri/);
  assert.doesNotMatch(t, BAD);
  await ctx.close();
});

test('mappa: tocco su telefono fissa la scheda in basso, "Apri scheda" apre quella completa', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844, hasTouch: true });
  await goMappa(page);
  await page.locator('#scatter circle.dot[data-id="re-string-zero-17"]').tap();
  await page.waitForSelector('#tip:not([hidden])');
  assert.match(await page.innerText('#tip'), /Re-String Zero/);
  await page.locator('#tip [data-open]').tap();
  await page.waitForSelector('dialog#sheet[open]');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
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

test('mappa: nessun NaN/undefined/null e nessuno scroll orizzontale', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goMappa(page);
  assert.doesNotMatch(await bodyText(page), BAD);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await ctx.close();
});
