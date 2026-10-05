# String Explorer — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire, partendo dall'Excel Ektelon, dal database TWU e da Racketpedia, un dataset unico di corde poly 16–17L e pubblicarlo come pagina interattiva (guida, mappa, esplora, scheda, comparatore, "per te") calibrata sul giocatore con Blade 100 v9.

**Architecture:** Una pipeline Python con script deterministici per Excel e TWU. Gli agenti Haiku fanno l'abbinamento dei nomi e la lettura di Racketpedia; un agente Sonnet fa la verifica. La fusione e le metriche derivate sono calcolate in Python e salvate in `data/strings.json`. Uno script di build inserisce JSON, CSS e JS in un unico HTML, che viene pubblicato come Artifact.

**Tech Stack:** Python 3.14 (`py`), openpyxl, pytest, urllib (stdlib); HTML/CSS/JS vanilla, Chart.js 4 da cdnjs; `node --test` per la logica JS.

**Spec:** `docs/superpowers/specs/2026-10-05-string-explorer-design.md`

## Global Constraints

- Calibri in ambito: `16`, `16L`, `17`, `17L` (≈ 1.18–1.30 mm). Fuori: 15, 15L, 18, 19, 20.
- Materiale: solo poly / co-poly (Excel `type` ∈ {`poly`, `copoly`}; TWU `Material` = `Polyester`).
- Marche target: Solinco, Re-String, Toroline, Grapplesnake, Wilson (Revolve, Revolve Spin), Babolat (solo RPM Blast, RPM Blast Rough).
- Concorrenti: Luxilon (ALU Power, 4G, Element), Yonex (Poly Tour Pro / Rev / Spin), Head (Lynx Tour, Hawk), Tecnifibre (Razor, Ice Code), Kirschbaum (tutte le poly), Signum Pro (tutte le poly).
- Ancore positive: Solinco Confidential standard 1.25 → tensione 22/21 kg; Toroline O-Toro 1.23 → 23/22 kg.
- Ancore negative: Solinco Confidential Soft, Babolat RPM Blast.
- Pesi di default: spin 35, controllo 25, tenuta 20, potenza 20.
- Soglia per l'avviso "simile a non gradita": somiglianza > 75, che comporta una penalità di 15 punti sul punteggio profilo.
- TWU: tensione di riferimento 51 lbs (`zref_tension=23`), swing Medium (`zhammer=2`).
- Stiff Index Excel = `(stretch − recover) / 11.25 × 100`; **più alto = più morbida**, e la UI lo deve dire ovunque compaia.
- Mai interpolare né stimare valori mancanti: `null` nei dati, "—" nella UI.
- Racketpedia: solo dati gratuiti (static stiffness kg/mm, forma, composizione).
- Tensioni sempre in kg **e** lbs (1 kg = 2.2046 lbs, arrotondate a 0.5).
- Testi della UI in italiano.

## Review Focus

1. **Varianti di nome/marca** ("Wlson", "Confidental", "Grapplesnake   Cube", "Hyper-G-Soft" vs "Hyper G Soft"): devono essere normalizzate, non trattate come corde diverse. Test in Task 1.
2. **Corde Excel con meno di 4 righe o con campi `None`**: vanno saltate o tenute parziali con un warning, senza crash. Test in Task 2.
3. **Calibri scritti in modo eterogeneo** (`16`, `"16L"`, `"16l"`, `"17L"`, numeri interi): devono essere normalizzati prima del filtro. Test in Task 1.
4. **Corda con meno di 2 metriche in comune con un'ancora**: la somiglianza deve essere `null`, non 0 né 100. Test in Task 6.
5. **Comparatore con 4 corde a 375 px**: lo scroll orizzontale deve restare dentro la tabella, mai sulla pagina. Verifica in Task 8.

---

## File structure

```
pipeline/scope.py         normalizzazione marca/nome/calibro, filtro ambito, id stabili
pipeline/excel_extract.py Excel → data/raw/excel.json
pipeline/twu_extract.py   fetch + parse TWU → data/raw/twu.json (+ snapshot html)
pipeline/validate_agents.py  validazione schema degli output agenti
pipeline/merge.py         fusione → record base
pipeline/derive.py        sotto-punteggi, somiglianze, tensione, metriche discriminanti
pipeline/build.py         orchestrazione: merge + derive + notes → data/strings.json
pipeline/build_page.py    template + css + js + json → dist/string-explorer.html
data/agents/matches.json  (Haiku)  data/agents/rpedia.json (Haiku)  data/agents/verify.json (Sonnet)
data/notes.json           note da maestro incordatore (Opus)
web/template.html  web/style.css  web/score.js  web/app.js
tests/…                   pytest + web/score.test.mjs
```

