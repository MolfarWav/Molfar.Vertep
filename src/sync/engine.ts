/**
 * Push and pull: the git-like sync between devices (GitHub #38).
 * Design: .fork/handoff/sync/DESIGN.md.
 *
 * Push uploads what changed here since this device's base, then a new
 * manifest, then head.json last; it is refused when the store moved on since
 * (pull first). Pull downloads what changed there into a staging folder,
 * checks every hash, then writes; files changed on both sides wait for the
 * user's choice per group, and the version not kept is saved under
 * data/backups/sync-conflicts.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { readInstallSource, writeInstallSource, outsideCode } from "../apps/update.js";
import { openSecrets, sealSecrets, ProfileError } from "../profile-backup.js";
import type { UserPaths } from "../paths.js";
import { applyFile, bundleHash, conflictsDir, diskPath, keepCopy, readSecretBundle, scanLocal, sha256 } from "./local.js";
import {
  type ConflictGroup, type FileEntry, type Files, type SyncHead, type SyncManifest,
  SECRETS_PATH, SYNC_FORMAT, SYNC_KIND, SYNC_PRODUCT, SyncError,
  checkHead, checkManifest, groupConflicts, inScope, plan, pushedFiles,
} from "./manifest.js";
import { type SyncState, readCache, readState, writeCache, writeState } from "./state.js";
import type { SyncStore } from "./store.js";

export interface Progress {
  phase: "scan" | "remote" | "upload" | "download" | "apply" | "finish";
  done: number;
  total: number;
  bytes: number;
}

export interface SyncContext {
  dataDir: string;
  username: string;
  paths: UserPaths;
  engine: string;
  store: SyncStore;
  progress?: (p: Progress) => void;
}

export class ConflictError extends SyncError {
  constructor(readonly groups: ConflictGroup[], readonly rev: number) {
    super("files changed on both devices: choose which version to keep", 409);
  }
}

const credDir = (p: UserPaths): string => path.dirname(p.auth);

// ---------- blobs: one tag byte, then the body (gzip when it pays) ----------

const RAW = 0;
const GZIP = 1;

export function encodeBlob(body: Uint8Array): Uint8Array {
  if (body.length > 256) {
    const z = zlib.gzipSync(body, { level: 6 });
    if (z.length < body.length * 0.9) return Buffer.concat([Buffer.from([GZIP]), z]);
  }
  return Buffer.concat([Buffer.from([RAW]), body]);
}

export function decodeBlob(blob: Uint8Array, expect: FileEntry): Buffer {
  const tag = blob[0];
  const rest = Buffer.from(blob.subarray(1));
  let body: Buffer;
  try {
    if (tag === RAW) body = rest;
    else if (tag === GZIP) body = zlib.gunzipSync(rest, { maxOutputLength: Math.max(expect.s, 1) + 1 });
    else throw new Error("unknown");
  } catch {
    throw new SyncError("a file in the sync is damaged: push again from the device that has it", 422);
  }
  if (body.length !== expect.s || sha256(body) !== expect.h) throw new SyncError("a file in the sync does not match its record: push again from the device that has it", 422);
  return body;
}

async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const run = async () => {
    while (i < items.length) await fn(items[i++]!);
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, run));
}

// ---------- what the three sides hold ----------

/** Files as compared: the sealed keys count by the hash of their plain
 *  bundle (sealing is random, so two seals of the same keys differ). */
function compareRemote(m: SyncManifest | null): Files {
  if (!m) return {};
  const out: Files = { ...m.files };
  delete out[SECRETS_PATH];
  if (m.files[SECRETS_PATH] && m.secretsPlain) out[SECRETS_PATH] = { h: m.secretsPlain, s: 0 };
  return out;
}

async function readRemote(store: SyncStore): Promise<{ head: SyncHead | null; manifest: SyncManifest | null }> {
  const raw = await store.readHead();
  if (raw === null) return { head: null, manifest: null };
  const head = checkHead(raw);
  const manifest = checkManifest(await store.readManifest(head.rev));
  if (manifest.rev !== head.rev) throw new SyncError("the sync folder is damaged (head and manifest disagree)", 422);
  return { head, manifest };
}

