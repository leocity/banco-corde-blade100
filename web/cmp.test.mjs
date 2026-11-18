import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTo, levelOf, CMP_KEYS, summarize, agreement } from './cmp.js';

const meta = { excel_stretch50_sd: 1.0 };
const S = (id, lab, extra = {}) => ({ id, brand: 'B', model: id, gauge_mm: 1.23, shape: 'HEX', lab, ...extra });
const slap = S('slap', { twu: null, rp: { kgmm: 0.75 }, excel: { stretch50: 3.29 } });
const otoro = S('otoro', { twu: { stiffness: 166, loss: 44, spin: 8.5 }, rp: { kgmm: 1.05 }, excel: { stretch50: 3.0 } });

test('livelli: soglie della rigidità TWU in percentuale', () => {
  assert.equal(levelOf('twu.stiffness', 200, 205), 'simile');
  assert.equal(levelOf('twu.stiffness', 225, 200), "un po'");
  assert.equal(levelOf('twu.stiffness', 240, 200), 'nettamente');
});

test('livelli: Racketpedia, perdita e spin in unità della fonte', () => {
  assert.equal(levelOf('rp.kgmm', 0.80, 0.75), 'simile');
  assert.equal(levelOf('rp.kgmm', 0.90, 0.75), "un po'");
  assert.equal(levelOf('rp.kgmm', 1.05, 0.75), 'nettamente');
  assert.equal(levelOf('twu.loss', 30, 34), 'simile');
  assert.equal(levelOf('twu.loss', 30, 37), "un po'");
  assert.equal(levelOf('twu.loss', 22, 44), 'nettamente');
  assert.equal(levelOf('twu.spin', 8.0, 8.3), 'simile');
  assert.equal(levelOf('twu.spin', 8.0, 8.8), "un po'");
  assert.equal(levelOf('twu.spin', 9.5, 8.0), 'nettamente');
});

test('si confrontano solo le grandezze presenti in entrambe, nella stessa fonte', () => {
  const rows = compareTo(otoro, slap, meta);
  const keys = rows.map((r) => r.key);
  assert.deepEqual(keys, ['rp.kgmm', 'excel.stretch50']);
  const rp = rows[0];
  assert.equal(rp.level, 'nettamente');
  assert.equal(rp.dir, 'più');
  assert.match(rp.word, /più rigida/);
  assert.equal(rp.decides, true);
  assert.equal(rows[1].decides, false); // Excel: solo informativo
});

test('nessuna stima: i campi stiffness/spin stimati della corda non entrano mai', () => {
  const est = S('est', { twu: null, rp: null, excel: null }, { stiffness: { value_lbin: 300, kind: 'parente' }, spin: { value: 9, kind: 'modello' } });
  assert.deepEqual(compareTo(est, slap, meta), []);
  assert.match(summarize(compareTo(est, slap, meta), 'Slap').text, /Non confrontabile/);
});

test('frase riassuntiva: con in comune solo l\'Excel lo dice e non conclude', () => {
  const onlyEx = S('ex', { twu: null, rp: null, excel: { stretch50: 3.0 } });
  const s = summarize(compareTo(onlyEx, slap, meta), 'Slap');
  assert.equal(s.kind, 'none');
  assert.match(s.text, /solo l'allungamento del tuo Excel/);
});

test('frase riassuntiva: simile se tutte le decisive sono sotto soglia', () => {
  const twin = S('twin', { twu: null, rp: { kgmm: 0.80 }, excel: null });
  const s = summarize(compareTo(twin, slap, meta), 'Slap');
  assert.match(s.text, /simile alla Slap/);
});

test('frase riassuntiva: elenca le differenze decisive con la fonte', () => {
  const s = summarize(compareTo(otoro, slap, meta), 'Slap');
  assert.match(s.text, /Rispetto alla Slap/);
  assert.match(s.text, /più rigida/);
  assert.match(s.text, /Racketpedia/);
});

test('accordo tra fonti sulla rigidità: concordano, in parte, disaccordo', () => {
  const a = S('a', { twu: { stiffness: 240 }, rp: { kgmm: 1.1 } });
  const b = S('b', { twu: { stiffness: 200 }, rp: { kgmm: 0.8 } });
  assert.equal(agreement(compareTo(a, b, meta)).stiffness, 'concordano');
  const c = S('c', { twu: { stiffness: 240 }, rp: { kgmm: 0.6 } });
  assert.equal(agreement(compareTo(c, b, meta)).stiffness, 'disaccordo');
  const d = S('d', { twu: { stiffness: 240 }, rp: { kgmm: 0.82 } });
  assert.equal(agreement(compareTo(d, b, meta)).stiffness, 'in parte');
  assert.equal(agreement(compareTo(otoro, slap, meta)).stiffness, null); // una sola fonte in comune
});

test('disaccordo: la frase lo dichiara e non conclude', () => {
  const b = S('b', { twu: { stiffness: 200 }, rp: { kgmm: 0.8 } });
  const c = S('c', { twu: { stiffness: 240 }, rp: { kgmm: 0.6 } });
  assert.match(summarize(compareTo(c, b, meta), 'B').text, /fonti non concordano/);
});

test('perdita: meno perdita = «tiene meglio la tensione»', () => {
  const a = S('a', { twu: { loss: 22 } }), b = S('b', { twu: { loss: 44 } });
  const r = compareTo(a, b, meta)[0];
  assert.equal(r.dir, 'meno');
  assert.match(r.word, /tiene meglio la tensione/);
});

test('ogni riga ha perché, unità e fonte', () => {
  for (const r of compareTo(otoro, S('x', { twu: { stiffness: 200, loss: 30, spin: 7 }, rp: { kgmm: 0.9 }, excel: { stretch50: 4.5 } }), meta)) {
    assert.ok(r.why && r.why.length > 20, r.key);
    assert.ok(r.source, r.key);
    assert.ok(CMP_KEYS[r.key].unit !== undefined, r.key);
  }
});
