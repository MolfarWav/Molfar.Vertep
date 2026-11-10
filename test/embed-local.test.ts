/**
 * The embeddings model that runs on this computer (#255): the download (resume, checksum, cancel, delete),
 * the choice of source in embed(), the prefixes for a query and a document, and the shell-only routes.
 * A local server stands in for Hugging Face and a fake engine for transformers.js; the real thing was run by hand.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Hono } from "hono";
import { defaultInstanceConfig } from "../src/config.js";
import { childEngine, LocalEmbedder, type LocalEngine } from "../src/embed-local/index.js";
import type { LocalModelDef } from "../src/embed-local/catalog.js";
import { UserModelService } from "../src/models.js";
import { bootstrapUserDir, userPaths } from "../src/paths.js";
import { buildApp, type AppEnv } from "../src/server/app.js";
import { EventBus } from "../src/server/ws.js";
import { SessionService } from "../src/sessions.js";
import { UserService } from "../src/users.js";

const sha = (b: Uint8Array) => crypto.createHash("sha256").update(b).digest("hex");
const BIG = new Uint8Array(300_000).map((_, i) => (i * 7) % 251);
const SMALL = new TextEncoder().encode('{"model_type":"fake"}');
const FILES: Record<string, Uint8Array> = { "config.json": SMALL, "onnx/model.onnx": BIG };
const DEF: LocalModelDef = {
  id: "bge-m3", title: "Fake", repo: "owner/fake", revision: "rev1", license: "MIT", ramMb: 10, dtype: "q8", pooling: "cls",
  queryPrefix: "Q: ", docPrefix: "D: ",
  files: [
    { path: "config.json", size: SMALL.length },
    { path: "onnx/model.onnx", size: BIG.length, sha256: sha(BIG) },
  ],
};
const DEF2: LocalModelDef = { ...DEF, id: "embeddinggemma-2", title: "Fake 2", repo: "owner/fake2", pooling: "mean", queryPrefix: "", docPrefix: "" };

let server: ReturnType<typeof Bun.serve>;
let requests: { path: string; range: string | null }[] = [];
let corrupt = false;
let cutAfter = 0; // when > 0, a response sends this many bytes and then fails
let slowMs = 0;
beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url);
      const m = /^\/owner\/(fake2?)\/resolve\/rev1\/(.+)$/.exec(url.pathname);
      const file = m ? FILES[m[2] as string] : undefined;
      requests.push({ path: url.pathname, range: req.headers.get("range") });
      if (!file) return new Response("no", { status: 404 });
      let body = corrupt && m![2] === "onnx/model.onnx" ? file.map((b) => b ^ 1) : file;
      let status = 200;
      const r = /^bytes=(\d+)-$/.exec(req.headers.get("range") ?? "");
      if (r) { body = body.slice(Number(r[1])); status = 206; }
      const cut = cutAfter;
      const stream = new ReadableStream({
        async start(ctrl) {
          const step = 50_000;
          for (let i = 0; i < body.length; i += step) {
            if (slowMs) await Bun.sleep(slowMs);
            if (cut && i >= cut) { await Bun.sleep(40); ctrl.error(new Error("connection lost")); return; }
            ctrl.enqueue(body.slice(i, i + step));
          }
          ctrl.close();
        },
      });
      return new Response(stream, { status });
    },
  });
});
afterAll(() => server.stop(true));

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "embed-local-"));
  requests = [];
  corrupt = false;
  cutAfter = 0;
  slowMs = 0;
});
afterEach(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ } });

/** A runtime that "installs" by writing a resolvable package. */
const fakeInstall = (log: string[] = []) => async (runtimeDir: string) => {
  log.push("install");
  const pkg = path.join(runtimeDir, "node_modules", "@huggingface", "transformers");
  fs.mkdirSync(pkg, { recursive: true });
  fs.writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ name: "@huggingface/transformers", version: "0.0.0", main: "index.js" }));
  fs.writeFileSync(path.join(pkg, "index.js"), "module.exports = {}");
};
function fakeEngine(seen: { texts: string[]; pooling: string[]; loads: number; closed: number }): () => LocalEngine {
  return () => ({
    async load() { seen.loads++; },
    async embed(texts, pooling) { seen.texts.push(...texts); seen.pooling.push(pooling); return texts.map((t) => [t.length, 1]); },
    close() { seen.closed++; },
  });
}
const mk = (extra: Partial<ConstructorParameters<typeof LocalEmbedder>[0]> = {}) =>
  new LocalEmbedder({ dir, models: [DEF, DEF2], hfHost: `http://localhost:${server.port}`, installRuntime: fakeInstall(), supported: true, ...extra });
