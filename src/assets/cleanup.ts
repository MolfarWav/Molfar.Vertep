/**
 * Clean up pictures nothing links to (issue #171): find the assets no file of
 * the user's folder mentions, move them to assets-store/.trash/ and keep them
 * there for 30 days. Manual only (Settings, Storage); never a background job.
 *
 * What protects the user's data, in order:
 *  1. The reference scan is deliberately loose: ANY 64-hex string in ANY text
 *     file of the user's folder counts as a reference (see scanText). Matching
 *     too much only keeps pictures; matching too little would lose them.
 *  2. A picture stored (or uploaded again) in the last 7 days is never touched.
 *  3. The server scans again when the user confirms; a client never says what
 *     to delete (an id list from the client can only NARROW the fresh set).
 *  4. A file the scan could not read (too large, locked) blocks the cleanup.
 *  5. Nothing is deleted: files move to the trash for 30 days and Restore puts
 *     them back under the same id.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { isDiscardDir, type UserPaths } from "../paths.js";
import { DEFAULT_LIMITS, readManifestStrict, writeManifest, type AssetLimits, type AssetRecord } from "./store.js";

export const GRACE_MS = 7 * 24 * 3600 * 1000;
export const TRASH_MS = 30 * 24 * 3600 * 1000;
/** A text file bigger than this is not read: it counts as "unreadable" and
 *  blocks the cleanup. Generous: a long chat log is some tens of MB. */
export const MAX_SCAN_FILE_BYTES = 256 * 1024 * 1024;
const BLOCK = 1024 * 1024;
const HEX64 = /^[a-f0-9]{64}$/;

/** Files that cannot hold a reference worth keeping: pictures, audio, video,
 *  archives, fonts, wasm. Everything else is read as text, whatever its name. */
const BINARY_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|ico|tiff?|heic|zip|gz|tgz|bz2|xz|7z|rar|tar|wasm|mp3|ogg|oga|opus|wav|flac|m4a|aac|mp4|webm|mov|mkv|avi|woff2?|ttf|otf|eot|pdf|exe|dll|so|dylib|bin)$/i;

export class CleanupError extends Error {
  constructor(message: string, readonly code: "skipped" | "busy" | "bad-request" | "store" = "store") {
    super(message);
  }
}

// ---------------------------------------------------------------- the scan

export interface SkippedFile {
  path: string;
  reason: "too-large" | "unreadable";
}

export interface ScanProgress {
  phase: "scan" | "verify" | "move";
  files: number;
  bytes: number;
  skipped: number;
}

interface ScanState {
  root: string;
  wanted: Set<string>;
  found: Set<string>;
  known: Map<string, { mtimeMs: number; size: number }>;
  skipped: Map<string, SkippedFile["reason"]>;
  links: Set<string>;
  files: number;
  bytes: number;
  startedAt: number;
  maxFileBytes: number;
  phase: ScanProgress["phase"];
  progress?: (p: ScanProgress) => void;
  visited: number;
}

export interface ScanResult {
  /** ids (lowercase) of the assets some file mentions */
  found: Set<string>;
  /** ids the scan looked for: the manifest at the start */
  wanted: Set<string>;
  files: number;
  bytes: number;
  skipped: SkippedFile[];
  skippedCount: number;
  links: number;
  startedAt: number;
  /** the live state, so a later pass re-reads only what changed */
  state: ScanState;
}

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const isHexCode = (c: number) => (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);

/** The reference rule. Every maximal run of hex digits is cut into every
 *  64-character window (so an id glued to other hex still counts), compared
 *  case-insensitively. The id may sit anywhere: `/v1/assets/<id>`, a bare JSON
 *  string, a URL, a markdown image, a filename. */
