// Provenienza di ogni numero (spec §4.7): un tocco apre fonte, data, condizioni, tipo e margine.
import { $, BY_ID, esc, fmt, safeUrl, SPIN_KIND, stKind } from './format.js';

export const PROV_FIELD = {
  stiffness: 'Rigidità', spin: 'Spin (scala TWU)', tension_loss: 'Perdita di tensione TWU', energy_return: 'Restituzione di energia',
  cof_string_string: 'Attrito corda-corda', cof_string_ball: 'Attrito corda-palla', excel: 'Test Ektelon (tuo file)',
};

export const valButton = (r, field, html) => `<button type="button" class="val" data-prov="${esc(r.id)}|${esc(field)}">${html}</button>`;
export const infoButton = (cls, html, text) => `<button type="button" class="${cls}" data-info="${esc(text)}">${html}</button>`;

// senza il campo prov della pipeline si mostra almeno il tipo
function provOf(r, field) {
  if (r.prov?.[field]) return r.prov[field];
  if (field === 'spin' && r.spin) return { kind: SPIN_KIND[r.spin.kind] || r.spin.kind };
  if (field === 'stiffness' && r.stiffness) return { kind: stKind(r.stiffness) };
  return { kind: 'dato di laboratorio' };
}
const provDate = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : 'data non disponibile'; };

function provHtml(r, field) {
  const p = provOf(r, field);
  const rows = [['Fonte', p.source], ['Scaricato il', p.source ? provDate(p.fetched) : null], ['Condizioni', p.conditions], ['Tipo', p.kind],
    ['Margine', p.margin != null ? `± ${fmt(p.margin, field === 'spin' ? 1 : 0)}` : null]].filter(([, v]) => v);
  return `<h3>${esc(PROV_FIELD[field] || field)} · ${esc(r.brand)} ${esc(r.model)}</h3><dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${p.url ? `<p class="small"><a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">Apri la fonte</a></p>` : ''}`;
}

let provOpener = null;
function provClose() {
  const pop = $('#prov-pop');
  if (pop.hidden) return;
  pop.hidden = true;
  if (provOpener) provOpener.focus();
  provOpener = null;
}
function provOpen(btn, html) {
  const pop = $('#prov-pop');
  // dentro la scheda (dialog modale, top layer) il popover deve stare nel dialog per restare visibile
  const host = btn.closest('dialog') || document.body;
  if (pop.parentElement !== host) host.appendChild(pop);
  $('.pop-body', pop).innerHTML = html;
  pop.hidden = false;
  const b = btn.getBoundingClientRect(), w = Math.min(340, innerWidth - 16);
  pop.style.width = w + 'px';
  pop.style.left = Math.max(8, Math.min(b.left, innerWidth - w - 8)) + 'px';
  const below = b.bottom + 6, h = pop.offsetHeight;
  pop.style.top = (below + h > innerHeight - 8 ? Math.max(8, b.top - h - 6) : below) + 'px';
  provOpener = btn;
  $('.pop-close', pop).focus();
}

export function initProv() {
  document.addEventListener('click', (e) => {
    const pop = $('#prov-pop');
    if (e.target.closest('.pop-close')) { provClose(); return; }
    const v = e.target.closest('[data-prov]');
    if (v) {
      e.stopPropagation();
      const [id, field] = v.dataset.prov.split('|');
      if (BY_ID[id]) provOpen(v, provHtml(BY_ID[id], field));
      return;
    }
    const i = e.target.closest('[data-info]');
    if (i) { e.stopPropagation(); provOpen(i, `<p>${esc(i.dataset.info)}</p>`); return; }
    if (!pop.hidden && !e.target.closest('#prov-pop')) provClose();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') provClose(); });
  addEventListener('scroll', provClose, { passive: true });
}