---

### Task 1: Setup e normalizzazione dell'ambito

**Files:** Create `pipeline/__init__.py`, `pipeline/scope.py`, `tests/test_scope.py`, `requirements.txt` (`openpyxl`, `pytest`), `.gitignore`

**Interfaces — Produces:**
- `normalize_brand(raw: str) -> str` (es. `"Wlson"`→`"Wilson"`, `"Grapplesnake   Cube"`→`"Grapplesnake"`, `"Re-String"`/`"Restring"`→`"Re-String"`, `"Krischbaum"`→`"Kirschbaum"`)
- `normalize_model(raw: str) -> str` (corregge `"Confidental"`→`"Confidential"`, uniforma trattini e spazi, Title Case)
- `normalize_gauge(raw) -> str | None` → `"16"|"16L"|"17"|"17L"|...`
- `gauge_to_mm(label: str, declared_mm: float | None = None) -> float | None`. Usa `declared_mm` se presente; altrimenti la tabella fissa 16=1.30, 16L=1.25, 17=1.20, 17L=1.18
- `is_target(brand: str, model: str) -> bool`, `is_competitor(brand: str, model: str) -> bool`, `in_scope(brand, model, gauge_label, material) -> bool`
- `string_id(brand, model, gauge_label) -> str` (slug, es. `solinco-confidential-16l`)

- [ ] **Step 1:** `git init`, `py -m pip install -r requirements.txt`, commit iniziale con spec e piano.
- [ ] **Step 2: Test che falliscono** in `tests/test_scope.py`:
  - `normalize_brand("Wlson") == "Wilson"`
  - `normalize_brand("Grapplesnake   Cube") == "Grapplesnake"`
  - `normalize_model("Confidental") == "Confidential"`
  - `normalize_gauge("16l") == "16L"` e `normalize_gauge(17) == "17"` (Review Focus 3)
  - `gauge_to_mm("17", 1.23) == 1.23` e `gauge_to_mm("16L") == 1.25`
  - `in_scope("Babolat", "RPM Blast", "17", "copoly") is True` e `in_scope("Babolat", "RPM Power", "16L", "copoly") is False`
  - `in_scope("Solinco", "Hyper-G", "18", "poly") is False`
  - `in_scope("Luxilon", "ALU Power", "16L", "copoly") is True`
  - `in_scope("Solinco", "Vanquish", "16", "multi") is False`
  - `string_id("Solinco", "Confidential", "16L") == "solinco-confidential-16l"`
- [ ] **Step 3:** Esegui `py -m pytest tests/test_scope.py -v` → FAIL.
- [ ] **Step 4:** Implementa `pipeline/scope.py`. Usa tabelle dict per gli alias di marca e per i modelli dei concorrenti; il match sui modelli è case-insensitive per prefisso.
- [ ] **Step 5:** Esegui di nuovo i test → PASS. Commit `feat: scope normalization`.

### Task 2: Estrazione Excel

**Files:** Create `pipeline/excel_extract.py`, `tests/test_excel_extract.py`

**Interfaces:**
- Consumes: Task 1.
- Produces: `load_excel(path: str) -> list[dict]`. Ogni dict ha `{id, brand, model, gauge_label, gauge_mm, shape, material, excel: {stretch_pct:{40,50,60,65}, recover_pct:{…}, stiff_index:{…}, stiff_index_avg, olg_16x19:{…}, elong_65, static_initial, static_24h, static_recoil, static_24h_creep, tl6, tl12}}`. Include solo i record in ambito. CLI: `py -m pipeline.excel_extract <xlsx> data/raw/excel.json`.
- Indici colonna (0-based): 0 Company, 1 Name, 2 Ga, 3 type, 4 shape, 5 Lbs, 6 Stretch, 7 %stretch (rapporto), 8 Recover, 9 %recover (rapporto), 10 diff, 11 stiff index, 12 gain, 13 olg, 14 elong, 16 int wht st, 17 24hr st, 18 24hr recoil, 20 TL6, 21 TL12.
- `stretch_pct = (ratio − 1) × 100`. `static_24h_creep = col17 − col16` (pollici). Elong e peso statico si leggono dalla riga a 40 lbs (elong anche dalla riga a 65); TL6/TL12 dalla riga a 50 lbs.

