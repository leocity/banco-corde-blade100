import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, setPreference, changeString, addSession, removeSession, editSession, equippedHours, parseHours, labStiff, tensionFor, sanitizeState, splitState, joinState, sameState } from './state.js';

const DEFAULTS = { equipped: { id: 'zero', kg: [22.5, 21.5] }, liked: ['conf', 'otoro'], disliked: ['blast'] };
const KNOWN = ['zero', 'conf', 'otoro', 'blast', 'other'];
const NOW = new Date('2026-10-30T10:00:00Z');
const stiff = (v, kind = 'misurata') => ({ stiffness: { value_lbin: v, kind } });

test('parseHours: virgola italiana e punto', () => {
  assert.deepEqual(parseHours('1,5'), { ok: true, value: 1.5 });
  assert.deepEqual(parseHours('2'), { ok: true, value: 2 });
  assert.deepEqual(parseHours(1.25), { ok: true, value: 1.25 });
});

test('parseHours: rifiuta vuoto, zero, negativi, oltre 24 e testo', () => {
  for (const bad of ['', '  ', '0', '-2', '30', '24,5', 'abc', '1,5,5', null, undefined, NaN]) {
    const r = parseHours(bad);
    assert.equal(r.ok, false, String(bad));
    assert.ok(r.reason && !/undefined|NaN/.test(r.reason));
  }
  assert.equal(parseHours('24').ok, true);
});

test('defaultState parte dai predefiniti', () => {
  const s = defaultState(DEFAULTS, NOW);
  assert.deepEqual(s.equipped, { id: 'zero', kg: [22.5, 21.5], since: NOW.toISOString(), hours0: 0 });
  assert.deepEqual([s.liked, s.disliked, s.sessions, s.lives], [['conf', 'otoro'], ['blast'], [], []]);
});

test('setPreference sposta un id da una lista all\'altra', () => {
  let s = defaultState(DEFAULTS, NOW);
  s = setPreference(s, 'conf', 'disliked');
  assert.deepEqual([s.liked, s.disliked], [['otoro'], ['blast', 'conf']]);
  s = setPreference(s, 'conf', null);
  assert.deepEqual([s.liked, s.disliked], [['otoro'], ['blast']]);
  s = setPreference(s, 'other', 'liked');
  assert.deepEqual(s.liked, ['otoro', 'other']);
});

test('addSession assegna la vita corrente e equippedHours somma', () => {
  let s = defaultState(DEFAULTS, NOW);
  s = addSession(s, { date: '2026-10-30', hours: 1.5, note: '' , ts: 'a'});
  s = addSession(s, { date: '2026-10-31', hours: 2, note: 'doppio', ts: 'b' });
  assert.equal(s.sessions[0].life, s.equipped.since);
  assert.equal(equippedHours(s), 3.5);
});

test('removeSession ed editSession', () => {
  let s = addSession(defaultState(DEFAULTS, NOW), { date: '2026-10-30', hours: 1, note: '', ts: 'a' });
  s = editSession(s, 'a', { hours: 2.5, note: 'più lungo' });
  assert.deepEqual([s.sessions[0].hours, s.sessions[0].note], [2.5, 'più lungo']);
  assert.equal(removeSession(s, 'a').sessions.length, 0);
  assert.equal(removeSession(s, 'zzz').sessions.length, 1);
});

test('changeString chiude la vita con le ore registrate e azzera', () => {
  let s = addSession(defaultState(DEFAULTS, NOW), { date: '2026-10-30', hours: 4, note: '', ts: 'a' });
  const next = changeString(s, { id: 'other', kg: [23, 22], date: '2026-11-10T08:00:00.000Z', endReason: 'consumata', note: 'spenta', lid: 'L1' });
  assert.deepEqual(next.lives, [{ lid: 'L1', id: 'zero', kg: [22.5, 21.5], from: NOW.toISOString(), to: '2026-11-10T08:00:00.000Z', hours: 4, reason: 'consumata', note: 'spenta' }]);
  assert.deepEqual(next.equipped, { id: 'other', kg: [23, 22], since: '2026-11-10T08:00:00.000Z', hours0: 0 });
  assert.equal(equippedHours(next), 0);
  assert.equal(s.lives.length, 0, 'lo stato precedente non è modificato');
});

