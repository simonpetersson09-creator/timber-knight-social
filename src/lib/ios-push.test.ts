import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iOS push via Firebase FCM", () => {
  it("bundles GoogleService-Info.plist for se.shiningdays.mrbchess", () => {
    const plist = readFileSync("ios/App/App/GoogleService-Info.plist", "utf8");
    expect(plist).toMatch(/<key>BUNDLE_ID<\/key>\s*<string>se\.shiningdays\.mrbchess<\/string>/);
    expect(plist).toMatch(/<key>PROJECT_ID<\/key>\s*<string>mr-b-chess<\/string>/);
    const project = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
    expect(project).toContain("GoogleService-Info.plist in Resources");
    expect(project).toContain("productName = FirebaseMessaging;");
  });

  it("hands the APNs token to Firebase and reports the FCM token", () => {
    const delegate = readFileSync("ios/App/App/AppDelegate.swift", "utf8");
    expect(delegate).toContain("FirebaseApp.configure()");
    expect(delegate).toContain("Messaging.messaging().apnsToken = deviceToken");
    expect(delegate).toMatch(/post\(name: \.capacitorDidRegisterForRemoteNotifications, object: token\)/);
  });
});
