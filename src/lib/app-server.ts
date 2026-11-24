import { Capacitor, CapacitorHttp } from "@capacitor/core";

export const APP_SERVER_ORIGIN = "https://timber-knight-social.lovable.app";

/** A bundled Capacitor app has no local server functions, so RPC goes to the published backend. */
export function bundledServerUrl(
  input: RequestInfo | URL,
  currentOrigin = typeof location === "undefined" ? "" : location.origin,
): string | null {
  if (!Capacitor.isNativePlatform() || currentOrigin === APP_SERVER_ORIGIN) return null;
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return url.startsWith("/") && !url.startsWith("//") ? `${APP_SERVER_ORIGIN}${url}` : null;
}

export function appLink(path: string, currentOrigin = typeof location === "undefined" ? "" : location.origin): string {
  const bundledNative = Capacitor.isNativePlatform() && currentOrigin !== APP_SERVER_ORIGIN;
  return `${bundledNative ? APP_SERVER_ORIGIN : currentOrigin}${path}`;
}

export function isAppLink(value: string, currentOrigin = typeof location === "undefined" ? "" : location.origin): boolean {
  try {
    const url = new URL(value);
    // Non-http native schemes report origin as "null" even though they have a real scheme and host.
    const origin = url.origin === "null" ? `${url.protocol}//${url.host}` : url.origin;
    return origin === currentOrigin || origin === appLink("", currentOrigin);
  } catch {
    return false;
  }
}

export const appServerFetch: typeof fetch = async (input, init) => {
  const url = bundledServerUrl(input);
  if (!url) return fetch(input, init);

  const headers = Object.fromEntries(new Headers(init?.headers).entries());
  // Native HTTP has no browser origin. The server still authenticates every call with device credentials.
  headers["origin"] = APP_SERVER_ORIGIN;
  const body = init?.body;
  const response = await CapacitorHttp.request({
    url,
    method: init?.method ?? "GET",
    headers,
    data: typeof body === "string" ? body : undefined,
    responseType: "text",
    connectTimeout: 20_000,
    readTimeout: 30_000,
  });
  const responseBody = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
  return new Response(responseBody, { status: response.status, headers: response.headers });
};
