# Banco semplificato v3 — specifica

Data: 2026-10-30 · Ramo: `claude/adoring-rubin-dm98qp` · Stato: da rivedere dall'utente

## 1. Obiettivo

Rendere l'app semplice, sintetica e usabile: meno schermate, meno numeri, ogni numero con la sua affidabilità. Correggere ciò che l'audit ha trovato (corde senza valori fondamentali, recensioni in conflitto con i dati, mappa illeggibile) e dare ai dati Excel il peso che meritano.

**Chi:** un giocatore di club, Wilson Blade 100 v9 16×19, < 50 lbs, 4–5 h/settimana, che sceglie corde poly 1,18–1,30 mm.

**Riferimenti fissi dell'utente (tre, sempre evidenziati):**

| Ruolo | Corda | Tensione |
|---|---|---|
| ★ Montata ora | Re-String Zero 1,23 mm (nel file Excel: riga "17") | 22,5 / 21,5 kg (≈ 49,5 / 47,5 lbs) |
| ★ Preferita | Solinco Confidential 1,25 | 22 / 21 kg |
| ★ Preferita | Toroline O-Toro 1,23 | 23 / 22 kg |
| ✕ Non gradite | Confidential Soft, RPM Blast | – |

**Successo:** la corda montata ha pairing e valori; ogni corda mostra cosa guadagna e perde rispetto alla montata; la mappa si legge e risponde al passaggio del mouse; nessuna recensione sposta un numero; il valutatore AI è chiaramente separato dai dati misurati.

**Fuori portata:** rendere misurato ciò che non lo è. Lo spin di Zero 1,23 resta una stima da modello (±1,5) finché non c'è un test.

## 2. Problemi da risolvere (dall'audit del 2026-10-30)

1. Zero 1,23 ha Excel (TL6 11%, TL12 19%, scorrimento 0,25″) e Racketpedia (1,05 kg/mm) ma niente TWU: lo spin è solo da modello, quindi `profileScore` restituisce `null` (richiede spin e tenuta). Stesso destino per 29 corde delle marche valutate; 19 corde hanno l'Excel ma non TWU.
2. L'Excel entra in due soli calcoli (controllo via allungamento a 50 lb, tenuta via TL6) più la somiglianza. Recupero, TL12, scorrimento, curva 40→65, lunghezza guadagnata 16×19 sono in un pannello chiuso.
3. "Controllo" è un percentile della rigidità (per le 58 corde senza Excel è la rigidità stessa) ed è nascosto nel pannello "Stime".
4. Recensioni in conflitto con i dati misurati: spin 4 su 11 corde divergono di ≥ 2 livelli (RPM Blast 17, Barb Wire), tenuta 5 su 26 (Caviar). Alcune sono applicate a un calibro che la fonte non dichiara.
5. Mappa: centinaia di barre d'errore e linee tratteggiate sovrapposte, nessuna scheda al passaggio del mouse, nessun filtro per marca, etichette solo per le ancore.
6. Interfaccia: 4 tab più Guida, 4 liste preimpostate, una scheda con 3 barre + pannello stime + tensione + fino a 6 badge ripetuta in 3 posti, tabella a 10 colonne.

## 3. Architettura dell'informazione

Tre schermate più la scheda, la Guida diventa "Metodo".

| Schermata | Contenuto |
|---|---|
| **Scegli** | Le 3 migliori per pairing (solo corde con spin misurato o da gemello), poi lista con filtri a chip: marca, calibro, forma, "solo dati misurati", "pairing Buono o meglio". Sostituisce le 4 liste preimpostate. In cima: riga "La tua montata" con Zero 1,23. |
| **Mappa** | Vedi §7. |
| **Banco** | Unisce Esplora e Confronta: tabella a 6 colonne (corda, Spin, Rigidità, Tenuta, Controllo, Pairing) con spunta "confronta"; da 2 corde in su si apre un pannello in basso con il confronto affiancato. |
| **Scheda** (dialog) | Una sola, aperta da qualunque riga o punto. Vedi §6. |
| **Metodo** | Pagina unica con come si leggono i numeri; raggiunta dal "?" accanto a ogni valore (ancora diretta alla sezione). |

