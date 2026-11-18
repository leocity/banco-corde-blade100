# Audit UX e accessibilità — Banco Corde Blade 100

Pagine: rubin = `/home/user/wt-rubin/dist/preview.html` (3 schede: Scegli, Mappa, Montata + pulsante Metodo); live = `archive/artifact-live-2026-11-18.html` (aggiunge Ibridi). Entrambe girano senza `window.claude` (ripiego su localStorage, nessuno stub necessario; font Google bloccati, quindi i caratteri sono quelli di ripiego). Misure con Chromium, 390×844 e 1280×800, stato iniziale vuoto, Re-String Slap 1,23 montata. Script e screenshot: `/tmp/claude-0/-home-user-banco-corde-blade100/d0b29ddd-8b20-5f53-b818-cde9347c7c79/scratchpad/audit/ux/` (`flows.js`, `a11y.js`, `kb.js`, `flows.json`, `s-<larghezza>-*.png`).

## Misure per flusso (390 / 1280)

| Flusso | Tocchi | Altezza fino alla risposta | Parole visibili | Note |
|---|---|---|---|---|
| Segna uscita (+2 h) | 2 (Montata, +2 h) | bottone a y=389 / 452 | 109 / 97 | nessuna conferma (toast assente): cambia solo il contatore in alto |
| Segna sensazioni | +4 (Spin, Controllo, tag, «Ricomprerei») = 6 totali | «Ricomprerei» a y=1282 / 1195 su pagina alta 1731 / 1567 | diario: 78 / 79 | 8 righe di voti × 5 bottoni, 10 tag, 3 «momenti», 3 sezioni chiuse |
| Cambia corda | 5 (Montata, Cambia corda, cerca, scegli, Monta) | dialogo alto 674 px su 844 (80%) | 41 | lista a 102 voci in una `select` alta 134 px; tensione precompilata 23,5/22,5 |
| Scegli e confronta con la montata | 2 per il solo delta («rispetto alla tua: +26 tenuta» nella scheda); 7 per il confronto affiancato | scheda alta 1032 px (viewport 776); vassoio confronto alto 424 px (50%) a 390 | scheda 163 visibili / 182 totali, 12 sezioni | vedi problemi 2 e 3 |
| Mappa, tocca un punto | 2 (Mappa, punto) | a 390 risultato a y=587 (visibile); a 1280 a y=1028 su viewport 800 (fuori schermo) | 60 / 52 | 55 punti |
| Ibridi (live) | 2 (Ibridi, sintomo) | risposta in prima schermata, ma pagina alta 8562 px (390) / 5921 px (1280) | 1165 totali | 17 `details`, 37 bottoni, 4 `select` da 107 voci |
| Metodo | 1 (header) o 1 «?» | pagina 2025 px a 390 | 345 | 13 voci di gergo |

## CRITICO

**1. La mappa non si legge e non si può toccare con precisione (390×844).**
- Evidenza (`#scatter`, 55 punti, `flows.json` → map.geom): scala 0,708, quindi punti da 10 e 13 px di diametro; 54 punti su 55 hanno un vicino a meno di 44 px; 249 coppie sotto 44 px, 116 sotto 24 px, 23 coppie sovrapposte; due punti con coordinate identiche (`re-string-sync-17` e `toroline-wasabi-green-17`, distanza 0): uno dei due non si può colpire col dito. Il tocco prende il punto più vicino entro 26 px, quindi con 5–6 punti nel raggio il risultato è casuale. Testo dell'asse a 7,8 px, titoli assi a 8,5 px, etichette a 7,8 px (limite 12). Solo 3 etichette su 55, e «★ Confidential 1,25» copre due punti grigi. Su 1280 l'etichetta «montata · Slap 1,23» tocca l'anello della montata.
- In 5 secondi un utente vede una nuvola grigia con tre nomi. Non capisce: cosa è «meglio» (nessuna zona o freccia, solo «Rigidità → più rigida»), perché la rigidità senza unità (160–220, niente «lb/in» nei tick), perché 55 corde sono diventate 42 passando a «Tenuta» (13 sparite senza dire quali), né a cosa serve il grafico rispetto alla lista.
- Colore come unico segnale: legenda a pallini; contrasto dei pallini su fondo bianco (calcolato): altre 2,30:1, montata 2,82:1, non gradite 3,20:1, preferite 4,42:1 (soglia 3:1). Tra categorie: altre/montata 1,22:1, preferite/non gradite 1,38:1; verde/arancio vicini per un daltonico.
- Screenshot: `ux/s-390-mappa.png`, `ux/s-390-mappa-tap.png`, `ux/s-1280-mappa-tap.png`.
- Effetto: coincide con «la mappa è illeggibile». Correzione: su telefono sostituire la dispersione con una lista ordinabile per rigidità/spin con minibarre, oppure mostrare 10–12 punti (montata, preferite, 3 da provare, vicini della montata) e il resto sfumato; dare ai punti raggio visivo ≥ 8 e area di tocco ≥ 44 con spostamento dei punti sovrapposti (jitter o lista «N corde qui»); forme diverse per categoria (anello, rombo, croce); scrivere l'unità negli assi e un quadrante guida («più spin, più morbida = ...»).

