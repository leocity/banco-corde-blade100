# Diario di prova — specifica

Data: 2026-10-31 · Ramo: `claude/adoring-rubin-dm98qp` · Stato: da rivedere dall'utente
Estende `2026-10-30-banco-semplificato-design.md` (stato utente §9, scheda §6, valutatore AI §8).

## 1. Obiettivo

Per ogni corda che l'utente ha giocato: tensione usata e quando, sensazioni e voti per categoria nel tempo, un verdetto. E poi usare quei dati: confrontare i propri voti con le misure di laboratorio (per vedere quali misure predicono davvero le sue sensazioni) e dare al pairing le sue preferenze vere.

**Chi:** il giocatore nerd della Blade 100 v9: vuole confrontare la stessa corda a tensioni diverse, vedere come invecchia la sensazione con le ore, e smettere di fidarsi di un indice di controllo che nessuno ha validato.

**Scelte dell'utente (2026-10-31):** voti **1–5**; voti in **3 momenti** (primo colpo, metà vita, fine vita, ciascuno saltabile); il **verdetto** (ricomprerei sì/forse/no) aggiorna preferite e non gradite, i voti per categoria **non** cambiano punteggi né pairing.

**Fuori portata:** più racchette, foto, import automatici, voti che pesano nel pairing, previsioni del modello sui voti.

## 2. Modello dei dati

Il diario appartiene a una **vita della corda**, lo stesso oggetto che oggi è in `state.lives` (corde finite) o `state.equipped` (la corda montata, vita aperta). Nessun secondo archivio da tenere allineato.

```
diary = {
  setup:   { strungOn: 'YYYY-MM-DD', prestretch: 'nessuno'|'leggero'|'10%'|'altro', stringer: string≤60, surface: 'terra'|'cemento'|'erba'|'indoor'|'mista' },
  meter:   [ { hours: number≥0, value: number } ] (max 8)       // letture del tensiometro (unità qualsiasi, sempre le stesse)
  ratings: { first?: Cats, mid?: Cats, end?: Cats },            // ogni momento è facoltativo
  tags:    string[] (max 8, dall'elenco fisso),
  notes:   string≤2000,
  verdict: 'si'|'forse'|'no'|null,
  nextKgDelta: number in [-3, 3] | null                         // «la prossima volta ±kg»
}
Cats = { spin, control, power, touch, comfort, stability, liveness, durability }   // interi 1–5, ognuno facoltativo
```

