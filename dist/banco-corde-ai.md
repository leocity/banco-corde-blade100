# Banco Corde Blade 100 — dati per l'AI (2026-11-24)

Dati del Banco Corde per fare domande e simulazioni sugli ibridi (verticali + orizzontali) della Wilson Blade 100 v9 16×19. Rispondi solo con questi dati, cita i numeri e dichiara quando un valore è ricavato (est) o contestato (twf).

**Racchetta:** Wilson Blade 100 v9 16×19. **Giocatore:** di club, tutto campo con rotazioni, swing sotto le 50 lbs, 4–5 ore a settimana.
**Montata:** re-string-slap-17 a [22, 21] kg (dal 2026-10-31).

## Regole
- **fonti:** Misure: TWU (in campo, 51 lb, swing veloce: rigidità lb/in, perdita di tensione %, spin potenziale), Racketpedia (rigidità a riposo kg/mm), Excel Ektelon dell'utente (allungamento e recupero a 50 lb in %, tl6, tl12, scorrimento 24 h). Solo dati di laboratorio; recensioni e forum non entrano in nessun calcolo. Niente prezzi.
- **tipi_di_valore:** Nella scheda: `tw`/`rp`/`ex` sono misure. `est` sono valori dove la misura manca: [valore, tipo, margine]; tipo r = ricavato da altri dati (stesso modello in altro calibro o colore, o misura Racketpedia portata sulla scala TWU), f = ricavato dalla fisica (calibro e materiale per la rigidità, rigidità e forma per lo spin, rigidità per la perdita di tensione: errore medio circa 7 punti). Dillo sempre quando usi un valore ricavato.
- **twu_contestato:** `twf` presente = il TWU di quella corda è contestato dal controllo incrociato (abbinamento o dato): non usarlo, usa `est` (calcolato senza TWU); profile_score è null e la tensione di partenza non è stimabile da TWU.
- **confronti:** Simile sotto: rigidità 10%, perdita di tensione 5 punti, spin 0,5; nettamente sopra 15%, 10 punti, 1,0. Controllo e potenza non sono misure.
- **letto:** Rigidità alla tensione T: k51*(0,5+0,5*T/23,1) (23,1 kg = 51 lb). Letto = peso*verticali + (1-peso)*orizzontali con peso 0.457 (16/35, un filo per filo); nell'ibrido `range_k_now` mostra il risultato con pesi fino a 0.65. Spin: 60% dalle verticali. Dopo il calo di tensione: T*(1-perdita%) per ogni filo; letto più rigido in campo = palla più bassa, più morbido = più alta (ipotesi dichiarata).
- **ibridi:** Verticale rigida almeno quanto l'orizzontale (entro il 10%); un'orizzontale tonda aiuta lo scorrimento. Geometria = ipotesi, non misura (TWU non trova un legame prevedibile forma-attrito). Tenuta: TWU ed Excel non si fondono mai (nei dati non concordano). Tensione: coppia della preferita più vicina (+1 kg alle verticali) corretta per la rigidità equivalente, al massimo ±2 kg; un differenziale oltre 2 kg è una regola pratica.
- **ruolo_ibrido:** hr = [ruolo, confidenza, punteggio -1 cross … +1 main]: da Racketpedia esatta, forma ed Excel (mai TWU, mai nel punteggio). Con solo Excel la confidenza è bassa.
- **scorta:** matassina = 12 m, una racchetta intera; mezza = circa 6 m, metà di un ibrido; due mezze della stessa corda fanno una racchetta intera. Una corda con una sola mezza va solo in un ibrido.
- **prove_tue:** `prove_tue` = schede di campo dell'utente (DT, snapback, intaglio, voti 1-5, ore giocabili): misure e giudizi PERSONALI, fonte separata dal laboratorio. Non si fondono con TWU/Racketpedia/Excel e non entrano in punteggi, stime, ruolo ibrido né tensione. Il calo DT (tua tensione dinamica dopo ore di gioco) non è la perdita TWU (prova di laboratorio): confrontali affiancati, senza convertire. La soglia del 15% di calo è un'ipotesi del piano, non una misura.
- **piano_prove:** `piano_prove` = ordine di prova dell'utente, valutato con i dati del banco: k51 = rigidità a 51 lb, k_now a tensione, k_after dopo il calo; `affidabilita` dice se i numeri sono misurati, ricavati o dalla fisica (solo O-Toro Tour e Lynx Tour hanno TWU misurato). `kg_scarto` = tensione del piano meno quella calcolata. `ore_ipotesi` = durata stimata dal piano, non misura.
- **regole_utente:** `regole_utente` = ipotesi dell'utente sulla tensione (differenziale −1,0 kg con cross tonda ferma, −0,5 kg con cross molto elastica, niente cross tonda sottile sotto una pentagonale). Non sono misure e il calcolo non le usa: citale come ipotesi dell'utente.
- **filtri:** Nel banco solo corde uscite dal 2020 in poi e ancora in produzione; le preferite restano sempre.
- **chiavi:** id, n nome, mm calibro, f forma, mat materiale, tw {k rigidità lb/in, l perdita %, s spin}, rp kg/mm, ex {st50, rc50, tl6, tl12, cr}, est, cc verdetto crosscheck (confirmed/plausible/questionable/contradicted), twf, ps profile_score (solo laboratorio), hr, tk [kg verticali, orizzontali, fonte], fav, dw avviso non gradita, y anno, solo_catalogo = nessuna misura.