test('changeString usa endHours se indicato', () => {
  const s = changeString(defaultState(DEFAULTS, NOW), { id: 'other', kg: [23, 22], date: '2026-11-10T08:00:00.000Z', endReason: 'rotta', endHours: 7.5 });
  assert.equal(s.lives[0].hours, 7.5);
});

test('tensionFor: +15 lb/in rispetto alla montata toglie 1 kg', () => {
  const t = tensionFor(stiff(230), stiff(215), [22.5, 21.5]);
  assert.deepEqual(t.kg, [21.5, 20.5]);
  assert.equal(t.corrected, true);
  assert.deepEqual([t.low, t.high], [[20.5, 19.5], [22.5, 21.5]]);
  assert.deepEqual(t.lbs, [47.5, 45]);
});

test('tensionFor: delta limitato a ±2 kg', () => {
  assert.deepEqual(tensionFor(stiff(400), stiff(200), [22.5, 21.5]).kg, [20.5, 19.5]);
  assert.deepEqual(tensionFor(stiff(100), stiff(200), [22.5, 21.5]).kg, [24.5, 23.5]);
});

test('tensionFor: senza rigidità resta la tensione della montata, mai NaN', () => {
  for (const [a, b] of [[{ stiffness: null }, stiff(215)], [stiff(215), { stiffness: null }], [stiff(300, 'modello'), stiff(215)], [stiff(215), null]]) {
    const t = tensionFor(a, b, [22.5, 21.5]);
    assert.deepEqual(t.kg, [22.5, 21.5]);
    assert.equal(t.corrected, false);
    assert.ok(t.lbs.every(Number.isFinite));
  }
  assert.equal(labStiff(stiff(215, 'da Racketpedia')), 215);
});

test('sanitizeState: JSON illeggibile -> stato iniziale', () => {
  const { state, warnings } = sanitizeState('{rotto', DEFAULTS, KNOWN);
  assert.equal(state.equipped.id, 'zero');
  assert.equal(warnings.length, 1);
});

test('sanitizeState: null o undefined -> stato iniziale senza avvisi', () => {
  for (const raw of [null, undefined]) assert.deepEqual(sanitizeState(raw, DEFAULTS, KNOWN).warnings, []);
});

test('sanitizeState: scarta le sessioni non valide e tiene le altre', () => {
  const raw = { v: 1, equipped: { id: 'zero', kg: [22.5, 21.5], since: NOW.toISOString(), hours0: 0 }, liked: ['conf'], disliked: [], lives: [],
    sessions: [{ ts: 'a', date: '2026-10-30', hours: 2, note: '', life: NOW.toISOString() }, { ts: 'b', date: '2026-10-30', hours: 'x', note: '', life: 'l' },
      { ts: 'c', date: '2026-10-30', hours: -1, note: '', life: 'l' }, null, 'testo'] };
  const { state } = sanitizeState(raw, DEFAULTS, KNOWN);
  assert.deepEqual(state.sessions.map((s) => s.ts), ['a']);
  assert.deepEqual(state.liked, ['conf']);
});

test('sanitizeState: montata sconosciuta -> predefinita con un avviso', () => {
  const raw = { equipped: { id: 'sparita', kg: [22, 21], since: NOW.toISOString(), hours0: 0 }, liked: ['conf', 'sparita'], disliked: [], sessions: [], lives: [] };
  const { state, warnings } = sanitizeState(raw, DEFAULTS, KNOWN);
  assert.equal(state.equipped.id, 'zero');
  assert.equal(warnings.length, 1);
  assert.deepEqual(state.liked, ['conf']);
});