**2. Su telefono il confronto con la montata, il gesto principale, è nascosto.**
- Evidenza: `style.css:412` `@media (max-width:430px){ .crow2 .d {display:none} }`. A 390 le righe di «Le 3 da provare» mostrano solo «8,2 spin · 210 lb/in · alta tenuta» (screenshot `ux/s-390-home.png`); su 1280 compare «+8 tenuta», «−40 lb/in» (`ux/s-1280-home.png`). Il valore «rispetto alla tua» sta solo nella scheda (2 tocchi, y≈180 nella scheda alta 1032 px).
- Effetto: per decidere cosa montare dopo, sul telefono si devono aprire le schede una a una. Correzione: mostrare il delta sulla riga in una terza riga breve («più tenuta, −40 lb/in»), in parole, non in numeri.

**3. Il confronto affiancato è lento e dice una cosa al contrario.**
- Evidenza: 7 tocchi (Scegli, riga, Confronta, cerca «Slap», riga Slap, Confronta, apri vassoio); il vassoio aperto occupa 424 px su 844 (50%), le colonne sporgono (`.tcol` a r=613 su 390: scorrimento orizzontale interno, la seconda corda è tagliata, `ux/s-390-compare-open.png`). Il testo dice «Passando da Solinco Confidential Soft 1,25 a Re-String Slap 1,23 perdi tenuta»: confronta la prima scelta con la seconda, non «dalla montata alla candidata». Se la candidata è stata scelta per prima, la frase è invertita.
- Correzione: il confronto parte già con la montata come colonna fissa a sinistra; il pulsante nella scheda diventa «Confronta con la mia» (0 ricerche); riga unica di risposta: «Rispetto a Slap: +26 tenuta, −X spin».

**4. «Sì» a «Ricomprerei?» cambia in silenzio le preferite (e quindi le raccomandazioni).**
- Evidenza: `diaryui.js:100` chiama `mineToast('Segnata come preferita: …')`. Nel flusso di test ha segnato Slap come preferita e cambiato «Le 3 da provare» (la prima è passata a Solinco Confidential Soft 1,25 con pairing 100). Il toast dura 6 s, copre il contenuto (`ux/s-390-mappa-tap.png`, `ux/s-390-compare-open.png`) e a 390 il tasto «Annulla» va a capo in «An/nu/la».
- Effetto: l'utente che annota una sensazione cambia senza saperlo la logica dei consigli. Correzione: separare «Ricomprerei» dalle preferite, oppure chiedere esplicitamente («Segnala come preferita?»), e dare al toast `white-space:nowrap` e larghezza adeguata.

## IMPORTANTE

**5. Gergo non comprensibile da un giocatore di club** (testo visibile, misurato): righe e schede: «lb/in», «≈», «◐ ● ○», «⚑», voto «98» senza etichetta, «max/alta/media tenuta». Scheda: «pairing», «Cedimento (ex Stiff Index)», «Elasticità», «Controllo incrociato», «Dettagli e stime», «stima dalla rigidità». Metodo: «gemello», «parente», «TL6», «TL12», «TWU», «Racketpedia», «poly», «scorrimento», «Ektelon», «kg/mm». Ibridi: «snapback», «mains», «cross», «full bed», «kg/mm». Diario: «Mantenimento», «Tensiometro», «Setup», «Pre-stretch». Il gergo qui viene prima del significato; ad esempio «Cambia corda» mostra «Fresca» (usura) senza spiegare cosa significa. Correzione: sostituire con parole del campo («più spin», «più morbida», «dura di più»); i simboli ◐/●/○ diventano una sola etichetta («stimato») solo quando serve, non su ogni valore.