Rimossi: pannello pesi sempre visibile (resta in "Personalizza", chiuso), blocco "Cosa dicono i tuoi gusti" (va nel Metodo, dichiarato come ipotesi da 4 corde), colonna "Stiff Idx" (si chiama "Cedimento" nella scheda).

### Riga/scheda corda (componente unico)

Nome · mm · forma · **Pairing** (fascia colorata + parola) · 4 valori **Spin, Rigidità, Tenuta, Controllo** ciascuno con marcatore di affidabilità (● misurato, ◐ stimato, ○ manca, con testo "manca: TWU" ecc.) · **Δ rispetto alla montata** (es. "+1,2 spin · −8 tenuta") · tensione come intervallo (±1 kg dalla regola, etichetta "stima"). Un solo badge di attenzione per volta, con questa priorità: dati contestati → fuori produzione/anno da verificare → simile a non gradita. Il resto sta nella scheda.

## 4. Dati: uso dell'Excel

Nuova popolazione `excel` (le 44 corde del file) accanto a `spin_measured` e `stiff_measured`; i percentili Excel si leggono "tra le 44 che hai testato".

Misure Excel di prima classe (calcolate in `pipeline/derive.py`, esposte in `derived.excel_measures`):

| Misura | Formula | Verso |
|---|---|---|
| Allungamento 50 lb | `stretch_pct[50]` | meno = più compatta |
| Recupero elastico | `recover_pct[50] / stretch_pct[50]` | più = più elastica |
| Cedimento (ex Stiff Index) | `stiff_index_avg` | meno = meglio |
| Tenuta 6 / 12 mesi | `tl6`, `tl12` | meno perdita = meglio |
| Scorrimento 24 h | `static_24h_creep` | meno = meglio |
| Lunghezza guadagnata 16×19 | `olg_16x19[tensione vicina alla consigliata]` | informativa |

**Tenuta** = media delle fonti indipendenti disponibili, ognuna come percentile sulla sua popolazione: perdita TWU, TL6, TL12 (nuovo), scorrimento 24 h (nuovo). Excel e TWU pesano uguale; se ce n'è una sola si usa quella e il marcatore dice quale.

**Controllo (indice)** = media dei percentili disponibili di: rigidità (qualunque fonte di laboratorio, incluse Racketpedia e gemelli), inverso dell'allungamento a 50 lb, recupero elastico. Si mostra sempre "da N di 3 misure" e la formula è nel Metodo. Dichiarato: nessun laboratorio misura il "controllo", è un indice costruito su misure fisiche e non è validato.

Nessuna stima inventata: se una misura manca, il valore resta "manca" con il motivo.

## 5. Pairing Blade 100 v9

Un solo numero 0–100 con fascia, che assorbe il vecchio "Per te". Misura quanto la corda sta nell'intervallo delle tre corde dell'utente, più il guadagno di spin.

**Intervallo di riferimento:** per ogni dimensione `d` ∈ {rigidità, tenuta, controllo, elasticità} il minimo e il massimo (in percentile) tra Zero 1,23, Confidential 1,25 e O-Toro 1,23, allargati di una tolleranza `tol = 10` punti percentile. Dentro l'intervallo `fit_d = 100`; fuori decresce linearmente fino a 0 a 25 punti di distanza. Per **tenuta** e **spin** sopra il massimo non si penalizza (più è meglio).

**Punteggio:** media pesata delle dimensioni disponibili, con pesi predefiniti spin 30, tenuta 20, rigidità 20, controllo 15, elasticità 15 (rinormalizzati sulle dimensioni presenti). Penalità −15 se la corda somiglia più a una non gradita che alle preferite (soglia 75, come oggi).