- [ ] **Step 1: Test che falliscono** (sul file reale, percorso in `XLSX` letto da env, con default `F:/Users/Leo/Downloads/String chart Aug 262026.xlsx`):
  - il record `toroline-o-toro-17` esiste ed è esagonale;
  - il record `wilson-revolve-spin-16` ha `tl6 == 10` e `tl12 == 27`;
  - il record `babolat-rpm-blast-17` ha `tl6 == 20`;
  - il record `solinco-confidential-16l` esiste;
  - `round(rec["excel"]["stretch_pct"][40], 2)` coincide con `(col7 − 1) × 100` per quel record;
  - nessun record ha `material` fuori da {`poly`, `copoly`}.
  - Review Focus 2: con una fixture in memoria (gruppo di 3 righe e una riga con `type=None`), `load_rows(rows)` non solleva eccezioni, restituisce la corda con i dati parziali e scrive un warning su `stderr`.
- [ ] **Step 2:** Esegui i test → FAIL.
- [ ] **Step 3:** Implementa `load_rows(rows: list[tuple]) -> list[dict]` (logica pura) e `load_excel(path)` come wrapper. Raggruppa per `(normalize_brand, normalize_model, normalize_gauge)`.
- [ ] **Step 4:** Esegui i test → PASS. Esegui la CLI e stampa il conteggio per marca: devono esserci tutte le marche target tranne Grapplesnake.
- [ ] **Step 5:** Commit `feat: excel extraction`.

### Task 3: Estrazione TWU

**Files:** Create `pipeline/twu_extract.py`, `tests/test_twu_extract.py`, `tests/fixtures/twu_snapshot.html` (salvato dal primo fetch)

**Interfaces:**
- Produces:
  - `fetch_twu(ref_tension_code: str = "23", hammer: str = "2") -> str`: POST a `https://twu.tennis-warehouse.com/learning_center/reporter2.php` con i campi del form `datachoices`. I nomi esatti dei campi del form si ispezionano nell'HTML. Se la POST non restituisce righe, si ripiega sulla GET di default e si registrano `ref_tension_lbs` e `swing` effettivi.
  - `parse_twu(html: str) -> list[dict]`: restituisce `{twu_name, brand, model, gauge_label, gauge_mm, ref_tension_lbs, swing, material, stiffness_lbin, tension_loss_pct, spin_potential}`. I mm vengono estratti da pattern come `(1.25)`, `/1.25`, ` 1.25`.
  - CLI: `py -m pipeline.twu_extract data/raw/twu.json`, che salva anche `data/raw/twu.html`.

- [ ] **Step 1:** Esegui il fetch una volta e salva lo snapshot nella fixture.
- [ ] **Step 2: Test che falliscono** su fixture:
  - `len(parse_twu(html)) > 400`;
  - la riga `"Solinco Hyper-G 16L (1.25)"` ha `gauge_mm == 1.25`, `gauge_label == "16L"` e `stiffness_lbin` di tipo float;
  - `"Toroline O-Toro 17 (1.23)"` ha `gauge_mm == 1.23`;
  - `"Luxilon ALU Power 125/16L"` ha `gauge_mm == 1.25`;
  - nessun valore numerico è una stringa.
- [ ] **Step 3:** Esegui i test → FAIL.
- [ ] **Step 4:** Implementa con `urllib.request` e `re`/`html.parser`. Se trova 0 righe solleva `RuntimeError("TWU: tabella non trovata")`.
- [ ] **Step 5:** Esegui i test → PASS. Esegui la CLI e filtra con `in_scope` (passa `material="poly"` per Polyester). Stampa il conteggio per marca.
- [ ] **Step 6:** Commit `feat: TWU extraction`.

### Task 4: Agenti Haiku — abbinamento nomi e Racketpedia

**Files:** Create `pipeline/validate_agents.py`, `tests/test_validate_agents.py`; output `data/agents/matches.json`, `data/agents/rpedia.json`

