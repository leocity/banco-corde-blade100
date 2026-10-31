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

### A4 🟡 TL6/TL12: sono mesi (confermato dall'utente), ma l'unità non è dichiarata e si mescola con la perdita TWU
L'intestazione del foglio dice solo `TL6` e `TL12`; l'utente ha confermato che sono **mesi**, quindi l'etichetta "6 / 12 mesi" della UI è corretta (una prima versione di questo audit ipotizzava "ore": era un errore). Restano due problemi di racconto:
- il file non lo dichiara (solo il glossario in Guida: "perdita a 6 e 12 mesi da 50 lbs"), e non si spiega che il valore è una perdita percentuale rispetto alla tensione iniziale;
- la barra "Tenuta" mescola la perdita TWU (prova di laboratorio di breve durata) e TL6 dell'Excel (sei mesi in uso/stoccaggio): sono scale temporali molto diverse e la UI non lo dice.

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

## Stato delle correzioni (2026-10-09)

Fatto in questo ramo:
- **A1**: tolta "Potenza"; Controllo e Comfort restano solo come *stime dalla rigidità* (barre tratteggiate, in un pannello chiuso, etichettate "stima"); il punteggio usa assi indipendenti: spin 35, tenuta 20, affinità con le preferite 20. Serve spin e tenuta, altrimenti nessun punteggio (64 corde su 102 hanno un punteggio; prima i dati mancanti gonfiavano la classifica). Le top 3 cambiano.
- **A2/U5**: il punteggio è dichiarato "posizione tra le 102 corde", con i pesi, e c'è il link alla Guida; l'ipotesi sui gusti è dichiarata come tale (4 corde).
- **A3**: "Tensione di partenza" ha il badge "stima" e la Guida dice che la regola non è validata.
- **A4**: TL6/TL12 restano "mesi"; la Guida dichiara la scala temporale e la differenza con la perdita TWU.
- **A7**: il testo sugli anni non dice più "verificati".
- **U1**: i punti stimati della mappa ora si vedono (cerchi vuoti con barra d'errore).
- **U3**: intestazione compatta su telefono, prima scheda nella prima schermata.
- **Duplicazione**: le top 3 non si ripetono nella lista "Migliori per te".
- **Accessibilità**: `--muted` più scuro (≥ 5:1), etichette zone senza opacità, pulsanti da 44 px, intestazioni di Esplora con unità e tooltip.

- **Dati mancanti in mappa e confronto** (segnalato dall'utente): la mappa non scarta più in silenzio le corde con un solo asse (fascia "non disponibile" in basso/a sinistra), conta e elenca quelle senza né rigidità né spin e quelle nascoste dai filtri; il confronto mostra "dato mancante" con il motivo, "Dati: ✓/✗" per scheda, i leader solo "tra le corde con dato" e una riga "Non confrontabili per dati mancanti". Numeri reali: la mappa predefinita disegna 34 corde, 21 hanno dati incompleti e 47 sono nascoste dai filtri.

- **Spin stimato per le corde senza dati** (richiesta dell'utente, es. Re-String): `pipeline/estimate.py` ha un modello ridge su rigidità + forma, provato in leave-one-out su 54 corde con spin misurato: errore medio 0,99 contro 1,19 della media (−17%); intervallo ±1,5 (80%); senza rigidità solo la forma (1,04). Le recensioni, il tuo Excel e il calibro non migliorano la stima. Le 30 corde senza spin ora hanno una stima ("da modello"): cerchi tratteggiati con barra d'errore larga in mappa, riga "stima da modello" nel confronto, mai nel punteggio. Limite dichiarato: l'effetto "esagonale = più spin" viene da 6 corde misurate.

- **Rigidità stimata e ricerca** (richiesta dell'utente: la rigidità è fondamentale). Backtest leave-one-out su 57 corde con rigidità TWU misurata (sd 18 lb/in; media come riferimento: errore 14,6):

  | Segnale | n | r | Errore con modello | Note |
  |---|---|---|---|---|
  | Calibro | 57 | +0,49 | 12,6 | più spessa = più rigida; usabile ma debole |
  | Gemello, copia del valore | 20 coppie | – | 13,4 | comportamento v2 |
  | Gemello corretto per calibro (+203 lb/in per mm) | 20 coppie / 13 modelli | – | **9,2** | −31% sulla copia |
  | Racketpedia statica | 18 esatte | +0,63 | 11,3 | già in uso (±11) |
  | Racketpedia + calibro | 30 | – | 10,0 | miglioramento marginale, non adottato |
  | Excel (Stiff Index, allungamenti, scorrimento, TL6) | 12 | −0,06…−0,40 | – | non predicono la rigidità |
  | Giudizio dei tester sulla rigidità | 16 | +0,70 | 10,2 (con calibro) | **scartato**: sono opinioni, e possono ricalcare i dati TWU |

  Effetti: le 8 righe TWU di calibro diverso ora sono corrette per il diametro (es. Confidential 1,25: 222 → 212 lb/in; Confidential 17: → 202), con margine ±15; 4 Re-String 16/18 prendono il valore del gemello Racketpedia corretto per il calibro (±19); 8 corde senza altro dato hanno solo la stima dal calibro (±22, poco più della media). Tutte compaiono con "≈", cerchi vuoti/tratteggiati in mappa e dichiarate in Guida. Le stime dal solo calibro non entrano nel punteggio.

  **Ricerca dopo l'apertura della rete (dati di laboratorio, non riassunti):**
  - *Racketpedia* (`pipeline/rpedia_site.py`, `data/raw/racketpedia.json`): scaricate le liste paginate di 11 marche (318 righe con URL e rigidità statica). Le righe scritte dall'agente sono ora verificate sul sito: 21 abbinamenti nuovi o corretti, tra cui 11 corde che non avevano alcun dato (Re-String 16/18, Enso Pro, A5, Helix, Flash, Alpha), la Re-String Sync 1,25 che era abbinata al calibro sbagliato (0,85 → 0,95 kg/mm), la Head Lynx Tour 1,30 (1,05 → 1,15) e la Yonex Poly Tour Rev 1,30 (0,85 → 0,80). La regressione Racketpedia → TWU ora usa 26 coppie esatte invece di 18: errore 10,5 invece di 11,3 lb/in. Le schede gratuite non hanno altro che la rigidità statica (spin, tenuta ecc. sono a pagamento).
  - *TWU*: riscaricata la tabella: identica allo snapshot (130 corde in ambito). Non contiene Re-String, Enso Pro, Wasabi X, Polaris, Hawk Seeding né Pro Line Rough.
  - *StringSpec* (791 corde): dichiara di non misurare nulla, i dati sono TWU rielaborati. Nessun dato nuovo, quindi non usato. Spunto: TWU misura il diametro reale, che potrebbe sostituire il calibro nominale nella correzione.
  - *USRSA via TruPro*: tabella di laboratorio (62 lb, protocollo USRSA) solo per le corde TRU PRO, nessuna delle nostre. Utile come verifica indipendente della correzione per il calibro: su 25 coppie di calibri (8 modelli) la pendenza di 203 lb/in per mm ricavata da TWU riduce l'errore da 20,7 a 7,8 lb/in (la pendenza USRSA è 289, quindi la nostra correzione è prudente).
  - Restano senza dati di laboratorio pubblici, quindi solo stima dal calibro: Head Hawk Seeding, Kirschbaum Pro Line Rough, Signum Pro Polaris, Toroline Wasabi X.

Ancora aperto: propagare i margini dello spin nel punteggio; validare o sostituire la regola della tensione; U2 (etichette sovrapposte nella mappa); indicatori a punti nel confronto su telefono; U7 legenda dei badge; tooltip solo hover su touch nelle barre (ora c'è almeno il numero visibile); A5 (somiglianza), A6 (fonte accanto a ogni numero), A8 (codice morto 70/30 in `judgments()`).

## Stato v3 (2026-10-30)

Spec: `docs/superpowers/specs/2026-10-30-banco-semplificato-design.md` · piano: `docs/superpowers/plans/2026-10-30-banco-semplificato.md` · screenshot: `docs/audit/v3-*.png` (390 e 1280 px). Verifica: 187 test Python, 109 test JS, 52 test Playwright, tutti verdi (`tests/run_all.sh`). L'Artifact pubblicato **non è ancora aggiornato**: serve la tua conferma.

### I sette problemi dell'audit del 2026-10-30

| # | Problema | Stato | Come |
|---|---|---|---|
| 1 | La montata (Zero 1,23) e 29 corde valutate senza punteggio | **Risolto** | Il pairing richiede almeno 3 misure di laboratorio, non più lo spin: Zero ha pairing 100 «senza spin». 97 corde su 102 hanno un pairing (Ottimo 14, Buono 20, Attenzione 35, Poco adatta 28), 5 sono «non valutabili» con l'elenco di cosa manca. |
| 2 | L'Excel usato in due soli calcoli | **Parziale** | Tenuta = media di perdita TWU, TL6, TL12 e scorrimento 24 h; il controllo usa allungamento a 50 lb ed elasticità; elasticità, cedimento e lunghezza guadagnata 16×19 sono nella scheda. **Aperto:** la curva di allungamento 40→65 lb e il peso statico sono solo mostrati, non entrano in nessuna dimensione. |
| 3 | Controllo = percentile della rigidità, nascosto | **Risolto, con un limite dichiarato** | Un indice da 1–3 misure («da N di 3»), mostrato in ogni riga con la potenza come altro estremo dello stesso asse. Nessun laboratorio lo misura e la scheda lo dice. |
| 4 | Recensioni in conflitto con i dati | **Risolto** | Fuori da ogni numero; la scheda dice «I tester dicono X, i dati misurano Y» quando divergono di 2 o più livelli (20 corde, 22 conflitti). 34 fonti su 144 sono marcate «calibro diverso» dalle note e non generano conflitti (riconoscimento da espressioni nelle note: correggibile in `data/agents/review_overrides.json`). |
| 5 | Mappa illeggibile | **Risolto** | Scheda al passaggio (o fissata al tocco), filtri per marca, calibro, forma, solo misurate, pairing Buono o meglio; montata e preferite sempre visibili e con etichetta senza sovrapposizioni; barre d'errore solo sul punto attivo; tabella alternativa e frecce da tastiera. |
| 6 | Troppe schermate, numeri e badge | **Risolto** | 4 schermate (Scegli, Mappa, Banco, Montata) più il Metodo; una sola riga corda con 4 valori marcati ● ◐ ○ e un solo avviso per volta; liste preimpostate e pesi sostituiti da filtri. |
| 7 | Montata e preferite fisse, nessun registro ore | **Risolto, con un limite dichiarato** | Montata e preferite modificabili, registro ore, storico delle corde finite, usura con fasce. **Limite:** la vita attesa in ore (`8 + 0,12 × tenuta`) è un'ipotesi non misurata finché non registri corde finite. |

Aggiunto: parere AI su richiesta (scheda, corda che non c'è, usura), sempre etichettato «Parere AI — non misurato» e fuori da punteggi, top 3, mappa e confronto.

### Voci dell'audit precedente

- **A1/A2 (criteri e punteggio relativo):** il vecchio punteggio «Per te» e l'affinità non esistono più; il pairing è dichiarato «non è un voto» accanto al numero e nel Metodo.
- **A3 (tensione):** ora parte dalla tua montata e mostra un intervallo ±1 kg con l'etichetta «stima»; la regola (−0,75 kg ogni +15 lb/in, ±2 kg) **resta non validata**.
- **A5 (somiglianza opaca):** sostituita dal pairing, con la formula nel Metodo. **Aperto:** l'ipotesi sui gusti da 4 corde (`DATA.insight`) è ancora un testo statico del dataset, ora nel Metodo e dichiarato come ipotesi.
- **A6 (provenienza):** ogni valore ha il marcatore e un suggerimento con la fonte; il «?» porta al Metodo. **Aperto:** non c'è un popover per numero con condizioni e margine, e i suggerimenti dei marcatori richiedono il passaggio del mouse (su telefono resta il testo «manca: …»).
- **A7 (anni e produzione da agenti):** **invariato**, 47 corde senza anno («anno da verificare»).
- **A8 (codice morto):** **aperto**, `derive.judgments()` ha ancora la miscela 70/30 con le recensioni (mai usata) e restano i campi `profile_score`, somiglianza e `tension_start` anche se l'interfaccia non li legge più.
- **U1–U3, U5, U9:** risolti (mappa, etichette, prima schermata su telefono con la prima scelta sopra la piega, spiegazioni raggiungibili dal «?»).
- **U4:** risolto in parte, ogni riga mostra la differenza rispetto alla montata; manca una riga «perché la prima batte la quinta».
- **U6/U7:** il confronto è un pannello in basso con colonne scorrevoli; **aperto:** niente indicatori a punti, e i badge non hanno una legenda unica.
- **U10:** **aperto**, l'elenco delle corde tolte resta un paragrafo nel Metodo.
- **Accessibilità:** misurati a 390 px, pulsanti, chip di filtro e schede sono 44 px; **aperto:** i chip in «Le tue corde» sono 32 px e il «?» accanto ai valori è 22 px.

### Ancora aperto

- Verificare la vita attesa con le tue corde finite; regola della tensione non validata.
- Propagare i margini dello spin da gemello (±0,5) nel pairing.
- Rinominare o togliere i campi derivati non più usati (A8).
- Se la pagina viene aperta senza `db` (anteprima, non autenticato), lo stato è solo nel browser: lo dice la schermata Montata.
- Ripubblicare l'Artifact con `sample`, `db`, `user`, `downloads` e controllare `db` con `ArtifactData` (non fatto: richiede conferma).

## C. Priorità consigliate

1. **Sistemare il modello dei criteri (A1)**: togliere Potenza/duplicati, riscrivere Controllo e Comfort come "interpretazioni", ricalcolare il punteggio su assi indipendenti, e rifare le top-3 (cambieranno).
2. **Aggiungere provenienza a ogni numero (A2, A3, A6, U5, U8, U9)**: un tap su qualunque valore apre "da dove viene" (fonte, condizioni, margine, quante corde nel campione) con link alla Guida; "stima" sempre visibile.
3. **Dichiarare le scale temporali di Tenuta (A4)** (TWU breve, Excel 6/12 mesi) e decidere se la tensione consigliata (A3) deve restare o essere sostituita da un range con fonte.
4. **Sistemare la mappa (U1/U2)**: i punti stimati sono invisibili oggi.
5. **Home mobile (U3/U4)**: intestazione compatta, top-3 più brevi, "perché" al posto delle 6 barre.
6. Accessibilità (contrasto muted, target 44 px, tooltip touch).

### Cosa non è stato fatto
Non ho modificato il codice né il dataset; non ho verificato a campione gli URL delle fonti né rieseguito la pipeline (richiede rete). Il tema scuro è stato controllato solo sui token CSS, non a schermo.
