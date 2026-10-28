# Banco Corde v3 — Specifica di design

Data: 2026-10-28 · Stato: bozza da revisionare · Sostituisce l'interfaccia della v2 (`2026-10-07-string-explorer-v2-design.md`); la pipeline v2 resta e viene estesa.

## 1. Perché una v3

L'utente: «Non sono soddisfatto. Non si capisce bene.»

L'audit del 2026-10-28 (pagina provata con Chromium a 390 px e 1280 px; numeri ricalcolati da `data/strings.json`) dice che **l'app mostra come lavora il modello invece di rispondere alla domanda dell'utente**:

| Sintomo | Misura |
|---|---|
| La risposta è sepolta | "Per te" su telefono è alta 6.455 px (≈ 8 schermate); "Confronta" con 3 corde ha 2.271 parole; la Guida 1.446 |
| Consigli che non portano a una scelta | La 2ª delle "3 da provare" è la **Confidential 1,20**, cioè la preferita in un altro calibro ("affinità 100/100") |
| Doppioni | 102 righe ma solo **53 modelli**: lo stesso modello compare in 3–6 calibri o colori (Kirschbaum Flash 6, Confidential 3, Hyper-G Round 3…) |
| Liste incoerenti | In "Migliori per te" compaiono la Confidential Soft (non gradita) e la O-TORO Snap ("dati contestati") al 4° posto |
| Confronto senza un punto di partenza | Schede verticali lunghe, nessun delta rispetto alla corda montata, Controllo e Comfort (stime dalla rigidità) trattati come criteri |
| Numeri che sembrano voti | "86 su 100" è una posizione tra 102 corde e cambia quando entra o esce una corda |
| Rumore | 8 tipi di badge; parole tecniche (percentile, gemello, parente, da modello) in ogni scheda |
| Mappa | Le barre d'errore di 30 spin stimati coprono i 54 misurati |
| Dati fermi | TWU riscaricato il 2026-10-28: identico allo snapshot; nessuna data per fonte nella pagina |

## 2. Decisioni dell'utente (2026-10-28)

| Tema | Decisione |
|---|---|
| Lavoro | **Due filoni in parallelo**: A interfaccia, B dati |
| Comparatore | **Entrambi**: confronto con la corda montata adesso **e** tab "Confronta" rifatta → un unico confronto che parte sempre dalla corda attuale |
| Dati | **Solo gratuiti**: il file Excel dell'utente + dati online (TWU, Racketpedia gratuito). Niente Racketpedia a pagamento |
| Prezzi | **Non interessano**: nessun dato di mercato |
| Dati personali | Nessun diario e nessuna app di misura: la "corda attuale" è un'impostazione nella pagina |
| Aggiornamento | **Manuale**: un comando che l'utente lancia, o chiede a Claude di lanciare |
| Interfaccia (parte 1 del design) | Approvata così com'è (§4) |

Restano valide tutte le regole del README (solo laboratorio nel punteggio, corde pre-2020 e fuori produzione tolte, stime marcate, recensioni solo come link).

## 3. Obiettivo e criteri di successo

**Obiettivo:** dalla corda che monti adesso, capire in 30 secondi quale provare dopo e perché; poter verificare ogni numero con un tocco.

**Successo =** (verificato con lo script Playwright di §7.3)
1. A 390 px, nella prima schermata: la corda attuale e il **nome + il perché** della 1ª consigliata.
2. "La tua corda" a 390 px è alta **≤ 2.500 px** (oggi 6.455).
3. Il confronto con 4 colonne ha **≤ 600 parole** (oggi 2.271 con 3 corde).
4. Nessun consiglio è un calibro/colore della corda attuale o di una preferita, né una non gradita, né una "dati contestati", né una corda con spin solo da modello.
5. Ogni numero mostrato apre, con un tocco, fonte + data di scaricamento + condizioni + margine.
6. Nessuno scroll orizzontale della pagina a 375 px (lo scroll interno della tabella di confronto è ammesso).
7. `py -m pipeline.refresh` riscarica le fonti, scrive cosa è cambiato e ricostruisce la pagina; se nulla cambia, non modifica nessun file.

## 4. Filone A — Interfaccia

### 4.1 Struttura

Da 4 tab + Guida a **3 schermate**, ciascuna con una sola domanda. La navigazione in basso su telefono resta.

