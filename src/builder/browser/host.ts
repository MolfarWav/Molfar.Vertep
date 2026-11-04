/**
 * Builder host, loaded by the shell and the standalone app page
 * (/client/builder/host.js). For each app on screen it keeps a sandboxed
 * builder frame (/client/builder/frame.html), relays that frame's file reads
 * to the engine for that one app, uploads the output, and holds the app's
 * build lease so only one tab builds at a time.
 *
 * The frame is untrusted (a Tailwind plugin is app code and runs there), so
 * every message from it is shape-checked and bound to the app this host
 * chose; it can never name another app or reach anything but the file route.
 */

import { depsOf, sessionStale } from "./stale";

declare const __BUILDER_VERSION__: string;

interface BuildMessage {
  text: string;
  file?: string;
  line?: number;
  column?: number;
  lineText?: string;
}

export interface BuildStatus {
  phase: "checking" | "building" | "ready" | "error" | "waiting";
  message?: string;
  errors?: BuildMessage[];
}

/** What a build did, sent with its output so the engine's log shows it. */
interface BuildStats {
  kind: string;
  /** continued from the saved module graph */
  resumed: boolean;
  /** files the build was told changed */
  changed: number;
  ms: number;
}

interface ServerStatus {
  rev: string;
  needsBuild: boolean;
  buildable: boolean;
  installing?: boolean;
  status: { rev?: string; ok?: boolean; mode?: string; errors?: BuildMessage[] } | null;
  dev: unknown;
}

const VERSION = typeof __BUILDER_VERSION__ === "string" ? __BUILDER_VERSION__ : "dev";
/** A build stops when the frame has done nothing for this long: no file read, no message (#190). A slow phone
 *  reads files all through a cold build, so it is never cut while it works; a hung one still ends. */
const BUILD_IDLE = 3 * 60_000;
/** And in any case after this long: a build that keeps reading but never ends. */
const BUILD_CEILING = 30 * 60_000;
/** How long the builder frame page may take to start (a small page: this is not a download of esbuild). */
const FRAME_LOAD_TIMEOUT = 30_000;
/** How long esbuild may take to compile and answer once the frame is up. */
const ESBUILD_START_TIMEOUT = 120_000;
const FRAME_STUCK =
  "The app builder did not start: its page never answered inside the sandbox frame. The usual cause is the address you opened Vertep at " +
  "not matching what the engine sees, for example a reverse proxy that does not pass the Host and X-Forwarded-Proto headers " +
  "(the frame's Content-Security-Policy is built from them); a browser extension that blocks frames can do it too. " +
  "Open the engine by its own address (http://<server>:<port>) to check, and look in the browser console for \"Content Security Policy\" or \"Refused to frame\".";
const ESBUILD_STUCK = "The app builder started but esbuild did not become ready in two minutes. Reload the page; if it repeats, the device may be too slow or short of memory.";
const READ_BUDGET = 1536 * 1024 * 1024;
/** Seconds a BUSY lease may block a build before this tab forces it over.
 *  Idle leases yield at once and a dead holder's lease runs out in 45 s (see
 *  takeLease), so this only caps a holder that stays alive and busy: it waits
 *  out the build ceiling, or a second tab on a slow phone would start a second
 *  build beside a first one that is still working (#190). */
const TAKEOVER_AFTER_S = 31 * 60;

let wasmBytes: Promise<ArrayBuffer> | null = null;
const wasm = () =>
  (wasmBytes ??= fetch(`/client/builder/esbuild.wasm?v=${VERSION}`).then((r) => {
    if (!r.ok) throw new Error(`esbuild.wasm: ${r.status}`);
    return r.arrayBuffer();
  }));

const api = (path: string, init?: RequestInit) =>
  fetch(path, { credentials: "same-origin", ...init, headers: { "content-type": "application/json", ...(init?.headers as Record<string, string> | undefined) } }).then(async (r) => {
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((body as { error?: string }).error ?? `${path}: ${r.status}`);
    return body;
  });

