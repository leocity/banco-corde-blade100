# Banco Corde v3 — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rifare la pagina intorno alla domanda "cosa monto adesso → cosa provo dopo, e perché" e aggiungere alla pipeline le nuove misure TWU, la provenienza di ogni numero e un aggiornamento manuale che dice cosa è cambiato.

**Architecture:** Due filoni con un contratto sui campi di `data/strings.json` (spec §6). **A (interfaccia):** `web/app.js` si divide in moduli piccoli che `build_page` concatena in un'unica pagina; la logica pura (consigli, frase sulle differenze, tensione) sta in `web/recommend.js` con test `node --test`. **B (dati):** nuovi moduli `pipeline/twu_compare.py`, `pipeline/provenance.py`, `pipeline/refresh.py`; `build.py` aggiunge `model_id` e `prov`. I task A e B fino ad A6/B4 sono indipendenti; B5 (pulizia) va per ultimo.

**Tech Stack:** come v2: Python 3 (`py` su Windows, `python3` qui), pytest, openpyxl; JS vanilla in moduli ES; `node --test`; Playwright già installato (`require('playwright')`, niente `playwright install`).

**Spec:** `docs/superpowers/specs/2026-10-28-banco-corde-v3-design.md`

## Global Constraints

- Solo dati gratuiti: file Excel dell'utente, TWU, Racketpedia gratuito. Niente prezzi, niente dati personali, niente Racketpedia a pagamento.
- Solo laboratorio nel punteggio. Pesi invariati: spin 35, tenuta 20, affinità 20; −15 se simile a una non gradita (soglia 75). Le recensioni restano solo link.
- Nessuna stima nuova. I campi TWU nuovi valgono solo per `match ∈ {exact, probable}`; altrimenti `null` → «non misurato».
- Corda attuale di default: `solinco-confidential-16l` a 22/21 kg. Salvata in `localStorage` (chiave `banco-corde:current`) sempre dentro `try/catch`.
- Niente numero 0–100 visibile nelle schede dei consigli e nel confronto.
- Soglie "simile": spin 0,5; rigidità 10 lb/in; perdita di tensione 5 punti.
- Tensione: −0,75 kg ogni +15 lb/in, arrotondata a 0,5 kg, limite ±2 kg, solo rigidità di laboratorio (`misurata`, `parente`, `da Racketpedia`); intervallo mostrato ±1 kg; badge *stima*.
- Badge in 3 categorie: *tua*, *stima*, *attenzione*.
- UI solo in italiano, numeri con `Intl.NumberFormat('it-IT')`, unità sempre scritte; target tocco ≥ 44 px; testo con contrasto ≥ 4,5:1; nessuno scroll orizzontale della pagina a 375 px.
- Aggiornamento solo manuale (`py -m pipeline.refresh`); nessun file modificato se non cambia nulla. TWU: una richiesta ogni 0,5 s.
- Criteri misurati da Playwright: prima schermata a 390 px con corda attuale + nome e perché della 1ª consigliata; "La tua corda" ≤ 2.500 px a 390 px; confronto a 4 colonne ≤ 600 parole.

## Review Focus

1. **Corda attuale senza dati di laboratorio** (es. una "solo catalogo" o con spin da modello): niente crash, la frase dice «Mancano: …», la tensione resta senza correzione. Test in Task A1.
2. **Nel browser resta salvato un id che non c'è più** (corda tolta da un aggiornamento) o un valore corrotto: la pagina torna al default senza errori. Test in Task A1 (`resolveCurrent`) e verifica in Task A6.
3. **Corda attuale = una non gradita o una concorrente**: le esclusioni per modello valgono lo stesso e la lista dei consigli non è vuota. Test in Task A1.
4. **Meno di 3 candidate** (es. tutti i pesi a 0 o filtri stretti): la pagina mostra quelle che ci sono e una frase che lo dice, nessuna scheda vuota. Test in Task A1 e Task A3.
5. **TWU risponde con HTML, JSON rotto o va giù a metà aggiornamento**: `refresh` si ferma con un messaggio e non sovrascrive nessun file. Test in Task B4.

---

## Filone A — Interfaccia

