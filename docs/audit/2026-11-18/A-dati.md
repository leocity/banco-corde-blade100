# Revisione dei dati — Banco Corde Blade 100 (ramo adoring-rubin, `/home/user/wt-rubin`)

Sola lettura. Gli script di verifica sono in `/tmp/claude-0/-home-user-banco-corde-blade100/d0b29ddd-8b20-5f53-b818-cde9347c7c79/scratchpad/audit/` (`t1.py`, `t1b.py` ricalcolo; `t2.py` abbinamenti; `t4b.py`, `t4c.py` misure vs stime; `t5.py` correlazioni; `table.py` tabella). Si lanciano con `python3 -I <script>` e non scrivono nel repo. Ricostruzione di prova in `scratchpad/cp/`: `pipeline.build` riprodotto da `merged.json` dà un `strings.json` **identico** a quello committato (102 corde, 0 differenze), e il ricalcolo indipendente di `dims`/`pairing` coincide su tutte le 102 corde (0 discordanze). Test: `pytest` 207 ok, `node --test web/pairing.test.mjs` 17 ok. Quindi **nessuna incoerenza tra pipeline e strings.json**: i problemi sono nelle regole e nei dati, non nel codice di calcolo.

Nucleo del ricalcolo (da `t1.py`):
```python
pop=dim_populations(S)                       # pipeline.dims
dm={r['id']:dimensions(r,pop)['values'] for r in S}
refs=lambda ids:[{'id':i,'dims':dm[i]} for i in ids]
pairing(dm[id], refs(liked), refs(disliked), penalize=id not in liked)['score']
```

## Elenco dei problemi (ordinati per gravità)

### Critico

**C1. I punteggi includono stime («parente», «da Racketpedia», perdita da proxy), contro la regola «solo laboratorio».**
Evidenza: `pipeline/derive.py:LAB_SPIN_KINDS=("misurato","parente")`, `LAB_STIFF_KINDS=("misurata","parente","da Racketpedia")`; `dims.dimensions` usa `twu.tension_loss_pct` senza filtrare `match`. Ricalcolo (`t4b.py`, `t4c.py`): 84 corde con punteggio, **30 con almeno una componente non misurata**; incluse Confidential 16L (rigidità e spin dal TWU 16/1,30), Zero 17 e Slap 17 (rigidità da Racketpedia convertita, MAE 10,5 lb/in; nessuna riga TWU per Re-String). Eliminando tutte le stime restano **54 corde** con punteggio (solo TWU+Excel) o **70** (aggiungendo la rigidità Racketpedia nella sua scala); Zero, Slap e Confidential 16L perdono il punteggio in A.
Effetto: i numeri che vedi su 3 delle tue 4 preferite hanno una incertezza dichiarata ±10–15 lb/in non propagata nel pairing; il README (regole 1 e 5) dice il contrario.
Correzione: togliere `parente` e `da Racketpedia` da `LAB_*_KINDS` e il TL da proxy da `dimensions`, oppure far calcolare il pairing in due modalità, «solo misure» (default) e «con stime» marcata; mostrare «non valutabile» invece di un numero.

**C2. TWU «Signum Pro Plasma HEXtreme 16L/1.25» è `exact` ma TWU stesso lo contraddice.**
Evidenza: tabella 204,6 / 41,5 / 5,9; il Compare TWU (ramo v3, `data/raw/twu_compare.json`) mappa 16 e 16L/1.25 sullo stesso `SIGPHEX16` con 226,0 / 25,0 / 7,3; la v3 lo segnala come «Anomalia» (`data/changes/2026-10-28.md`). Pairing 29 con i dati rubin, 56 con quelli del 16.
Effetto: una corda scartata («Poco adatta») per un dato probabilmente errato della fonte.
Correzione: portare in rubin il controllo `twu_compare.consistent` della v3 e declassare a «non verificata» le righe in anomalia.

### Importante

**I1. «Anno da verificare»: 47 corde; solo 7 hanno un anno «exact» ≥ 2020.** (45 `upper_bound`, 3 exact sono del 2010: le Blast, tenute perché non gradite.) Un `upper_bound` 2020–2021 (8 corde: Lynx Tour 16/17, X-Perience 17, Hyper-G Soft 16/17/16L, Poly Tour Rev 16/16L) può essere pre-2020: la regola «tolte le pre-2020» non è verificabile. Correzione: trattare `upper_bound ≤ 2021` come «da verificare» e mostrarlo sulla scheda.

**I2. Proxy a calibro sbagliato quando esiste la riga a calibro uguale.** RPM Blast 16L (1,25) ← «16 (1,30)» invece di «17/1.25» (perdita 45,9 vs 33,3; pairing 12→21); Competition 16L ← «16/1.30» invece di «17 (1.25)» (30→40). `t2.py`. Correzione: nell'abbinamento preferire la riga con |Δcalibro| ≤ 0,03 mm prima della stessa etichetta. Blast 16L e 17 sono la stessa corda (stessa scheda Racketpedia 125): fondere i record.

**I3. Racketpedia di rubin è indietro di 8 righe rispetto alla v3**, tra cui le 3 «Confidential Soft Pink» (non gradita): `racketpedia.json` 318 vs 326 righe. Effetto: Soft 16L/16/17 senza dato Racketpedia (le due ultime solo catalogo). Correzione: riscaricare (`py -m pipeline.rpedia_site`) o prendere il file v3.

