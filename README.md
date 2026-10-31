# Banco Corde Blade 100

Strumento per scegliere corde poly (1.18–1.30 mm) per una **Wilson Blade 100 v9 (16×19)**, giocatore di club tutto campo con rotazioni, < 50 lbs, 4–5 h/settimana.

- **Pagina pubblicata (Artifact, privata, solo tuo account):** https://claude.ai/artifact/Up1BjSe7qFPH7zaRgsh5Ne — v3 del 2026-10-31, con `sample`, `db`, `user`, `downloads`. Da telefono: apri il link da loggato e «Aggiungi a schermata Home». Per aggiornarla: `py -m pipeline.build && py -m pipeline.build_page`, poi si ripubblica `dist/preview.html` sullo stesso link.
- **Corda montata ora:** Re-String Zero 1,23 a 22,5/21,5 kg. **Preferite:** Solinco Confidential 1,25, Toroline O-Toro 1,23. **Non gradite:** Confidential Soft, RPM Blast. Si cambiano dall'app (montata, ★ e ✕ su ogni scheda).

## Le quattro schermate

- **Scegli:** la montata con ore e usura, le 3 da provare, la lista con filtri (marca, calibro, forma, solo misurate, pairing Buono o meglio) e il riquadro «Valuta una corda che non c'è» (parere AI).
- **Mappa:** rigidità × spin, tenuta × spin o controllo × spin; scheda al passaggio (al tocco su telefono), filtri, montata e preferite sempre visibili, tabella alternativa.
- **Banco:** tutte le corde con i valori affiancati e confronto da 2 a 4 corde.
- **Montata:** corda montata, tensione, registro ore, usura, cambio corda con annulla, storico, esportazione.
- Il **Metodo** (pulsante in alto, e il «?» accanto ai valori) spiega come si leggono i numeri.

## Fonti dei dati

| Fonte | Dove | Cosa |
|---|---|---|
| Test Ektelon dell'utente | `data/source/String chart Aug 262026.xlsx` | allungamento/recupero 40–65 lbs, cedimento (il «Stiff Index»), peso statico 24 h, TL6/TL12 |
| TWU String Performance Database | `data/raw/twu.html` (snapshot), `data/raw/twu.json` | rigidità dinamica, perdita di tensione, spin potential (51 lbs, swing veloce) |
| Racketpedia (solo dati gratuiti) | `data/raw/racketpedia.json` (sito, `py -m pipeline.rpedia_site`), `data/agents/rpedia*.json` (agente, verificato sul sito) | rigidità statica kg/mm, con URL della scheda |
| Recensioni dei tester | `data/agents/reviews_r*.json`, `data/agents/review_overrides.json` | **solo link e confronto con i dati**: non entrano in nessun calcolo |
| Catalogo, produzione, anni di uscita | `data/agents/catalog.json`, `prod_p*.json`, `year_p*.json` | completezza marche, fuori produzione, corde uscite prima del 2020 |
| Correzioni curate | `data/crosscheck_overrides.json`, `data/catalog_fixes.json`, `data/agents/*_overrides.json`, `data/notes.json` | forme dai produttori, esiti del controllo web, note da incordatore |

## Regole attuali

