/**
 * An embeddings model that runs on this computer (#255): downloaded on a click, run by transformers.js in a
 * Bun Worker, loaded when a call comes and let go after ten idle minutes. Everything lives under
 * `<data>/embed-local/` (the machine's, not a user's workspace, so it never lands in a workspace's git):
 *   runtime/            the program that runs a model: transformers.js with its dependencies, from a pinned lockfile
 *   models/<repo>/...   the model files, laid out as on Hugging Face
 *
 * Nothing downloads before the click. A download that stops is continued from where it stopped.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { INSTALL_KIND } from "../install.js";
import { findLocalModel, HF_HOST, LOCAL_MODELS, modelBytes, RUNTIME_PACKAGE, type LocalModelDef, type LocalModelId } from "./catalog.js";
import { RUNTIME_LOCK } from "./runtime-lock.js";
import { WORKER_SOURCE } from "./worker-source.js";

export type { LocalModelId } from "./catalog.js";

export interface LocalModelStatus {
  id: LocalModelId;
  title: string;
  license: string;
  ramMb: number;
  /** What the files take on disk once downloaded, bytes. */
  diskBytes: number;
  /** ready = all files present and checked; partial = a download was cut off. */
  state: "absent" | "partial" | "ready";
  downloadedBytes: number;
}

export interface LocalJobStatus {
  model: LocalModelId;
  /** 1 = the program that runs the model, 2 = the model. */
  step: 1 | 2;
  phase: "runtime" | "model" | "verify";
  doneBytes: number;
  totalBytes: number;
  etaSec: number | null;
}

export interface LocalStatus {
  supported: boolean;
  /** Why not: "build" = this build has no Bun to install the runtime. */
  reason: "build" | null;
  runtime: { installed: boolean; diskBytes: number };
  models: LocalModelStatus[];
  job: LocalJobStatus | null;
  /** The last download that failed (cleared by the next start); a cancel is not a failure. */
  lastError: string | null;
}

/** What the worker side needs; a test hands in a fake. */
export interface LocalEngine {
  load(opts: { lib: string; modelsDir: string; repo: string; dtype: string; textOnly: boolean }): Promise<void>;
  embed(texts: string[], pooling: string): Promise<number[][]>;
  close(): void;
}

export interface LocalEmbedderOptions {
  /** `<data>/embed-local`. */
  dir: string;
  models?: readonly LocalModelDef[];
  hfHost?: string;
  fetch?: typeof fetch;
  /** Installs the runtime into `dir/runtime`; the default runs `bun install` from the pinned lockfile. */
  installRuntime?: (runtimeDir: string, signal: AbortSignal) => Promise<void>;
  createEngine?: () => LocalEngine;
  /** Idle time before the model is let go of, ms. */
  idleMs?: number;
  supported?: boolean;
}

const READY_MARK = ".ready";
const sizeOf = (p: string): number => {
  try { return fs.statSync(p).size; } catch { return 0; }
};

class JobAborted extends Error {}

/** A Bun Worker made from WORKER_SOURCE; one request at a time is in flight per message id. */
function workerEngine(): LocalEngine {
  let worker: Worker | null = null;
  let seq = 0;
  const waiting = new Map<number, { ok: (v: { vectors?: number[][] }) => void; fail: (e: Error) => void }>();
  const ensure = (): Worker => {
    if (worker) return worker;
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
    const w = new Worker(url);
    w.onmessage = (e: MessageEvent) => {
      const m = e.data as { id: number; ok: boolean; vectors?: number[][]; error?: string };
      const p = waiting.get(m.id);
      if (!p) return;
      waiting.delete(m.id);
      if (m.ok) p.ok(m); else p.fail(new Error(m.error ?? "the model failed"));
    };
    w.onerror = (e: ErrorEvent) => {
      for (const p of waiting.values()) p.fail(new Error(e.message || "the model worker stopped"));
      waiting.clear();
      worker = null;
    };
    worker = w;
    return w;
  };
  const call = (msg: Record<string, unknown>): Promise<{ vectors?: number[][] }> =>
    new Promise((ok, fail) => {
      const id = ++seq;
      waiting.set(id, { ok, fail });
      ensure().postMessage({ id, ...msg });
    });
  return {
    async load(o) { await call({ type: "load", ...o }); },
    async embed(texts, pooling) { return (await call({ type: "embed", texts, pooling })).vectors ?? []; },
    close() {
      worker?.terminate();
      worker = null;
      for (const p of waiting.values()) p.fail(new Error("the model was closed"));
      waiting.clear();
    },
  };
}

