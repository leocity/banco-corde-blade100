# Banco Corde v6: semplice, onesto, dal telefono — design

Data: 2026-11-18. Ramo: `claude/great-hypatia-edrzae` (riconciliato: base adoring-rubin + dati v3 + Ibridi recuperata, commit `dfa0a60`).
Audit di partenza: `docs/audit/2026-11-18/` (A dati, B UX e accessibilità, D fonti, E fisica).

## 1. Perché

L'utente (giocatore di club, Wilson Blade 100 v9 16×19, < 50 lbs) dice: «è tutto molto complicato, anche capire cosa sto vedendo». La mappa è «illeggibile». Vuole:

1. **Al circolo**, in pochi tocchi: segnare l'uscita e come gli è sembrata la corda. Il diario attuale (4–8 voti × 3 momenti) è troppo.
2. **Montata contro un'altra**: aprire l'app e capire subito come cambia, rispetto alla corda montata (oggi Re-String Slap 1,23 a 22/21 kg), la corda che monterà dopo — con il perché fisico (materiale, forma, calibro, consigli da incordatore), senza pensarci troppo.
3. **Cosa comprare / cosa montare**: un consiglio basato su quello che ha e su cosa gli piace. **Le corde che ha in casa vengono prima** (matasse intere e mezze matasse).
4. **Ibridi**: restano, semplificati.
5. **Parere AI con una casella di testo** per chiedere quello che vuole.
6. **Scienza**: una sezione che spiega cosa conta in una corda, con fonti, e confronti tra corde basati sulla scienza.
7. **Rigore**: «i punteggi devono essere influenzati dal rigore scientifico e non da stime vecchie se i dati non ci sono, e anche se ci sono messi a confronto con la realtà scientifica».
8. **Dati freschi**: TWU aggiornato, recensioni verificate e non sponsorizzate, anche da YouTube.
9. **Tooltip informativi** su numeri e parole tecniche.

Successo: aprendo l'app al circolo, in **≤ 2 tocchi** segna l'uscita; in **≤ 10 secondi** legge «cosa monto dopo e perché» rispetto alla Slap.

## 2. Obiettivi, non obiettivi, anti-obiettivi

**Obiettivi** (misurabili, verificati con Playwright a 390×844):
- O1. Schermata iniziale «Oggi»: corda montata + pulsante uscita visibili senza scroll; segnare un'uscita con voto = 2 tocchi.
- O2. Tre schede in basso: **Oggi**, **Prossima**, **Scienza**. Nessun'altra scheda.
- O3. «Prossima»: la prima risposta (una corda, la frase «rispetto alla Slap…» e il perché) visibile senza scroll a 390 px.
- O4. Zero parole di gergo non spiegate nel testo visibile: *percentile, gemello, parente, pairing, snapback, TL6, TL12, lb/in, kg/mm, ●◐○* non compaiono senza tooltip; percentile, gemello, parente, pairing non compaiono affatto.
- O5. Ogni numero mostrato è toccabile (tooltip) con: cosa è, fonte, data, misura o ipotesi.
- O6. Nessuna stima entra in punteggi, ordinamenti, consigli o frasi «rispetto alla tua». Test automatico che lo dimostra.
- O7. Target tattili ≥ 44 px, contrasto ≥ 4,5:1, nessuno scroll orizzontale a 390 px, dialoghi chiudibili con Esc e con Indietro.
- O8. Tutti i dati salvati online (montata, sessioni, corde finite, diario, preferite) restano leggibili dopo l'aggiornamento.

**Non obiettivi**: prezzi; reperibilità nei negozi; aggiornamento automatico dei dati; account multipli; supporto ad altre racchette.

**Anti-obiettivi** (sarebbe un fallimento anche se funziona):
- Una schermata che mostra più di una domanda alla volta.
- Un numero senza fonte, o una stima presentata come misura.
- Un consiglio che dice «più controllo» o «più potenza» come se fossero misure.
- Perdere la scheda Ibridi o i dati salvati dell'utente.

## 3. Vincoli (decisi dall'utente, non si ridiscutono)