test('sanitizeState: campo assente = predefinito, elenco vuoto = vuoto', () => {
  const a = sanitizeState({ equipped: { id: 'zero', kg: [22.5, 21.5], since: NOW.toISOString(), hours0: 0 } }, DEFAULTS, KNOWN).state;
  assert.deepEqual(a.liked, ['conf', 'otoro']);
  const b = sanitizeState({ liked: [] }, DEFAULTS, KNOWN).state;
  assert.deepEqual(b.liked, []);
});

test('changeString assegna un lid alla vita chiusa', () => {
  const s = changeString(defaultState(DEFAULTS, NOW), { id: 'other', kg: [23, 22], date: '2026-11-10T08:00:00.000Z', endReason: 'consumata', lid: '777' });
  assert.equal(s.lives[0].lid, '777');
  const t = changeString(defaultState(DEFAULTS, NOW), { id: 'other', kg: [23, 22], date: '2026-11-10T08:00:00.000Z', endReason: 'consumata' });
  assert.match(t.lives[0].lid, /^\d+$/);
});

test('sanitizeState: le vite senza lid ne ricevono uno stabile dalla data di inizio, lo stato è v2', () => {
  const raw = { v: 1, lives: [{ id: 'other', kg: [22, 21], from: '2026-09-01T10:00:00.000Z', to: '2026-10-01T10:00:00.000Z', hours: 12, reason: 'consumata', note: '' }] };
  const a = sanitizeState(raw, DEFAULTS, KNOWN).state, b = sanitizeState(raw, DEFAULTS, KNOWN).state;
  assert.equal(a.v, 2);
  assert.match(a.lives[0].lid, /^\d+$/);
  assert.equal(a.lives[0].lid, b.lives[0].lid);
});

test('sanitizeState: una sessione con un id che db non accetta viene scartata', () => {
  const raw = { sessions: [{ ts: 'ok-1', date: '2026-10-30', hours: 1, note: '', life: 'l' }, { ts: 'a/b c', date: '2026-10-30', hours: 1, note: '', life: 'l' }] };
  assert.deepEqual(sanitizeState(raw, DEFAULTS, KNOWN).state.sessions.map((x) => x.ts), ['ok-1']);
});

test('splitState / joinState: round-trip e id dei documenti', () => {
  let s = defaultState(DEFAULTS, NOW);
  s = addSession(s, { date: '2026-10-30', hours: 1, note: 'a', ts: '5-1' });
  s = addSession(s, { date: '2026-10-31', hours: 2, note: 'b', ts: '6-2' });
  s = changeString(s, { id: 'other', kg: [23, 22], date: '2026-11-10T08:00:00.000Z', endReason: 'consumata', lid: '999' });
  const { core, sessions, lives } = splitState(s);
  assert.deepEqual(Object.keys(sessions).sort(), ['s-5-1', 's-6-2']);
  assert.deepEqual(Object.keys(lives), ['l-999']);
  assert.equal(core.v, 2);
  assert.equal(core.sessions, undefined);
  assert.ok(sameState(sanitizeState(joinState(core, sessions, lives), DEFAULTS, KNOWN).state, s));
});

test('sameState ignora l\'ordine delle chiavi e delle sessioni', () => {
  const a = addSession(addSession(defaultState(DEFAULTS, NOW), { date: '2026-10-30', hours: 1, note: '', ts: '1-1' }), { date: '2026-10-30', hours: 2, note: '', ts: '2-2' });
  const b = { ...a, sessions: [...a.sessions].reverse() };
  assert.ok(sameState(a, b));
  assert.equal(sameState(a, removeSession(a, '1-1')), false);
});

import { trialsOf, applyVerdict, updateDiary } from './state.js';
import { setRating, setVerdict, emptyDiary } from './diary.js';