**I4. Righe Racketpedia `proxy` usate come rigidità.** 7 delle 20 rigidità «da Racketpedia» (Enso Pro 16, Enso Pro Neon Yl 16L, Neon Pk 17, Toro Toro Orange/Matcha, Sync 16, A5) derivano da una scheda di altro colore o calibro, senza correzione di calibro (`estimate.estimate_stiffness`, ramo `rp`, non filtra `match`); Flash Yellow/Black prendono la scheda Orange. Correzione: ammettere solo `match == "exact"`, o correggere per calibro con margine.

**I5. Il file Excel ha due righe identiche (Flash pink e Flash yellow)**, ogni cella. Una misura contata due volte; probabile copia. Correzione: chiedere all'utente di verificare; nel dubbio escludere una delle due.

**I6. Le 5 Flash condividono una riga TWU di 1,30 mm senza colore**, spin NA: tenuta (36,7) copiata a tutte, senza margine. Correzione: marcarla «stima» e fuori dal pairing (vedi C1).

**I7. Le componenti della «tenuta» non correlano tra loro né con TWU** (ρ 0,11 TL6↔TL12, n=33; −0,21 TL12↔scorrimento, n=34; TWU perdita↔TL6 −0,02, n=12; ↔scorrimento −0,26, n=12), eppure `dimensions` le media alla pari con 1–4 componenti per corda (1 sola per 48 corde; Slap: solo 0,25 di scorrimento). Effetto: tenuta e vita attesa (8+0,12·tenuta h) poggiano su rumore; Slap 14,7 h ≈ la costante di ripiego di 14 h. Correzione: mostrare il numero di componenti, non calcolare la tenuta con <2 componenti coerenti, o usare solo TWU.

**I8. Pairing e tensione poggiano su una conversione Racketpedia→TWU (r 0,61, n 26)**: Zero−Slap = 18,9 lb/in contro MAE 10,5; con montata Slap 22/21 l'app suggerisce per Zero 21/20 (−1 kg) mentre tu usavi 22,5/21,5. Correzione: ampliare l'intervallo ±1 kg (±1,5 kg tra due corde convertite) o non proporre correzione se la differenza è < 2·MAE.

**I9. Margine dello spin «parente» ±0,5 troppo stretto.** Su 48 coppie dello stesso modello a ≤0,06 mm: |Δspin| mediana 0,45, p80 1,10, max 2,4; |Δperdita| mediana 3,6, p80 13,0, max 23,4 punti (`t4c.py`). Correzione: ±1,1 per lo spin, ±13 per la perdita, o niente.

**I10. `tecnifibre-razor-17` misurata con la riga «Razor Code 17», modello che la stessa pipeline toglie come «già in vendita nel 2013».** Incoerenza; stato produzione `unclear`.

### Minore

