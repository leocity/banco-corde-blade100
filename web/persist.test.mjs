import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPersistence } from './persist.js';
import { defaultState, addSession } from './state.js';

const DEFAULTS = { equipped: { id: 'zero', kg: [22.5, 21.5] }, liked: ['conf'], disliked: [] };
const KNOWN = ['zero', 'conf', 'other'];
const storage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const claudeWith = (docs, { failGet = false, failSet = false } = {}) => ({
  use: async (n) => (n === 'db' ? { doc: (p) => ({
    get: async () => { if (failGet) throw { code: 'unavailable' }; return { exists: docs.has(p), data: () => docs.get(p) }; },
    set: async (d) => { if (failSet) throw { code: 'unavailable', message: 'giù' }; docs.set(p, d); } }) }
    : n === 'user' ? { id: async () => 'u1' } : null),
});

test('senza claude: modalità local, round-trip su storage', async () => {
  const st = storage();
  const p = await createPersistence({ claude: null, storage: st, defaults: DEFAULTS, knownIds: KNOWN });
  assert.equal(p.mode, 'local');
  const s = addSession(defaultState(DEFAULTS), { date: '2026-10-30', hours: 1.5, note: '', ts: 'a' });
  await p.save(s);
  const back = await p.load();
  assert.equal(back.state.sessions[0].hours, 1.5);
  assert.deepEqual(back.warnings, []);
});

test('use() nullo per db: modalità local', async () => {
  const p = await createPersistence({ claude: { use: async () => null }, storage: storage(), defaults: DEFAULTS, knownIds: KNOWN });
  assert.equal(p.mode, 'local');
});

test('con db: scrive su data/users/<id>/state e rilegge', async () => {
  const docs = new Map();
  const p = await createPersistence({ claude: claudeWith(docs), storage: storage(), defaults: DEFAULTS, knownIds: KNOWN });
  assert.equal(p.mode, 'db');
  await p.save(addSession(defaultState(DEFAULTS), { date: '2026-10-30', hours: 2, note: '', ts: 'a' }));
  assert.ok(docs.has('data/users/u1/state'));
  assert.equal((await p.load()).state.sessions.length, 1);
});

test('db che rigetta in lettura: ripiega su local e non lancia', async () => {
  const st = storage();
  const p = await createPersistence({ claude: claudeWith(new Map(), { failGet: true }), storage: st, defaults: DEFAULTS, knownIds: KNOWN });
  const { state } = await p.load();
  assert.equal(p.mode, 'local');
  assert.equal(state.equipped.id, 'zero');
});

test('db che rigetta in scrittura: tiene l\'errore e salva in locale', async () => {
  const st = storage();
  const p = await createPersistence({ claude: claudeWith(new Map(), { failSet: true }), storage: st, defaults: DEFAULTS, knownIds: KNOWN });
  await p.save(defaultState(DEFAULTS));
  assert.match(p.lastError, /giù/);
  assert.ok(st.m.has('banco-corde:state'));
});

test('stato locale corrotto: iniziale con un avviso', async () => {
  const st = storage();
  st.setItem('banco-corde:state', '{rotto');
  const p = await createPersistence({ claude: null, storage: st, defaults: DEFAULTS, knownIds: KNOWN });
  const { state, warnings } = await p.load();
  assert.equal(state.equipped.id, 'zero');
  assert.equal(warnings.length, 1);
});

test('exportJson contiene sessioni e corde finite', async () => {
  const p = await createPersistence({ claude: null, storage: storage(), defaults: DEFAULTS, knownIds: KNOWN });
  const s = addSession(defaultState(DEFAULTS), { date: '2026-10-30', hours: 1, note: '', ts: 'a' });
  const out = JSON.parse(p.exportJson(s));
  assert.equal(out.sessions.length, 1);
  assert.ok(Array.isArray(out.lives));
});
