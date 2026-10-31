import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPersistence } from './persist.js';
import { defaultState, addSession, removeSession, sameState, changeString } from './state.js';

const DEFAULTS = { equipped: { id: 'zero', kg: [22.5, 21.5] }, liked: ['conf'], disliked: [] };
const KNOWN = ['zero', 'conf', 'other'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const storage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const sess = (state, ts, hours = 1) => addSession(state, { date: '2026-10-30', hours, note: '', ts });

// db a raccolta: get/onSnapshot/doc().set/delete; external() simula un altro dispositivo
function fakeDb({ delay = 0, failSet = false, syncNotify = false } = {}) {
  const cfg = { failSet };
  const docs = new Map(), subs = new Set(), log = { sets: [], deletes: [], active: 0, max: 0 };
  const snapOf = () => ({ docs: [...docs.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, d]) => ({ id, exists: true, data: () => d })) });
  const notify = () => { for (const cb of [...subs]) cb(snapOf()); };
  const col = {
    get: async () => snapOf(),
    onSnapshot: (cb) => { subs.add(cb); return () => subs.delete(cb); },
    doc: (id) => ({
      set: async (d) => { if (syncNotify) { log.sets.push(id); docs.set(id, JSON.parse(JSON.stringify(d))); notify(); return; } log.active += 1; log.max = Math.max(log.max, log.active); await sleep(delay); log.active -= 1; if (cfg.failSet) throw { code: 'unavailable', message: 'giù' }; log.sets.push(id); docs.set(id, JSON.parse(JSON.stringify(d))); notify(); },
      delete: async () => { await sleep(delay); log.deletes.push(id); docs.delete(id); notify(); },
    }),
  };
  const claude = { use: async (n) => (n === 'db' ? { collection: (p) => { assert.equal(p, 'data/users/u1'); return col; }, doc: () => { throw new Error('doc() diretto non previsto'); } } : n === 'user' ? { id: async () => 'u1' } : null) };
  return { docs, log, cfg, claude, external: (fn) => { fn(docs); notify(); } };
}
const open = (db, st = storage()) => createPersistence({ claude: db.claude, storage: st, defaults: DEFAULTS, knownIds: KNOWN });
const NOTE = (ts, h) => ({ date: '2026-10-2' + h, hours: h, note: '', life: '2026-10-31T10:39:49.706Z', ts });
// documento v1 dell'utente (un solo documento con gli array)
const V1 = { v: 1, equipped: { id: 'zero', kg: [22.5, 21.5], since: '2026-10-31T10:39:49.706Z', hours0: 0 }, liked: ['conf'], disliked: [],
  sessions: [NOTE('1793446694885-1', 1), NOTE('1793446726372-2', 4), NOTE('1793446764930-3', 2)],
  lives: [{ id: 'other', kg: [22, 21], from: '2026-09-01T10:00:00.000Z', to: '2026-10-01T10:00:00.000Z', hours: 12, reason: 'consumata', note: '' }] };

test('senza claude: modalità local, round-trip su storage', async () => {
  const st = storage();
  const p = await createPersistence({ claude: null, storage: st, defaults: DEFAULTS, knownIds: KNOWN });
  assert.deepEqual([p.mode, p.status], ['local', 'local']);
  await p.save(sess(defaultState(DEFAULTS), 'a', 1.5));
  const back = await p.load();
  assert.equal(back.state.sessions[0].hours, 1.5);
  assert.deepEqual(back.warnings, []);
});

test('use() nullo per db: modalità local', async () => {
  const p = await createPersistence({ claude: { use: async () => null }, storage: storage(), defaults: DEFAULTS, knownIds: KNOWN });
  assert.equal(p.mode, 'local');
});

test('stato locale corrotto: iniziale con un avviso', async () => {
  const st = storage(); st.setItem('banco-corde:state', '{rotto');
  const p = await createPersistence({ claude: null, storage: st, defaults: DEFAULTS, knownIds: KNOWN });
  const { state, warnings } = await p.load();
  assert.equal(state.equipped.id, 'zero');
  assert.equal(warnings.length, 1);
});

