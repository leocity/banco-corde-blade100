# Passaggio di consegne — aggiornato 2026-11-18 (v6)

Punto di ingresso per chi riprende il lavoro in una chat nuova. Chi legge **non ha la conversazione precedente**: tutto quello che serve sta nel repo e qui.

## 1. Stato

| Cosa | Dove |
|---|---|
| **Online** | https://claude.ai/artifact/Up1BjSe7qFPH7zaRgsh5Ne — **v6.3** (comparatore fino a 4 corde, AI con i dati, matassina/mezza, marche preferite; design §16), versione `1795112966-7dbf` (v6.3) del 19/11/2026, pubblicata da `dist/string-explorer.html` del ramo sotto. Capability: `db`, `user`, `sample`, `downloads`. |
| **Ramo di lavoro** | `claude/great-hypatia-edrzae`: contiene tutto (v3 + adoring-rubin + Ibridi recuperata + v6). È l'unica linea viva. |
| Versione online precedente (v5 + Ibridi) | `archive/artifact-live-2026-11-18.html` (copia esatta, verificata byte per byte prima di ripubblicare). Il blocco `verified` ora sta in `data/verified.json`; il codice di Ibridi in `archive/recovered/`. |
| `master` | `07b338a` (v2), **non toccato**. Unire il ramo su master richiede il sì dell'utente. |
| `claude/adoring-rubin-dm98qp`, `claude/clever-sagan-tzfbkq` | Storici, già dentro il ramo di lavoro (merge `dfa0a60`). |

Dati dell'utente nel `db` alla pubblicazione v6.1: 19 documenti (`state`, `prefs` con 9 corde in casa, 16 `s-*`, 1 `l-*`), intatti. La v6 aggiunge, solo quando servono, `prefs` (scorta, domanda) e `r-<ts>` (voto e parola dell'uscita).

**Da dire all'utente:** ricaricare la pagina su tutti i dispositivi (telefono e PC). Una pagina v5 rimasta aperta non cancella i dati v6, ma non li mostra.

## 2. Cosa è la v6.1 (in breve)

v6.1: tre schede **Oggi / Prossima / Mappa** (la Mappa con ricerca ha sostituito Scienza); valori ricavati dai dati e dalla fisica in `lab.est`, usati ovunque e marcati ≈ (design §14); 120 corde (18 aggiunte da `data/catalog_extra.json`).

v6:

Tre schermate: **Oggi** (+ Uscita in un tocco, voto con le faccine, corde in casa, storico, cambio corda), **Prossima** (una domanda «cosa vuoi cambiare rispetto alla tua?», prima le corde in casa, poi al massimo 3 da comprare, confronto, ibridi, AI con casella), **Scienza** (schede con livello di prova, righelli, recensioni indipendenti, fonti). Tooltip su numeri e parole tecniche. Confronti e consigli **solo da misure** (TWU esatto, Racketpedia esatto, Excel dell'utente), mai stime, mai conversioni tra fonti. Dettagli: `README.md`, `docs/superpowers/specs/2026-11-18-banco-v6-design.md` (§12–13 decisioni dopo le revisioni).

## 3. Come si lavora

- Comandi: `bash tests/run_all.sh` (pytest 267, node 106, e2e 28). Pagina: `python3 -m pipeline.build && python3 -m pipeline.build_page`.
- Prima di pubblicare: leggere la versione online (Artifact `read`), verificare che nulla manchi, poi pubblicare `dist/string-explorer.html` sullo stesso URL. Dopo: elencare `data/users/me` e controllare che i documenti ci siano.
- Novità dalle fonti: `python3 -m pipeline.watch` scrive solo `data/changes/watch-*.md`; l'aggiornamento resta manuale (`pipeline/refresh.py`).
- Trappole: file con fine riga CRLF (`data/merged.json`, `data/agents/*.json`, `pipeline/merge.py`, `pipeline/twu_extract.py`); nomi top-level dei moduli `web/*.js` devono essere unici (pagina unica); un `import` per riga.

## 4. Regole che non vanno ridiscusse (decise dall'utente)

Solo dati gratuiti; niente prezzi; punteggi e classifiche solo da laboratorio, recensioni solo link; stime dichiarate e mai nei consigli; aggiornamento dei dati solo manuale; corde pre-2020 o fuori produzione tolte (le preferite restano); italiano, numeri con la virgola. Richiedono il sì dell'utente: unire rami su master, cambiare una regola.

## 5. Decisioni prese nella sessione v6 (ognuna con il costo se sbagliata)

- **Base = versione online (adoring-rubin)** + dati v3 + Ibridi recuperata. Costo: nessun lavoro perso; la UI v3 (home/explore) è stata tolta.
- **Niente punteggio 0–100**: sostituito da frasi «rispetto alla tua» e «simile alla X in N misure su M». Costo se l'utente vuole un numero: un campo calcolato da `cmp.js`, mezza giornata.
- **Soglie di confronto** (ipotesi dichiarate): rigidità TWU 10/15%, Racketpedia 0,10/0,20 kg/mm, perdita 5/10 punti, spin 0,5/1,0. Costo: una tabella in `web/cmp.js`.
- **L'Excel non decide le direzioni** (non concorda con TWU né con Racketpedia, |ρ| < 0,15). Costo: un flag `decides` in `cmp.js`.
- **«Tiene di più» e «più spin» con la Slap** (senza TWU): quarto migliore delle corde TWU, dichiarato. Costo: logica in `next.js`.
- **Tensione e usura**: niente numero consigliato né vita attesa da formula; ipotesi −0,5 kg solo se nettamente più rigida in TWU. Costo: testi in `sheet.js` e `today.js`.
- **Diario**: si compila solo il voto 1–5 e una parola per uscita; il diario dettagliato v5 si legge ma non si scrive più. Costo se lo rivuole: i moduli v5 sono nella storia git (`web/diaryui.js` a `76ea1ba`).
- **Recensioni YouTube**: solo classificazione dei canali dai feed RSS; nessuna frase finché il video non è guardato.
- **TWU a 51 lb** (la tabella dice 51; il «52» è di un articolo).

## 5b. Pipeline ibridi e export AI (24/11/2026, non ancora pubblicata)

Sul ramo ci sono, **non pubblicati** (la pagina online è ancora la v6.3 del 19/11 con i dati di allora): `derived.twu_flag` (TWU contestato fuori da calcoli, `lab.twu` invariato), `derived.hybrid_role`, `pipeline/hybrids.py` con fixture di parità col JS, `data/inventory.json`, `data/hybrids_input.json`, `data/hybrids.json`, `dist/banco-corde-ai.json/.md`. Togliere il TWU contestato sposta di 1-2 punti i percentili degli altri: 9 corde cambiano fascia di pairing (nessuna pagina mostra più il pairing). Per pubblicare: `python3 -m pipeline.build && python3 -m pipeline.build_page`, test, poi l'Artifact come sempre. Decisioni: blocco in derived/ibridi/export e non in `lab` (la pagina non cambia comportamento); motivo «contestata» bloccato come richiesto, anche se nasce da recensioni (cambiabile in `twuflag.BLOCK_ISSUES`); peso verticali 16/35 con intervallo fino a 65%; hybrid_role da Racketpedia e forma, Excel con peso basso.

### 5c. Piano di prove, registro di campo, correzioni catalogo (24/11/2026, non pubblicate)

`data/test_plan.json` (13 prove, ordine dell'utente), `pipeline/test_plan.py`, `data/field_tests.json` + `pipeline/field_tests.py`, `inventory.incoming` (ordine Toroline: 10 tipi di busta, 11 buste, 22 mezzi-set, stato `ordinato`; prezzi non registrati), export con `piano_prove`, `prove_tue`, `in_arrivo`, `regole_utente`. Bilancio verificato: le 22 mezze si usano tutte solo se si fanno **entrambi** gli ibridi con le due Snap liberate (Dreddy e Lynx/Snap); in tal caso servono **3 mezze di Lynx (2 matassine)**, non una. Il piano parla di «5 full + 6 ibridi = 11 incordature»: i conti tornano con 5 + 7 = 12. Le durate (`ore_ipotesi`) e le tre regole sul differenziale sono ipotesi dell'utente: non entrano nei calcoli, si confrontano con le schede di campo. Soglia di calo 15% = ipotesi del piano (`field_tests.ALERT_LOSS_PCT`). I numeri TWU della ECO Power sono quelli indicati dall'utente (la copia `data/raw/twu.html` elenca la corda ma non i valori). L'Eco Power è in `inventory.stock` come 1 mezza (quantità minima: da confermare). `tl6`/`tl12` dell'Excel restano senza definizione documentata: non si usano per dare una soglia.

## 6. Problemi aperti e rimandati

- Toroline Ether: in vendita sul sito secondo la ricerca, ma i dati di produzione la danno fuori produzione: resta esclusa finché l'utente non conferma.
- Toroline A5: nel banco ci sono sia `toroline-a5-17` (1,23, dato vecchio) sia `toroline-a5-16l` (1,25, l'unico calibro in vendita): probabile doppione da togliere.
- Solinco Hyper-G Diamond Rough e Hyper-Con: non trovate su TW Europe, Racketpedia né TWU.

- **Licenza TWU**: i Termini di Tennis Warehouse vietano crawling e riproduzione; app privata, ma la decisione sul rischio è dell'utente (`docs/audit/2026-11-18/D-fonti.md` §3).
- Guardare i video delle recensioni e scrivere le frasi chiave; date dei video approssimate.
- Confronto di 3 corde insieme; ingresso «cosa senti in campo» degli ibridi (rimandati, §13 del design).
- 47 corde con «anno da verificare»; righe Excel Flash pink e Flash yellow identiche (la scheda lo segnala).
- Codice di pipeline non più usato dalla pagina (pairing, dims, profile_score): da togliere in un passo separato.
- Sincronizzazione tra due dispositivi reali: testata con db simulato, non dal vivo.
