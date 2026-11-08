/**
 * Read access between apps (issue #310, step 2). An app's manifest may say which files of ANOTHER app it wants to
 * read (`reads`); the user allows or refuses that once, in the shell, and can revoke it any time. A plugin of the
 * reading app, with the "peer" permission, then gets `host.peer.read/list/stat(app, path)` for exactly the declared
 * paths of an app the user allowed. Read only: nothing here writes anywhere.
 *
 * Why the decision lives outside the workspace: the workspace is writable by the agent, the apps and a non-admin
 * shell, so a grant kept there could be written by the app that wants it. The record is kept next to the credentials
 * (`UserPaths.appReads`), and only the shell's routes change it.
 *
 * The worker (src/plugins/sandbox-worker.mjs) holds a copy of the path matcher; test/app-reads.test.ts drives both
 * with the same cases.
 */
import fs from "node:fs";
import path from "node:path";

/** What an app asks to read: files of one other app, as patterns relative to that app's data folder. */
export interface AppRead {
  /** The other app's id (the folder name under apps/). */
  app: string;
  /** Patterns like `characters/*\/card.json`: segments of [A-Za-z0-9._-] and `*` (any characters inside one segment). */
  paths: string[];
  /** One sentence for the consent dialog: what the app does with it. */
  why: string;
}

export const MAX_READ_APPS = 4;
export const MAX_READ_PATHS = 10;
const APP_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const SEGMENT = /^[A-Za-z0-9._*-]{1,80}$/;

/** A pattern is relative, at most 6 segments, no empty or dot-only segment (so no `..`), no backslash. */
export function validPattern(p: unknown): p is string {
  if (typeof p !== "string" || p.length === 0 || p.length > 160) return false;
  const segs = p.split("/");
  if (segs.length > 6) return false;
  return segs.every((s) => SEGMENT.test(s) && !/^\.+$/.test(s));
}

/** The manifest's `reads`, cleaned: bad entries are dropped, never repaired. */
export function parseReads(raw: unknown): AppRead[] {
  if (!Array.isArray(raw)) return [];
  const out: AppRead[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const { app, paths, why } = r as { app?: unknown; paths?: unknown; why?: unknown };
    if (typeof app !== "string" || !APP_ID.test(app) || out.some((o) => o.app === app)) continue;
    const good = Array.isArray(paths) ? [...new Set(paths.filter(validPattern))].slice(0, MAX_READ_PATHS) : [];
    if (!good.length) continue;
    out.push({ app, paths: good, why: typeof why === "string" ? why.replace(/\s+/g, " ").trim().slice(0, 200) : "" });
    if (out.length >= MAX_READ_APPS) break;
  }
  return out;
}

