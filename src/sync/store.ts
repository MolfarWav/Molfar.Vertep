/**
 * Where a sync lives. One small interface so Google Drive, a plain folder and
 * later stores (Dropbox, WebDAV) are interchangeable. The layout inside is the
 * same everywhere: head.json, manifests/<rev>.json, blobs/<sha256>.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SyncError } from "./manifest.js";

export interface SyncStore {
  readonly kind: "drive" | "folder";
  /** null when nothing was ever pushed here */
  readHead(): Promise<unknown | null>;
  writeHead(head: unknown): Promise<void>;
  readManifest(rev: number): Promise<unknown>;
  writeManifest(rev: number, manifest: unknown): Promise<void>;
  deleteManifest(rev: number): Promise<void>;
  /** the revs of every manifest kept */
  listManifests(): Promise<number[]>;
  listBlobs(): Promise<Set<string>>;
  putBlob(hash: string, body: Uint8Array): Promise<void>;
  getBlob(hash: string): Promise<Uint8Array>;
  deleteBlob(hash: string): Promise<void>;
}

const HASH = /^[a-f0-9]{64}$/;
const checkHash = (h: string) => {
  if (!HASH.test(h)) throw new SyncError("bad blob name", 422);
};

/** A folder on this computer (Syncthing, Drive for desktop, a USB stick, or
 *  tests). Writes go through a temp file and a rename. */
export class FolderStore implements SyncStore {
  readonly kind = "folder" as const;
  constructor(readonly root: string) {}

  private file(rel: string): string {
    return path.join(this.root, rel);
  }
  private write(rel: string, body: Uint8Array | string): void {
    const to = this.file(rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    const tmp = `${to}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, to);
  }
  private readJson(rel: string): unknown | null {
    let text: string;
    try {
      text = fs.readFileSync(this.file(rel), "utf8");
    } catch {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new SyncError(`${rel} in the sync folder is damaged`, 422);
    }
  }

  async readHead(): Promise<unknown | null> {
    return this.readJson("head.json");
  }
  async writeHead(head: unknown): Promise<void> {
    this.write("head.json", `${JSON.stringify(head, null, 2)}\n`);
  }
  async readManifest(rev: number): Promise<unknown> {
    const m = this.readJson(`manifests/${rev}.json`);
    if (m === null) throw new SyncError(`push ${rev} is missing from the sync folder`, 404);
    return m;
  }
  async writeManifest(rev: number, manifest: unknown): Promise<void> {
    this.write(`manifests/${rev}.json`, JSON.stringify(manifest));
  }
  async deleteManifest(rev: number): Promise<void> {
    fs.rmSync(this.file(`manifests/${rev}.json`), { force: true });
  }
  async listManifests(): Promise<number[]> {
    try {
      return fs.readdirSync(this.file("manifests")).map((n) => /^(\d+)\.json$/.exec(n)?.[1]).filter((n): n is string => !!n).map(Number);
    } catch {
      return [];
    }
  }
  async listBlobs(): Promise<Set<string>> {
    try {
      return new Set(fs.readdirSync(this.file("blobs")).filter((n) => HASH.test(n)));
    } catch {
      return new Set();
    }
  }
  async putBlob(hash: string, body: Uint8Array): Promise<void> {
    checkHash(hash);
    this.write(`blobs/${hash}`, body);
  }
  async getBlob(hash: string): Promise<Uint8Array> {
    checkHash(hash);
    try {
      return fs.readFileSync(this.file(`blobs/${hash}`));
    } catch {
      throw new SyncError("a file is missing from the sync folder: push again from the device that has it", 404);
    }
  }
  async deleteBlob(hash: string): Promise<void> {
    checkHash(hash);
    fs.rmSync(this.file(`blobs/${hash}`), { force: true });
  }
}
