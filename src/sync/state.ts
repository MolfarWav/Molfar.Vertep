/**
 * This device's side of a sync, kept beside the keys (outside the workspace,
 * 0600): which store, the Drive token, the remembered passphrase, the scope
 * switches, the base (the file list as of the last push or pull) and a hash
 * cache. None of it ever travels: `credentials/` is not synced and this file
 * is not in the sealed key set.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULT_SCOPE, type FileEntry, type Scope } from "./manifest.js";

export type SyncTarget =
  | { kind: "drive"; folderId?: string; account?: string; refreshToken: string }
  | { kind: "folder"; path: string };

export interface SyncState {
  deviceId: string;
  deviceName: string;
  scope: Scope;
  target: SyncTarget | null;
  /** remembered on this device only */
  passphrase?: string;
  /** a Google client of the user's own, instead of the built-in one */
  client?: { id: string; secret: string };
  /** the remote rev and file list this device last agreed with */
  base: { rev: number; files: Record<string, FileEntry> } | null;
  /** what the plain key bundle hashed to at the base */
  baseSecretsPlain?: string;
  last?: { rev: number; at: string; direction: "push" | "pull" };
}

export interface HashCache {
  [rel: string]: { s: number; m: number; h: string };
}

export const statePath = (credDir: string): string => path.join(credDir, "sync.json");
const cachePath = (credDir: string): string => path.join(credDir, "sync-cache.json");

function defaultName(): string {
  const h = os.hostname().replace(/\.local$/i, "").slice(0, 40);
  return h || "This device";
}

export function readState(credDir: string): SyncState {
  let raw: Partial<SyncState> = {};
  try {
    raw = JSON.parse(fs.readFileSync(statePath(credDir), "utf8")) as Partial<SyncState>;
  } catch { /* first use */ }
  return {
    deviceId: typeof raw.deviceId === "string" && /^[a-f0-9]{8,32}$/.test(raw.deviceId) ? raw.deviceId : crypto.randomBytes(8).toString("hex"),
    deviceName: typeof raw.deviceName === "string" && raw.deviceName.trim() ? raw.deviceName.slice(0, 60) : defaultName(),
    scope: { ...DEFAULT_SCOPE, ...(raw.scope && typeof raw.scope === "object" ? pickScope(raw.scope) : {}) },
    target: raw.target ?? null,
    ...(typeof raw.passphrase === "string" && raw.passphrase ? { passphrase: raw.passphrase } : {}),
    ...(raw.client && typeof raw.client.id === "string" && typeof raw.client.secret === "string" ? { client: raw.client } : {}),
    base: raw.base && Number.isInteger(raw.base.rev) && raw.base.files ? raw.base : null,
    ...(typeof raw.baseSecretsPlain === "string" ? { baseSecretsPlain: raw.baseSecretsPlain } : {}),
    ...(raw.last ? { last: raw.last } : {}),
  };
}

function pickScope(s: Partial<Scope>): Partial<Scope> {
  const out: Partial<Scope> = {};
  for (const k of ["agent", "media", "secrets"] as const) if (typeof s[k] === "boolean") out[k] = s[k];
  return out;
}

export function writeState(credDir: string, state: SyncState): void {
  fs.mkdirSync(credDir, { recursive: true, mode: 0o700 });
  const file = statePath(credDir);
  const tmp = `${file}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

export function readCache(credDir: string): HashCache {
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath(credDir), "utf8")) as HashCache;
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function writeCache(credDir: string, cache: HashCache): void {
  try {
    fs.mkdirSync(credDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(cachePath(credDir), JSON.stringify(cache), { mode: 0o600 });
  } catch { /* only a speed-up */ }
}
