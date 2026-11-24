const encoder = new TextEncoder();
const HUB_TOKEN_PATTERN = /^(\d{1,16})\.([0-9a-fA-F]{64})$/;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/** Verifies an MrB Admin Hub token without cookies or browser storage. */
export async function verifyHubToken(token: string, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!secret) return false;
  const match = HUB_TOKEN_PATTERN.exec(token);
  if (!match) return false;
  const expText = match[1]!;
  const signature = match[2]!;
  const exp = Number(expText);
  if (!Number.isSafeInteger(exp) || exp <= now) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  // Web Crypto performs the MAC comparison in constant time.
  return crypto.subtle.verify(
    "HMAC",
    key,
    hexToBytes(signature) as BufferSource,
    encoder.encode(`mrb-hub:${expText}`),
  );
}
