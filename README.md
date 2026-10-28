# Banco Corde Blade 100

Strumento per scegliere corde poly (1.18–1.30 mm) per una **Wilson Blade 100 v9 (16×19)**, giocatore di club tutto campo con rotazioni, < 50 lbs, 4–5 h/settimana.

- **Pagina pubblicata (Artifact):** https://claude.ai/artifact/Up1BjSe7qFPH7zaRgsh5Ne
- **Corde di riferimento:** ★ Solinco Confidential 1.25 (22/21 kg), ★ Toroline O-Toro 1.23 (23/22 kg); ✕ Confidential Soft, ✕ RPM Blast.

## Fonti dei dati

| Fonte | Dove | Cosa |
|---|---|---|
| TWU Compare Strings | `data/raw/twu_compare.json` (`py -m pipeline.twu_compare`) | restituzione di energia, attrito corda-corda e corda-palla, solo per le righe TWU misurate (exact/probable) e coerenti con la tabella principale |
| Date delle fonti | `data/raw/sources.json` | quando è stata scaricata ogni fonte: la pagina lo mostra al tocco su ogni numero |
| Test Ektelon dell'utente | `data/source/String chart Aug 262026.xlsx` | allungamento/recupero 40–65 lbs, Stiff Index (= indice di cedimento), peso statico 24 h, TL6/TL12 |
| TWU String Performance Database | `data/raw/twu.html` (snapshot), `data/raw/twu.json` | rigidità dinamica, perdita di tensione, spin potential (51 lbs, swing veloce) |
| Racketpedia (solo dati gratuiti) | `data/raw/racketpedia.json` (sito, `py -m pipeline.rpedia_site`), `data/agents/rpedia*.json` (agente, verificato sul sito) | rigidità statica kg/mm, con URL della scheda |
| Recensioni tester | `data/agents/reviews_r*.json` | **solo link informativi**: non entrano in nessun calcolo |
| Catalogo, produzione, anni di uscita | `data/agents/catalog.json`, `prod_p*.json`, `year_p*.json` | completezza marche, fuori produzione, corde uscite prima del 2020 |
| Correzioni curate | `data/crosscheck_overrides.json`, `data/catalog_fixes.json`, `data/agents/*_overrides.json`, `data/notes.json` | forme dai produttori, esiti del controllo web, note da incordatore scritte a mano |

## Regole attuali (decise dall'utente)

**v3 (2026-10-28, spec `docs/superpowers/specs/2026-10-28-banco-corde-v3-design.md`):**
- Tutto parte dalla **corda che monti adesso** (default Confidential 1,25 a 22/21 kg, salvata nel browser): consigli, frase "rispetto alla tua corda", tensione di partenza e prima colonna del confronto.
- Tre schermate: **La tua corda** (3 modelli da provare + altre 9), **Confronta** (tabella affiancata), **Esplora** (mappa con solo valori misurati di default, elenco dei 53 modelli, come leggere, metodo).
- Nei consigli niente altri calibri/colori della corda attuale e delle preferite, niente non gradite, dati contestati o spin solo da modello; un calibro per modello.
- Il numero 0–100 non si mostra più: l'ordine resta quello del punteggio di laboratorio, il perché è nella frase e nelle frecce.
- Ogni numero si tocca e mostra fonte, data, condizioni, tipo e margine. Badge in 3 categorie: *tua*, *stima*, *attenzione*.
- Solo dati gratuiti (Excel, TWU, Racketpedia gratuito); niente prezzi; aggiornamento solo manuale.

**Regole dalla v2, ancora valide:**