const finished = async (e: LocalEmbedder) => { while (e.status().job) await Bun.sleep(5); };

describe("downloading", () => {
  it("installs the program first, then the model, checks it and connects", async () => {
    const log: string[] = [];
    const e = mk({ installRuntime: fakeInstall(log) });
    expect(e.status().models.map((m) => m.state)).toEqual(["absent", "absent"]);
    expect(e.status().runtime.installed).toBe(false);
    let connected = "";
    e.download("bge-m3", (id) => { connected = id; });
    expect(e.status().job).toMatchObject({ model: "bge-m3", step: 1, phase: "runtime" });
    await finished(e);
    expect(log).toEqual(["install"]);
    expect(connected).toBe("bge-m3");
    const st = e.status();
    expect(st.lastError).toBeNull();
    expect(st.runtime.installed).toBe(true);
    expect(st.models[0]).toMatchObject({ id: "bge-m3", state: "ready", downloadedBytes: DEF.files[0]!.size + BIG.length });
    expect(fs.readFileSync(path.join(dir, "models", "owner/fake", "onnx/model.onnx")).equals(Buffer.from(BIG))).toBe(true);
    // the second model needs no new program
    e.download("embeddinggemma-2");
    await finished(e);
    expect(log).toEqual(["install"]);
    expect(e.status().models[1]!.state).toBe("ready");
  });

  it("reports step 2 with the bytes while the model comes", async () => {
    slowMs = 20;
    const e = mk();
    e.download("bge-m3");
    let sawModel = false;
    while (e.status().job) {
      const j = e.status().job!;
      if (j.phase === "model" && j.doneBytes > 0) { sawModel = true; expect(j.step).toBe(2); expect(j.totalBytes).toBe(SMALL.length + BIG.length); expect(j.doneBytes).toBeLessThanOrEqual(j.totalBytes); }
      await Bun.sleep(10);
    }
    expect(sawModel).toBe(true);
  });

  it("a cut connection leaves a partial download and the next click continues from where it stopped", async () => {
    cutAfter = 100_000;
    const e = mk();
    e.download("bge-m3");
    await finished(e);
    expect(e.status().lastError).toMatch(/ECONNRESET|connection/);
    const part = e.status().models[0]!;
    expect(part.state).toBe("partial");
    expect(part.downloadedBytes).toBeGreaterThan(0);
    cutAfter = 0;
    requests = [];
    e.download("bge-m3");
    expect(e.status().lastError).toBeNull();
    await finished(e);
    expect(e.status().models[0]!.state).toBe("ready");
    const resumed = requests.find((r) => r.path.endsWith("model.onnx"));
    expect(resumed?.range).toMatch(/^bytes=\d+-$/);
  });

  it("a file that fails its checksum is deleted and reported", async () => {
    corrupt = true;
    const e = mk();
    e.download("bge-m3");
    await finished(e);
    expect(e.status().lastError).toContain("checksum");
    expect(e.status().models[0]!.state).not.toBe("ready");
    expect(fs.existsSync(path.join(dir, "models", "owner/fake", "onnx/model.onnx"))).toBe(false);
  });

  it("cancel stops it quietly, without an error, and keeps what was downloaded", async () => {
    slowMs = 30;
    const e = mk();
    e.download("bge-m3");
    while (!(e.status().job && e.status().job!.doneBytes > 60_000)) await Bun.sleep(10);
    expect(e.cancel()).toBe(true);
    await finished(e);
    expect(e.status().lastError).toBeNull();
    expect(e.status().models[0]!.state).toBe("partial");
    expect(e.cancel()).toBe(false);
  });

  it("one download at a time; unknown models and unsupported builds are refused", async () => {
    slowMs = 20;
    const e = mk();
    e.download("bge-m3");
    expect(() => e.download("embeddinggemma-2")).toThrow(/another download/);
    expect(() => e.download("nope")).toThrow(/unknown/);
    e.cancel();
    await finished(e);
    const off = mk({ supported: false });
    expect(off.status()).toMatchObject({ supported: false, reason: "build" });
    expect(() => off.download("bge-m3")).toThrow(/cannot run/);
  });

  it("a program that fails to install is reported and nothing of the model downloads", async () => {
    const e = mk({ installRuntime: async () => { throw new Error("installing the program failed (1): offline"); } });
    e.download("bge-m3");
    await finished(e);
    expect(e.status().lastError).toContain("offline");
    expect(requests.length).toBe(0);
  });

  it("delete frees the files, and the program goes with the last model", async () => {
    const e = mk();
    e.download("bge-m3"); await finished(e);
    e.download("embeddinggemma-2"); await finished(e);
    const first = await e.remove("bge-m3");
    expect(first).toBeGreaterThanOrEqual(BIG.length);
    expect(e.status().runtime.installed).toBe(true);
    expect(e.status().models[0]!.state).toBe("absent");
    const last = await e.remove("embeddinggemma-2");
    expect(last).toBeGreaterThan(BIG.length);
    expect(e.status().runtime.installed).toBe(false);
    expect(fs.existsSync(path.join(dir, "runtime"))).toBe(false);
  });
});