function scanText(text: string, wanted: Set<string>, found: Set<string>): void {
  for (const m of text.matchAll(/[0-9a-fA-F]{64,}/g)) {
    const run = m[0].toLowerCase();
    if (run.length === 64) {
      if (wanted.has(run)) found.add(run);
      continue;
    }
    for (let i = 0; i + 64 <= run.length; i++) {
      const w = run.slice(i, i + 64);
      if (wanted.has(w)) found.add(w);
    }
  }
}

async function scanFileContent(abs: string, st: ScanState): Promise<void> {
  const fh = await fsp.open(abs, "r");
  try {
    const buf = Buffer.allocUnsafe(BLOCK);
    let carry = "";
    for (;;) {
      const { bytesRead } = await fh.read(buf, 0, BLOCK, null);
      if (bytesRead === 0) break;
      const text = carry + buf.toString("latin1", 0, bytesRead);
      scanText(text, st.wanted, st.found);
      st.bytes += bytesRead;
      // a run of hex digits may continue in the next block: keep its tail
      let k = 0;
      while (k < 63 && k < text.length && isHexCode(text.charCodeAt(text.length - 1 - k))) k++;
      carry = text.slice(text.length - k);
    }
  } finally {
    await fh.close();
  }
}

/** Folders the scan does not enter. */
function skipDir(rel: string, name: string): boolean {
  if (name === ".git" || name === "node_modules" || isDiscardDir(name)) return true;
  if (rel === "assets-store" || rel === "repos" || rel === "apps/.staging" || rel === "projects/.staging") return true;
  return /^apps\/[^/]+\/dist$/.test(rel);
}

const isGone = (e: unknown) => (e as NodeJS.ErrnoException)?.code === "ENOENT" || (e as NodeJS.ErrnoException)?.code === "ENOTDIR";

function report(st: ScanState): void {
  st.progress?.({ phase: st.phase, files: st.files, bytes: st.bytes, skipped: st.skipped.size });
}

/** One walk of the user's folder. Reads every file that is new or changed
 *  since `st.known` says; returns how many it read. Links are never followed. */
async function walk(st: ScanState): Promise<number> {
  let changed = 0;
  const stack = [""];
  while (stack.length) {
    const rel = stack.pop() as string;
    const dir = rel ? path.join(st.root, ...rel.split("/")) : st.root;
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (e) {
      if (!isGone(e)) st.skipped.set(rel || ".", "unreadable");
      continue;
    }
    st.skipped.delete(rel || ".");
    for (const e of entries) {
      const child = rel ? `${rel}/${e.name}` : e.name;
      if (e.isSymbolicLink()) {
        st.links.add(child);
        continue;
      }
      if (e.isDirectory()) {
        if (!skipDir(child, e.name)) stack.push(child);
        continue;
      }
      if (!e.isFile() || BINARY_EXT.test(e.name)) continue;
      const abs = path.join(dir, e.name);
      let s: fs.Stats;
      try {
        s = await fsp.stat(abs);
      } catch (err) {
        if (!isGone(err)) st.skipped.set(child, "unreadable");
        continue;
      }
      const prev = st.known.get(child);
      // unchanged since it was read, and old enough that a write in the same
      // clock tick as that read is out of the question
      if (prev && prev.size === s.size && prev.mtimeMs === s.mtimeMs && s.mtimeMs < st.startedAt - 2500) continue;
      changed++;
      if (s.size > st.maxFileBytes) {
        st.skipped.set(child, "too-large");
        st.known.delete(child);
      } else {
        try {
          await scanFileContent(abs, st);
          st.skipped.delete(child);
          st.known.set(child, { mtimeMs: s.mtimeMs, size: s.size });
          st.files++;
        } catch (err) {
          st.known.delete(child);
          if (isGone(err)) st.skipped.delete(child);
          else st.skipped.set(child, "unreadable");
        }
      }
      report(st);
      if (++st.visited % 25 === 0) await tick();
    }
    await tick();
  }
  return changed;
}

export interface ScanOptions {
  maxFileBytes?: number;
  progress?: (p: ScanProgress) => void;
}