### Task A1: Logica pura dei consigli (`web/recommend.js`)

**Files:**
- Create: `web/recommend.js`, `web/recommend.test.mjs`

**Interfaces — Produces** (tutte esportate):
- `COLOURS`: stessa lista di `pipeline/estimate.py:10-11`.
- `modelId(r) -> string`: `r.model_id` se c'è; altrimenti slug di `brand + " " + baseModel(model)` (minuscolo, parole separate da spazi o `-`, colori tolti, tutto ciò che non è `[a-z0-9]` → `-`, trattini ai bordi tolti).
- `THRESHOLDS = { spin: 0.5, stiffness: 10, loss: 5 }`
- `values(r) -> { spin: {v, approx, margin}|null, stiffness: {...}|null, loss: {...}|null }`. Spin da `r.spin` (`approx` se `kind !== 'misurato'`, `margin = (high-low)/2`); rigidità da `r.stiffness` (`approx` se `kind !== 'misurata'`); perdita da `r.twu.tension_loss_pct` (`approx` se `r.twu.match` non è `exact`/`probable`, `margin` 0).
- `candidates(all, current, likedIds, scoreOf) -> record[]` (`current` è il record della corda attuale): regole della spec §4.3, punti 1–4; `scoreOf(r)` restituisce il punteggio live (o `null`). Esclusi i record con `spin.kind` diverso da `misurato`/`parente`.
- `describeDelta(cand, cur) -> { parts: [{key: 'spin'|'stiffness'|'loss', dir: 'up'|'down'|'same', delta: number, approx: boolean, text: string}], missing: string[], sentence: string }`
- `tensionFrom(cand, cur, kg: [number, number]) -> { kg: [v, h], range: [[v-1, v+1], [h-1, h+1]], lbs: [v, h], corrected: boolean, delta: number }`: usa `kgToLbs` di `score.js`.
- `resolveCurrent(stored, byId, fallbackId = 'solinco-confidential-16l') -> { id, kg }`: accetta solo `{id: string presente in byId, kg: [n, n]}` con kg tra 15 e 30; altrimenti `{id: fallbackId, kg: [22, 21]}`.

- [ ] **Step 1: Test che falliscono** in `web/recommend.test.mjs`, con record minimi costruiti nel test:
  - `modelId`: `Kirschbaum Flash Black` e `Kirschbaum Flash Orange` → `kirschbaum-flash`; `Solinco Confidential` ≠ `Solinco Confidential Soft`; `Toroline O-Toro` ≠ `Toroline O-Toro Tour`.
  - `candidates`: con corda attuale Confidential 1,25 e preferite `['solinco-confidential-16l','toroline-o-toro-17']`, nessun risultato ha `modelId` `solinco-confidential` o `toroline-o-toro`; un solo record per modello; esclusi `preference: 'disliked'`, `crosscheck.verdict: 'contradicted'`, `derived.disliked_warning: true`, `spin.kind: 'modello'`, `is_target: false`; a pari punteggio vince il calibro più vicino a quello della corda attuale.
  - `candidates` con corda attuale = una non gradita (RPM Blast): il risultato non è vuoto e non contiene `babolat-rpm-blast`.
  - `candidates` con `scoreOf = () => null`: restituisce `[]` senza errori.
  - `describeDelta`: spin 7,7 contro 6,4 → parte `{key:'spin', dir:'up', delta:1.3}` e testo «più spin (+1,3)»; rigidità 166 contro 212 → «più morbida (−46 lb/in)»; perdita 44 contro 22 → «perde più tensione (+22 punti)»; tutte sotto soglia → `sentence === 'Molto simile alla tua corda'`; con spin stimato e |Δ| ≤ margine → testo «spin simile (stima)»; con spin stimato e |Δ| > margine → testo che inizia con «circa»; corda attuale senza spin → `missing` contiene `'spin'` e la frase finisce con «Mancano: spin»; al massimo 3 parti, ordinate per |Δ|/soglia decrescente.
  - `tensionFrom`: candidata 30 lb/in più rigida → `delta === -1.5`, `kg` = tensione attuale − 1,5; 80 lb/in → limitato a −2; rigidità della candidata con `kind: 'modello'` → `corrected === false` e `kg` uguale alla tensione attuale.
  - parità con la pipeline: per ogni record di `data/strings.json` con `derived.tension_start` e `from` ∈ ancore, `tensionFrom(r, BY_ID[from], ANCHOR_TENSIONS[from]).kg` è uguale a `derived.tension_start.kg` (ancore e tensioni come in `pipeline/derive.py:10`).
  - `resolveCurrent`: `null`, `'x'`, `{id:'sparita', kg:[22,21]}`, `{id:'solinco-confidential-16l', kg:[99,21]}` → default; un valore valido → restituito così com'è.
