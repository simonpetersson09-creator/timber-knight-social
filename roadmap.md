# Mr B Chess – roadmap (från genomgång av Yatzy, Ludo, Sudoku, Ord)

## Klart
- [x] Träbräde, ebenholts- vs träpjäser, Mr B-färger/typsnitt
- [x] Spel mot dator (3 nivåer), två spelare på en enhet, ångra

## Design
- [ ] Startsida i Yatzy-layout: logga+tagline, kort för pågående matcher/inbjudningar, runda guldknappar (språk, inställningar, vänner), personlig statistik
- [ ] Färgkoder: grön = din tur, guld = motståndarens tur, violett = väntande inbjudan
- [ ] Fler nivåer (5–7) som låses upp efter vinster (Sudoku-modell)
- [ ] Klocka/tidskontroll, bondeförvandling med val, remi-erbjudande, ge upp
- [ ] Ljud + haptik vid drag/slag/schack/matt, konfetti vid vinst
- [ ] Surfplatta (stående/liggande), safe-area, orientering utan omstart
- [ ] Sparade partier (upp till 3 lokala + 3 online), återuppta

## Språk
- [ ] 40 språk, automatiskt enhetsspråk, språkmeny med flaggor, iOS-behörighetstexter översatta

## Identitet och profil
- [ ] Anonym enhetsidentitet (ingen inloggning), namn (unikt, max 20), spelarnummer om namnlös
- [ ] Avatar/profilbild, land med flagga

## Vänner
- [ ] Vänförfrågan efter spelad onlinematch + vänkod/QR
- [ ] Acceptera/avböj/dra tillbaka/ta bort, online-status
- [ ] Vänstatistik: vinst/förlust/remi, senaste partier

## Online
- [ ] Bjud in vän direkt (push), lobbykod + QR + /join-länk, korsade inbjudningar slås ihop
- [ ] Snabbmatch med sökning, faller tillbaka på dator om ingen hittas
- [ ] Servern avgör alla drag (fusksäkert), realtid + återanslutning
- [ ] Tidsgränser: inaktiv → påminnelse → förlust; ge upp påverkar inte statistik
- [ ] Inbjudan gäller 24 h, lobby 6 h; snabbchatt med fasta fraser
- [ ] Väntrum (valfritt, som Yatzy)

## Statistik och topplistor
- [ ] Partier, vinster, remi, vinstprocent, svit
- [ ] Världs-/landstopplista per år, veckans topp 10, månadens flitigaste
- [ ] Veckopris topp 3 (3/2/1 XP) – beslut

## XP och butik (beslut)
- [ ] XP via belöningsannons, butik med bräd-/pjäsdesigner, ramar, vinsteffekter
- [ ] Värva vän-belöning

## Notiser
- [ ] Push iOS (APNs) + Android (Firebase), fråga vid onlinespel – inte vid start
- [ ] Inställningar: din tur, påminnelser, spelpåminnelse efter 7 dagar (kl 18, max 1/vecka)

## Annonser (egna AdMob-ID:n för Chess)
- [ ] 1 App Open (appstart), bara på startsidan, aldrig mitt i parti, kräver minst 1 avslutat parti
- [ ] Mellanannons vid avslut av parti (en per parti, väntar tills stängd)
- [ ] Banner under lokala partier (beslut)
- [ ] Belöningsannons för XP/ledtråd (beslut)
- [ ] Google-samtycke (UMP) + iOS ATT, ändra annonsval i inställningar, inga annonser på webben
- [ ] app-ads.txt på juridiksidan

## Övrigt
- [ ] Be om betyg: efter 5 partier, sedan +10, +20, max 3 gånger
- [ ] Nyhets-/uppdateringsrutor (en i taget)
- [ ] Inställningar: namn, avatar, land, språk, haptik, notiser, annonsval, nollställ statistik, radera mina data
- [ ] Android bakåtknapp (stänger rutor först, minimerar på start), svep bakåt på iOS
- [ ] Webben visar bara App Store/Google Play-sida (/join och /legal öppna)
- [ ] Ny juridiksida "Mr B Chess Legal" (support, integritet, villkor, app-ads.txt)
- [ ] App-ikon 1024 px + splash, iOS/Android-paket, butikslänkar
- [ ] Admin: PIN-skyddad statistik (enheter iOS/Android, 30 dagar, annonser, fel), testenheter exkluderas
- [ ] Analys + felrapportering
