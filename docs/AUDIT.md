# Audit — dati, racconto dei dati, UI

Data: 2026-10-09 · Stato della repo: `ca814b1` · Metodo: lettura di `pipeline/`, `web/`, `data/strings.json` (102 corde) e prova della pagina `dist/string-explorer.html` con Chromium a 375 px e 1280 px (screenshot in `docs/audit/`). Tutti i numeri qui sotto sono ricalcolati dal dataset, non dalla documentazione.

## In una frase

La pipeline è seria (fonti dichiarate, test, stime marcate), ma **la pagina mostra molti più numeri di quelli che i dati sostengono e non dice mai da dove vengono**: sei "criteri" sono in realtà ~3 numeri, i punteggi sono ranghi relativi presentati come voti assoluti, la tensione consigliata è una formula inventata presentata come dato, e le spiegazioni stanno in una Guida che nessuno apre.

---

## A. Errori nei dati e nel loro racconto

### A1 🔴 Sei barre, tre informazioni (Controllo / Potenza / Comfort non sono misurati)
`pipeline/derive.py`, `subscores()`:
- `control = media(rigidità, 100 − allungamento@50lb)`
- `power   = media(100 − rigidità, allungamento@50lb)`  → **sempre `100 − control`**. Verificato: 97 corde su 97 con entrambi i valori hanno `control + power = 100`.
- `comfort = 100 − percentile(rigidità statica Racketpedia o dinamica TWU)`.
- L'allungamento@50lb esiste solo per le 44 corde con riga nel tuo Excel. Per le altre 58, **Controllo = percentile di rigidità, Potenza = 100 − rigidità, Comfort = 100 − rigidità**. Esempio nello screenshot: Solinco Hyper-G Round → Rigidità 87, Controllo 87, Potenza 13, Comfort 13.

Effetti:
- La scheda "Le 3 da provare" dice "Forte in spin, controllo, tenuta" e mostra 6 barre "indipendenti": sembra un profilo multidimensionale, ma è rigidità + spin + perdita di tensione.
- Nel punteggio profilo Controllo (25) e Potenza (20) si **annullano** (sono lo stesso asse col segno opposto): il peso netto è 5, non 45. Il punteggio "72 per te" è di fatto ~spin 35 + tenuta 20 + un 5 sulla rigidità.
- Il tooltip della barra dice "dati di laboratorio": falso per questi tre criteri (sono proxy della rigidità; "controllo/potenza" come concetto non viene misurato da nessuna fonte).
- Il #3 consigliato (Hyper-G Round) ha Potenza 13 e Comfort 13 ("molto basso") e nessuno lo segnala come compromesso.

**Fix:** mostrare solo ciò che è misurato (Rigidità, Spin, Tenuta/perdita di tensione, Allungamento se c'è l'Excel) e chiamare le altre "interpretazioni" con la formula visibile; oppure ridurre le barre a 3–4 e togliere "Potenza" (= 100 − Controllo). Rifare i pesi del punteggio su assi indipendenti.

### A2 🔴 "Molto alto 92" / "72 per te" sono ranghi relativi, non voti
- I percentili sono calcolati sul campione di 102 corde, con popolazioni di riferimento molto più piccole: spin misurato **54**, rigidità misurata **57** (`population()`).
- Il campione è curato e sbilanciato (Toroline 20, Kirschbaum 18, Solinco 18, Signum Pro 14…, poche Head/Luxilon/Yonex/Babolat/Tecnifibre): "molto alto" = "nel 20% alto *di questo elenco*".
- Nessun punto della UI lo dice. Un numero da 0 a 100 con la parola "per te" si legge come un voto di qualità.
- Il punteggio non ha incertezza: spin ±0,5 (gemelli) o ignoto non si propaga; i primi 8 (74, 72, 70, 68, 67, 67, 65, 64) sono statisticamente indistinguibili ma ordinati come una classifica.
- 5 corde non hanno alcun sotto-punteggio di laboratorio e 12 non hanno rigidità: il loro "Per te" in Esplora è calcolato su 1–2 metriche (es. Re-String Zero 1,23: 56/37 senza spin né TWU).