- [ ] **Step 2:** `node --test web/` → FAIL (modulo mancante).
- [ ] **Step 3:** Implementa `web/recommend.js` (importa `kgToLbs` da `./score.js`). I testi usano `Intl.NumberFormat('it-IT')` con 1 decimale per lo spin e 0 per lb/in e punti, segno sempre esplicito (`+`/`−`, U+2212).
- [ ] **Step 4:** `node --test web/` → PASS (anche `score.test.mjs`).
- [ ] **Step 5:** Commit `feat(web): logica pura dei consigli rispetto alla corda attuale`.

### Task A2: Pagina a moduli, tre schermate, corda attuale, provenienza, badge

**Files:**
- Modify: `pipeline/build_page.py`, `tests/test_build_page.py`, `web/template.html`, `web/style.css`
- Create: `web/format.js` (formati, `esc`, nomi, `SHAPES`, `SPIN_KIND`, `STIFF_KIND`, lettura di `ALL`/`BY_ID`), `web/prov.js` (popover), `web/badges.js`, `web/current.js` (selettore della corda attuale)
- Modify: `web/app.js` (diventa solo avvio, tab e stato condiviso)

**Interfaces:**
- Consumes: `resolveCurrent`, `modelId` (Task A1).
- Produces:
  - `pipeline/build_page.py`: `MODULES = ["score.js", "recommend.js", "format.js", "prov.js", "badges.js", "current.js", "home.js", "compare.js", "explore.js", "app.js"]`; `_js()` li concatena in quest'ordine, togliendo le righe `import …;` e il prefisso `export `. Un modulo mancante viene saltato, così la pagina si costruisce anche tra un task e l'altro.
  - `web/prov.js`: `valButton(r, field, html) -> string` (un `<button class="val" data-prov="<id>|<field>">`); `initProv()` registra un solo gestore di clic, apre un popover con fonte, data, condizioni, tipo, margine, link (da `r.prov[field]`, o in mancanza solo il tipo da `r.spin.kind`/`r.stiffness.kind`); si chiude con Esc, con un tocco fuori e con ×; il focus torna al pulsante.
  - `web/badges.js`: `badges(r, current) -> string` con le 3 categorie della spec §4.8 (classi `badge mine`, `badge est`, `badge warn`); ogni badge è un `<button>` con la spiegazione al tocco (stesso popover di `prov.js`).
  - `web/current.js`: `getCurrent() -> {id, kg}`, `setCurrent({id, kg})`, `renderCurrentPicker(el)`, evento `document` `'current-change'` dopo ogni cambio.
  - `template.html`: tab `casa` («La tua corda»), `confronta`, `esplora`; tolto il pulsante Guida e la sezione `guida`; aggiunto `<div id="prov-pop" role="dialog" hidden>`; contenitori `#current`, `#home-top`, `#home-more`, `#home-adv`, `#cmp`, `#explore`.
- [ ] **Step 1: Test che falliscono** in `tests/test_build_page.py`:
  - `test_modules_in_order`: con file temporanei finti, `_js()` contiene `score.js` prima di `app.js` e nessun `import ` o `export ` in testa a una riga.
  - `test_no_duplicate_top_level_names`: nei moduli reali di `web/` (solo i file presenti in `MODULES`), nessun nome dichiarato a inizio riga con `const|let|function|class` compare in due moduli (sono concatenati nello stesso scope).
