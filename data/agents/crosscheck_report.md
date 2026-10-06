# Verifica incrociata dei dati (fonti esterne a TWU-reporter e Racketpedia)

Data: 2026-10-06. File di dettaglio: `crosscheck.json` (34 stringhe).

## Giudizio complessivo di affidabilità

- **I numeri di rigidità/tenuta TWU sono nel complesso plausibili** per la maggior parte delle stringhe (Solinco, Toroline O-Toro/Tour/Spin, Babolat). Dove è stato possibile un confronto con un altro laboratorio, l'ordine di grandezza regge. Esempio: perdita di tensione della Confidential 1.25 in un test in stile USRSA, 14,95 lb a 62 lb di partenza (circa 24%, rapporto calcolato da me), contro 22,2% TWU. Per Hyper-G 1.25 il test USRSA dà 15,56 lb (circa 25%), contro 24,7% TWU.
- **Quasi tutte le misure indipendenti trovate sono comunque di TW** o riprese da TW (stessa fonte). Fuori da TW ci sono solo la pagina USRSA riportata da un rivenditore (Tru Pro) e i punteggi soggettivi di Mijnracket e Prostrung. **Non esistono database indipendenti di rigidità** per le Grapplesnake, le Re-String e quasi tutte le Toroline.
- **I metadati sono la parte meno affidabile.** Ci sono errori di forma (sezione), di diametro e di etichetta calibro in almeno 14 schede. Vanno corretti prima delle descrizioni.
- **Le descrizioni "feel" contraddette dai tester** sono poche ma importanti: Revolve Spin, Grapplesnake Alpha, O-Toro Snap e (in parte) Cash.
- **Limiti della ricerca:** la ricerca web copre solo il Web in inglese e il motore è limitato agli USA. Molti riassunti di pagine arrivano da un modello di sintesi. I numeri sono stati citati solo quando compaiono nella pagina o nello snippet. Le fonti dei rivenditori (thetennisstore.com.au, tennisracketseu.com) sono spesso generiche e a volte si contraddicono; le ho pesate meno.

## Conteggio verdetti

| Verdetto | N. | Stringhe |
|---|---|---|
| confirmed | 3 | O-Toro, O-Toro Tour, O-Toro Spin |
| plausible | 14 | RPM Blast 17, RPM Blast 16, RPM Blast Rough 16, Confidential Soft 16L, Hyper-G 16, Hyper-G 16L, Hyper-G Round 16, Tour Bite 16L, Mach 10, Revolve 17, Absolute, Slap, Caviar, Wasabi |
| questionable | 12 | Confidential 16L, Confidential 17, Revolution 16L, Super Toro, Enso Pro Carbon, Cash, Tour M8, Tour Sniper, Re-String Zero 16, Zero 17, Sync, Vivo |
| contradicted | 5 | RPM Blast "16L", RPM Blast Rough 17, Grapplesnake Alpha, O-Toro Snap, Revolve Spin |
| no_data | 0 | - |

Significato: confirmed = direzione confermata da più fonti; plausible = coerente con piccole note; questionable = metadati sbagliati o evidenza inconcludente; contradicted = una affermazione chiave (calibro, feel o tenuta) è smentita dalle fonti.

## Correzioni consigliate (in ordine di importanza)

1. **Forme (sezione) sbagliate nei dati e nelle note.**
   - Confidential (16L e 17): non è tonda, è a 4 lati (quadrata) per Solinco/TW; Racketpedia dice pentagonale. Togliere "tonda" dalle note.
   - Solinco Revolution: è esagonale (6 lati), non tonda. La nota "Tonda come la Confidential" è sbagliata due volte.
   - Re-String Vivo: è esagonale, non tonda.
   - RPM Blast 1.25: il campo dice HEX ma è ottagonale (la nota già dice "ottagonale").
   - Da riempire dove è `null`: Cash, O-Toro Snap e Hyper-G Round sono tonde; Alpha, Tour Sniper, Mach-10 e O-Toro Spin sono pentagonali; Tour M8 e RPM Blast Rough sono ottagonali.
   - Hyper-G e Tour Bite: TW li chiama "quadrati", Racketpedia e i forum "pentagonali". Segnalare come dato discusso.
