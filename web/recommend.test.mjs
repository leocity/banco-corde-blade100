import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modelId, candidates, describeDelta, tensionFrom, resolveCurrent, values, THRESHOLDS } from './recommend.js';

const rec = (o = {}) => ({
  id: o.id || 'x', brand: 'Solinco', model: 'Hyper-G', gauge_mm: 1.25, is_target: true, preference: null,
  spin: { value: 7, low: 7, high: 7, kind: 'misurato' }, stiffness: { value_lbin: 200, low: 200, high: 200, kind: 'misurata' },
  twu: { tension_loss_pct: 30, match: 'exact' }, crosscheck: null, derived: { disliked_warning: false }, _score: 50, ...o,
});
const byScore = (r) => r._score;
const cur = rec({ id: 'solinco-confidential-16l', model: 'Confidential', spin: { value: 6.4, low: 5.9, high: 6.9, kind: 'parente' },
  stiffness: { value_lbin: 212, low: 197, high: 227, kind: 'parente' }, twu: { tension_loss_pct: 22, match: 'proxy' } });
const LIKED = ['solinco-confidential-16l', 'toroline-o-toro-17'];

test('modelId: colori uniti, famiglie separate', () => {
  assert.equal(modelId({ brand: 'Kirschbaum', model: 'Flash Black' }), 'kirschbaum-flash');
  assert.equal(modelId({ brand: 'Kirschbaum', model: 'Flash Orange' }), 'kirschbaum-flash');
  assert.notEqual(modelId({ brand: 'Solinco', model: 'Confidential' }), modelId({ brand: 'Solinco', model: 'Confidential Soft' }));
  assert.notEqual(modelId({ brand: 'Toroline', model: 'O-Toro' }), modelId({ brand: 'Toroline', model: 'O-Toro Tour' }));
  assert.equal(modelId({ brand: 'X', model: 'Y', model_id: 'dato' }), 'dato');
});

test('candidates: esclude parenti di corda attuale e preferite, un calibro per modello', () => {
  const all = [
    cur,
    rec({ id: 'toroline-o-toro-17', brand: 'Toroline', model: 'O-Toro', preference: 'liked', _score: 99 }),
    rec({ id: 'conf-120', model: 'Confidential', gauge_mm: 1.2, _score: 99 }),
    rec({ id: 'otoro-125', brand: 'Toroline', model: 'O-Toro', _score: 98 }),
    rec({ id: 'tour', brand: 'Toroline', model: 'O-Toro Tour', _score: 90 }),
    rec({ id: 'hyg-130', model: 'Hyper-G', gauge_mm: 1.3, _score: 80 }),
    rec({ id: 'hyg-125', model: 'Hyper-G', gauge_mm: 1.25, _score: 80 }),
    rec({ id: 'hyg-120', model: 'Hyper-G', gauge_mm: 1.2, _score: 70 }),
    rec({ id: 'dis', model: 'Confidential Soft', preference: 'disliked', _score: 97 }),
    rec({ id: 'contr', model: 'Mach 10', crosscheck: { verdict: 'contradicted' }, _score: 96 }),
    rec({ id: 'warn', model: 'Barb Wire', derived: { disliked_warning: true }, _score: 95 }),
    rec({ id: 'mod', model: 'Revolution', spin: { value: 8, low: 6.5, high: 9.5, kind: 'modello' }, _score: 94 }),
    rec({ id: 'comp', brand: 'Luxilon', model: 'Alu Power', is_target: false, _score: 93 }),
    rec({ id: 'nos', model: 'Outlast', _score: null }),
  ];
  const out = candidates(all, cur, LIKED, byScore);
  assert.deepEqual(out.map((r) => r.id), ['tour', 'hyg-125']);
  assert.ok(!out.some((r) => ['solinco-confidential', 'toroline-o-toro'].includes(modelId(r))));
});

test('candidates: corda attuale non gradita, lista non vuota e senza la sua famiglia', () => {
  const rpm = rec({ id: 'babolat-rpm-blast-17', brand: 'Babolat', model: 'RPM Blast', preference: 'disliked' });
  const all = [rpm, rec({ id: 'rpm2', brand: 'Babolat', model: 'RPM Blast', gauge_mm: 1.3 }), rec({ id: 'tour', brand: 'Toroline', model: 'O-Toro Tour' })];
  const out = candidates(all, rpm, LIKED, byScore);
  assert.deepEqual(out.map((r) => r.id), ['tour']);
});

test('candidates: nessun punteggio, lista vuota senza errori', () => {
  assert.deepEqual(candidates([cur, rec({ id: 'a' })], cur, LIKED, () => null), []);
});

test('values: stime e margini', () => {
  const v = values(cur);
  assert.deepEqual(v.spin, { v: 6.4, approx: true, margin: 0.5 });
  assert.equal(v.loss.approx, true);
  assert.equal(values(rec()).stiffness.approx, false);
  assert.equal(values(rec({ spin: null, twu: null })).spin, null);
});

