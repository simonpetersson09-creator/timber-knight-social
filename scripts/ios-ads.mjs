import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const IOS_ADMOB_APP_ID = 'ca-app-pub-7448540924654868~9129867558';
export const ATT_COPY = 'Vi ber om tillåtelse att använda enhetsidentifierare för annonsmätning och mer relevanta annonser. Du kan ändra ditt val i Inställningar.';

// Google's iOS SKAdNetwork identifiers, reused from the verified Mr B Yatzy configuration.
export const SKADNETWORK_IDS = [
  '22mmun2rn5.skadnetwork', '2fnua5tdw4.skadnetwork', '2u9pt9hc89.skadnetwork', '3qcr597p9d.skadnetwork',
  '3qy4746246.skadnetwork', '3rd42ekr43.skadnetwork', '3sh42y64q3.skadnetwork', '4468km3ulz.skadnetwork',
  '44jx6755aq.skadnetwork', '47vhws6wlr.skadnetwork', '4dzt52r2t5.skadnetwork', '4fzdc2evr5.skadnetwork',
  '578prtvx9j.skadnetwork', '7ug5zh24hu.skadnetwork', '8c4e2ghe7u.skadnetwork', '8s468mfl3y.skadnetwork',
  '97r2b46745.skadnetwork', '9t245vhmpl.skadnetwork', 'a2p9lx4jpn.skadnetwork', 'c3frkrj4fj.skadnetwork',
  'c6k4g5qg8m.skadnetwork', 'cp8zw746q7.skadnetwork', 'cstr6suwn9.skadnetwork', 'e5fvkxwrpn.skadnetwork',
  'f38h382jlk.skadnetwork', 'gta9lk7p23.skadnetwork', 'hs6bdukanm.skadnetwork', 'k674qkevps.skadnetwork',
  'kbd757ywx3.skadnetwork', 'kbmxgpxpgc.skadnetwork', 'klf5c3l5u5.skadnetwork', 'ludvb6z3bs.skadnetwork',
  'mlmmfzh3r3.skadnetwork', 'n38lu8286q.skadnetwork', 'p78axxw29g.skadnetwork', 'ppxm28t8ap.skadnetwork',
  's39g8k73mm.skadnetwork', 'su67r6k2v3.skadnetwork', 't38b2kh725.skadnetwork', 'tl55sbb4fm.skadnetwork',
  'uw77j35x4d.skadnetwork', 'v4nxqhlyqp.skadnetwork', 'v72qych5uu.skadnetwork', 'v9wttpbfk9.skadnetwork',
  'vutu7akeur.skadnetwork', 'wg4vff78zm.skadnetwork', 'wzmmz9fp6w.skadnetwork', 'y5ghdn5j9k.skadnetwork',
  'yclnxrl5pm.skadnetwork', 'ydx93a7ass.skadnetwork',
];

function upsertString(plist, key, value) {
  const tag = `<key>${key}</key>`;
  const entry = `  ${tag}\n  <string>${value}</string>\n`;
  if (plist.includes(tag)) return plist.replace(new RegExp(`(<key>${key}</key>\\s*)<string>[^<]*</string>`), `$1<string>${value}</string>`);
  return plist.replace(/<\/dict>\s*<\/plist>/, `${entry}</dict>\n</plist>`);
}

function upsertSkAdNetworks(plist) {
  const entries = SKADNETWORK_IDS.map((id) => `    <dict>\n      <key>SKAdNetworkIdentifier</key>\n      <string>${id}</string>\n    </dict>\n`).join('');
  const expression = /<key>SKAdNetworkItems<\/key>\s*(?:<array\s*\/>|<array>([\s\S]*?)<\/array>)/;
  const match = plist.match(expression);
  if (!match) return plist.replace(/<\/dict>\s*<\/plist>/, `  <key>SKAdNetworkItems</key>\n  <array>\n${entries}  </array>\n</dict>\n</plist>`);
  const existing = new Set([...(match[1] ?? '').matchAll(/<key>SKAdNetworkIdentifier<\/key>\s*<string>\s*([^<\s]+)\s*<\/string>/g)].map((item) => item[1].toLowerCase()));
  const missing = SKADNETWORK_IDS.filter((id) => !existing.has(id));
  if (!missing.length) return plist;
  const additions = missing.map((id) => `    <dict>\n      <key>SKAdNetworkIdentifier</key>\n      <string>${id}</string>\n    </dict>\n`).join('');
  return plist.replace(expression, `<key>SKAdNetworkItems</key>\n  <array>${match[1] ?? ''}\n${additions}  </array>`);
}

export function configureAds(plist) {
  let next = upsertString(plist, 'GADApplicationIdentifier', IOS_ADMOB_APP_ID);
  next = upsertString(next, 'NSUserTrackingUsageDescription', ATT_COPY);
  return upsertSkAdNetworks(next);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const path = 'ios/App/App/Info.plist';
  if (existsSync(path)) {
    const configured = configureAds(readFileSync(path, 'utf8'));
    writeFileSync(path, configured);
    for (const required of ['GADApplicationIdentifier', 'NSUserTrackingUsageDescription', 'SKAdNetworkItems', ...SKADNETWORK_IDS]) {
      if (!configured.includes(required)) throw new Error(`iOS ad configuration missing: ${required}`);
    }
    console.log(`iOS AdMob, ATT and ${SKADNETWORK_IDS.length} SKAdNetwork IDs configured.`);
  }
}
