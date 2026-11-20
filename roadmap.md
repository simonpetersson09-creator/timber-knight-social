# Mr B Chess – roadmap (från genomgång av Yatzy, Ludo, Sudoku, Ord)

## Releasegranskning – första tio åtgärderna 20 nov
- [x] G01: korrekt tredragupprepning samt automatisk 50-/75-dragsregel lokalt och online; delade regeltester och riktiga serverdrag verifierade
- [x] G02: tidsförlust blir oavgjort när motståndaren saknar mattmöjlighet; båda timeoutfallen verifierade mot backend
- [x] G03: blockera lokala och onlinedrag/promotion när tiden är ute; mobilgränssnitt och serveråtgärder provade
- [x] G04: Stockfish-timeout avslutar sökningen, terminerar workern och startar rent vid nästa drag; isolerat test passerat
- [x] G08: slutresultat sparas beständigt och deduplicerat innan pågående spel tas bort; lagringsfel lämnar slutställningen kvar
- [x] O01: datorfallback och Avbryt raderar bara väntande snabbspel, aldrig en match som hunnit aktiveras; backendprov passerat
- [x] O02: snabbmatchning paras ihop i en atomisk databasåtgärd; två samtidiga spelare fick samma aktiva match
- [x] O03: endast aktivt oavgjortförslag från motståndaren kan accepteras; eget/stale svar avvisades i backendprov
- [x] O04: deadline kontrolleras vid drag, oavgjort, uppgivande, chatt och schemalagd städning; samtliga spärrar provade
- [x] O09: högst två oavgjortförslag per spelare sparas lokalt och online; omladdning och backendgräns verifierade

## Releasegranskning C01–C03 (K1–K3)
- [x] Rätta iOS bundle-ID utan att ändra befintligt Android-paket; signering/provisioning verifieras separat i Xcode
- [x] Gör korta/liggande spelvyer spelbara utan överlapp eller kollapsat bräde; normalflöde med rullning, mobilprov och drag verifierade
- [x] Gör 404- och felgränser säkra vid serverrendering; okänd URL ger HTTP 404 i stället för 500

## Snabbspel med onlinesökning 20 nov
- [x] Starta 20 sekunders onlinesökning från startsidans Snabbspel
- [x] Använd vald nivå och klocka om datorn får ta över utan motståndare
- [x] Kontrollera riktig spelare–spelare-matchning och att sen anslutning vinner över fallback

## Eftermatchannons vid samtliga utgångar 20 nov
- [x] Visa samma engångsannons vid Spela igen, Hem, tillbakapil och native tillbaka efter avslutat parti
- [x] Låt offline/no-fill fortsätta navigationen och behåll max ett försök per parti och tvåminutersspärren

## Serverstängning och Yatzy-loggning 20 nov
- [x] Radera väntande/aktiva onlinespel vid Stäng och ta bara bort kortet efter serverbekräftelse; båda mobilprovade och noll databasrader kvar
- [x] Komplettera viktig Yatzy-lik loggning: appstart, globala fel, lokala/onlinepartier, inställningar/statistik och språk
- [x] Testa serverradering, deduplicering och administrationsräkning; leverans av appstart, lobby, onlinestart och stängning bekräftad

## Eget perspektiv och dragpluttar 20 nov
- [x] Säkerställ att spelarens egna pjäser och profil ligger nederst för båda färgerna; svart perspektiv mobilprovat
- [x] Visa dragpluttar endast på Nybörjare; inga dragtips på övriga nivåer, lokalt eller online; Nybörjare/ Medel mobilprovat