## Ancore
Preferite: solinco-confidential-16l, toroline-o-toro-17, re-string-zero-17, re-string-slap-17.
Non gradite: solinco-confidential-soft-16, solinco-confidential-soft-17, solinco-confidential-soft-16l, babolat-rpm-blast-16, babolat-rpm-blast-17, solinco-barb-wire-16.
Tensioni di riferimento: Confidential 22/21 kg; O-Toro 23/22 kg.

## Scorta (corde in casa)
- toroline-wasabi-x-blue-17: 3 × mezza (basta per una racchetta intera)
- toroline-wasabi-green-17: 1 × mezza (solo ibrido)
- grapplesnake-tour-m8-17: 1 × matassina (basta per una racchetta intera)
- solinco-confidential-17: 1 × matassina (basta per una racchetta intera)
- solinco-mach-10-17: 1 × mezza (solo ibrido)
- solinco-hyper-g-round-17: 1 × mezza (solo ibrido)
- toroline-o-toro-17: 3 × mezza (basta per una racchetta intera)
- toroline-o-toro-tour-17: 3 × mezza (basta per una racchetta intera)
- toroline-o-toro-snap-16l: 2 × mezza (basta per una racchetta intera)
- luxilon-eco-power-17: 1 × mezza (solo ibrido)