function scan(ctx: SyncContext) {
  const cd = credDir(ctx.paths);
  const s = scanLocal(ctx.paths, readCache(cd));
  writeCache(cd, s.cache);
  const local: Files = { ...s.files };
  if (s.secretsPlain) local[SECRETS_PATH] = { h: s.secretsPlain, s: 0 };
  return { scan: s, local };
}

const bytesOf = (files: Files, keys: string[]): number => keys.reduce((n, k) => n + (files[k]?.s ?? 0), 0);

// ---------- check ----------

export interface CheckResult {
  remote: { rev: number; device: string; pushedAt: string } | null;
  /** the store moved on since this device's base */
  behind: boolean;
  push: { files: number; bytes: number };
  pull: { files: number; bytes: number };
  conflicts: ConflictGroup[];
}

export async function check(ctx: SyncContext): Promise<CheckResult> {
  const state = readState(credDir(ctx.paths));
  ctx.progress?.({ phase: "scan", done: 0, total: 0, bytes: 0 });
  const { local } = scan(ctx);
  ctx.progress?.({ phase: "remote", done: 0, total: 0, bytes: 0 });
  const { head, manifest } = await readRemote(ctx.store);
  const remote = compareRemote(manifest);
  const base = state.base?.files ?? {};
  const p = plan(local, base, remote, state.scope);
  return {
    remote: head ? { rev: head.rev, device: head.device.name, pushedAt: head.pushedAt } : null,
    behind: !!head && head.rev !== state.base?.rev,
    push: { files: p.up.length, bytes: bytesOf(local, p.up) },
    pull: { files: p.down.length, bytes: bytesOf(remote, p.down) },
    conflicts: titled(ctx.paths, groupConflicts(p.conflicts)),
  };
}

/** A readable name for a conflict: the title or name in the thing's JSON
 *  file as this device has it (a chat's meta, a card), when there is one. */
function titled(p: UserPaths, groups: ConflictGroup[]): ConflictGroup[] {
  return groups.map((g) => {
    // a chat's .jsonl collides alone; its name is in the .meta.json beside it
    for (const k of new Set([...g.files, `${g.id}.meta.json`, `${g.id}.json`])) {
      if (!k.endsWith(".json") || !k.startsWith("w/")) continue;
      const abs = diskPath(p, k);
      try {
        if (!abs || fs.statSync(abs).size > 256 * 1024) continue;
        const j = JSON.parse(fs.readFileSync(abs, "utf8")) as { title?: unknown; name?: unknown };
        const t = typeof j.title === "string" ? j.title : typeof j.name === "string" ? j.name : "";
        if (t.trim()) return { ...g, title: t.trim().slice(0, 120) };
      } catch { /* not there or not JSON */ }
    }
    return g;
  });
}

// ---------- push ----------

export interface PushResult {
  rev: number;
  uploaded: number;
  bytes: number;
  changed: number;
}