## Spelvyn 20 nov
- [x] Ersätt utfällbar draghistorik med två pilar, stega pjäserna ett drag åt gången och begränsa till tio drag bakåt; lokalt och online provspelat
- [x] Visa spelarnamn i stället för pjäsfärg i lokala status- och resultatnotiser; mottagen onlinenotis provad med två spelare
- [x] Byt kvarvarande svenska remitexter till oavgjort; 134 tester godkända
- [x] Genomkörning av spelrutor, bekräftelser och matchnotiser lokalt samt med två separata onlinespelare
- [x] Samma extra remibekräftelse och centrerade skickat/mottaget/avslaget-notiser online; avbryt skickar inget
- [x] Resultatet öppnas först efter att schackmattnotisen har stängts, utan överlapp
- [x] Chatt, avböj/acceptera remi, ge upp, resultat, dragning, promotion och revansch provspelade; 131 tester godkända
- [x] Kompakt promotionsrad med dam, torn, löpare och springare, lokalt och online; springare vald via riktig mobil dragning
- [x] Statisk diskret guldmarkering runt den schackmatte kungen; e8 visuellt verifierad
- [x] Direkt lokal revansch med exakt samma läge, nivå, färg och klocka; Proffs/vit/15+10 provspelat
- [x] Drag och släpp med lyft pjäs och kort mjuk återgång vid ogiltig släppunkt; e2–e5 ogiltigt och e2–e4 giltigt provspelat
- [x] 130 tester passerade; 394/320 px utan sidfel eller horisontellt överflöd
- [x] Utfällbar draghistorik med positionsgranskning efter match, lokalt och online; e4/slutställning provspelade på 320/394 px
- [x] Materialfördel i skålkanten enligt 1/3/3/5/9, endast vid ledning; schackmatt +1 och bondeförvandling testade
- [x] Mjuk schackmarkering som guld-/mahognyring runt kungen, visuellt kontrollerad vid schackmatt
- [x] Tre tänkprickar i datorns namnkort medan den tänker; oförändrad kortbredd provspelad
- [x] Diskreta guldhörn för senaste draget i stället för heltäckande gul yta
- [x] Mjuk kantpuls vid låg tid utan helt rött klockkort; riktig 15-sekundarstid och 320/394 px verifierade
- [x] Tidskort och namnkort med exakt samma höjd (30 px), mätt på 320/394 px
- [x] Centrerad extra bekräftelse innan Föreslå oavgjort skickas eller räknas; avbryt och tvåförslagsspärr provspelade
- [x] Noa, Alva, Kim och Sam med bonde, springare, löpare och krona som nivåikoner (användarbekräftat)
- [x] Fyrkantiga tidskort bredvid respektive namn; runda klockan ovanför knapparna borttagen; provspelat på 320/394 px med alla nivåer
- [x] Utslagen pjäs synlig utan blink från brädet till sin exakta skålplats; 111 mätta bildrutor utan dold pjäs eller tom överlämning
- [x] Centrerade schack- och schackmattnotiser samt stängbart resultat med slutställningen kvar
- [x] Provspelat 320×568, 394×852 och 1280×1800, inklusive schack/matt och resultatgranskning; 119 tester och typkontroll passerade

## Startsida och statistik 20 nov
- [x] Ta bort texten om elfenbenspjäser och återställ mjuk uppåtentré utan omcentrering vid snabbspel
- [x] Byt svenska statistiktexten till Oavgjort och ta bort statistikrutan för två spelare/en enhet
- [x] 50 riktade tester godkända; ofärdigt parti räknar 0, schack matt 1, startsidans totalsiffror/vinstprocent stämmer även efter omladdning; 320/394/430/1280 px utan överflöd

## Google AdMob Android 20 nov
- [x] Android App-ID, App Open, Interstitial och Googles testenheter i utveckling
- [x] AndroidManifest med AdMob App-ID och AD_ID, idempotent vid Capacitor-synk
- [x] Delad UMP/livscykel/logik verifierad; 111 tester samt komplett debug-APK byggd med Mobile Ads 25.4.0 och UMP 4.0.0
- [ ] Fysisk Android-enhet: verifiera UMP, testannonser, bakgrundsåterkomst, no-fill och avbrutna försök

## Google AdMob iOS 20 nov
- [ ] Fysisk iPhone/TestFlight: verifiera UMP/ATT, testannonser, bakgrundsåterkomst, no-fill och avbrutna försök; kräver macOS/Xcode och enhet.

## Kompakta spelval 20 nov
- [x] Behåll de fem bekräftade tidsvalen: ingen klocka, 3+2, 5+0, 10+0 och 15+10
- [x] Komprimera snabbspelspanelen och låt den öppnas nedåt utan att startsidan hoppar uppåt
- [x] Komprimera Spela med vän-sidan och kontrollera mobil/desktop

## Bakgrund och ikon 20 nov
- [x] Matcha bakgrunden mot Yatzy
- [x] Färgmatcha bondeikonen med spelets svarta pjäser och behåll hatt/monokel/kedja
- [x] Gör tidsrutan diskret och ta bort gult fyllnadsutseende; provad i pågående mobilparti

## Statistik och spelvy 20 nov
- [x] Kontrollera att endast färdigspelade partier räknas och samma siffror visas på startsidan och i statistiken; ofärdigt parti räknar 0, matt räknar 1, befintligt undantag för uppgivna partier kvar
- [x] Svep från vänster till höger för att gå tillbaka utan att störa schackdrag; från vänsterkanten, stänger rutor först och sparar pågående parti
- [x] Ta bort mahognyramen och utöka bräde och pjäser med säkra kantmarginaler; verifierat 320/393/430/1280 px
- [x] Rekommendera standardtid 10+0 utan att ändra tidsvalet

## Android och språk – full genomgång 19 nov
- [ ] Skapa och granska Android-projektet, behörigheter, säkerhetsmarginaler och publicerad adress
- [ ] Kontrollera native-delning, haptik, säker identitet, kamera, annonser, notiser och offlinebygge
- [ ] Översätt återstående synliga texter och rätta hårdkodade språkberoende sidor
- [ ] Verifiera samtliga 40 språk, platshållare och centrala mobilflöden