test('exportJson contiene sessioni e corde finite', async () => {
  const p = await createPersistence({ claude: null, storage: storage(), defaults: DEFAULTS, knownIds: KNOWN });
  const out = JSON.parse(p.exportJson(sess(defaultState(DEFAULTS), 'a')));
  assert.equal(out.sessions.length, 1);
  assert.ok(Array.isArray(out.lives));
});

test('db: primo salvataggio scrive lo stato, poi solo ciò che cambia', async () => {
  const db = fakeDb(), p = await open(db);
  assert.equal(p.mode, 'db');
  const s0 = defaultState(DEFAULTS);
  await p.save(s0);
  assert.deepEqual(db.log.sets, ['state']);
  await p.save(sess(s0, '1793000000000-1'));
  assert.deepEqual(db.log.sets, ['state', 's-1793000000000-1']);
  await p.save(sess(sess(s0, '1793000000000-1'), '1793000000001-2'));
  assert.deepEqual(db.log.sets.slice(2), ['s-1793000000001-2']);
});

test('db: documenti scritti con il contenuto giusto e senza array nello stato', async () => {
  const db = fakeDb(), p = await open(db);
  await p.save(sess(defaultState(DEFAULTS), 'a1', 2));
  assert.equal(db.docs.get('state').v, 2);
  assert.equal(db.docs.get('state').sessions, undefined);
  assert.equal(db.docs.get('s-a1').hours, 2);
});

test('migrazione dal documento v1: nessuna sessione persa, state senza array, ripetibile', async () => {
  const db = fakeDb(); db.docs.set('state', JSON.parse(JSON.stringify(V1)));
  const p = await open(db);
  const { state, warnings } = await p.load();
  assert.deepEqual(warnings, []);
  assert.equal(state.sessions.length, 3);
  assert.equal(state.lives.length, 1);
  assert.equal(state.sessions.reduce((a, s) => a + s.hours, 0), 7);
  const ids = [...db.docs.keys()].sort();
  assert.equal(ids.filter((i) => i.startsWith('s-')).length, 3);
  assert.equal(ids.filter((i) => i.startsWith('l-')).length, 1);
  assert.equal(db.docs.get('state').sessions, undefined);
  assert.equal(db.docs.get('state').lives, undefined);
  const before = db.log.sets.length;
  const p2 = await open(db), again = await p2.load();
  assert.equal(again.state.sessions.length, 3);
  assert.equal(db.log.sets.length, before, 'la seconda apertura non riscrive niente');
  assert.equal([...db.docs.keys()].filter((i) => i.startsWith('s-')).length, 3);
});

test('migrazione che fallisce: i dati restano leggibili e lo stato è in errore', async () => {
  const db = fakeDb({ failSet: true }); db.docs.set('state', JSON.parse(JSON.stringify(V1)));
  const p = await open(db);
  const { state } = await p.load();
  assert.equal(state.sessions.length, 3);
  assert.equal(p.status, 'error');
  assert.ok(db.docs.get('state').sessions, 'il documento v1 non è stato toccato');
});

test('subscribe: una sessione aggiunta da un altro dispositivo arriva senza ricaricare', async () => {
  const db = fakeDb(), p = await open(db);
  await p.save(defaultState(DEFAULTS));
  const got = [];
  p.subscribe((s) => got.push(s));
  db.external((docs) => docs.set('s-ext1', { date: '2026-10-30', hours: 2, note: 'altrove', life: 'x', ts: 'ext1' }));
  assert.equal(got.at(-1).sessions.length, 1);
  assert.equal(got.at(-1).sessions[0].note, 'altrove');
});

test('subscribe: una sessione tolta altrove sparisce', async () => {
  const db = fakeDb(), p = await open(db);
  await p.save(sess(sess(defaultState(DEFAULTS), '1-1'), '2-2'));
  const got = [];
  p.subscribe((s) => got.push(s));
  db.external((docs) => docs.delete('s-1-1'));
  assert.deepEqual(got.at(-1).sessions.map((s) => s.ts), ['2-2']);
});

