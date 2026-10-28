// Corda attuale (spec §4.2): scelta e tensione salvate nel browser, base di tutte le differenze.
import { resolveCurrent } from './recommend.js';
import { ALL, BY_ID, DATA, esc, fullName, NF, store } from './format.js';

let currentState = resolveCurrent(store.get('current', null), BY_ID);

export const getCurrent = () => ({ ...currentState, r: BY_ID[currentState.id] });

export function setCurrent(c) {
  currentState = resolveCurrent(c, BY_ID);
  store.set('current', { id: currentState.id, kg: currentState.kg });
  document.dispatchEvent(new CustomEvent('current-change'));
}

export function renderCurrentPicker(el) {
  const c = getCurrent();
  const opts = [...ALL].sort((a, b) => fullName(a).localeCompare(fullName(b)))
    .map((r) => `<option value="${esc(r.id)}"${r.id === c.id ? ' selected' : ''}>${esc(fullName(r))}${r.preference === 'liked' ? ' ★' : r.preference === 'disliked' ? ' ✕' : ''}</option>`).join('');
  const kgInput = (i, label) => `<label class="kg"><span>${label}</span><input type="number" inputmode="decimal" min="15" max="30" step="0.5" value="${c.kg[i]}" data-kg="${i}"> kg</label>`;
  el.innerHTML = `<p class="eyebrow">La corda che monti adesso</p>
    <div class="current-row">
      <label class="cur-pick"><span class="sr">Corda montata adesso</span><select id="cur-id">${opts}</select></label>
      ${kgInput(0, 'Verticali')}${kgInput(1, 'Orizzontali')}
    </div>
    <p class="muted small" id="cur-note">${esc(fullName(c.r))} a ${NF(1).format(c.kg[0])}/${NF(1).format(c.kg[1])} kg: tutte le differenze sono rispetto a questa.</p>`;
  // una tensione fuori scala non deve far perdere la corda scelta: si riporta tra 15 e 30 kg
  const kgOk = (v) => Math.min(30, Math.max(15, Number.isFinite(v) && v > 0 ? Math.round(v * 2) / 2 : 22));
  const read = () => ({ id: el.querySelector('#cur-id').value, kg: [0, 1].map((i) => kgOk(Number(el.querySelector(`[data-kg="${i}"]`).value))) });
  el.querySelector('#cur-id').addEventListener('change', () => {
    const next = read();
    if (DATA.anchors?.[next.id]) next.kg = [...DATA.anchors[next.id]]; // le preferite hanno la loro tensione abituale
    setCurrent(next); renderCurrentPicker(el);
  });
  el.querySelectorAll('[data-kg]').forEach((inp) => inp.addEventListener('change', () => { setCurrent(read()); renderCurrentPicker(el); }));
}