/** `bun install` of the pinned runtime, scripts off, secrets scrubbed from the environment. */
async function installRuntimeWithBun(runtimeDir: string, signal: AbortSignal): Promise<void> {
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(
    path.join(runtimeDir, "package.json"),
    JSON.stringify({ name: "molfar-embed-runtime", private: true, dependencies: { [RUNTIME_PACKAGE.name]: RUNTIME_PACKAGE.version } }, null, 2) + "\n",
  );
  fs.writeFileSync(path.join(runtimeDir, "bun.lock"), RUNTIME_LOCK);
  const env: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(process.env)) if (typeof v === "string" && !/(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH)/i.test(k)) env[k] = v;
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["install", "--ignore-scripts", "--production", "--frozen-lockfile"], { cwd: runtimeDir, env, stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    child.stdout.on("data", (d) => { log = (log + d).slice(-2000); });
    child.stderr.on("data", (d) => { log = (log + d).slice(-2000); });
    const stop = () => child.kill();
    signal.addEventListener("abort", stop, { once: true });
    const timer = setTimeout(stop, 15 * 60_000);
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", stop);
      if (signal.aborted) reject(new JobAborted("cancelled"));
      else if (code === 0) resolve();
      else reject(new Error(`installing the program failed (${code}): ${log.trim().split("\n").slice(-3).join(" | ")}`));
    });
  });
  // keep only what this system runs: the other systems' binaries and the browser build are ~85% of the folder
  const nm = path.join(runtimeDir, "node_modules");
  fs.rmSync(path.join(nm, "onnxruntime-web"), { recursive: true, force: true });
  const napi = path.join(nm, "onnxruntime-node", "bin", "napi-v6");
  if (!fs.existsSync(path.join(napi, process.platform, process.arch))) {
    throw new Error(`this system (${process.platform} ${process.arch}) is not supported by the program that runs the model`);
  }
  for (const plat of fs.readdirSync(napi)) {
    if (plat !== process.platform) { fs.rmSync(path.join(napi, plat), { recursive: true, force: true }); continue; }
    for (const arch of fs.readdirSync(path.join(napi, plat))) {
      if (arch !== process.arch) fs.rmSync(path.join(napi, plat, arch), { recursive: true, force: true });
    }
  }
}

function dirBytes(dir: string): number {
  let total = 0;
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      total += e.isDirectory() ? dirBytes(p) : sizeOf(p);
    }
  } catch { /* gone */ }
  return total;
}

export class LocalEmbedder {
  private readonly dir: string;
  private readonly models: readonly LocalModelDef[];
  private readonly hfHost: string;
  private readonly doFetch: typeof fetch;
  private readonly installRuntime: (runtimeDir: string, signal: AbortSignal) => Promise<void>;
  private readonly createEngine: () => LocalEngine;
  private readonly idleMs: number;
  private readonly supported: boolean;

