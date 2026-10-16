/**
 * Sync between devices (GitHub #38): two engines on one machine (two data
 * dirs) share one folder store. Push, pull, deletions, conflicts with the
 * losing copy kept, keys only sealed, scope switches, and nothing crafted in
 * the store reaches outside the workspace or makes an app official.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bootstrapUserDir, type UserPaths } from "../src/paths.js";
import { readInstallSource, writeInstallSource } from "../src/apps/update.js";
import { check, push, pull, ConflictError, encodeBlob, decodeBlob } from "../src/sync/engine.js";
import { FolderStore } from "../src/sync/store.js";
import { plan, groupConflicts, syncPathOk, DEFAULT_SCOPE, SECRETS_PATH } from "../src/sync/manifest.js";
import { readState, writeState } from "../src/sync/state.js";
import { sha256 } from "../src/sync/local.js";
import { DriveStore, DriveAuth, SignIns, parseReturnUrl } from "../src/sync/drive.js";

let tmp: string;
let storeDir: string;
interface Device { dataDir: string; p: UserPaths }
let a: Device;
let b: Device;

const mk = (name: string): Device => {
  const dataDir = path.join(tmp, name);
  return { dataDir, p: bootstrapUserDir(dataDir, "mia") };
};
const ctx = (d: Device) => ({ dataDir: d.dataDir, username: "mia", paths: d.p, engine: "1.1.0", store: new FolderStore(storeDir) });
const put = (d: Device, rel: string, body: string | Uint8Array) => {
  const f = path.join(d.p.root, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
};
const read = (d: Device, rel: string) => fs.readFileSync(path.join(d.p.root, rel), "utf8");
const has = (d: Device, rel: string) => fs.existsSync(path.join(d.p.root, rel));
const setState = (d: Device, patch: Partial<ReturnType<typeof readState>>) => {
  const cd = path.dirname(d.p.auth);
  writeState(cd, { ...readState(cd), ...patch });
};

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sync-"));
  storeDir = path.join(tmp, "store");
  a = mk("desktop");
  b = mk("phone");
  setState(a, { deviceName: "Desktop" });
  setState(b, { deviceName: "Phone" });
});
afterEach(() => {
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* watcher races */ }
});