describe("running the model", () => {
  it("puts the model's prefix on a query and on a document, loads once, lets go when idle", async () => {
    const seen = { texts: [] as string[], pooling: [] as string[], loads: 0, closed: 0 };
    const e = mk({ createEngine: fakeEngine(seen), idleMs: 40 });
    e.download("bge-m3"); await finished(e);
    const out = await e.embed("bge-m3", ["find me", "a stored text", "no kind given"], ["query", "document", "document"]);
    expect(out.length).toBe(3);
    expect(seen.texts).toEqual(["Q: find me", "D: a stored text", "D: no kind given"]);
    expect(seen.pooling).toEqual(["cls"]);
    await e.embed("bge-m3", ["again"]);
    expect(seen.loads).toBe(1);
    await Bun.sleep(120);
    expect(seen.closed).toBe(1);
    await e.embed("bge-m3", ["after idle"]);
    expect(seen.loads).toBe(2);
    e.close();
  });

  it("refuses a model that is not downloaded", async () => {
    const e = mk({ createEngine: fakeEngine({ texts: [], pooling: [], loads: 0, closed: 0 }) });
    await expect(e.embed("bge-m3", ["x"])).rejects.toThrow(/not downloaded/);
  });
});

describe("embed() in the model service", () => {
  function setup(settings: Record<string, unknown>) {
    const root = fs.mkdtempSync(path.join(dir, "svc-"));
    const p = bootstrapUserDir(root, "alice");
    fs.writeFileSync(p.settings, JSON.stringify(settings));
    const svc = new UserModelService("alice", p, defaultInstanceConfig());
    const seen = { texts: [] as string[], pooling: [] as string[], loads: 0, closed: 0 };
    const local = new LocalEmbedder({ dir: path.join(root, "embed-local"), models: [DEF, DEF2], hfHost: `http://localhost:${server.port}`, installRuntime: fakeInstall(), createEngine: fakeEngine(seen), supported: true });
    svc.localEmbed = local;
    return { svc, local, seen };
  }

  it("a connected model answers first, names itself, and gets the kinds", async () => {
    const { svc, local, seen } = setup({ embedLocal: "bge-m3" });
    local.download("bge-m3"); await finished(local);
    const out = await svc.embed(["a", "bb"], undefined, { kinds: ["query", "document"] });
    expect(out).toEqual([[4, 1], [5, 1]]); // "Q: a", "D: bb"
    expect(svc.embedModelUsed).toBe("bge-m3");
    expect(svc.embedVia).toBe("This computer");
    expect(seen.texts).toEqual(["Q: a", "D: bb"]);
    expect(svc.embedProviders().find((x) => x.id === "local")).toMatchObject({ ready: true, local: true });
    local.close();
  });

  it("empty texts are dropped together with their kinds", async () => {
    const { svc, local, seen } = setup({ embedLocal: "bge-m3" });
    local.download("bge-m3"); await finished(local);
    await svc.embed(["a", "  ", "c"], undefined, { kinds: ["query", "document", "document"] });
    expect(seen.texts).toEqual(["Q: a", "D: c"]);
    local.close();
  });

  it("not connected, not downloaded, or provider set to something else: it is not used", async () => {
    const a = setup({});
    a.local.download("bge-m3"); await finished(a.local);
    expect(await a.svc.embed(["x"])).toBeNull(); // downloaded but not connected, nothing else configured
    expect(a.svc.embedProviders().some((x) => x.id === "local")).toBe(false);
    const b = setup({ embedLocal: "bge-m3" });
    expect(await b.svc.embed(["x"])).toBeNull(); // connected in settings but the files are gone
    const c = setup({ embedLocal: "bge-m3", embedProvider: "openrouter" });
    c.local.download("bge-m3"); await finished(c.local);
    expect(await c.svc.embed(["x"])).toBeNull(); // the user pinned OpenRouter
    for (const s of [a, b, c]) s.local.close();
  });

  it("provider local uses only the model", async () => {
    const { svc, local } = setup({ embedLocal: "bge-m3", embedProvider: "local" });
    local.download("bge-m3"); await finished(local);
    expect(await svc.embed(["x"])).toEqual([[4, 1]]);
    local.close();
  });
});

