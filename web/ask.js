// «Chiedi all'AI» con accesso ai dati dell'app: un riassunto nel testo (sempre) e degli strumenti che l'AI chiama
// (cercare una corda, leggerne i valori misurati o ricavati, confrontarne fino a 4 con il modello fisico, i consigli
// per una domanda). Il parere è marcato «non misurato» e non entra mai nei calcoli.
import { $, esc, fullName } from './format.js';
import { CMP_KEYS, valueOf } from './cmp.js';
import { bedOf, compareBeds, physSummary } from './phys.js';
import { GOALS, candidates, suggestHybrids } from './next.js';
import { SIZE_LABEL } from './state.js';

export const AI_MARK = 'Parere AI — non misurato';
let askSample = null, askTools = false;

const KIND = { null: 'misurata', ricavata: 'ricavata dai dati', modello: 'ricavata dalla fisica' };
const r1 = (x) => Math.round(x * 10) / 10;
export function stringData(r) {
  const vals = {};
  for (const k of Object.keys(CMP_KEYS)) {
    const v = valueOf(r, k);
    if (v) vals[CMP_KEYS[k].label] = { valore: r1(v.v), unita: CMP_KEYS[k].unit, tipo: KIND[v.est], ...(v.how ? { come: v.how } : {}) };
  }
  return { id: r.id, nome: fullName(r), calibro_mm: r.gauge_mm, forma: r.shape, materiale: r.material || null, anno: (r.production || {}).year || null, valori: vals };
}
const stockTxt = (st, BY_ID) => (st.stock || []).map((x) => `${BY_ID[x.id] ? fullName(BY_ID[x.id]) : x.id}: ${x.n} ${SIZE_LABEL[x.size] || x.size}`);

export function compareData(ids, st, BY_ID) {
  const ref = BY_ID[st.equipped.id], kg = st.equipped.kg, refBed = bedOf(ref, ref, kg);
  return ids.filter((id) => BY_ID[id] && id !== ref.id).slice(0, 4).map((id) => {
    const rows = compareBeds(bedOf(BY_ID[id], BY_ID[id], kg), refBed);
    return { corda: fullName(BY_ID[id]), frase: physSummary(rows, ref.model),
      righe: rows.map((x) => ({ grandezza: x.label, verdetto: x.dir ? x.word : 'simile', livello: x.level, differenza: r1(x.diff), relativa_percento: x.rel, tipo_valore: KIND[x.estA ?? null] })) };
  });
}

export function adviceData(goal, st, ALL, meta) {
  const res = candidates(st, ALL, goal, meta), hy = suggestHybrids(st, ALL, goal, meta);
  const line = (c) => `${fullName(c.rec)}: ${c.summary.text}`;
  return { domanda: (GOALS.find((g) => g.key === goal) || {}).label,
    in_casa_adatte: res.inStock.filter((c) => c.compatible).slice(0, 4).map((c) => `${line(c)}${c.full ? '' : ' (solo una mezza: va in un ibrido)'}`),
    da_comprare: res.toBuy.map(line),
    ibridi: [...hy.fromStock, ...hy.buyOne, ...hy.buyBoth].slice(0, 4).map((p) => `verticali ${fullName(p.V)} + orizzontali ${fullName(p.O)}: ${p.summary.text}`) };
}