- [ ] **Step 2:** `python3 -m pytest tests/test_build_page.py -q` → FAIL.
- [ ] **Step 3:** Implementa `MODULES` e `_js()`; sposta da `app.js` a `format.js` i formati e i nomi; scrivi `prov.js`, `badges.js`, `current.js`; aggiorna `template.html` e `style.css` (popover, badge, selettore). Le tre schermate per ora possono essere vuote: le riempiono A3–A5.
- [ ] **Step 4:** `python3 -m pytest -q` e `node --test web/` → PASS; `python3 -m pipeline.build_page` genera la pagina; apri `dist/preview.html` con Playwright a 390 px: nessun errore in console, il selettore mostra «Solinco Confidential 1,25 · 22/21 kg», cambiando corda e ricaricando la scelta resta.
- [ ] **Step 5:** Commit `feat(web): pagina a moduli, corda attuale, provenienza e badge`.

### Task A3: Schermata "La tua corda"

**Files:**
- Create: `web/home.js`
- Modify: `web/style.css`, `web/app.js` (chiama `renderHome()` all'avvio e su `'current-change'`)

**Interfaces:**
- Consumes: `candidates`, `describeDelta`, `tensionFrom`, `modelId` (A1); `getCurrent`, `valButton`, `badges` (A2); `profileScore` (score.js).
- Produces: `renderHome()`; ogni scheda ha i pulsanti `data-compare="<id>"` (primario) e `data-open="<id>"` (secondario), che A4 e la scheda dettaglio usano.
- [ ] **Step 1:** Implementa `renderHome()` secondo la spec §4.3: le 3 schede (nome, calibro e forma, «1ª/2ª/3ª scelta», `sentence`, tre frecce con la differenza, tensione «v–v / h–h kg» con il badge *stima*), poi «Altre N da considerare» (fino a 9, nome + frase), il campo di ricerca e il pannello chiuso **Avanzate** (cursori dei pesi spostati da `app.js`, testo `DATA.insight` con la nota «ipotesi da 4 corde», tabella filtrabile di `DATA.removed_discontinued`). Con meno di 3 candidate: mostra quelle che ci sono e la frase «Solo N corde rispettano i criteri: allarga i pesi in Avanzate.»
- [ ] **Step 2:** Sposta in `home.js` la scheda dettaglio (`openSheet`) da `app.js`, togliendo le barre di Controllo e Comfort e il punteggio 0–100; i numeri passano da `valButton`.
- [ ] **Step 3:** Build e verifica con Playwright a 390 px: nella prima schermata (844 px) si leggono il selettore della corda attuale e il nome + la frase della 1ª consigliata; altezza del documento ≤ 2.500 px; nessuna delle 3 è Confidential (qualsiasi calibro) o O-Toro; tutti i pesi a 0 → nessun errore in console, frase "Solo N corde…".
- [ ] **Step 4:** `python3 -m pytest -q` e `node --test web/` → PASS. Commit `feat(web): schermata La tua corda`.

### Task A4: Confronto affiancato

**Files:**
- Create: `web/compare.js`
- Modify: `web/style.css`, `web/app.js`

**Interfaces:**
- Consumes: `describeDelta`, `values` (A1); `getCurrent`, `valButton`, `badges` (A2); i pulsanti `data-compare` (A3).
- Produces: `addToCompare(id)`, `renderCompare()`; lista salvata in `localStorage` `banco-corde:compare` (massimo 3 id validi, corda attuale esclusa).
- [ ] **Step 1:** Implementa la tabella della spec §4.4: colonna 1 = corda attuale (`position: sticky; left: 0`), fino a 3 candidate con × per toglierle, un campo «Aggiungi una corda» con ricerca sui nomi completi; righe nell'ordine della spec (rigidità, spin, perdita TWU, restituzione di energia, scorrimento corda-corda, attrito corda-palla, calibro, forma; poi allungamento a 50 lbs e TL6/TL12 solo se almeno una colonna ha l'Excel). Celle: `valButton` + differenza ▲▼= rispetto alla corda attuale con le soglie di `THRESHOLDS` (per le righe senza soglia nella spec la differenza si mostra senza parola); «≈» e tratteggio per le stime; «non misurato» se manca. Sopra la tabella, una frase `describeDelta(...).sentence` per candidata; sotto, una sola legenda. Su telefono, l'indicatore «1 di 3» segue lo scorrimento della tabella.
- [ ] **Step 2:** Build e verifica con Playwright: a 390 px con 3 candidate la pagina non scorre in orizzontale (`document.documentElement.scrollWidth <= 390`), la prima colonna resta visibile dopo uno scorrimento orizzontale della tabella; a 1280 px il testo dentro `#cmp` ha ≤ 600 parole; un id salvato che non esiste più viene scartato senza errori.
- [ ] **Step 3:** `python3 -m pytest -q` e `node --test web/` → PASS. Commit `feat(web): confronto affiancato con la corda attuale`.