## Klart
- [x] Startsida i Yatzy-stil, färgkoder, 3 öppna nivåer, schackklocka, bondeförvandling, remi, ge upp
- [x] Vibration, konfetti, surfplatta stående/liggande, upp till 3 sparade partier
- [x] 40 språk med automatiskt enhetsspråk och språkmeny
- [x] Träbräde, ebenholts- vs träpjäser, Mr B-färger/typsnitt
- [x] Spel mot dator (3 nivåer) och online; ingen ångra

## Design
- [x] Anpassa startknappar, separat vänspelsida och neutral språkikon
- [x] Yatzy-liknande inställningar med namn och uppladdad profilbild
- [x] Mahognymaskot/appikon utan bakgrund, vänsterlutande svart hatt och monokel med kedja
- [x] Dölj rullningslister utan att hindra scrollning

## Språk
- [ ] iOS-behörighetstexter översatta (när appen paketeras)
- [ ] Sparade onlinepartier (3) när online byggs

## Identitet och profil
- [x] Anonym enhetsidentitet (ingen inloggning), namn (unikt, max 20), spelarnummer om namnlös
- [x] Avatar/profilbild, land med flagga

## Vänner
- [x] Vänkod/QR/länk (vänförfrågan efter onlinematch kommer med online)
- [x] Acceptera/avböj/dra tillbaka/ta bort, online-status
- [x] Vänstatistik (fylls på när onlinepartier finns): vinst/förlust/remi, senaste partier

## Online
- [x] Bjud in vän direkt (push), lobbykod + QR + /join-länk, korsade inbjudningar slås ihop
- [x] Snabbmatch med sökning, faller tillbaka på dator om ingen hittas
- [x] Servern avgör alla drag (fusksäkert), realtid + återanslutning
- [x] Tidsgränser: inaktiv → påminnelse → förlust; ge upp påverkar inte statistik
- [x] Inbjudan gäller 24 h, lobby 6 h; snabbchatt med fasta fraser
- Avstår: väntrum

## Statistik och topplistor
- [x] Partier, vinster, remi, vinstprocent, svit
- [x] Världs-/landstopplista per år, veckans topp 10, månadens flitigaste
- Avstår: veckopriser

## XP och butik (beslut)
- Avstår: XP, butik och värvningsbelöningar

## Notiser
- [x] Push iOS (APNs) + Android (Firebase), fråga vid onlinespel – inte vid start
- [x] Inställningar: din tur, påminnelser, spelpåminnelse efter 7 dagar (kl 18, max 1/vecka)

## Annonser (egna AdMob-ID:n för Chess)
- [x] 1 App Open (appstart), bara på startsidan, aldrig mitt i parti, kräver minst 1 avslutat parti
- [x] Mellanannons efter avslutat parti när spelaren väljer ny match (en per parti, väntar tills stängd)
- Avstår: banner och belöningsannons
- [x] Google-samtycke (UMP) + iOS ATT, ändra annonsval i inställningar, inga annonser på webben
- [x] app-ads.txt på juridiksidan

## Övrigt
- [x] Be om betyg: efter 5 partier, sedan +10, +20, max 3 gånger
- Avstår: nyhets-/uppdateringsrutor
- [x] Inställningar: namn, avatar, land, språk, haptik, notiser, annonsval, nollställ statistik, radera mina data
- [x] Android bakåtknapp (stänger rutor först, minimerar på start), svep bakåt på iOS
- [x] Webben visar bara App Store/Google Play-sida (/join och /legal öppna)
- [x] Ny juridiksida "Mr B Chess Legal" (support, integritet, villkor, app-ads.txt)
- [ ] App-ikon 1024 px + splash, iOS/Android-paket, butikslänkar
- [x] Admin: PIN-skyddad statistik (enheter iOS/Android, 30 dagar, annonser, fel), testenheter exkluderas
- [x] Analys + felrapportering

## Väntar på
- [ ] Notiser skickas först när Firebase kopplas (koden är klar)
- [ ] Butikslänkar när appen finns i App Store/Google Play
- [ ] Bygga iOS/Android-paket på dator (Xcode/Android Studio) efter publicering
- [ ] Riktig app-ads.txt-rad och supportmejl på juridiksidan

