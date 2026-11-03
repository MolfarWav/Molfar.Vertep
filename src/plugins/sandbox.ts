/**
 * Main-thread sandbox manager: worker threads own the QuickJS runtimes.
 * Timeout/abort → terminate that worker and respawn on next use. A poisoned
 * wasm state can never take down the server process (SPEC-v2 §S1).
 *
 * A call occupies a worker for its whole duration, so the pool exists for one
 * reason: one plugin route at a time was the whole engine's throughput. Every
 * route of every app queued behind a single worker, and a page that asks for
 * six things waited for six compilations in a row (measured: 4 parallel calls
 * to one 700 KB plugin = 1.8 s, i.e. strictly 4× a single call). With a small
 * pool the same page costs about one call.
 */
import os from "node:os";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { log } from "../logger.js";

/** A packaged build bundles the worker as its own entry point and names it:
 *  "./…" is the worker's source path, which a compiled executable maps to
 *  its embedded copy on every OS; anything else is a file beside the engine
 *  bundle. */
declare const MOLFAR_VERTEP_SANDBOX_WORKER: string | undefined;
const WORKER_PATH =
  typeof MOLFAR_VERTEP_SANDBOX_WORKER !== "string" ? path.join(import.meta.dir, "sandbox-worker.mjs") :
  MOLFAR_VERTEP_SANDBOX_WORKER.startsWith("./") ? MOLFAR_VERTEP_SANDBOX_WORKER :
  path.join(import.meta.dir, MOLFAR_VERTEP_SANDBOX_WORKER);
const CALL_TIMEOUT_MS = 20_000; // includes worker boot; sandbox itself caps at 10s
/** Room on top of a call's own execution limit for boot and the round trip. */
const CALL_OVERHEAD_MS = 10_000;

/** How many sandbox workers may run calls at once. Each idle worker holds its
 *  own wasm heap, so this stays small; it is capped rather than derived from
 *  the core count alone because one plugin call is short and mostly compile. */
const POOL_SIZE = (() => {
  const fromEnv = Math.floor(Number(process.env.MOLFAR_VERTEP_SANDBOX_WORKERS));
  if (Number.isFinite(fromEnv) && fromEnv >= 1) return Math.min(8, fromEnv);
  let cores = 0;
  try {
    cores = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
  } catch {
    cores = 2;
  }
  return Math.max(2, Math.min(4, (cores || 2) - 1 || 2));
})();

/** A worker nobody has called for this long is ended, and spawns again on
 *  demand: a quiet engine should not sit on N idle wasm heaps. */
const IDLE_RETIRE_MS = 5 * 60_000;

/** How long a worker may spend freeing its runtime after it has answered. */
const SETTLE_LIMIT_MS = 10_000;

export interface SandboxRequest {
  source: string;
  hook: string;
  ctx: unknown;
  storeSnapshot: Record<string, unknown>;
  storeAllowed?: boolean;
  llmAllowed?: boolean;
  llmResults?: Record<string, unknown>;
  netAllowed?: boolean;
  netResults?: Record<string, unknown>;
  embedResults?: Record<string, unknown>;
  /** { model, via } of the embedding that made embedResults[key]. */
  embedInfo?: Record<string, unknown>;
  maxStoreBytes?: number;
  fsAllowed?: boolean;
  fsRoot?: string | null;
  zipAllowed?: boolean;
  zipBase64?: string;
  /** Safe reads may be repeated once when the WASM runtime aborts during teardown. */
  retryOnPoison?: boolean;
  /** The siblings' insertCeiling answers for a route called with ?insertceilings (host.insertCeilings). */
  siblingCeilings?: { plugin: string; id: string; tokens: number }[];
  /** Who is calling ("plugin route GET /path"), named in the error the other
   *  calls get when this one takes the shared worker down. */
  label?: string;
  /** Execution and memory limits for this call, above the 10 s and 64 MB
   *  defaults. Only for work that is allowed to be long, on its own sandbox:
   *  a worker runs one call at a time. */
  executionTimeoutMs?: number;
  memoryLimitBytes?: number;
  /** Wall clock for the whole call, boot and round trip included, before the worker is terminated.
   *  Default: the execution limit plus CALL_OVERHEAD_MS. A call whose own limit can fail to fire
   *  (a memory bomb ignores the interrupt) sets it close to the limit. */
  hardTimeoutMs?: number;
  /** Calls that may write the plugin's data dir run one at a time per dir (the pool would
   *  otherwise let two read-modify-write handlers interleave); `false` marks a pure read, which
   *  shares the dir with other reads. Default: exclusive. Ignored without fs access. */
  exclusive?: boolean;
  /** The plugin may ask for scripts to be run (permission "script"); `scriptResults` are the answers to the
   *  last pass's requests, by key. */
  scriptAllowed?: boolean;
  scriptResults?: Record<string, unknown>;
}