test('pagina vecchia: una modifica locale non cancella ciò che un altro dispositivo ha aggiunto', async () => {
  const db = fakeDb(), p = await open(db);
  const s0 = sess(defaultState(DEFAULTS), '1-1');
  await p.save(s0);
  await p.load();
  db.external((docs) => docs.set('s-tel1', { date: '2026-10-29', hours: 3, note: 'telefono', life: 'x', ts: 'tel1' }));
  await p.save(sess(s0, '3-3'));
  assert.ok(db.docs.has('s-tel1'), 'la sessione del telefono è sparita');
  assert.ok(db.docs.has('s-3-3'));
  assert.equal(db.log.deletes.length, 0);
});

test('cancellazione locale: toglie solo ciò che l\'utente ha tolto', async () => {
  const db = fakeDb(), p = await open(db);
  const s2 = sess(sess(defaultState(DEFAULTS), '1-1'), '2-2');
  await p.save(s2);
  await p.load();
  await p.save(removeSession(s2, '1-1'));
  assert.deepEqual([...db.docs.keys()].filter((i) => i.startsWith('s-')), ['s-2-2']);
});

test('scritture lente: mai due insieme e resta l\'ultimo stato', async () => {
  const db = fakeDb({ delay: 20 }), p = await open(db);
  const s1 = sess(defaultState(DEFAULTS), '1-1'), s2 = sess(s1, '2-2'), s3 = sess(s2, '3-3');
  await Promise.all([p.save(s1), p.save(s2), p.save(s3)]);
  assert.equal(db.log.max, 1, 'scritture sovrapposte');
  assert.deepEqual([...db.docs.keys()].filter((i) => i.startsWith('s-')).sort(), ['s-1-1', 's-2-2', 's-3-3']);
});

test('eco della propria scrittura: la callback riceve uno stato uguale a quello salvato', async () => {
  const db = fakeDb(), p = await open(db);
  const got = [];
  p.subscribe((s) => got.push(s));
  const s1 = sess(defaultState(DEFAULTS), '1-1');
  await p.save(s1);
  await sleep(400);
  assert.ok(got.length === 0 || sameState(got.at(-1), s1), 'lo stato ricevuto deve coincidere con quello locale');
});

test('uno snapshot arrivato durante la scrittura non fa tornare indietro: poi arriva lo stato fuso', async () => {
  const db = fakeDb({ delay: 30 }), p = await open(db);
  const base = defaultState(DEFAULTS);
  await p.save(base);
  const got = [];
  p.subscribe((s) => got.push(s));
  const writing = p.save(sess(base, '9-9'));
  await sleep(10);
  db.external((docs) => docs.set('s-ext', { date: '2026-10-30', hours: 2, note: 'altrove', life: 'x', ts: 'ext' }));
  await writing;
  await sleep(450);
  const last = got.at(-1);
  assert.ok(last, 'nessuna callback dopo la scrittura');
  assert.deepEqual(last.sessions.map((s) => s.ts).sort(), ['9-9', 'ext']);
});

test('errore di scrittura: status error, copia locale, poi torna sync', async () => {
  const st = storage();
  let failing = true;
  const db = fakeDb();
  const real = db.claude.use;
  db.claude.use = async (n) => { const r = await real(n); if (n === 'db') { const c = r.collection('data/users/u1'); const doc = c.doc; return { collection: () => ({ ...c, doc: (id) => ({ ...doc(id), set: async (d) => { if (failing) throw { message: 'giù' }; return doc(id).set(d); } }) }) }; } return r; };
  const p = await open(db, st);
  await p.save(defaultState(DEFAULTS));
  assert.equal(p.status, 'error');
  assert.match(p.lastError, /giù/);
  assert.ok(st.m.has('banco-corde:state'), 'la copia locale resta');
  failing = false;
  await p.save(sess(defaultState(DEFAULTS), 'a'));
  assert.equal(p.status, 'sync');
  assert.equal(p.lastError, null);
});

