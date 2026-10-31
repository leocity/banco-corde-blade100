const fs = require('node:fs');
const path = require('node:path');
const { openPage, stateOf, BAD, test, assert } = require('./ui.cjs');

const DATA = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/strings.json'), 'utf8'));
const local = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('nav: intestazione a 390 px bassa e su una riga, con lo stato di sincronizzazione', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  const h = await page.locator('header.top').boundingBox();
  assert.ok(h.height <= 64, `intestazione alta ${h.height}px`);
  assert.match(await page.innerText('#sync-badge'), /Solo su questo browser/);
  const title = await page.locator('header.top h1').boundingBox();
  assert.ok(title.height <= 34, `il titolo va a capo (${title.height}px)`);
  assert.equal(await page.locator('#profile-box').count(), 0, 'il profilo non occupa spazio: sta nel Metodo');
  await ctx.close();
});

test('nav: la ricerca è in cima e cercando spariscono le 3 da provare', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  const q = await page.locator('#q').boundingBox();
  assert.ok(q.y + q.height < 330, `la ricerca sta a ${q.y}px`);
  const row = await page.locator('#top3 .crow2wrap').first().boundingBox();
  assert.ok(row.y < 450, `la prima riga sta a ${row.y}px`);
  await page.locator('#q').fill('Hyper');
  assert.equal(await page.locator('#top3-wrap').isVisible(), false);
  const names = await page.$$eval('#list .nm', (els) => els.map((e) => e.textContent));
  assert.ok(names.length > 0 && names.every((x) => /hyper/i.test(x)), names.join('|'));
  await page.locator('#q').fill('');
  assert.ok(await page.locator('#top3-wrap').isVisible());
  await ctx.close();
});

test('nav: in Montata riepilogo, usura e registro sono nell\'ordine giusto', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await page.locator('#tab-montata').click();
  assert.ok(await page.locator('#mine-summary .crow2wrap').count());
  const y = async (sel) => (await page.locator(sel).first().boundingBox()).y;
  const ys = [await y('#mine-summary'), await y('#wear'), await y('.log-box')];
  assert.deepEqual(ys, [...ys].sort((a, b) => a - b), `ordine sbagliato: ${ys}`);
  await ctx.close();
});

test('nav: tre sessioni di ieri con i soli pulsanti rapidi', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await page.locator('#tab-montata').click();
  await page.locator('[data-day="1"]').click();
  assert.equal(await page.locator('[data-day="1"]').getAttribute('aria-pressed'), 'true');
  for (const h of ['1', '1.5', '2']) await page.locator(`[data-add-hours="${h}"]`).click();
  const st = await stateOf(page);
  const yesterday = local(new Date(Date.now() - 864e5));
  assert.deepEqual(st.sessions.map((x) => x.date), [yesterday, yesterday, yesterday]);
  assert.deepEqual(st.sessions.map((x) => x.hours), [1, 1.5, 2]);
  await page.locator('[data-day="0"]').click();
  await page.locator('[data-add-hours="1"]').click();
  assert.equal((await stateOf(page)).sessions[3].date, local(new Date()));
  await ctx.close();
});

test('nav: il profilo sta nel Metodo', async () => {
  const { page, ctx } = await openPage({ width: 390, height: 844 });
  await page.locator('[data-goto="metodo"]').click();
  assert.match(await page.innerText('#metodo'), /Blade 100 v9/);
  assert.match(await page.innerText('#metodo'), /giocatore di club/);
  await ctx.close();
});

for (const w of [320, 360, 390]) {
  test(`nav: nessuno scroll orizzontale e nessun NaN in nessuna schermata a ${w} px`, async () => {
    const { page, ctx } = await openPage({ width: w, height: 760 });
    for (const tab of ['scegli', 'mappa', 'montata']) {
      await page.locator(`#tab-${tab}`).click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${tab} a ${w}`);
      assert.doesNotMatch(await page.innerText('main'), BAD, tab);
    }
    await page.locator('[data-goto="metodo"]').first().click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `metodo a ${w}`);
    await ctx.close();
  });
}

// ---- navigazione: tasto Indietro del telefono e tasti «Indietro» ----
test('navigazione: Indietro del telefono chiude la scheda e resta nell\'app', async () => {
  const { page, ctx } = await openPage({ width: 360, height: 740, hasTouch: true });
  await page.locator('#top3 [data-open]').first().tap();
  await page.waitForSelector('dialog#sheet[open]');
  await page.goBack();
  await page.waitForFunction(() => !document.getElementById('sheet').open);
  assert.ok(await page.locator('#top3').isVisible(), 'si è ancora nell\'app');
  assert.match(page.url(), /banco-corde|preview\.html/);
  await ctx.close();
});

test('navigazione: chiudere la scheda con «Indietro» non lascia voci fantasma: un solo Indietro porta alla schermata precedente', async () => {
  const { page, ctx } = await openPage({ width: 360, height: 740, hasTouch: true });
  await page.locator('#tab-mappa').tap();
  await page.waitForSelector('#scatter circle.dot');
  await page.locator('#tab-scegli').tap();
  await page.locator('#top3 [data-open]').first().tap();
  await page.waitForSelector('dialog#sheet[open]');
  assert.match(await page.innerText('#sheet-close'), /Indietro/);
  await page.locator('#sheet-close').tap();
  await page.waitForFunction(() => !document.getElementById('sheet').open && !(history.state && history.state.dlg));
  await page.goBack();
  await page.waitForFunction(() => !document.getElementById('mappa').hidden);
  await ctx.close();
});

test('navigazione: Indietro del telefono torna alla schermata precedente', async () => {
  const { page, ctx } = await openPage({ width: 360, height: 740, hasTouch: true });
  await page.locator('#tab-mappa').tap();
  await page.waitForSelector('#scatter circle.dot');
  await page.locator('#tab-montata').tap();
  await page.waitForSelector('#diary .rate');
  await page.goBack();
  await page.waitForFunction(() => !document.getElementById('mappa').hidden);
  await page.goBack();
  await page.waitForFunction(() => !document.getElementById('scegli').hidden);
  await ctx.close();
});

test('navigazione: dal Metodo il tasto «Indietro» riporta dove eri', async () => {
  const { page, ctx } = await openPage({ width: 360, height: 740, hasTouch: true });
  await page.locator('#tab-montata').tap();
  await page.waitForSelector('#diary .rate');
  await page.locator('[data-goto="metodo"]').first().tap();
  await page.waitForFunction(() => !document.getElementById('metodo').hidden);
  assert.ok(await page.locator('#metodo [data-back]').isVisible());
  await page.locator('#metodo [data-back]').tap();
  await page.waitForFunction(() => !document.getElementById('montata').hidden);
  await ctx.close();
});

test('navigazione: da una scheda «Monta questa» chiude la scheda e apre il cambio corda, e Indietro chiude anche quello', async () => {
  const { page, ctx } = await openPage({ width: 360, height: 740, hasTouch: true });
  await page.locator('#top3 [data-open]').first().tap();
  await page.waitForSelector('dialog#sheet[open]');
  await page.locator('#sheet-body [data-equip]').tap();
  await page.waitForSelector('#equip-dialog[open]');
  assert.equal(await page.locator('dialog#sheet[open]').count(), 0);
  await page.goBack();
  await page.waitForFunction(() => !document.getElementById('equip-dialog').open);
  assert.ok(await page.locator('#montata').isVisible() || await page.locator('#scegli').isVisible());
  await ctx.close();
});
