import type { CapacitorConfig } from "@capacitor/cli";

// Default builds keep online play through the published site. CAPACITOR_OFFLINE=1 bundles the
// complete client locally so computer games, rules and saved games also open without internet.
const offline = process.env.CAPACITOR_OFFLINE === "1";
const config: CapacitorConfig = {
  appId: "com.simonpetersson.mrbchess",
  appName: "Mr B Chess",
  webDir: offline ? ".output/public" : "public",
  server: offline ? undefined : { url: "https://timber-knight-social.lovable.app", cleartext: false },
  ios: { contentInset: "never" },
  plugins: { PushNotifications: { presentationOptions: ["badge", "sound", "alert"] } },
};

export default config;
