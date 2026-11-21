import { describe, expect, it } from "vitest";
import { claimModuleReload, isModuleLoadError } from "./module-recovery";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe("module load recovery", () => {
  it("recognizes Safari's module import failure", () => {
    expect(isModuleLoadError(new Error("Importing a module script failed."))).toBe(true);
  });

  it("recognizes Chromium and Firefox dynamic import failures", () => {
    expect(isModuleLoadError(new TypeError("Failed to fetch dynamically imported module: /settings.js"))).toBe(true);
    expect(isModuleLoadError(new TypeError("error loading dynamically imported module"))).toBe(true);
  });

  it("does not reload for unrelated application errors", () => {
    expect(isModuleLoadError(new Error("Network request failed"))).toBe(false);
  });

  it("allows only one automatic reload for the same address", () => {
    const storage = memoryStorage();
    expect(claimModuleReload("https://example.test/settings", storage)).toBe(true);
    expect(claimModuleReload("https://example.test/settings", storage)).toBe(false);
    expect(claimModuleReload("https://example.test/friends", storage)).toBe(true);
  });

  it("fails safely when browser storage is unavailable", () => {
    const storage = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
    expect(claimModuleReload("https://example.test/settings", storage)).toBe(false);
  });
});