describe("routes", () => {
  let app: Hono<AppEnv>;
  let token: string;
  let local: LocalEmbedder;
  beforeEach(() => {
    const users = new UserService(dir);
    users.create("admin", "admin", { password: "admin-pass-1" });
    token = users.create("alice", "user", { password: "test-pass-1" }).token;
    bootstrapUserDir(dir, "alice");
    local = new LocalEmbedder({ dir: path.join(dir, "embed-local"), models: [DEF, DEF2], hfHost: `http://localhost:${server.port}`, installRuntime: fakeInstall(), createEngine: fakeEngine({ texts: [], pooling: [], loads: 0, closed: 0 }), supported: true });
    app = buildApp({ users, sessions: new SessionService(dir), config: defaultInstanceConfig(), dataDir: dir, bus: new EventBus(), localEmbed: local });
  });
  const h = () => ({ authorization: `Bearer ${token}`, "content-type": "application/json" });
  const call = (method: string, p: string, body?: unknown) => app.request(p, { method, headers: h(), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const settings = () => JSON.parse(fs.readFileSync(userPaths(dir, "alice").settings, "utf8")) as Record<string, unknown>;

  it("download connects the model for the user who asked, once it is done", async () => {
    const r = await call("POST", "/v1/embeddings/local/download", { model: "bge-m3" });
    expect(r.status).toBe(200);
    expect((await r.json() as { job: unknown }).job).not.toBeNull();
    await finished(local);
    await Bun.sleep(30);
    const st = await (await call("GET", "/v1/embeddings/local")).json() as { connected: string; models: { id: string; state: string }[] };
    expect(st.connected).toBe("bge-m3");
    expect(st.models[0]!.state).toBe("ready");
    expect(settings().embedLocal).toBe("bge-m3");
    const cfg = await (await call("GET", "/v1/embeddings/config")).json() as { providers: { id: string }[] };
    expect(cfg.providers.map((p) => p.id)).toContain("local");
  });

  it("connecting a model puts a single hand-picked source back to automatic", async () => {
    await call("PUT", "/v1/embeddings/config", { provider: "openrouter" });
    await call("POST", "/v1/embeddings/local/download", { model: "bge-m3" });
    await finished(local);
    await Bun.sleep(30);
    expect(settings()).toMatchObject({ embedLocal: "bge-m3", embedProvider: "auto" });
  });

  it("another download while one runs is a 409; unknown models 400; cancel answers", async () => {
    await call("POST", "/v1/embeddings/local/download", { model: "bge-m3" });
    expect((await call("POST", "/v1/embeddings/local/download", { model: "embeddinggemma-2" })).status).toBe(409);
    expect((await call("POST", "/v1/embeddings/local/download", { model: "nope" })).status).toBe(400);
    await finished(local);
    expect(await (await call("POST", "/v1/embeddings/local/cancel")).json()).toEqual({ cancelled: false });
  });

  it("connect switches between downloaded models and null disconnects; a model that is not there is a 409", async () => {
    await call("POST", "/v1/embeddings/local/download", { model: "bge-m3" }); await finished(local); await Bun.sleep(30);
    expect((await call("POST", "/v1/embeddings/local/connect", { model: "embeddinggemma-2" })).status).toBe(409);
    local.download("embeddinggemma-2"); await finished(local);
    expect((await call("POST", "/v1/embeddings/local/connect", { model: "embeddinggemma-2" })).status).toBe(200);
    expect(settings().embedLocal).toBe("embeddinggemma-2");
    expect((await call("POST", "/v1/embeddings/local/connect", { model: null })).status).toBe(200);
    expect(settings().embedLocal).toBeUndefined();
  });

  it("delete removes the files and disconnects that model", async () => {
    await call("POST", "/v1/embeddings/local/download", { model: "bge-m3" }); await finished(local); await Bun.sleep(30);
    const r = await call("DELETE", "/v1/embeddings/local/bge-m3");
    expect(r.status).toBe(200);
    const body = await r.json() as { freed: number; connected: string | null; models: { state: string }[] };
    expect(body.freed).toBeGreaterThan(BIG.length);
    expect(body.connected).toBeNull();
    expect(body.models[0]!.state).toBe("absent");
    expect(settings().embedLocal).toBeUndefined();
    expect((await call("DELETE", "/v1/embeddings/local/nope")).status).toBe(404);
  });

  it("provider local is accepted only while a model is connected", async () => {
    expect((await call("PUT", "/v1/embeddings/config", { provider: "local" })).status).toBe(400);
    await call("POST", "/v1/embeddings/local/download", { model: "bge-m3" }); await finished(local); await Bun.sleep(30);
    expect((await call("PUT", "/v1/embeddings/config", { provider: "local" })).status).toBe(200);
  });
});

describe("the model process (#352)", () => {
  // a stand-in for transformers.js: the extractor answers [length, 1]; a text "CRASH" kills the process, "NOISE" prints to stdout first
  const stubLib = () => {
    const f = path.join(dir, "stub-transformers.mjs");
    fs.writeFileSync(
      f,
      `export const env = {};
export async function pipeline() {
  return async (texts) => {
    if (texts.some((t) => t.includes("CRASH"))) process.exit(3);
    if (texts.some((t) => t.includes("NOISE"))) process.stdout.write("native library chatter\\n");
    return { tolist: () => texts.map((t) => [t.length, 1]) };
  };
}
`,
    );
    return pathToFileURL(f).href;
  };
  const loadOpts = (lib: string) => ({ lib, modelsDir: dir + path.sep, repo: "owner/fake", dtype: "q8", textOnly: false });

  it("embeds through a process of its own, ignores what a library prints, and ends with close()", async () => {
    const eng = childEngine(path.join(dir, "embed-local"));
    await eng.load(loadOpts(stubLib()));
    expect(await eng.embed(["ab", "NOISE", "cde"], "cls")).toEqual([[2, 1], [5, 1], [3, 1]]);
    expect(eng.alive?.()).toBe(true);
    eng.close();
    expect(eng.alive?.()).toBe(false);
  });

  it("a process that dies fails the call with a message, and the embedder starts a fresh one next time", async () => {
    const lib = stubLib();
    const e = mk({ createEngine: () => childEngine(path.join(dir, "embed-local")), idleMs: 60_000 });
    e.download("bge-m3"); await finished(e);
    // the real runtime is not installed by the fake install: point the engine at the stub through the load options
    const real = (e as unknown as { createEngine: () => LocalEngine }).createEngine;
    (e as unknown as { createEngine: () => LocalEngine }).createEngine = () => {
      const eng = real();
      const load = eng.load.bind(eng);
      eng.load = (o) => load({ ...o, lib });
      return eng;
    };
    expect((await e.embed("bge-m3", ["fine"])).length).toBe(1);
    await expect(e.embed("bge-m3", ["CRASH"])).rejects.toThrow(/model process stopped/);
    // the engine itself is alive and the next call reloads the model in a new process
    expect((await e.embed("bge-m3", ["after the crash"]))[0]).toEqual([("D: after the crash").length, 1]);
    e.close();
  });
});