test('describeDelta: direzioni, valori e frase', () => {
  const meas = { ...cur, spin: { value: 6.4, low: 6.4, high: 6.4, kind: 'misurato' }, stiffness: { value_lbin: 212, low: 212, high: 212, kind: 'misurata' }, twu: { tension_loss_pct: 22, match: 'exact' } };
  const d = describeDelta(rec({ spin: { value: 7.7, low: 7.7, high: 7.7, kind: 'misurato' }, stiffness: { value_lbin: 166, low: 166, high: 166, kind: 'misurata' }, twu: { tension_loss_pct: 44, match: 'exact' } }), meas);
  const by = Object.fromEntries(d.parts.map((p) => [p.key, p]));
  assert.equal(by.spin.dir, 'up');
  assert.equal(Math.round(by.spin.delta * 10) / 10, 1.3);
  assert.equal(by.spin.text, 'più spin (+1,3)');
  assert.equal(by.stiffness.text, 'più morbida (−46 lb/in)');
  assert.equal(by.loss.text, 'perde più tensione (+22 punti)');
  assert.ok(d.parts.length <= 3);
  // ordine per |Δ|/soglia: spin 2,6 · rigidità 4,6 · perdita 4,4
  assert.deepEqual(d.parts.map((p) => p.key), ['stiffness', 'loss', 'spin']);
  assert.equal(d.sentence, 'Più morbida (−46 lb/in), perde più tensione (+22 punti), più spin (+1,3)');
  const same = describeDelta(rec({ spin: { value: 6.5, low: 6.5, high: 6.5, kind: 'misurato' }, stiffness: { value_lbin: 215, low: 215, high: 215, kind: 'misurata' }, twu: { tension_loss_pct: 24, match: 'exact' } }), meas);
  assert.equal(same.sentence, 'Molto simile alla tua corda');
});

test('describeDelta: stime e dati mancanti', () => {
  const c = rec({ spin: { value: 7.2, low: 6.2, high: 8.2, kind: 'parente' } });
  const within = describeDelta(c, rec({ spin: { value: 6.5, low: 6.5, high: 6.5, kind: 'misurato' } }));
  assert.equal(within.parts.find((p) => p.key === 'spin').text, 'spin simile (stima)');
  const beyond = describeDelta(c, rec({ spin: { value: 5.5, low: 5.5, high: 5.5, kind: 'misurato' } }));
  assert.match(beyond.parts.find((p) => p.key === 'spin').text, /circa/);
  const miss = describeDelta(rec({ spin: { value: 8, low: 8, high: 8, kind: 'misurato' } }), rec({ spin: null }));
  assert.deepEqual(miss.missing, ['spin']);
  assert.match(miss.sentence, /Mancano: spin\.$/);
  assert.ok(!miss.parts.some((p) => p.key === 'spin'));
});

test('tensionFrom: correzione, limite, nessuna correzione senza rigidità di laboratorio', () => {
  const base = rec({ stiffness: { value_lbin: 200, kind: 'misurata' } });
  const t = tensionFrom(rec({ stiffness: { value_lbin: 230, kind: 'misurata' } }), base, [22, 21]);
  assert.equal(t.delta, -1.5);
  assert.deepEqual(t.kg, [20.5, 19.5]);
  assert.deepEqual(t.range, [[19.5, 21.5], [18.5, 20.5]]);
  assert.equal(t.corrected, true);
  assert.equal(tensionFrom(rec({ stiffness: { value_lbin: 280, kind: 'misurata' } }), base, [22, 21]).delta, -2);
  const nm = tensionFrom(rec({ stiffness: { value_lbin: 260, kind: 'modello' } }), base, [22, 21]);
  assert.equal(nm.corrected, false);
  assert.deepEqual(nm.kg, [22, 21]);
});

test('tensionFrom: parità con tension_start della pipeline', () => {
  const data = JSON.parse(readFileSync(new URL('../data/strings.json', import.meta.url)));
  const by = Object.fromEntries(data.strings.map((r) => [r.id, r]));
  let n = 0;
  for (const r of data.strings) {
    const ts = r.derived?.tension_start;
    if (!ts || !data.anchors[ts.from]) continue;
    assert.deepEqual(tensionFrom(r, by[ts.from], data.anchors[ts.from]).kg, ts.kg, r.id);
    n += 1;
  }
  assert.ok(n > 50);
});

test('resolveCurrent: valori non validi tornano al default', () => {
  const byId = { 'solinco-confidential-16l': {}, 'toroline-o-toro-17': {} };
  const def = { id: 'solinco-confidential-16l', kg: [22, 21] };
  for (const s of [null, 'x', { id: 'sparita', kg: [22, 21] }, { id: 'solinco-confidential-16l', kg: [99, 21] }, { id: 'toroline-o-toro-17' }]) {
    assert.deepEqual(resolveCurrent(s, byId), def);
  }
  assert.deepEqual(resolveCurrent({ id: 'toroline-o-toro-17', kg: [23, 22] }, byId), { id: 'toroline-o-toro-17', kg: [23, 22] });
  assert.deepEqual(THRESHOLDS, { spin: 0.5, stiffness: 10, loss: 5 });
});