1. **Solo dati di laboratorio** per giudizi, punteggio e classifiche (Ektelon, TWU, Racketpedia, gemelli di calibro misurati). Le recensioni restano solo come link.
2. **Si tolgono le corde uscite prima del 2020 e quelle fuori produzione**; le 4 corde di riferimento restano sempre. Anno non trovato → badge "anno da verificare".
3. Punteggio profilo (0–100, posizione tra le corde del banco, non un voto): spin 35, tenuta 20, affinità con le preferite 20; serve almeno spin e tenuta, altrimenti nessun punteggio; −15 se la corda somiglia più a una non gradita che alle preferite (soglia 75). Controllo e comfort sono solo *stime dalla rigidità* e non entrano nel punteggio; "potenza" è stata tolta (era 100 − controllo).
4. Spin: misurato TWU, oppure da gemello di calibro/colore (±0,5), oppure — solo per posizionare la corda in mappa e confronto — **stima da modello** (rigidità + forma esagonale, ridge; in leave-one-out errore medio 0,99 contro 1,19 della media, intervallo ±1,5 all'80%; senza rigidità solo la forma). Le stime da modello non entrano mai nel punteggio né nelle top 3. Nessuna stima dalle recensioni (verificato: non predicono lo spin TWU).
5. Rigidità (importante per l'uso): misurata TWU > gemello TWU **corretto per il diametro** (≈ +203 lb/in per mm, 20 coppie, errore 9,2 contro 13,4 del copia-incolla; vale anche per le righe TWU proxy, come la Confidential 1,25 derivata dal 1,30) > Racketpedia convertita (±11 lb/in; anche da gemello, corretta per il diametro) > solo calibro (errore 12,6 contro 14,6 della media, ±22). Tenuta = perdita TWU (il TL6 del tuo test solo se manca TWU). Pendenza della tensione ricavata dalle due preferite. Le stime da gemello/Racketpedia contano nel punteggio come "parente"; quella dal solo calibro no. I giudizi personali dei tester non entrano mai.

## Comandi

Richiede Python 3 (`py` su Windows) con `openpyxl` e `pytest`, e Node per i test JS.

```bash
py -m pip install -r requirements.txt
py -m pytest -q                          # test Python
node --test web/*.test.mjs               # test JS (punteggio, consigli, frase, tensione)
py -m pipeline.excel_extract "data/source/String chart Aug 262026.xlsx" data/raw/excel.json
py -m pipeline.twu_extract data/raw/twu.json      # riscarica TWU (rete)
py -m pipeline.validate_agents           # abbinamenti + Racketpedia -> matches.json / rpedia.json
py -m pipeline.rpedia_site               # riscarica Racketpedia dal sito (rete) -> data/raw/racketpedia.json
py -m pipeline.merge                     # -> data/merged.json
py -m pipeline.build                     # -> data/strings.json
py -m pipeline.twu_compare               # riscarica TWU Compare (rete) -> data/raw/twu_compare.json
py -m pipeline.build_page                # -> dist/string-explorer.html (+ dist/preview.html per anteprima locale)
node tests/ui/check_page.mjs dist/preview.html   # controlla la pagina (criteri della spec v3) e salva gli screenshot in docs/audit/v3/
py -m pipeline.refresh                   # aggiornamento manuale: riscarica le fonti, dice cosa è cambiato, ricostruisce
py -m http.server 8765 --directory dist  # anteprima: http://localhost:8765/preview.html
```

## Struttura

- `pipeline/` — estrazione (Excel, TWU), normalizzazione (`scope.py`), fusione, stime (`estimate.py`), metriche (`derive.py`), note (`notes_gen.py`), catalogo, produzione/anni, build.
- `web/` — `template.html`, `style.css` e moduli concatenati da `build_page` nello stesso script: `score.js` (punteggio, parità con Python), `recommend.js` (logica pura: consigli, frase, tensione), `format.js`, `prov.js` (popover della provenienza), `badges.js`, `current.js` (corda attuale), `home.js`, `compare.js`, `explore.js`, `app.js` (avvio e tab). I nomi in testa ai moduli devono essere unici (c'è un test).
- `docs/superpowers/specs/` e `plans/` — specifiche e piani (v1 e v2, con le decisioni successive in fondo alla spec v2).
- `tests/` — test Python (pytest) e `tests/ui/check_page.mjs` (Playwright).
- `docs/AUDIT.md` — audit di dati, racconto dei dati e UI (con lo stato delle correzioni).

## Lavoro aperto

- Lista acquisti su Tennis Warehouse Europe da aggiornare con le nuove candidate (`data/agents/shopping_*.json` riflette la lista precedente).
- 31 corde con "anno da verificare".
- Minori noti: le Confidential Soft 16/17 (solo catalogo) non hanno l'avviso "simile a non gradita"; nella mappa gli assi avanzati "Perdita"/"Punteggio" disegnano pieni anche valori stimati; niente indicatori a punti nel confronto su telefono.
- Dall'audit (vedi `docs/AUDIT.md`, sezione "Stato"): margini d'errore dello spin non propagati nel punteggio, regola della tensione di partenza non validata, etichette sovrapposte nella mappa, anni di uscita da verificare.
