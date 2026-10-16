/**
 * This device's files as a sync sees them: a scan of the workspace and the
 * plain private files into manifest entries (hashes cached by size and
 * mtime), and the careful writes a pull makes.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PLAIN_PRIVATE, SECRET_FILES } from "../profile-backup.js";
import type { UserPaths } from "../paths.js";
import { type FileEntry, SECRETS_PATH, SyncError, workspacePathOk } from "./manifest.js";
import type { HashCache } from "./state.js";

export const sha256 = (b: Uint8Array | string): string => crypto.createHash("sha256").update(b).digest("hex");

export interface LocalScan {
  files: Record<string, FileEntry>;
  /** manifest key -> absolute path on disk */
  where: Record<string, string>;
  /** hash of the plain key bundle, or undefined when there are no keys */
  secretsPlain?: string;
  cache: HashCache;
}

const credDirOf = (p: UserPaths): string => path.dirname(p.auth);

/** Where a manifest key lives on this device; null for the sealed keys. */
export function diskPath(p: UserPaths, key: string): string | null {
  if (key.startsWith("w/")) return path.join(p.root, ...key.slice(2).split("/"));
  if (key.startsWith("p/")) return path.join(credDirOf(p), key.slice(2));
  return null;
}

export function scanLocal(p: UserPaths, cache: HashCache): LocalScan {
  const files: Record<string, FileEntry> = {};
  const where: Record<string, string> = {};
  const next: HashCache = {};
  const add = (key: string, abs: string) => {
    let st: fs.Stats;
    try {
      st = fs.statSync(abs);
    } catch {
      return;
    }
    const hit = cache[key];
    let h: string;
    if (hit && hit.s === st.size && hit.m === st.mtimeMs) h = hit.h;
    else {
      try {
        h = sha256(fs.readFileSync(abs));
      } catch {
        return; // gone or locked between the listing and the read
      }
    }
    next[key] = { s: st.size, m: st.mtimeMs, h };
    files[key] = { h, s: st.size };
    where[key] = abs;
  };
  const walk = (rel: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(rel ? path.join(p.root, rel) : p.root, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const child = rel ? `${rel}/${e.name}` : e.name;
      if (e.isSymbolicLink() || !workspacePathOk(child)) continue;
      if (e.isDirectory()) walk(child);
      else if (e.isFile()) add(`w/${child}`, path.join(p.root, child));
    }
  };
  walk("");
  for (const name of PLAIN_PRIVATE) {
    const abs = path.join(credDirOf(p), name);
    if (fs.existsSync(abs)) add(`p/${name}`, abs);
  }
  const bundle = readSecretBundle(p);
  return { files, where, cache: next, ...(bundle ? { secretsPlain: bundleHash(bundle) } : {}) };
}

/** The key files as they are on disk, or null when there are none. */
export function readSecretBundle(p: UserPaths): Record<string, Buffer> | null {
  const out: Record<string, Buffer> = {};
  for (const name of SECRET_FILES) {
    const f = path.join(credDirOf(p), name);
    try {
      out[name] = fs.readFileSync(f);
    } catch { /* not there */ }
  }
  return Object.keys(out).length ? out : null;
}

export function bundleHash(bundle: Record<string, Buffer>): string {
  const h = crypto.createHash("sha256");
  for (const name of Object.keys(bundle).sort()) h.update(name).update("\0").update(bundle[name]!).update("\0");
  return h.digest("hex");
}

/** No part of `abs` below `root` may be a link: a pull writes only real
 *  folders the engine made. */
function insideWithoutLinks(root: string, abs: string): boolean {
  const rel = path.relative(root, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return false;
  let cur = root;
  for (const seg of rel.split(path.sep).slice(0, -1)) {
    cur = path.join(cur, seg);
    try {
      if (fs.lstatSync(cur).isSymbolicLink()) return false;
    } catch {
      return true; // the rest does not exist yet: mkdir makes real folders
    }
  }
  try {
    if (fs.lstatSync(abs).isSymbolicLink()) return false;
  } catch { /* new file */ }
  return true;
}

/** Write one pulled file in place (temp file + rename), or delete it. */
export function applyFile(p: UserPaths, key: string, body: Uint8Array | null): void {
  if (key === SECRETS_PATH) throw new SyncError("keys are applied separately");
  const abs = diskPath(p, key);
  const root = key.startsWith("w/") ? p.root : credDirOf(p);
  if (!abs || !insideWithoutLinks(root, abs)) throw new SyncError(`refusing to write ${key.slice(0, 120)}`, 422);
  if (body === null) {
    fs.rmSync(abs, { force: true });
    // empty folders a deletion leaves behind go too, up to the root
    let dir = path.dirname(abs);
    while (dir !== root && dir.startsWith(root)) {
      try {
        fs.rmdirSync(dir);
      } catch {
        break;
      }
      dir = path.dirname(dir);
    }
    return;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.sync-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(tmp, body, key.startsWith("p/") ? { mode: 0o600 } : {});
  try {
    fs.renameSync(tmp, abs);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
}

/** Keep the version a conflict choice replaces: data/backups/sync-conflicts.
 *  Folders older than 30 days are removed on the way. */
export function conflictsDir(dataDir: string, username: string): string {
  const root = path.join(dataDir, "backups", "sync-conflicts");
  try {
    for (const e of fs.readdirSync(root)) {
      const f = path.join(root, e);
      if (Date.now() - fs.statSync(f).mtimeMs > 30 * 24 * 3600 * 1000) fs.rmSync(f, { recursive: true, force: true });
    }
  } catch { /* none yet */ }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return path.join(root, `${username}-${stamp}`);
}

export function keepCopy(dir: string, key: string, body: Uint8Array): void {
  const rel = key.startsWith("w/") ? key.slice(2) : key.replace(/^p\//, "private/");
  const to = path.join(dir, ...rel.split("/"));
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, body);
}