export interface SandboxResponse {
  ok: boolean;
  out?: unknown;
  error?: string;
  /** The worker died because of another call; this one is innocent. */
  bystander?: boolean;
  storeWrites?: Record<string, unknown>;
  llmRequests?: { key: string; req: unknown }[];
  netRequests?: { key: string; req: unknown }[];
  scriptRequests?: { key: string; req: unknown }[];
  embedRequests?: { key: string; req: { texts?: unknown; model?: unknown } }[];
  logs?: string[];
  /** The worker's shared wasm heap after this call (see HEAP_RETIRE_BYTES). */
  heapBytes?: number;
  /** The call never started: its worker was condemned while it waited in line. Safe to re-run. */
  notStarted?: boolean;
  /** Paths the call wrote or removed, relative to the plugin's data dir.
   *  The route dispatcher commits a route's own files with this list and
   *  labels everything else out-of-band, without a status walk. */
  fsWrites?: string[];
}

/** The wasm heap only grows, a few MB per large route, so a worker retires past
 *  this and hands new calls to a fresh one; ending the thread is the only way
 *  that memory comes back. */
const HEAP_RETIRE_BYTES = 192 * 1024 * 1024;

/** Errors after which this worker must not serve another call. */
const POISONED = /timed out|aborted|exited|worker error|out of memory/;

interface DirGate {
  readers: number;
  writer: boolean;
  waiting: { exclusive: boolean; go: () => void }[];
}

class SandboxWorkerHandle {
  worker: Worker;
  private nextId = 1;
  private pending = new Map<number, { resolve: (r: SandboxResponse) => void }>();
  private retiring = false;
  /** Called once when the handle is gone; the pool drops it there. */
  onGone: (() => void) | null = null;
  /** The call that made this worker unfit; said to the calls it takes down. */
  private culprit: string | null = null;

  constructor() {
    // execArgv: [] — don't inherit runner flags (loader flags break/hang workers)
    this.worker = new Worker(WORKER_PATH, { execArgv: [] });
    this.worker.unref();
    this.worker.on("message", (msg: SandboxResponse & { id: number; settling?: boolean; settled?: boolean; poison?: boolean }) => {
      // The worker reports a teardown failure that happened AFTER it already
      // handed the result over: the call itself is answered, so there is no id
      // to settle — the worker only has to be taken out of service. Calls that
      // were already queued behind it never started (the worker is one thread,
      // and the teardown ran inside the previous call's handler): hand them back
      // to the pool instead of letting them run on an aborted runtime.
      if (msg.poison) {
        this.condemn("its wasm runtime aborted after answering");
        this.endSettling();
        this.failAll("sandbox aborted: worker ended after answering", true);
        return;
      }
      // Teardown finished cleanly: the worker may take the next call.
      if (msg.settled) {
        if (this.settling > 0) this.endSettling(this.settling - 1);
        return;
      }
      // An answer sent from inside the eval callback: the runtime is still being
      // freed, so the worker is not free until it says `settled`.
      if (msg.settling) {
        delete msg.settling;
        this.beginSettling();
      }
      this.pending.get(msg.id)?.resolve(msg);
      this.pending.delete(msg.id);
    });
    this.worker.on("error", (err) => this.failAll(`worker error: ${err.message}`));
    this.worker.on("exit", (code) => this.failAll(`worker exited (${code})`));
  }