**Interfaces:**
- Schema `matches.json`: lista di `{id, twu_name: str|null, match: "exact"|"probable"|"proxy"|"none", note: str}`, con un elemento per ogni `id` in `excel.json` **più** un elemento per ogni corda TWU in ambito non presente nell'Excel (in quel caso `id` = `string_id` della corda TWU e `match="exact"` su sé stessa).
- Schema `rpedia.json`: lista di `{id, url: str|null, static_stiffness_kgmm: float|null, shape: str|null, composition: str|null, match: "exact"|"proxy"|"none"}`.
- Produces: `validate_matches(matches, excel, twu) -> list[str]` e `validate_rpedia(rows, ids) -> list[str]`. Restituiscono la lista degli errori (vuota = ok).

- [ ] **Step 1: Test che falliscono** per i validatori:
  - un id mancante produce un errore;
  - un `match` fuori dall'enum produce un errore;
  - un valore `twu_name` che non esiste in `twu.json` produce un errore;
  - `static_stiffness_kgmm` presente con `url` null produce un errore.
- [ ] **Step 2:** Esegui i test → FAIL. Implementa i validatori. Esegui i test → PASS. Commit.
- [ ] **Step 3: Lancia 3 agenti Haiku in parallelo** (`model: "haiku"`) per l'abbinamento, divisi per gruppi di marche: (Solinco + Re-String), (Toroline + Grapplesnake + Wilson + Babolat), (concorrenti). Ogni prompt contiene le righe della propria marca da `excel.json` e `twu.json` (id, nome, calibro, mm, forma), lo schema e queste regole:
  - stesso modello + stesso mm = `exact`;
  - stesso modello + calibro diverso = `proxy`;
  - nome simile ma incerto = `probable`;
  - "Soft", "Rough", "Spin", "Tour", "Snap" sono **modelli diversi**, non varianti.
  - Ancora fissata nel prompt: `solinco-confidential-16l` → `"Solinco Confidential 16 (1.30)"`, `proxy`.

  Il risultato è un JSON scritto in `data/agents/matches_<gruppo>.json`.
- [ ] **Step 4: Lancia 3 agenti Haiku per Racketpedia**, con gli stessi gruppi. Ogni agente:
  - parte dalla pagina marca `https://www.racketpedia.com/en-GB/tennis-strings/brand/<brand-slug>`;
  - apre le pagine delle corde in ambito ed estrae static stiffness (kg/mm), forma e composizione;
  - non deve usare metriche a pagamento, e se una corda manca scrive `null`.

  Output in `data/agents/rpedia_<gruppo>.json`.
- [ ] **Step 5:** Unisci i file parziali in `matches.json` e `rpedia.json`, poi esegui `py -m pipeline.validate_agents` → 0 errori. Correggi a mano i casi segnalati.
- [ ] **Step 6:** Commit `data: agent matches and racketpedia`.

### Task 5: Fusione + verifica Sonnet

**Files:** Create `pipeline/merge.py`, `tests/test_merge.py`; output `data/agents/verify.json`

**Interfaces:**
- Consumes: `excel.json`, `twu.json`, `matches.json`, `rpedia.json`.
- Produces: `merge(excel: list, twu: list, matches: list, rpedia: list) -> list[dict]`, con record conformi al modello dati della spec §5 (blocchi `excel`/`twu`/`rpedia` oppure `null`, `twu.match`, `rpedia.match`, `preference`, `is_target`, `coverage` 0–3).
- `preference`: `"liked"` per `solinco-confidential-16l` e `toroline-o-toro-17`; `"disliked"` per le Confidential Soft e le RPM Blast (tutti i calibri in ambito).

- [ ] **Step 1: Test che falliscono** (su fixture minime in memoria più un test di integrazione sui file reali):
  - `solinco-confidential-16l`: `twu.match == "proxy"`, `preference == "liked"`, `coverage >= 2`;
  - `re-string-zero-16`: `twu is None`;
  - un record con `match == "none"` ha `twu is None`;
  - nessun id compare due volte;
  - un record solo-TWU (es. Grapplesnake Tour M8 17) ha `excel is None`.