  private job: { model: LocalModelDef; step: 1 | 2; phase: LocalJobStatus["phase"]; doneBytes: number; totalBytes: number; samples: { at: number; bytes: number }[]; abort: AbortController } | null = null;
  private lastError: string | null = null;
  private engine: LocalEngine | null = null;
  private loaded: LocalModelId | null = null;
  private loading: Promise<void> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: LocalEmbedderOptions) {
    this.dir = opts.dir;
    this.models = opts.models ?? LOCAL_MODELS;
    this.hfHost = (opts.hfHost ?? HF_HOST).replace(/\/$/, "");
    this.doFetch = opts.fetch ?? fetch;
    this.installRuntime = opts.installRuntime ?? installRuntimeWithBun;
    this.createEngine = opts.createEngine ?? workerEngine;
    this.idleMs = opts.idleMs ?? 10 * 60_000;
    // the runtime is installed with Bun: a compiled build or the phone launcher has none
    this.supported = opts.supported ?? (INSTALL_KIND === "source" || INSTALL_KIND === "npm");
  }

  private get runtimeDir(): string { return path.join(this.dir, "runtime"); }
  private get modelsDir(): string { return path.join(this.dir, "models"); }
  private runtimeReady(): boolean {
    return fs.existsSync(path.join(this.runtimeDir, READY_MARK)) && fs.existsSync(path.join(this.runtimeDir, "node_modules", "@huggingface", "transformers", "package.json"));
  }
  private fileSize(def: LocalModelDef, p: string): number { return sizeOf(path.join(this.modelsDir, def.repo, p)); }
  private modelState(def: LocalModelDef): LocalModelStatus {
    const total = modelBytes(def);
    let have = 0;
    let all = true;
    for (const f of def.files) {
      const full = this.fileSize(def, f.path);
      if (full === f.size) have += full;
      else { all = false; have += Math.min(f.size, sizeOf(path.join(this.modelsDir, def.repo, f.path + ".part"))); }
    }
    const marked = fs.existsSync(path.join(this.modelsDir, def.repo, `.ok-${def.revision}`));
    const state: LocalModelStatus["state"] = all && marked ? "ready" : have > 0 ? "partial" : "absent";
    return { id: def.id, title: def.title, license: def.license, ramMb: def.ramMb, diskBytes: total, state, downloadedBytes: state === "ready" ? total : have };
  }

  isReady(id: unknown): id is LocalModelId {
    const def = findLocalModel(id, this.models);
    return !!def && this.supported && this.runtimeReady() && this.modelState(def).state === "ready";
  }

  status(): LocalStatus {
    let job: LocalJobStatus | null = null;
    if (this.job) {
      const j = this.job;
      let etaSec: number | null = null;
      const first = j.samples[0];
      if (j.phase === "model" && first && j.samples.length > 1) {
        const dt = (Date.now() - first.at) / 1000;
        const speed = dt > 0 ? (j.doneBytes - first.bytes) / dt : 0;
        if (speed > 0) etaSec = Math.round((j.totalBytes - j.doneBytes) / speed);
      }
      job = { model: j.model.id, step: j.step, phase: j.phase, doneBytes: j.doneBytes, totalBytes: j.totalBytes, etaSec };
    }
    const runtimeInstalled = this.runtimeReady();
    return {
      supported: this.supported,
      reason: this.supported ? null : "build",
      runtime: { installed: runtimeInstalled, diskBytes: runtimeInstalled ? dirBytes(this.runtimeDir) : 0 },
      models: this.models.map((m) => this.modelState(m)),
      job,
      lastError: this.lastError,
    };
  }

  /** Starts a download in the background: the program first when it is missing, then the model. `onReady` runs
   *  once the model is complete and checked (the caller connects it there). Throws when a download runs already. */
  download(id: unknown, onReady?: (id: LocalModelId) => void): void {
    const def = findLocalModel(id, this.models);
    if (!def) throw new Error("unknown model");
    if (!this.supported) throw new Error("this build cannot run a model on this computer");
    if (this.job) throw new Error("another download is running");
    this.lastError = null;
    const job = { model: def, step: (this.runtimeReady() ? 2 : 1) as 1 | 2, phase: (this.runtimeReady() ? "model" : "runtime") as LocalJobStatus["phase"], doneBytes: 0, totalBytes: modelBytes(def), samples: [] as { at: number; bytes: number }[], abort: new AbortController() };
    this.job = job;
    void this.run(job, def, onReady);
  }

  cancel(): boolean {
    if (!this.job) return false;
    this.job.abort.abort();
    return true;
  }

  /** Deletes a model's files; with the last model gone the program goes too. Returns the bytes freed. */
  async remove(id: unknown): Promise<number> {
    const def = findLocalModel(id, this.models);
    if (!def) throw new Error("unknown model");
    if (this.job) throw new Error("a download is running");
    if (this.loaded === def.id) this.release();
    const dir = path.join(this.modelsDir, def.repo);
    let freed = dirBytes(dir);
    fs.rmSync(dir, { recursive: true, force: true });
    // an empty owner folder is left behind otherwise
    try { fs.rmdirSync(path.dirname(dir)); } catch { /* not empty */ }
    if (!this.models.some((m) => this.modelState(m).state !== "absent")) {
      freed += dirBytes(this.runtimeDir);
      fs.rmSync(this.runtimeDir, { recursive: true, force: true });
    }
    return freed;
  }

  private async run(job: NonNullable<LocalEmbedder["job"]>, def: LocalModelDef, onReady?: (id: LocalModelId) => void): Promise<void> {
    const { signal } = job.abort;
    try {
      if (!this.runtimeReady()) {
        job.step = 1;
        job.phase = "runtime";
        fs.rmSync(this.runtimeDir, { recursive: true, force: true });
        await this.installRuntime(this.runtimeDir, signal);
        if (signal.aborted) throw new JobAborted("cancelled");
        fs.writeFileSync(path.join(this.runtimeDir, READY_MARK), RUNTIME_PACKAGE.version);
      }
      job.step = 2;
      job.phase = "model";
      job.doneBytes = def.files.reduce((a, f) => a + (this.fileSize(def, f.path) === f.size ? f.size : Math.min(f.size, sizeOf(path.join(this.modelsDir, def.repo, f.path + ".part")))), 0);
      for (const f of def.files) await this.fetchFile(def, f, job, signal);
      job.phase = "verify";
      for (const f of def.files) {
        if (!f.sha256) continue;
        if ((await this.sha256Of(path.join(this.modelsDir, def.repo, f.path), signal)) !== f.sha256) {
          fs.rmSync(path.join(this.modelsDir, def.repo, f.path), { force: true });
          throw new Error(`${f.path}: the checksum does not match, download again`);
        }
      }
      fs.writeFileSync(path.join(this.modelsDir, def.repo, `.ok-${def.revision}`), "");
      this.job = null;
      onReady?.(def.id);
    } catch (e) {
      this.lastError = signal.aborted || e instanceof JobAborted ? null : e instanceof Error ? e.message : String(e);
    } finally {
      this.job = null;
    }
  }

  private async fetchFile(def: LocalModelDef, f: { path: string; size: number }, job: NonNullable<LocalEmbedder["job"]>, signal: AbortSignal): Promise<void> {
    const dest = path.join(this.modelsDir, def.repo, f.path);
    if (sizeOf(dest) === f.size) return;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const part = dest + ".part";
    let have = sizeOf(part);
    if (have > f.size) { fs.rmSync(part, { force: true }); job.doneBytes -= have; have = 0; }
    if (have < f.size) {
      const url = `${this.hfHost}/${def.repo}/resolve/${def.revision}/${f.path.split("/").map(encodeURIComponent).join("/")}`;
      const res = await this.doFetch(url, { headers: have ? { range: `bytes=${have}-` } : {}, signal, redirect: "follow" });
      if ((res.status !== 200 && res.status !== 206) || !res.body) throw new Error(`${f.path}: the server answered ${res.status}`);
      if (res.status === 200 && have) { job.doneBytes -= have; have = 0; } // the server ignored the range: start over
      const fh = await fs.promises.open(part, have ? "a" : "w");
      try {
        for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
          await fh.write(chunk);
          have += chunk.length;
          job.doneBytes += chunk.length;
          const now = Date.now();
          job.samples.push({ at: now, bytes: job.doneBytes });
          while (job.samples.length > 1 && now - (job.samples[0] as { at: number }).at > 15_000) job.samples.shift();
        }
      } finally {
        await fh.close();
      }
    }
    if (signal.aborted) throw new JobAborted("cancelled");
    if (sizeOf(part) !== f.size) throw new Error(`${f.path}: the file came short (${sizeOf(part)} of ${f.size} bytes), try again to continue`);
    fs.renameSync(part, dest);
  }

  private sha256Of(file: string, signal: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      const h = crypto.createHash("sha256");
      const s = fs.createReadStream(file);
      s.on("data", (d) => { if (signal.aborted) { s.destroy(); reject(new JobAborted("cancelled")); } else h.update(d); });
      s.on("error", reject);
      s.on("end", () => resolve(h.digest("hex")));
    });
  }

  // ---------- running the model ----------

  private release(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    this.engine?.close();
    this.engine = null;
    this.loaded = null;
  }

  private async ensureLoaded(def: LocalModelDef): Promise<LocalEngine> {
    while (this.loading) await this.loading.catch(() => undefined);
    if (this.engine && this.loaded === def.id) return this.engine;
    this.release();
    const engine = this.createEngine();
    const lib = pathToFileURL(Bun.resolveSync(RUNTIME_PACKAGE.name, this.runtimeDir)).href;
    this.loading = engine.load({ lib, modelsDir: this.modelsDir + path.sep, repo: def.repo, dtype: def.dtype, textOnly: def.textOnly === true });
    try {
      await this.loading;
    } catch (e) {
      engine.close();
      throw e;
    } finally {
      this.loading = null;
    }
    this.engine = engine;
    this.loaded = def.id;
    return engine;
  }

  /** Vectors for the texts, in order; a `query` is what is searched for, a `document` what is stored.
   *  Throws when the model is not downloaded or fails. */
  async embed(id: LocalModelId, texts: string[], kinds?: readonly ("query" | "document")[]): Promise<number[][]> {
    const def = findLocalModel(id, this.models);
    if (!def || !this.isReady(id)) throw new Error("the model is not downloaded");
    const engine = await this.ensureLoaded(def);
    const prefixed = texts.map((t, i) => (kinds?.[i] === "query" ? def.queryPrefix : def.docPrefix) + t);
    try {
      const out = await engine.embed(prefixed, def.pooling);
      if (out.length !== texts.length) throw new Error("the model returned a wrong number of vectors");
      return out;
    } finally {
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.release(), this.idleMs);
      (this.idleTimer as { unref?: () => void }).unref?.();
    }
  }

  /** Lets go of the loaded model (shutdown, tests). */
  close(): void { this.release(); }
}

const shared = new Map<string, LocalEmbedder>();
/** The one embedder of a data folder: every user of this engine shares the downloaded files. */
export function sharedLocalEmbedder(dataDir: string): LocalEmbedder {
  const dir = path.join(path.resolve(dataDir), "embed-local");
  let e = shared.get(dir);
  if (!e) {
    e = new LocalEmbedder({ dir });
    shared.set(dir, e);
  }
  return e;
}