  /** Answers already sent whose runtime teardown has not been confirmed yet. */
  private settling = 0;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  private beginSettling(): void {
    this.settling++;
    if (this.settleTimer) return;
    // a teardown that never ends is a stuck worker: take it out rather than wait for ever
    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      if (this.settling > 0) this.failAll("sandbox aborted: worker stuck while freeing its runtime", true);
    }, SETTLE_LIMIT_MS);
    (this.settleTimer as { unref?: () => void }).unref?.();
  }

  private endSettling(left = 0): void {
    this.settling = left;
    if (left === 0 && this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }

  /** Calls this worker is running or queued on. */
  get load(): number {
    return this.pending.size + this.settling;
  }

  /** Free right now: no call holds it and no teardown is running. */
  get idle(): boolean {
    return !this.retiring && this.pending.size === 0 && this.settling === 0;
  }

  /** Not retiring and not mid-teardown: a call sent now starts at once or behind a live call. */
  get ready(): boolean {
    return !this.retiring && this.settling === 0;
  }

  get usable(): boolean {
    return !this.retiring;
  }

  /** Name the call that poisoned this worker, before it is terminated. */
  condemn(who: string): void {
    this.culprit ??= who;
  }

  /** `notStarted`: every waiting call was queued behind a condemned call and never ran. */
  private failAll(reason: string, notStarted = false): void {
    const bystander = this.culprit !== null;
    if (this.culprit) reason = `${reason}: stopped because another call failed (${this.culprit})`;
    this.endSettling();
    // dispose first: the pool must not hand these calls straight back to this worker
    void this.dispose();
    for (const { resolve } of [...this.pending.values()]) resolve({ ok: false, error: reason, ...(bystander ? { bystander } : {}), ...(notStarted ? { notStarted } : {}) });
    this.pending.clear();
  }

  call(req: SandboxRequest, timeoutMs = req.hardTimeoutMs ?? (req.executionTimeoutMs ? req.executionTimeoutMs + CALL_OVERHEAD_MS : CALL_TIMEOUT_MS)): Promise<SandboxResponse> {
    const id = this.nextId++;
    return new Promise<SandboxResponse>((resolve) => {
      let settled = false;
      const finish = (r: SandboxResponse) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.pending.delete(id);
        if (this.retiring && this.pending.size === 0) void this.dispose();
        resolve(r);
      };
      const timer = setTimeout(() => finish({ ok: false, error: `sandbox call timed out after ${timeoutMs}ms` }), timeoutMs);
      this.pending.set(id, { resolve: finish });
      this.worker.postMessage({ id, ...req });
    });
  }

  /** Take no new work; the thread ends once its in-flight calls have answered. */
  retire(): void {
    if (this.retiring) return;
    this.retiring = true;
    if (this.pending.size === 0) void this.dispose();
  }

  async dispose(): Promise<void> {
    if (this.gone) return;
    this.gone = true;
    this.onGone?.();
    this.onGone = null;
    await this.worker.terminate().catch(() => undefined);
  }

  private gone = false;
}

export class PluginSandbox {
  private handles: SandboxWorkerHandle[] = [];
  private recovering = new WeakMap<SandboxWorkerHandle, Promise<void>>();
  private idleTimers = new WeakMap<SandboxWorkerHandle, ReturnType<typeof setTimeout>>();

  /** A worker for the next call: one that is free, else a new one while the
   *  pool is below its size, else the least loaded (the call then queues there,
   *  exactly as everything used to). */
  private acquire(): SandboxWorkerHandle {
    for (const h of this.handles) if (h.idle) return h;
    if (this.handles.length < POOL_SIZE) return this.spawn();
    // never queue behind a worker that is still freeing its runtime: if that
    // fails, the call would have waited for nothing
    let best: SandboxWorkerHandle | null = null;
    for (const h of this.handles) if (h.ready && (!best || h.load < best.load)) best = h;
    return best ?? this.spawn();
  }

  private spawn(): SandboxWorkerHandle {
    const h = new SandboxWorkerHandle();
    this.handles.push(h);
    h.onGone = () => {
      const i = this.handles.indexOf(h);
      if (i >= 0) this.handles.splice(i, 1);
    };
    return h;
  }

