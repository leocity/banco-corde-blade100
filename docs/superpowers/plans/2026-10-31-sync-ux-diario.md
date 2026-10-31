# Sincronizzazione, UX da telefono e diario di prova — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (esecuzione nativa scelta dall'utente). Steps use checkbox syntax. TDD: ogni test si vede fallire prima.

**Goal:** (1) i dati passano tra telefono e PC senza sovrascritture; (2) l'app si usa bene da telefono: righe compatte, scheda con azioni sempre visibili, navigazione corta; (3) il diario di prova con voti, tensione e quando.

**Architecture:** lo stato in memoria resta lo stesso oggetto; il salvataggio `db` passa da un unico documento a documenti separati nella raccolta personale `data/users/<id>` (`state`, `s-<ts>` per sessione, `l-<lid>` per vita) con `onSnapshot` e scritture a differenza. Le liste usano una riga compatta (un solo pulsante apre la scheda); la scheda ha riepilogo in alto, sezioni richiudibili e barra azioni fissa. Il diario sta dentro la vita della corda (`equipped.diary` e `lives[].diary`).

**Tech Stack:** come il piano precedente (Python + pytest, moduli JS inlinati, `node --test`, Playwright).

**Spec:** `docs/superpowers/specs/2026-10-31-diario-prove-design.md` (diario), con le scelte dell'utente del 2026-10-31: **righe compatte** in lista; **voti in 3 momenti** (primo colpo, metà vita, fine vita), con la card «Voti e sensazioni» in primo piano nella schermata Montata. Il resto (sincronizzazione, scheda, navigazione) è deciso qui sotto.

## Global Constraints

- Italiano, decimali con virgola. Regole dei moduli JS invariate: un `import` per riga, solo `export function|const`, nessun nome top-level ripetuto (`tests/test_build_page.py`).
- `db`: percorsi `data/users/<id>` = raccolta (3 segmenti), documento = 4 segmenti. Documenti ≤ 256 KiB. Una scrittura alla volta; vince l'ultimo stato locale; mai riscrivere ciò che non è cambiato.
- Niente dati persi: la migrazione dal documento unico (v1) scrive gli elementi prima di togliere gli array dal documento `state`, ed è ripetibile.
- Stato di salvataggio sempre visibile: «Sincronizzato», «Solo su questo browser», «Errore di salvataggio».
- Voti 1–5 interi, 8 categorie: `spin, control, power, touch, comfort, stability, liveness, durability`. Momenti: `first, mid, end`. Verdetto `si|forse|no` → `liked|disliked|nessun cambio`. Tag fissi (spec diario §2). I voti non cambiano pairing né punteggi.
- Un commit per task, `git push` a fine fase; attribuzione come nei commit precedenti. L'Artifact (`e136d0a6-604f-4d3b-a549-7777e55c1db7`, privato, stesso link) si ripubblica con `publish_files` da `dist/preview.html` dopo le fasi A e B e alla fine.

## Review Focus

1. **Migrazione dal documento v1 dell'utente** (10 sessioni sulla Zero): nessuna sessione persa, nessun duplicato rieseguendola, `state` senza array a fine migrazione (Task 1).
2. **Pagina vecchia aperta sul PC**: una modifica dal PC non cancella ciò che il telefono ha aggiunto; una sessione aggiunta altrove compare senza ricaricare (Task 1, 2).
3. **Cancellazione e modifica propagate** tra dispositivi, e un'eco della propria scrittura non fa rimbalzare la schermata (Task 1, 2).
4. **Scheda e liste da 390 px**: nessuna etichetta sovrapposta, «Monta questa» sempre raggiungibile, nessuno scroll orizzontale, 8+ corde per schermata (Task 3–5).
5. **Dati del diario fuori norma** (voti 0 o 7, tag inventati, testi enormi, tensione 99 kg, HTML): scartati o limitati, mai HTML inserito (Task 6–7).

---

## Fase A — Sincronizzazione

### Task 1: Persistenza a documenti separati (`web/persist.js`, `web/state.js`)

**Files:** Modify `web/state.js`, `web/persist.js`, `web/state.test.mjs`, `web/persist.test.mjs`.