// Riassunto sempre presente nel testo: basta da solo se la pagina non può usare gli strumenti.
export function askDigest(st, ALL, meta) {
  const BY_ID = Object.fromEntries(ALL.map((r) => [r.id, r]));
  const ref = BY_ID[st.equipped.id];
  const sess = st.sessions.filter((s) => s.life === st.equipped.since).slice(-6).map((s) => ({ data: s.date, ore: s.hours, voto: s.feel ?? null, parola: s.tag ?? null, nota: s.note || null }));
  return {
    racchetta: 'Wilson Blade 100 v9, piatto 16×19', giocatore: 'di club, tutto campo con rotazioni, 4–5 ore a settimana',
    montata: { ...stringData(ref), tensione_kg: st.equipped.kg, dal: st.equipped.since.slice(0, 10), diario: st.equipped.diary ? { note: st.equipped.diary.notes, parole: st.equipped.diary.tags, verdetto: st.equipped.diary.verdict } : null },
    uscite_recenti: sess,
    in_casa: stockTxt(st, BY_ID), regola_scorta: 'una matassina (12 m) basta per una racchetta intera; una mezza (6 m) solo per metà ibrido; due mezze della stessa corda fanno una racchetta',
    preferite: (st.liked || []).map((id) => (BY_ID[id] ? fullName(BY_ID[id]) : id)), non_gradite: (st.disliked || []).map((id) => (BY_ID[id] ? fullName(BY_ID[id]) : id)),
    corde_finite: st.lives.slice(-5).map((l) => ({ corda: BY_ID[l.id] ? fullName(BY_ID[l.id]) : l.id, ore: l.hours, motivo: l.reason, ricomprerebbe: l.diary ? l.diary.verdict : null, note: l.diary ? l.diary.notes : null })),
    corde_in_casa_contro_la_montata: compareData((st.stock || []).map((x) => x.id), st, BY_ID),
    consigli_dell_app: GOALS.map((g) => adviceData(g.key, st, ALL, meta)),
  };
}

const RULES = `Sei un esperto di corde da tennis e di fisica del tennis. Rispondi in italiano, in modo diretto e concreto (al massimo 200 parole), a un giocatore di club.
Hai i dati dell'app: valori misurati (TWU in campo, Racketpedia da ferma, Excel dell'utente) e ricavati (dai dati o dalla fisica), e un modello fisico che alla tensione dell'utente confronta rigidità appena montata, rigidità dopo il calo di tensione, lancio della palla, spin e tenuta.
Regole: usa i numeri dei dati, citali, e di' se un valore è ricavato; non inventare numeri; dai sempre una risposta netta con il perché fisico; rispetta la regola della scorta (una mezza non basta per una racchetta intera); controllo e potenza non sono misure: parlane solo come conseguenza della fisica; niente prezzi.`;

export function buildAskPrompt({ question, state, ALL, meta, focus, tools }) {
  const BY_ID = Object.fromEntries(ALL.map((r) => [r.id, r]));
  const digest = askDigest(state, ALL, meta);
  if (focus && BY_ID[focus]) digest.corda_in_esame = { ...stringData(BY_ID[focus]), contro_la_montata: compareData([focus], state, BY_ID)[0] || null };
  return `${RULES}
${tools ? 'Puoi usare gli strumenti per cercare qualsiasi corda del banco, leggerne i valori e confrontarne fino a 4 con la montata. Usali quando la domanda nomina corde che non sono nel riassunto.' : ''}
Dati (JSON):
${JSON.stringify(digest)}

Domanda: ${question}`;
}

export function makeTools(getState, ALL, meta) {
  const BY_ID = Object.fromEntries(ALL.map((r) => [r.id, r]));
  const find = (q) => { const w = String(q || '').toLowerCase().split(/\s+/).filter(Boolean); return ALL.filter((r) => w.every((x) => fullName(r).toLowerCase().includes(x))).slice(0, 10); };
  return [
    { name: 'cerca_corde', description: 'Cerca corde nel banco per nome (marca, modello, calibro). Ritorna fino a 10 corde con id e nome.',
      inputSchema: { type: 'object', properties: { testo: { type: 'string', description: 'es. "o-toro tour 1,20"' } }, required: ['testo'] },
      execute: (i) => find(i.testo).map((r) => ({ id: r.id, nome: fullName(r) })) },
    { name: 'dati_corda', description: 'Valori di una corda (per id): rigidità in campo e da ferma, perdita di tensione, spin, allungamento Excel, ognuno con il tipo (misurata o ricavata) e come è stato ricavato.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      execute: (i) => { const r = BY_ID[String(i.id)]; if (!r) throw new Error('id sconosciuto: usa cerca_corde'); return stringData(r); } },
    { name: 'confronta_con_la_montata', description: 'Confronta fino a 4 corde (per id) con la corda montata, alla tensione dell\'utente: rigidità appena montata e dopo il calo, lancio, spin, tenuta, con verdetto e differenza.',
      inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } }, required: ['ids'] },
      execute: (i) => compareData((Array.isArray(i.ids) ? i.ids : []).map(String), getState(), BY_ID) },
    { name: 'consigli', description: 'I consigli dell\'app per una domanda: same (simile), softer, stiffer, lower (palla più bassa), holds (tiene di più), spin. Corde in casa adatte, da comprare e ibridi.',
      inputSchema: { type: 'object', properties: { domanda: { type: 'string', enum: GOALS.map((g) => g.key) } }, required: ['domanda'] },
      execute: (i) => adviceData(String(i.domanda), getState(), ALL, meta) },
  ];
}