| Schermata | Domanda | Sostituisce |
|---|---|---|
| **La tua corda** | Cosa provo dopo? | "Per te" |
| **Confronta** | In cosa cambia rispetto a quella che ho? | "Confronta" |
| **Esplora** | Dove sta ogni corda? | "Mappa" + "Esplora" |

La Guida diventa "Come leggere" (5 righe, apribili da ogni schermata) + "Metodo completo" in un pannello `<details>` in fondo a Esplora.

### 4.2 Corda attuale

- In cima a "La tua corda": selettore **modello + calibro** e tensione verticali/orizzontali in kg.
- Default: Solinco Confidential 1,25 a 22/21 kg (la prima preferita del profilo; l'utente la cambia se monta altro).
- La scelta resta salvata nel browser (`localStorage`, con `try/catch`; senza storage vale il default).
- La corda attuale è la colonna fissa del confronto e la base di tutte le differenze.

### 4.3 "La tua corda": 3 modelli da provare

**Candidati** (`web/recommend.js`, funzione pura):
1. record con `is_target`, `spin.kind ∈ {misurato, parente}`, punteggio non nullo, `crosscheck.verdict ≠ contradicted`, senza `disliked_warning`, non `preference = disliked`;
2. **escluso** ogni record con lo stesso `model_id` (§5.2) della corda attuale o di una preferita;
3. raggruppati per `model_id`: per ogni modello resta il calibro con il punteggio più alto; a parità, quello più vicino al calibro della corda attuale;
4. ordinati per punteggio profilo (regola invariata: spin 35, tenuta 20, affinità 20, −15 se simile a una non gradita); si mostrano i primi 3.

**Scheda consigliata** (sostituisce le 6 barre):
- nome del modello, calibro consigliato e forma; "1ª / 2ª / 3ª scelta". **Nessun numero 0–100.**
- **Una frase rispetto alla corda attuale**, generata dalle differenze (§4.5). Esempio: «Più spin (+1,3), più morbida (−45 lb/in), perde un po' più tensione (+8 punti)».
- Tre frecce ▲ ▼ = per spin, rigidità e perdita di tensione, con il valore della differenza.
- Tensione di partenza come intervallo, con il badge *stima* (§4.6).
- Azioni: **Confronta** (primaria, aggiunge la corda al confronto e apre la tab), **Scheda** (secondaria).

Sotto le 3 schede: «Altre 9 da considerare» in un elenco compatto (nome + frase), stesso filtro. Il campo di ricerca resta.

In fondo, chiuso: **Avanzate**, con i cursori dei pesi, l'ipotesi sui gusti (testo attuale `insight`, dichiarato come ipotesi da 4 corde) e l'elenco delle corde tolte (tabella filtrabile).

### 4.4 "Confronta"

- **Tabella affiancata.** Colonna 1 = corda attuale (fissa); fino a 3 candidate scelte con un solo campo "Aggiungi una corda" (ricerca), ognuna rimovibile con ×.
- Righe, nell'ordine: rigidità (lb/in), spin (scala TWU), perdita di tensione TWU (%), restituzione di energia (%), scorrimento corda-corda (attrito; più basso = scorre di più), attrito corda-palla, calibro, forma; poi, solo se c'è il dato Excel: allungamento a 50 lbs, TL6/TL12.
- Ogni cella: valore + differenza rispetto alla corda attuale (▲ ▼ =). Valori stimati con "≈" e stile tratteggiato; una sola legenda sotto la tabella. Dato assente: "non misurato" in testo, non "—".
- In alto: **una frase di sintesi** per ogni candidata, con la stessa funzione di §4.5.
- Telefono: la prima colonna resta fissa (`position: sticky`), le altre scorrono dentro la tabella; indicatore "1 di 3".
- **Tolti:** Controllo e Comfort (erano stime dalla rigidità).

### 4.5 Frase "rispetto alla tua corda"

Funzione pura `describeDelta(candidate, current)` in `web/recommend.js`, testata con `node --test`.

| Grandezza | "Simile" se \|Δ\| < | Parole |
|---|---|---|
| Spin (scala TWU) | 0,5 (= margine dei gemelli) | più spin / meno spin |
| Rigidità (lb/in) | 10 (≈ errore della correzione per calibro) | più rigida / più morbida |
| Perdita di tensione TWU (punti %) | 5 | perde più tensione / tiene meglio la tensione |

- Ordine delle parti: prima la differenza più grande in proporzione alla soglia; massimo 3 parti; se tutte sono "simili": «Molto simile alla tua corda».
- Se uno dei due valori è stimato, la parte dice «circa» e, se la differenza sta nel margine della stima, «simile (stima)».
- Se manca un dato su uno dei due lati, la parte non compare e la scheda dice «Mancano: …».

### 4.6 Tensione di partenza

La regola resta quella esistente (−0,75 kg ogni +15 lb/in di rigidità, arrotondata a 0,5 kg, limite ±2 kg; solo rigidità di laboratorio, cioè misurata, da gemello o da Racketpedia, mai la stima dal solo calibro) ma **parte dalla corda attuale e dalla sua tensione**, non dalla preferita "più simile". Se una delle due rigidità manca, nessuna correzione e il popover lo dice. Si mostra come intervallo ±1 kg (es. «21–23 / 20–22 kg»), sempre con il badge *stima*; il tocco spiega la regola e che non è validata. La funzione passa in `web/recommend.js` (`tensionFrom(candidate, current, kg)`), perché la corda attuale si sceglie nella pagina.

### 4.7 Provenienza di ogni numero

- Ogni valore numerico è un `<button class="val">`. Il tocco apre un popover con: fonte, data di scaricamento, condizioni (es. «TWU, 51 lbs, swing veloce»), tipo (misurato / gemello corretto per il calibro / Racketpedia convertita / stima da modello), margine, link alla fonte se c'è.
- Chiude con Esc, con un tocco fuori e con il pulsante ×; il focus torna al valore.
- I dati arrivano dal campo `prov` del record (§5.4).

### 4.8 Badge

Da 8 tipi a **3 categorie**, con una legenda unica in "Come leggere":

| Categoria | Stile | Casi |
|---|---|---|
| *tua* | pieno blu/arancio | preferita, non gradita, corda attuale |
| *stima* | contorno tratteggiato | spin o rigidità non misurati, solo catalogo |
| *attenzione* | contorno arancio | dati contestati, simile a una non gradita, anno o produzione da verificare |

Ogni badge ha il testo per esteso (non troncato) e una spiegazione al tocco, non solo al passaggio del mouse.

### 4.9 "Esplora"

- Un elenco/tabella **per modello** (53 righe); la riga si apre sui calibri. Colonne: rigidità, spin, perdita, restituzione di energia, forma, calibri; filtri come oggi.
- La mappa (rigidità × spin) sta sopra l'elenco; di default **solo valori misurati**, con l'interruttore «Mostra le stime» spento. Etichette solo per la corda attuale e le preferite; un tocco su un punto evidenzia la riga e la porta in vista.
- In fondo: «Metodo completo» (il testo della Guida attuale, aggiornato) e le fonti con la loro data.

### 4.10 Accessibilità e testo

- Target da 44 px, contrasto ≥ 4,5:1 per il testo (già fatto in v2, da mantenere).
- Una sola lingua: italiano. "Spin potential" → «spin (scala TWU)»; "snapback" → «scorrimento corda-corda»; unità sempre scritte.
- Numeri con la virgola decimale (`Intl.NumberFormat('it-IT')`).

## 5. Filone B — Dati

### 5.1 Nuove misure TWU (Compare Strings)

Nuovo modulo `pipeline/twu_compare.py`.

- **Fonte:** `https://twu.tennis-warehouse.com/learning_center/comparestrings.php` (elenco delle corde con codice prodotto) e `POST similarstringcompare.php` con `pcode` e `string1pcode` → JSON con `stiffness`, `tension`, `energy`, `COFstatic`, `COFball`, `ratio`, `material`, `current`. Provato il 2026-10-28: 1.196 corde nell'elenco; delle 184 poly delle nostre marche, 184 hanno la restituzione di energia e 171 lo spin.
- **Abbinamento:** testo dell'opzione == `twu_name` già abbinato (spazi normalizzati). Nessun nuovo abbinamento automatico per somiglianza.
- **Campi nuovi** nel record, dentro `twu`: `energy_return_pct`, `cof_string_string`, `cof_string_ball`, `twu_pcode`. Valore `"NA"` → `null`.
- **Controllo di coerenza:** rigidità e spin del Compare devono coincidere con la tabella principale (tolleranza 1 lb/in e 0,1). Se non coincidono, il record non prende i campi nuovi e la riga finisce in `data/changes/…` come anomalia.
- **Solo misure:** i campi nuovi valgono solo per `match ∈ {exact, probable}`. Per le righe `proxy` (altro calibro) restano `null` e la UI scrive «non misurato». Nessuna stima nuova.
- **Ritmo:** una richiesta ogni 0,5 s, solo per le righe abbinate (≈ 120), `User-Agent` come il resto della pipeline; risposte salvate in `data/raw/twu_compare.json`.
- Lo spin TWU è il rapporto tra attrito corda-palla e attrito corda-corda: i due attriti **non** sono criteri indipendenti dallo spin e non entrano nel punteggio. Si mostrano per spiegare *da dove* viene lo spin.

**Da verificare durante l'implementazione:** la prova ha trovato nel Compare voci con il calibro esatto per alcune corde che oggi usano un gemello (es. "Babolat RPM Blast 17/1.25", "Kirschbaum Competition 17 (1.25)"). Ognuna va verificata a mano (stessa corda? stesso calibro?) prima di cambiare `matches.json`; il controllo di nomi fatto finora è troppo largo (ha confuso Confidential e Confidential Soft).

### 5.2 Modello e famiglia

- `model_id = slug(brand + " " + base_model(model))`, con `base_model` già esistente in `pipeline/estimate.py` (toglie i colori). Esempi: tutti i Kirschbaum Flash → `kirschbaum-flash`; Confidential ≠ Confidential Soft; O-Toro ≠ O-Toro Tour.
- Calcolato in `build.py` per ogni record; test sui casi sopra.

### 5.3 Pulizia

- `derive.judgments()`: togliere la miscela 70/30 con le recensioni e `lab_share` (codice morto: `build` non passa più recensioni).
- Togliere `control` e `comfort` (stime dalla rigidità; `power` è già stata tolta in v2) da `subscores` e `judgments`, e `PROXY_CRITERIA`. Restano `stiffness`, `spin`, `durability` e `affinity`: il punteggio non cambia, perché usa solo spin, tenuta e affinità. Sparisce anche la lista "Più spin, stesso controllo", che filtrava su `control`.
- `tension_start` resta in Python solo per i test di parità; la pagina usa `tensionFrom` (§4.6). Un test JS verifica che, quando la corda attuale è l'ancora che `tension_start` sceglie per quella candidata (`tension_start.from`) alla sua tensione di default, il risultato sia identico a `tension_start.kg`.
- I numeri citati nei testi della pagina (r, errori, n) si leggono da `estimates_meta`; un test cerca nel JS cifre scritte a mano per queste grandezze.

### 5.4 Provenienza

- `data/raw/sources.json`: `{twu: {fetched, url}, twu_compare: {fetched, url}, racketpedia: {fetched, url}, excel: {file, modified}}`. Lo scrivono gli script di scaricamento.
- Nuova funzione `provenance(rec, sources, meta)` in `pipeline/provenance.py` → `rec["prov"] = {campo: {source, fetched, conditions, kind, margin, url}}` per: `stiffness`, `spin`, `tension_loss`, `energy_return`, `cof_string_string`, `cof_string_ball`, `excel.*`.
- `kind` usa le parole della UI: «misurato», «da calibro gemello, corretto per il diametro», «da Racketpedia convertita», «stima da modello».

### 5.5 Aggiornamento manuale: `py -m pipeline.refresh`

1. Riscarica la tabella TWU, il Compare (solo righe abbinate) e le liste Racketpedia delle nostre marche; legge il file Excel più recente in `data/source/`.
2. Confronta con i dati attuali:
   - **corde nuove** in ambito (`scope.in_scope`, 1,18–1,30 mm, poly);
   - **valori cambiati** (soglie: 1 lb/in, 0,1 spin, 1 punto %);
   - **corde sparite** dalla fonte.
3. Una corda nuova entra da sola **solo se** il suo `string_id` coincide con un record esistente senza dato da quella fonte (abbinamento certo). Le altre vanno in `data/pending_matches.json` per una revisione a mano.
4. Se qualcosa è cambiato: aggiorna i file in `data/raw/`, esegue `merge → build → build_page`, scrive `data/changes/AAAA-MM-GG.md` (in italiano: novità, valori cambiati, sparite, anomalie, da abbinare) e stampa il riepilogo.
5. Se nulla è cambiato: stampa «Nessuna novità» e non tocca nessun file.
6. Opzione `--offline`: rifà solo il confronto e la build dagli snapshot, senza rete (per i test e per lavorare senza connessione).

La ripubblicazione dell'Artifact resta un passo esplicito (si chiede a Claude), come oggi.

## 6. Contratto tra i due filoni

Il filone A lavora su `data/strings.json` e deve funzionare **anche prima** che il filone B finisca: tutti i campi nuovi sono opzionali.

| Campo | Tipo | Se manca |
|---|---|---|
| `model_id` | string | la UI lo calcola con la stessa regola (`recommend.js`), così i test JS non dipendono dalla pipeline |
| `twu.energy_return_pct`, `twu.cof_string_string`, `twu.cof_string_ball` | number \| null | riga «non misurato» |
| `prov` | oggetto per campo | il popover mostra solo il tipo (`spin.kind`, `stiffness.kind`) |
| `sources` (in testa al file) | oggetto | «data non disponibile» |

Rimossi da B: `derived.subscores.control/comfort`, `derived.judgments.control/comfort`, `derived.judgments.*.lab_share`. A smette di leggerli **prima** che B li tolga (ordine nel piano).

## 7. Test e verifica

### 7.1 Python (pytest)
- `twu_compare`: parsing dell'elenco (fixture HTML ridotta), JSON con `"NA"`, controllo di coerenza, abbinamento solo per nome esatto.
- `refresh`: con snapshot finti (fixture) → corda nuova certa, corda nuova da abbinare, valore cambiato, nessun cambiamento = nessun file scritto.
- `model_id`: colori uniti, famiglie diverse separate.
- `provenance`: un caso per ogni `kind`.
- Pulizia: `subscores` senza `control/comfort`; punteggi identici a prima (test di regressione sui 102 record attuali).

### 7.2 JS (`node --test`)
- `recommend.js`: esclusione dei parenti della corda attuale e delle preferite; un solo calibro per modello; ordine; nessuna corda con spin da modello.
- `describeDelta`: soglie, stime («circa», «simile (stima)»), dati mancanti, massimo 3 parti.
- `tensionFrom`: parità con `tension_start` quando la corda attuale è l'ancora scelta da `tension_start`; limite ±2 kg; nessuna correzione senza rigidità di laboratorio.
- `score.js`: parità esistente invariata.

### 7.3 Pagina (Playwright, script in `tests/ui/check_page.mjs`)
Misura i criteri 1–3 e 6 di §3 a 390 px e 1280 px e salva gli screenshot in `docs/audit/v3/`. Controlla anche che i popover si aprano con un tocco e si chiudano con Esc.

## 8. Fuori ambito

- Prezzi, disponibilità e negozi.
- Diario d'incordatura, letture con app acustiche, ERT.
- Racketpedia a pagamento.
- Aggiornamento automatico programmato e backend.
- Nuove stime (spin o rigidità) oltre a quelle della v2; cambiamenti ai pesi del punteggio.
- Fonti scartate dopo la ricerca del 2026-10-28: StringSpec (stessi campi di TWU, quindi rielaborazione), Cross et al. 2000 (corde di 25 anni fa), forum e riviste (nessun valore misurato), schede dei produttori (solo descrizioni), articoli di Tennisnerd (autore di parte).

## 9. Rischi

| Rischio | Mitigazione |
|---|---|
| TWU cambia il formato o blocca le richieste | Snapshot in `data/raw/`; `refresh` fallisce con un messaggio chiaro e non sovrascrive nulla; `--offline` |
| La frase automatica suona meccanica o sbagliata | Test con i casi reali delle 3 consigliate; revisione a schermo nel task finale |
| Togliere il numero 0–100 nasconde perché una corda è prima | La frase e le frecce dicono il perché; i pesi restano in "Avanzate" |
| Tabella di confronto stretta su telefono | Colonna fissa + scorrimento interno + "1 di 3"; criterio §3.6 verificato da Playwright |
| Due filoni che si pestano i piedi | Contratto §6; A non legge mai campi rimossi da B; B toglie i campi solo dopo il task A che smette di usarli |