const segRegex = (seg: string): RegExp => new RegExp("^" + seg.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");

/** Does this relative path (posix, no leading slash) match a pattern segment by segment? */
export function patternMatches(pattern: string, rel: string): boolean {
  const ps = pattern.split("/");
  const rs = rel.split("/");
  return ps.length === rs.length && ps.every((s, i) => segRegex(s).test(rs[i]!));
}

/** The names a listing of folder `dir` may show: those that begin a path some pattern allows. `dir` "" is the root. */
export function listAllowed(patterns: string[], dir: string, names: string[]): string[] {
  const d = dir === "" ? [] : dir.split("/");
  return names.filter((n) =>
    patterns.some((p) => {
      const ps = p.split("/");
      return ps.length > d.length && d.every((x, i) => segRegex(ps[i]!).test(x)) && segRegex(ps[d.length]!).test(n);
    }),
  );
}

/** A relative path as a plugin may give it: posix, no leading slash, no `.`/`..`/empty segments, no backslash or NUL. */
export function cleanRel(rel: unknown): string | null {
  if (typeof rel !== "string" || rel.length > 300 || /[\\\0]/.test(rel)) return null;
  const s = rel.replace(/^\/+/, "").replace(/\/+$/, "");
  if (s === "") return "";
  const segs = s.split("/");
  return segs.every((x) => x !== "" && x !== "." && x !== "..") ? segs.join("/") : null;
}

// ---------- the user's decisions ----------

export type ReadState = "granted" | "denied" | "ask";

/** One decision: for which patterns the user said yes or no, and when. */
export interface GrantRecord {
  decided: "granted" | "denied";
  paths: string[];
  at: number;
}
/** appId -> peer app id -> the decision. */
export type Grants = Record<string, Record<string, GrantRecord>>;

export function readGrants(file: string): Grants {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: Grants = {};
    for (const [app, peers] of Object.entries(raw as Record<string, unknown>)) {
      if (!APP_ID.test(app) || !peers || typeof peers !== "object" || Array.isArray(peers)) continue;
      for (const [peer, rec] of Object.entries(peers as Record<string, unknown>)) {
        const r = rec as Partial<GrantRecord> | null;
        if (!APP_ID.test(peer) || !r || (r.decided !== "granted" && r.decided !== "denied") || !Array.isArray(r.paths)) continue;
        (out[app] ??= {})[peer] = { decided: r.decided, paths: r.paths.filter(validPattern), at: typeof r.at === "number" ? r.at : 0 };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeGrants(file: string, grants: Grants): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(grants, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/** Records the user's answer for one declared read. The patterns are the ones shown in the dialog: a later manifest
 *  that asks for more is a new question. */
export function setGrant(file: string, appId: string, decl: AppRead, granted: boolean, now = Date.now()): void {
  const grants = readGrants(file);
  (grants[appId] ??= {})[decl.app] = { decided: granted ? "granted" : "denied", paths: [...decl.paths], at: now };
  writeGrants(file, grants);
}

/** Forget what one app was allowed to read (the app was removed or renamed). */
export function forgetGrants(file: string, appId: string): void {
  const grants = readGrants(file);
  if (!grants[appId]) return;
  delete grants[appId];
  writeGrants(file, grants);
}

/** An app was renamed: its own decisions follow it, and anything allowed to be read FROM the old name is forgotten
 *  (a new app that takes the old name must not inherit the access). */
export function moveGrants(file: string, from: string, to: string): void {
  const grants = readGrants(file);
  if (grants[from]) { grants[to] = grants[from]!; delete grants[from]; }
  for (const peers of Object.values(grants)) delete peers[from];
  writeGrants(file, grants);
}

/** Forget what was allowed to be read FROM an app that was removed, so a new app of that name starts unasked. */
export function forgetPeer(file: string, peer: string): void {
  const grants = readGrants(file);
  let changed = false;
  for (const peers of Object.values(grants)) if (peers[peer]) { delete peers[peer]; changed = true; }
  if (changed) writeGrants(file, grants);
}

/** The state of one declared read: a decision counts only while it covers every path the manifest asks for now. */
export function readState(decl: AppRead, rec: GrantRecord | undefined): ReadState {
  if (!rec) return "ask";
  const covers = decl.paths.every((p) => rec.paths.includes(p));
  if (!covers) return "ask";
  return rec.decided;
}

/** What a plugin of `appId` may read: the allowed peers that are installed, with their data folder and patterns. */
export interface PeerMount {
  app: string;
  root: string;
  allow: string[];
}

export function peerMounts(appId: string, reads: AppRead[] | undefined, grants: Grants, appsDir: string): PeerMount[] {
  const out: PeerMount[] = [];
  for (const decl of reads ?? []) {
    if (decl.app === appId || readState(decl, grants[appId]?.[decl.app]) !== "granted") continue;
    const root = path.join(appsDir, decl.app, "data");
    if (!fs.existsSync(path.join(appsDir, decl.app, "manifest.json"))) continue;
    out.push({ app: decl.app, root, allow: decl.paths });
  }
  return out;
}
