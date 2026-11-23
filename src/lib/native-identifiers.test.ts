import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Native release identifiers", () => {
  it("uses se.shiningdays.mrbchess for both iOS configurations", () => {
    const project = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
    const identifiers = [...project.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((match) => match[1]);
    expect(identifiers).toEqual(["se.shiningdays.mrbchess", "se.shiningdays.mrbchess"]);
  });

  it("uses com.mrb.chess for the Android namespace and application ID", () => {
    const gradle = readFileSync("android/app/build.gradle", "utf8");
    expect(gradle).toMatch(/namespace = "com\.mrb\.chess"/);
    expect(gradle).toMatch(/applicationId "com\.mrb\.chess"/);
    expect(readFileSync("capacitor.config.ts", "utf8")).toMatch(/appId: "com\.mrb\.chess"/);
    expect(readFileSync("android/app/src/main/java/com/mrb/chess/MainActivity.java", "utf8")).toContain("package com.mrb.chess;");
  });

  it("uses the Firebase Android app registered for com.mrb.chess", () => {
    const config = JSON.parse(readFileSync("android/app/google-services.json", "utf8")) as {
      client: Array<{ client_info: { mobilesdk_app_id: string; android_client_info: { package_name: string } } }>;
    };
    const client = config.client.find((entry) => entry.client_info.android_client_info.package_name === "com.mrb.chess");
    expect(client?.client_info.mobilesdk_app_id).toBe("1:200792968276:android:c970382b593d75f897f1c1");
  });
});