1. **Solo dati di laboratorio** per valori, pairing e classifiche (Ektelon, TWU, Racketpedia, gemelli di calibro misurati). Le recensioni restano link; dove divergono di 2 o più livelli dai dati misurati la scheda lo dice («I tester dicono X, i dati misurano Y»); le recensioni riferite a un calibro diverso (34 fonti su 144, riconosciute dalle note) non generano conflitti.
2. **Si tolgono le corde uscite prima del 2020 e quelle fuori produzione**; le corde di riferimento restano sempre. Anno non trovato → «anno da verificare» (47 corde).
3. **Dimensioni** (percentili tra le corde del banco, `pipeline/dims.py`): *rigidità* (TWU, o stima da gemello/Racketpedia), *tenuta* (media di perdita TWU, TL6, TL12 e scorrimento 24 h, tutte alla pari), *controllo* (media di rigidità, inverso dell'allungamento a 50 lb ed elasticità: un indice da 1–3 misure, non validato; la potenza è 100 − controllo, un solo asse), *elasticità* (recupero/allungamento a 50 lb, solo Excel), *spin* (TWU o gemello). Comfort e cedimento sono solo nella scheda.
4. **Pairing Blade 100** (0–100, `pipeline/pairing.py` e `web/pairing.js`, stessa regola verificata sul fixture `tests/fixtures/pairing_cases.json`): somiglianza con la corda «mi piace» più vicina. Per dimensione: entro 5 punti percentile vale 100, poi scende fino a 0 a 20 punti; per tenuta e spin valere di più non penalizza. Pesi spin 30, tenuta 20, rigidità 20, controllo 15, elasticità 15, rinormalizzati su ciò che la corda ha. Servono almeno 3 misure di laboratorio (lo spin non è obbligatorio). −15 se somiglia più a una «non mi piace» (≥ 75). Fasce: ≥ 80 Ottimo, 60–79 Buono, 40–59 Attenzione, < 40 Poco adatta. Con le preferite iniziali: 97 corde su 102 hanno un pairing (14 Ottimo), 5 sono non valutabili. Non è un voto di qualità.
5. **Stime da modello** (spin da rigidità e forma; rigidità dal solo calibro): si vedono con «≈» e ◐ ma non entrano mai nel pairing né nelle 3 da provare. Gemelli di calibro corretti per il diametro (≈ +203 lb/in per mm).
6. **Tensione consigliata:** regola empirica dalla montata (−0,75 kg ogni +15 lb/in di rigidità, al massimo ±2 kg), mostrata come intervallo ±1 kg con l'etichetta «stima». Non validata.
7. **Usura:** ore giocate / vita attesa. Vita attesa di partenza `8 + 0,12 × tenuta` ore (±25%), 14 ore (±40%) se la tenuta manca: **un'ipotesi non misurata**. Passa alle tue ore reali dopo la prima corda «consumata» (stessa corda) o dopo 3 corde diverse. Fasce: < 40% Fresca, 40–70% In uso, 70–100% Da controllare, > 100% Da cambiare.
8. **Parere AI** (capability `sample` dell'Artifact): su richiesta, mai automatico; riceve i dati e tutte le descrizioni disponibili; risposta validata, mostrata come testo, etichettata «Parere AI — non misurato» e mai usata in punteggi, top 3, mappa o confronto. Senza la capability (anteprima locale) i pulsanti non compaiono.
9. **Stato dell'utente** (montata, preferite, ore, corde finite): un documento `db` privato per utente (`data/users/<id>/state`); senza `db` ripiega su `localStorage` e lo dichiara. Esportazione JSON con `downloads`.

## Comandi

Richiede Python 3 (`py` su Windows) con `openpyxl` e `pytest`, Node 20+ e Playwright per i test della pagina.

```bash
py -m pip install -r requirements.txt
tests/run_all.sh                         # ricostruisce la pagina ed esegue pytest, node --test e Playwright
py -m pytest -q                          # 189 test Python (pipeline, dati finali, build della pagina)
node --test web/*.test.mjs               # 112 test JS dei moduli puri (pairing, stato, usura, mappa, AI, schede)
node tests/e2e/ui.cjs                    # 55 test della pagina in Chromium (richiede dist/preview.html)
node tests/e2e/shots.cjs                 # screenshot in docs/audit/
py -m pipeline.excel_extract "data/source/String chart Aug 262026.xlsx" data/raw/excel.json
py -m pipeline.twu_extract data/raw/twu.json      # riscarica TWU (rete)
py -m pipeline.validate_agents           # abbinamenti + Racketpedia -> matches.json / rpedia.json
py -m pipeline.rpedia_site               # riscarica Racketpedia dal sito (rete) -> data/raw/racketpedia.json
py -m pipeline.merge                     # -> data/merged.json
py -m pipeline.build                     # -> data/strings.json
py -m pipeline.build_page                # -> dist/string-explorer.html (+ dist/preview.html per anteprima locale)
py -m http.server 8765 --directory dist  # anteprima: http://localhost:8765/preview.html
```

## Struttura

- `pipeline/` — estrazione (Excel, TWU), normalizzazione (`scope.py`), fusione, stime (`estimate.py`), dimensioni e misure Excel (`dims.py`), pairing (`pairing.py`), metriche (`derive.py`), conflitti tra recensioni (`reviews.py`), note (`notes_gen.py`), catalogo, produzione/anni, build.
- `web/` — `template.html`, `style.css` e i moduli JS inlinati da `pipeline/build_page.py` nell'ordine di `MODULES`: `format`, `pairing`, `state` (stato e tensione), `persist` (db/localStorage), `values` e `cards` (righe e schede), `wear`, `ai`, `choose`, `bank`, `mine`, `map`, `method`, `app` (colla). Regole dei moduli: un `import` per riga, solo `export function|const`, nessun nome top-level ripetuto (lo controlla `tests/test_build_page.py`).
- `tests/` — `test_*.py` (Python), `fixtures/pairing_cases.json` (parità Python/JS), `e2e/*.cjs` (Playwright).
- `docs/AUDIT.md` — audit di dati, racconto dei dati e UI, con lo stato v3; `docs/superpowers/` — specifiche e piani.

## Lavoro aperto

- Controllare dal vivo che `db` salvi le ore tra dispositivi (segna 1 ora, ricarica, riapri dal telefono): da qui non si può leggere lo stato privato di un utente.
- Lista acquisti su Tennis Warehouse Europe da aggiornare (`data/agents/shopping_*.json` riflette la lista precedente).
- 47 corde con «anno da verificare».
- Vita attesa da calibrare con le tue corde finite; regola della tensione non validata.
- Margini dello spin da gemello (±0,5) non propagati nel pairing; curva di allungamento 40→65 lb e peso statico solo mostrati.
- Codice derivato non più usato dall'interfaccia (la miscela 70/30 in `judgments()`, `profile_score`, somiglianza, `tension_start`): da togliere.
- Dall'audit v3 (`docs/AUDIT.md`): niente popover per numero con fonte e margine, niente indicatori a punti nel confronto su telefono, legenda unica dei badge, «?» da 22 px.