export async function push(ctx: SyncContext, opts: { replaceKeys?: boolean } = {}): Promise<PushResult> {
  const cd = credDir(ctx.paths);
  const state = readState(cd);
  ctx.progress?.({ phase: "scan", done: 0, total: 0, bytes: 0 });
  const { scan: s, local } = scan(ctx);
  ctx.progress?.({ phase: "remote", done: 0, total: 0, bytes: 0 });
  const { head, manifest } = await readRemote(ctx.store);
  if (head && head.rev !== state.base?.rev) {
    throw new SyncError(
      state.base ? `${head.device.name || "another device"} pushed since this device last synced: pull first` : `this sync already holds ${head.device.name || "another device"}'s files: pull first`,
      409,
    );
  }
  const remote = compareRemote(manifest);
  const base = state.base?.files ?? {};
  const pl = plan(local, base, remote, state.scope);
  if (head && pl.up.length === 0) return { rev: head.rev, uploaded: 0, bytes: 0, changed: 0 };

  // the files themselves, each read once more: one changed since the scan
  // goes up as it is now
  const have = await ctx.store.listBlobs();
  const files: Record<string, FileEntry> = pushedFiles(withoutSecrets(local), withoutSecrets(remote as Record<string, FileEntry>), state.scope);
  const toUpload = pl.up.filter((k) => k !== SECRETS_PATH && files[k] && !have.has(files[k]!.h));
  let done = 0;
  let bytes = 0;
  const total = toUpload.length;
  const sent = new Set<string>();
  await pool(toUpload, 4, async (k) => {
    const abs = s.where[k];
    let body: Buffer;
    try {
      body = fs.readFileSync(abs!);
    } catch {
      delete files[k]; // gone since the scan: it goes as deleted
      return;
    }
    const entry = { h: sha256(body), s: body.length };
    files[k] = entry;
    if (!have.has(entry.h) && !sent.has(entry.h)) {
      sent.add(entry.h);
      await ctx.store.putBlob(entry.h, encodeBlob(body));
      bytes += body.length;
    }
    ctx.progress?.({ phase: "upload", done: ++done, total, bytes });
  });

  // the keys, sealed with this device's passphrase
  let secretsPlain = manifest?.secretsPlain;
  const remoteSealed = manifest?.files[SECRETS_PATH];
  if (remoteSealed) files[SECRETS_PATH] = remoteSealed;
  else delete files[SECRETS_PATH];
  if (state.scope.secrets && pl.up.includes(SECRETS_PATH)) {
    const bundle = readSecretBundle(ctx.paths);
    if (bundle) {
      if (!state.passphrase) throw new SyncError("keys are switched on: enter the passphrase that protects them first");
      if (remoteSealed && !opts.replaceKeys) {
        const sealed = Buffer.from(await ctx.store.getBlob(remoteSealed.h));
        try {
          openSecrets(decodeBlob(sealed, remoteSealed).toString("utf8"), state.passphrase);
        } catch (e) {
          if (e instanceof ProfileError) throw new SyncError("the keys in the sync were locked with another passphrase: enter that one, or replace the keys there with this device's", 409);
          throw e;
        }
      }
      const sealedText = Buffer.from(sealSecrets(bundle, state.passphrase), "utf8");
      const entry = { h: sha256(sealedText), s: sealedText.length };
      await ctx.store.putBlob(entry.h, encodeBlob(sealedText));
      files[SECRETS_PATH] = entry;
      secretsPlain = bundleHash(bundle);
    }
    // keys removed here stay in the sync: a pull never deletes keys
  }

  const rev = (head?.rev ?? 0) + 1;
  const now = new Date().toISOString();
  const device = { id: state.deviceId, name: state.deviceName };
  const next: SyncManifest = {
    format: SYNC_FORMAT, kind: SYNC_KIND, product: SYNC_PRODUCT,
    rev, parent: head?.rev ?? 0, engine: ctx.engine, pushedAt: now, device,
    files, apps: appSources(ctx.paths, files, manifest),
    ...(files[SECRETS_PATH] && secretsPlain ? { secretsPlain } : {}),
  };
  await ctx.store.writeManifest(rev, next);
  // nobody may have pushed while this one uploaded
  const again = await ctx.store.readHead();
  if ((again === null ? 0 : checkHead(again).rev) !== (head?.rev ?? 0)) {
    await ctx.store.deleteManifest(rev).catch(() => undefined);
    throw new SyncError("another device pushed at the same time: pull, then push again", 409);
  }
  const newHead: SyncHead = { format: SYNC_FORMAT, kind: SYNC_KIND, product: SYNC_PRODUCT, rev, device, pushedAt: now, engine: ctx.engine };
  await ctx.store.writeHead(newHead);
  ctx.progress?.({ phase: "finish", done: total, total, bytes });

  state.base = { rev, files: inScopeOnly(compareRemote(next), state.scope) };
  state.last = { rev, at: now, direction: "push" };
  writeState(cd, state);
  await collectGarbage(ctx.store, next, manifest).catch(() => undefined);
  return { rev, uploaded: sent.size, bytes, changed: pl.up.length };
}

