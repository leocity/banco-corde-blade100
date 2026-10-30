// Salvataggio dello stato: documento `db` privato per utente (data/users/<id>/state) o, in mancanza, localStorage.
import { sanitizeState } from './state.js';

const KEY = 'banco-corde:state';
const clone = (o) => JSON.parse(JSON.stringify(o));

export async function createPersistence({ claude, storage, defaults, knownIds }) {
  let db = null, uid = null, mode = 'local';
  try {
    db = claude ? await claude.use('db') : null;
    const user = db ? await claude.use('user') : null;
    uid = user ? await user.id() : null;
    if (db && uid) mode = 'db';
  } catch { mode = 'local'; }
  const path = `data/users/${uid}/state`;
  const readLocal = () => { try { return storage ? storage.getItem(KEY) : null; } catch { return null; } };
  const writeLocal = (state) => { try { if (storage) storage.setItem(KEY, JSON.stringify(state)); } catch { /* archivio non disponibile */ } };
  const api = {
    get mode() { return mode; },
    lastError: null,
    async load() {
      let raw = null;
      if (mode === 'db') {
        try { const snap = await db.doc(path).get(); raw = snap.exists ? snap.data() : null; } catch { mode = 'local'; raw = readLocal(); }
      } else raw = readLocal();
      return sanitizeState(raw, defaults, knownIds);
    },
    async save(state) {
      const copy = clone(state);
      if (mode === 'db') {
        try { await db.doc(path).set(copy); api.lastError = null; return; } catch (e) { api.lastError = String((e && e.message) || (e && e.code) || e); }
      }
      writeLocal(copy);
    },
    exportJson(state) { return JSON.stringify({ exportedAt: new Date().toISOString(), ...clone(state) }, null, 2); },
  };
  return api;
}
