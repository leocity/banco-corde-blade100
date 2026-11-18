# Banco Corde Blade 100

Strumento per scegliere corde poly (1.18–1.30 mm) per una **Wilson Blade 100 v9 (16×19)**, giocatore di club tutto campo con rotazioni, < 50 lbs, 4–5 h/settimana.

- **Pagina pubblicata (Artifact, privata, solo tuo account):** https://claude.ai/artifact/Up1BjSe7qFPH7zaRgsh5Ne — **v6 del 2026-11-18**, con `db`, `user`, `sample`, `downloads`. Da telefono: apri il link da loggato e «Aggiungi a schermata Home». Per aggiornarla: `python3 -m pipeline.build && python3 -m pipeline.build_page`, poi si ripubblica `dist/string-explorer.html` sullo stesso link (prima si legge la versione online).
- **Corda montata ora:** Re-String Slap 1,23 a 22/21 kg (dal 31/10/2026). **Preferite:** Confidential 1,25, O-Toro 1,23, Zero 1,23, Slap 1,23. **Non gradite:** Confidential Soft (3 calibri), RPM Blast (2), Barb Wire 1,30. Si cambiano dall'app.

## Le tre schermate (v6.1)

- **Oggi:** la corda montata con le ore, **+ Uscita 1,5 h** (un tocco) e subito il voto 1–5 con le faccine (secondo tocco), una parola facoltativa, «Altre ore». Le corde **in casa** (matasse intere o mezze, con + e −), le ultime uscite, **Cambia corda** (prima le corde in casa; una sola domanda: «la ricompreresti?»).
- **Prossima:** una domanda, «Cosa vuoi cambiare rispetto alla tua?» (Simile, Più morbida, Più rigida, Tiene di più la tensione, Più spin). Poi **Ce l'hai in casa** e **Da comprare** (al massimo 3), ognuna con la frase «Rispetto alla Slap: …», il perché fisico e le misure in comune. **Confronta** apre il confronto riga per riga; **Cerca**, **Ibridi** (verticali + orizzontali, letto 16/19 solo nella stessa fonte, idee da provare non calcolate) e **Chiedi all'AI** (casella libera, risposta marcata «non misurato»).
- **Mappa:** cerchi una corda e la vedi su ogni righello accanto alla tua (rigidità in campo, perdita di tensione, spin, rigidità da ferma), con una tabella delle corde scelte e «Confronta». Ci sono tutte le corde: ● misurata, ◐ ricavata da altri dati (stesso modello in altro calibro o colore, misura Racketpedia portata sulla scala TWU), ○ ricavata dalla fisica (calibro, materiale, forma). Tocchi il righello e vedi la corda più vicina.
- **Tooltip:** ogni numero e ogni parola tecnica si tocca: cosa significa, fonte e data, misura o ipotesi.

## Regole v6 (rigore)

1. **v6.1 — metro di paragone sempre:** dove manca la misura si usa il valore ricavato (dai dati o dalla fisica), sempre marcato con ≈ e spiegato nel tooltip. Nei consigli una corda entra solo se almeno un suo valore è misurato o ricavato da dati veri (una stima dalla fisica da sola non basta). **Misura** = TWU con abbinamento esatto (rigidità in gioco lb/in, perdita di tensione %, spin potenziale), Racketpedia esatto (rigidità a riposo kg/mm), il tuo Excel (allungamento a 50 lb). Tutto il resto (stesso modello in altro calibro, modelli, conversioni tra fonti, abbinamenti `proxy`) è **stima**: si vede solo nella scheda con ≈ e non entra mai in confronti, consigli, righelli o AI. Blocco `lab` per corda in `data/strings.json` (`pipeline/lab.py`).
2. **Confronti** solo tra due corde nella stessa fonte, mai convertendo. Soglie (ipotesi dichiarate): rigidità TWU 10% / 15% (TWU: entro il 10–15% «sembrano uguali»), Racketpedia 0,10 / 0,20 kg/mm, perdita 5 / 10 punti, spin 0,5 / 1,0. L'Excel non decide (non concorda con TWU né con Racketpedia). Se TWU e Racketpedia dicono cose opposte: «le fonti non concordano», nessuna conclusione (`web/cmp.js`).
3. **Consigli** (`web/next.js`): compatibili se le misure in comune vanno nella direzione chiesta oltre «un po'» e nessuna dice il contrario; ordine: in casa → fonti che confermano → somiglianza alle preferite → nome. Se la montata non ha TWU (la Slap), «tiene di più» e «più spin» mostrano il quarto migliore delle corde misurate da TWU e lo dichiarano.
4. **Somiglianza alle preferite**: quante misure nella stessa fonte sono «simili», mostrata come «in N misure su M». Niente più punteggio 0–100.
5. **Tensione**: nessun numero consigliato; «parti dalla tua» con l'ipotesi −0,5 kg se nettamente più rigida in TWU. **Usura**: niente formula; si mostra quanto sono durate le tue corde.
6. Recensioni e pareri dei forum: solo link, mai nei calcoli (test `tests/test_community_isolation.py`). Recensioni indipendenti in `data/reviews_indep.json` (classe del canale, nessuna frase finché il video non è guardato).
7. Stato utente nel `db` come prima (`state`, `s-*`, `l-*`), con i campi facoltativi `stock`, `nextGoal`, e `feel`/`tag` sulle uscite; i dati salvati prima della v6 restano validi (test sullo stato reale del 18/11/2026).

