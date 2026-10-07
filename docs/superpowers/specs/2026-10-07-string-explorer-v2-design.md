# Banco Corde v2 — Specifica di design

Data: 2026-10-07 · Stato: bozza da revisionare · Estende: `2026-10-05-string-explorer-design.md`

## 1. Obiettivo

Rendere il Banco Corde **completo, onesto e intuitivo**. Concretamente:
- includere tutte le corde delle marche indicate dall'utente;
- dare una stima dello spin dove TWU non ce l'ha, dichiarandola come tale;
- affiancare ai numeri giudizi semplici;
- riprogettare la pagina perché dia prima la risposta e poi i dettagli, anche su telefono.

**Successo =**
- dal telefono, in 30 secondi: le 3 corde da provare, la tensione e il perché;
- a casa: ogni giudizio è tracciabile fino ai numeri e alle fonti;
- nessuna corda delle marche indicate manca;
- nessuna stima è spacciata per misura.

## 2. Decisioni dell'utente (2026-10-07)

| Tema | Decisione |
|---|---|
| Spin mancante | Punteggi dei tester calibrati sulla scala TWU, più "parenti" (stesso modello in altro calibro, stessa corda in altro colore). Sempre marcato come stima, con margine. |
| Fonti qualitative | Tennisnerd, siti delle marche, recensioni e video YouTube, con **peso minore** dei dati di laboratorio (sono opinioni personali). |
| Interfaccia | Approccio A: prima la risposta, poi i dettagli. Giudizi semplici **in aggiunta** ai numeri, non al loro posto. Mappa e confronto da riprogettare; deve funzionare bene su telefono. |
| Uso | Sia rapido (telefono) sia approfondito (casa). |
| Stiff Index | Resta con il nome del file, ma con la spiegazione corretta (§5.4). |
| Catalogo | Devono esserci **tutte** le corde poly/co-poly 16–17L delle marche indicate all'inizio. |
| Comparatore | Deve mostrare la **rigidità**. |

## 3. Completezza del catalogo

**Marche e linee obbligatorie:** Solinco, Re-String, Toroline, Grapplesnake (tutte le poly), Wilson Revolve e Revolve Spin, Babolat RPM Blast e RPM Blast Rough / RPM Rough.

1. Un **agente Haiku** raccoglie dai siti ufficiali e dai principali rivenditori (Tennis Warehouse, TW Europe) la gamma **attuale** delle poly e co-poly di queste marche, con i diametri da 1.18 a 1.30 mm.
2. Per ogni elemento di quella gamma che non è già nel banco (confronto per marca + modello + calibro, con le regole di normalizzazione esistenti) si crea un record **"solo catalogo"**:
   - nessun dato di laboratorio;
   - forma, diametro e materiale dal produttore;
   - giudizi presi solo dalle recensioni (§4), con il badge "solo recensioni".
3. Il controllo è un test automatico: ogni elemento del file della gamma ha un record nel dataset finale.

## 4. Recensioni e punteggi dei tester

Un **agente Sonnet** lavora su circa 100 corde: tutte quelle delle marche obbligatorie, più i concorrenti con il punteggio profilo più alto.

**Fonti, in ordine di preferenza:**
1. playtest di Tennis Warehouse / TW Europe, punteggi 0–100;
2. Tennisnerd, punteggi /10;
3. siti delle marche;
4. String Forum;
5. recensioni e video YouTube (si usano titolo, descrizione e testo della pagina; niente trascrizioni lunghe).

**Per ogni corda e ogni fonte:**
- punteggi numerici, se esistono, per spin, comfort, controllo, potenza e durata/tenuta, con l'URL;
- un giudizio qualitativo in 5 livelli (molto basso … molto alto) per gli stessi criteri più la rigidità percepita, con l'URL;
- **nessun numero inventato**: se manca, `null`.

**Output:** `data/agents/reviews.json`. Un agente Haiku separato verifica a campione il 15% delle righe sulle fonti.

## 5. Modello dati e calcoli

### 5.1 Spin stimato
Il valore dello spin si sceglie con quest'ordine di priorità:
1. **TWU misurato** sulla stessa corda;
2. **parente**: stesso modello e calibro diverso, oppure stessa corda e colore diverso. Margine fisso ±0,5, tipo `parente`;
3. **punteggi dei tester calibrati**:
   - regressione lineare da punteggio tester (normalizzato 0–100, media pesata delle fonti numeriche) a spin TWU;
   - stimata sulle corde che hanno entrambi i dati;
   - margine = errore assoluto medio in leave-one-out, tipo `tester`;
   - si usa **solo** se il modello batte la media (errore assoluto medio inferiore a quello del predittore costante); altrimenti si passa al punto 4;
4. **giudizio qualitativo** dei tester tradotto nel percentile corrispondente della distribuzione TWU. Margine = deviazione standard della classe, tipo `qualitativo`;
5. altrimenti `null`.

Campo: `spin = {value, low, high, kind: "misurato"|"parente"|"tester"|"qualitativo", basis_n}`. Tutti i calcoli che oggi usano lo spin TWU usano `spin.value`. Nelle percentuali di popolazione entrano solo i valori misurati, così le stime non spostano la distribuzione.