## Corde (tw k/l/s = rigidità lb/in, perdita %, spin; est = ricavato: valore, r dati | f fisica; hr = ruolo ibrido)
| id | mm | forma | tw k/l/s | rp | est | cc | twf | hr | tk | fav |
|---|---|---|---|---|---|---|---|---|---|---|
| babolat-rpm-blast-16l | 1.25 | OCT |  | 1.18 | k:233.7r s:4.6r l:33.3r | contradicted | abbinamento | main/alta | 23/22 |  |
| babolat-rpm-blast-17 | 1.25 | OCT | 233.7/33.3/4.6 | 1.18 |  | plausible |  | flessibile/media | 21.5/20.5 | disliked |
| head-hawk-power-17 | 1.25 | RND | 203.5/48.3/7.5 | 0.75 |  |  |  | cross/alta | 22.0/21.0 |  |
| head-lynx-tour-16 | 1.3 | HEX | 228.6/30.5/6.1 | 1.15 |  |  |  | main/alta | 21.5/20.5 |  |
| head-hawk-seeding-16 | 1.3 | RND |  |  | k:219.5f s:5.8f l:35.5f |  |  | cross/bassa | 22/21 |  |
| kirschbaum-competition-16l | 1.25 | RND |  |  | k:200.1r s:4.9r l:47.5r |  |  | cross/bassa | 22.5/21.5 |  |
| kirschbaum-pro-line-rough-16l | 1.25 | RND |  |  | k:206.3f s:6.1f l:38.3f |  |  | flessibile/bassa | 22/21 |  |
| kirschbaum-helix-white-17 | 1.25 | TWST | 208.6/44.2/5.4 | 0.88 |  |  |  | flessibile/alta | 22.0/21.0 |  |
| kirschbaum-helix-blue-17 | 1.25 | TWST |  | 0.9 | l:44.2r |  |  | flessibile/media | 22.0/21.0 |  |
| kirschbaum-flash-orange-17 | 1.25 | RND |  | 0.9 | k:182.4r s:6.6f l:36.7r |  |  | flessibile/alta | 22.5/21.5 |  |
| kirschbaum-flash-pink-17 | 1.25 | RND |  | 0.8 | k:182.4r s:6.6f l:36.7r |  |  | cross/alta | 22.5/21.5 |  |
| kirschbaum-flash-yellow-17 | 1.25 | RND |  |  | k:182.4r s:6.6f l:36.7r rp:0.9r |  |  | cross/bassa | 22.5/21.5 |  |
| kirschbaum-flash-green-17 | 1.25 | RND |  | 0.85 | k:182.4r s:6.6f l:36.7r |  |  | cross/alta | 22.5/21.5 |  |
| kirschbaum-flash-black-17 | 1.25 | RND |  |  | k:182.4r s:6.6f l:36.7r rp:0.9r |  |  | flessibile/bassa | 22.5/21.5 |  |
| luxilon-element-soft-ir-17 | 1.2 | RND |  |  | k:183.5r s:7.0r l:43.7r |  |  | cross/bassa | 22.5/21.5 |  |
| re-string-slap-17 | 1.23 | HEX |  | 0.75 | k:193.7r s:7.8f l:41.0f | plausible |  | cross/alta | 22.5/21.5 | liked |
| re-string-sync-17 | 1.25 | RND |  | 0.95 | k:204.6r s:6.1f l:38.7f | questionable |  | flessibile/alta | 22.0/21.0 |  |
| re-string-vivo-17 | 1.23 | HEX |  | 1.05 | k:210.0r s:7.5f l:37.6f | questionable |  | flessibile/alta | 22.0/21.0 |  |
| re-string-zero-16 | 1.28 | HEX |  | 1.1 | k:212.7r s:7.4f l:37.0f | questionable |  | main/alta | 22.0/21.0 |  |
| re-string-zero-17 | 1.23 | HEX |  | 1.05 | k:210.0r s:7.5f l:37.6f | questionable |  | flessibile/alta | 22.0/21.0 | liked |
| signum-pro-x-perience-17 | 1.24 | RND | 224.6/25.2/6.2 |  | rp:1.07r |  |  | cross/bassa | 21.5/20.5 |  |
| signum-pro-polaris-17 | 1.2 | RND |  |  | k:193.1f s:6.4f l:41.1f |  |  | cross/bassa | 23/22 |  |
| solinco-hyper-g-soft-17 | 1.2 | SQ |  | 1.0 | k:161.8r s:5.2r l:28.7r |  |  | main/alta | 23.0/22.0 |  |
| solinco-hyper-g-soft-16 | 1.3 | SQ |  |  | k:182.2r s:5.2r l:28.7r |  |  | main/bassa | 22.5/21.5 |  |
| solinco-confidential-16 | 1.3 | SQ | 222.3/22.2/6.4 | 1.15 |  |  |  | main/alta | 22.0/21.0 |  |
| solinco-confidential-16l | 1.25 | SQ |  | 1 | k:212.1r s:6.4r l:22.2r | questionable |  | main/alta | 22.0/21.0 | liked |
| solinco-confidential-17 | 1.2 | SQ |  | 1 | k:202.0r s:6.4r l:22.2r | questionable |  | flessibile/media | 22.0/21.0 |  |
| tecnifibre-razor-17 | 1.25 | RND |  |  | l:29.6r rp:1.28r |  |  | flessibile/bassa | 21.5/20.5 |  |
| toroline-absolute-17l | 1.2 | HEX | 180.6/47.1/9.3 |  |  | plausible |  | cross/bassa | 22.5/21.5 |  |
| toroline-caviar-17l | 1.23 | HEX |  | 1 | k:207.3r s:7.5f l:38.1f |  |  | main/alta | 22.0/21.0 |  |
| toroline-caviar-17 | 1.23 | HEX |  | 1 | k:207.3r s:7.5f l:38.1f | plausible |  | flessibile/alta | 22.0/21.0 |  |
| toroline-enso-pro-16 | 1.3 | RND |  |  | k:201.8r s:6.2f rp:0.9r l:39.3f |  |  | cross/bassa | 22.0/21.0 |  |
| toroline-enso-pro-neon-yl-16l | 1.25 | RND |  |  | k:201.8r s:6.2f rp:0.9r l:39.3f |  |  | cross/bassa | 22.0/21.0 |  |
| toroline-enso-pro-neon-pk-17 | 1.23 | RND |  | 0.8 | k:196.4r s:6.3f l:40.4f |  |  | cross/alta | 22.5/21.5 |  |
| toroline-wasabi-green-17 | 1.23 | SQ |  | 0.95 | k:204.6r s:6.1f l:38.7f | plausible |  | main/alta | 22.0/21.0 |  |
| toroline-wasabi-x-blue-17 | 1.23 | RND |  |  | k:201.0f s:6.2f l:39.5f |  |  | cross/bassa | 22/21 |  |
| toroline-wasabi-pom-17 | 1.23 | SQ |  | 1.0 | k:207.3r s:6.1f l:38.1f |  |  | main/alta | 22.0/21.0 |  |
| toroline-super-toro-17l | 1.23 | HEX | 189.7/34.7/7.8 | 0.9 |  | questionable |  | flessibile/alta | 22.5/21.5 |  |
| toroline-o-toro-17 | 1.23 | HEX | 165.7/44.4/9.4 | 0.95 |  | confirmed |  | flessibile/alta | 23.0/22.0 | liked |
| toroline-toro-toro-orange-17 | 1.23 | HEX |  |  | k:204.6r s:7.6f rp:0.95r l:38.7f |  |  | flessibile/bassa | 22.0/21.0 |  |
| toroline-toro-toro-pink-17 | 1.23 | HEX |  | 0.95 | k:204.6r s:7.6f l:38.7f |  |  | flessibile/alta | 22.0/21.0 |  |
| toroline-toro-toro-matcha-16l | 1.25 | HEX |  |  | k:204.6r s:7.6f rp:0.95r l:38.7f |  |  | flessibile/bassa | 22.0/21.0 |  |
| yonex-poly-tour-rev-16l | 1.25 | HEX | 193.2/34.4/7.2 | 0.85 |  |  |  | flessibile/media | 22.5/21.5 |  |
| yonex-poly-tour-spin-17 | 1.2 | HEX |  |  | k:203.5r s:6.3r l:27.2r rp:1.08r |  |  | main/bassa | 22.0/21.0 |  |
| toroline-o-toro-snap-16l | 1.25 | RND | 164.6/41.7/8.7 |  | k:206.3f s:6.1f l:38.3f | contradicted | contestata |  | 22/21 |  |
| tecnifibre-razor-spin-17 | 1.25 |  | 222.3/26.5/8.6 |  |  |  |  |  | 22.0/21.0 |  |
| toroline-o-toro-spin-17 | 1.23 |  | 173.2/38.3/8.2 |  |  | confirmed |  |  | 23.0/22.0 |  |
| grapplesnake-tour-m8-17 | 1.25 | OCT | 210.3/34.3/8.2 |  |  | questionable |  |  | 22.0/21.0 |  |
| toroline-o-toro-tour-17 | 1.23 | HEX | 216.6/25.0/7.7 | 1.1 |  | confirmed |  | main/media | 22.0/21.0 |  |
| toroline-cash-16l | 1.25 | RND | 182.9/34.8/7.6 |  |  | questionable |  |  | 22.5/21.5 |  |
| tecnifibre-razor-soft-17 | 1.25 | RND | 212.0/33.3/7.4 | 1.15 |  |  |  | flessibile/media | 22.0/21.0 |  |
| signum-pro-plasma-hextreme-16 | 1.3 | RND | 225.7/24.8/7.3 | 1.1 |  |  |  | flessibile/media | 21.5/20.5 |  |
| solinco-hyper-g-round-16 | 1.3 | RND | 226.3/32.3/7.3 |  |  | plausible |  |  | 21.5/20.5 |  |
| toroline-snapper-17 | 1.23 | OCT | 190.9/35.9/7.3 | 0.85 |  |  |  | cross/media | 22.5/21.5 |  |
| head-lynx-tour-17 | 1.25 | HEX | 217.7/24.6/7.1 | 1.05 |  |  |  | flessibile/media | 22.0/21.0 |  |
| luxilon-element-soft-ir-16l | 1.27 |  | 197.7/43.7/7.0 |  |  |  |  |  | 22.5/21.5 |  |
| luxilon-alu-power-soft-16l | 1.25 | RND | 197.7/36.6/6.9 | 0.73 |  |  |  | cross/media | 22.5/21.5 |  |
| grapplesnake-alpha-17 | 1.25 | PENT | 218.3/29.4/6.7 | 0.9 | k:201.8r s:6.2f l:39.3f | contradicted | contestata | flessibile/media | 22.0/21.0 |  |
| solinco-confidential-soft-16l | 1.25 | SQ | 194.3/27.7/6.5 | 0.85 |  | plausible |  | flessibile/media | 22.5/21.5 | disliked |
| yonex-poly-tour-spin-16l | 1.25 | RND | 213.7/27.2/6.3 | 1.08 |  |  |  | flessibile/media | 22.0/21.0 |  |
| kirschbaum-max-power-rough-16 | 1.3 | RND | 230.9/28.3/6.0 |  | rp:1.03r |  |  |  | 21.5/20.5 |  |
| solinco-mach-10-16 | 1.3 |  | 222.3/26.3/6.0 |  |  | plausible |  |  | 22.0/21.0 |  |
| signum-pro-plasma-hextreme-16l | 1.25 | RND | 204.6/41.5/5.9 | 1.1 |  |  |  | flessibile/media | 22.0/21.0 |  |
| grapplesnake-tour-sniper-16l | 1.25 | PENT | 206.3/32.0/5.8 |  |  | questionable |  |  | 22.0/21.0 |  |
| kirschbaum-super-smash-17 | 1.25 | RND | 210.9/48.0/5.7 |  | rp:0.97r |  |  |  | 22.0/21.0 |  |
| signum-pro-poly-plasma-pure-16l | 1.25 |  | 221.2/40.6/5.6 |  |  |  |  |  | 22.0/21.0 |  |
| kirschbaum-max-power-rough-17 | 1.25 | RND | 223.5/26.4/5.6 | 1.03 |  |  |  | flessibile/media | 22.0/21.0 |  |
| solinco-barb-wire-16l | 1.25 | RND | 182.9/33.5/5.6 | 0.9 |  |  |  | cross/media | 22.5/21.5 |  |
| kirschbaum-helix-16 | 1.3 |  | 204.6/55.3/5.4 |  | rp:0.88r |  |  |  | 22.0/21.0 |  |
| kirschbaum-super-smash-16 | 1.3 | RND | 221.7/50.7/5.3 |  | rp:0.97r |  |  |  | 22.0/21.0 |  |
| signum-pro-poly-plasma-pure-17 | 1.23 |  | 199.5/43.0/5.2 |  |  |  |  |  | 22.5/21.5 |  |
| solinco-hyper-g-soft-16l | 1.25 |  | 172.0/28.7/5.2 | 1.1 |  |  |  |  | 23.0/22.0 |  |
| signum-pro-tornado-16 | 1.3 | RND | 215.5/47.7/5.1 |  | rp:0.72r |  |  |  | 22.0/21.0 |  |
| luxilon-alu-power-vibe-16 | 1.25 |  | 208.0/34.3/5.0 |  |  |  |  |  | 22.0/21.0 |  |
| kirschbaum-competition-16 | 1.3 |  | 210.3/47.5/4.9 |  |  |  |  |  | 22.0/21.0 |  |
| solinco-barb-wire-17 | 1.2 | RND | 186.3/42.6/4.9 | 0.75 |  |  |  | cross/media | 22.5/21.5 |  |
| signum-pro-poly-megaforce-17 | 1.19 |  | 213.2/36.3/4.8 |  |  |  |  |  | 22.0/21.0 |  |
| signum-pro-tornado-17 | 1.23 | RND | 214.3/44.3/4.8 | 0.72 |  |  |  | cross/media | 22.0/21.0 |  |
| signum-pro-hyperion-16 | 1.3 | RND | 220.0/40.9/4.6 |  | rp:0.8r |  |  |  | 22.0/21.0 |  |
| babolat-rpm-blast-16 | 1.3 | OCT | 232.6/45.9/4.5 | 1.25 |  | plausible |  | main/media | 21.5/20.5 | disliked |
| kirschbaum-competition-17 | 1.25 |  | 210.3/47.5/4.5 |  |  |  |  |  | 22.0/21.0 |  |
| solinco-barb-wire-16 | 1.3 | RND | 214.3/40.2/4.4 | 1.05 |  |  |  | flessibile/media | 22.0/21.0 | disliked |
| signum-pro-poly-megaforce-16 | 1.3 |  | 234.9/34.9/4.3 |  |  |  |  |  | 21.5/20.5 |  |
| signum-pro-poly-speed-spin-16 | 1.28 |  | 246.3/40.9/4.3 |  |  |  |  |  | 21.5/20.5 |  |
| signum-pro-hyperion-17 | 1.24 | RND | 202.3/42.6/4.2 | 0.8 |  |  |  | cross/media | 22.0/21.0 |  |
| kirschbaum-competition-17l | 1.2 |  | 190.3/45.0/4.1 |  |  |  |  |  | 22.5/21.5 |  |
| signum-pro-poly-plasma-pure-17l | 1.18 |  | 196.0/44.3/ |  | s:5.2r |  |  |  | 22.5/21.5 |  |
| yonex-poly-tour-rev-16 | 1.3 | RND | 208.6/33.3/ | 0.8 | s:7.2r |  |  | cross/media | 22.0/21.0 |  |
| kirschbaum-flash-16 | 1.3 | RND | 192.6/36.7/ |  | s:6.4f rp:0.9r |  |  |  | 22.5/21.5 |  |
| solinco-confidential-18 | 1.15 | PENT |  | 0.85 | k:191.8r s:6.4r l:22.2r |  |  | flessibile/media | 22.5/21.5 |  |
| solinco-mach-10-18 | 1.15 | PENT |  | 0.7 | k:191.8r s:6.0r l:26.3r |  |  | cross/media | 22.5/21.5 |  |
| solinco-hyper-g-round-18 | 1.15 | RND |  | 0.8 | k:195.8r s:7.3r l:32.3r |  |  | cross/media | 22.5/21.5 |  |
| solinco-hyper-g-soft-18 | 1.15 | PENT |  |  | k:151.7r s:5.2r l:28.7r |  |  |  | 23.5/22.5 |  |
| toroline-o-toro-tour-1-20 | 1.2 | HEX |  |  | k:210.5r s:7.7r l:25.0r |  |  |  | 22.0/21.0 |  |
| toroline-o-toro-tour-18 | 1.15 | HEX |  |  | k:200.3r s:7.7r l:25.0r |  |  |  | 22.5/21.5 |  |
| toroline-o-toro-octa-16l | 1.25 | OCT |  |  | k:206.3f s:6.1f l:38.3f |  |  |  | 22/21 |  |
| toroline-o-toro-snap-tour-flex-16l | 1.25 | RND |  |  | k:206.3f s:6.1f l:38.3f |  |  |  | 22/21 |  |
| toroline-o-toro-max-17 | 1.23 | HEX |  |  | k:201.0f s:7.7f l:39.5f |  |  |  | 22/21 |  |
| toroline-truffle-x-16 | 1.3 | RND |  | 0.2 | k:163.7r s:7.0f l:47.4f |  |  | cross/media | 23.0/22.0 |  |
| toroline-a5-16l | 1.25 | RND |  | 0.9 | k:201.8r s:6.2f l:39.3f |  |  | cross/media | 22.0/21.0 |  |
| toroline-a5-infrared-17 | 1.2 | RND |  |  | k:193.1f s:6.4f l:41.1f |  |  |  | 22/21 |  |
| toroline-a5-spin-17 | 1.23 | PENT |  |  | k:201.0f s:6.2f l:39.5f |  |  |  | 22/21 |  |
| toroline-vamos-17 | 1.23 | HEX |  |  | k:201.0f s:7.7f l:39.5f |  |  |  | 22/21 |  |
| toroline-enso-pro-16l | 1.27 | RND |  |  | k:201.8r s:6.2f rp:0.9r l:39.3f |  |  |  | 22.0/21.0 |  |
| toroline-toro-toro-16l | 1.27 | HEX |  |  | k:204.6r s:7.6f rp:0.95r l:38.7f |  |  |  | 22.0/21.0 |  |
| toroline-caviar-1-20 | 1.2 | HEX |  |  | k:207.3r s:7.5f rp:1.0r l:38.1f |  |  |  | 22.0/21.0 |  |
| toroline-caviar-18 | 1.16 | HEX |  |  | k:207.3r s:7.5f rp:1.0r l:38.1f |  |  |  | 22.0/21.0 |  |
| luxilon-eco-power-17 | 1.25 | HEX | 194.9/34.5/8.3 | 1.05 |  |  |  | flessibile/media | 22.5/21.5 |  |
| solinco-hyper-g-round-16l | 1.25 | RND |  | 1.0 | k:216.1r s:7.3r l:32.3r |  |  | flessibile/media | 22.0/21.0 |  |
| solinco-hyper-g-round-17 | 1.2 | RND |  | 0.95 | k:206.0r s:7.3r l:32.3r |  |  | cross/media | 22.0/21.0 |  |
| solinco-mach-10-16l | 1.25 | PENT |  | 0.75 | k:212.1r s:6.0r l:26.3r |  |  | flessibile/media | 22.0/21.0 |  |
| solinco-mach-10-17 | 1.2 | PENT |  |  | k:202.0r s:6.0r l:26.3r |  |  |  | 22.0/21.0 |  |
| solinco-confidential-soft-16 | 1.3 | SQ |  | 0.9 | k:204.5r s:6.5r l:27.7r |  |  | main/media | 22.0/21.0 | disliked |
| solinco-confidential-soft-17 | 1.2 | SQ |  | 0.85 | k:184.1r s:6.5r l:27.7r |  |  | flessibile/media | 22.5/21.5 | disliked |
| re-string-vivo-16 | 1.28 | HEX |  | 1.05 | k:210.0r s:7.5f l:37.6f |  |  | flessibile/media | 22.0/21.0 |  |
| re-string-sync-16 | 1.3 | RND |  |  | k:204.6r s:6.1f rp:0.95r l:38.7f |  |  |  | 22.0/21.0 |  |
| re-string-sync-18 | 1.2 | RND |  | 0.85 | k:199.1r s:6.2f l:39.9f |  |  | cross/media | 22.5/21.5 |  |
| re-string-slap-16 | 1.28 | HEX |  | 0.85 | k:199.1r s:7.7f l:39.9f |  |  | cross/media | 22.5/21.5 |  |
| grapplesnake-tour-sniper-16 | 1.3 | PENT |  |  | k:216.5r s:5.8r l:32.0r |  |  |  | 22.0/21.0 |  |
| grapplesnake-tour-m8-16 | 1.3 | OCT |  |  | k:220.5r s:8.2r l:34.3r |  |  |  | 22.0/21.0 |  |

