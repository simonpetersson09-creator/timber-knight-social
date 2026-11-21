const MODULE_RELOAD_KEY = "mrbchess:module-reload";

type RecoveryStorage = Pick<Storage, "getItem" | "setItem">;

/** Browsers use different messages when a route's JavaScript module cannot be imported. */
export function isModuleLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|importing a module script failed|failed to load module script|load failed for module/i.test(message);
}

/** Allows one full reload per address, preventing a broken module from causing a reload loop. */
export function claimModuleReload(href: string, storage: RecoveryStorage): boolean {
  try {
    if (storage.getItem(MODULE_RELOAD_KEY) === href) return false;
    storage.setItem(MODULE_RELOAD_KEY, href);
    return true;
  } catch {
    return false;
  }
}