/** Desktop pushes, the phone takes everything the first time. */
async function firstRound(): Promise<void> {
  put(a, "apps/roleplay/manifest.json", JSON.stringify({ name: "Roleplay", version: "4.48.0", kind: "web" }));
  put(a, "apps/roleplay/index.html", "<p>app</p>");
  put(a, "apps/roleplay/data/chats/c1.jsonl", '{"m":"hello"}\n');
  put(a, "apps/roleplay/data/chats/c1.meta.json", '{"title":"First"}');
  put(a, "apps/roleplay/data/characters/belle/avatar.png", new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
  await push(ctx(a));
  await pull(ctx(b), { all: "theirs" });
}

describe("three-way plan", () => {
  it("sorts changes into up, down, agreed and conflicts", () => {
    const e = (h: string) => ({ h: h.repeat(64).slice(0, 64), s: 1 });
    const base = { "w/x": e("a"), "w/y": e("a"), "w/z": e("a"), "w/q": e("a") };
    const local = { "w/x": e("b"), "w/y": e("a"), "w/z": e("c"), "w/n": e("d") };
    const remote = { "w/x": e("a"), "w/y": e("b"), "w/z": e("d"), "w/n": e("d") };
    const p = plan(local, base, remote, DEFAULT_SCOPE);
    expect(p.up).toEqual(["w/x"]);
    expect(p.down).toEqual(["w/y"]);
    // deleted on both sides, added the same on both: only the base moves
    expect(p.agreed).toEqual(["w/n", "w/q"]);
    expect(p.conflicts).toEqual(["w/z"]);
  });

  it("groups a chat's two files as one thing", () => {
    const g = groupConflicts(["w/apps/roleplay/data/chats/c1.jsonl", "w/apps/roleplay/data/chats/c1.meta.json", "p/connections.json"]);
    expect(g).toHaveLength(2);
    expect(g[0]).toMatchObject({ app: "roleplay", label: "chats/c1", files: ["w/apps/roleplay/data/chats/c1.jsonl", "w/apps/roleplay/data/chats/c1.meta.json"] });
  });

  it("refuses paths that leave the workspace or touch git and keys", () => {
    for (const bad of ["w/../x", "w/.git/config", "w/a/.git/hooks/x", "p/auth.json", "p/mcp.json", "w/apps/x/node_modules/a.js", "w/apps/x/dist/i.html", "w/C:/x", "w/a\\..\\b", "w//x", "x/y", "w/nul", "w/apps/x/con.txt"]) {
      expect(syncPathOk(bad)).toBe(false);
    }
    for (const ok of ["w/apps/roleplay/data/chats/c1.jsonl", "p/connections.json", SECRETS_PATH, "w/settings.json"]) expect(syncPathOk(ok)).toBe(true);
  });

  it("blobs round-trip and are checked against their hash", () => {
    const text = Buffer.from("x".repeat(5000));
    const blob = encodeBlob(text);
    expect(blob.length).toBeLessThan(text.length / 2);
    expect(decodeBlob(blob, { h: sha256(text), s: text.length }).equals(text)).toBe(true);
    expect(() => decodeBlob(blob, { h: sha256("y"), s: text.length })).toThrow();
  });
});

describe("push and pull between two devices", () => {
  it("the first push carries everything, the other device gets it all", async () => {
    await firstRound();
    expect(read(b, "apps/roleplay/data/chats/c1.jsonl")).toBe('{"m":"hello"}\n');
    expect(fs.readFileSync(path.join(b.p.root, "apps/roleplay/data/characters/belle/avatar.png"))).toEqual(Buffer.from([137, 80, 78, 71, 1, 2, 3]));
    const r = await check(ctx(b));
    expect(r.push.files).toBe(0);
    expect(r.pull.files).toBe(0);
    expect(r.conflicts).toHaveLength(0);
    expect(r.remote?.device).toBe("Desktop");
  });

  it("later pushes send only what changed, deletions included", async () => {
    await firstRound();
    put(b, "apps/roleplay/data/chats/c1.jsonl", '{"m":"hello"}\n{"m":"from the phone"}\n');
    fs.rmSync(path.join(b.p.root, "apps/roleplay/data/chats/c1.meta.json"));
    const before = fs.readdirSync(path.join(storeDir, "blobs")).length;
    const r = await push(ctx(b));
    expect(r.changed).toBe(2);
    expect(r.uploaded).toBe(1);
    expect(fs.readdirSync(path.join(storeDir, "blobs")).length).toBeLessThanOrEqual(before + 1);
    const back = await pull(ctx(a), {});
    expect(back.device).toBe("Phone");
    expect(read(a, "apps/roleplay/data/chats/c1.jsonl")).toContain("from the phone");
    expect(has(a, "apps/roleplay/data/chats/c1.meta.json")).toBe(false);
    expect(back.kept).toBe(0);
    expect(back.savedTo).toBeNull();
  });

  it("a push is refused while the other device's push is not pulled", async () => {
    await firstRound();
    put(b, "apps/roleplay/data/chats/c2.jsonl", "new\n");
    await push(ctx(b));
    put(a, "apps/roleplay/data/chats/c3.jsonl", "mine\n");
    await expect(push(ctx(a))).rejects.toThrow(/pull first/);
    // a pull with nothing colliding applies, and the local file stays to push
    await pull(ctx(a), {});
    expect(read(a, "apps/roleplay/data/chats/c2.jsonl")).toBe("new\n");
    expect(read(a, "apps/roleplay/data/chats/c3.jsonl")).toBe("mine\n");
    expect((await push(ctx(a))).changed).toBe(1);
  });

  it("a file changed on both sides waits for a choice; the losing copy is kept", async () => {
    await firstRound();
    put(b, "apps/roleplay/data/chats/c1.jsonl", "phone version\n");
    put(b, "apps/roleplay/data/chats/c1.meta.json", '{"title":"Phone"}');
    await push(ctx(b));
    put(a, "apps/roleplay/data/chats/c1.jsonl", "desktop version\n");
    let err: unknown;
    try {
      await pull(ctx(a), {});
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConflictError);
    const groups = (err as ConflictError).groups;
    expect(groups).toHaveLength(1);
    expect(groups[0]!.files).toEqual(["w/apps/roleplay/data/chats/c1.jsonl"]);
    // named after the chat, from the meta file beside it
    expect(groups[0]!.title).toBe("First");
    // the meta file did not collide: nothing was written before the choice
    expect(read(a, "apps/roleplay/data/chats/c1.meta.json")).toBe('{"title":"First"}');

    const r = await pull(ctx(a), { resolutions: { [groups[0]!.id]: "theirs" } });
    expect(read(a, "apps/roleplay/data/chats/c1.jsonl")).toBe("phone version\n");
    expect(read(a, "apps/roleplay/data/chats/c1.meta.json")).toBe('{"title":"Phone"}');
    expect(r.savedTo).toBeTruthy();
    expect(fs.readFileSync(path.join(r.savedTo!, "apps/roleplay/data/chats/c1.jsonl"), "utf8")).toBe("desktop version\n");
  });

  it("keep mine leaves the local version, and the next push sends it", async () => {
    await firstRound();
    put(b, "apps/roleplay/data/chats/c1.jsonl", "phone\n");
    await push(ctx(b));
    put(a, "apps/roleplay/data/chats/c1.jsonl", "desktop\n");
    const r = await pull(ctx(a), { all: "mine" });
    expect(r.kept).toBe(1);
    expect(read(a, "apps/roleplay/data/chats/c1.jsonl")).toBe("desktop\n");
    expect((await push(ctx(a))).changed).toBe(1);
    await pull(ctx(b), {});
    expect(read(b, "apps/roleplay/data/chats/c1.jsonl")).toBe("desktop\n");
  });

  it("a pull against a rev that moved is refused", async () => {
    await firstRound();
    put(a, "notes/x.md", "x");
    await push(ctx(a));
    await expect(pull(ctx(b), { rev: 1 })).rejects.toThrow(/changed since/);
  });
});

describe("keys and scope", () => {
  const writeKeys = (d: Device, body: string) => fs.writeFileSync(d.p.auth, body);

  it("keys never travel in the clear and need the passphrase on the other side", async () => {
    writeKeys(a, '{"openrouter":"sk-secret-123"}');
    setState(a, { scope: { ...DEFAULT_SCOPE, secrets: true }, passphrase: "correct horse" });
    put(a, "notes/n.md", "n");
    await push(ctx(a));
    for (const f of fs.readdirSync(path.join(storeDir, "blobs"))) {
      expect(fs.readFileSync(path.join(storeDir, "blobs", f)).includes(Buffer.from("sk-secret-123"))).toBe(false);
    }
    setState(b, { scope: { ...DEFAULT_SCOPE, secrets: true } });
    await expect(pull(ctx(b), { all: "theirs" })).rejects.toThrow(/passphrase/);
    setState(b, { passphrase: "wrong one!" });
    await expect(pull(ctx(b), { all: "theirs" })).rejects.toThrow(/wrong passphrase/);
    setState(b, { passphrase: "correct horse" });
    const r = await pull(ctx(b), { all: "theirs" });
    expect(r.keys).toBe(true);
    expect(fs.readFileSync(b.p.auth, "utf8")).toBe('{"openrouter":"sk-secret-123"}');
  });

  it("a device with keys switched off neither sends nor takes them", async () => {
    writeKeys(a, '{"k":"1"}');
    put(a, "notes/n.md", "n");
    await push(ctx(a));
    const m = JSON.parse(fs.readFileSync(path.join(storeDir, "manifests/1.json"), "utf8"));
    expect(m.files[SECRETS_PATH]).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("auth.json");
  });

  it("pushing over keys sealed with another passphrase is refused unless replaced", async () => {
    writeKeys(a, '{"k":"1"}');
    setState(a, { scope: { ...DEFAULT_SCOPE, secrets: true }, passphrase: "first pass" });
    await push(ctx(a));
    setState(b, { scope: { ...DEFAULT_SCOPE, secrets: true }, passphrase: "first pass" });
    await pull(ctx(b), { all: "theirs" });
    writeKeys(b, '{"k":"2"}');
    setState(b, { passphrase: "other pass" });
    await expect(push(ctx(b))).rejects.toThrow(/another passphrase/);
    await push(ctx(b), { replaceKeys: true });
  });

  it("switching Molfar's chats off leaves them alone both ways and never deletes them", async () => {
    put(a, "agent/sessions/s1.jsonl", "agent chat\n");
    put(a, "notes/n.md", "n");
    await push(ctx(a));
    setState(b, { scope: { ...DEFAULT_SCOPE, agent: false } });
    await pull(ctx(b), { all: "theirs" });
    expect(has(b, "agent/sessions/s1.jsonl")).toBe(false);
    put(b, "notes/n.md", "changed on the phone");
    await push(ctx(b));
    const m = JSON.parse(fs.readFileSync(path.join(storeDir, "manifests/2.json"), "utf8"));
    expect(m.files["w/agent/sessions/s1.jsonl"]).toBeTruthy();
  });
});

describe("trust", () => {
  it("app code from the sync makes the app wait for the official check", async () => {
    writeInstallSource(a.p.appUpstream, "roleplay", { git: "https://github.com/MolfarWav/Molfar.Vertep-Roleplay.git", ref: "main" });
    await firstRound();
    // new on the phone: the record comes from the sync, marked restored
    expect(readInstallSource(b.p.appUpstream, "roleplay")).toEqual({ git: "https://github.com/MolfarWav/Molfar.Vertep-Roleplay.git", ref: "main", restored: true });
    // data alone does not touch the record
    writeInstallSource(b.p.appUpstream, "roleplay", { git: "https://github.com/MolfarWav/Molfar.Vertep-Roleplay.git", ref: "main" });
    put(a, "apps/roleplay/data/chats/c9.jsonl", "x\n");
    await push(ctx(a));
    const r = await pull(ctx(b), {});
    expect(r.apps).toEqual([]);
    expect(readInstallSource(b.p.appUpstream, "roleplay")?.restored).toBeUndefined();
  });

  it("a crafted manifest with a path outside the workspace is refused before anything is written", async () => {
    await firstRound();
    const m = JSON.parse(fs.readFileSync(path.join(storeDir, "manifests/1.json"), "utf8"));
    const body = Buffer.from("evil");
    const h = sha256(body);
    fs.writeFileSync(path.join(storeDir, "blobs", h), encodeBlob(body));
    m.rev = 2;
    m.files["w/../../escape.txt"] = { h, s: body.length };
    fs.writeFileSync(path.join(storeDir, "manifests/2.json"), JSON.stringify(m));
    const head = JSON.parse(fs.readFileSync(path.join(storeDir, "head.json"), "utf8"));
    fs.writeFileSync(path.join(storeDir, "head.json"), JSON.stringify({ ...head, rev: 2 }));
    await expect(pull(ctx(b), {})).rejects.toThrow(/refuses/);
    expect(fs.existsSync(path.join(b.dataDir, "users", "escape.txt"))).toBe(false);
  });

  it("a blob that does not match its record stops the pull", async () => {
    await firstRound();
    put(a, "notes/n.md", "real");
    await push(ctx(a));
    const m = JSON.parse(fs.readFileSync(path.join(storeDir, "manifests/2.json"), "utf8"));
    fs.writeFileSync(path.join(storeDir, "blobs", m.files["w/notes/n.md"].h), encodeBlob(Buffer.from("fake")));
    await expect(pull(ctx(b), {})).rejects.toThrow(/does not match|damaged/);
    expect(has(b, "notes/n.md")).toBe(false);
  });
});

describe("Google Drive store", () => {
  it("sign-in states are one-time and the pasted address is read", () => {
    const s = new SignIns();
    const { url, state } = s.start("mia", { id: "cid", secret: "x" }, "http://127.0.0.1:8788/v1/sync/drive/callback");
    const u = new URL(url);
    expect(u.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/drive.file");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(s.take(state)?.username).toBe("mia");
    expect(s.take(state)).toBeNull();
    expect(parseReturnUrl(`http://127.0.0.1:8788/v1/sync/drive/callback?state=abc&code=4/xyz`)).toEqual({ code: "4/xyz", state: "abc" });
    expect(parseReturnUrl("http://127.0.0.1/?error=access_denied")).toEqual({ error: "Google sign-in was cancelled" });
  });

  it("push and pull work through a fake Drive", async () => {
    // a tiny in-memory Drive: files by id with name and parent
    const files = new Map<string, { name: string; body: Buffer }>();
    let n = 0;
    let trashed = false;
    const fake = async (url: string, init: RequestInit = {}): Promise<Response> => {
      const u = new URL(url);
      const method = init.method ?? "GET";
      if (u.pathname === "/token") return Response.json({ access_token: "at", expires_in: 3600 });
      if (u.pathname === "/drive/v3/files" && method === "GET") {
        return Response.json({ files: [...files].map(([id, f]) => ({ id, name: f.name })) });
      }
      const media = /^\/(?:upload\/)?drive\/v3\/files\/([^/]+)$/.exec(u.pathname);
      if (media?.[1] === "folder" && method === "GET") return Response.json({ id: "folder", trashed });
      if (media && method === "GET") return new Response(files.get(media[1]!)!.body);
      if (media && method === "PATCH") {
        files.get(media[1]!)!.body = Buffer.from(init.body as Uint8Array);
        return Response.json({ id: media[1] });
      }
      if (media && method === "DELETE") {
        files.delete(media[1]!);
        return new Response(null, { status: 204 });
      }
      if (u.pathname === "/upload/drive/v3/files" && u.searchParams.get("uploadType") === "multipart") {
        const raw = Buffer.from(init.body as Uint8Array);
        const boundary = /boundary=(.+)$/.exec((init.headers as Record<string, string>)["content-type"]!)![1]!;
        const parts = raw.toString("latin1").split(`--${boundary}`);
        const meta = JSON.parse(parts[1]!.split("\r\n\r\n")[1]!.trim());
        const bodyText = parts[2]!.slice(parts[2]!.indexOf("\r\n\r\n") + 4, -2);
        const id = `f${++n}`;
        files.set(id, { name: meta.name, body: Buffer.from(bodyText, "latin1") });
        return Response.json({ id });
      }
      return new Response("unexpected", { status: 500 });
    };
    const fetchImpl = (url: string, init?: RequestInit) => fake(url.replace("https://oauth2.googleapis.com", "https://x"), init);
    const store = () => new DriveStore(new DriveAuth({ id: "c", secret: "s" }, "rt", fetchImpl), "folder", fetchImpl);
    put(a, "apps/roleplay/data/chats/c1.jsonl", '{"m":"hi"}\n');
    put(a, "apps/roleplay/data/img.png", new Uint8Array([0, 1, 2, 255, 13, 10]));
    await push({ ...ctx(a), store: store() });
    await pull({ ...ctx(b), store: store() }, { all: "theirs" });
    expect(read(b, "apps/roleplay/data/chats/c1.jsonl")).toBe('{"m":"hi"}\n');
    expect(fs.readFileSync(path.join(b.p.root, "apps/roleplay/data/img.png"))).toEqual(Buffer.from([0, 1, 2, 255, 13, 10]));
    put(b, "apps/roleplay/data/chats/c1.jsonl", "edited\n");
    await push({ ...ctx(b), store: store() });
    await pull({ ...ctx(a), store: store() }, {});
    expect(read(a, "apps/roleplay/data/chats/c1.jsonl")).toBe("edited\n");
    expect([...files.values()].some((f) => f.name === "manifest-1.json")).toBe(true);

    // a folder moved to the trash: Drive would still take uploads into it
    trashed = true;
    const before = files.size;
    put(a, "apps/roleplay/data/chats/c2.jsonl", "new\n");
    await expect(push({ ...ctx(a), store: store() })).rejects.toThrow(/trash/);
    await expect(pull({ ...ctx(b), store: store() }, {})).rejects.toThrow(/trash/);
    expect(files.size).toBe(before);
  });
});