/** Read every text file of the user's folder for asset ids. `wanted` is the
 *  manifest as it is now; ids added later were stored later and are young. */
export async function scanReferences(p: UserPaths, opts: ScanOptions = {}): Promise<ScanResult> {
  const wanted = new Set(Object.keys(readManifestStrict(p)).map((k) => k.toLowerCase()).filter((k) => HEX64.test(k)));
  const st: ScanState = {
    root: p.root, wanted, found: new Set(), known: new Map(), skipped: new Map(), links: new Set(),
    files: 0, bytes: 0, startedAt: Date.now(), maxFileBytes: opts.maxFileBytes ?? MAX_SCAN_FILE_BYTES,
    phase: "scan", visited: 0, ...(opts.progress ? { progress: opts.progress } : {}),
  };
  await walk(st);
  return resultOf(st);
}

/** Look once more, reading only files that are new or changed since the scan
 *  began (a reference written while the scan was running). Returns how many. */
async function rescanChanged(scan: ScanResult, phase: ScanProgress["phase"]): Promise<number> {
  scan.state.phase = phase;
  const changed = await walk(scan.state);
  Object.assign(scan, resultOf(scan.state));
  return changed;
}

function resultOf(st: ScanState): ScanResult {
  const skipped = [...st.skipped].map(([p, reason]) => ({ path: p, reason }));
  return {
    found: st.found, wanted: st.wanted, files: st.files, bytes: st.bytes,
    skipped: skipped.slice(0, 50), skippedCount: skipped.length, links: st.links.size, startedAt: st.startedAt, state: st,
  };
}

// -------------------------------------------------------------- the plan

export interface PlanSample {
  id: string;
  name: string | null;
  mime: string;
  size: number;
}

export interface Plan {
  /** pictures in the store */
  total: number;
  /** some file mentions them */
  referenced: number;
  /** nothing mentions them but they were stored within the grace period */
  tooYoung: number;
  /** what a cleanup would move to the trash */
  count: number;
  bytes: number;
  sample: PlanSample[];
  scannedFiles: number;
  scannedBytes: number;
  /** files the scan could not read: while there are any, a cleanup is refused */
  skipped: SkippedFile[];
  skippedCount: number;
  links: number;
  graceDays: number;
  trashDays: number;
  at: number;
}

interface Classified {
  total: number;
  referenced: number;
  tooYoung: number;
  candidates: AssetRecord[];
}

function livePath(p: UserPaths, id: string): string {
  return path.join(p.assetsStore, id.slice(0, 2), id);
}

/** When this picture was last stored or touched: the newest of the record's
 *  times and the file's own modified time. */
function lastTouched(p: UserPaths, rec: AssetRecord): number | null {
  try {
    return Math.max(rec.createdAt || 0, rec.storedAt || 0, fs.statSync(livePath(p, rec.id)).mtimeMs);
  } catch {
    return null;
  }
}

async function classify(p: UserPaths, scan: ScanResult, now: number, graceMs: number): Promise<Classified> {
  const manifest = readManifestStrict(p);
  const out: Classified = { total: 0, referenced: 0, tooYoung: 0, candidates: [] };
  let n = 0;
  for (const [key, rec] of Object.entries(manifest)) {
    if (++n % 500 === 0) await tick();
    const id = key.toLowerCase();
    if (!HEX64.test(id) || !rec || typeof rec !== "object") continue;
    const touched = lastTouched(p, { ...rec, id });
    if (touched === null) continue; // the record has no file: nothing to move
    out.total++;
    if (scan.found.has(id)) out.referenced++;
    else if (!scan.wanted.has(id) || now - touched < graceMs) out.tooYoung++;
    else out.candidates.push({ ...rec, id });
  }
  return out;
}