**Interfaces:**
- `state.js`: `splitState(state) -> { core: {v:2, equipped, liked, disliked}, sessions: {[docId]: session}, lives: {[docId]: life} }` con `docId` = `s-<ts>` e `l-<lid>`; `joinState(core, sessions, lives) -> object` (stato grezzo da passare a `sanitizeState`); `lives[].lid` assegnato da `changeString` (`'l' + Date.now()` o il parametro `lid` per i test) e, per le vite senza `lid`, dedotto da `sanitizeState` come `'l-' + from`.
- `persist.js`: `createPersistence(...)` restituisce `{ mode, status: 'sync'|'local'|'error', lastError, load(), save(state), subscribe(onRemote), exportJson(state) }`. In modalità db: raccolta `data/users/<uid>`; `load()` fa `col.get()`, migra il v1 (documento `state` con array `sessions`/`lives`: scrive `s-…`/`l-…` poi riscrive `state` senza array); `save()` accoda l'ultimo stato e scrive solo i documenti cambiati/aggiunti/tolti, uno alla volta; `subscribe(cb)` usa `col.onSnapshot`, aggiorna lo specchio, e chiama `cb(stato)` solo a coda vuota (e dopo ogni coda svuotata se nel frattempo è arrivato altro). Locale: invariato (un JSON in `localStorage`).

- [ ] **Step 1: Write failing tests.** In `web/persist.test.mjs` un `fakeDb()` con `collection(path)` che supporta `get()`, `onSnapshot(cb)`, `doc(id).set/delete`, e un metodo `external(op)` che simula un altro dispositivo; test: (a) `save` scrive solo `state` + il nuovo `s-…` quando si aggiunge una sessione (contare le `set`); (b) migrazione di un documento v1 con 3 sessioni e 1 vita → 3 documenti `s-…`, 1 `l-…`, `state` senza array, e rieseguita non duplica; (c) dopo `subscribe`, `external` che aggiunge una sessione chiama `cb` con 1 sessione in più; (d) `external` che cancella una sessione la toglie dallo stato; (e) una modifica locale a metà coda: lo snapshot arrivato durante la scrittura non fa tornare indietro lo stato (la callback arriva dopo, con lo stato fuso); (f) pagina vecchia: stato locale stale + sessione aggiunta altrove: il `save` di una modifica non cancella la sessione esterna (il diff lavora sullo specchio, non cancella ciò che lo stato locale non ha mai visto: si cancella solo ciò che era nello specchio e l'utente ha tolto); (g) `status` diventa `error` se `set` rigetta e torna `sync` al successivo; (h) senza db resta locale. In `web/state.test.mjs`: `splitState`/`joinState` round-trip, `lid` assegnato e dedotto.
- [ ] **Step 2: Run** `node --test web/persist.test.mjs web/state.test.mjs` — Expected: FAIL.
- [ ] **Step 3: Implement.** Tenere `clone`, la coda a ultimo-stato-vince e il ripiego locale già presenti. Il diff: `sent` = specchio degli id scritti/visti; per cancellare serve che l'id fosse nello specchio **e** assente dallo stato locale **e** non aggiunto dopo l'ultimo snapshot locale (traccia `known` = id presenti nell'ultimo stato locale letto o scritto).
- [ ] **Step 4: Run** `node --test web/*.test.mjs` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): salvataggio a documenti separati con ascolto e migrazione dal documento unico`.

### Task 2: Sincronizzazione dal vivo nell'app e indicatore di stato

**Files:** Modify `web/app.js`, `web/mine.js`, `web/template.html`, `web/style.css`, `tests/e2e/montata.cjs`, `tests/e2e/ui.cjs`.

**Interfaces:** `ctx.syncStatus() -> 'sync'|'local'|'error'|'pending'`; elemento `#sync-badge` nell'intestazione (testo e colore: «● Sincronizzato», «○ Solo su questo browser», «⚠ Errore di salvataggio», niente mentre carica); `app.js` chiama `persist.subscribe(remote => ...)` dopo il caricamento: se lo stato ricevuto differisce da quello in memoria (confronto JSON) lo sostituisce, svuota la cache e ridisegna, aggiornando anche la scheda aperta.

- [ ] **Step 1: Write failing e2e.** Un `FAKE_CLAUDE` nuovo che implementa la raccolta (get/onSnapshot/set/delete su `localStorage`) ed espone `window.__external(op)`; test: sessione aggiunta «altrove» compare in Montata senza ricaricare e le ore salgono; sessione tolta altrove sparisce; con la pagina «vecchia» (stato caricato, poi `__external` aggiunge 2 sessioni) un'azione locale (★ su una corda) non le cancella (il documento della raccolta le contiene ancora); `#sync-badge` dice «Sincronizzato» con db, «Solo su questo browser» senza, «Errore di salvataggio» con `set` che rigetta; migrazione: raccolta pre-caricata con il solo documento `state` v1 (le 10 sessioni dell'utente) → dopo il caricamento la schermata mostra 17,5 h e la raccolta contiene 10 documenti `s-…`.
- [ ] **Step 2: Run** `node tests/e2e/montata.cjs` — Expected: FAIL.
- [ ] **Step 3: Implement** il collegamento in `app.js` e l'indicatore; `renderPersistNote` usa `persist.status`.
- [ ] **Step 4: Run** `tests/run_all.sh` — Expected: tutto verde.
- [ ] **Step 5: Commit & push; ripubblicare l'Artifact** (hotfix: sincronizzazione), verificare versione live.

