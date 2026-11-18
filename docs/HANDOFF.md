# Passaggio di consegne — 2026-11-18

Questo file è il punto di ingresso per chi riprende il lavoro in una chat nuova (stessa persona, altro modello o altra sessione). Chi legge **non ha la conversazione precedente**: tutto quello che serve sta nel repo e qui.

## 1. Stato: quattro linee che non sono mai state unite

| Linea | Dove | Cosa contiene |
|---|---|---|
| **Online** (artefatto `https://claude.ai/artifact/Up1BjSe7qFPH7zaRgsh5Ne`, versione 1794985945-32d7) | `archive/artifact-live-2026-11-18.html` (copia salvata il 2026-11-18) | La linea `adoring-rubin` **più** la scheda **Ibridi** e un blocco `verified` nei dati. **Ibridi e `verified` non esistono in nessun ramo git**: l'unica copia è l'artefatto e questo file. Se si ripubblica da git senza recuperarli, spariscono. |
| `claude/adoring-rubin-dm98qp` (2026-10-31, partito da `master`) | ramo remoto | v4/v5: 3 schede (Scegli, Mappa, Montata), diario di prova con voti in tre momenti, usura, pairing Blade 100, sincronizzazione con `db`, parere AI con `sample`, pareri dei forum, `docs/FISICA.md`, 207 test Python, 184 JS, 109 e2e. |
| `claude/great-hypatia-edrzae` (2026-10-28, v3) | ramo remoto | Dati: `pipeline/twu_compare.py` (restituzione di energia e attriti TWU), `provenance.py` (fonte e data di ogni numero), `refresh.py` (aggiornamento manuale con rollback), `model_id`. Interfaccia: confronto con la corda attuale, frase «rispetto alla tua corda», 3 modelli (non calibri). Spec e piano in `docs/superpowers/`. |
| `master` (`07b338a`) | ramo remoto | v2, senza nessuna delle due linee sopra. |

`adoring-rubin` e `great-hypatia` partono entrambi da `master` e toccano gli stessi file (`web/`, `pipeline/derive.py`, `pipeline/build.py`, `data/strings.json`): unirli richiede lavoro vero, non un merge automatico.

