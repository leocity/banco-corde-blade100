// v6: scorta, voto dell'uscita, domanda di «Prossima»; compatibilità con lo stato reale salvato.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultState, addSession, sanitizeState, splitState, joinState, sameState, changeString,
  addStock, useStock, setStockCount, rateSession, setNextGoal, SIZES } from './state.js';

const DEFAULTS = { equipped: { id: 'zero', kg: [22.5, 21.5] }, liked: ['conf'], disliked: [] };
const KNOWN = ['zero', 'conf', 'otoro', 'slap'];
const base = () => defaultState(DEFAULTS, new Date('2026-11-18T10:00:00Z'));

test('scorta: aggiungere, contare, consumare; dimensioni intera/mezza', () => {
  assert.deepEqual(SIZES, ['intera', 'mezza']);
  let s = addStock(base(), 'otoro', 'mezza');
  s = addStock(s, 'otoro', 'mezza');
  s = addStock(s, 'conf', 'intera');
  assert.deepEqual(s.stock, [{ id: 'otoro', size: 'mezza', n: 2 }, { id: 'conf', size: 'intera', n: 1 }]);
  s = useStock(s, 'otoro', 'mezza');
  assert.equal(s.stock[0].n, 1);
  s = useStock(s, 'otoro', 'mezza');
  assert.deepEqual(s.stock, [{ id: 'conf', size: 'intera', n: 1 }]);
  assert.equal(useStock(s, 'nessuna', 'intera'), s);
  assert.deepEqual(setStockCount(s, 'conf', 'intera', 3).stock, [{ id: 'conf', size: 'intera', n: 3 }]);
  assert.deepEqual(setStockCount(s, 'conf', 'intera', 0).stock, []);
  assert.equal(addStock(base(), 'otoro', 'gigante').stock, undefined);
});

test('voto dell\'uscita: 1–5 e un tag, sulla stessa sessione', () => {
  let s = addSession(base(), { date: '2026-11-18', hours: 1.5, ts: 't1' });
  s = rateSession(s, 't1', { feel: 4, tag: 'pastosa' });
  assert.equal(s.sessions[0].feel, 4);
  assert.equal(s.sessions[0].tag, 'pastosa');
  assert.equal(rateSession(s, 't1', { feel: 9 }).sessions[0].feel, 4);
  s = rateSession(s, 't1', { feel: null, tag: null });
  assert.equal('feel' in s.sessions[0], false);
  assert.equal('tag' in s.sessions[0], false);
});

test('domanda di Prossima: solo valori noti', () => {
  assert.equal(setNextGoal(base(), 'stiffer').nextGoal, 'stiffer');
  assert.equal(setNextGoal(base(), 'boh').nextGoal, undefined);
});

test('sanitize: scorta, voti e domanda sopravvivono; valori sporchi scartati', () => {
  let s = addStock(base(), 'otoro', 'mezza');
  s = setNextGoal(s, 'holds');
  s = addSession(s, { date: '2026-11-18', hours: 1.5, ts: 't1' });
  s = rateSession(s, 't1', { feel: 3, tag: 'viva' });
  const raw = JSON.parse(JSON.stringify(s));
  raw.stock.push({ id: 'sparita', size: 'mezza', n: 1 }, { id: 'conf', size: 'x', n: 1 }, { id: 'conf', size: 'intera', n: -2 });
  raw.sessions.push({ ts: 't2', date: '2026-11-18', hours: 1, life: s.equipped.since, feel: 'tanto' });
  const { state } = sanitizeState(raw, DEFAULTS, KNOWN);
  assert.deepEqual(state.stock, [{ id: 'otoro', size: 'mezza', n: 1 }]);
  assert.equal(state.nextGoal, 'holds');
  assert.equal(state.sessions[0].feel, 3);
  assert.equal(state.sessions[0].tag, 'viva');
  assert.equal('feel' in state.sessions[1], false);
});