2. **Diametri/etichette che non esistono.**
   - "RPM Blast 16L 1.25" non esiste (Babolat vende 18/1.20, 17/1.25, 16/1.30, 15L/1.35). È la stessa stringa della riga 17: unire o eliminare. Le due righe 1.25 hanno anche perdita diversa (45,9% contro 33,3%), perché la prima usa il proxy 1.30.
   - RPM Blast Rough "17 = 1.20" è sbagliato: esiste solo 1.25 e 1.30. La nota "In 1.20 diventa morbida" va corretta in 1.25.
   - Re-String: Zero, Vivo e Slap sono 1.23 mm e 1.28 mm (non 1.20 e 1.30). Sync 17G è 1.25 mm.
   - Toroline Wasabi è 1.23 mm. Super Toro e Absolute sono "17" nelle etichette ufficiali, non "17L". Tour Sniper 1.25 è venduta come 17.
   - Typo: "Enos" deve essere "Enso".
3. **Grapplesnake Alpha / Tour M8 / Tour Sniper.** Il produttore e TW ordinano dalla più morbida alla più ferma: Alpha, Tour M8, Tour Sniper. I nostri dati TWU dicono Alpha 218, M8 210, Sniper 206 lb/in, cioè l'ordine inverso tra Alpha e Sniper. La nota su Alpha ("più compatta della Tour M8", "vicina alla Confidential") contraddice tutte le fonti. Segnare i dati Grapplesnake come bassa affidabilità e riscrivere la nota di Alpha.
4. **Wilson Revolve Spin.**
   - Tenuta: la perdita 54,5% è un'anomalia. I tester TW parlano di calo graduale e di quasi un mese di giocabilità, Mijnracket dà 8/10 di ritenzione, il vostro Excel dà 10% a 6 mesi e 27% a 12.
   - Sensazione: tutte le prove la descrivono ferma e "morta", non morbida (TWU 172,6 lb/in e Stiff Index 3,04 la danno tra le più morbide).
   - Spin: lo spin basso (5,0) è parzialmente confermato da Mijnracket, ma i tester TW la valutano 92/100.
5. **O-Toro Snap.** Non è la "gemella" dell'O-Toro. È tonda, descritta da TW come medio-ferma, da Tennisnerd come più ferma, con più basso angolo di lancio e meno spin dei modelli sagomati. Un solo cliente la dice "ancora morbida per una poly". Il dato TWU (164,6 lb/in, quasi identico all'O-Toro) va ricontrollato.
6. **Toroline Cash.** Tennisnerd: ferma, controllata, ottima tenuta, più rigida della O-Toro, spin sotto le sagomate. La nota "morbida, snapback alto 7,6" va attenuata ("tonda, più rigida della O-Toro").
7. **RPM Blast e RPM Blast Rough.** La nota "poco spin (4,5)" va qualificata come "spin potential di laboratorio TWU": tutte le altre fonti la trattano come stringa da spin. Sul rapporto Rough/Blast, vedi 4b.
8. **Mach 10.** Solinco la propone come poly più morbida e potente (CloudFORM). La nota "rigida e compatta" va sostituita con "rigidità media, più morbida delle Solinco classiche". La tenuta è confermata come la migliore della gamma soft.
9. **Confidential 1.25 / 1.20 (proxy).** Il proxy 1.30 per 1.25 regge per la tenuta (vedi test USRSA a 1.25: 24% circa). Per 1.20 il proxy è a due gradini di calibro e va presentato come indicativo.
10. **Tour Bite e Hyper-G Round.** Tour Bite spin 5,9 è un'anomalia rispetto alla reputazione da stringa spinnosa. Hyper-G Round: i tester dicono meno spin della Hyper-G sagomata, mentre il TWU dà 7,3 contro 7,0.
11. **Stima di rigidità incoerenti tra laboratori.** Nel test in stile USRSA l'ordine è RPM Blast (273) < Confidential (285) < Hyper-G (290), l'opposto di TWU e delle recensioni. Evitare di dichiarare graduatorie di rigidità fini tra stringhe diverse.

## Risposte alle domande speciali

**4a. O-Toro Tour è una versione più ferma/da controllo della O-Toro?**
Sì, la direzione è confermata. Toroline scrive che la Tour è circa il 15% più rigida della O-Toro. I tester TW la trovano più ferma e croccante (controllo 9,4/10, spin 9,2/10, durata di giocabilità 7,9/10), e Tennisnerd la presenta come la variante da controllo e durata. Il nostro rapporto TWU (216,6 contro 165,7 lb/in) è circa +31%, quindi la differenza reale, se misurata con lo stesso metodo, è più grande di quella dichiarata dal marchio. Meglio non esagerarla nelle note. La tenuta migliore (25% contro 44%) è plausibile. Calibri ufficiali 1.23 e 1.20.

