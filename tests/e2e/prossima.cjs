const { openPage, stateOf, tab, FAKE_CLAUDE, test, assert } = require('./ui.cjs');

test('Prossima: la prima risposta (corda + frase) è visibile senza scroll a 390 px', async () => {
  const { page, ctx, errors } = await openPage({ hash: '#prossima' });
  const first = page.locator('#next-list .cand .summary').first();
  await first.waitFor();
  const box = await first.boundingBox(), nav = await page.locator('.tabs').boundingBox();
  assert.ok(box.y + box.height <= nav.y, `la prima risposta finisce a ${box.y + box.height}, la barra inizia a ${nav.y}`);
  assert.match(await first.innerText(), /Slap/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Prossima: le domande cambiano la lista e restano salvate', async () => {
  const { page, ctx } = await openPage({ hash: '#prossima' });
  await page.locator('[data-goal="stiffer"]').click();
  assert.equal(await page.locator('[data-goal="stiffer"]').getAttribute('aria-checked'), 'true');
  assert.equal((await stateOf(page)).nextGoal, 'stiffer');
  const sums = await page.locator('#next-list .cand .summary').allInnerTexts();
  assert.ok(sums.length >= 1 && sums.length <= 3);
  for (const s of sums) assert.match(s, /più rigida/);
  await page.locator('[data-goal="holds"]').click();
  assert.match(await page.innerText('#next-q'), /non è misurata da TWU/);
  assert.match(await page.innerText('#next-list'), /su 55 corde misurate da TWU/);
  await ctx.close();
});

test('Prossima: una corda in casa compatibile compare per prima', async () => {
  const st = JSON.stringify({ v: 2, equipped: { id: 're-string-slap-17', kg: [22, 21], since: '2026-10-31T13:29:43.457Z', hours0: 0 }, liked: [], disliked: [], sessions: [], lives: [],
    stock: [{ id: 'toroline-o-toro-17', size: 'mezza', n: 1 }], nextGoal: 'stiffer' });
  const { page, ctx } = await openPage({ hash: '#prossima', storage: { 'banco-corde:state': st } });
  const h = await page.locator('#next-list h2').first().innerText();
  assert.match(h, /Ce l'hai in casa/);
  assert.match(await page.locator('#next-list .cand').first().innerText(), /O-Toro 1,23[\s\S]*in casa: 1 mezza/);
  await ctx.close();
});

test('Prossima: Confronta apre il confronto con la montata; Esc chiude e il focus torna al bottone', async () => {
  const { page, ctx } = await openPage({ hash: '#prossima' });
  const btn = page.locator('#next-list [data-cmp]').first();
  await btn.click();
  await page.waitForSelector('#cmp-dialog[open]');
  const txt = await page.innerText('#cmp-dialog');
  assert.match(txt, /contro la tua Slap/);
  assert.match(txt, /Cosa non sappiamo/);
  await page.keyboard.press('Escape');
  await page.waitForSelector('#cmp-dialog:not([open])', { state: 'attached' });
  assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.dataset.cmp !== undefined), true);
  await ctx.close();
});

test('Prossima: scheda corda dalla ricerca; stime separate; ★ e + in casa; Indietro del telefono chiude', async () => {
  const { page, ctx, errors } = await openPage({ hash: '#prossima' });
  await page.locator('#next-search').fill('o-toro tour');
  await page.locator('#next-results [data-open="toroline-o-toro-tour-17"]').click();
  await page.waitForSelector('#sheet[open]');
  const txt = await page.innerText('#sheet');
  assert.match(txt, /Rispetto alla tua \(Slap\)/);
  assert.match(txt, /Misure/);
  assert.match(txt, /Perdita di tensione/);
  await page.locator('#sheet [data-like="toroline-o-toro-tour-17"]').click();
  await page.locator('#sheet [data-stock-add="toroline-o-toro-tour-17"][data-size="mezza"]').click();
  const st = await stateOf(page);
  assert.ok(st.liked.includes('toroline-o-toro-tour-17'));
  assert.deepEqual(st.stock, [{ id: 'toroline-o-toro-tour-17', size: 'mezza', n: 1 }]);
  await page.goBack();
  await page.waitForSelector('#sheet:not([open])', { state: 'attached' });
  assert.ok(await page.locator('#prossima').isVisible());
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Prossima: ibridi con letto solo nella stessa fonte; nessun prezzo', async () => {
  const { page, ctx } = await openPage({ hash: '#prossima' });
  await page.locator('#hy-box > summary').click();
  await page.locator('#hybrid details.more > summary').click();
  await page.locator('#hybrid [data-hy-load="A"]').click();
  const txt = await page.innerText('#hybrid');
  assert.match(txt, /letto/);
  assert.match(txt, /Rigidità in gioco/);
  assert.doesNotMatch(await page.content(), /€/);
  await ctx.close();
});

test('Prossima: con il parere AI disponibile c\'è una casella; la risposta è marcata «non misurato»', async () => {
  const sample = `, sample: Object.assign(async (input) => { window.__prompt = input; return { text: 'Prova la O-Toro Tour.' }; }, { json: async () => ({}) })`;
  const { page, ctx } = await openPage({ hash: '#prossima', claude: FAKE_CLAUDE(sample) });
  await page.waitForSelector('#ask-main textarea');
  await page.locator('#ask-main textarea').fill('cosa provo dopo?');
  await page.locator('#ask-main [data-ask-go]').click();
  await page.waitForFunction(() => /O-Toro Tour/.test(document.querySelector('#ask-main .ai-out').textContent));
  assert.match(await page.innerText('#ask-main .ai-out'), /Parere AI — non misurato/);
  assert.match(await page.evaluate(() => window.__prompt), /cosa provo dopo\?/);
  await ctx.close();
});

test('Prossima: la domanda scritta all\'AI resta anche se cambi domanda o tocchi ☆', async () => {
  const sample = `, sample: Object.assign(async () => ({ text: 'ok' }), { json: async () => ({}) })`;
  const { page, ctx } = await openPage({ hash: '#prossima', claude: FAKE_CLAUDE(sample) });
  await page.waitForSelector('#ask-main textarea');
  await page.locator('#ask-main textarea').fill('la Slap è spenta?');
  await page.locator('[data-goal="spin"]').click();
  assert.equal(await page.locator('#ask-main textarea').inputValue(), 'la Slap è spenta?');
  await ctx.close();
});
