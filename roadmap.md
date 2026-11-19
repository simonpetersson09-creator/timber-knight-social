# Mr B Chess – roadmap (från genomgång av Yatzy, Ludo, Sudoku, Ord)

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
- [x] Mellanannons vid avslut av parti (en per parti, väntar tills stängd)
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
- [ ] Egna AdMob-ID:n för Chess (testannonser tills dess)
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
