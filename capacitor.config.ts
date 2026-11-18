import type { CapacitorConfig } from "@capacitor/cli";

// The native app loads the published Mr B Chess site (it needs the server for online play).
const config: CapacitorConfig = {
  appId: "com.simonpetersson.mrbchess",
  appName: "Mr B Chess",
  webDir: "public",
  server: { url: "https://mrbchess.lovable.app", cleartext: false },
  ios: { contentInset: "never" },
  plugins: { PushNotifications: { presentationOptions: ["badge", "sound", "alert"] } },
};

export default config;