- Tensione usata e date stanno già nella vita: `kg` (verticali/orizzontali), `from`, `to`, `hours`, `reason`.
- **Prova passata** (prima dell'app): una nuova vita in `lives` con `from`/`to` approssimate, `kg`, `hours`, `reason` e `diary`. Non entra nella calibrazione dell'usura a meno che `reason` sia «consumata» (regola esistente).
- `state.v` passa a 2. `sanitizeState` accetta v1 (senza diario) e scarta voti fuori 1–5, tag sconosciuti, tensioni fuori 15–35 kg, testi oltre i limiti, letture non numeriche.

**Categorie (voci mostrate):** Spin · Controllo (profondità e direzione) · Potenza · Tocco (volée, smorzate) · Comfort al braccio · Stabilità sui colpi decentrati · Mantenimento (quanto resta viva) · Durata (rottura). **Tag:** secca, spenta, pastosa, scivola, vibra, rimbalza, precisa, impreciso-lunga, si-spegne-presto, resta-viva.

## 3. Interfaccia

- **Montata:** card «Diario della corda montata»: setup (data, pre-stretch, incordatore, superficie), tre blocchi di voti (selettori 1–5 a tocco, ≥ 44 px), letture del tensiometro con ore, tag, note, verdetto e «la prossima volta ±kg». Salvataggio a ogni modifica, come le ore. Dopo il verdetto: «Segnata come preferita» o «non gradita» con **Annulla** per 10 s (forse non cambia nulla).
- **Cambio corda:** il dialogo chiede già motivo e ore; aggiunge «Vuoi dare i voti di fine vita?» (apre il blocco *fine vita* del diario della corda che togli, prima di chiuderla). Si può saltare.
- **Corde finite:** ogni voce si apre per vedere/modificare il diario; pulsante **Aggiungi prova passata** (ricerca corda, date, tensione, ore, motivo, diario).
- **Scheda corda → «Le tue prove»:** una riga per prova ordinata per tensione (data, kg, ore, media per momento, verdetto) e le medie per categoria; con ≥ 2 prove a tensioni diverse una frase neutra: «a 22,5 kg: spin 4, controllo 3 · a 23,5 kg: spin 3, controllo 4».
- **Metodo → «Laboratorio contro sensazioni»** (visibile dopo ≥ 5 corde con voti di fine vita): per coppia categoria ↔ misura — spin ↔ spin TWU, controllo ↔ indice di controllo, mantenimento ↔ tenuta, potenza ↔ 100 − controllo, comfort ↔ inverso della rigidità — la correlazione di rango (Spearman) con `n`. Sotto `n = 8` la dicitura «troppo poche corde per fidarsi»; mai usata per cambiare punteggi.
- **Esportazione CSV** del diario (capability `downloads`; una riga per prova e momento).
- **Parere AI:** il prompt include le prove dell'utente su quella corda e sulla montata (kg, ore, voti, tag, note) come «le tue sensazioni, opinioni non misure».

## 4. Regole di calcolo

- Media per momento/categoria: media aritmetica dei voti presenti, `—` se nessuno.
- **Perdita di tensione misurata dall'utente:** `(t0 − t)/t0` con `t0` = lettura a 0 h, per ogni lettura successiva; mostrata come mini-curva e a confronto con TWU e TL6 nella scheda. Senza lettura a 0 h non si calcola.
- Verdetto → preferenze: `si` → `setPreference(id, 'liked')`; `no` → `'disliked'`; `forse` → nessun cambio. Vale l'ultimo verdetto in ordine di data della prova. Il pairing si ricalcola già dalle preferite (regola esistente).
- Correlazione di rango: Spearman sui ranghi medi (parità = rango medio); `n` = corde con voto di fine vita **e** misura di laboratorio; mai per le stime da modello.

## 5. Test e verifica

- **JS puro** (`node --test`): `sanitizeState` v1→v2 e voti/tag/tensioni non validi, medie, perdita di tensione, verdetto→preferenze (compreso `forse` e l'ordine per data), Spearman con parità e con n piccoli, `diaryCsv`.
- **Browser (Playwright):** compilare voti e verdetto dalla Montata (persiste dopo il reload, con `db` simulato e con `localStorage`); cambio corda con voti di fine vita; prova passata; scheda «Le tue prove» con due tensioni; annullare il verdetto; nessun `NaN`/`undefined`/`null`; nessuno scroll orizzontale a 390 px; HTML nei testi resta testo.
- **Dopo la pubblicazione:** un controllo funzionale di `db` come per le ore.

## 6. Fasi

1. **Dati e funzioni pure:** modello, `sanitizeState` v2, medie, perdita di tensione, verdetto, Spearman, CSV (test).
2. **Interfaccia:** card in Montata, voti, tag, note, verdetto con annulla, cambio corda con voti di fine vita, prova passata.
3. **Uso dei dati:** «Le tue prove» nella scheda, «Laboratorio contro sensazioni» nel Metodo, prompt AI, esportazione, audit e README.

Un commit per fase. La ripubblicazione dell'Artifact avviene solo dopo la tua conferma.

## 7. Rischi e punti aperti

- Con poche corde la correlazione dice poco: lo dichiara e non cambia nulla.
- I voti sono soggettivi e dipendono da tensione, palle e superficie: per questo il setup e le condizioni sono nel diario.
- Il verdetto cambia le preferite e quindi i consigli: è annullabile e visibile.
- `state` cresce: 256 KiB di limite del documento `db`; un diario completo pesa circa 1 KB per prova, quindi centinaia di prove ci stanno.