// ---------- engine event stream (one per page) ----------
type BusListener = (type: string, payload: Record<string, unknown>) => void;
const busListeners = new Set<BusListener>();
let bus: WebSocket | null = null;
function ensureBus(): void {
  if (bus) return;
  const open = () => {
    const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/v1/ws`);
    bus = ws;
    ws.onmessage = (ev) => {
      try {
        const f = JSON.parse(String(ev.data)) as { type?: string; payload?: Record<string, unknown> };
        if (typeof f.type === "string") for (const l of busListeners) l(f.type, f.payload ?? {});
      } catch {
        /* not ours */
      }
    };
    ws.onclose = () => setTimeout(open, 1500);
  };
  open();
}

class BuilderFrame {
  private iframe: HTMLIFrameElement;
  private ready: Promise<void>;
  private waiting = new Map<number, (out: Record<string, unknown>) => void>();
  private nextId = 0;
  private bytes = 0;
  private onMessage: (e: MessageEvent) => void;
  dead = false;
  /** How long the frame's last build took, and whether it continued from a saved module graph. */
  lastMs = 0;
  lastResumed = false;
  /** When the frame last did something (a file read, any message): the build watchdog reads it. */
  private lastActivity = Date.now();

  constructor(private appId: string, prior: unknown) {
    this.iframe = document.createElement("iframe");
    this.iframe.setAttribute("sandbox", "allow-scripts");
    this.iframe.setAttribute("aria-hidden", "true");
    this.iframe.title = "app builder";
    this.iframe.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden";
    let loaded!: () => void;
    let readyOk!: () => void;
    let readyFail!: (e: Error) => void;
    const loadedP = new Promise<void>((r) => (loaded = r));
    // The frame page and esbuild each get a limit. Without one a frame the browser never starts (a
    // Content-Security-Policy that does not match the address the page is opened at, an extension) leaves
    // `ready` pending for good: no CPU, no log, no error, and the build watchdog, which only
    // starts after `ready`, never runs. The user saw a tab that "builds" for ever.
    let bootTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => readyFail(new Error(FRAME_STUCK)),
      FRAME_LOAD_TIMEOUT,
    );
    const bootDone = () => {
      clearTimeout(bootTimer);
      bootTimer = undefined;
    };
    this.ready = new Promise<void>((res, rej) => {
      readyOk = () => {
        bootDone();
        res();
      };
      readyFail = (e) => {
        bootDone();
        rej(e);
      };
    });
    this.onMessage = (e: MessageEvent) => {
      if (e.source !== this.iframe.contentWindow) return;
      const d = e.data as { __molfarBuilder?: number; t?: string; rid?: unknown; ops?: unknown; id?: unknown; output?: unknown; error?: unknown; text?: unknown; ms?: unknown; resumed?: unknown };
      if (!d || d.__molfarBuilder !== 1) return;
      this.lastActivity = Date.now();
      // the frame page is up: its start-up limit is met (downloading esbuild.wasm is not counted in it)
      if (d.t === "loaded") {
        bootDone();
        loaded();
      }
      else if (d.t === "ready") readyOk();
      else if (d.t === "fatal") readyFail(new Error(String(d.error)));
      else if (d.t === "log") console.warn(`[builder:${appId}]`, String(d.text).slice(0, 4000));
      else if (d.t === "fs" && typeof d.rid === "number" && Array.isArray(d.ops)) void this.relay(d.rid, d.ops);
      else if (d.t === "result" && typeof d.id === "number" && d.output && typeof d.output === "object") {
        this.lastMs = typeof d.ms === "number" ? Math.round(d.ms) : 0;
        this.lastResumed = d.resumed === true;
        this.waiting.get(d.id)?.(d.output as Record<string, unknown>);
        this.waiting.delete(d.id);
      }
    };
    addEventListener("message", this.onMessage);
    this.iframe.src = `/client/builder/frame.html?v=${VERSION}`;
    document.body.appendChild(this.iframe);
    void (async () => {
      try {
        const [bytes] = await Promise.all([wasm(), loadedP]);
        const copy = bytes.slice(0);
        this.post({ t: "init", wasm: copy, prior }, [copy]);
        // the frame is up: esbuild now gets its own (longer) time to start, a phone compiles the wasm slowly
        bootDone();
        bootTimer = setTimeout(() => readyFail(new Error(ESBUILD_STUCK)), ESBUILD_START_TIMEOUT);
      } catch (e) {
        readyFail(e as Error);
      }
    })();
  }

  private post(m: Record<string, unknown>, transfer: Transferable[] = []): void {
    // the frame is opaque-origin: "*" is the only target it can have, and
    // nothing secret is ever sent to it
    this.iframe.contentWindow?.postMessage({ __molfarBuilder: 1, ...m }, "*", transfer);
  }

  private async relay(rid: number, ops: unknown[]): Promise<void> {
    this.lastActivity = Date.now();
    let results: unknown[];
    if (this.bytes > READ_BUDGET) {
      results = ops.map(() => ({ ok: false, error: "the build read too much" }));
    } else {
      try {
        const body = (await api(`/v1/apps/${encodeURIComponent(this.appId)}/build/fs`, { method: "POST", body: JSON.stringify({ ops: ops.slice(0, 1000) }) })) as { results?: unknown[] };
        results = body.results ?? [];
        for (const r of results) {
          const x = r as { text?: string; b64?: string };
          this.bytes += (x.text?.length ?? 0) + (x.b64?.length ?? 0);
        }
      } catch (e) {
        results = ops.map(() => ({ ok: false, error: String((e as Error).message) }));
      }
    }
    this.post({ t: "fs-result", rid, results });
  }

  async build(kind: string, changed: string[] = [], graph?: unknown): Promise<Record<string, unknown>> {
    await this.ready;
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      // A fixed 5-minute limit stopped cold builds that were still working on mid-range phones (#190). The
      // watchdog stops a build that does nothing for BUILD_IDLE, or runs past BUILD_CEILING. Time the page
      // spent hidden (Android freezes a background tab) does not count as idle.
      const started = Date.now();
      this.lastActivity = started;
      const onVisible = () => {
        if (document.visibilityState === "visible") this.lastActivity = Date.now();
      };
      document.addEventListener("visibilitychange", onVisible);
      const stop = () => {
        clearInterval(watch);
        document.removeEventListener("visibilitychange", onVisible);
      };
      const watch = setInterval(() => {
        const now = Date.now();
        const why = now - this.lastActivity > BUILD_IDLE
          ? "the build stopped making progress for 3 minutes and was stopped"
          : now - started > BUILD_CEILING
            ? "the build took longer than 30 minutes and was stopped"
            : null;
        if (!why) return;
        stop();
        this.waiting.delete(id);
        this.dispose();
        reject(new Error(why));
      }, 5_000);
      this.waiting.set(id, (out) => {
        stop();
        resolve(out);
      });
      this.post({ t: "build", id, kind, changed, ...(graph !== undefined ? { graph } : {}) });
    });
  }

  dispose(): void {
    this.dead = true;
    removeEventListener("message", this.onMessage);
    this.iframe.remove();
  }
}

type Watcher = { onStatus: (s: BuildStatus) => void; onReload: (why: string) => void };

class AppBuild {
  private holder = Math.random().toString(36).slice(2) + Date.now().toString(36);
  private leased = false;
  /** Why the last lease request was refused (an HTTP error, not another tab holding it); null when it was answered. */
  private leaseError: string | null = null;
  private disposed = false;
  private frame: BuilderFrame | null = null;
  private changed = new Set<string>();
  private running: Promise<void> | null = null;
  private settling: Promise<ServerStatus | null> | null = null;
  private again = false;
  private retried = false;
  /** The deps bundle the frame's session builds on (see stale.ts). */
  private sessionDeps: string | null = null;
  /** The saved module graph and the files that differ from it, found when the app opened: the first build continues from it. */
  private resumed: { graph: unknown; changed: string[] } | null = null;
  /** Why the next full build runs; the shell shows it when the page reloads for it (#24). */
  private fullWhy = "the built files did not match the sources when the app opened";
  private renew: ReturnType<typeof setInterval> | undefined;
  private listener: BusListener;
  private lastStatus: BuildStatus = { phase: "checking" };
  watchers = new Set<Watcher>();
  ready: Promise<void>;

  constructor(private appId: string) {
    this.listener = (type, payload) => {
      if (payload.app !== appId) return;
      if (type === "build_needed") {
        for (const p of Array.isArray(payload.paths) ? payload.paths : []) if (typeof p === "string") this.changed.add(p);
        void this.kick();
      } else if (type === "app_changed" && payload.updated === true) {
        // an update replaced the app's sources on disk. Without a rebuild the
        // open page keeps serving the version it was loaded with, which reads
        // as "the update did nothing". Full, not update: the new version may
        // add, remove or rewire files no change event ever named.
        void this.rebuild("the app was updated");
      } else if (type === "app_built" && payload.kind === "full" && payload.holder !== this.holder) {
        for (const w of this.watchers) w.onReload("another open tab or device rebuilt the app");
      }
    };
    busListeners.add(this.listener);
    ensureBus();
    this.ready = this.start();
  }

  private status(s: BuildStatus): void {
    this.lastStatus = s;
    for (const w of this.watchers) w.onStatus(s);
  }

  current(): BuildStatus {
    return this.lastStatus;
  }

  private base(): string {
    return `/v1/apps/${encodeURIComponent(this.appId)}/build`;
  }

  /** The engine refused the lease request itself (403, 5xx, no answer): saying "another tab is building" would be a lie and could last for ever. */
  private leaseRefused(): boolean {
    if (this.leaseError === null || this.disposed) return false;
    this.status({
      phase: "error",
      message:
        `The engine refused the build request: ${this.leaseError}. If Vertep is opened through a reverse proxy, the proxy must pass the Host header ` +
        "unchanged (a proxy that rewrites it makes the engine refuse every write as cross-origin) and, for HTTPS, X-Forwarded-Proto.",
    });
    return true;
  }

  private async lease(opts: { force?: boolean; busy?: boolean } = {}): Promise<boolean> {
    const busy = opts.busy ?? this.running !== null;
    try {
      const r = (await api(`${this.base()}/lease`, { method: "POST", body: JSON.stringify({ holder: this.holder, busy, ...(opts.force ? { force: true } : {}) }) })) as { granted?: boolean };
      this.leased = r.granted === true;
      this.leaseError = null;
    } catch (e) {
      this.leased = false;
      this.leaseError = String((e as Error).message);
    }
    if (this.disposed) {
      this.releaseLease();
      return false;
    }
    if (this.leased && !this.renew) this.renew = setInterval(() => void this.lease(), 15_000);
    return this.leased;
  }

  /** Build the current sources now, even when dist looks current. The user's
   *  Rebuild button and the agent's build requests both land here. */
  async rebuild(why = "a rebuild was requested"): Promise<void> {
    if (this.disposed) return;
    this.fullWhy = why;
    let rev = "";
    try {
      rev = ((await api(this.base())) as ServerStatus).rev;
    } catch {
      /* stamp whatever lands */
    }
    if (this.disposed) return;
    if (!(await this.lease({ busy: true }))) {
      if (this.leaseRefused()) return;
      if (!this.disposed) this.status({ phase: "waiting", message: "Another open tab is building this app" });
      return;
    }
    await this.kick("full", rev);
  }

  private async start(): Promise<void> {
    this.status({ phase: "checking" });
    let st: ServerStatus;
    try {
      st = (await api(this.base())) as ServerStatus;
    } catch (e) {
      this.status({ phase: "error", message: String((e as Error).message) });
      return;
    }
    if (this.disposed) return;
    if (!st.buildable) {
      this.status({ phase: "ready" });
      return;
    }
    if (await this.lease({ busy: true })) {
      if (this.disposed) {
        this.releaseLease();
        return;
      }
      if (st.needsBuild) {
        // The sources differ from the last build: when its module graph is
        // still good, only the files that differ are rebuilt (a hot update
        // the app's page loads fresh), not every module (#181).
        const r = st.installing ? null : await this.resume();
        if (r && r.changed.length === 0) {
          // an edit nothing builds from (a doc, a touch): dist is current
          if (await this.ack(st.rev, { kind: "ack", resumed: true, changed: 0, ms: 0 })) {
            this.idle(st);
            return;
          }
        } else if (r) {
          this.resumed = r;
          for (const p of r.changed) this.changed.add(p);
          await this.kick("update", st.rev);
          return;
        }
        await this.kick("full", st.rev);
      } else this.idle(st);
      return;
    }
    if (this.disposed) return;
    if (this.leaseRefused()) return;
    if (!st.needsBuild) {
      this.status({ phase: "ready" });
      return;
    }
    // another tab is building: wait for it
    this.status({ phase: "waiting", message: "Another open tab is building this app" });
    let refused = 0;
    for (let i = 0; i < 300; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (this.disposed) return;
      try {
        st = (await api(this.base())) as ServerStatus;
        if (!st.needsBuild) break;
        // the holder is waiting out a package install, not stuck
        if (st.installing) {
          i--;
          continue;
        }
        // an idle lease (its holder is not mid-build) yields at once; one that
        // stays busy past any plausible build is forced over. Either way this
        // tab stops waiting the moment the holder has nothing to protect.
        if (await this.lease({ busy: true, force: i >= TAKEOVER_AFTER_S - 1 })) {
          if (this.disposed) {
            this.releaseLease();
            return;
          }
          await this.kick("full", st.rev);
          return;
        }
        // one failed request may be a blip; three in a row is a refusal
        refused = this.leaseError === null ? 0 : refused + 1;
        if (refused >= 3 && this.leaseRefused()) return;
      } catch {
        /* keep waiting */
      }
    }
    if (!this.disposed) this.status({ phase: "ready" });
  }

  /** dist is current for the sources at `rev` although they changed: tell the engine. */
  private async ack(rev: string, stats: BuildStats): Promise<boolean> {
    try {
      const r = (await api(`${this.base()}/ack`, { method: "POST", body: JSON.stringify({ holder: this.holder, rev, stats }) })) as { acked?: boolean };
      return r.acked === true;
    } catch {
      /* a change landed since, or the lease moved: its own build follows */
      return false;
    }
  }

  /** The engine's saved module graph for the last build and the files that differ from it, or null when a full build is due. */
  private async resume(): Promise<{ graph: unknown; changed: string[] } | null> {
    try {
      const r = (await api(`${this.base()}/resume`)) as { ok?: boolean; graph?: unknown; changed?: unknown };
      if (r.ok !== true || !Array.isArray(r.changed)) return null;
      return { graph: r.graph, changed: r.changed.filter((p): p is string => typeof p === "string") };
    } catch {
      return null;
    }
  }

  /** Nothing to build: show what dist holds and keep a session ready for the first edit. */
  private idle(st: ServerStatus): void {
    this.status(st.status?.errors?.length ? { phase: "error", errors: st.status.errors } : { phase: "ready" });
    if (this.running) return;
    this.frame = new BuilderFrame(this.appId, st.dev);
    this.sessionDeps = depsOf(st.dev);
    // warm the session in the background so the first edit is quick: from
    // the saved module graph when there is one (no module is built), else
    // by building the graph in memory
    void this.warm(this.frame);
    // no build to run: do not keep the lease, or another device that
    // needs one would wait on this idle tab forever
    this.releaseLease();
  }

  private async warm(frame: BuilderFrame): Promise<void> {
    const r = await this.resume();
    if (r?.changed.length) return;
    await frame.build("warm", [], r?.graph).catch(() => {});
  }

  /** Run one build batch under the lease. A change event that lands while a
   *  batch runs extends it, so a burst of saves is one lease. The lease is
   *  released when the batch ends — success or failure — because it
   *  serializes BUILDS, not tabs: an idle or broken tab that kept renewing
   *  left every other device showing "another open tab is building" while
   *  nothing was. */
  private async kick(kind: "full" | "update" = "update", rev = ""): Promise<void> {
    if (this.disposed) return;
    if (!this.leased && !(await this.lease({ busy: true }))) return;
    if (this.disposed) {
      this.releaseLease();
      return;
    }
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          const changed = [...this.changed];
          this.changed.clear();
          const st = await this.packagesSettled();
          if (this.disposed) return;
          // stamp the sources as they are now; an install moves the rev
          if (st) rev = st.rev;
          await this.run(kind, rev, changed);
          kind = "update";
        } while (this.again || this.changed.size);
      } finally {
        this.running = null;
        this.releaseLease();
      }
    })();
    await this.running;
  }

  /** The engine's status once no package install is running for this app
   *  (null if it could not be asked). A build during an install reads a
   *  half-written node_modules and fails on imports about to land. */
  private packagesSettled(): Promise<ServerStatus | null> {
    this.settling ??= (async () => {
      try {
        for (;;) {
          const st = (await api(this.base())) as ServerStatus;
          if (!st.installing || this.disposed) return st;
          this.status({ phase: "waiting", message: "Installing the app's packages" });
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch {
        return null;
      } finally {
        this.settling = null;
      }
    })();
    return this.settling;
  }

  private async run(kind: "full" | "update", rev: string, changed: string[] = []): Promise<void> {
    if (this.disposed) return;
    // another tab or device may have built since this session last did: a session that still keeps
    // its old deps bundle would be refused by the engine (#26), so it is replaced by one that
    // continues from what dist holds now
    let dist: unknown = undefined;
    if (this.frame && !this.frame.dead) {
      try {
        dist = ((await api(this.base())) as ServerStatus).dev;
        if (sessionStale(dist, this.sessionDeps)) {
          this.frame.dispose();
          this.frame = null;
        }
      } catch {
        /* keep the session */
      }
    }
    let graph: unknown;
    if (!this.frame || this.frame.dead) {
      // a new builder continues from what dist holds (its dev sequence)
      let prior: unknown = null;
      if (dist !== undefined) prior = dist;
      else {
        try {
          prior = ((await api(this.base())) as ServerStatus).dev;
        } catch {
          /* start fresh */
        }
      }
      this.frame = new BuilderFrame(this.appId, prior);
      this.sessionDeps = depsOf(prior);
      // a session with no modules in memory starts from the saved module
      // graph (found when the app opened, or asked for now) and rebuilds the
      // files that differ from it, instead of building every module first
      if (kind === "update") {
        const r = this.resumed ?? (await this.resume());
        if (r) {
          graph = r.graph;
          changed = [...new Set([...changed, ...r.changed])];
        }
      }
    }
    this.resumed = null;
    if (kind === "full") this.status({ phase: "building", message: "Building the app" });
    let output: Record<string, unknown>;
    try {
      output = await this.frame.build(kind, changed, graph);
    } catch (e) {
      this.frame = null;
      this.status({ phase: "error", message: String((e as Error).message) });
      return;
    }
    const stats: BuildStats = { kind, resumed: this.frame.lastResumed, changed: changed.length, ms: this.frame.lastMs };
    if (output.unchanged) {
      const errors = (output.errors as BuildMessage[] | undefined) ?? [];
      this.status(errors.length ? { phase: "error", errors } : { phase: "ready" });
      // nothing to write, but the revision moved (an edit no module reads):
      // say dist is current for it, or the next open runs a full build and
      // reloads the app for nothing. Never for a result with errors.
      if (!errors.length) {
        try {
          await this.ack(rev, stats);
        } catch {
          /* a change landed since, or the lease moved: its own build follows */
        }
      }
      return;
    }
    try {
      await api(`${this.base()}/output`, { method: "PUT", body: JSON.stringify({ holder: this.holder, rev, builder: VERSION, output, stats }) });
    } catch (e) {
      // the output never landed, but the session in the frame already advanced
      // (seq, maybe a new snapshot): keeping it would make the next upload
      // reference files the engine never received. Drop it so the next build
      // starts from what dist actually holds.
      this.frame?.dispose();
      this.frame = null;
      // forced over mid-build: another tab owns the app now and its build is
      // what will land, so show what dist holds instead of an error this tab
      // cannot act on
      const ours = await this.lease();
      if (ours && !this.retried) {
        // one fresh-session retry: a rejected output (e.g. it kept a file
        // dist no longer has) rebuilds from dist truth instead of leaving a
        // permanently broken page
        this.retried = true;
        this.again = true;
        this.status({ phase: "building", message: "Build output did not land; rebuilding" });
        return;
      }
      this.status(ours ? { phase: "error", message: `saving the build failed: ${(e as Error).message}` } : { phase: "ready" });
      return;
    }
    this.retried = false;
    this.sessionDeps = depsOf(output.meta) ?? this.sessionDeps;
    const errors = (output.errors as BuildMessage[] | undefined) ?? [];
    if (output.ok === false) this.status({ phase: "error", errors });
    else {
      this.status(errors.length ? { phase: "error", errors } : { phase: "ready" });
      if (output.full || output.mode === "production") {
        // a full result to an "update" means the builder's session had restarted or dist was not
        // from these sources: name the files that asked for it
        const why =
          output.mode === "production"
            ? "a production build finished"
            : kind === "full"
              ? this.fullWhy
              : `an update became a full rebuild (changed: ${changed.slice(0, 5).join(", ") || "nothing named"})`;
        for (const w of this.watchers) w.onReload(why);
      }
    }
  }

  /** Give the lease back now, so another tab (or this page reloaded) can
   *  build without waiting for it to lapse. keepalive: survives unload.
   *  Unconditional: a grant that lands after disposal must not be left
   *  renewing. A release from a non-holder is a no-op server-side. */
  releaseLease(): void {
    this.leased = false;
    // stop renewing too: a release that leaves the heartbeat running would
    // re-take the lease seconds later and hold it forever again
    clearInterval(this.renew);
    this.renew = undefined;
    void fetch(`${this.base()}/lease`, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ holder: this.holder, release: true }),
    }).catch(() => {});
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    busListeners.delete(this.listener);
    clearInterval(this.renew);
    this.frame?.dispose();
    this.releaseLease();
  }
}

const builds = new Map<string, AppBuild>();
addEventListener("pagehide", () => {
  for (const b of builds.values()) b.releaseLease();
});

/** Build an app on request — from the shell's rebuild button, or from the
 *  agent (build_requested on the bus). A session is spun up even when the app
 *  has no pane open, then dropped once the request settles. */
function requestBuild(appId: string, force: boolean): Promise<void> {
  let b = builds.get(appId);
  if (!b) {
    b = new AppBuild(appId);
    builds.set(appId, b);
    const build = b;
    // start() builds when dist is stale; an explicit force (the agent's
    // app_check) builds again so the output carries this host's stamp
    return build.ready
      .then(() => (force ? build.rebuild() : undefined))
      .finally(() => {
        if (!build.watchers.size) {
          build.dispose();
          builds.delete(appId);
        }
      });
  }
  return force ? b.rebuild() : Promise.resolve();
}

busListeners.add((type, payload) => {
  if (type !== "build_requested" || typeof payload.app !== "string") return;
  void requestBuild(payload.app, payload.force === true);
});

/**
 * Keep `appId` built while it is on screen. `ready` settles once dist is
 * current (or the build failed: whatever dist holds is then shown).
 * `onReload` fires when a rebuild replaced the whole app and its frame
 * should load again.
 */
function watch(appId: string, onStatus: (s: BuildStatus) => void, onReload: (why: string) => void): { ready: Promise<void>; dispose: () => void } {
  let b = builds.get(appId);
  if (!b) {
    b = new AppBuild(appId);
    builds.set(appId, b);
  }
  const w: Watcher = { onStatus, onReload };
  b.watchers.add(w);
  onStatus(b.current());
  const build = b;
  return {
    ready: build.ready,
    dispose() {
      build.watchers.delete(w);
      if (!build.watchers.size) {
        build.dispose();
        builds.delete(appId);
      }
    },
  };
}

/** Force a rebuild now (the pane's Rebuild button). */
function rebuild(appId: string): Promise<void> {
  return requestBuild(appId, true);
}

(window as unknown as { MolfarBuilder: unknown }).MolfarBuilder = { watch, rebuild, version: VERSION };