function planOf(scan: ScanResult, c: Classified, now: number): Plan {
  const sample = [...c.candidates].sort((a, b) => (b.size || 0) - (a.size || 0)).slice(0, 12).map((r) => ({ id: r.id, name: r.name ?? null, mime: r.mime, size: r.size || 0 }));
  return {
    total: c.total, referenced: c.referenced, tooYoung: c.tooYoung, count: c.candidates.length,
    bytes: c.candidates.reduce((sum, r) => sum + (r.size || 0), 0), sample,
    scannedFiles: scan.files, scannedBytes: scan.bytes, skipped: scan.skipped, skippedCount: scan.skippedCount, links: scan.links,
    graceDays: GRACE_MS / 86400000, trashDays: TRASH_MS / 86400000, at: now,
  };
}

export interface CleanupOptions extends ScanOptions {
  now?: () => number;
  graceMs?: number;
}

/** What a cleanup would do now. Changes nothing. */
export async function planCleanup(p: UserPaths, opts: CleanupOptions = {}): Promise<Plan> {
  const now = opts.now ?? Date.now;
  const scan = await scanReferences(p, opts);
  await rescanChanged(scan, "verify");
  return planOf(scan, await classify(p, scan, now(), opts.graceMs ?? GRACE_MS), now());
}

// ------------------------------------------------------------ the trash

interface TrashEntry {
  record: AssetRecord;
  trashedAt: number;
}

const trashDir = (p: UserPaths) => path.join(p.assetsStore, ".trash");
const trashIndexPath = (p: UserPaths) => path.join(trashDir(p), "manifest.json");
const trashFilePath = (p: UserPaths, id: string) => path.join(trashDir(p), id.slice(0, 2), id);

/** The trash index. A missing one is empty; one that exists and cannot be read
 *  throws, so it is never overwritten with less than it held. */
function readTrash(p: UserPaths, now: number): Record<string, TrashEntry> {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(trashIndexPath(p), "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw new CleanupError(`the trash index cannot be read: ${(e as Error).message}`);
  }
  const out: Record<string, TrashEntry> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new CleanupError("the trash index is not an object");
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    const id = key.toLowerCase();
    const e = v as Partial<TrashEntry> | null;
    if (!HEX64.test(id) || !e || typeof e !== "object" || !e.record || typeof e.record !== "object") continue;
    // an entry without a usable time starts its 30 days now: never expires early
    out[id] = { record: { ...e.record, id }, trashedAt: typeof e.trashedAt === "number" && Number.isFinite(e.trashedAt) ? e.trashedAt : now };
  }
  return out;
}

function writeTrash(p: UserPaths, t: Record<string, TrashEntry>): void {
  fs.mkdirSync(trashDir(p), { recursive: true });
  const tmp = `${trashIndexPath(p)}.${process.pid}.tmp`;
  const text = `${JSON.stringify(t, null, 2)}\n`;
  fs.writeFileSync(tmp, text, "utf8");
  try {
    fs.renameSync(tmp, trashIndexPath(p));
  } catch {
    fs.writeFileSync(trashIndexPath(p), text, "utf8");
    fs.rmSync(tmp, { force: true });
  }
}

const sha256File = (file: string): string => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

export interface TrashItem {
  id: string;
  name: string | null;
  mime: string;
  size: number;
  trashedAt: number;
  expiresAt: number;
}

export interface TrashView {
  items: TrashItem[];
  count: number;
  bytes: number;
  trashDays: number;
  /** items the call just deleted because their 30 days were over */
  purged: number;
}

/** Delete what has been in the trash longer than 30 days (and index entries
 *  whose file is gone). Runs whenever the trash or the cleanup is opened. */
export function purgeExpiredTrash(p: UserPaths, now = Date.now(), ttlMs = TRASH_MS): number {
  const t = readTrash(p, now);
  let purged = 0;
  let dirty = false;
  for (const [id, e] of Object.entries(t)) {
    const file = trashFilePath(p, id);
    if (!fs.existsSync(file)) {
      delete t[id];
      dirty = true;
    } else if (now - e.trashedAt > ttlMs) {
      fs.rmSync(file, { force: true });
      delete t[id];
      purged++;
      dirty = true;
    }
  }
  if (dirty) writeTrash(p, t);
  return purged;
}

