// Screenshot di audit in docs/audit/ (390 e 1280 px). Uso: python3 -m pipeline.build_page && node tests/e2e/shots.cjs
const path = require('node:path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '../../dist/preview.html');
const OUT = path.resolve(__dirname, '../../docs/audit');
const DATA = require('../../data/strings.json');
const EQ = 're-string-zero-17';
const dia = (ratings, extra = {}) => ({ setup: {}, meter: [], ratings, tags: [], notes: '', verdict: null, nextKgDelta: null, ...extra });
const life = (lid, id, kg, ratings, from, to, extra = {}) => ({ lid, id, kg, from: `${from}T12:00:00.000Z`, to: `${to}T12:00:00.000Z`, hours: 11, reason: 'consumata', note: '', diary: dia(ratings, extra) });
const spins = [...new Map(DATA.strings.filter((r) => r.twu && typeof r.twu.spin_potential === 'number' && r.id !== EQ).map((r) => [r.twu.spin_potential, r])).values()].sort((a, b) => a.twu.spin_potential - b.twu.spin_potential);
const pick = [0, 1, 2, 3, 4, 5].map((i) => spins[Math.floor((i * (spins.length - 1)) / 5)]);
const STATE = JSON.stringify({ v: 2, equipped: { id: EQ, kg: [22.5, 21.5], since: '2026-10-01T10:00:00.000Z', hours0: 0,
    diary: dia({ first: { spin: 4, control: 3, power: 3, comfort: 4, durability: 4 } }, { notes: 'Morbida al primo colpo, spin facile.', tags: ['precisa'] }) },
  liked: ['solinco-confidential-16l', 'toroline-o-toro-17'], disliked: ['babolat-rpm-blast-16', 'babolat-rpm-blast-17'],
  sessions: [{ ts: 'a', date: '2026-10-20', hours: 6, note: 'doppio', life: '2026-10-01T10:00:00.000Z' }, { ts: 'b', date: '2026-10-27', hours: 4.5, note: '', life: '2026-10-01T10:00:00.000Z' }],
  lives: [life('Z1', EQ, [23.5, 22.5], { first: { spin: 3, control: 4 }, end: { spin: 3, control: 4, comfort: 3 } }, '2026-07-01', '2026-07-24', { verdict: 'forse' }), life('Z2', EQ, [22, 21], { end: { spin: 4, control: 3, comfort: 4 } }, '2026-08-01', '2026-08-20', { verdict: 'si' }),
    ...pick.map((r, i) => life(`P${i}`, r.id, [22.5, 21.5], { end: { spin: [1, 2, 3, 3, 4, 5][i], control: [3, 4, 2, 3, 4, 5][i] } }, '2026-05-01', '2026-05-20'))] });

(async () => {
  const browser = await chromium.launch();
  for (const [n, vp] of [['m', { width: 390, height: 844 }], ['d', { width: 1280, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: n === 'm' });
    const page = await ctx.newPage();
    await page.addInitScript((s) => localStorage.setItem('banco-corde:state', s), STATE);
    await page.goto(URL);
    await page.waitForFunction(() => window.__bancoReady === true);
    const shot = (name, opts = {}) => page.screenshot({ path: path.join(OUT, `v4-${name}-${n}.png`), ...opts });
    await shot('scegli');
    await page.locator('#tab-mappa').click();
    await page.waitForSelector('#scatter circle.dot');
    if (n === 'd') await page.locator('#scatter circle.dot[data-id="re-string-zero-17"]').hover(); else await page.locator('#scatter circle.dot[data-id="re-string-zero-17"]').tap();
    await page.waitForTimeout(200);
    await shot('mappa', { fullPage: n === 'd' });
    await page.mouse.move(2, 2);
    await page.locator('#tab-banco').click();
    await page.waitForSelector('input.cmp');
    for (const i of [0, 1, 2]) await page.locator('input.cmp').nth(i).check();
    await page.waitForTimeout(150);
    await shot('banco');
    await page.locator('#cmp-clear').click();
    await page.locator('#tab-montata').click();
    await page.waitForSelector('#wear .wearbar');
    await shot('montata', { fullPage: true });
    await page.locator('#history [data-past-open]').first().click();
    await page.waitForSelector('#past-dialog[open] .rate');
    await shot('voti-corda-finita');
    await page.locator('#past-close').click();
    await page.locator('#mine-summary [data-open]').first().click();
    await page.waitForSelector('dialog#sheet[open] .trials-sec');
    await shot('scheda-prove');
    await page.locator('#sheet-close').click();
    await page.locator('[data-goto="metodo"]').first().click();
    await page.waitForSelector('#m-sensazioni');
    await page.locator('#m-sensazioni').scrollIntoViewIfNeeded();
    await shot('metodo-sensazioni');
    await page.locator('#tab-scegli').click();
    await page.locator('#top3 [data-open]').first().click();
    await page.waitForSelector('dialog#sheet[open]');
    await shot('scheda');
    await ctx.close();
  }
  await browser.close();
})();
