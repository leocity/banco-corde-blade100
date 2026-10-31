import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trialsForString, tensionSentence, labComparison, trialsSectionHtml, LAB_MIN_STRINGS, LAB_TRUST_N } from './trials.js';
import { emptyDiary } from './diary.js';

const dia = (ratings = {}, extra = {}) => ({ ...emptyDiary(), ratings, ...extra });
const tr = (id, kg, ratings, extra = {}) => ({ lid: `${id}-${kg}`, id, kg: [kg, kg - 1], from: '2026-09-01T12:00:00.000Z', to: '2026-09-20T12:00:00.000Z', hours: 10, reason: 'consumata', diary: dia(ratings, extra) });
const rec = (id, spin, stiff, control, dur) => ({ id, twu: { spin_potential: spin }, stiffness: { kind: 'misurata', value_lbin: stiff }, derived: { dims: { control, durability: dur } } });

test('trialsForString: solo la corda richiesta, per tensione crescente', () => {
  const list = trialsForString([tr('a', 23.5, {}), tr('b', 22, {}), tr('a', 22.5, {})], 'a');
  assert.deepEqual(list.map((t) => t.kg[0]), [22.5, 23.5]);
});

test('tensionSentence: serve almeno due tensioni diverse con voti; frase neutra con le medie', () => {
  assert.equal(tensionSentence([tr('a', 22.5, { end: { spin: 4 } })]), '');
  assert.equal(tensionSentence([tr('a', 22.5, { end: { spin: 4 } }), tr('a', 22.5, { end: { spin: 2 } })]), '');
  const s = tensionSentence([tr('a', 22.5, { first: { spin: 4, control: 3 } }), tr('a', 23.5, { end: { spin: 3, control: 4 }, first: { spin: 3, control: 4 } })]);
  assert.equal(s, 'a 22,5 kg: spin 4, controllo 3 · a 23,5 kg: spin 3, controllo 4');
});

test('tensionSentence: senza voti nelle categorie non inventa nulla', () => {
  assert.equal(tensionSentence([tr('a', 22, {}), tr('a', 23, {})]), '');
});

const five = (cat, vals) => vals.map((v, i) => tr(`s${i}`, 22, { end: { [cat]: v } }));
const recs = Object.fromEntries([rec('s0', 5, 150, 40, 30), rec('s1', 6, 160, 50, 40), rec('s2', 7, 170, 60, 50), rec('s3', 8, 180, 70, 60), rec('s4', 9, 190, 80, 70), rec('s5', 9.5, 195, 85, 75)].map((r) => [r.id, r]));
const recOf = (id) => recs[id];

test('labComparison: sotto 5 corde non si mostra nulla', () => {
  const c = labComparison(five('spin', [1, 2, 3, 4]), recOf);
  assert.equal(c.show, false);
  assert.equal(LAB_MIN_STRINGS, 5);
});

test('labComparison: spin contro spin TWU, r = 1 con ordine identico, n dichiarato e cautela sotto 8', () => {
  const c = labComparison(five('spin', [1, 2, 3, 4, 5]), recOf);
  assert.equal(c.show, true);
  const p = c.pairs.find((x) => x.cat === 'spin');
  assert.deepEqual([p.r, p.n, p.few], [1, 5, true]);
  assert.equal(LAB_TRUST_N, 8);
  assert.equal(c.pairs.find((x) => x.cat === 'control'), undefined, 'senza voti non c\'è la coppia');
});

test('labComparison: la potenza non ha una misura di laboratorio e non entra; il comfort contro la rigidità inversa sì', () => {
  const c = labComparison([...five('power', [5, 4, 3, 2, 1]), ...five('comfort', [5, 4, 3, 2, 1]).map((t) => ({ ...t, lid: `${t.lid}-c` }))], recOf);
  const cf = c.pairs.find((x) => x.cat === 'comfort');
  assert.equal(c.pairs.find((x) => x.cat === 'power'), undefined);
  assert.equal(cf.r, 1);   // più rigida -> meno comfort: comfort alto dove la rigidità è bassa
});

test('labComparison: controllo e mantenimento seguono indice e tenuta; corde senza misura sono escluse', () => {
  const trials = [...five('control', [1, 2, 3, 4, 5]), ...five('liveness', [5, 4, 3, 2, 1]).map((t) => ({ ...t, lid: `${t.lid}-l` })), tr('ghost', 22, { end: { control: 5 } })];
  const c = labComparison(trials, recOf);
  assert.equal(c.pairs.find((x) => x.cat === 'control').n, 5);
  assert.equal(c.pairs.find((x) => x.cat === 'control').r, 1);
  assert.equal(c.pairs.find((x) => x.cat === 'liveness').r, -1);
});

test('labComparison: più prove della stessa corda contano una volta sola, con la media', () => {
  const trials = [...five('spin', [1, 2, 3, 4, 5]), tr('s0', 21, { end: { spin: 3 } })];
  const p = labComparison(trials, recOf).pairs.find((x) => x.cat === 'spin');
  assert.equal(p.n, 5);
});

test('labComparison: solo i voti di fine vita contano', () => {
  const trials = [0, 1, 2, 3, 4].map((i) => tr(`s${i}`, 22, { first: { spin: i + 1 } }));
  assert.equal(labComparison(trials, recOf).show, false);
});

test('trialsSectionHtml: una riga per prova, ordine per tensione, frase, nessun NaN né undefined', () => {
  const list = trialsForString([tr('a', 23.5, { end: { spin: 3, control: 4 } }, { verdict: 'no' }), tr('a', 22.5, { end: { spin: 4, control: 3 } }, { verdict: 'si' })], 'a');
  const h = trialsSectionHtml(list);
  assert.ok(h.indexOf('22,5') < h.indexOf('23,5'));
  assert.match(h, /a 22,5 kg: spin 4, controllo 3 · a 23,5 kg: spin 3, controllo 4/);
  assert.match(h, /ricomprerei/i);
  assert.doesNotMatch(h, /NaN|undefined|null/);
  assert.equal(trialsSectionHtml([]), '');
});

test('trialsSectionHtml: il testo dell\'utente resta testo', () => {
  const h = trialsSectionHtml([tr('a', 22, { end: { spin: 4 } }, { notes: '<img src=x onerror=alert(1)>' })]);
  assert.doesNotMatch(h, /<img/);
});

test('trialsSectionHtml: le prove senza nulla di scritto non fanno righe', () => {
  assert.equal(trialsSectionHtml([tr('a', 22, {})]), '');
  assert.match(trialsSectionHtml([tr('a', 22, {}), tr('a', 23, { end: { spin: 4 } })]), /Le tue prove \(1\)/);
});
