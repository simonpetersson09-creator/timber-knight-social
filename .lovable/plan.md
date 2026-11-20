# Google AdMob för iOS

## Genomförande
- Konfigurera Chess egna iOS-ID:n för App-ID, App Open och Interstitial. Googles test-ID:n används i utveckling och de rikta enhets-ID:na först i release.
- Ersätt den enkla annonskoden med en gemensam, timeout-säker livscykel för UMP/ATT, initiering, förladdning, visning, stängning och fel. Offline och no-fill släpper alltid spelaren vidare.
- App Open: startsidan, minst ett avslutat parti, tidigast efter 12 sekunder, högst fyra timmar gammal annons, 60 sekunders no-fill-spärr och omprövning före visning så sent laddade annonser aldrig visas över spel.
- Interstitial: förladdas vid matchslut men visas först när spelaren trycker ”Spela igen”. Resultat, statistik och sparade data slutförs direkt och oberoende av annonsen. En annons per match och aldrig under aktivt spel.
- Gemensamt: två minuters spärr mellan helskärmsannonser samt skydd mot dubbla, överlappande och sena visningar. Koppla appstart/återkomst via Capacitors livscykel.
- Skapa iOS-projektet och lägg till `GADApplicationIdentifier`, ATT-text och Googles SKAdNetwork-lista via ett idempotent konfigurationsskript. Synka Capacitor utan att ändra schackmotor, regler eller matchresultat.

## Tester och gränsdragning
- Lägg till rena regeltester för varje tidsgräns, matchdeduplicering, spelavbrott, utgångna annonser, offline/no-fill och överlapp.
- Kör samtliga Vitest-tester, TypeScript/build-kontroller och Capacitors iOS-synk.
- Webben kan bara verifiera att annonser inte stör navigation eller spel. Verklig UMP/ATT-ruta, testannons, stängning, bakgrundsväxling och no-fill återstår att kontrollera på fysisk iPhone/TestFlight; Xcode-bygge kan inte verifieras utan macOS.