### Task A5: Esplora (mappa + elenco per modello + metodo)

**Files:**
- Create: `web/explore.js`
- Modify: `web/style.css`, `web/app.js`

**Interfaces:**
- Consumes: `modelId` (A1); `valButton`, `badges`, `getCurrent` (A2); `DATA.sources` (B3; se manca: «data non disponibile»).
- Produces: `renderExplore()`, `drawScatter()`.
- [ ] **Step 1:** Elenco per modello (spec §4.9): una riga per `modelId` con rigidità, spin, perdita, restituzione di energia, forma e calibri (valori del calibro più vicino a quello della corda attuale); la riga si apre sui calibri. Filtri: ricerca, marca, forma, «solo marche valutate», «solo con test di laboratorio» (filtri salvati in `localStorage`).
- [ ] **Step 2:** Sposta la mappa da `app.js` a `explore.js`: «Mostra le stime» spento di default; etichette solo per la corda attuale e le preferite; un tocco su un punto apre la riga del modello nell'elenco e la porta in vista. Resta la nota sulle corde senza dati (oggi `renderMapStatus`).
- [ ] **Step 3:** In fondo, `<details>` «Metodo completo»: il testo dell'attuale `renderGuide()` aggiornato (tolti Controllo/Comfort/Potenza e i riferimenti alla Guida), più le fonti con la data da `DATA.sources`; e «Come leggere» (5 righe con la legenda dei 3 badge), che si apre anche dal link «Come leggere» presente in cima a ogni schermata.
- [ ] **Step 4:** Build e verifica con Playwright a 390 e 1280 px: con «Mostra le stime» spento la mappa disegna solo punti misurati; l'elenco ha 53 righe con tutti i filtri spenti e le marche non valutate incluse (o il numero di modelli presenti in `strings.json` in quel momento). Commit `feat(web): Esplora per modello con mappa e metodo`.

### Task A6: Controllo della pagina e documentazione

**Files:**
- Create: `tests/ui/check_page.mjs`
- Modify: `README.md`; output `docs/audit/v3/*.png`

**Interfaces:**
- Consumes: la pagina costruita (`dist/preview.html`).
- [ ] **Step 1:** Scrivi `tests/ui/check_page.mjs` (Node + Playwright; argomento: percorso di `preview.html`). A 390×844 e 1280×900 controlla: i criteri 1–3 e 6 della spec §3 (con 3 candidate nel confronto; per il criterio 3 aggiunge la 4ª colonna = corda attuale); popover che si apre con un clic su un `.val` e si chiude con Escape; `localStorage` con `banco-corde:current = {"id":"sparita","kg":[22,21]}` → la pagina mostra il default e la console non ha errori. Salva gli screenshot di ogni schermata in `docs/audit/v3/`. Esce con codice 1 e un elenco dei criteri falliti se qualcosa non va.
- [ ] **Step 2:** `python3 -m pipeline.build_page && node tests/ui/check_page.mjs dist/preview.html` → tutti i criteri OK. Correggi la pagina finché non passa.
- [ ] **Step 3:** README: sezione "Regole attuali" (corda attuale, niente 0–100, 3 badge), sezione "Comandi" (`node --test web/`, `node tests/ui/check_page.mjs dist/preview.html`, `py -m pipeline.refresh`), struttura dei moduli `web/`. Commit `test(ui): controllo automatico della pagina v3; docs`.

---

## Filone B — Dati

### Task B1: `model_id` nei record

**Files:**
- Modify: `pipeline/estimate.py`, `pipeline/build.py`, `tests/test_build_v2.py`