**Fix:** dire "classifica tra le 102 corde del banco" accanto a ogni punteggio; mostrare "n. dati usati" (es. "4 su 5 misure") e non ordinare con differenze < ~5 punti; sostituire i numeri con fasce (A/B/C) o con intervalli.

### A3 🔴 Tensione consigliata: formula senza fonte, mostrata come dato
`tension_start()`: parte da una delle due preferite e corregge di **−0,75 kg ogni +15 lb/in di rigidità**, limitato a ±2 kg. Né il coefficiente 0,75/15 né il limite hanno una fonte o una validazione (non è calibrato su nulla nel repo). Tutti i 102 record hanno `indicative: true`, ma:
- sulle schede della home e del confronto la tensione compare in grassetto, senza qualifica ("Tensione di partenza: 22,5/21,5 kg · 49,5/47,5 lbs");
- "indicativa" e la nota compaiono solo nella scheda dettaglio, e la spiegazione ("0,75 kg ogni 15 lb/in") solo nella Guida, come "Dalla tua preferita più simile";
- usa l'ancora "più simile" in base alla somiglianza (vedi A5): il punto di partenza dipende da un numero poco affidabile;
- per corde di calibro diverso dalle ancore (1,18–1,30) non c'è correzione per il calibro.

**Fix:** un'etichetta fissa "stima: regola empirica, non misura" con tooltip/tap che apre la formula; mostrare il range (±1 kg) invece di un punto; prima della v3 decidere se la regola ha basi (letteratura, o i tuoi test).

