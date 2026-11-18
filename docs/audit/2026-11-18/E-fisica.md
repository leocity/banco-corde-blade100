# Audit E: fisica e logica dei punteggi

Sola lettura. Numeri ricalcolati da `/home/user/wt-rubin/data/strings.json` (102 corde). Le citazioni di letteratura (Cross, Lindsey, Bower, Haake, TWU) NON le ho potute riverificare qui: dove le uso lo dico. Percorsi: WT = /home/user/wt-rubin, BC = /home/user/banco-corde-blade100.

Legenda stato: D = Dimostrata (fonte), P = Plausibile non misurata, I = Ipotesi del progetto, S = Sbagliata/contraddetta.

## Premessa che cambia tutto: la montata dell'utente è doppiamente stimata

`re-string-slap-17` (1,23): rigidità 194,8 lb/in = «da Racketpedia» (retta RP→TWU, MAE 10,5, r 0,61, n 26); spin 7,83 = «modello» (MAE 0,99 contro 1,19 della semplice media, q80 ±1,48; pop. sd 1,38); nessuna perdita TWU. Ogni «rispetto alla tua» parte da due stime. La Zero (default in `WT/pipeline/derive.py:16`, 22,5/21,5; l'utente ora monta Slap 22/21) è nella stessa condizione (213,7, spin 7,36 modello). La differenza Slap−Zero (19 lb/in) è sotto l'errore combinato (~15) di due stime.

Effetto statistico: la retta RP→TWU ha intercetta 148 e pendenza 63, quindi comprime tutto verso la media (le RP-convertite cadono in 195–217 su una popolazione 165–246).

## 1. Problemi, in ordine

### CRITICO

**C1. Le stime entrano nel pairing e nelle «3 da provare», contro la regola 5 del README (`WT/README.md:35`: «non entrano mai nel pairing»).** Solo il tipo «modello» è escluso. `stiff_lab` ammette `parente` e `da Racketpedia` (`WT/pipeline/derive.py:44,55-59`), `spin_lab` ammette `parente` (`derive.py:43,47-52`); `dims.py:41` e `dims.py:44-47` le trasformano in percentili; `pairing.py:5-10` le pesa come misure. 30 delle 84 corde con pairing poggiano su almeno una stima (21+20 rigidità, 18 spin). `choose.js:8,15-17` ordina le top 3 per quel pairing, ammettendo spin «parente». Il README (rr. 31, 35) si contraddice da solo («gemelli di calibro misurati» vs «stime… mai»).

**C2. Il percentile amplifica l'errore di stima di 2–5 volte rispetto alle tolleranze del pairing.** Tra le 57 rigidità misurate sd = 18 lb/in; ±10,5 lb/in (errore RP) valgono ±12–26 punti percentile, il gauge-model (q80 ±15) fino a ±35. Il pairing considera «in linea» ±5 punti (`pairing.py:7`, ≈2–3 lb/in attorno alla mediana) e arriva a fit 0 a 25 punti (≈8–16 lb/in): per una corda stimata il punteggio è rumore dentro il suo stesso errore. Anche per due corde misurate: TWU fa una sola prova per corda (`WT/docs/AUDIT.md:57`), nessuna ripetibilità dichiarata.

**C3. Le soglie di «differenza» sono più strette dell'incertezza dei dati.**
- `WT/web/values.js:47` (≥5 punti percentile per spin e tenuta): attorno alla mediana 10 punti = 0,4 di spin TWU, meno del margine ±0,5 che il codice stesso dichiara per i gemelli (`estimate.py:13`).
- `values.js:51` e `compare.js:16`: ≥10 lb/in sulla rigidità, anche se uno o entrambi i valori sono stime (±10,5 / ±15). La frase non marca «circa» né confronta col margine.
- `compare.js:12`: ≥10 punti percentile. «Guadagni / perdi» (`compare.js:17`) presume che più sia meglio, senza dirlo.
- Contraddice la scheda Ibridi stessa: «corde entro il 10–15% di rigidità… sembrano simili» (`BC/archive/recovered/ibridi.js:300,332`), cioè 21–31 lb/in, non 10.
- Il vecchio `BC/web/recommend.js:56-76` era più onesto (soglie in unità fisiche 0,5 / 10 / 5 e «simile (stima)» se |Δ| ≤ margine); la v4 in WT l'ha perso.

**C4. Verdetto Ibridi «più controllo, netto» (`ibridi.js:81-84`) viola la regola «il controllo non è una misura» (`README:15`) e somma grandezze non commensurabili.** +1 punto se rigidità verticale >+8%, +1 se tensione ≥ +0,75 kg, +1 se perdita < −6 punti; somma = «controllo». Rigidità e tensione si sovrappongono (stessa fisica), le soglie sono inventate, e +0,75 kg vale (Bower e Cross 2005, citato nella scheda: +2,7% di velocità su ~10 kg) circa 0,2% di velocità, sotto la soglia percettiva che la scheda stessa cita (61% degli élite non sente 7,6 kg: `ibridi.js:237`).

**C5. Due regole di tensione opposte nella stessa app.** `derive.py:226` / `state.js:76-83`: corda più rigida → tensione più BASSA (per eguagliare il letto). Ibridi: verticale più rigida (+31%) → +1 kg (setup A, `ibridi.js:12`; regola «Verticali = il motore», r. 230). Nessuna dichiara il proprio obiettivo (stesso feel vs più controllo).

**C6. La regola −0,75 kg / 15 lb/in non ha una fonte e contrasta con i dati dell'utente.** Implica 9 lb/in di rigidità per ogni lb di tensione (45% in 10 lb): da verificare con i dati TWU di stiffness-vs-tension (non nel repo). Le due preferite (Confidential 212 lb/in a 22/21; O-Toro 166 a 23/22) implicano −0,32 kg/15 lb/in (`BC/web/recommend.test.mjs`, test con pendenza −0,32/15); la regola dei due punti è confusa da calibro e forma. Il `±1 kg` mostrato (`WT/web/cards.js:46`) è fisso, non un margine.

### IMPORTANTE

**I1. Delta spin su corde «modello/parente» senza il segno ≈.** `values.js:40-55` e `compare.js:206-218` stampano «+N spin» senza segnalare che nel confronto con la montata una o due parti sono stimate. Margini del `modello` (±1,5) e del `parente` (±0,5 fisso, non derivato: tra le coppie dello stesso modello a calibro diverso, 6 su 15 differiscono >0,5, fino a 1,4 — mie stime dal JSON).

**I2. «Tenuta» media pesa grandezze diverse alla pari** (`dims.py:43-47`): perdita TWU (dinamica, ore di battuta), TL6/TL12 (Excel; unità non documentate in `excel_extract.py:64-65`, la scheda dice «mesi», `cards.js:117`), scorrimento statico 24 h. Misure per corda 1–4 (`dim_inputs`). Nei dati, TL6 Excel vs perdita TWU: ρ 0,00 (n 12); stiff index vs rigidità TWU ρ −0,21; allungamento a 50 lb vs rigidità ρ −0,23 (n 12). Le fonti non concordano; il pairing le fonde.

**I3. «Elasticità» = recupero/allungamento a 50 lb (`dims.py:7-12`)**, peso 15 (`pairing.py:5`): quota di recupero in un test statico, non un modulo elastico; nessuna fonte che la leghi a una prestazione. Il doppio conteggio con rigidità è stato tolto, ma il peso 15 resta senza giustificazione fisica.

**I4. Pesi e struttura del pairing sono scelte del progetto, non fisica** (`pairing.py:5-10`): UP_ONLY per spin/tenuta («più è meglio») ma simmetrico per rigidità; penalità 15 a 75 (`README:34`). Il pairing misura somiglianza con le preferite (Confidential, O-Toro), non con la montata (Slap), quindi non risponde a «come cambia la corda successiva rispetto a quella montata».

**I5. Vita attesa e fasce d'usura inventate** (`WT/web/wear.js:10`: `8+0,12×tenuta`, ±25%; `wear.js:27`: 40/70/100%): mescola un percentile (adimensionale) con ore. Le note generate dichiarano come fatto: «la sentirai calare dopo 6–8 ore: rincorda ogni 2 settimane», «3–4 settimane» (`notes_gen.py:78-80`) mentre il README (r. 37) dice «ipotesi non misurata».

**I6. Ibridi, avvisi con soglie inventate** (`ibridi.js:86-90`): >2 kg di differenziale, ko>kv («frena lo scorrimento»), «sotto 22 kg palle lunghe sono l'esito atteso». Il dato citato (TWU: +40% spin con orizzontali a 60 lb contro 30, piatto 16×10) va nella direzione OPPOSTA all'avviso ko>kv e vale per 30 lb di differenza, non 2 kg. Il range Wilson è una raccomandazione del costruttore, non una soglia fisica. Il piatto 16×10 non è un 16×19.

**I7. Protocollo Ibridi senza potenza statistica** (`ibridi.js:~268`): 20 diritti + 20 rovesci per setup per rilevare effetti di ~0,3% di velocità per kg; il numero di errori è dominato dal rumore di esecuzione. «Decidi: vince chi ha meno palle lunghe» non è inferenza valida con n=20.

**I8. L'AI dà direzioni su «controllo» e «potenza» rispetto alla montata** (`WT/web/ai.js:52`) e una tensione (`ai.js:53,118-119`) generate dal modello: contraddice lo spirito di README r. 8/15, anche se etichettate. Per queste due voci lo schema dovrebbe richiedere solo «non misurabile».

**I9. Percentili relativi al banco** (`notes_gen.py:25,46-48`: «rigida/morbida», «snapback alto» da percentile, bande 65/35): cambiano se entra una corda; «snapback» non è la misura TWU (rapporto di attriti).

### MINORE

- M1. `similarity` +5 se stessa forma (`derive.py:178`), `sources_disagree` gap 50 (`derive.py:200`): arbitrari; codice morto da togliere (README r. 78).
- M2. `fit_spin_model` (`estimate.py:96-112`): «usable» per un guadagno del 17% sulla media (0,99 vs 1,19) è molto poco; non entra nel pairing ma posiziona la corda in mappa.
- M3. «Comfort» = 100 − percentile rigidità (`derive.py:99`, mostrato in `cards.js:167`, ρ 0,56 n 24): corretto come proxy dichiarato, ma usa anche rigidità stimate.
- M4. FISICA.md è datato 31/10 e non copre Ibridi né la montata Slap.

## 2. Dove una stima entra in punteggio / ordine / consiglio / frase

| Stima | Punto | Cosa muove |
|---|---|---|
| Gemello di calibro (rigidità, +203 lb/in per mm; `estimate.py:226-256`) | `estimate.py:289-316`, `derive.py:55-59`, `dims.py:41` | percentile rigidità → pairing → ordine top 3 (`choose.js:15-17`), delta `values.js:51`, tensione `state.js:77`, `derive.py:226` |
| Gemello/parente spin (±0,5 fisso) | `estimate.py:171-179`, `derive.py:47-52`, `dims.py:44`, `choose.js:8` | pairing (peso 30, il maggiore), ammissione alle top 3, delta spin |
| Rigidità da Racketpedia (retta) | `estimate.py:317-321`, `derive.py:44,57` | come sopra; la montata Slap |
| Spin da modello | `estimate.py:115-137`, `values.js:5,136`, `notes_gen.py:360` | non nel pairing; ma è lo spin della montata → delta; frasi «Spin stimato ≈» |
| Rigidità dal solo calibro | `estimate.py:259-277` | esclusa dal pairing; mostrata (`values.js:6`) |
| Rigidità da calibro (comfort) | `derive.py:99`, `cards.js:167` | testo comfort |
| Tensione −0,75 kg/15 lb/in | `derive.py:219-232`, `state.js:76-83`, `cards.js:43-47`, `notes_gen.py:105-107`, `ai.js:85`, `BC/web/recommend.js:87-93` | consiglio numerico + AI |
| Vita attesa ipotetica | `wear.js:9-27`, `cards.js:166`, `notes_gen.py:78-80`, `ai.js:83` | fasce Fresca/Da cambiare, frasi note, parere AI |
| Soglie percentili | `values.js:47,51`, `compare.js:12,16` | frasi «+/− rispetto alla tua», «guadagni/perdi» |
| +5 forma, sim. non gradite | `derive.py:178`, `pairing.py:64` | penalità −15 |

## 3. Proposta: confronto «corda A vs montata»

Principi: (a) si confronta solo ciò che si può confrontare, con unità della fonte, senza convertire tra fonti; (b) differenza «significativa» solo se supera la soglia pratica E l'incertezza combinata √(σA²+σB²); (c) ogni frase dice tipo di dato e fonte; (d) mai «controllo», «potenza», «feel» come misure.

Soglie: sono mie proposte e vanno trattate come ipotesi dichiarate, tranne dove cito il repo. Non esiste ripetibilità pubblicata TWU nel repo (una prova per corda).

| Grandezza | Soglia (A misurata vs montata misurata) | Se una è stimata | Frase per il giocatore di club, con il perché | Fonte / margine |
|---|---|---|---|---|
| Rigidità dinamica TWU (lb/in) | <10% (≈20 lb/in) «simile»; 10–15% «un po'»; >15% (≈30) «nettamente» (regola TWU citata in `ibridi.js:300`, da riverificare) | σ: gemello 9–15, RP 10,5, solo-calibro 22: dire «≈» e confrontare con √(σA²+σB²); sotto → «non distinguibile» | «Più rigida (+X%): il letto cede meno all'impatto; di solito più stabilità sulla direzione, meno comfort per il braccio.» (Direzione: Cross; effetto sulla traiettoria NON misurato qui.) | TWU stiffness; `WT/data` |
| Rigidità statica RP (kg/mm) | ≥0,15 kg/mm (3 gradini da 0,05; ≈ 8 lb/in); confronto solo RP–RP | gemello RP corretto per calibro | «Nelle misure Racketpedia (statiche) è più morbida/dura di X kg/mm: dice com'è la corda a riposo, non come reagisce in impatto.» Slap 0,75 vs Zero 1,05 = chiaro in RP (−0,30) | Racketpedia, passo 0,05 (`AUDIT.md:57`) |
| Perdita di tensione TWU (punti %) | <5 punti «simile»; ≥10 «nettamente» (5 = soglia di `recommend.js:7`, sd banco 8) | assente per la montata Slap → dire «manca» | «Perde più tensione (+X punti): dopo qualche ora il letto si allenta prima, cala il controllo che senti in fondo al campo.» Evitare «controllo». | TWU; definizione/durata del test da riverificare |
| Spin potential TWU (0–10) | <0,5 «simile»; 0,5–1,0 «lieve»; ≥1,0 «chiaro» (sd 1,38; coppie gemelle 0,1–1,4) | parente: soglia 1,0; modello: non confrontare (±1,5) | «Più spin potenziale (+1,0): più attrito sulla palla / meno tra le corde, quindi le verticali tornano di più. Quanto spin in più fai dipende soprattutto dallo swing.» | TWU spin; Cross e Lindsey; D per il meccanismo |
| Calibro (mm) | ≥0,03 mm «apprezzabile» | – | «Più sottile: di solito più morbida e con più morso, tiene meno.» (≈ +200–330 lb/in per mm; il modello d² dà ~330, il fit 203) | gauge-model `estimate.py:226` |
| Forma | solo categoria (tonda/sagomata) | – | «Forma diversa (esagonale vs tonda): più spigoli → più attrito sulla palla, e anche tra le corde.» Aggiungere «TWU non trova una correlazione prevedibile» (`ibridi.js:303`). | descrizione, non misura |
| Materiale/mescola | solo etichetta (poly, co-poly) | – | «Mescola diversa: guarda gli effetti misurati (rigidità, perdita), non il nome.» | TWU/Ashaway |
| Allungamento Excel a 50 lb e recupero | confronto solo tra corde dell'Excel; |Δ| > 1 deviaz. standard del campione (n=44) | – | «Nel tuo test statico si allunga di più/meno: indica quanta tensione cede subito, non la durata in gioco.» | Excel; rho con TWU <0,25 → tenerlo separato |
| Tensione consigliata | non dare un numero | – | «Per eguagliare il feel di una corda più rigida di ~30 lb/in si scende di circa X kg: è una regola empirica del progetto; provala senza cambiare altro.» | Ipotesi |

NON si può dire: che una corda dia più controllo o più potenza (nessuna misura; solo opinioni dei tester); che la palla esca più lunga/corta, più alta o più bassa; che il spin reale in partita cambi di tot; che due setup siano «più controllabili» (FISICA.md r. 9: controllo = angolo di uscita e ripetibilità, non misurati); che 1 kg si senta (Bower e Cross 2008: la gran parte dei giocatori non sente 6 lb, `ibridi.js:237`; da riverificare); che la vita sia di N ore.

Struttura della frase: «Rispetto alla tua: <grandezza, direzione, entità e tipo di dato>. Perché: <meccanismo fisico, 1 riga>. Non sappiamo: <controllo/potenza non misurati>.» Se tutte le differenze sono sotto soglia: «Nelle misure disponibili è indistinguibile dalla tua.»

## 4. Mettere a confronto fonti diverse

- Non convertire mai tra fonti per confrontare: si confrontano due corde nella stessa fonte (stessa unità, stesso protocollo). La retta RP→TWU (r 0,61) serve solo a posizionare, non a fare delta.
- Tabella a tre colonne per grandezza: TWU dinamico (lb/in, 51 lb, swing veloce), Racketpedia statico (kg/mm, passo 0,05), Excel statico (stiff index, allungamento a 40–65 lb). Una cella per fonte; nessuna media.
- Accordo: per ogni coppia di fonti calcola il rango della corda A rispetto alla montata. Se il segno della differenza coincide in tutte le fonti disponibili: «tutte le fonti concordano». Se divergono: «TWU dice più rigida (+X), Racketpedia dice più morbida (−Y): disaccordo, nessuna conclusione». Oggi esiste solo `sources_disagree` (Excel vs TWU, gap percentile 50, `derive.py:200`) e non arriva in UI come frase.
- Dichiarare i limiti: Excel vs TWU ρ −0,21 (stiffness), ρ 0,00 (TL6 vs perdita TWU), RP vs TWU ρ 0,59 (n 35): le fonti misurano cose diverse (statico vs dinamico, a riposo vs a velocità d'impatto). Una concordanza è informativa; un disaccordo è normale e va scritto, non risolto.

## 5. Scheda Ibridi

Tenere (corrette, con fonte e dato verificabile nel banco): valori TWU O-Toro/Tour (217 vs 166, +31%); calibro +15% per 0,1 mm (Barb Wire); perdita 22/25/44%; sezione «Verifica fonti» con correzioni (Bower e Cross +2,7% e non +6%: ottima pratica); mappa rigidità-tenuta (misure, non giudizi); consigli generali operativi (stesso incordatore, un cambio alla volta, ping come termometro: Cross 2006, relazione f ∝ √T è fisica elementare, D); fattori 1–7 con le formule «Fonte TWU» (descrittivi).

Marcare come ipotesi o riscrivere: «verticali = il motore» (r. 230; il letto è la combinazione, TWU dice letti con stessa rigidità complessiva giocano simile; la media 16/19 della scheda è una semplificazione dichiarata), «ordine di prova» e i 7 setup A–G (fiducia già etichettata: tenerla), la ricetta 23/22 (+1 kg è un'ipotesi non misurabile).

Tagliare: il verdetto «più controllo» (C4); gli avvisi con soglie inventate (I6: differenziale 2 kg, ko>kv, <22 kg); «Differenziale 0,5–1 kg, mai oltre 2» (r. 232: la fonte è 16×10 a 30 lb di scarto); «Se sbagli lungo sali di 1 kg» (effetto ≈0,3% di velocità); la soglia di decisione del protocollo (n=20); «ottimo a 55 lb» già tolto.

## 6. Tensione consigliata e vita attesa

- Tensione −0,75 kg/15 lb/in (`derive.py:226`, `state.js:76`): MARCARE COME IPOTESI e non presentare l'intervallo ±1 kg come margine. Riscrivere come «punto di partenza per eguagliare la rigidità del letto, non validato; l'effetto di 1 kg sulla palla è piccolo». Se possibile ricavare la pendenza da TWU (stiffness a più tensioni), altrimenti toglierla quando una delle due rigidità è stimata (oggi si applica anche a «parente» e «da Racketpedia», `state.js:67-71`).
- Vita attesa 8+0,12×tenuta (`wear.js:10`): TOGLIERE come numero di ore finché non ci sono almeno 3 corde finite dell'utente; fino ad allora mostrare solo ore giocate e «reincorda dopo N ore» come promemoria personale. Togliere dalle note le frasi in `notes_gen.py:78-80`. Mantenere il meccanismo di calibrazione sulle ore reali (`wear.js:15-24`), è la parte sana.

## Sommario (10 righe)
1. La montata Slap ha rigidità (RP convertita) e spin (modello) stimati: ogni delta parte da due stime.
2. Le stime «parente» e «da Racketpedia» entrano nel pairing e nelle top 3 (30/84), contro `README:35`.
3. I percentili amplificano l'errore: ±10,5 lb/in valgono ±12–26 punti, la tolleranza «in linea» è 5.
4. Le soglie di confronto (5–10 punti, 10 lb/in) sono sotto l'incertezza e sotto la regola TWU del 10–15% (Ibridi).
5. Verdetto Ibridi «più controllo» e punti per kg violano «controllo non misurabile»; avvisi con soglie inventate.
6. Due regole di tensione opposte (derive: più rigida → meno kg; Ibridi: più rigida → +1 kg).
7. −0,75 kg/15 lb/in senza fonte e incoerente con le preferite (−0,32); vita attesa 8+0,12·tenuta inventata: tagliare la vita, marcare la tensione.
8. Proposta: confronto per grandezza nell'unità della fonte, soglia pratica + incertezza combinata, frasi con perché fisico e «cosa non sappiamo».
9. Fonti: mai convertire per confrontare; tabella per fonte e frase esplicita di accordo/disaccordo.
10. Ibridi: tenere dati TWU/verifica fonti/ping; tagliare verdetto e avvisi; protocollo con n=20 non ha potenza.