- [ ] **Step 2:** Esegui i test → FAIL. Implementa. Esegui i test → PASS. Commit.
- [ ] **Step 3: Lancia 1 agente Sonnet** (`model: "sonnet"`) che riceve `merged.json` e ricontrolla sulla fonte originale:
  - tutti i match `probable` e `proxy`;
  - le 4 ancore;
  - un campione casuale del 15% dei valori TWU e Racketpedia.

  Per l'Excel l'agente usa `py` con openpyxl. Restituisce `verify.json` con la lista `{id, field, found, expected, source_url}`.
- [ ] **Step 4:** Risolvi ogni discrepanza: correggi `matches`/`rpedia` oppure aggiungi una nota. Riesegui merge e validatori. Commit `data: verified merge`.

### Task 6: Metriche derivate

**Files:** Create `pipeline/derive.py`, `pipeline/build.py`, `tests/test_derive.py`

**Interfaces — Produces:**
- `percentile(value, population: list[float]) -> float | None`: 0–100; restituisce `None` se `value` è `None`.
- `subscores(rec, pop) -> {spin, control, power, durability, comfort}` (ognuno 0–100 o `None`):
  - spin = pct(twu.spin_potential);
  - control = mean(pct(twu.stiffness), 100 − pct(excel.stretch_pct[50]));
  - power = mean(100 − pct(twu.stiffness), pct(excel.stretch_pct[50]));
  - durability = mean(100 − pct(twu.tension_loss), 100 − pct(excel.tl6));
  - comfort = 100 − pct(rpedia.static_stiffness or twu.stiffness).

  Le medie usano solo i termini non nulli.
- `similarity(a, b, pop) -> int | None`:
  - feature: twu stiffness, twu tension_loss, twu spin, excel stiff_index_avg, ognuna come z-score sulla popolazione;
  - `d = sqrt(mean(Δz²))` sulle sole feature condivise;
  - `sim = round(100 × max(0, 1 − d/2))`, +5 se la forma è uguale (cap a 100);
  - `None` se le feature condivise sono meno di 2.
- `profile_score(sub, weights={"spin":35,"control":25,"durability":20,"power":20}, disliked_sim: int|None) -> int | None`: media pesata dei sotto-punteggi disponibili, con i pesi rinormalizzati; −15 se `disliked_sim > 75`; clamp 0–100.
- `tension_start(rec, anchors) -> {"kg": [hi, lo], "lbs": [hi, lo], "from": anchor_id, "indicative": True}`:
  - si parte dall'ancora liked più simile (Confidential [22, 21], O-Toro [23, 22]);
  - `Δkg = −0.75 × (twu_stiff − anchor_twu_stiff) / 15`, arrotondato a 0.5 e limitato a ±2;
  - senza dati TWU: tensione dell'ancora, con `"from"` che indica il fallback.
- `discriminant_metrics(records) -> list[{metric, liked_mean, disliked_mean, separation}]`: `separation = |μ_liked − μ_disliked| / σ_pop`, in ordine decrescente.
- `build.py`: CLI `py -m pipeline.build` → `data/strings.json` = `{generated, weights_default, anchors, discriminant, strings:[…]}`. Le note restano vuote fino al Task 7.

- [ ] **Step 1: Test che falliscono** con una popolazione sintetica di 10 record:
  - `similarity(x, x) == 100`;
  - la similarità tra due record con 1 sola feature condivisa è `None` (Review Focus 4);
  - `profile_score` con `disliked_sim=80` è 15 punti più basso dello stesso con `disliked_sim=50`;
  - `profile_score` con solo `spin` disponibile coincide con `spin`;
  - `tension_start` con stiffness = ancora + 30 restituisce `kg == [20.5, 19.5]` rispetto a Confidential (22 − 1.5, 21 − 1.5);
  - con stiffness = ancora + 100 il Δ è limitato a −2;
  - `discriminant_metrics` ordina in modo decrescente.
- [ ] **Step 2:** Esegui i test → FAIL. Implementa. Esegui i test → PASS.
- [ ] **Step 3:** Esegui `py -m pipeline.build`. Stampa la top 10 per punteggio e per somiglianza alle liked, e la lista discriminante. Controlla che le 4 ancore abbiano punteggi plausibili: le liked con alta somiglianza reciproca, le disliked più lontane. Se non è così, annotalo nel riepilogo, perché è un'informazione per l'utente e non un bug da nascondere.
- [ ] **Step 4:** Commit `feat: derived metrics`.

### Task 7: Note da maestro incordatore (Opus)

