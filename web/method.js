// Pagina "Metodo": come si leggono i numeri, in poche righe. Ogni sezione ha un'ancora #m-<chiave> raggiunta dal "?" accanto ai valori.
import { $, esc, fmt } from './format.js';
import { labComparison, labComparisonHtml, LAB_MIN_STRINGS, LAB_TRUST_N } from './trials.js';
import { trialsOf } from './state.js';

// «Laboratorio contro sensazioni»: solo dopo 5 corde con voti di fine vita; mai usato per cambiare punteggi.
function sensazioniSec(ctx) {
  const c = labComparison(trialsOf(ctx.state()), (id) => ctx.BY_ID[id]);
  if (!c.show) return '';
  return `<section class="callout" id="m-sensazioni"><h3>I tuoi voti contro le misure</h3><p>Correlazione di rango tra il voto medio di fine vita che dai a ogni corda e la misura: 1 = stesso ordine, 0 = nessun legame, −1 = opposto. Sotto ${LAB_TRUST_N} corde è un'indicazione debole. Non cambia i punteggi.</p>${labComparisonHtml(c)}<p class="small muted">Servono almeno ${LAB_MIN_STRINGS} corde con voti di fine vita.</p></section>`;
}

export function renderMethod(ctx) {
  const D = ctx.DATA, m = D.estimates_meta || {}, rp = m.rp_to_twu || {}, sg = m.stiffness_gauge || {};
  const sec = (key, title, body) => `<section class="callout" id="m-${key}"><h3>${title}</h3>${body}</section>`;
  const removed = (D.removed_discontinued || []).map((x) => `${esc(x.name)} <span class="muted">(${esc(x.reason || '')}${x.successor ? `, ora ${esc(x.successor)}` : ''})</span>`).join(' · ');
  $('#metodo').innerHTML = `<div class="back-row"><button class="btn" type="button" data-back>‹ Indietro</button></div><h2>Come leggere i numeri</h2>
    <p class="muted">Per una Blade 100 v9 16×19, giocatore di club, sotto 50 lbs. <b>● misurato · ◐ stimato · ○ manca.</b> Valori, pairing e classifiche usano solo dati di laboratorio.</p>
    ${sec('pairing', 'Pairing', '<p>Da 0 a 100: quanto la corda somiglia, sulle misure di laboratorio, alla tua preferita più vicina (rigidità, tenuta, elasticità, spin; servono 3 misure su 4). <b>Non è un voto di qualità.</b> Da 80 Ottimo, 60 Buono, 40 Attenzione, sotto Poco adatta. Somigliare a una non gradita toglie 15 punti.</p>')}
    ${sec('rigidita', 'Rigidità', `<p>lb/in misurati da TWU. Se mancano sono stimati (≈) da un calibro gemello, da Racketpedia o dal solo calibro, con errore tipico di circa ${fmt(rp.mae ?? sg.mae ?? 11, 0)} lb/in. Le stime dal solo calibro non entrano nel pairing.</p>`)}
    ${sec('spin', 'Spin', '<p>Spin potential TWU, da 0 a 10. Da un calibro gemello vale ±0,5. Le stime da modello si vedono ma non entrano mai nel pairing.</p>')}
    ${sec('tenuta', 'Tenuta', '<p>Media di perdita di tensione TWU, TL6, TL12 e scorrimento in 24 ore, come posizione tra le corde.</p>')}
    ${sec('tester', 'Controllo e potenza', '<p>Nessun laboratorio li misura, quindi non sono numeri. Nella scheda trovi i pareri di giocatori e tester indipendenti (forum, recensioni), con il link: una persona, un parere; il marketing del produttore non conta. Sono <b>opinioni</b> e non entrano in nessun calcolo. «Alto» è la risposta più comune e distingue poco: contano di più i confronti diretti. Con meno di 3 pareri la scheda lo scrive.</p>')}
    ${sec('usura', 'Usura', '<p>Ore giocate diviso vita attesa. All\'inizio la vita attesa è un\'ipotesi (8 + 0,12 × tenuta ore); dopo la prima corda «consumata» usa le tue ore reali. Sotto 40% fresca, 40–70% in uso, 70–100% da controllare, oltre da cambiare. La tensione consigliata è una regola empirica, non validata.</p>')}
    ${sec('ai', 'Parere AI', '<p>Solo su richiesta, con il tuo account Claude. È un parere e lo dice: non entra mai in pairing, classifiche o mappa.</p>')}
    ${sensazioniSec(ctx)}
    ${sec('fonti', 'Fonti', `<p>Test Ektelon del tuo file, <a href="https://twu.tennis-warehouse.com/learning_center/reporter2.php" target="_blank" rel="noopener">TWU</a> (${esc(D.guide?.twu_ref || '51 lbs')}), <a href="https://www.racketpedia.com/" target="_blank" rel="noopener">Racketpedia</a> (rigidità statica gratuita); recensioni e forum solo come link. ${(ctx.ALL || []).length} corde poly, 1,18–1,30 mm, dati aggiornati al ${esc(D.generated)}.</p>`)}
    ${removed ? `<details class="small muted"><summary>Corde tolte perché vecchie o fuori produzione</summary><p>${removed}</p></details>` : ''}`;
}
