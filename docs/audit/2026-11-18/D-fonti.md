# D - Fonti (consultate il 2026-11-18)

Sola lettura sul repo. Scaricato solo `dl/twu/twu_now.html` (dato non fidato, mai eseguito). Tutte le date "consultato" = 2026-11-18. Le date dei video sono ricavate dall'età relativa mostrata da YouTube (≈, ±1 mese).

## 1. TWU String Performance Database

- Pagina scaricata ora: https://twu.tennis-warehouse.com/learning_center/reporter2.php (HTTP 200, 168 KB, consultata 2026-11-18).
- `pipeline/twu_extract.py` FUNZIONA ancora: ho eseguito `parse_twu` + `in_scope` del repo sulla pagina attuale: 483 righe totali, 130 in ambito. Confronto con `data/raw/twu.json` (snapshot 2026-10-28): 0 aggiunte, 0 rimosse, 0 valori cambiati (rigidità, perdita %, spin).
- Quindi nessuna corda nuova né misura aggiornata dal 28/10. Nessuna novità 2025-26 per Toroline/Solinco oltre quanto già nello snapshot.
- **Re-String (Slap, Zero, Vivo, Sync) NON è nel database TWU** (nessuna riga con "Re-String/Restring/Slap/Zero" nella pagina). Per Slap e Zero non esiste misura TWU: vanno trattate come "senza dato di laboratorio TWU" (solo Racketpedia / altre fonti, vedi §2-3).
- Valori attuali (rigidità lb/in, perdita tensione %, spin potential), identici allo snapshot:
  - Toroline O-Toro 17 (1.23): 165,7 / 44,4 / 9,4. O-Toro Snap 16L (1.25): 164,6 / 41,7 / 8,7. O-Toro Spin 17 (1.23): 173,2 / 38,3 / 8,2. O-Toro Tour 17 (1.23): 216,6 / 25,0 / 7,7. Super Toro 17: 189,7 / 34,7 / 7,8. Snapper 17: 190,9 / 35,9 / 7,3. Absolute 17 (1.20): 180,6 / 47,1 / 9,3. Cash 16L: 182,9 / 34,8 / 7,6. Caviar e A5: non presenti in TWU.
  - Solinco Confidential 16 (1.30): 222,3 / 22,2 / 6,4. Confidential Soft 16L: 194,3 / 27,7 / 6,5. Hyper-G 16: 219,5 / 26,3 / 7,0; Hyper-G 16L: 218,3 / 24,7 / 6,1; Hyper-G 17: 194,9 / 25,7 / 6,1. Barb Wire 16L: 182,9 / 33,5 / 5,6. **Confidential 16L (1.25) non è in TWU** (solo 16/1.30): il repo deve stimare il calibro, già coperto da `estimate.py`. Hyper-Con: assente. RPM Blast Rough 17: 196,0 / 35,7 / 9,9.
