/**
 * Content-addressed asset store (SPEC §5.6): binaries (sprites, music, images)
 * live OUTSIDE git under assets-store/<aa>/<sha256> + manifest.json index.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { UserPaths } from "../paths.js";

const MAX_ASSET_BYTES = 64 * 1024 * 1024; // 64 MiB per asset (v1 scaffold limit)
/** Per-user ceiling across every stored asset. Content-addressed bytes count
 *  once; re-uploading known bytes is free. */
const MAX_STORE_BYTES = 2 * 1024 * 1024 * 1024;

export interface AssetLimits {
  maxBytes: number;
  maxTotalBytes: number;
}

export const DEFAULT_LIMITS: AssetLimits = { maxBytes: MAX_ASSET_BYTES, maxTotalBytes: MAX_STORE_BYTES };

export interface AssetRecord {
  id: string;
  mime: string;
  size: number;
  name: string | null;
  createdAt: number;
  /** When these bytes were last stored: every upload of them, including a
   *  re-upload of known bytes, refreshes it. The cleanup (cleanup.ts) never
   *  trashes a picture stored within its grace period. Absent = never
   *  re-uploaded since the field existed (createdAt stands). */
  storedAt?: number;
  /** Apps that stored these bytes. The store is per user, but one app must
   *  not browse another's pictures; absent = stored by the shell or before
   *  owners were recorded. */
  apps?: string[];
}

/** May a request see this asset? The shell (`app` null) sees everything; an
 *  app sees what it stored, and the engine's shipped app also sees assets
 *  with no recorded owner (the ones it stored before owners existed). */
export function assetVisibleTo(record: AssetRecord, app: { id: string; trusted: boolean } | null): boolean {
  if (!app) return true;
  if (record.apps?.includes(app.id)) return true;
  return app.trusted && !record.apps?.length;
}

function manifestPath(p: UserPaths): string {
  return path.join(p.assetsStore, "manifest.json");
}

export function readManifest(p: UserPaths): Record<string, AssetRecord> {
  try {
    return JSON.parse(fs.readFileSync(manifestPath(p), "utf8")) as Record<string, AssetRecord>;
  } catch {
    return {};
  }
}

/** Like readManifest, but a manifest that exists and cannot be parsed throws
 *  instead of reading as empty: the cleanup must never act on "no records". */
export function readManifestStrict(p: UserPaths): Record<string, AssetRecord> {
  let text: string;
  try {
    text = fs.readFileSync(manifestPath(p), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw e;
  }
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("the asset manifest is not an object");
  return parsed as Record<string, AssetRecord>;
}

/** Written beside and renamed over, so a crash never leaves half a manifest
 *  (readManifest would read that as "no assets"). Every store operation here
 *  is synchronous, so a read-modify-write inside one call cannot interleave
 *  with another request: that is the store's only lock. */
export function writeManifest(p: UserPaths, m: Record<string, AssetRecord>): void {
  fs.mkdirSync(p.assetsStore, { recursive: true });
  const tmp = `${manifestPath(p)}.${process.pid}.tmp`;
  const text = `${JSON.stringify(m, null, 2)}\n`;
  fs.writeFileSync(tmp, text, "utf8");
  try {
    fs.renameSync(tmp, manifestPath(p));
  } catch {
    // a scanner or sync client holding the old file on Windows: write in place
    fs.writeFileSync(manifestPath(p), text, "utf8");
    fs.rmSync(tmp, { force: true });
  }
}

export function putAsset(
  p: UserPaths,
  bytes: Buffer,
  mime: string,
  name: string | null = null,
  owner: string | null = null,
  limits: AssetLimits = DEFAULT_LIMITS,
): AssetRecord {
  if (bytes.length > limits.maxBytes) throw new Error("asset too large");
  const id = crypto.createHash("sha256").update(bytes).digest("hex");
  const manifest = readManifest(p);
  const prev = manifest[id];
  if (!prev) {
    const used = Object.values(manifest).reduce((sum, r) => sum + (r.size || 0), 0);
    if (used + bytes.length > limits.maxTotalBytes) throw new Error("asset store quota exceeded");
  }
  const shard = path.join(p.assetsStore, id.slice(0, 2), id);
  fs.mkdirSync(path.dirname(shard), { recursive: true });
  fs.writeFileSync(shard, bytes);
  // content-addressed: the same bytes from another app keep every owner
  const apps = [...new Set([...(prev?.apps ?? []), ...(owner ? [owner] : [])])];
  // first writer owns the metadata: another app uploading identical bytes
  // must not be able to rename or retype an asset it did not create
  // every upload, a re-upload of known bytes too, refreshes storedAt: an
  // upload racing a cleanup must make the picture "young" again
  const now = Date.now();
  const record: AssetRecord = prev
    ? { ...prev, storedAt: now, ...(apps.length ? { apps } : {}) }
    : { id, mime, size: bytes.length, name, createdAt: now, storedAt: now, ...(apps.length ? { apps } : {}) };
  manifest[id] = record;
  writeManifest(p, manifest);
  return record;
}

export function getAsset(p: UserPaths, id: string): { bytes: Buffer; record: AssetRecord } | null {
  if (!/^[a-f0-9]{64}$/i.test(id)) return null;
  const file = path.join(p.assetsStore, id.slice(0, 2), id);
  if (!fs.existsSync(file)) return null;
  const record = readManifest(p)[id];
  if (!record) return null;
  return { bytes: fs.readFileSync(file), record };
}

export function listAssets(p: UserPaths): AssetRecord[] {
  return Object.values(readManifest(p)).sort((a, b) => b.createdAt - a.createdAt);
}