function withoutSecrets(f: Files): Record<string, FileEntry> {
  const out: Record<string, FileEntry> = {};
  for (const [k, e] of Object.entries(f)) if (e && k !== SECRETS_PATH) out[k] = e;
  return out;
}

/** The base holds only what this device takes part in: a switch turned on
 *  later then compares both sides afresh instead of overwriting one. */
function inScopeOnly(f: Files, scope: SyncState["scope"]): Record<string, FileEntry> {
  const out: Record<string, FileEntry> = {};
  for (const [k, e] of Object.entries(f)) if (e && inScope(k, scope)) out[k] = e;
  return out;
}

/** Where each synced app was installed from, as this device recorded it;
 *  an app this device has no record for keeps what the store said. */
function appSources(p: UserPaths, files: Record<string, FileEntry>, prev: SyncManifest | null): SyncManifest["apps"] {
  const ids = new Set<string>();
  for (const k of Object.keys(files)) {
    const id = /^w\/apps\/([^/]+)\/manifest\.json$/.exec(k)?.[1];
    if (id) ids.add(id);
  }
  const out: SyncManifest["apps"] = {};
  for (const id of ids) {
    const src = readInstallSource(p.appUpstream, id);
    if (src) out[id] = { git: src.git, ref: src.ref };
    else if (prev?.apps[id]) out[id] = prev.apps[id]!;
  }
  return out;
}

/** Keep the current and the previous push; anything else goes. */
async function collectGarbage(store: SyncStore, current: SyncManifest, previous: SyncManifest | null): Promise<void> {
  const keep = new Set<string>();
  for (const m of [current, previous]) for (const e of Object.values(m?.files ?? {})) keep.add(e.h);
  for (const rev of await store.listManifests()) if (rev < current.rev - 1) await store.deleteManifest(rev);
  for (const h of await store.listBlobs()) if (!keep.has(h)) await store.deleteBlob(h);
}

// ---------- pull ----------

export type Choice = "mine" | "theirs";

export interface PullResult {
  rev: number;
  applied: number;
  kept: number;
  /** where the versions not kept were saved, when there were any */
  savedTo: string | null;
  keys: boolean;
  /** apps whose code changed: they are rebuilt and checked again */
  apps: string[];
  device: string;
}