**M1. README obsoleto:** «97 corde su 102 hanno un pairing (14 Ottimo), 5 non valutabili»; reale 84 con punteggio (13 Ottimo, 7 Buono, 36 Attenzione, 28 Poco adatta), 18 «Non valutabile».
**M2. I default non riflettono le tue scelte:** `defaults.disliked` ha Soft 16/17 e Blast 16/17, non Soft **16L** (l'unica non gradita misurata dal TWU, 194,3/27,7/6,5) né Barb Wire 16; `liked` non ha Zero e Slap; `equipped` è Zero 22,5/21,5 (`derive.py:20-22`). Lo stato vero vive nel `db` e non è leggibile da qui. Con la lista completa il pairing cambia, per es. O-Toro 17: 100 → 49 (vicino a Slap), Toro Toro Matcha 43 → 63.
**M3. Elasticità quantizzata:** passi di 0,533 % nel file Excel; 16 valori distinti su 44 corde, 13 a 0,0; pareggi 61,4 (Zero, Confidential 16L, Flash…).
**M4. Codice morto:** `derive.tension_start`, `profile_score`, `judgments`, `similarity` ancora in `strings.json` (`derived.profile_score`, `tension_start`); arrotondamento Python/JS diverso sui pareggi (solo in `tension_start`).
**M5. Prezzi nel repo, non nell'app:** `data/agents/shopping_twe.json` (`price_eur`), `shopping_candidates.json`, testi `evidence` in `prod_p*.json`; 0 occorrenze in `strings.json` e `dist/*.html`.


## 1. Ricalcolo dei numeri mostrati (percentili tra le corde del banco)

| corda | rigidità % (valore, tipo) | tenuta % (n misure) | elasticità % | spin % | pairing default / con le tue 4 preferite e 6 non gradite* | tensione se montata = Slap 22/21 | se montata = Zero 22,5/21,5 | vita attesa |
|---|---|---|---|---|---|---|---|---|
| Re-String Slap 17 | 24,6 (194,8 lb/in, **da Racketpedia**) | 55,7 (**1**: solo scorrimento 24 h) | 33,0 | — (stima 7,83, esclusa) | 69 Buono / 69 | 22/21 (è la montata) | 23,5/22,5 | 14,7 h ±25% |
| Re-String Zero 17 | 58,8 (213,7, **da Racketpedia**) | 53,8 (3) | 61,4 | — (stima 7,36, esclusa) | 100 / 100 | **21/20** | 22,5/21,5 | 14,5 h |
| Solinco Confidential 16L | 56,1 (212,1, **parente** di 16/1,30, ±15) | 54,2 (4, di cui 1 TWU da proxy) | 61,4 | 62,0 (**parente**, 6,4) | 100 / 100 | 21/20 | 22,5/21,5 | 14,5 h |
| Toroline O-Toro 17 | 2,6 (165,7 misurata) | 39,4 (4) | 30,7 | 99,1 (9,4 misurato) | 100 / 49 (vicina a Slap) | 23,5/22,5 | 24,5/23,5 | 12,7 h |
| Toro Toro Matcha 16L (a caso, seed 7) | 40,4 (207,4, da Racketpedia **proxy**) | 60,0 (3) | 39,8 | — | 43 / 63 | 21,5/20,5 | 23/22 | 15,2 h |
| Tecnifibre Razor Soft 17 (a caso, seed 7) | 55,3 misurata | 66,4 (1, TWU) | — | 80,6 misurato | 100 / 100 | 21/20 | 22,5/21,5 | 16,0 h |

\* default = Confidential 16L e O-Toro come preferite; non gradite = Soft 16/17, Blast 16/17 (`pipeline/derive.py:20`). Scenario utente: preferite Confidential 16L, O-Toro, Zero 17, Slap 17 (esclusa la corda stessa quando è una preferita); non gradite Soft 16, 17, 16L, Blast 16, 17, Barb Wire 16.

Formule verificate: percentile = (meno + 0,5·uguali)/n sulla popolazione *misurata* (rigidità n=57, spin n=54, `derive.py:population`); tenuta = media dei percentili invertiti di perdita TWU, TL6, TL12, scorrimento 24 h (n=44 Excel, 70 TWU; `dims.py:dimensions`); vita = 8 + 0,12·tenuta ore (`web/wear.js:11`), 14 h se manca; tensione = −0,75 kg ogni +15 lb/in, tetto ±2 kg (`web/state.js:77`).

Osservazioni sul ricalcolo (non errori di calcolo, ma di significato):
- **Slap e Zero non hanno nessuna riga TWU** (snapshot `data/raw/twu.json`, 130 righe, non contiene Re-String). La loro rigidità è la conversione Racketpedia→TWU (`rp_to_twu`: a=62,85, b=147,71, n=26, r=0,61, MAE 10,5 lb/in; `strings.json:estimates_meta`). La differenza Zero−Slap vale 18,9 lb/in, contro un errore tipico di 10,5 su ciascuna: l'ordine è plausibile, la grandezza no. La tensione consigliata (±1,5 kg tra le due) poggia su questa differenza: con montata = Zero 22,5/21,5 l'app suggerisce Slap 23,5/22,5, tu hai scelto 22/21.
- **La tenuta di Slap è un solo numero**: 0,25 di scorrimento 24 h, valore che hanno 17 corde su 44. Percentile 55,7 = mediana di un pareggio. Vita attesa 14,7 h è quindi quasi la costante di ripiego (14 h).
- Elasticità = recupero/allungamento a 50 lb con passi di 0,533 % del file Excel: 16 valori distinti su 44, **13 corde a 0,0**; Zero, Confidential 16L, Flash Pink/Yellow/Green e Wasabi Pom hanno lo stesso 61,4 per quantizzazione.
- Ancore della tensione: il codice Python (`derive.tension_start`, scelta dell'ancora via `similarity` su 2–6 misure) dà per Slap 21,5/20,5 da O-Toro, ma da Confidential darebbe 23/22: lo stesso input dà 1,5 kg di scarto a seconda dell'ancora. L'interfaccia non lo usa (usa `tensionFor` con la montata); il campo `derived.tension_start` in `strings.json` resta ma è codice morto (README:77). Arrotondamento diverso Python (`round`, pari) / JS (`halfAway`) sui pareggi: solo in quel campo morto.

## 2. Abbinamenti TWU / Racketpedia

**RPM Blast 16L vs 17** — Importante. `babolat-rpm-blast-16l` (1,25 mm) è abbinata come *proxy* a «Babolat RPM Blast 16» (1,30 mm: rigidità 232,6, perdita 45,9, spin 4,5) (`data/agents/matches.json`), mentre TWU ha «Babolat RPM Blast 17/1.25» (1,25 mm: 233,7, **33,3**, 4,6) che è lo stesso calibro. Differenza di perdita: 12,6 punti, copiata come misura nella tenuta (`dims.py`, nessun margine). Con la riga giusta il pairing di 16L passa da 12 a 21 (tenuta 34,8→47,9, rigidità 80,7→95,6). Inoltre 16L e 17 puntano alla stessa scheda Racketpedia (`babolat-rpm-blast-black-125`, 1,18): sono la stessa corda fisica con due record e due set Excel diversi (stretch50 3,289 vs 4,444; TL6 17 vs 20): doppione, e 16L non è tra le non gradite di default.

**Kirschbaum Competition 16L vs 17** — Importante. 16L è proxy di «Competition 16/1.30» (210,3 / 47,5 / spin 4,9) benché esista «Competition 17 (1.25)» con lo stesso calibro (210,3 / 47,5 / **4,5**). Inoltre le due righe TWU hanno rigidità **e** perdita identiche (210,3 / 47,5) pur con 0,05 mm di calibro: probabile duplicazione nella fonte; spin diverso (4,9 vs 4,5). Spin 16L usato come «parente»: 4,9±0,5. Pairing 30; con la riga 1,25 sarebbe 40. Nessuna scheda Racketpedia per Competition: nessun controllo incrociato.

**Racketpedia «Confidential Soft Pink» (3 righe)** — Importante. Nel ramo online (rubin) **non ci sono**: `data/raw/racketpedia.json` ha 318 righe, il ramo v3 ne ha 326; mancano Soft Pink 120/125/130 (0,85/0,85/0,90), Black Shark Black 130 e 4 Hyper-G Round Green (`data/changes/2026-10-28.md` nel ramo v3). Nella v3 l'abbinamento è corretto (16L→Pink 125, Soft 16→130, Soft 17→120, tutti `exact`, calibri coincidenti). Effetto in rubin: le tre «non gradite» Soft non hanno dato Racketpedia, e Soft 16 e 17 sono solo «solo catalogo» con stime da gemello (nessun punteggio). Correzione: riportare `racketpedia.json` della v3.

**Flash / Enso Pink entrate in automatico** (`strings.json:estimates_meta.rpedia_site.changes`, `rpedia_site.match_rows`):
- Flash Pink 17 → «Kirschbaum Flash Pink 125» 0,8 (exact, calibro e colore coincidono): abbinamento corretto. Ma tutte e 5 le Flash (Orange, Pink, Yellow, Green, Black) usano come TWU la stessa riga «Flash 16 (1.30)» (192,6 / 36,7 / spin NA): il colore non è identificato in TWU e Racketpedia dà rigidità diverse per colore (0,80 / 0,90 / 0,85). Quindi stessa perdita (36,7) a 5 corde diverse, a calibro sbagliato (1,30 contro 1,25), senza margine. Yellow e Black non hanno scheda Racketpedia per il loro colore: ricevono la scheda **Orange** come proxy (`rpedia.match = proxy`).
- **Excel: le righe «Flash pink» e «Flash yellow» sono identiche in ogni cella** (tutti i 4 livelli di tensione, TL6=16, TL12=18, scorrimento 0,38, indice 2,2): copia-incolla quasi certa nel file dell'utente (`data/source/String chart Aug 262026.xlsx`, righe «Flash pink/yellow»). Due corde diverse contano come una misura doppia.
- Enso Pro Neon Pink 17 (1,23 mm) → «Enso Pro Neon Pink 125» (1,25): `proxy` (scarto 0,02 mm > soglia 0,015), usata comunque come rigidità «da Racketpedia» 198,0. Enso Pro 16 (1,30) e Neon Yellow 16L usano «Enso Pro Carbon 125»: altro colore/calibro, rigidità 204,3 senza correzione di calibro. In tutto **7 delle 20 rigidità «da Racketpedia» derivano da una riga Racketpedia `proxy`** e `estimate_stiffness` non filtra su `match` (`estimate.py`, ramo `rp`); `derive.METRICS['rpedia_static']` idem.

**Signum Pro Plasma HEXtreme 16L** — Critico. TWU principale: «HEXtreme 16L/1.25» = 204,6 / 41,5 / spin 5,9 (`exact`). Nel ramo v3 il «Compare» di TWU mappa i due nomi (16 e 16L/1.25) sullo **stesso codice prodotto SIGPHEX16** con 226,0 / 25,0 / 7,3, e la v3 lo segnala come anomalia (`data/changes/2026-10-28.md`, riga «Anomalie»). Il dato `exact` di rubin è quindi contraddetto da TWU stesso: in rubin la 16L ha 5,9 di spin e pairing 29 «Poco adatta»; con i valori del 16 sarebbe 56 (rigidità 36,8→85,1; tenuta 33,6→93,6; spin 50,9→76,9). Una differenza di 0,05 mm non spiega 21 lb/in e 17 punti di perdita (modello del calibro: 203 lb/in per mm, quindi ~10). Racketpedia dà 1,1 sia a 1,20 sia a 1,25 sia a 1,30 mm e forma «round» per 125 e «hexagonal» per 130: nessuna conferma.

**Altro trovato.** `tecnifibre-razor-17` (override manuale «Razor = Razor Code») usa la riga `probable` «Razor Code 17 (1.25)», mentre «Razor Code» è nell'elenco delle corde tolte come pre-2020 («già in vendita nel 2013», `removed_discontinued`): stessa riga TWU usata come misura per una corda tenuta e come motivo per toglierne un'altra. Stato produzione `unclear`. In più TWU confronta il «gemello di calibro»: per coppie dello stesso modello a ≤0,06 mm di distanza lo spin differisce di mediana 0,45, p80 1,10, max 2,4 (n=48), la perdita di mediana 3,6, p80 13,0, max 23,4 punti (n=53): il margine ±0,5 per lo spin dei «parenti» copre circa la metà dei casi, e la perdita da proxy non ha margine (`estimate.py:RELATIVE_MARGIN`).

## 3. «Anno da verificare»

**47 corde** con `production.year = null` (README e `web/cards.js:27` coincidono), nessuna solo-catalogo. Elenco: head-hawk-seeding-16, kirschbaum-competition-16l/16/17/17l, kirschbaum-pro-line-rough-16l, kirschbaum-helix-white-17/blue-17/16, kirschbaum-flash-orange/pink/yellow/green/black-17, kirschbaum-flash-16, kirschbaum-max-power-rough-16/17, kirschbaum-super-smash-16/17, luxilon-element-soft-ir-17/16l, luxilon-alu-power-soft-16l, signum-pro-polaris-17, signum-pro-plasma-hextreme-16/16l, signum-pro-poly-plasma-pure-16l/17/17l, signum-pro-tornado-16/17, signum-pro-hyperion-16/17, signum-pro-poly-megaforce-16/17, signum-pro-poly-speed-spin-16, tecnifibre-razor-17, toroline-absolute-17l, toroline-caviar-17l/17, toroline-wasabi-x-blue-17, toroline-super-toro-17l, toroline-snapper-17, yonex-poly-tour-spin-17/16l, solinco-barb-wire-16l/17/16. Tre hanno anche `status = unclear` (Hawk Seeding 16, Razor 17, Speed Spin 16).

Problema più grosso: **solo 10 corde hanno un anno «exact»** (3 Blast = 2010, 3 Confidential = 2020, 3 Confidential Soft = 2026, O-Toro Tour = 2025), quindi solo 7 con anno ≥ 2020 dimostrato; le altre 45 sono «upper_bound» (2020:6, 2021:2, 2022:6, 2023:6, 2024:13, 2025:8, 2026:4) (data di una recensione: «già in vendita nel…»). La regola «tolte le pre-2020» elimina solo quando l'anno è <2020: un `upper_bound` 2020 (Lynx Tour 16/17, X-Perience 17, Hyper-G Soft 16/17/16L = 2020; Poly Tour Rev 16/16L = 2021) significa «al più tardi 2020», quindi può essere antecedente. Le Blast sono exact **2010**, tenute solo perché non gradite. La regola, applicata alla lettera, non è dimostrata.

## 4. Misure vere / stime per corda; punteggi senza stime

Definizioni. **Misura vera**: TWU `exact`/`probable` (rigidità, perdita, spin), Excel (TL6, TL12, scorrimento, allungamento/recupero), Racketpedia `exact` (kg/mm, scala propria). **Stima**: *parente/gemello* (TWU di altro calibro/colore, con correzione), *da Racketpedia* (regressione, MAE 10,5), *proxy* TWU e Racketpedia, *modello* (spin da rigidità+forma: MAE 1,04–0,99; rigidità dal solo calibro).

Cosa entra oggi nel pairing (`derive.py:LAB_SPIN_KINDS/LAB_STIFF_KINDS`): rigidità `misurata`+`parente`+`da Racketpedia`; spin `misurato`+`parente`; tenuta con la perdita TWU anche da riga *proxy* (`METRICS`/`dimensions` non filtrano `match`); elasticità e Excel. Fuori: spin `modello` (30 corde) e rigidità `modello` (4). Il README (regola 1) dichiara «gemelli di calibro misurati» e la regola 5 che le stime non entrano: è vero per il «modello», **non per «parente» e «da Racketpedia»**, che entrano.

Conteggi (102 corde; 13 solo catalogo):
- Rigidità: 57 misurata, 21 parente, 20 da Racketpedia (7 da riga RP *proxy*), 4 modello. Spin: 54 misurato, 18 parente, 30 modello.
- Perdita TWU da riga proxy che entra nella tenuta: 13.
- Corde con punteggio oggi: **84** (13 Ottimo, 7 Buono, 36 Attenzione, 28 Poco adatta); 18 «Non valutabile» (13 solo catalogo + 5). Il README dice «97 su 102, 14 Ottimo, 5 non valutabili»: **obsoleto** (97 = 84 + 13 solo catalogo, non vero).
- Di quelle 84, **30 hanno almeno una componente non misurata** (rigidità parente/da Racketpedia, spin parente o perdita proxy). Questo include **le 3 corde che usi**: Confidential 16L (rigidità e spin parenti di Confidential 16/1,30; nessuna riga TWU a 1,25), Zero 17 e Slap 17 (rigidità da Racketpedia, nessun TWU).
- **Eliminando TUTTE le stime** (gemelli, parenti, proxy, da Racketpedia, modello), con la stessa regola di pairing (≥3 dimensioni misurate, riferimenti ricalcolati): **A) solo TWU exact/probable + Excel: 54 corde con punteggio** (perdono 30; Slap, Zero 17, Confidential 16L, tutte le Flash, tutte le Toroline Enso/Caviar/Wasabi/Toro Toro tra le perdenti). **B) aggiungendo la rigidità Racketpedia exact nella sua scala (percentile tra le 64 righe RP, non confrontabile con TWU): 70 corde** (perdono 14). Il filtro «solo dati misurati» dell'app (`web/choose.js:9`, spin misurato **e** rigidità misurata) dà 54 corde: coincide con A. Le 13 solo-catalogo non hanno mai punteggio.
- I punteggi A/B non sono confrontabili con quelli attuali: cambiano le dimensioni presenti e, in A, Confidential 16L perde rigidità e spin come riferimento (resta con tenuta ed elasticità), quindi il pairing contro di essa ignora spin e rigidità.