## Runda 19 nov
- [x] Enhetliga effekter på startsidans kort
- [x] Integritetsknapp och förbättrad vänsida
- [x] Jämfört server/loggning med Yatzy: transaktionssäker resultatregistrering, deduplicerade återförsök, kompletta historiksiffror, Stockholm-dagar; behåller säker enhetsidentitet och TanStack
- [x] Automatisk iOS-kamerabehörighet via copy/sync (fysisk kamera verifieras efter iOS-paketering)
- [x] Vänkod accepterad och synlig hos två spelare; skapa/gå med via kod och spela till schack matt verifierat
- [x] Centrerat bräde, spelarkort, slagna pjäser och bottenknappar; ingen ångra
- [x] Standardnamn "Spelare 1234", unika namn, land väljs automatiskt
- [x] Drottning bredvid kungen i ikonen
- [x] Snabbspel: 3 nivåer + förklarad schackklocka, inget pjäsval (värd/spelare = mahogny)
- [x] Startsidans kort och Spela med vän-sidan som Yatzy
- [x] Inställningar: inget ljud, inga spelade/vinster; profilbild verifierad

## Fördjupat träbräde
- [x] Fasad träram, djup och kontaktskuggor utan brädets lutning och utan ändrade spelregler
- [x] Alla 64 tryckytor kontrollerade vid 320, 394, 430 och 768 px; drag och brädvändning verifierade för båda färgerna

## Brädförslag 19 nov
- [x] Redovisa datorns faktiska svarstid per nivå
- [x] Tre jämförbara bräden utan pjäser med bredare ram och återhållsamma färgfinishar
- [x] Tre stillbilder skapade för chatten; den tillfälliga sidan är borttagen ur appen
- [x] Användaren har valt förslag 3 – Djup mahogny
- [x] Förslag 3 infört på det riktiga spelbrädet; 64 tryckytor, markeringar, drag och båda spelriktningarna verifierade på fem skärmstorlekar
- [x] Förslag 2 – Sidenmatt infört; 72 tester samt drag, markeringar och 64 tryckytor i båda spelriktningarna verifierade på fem skärmstorlekar

## Admin- och appjämförelse 19 nov
- [x] Jämfört Chess loggning och admininloggning med senaste Yatzy
- [x] Samma adminutseende, sparad adminnyckel, utloggning, 30-dagarstabell, diagram, bästa tider och diagnostik som Yatzy
- [x] Jämfört Chess med Ludo, Sudoku och Ord; verifierade luckor: lokal native-paketering, native-haptik, säkrare enhetslagring, resultatdelning, retention/push-test i admin, nivåstatistik, regelhjälp och sparade annonsval
- [x] Riktig admininloggning, 30 dagar, diagram och 84 automatiska tester verifierade
- Lanseringsluckor att prioritera separat: support@example.com kvar, produktionsannons-ID:n saknas, dataradering behöver felkontroll, integritetstexten behöver kontakt/lagringstider och native-länkar/push/offline kräver enhetstester

## Appjämförelse – punkter 1–3
- [x] 1. Native/offline-bygge, native-haptik, Keychain/Keystore och resultatdelning implementerade
- [x] 2. Admin: retention D1/D7/D30, pågående/väntande matcher, push-testpanel och valbar analysperiod med kvarvarande 30-dagarstabell
- [x] 3. Statistik per nivå/spelform samt hjälp för rockad, en passant, bondeförvandling, patt och klockor
- [x] 89 tester, TypeScript, regelhjälp och statistik i mobilvy samt avslutat parti och resultatdelning verifierade
- [ ] Fysisk iPhone/Android: verifiera Keychain/Keystore, haptik, offlinepaket och faktisk pushleverans (push är inte konfigurerad ännu)

## Pjäsförslag 19 nov
- [x] Fem materialvarianter skapade som kontrollerade stillbilder för chatten; appens pjäser är orörda
- [x] Användaren har valt förslag 2 – Elfenben & ebenholts
- [x] Elfenben och ebenholts införda i befintlig sidovy; 42 språktester samt 64 rutor, 32 pjäser, markeringar och drag med datorsvar verifierade i mobilvyn

## Toppvy för pjäser 19 nov
- [x] Tre toppvyförslag skapade och visuellt kontrollerade i båda pjäsfärgerna; appen är orörd
- [x] Användaren skippar toppvy och behåller sidovyn

## Spelkänsla och pjäsformer 19 nov
- [x] Fem nya formförslag som bilder med oförändrade elfenben-/ebenholtsfärger; appens pjäser väntar på val
- [x] Kompakta symmetriska spelarkort utan blå ram och med materialanpassad aktivmarkering
- [x] Snyggare bottenknappar och säkra marginaler utan horisontellt överflöd
- [x] Längre datorbetänketid och mjuk förflyttningsanimation med bibehållna spelregler
- [x] Inför valt förslag 5 Mr B Signature i samtliga tolv pjäsfiler med oförändrade färger och verifiera spelbarheten
- [x] Ersätt den för förenklade vektortolkningen med realistiska pjäser som troget återger den godkända Signatur-bilden
- [x] Fullbreddsskålar med jämna brädavstånd, tunnare profiler och vänsterfyllning först efter fångstanimationens landning
