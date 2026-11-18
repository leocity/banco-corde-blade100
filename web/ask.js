// «Chiedi all'AI»: una casella di testo libera. Il parere è testo, marcato «non misurato», mai usato nei calcoli.
import { $, esc, fullName } from './format.js';
import { CMP_KEYS } from './cmp.js';

export const AI_MARK = 'Parere AI — non misurato';
let askSample = null;

const labOf = (r) => Object.fromEntries(Object.keys(CMP_KEYS).map((k) => [k, r.lab ? CMP_KEYS[k].get(r.lab) ?? null : null]));
const brief = (r) => (r ? { nome: fullName(r), calibro_mm: r.gauge_mm, forma: r.shape, materiale: r.material || null, misure: labOf(r) } : null);

export function buildAskPrompt({ question, state, BY_ID, focus }) {
  const name = (id) => (BY_ID[id] ? fullName(BY_ID[id]) : id);
  const cur = state.sessions.filter((s) => s.life === state.equipped.since).slice(-6).map((s) => ({ data: s.date, ore: s.hours, voto: s.feel ?? null, parola: s.tag ?? null, nota: s.note || null }));
  const ctx = {
    racchetta: 'Wilson Blade 100 v9, piatto 16×19',
    giocatore: 'di club, tutto campo con rotazioni, swing sotto le 50 lbs, 4–5 ore a settimana',
    montata: { ...brief(BY_ID[state.equipped.id]), tensione_kg: state.equipped.kg, da: state.equipped.since.slice(0, 10) },
    uscite_recenti_sulla_montata: cur,
    preferite: state.liked.map(name), non_gradite: state.disliked.map(name),
    in_casa: (state.stock || []).map((x) => `${name(x.id)} (${x.size}, ${x.n})`),
    corde_finite: state.lives.slice(-5).map((l) => ({ corda: name(l.id), ore: l.hours, motivo: l.reason, ricomprerebbe: l.diary ? l.diary.verdict : null })),
    corda_in_esame: focus ? brief(BY_ID[focus]) : null,
    legenda_misure: 'twu.stiffness = rigidità dinamica TWU in lb/in (51 lb, swing veloce); twu.loss = perdita di tensione TWU in %; twu.spin = spin potenziale TWU; rp.kgmm = rigidità statica Racketpedia in kg/mm; excel.stretch50 = allungamento a 50 lb nel test Ektelon dell\'utente in %. null = non misurato.',
  };
  return `Sei un esperto di corde da tennis e di fisica del tennis. Rispondi in italiano, in modo semplice e breve (massimo 180 parole), a un giocatore di club.
Regole: usa solo le misure che ti do e dillo quando una cosa non è misurata; non inventare numeri; controllo e potenza non sono misure (puoi parlarne solo come esperienza comune, dicendolo); distingui sempre ciò che è misurato da ciò che è un'opinione; niente prezzi; se la domanda non riguarda corde o tennis, dillo.
Dati (JSON):
${JSON.stringify(ctx)}

Domanda: ${question}`;
}

export const askBoxHtml = (focus = '') => (askSample ? `<section class="block ask" data-ask="${esc(focus)}">
  <h3>Chiedi all'AI${focus ? ' su questa corda' : ''}</h3>
  <label class="sr" for="ask-q-${esc(focus || 'main')}">La tua domanda</label>
  <textarea id="ask-q-${esc(focus || 'main')}" rows="2" maxlength="600" placeholder="${focus ? 'Es. come la sentirei rispetto alla mia?' : 'Es. la Slap si è spenta dopo 10 ore: cosa provo dopo?'}"></textarea>
  <div class="actions"><button type="button" class="btn primary" data-ask-go>Chiedi</button></div>
  <div class="ai-out" aria-live="polite"></div></section>` : '');

export function initAsk(ctx) {
  if (window.claude && window.claude.use) {
    Promise.resolve(window.claude.use('sample')).then((s) => { if (s) { askSample = s; ctx.refresh(); } }).catch(() => {});
  }
  document.addEventListener('click', async (e) => {
    const go = e.target.closest('[data-ask-go]');
    if (!go || !askSample) return;
    const box = go.closest('[data-ask]'), out = box.querySelector('.ai-out'), q = box.querySelector('textarea').value.trim();
    if (!q) { out.textContent = 'Scrivi una domanda.'; return; }
    go.disabled = true; out.innerHTML = '<p class="muted">Sto pensando…</p>';
    try {
      const res = await askSample(buildAskPrompt({ question: q, state: ctx.state(), BY_ID: ctx.BY_ID, focus: box.dataset.ask || null }), {
        cache: false, onText: ({ text }) => { out.innerHTML = `<p class="tag est">${AI_MARK}</p><div class="ai-text"></div>`; out.querySelector('.ai-text').textContent = text; } });
      out.innerHTML = `<p class="tag est">${AI_MARK}</p><div class="ai-text"></div>`;
      out.querySelector('.ai-text').textContent = res.text || '';
    } catch (err) {
      const code = err && err.code;
      out.textContent = code === 'rate_limited' ? 'Troppe domande di fila: riprova tra un minuto.' : code === 'not_granted' ? 'Il parere AI non è autorizzato su questa pagina.' : 'Il parere AI non ha risposto. Riprova più tardi.';
    } finally { go.disabled = false; }
  });
}
