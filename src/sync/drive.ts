/**
 * Google Drive as a sync store, and the sign-in that gets to it.
 *
 * Scope drive.file only: the engine sees the files its own client created and
 * nothing else in the user's Drive. Sign-in is OAuth for installed apps with
 * PKCE; Google returns to the engine on 127.0.0.1, or the user pastes the
 * address the browser ended on. Inside the Drive folder the names are flat:
 * head.json, manifest-<rev>.json, blob-<sha256>.
 */
import crypto from "node:crypto";
import { SyncError } from "./manifest.js";
import type { SyncStore } from "./store.js";

/** The built-in "Molfar Vertep" Desktop client (GOOGLE-CLIENT.md in
 *  .fork/handoff/sync). A Desktop client's secret is not secret: Google
 *  requires it with PKCE all the same. */
export const BUILTIN_CLIENT = {
  id: "353071814181-bjpbqsok71ft43v75ij757fhcnjvn1qk.apps.googleusercontent.com",
  secret: "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",
};

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
export const FOLDER_NAME = "Molfar Vertep sync";
const FOLDER_MARK = "molfarVertepSync";

export interface DriveClient {
  id: string;
  secret: string;
}

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** The client to sign in with: the user's own, the environment's, or the
 *  built-in one; null when none is set. */
export function driveClient(own?: DriveClient | null): DriveClient | null {
  if (own?.id) return own;
  const envId = process.env.CHRYSALIS_DRIVE_CLIENT_ID;
  if (envId) return { id: envId, secret: process.env.CHRYSALIS_DRIVE_CLIENT_SECRET ?? "" };
  return BUILTIN_CLIENT.id ? BUILTIN_CLIENT : null;
}

// ---------- sign-in ----------

export interface PendingSignIn {
  username: string;
  verifier: string;
  redirect: string;
  client: DriveClient;
  at: number;
}

const b64url = (b: Buffer): string => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** A sign-in waiting for Google's answer, keyed by its one-time state. */
export class SignIns {
  private pending = new Map<string, PendingSignIn>();

  start(username: string, client: DriveClient, redirect: string): { url: string; state: string } {
    this.sweep();
    // one at a time per account: a second start replaces the first
    for (const [k, v] of this.pending) if (v.username === username) this.pending.delete(k);
    const state = b64url(crypto.randomBytes(32));
    const verifier = b64url(crypto.randomBytes(48));
    const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
    this.pending.set(state, { username, verifier, redirect, client, at: Date.now() });
    const q = new URLSearchParams({
      client_id: client.id,
      redirect_uri: redirect,
      response_type: "code",
      scope: DRIVE_SCOPE,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return { url: `${AUTH_URL}?${q}`, state };
  }

  /** Take a pending sign-in once; null when unknown or older than 10 minutes. */
  take(state: string): PendingSignIn | null {
    this.sweep();
    const p = this.pending.get(state) ?? null;
    this.pending.delete(state);
    return p;
  }

  private sweep(): void {
    for (const [k, v] of this.pending) if (Date.now() - v.at > 10 * 60_000) this.pending.delete(k);
  }
}

/** code + state from the address Google sent the browser to. */
export function parseReturnUrl(text: string): { code: string; state: string } | { error: string } {
  let u: URL;
  try {
    u = new URL(text.trim());
  } catch {
    return { error: "paste the whole address from the browser's address bar" };
  }
  const err = u.searchParams.get("error");
  if (err) return { error: err === "access_denied" ? "Google sign-in was cancelled" : `Google said: ${err.slice(0, 80)}` };
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  if (!code || !state) return { error: "that address has no sign-in code in it" };
  return { code, state };
}

export async function exchangeCode(p: PendingSignIn, code: string, fetchImpl: Fetch = fetch): Promise<{ refreshToken: string; accessToken: string; expiresAt: number }> {
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: p.client.id, client_secret: p.client.secret, redirect_uri: p.redirect,
      grant_type: "authorization_code", code_verifier: p.verifier,
    }).toString(),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !j.access_token) throw new SyncError(`Google refused the sign-in: ${j.error_description ?? j.error ?? res.status}`, 502);
  if (!j.refresh_token) throw new SyncError("Google gave no lasting access: remove Molfar Vertep at myaccount.google.com/permissions and sign in again", 502);
  return { refreshToken: j.refresh_token, accessToken: j.access_token, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000 };
}

// ---------- access tokens ----------

