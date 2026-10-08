import fs from "node:fs";
import path from "node:path";
import { agentReadDenied, safeResolve } from "../paths.js";
import { viewValue } from "./json-edit.js";

/**
 * Things the composer's "@" can name besides files: the characters, lorebooks
 * and presets of the user's apps, found by their display name. Picking one puts
 * the file's workspace path in the message, so the agent works on exactly that
 * file instead of searching for it by name.
 *
 * The layout is the Roleplay app's (`docs/DATA-FORMATS.md` there), looked for in
 * every app folder, so a copy or a fork of it is found too. Names come from the
 * files themselves; each file is parsed once per change (mtime + size cache).
 */

export type MentionKind = "character" | "lorebook" | "preset";

export interface Mentionable {
  kind: MentionKind;
  name: string;
  /** Workspace-relative path of the file. */
  path: string;
  app: string;
}

const cache = new Map<string, { stamp: string; name: string }>();
const CACHE_MAX = 5000;
const FILES_MAX = 3000;

function nameOf(abs: string, fallback: string): string {
  let st: fs.Stats;
  try {
    st = fs.statSync(abs);
  } catch {
    return fallback;
  }
  const stamp = `${st.mtimeMs}:${st.size}`;
  const hit = cache.get(abs);
  if (hit?.stamp === stamp) return hit.name;
  let name = fallback;
  try {
    const doc = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown> | null;
    // cards are written flat; an imported V2/V3 card may still nest under data
    const raw = doc?.name ?? (doc?.data as Record<string, unknown> | undefined)?.name;
    if (typeof raw === "string" && raw.trim()) name = raw.trim().slice(0, 120);
  } catch {
    /* unreadable or broken: listed by its id */
  }
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(abs, { stamp, name });
  return name;
}

/** Real directories / files only: a symlink is never followed out of the workspace. */
function entries(dir: string, want: "dir" | "file"): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => (want === "dir" ? e.isDirectory() : e.isFile()))
      .map((e) => e.name)
      // `_` files are AI-only templates, `.` ones are not data
      .filter((n) => !n.startsWith("_") && !n.startsWith("."));
  } catch {
    return [];
  }
}

const KIND_ORDER: Record<MentionKind, number> = { character: 0, lorebook: 1, preset: 2 };

/** Characters, lorebooks and presets whose name or id contains `query`. */
export function findMentionables(root: string, appsDir: string, query: string, limit = 30): Mentionable[] {
  const q = query.trim().toLowerCase();
  const out: Mentionable[] = [];
  let seen = 0;
  const consider = (kind: MentionKind, app: string, abs: string, id: string) => {
    if (seen++ >= FILES_MAX) return;
    const name = nameOf(abs, id);
    if (q && !name.toLowerCase().includes(q) && !id.toLowerCase().includes(q)) return;
    out.push({ kind, name, app, path: path.relative(root, abs).split(path.sep).join("/") });
  };
  for (const app of entries(appsDir, "dir")) {
    const data = path.join(appsDir, app, "data");
    for (const id of entries(path.join(data, "characters"), "dir")) {
      const card = path.join(data, "characters", id, "card.json");
      if (fs.existsSync(card) && fs.lstatSync(card).isFile()) consider("character", app, card, id);
    }
    for (const f of entries(path.join(data, "lorebooks"), "file")) {
      if (f.endsWith(".json")) consider("lorebook", app, path.join(data, "lorebooks", f), f.slice(0, -5));
    }
    for (const f of entries(path.join(data, "presets"), "file")) {
      if (f.endsWith(".json")) consider("preset", app, path.join(data, "presets", f), f.slice(0, -5));
    }
  }
  out.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name));
  return out.slice(0, limit);
}

export interface MentionedFile {
  path: string;
  text: string;
  truncated: boolean;
}

/** Files a message pointed at with "@path". Workspace-relative only, read
 *  through the same guard every file tool uses, capped so a message naming
 *  a huge file does not become the whole context. Anything that is not a
 *  readable text file in the workspace is left as the plain text it is. */
const MENTION_BYTES = 64 * 1024;
const MENTION_JSON_BYTES = 16 * 1024;
const jsonShape = (buf: Buffer): string | null => {
  try {
    return viewValue(JSON.parse(buf.toString("utf8")), "/", 0);
  } catch {
    return null;
  }
};
export function mentionedFiles(root: string, message: string): MentionedFile[] {
  const out: MentionedFile[] = [];
  const seen = new Set<string>();
  // a path ends at whitespace; trailing sentence punctuation is not part of it
  for (const m of message.matchAll(/(?:^|\s)@([A-Za-z0-9._][A-Za-z0-9._/\-]{0,255})/g)) {
    const rel = (m[1] ?? "").replace(/[.,;:!?)\]]+$/, "");
    if (!rel || seen.has(rel) || out.length >= 10) continue;
    seen.add(rel);
    if (agentReadDenied(rel)) continue;
    let abs: string;
    try {
      abs = safeResolve(root, rel);
    } catch {
      continue;
    }
    try {
      if (!fs.statSync(abs).isFile()) continue;
      const buf = fs.readFileSync(abs);
      // a binary file is not context, it is noise
      if (buf.subarray(0, 4096).includes(0)) continue;
      // A big JSON file (a character card with its base64 portrait, a
      // lorebook) is mostly not what the message is about: its first 64 KB
      // would cost a whole context for a cut-off avatar. Its shape names the
      // fields and their sizes, which is what the next json_get needs.
      const shape = buf.length > MENTION_JSON_BYTES && /\.json$/i.test(rel) ? jsonShape(buf) : null;
      if (shape) {
        out.push({ path: rel, text: `${shape}\n(${Math.round(buf.length / 1024)} KB of JSON: only its shape is shown. Read the fields you need with json_get, several pointers in one call.)`, truncated: false });
        continue;
      }
      const truncated = buf.length > MENTION_BYTES;
      out.push({ path: rel, text: buf.subarray(0, MENTION_BYTES).toString("utf8"), truncated });
    } catch { /* unreadable: the model still has the path */ }
  }
  return out;
}