Solo dati gratuiti (Excel dell'utente in `data/source`, TWU, Racketpedia gratuito); niente prezzi; punteggi e classifiche solo da laboratorio, le recensioni restano link; stime dichiarate e mai nei consigli; aggiornamento solo manuale; corde pre-2020 o fuori produzione tolte (le preferite restano); italiano, numeri con la virgola. Pubblicazione sullo stesso URL dell'artefatto (stesso proprietario: il `db` resta).

## 4. Approcci considerati

1. **Base online (adoring-rubin) + interfaccia rifatta** — scelto dall'utente. Tiene i moduli puri testati (stato, persistenza db, usura, AI, diario dati), rifà le schermate. Compatibilità dati senza conversioni.
2. Interfaccia da zero sui soli dati: codice più pulito ma rischio alto di perdere sincronizzazione, AI, esportazioni.
3. Base v3 + porting: scartato, non è la versione usata.

## 5. Il modello dei dati «misurati» (rigore)

### 5.1 Cos'è una misura

Una **misura** è solo:
- **TWU** con abbinamento `exact`: rigidità dinamica (lb/in), perdita di tensione (%), spin potential. Condizioni: 51–52 lb, swing veloce (TWU dichiara 52 lb: la pipeline scrive 51 → da correggere, vedi §11).
- **Racketpedia** con abbinamento `exact`: rigidità statica (kg/mm).
- **Excel dell'utente** (test Ektelon): allungamento a 50 lb (%), recupero, scorrimento 24 h.

Tutto il resto è **stima** (gemello di calibro, «parente», modello dello spin, rigidità da calibro, conversione Racketpedia→TWU, abbinamenti `probable`/`proxy`) e resta visibile solo nella scheda della corda, nella riga «Stime (non usate nei consigli)», con ≈ e il margine.

La pipeline produce per ogni corda un blocco `lab`:
```json
"lab": {
  "twu":    {"stiffness": 217.4, "loss": 44.1, "spin": 8.1, "date": "2026-10-28", "url": "…"} | null,
  "rp":     {"kgmm": 0.75, "date": "2026-10-28", "url": "…"} | null,
  "excel":  {"stretch50": 3.29, "recover50": 0.53, "creep24": …, "date": "2026-08-26"} | null
}
```
Le chiavi assenti valgono «non misurato». Un test (`tests/test_lab_only.py`) verifica che nessun valore `lab` venga da una stima.

### 5.2 Confronto «questa corda contro la montata» (`web/cmp.js`, puro)

Principi (audit E §3–4):
- Si confrontano **due corde nella stessa fonte**, mai convertendo tra fonti.
- Una differenza conta solo se supera la soglia pratica. Soglie (ipotesi dichiarate del progetto, scritte nella sezione Scienza):

| Grandezza (fonte) | «simile» | «un po'» | «nettamente» |
|---|---|---|---|
| Rigidità dinamica (TWU) | < 10% | 10–15% | > 15% |
| Rigidità statica (Racketpedia) | < 0,10 kg/mm | 0,10–0,20 | > 0,20 |
| Perdita di tensione (TWU) | < 5 punti | 5–10 | > 10 |
| Spin potential (TWU) | < 0,5 | 0,5–1,0 | > 1,0 |
| Allungamento a 50 lb (Excel) | < 1 dev. std del campione | — | > 1 dev. std |
| Calibro | < 0,03 mm | — | ≥ 0,03 mm |
| Forma, materiale | solo etichetta | | |

(10–15% per la rigidità: Lindsey, TWU «Understanding string stiffness»: corde entro il 10–15% «sembrano uguali».)

- **Accordo tra fonti**: se due fonti misurano la stessa grandezza (rigidità TWU e Racketpedia) e il segno della differenza coincide → «le misure concordano»; se è opposto → «le fonti non concordano: nessuna conclusione».
- **Frase per il giocatore**: «Rispetto alla Slap: *più rigida (Racketpedia, nettamente)*. Perché: il letto cede meno all'impatto; di solito più stabilità, meno comfort per il braccio. Non sappiamo: controllo e potenza non si misurano.» Se tutto è sotto soglia: «Nelle misure disponibili è simile alla tua.» Se non c'è nessuna fonte in comune: «Non confrontabile con le misure: la Slap ha solo Racketpedia ed Excel.»
- Mai «controllo» o «potenza» come misura; mai durata in ore; mai «la palla va più lunga».

### 5.3 Somiglianza alle preferite (sostituisce il «pairing 0–100»)

Il pairing attuale usa percentili e stime (audit E C1–C2). Lo sostituisce **«Vicina a ciò che ti piace»**: per ogni preferita, quante delle grandezze confrontabili (stessa fonte) cadono in «simile»; si prende la preferita con più grandezze simili. Si mostra come frase con il conteggio («simile alla Confidential in 3 misure su 4»), non come voto 0–100. Penalità: se è più simile a una non gradita (stesso conteggio, più alto) → «somiglia a una che non ti piace (RPM Blast)».

### 5.4 «Prossima»: cosa montare o comprare (`web/next.js`, puro + UI)

Una domanda: **«Cosa vuoi cambiare rispetto alla Slap?»** (chip, una scelta):
`Niente: simile` · `Più morbida` · `Più rigida` · `Tiene di più la tensione` · `Più spin`.
Default: l'ultima scelta; la prima volta «Niente: simile».

Per ogni corda candidata (non gradite escluse; uscite di produzione escluse):
- **compatibile** se le grandezze misurate in comune con la montata vanno nella direzione chiesta oltre la soglia «un po'» e nessuna fonte dice il contrario; per «simile», tutte sotto soglia.
- ordine: (1) **in casa** prima, (2) numero di misure che confermano, (3) vicinanza alle preferite (5.3), (4) nome.
- Due blocchi: **«Ce l'hai in casa»** (tutte le compatibili in scorta, anche mezze matasse) e **«Da comprare»** (massimo 3).
- Senza misure in comune con la montata, una corda non viene proposta (si trova comunque con la ricerca).

### 5.5 Tensione

Nessun numero «consigliato» presentato come fatto. La scheda dice: «Parti dalla tensione della tua (22/21 kg). Ipotesi: se è nettamente più rigida (TWU), prova −0,5 kg.» Numero solo se entrambe le rigidità sono TWU misurate; sempre con «ipotesi». La pendenza dalle due preferite (v3, −0,32 kg/15 lb/in) resta solo come riferimento nella sezione Scienza.

### 5.6 Usura

Si tolgono la formula `8 + 0,12 × tenuta` e le fasce Fresca/Da cambiare. Si mostra: ore giocate sulla montata e «la tua ultima corda è durata N h» (dalla storia reale: Zero 17,5 h). Dopo 3 corde finite: media personale. Le note generate che affermano durate («cala dopo 6–8 ore») si tolgono.

## 6. Le schermate

### 6.1 Oggi
```
┌ OGGI ─────────────────────────────┐
│ Re-String Slap 1,23 · 22/21 kg    │
│ 10 h su questa corda (6 uscite)   │
│ [ + Uscita 1,5 h ]   [ altre ore ]│
│ Com'era?  1 2 3 4 5 (faccine)     │
│ [tag: viva · pastosa · scivola …] │
│ [nota]                            │
│ ───────────────────────────────── │
│ Ultime uscite (3) · Cambia corda  │
│ In casa: … [ gestisci ]           │
└───────────────────────────────────┘
```
- **+ Uscita**: un tocco aggiunge una sessione di 1,5 h oggi (o le ore scelte). Il voto (1–5) e il tag si possono dare subito dopo, sulla stessa sessione: secondo tocco. Nota facoltativa.
- Un'uscita salva su `s-<ts>`: `{date, hours, note, life, feel?: 1–5, tag?: string}`. Campi nuovi facoltativi: i vecchi documenti restano validi.
- **Cambia corda**: dialogo con ricerca (prima le corde in casa), tensione, motivo della fine (consumata / rotta / cambiata per prova), e **una** domanda: «La ricompreresti? sì / forse / no». Se la corda nuova era in scorta, la scorta scende di 1 (mezza o intera, a scelta).
- **In casa** (scorta): elenco con marca, modello, calibro, «intera» o «mezza», quantità; + / − e aggiungi da ricerca. Salvato nel documento `state` come `stock: [{id, size: 'intera'|'mezza', n}]`.
- Il diario dettagliato vecchio (voti per categoria e momento) non si compila più; i dati esistenti restano e si vedono nella scheda della corda («Le tue prove»).

### 6.2 Prossima
```
┌ PROSSIMA ─────────────────────────┐
│ Cosa vuoi cambiare dalla Slap?    │
│ (Simile)(Più morbida)(Più rigida) │
│ (Tiene di più)(Più spin)          │
│ ─ Ce l'hai in casa ────────────── │
│ Toroline O-Toro 1,23  (mezza)     │
│ Rispetto alla Slap: più rigida ⓘ, │
│ forma tonda. Perché: …            │
│ [ Confronta ] [ Monta ]           │
│ ─ Da comprare ─────────────────── │
│ 1. … 2. … 3. …                    │
│ ─ Cerca una corda ─ [ ……… ]       │
│ ─ Ibridi ───────────────────────  │
│ ─ Chiedi all'AI [ casella ] [→]   │
└───────────────────────────────────┘
```
- **Confronta**: dialogo a due colonne (montata | scelta), una riga per grandezza misurata in comune, con la parola (simile / un po' / nettamente), la fonte, e il perché in una riga. Sotto, in grigio, «Stime (non usate)» e «Cosa non sappiamo». Fino a 3 corde contro la montata.
- **Scheda corda** (da ogni nome): nome, calibro, forma, materiale, anno; misure per fonte con tooltip; confronto con la montata; somiglianza alle preferite; recensioni indipendenti; le tue prove; azioni ★ preferita, ✕ non mi piace, + in casa, Monta.
- **Ibridi** (semplificata): scegli verticali e orizzontali (prima le mezze matasse in casa), tensioni V/O. Mostra per ognuna le misure e, se entrambe hanno la stessa fonte, il letto medio pesato 16/19 con la frase «rispetto alla Slap montata piena». Tolti: verdetto «controllo», avvisi a soglia inventata, protocollo 20+20, prezzi. Restano i setup A–G come «idee da provare» con la fiducia dichiarata e il perché, ricalcolati sulla montata attuale. Le «9 regole» passano nella sezione Scienza, ciascuna marcata Dimostrata / Plausibile / Ipotesi.
- **Chiedi all'AI**: casella di testo libera + invio. Il prompt contiene montata, preferite, non gradite, scorta, le misure della corda in esame (se aperta da una scheda) e le ultime uscite; la risposta è testo libero, etichettata «Parere AI — non misurato», mai usata nei calcoli. Lo schema JSON attuale chiede direzioni su controllo/potenza: si toglie. Senza capability `sample` la casella non compare.

### 6.3 Scienza
- **Cosa conta in una corda**: 6–8 schede brevi (rigidità e tempo di contatto; perdita di tensione; come nasce lo spin; forma; calibro; materiale; tensione; ibridi). Ognuna: affermazione, numero, fonte con data, livello (Dimostrata / Plausibile / Ipotesi), «cosa vuol dire per te sulla Blade».
- **Mappa** (nuova, leggibile): righelli orizzontali, uno per grandezza misurata (rigidità TWU, rigidità Racketpedia, perdita TWU, spin TWU). Su ogni righello: puntini grigi per tutte le corde misurate, **la montata evidenziata**, preferite e corde in casa con il nome. Nessuna fonte mescolata. Se la montata non ha quella misura, il righello lo dice. Tocca un puntino → riga sotto con nome e «Confronta». Etichette senza sovrapposizioni (al massimo 6 nomi per righello, gli altri solo puntino).
- **Recensioni indipendenti**: elenco per corda con classe (indipendente / con affiliazioni / commerciale), link, data; «frase chiave» solo se verificata guardando il video, altrimenti «da guardare». Criterio di indipendenza scritto (audit D §4).
- **Da dove vengono i dati**: fonti, data dell'ultimo controllo di ciascuna, quante corde misurate per fonte, cosa è stima. Esportazioni JSON/CSV.

### 6.4 Tooltip
Componente unico `web/tip.js`: ogni numero e parola tecnica è un `<button class="tip">`; tocco → popover (non modale) con titolo, una riga di spiegazione, fonte + data, «misura» / «ipotesi» / «stima ±x». Chiusura: tocco fuori, Esc, Indietro. Testi in `web/glossary.js` (puro, testato: ogni chiave usata in pagina ha una voce).

## 7. Dati freschi e recensioni

- **TWU**: audit D — nessuna novità rispetto allo snapshot del 28/10; Slap, Zero, Confidential 1,25 non sono nel database TWU. Si aggiorna la data di controllo.
- **Watch manuale** (`pipeline/watch.py`): legge TWU, Racketpedia e i feed RSS dei canali YouTube in `data/watch/channels.json`; scrive solo `data/changes/watch-AAAA-MM-GG.md` con le novità da rivedere. Non modifica dati né punteggi.
- **Recensioni**: `data/reviews_indep.json` con `{string_id, url, channel, class, date, verified_by_viewing: bool, phrase|null}`. Classi dai feed (audit D). Nessuna frase inventata: se il video non è stato guardato, `phrase = null` e la UI dice «da guardare».

## 8. Cosa si toglie

Scheda Mappa attuale, scheda Metodo come scheda (passa in Scienza), filtro «Filtra», pairing 0–100, indice di comfort, vita attesa da formula, fasce d'usura, note generate con durate, diario a 3 momenti × categorie (solo in scrittura: in lettura resta), «Le 3» con il loro badge, verdetto controllo Ibridi, prezzi in Ibridi, schema AI con controllo/potenza.

## 9. Compatibilità dei dati salvati

- `state` (v2): si aggiungono `stock` (facoltativo) e `nextGoal` (facoltativo). `sanitizeState` li valida; i documenti senza restano validi. `STATE_VERSION` resta 2 (campi aggiuntivi), così una pagina vecchia aperta altrove non scarta lo stato.
- `s-*`: campi facoltativi `feel`, `tag`.
- `l-*` e `equipped.diary`: invariati, letti per «Le tue prove».
- `localStorage 'banco-corde:ibrido'`: letto se presente.
- Default della montata nella pipeline: Re-String Slap 17 a 22/21 (oggi Zero).

## 10. Scelte lasciate al costruttore

Struttura interna dei moduli, CSS, icone, testi esatti dei tooltip (dentro i vincoli di §5 e §6), ordine dei setup di Ibridi, come mostrare la fiducia.

## 11. Problemi noti da sistemare durante il lavoro (dagli audit)

- TWU dichiara 52 lb, la pipeline scrive 51.
- Le soglie attuali (`values.js`, `compare.js`) sono sotto l'incertezza: sostituite da §5.2.
- `notes_gen.py`: frasi con durate e «snapback» da percentile → rigenerare senza.
- Ibridi: prezzo (14,90 €) e base O-Toro fissa → togliere e partire dalla montata.
- Rischio licenza TWU (Termini di TW vietano riproduzione e crawling): da segnalare all'utente, decisione sua.
- Copertura (audit A, ricalcolata sul ramo riconciliato): 102 corde; TWU exact 55, Racketpedia exact 48, Excel 44, nessuna misura 8. Slap, Zero e Confidential 1,25 non hanno TWU: per loro valgono Racketpedia ed Excel.
- RPM Blast 16L, Competition 16L e le 5 Flash 1,25 hanno TWU `proxy` (riga 1,30): con §5.1 non sono misure. Signum HEXtreme 16L resta `exact` (riga TWU propria, 204,6 lb/in); l'ambiguità è solo nel Compare TWU.
- Excel: le righe Flash pink e Flash yellow sono identiche in ogni cella (probabile copia): si segnalano nella scheda, non si correggono a mano.
- Fonti tra loro: TWU e Racketpedia concordano sulla rigidità (Spearman +0,65, n 26); l'Excel non concorda con nessuna delle due (|ρ| < 0,15). Per questo nessuna «tenuta» media: ogni grandezza resta nella sua fonte.
- 47 corde con «anno da verificare» (45 con anno solo «non oltre»): la regola pre-2020 resta, la scheda dice «anno non verificato».
- Default della pipeline (preferite, non gradite, montata) allineati allo stato reale dell'utente.
- UX (audit B): mappa a 390 px con 54 punti su 55 a meno di 44 px dal vicino; delta nascosto sulle righe del telefono (`style.css:412`); confronto a 7 tocchi; «Ricomprerei sì» cambia le preferite in silenzio; avvio con scroll automatico; Esc lascia il focus su `body`; 70 bottoni da 42 px. Tutti coperti dalle §6 e O1–O7.

## 12. Decisioni prese dopo la revisione del costruttore (scelte mie, l'utente ha chiesto di procedere)

1. **Cosa usa ogni domanda di «Prossima».**
   - *Più morbida / Più rigida*: rigidità Racketpedia (kg/mm) e rigidità TWU (lb/in), ciascuna contro la montata se la montata ce l'ha. Compatibile se almeno una fonte comune va nella direzione chiesta di almeno «un po'» e nessuna fonte comune va nella direzione opposta di almeno «un po'». L'allungamento Excel non decide direzioni (non concorda con TWU né con Racketpedia): si mostra solo nella scheda.
   - *Simile*: almeno una grandezza misurata in comune e tutte «simile».
   - *Tiene di più la tensione / Più spin*: sono solo misure TWU. Se la montata ha TWU, confronto diretto. Se non ce l'ha (la Slap), la risposta lo dice («la Slap non è misurata da TWU») e mostra le corde nel quarto migliore delle misurate TWU per quella grandezza, con il valore e il rango («perde 22%: tra le 14 migliori di 55»). È un confronto con le altre corde, non con la montata, e la frase lo dichiara.
   - Fonti in disaccordo (una dice più rigida, l'altra più morbida): la corda non è proposta; la scheda mostra il disaccordo.
   - Ordine: in casa → numero di fonti che confermano → somiglianza alle preferite → valore (per le domande TWU) → nome.
2. **Somiglianza alle preferite (5.3)**: si contano solo grandezze misurate nella stessa fonte (TWU rigidità, perdita, spin; Racketpedia kg/mm; Excel allungamento a 50 lb). Calibro e forma non contano: compaiono nella frase come etichette. Deviazione standard dell'allungamento: sul campione delle corde con Excel nel dataset finale.
3. **Scorta**: parte vuota, la inserisce l'utente. Può contenere solo corde del dataset. «Ce l'hai in casa» mostra tutte le corde in scorta (anche non compatibili con la domanda, che vanno in fondo con la loro frase), le compatibili prima.
4. **Recensioni e watch**: solo le voci dell'audit D, `verified_by_viewing:false`, nessuna frase; `channels.json` dall'audit D.
5. **Ibridi**: letto = (16·V + 19·O)/35 per grandezza e fonte, solo se V e O hanno quella grandezza nella stessa fonte; confronto con la montata solo nella stessa fonte. I setup A–G restano come «Idee da provare (non calcolate)», con la fiducia originale dichiarata come giudizio del progetto; testi riferiti all'O-Toro come «tua corda» riscritti, prezzi tolti.
6. **Pubblicazione**: fa parte del lavoro. Test di compatibilità su una copia anonimizzata dello stato reale (`tests/fixtures/state_real_2026-11-18.json`).
7. **Corda montata senza misure**: «Prossima» lo dice in alto e usa le preferite come riferimento per *Simile*; le altre domande mostrano il motivo per cui sono vuote. Nel dialogo «Cambia corda» le corde senza misure hanno l'etichetta «nessuna misura».
8. **Default della pipeline**: valgono solo se non c'è uno stato salvato.
9. **+ Uscita**: aggiunge 1,5 h oggi e mostra subito, sotto, il voto 1–5 per quella stessa uscita (secondo tocco = voto) e un «Annulla» per 8 s.