Legenda tabella: Rig./Spin: M = misurata/o TWU exact/probable; G = parente/gemello; RP→TWU = convertita da Racketpedia (proxy = riga RP di altro colore/calibro); stima = modello (spin: fuori punteggio). `+RP` = ha anche Racketpedia exact. Tenuta: `TWUM`/`TWUproxy`/`TWU-` + n misure Excel (TL6, TL12, scorrimento). Elas.: X = c'è. Punteggi: app = oggi; A = solo misure (senza RP); B = A + RP.


## 5. Coerenza tra le fonti (correlazione di rango, Spearman, n = corde con entrambe le misure; solo TWU `exact/probable`, Racketpedia `exact`)

| coppia | n | ρ | atteso |
|---|---|---|---|
| TWU rigidità ↔ Racketpedia statica | 26 | **+0,65** (p 0,001) | + : concordano |
| TWU rigidità ↔ Excel indice di cedimento («alto=morbida») | 12 | −0,12 (p 0,71) | forte − : **nessun accordo** |
| TWU rigidità ↔ Excel allungamento 50 lb | 12 | −0,15 | − : **nessun accordo** |
| Racketpedia ↔ Excel cedimento | 25 | −0,07 | − : **nessun accordo** |
| Racketpedia ↔ Excel allungamento 50 lb | 25 | −0,07 | − : idem |
| TWU perdita ↔ Excel TL6 | 12 | −0,02 | + : **nessun accordo** |
| TWU perdita ↔ Excel TL12 | 11 | −0,02 | + : idem |
| TWU perdita ↔ Excel scorrimento 24 h | 12 | **−0,26** | + : segno opposto |
| Excel TL6 ↔ TL12 | 33 | +0,11 | + : debole |
| Excel TL12 ↔ scorrimento | 34 | **−0,21** | + : segno opposto |
| Excel TL6 ↔ scorrimento | 37 | +0,26 (p 0,12) | + : debole |
| TWU perdita ↔ Excel allungamento 50 lb | 12 | +0,60 (p 0,05) | l'unica concordante tra le due famiglie |
| TWU rigidità ↔ TWU perdita | 57 | −0,34 | (dentro TWU) |
| TWU spin ↔ Racketpedia | 25 | 0,00 | — |