## Fonti dei dati

| Fonte | Dove | Cosa |
|---|---|---|
| Test Ektelon dell'utente | `data/source/String chart Aug 262026.xlsx` | allungamento/recupero 40–65 lbs, cedimento (il «Stiff Index»), peso statico 24 h, TL6/TL12 |
| TWU String Performance Database | `data/raw/twu.html` (snapshot), `data/raw/twu.json` | rigidità dinamica, perdita di tensione, spin potential (51 lbs, swing veloce) |
| Racketpedia (solo dati gratuiti) | `data/raw/racketpedia.json` (sito, `py -m pipeline.rpedia_site`), `data/agents/rpedia*.json` (agente, verificato sul sito) | rigidità statica kg/mm, con URL della scheda |
| Pareri dei forum (controllo e potenza, solo opinioni) | `data/agents/forum_*.json` (citazione letterale, link, autore; `pipeline/community.py`) | **mai in nessun calcolo**: solo una sezione chiusa della scheda («Pareri dei forum») |
| Recensioni dei tester | `data/agents/reviews_r*.json`, `data/agents/review_overrides.json` | **solo link e confronto con i dati**: non entrano in nessun calcolo |
| Catalogo, produzione, anni di uscita | `data/agents/catalog.json`, `prod_p*.json`, `year_p*.json` | completezza marche, fuori produzione, corde uscite prima del 2020 |
| Correzioni curate | `data/crosscheck_overrides.json`, `data/catalog_fixes.json`, `data/agents/*_overrides.json`, `data/notes.json` | forme dai produttori, esiti del controllo web, note da incordatore |

## Comandi

Richiede Python 3 (`py` su Windows) con `openpyxl` e `pytest`, Node 20+ e Playwright per i test della pagina.

```bash
py -m pip install -r requirements.txt
bash tests/run_all.sh                    # ricostruisce la pagina ed esegue pytest, node --test e Playwright
python3 -m pytest -q                     # 267 test Python
node --test web/*.test.mjs               # 105 test JS dei moduli puri (confronto, consigli, stato, righelli, AI)
node tests/e2e/ui.cjs                    # 22 test della pagina in Chromium (richiede dist/preview.html)
python3 -m pipeline.watch                # novità TWU, Racketpedia e YouTube: scrive solo data/changes/watch-*.md
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

- `pipeline/` — estrazione (Excel, TWU), fusione, stime (solo per la scheda), `lab.py` (misure vere per corda), `provenance.py`, `refresh.py` (aggiornamento manuale con ripristino), `watch.py` (solo segnalazione novità), `reviews_indep.py`, note, build.
- `web/` — `template.html`, `style.css` e i moduli inlinati da `pipeline/build_page.py` (`MODULES`): `format`, `glossary` (testi dei tooltip), `diary`, `state`, `persist`, `cmp` (confronto), `next` (consigli), `ui`, `tip`, `rulers`, `today`, `sheet`, `nextui`, `hybrid`, `science`, `ask`, `app`. Regole: un `import` per riga, nessun nome top-level ripetuto (controllato da `tests/test_build_page.py`).
- `tests/` — `test_*.py`, `fixtures/state_real_2026-11-18.json` (copia dei documenti db reali), `e2e/*.cjs` (Oggi, Prossima, Scienza, qualità: gergo, 44 px, contrasto, Indietro).
- `docs/audit/2026-11-18/` — audit di dati, UX, fonti e fisica che hanno guidato la v6; `docs/superpowers/specs/2026-11-18-banco-v6-design.md` e il piano.
- `archive/` — copia della pagina online del 18/11/2026 e codice Ibridi recuperato.

## Lavoro aperto

- Guardare i video delle recensioni e scrivere le frasi chiave (oggi tutte «da guardare»).
- Termini di Tennis Warehouse: vietano crawling e riproduzione dei dati TWU; l'app è privata, ma la decisione sul rischio resta tua.
- 47 corde con «anno da verificare».
- Codice di pipeline non più usato dalla pagina (pairing, dims, profile_score): da togliere in un passo separato.
