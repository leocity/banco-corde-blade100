# String Explorer — Specifica di design

Data: 2026-10-05 · Stato: bozza da revisionare

## 1. Obiettivo

Uno strumento interattivo (pagina web pubblicata come Artifact privato) che permetta di scegliere la prossima corda full poly per una **Wilson Blade 100 v9 (16x19)**, confrontando tre fonti di misura indipendenti e traducendole in indicazioni pratiche per il profilo del giocatore.

**Successo =** in 5 minuti, dal telefono, si capisce: quali corde somigliano alle due preferite, cosa cambierebbe passando a un'altra corda, e a che tensione partire.

## 2. Profilo giocatore (dato dall'utente)

| Voce | Valore |
|---|---|
| Racchetta | Wilson Blade 100 v9, schema 16x19 |
| Livello / stile | Medio di club, tutto campo, prevalentemente rotazioni, a volte piatto |
| Braccio | Nessun problema: accetta poly rigide |
| Tensione abituale | Sotto 50 lbs (≈ 21–23 kg) |
| Volume di gioco | ~3 h/settimana + torneo ogni 2–3 settimane (3–4 h) ⇒ ~4–5 h/settimana |
| Montaggio | Solo full poly / co-poly |
| **Corde preferite (riferimento positivo)** | **Solinco Confidential standard (nera) 1.25 a 22/21 kg** · **Toroline O-Toro 1.23 a 23/22 kg** |
| **Corde non gradite (riferimento negativo)** | **Solinco Confidential Soft** · **Babolat RPM Blast** |
| Telaio | Il giocatore lo descrive già orientato al controllo, con RA basso (flessibile): non serve aggiungere controllo dalla corda, serve non togliere potenza |

**Lettura da maestro incordatore (ipotesi da validare con i dati):**
- Le due preferite sono co-poly di controllo con una risposta "piena" e prevedibile a tensione medio-bassa.
- Delle due non gradite, la Confidential Soft è la versione più morbida e "spenta" della preferita. RPM Blast invece è rigida, ottagonale, e nel file perde molta tensione (TL6 17–20%).
- Ipotesi: il giocatore cerca una sensazione compatta e stabile nel tempo, non la massima morbidezza né la massima "presa".
- I dati di Confidential Soft e RPM Blast servono a verificare questa lettura: se le preferite e le non gradite si separano chiaramente su una metrica (es. perdita di tensione, Stiff Index, scorrimento 24 h), quella metrica diventa la più importante.

Deduzione (assunzione, da confermare): con ~4–5 h/settimana una poly resta "viva" ~15–20 h ⇒ rincordatura ogni 3–4 settimane; la tenuta di tensione conta ma non è il criterio n.1.

## 3. Ambito

**Corde target:** Solinco, Re-String, Toroline, Grapplesnake, Wilson Revolve / Revolve Spin, Babolat RPM Blast (+ RPM Blast Rough).
**Concorrenti di riferimento:** Luxilon (ALU Power, 4G, Element), Yonex (Poly Tour Pro / Rev / Spin), Head (Lynx Tour, Hawk), Tecnifibre (Razor, Ice Code), Kirschbaum, Signum Pro.
**Calibri:** 16, 16L, 17, 17L (≈ 1.18–1.30 mm). **Materiale:** solo poly / co-poly.
**Fuori ambito:** multifilamenti, budello, ibridi, prezzi, disponibilità nei negozi, metriche Racketpedia a pagamento.

## 4. Fonti

| Fonte | Cosa forniamo | Accesso | Note |
|---|---|---|---|
| **Excel Ektelon** (`String chart Aug 262026.xlsx`, foglio `Aug262026`) | Stretch / Recover / % a 40-50-60-65 lbs, Stiff Index, Gain, OLG, Elong, peso statico 24 h, TL6, TL12 | Locale | 4 righe per corda; peso statico ed elong solo sulla riga a 40 lbs; TL6/TL12 sulla riga a 50 lbs; `% stretch` salvato come rapporto (1.077 = +7.7%). Refusi da normalizzare ("Wlson", "Confidental", spazi multipli). |
| **TWU String Performance Database** (`twu.tennis-warehouse.com/learning_center/reporter2.php`) | Stiffness (lb/in), Tension Loss (%), Spin Potential, materiale | HTML pubblico, form POST con tensione di riferimento selezionabile | Si estrae alla tensione di riferimento **più vicina a 48 lbs** disponibile (default TWU 52). Re-String probabilmente assente. |
| **Racketpedia** (`racketpedia.com/en-GB/tennis-string/<slug>`) | Static stiffness (kg/mm), forma, composizione | HTML pubblico, una pagina per corda | Solo dati gratuiti. Misura **statica**: mostrata accanto a TWU, mai convertita né mescolata. |