export async function pull(ctx: SyncContext, opts: { rev?: number; resolutions?: Record<string, Choice>; all?: Choice }): Promise<PullResult> {
  const cd = credDir(ctx.paths);
  const state = readState(cd);
  ctx.progress?.({ phase: "scan", done: 0, total: 0, bytes: 0 });
  const { local } = scan(ctx);
  ctx.progress?.({ phase: "remote", done: 0, total: 0, bytes: 0 });
  const { head, manifest } = await readRemote(ctx.store);
  if (!head || !manifest) throw new SyncError("nothing was pushed here yet: push from the device that has your games first", 404);
  if (opts.rev !== undefined && opts.rev !== head.rev) throw new SyncError("the sync changed since you looked: check again", 409);
  const remote = compareRemote(manifest);
  const pl = plan(local, state.base?.files ?? {}, remote, state.scope);
  const groups = titled(ctx.paths, groupConflicts(pl.conflicts));
  const choiceOf = (g: ConflictGroup): Choice | undefined => opts.resolutions?.[g.id] ?? opts.all;
  if (groups.some((g) => !choiceOf(g))) throw new ConflictError(groups, head.rev);

  const take = new Set(pl.down);
  const theirs = new Set<string>();
  for (const g of groups) if (choiceOf(g) === "theirs") for (const k of g.files) { take.add(k); theirs.add(k); }
  const kept = pl.conflicts.length - theirs.size;

  // the keys first: a wrong passphrase stops the pull before anything changes
  let keys: Record<string, Buffer> | null = null;
  if (take.has(SECRETS_PATH)) {
    take.delete(SECRETS_PATH);
    const sealed = manifest.files[SECRETS_PATH];
    if (sealed) {
      if (!state.passphrase) throw new SyncError("the sync holds keys: enter their passphrase first, or switch keys off");
      const body = decodeBlob(await ctx.store.getBlob(sealed.h), sealed);
      try {
        keys = openSecrets(body.toString("utf8"), state.passphrase);
      } catch (e) {
        if (e instanceof ProfileError) throw new SyncError("wrong passphrase for the keys in the sync", 400);
        throw e;
      }
    }
  }

  // download everything into staging, check it, and only then write
  const staging = path.join(ctx.dataDir, ".sync-staging", ctx.username);
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  const fetched = new Map<string, string>(); // hash -> staged file
  const wanted = [...new Set([...take].map((k) => manifest.files[k]).filter((e): e is FileEntry => !!e).map((e) => e.h))];
  let done = 0;
  let bytes = 0;
  const entryOf = new Map<string, FileEntry>();
  for (const k of take) {
    const e = manifest.files[k];
    if (e) entryOf.set(e.h, e);
  }
  try {
    await pool(wanted, 4, async (h) => {
      const body = decodeBlob(await ctx.store.getBlob(h), entryOf.get(h)!);
      const f = path.join(staging, h);
      fs.writeFileSync(f, body);
      fetched.set(h, f);
      bytes += body.length;
      ctx.progress?.({ phase: "download", done: ++done, total: wanted.length, bytes });
    });

    // the versions a "take theirs" replaces are kept first
    let savedTo: string | null = null;
    for (const k of theirs) {
      if (k === SECRETS_PATH) continue;
      const abs = diskPath(ctx.paths, k);
      if (!abs || !fs.existsSync(abs)) continue;
      savedTo ??= conflictsDir(ctx.dataDir, ctx.username);
      keepCopy(savedTo, k, fs.readFileSync(abs));
    }

    const apps = new Set<string>();
    let applied = 0;
    const order = [...take].sort();
    for (const k of order) {
      const e = manifest.files[k];
      applyFile(ctx.paths, k, e ? fs.readFileSync(fetched.get(e.h)!) : null);
      applied++;
      const m = /^w\/apps\/([^/]+)\/(.+)$/.exec(k);
      if (m && isAppCode(m[2]!)) apps.add(m[1]!);
      ctx.progress?.({ phase: "apply", done: applied, total: order.length, bytes });
    }
    if (keys) {
      const auth = path.join(cd, "auth.json");
      if (fs.existsSync(auth)) fs.copyFileSync(auth, path.join(cd, "auth.json.before-sync"));
      for (const [name, body] of Object.entries(keys)) fs.writeFileSync(path.join(cd, name), body, { mode: 0o600 });
      applied++;
    }
    for (const id of apps) markRestored(ctx.paths, id, manifest.apps[id]);

    state.base = { rev: head.rev, files: inScopeOnly(remote, state.scope) };
    state.last = { rev: head.rev, at: new Date().toISOString(), direction: "pull" };
    writeState(cd, state);
    ctx.progress?.({ phase: "finish", done: order.length, total: order.length, bytes });
    return { rev: head.rev, applied, kept, savedTo, keys: !!keys, apps: [...apps].sort(), device: head.device.name };
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

/** Code is what an app has outside its data and the agent's notes on it. */
function isAppCode(rel: string): boolean {
  const head = rel.split("/")[0] ?? "";
  if (head === ".memory" || head === ".skills") return false;
  return rel === "manifest.json" || !outsideCode(rel);
}

/** Code that came from the sync is not this engine's install: the app is
 *  official again only when the engine finds it byte for byte the official
 *  repository's (the same rule as a profile import). */
function markRestored(p: UserPaths, id: string, fromSync: SyncManifest["apps"][string] | undefined): void {
  let src: { git: string; ref: string } | null = readInstallSource(p.appUpstream, id);
  src ??= fromSync ?? null;
  if (!src) return;
  try {
    writeInstallSource(p.appUpstream, id, { git: src.git, ref: src.ref, restored: true });
  } catch { /* not an app id this engine accepts */ }
}

export { inScope, readState, writeState };
export type { SyncState };