test('db: scorta e domanda nel documento prefs, voto in r-<ts>; state e s-* restano come nella v5', () => {
  let s = addStock(base(), 'otoro', 'mezza');
  s = setNextGoal(s, 'spin');
  s = addSession(s, { date: '2026-11-18', hours: 1.5, ts: 't1' });
  s = rateSession(s, 't1', { feel: 5, tag: 'viva' });
  const { core, sessions, lives, prefs, rates } = splitState(s);
  assert.equal('stock' in core, false);
  assert.deepEqual(prefs, { stock: s.stock, nextGoal: 'spin' });
  assert.deepEqual(sessions['s-t1'], { ts: 't1', date: '2026-11-18', hours: 1.5, note: '', life: s.equipped.since });
  assert.deepEqual(rates, { 'r-t1': { ts: 't1', feel: 5, tag: 'viva' } });
  const back = sanitizeState(joinState(core, sessions, lives, prefs, rates), DEFAULTS, KNOWN).state;
  assert.ok(sameState(back, s));
});

test('una pagina v5 aperta altrove riscrive solo state, s-* e l-*: i dati v6 sopravvivono', () => {
  let s = addStock(base(), 'otoro', 'mezza');
  s = addSession(s, { date: '2026-11-18', hours: 1.5, ts: 't1' });
  s = rateSession(s, 't1', { feel: 4 });
  const docs = splitState(s);
  // la v5 legge solo state, s-*, l-* e riscrive quelli: gli stessi contenuti, senza campi v6
  const v5 = sanitizeState(joinState(docs.core, docs.sessions, docs.lives), DEFAULTS, KNOWN).state;
  const v5docs = splitState(v5);
  assert.deepEqual(v5docs.core, docs.core);
  assert.deepEqual(v5docs.sessions, docs.sessions);
  const back = sanitizeState(joinState(v5docs.core, v5docs.sessions, v5docs.lives, docs.prefs, docs.rates), DEFAULTS, KNOWN).state;
  assert.ok(sameState(back, s));
});

test('cambio corda: la vecchia sessione resta, la scorta scende se la nuova era in casa', () => {
  let s = addStock(base(), 'otoro', 'mezza');
  s = changeString(s, { id: 'otoro', kg: [22, 21], date: '2026-11-18T10:00:00.000Z', endReason: 'consumata', fromStock: 'mezza' });
  assert.equal(s.equipped.id, 'otoro');
  assert.deepEqual(s.stock, []);
});

test('stato reale salvato (2026-11-18): si legge senza avvisi e senza perdere nulla', () => {
  const fx = JSON.parse(readFileSync(new URL('../tests/fixtures/state_real_2026-11-18.json', import.meta.url)));
  const known = ['re-string-slap-17', 're-string-zero-17', 'solinco-confidential-16l', 'toroline-o-toro-17', 'solinco-confidential-soft-16',
    'solinco-confidential-soft-17', 'solinco-confidential-soft-16l', 'babolat-rpm-blast-16', 'babolat-rpm-blast-17', 'solinco-barb-wire-16'];
  const raw = joinState(fx.core, fx.sessions, fx.lives);
  const { state, warnings } = sanitizeState(raw, { equipped: { id: 're-string-slap-17', kg: [22, 21] }, liked: [], disliked: [] }, known);
  assert.deepEqual(warnings, []);
  assert.equal(state.equipped.id, 're-string-slap-17');
  assert.deepEqual(state.equipped.kg, [22, 21]);
  assert.equal(state.sessions.length, 16);
  assert.equal(state.lives.length, 1);
  assert.equal(state.lives[0].hours, 17.5);
  assert.ok(state.equipped.diary && state.equipped.diary.tags.includes('pastosa'));
  assert.equal(state.liked.length, 4);
  assert.equal(state.disliked.length, 6);
  // il giro di salvataggio non cambia nulla dei documenti esistenti
  const { core, sessions } = splitState(state);
  for (const [k, v] of Object.entries(fx.sessions)) assert.deepEqual(sessions[k], v, k);
  assert.deepEqual(core.equipped.kg, fx.core.equipped.kg);
});

test('matassina e mezza: una racchetta intera serve una matassina o due mezze della stessa corda', async () => {
  const { canStringFull, canStringHalf, SIZE_LABEL } = await import('./state.js');
  let s = addStock(base(), 'otoro', 'mezza');
  assert.equal(canStringFull(s, 'otoro'), false);
  assert.equal(canStringHalf(s, 'otoro'), true);
  s = addStock(s, 'otoro', 'mezza');
  assert.equal(canStringFull(s, 'otoro'), true);
  assert.equal(useStock(s, 'otoro', 'due-mezze').stock.length, 0);
  assert.equal(canStringFull(addStock(base(), 'conf', 'intera'), 'conf'), true);
  assert.equal(SIZE_LABEL.intera, 'matassina');
});
