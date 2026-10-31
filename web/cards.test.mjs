import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pairing } from './pairing.js';
import { tensionFor } from './state.js';
import { fullName } from './format.js';
import { rowValues, deltaVsEquipped, miniValues } from './values.js';
import { rowHtml, shortCardHtml, sheetHtml, compactRowHtml } from './cards.js';

const DATA = JSON.parse(fs.readFileSync(new URL('../data/strings.json', import.meta.url), 'utf8'));
const ALL = DATA.strings;
const BY = Object.fromEntries(ALL.map((r) => [r.id, r]));
const D = DATA.defaults;
const refs = (ids) => ids.map((id) => ({ id, dims: BY[id].derived.dims }));
const LIKED = refs(D.liked), DISLIKED = refs(D.disliked), EQ = BY[D.equipped.id];
const LIFE = { hours: 14, low: 10.5, high: 17.5, basis: 'ipotesi' };

function ctxFor(r, over = {}) {
  return {
    pairing: pairing(r.derived.dims, LIKED, DISLIKED, !D.liked.includes(r.id)),
    pref: D.liked.includes(r.id) ? 'liked' : D.disliked.includes(r.id) ? 'disliked' : null,
    equipped: EQ, tension: tensionFor(r, EQ, D.equipped.kg), isEquipped: r.id === EQ.id, life: LIFE,
    nameOf: (id) => (BY[id] ? fullName(BY[id]) : id), ...over,
  };
}
const text = (html) => html.replace(/<[^>]*>/g, ' ');
// le note delle recensioni sono testo grezzo degli agenti (inglese, può contenere la parola "null"): non sono un errore di visualizzazione
const withoutReviewNotes = (html) => html.replace(/<div class="rev">[\s\S]*?<\/div>/g, '');
const BAD = /\b(NaN|undefined|null)\b/;

test('rowValues: quattro valori nell\'ordine spin, rigidità, tenuta, controllo', () => {
  assert.deepEqual(rowValues(EQ).map((v) => v.key), ['spin', 'stiffness', 'durability', 'control']);
});

test('rowValues: stima da modello dello spin è ◐ con la dicitura', () => {
  const spin = rowValues(EQ).find((v) => v.key === 'spin');
  assert.equal(spin.mark, 'estimated');
  assert.match(spin.text, /≈/);
  assert.match(spin.note, /modello/);
});

test('rowValues: spin misurato è ● e senza ≈', () => {
  const r = BY['toroline-o-toro-17'];
  const spin = rowValues(r).find((v) => v.key === 'spin');
  assert.equal(spin.mark, 'measured');
  assert.doesNotMatch(spin.text, /≈/);
});

test('rowValues: tenuta assente è ○ con il motivo', () => {
  const r = ALL.find((x) => x.derived.dims.durability === null);
  const d = rowValues(r).find((v) => v.key === 'durability');
  assert.equal(d.mark, 'missing');
  assert.match(d.why, /manca/);
});

test('rowValues: controllo è un indice con potenza come altro estremo', () => {
  const r = BY['toroline-o-toro-17'];
  const c = rowValues(r).find((v) => v.key === 'control');
  assert.equal(c.mark, 'estimated');
  assert.match(c.text, /controllo \d+/);
  assert.match(c.text, /potenza \d+/);
  assert.match(c.note, /di 3 misure/);
});

test('deltaVsEquipped: formato e soglie', () => {
  const a = { id: 'a', derived: { dims: { spin: 60, durability: 40, control: 50 } }, stiffness: { value_lbin: 200, kind: 'misurata' } };
  const b = { id: 'b', derived: { dims: { spin: 48, durability: 48, control: 52 } }, stiffness: { value_lbin: 215, kind: 'misurata' } };
  assert.equal(deltaVsEquipped(a, b).text, '+12 spin · −8 tenuta · −15 lb/in');
  assert.equal(deltaVsEquipped(b, b).text, '');
  const c = { id: 'c', derived: { dims: { spin: null, durability: 40, control: 50 } }, stiffness: null };
  assert.equal(deltaVsEquipped(c, b).text, '−8 tenuta');
});