**Base consigliata:** `adoring-rubin` (è quello che l'utente usa online) + Ibridi recuperata dall'archivio + dalla v3 solo i pezzi di dati (`twu_compare`, `provenance`, `refresh`, `model_id`) e la logica pura (`web/recommend.js` con i suoi test). Va confermata con l'utente prima di unire (§3, fase 0).

## 2. Cosa deve fare l'utente (stesso account, nuova chat)

1. **Backup dei dati personali** (consigliato, due tocchi): nell'app, Montata → esportazioni (JSON e CSV).
2. **Nuova sessione** sullo stesso account, sul repo `leocity/banco-corde-blade100`, ramo di partenza `claude/great-hypatia-edrzae`. Scegliere il modello Fable dal selettore dei modelli, se disponibile.
3. **Incollare il prompt del §3.**

Stesso account = stesso proprietario dell'artefatto: si aggiorna allo stesso link e i dati salvati nel `db` (montata, diario, preferite) restano.

## 3. Prompt da incollare nella nuova sessione

```text
Riprendi il progetto "Banco Corde Blade 100" (repo leocity/banco-corde-blade100, app italiana per scegliere corde poly per una Wilson Blade 100 v9, giocatore di club, <50 lbs). Non hai la conversazione precedente: leggi PRIMA, in quest'ordine, docs/HANDOFF.md, README.md, docs/superpowers/specs/2026-10-28-banco-corde-v3-design.md, docs/superpowers/plans/2026-10-28-banco-corde-v3.md, docs/AUDIT.md. Sul ramo origin/claude/adoring-rubin-dm98qp leggi anche README.md, docs/FISICA.md e docs/superpowers/specs/2026-10-30-banco-semplificato-design.md e 2026-10-31-diario-prove-design.md (git show origin/claude/adoring-rubin-dm98qp:<percorso>).

OBIETTIVO: audit completo dell'app, ricerca di dati migliori e più freschi, test di ciò che non va, semplificazione e miglioramento della UX, poi pubblicazione come artefatto. L'utente ha detto: "non si capisce bene". Vince la chiarezza: l'app deve rispondere a "cosa monto adesso → cosa provo dopo, e perché" in pochi secondi da telefono.

USA SOTTOAGENTI (Agent tool) per tutto ciò che è parallelizzabile: te lo chiedo esplicitamente. Ogni agente riceve un compito, i file da leggere e il formato del report (evidenze con file:riga o numeri ricalcolati dal dataset, mai impressioni). Gli agenti non lanciano altri agenti e, salvo dove indicato, sono in sola lettura. Alla fine un revisore indipendente (modello più capace disponibile) rilegge TUTTO il ramo.

FASE 0 — Riconcilia (prima di scrivere codice):
- Esistono quattro linee non unite (tabella in HANDOFF.md §1). Verifica con git cosa c'è in ognuna. Estrai la scheda Ibridi e il blocco `verified` da archive/artifact-live-2026-11-18.html: sono l'unica copia, NON perderli.
- Proponi un piano di riconciliazione (base consigliata: adoring-rubin + Ibridi recuperata + dalla v3 twu_compare, provenance, refresh, model_id, recommend.js) e FERMATI a chiedere conferma all'utente. Non unire e non spingere su master senza il suo sì.

FASE 1 — Audit in parallelo (agenti, sola lettura):
 A. Dati: ricalcola dal dataset i numeri che l'app mostra; controlla gli abbinamenti TWU/Racketpedia (es. RPM Blast 16L vs 17, Kirschbaum Competition 16L vs 17, le tre righe Racketpedia «Confidential Soft Pink» e le due Flash/Enso Pink entrate in automatico); le 31 corde con «anno da verificare»; coerenza tra le fonti.
 B. UX: Playwright a 390 e 1280 px su ogni flusso (cambio corda, scelta, confronto, diario, ibridi). Conta i tocchi, misura altezze e parole, annota il lessico incomprensibile. Confronta con i criteri misurabili della spec v3 §3.
 C. Accessibilità: contrasto, target 44 px, tastiera, screen reader, popover e dialoghi.
 D. Ricerca di fonti: solo GRATUITE e affidabili. Cerca dati di laboratorio nuovi (TWU anche altri strumenti, Racketpedia gratuito, USRSA, studi), e come ottenere aggiornamenti quasi in tempo reale (monitor delle novità con pipeline/refresh.py). Scarta con motivo le fonti non affidabili. Niente prezzi.
 E. Fisica e logica: rileggi docs/FISICA.md e le regole del punteggio/pairing: ogni affermazione è sostenuta dai dati? Cosa è ipotesi?
 F. Test: per ogni problema trovato scrivi prima un test che fallisce (pytest, node --test, Playwright).
Sintetizza i report in un unico elenco ordinato per effetto sull'utente (Critico / Importante / Minore).

FASE 2 — Semplifica (proponi, poi con l'ok dell'utente implementa): una domanda per schermata; niente gergo (percentile, gemello, parente, snapback, pairing senza spiegazione); ogni numero toccabile con fonte, data, condizioni e margine; stime sempre marcate; meno schede e meno badge; prima la risposta, poi i dettagli. Fissa obiettivi misurabili prima di toccare la UI e verificali con Playwright.

FASE 3 — Implementa con TDD, commit piccoli, su un ramo tuo (es. fable/v6), mai su master.

FASE 4 — Spedisci: ricostruisci la pagina, esegui TUTTI i test e il controllo e2e, poi pubblica come artefatto. Prima di pubblicare sull'URL esistente leggi la versione online (l'Artifact tool lo richiede) e verifica che nulla di ciò che è online manchi nella nuova versione. Pubblica sempre sullo stesso URL https://claude.ai/artifact/Up1BjSe7qFPH7zaRgsh5Ne (stesso proprietario: i dati salvati nel db restano).

REGOLE CHE NON VANNO RIDISCUSSE (decise dall'utente): solo dati gratuiti (Excel dell'utente in data/source, TWU, Racketpedia gratuito); niente prezzi; punteggio e classifiche solo da dati di laboratorio, le recensioni restano link; stime sempre dichiarate e mai nei consigli; aggiornamento dei dati solo manuale; corde uscite prima del 2020 o fuori produzione tolte (le preferite restano); testo in italiano, numeri con la virgola.

RICHIEDONO IL SÌ DELL'UTENTE: unire rami, push su master, pubblicare sull'artefatto, cambiare una regola sopra.

A FINE LAVORO: riepilogo con "Decisioni che ho preso" (ognuna con il costo se sbagliata), "Rimandato" e "Problemi aperti"; aggiorna docs/HANDOFF.md (stato, rami, cosa è online) e fai push del ramo, così l'utente può tornare nell'altro account.
```

## 4. Chiudere e riprendere

- Chi lavora **non tocca `master`** e lavora su un ramo suo (`fable/...`); a fine lavoro aggiorna questo file (§1 e §5) e fa push.
- Per riprendere in un'altra chat: nuova sessione sul repo, ramo di Fable, e scrivere «leggi docs/HANDOFF.md e riprendi da lì».
- Ogni pubblicazione richiede prima di leggere la versione online, quindi nessuna chat sovrascrive il lavoro dell'altra senza vederlo.

## 5. Lavoro della v3 da conoscere (non rifare)

**Decisioni prese** (ognuna con cosa costa se sbagliata):
- Tenuta solo dalla perdita TWU; il TL6 dell'Excel conta solo se TWU manca (sessione precedente, tuttora «da confermare» dall'utente). Costo: una riga in `derive.subscores`.
- Le tre righe Racketpedia «Confidential Soft Pink» 1,20/1,25/1,30 sono abbinate alla Confidential Soft 17/16L/16 (sul sito esiste solo in rosa). Effetto: la Super Toro 1,18 risulta «simile a una non gradita».
- Nessun abbinamento TWU cambiato per RPM Blast 16L e Competition 16L: la 1,25 vera è già un record `exact`.
- `refresh`: l'Excel conta se cambiano i valori; una fonte vuota o con più di un terzo di righe sparite è un errore; se la ricostruzione fallisce si ripristina tutto; le righe Racketpedia nuove aspettano revisione in `data/pending_matches.json`.
- Le note automatiche seguono la rigidità di laboratorio (14 note cambiate).

**Minori rimandati:** `--offline` non fa nulla di utile; Esc nella scheda chiude anche la scheda; con meno di 3 consigli il titolo dice ancora «Le 3»; margine nel popover senza unità; rigidità Racketpedia non toccabile nella scheda; in Esplora manca la colonna energia; stime marcate solo con «≈»; valori corrotti nel browser possono bloccare una schermata; «Confronta» su una 4ª corda toglie la più vecchia senza avviso; una riga del README parla ancora di Controllo e Comfort.

**Trappole note:** diversi file (`data/merged.json`, `data/agents/*.json`, `pipeline/merge.py`, `pipeline/twu_extract.py`) hanno fine riga CRLF: modificarli con uno script che le preserva, altrimenti il diff diventa enorme. `data/raw/twu.html` cambia ad ogni scaricamento (un link nel piè di pagina) ma i dati no. TWU Compare collega il «Signum Pro Plasma HEXtreme 16L» al codice del 16 (226 contro 204,6 lb/in): la riga è scartata dal controllo di coerenza.
