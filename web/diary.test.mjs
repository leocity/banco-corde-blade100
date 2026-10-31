import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATS, MOMENTS, TAGS, emptyDiary, setRating, toggleRating, setTag, setVerdict, setSetup, setNotes, setNextKgDelta, addMeter, removeMeter,
  momentAverage, categoryMeans, tensionLoss, spearman, diaryCsv, sanitizeDiary } from './diary.js';

test('costanti: 8 categorie, 3 momenti, tag fissi', () => {
  assert.deepEqual(CATS.map((c) => c.key), ['spin', 'control', 'power', 'touch', 'comfort', 'stability', 'liveness', 'durability']);
  assert.deepEqual(MOMENTS.map((m) => m.key), ['first', 'mid', 'end']);
  assert.ok(TAGS.includes('secca') && TAGS.includes('resta-viva'));
});

test('emptyDiary: forma vuota', () => {
  assert.deepEqual(emptyDiary(), { setup: { strungOn: null, prestretch: null, stringer: '', surface: null }, meter: [], ratings: {}, tags: [], notes: '', verdict: null, nextKgDelta: null });
});

test('setRating: solo interi 1-5, mai modifica l\'originale', () => {
  const d = emptyDiary();
  const a = setRating(d, 'first', 'spin', 4);
  assert.equal(a.ratings.first.spin, 4);
  assert.deepEqual(d.ratings, {});
  for (const bad of [0, 6, 3.5, '4', null, NaN, -1]) assert.deepEqual(setRating(a, 'first', 'spin', bad).ratings.first, { spin: 4 }, String(bad));
  assert.deepEqual(setRating(a, 'boh', 'spin', 3), a, 'momento sconosciuto ignorato');
  assert.deepEqual(setRating(a, 'first', 'boh', 3), a, 'categoria sconosciuta ignorata');
});

test('toggleRating: ritoccare lo stesso voto lo toglie', () => {
  let d = setRating(emptyDiary(), 'mid', 'control', 3);
  d = toggleRating(d, 'mid', 'control', 3);
  assert.deepEqual(d.ratings, {}, 'tolto l\'ultimo voto il momento sparisce');
  assert.equal(toggleRating(d, 'mid', 'control', 5).ratings.mid.control, 5);
  const two = setRating(setRating(emptyDiary(), 'mid', 'control', 3), 'mid', 'spin', 4);
  assert.deepEqual(toggleRating(two, 'mid', 'control', 3).ratings, { mid: { spin: 4 } });
});

test('momentAverage e categoryMeans', () => {
  let d = setRating(setRating(emptyDiary(), 'first', 'spin', 4), 'first', 'control', 2);
  assert.equal(momentAverage(d, 'first'), 3);
  assert.equal(momentAverage(d, 'end'), null);
  const e = setRating(setRating(emptyDiary(), 'end', 'spin', 2), 'first', 'comfort', 5);
  const m = categoryMeans([d, e]);
  assert.equal(m.spin, 3);
  assert.equal(m.control, 2);
  assert.equal(m.comfort, 5);
  assert.equal(m.touch, null);
  assert.equal(categoryMeans([]).spin, null);
});

test('tag: solo quelli fissi, al massimo 8, si tolgono', () => {
  let d = emptyDiary();
  d = setTag(d, 'secca', true); d = setTag(d, 'inventato', true);
  assert.deepEqual(d.tags, ['secca']);
  for (const t of TAGS) d = setTag(d, t, true);
  assert.equal(d.tags.length, 8);
  assert.deepEqual(setTag(setTag(emptyDiary(), 'secca', true), 'secca', false).tags, []);
});

test('verdetto, note, setup e tensione della prossima volta', () => {
  let d = setVerdict(emptyDiary(), 'si');
  assert.equal(d.verdict, 'si');
  assert.equal(setVerdict(d, 'boh').verdict, 'si');
  assert.equal(setVerdict(d, null).verdict, null);
  assert.equal(setNotes(d, 'x'.repeat(5000)).notes.length, 2000);
  assert.equal(setNotes(d, '<img src=x onerror=alert(1)>').notes, '<img src=x onerror=alert(1)>');
  const s = setSetup(d, { strungOn: '2026-10-31', prestretch: 'leggero', stringer: 'a'.repeat(100), surface: 'terra' });
  assert.deepEqual([s.setup.strungOn, s.setup.prestretch, s.setup.stringer.length, s.setup.surface], ['2026-10-31', 'leggero', 60, 'terra']);
  const bad = setSetup(d, { strungOn: '2026-13-45', prestretch: 'boh', surface: 'luna' });
  assert.deepEqual([bad.setup.strungOn, bad.setup.prestretch, bad.setup.surface], [null, null, null]);
  assert.equal(setNextKgDelta(d, -1).nextKgDelta, -1);
  assert.equal(setNextKgDelta(d, 9).nextKgDelta, null);
  assert.equal(setNextKgDelta(setNextKgDelta(d, 1), null).nextKgDelta, null);
});