**Files:** Create `data/notes.json`, `tests/test_notes.py`; modify `pipeline/build.py` (unisce le note per `id`)

**Interfaces:** `notes.json` = `{id: {feel, on_blade_100_v9, for_your_style, vs_favorites}}`, ogni nota di 1–3 frasi in italiano, basata sui numeri del record.

- [ ] **Step 1: Test che falliscono:**
  - ogni `id` di `strings.json` ha le 4 chiavi non vuote;
  - per i record con badge disliked (`similarity_disliked > 75`) il campo `vs_favorites` nomina la corda non gradita;
  - nessuna nota supera i 400 caratteri.
- [ ] **Step 2:** Scrivi le note a gruppi di marca, consultando i dati derivati. Contenuti obbligatori dove pertinenti:
  - tensione di partenza in kg/lbs;
  - comportamento nel tempo (TL6/TL12, tension loss);
  - prestretch;
  - interazione con un telaio flessibile a RA basso e con lo schema 16x19;
  - colpo piatto vs rotazione.
- [ ] **Step 3:** Esegui i test → PASS. Riesegui `py -m pipeline.build`. Commit `content: stringer notes`.

### Task 8: Pagina interattiva

**Files:** Create `web/template.html`, `web/style.css`, `web/score.js`, `web/score.test.mjs`, `web/app.js`, `pipeline/build_page.py`; output `dist/string-explorer.html`

**Interfaces:**
- `web/score.js` (ES module, inserito inline dal build): `profileScore(sub, weights, dislikedSim) -> number|null`, con la stessa regola di `derive.profile_score`; `kgToLbs(kg) -> number` (arrotondato a 0.5).
- `build_page.py`: legge il template e sostituisce `/*__CSS__*/`, `/*__JS__*/` e `/*__DATA__*/` (con `strings.json`) → `dist/string-explorer.html`. Chart.js 4 da `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js`.

- [ ] **Step 0:** Carica la skill `artifact-design` prima di scrivere il template.
- [ ] **Step 1: Test che falliscono** in `web/score.test.mjs`:
  - parità con i casi Python del Task 6 (stessi input → stesso output);
  - `kgToLbs(22) === 48.5`.

  Esegui `node --test web/` → FAIL.
- [ ] **Step 2:** Implementa `score.js` → PASS.
- [ ] **Step 3:** Implementa template, CSS e app.js con le sezioni della spec §7:
  - **Guida**, con il box sulle tre rigidità e il glossario A–Y;
  - **Mappa**, con assi selezionabili e stelle sulle liked;
  - **Esplora**, con filtri, ordinamento e badge copertura/somiglianza/⚠;
  - **Scheda**, con l'origine di ogni valore, il corsivo per i `proxy`, l'OLG 16x19 alla tensione Excel più vicina a quella suggerita e le 4 note;
  - **Comparatore**, per 2–4 corde, con radar, tabella delle differenze e frase di sintesi;
  - **Per te**, con slider dei pesi, classifica, 3 liste pronte e il blocco "Cosa dicono i tuoi gusti" (dalla lista discriminante).

  Requisiti di layout e tema: token colore in `:root` con tema scuro, gutter di 16 px, nessuno scroll orizzontale della pagina.
- [ ] **Step 4:** Esegui `py -m pipeline.build_page` e apri `dist/string-explorer.html` nel browser pane. Verifica a 375 px e su desktop, in tema chiaro e scuro, con:
  - il comparatore a 4 corde, che deve scrollare solo dentro la tabella (Review Focus 5);
  - la scheda di Re-String Zero, che ha copertura ridotta;
  - la scheda di Confidential, con il dato TWU in corsivo come proxy.

  La console non deve contenere errori.
- [ ] **Step 5:** Commit `feat: interactive page`.

### Task 9: Pubblicazione

- [ ] **Step 1:** Esegui la suite completa: `py -m pytest -q` e `node --test web/`, tutto verde.
- [ ] **Step 2:** Pubblica `dist/string-explorer.html` con lo strumento Artifact (privato, icon `chart`, description di una frase).
- [ ] **Step 3:** Prepara un riepilogo per l'utente con:
  - il link;
  - la top 5 per il suo profilo;
  - la metrica che separa i suoi gusti;
  - i limiti dei dati (Re-String solo Excel, Confidential 1.25 proxy su TWU, copertura Racketpedia).