## Ibridi valutati
- **esempio-tour-otoro** toroline-o-toro-tour-17 + toroline-o-toro-17 a [23, 22] kg (da_provare): rigidità k51 189.0, appena montata 186.6 (intervallo [186.6, 197.1]), dopo il calo 155.3, Δ 50.9, affidabilità misurata; spin 8.4, geometria uniforme, tenuta sbilanciata (secondo TWU cede prima l'orizzontale (19 punti di perdita in più)); tensione consigliata [22.5, 21.5]. Spin: più spin (con valori ricavati) Tenuta della tensione: tiene di più (con valori ricavati)
- **esempio-confidential-otoro** solinco-confidential-17 + toroline-o-toro-17 a [23, 22] kg (da_provare): rigidità k51 182.3, appena montata 180.0 (intervallo [180.0, 187.6]), dopo il calo 150.7, Δ 36.3, affidabilità ricavata; spin 7.6, geometria classica, tenuta sbilanciata (secondo TWU cede prima l'orizzontale (22 punti di perdita in più)); tensione consigliata [22.5, 21.5]. Tenuta della tensione: tiene di più (con valori ricavati)

## Piano di prove (valutato con i dati del banco; ore = ipotesi del piano)
| prio | prova | verticali / orizzontali | kg piano | kg calcolati | k51 | k a tensione | dopo il calo | spin | perdita % | dati | ore |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | full-o-toro-tour | toroline-o-toro-tour-17 / toroline-o-toro-tour-17 | 22.0/21.0 | 22.0/21.0 | 216.6 | 208.9 | 183.7 | 7.7 | 25.0 | misurata | 12-16 |
| 2 | full-lynx-tour | head-lynx-tour-17 / head-lynx-tour-17 | 21.5/20.5 | 22.0/21.0 | 217.7 | 207.6 | 183.3 | 7.1 | 24.6 | misurata | 14-18 |
| 3 | full-octa | toroline-o-toro-octa-16l / toroline-o-toro-octa-16l | 22.0/21.0 | 22.0/21.0 | 206.3 | 199.0 | 162.3 | 6.1 | 38.3 | dalla fisica | 12-15 |
| 4 | full-a5-carbon | toroline-a5-16l / toroline-a5-16l | 21.5/20.5 | 22.0/21.0 | 201.8 | 192.4 | 156.5 | 6.2 | 39.3 | ricavata | 14-16 |
| 5 | full-caviar | toroline-caviar-17l / toroline-caviar-17l | 22.0/21.0 | 22.0/21.0 | 207.3 | 199.9 | 163.2 | 7.5 | 38.1 | ricavata | 12-15 |
| 6 | ib-heavy-balls | toroline-o-toro-octa-16l / toroline-o-toro-snap-16l | 22.0/21.0 | 22.0/21.0 | 206.3 | 199.0 | 162.3 | 6.1 | 38.3 | dalla fisica | 12-14 |
| 7 | ib-ontour | toroline-o-toro-tour-1-20 / toroline-a5-16l | 22.0/21.0 | 22.0/21.0 | 205.8 | 198.5 | 167.5 | 7.1 | 32.8 | ricavata | 11-14 |
| 8 | ib-dreddy | toroline-o-toro-tour-17 / toroline-o-toro-snap-16l | 22.0/21.0 | 22.0/21.0 | 211.0 | 203.6 | 172.3 | 7.1 | 32.2 | dalla fisica | 12-15 |
| 8 | ib-lynx-snap | head-lynx-tour-17 / toroline-o-toro-snap-16l | 21.5/20.5 | 22.0/21.0 | 211.5 | 201.8 | 171.3 | 6.7 | 32.0 | dalla fisica | 12-15 |
| 9 | ib-frizione | toroline-a5-spin-17 / toroline-caviar-17l | 22.0/21.0 | 22.0/21.0 | 204.4 | 197.1 | 160.3 | 6.7 | 38.7 | dalla fisica | 8-10 |
| 10 | ib-k-pipo | toroline-wasabi-green-17 / toroline-caviar-17l | 22.0/21.0 | 22.0/21.0 | 206.1 | 198.7 | 162.0 | 6.7 | 38.4 | ricavata | 9-11 |
| 11 | full-a5-spin | toroline-a5-spin-17 / toroline-a5-spin-17 | 22.5/21.5 | 22.0/21.0 | 201.0 | 196.0 | 158.3 | 6.2 | 39.5 | dalla fisica | 6-8 |
| 11 | ib-fire-ice | toroline-a5-spin-17 / toroline-wasabi-x-blue-17 | 22.5/22.0 | 22.0/21.0 | 201.0 | 197.2 | 159.0 | 6.2 | 39.5 | dalla fisica | 6-8 |
| 12 | full-a5-infrared-round | toroline-a5-infrared-17 / toroline-a5-infrared-17 | 23.0/22.0 | 22.5/21.5 | 193.1 | 190.4 | 151.8 | 6.4 | 41.1 | dalla fisica | 6-8 |
Mezze in arrivo 22, usate 22, avanzate 0; da procurarsi: {'head-lynx-tour-17': {'mezze': 3, 'matassine': 2}}; mancanze: nessuna.

## In arrivo (ordine, non scorta)
toroline-a5-16l ×3, toroline-a5-infrared-17 ×2, toroline-a5-spin-17 ×4, toroline-caviar-17l ×4, toroline-o-toro-octa-16l ×3, toroline-o-toro-snap-16l ×3, toroline-o-toro-tour-1-20 ×1, toroline-wasabi-green-17 ×1, toroline-wasabi-x-blue-17 ×1

## Ipotesi dell'utente sulla tensione (non misure)
- Cross tonda e ferma (A5 Carbon 1,25, O-Toro Snap 1,25): differenziale verticali/orizzontali −1,0 kg (esempio 22/21).
- Cross molto elastica (Wasabi X 1,23: allungamento 4,44% a 50 lb e recupero 6,67% a 65 lb nell'Excel Ektelon): differenziale −0,5 kg per evitare l'effetto fionda.
- Evitare una cross tonda sottile e morbida (A5 Infrared 1,20) sotto una verticale pentagonale 1,23 (A5 Spin) su un 16×19 aperto: intaglio precoce e parabola alta. Meglio cross tonde da 1,24–1,25 mm.

## Prove di campo dell'utente (separate dal laboratorio)
- re-string-slap-17-fb: disliked; kg [22.0, 21.0]; calo 24h None, ultimo None a None h; voti n.d.; snapback 8h None; intaglio 8h None; ore giocabili None; dichiarata dall'utente il 24/11/2026: troppo morbida e launchy dopo il calo iniziale. Nessuna misura DT registrata.

## Ibridi suggeriti dalla scorta
- **simile alla montata:** solinco-confidential-17 + toroline-o-toro-17 [22, 21] kg (Tenuta della tensione: tiene di più (con valori ricavati)); luxilon-eco-power-17 + solinco-hyper-g-round-17 [22, 21] kg (Tenuta della tensione: tiene di più (con valori ricavati)); solinco-hyper-g-round-17 + toroline-o-toro-17 [22, 21] kg ()
- **più morbida:** nessuna coppia
- **più rigida:** grapplesnake-tour-m8-17 + toroline-o-toro-tour-17 [22, 21] kg (Appena montata: più rigida (con valori ricavati); Dopo il calo di tensione: resta più rigida (con valori ricavati); Lancio della palla: più bassa (con valori ricavati); Tenuta della tensione: tiene di più (con valori ricavati))
- **palla più bassa:** toroline-o-toro-tour-17 + toroline-o-toro-snap-16l [22, 21] kg (Dopo il calo di tensione: resta più rigida (con valori ricavati); Lancio della palla: più bassa (con valori ricavati); Spin: meno spin (con valori ricavati); Tenuta della tensione: tiene di più (con valori ricavati)); grapplesnake-tour-m8-17 + solinco-confidential-17 [22, 21] kg (Dopo il calo di tensione: resta più rigida (con valori ricavati); Lancio della palla: più bassa (con valori ricavati); Tenuta della tensione: tiene di più (con valori ricavati)); toroline-o-toro-tour-17 + toroline-wasabi-green-17 [22, 21] kg (Dopo il calo di tensione: resta più rigida (con valori ricavati); Lancio della palla: più bassa (con valori ricavati); Spin: meno spin (con valori ricavati); Tenuta della tensione: tiene di più (con valori ricavati))
- **tiene di più la tensione:** solinco-mach-10-17 + solinco-confidential-17 [22, 21] kg (Dopo il calo di tensione: resta più rigida (con valori ricavati); Lancio della palla: più bassa (con valori ricavati); Spin: meno spin (con valori ricavati); Tenuta della tensione: tiene di più (con valori ricavati)); toroline-o-toro-tour-17 + solinco-confidential-17 [22, 21] kg (Dopo il calo di tensione: resta più rigida (con valori ricavati); Lancio della palla: più bassa (con valori ricavati); Spin: meno spin (con valori ricavati); Tenuta della tensione: tiene di più (con valori ricavati)); luxilon-eco-power-17 + solinco-confidential-17 [22, 21] kg (Dopo il calo di tensione: resta più rigida (con valori ricavati); Lancio della palla: più bassa (con valori ricavati); Tenuta della tensione: tiene di più (con valori ricavati))
- **più spin:** grapplesnake-tour-m8-17 + toroline-o-toro-17 [22, 21] kg (Spin: più spin (con valori ricavati)); luxilon-eco-power-17 + toroline-o-toro-17 [22, 21] kg (Spin: più spin (con valori ricavati)); toroline-o-toro-tour-17 + toroline-o-toro-17 [22, 21] kg (Spin: più spin (con valori ricavati); Tenuta della tensione: tiene di più (con valori ricavati))