Lettura: TWU e Racketpedia sulla **rigidità** vanno d'accordo (0,65, n=26). Il test Excel dell'utente **non** correla né con TWU (n=12) né con Racketpedia (n=25) né, per le misure di tenuta, con TWU: le quattro componenti della «tenuta» (perdita TWU, TL6, TL12, scorrimento) sono quasi incorrelate o con segno opposto, ma `dims.durability` le media alla pari. Quindi la «tenuta» è un indice composito di quantità che non misurano la stessa cosa, con 1–4 componenti a seconda della corda (distribuzione n componenti: 0→13, 1→48, 2→5, 3→17, 4→19). I casi in cui il segno si inverte per la stessa corda: `sources_disagree` segnala 5 corde (Blast 16L e 17, Lynx Tour 16, Flash Black, Super Toro 17L; per es. Super Toro 17L: TWU 189,7 lb/in, indice Excel 1,667, scarto di rango del 75% tra le 12 corde con entrambe le fonti). n=12 per TWU∩Excel è piccolo: sono indicazioni, non prove.

## 6. Prezzi / dati vietati

`strings.json`, `merged.json`, `dist/*.html`: 0 occorrenze di «€», «prezzo», «price», «$». Ma nel repo (tracciati) ci sono: `data/agents/shopping_twe.json` (`price_eur`: 15,90; 14,90; 168,00; … con note «Prices include VAT») e `shopping_candidates.json`; `data/agents/prod_p1/p2/p3.json` hanno prezzi nel testo `evidence` («$21.50», «EUR 129», «EUR 6.90»), non copiati in `strings.json` (`production.py` copia solo stato/anno/url); `data/agents/forum_grapplesnake.json:108` ha la parola «price» in una citazione. Il codice (`pipeline/`, `web/`) non legge `shopping_*` (grep). Il README (r.74) cita ancora la lista acquisti. Violazione solo di principio (dati sul repo), non nell'app. Correzione: togliere `shopping_*.json` dal repo o dalla distribuzione e ripulire `evidence`.