export function listTrash(p: UserPaths, now = Date.now(), ttlMs = TRASH_MS): TrashView {
  const purged = purgeExpiredTrash(p, now, ttlMs);
  const t = readTrash(p, now);
  const items = Object.entries(t)
    .map(([id, e]) => ({ id, name: e.record.name ?? null, mime: e.record.mime, size: e.record.size || 0, trashedAt: e.trashedAt, expiresAt: e.trashedAt + ttlMs }))
    .sort((a, b) => b.trashedAt - a.trashedAt);
  return { items, count: items.length, bytes: items.reduce((s, i) => s + i.size, 0), trashDays: ttlMs / 86400000, purged };
}

/** A trashed picture's bytes and record, for the thumbnail. */
export function readTrashed(p: UserPaths, id: string): { bytes: Buffer; record: AssetRecord } | null {
  const key = id.toLowerCase();
  if (!HEX64.test(key)) return null;
  const e = readTrash(p, Date.now())[key];
  if (!e) return null;
  try {
    return { bytes: fs.readFileSync(trashFilePath(p, key)), record: e.record };
  } catch {
    return null;
  }
}

/** Throw the whole trash away. The caller has the user's confirmation. */
export function emptyTrash(p: UserPaths): { removed: number; bytes: number } {
  const t = readTrash(p, Date.now());
  const items = Object.values(t);
  fs.rmSync(trashDir(p), { recursive: true, force: true });
  return { removed: items.length, bytes: items.reduce((s, e) => s + (e.record.size || 0), 0) };
}

export interface RestoreResult {
  /** moved back to the store */
  restored: string[];
  /** the same bytes were in the store again already (uploaded meanwhile): the trash copy was dropped */
  already: string[];
  /** left in the trash: the bytes differ from what the store holds under that id, or the store has no room */
  kept: string[];
  /** not in the trash (any more) */
  missing: string[];
}

/** Put pictures back under their own ids. `ids` null = everything. Safe against
 *  an upload of the same bytes in between: nothing is overwritten unless the
 *  store's own copy fails its hash. */
export function restoreFromTrash(p: UserPaths, ids: string[] | null, opts: { now?: number; limits?: AssetLimits } = {}): RestoreResult {
  const now = opts.now ?? Date.now();
  const limits = opts.limits ?? DEFAULT_LIMITS;
  const trash = readTrash(p, now);
  const manifest = readManifestStrict(p);
  const wanted = (ids ?? Object.keys(trash)).map((i) => i.toLowerCase());
  const out: RestoreResult = { restored: [], already: [], kept: [], missing: [] };
  let used = Object.values(manifest).reduce((s, r) => s + (r.size || 0), 0);
  let manifestDirty = false;
  let trashDirty = false;
  for (const id of new Set(wanted)) {
    const e = trash[id];
    const tfile = trashFilePath(p, id);
    if (!HEX64.test(id) || !e || !fs.existsSync(tfile)) {
      if (e) {
        delete trash[id];
        trashDirty = true;
      }
      out.missing.push(id);
      continue;
    }
    const lfile = livePath(p, id);
    const live = manifest[id];
    if (fs.existsSync(lfile)) {
      if (sha256File(lfile) === id) {
        // the store already holds these exact bytes again
        if (sha256File(tfile) !== id) {
          out.kept.push(id);
          continue;
        }
        if (!live) {
          manifest[id] = { ...e.record, id, storedAt: now };
          used += e.record.size || 0;
          manifestDirty = true;
        } else if (live.apps?.length) {
          const apps = [...new Set([...live.apps, ...(e.record.apps ?? [])])];
          manifest[id] = { ...live, apps };
          manifestDirty = true;
        }
        fs.rmSync(tfile, { force: true });
        delete trash[id];
        trashDirty = true;
        out.already.push(id);
        continue;
      }
      // the store's copy fails its own hash: the trash copy replaces it, if it is sound
      if (sha256File(tfile) !== id) {
        out.kept.push(id);
        continue;
      }
    } else if (!live && used + (e.record.size || 0) > limits.maxTotalBytes) {
      out.kept.push(id);
      continue;
    }
    try {
      fs.mkdirSync(path.dirname(lfile), { recursive: true });
      fs.renameSync(tfile, lfile);
    } catch {
      out.kept.push(id);
      continue;
    }
    if (!live) used += e.record.size || 0;
    // storedAt = now: a picture just restored is young, so a cleanup that is
    // running right now cannot trash it again
    manifest[id] = live ? { ...live, storedAt: now } : { ...e.record, id, storedAt: now };
    manifestDirty = true;
    delete trash[id];
    trashDirty = true;
    out.restored.push(id);
  }
  // the pictures first: an index that lags only leaves an entry without a file
  if (manifestDirty) writeManifest(p, manifest);
  if (trashDirty) writeTrash(p, trash);
  return out;
}