export class DriveAuth {
  private access: { token: string; expiresAt: number } | null = null;
  constructor(readonly client: DriveClient, readonly refreshToken: string, private fetchImpl: Fetch = fetch, seed?: { accessToken: string; expiresAt: number }) {
    if (seed) this.access = { token: seed.accessToken, expiresAt: seed.expiresAt };
  }

  async token(force = false): Promise<string> {
    if (!force && this.access && this.access.expiresAt - Date.now() > 60_000) return this.access.token;
    const res = await this.fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: this.client.id, client_secret: this.client.secret, refresh_token: this.refreshToken, grant_type: "refresh_token" }).toString(),
    });
    const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
    if (!res.ok || !j.access_token) {
      if (j.error === "invalid_grant") throw new SyncError("Google access ended (signed out or revoked): sign in with Google again", 403);
      throw new SyncError(`could not reach Google (${j.error ?? res.status})`, 502);
    }
    this.access = { token: j.access_token, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000 };
    return j.access_token;
  }
}

// ---------- the store ----------

const SMALL = 5 * 1024 * 1024;

export class DriveStore implements SyncStore {
  readonly kind = "drive" as const;
  private names: Map<string, string> | null = null;

  constructor(private auth: DriveAuth, readonly folderId: string, private fetchImpl: Fetch = fetch) {}