**Interfaces:**
- Produces: `model_id(brand: str, model: str) -> str` in `pipeline/estimate.py` (accanto a `base_model`), stessa regola di `modelId` del Task A1; `build()` imposta `r["model_id"]` su ogni record.
- [ ] **Step 1: Test che falliscono:** gli stessi tre casi del Task A1 (Kirschbaum Flash Black/Orange → `kirschbaum-flash`; Confidential ≠ Confidential Soft; O-Toro ≠ O-Toro Tour); dopo `build()` ogni record ha `model_id`.
- [ ] **Step 2:** `python3 -m pytest tests/test_build_v2.py -q` → FAIL. Implementa. → PASS.
- [ ] **Step 3:** `python3 -m pipeline.build`; controlla che i modelli distinti siano 53 con i dati di oggi. Commit `feat(pipeline): model_id per raggruppare calibri e colori`.

### Task B2: Nuove misure TWU (`pipeline/twu_compare.py`)

**Files:**
- Create: `pipeline/twu_compare.py`, `tests/test_twu_compare.py`, `tests/fixtures/twu_compare_options.html` (ridotta a ~10 `<option>`), output `data/raw/twu_compare.json`
- Modify: `pipeline/merge.py`, `tests/test_merge.py`

**Interfaces:**
- Produces:
  - `parse_options(html: str) -> dict[str, str]` (nome normalizzato con spazi singoli → `pcode`)
  - `parse_compare(payload: str) -> dict` → `{pcode, stiffness_lbin, tension_loss_pct, energy_return_pct, cof_string_string, cof_string_ball, spin_potential, material}` con `"NA"`/vuoto → `None`; solleva `ValueError` se il JSON non è valido o manca `pcode1`.
  - `fetch_compare(names: list[str], pause=0.5) -> dict[str, dict]` (chiave = `twu_name`), legge l'elenco una volta e poi fa una richiesta POST per nome a `similarstringcompare.php` con `pcode` e `string1pcode` uguali.
  - `consistent(row: dict, twu: dict) -> bool`: `|Δ rigidità| ≤ 1` e `|Δ spin| ≤ 0,1` (se uno dei due spin è `None`, conta solo la rigidità).
  - `merge(...)` riceve `twu_compare: dict` (opzionale, default `{}`) e, solo se `match ∈ {exact, probable}` e `consistent`, aggiunge a `rec["twu"]` `energy_return_pct`, `cof_string_string`, `cof_string_ball`, `twu_pcode`; altrimenti mette questi tre campi a `None` e, se l'incoerenza è il motivo, aggiunge l'id a una lista restituita come secondo valore di `merge_compare(records, twu_compare) -> (records, anomalies)`.
  - `__main__`: legge i `twu_name` abbinati da `data/agents/matches.json`, scarica, scrive `data/raw/twu_compare.json` e aggiorna `data/raw/sources.json` alla chiave `twu_compare` (vedi B3).
- [ ] **Step 1: Test che falliscono:** `parse_options` sulla fixture (spazi doppi normalizzati); `parse_compare` sul JSON reale del 2026-10-28 per Yonex Poly Tour Spin 16L (`stiffness 214, tension 27, energy 89, COFstatic 0.1, COFball 0.632, ratio 6.3`) e su uno con `"NA"`; `parse_compare("<html>")` → `ValueError`; `merge_compare`: riga `exact` coerente → campi presenti; riga `proxy` → campi `None`; riga `exact` con rigidità diversa di 5 → campi `None` e id in `anomalies`.
- [ ] **Step 2:** `python3 -m pytest tests/test_twu_compare.py tests/test_merge.py -q` → FAIL. Implementa. → PASS.
- [ ] **Step 3:** Esegui `python3 -m pipeline.twu_compare` (rete), poi `merge` e `build`. Riporta nel messaggio di commit quante righe hanno ottenuto i campi e quante anomalie. Commit `feat(pipeline): restituzione di energia e attriti da TWU Compare`.
- [ ] **Step 4:** Verifica a mano le voci del Compare con calibro esatto per le corde che oggi usano un gemello (spec §5.1: es. "Babolat RPM Blast 17/1.25", "Kirschbaum Competition 17 (1.25)"). Solo quelle confermate (stesso prodotto e stesso calibro, in base al nome TWU e alla scheda del produttore) cambiano `data/agents/matches_overrides.json`; elenca nel commit quelle accettate e quelle scartate con il motivo. Commit `data: abbinamenti TWU esatti verificati`.

