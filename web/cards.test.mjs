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

test('rowValues: tre valori nell\'ordine spin, rigidità, tenuta', () => {
  assert.deepEqual(rowValues(EQ).map((v) => v.key), ['spin', 'stiffness', 'durability']);
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

test('deltaVsEquipped: formato e soglie', () => {
  const a = { id: 'a', derived: { dims: { spin: 60, durability: 40, control: 50 } }, stiffness: { value_lbin: 200, kind: 'misurata' } };
  const b = { id: 'b', derived: { dims: { spin: 48, durability: 48, control: 52 } }, stiffness: { value_lbin: 215, kind: 'misurata' } };
  assert.equal(deltaVsEquipped(a, b).text, '+12 spin · −8 tenuta · −15 lb/in');
  assert.equal(deltaVsEquipped(b, b).text, '');
  const c = { id: 'c', derived: { dims: { spin: null, durability: 40, control: 50 } }, stiffness: null };
  assert.equal(deltaVsEquipped(c, b).text, '−8 tenuta');
});

test('rowHtml della montata: "montata", tre valori, niente delta né Monta', () => {
  const html = rowHtml(EQ, ctxFor(EQ));
  assert.match(html, /data-id="re-string-zero-17"/);
  assert.match(html, /montata/);
  assert.equal((html.match(/data-k="/g) || []).length, 3);
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
  assert.equal((html.match(/data-k="/g) || []).length, 3);
  assert.match(html, /data-open="toroline-o-toro-17"/);
});

test('miniValues: tre valori brevi con marcatore e unità', () => {
  const m = miniValues(EQ);
  assert.deepEqual(m.map((x) => x.key), ['spin', 'stiffness', 'durability']);
  assert.deepEqual(m.map((x) => x.em), ['spin', 'lb/in', 'tenuta']);
  assert.equal(m[0].val, '≈ 7,4');
  assert.equal(m[1].val, '≈ 214');
  assert.equal(m[2].val, 'media');
  const miss = miniValues(ALL.find((x) => x.derived.dims.durability === null)).find((x) => x.key === 'durability');
  assert.deepEqual([miss.val, miss.mark], ['—', 'missing']);
  assert.match(miss.title, /manca/);
});

test('compactRowHtml: un solo pulsante che apre la scheda, tre mini-valori, nessun pulsante dentro', () => {
  for (const r of ALL) {
    const html = compactRowHtml(r, ctxFor(r));
    assert.equal((html.match(/<button/g) || []).length, 1, r.id);
    assert.match(html, new RegExp(`data-open="${r.id}"`));
    assert.equal((html.match(/class="m /g) || []).length, 3, r.id);
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

test('scheda: riepilogo con tre tessere, sezioni richiudibili, barra azioni in fondo', () => {
  const r = ALL.find((x) => x.reviews.conflicts.length && x.is_target) || ALL[0];
  const html = sheetHtml(r, ctxFor(r));
  assert.equal((html.match(/class="tile /g) || []).length, 3);
  const pos = (needle) => html.indexOf(needle);
  assert.ok(pos('class="sheet-head"') < pos('class="tiles"'));
  assert.ok(pos('class="tiles"') < pos('Dettagli e stime'));
  assert.ok(pos('Dettagli e stime') < pos("Note dell'incordatore"));
  assert.ok(pos("Note dell'incordatore") < pos('Dati di laboratorio'));
  assert.ok(pos('Dati di laboratorio') < pos('class="sheet-actions"'));
  const actions = html.slice(pos('class="sheet-actions"'));
  for (const a of ['data-equip', 'data-like', 'data-dislike', 'data-compare']) assert.match(actions, new RegExp(a));
  assert.equal(html.slice(0, pos('class="sheet-actions"')).includes('data-equip'), false, 'Monta solo nella barra fissa');
});

test('scheda: la montata non ha il pulsante Monta; i tester in conflitto aprono la sezione recensioni', () => {
  assert.doesNotMatch(sheetHtml(EQ, ctxFor(EQ)), /data-equip/);
  const withC = ALL.find((r) => r.reviews.conflicts.length);
  assert.match(sheetHtml(withC, ctxFor(withC)), /<details class="sheet-section reviews-sec" open>/);
  const noC = ALL.find((r) => !r.reviews.conflicts.length);
  assert.match(sheetHtml(noC, ctxFor(noC)), /<details class="sheet-section reviews-sec">/);
});

test('scheda: le tessere riportano valore, parola e marcatore senza NaN', () => {
  for (const r of ALL) {
    const tiles = sheetHtml(r, ctxFor(r)).match(/<div class="tile [\s\S]*?<\/div>/g) || [];
    assert.equal(tiles.length, 3, r.id);
    for (const tl of tiles) assert.doesNotMatch(text(tl), BAD, r.id);
  }
  const z = sheetHtml(EQ, ctxFor(EQ)).match(/<div class="tile [\s\S]*?<\/div>/g).map(text).join(' | ');
  assert.match(z, /≈ 7,4/);
  assert.doesNotMatch(z, /potenza/);
});


// ---- controllo e potenza separati: la potenza viene solo dai tester ----
import { communityRows } from './values.js';
const COMM = { control: { n: 3, mean: 2.67, word: 'alto', split: false, evidence: [{ url: 'https://tt.example/1', site: 'tt', quote: 'very controllable', level: 'alto' }] },
  power: { n: 2, mean: 1.5, word: 'basso', split: true, evidence: [] }, scope: 'model' };

test('communityRows: controllo e potenza sono due righe distinte, con numero di pareri e discordanza', () => {
  const rows = communityRows({ community: COMM });
  assert.deepEqual(rows.map((r) => r.key), ['control', 'power']);
  assert.deepEqual([rows[0].word, rows[0].n], ['alto', 3]);
  assert.equal(rows[1].split, true);
  assert.deepEqual(communityRows({}).map((r) => r.word), [null, null]);
});

test('sheetHtml: la sezione «Controllo e potenza dai tester» mostra le due voci, la fonte e che sono opinioni', () => {
  const r = { ...BY['toroline-o-toro-17'], community: COMM };
  const h = sheetHtml(r, ctxFor(r));
  assert.match(h, /community-sec/);
  const t = text(h.slice(h.indexOf('community-sec')));
  assert.match(t, /Controllo[^|]*alto[^|]*3 pareri/);
  assert.match(t, /Potenza[^|]*bassa[^|]*2 pareri/);
  assert.match(t, /discordi/);
  assert.match(t, /opinioni, non misure/i);
  assert.match(h, /href="https:\/\/tt\.example\/1"/);
  assert.doesNotMatch(t, BAD);
});

test('sheetHtml: senza pareri raccolti lo dice senza inventare', () => {
  const r = { ...BY['toroline-o-toro-17'], community: null };
  const t = text(sheetHtml(r, ctxFor(r)));
  assert.match(t, /nessun parere dei tester raccolto/i);
});

test('sheetHtml: i confronti diretti tra corde si vedono con il numero di pareri e il link, anche senza livelli', () => {
  const r = { ...BY['toroline-o-toro-17'], community: { comparisons: [{ vs: 'Zero', attribute: 'control', direction: 'less', n: 1, url: 'https://tn.example/61581', site: 'tennisnerd.net', quote: 'less in control' }], scope: 'model' } };
  const h = sheetHtml(r, ctxFor(r));
  const t = text(h.slice(h.indexOf('community-sec')));
  assert.match(t, /meno controllo di Zero/);
  assert.match(t, /1 parere/);
  assert.match(h, /href="https:\/\/tn\.example\/61581"/);
  assert.match(t, /Controllo[^|]*nessun parere/);
});

test('sheetHtml: con meno di 3 pareri lo dice («pochi pareri»)', () => {
  const r = { ...BY['toroline-o-toro-17'], community: { control: { n: 1, word: 'alto', split: false, evidence: [] }, power: { n: 4, word: 'medio', split: false, evidence: [] } } };
  const t = text(sheetHtml(r, ctxFor(r)));
  assert.match(t, /Controllo[^|]*1 parere[^|]*pochi pareri/);
  assert.doesNotMatch(t.slice(t.indexOf('Potenza'), t.indexOf('Potenza') + 60), /pochi pareri/);
});