- ATTENZIONE licenza: i Termini TWU/Tennis Warehouse vietano "data mining, robots, crawling, data gathering and extraction tools" e la riproduzione di contenuti senza consenso scritto (https://www.tennis-warehouse.com/termsofuse.html, 2026-11-18; testo letto fino a 100.000 caratteri). `robots.txt` su twu.tennis-warehouse.com dà 404 (nessuna indicazione). Il refresh scarica automaticamente e ripubblica i valori: rischio da decidere (chiedere permesso scritto a TWU, o citare i valori con link e mostrare solo il dato, ecc.). Non è un parere legale.
- Nota: la pagina "stiffness" TWU dice che la rigidità è misurata a 52 lb (https://twu.tennis-warehouse.com/learning_center/stringstiffness.php); il codice parla di "51 lbs, swing Fast" (`ref_tension_lbs`=51). Verificare quale vale e mostrarlo nella provenienza.

## 2. Racketpedia (gratuito)

- Pagina elenco https://www.racketpedia.com/en-GB/tennis-strings (2026-11-18): nessuna etichetta "nuova"; non cita Slap né Toroline nelle liste in evidenza (solo Solinco Confidential Soft 125/130 nei "più visti 9-15 nov"). Il sito è dinamico: l'elenco completo non si vede da questa pagina.
- Il repo (`data/raw/racketpedia.json`, 326 righe, scaricato 28/10) contiene già: ReString Slap Black 1,23 (0,75 kg/mm, esagonale) e 1,28 (0,85); Zero Sky Blue 1,23 (1,05) e 1,28 (1,10); Vivo, Sync; Toroline O-Toro 1,23 (0,95), O-Toro Tour 1,23 (1,10), Super Toro, Snapper, Caviar 1,24, A5 1,25 (0,90), Wasabi, Enso Pro, Ether, Truffle X. Racketpedia dà solo kg/mm (valore di "rigidità" del sito, non lb/in) e forma: non ho potuto verificare nuove righe senza un refresh vero. Una pagina scheda che ho provato a indovinare (URL Slap) dà 404: gli URL vanno presi dall'elenco.
- Termini del sito non letti (pagina dinamica, vuota al fetch). `robots.txt` (https://www.racketpedia.com/robots.txt) vieta solo login, termini, confronta e i template `{id}`: lo scarico dell'elenco non è vietato, ma serve leggere i Termini a mano prima di ripubblicare.

## 3. Altre fonti di laboratorio GRATUITE

| Fonte | Cosa misura | Licenza/uso | Giudizio |
|---|---|---|---|
| TWU Learning Center (Lindsey, con Cross in alcuni studi), https://twu.tennis-warehouse.com/learning_center/deadstrings.php | colpi ripetuti, perdita di tensione, rigidità, tempo di contatto | testo gratuito, copyright TW; niente riuso dati scritto | affidabile, ma di un rivenditore: usare come dato, con attribuzione |
| Racketpedia (rigidità kg/mm) | misura dichiarata dal sito, metodo non documentato nella pagina elenco | gratuito, termini da verificare | usabile come secondo parere, mai per la stessa grandezza di TWU |
| USRSA via TruPro, https://truproofficial.com/tru-pro-tennis-string-lab-testing-results-usrsa (nel repo `usrsa_trupro.json`, 2026-10-09) | 62 lb, 200 s, impatti; perdita lb e rigidità | pubblicata da un produttore, solo corde TRU PRO | già usata come controllo del calibro; non copre le corde dell'utente |
| ITF Technical, https://m.itftennis.com/media/2283/rackets-and-strings-research.pdf (e .../2175/rackets-and-strings-strings.pdf) | rig MYO con Sheffield: spin su corde diverse; nota che conta la rigidità del piatto corde, non la tensione | PDF pubblici, nessun database per modello | buona base teorica, nessun dato per marca |
| Kawazoe et al. 2012, J-STAGE (accesso libero) https://www.jstage.jst.go.jp/article/jsdd/6/2/6_2_213/_article/-char/en | video ultra-veloce: spin, tempo di contatto | open access | solido, vedi §6 |
| Stringforum.net | reindirizza al forum tedesco saitenforum.de (https://www.stringforum.net/): non ho trovato un database di test di laboratorio | utenti | SCARTATA come punteggio: dati di utenti, metodo non dimostrato, nessun test indicizzato |
| Forum, Reddit, siti di recensioni, valutazioni dei rivenditori | opinioni | - | SCARTATE per i punteggi (regola fissa); solo link con frase+data |
| Cross, Lindsey, Andruczyk 2000, "Laboratory testing of tennis strings", Sports Eng. 3:219 | citato altrove, non verificato | accesso non verificato | da verificare prima di usarlo |

Integrazione: i punteggi restano su TWU (tre grandezze) + eventuale controllo USRSA; ITF e studi servono a spiegare, non a dare numeri per modello.

## 4. YouTube e recensioni indipendenti

**Metodo.** Ho letto i feed RSS pubblici di 17 canali (ultimi 15 video, con descrizione): cerca di codici sconto, link affiliati, sponsor, regali. Le pagine dei singoli video sono bloccate da captcha di Google dal server, quindi le date dei video sono approssimate e le descrizioni dei video più vecchi non sono verificate. Il fatto che i feed non mostrino codici NON prova l'indipendenza.

**Classificazione dei canali (solo dai feed, 2026-11-18)**

| Canale | Evidenza | Classe |
|---|---|---|
| TK Tennis (UCOALtFUP8ZKqYt9E4_o7L0g) | descrizione: "avoid affiliate programs", rifiuta sponsor in video salvo prodotti che usa davvero; si finanzia con donazioni; nessun codice nei 15 video recenti | **indipendente** (dichiarato, verificare il tipo di corde ricevute) |
| Sweet Spot (UCVv6LfqroAevyl7nbWN_UBQ) | scrive "(Not sponsored)" nei video; un link a un prodotto Grapplesnake in un video | indipendente con riserva |
| TennisTroll (UCPMTuuIioSG4_R1WVVxsVfA), HOMECOURT (UC5kJKicXzPV0y_t_0xwmyYA), Brody Taylor (UC05c1oLWlEIIi9EPQowBmkw), Rackets & Runners | nessun codice/link nel feed; nessuna dichiarazione | **non verificabile** (Rackets & Runners è un negozio: commerciale) |
| Trash Bin Tennis (UCV2GcjyKcFd0-QB36Y1yqDw) | ringrazia un negozio che ha fornito il prodotto, "affiliated links" | con affiliazioni dichiarate |
| Tennisnerd (UCLjfPt84uuBIWEmJ-ocw-OQ) | codici 10% su Toroline, TW Europe (TNERD10), Nordic Dots | con affiliazioni dichiarate (sponsor di Toroline!) |
| TennCom (UCR_J5swRE-l-8t0p9WrNIfw) | sezione "Affiliate Links and Discount Codes", link Toroline | con affiliazioni dichiarate (Toroline) |
| ZeroLove (UC4h5FHD1LFwXbuZWWgbvE_w) | 10% su ReString e Toroline con ref/codice | con affiliazioni (ReString e Toroline) |
| MPTennis (UCFxH4IPA7ItHuiIsChplWLQ) | codici sconto, link affiliati | con affiliazioni |
| Tennis Spin (UCJG8i2wPP4euR2XJkydndBQ), OpenCourt (UCY6pOJ0SpVaxY1MM8wZT0Tg), Dandan Tennis (UCf1ihZHHmL2WV7YLgTtNTaA), James Strings (UCtLeV7A0HOL1ze2_SR6Mb0Q) | codici sconto/affiliati in quasi tutti i video | con affiliazioni |
| Tennis Warehouse (UCmgyIibKmFosnm-LyZEB7uQ), PH Tennis (UCrg2cfpZrVyy9r0cZ1sgX8w; vende racchette su ph-tennis.co.uk) | rivenditori | commerciale |

Feed da usare: `https://www.youtube.com/feeds/videos.xml?channel_id=<ID>` (verificato 200 per PH Tennis, TennCom, Tennisnerd, ecc.).

**Video utili (ricerca YouTube 2026-11-18; date ≈; classe del canale come sopra).** Per questa configurazione (Blade 100 v9, poly 1,23-1,25) non ho trovato nessun video indipendente su Slap/Zero/O-Toro/Confidential; quelli indipendenti sono pochi.

- TK Tennis, indipendente: https://www.youtube.com/watch?v=gRlkNw_O_DA , O-Toro 17, ≈2024. Frase: "recensione franca" dell'O-Toro senza giudizio sintetizzato (titolo ironico, contenuto non verificato). https://www.youtube.com/watch?v=W1aqsSrzEWY , O-Toro Tour, ≈gen 2026, analisi approfondita (contenuto non visionato).
- TennisTroll (non verificabile): https://www.youtube.com/watch?v=4GAcRi0HB0c , Slap, "verdetto dopo test estesi", ≈mag 2026. https://www.youtube.com/watch?v=1XCndP6tqX0 , ReString prime impressioni, ≈feb 2026.
- Trash Bin Tennis (affiliazioni dichiarate): https://www.youtube.com/watch?v=_75PBtA8nYM , Confidential vs Confidential Soft, ≈mag 2026.
- PH Tennis (commerciale): https://www.youtube.com/watch?v=DKtuzKzB5Fs , Slap, ≈mag 2026; https://www.youtube.com/watch?v=q3pinxFWVWA , top 5 Toroline, ≈giu 2026.
- ZeroLove (affiliato ReString/Toroline): https://www.youtube.com/watch?v=yUETBVUYZc4 , "ReString Brought SLAP Back", ≈mar 2026.
- MPTennis (affiliato): https://www.youtube.com/watch?v=mI-I1XH_zGc , Slap vs RPM Blast, ≈mar 2026; https://www.youtube.com/watch?v=QO8YZXpcAU0 , 3 anni di Confidential, ≈2023.
- Tennis Spin (affiliato): https://www.youtube.com/watch?v=NOLhAwXXzaM , Slap, ≈apr 2026.
- Brody Taylor (non verificabile): https://www.youtube.com/watch?v=s4esasDxEyI , ReString Zero, ≈ott 2026.
- Sweet Spot (indipendente con riserva): https://www.youtube.com/watch?v=Fq7jvSnGT6g , Zero a 35 lb, "lezione sulla rigidità", ≈2024.
- Scritti: Tennis Nerd (Chris Nash) su Slap https://www.tennisnerd.net/?p=61581 : trova il suono "vuoto" rispetto a Zero e traiettoria incostante con una sola racchetta (affiliato Toroline, non ReString). TW Lab su Confidential 1.25: punteggi 89/100, controllo 93, spin 90, potenza 42, comfort 63 https://www.tennis-warehouse.com/learning_center/reviews/strings/solinco_confidential.html?pcode=SLNC16LS (rivenditore; punteggi soggettivi, NON per i punteggi del banco).
- Conflitto di date: una fonte dice Slap lanciata a marzo 2026, Tennis Nerd è datato nov 2025: da verificare prima di scrivere una data.

Frasi chiave sono parafrasi dai titoli/snippet: non ho potuto guardare i video, quindi "1 frase chiave" non è verificata sul contenuto. Prima di pubblicare servono visione e data esatta di ciascun video.

**Criterio proposto «indipendente» (scritto e verificabile).** Un canale è "indipendente" solo se tutte le condizioni valgono sulle ultime 15 descrizioni del feed RSS: (1) nessun link affiliato né codice sconto proprio per nessuna marca di corde; (2) nessuna dichiarazione di sponsorizzazione o accordo con marche/negozi di corde; (3) dichiara se le corde sono acquistate, regalate o fornite (basta una frase fissa nel canale); (4) non è un rivenditore né ne è partner; (5) la verifica è registrata con data e URL del feed. Se (3) manca: "non verificabile". Se ha affiliazioni dichiarate: "con affiliazioni". Il controllo è automatico (parole chiave) più revisione manuale, e va ripetuto ogni 90 giorni.

## 5. Aggiornamento quasi in tempo reale, ma MANUALE

Stato: `pipeline/refresh.py` già riscarica TWU/Compare, Racketpedia, Excel, scrive `data/changes/AAAA-MM-GG.md` e ricostruisce. Proposta: un comando separato `py -m pipeline.watch` che NON scrive in `data/raw/` ma solo `data/changes/watch-AAAA-MM-GG.md`:
1. TWU: scarica `reporter2.php`, `parse_twu`, confronta ID e valori con `data/raw/twu.json` (come ho fatto io: 0 differenze oggi); elenca solo aggiunte per marche di interesse (Re-String, Toroline, Solinco).
2. Racketpedia: scarica `/en-GB/tennis-strings`, estrae nuove voci per marca confrontandole con `racketpedia.json`.
3. YouTube: file `data/watch/channels.json` (id, nome, classe, data verifica); per ognuno si legge il feed RSS e si riportano i video nuovi con titolo contenente le corde in elenco (Slap, Zero, O-Toro, Confidential, ecc.), l'URL, la data `published` e le parole-chiave di affiliazione trovate nella descrizione. Il feed offre solo gli ultimi 15 video, quindi serve eseguirlo almeno ogni 2-3 settimane.
4. Uscita: elenco "da guardare" con casella manuale; nessun video entra senza revisione umana e criterio §4. Lancio: a mano, o con un promemoria mensile; esito 0/1 per un eventuale job. Mai aggiornare punteggi da soli.

## 6. Scienza (gratuita)

1. Cross & Lindsey, "How Tennis Strings go dead", TWU (Lindsey, 2013-03-21) https://twu.tennis-warehouse.com/learning_center/deadstrings.php : colpi ripetuti; fino a 15 lb persi nel primo minuto e 20 lb in 20 colpi; rigidità perpendicolare 20-35 lb/in; i poly sono rigidi in lunghezza ma non necessariamente in perpendicolare. Limiti: poche corde, macchina a pendolo, dati su coppie nylon/poly, non pubblicato su rivista.
2. Lindsey, "Understanding string stiffness", https://twu.tennis-warehouse.com/learning_center/stringstiffness.php (senza data): rigidità dinamica a 52 lb; corde entro 10-15% sembrano uguali; 220 vs 200 lb/in = +10%; contatto 4-7 ms; tensione persa è il secondo fattore. Limiti: opinione divulgativa del rivenditore.
3. Lindsey, "Energy Flow and Return Between a Tennis Ball and Stringbed", https://twu.tennis-warehouse.com/learning_center/stringbeds.php (2021-09-07): COR varia al massimo 0,02-0,03 tra nylon e poly; sopra 35 lb nylon e poly differiscono meno del 5% in forza e durata; effetti maggiori sotto 45 lb. Limiti: una racchetta (Pure Strike 98), niente calibri/ibridi.
4. Cross & Lindsey, "How string pattern affects spin", https://twu.tennis-warehouse.com/learning_center/spinpatterns.php (2013-01-30): 22 racchette, 63 mph, 52 lb; poly +4-5% di spin sul nylon in 16x19; pattern 16x15 circa +10%. Limiti: racchetta ferma, campioni piccoli, alta dispersione. Importante per l'app: tra i poly le differenze di spin misurate sono piccole.
5. Kawazoe, Takeda, Nakagawa 2012, J. Syst. Design Dyn. 6(2):213-226, DOI 10.1299/jsdd.6.213, accesso libero https://www.jstage.jst.go.jp/article/jsdd/6/2/6_2_213/_article/-char/en : corde intaccate -40% di spin; lubrificate +30% su nylon intaccato; più le principali scorrono e tornano indietro, più spin. Limiti: nylon/budello, non poly moderni.
6. Kawazoe 2013, atti JSME (J-STAGE) https://www.jstage.jst.go.jp/article/jsmeshd/2013/0/2013__314-1_/_article/-char/en : secondo il riassunto, i copoly generano più spin per minor attrito e snapback; solo riassunto letto, non l'intero articolo.
7. ITF Technical Centre, https://m.itftennis.com/media/2283/rackets-and-strings-research.pdf : rig MYO per misurare lo spin di corde diverse; conta la rigidità del piatto corde più della tensione. Limiti: nessun numero per modello; documento non datato in modo chiaro (nov 2019).
8. Cross & Bower 2001, "String tension in a tennis racket", Sports Eng. 4:165, PDF Sydney https://www.physics.usyd.edu.au/~cross/CrossBower.pdf : tensione e come si distribuisce; non l'ho letto (non l'ho scaricato). Verificare.
9. Cross, pagina StringTension.pdf (2006) https://www.physics.usyd.edu.au/~cross/StringTension.pdf : PDF di 4 pagine, non estratto dal fetch; da leggere a mano.
10. Studio Cardiff Met / Sports Engineering 2008, DOI 10.1007/s12283-008-0006-z (https://link.springer.com/article/10.1007/s12283-008-0006-z): giocatori d'élite hanno rilevato la differenza di 25 N (6 lb) solo nell'11% dei casi; il rimbalzo cresce a tensioni più basse. Sintesi da un risultato di ricerca, accesso al testo bloccato: da verificare.
11. Studio in partita (J. Sports Sci. 2005, riportato da ricerca): tensione alta -> più errori in rete, bassa -> più lunghi. Fonte primaria non letta.
12. Calibro e ibridi: non ho trovato una fonte gratuita solida verificata. Per il calibro il repo usa già la pendenza 203 lb/in per mm da TWU (controllata con USRSA 289: `docs/AUDIT.md`). Per gli ibridi: nessuna fonte di laboratorio verificata in questa ricerca.

Lacune: rigidità dinamica e tempo di contatto sono ben coperti dalle pagine TWU, ma sono pagine del rivenditore, non peer-review; per snapback c'è solo Kawazoe; ibridi e calibro senza fonte.

## Sommario (12 righe)
1. TWU: nessuna novità rispetto allo snapshot 28/10 (483 righe, 130 in ambito, 0 differenze); `twu_extract.py` funziona ancora.
2. Re-String (Slap, Zero) NON è nel TWU; Confidential 16L 1,25 e Hyper-Con nemmeno. Restano solo Racketpedia (Slap 0,75 kg/mm; Zero 1,05) e non c'è misura lb/in.
3. Rischio licenza: i Termini TW vietano scraping/data mining e riproduzione; decidere (permesso scritto o solo link).
4. Racketpedia: lista pubblica senza novità visibili; termini non letti, robots.txt non vieta l'elenco.
5. Stringforum.net è un forum (saitenforum.de): scartato come fonte di punteggi.
6. Fonti di laboratorio utili: TWU, USRSA via TruPro (solo TRU PRO), ITF (senza numeri per modello), Kawazoe 2012.
7. YouTube: letti 17 feed RSS; indipendente dichiarato solo TK Tennis (e Sweet Spot con riserva).
8. Tennisnerd, TennCom, ZeroLove sono affiliati Toroline/ReString; MPTennis, Tennis Spin, OpenCourt, Dandan, James con codici sconto; TW e PH Tennis sono rivenditori.
9. Per Slap/Zero/O-Toro/Confidential non ho trovato video indipendenti verificati: i video sono elencati ma non guardati (pagine video bloccate da captcha); date ≈.
10. Criterio «indipendente» proposto: nessun affiliato/codice, nessuna sponsorizzazione, dichiarazione su come ottiene le corde, non rivenditore, verifica datata sul feed.
11. Aggiornamento manuale: `pipeline.watch` che legge TWU, Racketpedia e feed RSS e scrive solo un report in `data/changes/`.
12. Scienza: 8-10 fonti gratuite, ma per gli ibridi e il calibro non c'è una fonte verificata; diverse fonti da leggere per intero prima di citarle (Cross & Bower, StringTension.pdf, Springer 2008).