test('subscribe in locale non fa nulla e non lancia', async () => {
  const p = await createPersistence({ claude: null, storage: storage(), defaults: DEFAULTS, knownIds: KNOWN });
  p.subscribe(() => { throw new Error('non deve essere chiamata'); });
});

test('eco sincrona durante la scrittura: la sessione appena aggiunta non viene scartata', async () => {
  // un db che notifica lo snapshot dentro set(), prima che la coda risulti "in corso", mostrava solo lo stato parziale
  const db = fakeDb({ syncNotify: true }), p = await open(db);
  const got = [];
  p.subscribe((s) => got.push(s));
  const s1 = sess(defaultState(DEFAULTS), '1-1');
  await p.save(s1);
  await sleep(450);
  assert.equal(got.some((s) => s.sessions.length === 0), false, 'è arrivato uno stato senza la sessione appena salvata');
});

// ---- revisione finale: scritture fallite, riprova, ordine delle scritture ----
const openFast = (db, st = storage()) => createPersistence({ claude: db.claude, storage: st, defaults: DEFAULTS, knownIds: KNOWN, retryMs: 40 });

test('scrittura fallita con ascolto attivo: la modifica locale non viene sostituita dallo stato vecchio del server', async () => {
  const db = fakeDb(); const p = await open(db);
  let st = (await p.load()).state; await p.save(st);
  const seen = []; p.subscribe((r) => seen.push(r));
  db.cfg.failSet = true;
  st = sess(st, '5-0', 2); await p.save(st);
  assert.equal(p.status, 'error');
  await sleep(450);
  assert.equal(seen.length, 0, 'nessuno stato remoto deve cancellare la modifica non salvata');
});

test('scrittura fallita: si riprova da sola e, tornata la rete, il server riceve la sessione', async () => {
  const db = fakeDb(); const p = await openFast(db);
  let st = (await p.load()).state; await p.save(st);
  p.subscribe(() => {});
  db.cfg.failSet = true;
  st = sess(st, '6-0', 3); await p.save(st);
  assert.equal(p.status, 'error');
  db.cfg.failSet = false;
  await sleep(250);
  assert.ok(db.docs.has('s-6-0'), 'la sessione è arrivata sul server');
  assert.equal(p.status, 'sync');
});

test('riapertura dopo un salvataggio fallito: la modifica locale ritorna e si fonde con ciò che c\'è sul server', async () => {
  const db = fakeDb(); const st1 = storage(); const p = await open(db, st1);
  let st = (await p.load()).state; await p.save(st);
  db.cfg.failSet = true;
  st = sess(st, '7-0', 2); await p.save(st);
  db.external((docs) => docs.set('s-8-0', { date: '2026-10-29', hours: 5, note: '', life: st.equipped.since, ts: '8-0' }));
  db.cfg.failSet = false;
  const q = await open(db, st1);
  const out = await q.load();
  assert.equal(out.unsynced, true);
  assert.deepEqual(out.state.sessions.map((x) => x.ts).sort(), ['7-0', '8-0']);
  await q.save(out.state);
  assert.ok(db.docs.has('s-7-0') && db.docs.has('s-8-0'), 'nulla perso, nulla cancellato');
  const r = await open(db, st1);
  assert.equal((await r.load()).unsynced, false, 'dopo il salvataggio riuscito il segno sparisce');
});

test('cambio corda: la vita chiusa si scrive prima del documento state', async () => {
  const db = fakeDb(); const p = await open(db);
  let st = (await p.load()).state; await p.save(st);
  db.log.sets.length = 0;
  st = changeString(st, { id: 'other', kg: [22, 21], date: '2026-10-31T10:00:00.000Z', endReason: 'consumata', endHours: 5, lid: 'LX' });
  await p.save(st);
  const li = db.log.sets.indexOf('l-LX'), si = db.log.sets.indexOf('state');
  assert.ok(li >= 0 && si >= 0 && li < si, `ordine: ${db.log.sets}`);
});
