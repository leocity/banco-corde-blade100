// Salvataggio dello stato. Con `db`: documenti separati nella raccolta personale data/users/<id> — `state` (montata, preferite),
// `s-<ts>` per ogni sessione, `l-<lid>` per ogni vita di corda — con ascolto in tempo reale, così due dispositivi non si
// sovrascrivono. Senza `db` ripiega su un JSON in localStorage.
import { sanitizeState, splitState, joinState, sameState, stableJson } from './state.js';

const KEY = 'banco-corde:state';
const UNSYNCED_KEY = 'banco-corde:unsynced'; // '1' = l'ultima copia locale non è arrivata sul server
const RETRY_MAX = 60000;
const clone = (o) => JSON.parse(JSON.stringify(o));
const errText = (e) => String((e && e.message) || (e && e.code) || e);
const stripArrays = (core) => { const { sessions, lives, ...rest } = core; return rest; };
const isLegacy = (core) => !!core && (Array.isArray(core.sessions) || Array.isArray(core.lives));

export async function createPersistence({ claude, storage, defaults, knownIds, retryMs = 5000 }) {
  let db = null, uid = null, mode = 'local';
  try {
    db = claude ? await claude.use('db') : null;
    const user = db ? await claude.use('user') : null;
    uid = user ? await user.id() : null;
    if (db && uid) mode = 'db';
  } catch { mode = 'local'; }
  const col = () => db.collection(`data/users/${uid}`);
  const readLocal = () => { try { return storage ? storage.getItem(KEY) : null; } catch { return null; } };
  const flagUnsynced = (on) => { try { if (storage) storage.setItem(UNSYNCED_KEY, on ? '1' : '0'); } catch { /* archivio non disponibile */ } };
  const wasUnsynced = () => { try { return !!storage && storage.getItem(UNSYNCED_KEY) === '1'; } catch { return false; } };
  const writeLocal = (state) => { try { if (storage) storage.setItem(KEY, JSON.stringify(state)); } catch { /* archivio non disponibile */ } };

  // `mirror`: ultimo contenuto del server che conosciamo. `known`: gli elementi che lo stato locale ha già visto: solo quelli
  // si cancellano dal server quando mancano nello stato locale (una pagina vecchia non cancella ciò che non ha mai visto).
  let mirror = { core: null, sessions: {}, lives: {} }, known = new Set(), onRemote = null, lastWritten = null, status = mode === 'db' ? 'sync' : 'local';
  const fromDocs = (docs) => {
    const m = { core: null, sessions: {}, lives: {} };
    for (const d of docs) { const data = d.data(); if (d.id === 'state') m.core = data; else if (d.id.startsWith('s-')) m.sessions[d.id] = data; else if (d.id.startsWith('l-')) m.lives[d.id] = data; }
    return m;
  };
  const idsOf = (m) => new Set([...Object.keys(m.sessions), ...Object.keys(m.lives)]);
  const hasData = () => !!mirror.core || idsOf(mirror).size > 0;
  const assemble = () => (hasData() ? joinState(mirror.core, mirror.sessions, mirror.lives) : null);

  // Documento unico v1 -> documenti separati: prima gli elementi, poi `state` senza array; ripetibile.
  async function migrate() {
    const want = splitState(sanitizeState(mirror.core, defaults, knownIds).state);
    for (const kind of ['sessions', 'lives']) {
      for (const [id, v] of Object.entries(want[kind])) if (!mirror[kind][id]) { await col().doc(id).set(v); mirror[kind][id] = v; }
    }
    await col().doc('state').set(want.core);
    mirror.core = want.core;
  }

  async function syncTo(state) {
    const want = splitState(state), ops = [];
    // prima gli elementi (sessioni, vite), poi `state`, per ultime le cancellazioni: se la rete cade a metà non si perde nulla
    for (const kind of ['sessions', 'lives']) {
      for (const [id, v] of Object.entries(want[kind])) if (!mirror[kind][id] || stableJson(mirror[kind][id]) !== stableJson(v)) ops.push([id, v, kind]);
    }
    if (!mirror.core || stableJson(stripArrays(mirror.core)) !== stableJson(want.core) || isLegacy(mirror.core)) ops.push(['state', want.core, 'core']);
    for (const kind of ['sessions', 'lives']) {
      for (const id of Object.keys(mirror[kind])) if (!(id in want[kind]) && known.has(id)) ops.push([id, null, kind]);
    }
    for (const [id, v, kind] of ops) {
      if (v === null) { await col().doc(id).delete(); delete mirror[kind][id]; }
      else { await col().doc(id).set(clone(v)); if (kind === 'core') mirror.core = clone(v); else mirror[kind][id] = clone(v); }
    }
    known = new Set([...Object.keys(want.sessions), ...Object.keys(want.lives)]);
  }

  async function write(state) {
    if (mode === 'db') {
      try { await syncTo(state); api.lastError = null; status = 'sync'; unsynced = false; retryDelay = retryMs; flagUnsynced(false); return; } catch (e) { api.lastError = errText(e); status = 'error'; unsynced = true; flagUnsynced(true); }
    }
    writeLocal(state);
  }
  // Se il server non ha ricevuto l'ultimo stato lo si riprova da soli, con attesa crescente: nel frattempo lo stato del server non sostituisce quello locale.
  let unsynced = false, retryTimer = null, retryDelay = retryMs;
  function scheduleRetry() {
    if (!unsynced || mode !== 'db' || retryTimer) return;
    retryTimer = setTimeout(() => { retryTimer = null; if (unsynced && !latest && !running && lastWritten) api.save(lastWritten); }, retryDelay);
    if (retryTimer && retryTimer.unref) retryTimer.unref(); // in Node (test) non tiene vivo il processo
    retryDelay = Math.min(retryDelay * 2, RETRY_MAX);
  }
  // `writing` si alza prima della prima scrittura: un db che notifica lo snapshot dentro set() non deve far passare per «altrui» l'eco parziale delle nostre scritture.
  let running = null, latest = null, writing = false;
  async function flush() {
    writing = true;
    try { while (latest) { const s = latest; latest = null; lastWritten = s; await write(s); } } finally { writing = false; running = null; setTimeout(settle, 300); scheduleRetry(); }
  }
  const view = () => sanitizeState(assemble(), defaults, knownIds).state;
  function emit() {
    if (!onRemote || !hasData()) return;
    known = idsOf(mirror);
    onRemote(view());
  }
  // A coda svuotata, se il server ha qualcosa che lo stato locale non ha, lo consegna (uno snapshot arrivato durante le scritture non si applica a metà).
  function settle() {
    if (writing || latest || unsynced || !onRemote || !hasData()) return;
    if (!lastWritten || !sameState(view(), lastWritten)) emit();
  }

  const api = {
    get mode() { return mode; },
    get status() { return status; },
    lastError: null,
    async load() {
      if (mode === 'db') {
        try {
          mirror = fromDocs((await col().get()).docs);
          if (isLegacy(mirror.core)) { try { await migrate(); } catch (e) { api.lastError = errText(e); status = 'error'; } }
          known = idsOf(mirror);
          const out = sanitizeState(assemble(), defaults, knownIds);
          // l'ultima volta il salvataggio online è fallito: la copia locale ritorna e si fonde con il server (nulla perso, nulla cancellato)
          if (wasUnsynced() && readLocal()) {
            const loc = sanitizeState(readLocal(), defaults, knownIds).state, srv = out.state;
            const union = (a, b, key) => Object.values({ ...Object.fromEntries(a.map((x) => [x[key], x])), ...Object.fromEntries(b.map((x) => [x[key], x])) });
            const merged = { ...loc, sessions: union(srv.sessions, loc.sessions, 'ts'), lives: union(srv.lives, loc.lives, 'lid') };
            unsynced = true; lastWritten = merged;
            return { state: merged, warnings: out.warnings, unsynced: true };
          }
          lastWritten = out.state;
          return { ...out, unsynced: false };
        } catch (e) { api.lastError = errText(e); mode = 'local'; status = 'local'; }
      }
      return { ...sanitizeState(readLocal(), defaults, knownIds), unsynced: false };
    },
    // Una scrittura alla volta (il contratto di db lo chiede) e vince l'ultimo stato: i salvataggi ravvicinati si fondono.
    save(state) {
      latest = clone(state);
      if (!running) running = flush();
      return running;
    },
    subscribe(cb) {
      if (mode !== 'db') return;
      onRemote = cb;
      try {
        col().onSnapshot((snap) => { mirror = fromDocs(snap.docs); if (writing || latest || unsynced) return; emit(); }, (e) => { api.lastError = errText(e); status = 'error'; });
      } catch (e) { api.lastError = errText(e); status = 'error'; }
    },
    exportJson(state) { return JSON.stringify({ exportedAt: new Date().toISOString(), ...clone(state) }, null, 2); },
  };
  return api;
}