**4b. RPM Blast Rough è materialmente diversa da RPM Blast (spin 8,2-9,9 contro 4,5)?**
In parte. Tutte le fonti la dicono più morbida e un po' più potente, con la superficie ruvida che dà più presa. I tester TW valutano lo spin della Rough a 90/100 e Mijnracket a 8/10. Mijnracket dice che il claim di "spin definitivo" è esagerato rispetto alla RPM Blast liscia. Il quasi raddoppio (4,5 contro 8,2/9,9) è quindi solo una metrica TWU di laboratorio, non confermata dai punteggi dei tester. Riformulare in "spin potential TWU più alto". Sulla tenuta c'è un risultato misto: TW parla di durata di giocabilità bassa (40/100) nella recensione, altri tester sul prodotto scrivono che regge bene. Nota importante: TW e un rivenditore riportano la "RPM Blast Rough" come ribattezzata "RPM Rough" (stesso articolo con nome nuovo). Non ho trovato prove di due prodotti diversi, contrariamente alla premessa. Verificare l'etichetta sul vostro lotto.

**4c. Re-String (nessun dato TWU): informazioni su rigidità e tenuta.**
Nessun valore di laboratorio pubblico. Qualitativamente: scala dal morbido al rigido Sync, Slap, Zero, Vivo (classifica del negozio ufficiale; Tennisnerd conferma Vivo più ferma di Zero). Questa scala coincide con il vostro Stiff Index (Sync 3,18 > Slap 2,91 > Zero 2,49 > Vivo 1,78; per il Zero 1.28 sale a 1,67 con il calibro). Tenuta: durata di giocabilità del negozio 9/10 per Zero/Slap/Sync e 8/10 per Vivo; Prostrung dà 75% a Sync e 100 a Vivo (punteggi soggettivi, non misure); Tennisnerd giudica "eccellente" la tenuta di Vivo e costante lo snapback di Zero; Slap diventa più spenta dopo poche ore. Il vostro Excel (Zero 1.30: TL12 24%) non è in contrasto.

**4d. Revolve Spin: perdita 54,5% e spin 5,0 sono coerenti con altre fonti?**
Solo in parte. Lo spin basso trova una conferma (Mijnracket: "poco spin rispetto alle aspettative"), ma i tester TW e Tennis Creative lo danno a 92-93/100. La perdita del 54,5% non è coerente: durata di giocabilità TW 76/100 (calo graduale, circa un mese), ritenzione 8/10 per Mijnracket, 27% a 12 mesi nel vostro Excel. Inoltre le prove la descrivono ferma e senza vivacità, non morbida. Trattare la riga TWU di Revolve Spin come bassa affidabilità.

## Fonti principali

