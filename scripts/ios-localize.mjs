// Localizes iOS system permission prompts (camera + App Tracking) for every app language.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// [camera, tracking]
export const PROMPTS = {
  sv: ['Kameran används för att skanna en vänkod eller en kod till ett schackparti.', 'Vi ber om tillåtelse att använda enhetsidentifierare för annonsmätning och mer relevanta annonser. Du kan ändra ditt val i Inställningar.'],
  en: ['The camera is used to scan a friend code or a chess game code.', 'We ask permission to use device identifiers for ad measurement and more relevant ads. You can change your choice in Settings.'],
  es: ['La cámara se usa para escanear un código de amigo o de una partida de ajedrez.', 'Pedimos permiso para usar identificadores del dispositivo para medir anuncios y mostrar anuncios más relevantes. Puedes cambiar tu elección en Ajustes.'],
  fr: ['L’appareil photo sert à scanner un code ami ou le code d’une partie d’échecs.', 'Nous demandons l’autorisation d’utiliser les identifiants de l’appareil pour mesurer les publicités et proposer des annonces plus pertinentes. Vous pouvez modifier votre choix dans Réglages.'],
  it: ['La fotocamera viene usata per scansionare un codice amico o il codice di una partita a scacchi.', 'Chiediamo il permesso di usare gli identificatori del dispositivo per misurare gli annunci e mostrare annunci più pertinenti. Puoi cambiare la tua scelta in Impostazioni.'],
  de: ['Die Kamera wird verwendet, um einen Freundescode oder den Code einer Schachpartie zu scannen.', 'Wir bitten um Erlaubnis, Gerätekennungen für Werbemessung und relevantere Werbung zu nutzen. Du kannst deine Wahl in den Einstellungen ändern.'],
  fi: ['Kameraa käytetään kaverikoodin tai shakkipelin koodin skannaamiseen.', 'Pyydämme lupaa käyttää laitetunnisteita mainosten mittaamiseen ja osuvampiin mainoksiin. Voit muuttaa valintaasi Asetuksissa.'],
  nb: ['Kameraet brukes til å skanne en vennekode eller en kode til et sjakkparti.', 'Vi ber om tillatelse til å bruke enhetsidentifikatorer for annonsemåling og mer relevante annonser. Du kan endre valget ditt i Innstillinger.'],
  da: ['Kameraet bruges til at scanne en vennekode eller en kode til et skakparti.', 'Vi beder om tilladelse til at bruge enhedsidentifikatorer til annoncemåling og mere relevante annoncer. Du kan ændre dit valg i Indstillinger.'],
  nl: ['De camera wordt gebruikt om een vriendcode of de code van een schaakpartij te scannen.', 'We vragen toestemming om apparaat-ID’s te gebruiken voor advertentiemeting en relevantere advertenties. Je kunt je keuze wijzigen in Instellingen.'],
  'pt-BR': ['A câmera é usada para escanear um código de amigo ou de uma partida de xadrez.', 'Pedimos permissão para usar identificadores do dispositivo para medir anúncios e exibir anúncios mais relevantes. Você pode mudar sua escolha em Ajustes.'],
  'pt-PT': ['A câmara é usada para digitalizar um código de amigo ou de uma partida de xadrez.', 'Pedimos autorização para usar identificadores do dispositivo para medir anúncios e mostrar anúncios mais relevantes. Pode alterar a sua escolha em Definições.'],
  pl: ['Aparat służy do skanowania kodu znajomego lub kodu partii szachów.', 'Prosimy o zgodę na używanie identyfikatorów urządzenia do pomiaru reklam i bardziej trafnych reklam. Możesz zmienić wybór w Ustawieniach.'],
  tr: ['Kamera, bir arkadaş kodunu veya satranç oyunu kodunu taramak için kullanılır.', 'Reklam ölçümü ve daha alakalı reklamlar için cihaz tanımlayıcılarını kullanmak üzere izin istiyoruz. Seçiminizi Ayarlar’dan değiştirebilirsiniz.'],
  ru: ['Камера используется для сканирования кода друга или кода шахматной партии.', 'Мы просим разрешение использовать идентификаторы устройства для измерения рекламы и более релевантных объявлений. Вы можете изменить выбор в Настройках.'],
  uk: ['Камера використовується для сканування коду друга або коду шахової партії.', 'Ми просимо дозвіл використовувати ідентифікатори пристрою для вимірювання реклами та релевантніших оголошень. Ви можете змінити вибір у Параметрах.'],
  cs: ['Fotoaparát slouží ke skenování kódu přítele nebo kódu šachové partie.', 'Žádáme o povolení používat identifikátory zařízení k měření reklam a relevantnějším reklamám. Volbu můžete změnit v Nastavení.'],
  sk: ['Fotoaparát slúži na skenovanie kódu priateľa alebo kódu šachovej partie.', 'Žiadame o povolenie používať identifikátory zariadenia na meranie reklám a relevantnejšie reklamy. Voľbu môžete zmeniť v Nastaveniach.'],
  sl: ['Kamera se uporablja za skeniranje kode prijatelja ali kode šahovske partije.', 'Prosimo za dovoljenje za uporabo identifikatorjev naprave za merjenje oglasov in ustreznejše oglase. Izbiro lahko spremenite v Nastavitvah.'],
  hr: ['Kamera se koristi za skeniranje koda prijatelja ili koda šahovske partije.', 'Tražimo dopuštenje za korištenje identifikatora uređaja za mjerenje oglasa i relevantnije oglase. Svoj izbor možete promijeniti u Postavkama.'],
  hu: ['A kamera egy barátkód vagy egy sakkjátszma kódjának beolvasására szolgál.', 'Engedélyt kérünk az eszközazonosítók használatára a hirdetések méréséhez és relevánsabb hirdetésekhez. A választásodat a Beállításokban módosíthatod.'],
  ro: ['Camera este folosită pentru a scana un cod de prieten sau codul unei partide de șah.', 'Cerem permisiunea de a folosi identificatorii dispozitivului pentru măsurarea reclamelor și reclame mai relevante. Îți poți schimba alegerea în Configurări.'],
  el: ['Η κάμερα χρησιμοποιείται για τη σάρωση κωδικού φίλου ή κωδικού παρτίδας σκακιού.', 'Ζητάμε άδεια να χρησιμοποιούμε αναγνωριστικά συσκευής για μέτρηση διαφημίσεων και πιο σχετικές διαφημίσεις. Μπορείτε να αλλάξετε την επιλογή σας στις Ρυθμίσεις.'],
  ca: ['La càmera s’utilitza per escanejar un codi d’amic o el codi d’una partida d’escacs.', 'Demanem permís per utilitzar identificadors del dispositiu per mesurar anuncis i mostrar anuncis més rellevants. Pots canviar la teva elecció a Configuració.'],
  id: ['Kamera digunakan untuk memindai kode teman atau kode permainan catur.', 'Kami meminta izin untuk menggunakan pengenal perangkat bagi pengukuran iklan dan iklan yang lebih relevan. Anda dapat mengubah pilihan di Pengaturan.'],
  ms: ['Kamera digunakan untuk mengimbas kod rakan atau kod permainan catur.', 'Kami meminta kebenaran untuk menggunakan pengecam peranti bagi pengukuran iklan dan iklan yang lebih relevan. Anda boleh menukar pilihan dalam Seting.'],
  vi: ['Máy ảnh được dùng để quét mã bạn bè hoặc mã ván cờ vua.', 'Chúng tôi xin phép sử dụng mã định danh thiết bị để đo lường quảng cáo và hiển thị quảng cáo phù hợp hơn. Bạn có thể thay đổi lựa chọn trong Cài đặt.'],
  ja: ['カメラはフレンドコードやチェス対局のコードを読み取るために使用します。', '広告の測定とより関連性の高い広告のために、デバイス識別子の使用許可をお願いしています。選択は「設定」でいつでも変更できます。'],
  ko: ['카메라는 친구 코드나 체스 게임 코드를 스캔하는 데 사용됩니다.', '광고 측정 및 더 관련성 높은 광고를 위해 기기 식별자 사용 권한을 요청합니다. 설정에서 언제든지 변경할 수 있습니다.'],
  th: ['กล้องใช้สำหรับสแกนรหัสเพื่อนหรือรหัสเกมหมากรุก', 'เราขออนุญาตใช้ตัวระบุอุปกรณ์เพื่อวัดผลโฆษณาและแสดงโฆษณาที่เกี่ยวข้องมากขึ้น คุณเปลี่ยนตัวเลือกได้ในการตั้งค่า'],
  hi: ['कैमरे का उपयोग किसी मित्र कोड या शतरंज खेल के कोड को स्कैन करने के लिए किया जाता है।', 'हम विज्ञापन मापन और अधिक प्रासंगिक विज्ञापनों के लिए डिवाइस पहचानकर्ताओं का उपयोग करने की अनुमति मांगते हैं। आप सेटिंग्स में अपनी पसंद बदल सकते हैं।'],
  bn: ['বন্ধুর কোড বা দাবা খেলার কোড স্ক্যান করতে ক্যামেরা ব্যবহার করা হয়।', 'বিজ্ঞাপন পরিমাপ ও আরও প্রাসঙ্গিক বিজ্ঞাপনের জন্য আমরা ডিভাইস শনাক্তকারী ব্যবহারের অনুমতি চাই। আপনি সেটিংসে আপনার পছন্দ বদলাতে পারেন।'],
  gu: ['મિત્ર કોડ અથવા શતરંજ રમતનો કોડ સ્કેન કરવા માટે કૅમેરાનો ઉપયોગ થાય છે.', 'જાહેરાત માપન અને વધુ સંબંધિત જાહેરાતો માટે અમે ઉપકરણ ઓળખકર્તાઓનો ઉપયોગ કરવાની પરવાનગી માંગીએ છીએ. તમે સેટિંગ્સમાં તમારી પસંદગી બદલી શકો છો.'],
  kn: ['ಸ್ನೇಹಿತರ ಕೋಡ್ ಅಥವಾ ಚೆಸ್ ಆಟದ ಕೋಡ್ ಅನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಲು ಕ್ಯಾಮೆರಾವನ್ನು ಬಳಸಲಾಗುತ್ತದೆ.', 'ಜಾಹೀರಾತು ಅಳೆಯಲು ಮತ್ತು ಹೆಚ್ಚು ಸಂಬಂಧಿತ ಜಾಹೀರಾತುಗಳಿಗಾಗಿ ಸಾಧನ ಗುರುತುಗಳನ್ನು ಬಳಸಲು ನಾವು ಅನುಮತಿ ಕೇಳುತ್ತೇವೆ. ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ನಿಮ್ಮ ಆಯ್ಕೆಯನ್ನು ಬದಲಾಯಿಸಬಹುದು.'],
  ml: ['സുഹൃത്തിന്റെ കോഡോ ചെസ് ഗെയിമിന്റെ കോഡോ സ്കാൻ ചെയ്യാൻ ക്യാമറ ഉപയോഗിക്കുന്നു.', 'പരസ്യ അളവെടുപ്പിനും കൂടുതൽ പ്രസക്തമായ പരസ്യങ്ങൾക്കുമായി ഉപകരണ ഐഡന്റിഫയറുകൾ ഉപയോഗിക്കാൻ ഞങ്ങൾ അനുമതി ചോദിക്കുന്നു. ക്രമീകരണങ്ങളിൽ നിങ്ങളുടെ തിരഞ്ഞെടുപ്പ് മാറ്റാം.'],
  mr: ['मित्र कोड किंवा बुद्धिबळ खेळाचा कोड स्कॅन करण्यासाठी कॅमेरा वापरला जातो.', 'जाहिरात मापन आणि अधिक संबंधित जाहिरातींसाठी आम्ही डिव्हाइस ओळखकर्ते वापरण्याची परवानगी मागतो. तुम्ही सेटिंग्जमध्ये तुमची निवड बदलू शकता.'],
  or: ['ବନ୍ଧୁ କୋଡ୍ କିମ୍ବା ଚେସ୍ ଖେଳର କୋଡ୍ ସ୍କାନ କରିବା ପାଇଁ କ୍ୟାମେରା ବ୍ୟବହୃତ ହୁଏ।', 'ବିଜ୍ଞାପନ ମାପ ଏବଂ ଅଧିକ ପ୍ରାସଙ୍ଗିକ ବିଜ୍ଞାପନ ପାଇଁ ଆମେ ଡିଭାଇସ୍ ପରିଚାୟକ ବ୍ୟବହାର କରିବାକୁ ଅନୁମତି ମାଗୁଛୁ। ଆପଣ ସେଟିଂସରେ ଆପଣଙ୍କ ପସନ୍ଦ ବଦଳାଇ ପାରିବେ।'],
  pa: ['ਦੋਸਤ ਕੋਡ ਜਾਂ ਸ਼ਤਰੰਜ ਖੇਡ ਦਾ ਕੋਡ ਸਕੈਨ ਕਰਨ ਲਈ ਕੈਮਰਾ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ।', 'ਇਸ਼ਤਿਹਾਰ ਮਾਪ ਅਤੇ ਵਧੇਰੇ ਢੁਕਵੇਂ ਇਸ਼ਤਿਹਾਰਾਂ ਲਈ ਅਸੀਂ ਡਿਵਾਈਸ ਪਛਾਣਕਰਤਿਆਂ ਦੀ ਵਰਤੋਂ ਦੀ ਇਜਾਜ਼ਤ ਮੰਗਦੇ ਹਾਂ। ਤੁਸੀਂ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਆਪਣੀ ਚੋਣ ਬਦਲ ਸਕਦੇ ਹੋ।'],
  ta: ['நண்பர் குறியீடு அல்லது சதுரங்க ஆட்டக் குறியீட்டை ஸ்கேன் செய்ய கேமரா பயன்படுத்தப்படுகிறது.', 'விளம்பர அளவீடு மற்றும் மேலும் பொருத்தமான விளம்பரங்களுக்காக சாதன அடையாளங்காட்டிகளைப் பயன்படுத்த அனுமதி கேட்கிறோம். அமைப்புகளில் உங்கள் தேர்வை மாற்றலாம்.'],
  te: ['స్నేహితుని కోడ్ లేదా చదరంగం ఆట కోడ్‌ను స్కాన్ చేయడానికి కెమెరా ఉపయోగించబడుతుంది.', 'ప్రకటనల కొలత మరియు మరింత సంబంధిత ప్రకటనల కోసం పరికర గుర్తింపులను ఉపయోగించడానికి మేము అనుమతి అడుగుతున్నాము. సెట్టింగ్‌లలో మీ ఎంపికను మార్చవచ్చు.'],
};

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
export function stringsFile([camera, tracking]) {
  return `"NSCameraUsageDescription" = "${esc(camera)}";\n"NSUserTrackingUsageDescription" = "${esc(tracking)}";\n`;
}

