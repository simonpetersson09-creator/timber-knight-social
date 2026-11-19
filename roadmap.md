# Mr B Chess – roadmap (från genomgång av Yatzy, Ludo, Sudoku, Ord)

## Klart
- [x] Startsida i Yatzy-stil, färgkoder, 6 nivåer med upplåsning, schackklocka, bondeförvandling, remi, ge upp
- [x] Ljud, vibration, konfetti, surfplatta stående/liggande, upp till 3 sparade partier
- [x] 40 språk med automatiskt enhetsspråk och språkmeny
- [x] Träbräde, ebenholts- vs träpjäser, Mr B-färger/typsnitt
- [x] Spel mot dator (3 nivåer), två spelare på en enhet, ångra

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
- [ ] Väntrum (valfritt, som Yatzy)

## Statistik och topplistor
- [x] Partier, vinster, remi, vinstprocent, svit
- [x] Världs-/landstopplista per år, veckans topp 10, månadens flitigaste
- [ ] Veckopris topp 3 (3/2/1 XP) – beslut

## XP och butik (beslut)
- [ ] XP via belöningsannons, butik med bräd-/pjäsdesigner, ramar, vinsteffekter
- [ ] Värva vän-belöning

## Notiser
- [x] Push iOS (APNs) + Android (Firebase), fråga vid onlinespel – inte vid start
- [x] Inställningar: din tur, påminnelser, spelpåminnelse efter 7 dagar (kl 18, max 1/vecka)

## Annonser (egna AdMob-ID:n för Chess)
- [x] 1 App Open (appstart), bara på startsidan, aldrig mitt i parti, kräver minst 1 avslutat parti
- [x] Mellanannons vid avslut av parti (en per parti, väntar tills stängd)
- [ ] Banner under lokala partier (beslut)
- [ ] Belöningsannons för XP/ledtråd (beslut)
- [x] Google-samtycke (UMP) + iOS ATT, ändra annonsval i inställningar, inga annonser på webben
- [x] app-ads.txt på juridiksidan

## Övrigt
- [x] Be om betyg: efter 5 partier, sedan +10, +20, max 3 gånger
- [ ] Nyhets-/uppdateringsrutor (en i taget)
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
- [x] Standardnamn "Spelare 1234", unika namn, land väljs automatiskt
- [x] Drottning bredvid kungen i ikonen
- [x] Snabbspel: 3 nivåer + förklarad schackklocka, inget pjäsval (värd/spelare = mahogny)
- [x] Startsidans kort och Spela med vän-sidan som Yatzy
- [x] Inställningar: inget ljud, inga spelade/vinster; profilbild verifierad