- Babolat: https://www.babolat.com/us/rpm-blast-string/243101.html ; https://restring.london/babolat-rpm-blast-review/ ; https://tenniscompanion.org/babolat-rpm-blast/ ; https://www.tennis-warehouse.com/learning_center/string_reviews/BRPMB16review.html ; https://www.tennis-warehouse.com/learning_center/string_reviews/BRPMBRSreview.html ; https://www.tennis-warehouse.com/Babolat_RPM_Blast_Rough_130_16_String/descpageACBAB-BRPMBR3.html ; https://mijnracket.nl/en/blogs/news/babolat-rpm-blast-rough-16-getest ; https://www.lovetennisblog.com/babolat-rpm-blast-rough-string-review/
- Solinco: https://www.tenniswarehouse-europe.com/catpage-SOLINCOSTRI-EN.html ; https://tenniscompanion.org/solinco-confidential/ ; https://tenniscompanion.org/solinco-confidential-soft/ ; https://www.tennisnerd.net/gear/strings/string-reviews/solinco-confidential-string-review/18882 ; https://www.tennis-warehouse.com/learning_center/string_reviews/shg16review.html ; https://www.tennis-warehouse.com/learning_center/string_reviews/STB16Lreview.html ; https://www.tennis-warehouse.com/learning_center/string_reviews/SREV16review.html ; https://www.tennis-warehouse.com/comparison/STB16_SHG16.html ; https://tt.tennis-warehouse.com/index.php?threads/solinco-tour-is-actually-5-sided.531906/ ; https://www.racqix.com/en/tennis-strings/solinco/solinco-mach-10-16-1-30-string-reel ; https://prostrung.com/is-solinco-mach-10-tennis-string-the-best-soft-poly-full-review-playtest/
- Test indipendente (USRSA, via rivenditore Tru Pro): https://truproofficial.com/tru-pro-tennis-string-lab-testing-results-usrsa
- Toroline: https://toroline.com/products/o-toro ; https://toroline.com/products/o-toro-tour ; https://toroline.com/products/o-toro-spin ; https://toroline.com/products/absolute ; https://toroline.com/products/super-toro ; https://www.tennis-warehouse.com/learning_center/reviews/strings/toroline_otoro_tour.html?pcode=TOROTR ; https://www.tennis-warehouse.com/learning_center/string_reviews/T7TOROSreview.html ; https://www.tennis-warehouse.com/learning_center/gear_guides/tennis_string/best_toroline_string_for_me.html ; https://www.tennisnerd.net/gear/strings/string-reviews/toroline-strings-review/23264 ; https://www.tennisnerd.net/gear/strings/string-reviews/toroline-otoro-snap-review/62115 ; https://www.tennis-warehouse.com/TOROLINE_O-TORO_Snap_16L_125_String/descpageACTORO-TOROS7.html ; https://www.tennisnerd.net/gear/strings/string-reviews/toroline-cash-strings-review/67980 ; https://www.tennis-warehouse.com/TOROLINE_Cash_16L_125_String/descpageACTORO-TCASH25.html ; https://prostrung.com/toroline-otoro-review/ ; https://thetennisstore.com.au/blogs/string-reviews/the-toroline-o-toro-range-explained-six-strings-one-family-zero-confusion ; https://www.tennis-warehouse.com/TOROLINE_Caviar_17_120_String/descpageACTORO-T7CAVA.html ; https://www.tennis-warehouse.com/TOROLINE_Wasabi_17_123_String/descpageACTORO-TWASA.html ; https://www.tennis-warehouse.com/TOROLINE_Enso_Pro_16L_125_String/descpageACTORO-T6LENSO.html ; https://www.tennisnerd.net/gear/strings/string-reviews/toroline-enso-pro-review-balanced-feel-meets-modern-control/62407
- Grapplesnake: https://www.grapplesnakeusa.com/pages/string-info ; https://www.grapplesnakeusa.com/products/tour-m8-set ; https://www.tennis-warehouse.com/learning_center/Gear_Guides/grapplesnake-string-guide.html ; https://www.tenniswarehouse-europe.com/learning_center/string_reviews/grapplesnake_alpha.html?pcode=GSASS125 ; https://www.tennis-warehouse.com/Grapplesnake_Alpha_17_125_String/descpageACGRAPPLE-GALP125.html ; https://www.tennis-warehouse.com/Grapplesnake_Tour_Sniper_17_125_String/descpageACGRAPPLE-GTSS125.html ; https://www.tennisnerd.net/gear/strings/grapplesnake-tour-sniper-review/26877 ; https://www.tennisnerd.net/gear/strings/grapplesnake-tour-m8-review/25992
- Re-String: https://shoprestring.com/products/restring-zero-single-set ; https://shoprestring.com/blogs/news/what-restring-string-is-best-for-you ; https://tennisracketseu.com/blogs/tennis-gear-reviews/restring-tennis-strings-full-lineup-review-sync-vivo-zero-and-custom-box ; https://courtspin.eu/products/restring-vivo ; https://www.tennisnerd.net/gear/strings/restring-vivo-vs-restring-zero-which-string-should-you-choose/64557 ; https://www.tennisnerd.net/gear/racquets/restring-vivo-string-review/45756 ; https://www.tennisnerd.net/gear/strings/string-reviews/restring-slap-review-spin-snap-back-on-court-impressions/61581 ; https://prostrung.com/restring-sync-tennis-string-review/ ; https://prostrung.com/restring-zero-tennis-string-review/
- Wilson: https://www.tennis-warehouse.com/learning_center/string_reviews/WRS17review.html ; https://mijnracket.nl/en/blogs/news/wilson-revolve-spin-16-getest ; https://tenniscreative.com/wilson-revolve-spin-review/ ; https://tennisoverload.com/wilson-revolve-tennis-string-review/ ; https://www.tennis-warehouse.com/Wilson_Revolve_Spin_16_130_String/descpageACWILSON-WRS16.html