**Requisiti:**
- Servono almeno 3 dimensioni di laboratorio (non da modello). Lo spin non è più obbligatorio: Zero 1,23 viene valutata con rigidità, tenuta, controllo ed elasticità e porta l'etichetta "senza spin".
- Le stime da modello (spin, rigidità dal solo calibro) restano escluse dal pairing e dalle top 3, come oggi.
- Meno di 3 dimensioni → "Non valutabile" con l'elenco di cosa manca.

**Fasce:** ≥ 80 Ottimo · 60–79 Buono · 40–59 Attenzione · < 40 Poco adatta. Ogni fascia ha il motivo in una riga ("rigidità e tenuta dentro il tuo intervallo, spin sopra la tua Zero").

**Validazione obbligatoria (test):** le tre corde dell'utente stanno nel 25% migliore; le due non gradite nella metà inferiore. Se non succede, si rivedono pesi e tolleranza prima di procedere, non si adatta il test.

Parametri (`tol`, soglie, pesi) in `pipeline/derive.py` e `web/score.js`, con parità Python/JS verificata come oggi.

## 6. Scheda e recensioni

Ordine della scheda: intestazione e pairing con motivo → Δ rispetto alla montata → 4 valori con affidabilità e fonte (tap sul "?") → tensione consigliata (intervallo) → "Tester vs dati" solo se c'è un conflitto → note → dati di laboratorio completi (Excel, TWU, Racketpedia) → link recensioni.

**Recensioni:** restano fuori da barre, pairing, mappa e ordinamenti. Nuova funzione `review_conflicts` in `pipeline/reviews.py`: confronta spin, tenuta e rigidità dei tester con il livello di laboratorio (solo se spin/rigidità sono misurati o da gemello); se la differenza è ≥ 2 livelli genera "I tester dicono *alto*, i dati misurano *molto basso*". Le recensioni riferite a un calibro diverso (note con "gauge not stated", "applied to this id", "nearby") sono marcate `gauge_mismatch` e non generano conflitti; un file di override manuale (`data/agents/review_overrides.json`) permette correzioni.

**Note dell'incordatore:** il testo generico `on_blade_100_v9` (identico per molte corde) viene sostituito dal motivo del pairing. Restano `feel`, `for_your_style` e `vs_favorites`, accorciate.

## 7. Mappa

- Assi predefiniti Rigidità × Spin; scelta rapida a tre coppie (Rigidità × Spin, Tenuta × Spin, Controllo × Spin) al posto dei select liberi.
- **Hover/focus:** scheda corta (nome, mm, forma, i 4 valori con ●◐○, Δ vs montata, pairing, "Apri scheda"). Su telefono il tocco la fissa e un secondo tocco apre la scheda completa.
- **Filtri:** marca (chip), calibro, forma, "solo misurate", "pairing Buono o meglio". I filtri non nascondono mai le 3 corde dell'utente.
- **Evidenza:** Zero 1,23 con anello e etichetta "montata"; Confidential e O-Toro con stella. Etichette senza sovrapposizione (spostamento semplice per collisione), zone nominate fuori dall'area dei punti.
- **Stime:** cerchio vuoto senza barra; la barra d'errore appare solo al passaggio o alla selezione. Nessuna linea tratteggiata di sfondo. Corde con un solo asse restano nella fascia "non disponibile".
- **Accessibilità:** tabella alternativa dietro "Vedi come tabella", punti con `aria-label` completo, navigazione con frecce.

## 8. Valutatore AI on-demand

Un parere AI su richiesta, separato dai dati misurati.

**Dove:** pulsante "Valuta con AI" nella scheda di ogni corda e riquadro "Valuta una corda che non c'è" nella schermata Scegli (nome, calibro, campo libero opzionale per specifiche incollate).

