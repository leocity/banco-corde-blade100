# Revisione della fisica del banco (2026-10-31)

Perché: un testo generato da Gemini sostiene che la regola «corda più rigida = meno potenza = più controllo» non vale, e che la Slap è «infinitamente più governabile» della Zero. Qui si separa ciò che è stabilito, ciò che è solo affermato e ciò che l'app assume davvero. Le correlazioni sono di rango (Spearman) tra misure del banco e livelli dati da tester indipendenti dello stesso calibro (non il produttore); con n piccolo sono indicazioni, non prove. Si riproducono con `pipeline/validate_indices.py` e con i dati in `data/strings.json`.

## 1. Il testo di Gemini

| Affermazione | Stato |
|---|---|
| Il controllo di profondità dipende dall'angolo di uscita e dalla sua ripetibilità, non dall'energia restituita | **Plausibile e in linea con la fisica**: tensione e rigidità del piatto cambiano velocità e angolo di rimbalzo (Cross e altri, studi di rimbalzo obliquo). È il limite di ogni indice di laboratorio: nessuno dei nostri dati misura l'angolo di uscita né la sua ripetibilità. |
| Snapback e scivolamento delle verticali aggiungono spin; le poly scivolose ne producono di più | **Stabilito** (Cross e Lindsey, Tennis Warehouse University): meno attrito tra le corde = più snapback = più spin, nelle condizioni di prova. |
| Più spin = traiettoria che scende (Magnus): il «controllo» di una corda sagomata è attivo e dipende dagli RPM | **Fisica corretta in generale**, ma non è stato misurato su Zero o Slap. |
| «1° di angolo = oltre 1,5 m di profondità», «dwell time 4–6 ms» | **Nessuna fonte data.** Sono ordini di grandezza plausibili ma non verificati qui. |
| La Zero ha un rivestimento ultra-slick e un angolo di uscita alto e discontinuo; la Slap un angolo basso, piatto e ripetibile | **Non verificabile**: nessuna misura nei nostri dati né nelle fonti trovate. |
| La Slap è «più elastica» **e** ha l'angolo più basso | **Contraddice** il risultato noto: un piatto più elastico (più deflessione) tende a dare un rimbalzo più alto, non più basso. Nei nostri dati la Zero è, se mai, la più rigida (≈214 contro ≈195 lb/in, ma con errore di circa ±10). |
| «Nei laboratori statici con cannone fisso a 90° la Zero risulta avere più controllo» | **Descrive male l'app**: il controllo del banco non viene da un cannone. È un indice da rigidità, allungamento e recupero; TWU misura rigidità, perdita di tensione e spin potential, non controllo. |
| Conclusione: «la Slap è infinitamente più governabile» | **Non supportata.** Le uniche fonti indipendenti trovate (Tennisnerd, un lettore) vanno nella direzione opposta o dicono che l'esperienza è soggettiva. |

Il testo ha quindi un punto di sostanza (il controllo reale è traiettoria, non energia, e il banco non lo misura) e una conclusione che nessun dato sostiene. Il modo di decidere sul caso Slap/Zero è provarle alla stessa tensione e votarle nel diario.

## 2. Cosa assume l'app e cosa dicono i dati

| Ipotesi dell'app | Dati (tester indipendenti) | Fisica | Stato |
|---|---|---|---|
| **Controllo** = media di rigidità, inverso dell'allungamento a 50 lb e recupero elastico | Controllo recensito contro rigidità sola ρ 0,50 (n 29); contro l'indice composto 0,48 (29); contro inverso dell'allungamento 0,37 (20); contro elasticità 0,41 (20). L'indice composto **non fa meglio della sola rigidità** | Rigidità del piatto e deflessione influenzano angolo e velocità di uscita, ma «controllo» è anche spin e ripetibilità | **Proxy debole.** Si dichiara l'intervallo (margine delle basi) |
| **Potenza** = 100 − controllo (ipotesi abbandonata) | Potenza recensita contro (100 − controllo) ρ −0,15 (20); contro inverso della rigidità ρ 0,09 (20) | L'effetto della corda sull'energia restituita è piccolo rispetto a racchetta e swing | **Nessun riscontro**: la potenza ora viene solo dai tester |
| **Comfort** = inverso della rigidità | ρ 0,56 (24) | Piatto più rigido trasmette più vibrazioni e urto | **Supportato** (moderato) |
| **Spin** = spin potential TWU (misurato) | Spin recensito contro spin potential TWU ρ −0,21 (12): i tester danno quasi tutti 4–5 alle poly, quindi il confronto dice poco | Snapback e attrito tra corde producono spin (Cross e Lindsey), nelle condizioni di prova TWU | **Misura valida, non predittiva del giudizio dei tester** |
| **Tenuta** = perdita di tensione (TWU, TL6, TL12, scorrimento) | ρ 0,30 (26) contro i tester | Il creep e la perdita di tensione sono fisici e misurati | Misure buone; il giudizio dei tester è rumoroso |
| **Pairing**: pesi spin 30, tenuta 20, rigidità 20, controllo 15, elasticità 15 | — | — | **Conteggia due volte** rigidità ed elasticità, perché il controllo è fatto di entrambe: pesi effettivi ≈ rigidità 25, elasticità 20, controllo proprio 5 |
| **Tensione consigliata**: −0,75 kg ogni +15 lb/in, al massimo ±2 kg | non validata | Gli effetti della tensione sulla velocità sono piccoli e i giocatori distinguono male la tensione | Regola empirica, dichiarata come tale |
| **Note «Per la Blade»** (testi fissi per fascia di controllo) | — | — | **Rimosse le frasi fisiche** («la palla esce un po' corta», «può uscire lunga»): nessun dato le sosteneva. Restano solo le note scritte a mano |

## 3. Cosa è stato cambiato

- **Aggiornamento (2026-10-31, dopo la revisione):** l'indice di controllo è stato **tolto del tutto** dall'app (pairing, schede, mappa, AI). Il controllo non è una misura e non equivale alla rigidità; resta solo come parere dei tester, con fonte.

- Potenza e controllo separati (nessuna formula che le lega); i pareri dei tester stanno a parte e non entrano nei calcoli.
- Il controllo mostra il suo intervallo e non afferma differenze entro il margine.
- Le note generate «Per la Blade» non fanno più promesse sul comportamento della palla (test `test_blade_note_makes_no_unmeasured_physical_claims`).

## 4. Proposte (decisioni dell'utente, cambiano i punteggi)

1. **Pairing senza doppio conteggio:** togliere il controllo dal pairing e ridistribuire i 15 punti (rigidità e elasticità restano), oppure togliere dal controllo rigidità ed elasticità. Cambia il punteggio di molte corde.
2. **Indice di controllo = sola rigidità?** I dati non mostrano un vantaggio del composto; la semplificazione sarebbe più onesta e più facile da spiegare.
3. **Misurare ciò che conta:** il vero «controllo» è ripetibilità dell'angolo e profondità. Con le tue prove (voti di controllo e potenza nel diario, stessa tensione, stessa racchetta) si confrontano Zero e Slap sul tuo braccio; il «Laboratorio contro sensazioni» dice quali misure predicono i tuoi voti.
4. **Fonti con misure vere:** TWU ha pagine su attrito, movimento delle corde e snapback che qui non usiamo; da verificare se esportano numeri confrontabili.
