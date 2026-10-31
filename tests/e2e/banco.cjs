const { openPage, BAD, test, assert } = require('./ui.cjs');

const goBanco = async (page) => { await page.locator('#tab-banco').click(); await page.waitForSelector('#bank-table thead, #bank-cards .crow2wrap', { state: 'attached' }); };

test('banco: tabella a 6 colonne senza scroll della pagina (desktop)', async () => {
  const { page, ctx } = await openPage();
  await goBanco(page);
  const heads = await page.$$eval('#bank-table thead th', (els) => els.map((e) => e.innerText.trim().toLowerCase()));
  for (const h of ['Corda', 'Spin', 'Rigidità', 'Tenuta', 'Controllo', 'Pairing']) assert.ok(heads.some((x) => x.startsWith(h.toLowerCase())), `${h} in ${heads.join('|')}`);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await ctx.close();
});

test('banco: su telefono diventa elenco di schede senza scroll orizzontale', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await goBanco(page);
  assert.ok((await page.locator('#bank-cards .crow2wrap').count()) > 5);
  assert.ok((await page.locator('#bank-cards input.cmp').count()) > 5, 'ogni riga ha la spunta Confronta');
  assert.equal(await page.locator('#bank-table').count() ? await page.locator('#bank-table').isVisible() : false, false);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await ctx.close();
});

test('banco: confronto da due spunte, nascosto con una, massimo 4', async () => {
  const { page, ctx } = await openPage();
  await goBanco(page);
  const boxes = page.locator('input.cmp');
  await boxes.nth(0).check();
  assert.equal(await page.locator('#tray').isVisible(), false);
  await boxes.nth(1).check();
  assert.ok(await page.locator('#tray').isVisible());
  assert.equal(await page.locator('#tray .tcol').count(), 2);
  await boxes.nth(2).check(); await boxes.nth(3).check();
  await boxes.nth(4).check({ timeout: 2000 }).catch(() => {}); // la quinta viene rifiutata: Playwright segnala che lo stato non è cambiato
  assert.equal(await page.locator('#tray .tcol').count(), 4);
  assert.equal(await page.locator('input.cmp:checked').count(), 4);
  assert.match(await page.innerText('#cmp-msg'), /4/);
  await page.locator('#cmp-clear').click();
  assert.equal(await page.locator('#tray').isVisible(), false);
  await ctx.close();
});

test('banco: il confronto mostra marcatori e dati mancanti con il motivo', async () => {
  const { page, ctx } = await openPage();
  await goBanco(page);
  const r = await page.evaluate(() => { const x = window.STRINGS_DATA.strings.find((d) => d.derived.dims.durability === null && d.is_target); return { id: x.id, name: `${x.brand} ${x.model}` }; });
  await page.locator('#b-q').fill(r.name);
  await page.locator(`input.cmp[data-id="${r.id}"]`).check();
  await page.locator('#b-q').fill('O-Toro');
  await page.locator('input.cmp[data-id="toroline-o-toro-17"]').check();
  assert.equal(await page.locator('#tray .tcol').count(), 2);
  const txt = await page.innerText('#tray');
  assert.match(txt, /manca/);
  assert.match(txt, /[●◐○]/);
  assert.match(txt, /Non confrontabili/);
  assert.doesNotMatch(txt, BAD);
  await ctx.close();
});

test('banco: scheda dal nome, con pairing e Monta questa', async () => {
  const { page, ctx } = await openPage();
  await goBanco(page);
  await page.locator('#bank-table .rowlink').first().click();
  assert.ok(await page.locator('dialog#sheet[open]').count());
  assert.ok(await page.locator('#sheet-body .pair').count());
  assert.match(await page.innerText('#sheet-body'), /Monta questa|Aggiungi al confronto/);
  await ctx.close();
});

test('banco: la scheda di RPM Blast 17 dice dove i tester e i dati non concordano', async () => {
  const { page, ctx } = await openPage();
  await goBanco(page);
  await page.locator('#b-q').fill('RPM Blast');
  await page.locator('#bank-table tr:has([data-open="babolat-rpm-blast-17"]) .rowlink').click();
  const txt = await page.innerText('#sheet-body');
  assert.match(txt, /I tester dicono/);
  assert.match(await page.locator('#sheet-body').innerHTML(), /calibro diverso/i); // dentro la sezione recensioni, chiusa
  await ctx.close();
});

test('banco: ordinamento per Spin', async () => {
  const { page, ctx } = await openPage();
  await goBanco(page);
  await page.locator('#bank-table th button[data-sort="spin"]').click();
  assert.equal(await page.locator('#bank-table th:has(button[data-sort="spin"])').getAttribute('aria-sort'), 'descending');
  await page.locator('#bank-table th button[data-sort="spin"]').click();
  assert.equal(await page.locator('#bank-table th:has(button[data-sort="spin"])').getAttribute('aria-sort'), 'ascending');
  await ctx.close();
});

test('banco: filtro marca e nessun NaN/undefined/null', async () => {
  const { page, ctx } = await openPage();
  await goBanco(page);
  const all = await page.locator('#bank-table tbody tr').count();
  const brand = await page.locator('#b-chips [data-brand]').first().getAttribute('data-brand');
  await page.locator(`#b-chips [data-brand="${brand}"]`).click();
  const n = await page.locator('#bank-table tbody tr').count();
  assert.ok(n > 0 && n < all);
  assert.doesNotMatch(await page.innerText('#banco'), BAD);
  await ctx.close();
});
