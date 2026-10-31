// Salvataggio dello stato. Con `db`: documenti separati nella raccolta personale data/users/<id> — `state` (montata, preferite),
// `s-<ts>` per ogni sessione, `l-<lid>` per ogni vita di corda — con ascolto in tempo reale, così due dispositivi non si
// sovrascrivono. Senza `db` ripiega su un JSON in localStorage.
import { sanitizeState, splitState, joinState, sameState, stableJson } from './state.js';

const KEY = 'banco-corde:state';
const clone = (o) => JSON.parse(JSON.stringify(o));
const errText = (e) => String((e && e.message) || (e && e.code) || e);
const stripArrays = (core) => { const { sessions, lives, ...rest } = core; return rest; };
const isLegacy = (core) => !!core && (Array.isArray(core.sessions) || Array.isArray(core.lives));

export async function createPersistence({ claude, storage, defaults, knownIds }) {
  let db = null, uid = null, mode = 'local';
  try {
    db = claude ? await claude.use('db') : null;
    const user = db ? await claude.use('user') : null;
    uid = user ? await user.id() : null;
    if (db && uid) mode = 'db';
  } catch { mode = 'local'; }
  const col = () => db.collection(`data/users/${uid}`);
  const readLocal = () => { try { return storage ? storage.getItem(KEY) : null; } catch { return null; } };
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
    if (!mirror.core || stableJson(stripArrays(mirror.core)) !== stableJson(want.core) || isLegacy(mirror.core)) ops.push(['state', want.core, 'core']);
    for (const kind of ['sessions', 'lives']) {
      for (const [id, v] of Object.entries(want[kind])) if (!mirror[kind][id] || stableJson(mirror[kind][id]) !== stableJson(v)) ops.push([id, v, kind]);
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
      try { await syncTo(state); api.lastError = null; status = 'sync'; return; } catch (e) { api.lastError = errText(e); status = 'error'; }
    }
    writeLocal(state);
  }
  let running = null, latest = null;
  async function flush() {
    try { while (latest) { const s = latest; latest = null; lastWritten = s; await write(s); } } finally { running = null; setTimeout(settle, 300); }
  }
  const view = () => sanitizeState(assemble(), defaults, knownIds).state;
  function emit() {
    if (!onRemote || !hasData()) return;
    known = idsOf(mirror);
    onRemote(view());
  }
  // A coda svuotata, se il server ha qualcosa che lo stato locale non ha, lo consegna (uno snapshot arrivato durante le scritture non si applica a metà).
  function settle() {
    if (running || latest || !onRemote || !hasData()) return;
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
          lastWritten = out.state;
          return out;
        } catch (e) { api.lastError = errText(e); mode = 'local'; status = 'local'; }
      }
      return sanitizeState(readLocal(), defaults, knownIds);
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
        col().onSnapshot((snap) => { mirror = fromDocs(snap.docs); if (running || latest) return; emit(); }, (e) => { api.lastError = errText(e); status = 'error'; });
      } catch (e) { api.lastError = errText(e); status = 'error'; }
    },
    exportJson(state) { return JSON.stringify({ exportedAt: new Date().toISOString(), ...clone(state) }, null, 2); },
  };
  return api;
}