test('tensiometro: ordinato per ore, al massimo 8, valori non validi ignorati', () => {
  let d = emptyDiary();
  d = addMeter(d, { hours: 24, value: 24 }); d = addMeter(d, { hours: 0, value: 25 }); d = addMeter(d, { hours: 10, value: 22.5 });
  assert.deepEqual(d.meter.map((x) => x.hours), [0, 10, 24]);
  for (const bad of [{ hours: -1, value: 20 }, { hours: 5, value: 0 }, { hours: 'x', value: 20 }, { hours: 5, value: NaN }]) assert.equal(addMeter(d, bad).meter.length, 3);
  for (let i = 1; i <= 10; i++) d = addMeter(d, { hours: 100 + i, value: 20 });
  assert.equal(d.meter.length, 8);
  assert.deepEqual(removeMeter(addMeter(emptyDiary(), { hours: 0, value: 25 }), 0).meter, []);
});

test('tensionLoss: percentuale rispetto alla lettura a 0 h, vuota senza lettura iniziale', () => {
  let d = addMeter(addMeter(addMeter(emptyDiary(), { hours: 24, value: 24 }), { hours: 0, value: 25 }), { hours: 10, value: 22.5 });
  assert.deepEqual(tensionLoss(d), [{ hours: 10, pct: 10 }, { hours: 24, pct: 4 }]);
  assert.deepEqual(tensionLoss(addMeter(emptyDiary(), { hours: 5, value: 22 })), []);
});

test('spearman: correlazione di rango con parità', () => {
  assert.deepEqual(spearman([1, 2, 3, 4, 5], [10, 20, 30, 40, 50]), { r: 1, n: 5 });
  assert.deepEqual(spearman([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]), { r: -1, n: 5 });
  assert.equal(spearman([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]).r, 0.8);
  const ties = spearman([1, 1, 2, 3], [1, 2, 3, 4]);
  assert.equal(ties.n, 4);
  assert.ok(ties.r > 0.7 && ties.r < 1);
  assert.equal(spearman([1, 2], [1, 2]), null);
  assert.deepEqual(spearman([3, 3, 3, 3], [1, 2, 3, 4]), { r: null, n: 4 });
  assert.deepEqual(spearman([1, 2, 3, null, 5], [1, 2, 3, 4, NaN]), { r: 1, n: 3 });
});

test('sanitizeDiary: scarta ciò che è fuori norma, conserva il resto', () => {
  const raw = { setup: { strungOn: '2026-10-31', prestretch: 'boh', stringer: 's'.repeat(100), surface: 'luna' },
    meter: Array.from({ length: 12 }, (_, i) => ({ hours: i, value: 20 })).concat([{ hours: 'x', value: 5 }]),
    ratings: { first: { spin: 4, control: 0, power: 7, touch: 'x', comfort: 3.5, boh: 3 }, mid: 'no', end: { durability: 5 } },
    tags: ['secca', 'inventato', 'secca', 'vibra'], notes: 'n'.repeat(5000), verdict: 'boh', nextKgDelta: 9, extra: 'x' };
  const d = sanitizeDiary(raw);
  assert.deepEqual(d.ratings, { first: { spin: 4 }, end: { durability: 5 } });
  assert.deepEqual(d.tags, ['secca', 'vibra']);
  assert.equal(d.notes.length, 2000);
  assert.equal(d.verdict, null);
  assert.equal(d.nextKgDelta, null);
  assert.equal(d.meter.length, 8);
  assert.deepEqual([d.setup.strungOn, d.setup.prestretch, d.setup.stringer.length, d.setup.surface], ['2026-10-31', null, 60, null]);
  assert.equal(d.extra, undefined);
});

test('sanitizeDiary: undefined o non oggetto -> undefined; oggetto vuoto -> diario vuoto', () => {
  for (const x of [undefined, null, 'x', 3, []]) assert.equal(sanitizeDiary(x), undefined);
  assert.deepEqual(sanitizeDiary({}), emptyDiary());
});

test('diaryCsv: una riga per prova e momento, virgolette e a capo correttamente protetti', () => {
  const d = setNotes(setRating(setRating(setVerdict(emptyDiary(), 'si'), 'first', 'spin', 4), 'end', 'spin', 3), 'secca, "viva"\nseconda riga');
  const trials = [{ id: 'a', kg: [22.5, 21.5], from: '2026-10-01T10:00:00.000Z', to: '', hours: 17.5, reason: '', diary: d }, { id: 'b', kg: [23, 22], from: '2026-09-01T10:00:00.000Z', to: '2026-10-01T10:00:00.000Z', hours: 12, reason: 'consumata' }];
  const csv = diaryCsv(trials, (id) => ({ a: 'Marca A, 1,23', b: 'Marca B' }[id]));
  const lines = csv.split('\r\n');
  assert.match(lines[0], /^corda,tensione_v_kg,tensione_h_kg,dal,al,ore,motivo,momento,/);
  assert.match(csv, /"Marca A, 1,23",22.5,21.5/);
  assert.match(csv, /"secca, ""viva""\nseconda riga"/);
  assert.equal((csv.match(/Marca A/g) || []).length, 2, 'due momenti con voti');
  assert.match(csv, /Marca B,23,22,/);
  assert.doesNotMatch(csv, /\b(undefined|null|NaN)\b/);
});
