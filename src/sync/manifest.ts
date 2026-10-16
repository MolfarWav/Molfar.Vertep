/**
 * Sync between devices, the pure part: the manifest format, which paths may
 * travel, and the three-way comparison of local / base / remote that decides
 * what a push uploads, what a pull applies and what collides.
 * Design: .fork/handoff/sync/DESIGN.md.
 */
import { skippedInWorkspace, PLAIN_PRIVATE } from "../profile-backup.js";

export const SYNC_FORMAT = 1;
export const SYNC_KIND = "molfar-vertep-sync";
export const SYNC_PRODUCT = "molfar-vertep";
/** The sealed keys' entry; never a real file path. */
export const SECRETS_PATH = "secrets.enc";

export interface FileEntry {
  /** sha256 of the plain bytes, hex */
  h: string;
  /** size of the plain bytes */
  s: number;
}

export interface AppSource {
  git: string;
  ref: string;
}

export interface SyncManifest {
  format: number;
  kind: typeof SYNC_KIND;
  product: typeof SYNC_PRODUCT;
  rev: number;
  parent: number;
  engine: string;
  pushedAt: string;
  device: { id: string; name: string };
  /** `w/<workspace path>`, `p/<private name>`, and SECRETS_PATH */
  files: Record<string, FileEntry>;
  apps: Record<string, AppSource>;
  /** hash of the plain key bundle, so a device can tell whether its keys differ */
  secretsPlain?: string;
}

export interface SyncHead {
  format: number;
  kind: typeof SYNC_KIND;
  product: typeof SYNC_PRODUCT;
  rev: number;
  device: { id: string; name: string };
  pushedAt: string;
  engine: string;
}

export interface Scope {
  /** Molfar's chats and projects */
  agent: boolean;
  /** pictures, sound, video */
  media: boolean;
  /** the sealed keys */
  secrets: boolean;
}

export const DEFAULT_SCOPE: Scope = { agent: true, media: true, secrets: false };

export class SyncError extends Error {
  constructor(message: string, readonly status: 400 | 403 | 404 | 409 | 413 | 422 | 502 = 400) {
    super(message);
  }
}