// ------------------------------------------------------------ the cleanup

export interface CleanResult {
  /** moved to the trash */
  trashed: number;
  bytes: number;
  /** candidates that were no longer unreferenced or old enough when their turn came */
  spared: number;
  /** moved, then a late change showed a link to them: put back */
  putBack: number;
  plan: Plan;
}

export interface CleanOptions extends CleanupOptions {
  /** narrow the cleanup to these ids; never widens it */
  ids?: string[];
  /** go on although some files could not be read */
  overrideSkipped?: boolean;
}

/** Move to the trash every picture that is, right now, mentioned by no file and
 *  older than the grace period. Scans again itself. */
export async function cleanAssets(p: UserPaths, opts: CleanOptions = {}): Promise<CleanResult> {
  const now = opts.now ?? Date.now;
  const graceMs = opts.graceMs ?? GRACE_MS;
  purgeExpiredTrash(p, now());
  const scan = await scanReferences(p, opts);
  await rescanChanged(scan, "verify");
  if (scan.skippedCount > 0 && !opts.overrideSkipped) {
    throw new CleanupError(`${scan.skippedCount} file(s) could not be read, so a reference to a picture could be hiding in them. Nothing was moved.`, "skipped");
  }
  const c = await classify(p, scan, now(), graceMs);
  const plan = planOf(scan, c, now());
  let candidates = c.candidates;
  if (opts.ids) {
    const only = new Set(opts.ids.map((i) => i.toLowerCase()));
    candidates = candidates.filter((r) => only.has(r.id));
  }
  const result: CleanResult = { trashed: 0, bytes: 0, spared: 0, putBack: 0, plan };
  const moved = new Set<string>();
  scan.state.phase = "move";
  for (let i = 0; i < candidates.length; i += 100) {
    const batch = trashBatch(p, candidates.slice(i, i + 100).map((r) => r.id), scan, now(), graceMs);
    for (const id of batch.moved) moved.add(id);
    result.trashed += batch.moved.length;
    result.bytes += batch.bytes;
    result.spared += batch.spared;
    opts.progress?.({ phase: "move", files: scan.files, bytes: scan.bytes, skipped: scan.skippedCount });
    await tick();
  }
  if (moved.size) {
    // a file written while the pictures were moving: if it mentions one of
    // them, that one goes back
    await rescanChanged(scan, "verify");
    const late = [...moved].filter((id) => scan.found.has(id));
    if (late.length) {
      const back = restoreFromTrash(p, late, { now: now() });
      const undone = [...back.restored, ...back.already];
      result.putBack = undone.length;
      result.trashed -= undone.length;
      for (const id of undone) result.bytes -= c.candidates.find((r) => r.id === id)?.size ?? 0;
    }
  }
  return result;
}

