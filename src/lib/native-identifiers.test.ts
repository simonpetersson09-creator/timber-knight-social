import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Native release identifiers", () => {
  it("uses se.shiningdays.mrbchess for both iOS configurations", () => {
    const project = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
    const identifiers = [...project.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((match) => match[1]);
    expect(identifiers).toEqual(["se.shiningdays.mrbchess", "se.shiningdays.mrbchess"]);
  });

  it("uses se.shiningdays.mrbchess for Android too", () => {
    const gradle = readFileSync("android/app/build.gradle", "utf8");
    expect(gradle).toMatch(/applicationId "se\.shiningdays\.mrbchess"/);
  });
});