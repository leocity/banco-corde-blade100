# Banco Corde v2 — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completare il catalogo delle marche richieste, aggiungere recensioni (peso 30%), spin e rigidità stimati con margine dichiarato, e riprogettare la pagina con l'approccio "prima la risposta, poi i dettagli".

**Architecture:** Due nuovi input da agenti: `catalog.json` (Haiku) e `reviews.json` (Sonnet, verificato a campione da Haiku). Un nuovo modulo puro `pipeline/estimate.py` calcola spin e rigidità di riferimento e la calibrazione tester → TWU. `derive.py` passa a usare `spin.value` / `stiffness.value_lbin` e aggiunge i giudizi 70/30. L'interfaccia viene riscritta in `web/` mantenendo `score.js`.

**Tech Stack:** come v1 (Python 3.14 `py`, pytest, openpyxl; JS vanilla; `node --test web/score.test.mjs`).

**Spec:** `docs/superpowers/specs/2026-10-07-string-explorer-v2-design.md` (estende `2026-10-05-string-explorer-design.md`)

## Global Constraints

- Marche obbligatorie e complete: Solinco, Re-String, Toroline, Grapplesnake (tutte le poly), Wilson Revolve / Revolve Spin, Babolat RPM Blast / RPM Blast Rough (= RPM Rough). Diametri 1.18–1.30 mm, solo poly / co-poly.
- Giudizi: 70% laboratorio + 30% recensioni, pesi rinormalizzati se una parte manca. Record "solo recensioni": 100% recensioni + badge.
- Priorità dello spin: misurato > parente (±0,5) > tester calibrato (solo se l'errore LOO è minore di quello della media) > qualitativo > null. Un valore misurato non viene mai sovrascritto.
- Le stime **non** entrano nelle popolazioni dei percentili.
- "Rigidità" è descrittiva e non entra nel punteggio profilo. Pesi del punteggio invariati: spin 35, controllo 25, tenuta 20, potenza 20.
- Stiff Index: il nome resta, ma spiegato come indice di cedimento (r = 0,60 con TL TWU, −0,34 con la rigidità TWU).
- Nessun numero inventato: ogni valore da recensione ha un URL.
- UI in italiano. A 375 px nessuno scroll orizzontale della pagina nelle viste principali.

## Review Focus

1. **Record "solo catalogo" senza laboratorio** (né Excel né TWU né Racketpedia): derive, similarity, tensione e UI non devono andare in crash. Giudizi solo dalle recensioni, badge visibile. Test nel Task 4.
2. **Spin misurato sovrascritto da una stima** (es. un parente con valore diverso): non deve mai succedere. Test nel Task 3.
3. **Le stime spostano i percentili** delle corde misurate: escluse dalle popolazioni. Test nel Task 4.
4. **Calibrazione tester peggiore della media**: deve ripiegare sul livello qualitativo, non pubblicare una stima peggiore del caso. Test nel Task 3.
5. **Confronto a 375 px con 4 corde**: le schede scorrono in orizzontale dentro il proprio contenitore; la riga Rigidità c'è anche quando esiste solo Racketpedia. Verifica nel Task 6.

---

### Task 1: Catalogo completo delle marche richieste

**Files:** Create `pipeline/catalog.py`, `tests/test_catalog.py`; output `data/agents/catalog.json`

**Interfaces — Produces:**
- `catalog.json`: lista di `{brand, model, gauge_label, gauge_mm, shape, material, source_url}`.
- `add_catalog_only(records: list, catalog: list) -> list`: aggiunge `{id, brand, model, gauge_label, gauge_mm, shape, shape_source, material, is_target: True, excel: None, twu: None, rpedia: None, catalog_only: True, preference: None, coverage: 0}` per ogni elemento del catalogo non già presente. Il confronto avviene per `string_id`, poi per (marca, modello, |Δmm| ≤ 0,02).
- `missing_from(records, catalog) -> list[str]`: elementi del catalogo senza record (deve restituire `[]`).

- [ ] **Step 1: Test che falliscono:**
  - un elemento nuovo diventa un record con `catalog_only=True` e `coverage=0`;
  - un elemento già presente con un'etichetta diversa ma gli stessi mm non viene duplicato;
  - `missing_from` è vuoto dopo `add_catalog_only`.
- [ ] **Step 2:** Esegui i test → FAIL. Implementa. Esegui i test → PASS.
- [ ] **Step 3: Agente Haiku.** Raccoglie dai siti ufficiali e da TW / TW Europe la gamma attuale delle marche obbligatorie (1.18–1.30 mm, poly / co-poly) e scrive `catalog.json` con un URL per ogni riga.
- [ ] **Step 4:** Controllo a mano dei nomi rispetto alle regole di `scope.normalize_*`. Aggiungi gli alias necessari, con un test per ciascuno. Commit.

### Task 2: Recensioni e punteggi dei tester

**Files:** Create `pipeline/reviews.py`, `tests/test_reviews.py`; output `data/agents/reviews.json`, `data/agents/reviews_check.json`

**Interfaces — Produces:**
- `reviews.json`: lista di `{id, sources: [{site, url, kind: "lab_playtest"|"review"|"brand"|"forum"|"video", scores: {spin, comfort, control, power, durability} (0–100 o null), levels: {spin, comfort, control, power, durability, stiffness} (1–5 o null)}]}`.
- `validate_reviews(rows, ids) -> list[str]`.
- `aggregate(review_row) -> {score: {crit: 0–100|None}, level: {crit: 1–5|None}, n_sources}`. È una media pesata per tipo di fonte: lab_playtest 1,0, review 0,8, brand 0,4, forum 0,6, video 0,5. Tennisnerd /10 si converte in ×10 nello Step 3.

- [ ] **Step 1: Test che falliscono:**
  - validatore: URL mancante → errore; punteggio fuori da 0–100 → errore; livello fuori da 1–5 → errore;
  - `aggregate`: pesi applicati; criteri tutti `null` → `None`.
- [ ] **Step 2:** Implementa → PASS. Commit.
- [ ] **Step 3: Agente Sonnet** su tutte le corde delle marche obbligatorie (dal catalogo completo) più i 25 concorrenti con il punteggio profilo più alto. Fonti come da spec §4, Tennisnerd convertito in 0–100. Agente Haiku di verifica sul 15% delle righe → `reviews_check.json`. Correggi le discrepanze. Commit.

### Task 3: Stime di spin e rigidità

**Files:** Create `pipeline/estimate.py`, `tests/test_estimate.py`

**Interfaces — Produces:**
- `fit_linear(xs, ys) -> (a, b)` e `loo_mae(xs, ys) -> float`.
- `calibrate_tester_spin(pairs: list[(tester_score, twu_spin)]) -> {a, b, mae, baseline_mae, usable: bool}`, con `usable = mae < baseline_mae`.
- `estimate_spin(rec, relatives: list, tester_agg, calib, twu_spin_pop) -> {value, low, high, kind, basis_n} | None`, con la priorità della spec §5.1. Per il tipo qualitativo: livello 1–5 → percentile 10/30/50/70/90 della popolazione TWU; margine = deviazione standard.
- `relatives_of(rec, records) -> list`: stesso marca + modello con TWU, oppure stesso modello senza il colore (lista di colori fissa: black, blue, pink, orange, green, yellow, white, neon, matcha, pom, gry, blk, bk, ble, desert).
- `estimate_stiffness(rec, relatives, rp_to_twu: (a, b, mae), tester_agg) -> {value_lbin, low, high, kind} | None`.

- [ ] **Step 1: Test che falliscono:**
  - un record con spin TWU 7,0 e un parente a 9,0 → `value == 7.0`, `kind == "misurato"` (Review Focus 2);
  - con `calib.usable == False` e livello tester 4 → `kind == "qualitativo"` (Review Focus 4);
  - `loo_mae` su una relazione perfettamente lineare → ≈ 0;
  - `relatives_of` riconosce "Toro Toro Pink" ↔ "Toro Toro Orange";
  - `estimate_stiffness` da Racketpedia applica `a·x + b` con `kind == "da Racketpedia"`.
- [ ] **Step 2:** Implementa → PASS. Commit.

### Task 4: Giudizi 70/30 e integrazione in derive / build

**Files:** Modify `pipeline/derive.py`, `pipeline/build.py`, `pipeline/merge.py`, `pipeline/notes_gen.py`; tests `tests/test_derive.py`, `tests/test_build_v2.py`

**Interfaces:**
- `derive.METRICS["twu_spin"]` resta solo misurato; nuova `METRICS["spin_any"] = rec["spin"]["value"]`. Le popolazioni usano solo i valori misurati (Review Focus 3).
- `subscores` usa `spin_any` per lo spin: se misurato, il percentile del valore; se stimato, il percentile del valore sulla popolazione misurata. Usa `stiffness.value_lbin` per controllo e potenza quando TWU manca.
- `judgments(rec, sub, review_agg) -> {crit: {score, level, word, lab_share}}` per Rigidità, Spin, Controllo, Potenza, Tenuta, Comfort. Mix 70/30 rinormalizzato. Parole: "molto basso / basso / medio / alto / molto alto"; per la Rigidità "molto morbida … molto rigida".
- `build`: carica il catalogo, le recensioni, la calibrazione e le stime; scrive in `strings.json` i campi `spin`, `stiffness`, `judgments`, `reviews` (con le fonti), `catalog_only`, e `estimates_meta` (errori di calibrazione) al livello principale.
- Le note generate menzionano "stima" quando lo spin o la rigidità non sono misurati.

- [ ] **Step 1: Test che falliscono:**
  - un record solo catalogo con recensioni → giudizi con `lab_share == 0`, nessun crash in `derive_all` e `tension_start` (Review Focus 1);
  - un record con laboratorio e recensioni → `score == 0.7·lab + 0.3·rev`;
  - aggiungere una stima di spin non cambia il percentile spin di una corda misurata (Review Focus 3);
  - integrazione: ogni record del catalogo è presente in `strings.json`.
- [ ] **Step 2:** Implementa → PASS. Esegui la pipeline completa. Commit.

### Task 5: Testi della Guida e note

**Files:** Modify `data/notes.json`, `web/app.js` (sezione guida)

- [ ] **Step 1:** Scrivi nella Guida:
  - "Perché le rigidità non coincidono": dinamica contro statica, viscoelasticità, condizioni, risoluzione a 0,05 kg/mm, r = 0,62 su 48 coppie;
  - lo Stiff Index come indice di cedimento (r = 0,60 e −0,34);
  - "Come stimiamo lo spin": ordine di priorità, errore della calibrazione letto da `estimates_meta`, perché l'Excel non predice lo spin (errore 1,27 contro 1,20 della media su 57 corde).
- [ ] **Step 2:** Aggiorna `_insight` e le note a mano se le stime cambiano la classifica. Commit.

### Task 6: Interfaccia riprogettata

**Files:** Rewrite `web/template.html`, `web/app.js`, `web/style.css` (mantieni `score.js` e i suoi test); `pipeline/build_page.py` invariato

**Interfaces:** `app.js` consuma `strings.json` v2. Componenti:
- `bars(rec)`: 6 barre con parola + numero;
- `card(rec, size)`;
- `sheet(rec)`: parte alta + `<details>` chiudibili;
- `quadrantMap()`;
- `compareCards(ids)`;
- `exploreList()`.

- [ ] **Step 0:** Carica le skill `artifact-design` e `dataviz`.
- [ ] **Step 1:** Navigazione a 4 voci (Per te, Mappa, Confronta, Esplora), con la Guida raggiungibile dal menu: in basso su telefono (con safe-area) e in alto su desktop.
- [ ] **Step 2: Per te.** Le 3 da provare (punteggio più alto tra le marche valutate, escluse preferite e non gradite), "cosa dicono i tuoi gusti", ricerca, liste pronte, pannello pesi chiudibile.
- [ ] **Step 3: Mappa a quadranti.** Rigidità contro spin; zone con nome; cerchi vuoti con barra d'errore per le stime; interruttore "mostra concorrenti"; tocco → scheda compatta; assi avanzati in un menu.
- [ ] **Step 4: Confronta.** Schede affiancate con scroll orizzontale su telefono; righe Rigidità (lb/in + parola + Racketpedia e Stiff Index in piccolo), Spin (con il tipo), Controllo, Potenza, Tenuta, Comfort, Tensione; marcatore "▲ più …"; frase di sintesi.
- [ ] **Step 5: Esplora.** Schede su telefono e tabella su desktop; filtri, compresi "solo con dati di laboratorio" e "solo marche valutate".
- [ ] **Step 6: Scheda.** Parte alta con le barre; sezioni `<details>` per note, laboratorio, tester (fonti e link), controllo incrociato, somiglianza.
- [ ] **Step 7: Verifica nel browser** a 375 px e su desktop, in chiaro e scuro: Review Focus 5, nessun overflow, nessun errore in console. Commit.

### Task 7: Revisione finale e pubblicazione

- [ ] **Step 1:** Suite completa: `py -m pytest -q` e `node --test web/score.test.mjs`.
- [ ] **Step 2:** Revisione indipendente di tutte le modifiche dal commit della spec v2, con il modello più capace (Review Focus inclusi). Correzioni con TDD.
- [ ] **Step 3:** Ripubblica allo stesso URL dell'Artifact. Riepilogo all'utente.