/** One synchronous step (no await inside, so no upload can slip in between the
 *  checks and the moves): re-read the store, re-check every picture, move. */
function trashBatch(p: UserPaths, ids: string[], scan: ScanResult, now: number, graceMs: number): { moved: string[]; bytes: number; spared: number } {
  const manifest = readManifestStrict(p);
  const trash = readTrash(p, now);
  const plan: Array<{ id: string; rec: AssetRecord }> = [];
  let spared = 0;
  for (const id of ids) {
    const rec = manifest[id];
    const touched = rec ? lastTouched(p, { ...rec, id }) : null;
    if (!rec || touched === null || scan.found.has(id) || !scan.wanted.has(id) || now - touched < graceMs) {
      spared++;
      continue;
    }
    plan.push({ id, rec: { ...rec, id } });
  }
  if (!plan.length) return { moved: [], bytes: 0, spared };
  // the index first: a crash after this leaves entries whose file is still in
  // the store, which the next purge drops; a crash after the moves leaves
  // pictures that are in the trash and can be restored
  for (const { id, rec } of plan) trash[id] = { record: rec, trashedAt: now };
  writeTrash(p, trash);
  const moved: string[] = [];
  let bytes = 0;
  for (const { id, rec } of plan) {
    const target = trashFilePath(p, id);
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.renameSync(livePath(p, id), target);
      moved.push(id);
      bytes += rec.size || 0;
    } catch {
      delete trash[id];
      spared++;
    }
  }
  if (moved.length < plan.length) writeTrash(p, trash);
  for (const id of moved) delete manifest[id];
  if (moved.length) writeManifest(p, manifest);
  return { moved, bytes, spared };
}

// ------------------------------------------------------------ the summary

export interface StorageSummary {
  store: { count: number; bytes: number; limitBytes: number };
  trash: { count: number; bytes: number; trashDays: number };
  graceDays: number;
}

export function storageSummary(p: UserPaths, limits: AssetLimits = DEFAULT_LIMITS): StorageSummary {
  const records = Object.values(readManifestStrict(p));
  const trash = listTrash(p);
  return {
    store: { count: records.length, bytes: records.reduce((s, r) => s + (r.size || 0), 0), limitBytes: limits.maxTotalBytes },
    trash: { count: trash.count, bytes: trash.bytes, trashDays: trash.trashDays },
    graceDays: GRACE_MS / 86400000,
  };
}

// ------------------------------------------------------------ the jobs

export interface CleanupJob {
  id: number;
  kind: "plan" | "clean";
  running: boolean;
  progress: ScanProgress;
  startedAt: string;
  finishedAt?: string;
  error?: { message: string; code: CleanupError["code"] };
  result?: Plan | CleanResult;
}

/** One job per account at a time; the shell polls it. */
export class CleanupJobs {
  private jobs = new Map<string, CleanupJob>();
  private seq = 0;

  get(username: string): CleanupJob | null {
    return this.jobs.get(username) ?? null;
  }

  busy(username: string): boolean {
    return !!this.jobs.get(username)?.running;
  }

  start(username: string, kind: CleanupJob["kind"], work: (progress: (p: ScanProgress) => void) => Promise<Plan | CleanResult>): CleanupJob {
    if (this.busy(username)) throw new CleanupError("a cleanup is already running", "busy");
    const job: CleanupJob = { id: ++this.seq, kind, running: true, progress: { phase: "scan", files: 0, bytes: 0, skipped: 0 }, startedAt: new Date().toISOString() };
    this.jobs.set(username, job);
    void (async () => {
      try {
        job.result = await work((pr) => {
          job.progress = pr;
        });
      } catch (e) {
        job.error = { message: (e as Error).message, code: e instanceof CleanupError ? e.code : "store" };
      } finally {
        job.running = false;
        job.finishedAt = new Date().toISOString();
      }
    })();
    return job;
  }
}