### Task B3: Provenienza e date delle fonti

**Files:**
- Create: `pipeline/provenance.py`, `tests/test_provenance.py`
- Modify: `pipeline/twu_extract.py`, `pipeline/rpedia_site.py`, `pipeline/excel_extract.py`, `pipeline/build.py` (chiama `apply_provenance` e scrive `out["sources"]`)

**Interfaces:**
- Produces:
  - `record_source(key: str, url: str | None = None, file: str | None = None, path="data/raw/sources.json") -> None`: scrive `{key: {"fetched": date.today().isoformat(), "url": url}}` (per l'Excel `{"file": ..., "modified": <data del file>}`) senza toccare le altre chiavi. La chiamano i `__main__` di `twu_extract`, `twu_compare`, `rpedia_site`, `excel_extract`.
  - `provenance(rec: dict, sources: dict, meta: dict) -> dict` → `{campo: {source, fetched, conditions, kind, margin, url}}` per `stiffness`, `spin`, `tension_loss`, `energy_return`, `cof_string_string`, `cof_string_ball`, `excel` (presente solo se il dato esiste). `kind` con le parole della spec §5.4; `conditions` per TWU = `f"{ref_tension_lbs} lbs, swing veloce"`; `margin` da `low/high` delle stime (metà dell'intervallo), `None` per le misure.
  - `apply_provenance(records, sources, meta) -> None` imposta `r["prov"]`.
- [ ] **Step 1: Test che falliscono:** un caso per ogni `kind` di rigidità (`misurata`, `parente`, `da Racketpedia`, `modello`) e di spin (`misurato`, `parente`, `modello`); `energy_return` assente se `twu.energy_return_pct` è `None`; `record_source` conserva le chiavi già presenti.
- [ ] **Step 2:** `python3 -m pytest tests/test_provenance.py -q` → FAIL. Implementa. → PASS.
- [ ] **Step 3:** Crea `data/raw/sources.json` con le date reali degli snapshot esistenti (TWU e Racketpedia: data dell'ultimo commit che li ha modificati, `git log -1 --format=%cs -- <file>`; Excel: data del file), poi `merge`/`build`/`build_page`. Commit `feat(pipeline): provenienza di ogni numero e date delle fonti`.

### Task B4: Aggiornamento manuale (`pipeline/refresh.py`)

**Files:**
- Create: `pipeline/refresh.py`, `tests/test_refresh.py`, fixture in `tests/fixtures/refresh/` (snapshot TWU e Racketpedia ridotti: "prima" e "dopo")
- Output: `data/changes/AAAA-MM-GG.md`, `data/pending_matches.json`

**Interfaces:**
- Consumes: `parse_twu` (twu_extract), `fetch_compare` (B2), `parse_brand_page`/scaricamento di `rpedia_site`, `record_source` (B3), `in_scope`, `string_id` (scope).
- Produces:
  - `diff(old: list[dict], new: list[dict], key: str, fields: dict[str, float]) -> {"added": [...], "changed": [(id, field, old, new)], "removed": [...]}` con soglie `{"stiffness_lbin": 1, "spin_potential": 0.1, "tension_loss_pct": 1}` per TWU e `{"static_stiffness_kgmm": 0.05}` per Racketpedia.
  - `classify_added(added, records) -> (certain: list, pending: list)`: certo solo se `string_id` del nuovo coincide con un record esistente senza dato da quella fonte.
  - `report(date, diffs, certain, pending, anomalies) -> str` (Markdown in italiano: Novità, Valori cambiati, Sparite, Anomalie, Da abbinare).
  - `run(offline: bool = False, today: date | None = None) -> int` (0 = nessuna novità, 1 = aggiornato); CLI `py -m pipeline.refresh [--offline]`.
  - Excel: se il file `.xlsx` più recente in `data/source/` ha nome o data di modifica diversi da `sources.json["excel"]`, `run` lo estrae in memoria con `excel_extract` e confronta le righe per `id` (soglie: 0,1 punti % per allungamenti e TL6/TL12); le differenze finiscono in «Valori cambiati» e «Novità».
  - Ordine di `run`: scarica tutto **in memoria** → calcola i diff → se ci sono cambiamenti scrive `data/raw/*`, `sources.json`, aggiorna `matches_overrides.json` per i soli abbinamenti certi, `pending_matches.json`, il report, poi esegue `merge`, `build`, `build_page`. Qualsiasi eccezione durante lo scaricamento o il parsing → messaggio e uscita con codice 2 **prima** di scrivere qualsiasi file.
- [ ] **Step 1: Test che falliscono** (con `tmp_path` e le fixture, rete simulata con funzioni di scaricamento iniettate):
  - corda nuova con `string_id` di un record "solo catalogo" → in `certain`;
  - corda nuova senza record → in `pending`;
  - rigidità cambiata di 3 lb/in → in `changed`; cambiata di 0,5 → non c'è;
  - nessun cambiamento → `run` restituisce 0 e la cartella `data` di prova è identica byte per byte;
  - lo scaricamento del Compare solleva un errore a metà → codice 2 e nessun file scritto (Review Focus 5);
  - un Excel più recente con una riga nuova → la riga compare in «Novità»;
  - `report` contiene i titoli delle cinque sezioni anche quando sono vuote («nessuna»).
- [ ] **Step 2:** `python3 -m pytest tests/test_refresh.py -q` → FAIL. Implementa. → PASS.
- [ ] **Step 3:** Esegui `python3 -m pipeline.refresh` con la rete: se non cambia nulla deve stampare «Nessuna novità» e `git status` deve restare pulito. Commit `feat(pipeline): aggiornamento manuale con elenco delle novità`.

### Task B5: Pulizia (dopo A3, A4 e A5)

**Files:**
- Modify: `pipeline/derive.py`, `tests/test_derive.py`, `tests/test_derive_v2.py`, `tests/test_lab_only.py`, `pipeline/build.py`

**Interfaces:**
- Consumes: nessun modulo di `web/` legge più `subscores.control/comfort`, `judgments.control/comfort` o `lab_share` (verifica con `grep -n "control\|comfort\|lab_share" web/*.js` → nessun risultato).
- [ ] **Step 1: Test che falliscono:** `subscores()` restituisce solo `spin` e `durability` (più `affinity` aggiunta in `derive_all`); `judgments()` non ha `control`, `comfort` né `lab_share`; **test di regressione**: per i 102 record di `data/strings.json` di oggi, `profile_score` prima e dopo è identico (salva i punteggi attuali in una fixture `tests/fixtures/scores_before_v3.json` come primo passo, prima di toccare il codice).
- [ ] **Step 2:** → FAIL. Togli `control`, `comfort`, `PROXY_CRITERIA`, la miscela 70/30 e `lab_share`; aggiorna i test v2 che li controllavano. → PASS.
- [ ] **Step 3:** Test che cerca nei moduli di `web/` le cifre delle stime scritte a mano (`0,63`, `±11`, `0,99`, `1,19`, `9,2`, `12,6`): devono venire da `DATA.estimates_meta`. Correggi i testi di `explore.js` se il test fallisce.
- [ ] **Step 4:** `python3 -m pytest -q`, `node --test web/`, `python3 -m pipeline.build && python3 -m pipeline.build_page && node tests/ui/check_page.mjs dist/preview.html` → tutto OK. Commit `refactor(pipeline): via le stime Controllo/Comfort e il codice morto 70/30`.

### Task finale: Pubblicazione

- [ ] Rileggi l'Artifact esistente (`https://claude.ai/artifact/Up1BjSe7qFPH7zaRgsh5Ne`, azione `read`) e ripubblica `dist/string-explorer.html` sulla stessa URL. Aggiorna `docs/AUDIT.md` con una sezione "v3 (2026-10-28)" che riporta i criteri della spec §3 misurati prima e dopo (dai risultati di `check_page.mjs`). Push del ramo.