const MEDIA = /\.(png|jpe?g|webp|gif|avif|bmp|ico|svg|mp3|ogg|oga|opus|wav|flac|m4a|aac|mp4|webm|mov|mkv)$/i;
const HASH = /^[a-f0-9]{64}$/;
const SEGMENT = /^[^/\\:*?"<>|\0]+$/;

/** A workspace path that may travel: plain segments, nothing the profile
 *  backup leaves out, and never git internals. */
export function workspacePathOk(rel: string): boolean {
  if (!rel || rel.length > 400 || rel.startsWith("/") || rel.endsWith("/")) return false;
  const segs = rel.split("/");
  for (const s of segs) {
    if (!SEGMENT.test(s) || s === "." || s === ".." || s.trim() !== s || s.endsWith(".")) return false;
    if ([...s].some((ch) => ch.charCodeAt(0) < 32)) return false;
    // names Windows gives to devices
    if (/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(s)) return false;
  }
  if (segs[0] === ".git" || segs.includes(".git")) return false;
  return !skippedInWorkspace(rel);
}

/** A manifest key that may travel. */
export function syncPathOk(key: string): boolean {
  if (key === SECRETS_PATH) return true;
  if (key.startsWith("p/")) return (PLAIN_PRIVATE as readonly string[]).includes(key.slice(2));
  if (key.startsWith("w/")) return workspacePathOk(key.slice(2));
  return false;
}

/** Whether this device's switches take part in `key`. */
export function inScope(key: string, scope: Scope): boolean {
  if (key === SECRETS_PATH) return scope.secrets;
  if (!key.startsWith("w/")) return true;
  const rel = key.slice(2);
  const head = rel.split("/")[0];
  if (!scope.agent && (head === "agent" || head === "projects")) return false;
  if (!scope.media && MEDIA.test(rel)) return false;
  return true;
}

/** Check a manifest read from a store; throws on anything malformed. */
export function checkManifest(raw: unknown): SyncManifest {
  const m = raw as Partial<SyncManifest> | null;
  if (!m || typeof m !== "object" || m.kind !== SYNC_KIND || typeof m.format !== "number") throw new SyncError("the sync folder holds something that is not a Molfar Vertep sync", 422);
  if (m.format > SYNC_FORMAT) throw new SyncError("this sync was written by a newer Molfar Vertep: update this one first", 422);
  if (!Number.isInteger(m.rev) || (m.rev as number) < 1) throw new SyncError("the sync manifest is damaged", 422);
  const files: Record<string, FileEntry> = {};
  for (const [key, e] of Object.entries(m.files && typeof m.files === "object" ? m.files : {})) {
    if (!syncPathOk(key)) throw new SyncError(`the sync holds a path this engine refuses: ${key.slice(0, 120)}`, 422);
    const v = e as Partial<FileEntry> | null;
    if (!v || typeof v.h !== "string" || !HASH.test(v.h) || !Number.isSafeInteger(v.s) || (v.s as number) < 0) throw new SyncError("the sync manifest is damaged", 422);
    files[key] = { h: v.h, s: v.s as number };
  }
  const apps: Record<string, AppSource> = {};
  for (const [id, a] of Object.entries(m.apps && typeof m.apps === "object" ? m.apps : {})) {
    const v = a as Partial<AppSource> | null;
    if (/^[a-z0-9][a-z0-9_-]*$/i.test(id) && v && typeof v.git === "string" && typeof v.ref === "string") apps[id] = { git: v.git.slice(0, 500), ref: v.ref.slice(0, 200) };
  }
  const dev = (m.device ?? {}) as Partial<SyncManifest["device"]>;
  return {
    format: m.format, kind: SYNC_KIND, product: SYNC_PRODUCT,
    rev: m.rev as number,
    parent: Number.isInteger(m.parent) ? (m.parent as number) : 0,
    engine: typeof m.engine === "string" ? m.engine.slice(0, 40) : "",
    pushedAt: typeof m.pushedAt === "string" ? m.pushedAt.slice(0, 40) : "",
    device: { id: typeof dev.id === "string" ? dev.id.slice(0, 40) : "", name: typeof dev.name === "string" ? dev.name.slice(0, 60) : "" },
    files, apps,
    ...(typeof m.secretsPlain === "string" && HASH.test(m.secretsPlain) ? { secretsPlain: m.secretsPlain } : {}),
  };
}

export function checkHead(raw: unknown): SyncHead {
  const h = raw as Partial<SyncHead> | null;
  if (!h || typeof h !== "object" || h.kind !== SYNC_KIND || typeof h.format !== "number" || !Number.isInteger(h.rev) || (h.rev as number) < 1) {
    throw new SyncError("the sync folder holds something that is not a Molfar Vertep sync", 422);
  }
  if (h.format > SYNC_FORMAT) throw new SyncError("this sync was written by a newer Molfar Vertep: update this one first", 422);
  const dev = (h.device ?? {}) as Partial<SyncHead["device"]>;
  return {
    format: h.format, kind: SYNC_KIND, product: SYNC_PRODUCT, rev: h.rev as number,
    device: { id: typeof dev.id === "string" ? dev.id.slice(0, 40) : "", name: typeof dev.name === "string" ? dev.name.slice(0, 60) : "" },
    pushedAt: typeof h.pushedAt === "string" ? h.pushedAt.slice(0, 40) : "",
    engine: typeof h.engine === "string" ? h.engine.slice(0, 40) : "",
  };
}

// ---------- the three-way comparison ----------

export type Files = Record<string, FileEntry | undefined>;

const same = (a: FileEntry | undefined, b: FileEntry | undefined): boolean => (a ? !!b && a.h === b.h : !b);

export interface Plan {
  /** changed here only: a push uploads (or deletes) them */
  up: string[];
  /** changed on the remote only: a pull applies them */
  down: string[];
  /** changed on both sides to different contents */
  conflicts: string[];
  /** changed on both sides to the same contents: only the base moves */
  agreed: string[];
}

/** Compare local, base and remote for the keys in scope. Keys out of scope
 *  are not looked at: they neither upload nor apply nor collide. */
export function plan(local: Files, base: Files, remote: Files, scope: Scope): Plan {
  const out: Plan = { up: [], down: [], conflicts: [], agreed: [] };
  const keys = new Set([...Object.keys(local), ...Object.keys(base), ...Object.keys(remote)]);
  for (const k of [...keys].sort()) {
    if (!inScope(k, scope)) continue;
    const l = local[k];
    const b = base[k];
    const r = remote[k];
    const localChanged = !same(l, b);
    const remoteChanged = !same(r, b);
    if (!localChanged && !remoteChanged) continue;
    if (localChanged && !remoteChanged) out.up.push(k);
    else if (!localChanged && remoteChanged) out.down.push(k);
    else if (same(l, r)) out.agreed.push(k);
    else out.conflicts.push(k);
  }
  return out;
}

/** The file list a push writes: this device's files for what is in its
 *  scope, the remote's for what is not (switching something off never
 *  deletes it on the remote). */
export function pushedFiles(local: Files, remote: Files, scope: Scope): Record<string, FileEntry> {
  const out: Record<string, FileEntry> = {};
  for (const [k, e] of Object.entries(remote)) if (e && !inScope(k, scope)) out[k] = e;
  for (const [k, e] of Object.entries(local)) if (e && inScope(k, scope)) out[k] = e;
  return out;
}

// ---------- conflict groups ----------

export interface ConflictGroup {
  /** stable id: the files' common stem */
  id: string;
  /** the app the files belong to, when they are app files */
  app: string | null;
  /** a short readable label */
  label: string;
  /** the thing's own name, read from this device's copy when there is one */
  title?: string;
  files: string[];
}

/** One chat is `x.jsonl` + `x.meta.json`: group files by their path without
 *  extensions so the user answers once per thing, not per file. */
export function groupConflicts(keys: string[]): ConflictGroup[] {
  const groups = new Map<string, ConflictGroup>();
  for (const k of keys) {
    let stem = k;
    if (k.startsWith("w/")) {
      const rel = k.slice(2);
      const slash = rel.lastIndexOf("/");
      const name = rel.slice(slash + 1);
      const dot = name.indexOf(".", 1);
      stem = `w/${rel.slice(0, slash + 1)}${dot > 0 ? name.slice(0, dot) : name}`;
    }
    let g = groups.get(stem);
    if (!g) {
      const rel = stem.startsWith("w/") ? stem.slice(2) : stem;
      const app = /^apps\/([^/]+)\//.exec(rel)?.[1] ?? null;
      const label = stem === SECRETS_PATH ? "keys" : stem.startsWith("p/") ? stem.slice(2) : app ? rel.slice(`apps/${app}/`.length).replace(/^data\//, "") : rel;
      g = { id: stem, app, label, files: [] };
      groups.set(stem, g);
    }
    g.files.push(k);
  }
  return [...groups.values()];
}
