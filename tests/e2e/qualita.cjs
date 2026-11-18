// Obiettivi misurabili del design v6 (O2, O4, O5, O7): gergo, tocchi da 44 px, contrasto, nessuno scroll orizzontale, niente prezzi.
const { openPage, tab, BAD, test, assert } = require('./ui.cjs');

const TABS = ['oggi', 'prossima', 'scienza'];
const JARGON = /\b(percentil\w*|gemell\w*|parente|pairing|snapback|TL6|TL12)\b/i;

async function eachView(fn, opts = {}) {
  const { page, ctx, errors } = await openPage(opts);
  for (const t of TABS) { await tab(page, t); await fn(page, t); }
  // una scheda corda aperta (con confronto e stime)
  await tab(page, 'prossima');
  await page.locator('#next-search').fill('confidential');
  await page.locator('#next-results [data-open]').first().click();
  await page.waitForSelector('#sheet[open]');
  await fn(page, 'scheda');
  assert.deepEqual(errors, []);
  await ctx.close();
}

test('O2: tre schede in basso, con frecce da tastiera', async () => {
  const { page, ctx } = await openPage();
  assert.deepEqual(await page.locator('.tabs [role="tab"]').allInnerTexts(), ['◴\nOggi', '→\nProssima', '≡\nScienza']);
  await page.locator('#tab-oggi').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#tab-prossima').getAttribute('aria-selected'), 'true');
  await ctx.close();
});

test('O4: niente gergo nel testo visibile; nessun NaN/undefined; nessun prezzo', async () => {
  await eachView(async (page, where) => {
    const txt = await page.evaluate(() => document.body.innerText);
    const m = txt.match(JARGON);
    assert.equal(m, null, `${where}: «${m && m[0]}»`);
    assert.doesNotMatch(txt, BAD, where);
    assert.doesNotMatch(txt, /€|\bEUR\b|prezzo/i, where);
  });
});

test('O5: le unità (lb/in, kg/mm) compaiono solo accanto a un tooltip', async () => {
  await eachView(async (page, where) => {
    const bad = await page.evaluate(() => {
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (!/lb\/in|kg\/mm/.test(n.textContent)) continue;
        const el = n.parentElement;
        if (!el || !el.offsetParent || el.closest('#tip, script')) continue;
        const row = el.closest('.cmp-rows > li, .ideas > li, dd, dl, .cand, section');
        if (!row || !row.querySelector('.tip')) out.push(n.textContent.slice(0, 60));
      }
      return out;
    });
    assert.deepEqual(bad, [], where);
  });
});

test('O7: bersagli da almeno 44 px (tranne i tooltip nel testo) e nessuno scroll orizzontale a 390 px', async () => {
  await eachView(async (page, where) => {
    const small = await page.evaluate(() => [...document.querySelectorAll('button:not(.tip), input, select, textarea, summary')]
      .filter((e) => e.offsetParent && !e.closest('[hidden]'))
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.height < 43.5 || r.width < 43.5))
      .map(({ e, r }) => `${e.tagName}#${e.id}.${e.className} ${Math.round(r.width)}×${Math.round(r.height)}`));
    assert.deepEqual(small, [], where);
    const sw = await page.evaluate(() => document.scrollingElement.scrollWidth);
    assert.ok(sw <= 390, `${where}: larghezza ${sw}`);
  });
});

for (const scheme of ['light', 'dark']) {
test(`O7: contrasto del testo almeno 4,5:1 (3:1 per testo grande), tema ${scheme}`, async () => {
  await eachView(async (page, where) => {
    const low = await page.evaluate(() => {
      const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] > 0.9)) return c.slice(0, 3); } return (document.documentElement.matches(':root') && matchMedia('(prefers-color-scheme: dark)').matches ? [18, 24, 23] : [255, 255, 255]); };
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!el.offsetParent || el.closest('[aria-hidden="true"]')) continue;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(el);
        let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
        const fg = rgb(cs.color).slice(0, 3), bg = bgOf(el);
        const L1 = lum(fg), L2 = lum(bg);
        let ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (op < 1) ratio = 1 + (ratio - 1) * op; // approssimazione prudente
        const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.6 && Number(cs.fontWeight) >= 700);
        if (ratio < (big ? 3 : 4.5)) out.push(`${el.tagName}.${el.className} «${el.textContent.trim().slice(0, 30)}» ${ratio.toFixed(2)}`);
      }
      return out;
    });
    assert.deepEqual(low, [], where);
  }, { colorScheme: scheme });
});

}

test('O7: il tasto Indietro chiude la scheda, poi torna alla schermata precedente', async () => {
  const { page, ctx } = await openPage();
  await tab(page, 'scienza');
  await page.locator('#scienza [data-ruler="rp.kgmm"] details summary').click();
  await page.locator('#scienza [data-ruler="rp.kgmm"] .r-list [data-open]').first().click();
  await page.waitForSelector('#sheet[open]');
  await page.goBack();
  await page.waitForSelector('#sheet:not([open])', { state: 'attached' });
  assert.ok(await page.locator('#scienza').isVisible());
  await page.goBack();
  await page.waitForSelector('#oggi:not([hidden])');
  await ctx.close();
});