**6. Troppi elementi per schermata e troppo testo.** Scegli a 390: 162 parole nel viewport (248 totali), 24 nodi di testo sotto i 12 px (10,6 px: «spin», «lb/in», «tenuta»; a 1280 11,2 px). Scheda: 12 sezioni (Controllo e potenza, Dettagli e stime, Recensioni, Note dell'incordatore, Dati di laboratorio, Controllo incrociato, Tennis Warehouse University, Racketpedia, ecc.), 182 parole. Montata: sotto il riquadro usura ci sono «Segna le ore», 8 righe di voti, tag, note, «Setup e tensione», «Tensiometro», «Sessioni», «Corde finite», «Altro» (con AI, esporta). Correzione: la scheda mostra 3 numeri in parole + delta + un bottone; il resto in «Altri dettagli».

**7. Ibridi (solo live) è un libro, non una scheda.** 1165 parole, 8562 px a 390 (5921 a 1280), 17 sezioni a comparsa, 4 `select` da 107 voci con ● ○ dentro i nomi. Il punto di ingresso «Cosa senti in campo?» (6 sintomi, 2 tocchi, risposta in prima schermata) funziona bene. Ma: (a) contraddice la scheda Montata: dice «oggi sei a 22/21», «tuo O-Toro 22/21» mentre Montata mostra Re-String Zero 1,23 22,5/21,5 nello stato iniziale; (b) il grafico rigidità–tenuta (`svg` 340×197, 55 punti, testo a 5,8 px, stesso problema della mappa); (c) tabella `.hy-tab` larga 520 px in contenitore da 312 px, con scorrimento orizzontale interno; (d) pulsanti `.hy-dot` 28×44. Correzione: tenere solo sintomo, «cosa fare» e «setup A/B»; il resto in una pagina Aiuto; leggere la montata dallo stato.

**8. Il carico iniziale scorre la pagina da solo.** In Chromium, a fine caricamento `scrollY` passa a 60 px (390) e 151 px (1280) senza codice che lo richieda: l'URL ha `#scegli` (`history.replaceState`, `app.js`) e il browser salta al frammento. Risultato: titolo nascosto e, su desktop, la striscia «Montata» appare tagliata sotto la barra schede sticky (`ux/rubin-1280-home.png`); inoltre il primo Tab parte da `#strip`, saltando Metodo e schede. Correzione: non scrivere `#id` nell'URL all'avvio (o usare `scrollTo(0,0)` dopo il load).

**9. Bersagli di tocco sotto i 44 px (selettore, misura).**
- `button.rb` (voti 1–5): 42×42, 70 occorrenze nel diario a 390.
- `button.q` («?»): 22×22, 7 per pagina, ripetuti tra scheda e riga; `aria-label` generici («Come si legge» ×4).
- `button.guide-btn` (Metodo): 82×40 a 390.
- `button.chipbtn.tg` (tag): 54–127 × 36.
- `summary` (sezioni): 354×20 / 312×24 / 1058×24.
- `input`: 21 px di altezza (ore, data, nota).
- Barra schede a 1280: 43 px di altezza.
- `a` nelle schede: 17 px di altezza.
- Cerchi della mappa (`circle.dot`): 10×10 e 13×13 px.
- `button.hy-dot` (Ibridi): 28×44.
- Correzione: min-height/min-width 44 (con `::before` per i «?»), righe `summary` con padding verticale 12.

**10. ARIA e tastiera.**
- La mappa ha `role="img"` con 55 `circle.dot[role=button][tabindex=0]` dentro: i figli di `role=img` sono presentazionali, quindi i punti non sono raggiungibili da screen reader; da tastiera servono 56 Tab per attraversare la mappa (frecce implementate: bene). Correzione: `role="group"` con titolo, oppure sostituire con lista.
- Le schede hanno `role=tab` ma nessun `tabindex` rotante, nessun `aria-controls`, nessuna navigazione con frecce (misurato: ArrowRight non sposta il focus).
- I simboli di stato (`.mark`, `.m`) hanno solo `title`; `aria-label` su `span` senza ruolo non viene letto: ◐/●/○ sono muti o letti come figure geometriche, quindi «misurato/stimato» non arriva a chi usa screen reader.
- Alla chiusura di una scheda con Esc il focus va su `BODY` invece che sulla riga aperta; negli altri dialoghi (Cambia corda, Filtra) il ritorno è corretto e Esc chiude.
- I `dialog` non hanno `aria-modal` (il modale nativo basta, ma testare in VoiceOver). `role=status` su `#sync-badge` e `#toast`: il badge legge «○ Solo su questo browser».
- Bene: `lang="it"`, 1 `h1`, `main/nav/header`, tutti gli input hanno etichetta, i voti hanno `aria-label` «Spin: 3 su 5», `aria-pressed` sui chip, focus visibile (outline 2 px arancio `#b8501c`, anche sui punti con tratto 4 px).

## MINORE

- **Contrasto del testo: nessun errore.** Misurato su tutte le schede in chiaro e scuro: minimo 5,0:1 (bianco su `#b8501c`), testo secondario 5,46:1 (chiaro) / 4,99:1 (scuro). Superato AA. I soli problemi di contrasto sono i pallini della mappa (problema 1).
- «Corde finite (0)», «Sessioni (0)» mostrano sezioni vuote; vanno nascoste finché non c'è nulla.
- La striscia «Montata» e la scheda «Montata» ripetono lo stesso dato; «Fresca» come stato di usura non è un'azione.
- Nel dialogo «Cambia corda» la `select` con `size=6` e 102 voci è scomoda su touch; meglio l'elenco filtrato dalla ricerca (lo è già: «Slap» dà 2 voci). Tensione precompilata 23,5/22,5 da «regola empirica»: spiegare in una riga perché cambia.
- Etichetta della barra dei tag: «Com'è andata», ma i tag («pastosa», «scivola», «imprecisa lunga») non sono ordinati per tema (suono/controllo/durata).
- Nessuno scroll orizzontale di pagina a 390 né a 1280 (`scrollWidth` = `clientWidth`) in nessuna scheda; gli scorrimenti orizzontali sono interni (vassoio confronto, tabella Ibridi).

## Le 10 cose da togliere o spostare (ordine di impatto)

1. Mappa su telefono: sostituire con lista ordinabile o ridurre a 10–12 punti; spostare il grafico completo su desktop come vista facoltativa.
2. Scheda Ibridi: ridurre da 1165 parole a sintomo → «cosa fare» → setup A/B; le «9 regole», «Come scegliere una corda» e «Consigli generali» in una pagina Aiuto.
3. Confronto: togliere il vassoio da 424 px; confronto in riga unica con la montata fissa come prima colonna.
4. Delta «rispetto alla tua» sempre visibile sulle righe (togliere `display:none` a 430 px) e in parole.
5. Toast «Segnata come preferita»: togliere l'effetto silenzioso di «Ricomprerei»; separare le preferite dalle sensazioni.
6. Scheda corda: 12 sezioni → 1 blocco «in breve» + «Altri dettagli». Spostare Dati di laboratorio, Controllo incrociato, Recensioni nella pagina Metodo/Fonti.
7. Diario: tenere Spin, Controllo, Comfort + 1 frase + Ricomprerei; spostare Potenza, Mantenimento, Tocco, Stabilità, Durata, Setup, Tensiometro in «Altro».
8. Simboli ◐ ● ○ ≈ ⚑ e «pairing»: un'unica etichetta in parole («stimato», «buon abbinamento») e legenda una volta sola in Metodo.
9. Montata: nascondere «Sessioni (0)», «Corde finite (0)», «Altro» (AI/esporta) finché vuoti; unire la striscia e la scheda.
10. Pulsante «Metodo» e i 7 «?»: sostituire con un solo «Aiuto» fisso nella barra, e correggere i bersagli a 44 px.