### 5.2 Rigidità di riferimento
`stiffness = {value_lbin, kind}`:
- TWU misurata (`misurata`);
- oppure un parente TWU (`parente`);
- oppure la rigidità statica Racketpedia convertita sulla scala TWU con una regressione lineare sulle 48 coppie esatte, mostrando l'errore (`da Racketpedia`);
- oppure il giudizio dei tester (`qualitativo`).

È la grandezza mostrata come "Rigidità" ovunque, comparatore compreso.

### 5.3 Giudizio semplice per criterio
Criteri: Rigidità, Spin, Controllo, Potenza, Tenuta, Comfort.
- `livello` = 5 classi su un punteggio 0–100;
- punteggio = **70% laboratorio** (percentile) + **30% recensioni** (punteggio o giudizio dei tester), con i pesi rinormalizzati se una delle due parti manca;
- per i record "solo recensioni": 100% recensioni, con il badge;
- **"Rigidità" è descrittiva** (morbida ↔ rigida), non migliore o peggiore: non entra nel punteggio profilo.

### 5.4 Stiff Index (nome invariato)
Spiegazione corretta in tutta la pagina. È "allungamento − recupero" rispetto agli 11,25″: misura quanto la corda **non torna indietro** dopo la trazione. Nei dati è legato più alla perdita di tensione (r = 0,60 con TWU) che alla rigidità (r = −0,34). Va letto come **indice di cedimento**, non come rigidità.

### 5.5 Punteggio profilo
Formula invariata (pesi 35/25/20/20, penalità per le non gradite con la regola di dominanza). I sotto-punteggi ora vengono da §5.3, e lo spin da §5.1 con il margine. Una corda con spin di tipo `qualitativo` o `tester` ha il badge "stima".

## 6. Interfaccia (approccio A)

**Struttura:** navigazione a 4 voci, in basso su telefono e in alto su desktop.

### 6.1 Per te (home)
1. **Le 3 da provare.** Tre schede grandi; per ognuna: perché in una riga, tensione in kg e lbs, 6 barre con una parola, badge.
2. "Cosa dicono i tuoi gusti", in 3 righe.
3. Ricerca rapida per nome.
4. Liste pronte: come le tue preferite, più spin con lo stesso controllo, più durata.
5. Gli slider dei pesi stanno in un pannello chiudibile.

### 6.2 Mappa a quadranti
- Assi fissi di default: **Rigidità** (orizzontale, morbida → rigida) e **Spin** (verticale).
- Quattro zone con nome: "Vive da spin" (morbide, spin alto), "Compatte da spin" (rigide, spin alto), "Morbide e tranquille", "Controllo puro".
- All'inizio sono visibili solo le marche valutate più le 4 corde di riferimento; un interruttore mostra i concorrenti.
- I punti stimati sono **cerchi vuoti** con la barra d'errore dello spin.
- Toccando un punto si apre la scheda compatta, non la scheda intera.
- La legenda è a parole.
- Gli assi restano selezionabili in un menu "avanzate".

### 6.3 Confronta
- Da 2 a 4 corde come **schede affiancate**; su telefono scorrono in orizzontale, una per schermata, con indicatori a punti.
- Una riga per criterio: **Rigidità** (lb/in + giudizio, più Racketpedia e Stiff Index in piccolo), Spin (con il tipo di stima), Controllo, Potenza, Tenuta (TWU % + Excel TL6/TL12), Comfort, Tensione consigliata.
- Su ogni riga un segno "▲ più …" indica la corda in testa; per la rigidità è descrittivo ("più rigida"), non un premio.
- In cima, la frase di sintesi "passando da A a B…".

### 6.4 Esplora
- Su telefono: elenco di **schede compatte** con filtri (marca, calibro, forma, "solo marche valutate", "solo con dati di laboratorio").
- Su desktop: la tabella completa resta.

### 6.5 Scheda corda
- **Parte alta**, sempre visibile: nome, calibro, forma, badge, tensione, le 6 barre con parola + numero.
- **Sezioni chiudibili**: "Note dell'incordatore", "Dati di laboratorio" (Excel, TWU, Racketpedia con la spiegazione di ciascuno), "Cosa dicono i tester" (giudizi e punteggi per fonte, con link), "Controllo incrociato", "Somiglianza".

### 6.6 Guida
- Resta con il glossario.
- In più: la sezione "Perché le rigidità non coincidono" (dinamica contro statica, viscoelasticità, condizioni, risoluzione, r = 0,62 misurato);
- la spiegazione corretta dello Stiff Index;
- "Come stimiamo lo spin", con l'errore del modello.

## 7. Qualità e verifica

- **Test**:
  - completezza del catalogo (§3);
  - regola di priorità dello spin, dove un valore misurato non viene mai sovrascritto;
  - calibrazione tester → TWU con errore leave-one-out riportato;
  - fallback quando il modello non batte la media;
  - mix 70/30 con pesi rinormalizzati;
  - le stime escluse dalle distribuzioni dei percentili.
- La parità Python/JS del punteggio resta testata.
- **Controlli nel browser** a 375 px e su desktop, in chiaro e scuro:
  - nessuno scroll orizzontale nelle viste principali;
  - le schede del confronto scorrono su telefono;
  - i cerchi vuoti sulla mappa per le stime;
  - le sezioni chiudibili della scheda.
- **Revisione finale** indipendente con il modello più capace.

## 8. Fuori ambito

Prezzi e disponibilità; multifilamenti e ibridi; metriche Racketpedia a pagamento; trascrizioni integrali di video.