---

## Fase B — UX da telefono

### Task 3: Riga compatta

**Files:** Modify `web/cards.js`, `web/values.js` (se serve), `web/choose.js`, `web/bank.js`, `web/style.css`, `web/cards.test.mjs`, `tests/e2e/scegli.cjs`, `tests/e2e/banco.cjs`.

**Interfaces:** `compactRowHtml(rec, ctx) -> string`: un solo `<button class="crow2" data-open="ID">` (tutta la riga apre la scheda) con riga 1 = nome · marca e calibro · pill pairing (o ★ preferita / ✕ non gradita / «montata») e riga 2 = quattro mini-valori `valore` + etichetta + marcatore ●◐○ (Spin, Rigidità, Tenuta, Controllo), più la differenza dalla montata (se c'è); nessun pulsante dentro; un avviso solo come punto «⚑» col titolo. Altezza ≤ 76 px a 390 px. `rowHtml` resta solo per la scheda della montata in Montata.

- [ ] **Step 1: Write failing tests.** `cards.test.mjs`: per tutte le 102 corde `compactRowHtml` ha un solo `button`, `data-open`, quattro `.m`, niente `NaN/undefined/null` (esclusi i testi delle recensioni), HTML dei dati escapato, ○ con «manca» per tenuta assente. e2e a 390 px: in Scegli le top 3 e la lista sono `.crow2`, la prima scheda `.crow2` ≤ 76 px di altezza, **almeno 6 righe visibili nella prima schermata sotto la striscia dopo uno scroll di una pagina**; toccare una riga apre la scheda; nessuno scroll orizzontale. In Banco su telefono ogni riga ha anche la spunta «Confronta» fuori dal pulsante.
- [ ] **Step 2–4:** run (RED), implementare, run (GREEN) con `tests/run_all.sh`.
- [ ] **Step 5: Commit** `feat(web): righe compatte nelle liste`.

### Task 4: Scheda ristrutturata

**Files:** Modify `web/cards.js` (`sheetHtml`), `web/style.css`, `web/cards.test.mjs`, `tests/e2e/banco.cjs`, `tests/e2e/ai.cjs`.

**Interfaces:** `sheetHtml(rec, ctx)` nell'ordine: intestazione (nome, mm·forma, pill pairing, motivo) → griglia 2×2 dei quattro valori con marcatore → differenza dalla montata e tensione → sezioni `<details>`: «Dettagli e stime» (comfort, elasticità, cedimento, vita attesa), «Note dell'incordatore», «Dati di laboratorio», «Recensioni» (aperta se c'è un conflitto, con il riquadro «Tester e dati non concordano»), «Parere AI» (se disponibile) → **barra azioni fissa in basso** `.sheet-actions` (Monta questa · ★ · ✕ · Confronta), sempre visibile. Le righe `kv` non si sovrappongono (colonne `minmax(0,1fr)`, testo a capo).

- [ ] **Step 1: Write failing tests.** unit: ordine delle sezioni, `data-equip` dentro `.sheet-actions`, nessun `NaN`. e2e a 390 px su 5 corde diverse: aprire la scheda, **«Monta questa» è visibile senza scorrere la scheda** (`boundingBox` entro il viewport), nessun elemento `.kv dt` si sovrappone al proprio `dd` (confronto dei rettangoli), chiudere e aprire un'altra scheda 3 volte di fila senza errori né salti di scroll della pagina sotto la scheda, `Esc` chiude, la pagina dietro non scorre.
- [ ] **Step 2–4:** run (RED), implementare, run (GREEN).
- [ ] **Step 5: Commit** `feat(web): scheda con riepilogo, sezioni richiudibili e azioni sempre visibili`.

### Task 5: Navigazione corta e Montata riordinata

**Files:** Modify `web/template.html`, `web/choose.js`, `web/mine.js`, `web/style.css`, `tests/e2e/scegli.cjs`, `tests/e2e/montata.cjs`.

**Interfaces:** intestazione da telefono di 48 px (titolo su una riga, «Metodo», `#sync-badge`); il profilo va nel Metodo. Scegli: ricerca sempre visibile; marca, calibro, forma e i tre interruttori dentro `<details id="filters">` con il conteggio dei filtri attivi nel `summary`. Montata in questo ordine: riepilogo corda (una riga: nome, kg, ore, fascia usura) → **card «Voti e sensazioni»** (segnaposto con pulsante «Dai un voto» finché il diario non c'è, Task 7) → «Segna sessione» con scorciatoie data (Oggi · Ieri · altra data; la data scelta resta per le sessioni successive) e ore rapide → usura → storico. 

- [ ] **Step 1: Write failing e2e (390 px).** altezza dell'intestazione ≤ 56 px; i filtri sono chiusi di default e `summary` mostra «Filtri» o «Filtri (2)»; la prima schermata di Scegli mostra la striscia, il campo di ricerca e almeno 2 righe; in Montata la card voti sta sopra «Segna sessione»; aggiungere 3 sessioni consecutive «Ieri» (ore diverse) richiede solo i pulsanti rapidi e le date risultano ieri; nessuno scroll orizzontale.
- [ ] **Step 2–4:** run (RED), implementare, run (GREEN).
- [ ] **Step 5: Commit & push; ripubblicare l'Artifact** (fase B).

---

## Fase C — Diario di prova

### Task 6: Modello e funzioni pure del diario (`web/diary.js`, `web/state.js`)

**Files:** Create `web/diary.js`, `web/diary.test.mjs`. Modify `web/state.js` (`sanitizeState` v2: `equipped.diary`, `lives[].diary`, `lives[].lid`), `web/state.test.mjs`.

**Interfaces (`diary.js`):** `CATS` (le 8 chiavi con etichetta e descrizione breve), `MOMENTS = ['first','mid','end']`, `TAGS`; `emptyDiary()`; `setRating(diary, moment, cat, value|null)`; `setTag(diary, tag, on)`; `setVerdict(diary, v)`; `addMeter(diary, {hours, value})`, `removeMeter(diary, i)`; `momentAverage(diary, moment) -> number|null`; `categoryMeans(diaries) -> {cat: number|null}`; `tensionLoss(diary) -> [{hours, pct}]` (da `meter`, serve la lettura a 0 h); `verdictToPreference(verdict) -> 'liked'|'disliked'|null`; `applyVerdict(state, stringId, verdict) -> state` (sì → `setPreference liked`, no → `disliked`, forse → invariato); `spearman(xs, ys) -> {r, n}|null` con ranghi medi per le parità; `diaryCsv(state, byId) -> string`; `sanitizeDiary(raw) -> diary` (voti 1–5 interi, tag dall'elenco, testi ≤ 2000, tensione `nextKgDelta` ∈ [−3, 3], letture ≤ 8, `strungOn` data valida, superficie e pre-stretch dall'elenco).

- [ ] **Step 1: Write failing tests** per ogni funzione (valori fuori norma: voto 0 e 7 scartati, tag inventato scartato, 5000 caratteri → 2000, `nextKgDelta` 9 scartato, HTML conservato come testo non eseguibile), `spearman` con parità e `n<3 → null`, `tensionLoss` senza lettura a 0 h → `[]`, `applyVerdict` per sì/no/forse, `diaryCsv` con virgole e virgolette nelle note, `sanitizeState` v1→v2 senza diario.
- [ ] **Step 2–4:** run (RED), implementare, run (GREEN).
- [ ] **Step 5: Commit** `feat(web): modello del diario, verdetto, correlazione di rango e CSV`.

### Task 7: Diario in Montata

**Files:** Create `web/diaryui.js`. Modify `web/mine.js`, `web/template.html`, `web/style.css`, `web/app.js`, `pipeline/build_page.py` (`MODULES`), `tests/e2e/diario.cjs` (nuovo, in `ui.cjs`).

**Interfaces:** `renderDiary(ctx)`, `initDiary(ctx)`: card `#diary` con tre pulsanti di momento (`[data-moment]`: Primo colpo · Metà vita · Fine vita) che aprono un pannello con 8 righe (`.rate[data-cat]`) di selettori 1–5 a tocco (pulsanti ≥ 44 px, `aria-pressed`), un voto già dato si toglie ritoccandolo; tag (chip), nota; sezione «Setup» (tensione usata V/H modificabile, data di montaggio, pre-stretch, incordatore, superficie); «Tensiometro» (letture ore/valore con mini-curva della perdita); verdetto (Sì/Forse/No) con toast «Segnata come preferita» e **Annulla**; «la prossima volta ±kg». Ogni modifica passa da `ctx.update` (salvataggio automatico).

- [ ] **Step 1: Write failing e2e (`tests/e2e/diario.cjs`).** a 390 px: trovare «Voti e sensazioni» in Montata senza scorrere oltre una schermata; dare 5 voti al primo colpo e riaprire dopo reload (locale e db simulato); ritoccare un voto lo toglie; media del momento mostrata; verdetto Sì → la corda compare tra le preferite e **Annulla** la toglie; Forse non cambia; tensione 99 non accettata e messaggio; tag e nota con `<img onerror>` restano testo; nessun `NaN`; nessuno scroll orizzontale.
- [ ] **Step 2–4:** run (RED), implementare, run (GREEN).
- [ ] **Step 5: Commit** `feat(web): diario con voti in tre momenti, setup, tensiometro e verdetto`.

### Task 8: Cambio corda con voti di fine vita e prove passate

**Files:** Modify `web/mine.js`, `web/diaryui.js`, `web/template.html`, `tests/e2e/diario.cjs`.

**Interfaces:** il dialogo «Cambia corda» offre «Dai i voti di fine vita» (apre il momento `end` del diario della corda che si toglie, saltabile) e il diario passa alla vita chiusa; in «Corde finite» ogni voce si apre per vedere/modificare il diario; pulsante «Aggiungi prova passata» (cerca corda, date da/a, tensione V/H, ore, motivo, diario) che crea una vita in `lives`.

- [ ] **Step 1: Write failing e2e:** cambio corda con voti di fine vita → la vita chiusa in «Corde finite» contiene i voti e si può riaprire e modificare; prova passata creata con tensione e voti, compare nello storico e nella scheda della corda; una prova passata con `reason` «rotta» non calibra la vita attesa.
- [ ] **Step 2–4:** run (RED), implementare, run (GREEN).
- [ ] **Step 5: Commit** `feat(web): voti di fine vita al cambio corda e prove passate`.

### Task 9: «Le tue prove», laboratorio contro sensazioni, CSV, AI

**Files:** Modify `web/cards.js`, `web/method.js`, `web/ai.js`, `web/mine.js`, `tests/e2e/diario.cjs`, `web/ai.test.mjs`, `web/cards.test.mjs`.

**Interfaces:** nella scheda, sezione «Le tue prove» (righe per prova ordinate per tensione: data, kg, ore, media per momento, verdetto; medie per categoria; con ≥ 2 tensioni la frase neutra); `renderMethod` aggiunge «Laboratorio contro sensazioni» (visibile con ≥ 5 corde con voti di fine vita e misura di laboratorio; per coppia spin↔spin TWU, controllo↔indice, mantenimento↔tenuta, potenza↔100−controllo, comfort↔inverso rigidità: Spearman `r` e `n`; sotto `n = 8` la dicitura «troppo poche corde per fidarsi»); `#export-diary` (solo con `downloads`) salva `banco-corde-diario.csv`; `buildOpinionPrompt` include le prove dell'utente (kg, ore, voti, tag, note) come «le tue sensazioni, opinioni non misure».

- [ ] **Step 1: Write failing tests:** scheda con due prove a 22,5 e 23,5 kg mostra entrambe in ordine e la frase; Metodo con meno di 5 corde non mostra la tabella e con 5 sì (dati sintetici a correlazione nota: `r` atteso), `n < 8` dichiarato; prompt AI contiene i voti e le note dell'utente e non li presenta come misure; esportazione con `downloads` simulato contiene l'intestazione e una riga per prova/momento; nessun `NaN`.
- [ ] **Step 2–4:** run (RED), implementare, run (GREEN).
- [ ] **Step 5: Commit** `feat(web): prove nella scheda, laboratorio contro sensazioni, CSV e AI con le tue sensazioni`.

### Task 10: Documenti, verifica, pubblicazione

**Files:** Modify `README.md`, `docs/AUDIT.md`, `tests/e2e/shots.cjs`, `docs/audit/v3-*.png`.

- [ ] **Step 1:** screenshot 390/1280 di Scegli (righe compatte), scheda, Montata con diario; guardare le immagini e correggere ciò che si vede.
- [ ] **Step 2:** aggiornare README (schermate, salvataggio a documenti, diario, conteggio test) e AUDIT (segnalazioni dell'utente del 2026-10-31 con stato; problemi aperti dichiarati).
- [ ] **Step 3:** `tests/run_all.sh` verde; revisione finale con un revisore nuovo sul pacchetto filtrato (Review Focus sopra); correggere critici e importanti con test che falliscono prima; rimandati nel registro.
- [ ] **Step 4:** commit, push, ripubblicare sullo stesso link (`publish_files` da `dist/preview.html`), verificare versione live e regole di `db`; dire cosa non si è potuto verificare (stato privato di un utente).