  /** One request with the token, retried on rate limits, server errors and
   *  network failures; a 401 refreshes the token once. */
  private async call(url: string, init: RequestInit = {}, okStatuses: number[] = []): Promise<Response> {
    let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await this.fetchImpl(url, { ...init, headers: { ...(init.headers as Record<string, string>), authorization: `Bearer ${await this.auth.token(refreshed)}` } });
      } catch (e) {
        if (e instanceof SyncError) throw e;
        if (attempt < 3) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        throw new SyncError(`could not reach Google Drive (${(e as Error).message})`, 502);
      }
      if (res.ok || okStatuses.includes(res.status)) return res;
      if (res.status === 401 && !refreshed) {
        refreshed = true;
        continue;
      }
      if ((res.status === 429 || res.status >= 500 || (res.status === 403 && /rate|quota/i.test(await res.clone().text()))) && attempt < 4) {
        await sleep(800 * 2 ** attempt);
        continue;
      }
      const text = await res.text().catch(() => "");
      if (res.status === 403 && /storageQuota/i.test(text)) throw new SyncError("your Google Drive is full", 413);
      if (res.status === 404) throw new SyncError("the sync folder on Google Drive is gone: disconnect and connect again", 404);
      throw new SyncError(`Google Drive answered ${res.status}: ${text.slice(0, 160)}`, 502);
    }
  }

  private async list(): Promise<Map<string, string>> {
    if (this.names) return this.names;
    const out = new Map<string, string>();
    let page = "";
    do {
      const q = new URLSearchParams({ q: `'${this.folderId}' in parents and trashed=false`, fields: "nextPageToken,files(id,name)", pageSize: "1000", spaces: "drive" });
      if (page) q.set("pageToken", page);
      const j = (await (await this.call(`${API}/files?${q}`)).json()) as { nextPageToken?: string; files?: { id: string; name: string }[] };
      for (const f of j.files ?? []) out.set(f.name, f.id);
      page = j.nextPageToken ?? "";
    } while (page);
    this.names = out;
    return out;
  }

  private async read(name: string): Promise<Uint8Array | null> {
    const id = (await this.list()).get(name);
    if (!id) return null;
    const res = await this.call(`${API}/files/${encodeURIComponent(id)}?alt=media`);
    return new Uint8Array(await res.arrayBuffer());
  }

  private async write(name: string, body: Uint8Array): Promise<void> {
    const names = await this.list();
    const id = names.get(name);
    if (id) {
      await this.call(`${UPLOAD}/files/${encodeURIComponent(id)}?uploadType=media&fields=id`, { method: "PATCH", headers: { "content-type": "application/octet-stream" }, body });
      return;
    }
    const meta = { name, parents: [this.folderId] };
    let res: Response;
    if (body.length <= SMALL) {
      const boundary = `mv${crypto.randomBytes(12).toString("hex")}`;
      const multipart = Buffer.concat([
        Buffer.from(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\ncontent-type: application/octet-stream\r\n\r\n`),
        Buffer.from(body),
        Buffer.from(`\r\n--${boundary}--`),
      ]);
      res = await this.call(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: "POST", headers: { "content-type": `multipart/related; boundary=${boundary}` }, body: multipart });
    } else {
      const start = await this.call(`${UPLOAD}/files?uploadType=resumable&fields=id`, {
        method: "POST",
        headers: { "content-type": "application/json; charset=UTF-8", "x-upload-content-type": "application/octet-stream", "x-upload-content-length": String(body.length) },
        body: JSON.stringify(meta),
      });
      const location = start.headers.get("location");
      if (!location?.startsWith("https://")) throw new SyncError("Google Drive did not start the upload", 502);
      res = await this.call(location, { method: "PUT", headers: { "content-type": "application/octet-stream" }, body });
    }
    const j = (await res.json().catch(() => ({}))) as { id?: string };
    if (j.id) names.set(name, j.id);
  }

  private async remove(name: string): Promise<void> {
    const names = await this.list();
    const id = names.get(name);
    if (!id) return;
    await this.call(`${API}/files/${encodeURIComponent(id)}`, { method: "DELETE" }, [404]);
    names.delete(name);
  }

  private async readJson(name: string): Promise<unknown | null> {
    const b = await this.read(name);
    if (b === null) return null;
    try {
      return JSON.parse(Buffer.from(b).toString("utf8"));
    } catch {
      throw new SyncError(`${name} on Google Drive is damaged`, 422);
    }
  }

  async readHead(): Promise<unknown | null> {
    // always fresh: another device may have pushed since this store was made
    this.names = null;
    return this.readJson("head.json");
  }
  async writeHead(head: unknown): Promise<void> {
    await this.write("head.json", Buffer.from(`${JSON.stringify(head, null, 2)}\n`));
  }
  async readManifest(rev: number): Promise<unknown> {
    const m = await this.readJson(`manifest-${rev}.json`);
    if (m === null) throw new SyncError(`push ${rev} is missing from Google Drive`, 404);
    return m;
  }
  async writeManifest(rev: number, manifest: unknown): Promise<void> {
    await this.write(`manifest-${rev}.json`, Buffer.from(JSON.stringify(manifest)));
  }
  async deleteManifest(rev: number): Promise<void> {
    await this.remove(`manifest-${rev}.json`);
  }
  async listManifests(): Promise<number[]> {
    return [...(await this.list()).keys()].map((n) => /^manifest-(\d+)\.json$/.exec(n)?.[1]).filter((n): n is string => !!n).map(Number);
  }
  async listBlobs(): Promise<Set<string>> {
    return new Set([...(await this.list()).keys()].map((n) => /^blob-([a-f0-9]{64})$/.exec(n)?.[1]).filter((n): n is string => !!n));
  }
  async putBlob(hash: string, body: Uint8Array): Promise<void> {
    await this.write(`blob-${hash}`, body);
  }
  async getBlob(hash: string): Promise<Uint8Array> {
    const b = await this.read(`blob-${hash}`);
    if (b === null) throw new SyncError("a file is missing from Google Drive: push again from the device that has it", 404);
    return b;
  }
  async deleteBlob(hash: string): Promise<void> {
    await this.remove(`blob-${hash}`);
  }
}

/** The sync folder this client made in the user's Drive, created when there
 *  is none; and the account's address to show in Settings. */
export async function findOrCreateFolder(auth: DriveAuth, fetchImpl: Fetch = fetch): Promise<{ folderId: string; account: string }> {
  const call = async (url: string, init: RequestInit = {}) => {
    const res = await fetchImpl(url, { ...init, headers: { ...(init.headers as Record<string, string>), authorization: `Bearer ${await auth.token()}` } });
    if (!res.ok) throw new SyncError(`Google Drive answered ${res.status}: ${(await res.text().catch(() => "")).slice(0, 160)}`, 502);
    return res.json() as Promise<unknown>;
  };
  const q = new URLSearchParams({
    q: `mimeType='${FOLDER_MIME}' and appProperties has { key='${FOLDER_MARK}' and value='1' } and trashed=false`,
    fields: "files(id,name,createdTime)", orderBy: "createdTime", spaces: "drive",
  });
  const found = (await call(`${API}/files?${q}`)) as { files?: { id: string }[] };
  let folderId = found.files?.[0]?.id;
  if (!folderId) {
    const made = (await call(`${API}/files?fields=id`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME, appProperties: { [FOLDER_MARK]: "1" } }),
    })) as { id?: string };
    if (!made.id) throw new SyncError("could not make the sync folder on Google Drive", 502);
    folderId = made.id;
  }
  let account = "";
  try {
    const about = (await call(`${API}/about?fields=user(emailAddress)`)) as { user?: { emailAddress?: string } };
    account = about.user?.emailAddress ?? "";
  } catch { /* only for display */ }
  return { folderId, account };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
