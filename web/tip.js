// Popover dei tooltip: si apre al tocco su .tip, si chiude toccando fuori, con Esc o con «Chiudi».
import { $ } from './format.js';
import { tipHtml } from './ui.js';

export function initTips() {
  const box = $('#tip');
  if (!box) return;
  let opener = null;
  const close = () => { if (!box.hidden) { box.hidden = true; if (opener && document.contains(opener)) opener.focus(); opener = null; } };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.tip');
    if (t) {
      e.preventDefault(); e.stopPropagation();
      let extra = null;
      try { extra = t.dataset.tipx ? JSON.parse(t.dataset.tipx) : null; } catch { extra = null; }
      $('#tip-body').innerHTML = tipHtml(t.dataset.tip, extra);
      // dentro un dialogo modale il riquadro deve stare nello stesso strato, altrimenti resta sotto
      const host = t.closest('dialog[open]') || document.body;
      if (box.parentElement !== host) host.appendChild(box);
      box.hidden = false; opener = t;
      $('#tip-close').focus();
      return;
    }
    if (!box.hidden && !e.target.closest('#tip')) close();
  }, true);
  $('#tip-close').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) { e.preventDefault(); e.stopPropagation(); close(); } }, true);
}