// Stable 24-hex ids derived from the language so re-runs are idempotent.
const hex = (s) => { let h = 0x811c9dc5; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h.toString(16).toUpperCase().padStart(8, '0'); };
const GROUP = 'C4E55A0000000000000000A1', BUILD = 'C4E55A0000000000000000B2';
const ref = (l) => `C4E55A01${hex(l)}${hex(l + '#')}`;

export function patchProject(pbx, langs) {
  if (pbx.includes(GROUP)) return pbx;
  const refs = langs.map((l) => `\t\t${ref(l)} /* ${l} */ = {isa = PBXFileReference; lastKnownFileType = text.plist.strings; name = ${JSON.stringify(l)}; path = ${JSON.stringify(l + '.lproj/InfoPlist.strings')}; sourceTree = "<group>"; };\n`).join('');
  let next = pbx.replace('/* End PBXFileReference section */', `${refs}/* End PBXFileReference section */`);
  next = next.replace('/* End PBXBuildFile section */', `\t\t${BUILD} /* InfoPlist.strings in Resources */ = {isa = PBXBuildFile; fileRef = ${GROUP} /* InfoPlist.strings */; };\n/* End PBXBuildFile section */`);
  next = next.replace(/(\t+504EC3131FED79650016851F \/\* Info\.plist \*\/,\n)/, `$1\t\t\t\t${GROUP} /* InfoPlist.strings */,\n`);
  next = next.replace('504EC30D1FED79650016851F /* Main.storyboard in Resources */,', `504EC30D1FED79650016851F /* Main.storyboard in Resources */,\n\t\t\t\t${BUILD} /* InfoPlist.strings in Resources */,`);
  const kids = langs.map((l) => `\t\t\t\t${ref(l)} /* ${l} */,\n`).join('');
  next = next.replace('/* End PBXVariantGroup section */', `\t\t${GROUP} /* InfoPlist.strings */ = {\n\t\t\tisa = PBXVariantGroup;\n\t\t\tchildren = (\n${kids}\t\t\t);\n\t\t\tname = InfoPlist.strings;\n\t\t\tsourceTree = "<group>";\n\t\t};\n/* End PBXVariantGroup section */`);
  next = next.replace(/knownRegions = \([\s\S]*?\);/, `knownRegions = (\n${['Base', ...langs].map((l) => `\t\t\t\t${JSON.stringify(l)},\n`).join('')}\t\t\t);`);
  for (const mark of [GROUP, BUILD]) if ((next.match(new RegExp(mark, 'g')) || []).length < 2) throw new Error('iOS localization patch failed');
  return next;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const dir = 'ios/App/App', proj = 'ios/App/App.xcodeproj/project.pbxproj';
  if (existsSync(proj)) {
    const langs = Object.keys(PROMPTS);
    for (const l of langs) { mkdirSync(`${dir}/${l}.lproj`, { recursive: true }); writeFileSync(`${dir}/${l}.lproj/InfoPlist.strings`, stringsFile(PROMPTS[l])); }
    writeFileSync(proj, patchProject(readFileSync(proj, 'utf8'), langs));
    console.log(`iOS permission prompts localized for ${langs.length} languages.`);
  }
}