test('sanitizeState: il diario di montata e vite si conserva ripulito; senza diario nessun campo', () => {
  const raw = { equipped: { id: 'zero', kg: [22.5, 21.5], since: NOW.toISOString(), hours0: 0, diary: { ratings: { first: { spin: 4, control: 9 } }, tags: ['secca', 'boh'] } },
    lives: [{ lid: '1', id: 'other', kg: [22, 21], from: '2026-09-01T10:00:00.000Z', to: '2026-10-01T10:00:00.000Z', hours: 12, reason: 'consumata', note: '', diary: { verdict: 'no', notes: 'x'.repeat(3000) } },
      { lid: '2', id: 'conf', kg: [22, 21], from: '2026-08-01T10:00:00.000Z', to: '2026-09-01T10:00:00.000Z', hours: 8, reason: 'rotta', note: '' }] };
  const s = sanitizeState(raw, DEFAULTS, KNOWN).state;
  assert.deepEqual(s.equipped.diary.ratings, { first: { spin: 4 } });
  assert.deepEqual(s.equipped.diary.tags, ['secca']);
  assert.equal(s.lives.find((l) => l.lid === '1').diary.notes.length, 2000);
  assert.equal('diary' in s.lives.find((l) => l.lid === '2'), false);
  assert.equal('diary' in sanitizeState({}, DEFAULTS, KNOWN).state.equipped, false);
});

test('updateDiary: crea il diario della montata o di una vita chiusa, ignora una vita sconosciuta', () => {
  let s = defaultState(DEFAULTS, NOW);
  s = updateDiary(s, 'current', (d) => setRating(d, 'first', 'spin', 5));
  assert.equal(s.equipped.diary.ratings.first.spin, 5);
  s = changeString(s, { id: 'other', kg: [23, 22], date: '2026-11-10T08:00:00.000Z', endReason: 'consumata', lid: 'L9' });
  assert.equal(s.lives[0].diary.ratings.first.spin, 5, 'il diario passa alla vita chiusa');
  assert.equal(s.equipped.diary, undefined, 'la nuova montata parte senza diario');
  s = updateDiary(s, 'L9', (d) => setRating(d, 'end', 'comfort', 2));
  assert.equal(s.lives[0].diary.ratings.end.comfort, 2);
  assert.deepEqual(updateDiary(s, 'nope', (d) => d), s);
});

test('trialsOf: la montata per prima, poi le vite dalla più recente, con ore e diario', () => {
  let s = addSession(defaultState(DEFAULTS, NOW), { date: '2026-10-30', hours: 2, note: '', ts: '1-1' });
  s = updateDiary(s, 'current', (d) => setVerdict(d, 'si'));
  s = changeString(s, { id: 'other', kg: [23, 22], date: '2026-11-10T08:00:00.000Z', endReason: 'consumata', lid: 'L1' });
  s = changeString(s, { id: 'conf', kg: [22, 21], date: '2026-11-20T08:00:00.000Z', endReason: 'rotta', lid: 'L2' });
  const t = trialsOf(s);
  assert.deepEqual(t.map((x) => x.lid), ['current', 'L2', 'L1']);
  assert.equal(t[0].id, 'conf');
  assert.equal(t[2].diary.verdict, 'si');
  assert.equal(t[1].hours, 0);
});

test('applyVerdict: sì -> preferita, no -> non gradita, forse e nessuno non cambiano', () => {
  const s = defaultState(DEFAULTS, NOW);
  assert.deepEqual(applyVerdict(s, 'other', 'si').liked, ['conf', 'otoro', 'other']);
  assert.deepEqual(applyVerdict(applyVerdict(s, 'conf', 'no'), 'conf', 'no').disliked, ['blast', 'conf']);
  assert.deepEqual(applyVerdict(applyVerdict(s, 'conf', 'no'), 'conf', 'no').liked, ['otoro']);
  assert.deepEqual(applyVerdict(s, 'conf', 'forse'), s);
  assert.deepEqual(applyVerdict(s, 'conf', null), s);
  assert.deepEqual(applyVerdict(s, 'blast', 'si').disliked, []);
});