  /** End a worker that nobody needed for a while, unless the pool would empty. */
  private scheduleIdleRetire(h: SandboxWorkerHandle): void {
    const prev = this.idleTimers.get(h);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      this.idleTimers.delete(h);
      if (!h.idle) return;
      if (this.handles.length <= 1) return;
      h.retire();
    }, IDLE_RETIRE_MS);
    // an idle timer must never keep the process alive
    (t as { unref?: () => void }).unref?.();
    this.idleTimers.set(h, t);
  }

  private async evalAttempt(req: SandboxRequest, mayRetry: boolean): Promise<SandboxResponse> {
    const h = this.acquire();
    const timer = this.idleTimers.get(h);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(h);
    }
    const res = await h.call(req);
    // queued behind a call whose worker then failed: it never ran, so run it again elsewhere
    if (res.notStarted) return this.evalAttempt(req, mayRetry);
    if ((res.heapBytes ?? 0) > HEAP_RETIRE_BYTES) {
      h.retire();
    } else if (h.usable) {
      this.scheduleIdleRetire(h);
    }
    if (!res.ok && POISONED.test(res.error ?? "")) {
      if (!this.recovering.has(h)) {
        const who = `${req.label ?? req.hook}: ${res.error}`;
        log.warn(`[sandbox] worker poisoned by ${who} — terminating and respawning`);
        h.condemn(who);
      }
      await this.recoverHandle(h);
      // a bystander of another call's failure did nothing wrong: retry it even when that call timed out
      if (mayRetry && (res.bystander || !/timed out/.test(res.error ?? ""))) return this.evalAttempt(req, false);
    }
    return res;
  }

  private recoverHandle(h: SandboxWorkerHandle): Promise<void> {
    const pending = this.recovering.get(h);
    if (pending) return pending;
    const recovery = h.dispose()
      .catch(() => undefined)
      .finally(() => this.recovering.delete(h));
    this.recovering.set(h, recovery);
    return recovery;
  }

  /** Run one eval; poisoned workers are replaced before another call uses them. */
  async eval(req: SandboxRequest): Promise<SandboxResponse> {
    // One worker used to mean one call at a time, so a handler that reads a
    // file and writes it back could never be interleaved with another. With a
    // pool it could: calls that may write a data dir take it alone, pure reads
    // share it. Different dirs (different apps) never wait for each other.
    const key = req.fsAllowed && req.fsRoot ? req.fsRoot : null;
    if (!key) return this.evalAttempt(req, req.retryOnPoison === true);
    const exclusive = req.exclusive !== false;
    const gate = this.gates.get(key) ?? { readers: 0, writer: false, waiting: [] };
    this.gates.set(key, gate);
    await this.enter(gate, exclusive);
    try {
      return await this.evalAttempt(req, req.retryOnPoison === true);
    } finally {
      this.leave(key, gate, exclusive);
    }
  }

  private gates = new Map<string, DirGate>();

  private enter(g: DirGate, exclusive: boolean): Promise<void> {
    const free = exclusive ? !g.writer && g.readers === 0 && !g.waiting.length : !g.writer && !g.waiting.length;
    if (free) {
      if (exclusive) g.writer = true;
      else g.readers++;
      return Promise.resolve();
    }
    return new Promise<void>((go) => g.waiting.push({ exclusive, go }));
  }

  /** First come, first served: a waiting writer holds back later readers, so writes cannot starve. */
  private leave(key: string, g: DirGate, exclusive: boolean): void {
    if (exclusive) g.writer = false;
    else g.readers--;
    while (g.waiting.length) {
      const w = g.waiting[0]!;
      if (w.exclusive) {
        if (g.writer || g.readers > 0) break;
        g.writer = true;
        g.waiting.shift();
        w.go();
        break;
      }
      if (g.writer) break;
      g.readers++;
      g.waiting.shift();
      w.go();
    }
    if (!g.writer && g.readers === 0 && !g.waiting.length) this.gates.delete(key);
  }

  async dispose(): Promise<void> {
    const all = this.handles;
    this.handles = [];
    for (const h of all) {
      const t = this.idleTimers.get(h);
      if (t) clearTimeout(t);
      await h.dispose().catch(() => undefined);
    }
  }
}

/** Process-wide singleton. */
export const sandbox = new PluginSandbox();
