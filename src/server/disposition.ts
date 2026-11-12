/**
 * A Content-Disposition value for a file name that came from a user (an asset, a project).
 * A header value must be Latin-1 and carry no control characters, so a name with a dash like "—"
 * or a letter outside Latin-1 made the whole response fail. The plain `filename` is an ASCII
 * fallback; browsers read `filename*` (RFC 5987) first and show the real name.
 */
export function contentDisposition(kind: "inline" | "attachment", name: string): string {
  const clean = name.replace(/[\x00-\x1f\x7f]/g, "").trim() || "file";
  const fallback = clean.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "") || "file";
  const encoded = encodeURIComponent(clean).replace(/['()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${kind}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