### A4 🟠 Unità del tuo Excel interpretate senza prova ("6 / 12 mesi")
L'intestazione del foglio dice solo `TL6` e `TL12`. La UI scrive "Perdita tensione **6 / 12 mesi**" (scheda) e "6 mesi −15% · 12 mesi −20%" (confronto), e li fonde con la perdita TWU nella barra "Tenuta". Nel codice c'è il commento "0% in 6/12 mesi su una poly è implausibile". Una poly che perde 17% in 6 *mesi* non è coerente con la tua stessa nota ("sentirai calare dopo 6–8 ore"): è molto più probabile che siano **ore** (o un'altra unità di tempo). **Verifica con te:** cosa significano TL6/TL12? Finché non è chiarito, l'etichetta "mesi" è potenzialmente sbagliata e `tl6` entra nel punteggio di Tenuta.

### A5 🟠 Somiglianza "81/100" e penalità: metriche opache e su 2+2 campioni
- `similarity()`: distanza gaussiana (`100·exp(−d²/2)`) su ≤6 variabili in z-score, **+5 se stessa forma**, calcolata solo su variabili in comune (min. 2). Nella card si vede "simile alla tua Confidential (81/100)" senza dire su quanti dati (`similarity_basis` esiste, ma sta nella scheda), né cosa significhi 81.
- La penalità "−15 se somiglia a una non gradita (>75)" è una soglia arbitraria; "RPM Blast" e "Confidential Soft" sono i soli due negativi.
- `insight` ("I tuoi gusti non sono 'morbido contro rigido'… Il filo comune è una risposta netta con buon snapback") è una **conclusione da 4 corde** (2 piaciute, 2 no) con testo statico che cita cifre (222, 166, 9,4, 44%…). È ben scritto ma sembra un'analisi, mentre è un'ipotesi. In più "snapback" non è definito nella Guida (TWU lo chiama "spin potential"): nel testo `snapback` e `spin potential` sono usati come sinonimi.

### A6 🟠 Provenienza dei dati nascosta; "misurato" mescola metodi diversi
Fonti reali per riga: TWU (a 51 lb, swing veloce, una prova per corda), Racketpedia (rigidità statica kg/mm, arrotondata a 0,05), il tuo Excel (solo 44 corde), "gemelli" (stesso modello altro calibro/colore, margine fisso ±0,5 non derivato), regressione Racketpedia→TWU (errore medio ±11 lb/in su 18 coppie, r = 0,63).
- Nelle liste e nelle barre "misurato" e "da gemello" hanno la stessa grafica salvo una righina tratteggiata; solo 18 spin sono da gemello e 21 rigidità, 12 da regressione.
- Non c'è mai scritto per ogni numero **chi l'ha misurato, a quali condizioni, quando**. Nella tabella Esplora le colonne "Rigidità", "Spin", "Perdita %" non dicono nemmeno la fonte (TWU?) né le unità (lb/in; scala 0–10 TWU; % dopo quanto?).
- "Perdita %" è TWU; "Tenuta" nel confronto è un mix TWU + Excel.
- Per la Grapplesnake Tour M8 1,25 la home mostra "Spin molto alto 91" senza dire che lo spin è da un calibro gemello (il badge sta in basso nelle liste, non nelle card top-3).

### A7 🟠 Rete di fiducia sui dati curati da agenti
- Anni e produzione vengono da agenti Haiku: 47 corde senza anno, 45 solo "upper bound" (= "già in vendita nel X"), solo 10 esatti. La Guida dice però "Anni e produzione verificati sui siti dei produttori", troppo forte. Il filtro "uscite prima del 2020" ha tolto **52 corde** sulla base di queste prove: nessun test lo mostra come verificato.
- "Controllo incrociato": 10 "questionable", 3 "contradicted": le corde contraddette sono escluse dal top 3 ma restano in lista con un badge "dati contestati" senza spiegazione.
- I test coprono parser e formule, ma nessun test verifica che le affermazioni nella UI/Guida (es. "r = 0,63", "errore ±11") coincidano con `estimates_meta`: sono hard-coded nei testi `app.js`.

### A8 🟡 Coerenza interna
- Il punteggio è davvero solo laboratorio (`build.py` chiama `derive_all(records)` senza recensioni), ma `derive.judgments()` conserva ancora la miscela 70/30 e la specifica v2 la descrive: codice morto che contraddice il README. Rimuoverlo o riattivarlo con una decisione esplicita (oggi `lab_share` vale sempre 1 e la UI lo mostra come se fosse un dato variabile).
- Corde con più colori identici (Kirschbaum Flash black/orange/pink/yellow/green; Toro Toro matcha/Orange/pink; Wasabi) occupano 8–9 righe uguali in Esplora.
- La Guida e la scheda chiamano "Stiff Index" una grandezza che il tuo file chiama così ma che misura il cedimento (r = −0,34 con la rigidità): il nome induce all'errore di lettura. Spiegato bene in Guida, ma la colonna di Esplora si chiama "Stiff Idx" senza tooltip su touch.

---

## B. Audit della UI

Scala: 🔴 blocca la comprensione, 🟠 forte attrito, 🟡 rifinitura.

### Usabilità

| # | Problema | Gravità | Fix |
|---|---|---|---|
| U1 | La **mappa non mostra le stime**: i punti stimati sono `circle.hollow` con `stroke` come attributo, ma `#scatter .dot { stroke: var(--surface) }` lo sovrascrive → il cerchio è bianco su bianco e restano solo barre d'errore verticali "orfane" (vedi `docs/audit/mappa-desktop.png`). La legenda promette "cerchi vuoti con margine". | 🔴 | `stroke: var(--c)` via `style=` o CSS var per punto; testare con screenshot. |
| U2 | **Etichette mappa che si sovrappongono**: "★ O-Toro 17" copre il nome della zona "VIVE DA SPIN"; "RPM Blast 17" e "RPM Blast 16L · 16" si accavallano; i punti verdi (marche valutate) non hanno etichetta né tooltip su telefono (tap = apre una card sotto la mappa, fuori schermo). | 🟠 | Etichette solo per le ancore; zone nominate fuori dall'area dei punti; al tap evidenziare e fare scorrere alla card. |
| U3 | **La risposta non è in cima su telefono**: titolo a 3 righe + eyebrow a 4 righe + profilo + tabs consumano ~230 px su 800; la prima scheda è tagliata. Le 3 schede da 6 barre sono ~250 px l'una → serve scrollare per vedere "le 3" e la tensione. | 🟠 | Intestazione compatta (una riga), eyebrow nascosto su mobile; schede top-3 a 2 righe + tensione; barre dietro "Dettagli". |
| U4 | Ogni scheda ripete 6 barre uguali (anche in lista "Migliori per te" e in Esplora): molto rumore, poca differenza visiva (la maggior parte è "medio/alto"). Nulla indica **perché** la #1 batte la #5. | 🟠 | Mostrare solo ciò che differenzia (delta vs la tua preferita), e una riga "perché". |
| U5 | **Punteggio e tensione senza legenda** vicino al numero ("72 per te" non dice "su 100, rango tra 102 corde"; tensione senza "stima"). | 🔴 | Tooltip/tap "Come è calcolato" sempre a un tocco; vedi A2/A3. |
| U6 | **Confronta su telefono**: 4 select impilate (~330 px) prima di vedere la prima riga di confronto; le schede sono larghe 86% con scroll orizzontale senza indicatori a punti (nota nota nel README), quindi non si vede che ce ne sono altre. La sintesi ("guadagni spin, potenza e comfort e perdi controllo e tenuta") ripete A1 (potenza ↔ controllo sono lo stesso asse). | 🟠 | Select in due colonne o in un solo elenco "aggiungi"; indicatori e conteggio ("1/3"); sintesi su criteri indipendenti. |
| U7 | **Esplora**: tabella di 12 colonne con intestazioni abbreviate (Stiff Idx, Simil.), nessuna unità, badge troncati ("simile a una non gradi…"), 102 righe senza paginazione; su telefono cambia in schede, ma i filtri (marca/calibro/forma/2 checkbox) non sono ricordati. | 🟠 | Intestazioni con unità e tooltip accessibili da tastiera/touch; legenda dei badge; colonna "Fonte". |
| U8 | **Tooltip solo hover** (`title`) per: punteggio/100 della barra, "—" = non testato, nota di stima. Su touch non esistono → l'unica spiegazione del numero è inaccessibile su telefono. | 🔴 | Elementi `button` che aprono un popover; mostrare "non testato" come testo, non "—". |
| U9 | **La Guida è nascosta** (pulsante "Guida" nell'intestazione, non nella navigazione) e contiene le spiegazioni cruciali (stime, gemelli, Stiff Index, perché due rigidità non coincidono). Nessun link contestuale dai numeri alla sezione. | 🔴 | Link "?" accanto a ogni numero → ancora nella Guida; riassunto "Come leggere" di 3 righe sopra le top-3. |
| U10 | Elenco "corde tolte" in Guida: un muro di ~50 voci in testo corrido; informazione utile ma non scansionabile. | 🟡 | Tabella o `<details>` filtrabile. |
| U11 | Colonne "Corda 1…4", chip colore (blu/arancio/verde/giallo) non ripetuti nelle schede → il colore non identifica la corda. | 🟡 | Ripetere il punto colore accanto al nome nelle schede. |

### Gerarchia visiva
- Cosa cattura l'occhio: il punteggio (grande, a destra) e i pulsanti "Scheda" arancioni ripetuti in ogni card. Il punteggio è l'elemento meno spiegato (A2): l'occhio va nel posto sbagliato.
- Il pulsante primario ("Scheda") compete con l'azione utile ("Confronta" secondario): meglio l'inverso per la domanda "quale scelgo?".
- Le 3 card top e la lista "Migliori per te" sotto hanno lo stesso aspetto → le prime 3 risultano ripetute (le stesse 3 compaiono due volte di seguito, vedi `per-te-desktop.png`).

### Coerenza
| Elemento | Problema | Fix |
|---|---|---|
| Parole vs numeri | "molto alto 92", "alto 66", "medio 50": scala di 5 livelli su percentile con soglie ogni 20; due corde con 61 e 59 hanno parole diverse. | Mostrare solo parole o solo posizione sulla scala. |
| "Rigidità" | Barra grigia "neutra" (non è bene/male) ma accanto alle altre; Esplora la chiama "Rigidità" ma contiene il valore TWU dinamico, mentre in Guida si spiega che ce ne sono due. | Etichettare "rigidità dinamica TWU (lb/in)". |
| Badge | "anno da verificare", "spin stimato", "dati contestati", "simile a una non gradita", "solo catalogo": 5+ badge senza legenda unica, colori che non seguono il significato (blu = stima ma anche "preferita"). | Legenda unica, 3 categorie (qualità del dato / scelta / attenzione). |
| Lingua | Misto italiano/inglese (swing "Fast", "snapback", "TW playtest"), "lbs" e "lb/in", kg e lbs, virgola/punto decimale nei testi dell'agente. | Glossario e normalizzazione. |

### Accessibilità
- **Contrasto** (calcolato): testo `--muted` (#6b7774) su sfondo: **4,25:1** (< 4,5) e su `--surface-2` **3,9:1**; è usato per sottotitoli, note, numeri secondari (`.num` 0,76 rem). Etichette delle zone della mappa (opacità .55): **~2,2:1**. Barra "Rigidità" grigia (#7b8784) su traccia: **3,1:1** (informazione non solo colore, OK, ma sotto 3:1 vicino al limite).
- **Dimensione**: molti testi a 0,76–0,88 rem (12–14 px): badge, numeri accanto alle barre, `.small`. 
- **Target tocco**: `.btn`, `.preset` e "chip" hanno altezza ~30–32 px (< 44 px consigliati); pulsante "×" della scheda ~36 px.
- **Mappa**: non navigabile con la tastiera in modo significativo (punti con `tabindex` ma senza etichetta del valore); informazione solo visiva; manca una tabella alternativa ai punti.
- **Colore**: blu/arancio/verde per categorie; il blu e il verde sono distinguibili dai daltonici, ma arancio/verde nella legenda non hanno forma distinta (solo i cerchi vuoti hanno forma).
- Positivo: `prefers-color-scheme`, `prefers-reduced-motion`, `dialog` nativo, `aria-selected` sui tab, `aria-pressed` sui preset, focus ring arancio, nessuno scroll orizzontale a 375 px.

### Cosa funziona
- Dichiarazione esplicita dei limiti nella Guida (la calibrazione dello spin dai tester non regge: MAE 1,14 vs 1,08, e per questo non viene usata).
- Regola chiara "solo laboratorio" e recensioni come link; stime marcate, 122 test, parità punteggio Python/JS.
- Struttura "risposta prima, poi i dettagli", navigazione in basso su telefono, scheda come bottom sheet.
- Il confronto con frase di sintesi e i "leader" per criterio è un'ottima idea.

---

## C. Priorità consigliate

1. **Sistemare il modello dei criteri (A1)**: togliere Potenza/duplicati, riscrivere Controllo e Comfort come "interpretazioni", ricalcolare il punteggio su assi indipendenti, e rifare le top-3 (cambieranno).
2. **Aggiungere provenienza a ogni numero (A2, A3, A6, U5, U8, U9)**: un tap su qualunque valore apre "da dove viene" (fonte, condizioni, margine, quante corde nel campione) con link alla Guida; "stima" sempre visibile.
3. **Chiarire TL6/TL12 con te (A4)** e correggere le etichette; poi decidere se la tensione consigliata (A3) deve restare o essere sostituita da un range con fonte.
4. **Sistemare la mappa (U1/U2)**: i punti stimati sono invisibili oggi.
5. **Home mobile (U3/U4)**: intestazione compatta, top-3 più brevi, "perché" al posto delle 6 barre.
6. Accessibilità (contrasto muted, target 44 px, tooltip touch).

### Cosa non è stato fatto
Non ho modificato il codice né il dataset; non ho verificato a campione gli URL delle fonti né rieseguito la pipeline (richiede rete). Il tema scuro è stato controllato solo sui token CSS, non a schermo.
