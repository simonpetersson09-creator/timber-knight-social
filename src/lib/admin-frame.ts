export function isAdminDocumentPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Allows the admin document to be embedded by the separate MrB Admin Hub origin. */
export function adminFrameHeaders(source: Headers): Headers {
  const headers = new Headers(source);
  headers.delete("x-frame-options");
  const directives = (headers.get("content-security-policy") ?? "")
    .split(";")
    .map((directive) => directive.trim())
    .filter((directive) => directive && !directive.toLowerCase().startsWith("frame-ancestors"));
  directives.push("frame-ancestors *");
  headers.set("content-security-policy", directives.join("; "));
  return headers;
}
