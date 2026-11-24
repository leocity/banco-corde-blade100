// Piano di prove e schede di campo: calo %, ore alla soglia, ore e durata delle prove, ordine in arrivo, salvataggio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeField, saveField, removeField, dtSeries, hoursToAlert, fieldExport, linkPlan, planUsage, planStatus, nextPlanRow,
  hoursVsGuess, receiveOrder, orderReceived, useHybridHalves } from './prove.js';
import { defaultState, addSession, changeString, sanitizeState, splitState, joinState, sameState } from './state.js';

const DEFAULTS = { equipped: { id: 'slap', kg: [22, 21] }, liked: [], disliked: [] };
const KNOWN = ['slap', 'tour', 'octa', 'snap'];
const K = new Set(KNOWN);
const base = () => defaultState(DEFAULTS, new Date('2026-11-01T10:00:00Z'));

test('calo % rispetto alla 0h e ore alla soglia (come pipeline/field_tests.py)', () => {
  const s = dtSeries({ '0h': 40, '24h': 38, '4h': 36, '8h': 33, '12h': null });
  assert.deepEqual(s.map((x) => [x.key, x.kind, x.loss]), [['24h', 'riposo', 5], ['4h', 'gioco', 10], ['8h', 'gioco', 17.5]]);
  assert.equal(hoursToAlert(s, 15), 6.7); // 10% a 4 h, 17,5% a 8 h: 15% a 4 + 4·5/7,5 = 6,67 h
  assert.equal(hoursToAlert(dtSeries({ '0h': 40, '4h': 39 }), 15), null);
  assert.deepEqual(dtSeries({ '4h': 30 }), []); // senza 0h niente calo
});

test('scheda: campi non validi tolti, essenziali obbligatori; salva, sostituisce, toglie', () => {
  const t = sanitizeField({ fid: 'a1', mains: 'tour', cross: 'tour', tension_kg: [22, 21], dt_log: { '0h': 40, x: 3, '4h': -1 }, feel_1_5: { arm_comfort: 4, launch_angle: 9 },
    notching_8h: 'medio', snapback_check_8h: 5, verdict: 'liked', note: ' ok ' }, K);
  assert.deepEqual(t.dt_log, { '0h': 40 });
  assert.deepEqual(t.feel_1_5, { arm_comfort: 4 });
  assert.equal(t.notching_8h, 'medium');
  assert.equal('snapback_check_8h' in t, false);
  assert.equal(sanitizeField({ fid: 'a2', mains: 'nessuna', cross: 'tour', tension_kg: [22, 21] }, K), null);
  assert.equal(sanitizeField({ fid: 'a/3', mains: 'tour', cross: 'tour', tension_kg: [22, 21] }, K), null);
  let s = saveField(base(), t, K);
  s = saveField(s, { ...t, verdict: 'ok' }, K);
  assert.equal(s.fieldTests.length, 1);
  assert.equal(s.fieldTests[0].verdict, 'ok');
  assert.deepEqual(removeField(s, 'a1').fieldTests, []);
  const ex = fieldExport(s.fieldTests);
  assert.equal(ex.tests[0].setup_id, 'a1');
  assert.equal('fid' in ex.tests[0], false);
});

test('ore e durata di una prova: uscite mentre è montata, anche dopo averla tolta', () => {
  let s = changeString(base(), { id: 'tour', kg: [22, 21], date: '2026-11-05T12:00:00.000Z', endReason: 'cambiata per prova', lid: 'l1' });
  s = linkPlan(s, s.equipped.since, 'full-tour');
  s = addSession(s, { date: '2026-11-06', hours: 1.5, ts: 't1' });
  s = addSession(s, { date: '2026-11-08', hours: 2, ts: 't2' });
  const now = new Date('2026-11-10T12:00:00Z');
  let u = planUsage(s, 'full-tour', now);
  assert.deepEqual([u.hours, u.sessions, u.days, u.current, u.ended], [3.5, 2, 5, true, false]);
  assert.equal(planStatus(s, { id: 'full-tour' }).key, 'montata');
  s = changeString(s, { id: 'octa', kg: [22, 21], date: '2026-11-12T12:00:00.000Z', endReason: 'consumata', lid: 'l2' });
  u = planUsage(s, 'full-tour', now);
  assert.deepEqual([u.hours, u.sessions, u.days, u.current, u.ended], [3.5, 2, 7, false, true]);
  assert.equal(planStatus(s, { id: 'full-tour' }).key, 'fatta');
  assert.equal(nextPlanRow(s, [{ id: 'full-tour' }, { id: 'full-octa' }]).id, 'full-octa');
  assert.equal(hoursVsGuess(3.5, [12, 16], true).word, 'durata meno dell\'ipotesi');
  assert.equal(hoursVsGuess(13, [12, 16], true).word, 'dentro l\'ipotesi');
  assert.match(hoursVsGuess(3.5, [12, 16], false).word, /in corso, 12,5 h/);
});

test('ordine arrivato: mezze nella scorta una volta sola; ibrido montato toglie una mezza per lato', () => {
  const order = { key: 'ordine-2026-12-15', halves: { octa: 3, snap: 3 } };
  let s = { ...base(), stock: [{ id: 'snap', size: 'mezza', n: 2 }] };
  s = receiveOrder(s, order);
  assert.deepEqual(s.stock, [{ id: 'snap', size: 'mezza', n: 5 }, { id: 'octa', size: 'mezza', n: 3 }]);
  assert.ok(orderReceived(s, order.key));
  assert.equal(receiveOrder(s, order), s);
  s = useHybridHalves(s, { kind: 'hybrid', main: 'octa', cross: 'snap', from: ['in_arrivo', 'in_arrivo'] });
  assert.deepEqual(s.stock, [{ id: 'snap', size: 'mezza', n: 4 }, { id: 'octa', size: 'mezza', n: 2 }]);
});

test('schede e collegamenti viaggiano in documenti propri (f-*, x-prove) e tornano uguali', () => {
  let s = linkPlan(base(), base().equipped.since, 'full-tour');
  s = saveField(s, { fid: 'f1', plan: 'full-tour', mains: 'slap', cross: 'slap', tension_kg: [22, 21], dt_log: { '0h': 40 } }, K);
  s = sanitizeState(s, DEFAULTS, KNOWN).state;
  const d = splitState(s);
  assert.deepEqual(Object.keys(d.fields), ['f-f1']);
  assert.deepEqual(d.prove.links, { [s.equipped.since]: 'full-tour' });
  assert.equal('prove' in d.core || 'fieldTests' in d.core || 'fieldTests' in d.prefs, false); // le pagine vecchie riscrivono solo state/prefs
  const back = sanitizeState(joinState(d.core, d.sessions, d.lives, d.prefs, d.rates, d.fields, d.prove), DEFAULTS, KNOWN).state;
  assert.ok(sameState(back, s));
  const old = sanitizeState(joinState(d.core, d.sessions, d.lives, d.prefs, d.rates), DEFAULTS, KNOWN).state; // pagina v6.3
  assert.equal('fieldTests' in old, false);
});