export const askBoxHtml = (focus = '') => (askSample ? `<section class="block ask" data-ask="${esc(focus)}">
  <h3>Chiedi all'AI${focus ? ' su questa corda' : ''}</h3>
  <p class="small muted">Conosce la tua corda, le corde in casa, i valori di tutto il banco e il modello fisico dell'app.</p>
  <label class="sr" for="ask-q-${esc(focus || 'main')}">La tua domanda</label>
  <textarea id="ask-q-${esc(focus || 'main')}" rows="2" maxlength="600" placeholder="${focus ? 'Es. come la sentirei rispetto alla mia? E in ibrido con la O-Toro?' : 'Es. con le mezze che ho, che ibrido monto per avere palle meno lunghe?'}"></textarea>
  <div class="actions"><button type="button" class="btn primary" data-ask-go>Chiedi</button></div>
  <div class="ai-out" aria-live="polite"></div></section>` : '');

export function initAsk(ctx) {
  if (window.claude && window.claude.use) {
    Promise.resolve(window.claude.use('sample')).then(async (s) => {
      if (!s) return;
      askSample = s;
      try { const lim = s.limits ? await s.limits() : null; askTools = !!(lim && lim.tools); } catch { askTools = false; }
      ctx.refresh();
    }).catch(() => {});
  }
  document.addEventListener('click', async (e) => {
    const go = e.target.closest('[data-ask-go]');
    if (!go || !askSample) return;
    const box = go.closest('[data-ask]'), out = box.querySelector('.ai-out'), q = box.querySelector('textarea').value.trim();
    if (!q) { out.textContent = 'Scrivi una domanda.'; return; }
    go.disabled = true; out.innerHTML = '<p class="muted">Sto leggendo i dati e pensando…</p>';
    const show = (text) => { out.innerHTML = `<p class="tag est">${AI_MARK}</p><div class="ai-text"></div>`; out.querySelector('.ai-text').textContent = text; };
    try {
      const prompt = buildAskPrompt({ question: q, state: ctx.state(), ALL: ctx.ALL, meta: ctx.META, focus: box.dataset.ask || null, tools: askTools });
      const opts = { onText: ({ text }) => show(text) };
      if (askTools) opts.tools = makeTools(ctx.state, ctx.ALL, ctx.META).map((t) => ({ ...t, execute: (i) => { out.querySelector('.muted') && (out.querySelector('.muted').textContent = 'Sto consultando i dati delle corde…'); return t.execute(i); } }));
      else opts.cache = false;
      const res = await askSample(prompt, opts);
      show(res.text || '');
    } catch (err) {
      const code = err && err.code;
      if (err && err.text) show(err.text);
      else out.textContent = code === 'rate_limited' ? 'Troppe domande di fila: riprova tra un minuto.' : code === 'not_granted' ? 'Il parere AI non è autorizzato su questa pagina.' : 'Il parere AI non ha risposto. Riprova più tardi.';
    } finally { go.disabled = false; }
  });
}