### Tabella per corda (punto 4)

| corda | Rig. | Spin | Tenuta | Elas. | Punt. app | A: solo misure | B: A + RP scala propria |
|---|---|---|---|---|---|---|---|
| babolat-rpm-blast-16l | G +RP | G | TWUproxy+Excel3 | X | 12 | - | 43 |
| babolat-rpm-blast-17 | M | M | TWUM+Excel3 | X | 3 | 29 | 13 |
| head-hawk-power-17 | M | M | TWUM+Excel3 | X | 45 | 67 | 47 |
| head-lynx-tour-16 | M | M | TWUM+Excel3 | X | 43 | 42 | 21 |
| head-hawk-seeding-16 | stima | stima (fuori punteggio) | TWU-+Excel3 | X | - | - | - |
| kirschbaum-competition-16l | G | G | TWUproxy+Excel2 | X | 30 | - | - |
| kirschbaum-pro-line-rough-16l | stima | stima (fuori punteggio) | TWU-+Excel2 | X | - | - | - |
| kirschbaum-helix-white-17 | M | M | TWUM+Excel3 | X | 51 | 84 | 77 |
| kirschbaum-helix-blue-17 | M | M | TWUM+Excel3 | X | 25 | 42 | 45 |
| kirschbaum-flash-orange-17 | G +RP | stima (fuori punteggio) | TWUproxy+Excel3 | X | 59 | - | 30 |
| kirschbaum-flash-pink-17 | G +RP | stima (fuori punteggio) | TWUproxy+Excel3 | X | 53 | - | 53 |
| kirschbaum-flash-yellow-17 | G | stima (fuori punteggio) | TWUproxy+Excel3 | X | 53 | - | - |
| kirschbaum-flash-green-17 | G +RP | stima (fuori punteggio) | TWUproxy+Excel3 | X | 53 | - | 53 |
| kirschbaum-flash-black-17 | G | stima (fuori punteggio) | TWUproxy+Excel3 | X | 68 | - | - |
| luxilon-element-soft-ir-17 | G | G | TWUproxy+Excel3 | X | 37 | - | - |
| re-string-slap-17 | RP→TWU | stima (fuori punteggio) | TWU-+Excel1 | X | 69 | - | 100 |
| re-string-sync-17 | RP→TWU | stima (fuori punteggio) | TWU-+Excel1 | X | 43 | - | 68 |
| re-string-vivo-17 | RP→TWU | stima (fuori punteggio) | TWU-+Excel1 | X | 90 | - | 75 |
| re-string-zero-16 | RP→TWU | stima (fuori punteggio) | TWU-+Excel3 | X | 29 | - | 14 |
| re-string-zero-17 | RP→TWU | stima (fuori punteggio) | TWU-+Excel3 | X | 100 | - | 85 |
| signum-pro-x-perience-17 | M | M | TWUM+Excel2 | X | 58 | 76 | 43 |
| signum-pro-polaris-17 | stima | stima (fuori punteggio) | TWU-+Excel2 | X | - | - | - |
| solinco-hyper-g-soft-17 | G | G | TWUproxy+Excel1 | X | 55 | - | - |
| solinco-hyper-g-soft-16 | G | G | TWUproxy+Excel1 | X | 54 | - | - |
| solinco-confidential-16 | M | M | TWUM+Excel3 | X | 45 | 42 | 28 |
| solinco-confidential-16l | G +RP | G | TWUproxy+Excel3 | X | 100 | - | 100 |
| solinco-confidential-17 | G +RP | G | TWUproxy+Excel1 | X | 44 | - | 73 |
| tecnifibre-razor-17 | M | M | TWUM+Excel3 | X | 27 | 64 | 35 |
| toroline-absolute-17l | M | M | TWUM+Excel3 | X | 67 | 82 | 82 |
| toroline-caviar-17l | RP→TWU | stima (fuori punteggio) | TWU-+Excel3 | X | 36 | - | 55 |
| toroline-caviar-17 | RP→TWU | stima (fuori punteggio) | TWU-+Excel3 | X | 50 | - | 73 |
| toroline-enso-pro-16 | RP→TWU(proxy) | stima (fuori punteggio) | TWU-+Excel3 | X | 46 | - | - |
| toroline-enso-pro-neon-yl-16l | RP→TWU(proxy) | stima (fuori punteggio) | TWU-+Excel3 | X | 23 | - | - |
| toroline-enso-pro-neon-pk-17 | RP→TWU(proxy) | stima (fuori punteggio) | TWU-+Excel3 | X | 43 | - | - |
| toroline-wasabi-green-17 | RP→TWU | stima (fuori punteggio) | TWU-+Excel3 | X | 38 | - | 64 |
| toroline-wasabi-x-blue-17 | stima | stima (fuori punteggio) | TWU-+Excel3 | X | - | - | - |
| toroline-wasabi-pom-17 | RP→TWU | stima (fuori punteggio) | TWU-+Excel3 | X | 100 | - | 100 |
| toroline-super-toro-17l | M | M | TWUM+Excel3 | X | 56 | 71 | 71 |
| toroline-o-toro-17 | M | M | TWUM+Excel3 | X | 100 | 100 | 100 |
| toroline-toro-toro-orange-17 | RP→TWU(proxy) | stima (fuori punteggio) | TWU-+Excel3 | X | 43 | - | - |
| toroline-toro-toro-pink-17 | RP→TWU | stima (fuori punteggio) | TWU-+Excel3 | X | 43 | - | 68 |
| toroline-toro-toro-matcha-16l | RP→TWU(proxy) | stima (fuori punteggio) | TWU-+Excel3 | X | 43 | - | - |
| yonex-poly-tour-rev-16l | M | M | TWUM+Excel3 | X | 44 | 57 | 38 |
| yonex-poly-tour-spin-17 | G | G | TWUproxy+Excel2 | X | 47 | - | - |
| toroline-o-toro-snap-16l | M | M | TWUM+Excel0 | - | 97 | 100 | 100 |
| tecnifibre-razor-spin-17 | M | M | TWUM+Excel0 | - | 61 | 100 | 55 |
| toroline-o-toro-spin-17 | M | M | TWUM+Excel0 | - | 78 | 100 | 93 |
| grapplesnake-tour-m8-17 | M | M | TWUM+Excel0 | - | 98 | 100 | 96 |
| toroline-o-toro-tour-17 | M | M | TWUM+Excel0 | - | 93 | 100 | 90 |
| toroline-cash-16l | M | M | TWUM+Excel0 | - | 60 | 100 | 75 |
| tecnifibre-razor-soft-17 | M | M | TWUM+Excel0 | - | 100 | 100 | 100 |
| signum-pro-plasma-hextreme-16 | M | M | TWUM+Excel0 | - | 56 | 100 | 35 |
| solinco-hyper-g-round-16 | M | M | TWUM+Excel0 | - | 56 | 100 | 35 |
| toroline-snapper-17 | M | M | TWUM+Excel0 | - | 56 | 100 | 50 |
| head-lynx-tour-17 | M | M | TWUM+Excel0 | - | 91 | 100 | 86 |
| luxilon-element-soft-ir-16l | M | M | TWUM+Excel0 | - | 28 | 63 | 31 |
| luxilon-alu-power-soft-16l | M | M | TWUM+Excel0 | - | 56 | 100 | 50 |
| grapplesnake-alpha-17 | M | M | TWUM+Excel0 | - | 88 | 100 | 81 |
| solinco-confidential-soft-16l | M | M | TWUM+Excel0 | - | 56 | 100 | 50 |
| yonex-poly-tour-spin-16l | M | M | TWUM+Excel0 | - | 100 | 100 | 100 |
| kirschbaum-max-power-rough-16 | M | M | TWUM+Excel0 | - | 49 | 100 | 35 |
| solinco-mach-10-16 | M | M | TWUM+Excel0 | - | 54 | 100 | 44 |
| signum-pro-plasma-hextreme-16l | M | M | TWUM+Excel0 | - | 29 | 100 | 63 |
| grapplesnake-tour-sniper-16l | M | M | TWUM+Excel0 | - | 67 | 100 | 70 |
| kirschbaum-super-smash-17 | M | M | TWUM+Excel0 | - | 50 | 0 | 50 |
| signum-pro-poly-plasma-pure-16l | M | M | TWUM+Excel0 | - | 21 | 100 | 57 |
| kirschbaum-max-power-rough-17 | M | M | TWUM+Excel0 | - | 26 | 100 | 35 |
| solinco-barb-wire-16l | M | M | TWUM+Excel0 | - | 53 | 100 | 53 |
| kirschbaum-helix-16 | M | M | TWUM+Excel0 | - | 8 | 0 | 13 |
| kirschbaum-super-smash-16 | M | M | TWUM+Excel0 | - | 9 | 0 | 18 |
| signum-pro-poly-plasma-pure-17 | M | M | TWUM+Excel0 | - | 19 | 71 | 36 |
| solinco-hyper-g-soft-16l | M | M | TWUM+Excel0 | - | 57 | 100 | 57 |
| signum-pro-tornado-16 | M | M | TWUM+Excel0 | - | 24 | 0 | 44 |
| luxilon-alu-power-vibe-16 | M | M | TWUM+Excel0 | - | 43 | 100 | 74 |
| kirschbaum-competition-16 | M | M | TWUM+Excel0 | - | 27 | 0 | 46 |
| solinco-barb-wire-17 | M | M | TWUM+Excel0 | - | 43 | 85 | 45 |
| signum-pro-poly-megaforce-17 | M | M | TWUM+Excel0 | - | 57 | 100 | 100 |
| signum-pro-tornado-17 | M | M | TWUM+Excel0 | - | 28 | 32 | 66 |
| signum-pro-hyperion-16 | M | M | TWUM+Excel0 | - | 29 | 100 | 77 |
| babolat-rpm-blast-16 | M | M | TWUM+Excel0 | - | 0 | 0 | 0 |
| kirschbaum-competition-17 | M | M | TWUM+Excel0 | - | 27 | 0 | 46 |
| solinco-barb-wire-16 | M | M | TWUM+Excel0 | - | 43 | 100 | 100 |
| signum-pro-poly-megaforce-16 | M | M | TWUM+Excel0 | - | 14 | 100 | 35 |
| signum-pro-poly-speed-spin-16 | M | M | TWUM+Excel0 | - | 14 | 100 | 35 |
| signum-pro-hyperion-17 | M | M | TWUM+Excel0 | - | 22 | 85 | 44 |
| kirschbaum-competition-17l | M | M | TWUM+Excel0 | - | 18 | 19 | 19 |
| signum-pro-poly-plasma-pure-17l | M | G | TWUM+Excel0 | - | 11 | - | - |
| yonex-poly-tour-rev-16 | M | G | TWUM+Excel0 | - | 91 | - | - |
| kirschbaum-flash-16 | M | stima (fuori punteggio) | TWUM+Excel0 | - | - | - | - |
| solinco-hyper-g-round-16l (solo catalogo) | G | G | TWU-+Excel0 | - | - | - | - |
| solinco-hyper-g-round-17 (solo catalogo) | G | G | TWU-+Excel0 | - | - | - | - |
| solinco-mach-10-16l (solo catalogo) | G | G | TWU-+Excel0 | - | - | - | - |
| solinco-mach-10-17 (solo catalogo) | G | G | TWU-+Excel0 | - | - | - | - |
| solinco-confidential-soft-16 (solo catalogo) | G | G | TWU-+Excel0 | - | - | - | - |
| solinco-confidential-soft-17 (solo catalogo) | G | G | TWU-+Excel0 | - | - | - | - |
| re-string-vivo-16 (solo catalogo) | RP→TWU | stima (fuori punteggio) | TWU-+Excel0 | - | - | - | - |
| re-string-sync-16 (solo catalogo) | RP→TWU(proxy) | stima (fuori punteggio) | TWU-+Excel0 | - | - | - | - |
| re-string-sync-18 (solo catalogo) | RP→TWU | stima (fuori punteggio) | TWU-+Excel0 | - | - | - | - |
| re-string-slap-16 (solo catalogo) | RP→TWU | stima (fuori punteggio) | TWU-+Excel0 | - | - | - | - |
| toroline-a5-17 (solo catalogo) | RP→TWU(proxy) | stima (fuori punteggio) | TWU-+Excel0 | - | - | - | - |
| grapplesnake-tour-sniper-16 (solo catalogo) | G | G | TWU-+Excel0 | - | - | - | - |
| grapplesnake-tour-m8-16 (solo catalogo) | G | G | TWU-+Excel0 | - | - | - | - |