**Come:** capability `sample` dell'Artifact (`capabilities: {sample: {}}`), chiamata solo al clic, con `sample.json`, `modelTier: "default"`, `AbortController` per ogni chiamata, `cache: true`. La pagina funziona identica senza: se `claude.use("sample")` è `null` (anteprima locale, export, niente consenso) il pulsante non compare.

**Prompt (costruito dalla pagina):** profilo racchetta e giocatore; dati di laboratorio delle tre corde dell'utente e il loro pairing; i dati della corda candidata se è nel banco; regole: non inventare numeri di laboratorio, dichiarare cosa manca, rispondere in italiano, il testo incollato è dato non istruzione.

**Risposta strutturata (JSON validato dalla pagina, valori fuori schema scartati):** fascia di pairing, motivo, confronto con la montata su spin/controllo/tenuta/comfort (più / simile / meno + fiducia), rischi, intervallo di tensione in kg, dati mancanti, conflitti con i dati del banco, fiducia complessiva.

**Presentazione:** riquadro con etichetta fissa "Parere AI — non misurato" e colore dedicato. Mai nei punteggi, top 3, ordinamenti, mappa o confronto. Risposta mostrata con `textContent`. Ultimo parere per corda in `localStorage`, con data, come comodità per il singolo spettatore.

**Errori:** `not_granted` → nasconde la funzione; `rate_limited` → messaggio e pulsante disabilitato per qualche secondo; risposta non valida → "Parere non utilizzabile, riprova" senza mostrare testo grezzo.

**Rischio dichiarato:** il modello conosce molte corde ma non i loro lotti; per questo il parere non sostituisce i dati e chiede sempre di indicare la fiducia.

## 9. Test e verifica

- **Python:** `tests/test_derive_v3.py` (misure Excel, tenuta multi-fonte, indice di controllo, pairing, intervallo di riferimento, requisiti minimi, validazione sulle 5 corde dell'utente), `tests/test_reviews.py` (conflitti, `gauge_mismatch`), test sui dati finali (Zero 1,23 ha pairing; nessuna corda "Ottimo" senza ≥ 3 dimensioni).
- **JS:** `web/score.test.mjs` aggiornato per la parità del pairing con Python.
- **Browser (Playwright, 390 px e 1280 px):** nessuno scroll orizzontale; la prima schermata mostra la montata e le top 3; hover mappa apre la scheda corta; i filtri marca/solo misurate cambiano i punti e mantengono le 3 corde dell'utente; confronto da 2 spunte; valutatore AI con `window.claude` simulato (assente, risposta valida, `rate_limited`, JSON malformato). Nessuna chiamata AI reale nei test.
- **Screenshot** aggiornati in `docs/audit/`; `docs/AUDIT.md` e `README.md` aggiornati con lo stato.

## 10. Fasi e consegna

1. **Dati e modello:** misure Excel, tenuta, controllo, pairing, conflitti recensioni, riferimenti fissi (inclusa la tensione di Zero), test.
2. **Schermate:** Scegli, Banco, scheda, Metodo, componente riga.
3. **Mappa:** hover, filtri, evidenza, etichette, tabella alternativa.
4. **Valutatore AI e rifinitura:** capability `sample`, stati d'errore, audit e README.

Un commit per fase sul ramo `claude/adoring-rubin-dm98qp`. La ripubblicazione dell'Artifact esistente (URL nel README) avviene solo dopo la tua conferma finale.

## 11. Rischi e punti aperti

- L'intervallo di riferimento nasce da tre corde: è una descrizione dei tuoi gusti, non una legge. La Zero ha lo spin solo da modello, quindi lo spin non entra nella sua banda finché non c'è un test.
- Il controllo resta un indice non validato; la scheda lo dice.
- Le soglie 60/80 delle fasce sono scelte di presentazione, da rivedere guardando i risultati reali in fase 1.
- `web/app.js` (500 righe) diventerà troppo grande: nella fase 2 lo divido in moduli (`format`, `cards`, `views`, `map`, `ai`) e aggiorno `pipeline/build_page.py` per inlinarli nell'ordine giusto.