**Stiff Index Excel** = `(stretch − recover) / 11.25 × 100` (verificato sui dati). **Più alto = più morbida**, il contrario di TWU e Racketpedia: la UI lo dichiara esplicitamente ovunque compaia.

## 5. Pipeline dati (approccio A: script + agenti leggeri)

1. **Script — Excel → `excel.json`.** Raggruppa per (marca, nome, calibro); normalizza i nomi; converte i calibri in mm (tabella fissa: 16 = 1.30, 16L = 1.25–1.28, 17 = 1.20–1.25, 17L = 1.18–1.20; dove la marca dichiara i mm si usano quelli); filtra per ambito.
2. **Script — TWU → `twu.json`.** Scarica e analizza la tabella HTML; filtra per marca, materiale e calibro.
3. **Agenti Haiku — abbinamento nomi** (uno per gruppo di marche). Input: le liste di Excel e TWU di quella marca. Output: coppie con livello di confidenza (`exact` / `probable` / `proxy`). Esempio: Confidential 1.25 dell'Excel ↔ Confidential 16 (1.30) su TWU = `proxy`, perché è lo stesso modello in un calibro diverso.
4. **Agenti Haiku — Racketpedia** (uno per gruppo di marche). Trovano la pagina di ogni corda in ambito e ne estraggono static stiffness, forma e composizione, con l'URL come prova. Se una corda non c'è → `null`, mai stimata.
5. **Agente Sonnet — verifica.** Ricontrolla sulla fonte originale un campione di ~15% dei valori e **tutti** i match `probable` / `proxy`; restituisce l'elenco delle discrepanze.
6. **Opus (io) — fusione e note.** Unisce in `strings.json`, risolve le discrepanze e scrive le note da esperto per ogni corda (§7.4). Le note le scrivo io e non Haiku, perché richiedono giudizio tennistico.

### Modello dati (`strings.json`, un record per corda)

```
id, brand, model, gauge_label, gauge_mm, shape, material, is_target, preference: "liked" | "disliked" | null
excel:  { stretch_pct{40,50,60,65}, recover_pct{…}, stiff_index_avg, olg_16x19{…}, static_24h_creep, tl6, tl12 } | null
twu:    { ref_tension_lbs, stiffness_lbin, tension_loss_pct, spin_potential, match } | null
rpedia: { static_stiffness_kgmm, url, match } | null
derived:{ similarity_liked{confidential, otoro}, similarity_disliked{confidential_soft, rpm_blast}, profile_score, tension_start_kg{min,max}, coverage }
notes:  { feel, on_blade_100_v9, for_your_style, vs_favorites }
```

`coverage` = quante delle 3 fonti hanno dati (0–3): viene mostrato come badge, così è chiaro quanto ci si può fidare del confronto.

## 6. Metriche derivate

- **Somiglianza alle preferite (0–100):** distanza normalizzata su stiffness TWU, tension loss TWU, spin potential TWU e Stiff Index Excel (si usano le metriche presenti; se ne mancano più di 2, somiglianza = "n.d."). Piccolo bonus se la forma è uguale (Confidential = tonda, O-Toro = esagonale).
- **Somiglianza alle non gradite (0–100):** stesso calcolo, ma rispetto a Confidential Soft e RPM Blast. Se supera 75 compare il badge **"⚠ simile a una corda che non ti è piaciuta"**, e il punteggio profilo viene penalizzato.
- **Corde discriminanti:** analisi automatica di quali metriche separano meglio le preferite dalle non gradite. Il risultato è mostrato nella sezione "Per te" ("Cosa dicono i tuoi gusti").
- **Punteggio profilo (0–100):** media pesata di spin, controllo (stiffness alta = più controllo), tenuta di tensione e potenza (stiffness bassa = più potenza). Pesi di default: **spin 35, controllo 25, tenuta 20, potenza 20**, perché la Blade 100 v9 a RA basso dà già controllo. I pesi si regolano con gli slider.
- **Tensione di partenza suggerita (kg):** si parte dalla preferita più vicina (Confidential 22/21 o O-Toro 23/22) e si corregge in base alla differenza di stiffness TWU. Regola empirica: corda più rigida ⇒ ~0,5–1 kg in meno per ogni ~15 lb/in in più. L'indicazione è sempre etichettata come **"punto di partenza indicativo"**.
- **OLG per 16x19:** colonna Excel alla tensione più vicina a quella suggerita (utile se si incorda da matassa).

## 7. Pagina interattiva (Artifact)

Una pagina HTML, mobile-first, dati incorporati, nessun backend. Sezioni raggiungibili da una barra di navigazione:

### 7.1 Guida alla scelta
Spiegazione semplice di ogni caratteristica: cosa misura, cosa si sente in campo, se conviene un valore alto o basso. Copre:
- stiffness dinamica e statica;
- perdita di tensione;
- spin potential;
- forma (tonda, esagonale, pentagonale, quadrata, gear);
- calibro;
- Stiff Index, stretch/recover, scorrimento sotto carico 24 h e OLG dell'Excel.

Comprende un mini glossario delle colonne A–Y dell'Excel e un box "Come leggere i tre numeri di rigidità senza confonderli".

### 7.2 Mappa
Grafico a dispersione: stiffness TWU (x) contro perdita di tensione TWU (y).
- Marche target a colori, concorrenti in grigio.
- Confidential e O-Toro evidenziate con una stella.
- Toccando un punto si apre la scheda della corda.
- Si possono cambiare gli assi: spin, Stiff Index Excel, stiffness Racketpedia.

### 7.3 Esplora
Tabella filtrabile per marca, calibro, forma e "solo target", ordinabile su ogni colonna. Per ogni corda mostra il badge di copertura e quello di somiglianza.

### 7.4 Scheda corda
Tutte le misure delle tre fonti, con l'origine di ogni valore. Quattro note brevi scritte **dal punto di vista di un maestro incordatore**. Oltre al gioco, le note coprono:
- tensione di partenza e quando abbassarla;
- consigli di montaggio, come il prestretch e il calo nelle prime ore;
- comportamento nel tempo, cioè quando la corda "muore";
- l'interazione con un telaio flessibile a RA basso.

Le quattro note:
- **Sensazione:** comfort, potenza, controllo, spin.
- **Sulla Blade 100 v9:** interazione con un telaio flessibile, ovale da 100 e schema 16x19.
- **Per il tuo stile:** rotazioni, colpi piatti, gioco a rete.
- **Rispetto alle tue preferite:** cosa cambia rispetto a Confidential e O-Toro, con la tensione di partenza suggerita. Se la corda somiglia a Confidential Soft o RPM Blast, lo dice esplicitamente.

### 7.5 Comparatore
Da 2 a 4 corde affiancate, con le preferite già selezionabili. Mostra:
- un grafico radar (spin, controllo, potenza, tenuta, comfort);
- una tabella delle misure con le differenze evidenziate;
- una frase di sintesi del tipo "passando da A a B guadagni X, perdi Y".

### 7.6 Per te
Classifica per punteggio profilo con gli slider dei pesi, più tre liste pronte:
- **"Come le tue preferite"**: somiglianza più alta;
- **"Più spin, stesso controllo"**;
- **"Più durata"**.

Il ragionamento è spiegato in chiaro.

**Unità:** tensioni sempre in kg e lbs.
**Tema:** chiaro e scuro.

## 8. Gestione errori e qualità dei dati

- **Valore mancante** → mostrato come "—" con tooltip "non testato da questa fonte"; mai interpolato.
- **Fonti in disaccordo** (es. una corda morbida per TWU e rigida per l'Excel) → badge "fonti discordanti" e una nota esplicativa (le misure sono diverse: dinamica, statica, allungamento).
- **Match `proxy`** (stesso modello, calibro diverso) → valore mostrato in corsivo con l'etichetta "dato del calibro X".
- **Pagina TWU irraggiungibile o con struttura cambiata** → lo script fallisce con un errore esplicito; nessun dato parziale silenzioso.

## 9. Verifica

- Lo script controlla i conteggi: righe Excel lette = 4 × corde (le eccezioni vengono elencate) e righe TWU > 400.
- Controllo a campione dell'agente Sonnet (§5.5) con un report delle discrepanze, che vengono risolte prima della pubblicazione.
- Controllo manuale su tutte e tre le fonti delle 4 ancore (Confidential, O-Toro, Confidential Soft, RPM Blast).
- Prova della pagina a 375 px e su desktop, in tema chiaro e scuro; il comparatore viene provato con 4 corde.

## 10. Decisioni e punti residui

1. **Confidential standard nera 1.25** (confermata dal giocatore): non c'è su TWU. Fonti usate:
   - Excel (Confidental 16L) come misura diretta;
   - TWU Confidential 16 (1.30) come `proxy`, con l'etichetta "dato del calibro 1.30";
   - Racketpedia `solinco-confidential-black-125`, come misura diretta se la pagina esiste.
2. Nel file **Grapplesnake** è solo Cube 18 (fuori ambito): per Grapplesnake la pagina si appoggerà a TWU (Alpha, Tour M8, Tour Sniper 1.25) e a Racketpedia.
3. **Re-String** esiste solo nell'Excel: la somiglianza viene calcolata sullo Stiff Index e su TL6/TL12, con copertura ridotta (badge).