test('rowHtml della montata: "montata", quattro valori, niente delta né Monta', () => {
  const html = rowHtml(EQ, ctxFor(EQ));
  assert.match(html, /data-id="re-string-zero-17"/);
  assert.match(html, /montata/);
  assert.equal((html.match(/data-k="/g) || []).length, 4);
  assert.doesNotMatch(html, /class="delta"/);
  assert.doesNotMatch(html, /data-equip/);
  assert.match(html, /data-open/);
});

test('rowHtml: ○ e "manca" per la tenuta assente, con il pulsante Monta', () => {
  const r = ALL.find((x) => x.derived.dims.durability === null);
  const html = rowHtml(r, ctxFor(r));
  assert.match(html, /data-k="durability"[\s\S]*?○/);
  assert.match(html, /manca/);
  assert.match(html, /data-equip="/);
});

test('rowHtml: preferita e non gradita al posto della fascia', () => {
  assert.match(rowHtml(BY['toroline-o-toro-17'], ctxFor(BY['toroline-o-toro-17'])), /★ preferita/);
  assert.match(rowHtml(BY['babolat-rpm-blast-17'], ctxFor(BY['babolat-rpm-blast-17'])), /✕ non gradita/);
});

test('rowHtml: fascia di pairing e delta per una corda qualunque', () => {
  const r = BY['tecnifibre-razor-spin-17'] || ALL.find((x) => !x.catalog_only && x.derived.pairing.score !== null && x.id !== EQ.id && !D.liked.includes(x.id) && !D.disliked.includes(x.id));
  const html = rowHtml(r, ctxFor(r));
  assert.match(html, /class="pair/);
  assert.match(html, new RegExp(r.derived.pairing.band));
  assert.match(html, /data-like/);
  assert.match(html, /data-dislike/);
});

test('rowHtml: un solo avviso per volta', () => {
  for (const r of ALL) assert.ok((rowHtml(r, ctxFor(r)).match(/class="warn"/g) || []).length <= 1, r.id);
});

test('sheetHtml: "I tester dicono" solo con un conflitto, e calibro diverso marcato', () => {
  const withC = ALL.find((r) => r.reviews.conflicts.length);
  assert.match(sheetHtml(withC, ctxFor(withC)), /I tester dicono/);
  const noC = ALL.find((r) => !r.reviews.conflicts.length);
  assert.doesNotMatch(sheetHtml(noC, ctxFor(noC)), /I tester dicono/);
  const mism = ALL.find((r) => r.reviews.sources.some((s) => s.gauge_mismatch));
  assert.match(sheetHtml(mism, ctxFor(mism)), /calibro diverso/);
});

test('sheetHtml: motivo del pairing, vita attesa, nessun testo generico sulla Blade', () => {
  const html = sheetHtml(EQ, ctxFor(EQ));
  assert.match(text(html), /In linea con|Lontana da/);
  assert.match(text(html), /14 ore/);
  assert.doesNotMatch(text(html), /telaio flessibile/);
  assert.doesNotMatch(text(html), /Parti da/);
});

test('sheetHtml senza ctx.life mostra il trattino', () => {
  assert.match(text(sheetHtml(EQ, ctxFor(EQ, { life: null }))), /Vita attesa\s+—/);
});

test('nessun NaN/undefined/null nel testo di nessuna delle corde', () => {
  for (const r of ALL) {
    const c = ctxFor(r);
    for (const [name, html] of [['row', rowHtml(r, c)], ['short', shortCardHtml(r, c)], ['sheet', sheetHtml(r, c)]]) {
      assert.doesNotMatch(text(withoutReviewNotes(html)), BAD, `${name} ${r.id}`);
    }
  }
});

test('l\'HTML nei dati viene escapato', () => {
  const evil = { ...EQ, id: 'evil', model: '<img src=x onerror=alert(1)>' };
  for (const html of [rowHtml(evil, ctxFor(evil)), shortCardHtml(evil, ctxFor(evil)), sheetHtml(evil, ctxFor(evil))]) assert.doesNotMatch(html, /<img/);
});

test('shortCardHtml: valori, pairing e apri scheda', () => {
  const r = BY['toroline-o-toro-17'];
  const html = shortCardHtml(r, ctxFor(r));
  assert.equal((html.match(/data-k="/g) || []).length, 4);
  assert.match(html, /data-open="toroline-o-toro-17"/);
});

test('miniValues: quattro valori brevi con marcatore e unità', () => {
  const m = miniValues(EQ);
  assert.deepEqual(m.map((x) => x.key), ['spin', 'stiffness', 'durability', 'control']);
  assert.deepEqual(m.map((x) => x.em), ['spin', 'lb/in', 'tenuta', 'ctrl']);
  assert.equal(m[0].val, '≈ 7,4');
  assert.equal(m[1].val, '≈ 214');
  assert.equal(m[2].val, 'media');
  assert.equal(m[3].val, '53');
  const miss = miniValues(ALL.find((x) => x.derived.dims.durability === null)).find((x) => x.key === 'durability');
  assert.deepEqual([miss.val, miss.mark], ['—', 'missing']);
  assert.match(miss.title, /manca/);
});

test('compactRowHtml: un solo pulsante che apre la scheda, quattro mini-valori, nessun pulsante dentro', () => {
  for (const r of ALL) {
    const html = compactRowHtml(r, ctxFor(r));
    assert.equal((html.match(/<button/g) || []).length, 1, r.id);
    assert.match(html, new RegExp(`data-open="${r.id}"`));
    assert.equal((html.match(/class="m /g) || []).length, 4, r.id);
    assert.doesNotMatch(text(html), BAD, r.id);
    assert.doesNotMatch(html, /data-equip|data-like|data-dislike/);
  }
});

test('compactRowHtml: montata, preferita e non gradita al posto del pairing', () => {
  assert.match(compactRowHtml(EQ, ctxFor(EQ)), /montata/);
  assert.match(compactRowHtml(BY['toroline-o-toro-17'], ctxFor(BY['toroline-o-toro-17'])), /★/);
  assert.match(compactRowHtml(BY['babolat-rpm-blast-17'], ctxFor(BY['babolat-rpm-blast-17'])), /✕/);
});

test('compactRowHtml: pairing con colore e fascia nel suggerimento, differenza dalla montata, rango, avviso come punto', () => {
  const r = ALL.find((x) => !x.catalog_only && x.derived.pairing.score !== null && x.id !== EQ.id && !D.liked.includes(x.id) && !D.disliked.includes(x.id) && deltaVsEquipped(x, EQ).text);
  const html = compactRowHtml(r, ctxFor(r, { rankNum: 2 }));
  assert.match(html, /class="pair /);
  assert.match(html, new RegExp(`title="${r.derived.pairing.band}`));
  assert.match(html, /class="d"/);
  assert.match(html, /class="rk">2</);
  assert.equal(compactRowHtml(EQ, ctxFor(EQ)).includes('class="d"'), false);
  const w = ALL.find((x) => x.crosscheck && x.crosscheck.verdict === 'contradicted' && !D.liked.includes(x.id));
  if (w) assert.match(compactRowHtml(w, ctxFor(w)), /class="wdot"/);
});

test('compactRowHtml: l\'HTML nei dati resta testo', () => {
  const evil = { ...EQ, id: 'evil', model: '<img src=x onerror=alert(1)>' };
  assert.doesNotMatch(compactRowHtml(evil, ctxFor(evil)), /<img/);
});

test('miniValues: la tenuta è una parola breve per ogni livello', () => {
  const words = new Set(ALL.map((r) => miniValues(r).find((x) => x.key === 'durability')).filter((x) => x.mark !== 'missing').map((x) => x.val));
  for (const w of words) assert.ok(['min', 'bassa', 'media', 'alta', 'max'].includes(w), w);
  assert.ok(words.size >= 3);
});
