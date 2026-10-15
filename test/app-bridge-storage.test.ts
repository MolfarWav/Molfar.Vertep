// The app frame's storage shim and the shell's copy (client/public/app-bridge*.js): write
// acknowledgements, unchanged writes not sent, and a reloaded frame catching up with the shell
// (Discord tracker BUG-011, BUG-013, BUG-014; GitHub #25, #27, #28).
import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const HOST_SRC = fs.readFileSync(path.resolve(process.cwd(), "client/public/app-bridge-host.js"), "utf8");
const FRAME_SRC = fs.readFileSync(path.resolve(process.cwd(), "client/public/app-bridge.js"), "utf8");

type Listener = (e: { source: unknown; data: unknown }) => void;
type Bus = { queue: Array<() => void>; flush: () => void };

function makeBus(): Bus {
  const queue: Array<() => void> = [];
  return {
    queue,
    flush() {
      for (let i = 0; i < 1000 && queue.length; i++) queue.shift()!();
    },
  };
}

/** The shell page: the bridge host over a Map-backed localStorage that can refuse writes. */
function makeShell(bus: Bus) {
  const store = new Map<string, string>();
  let quotaFull = false;
  const listeners: Listener[] = [];
  const win: Record<string, unknown> = { addEventListener: (_t: string, fn: Listener) => listeners.push(fn) };
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      if (quotaFull) throw new Error("QuotaExceededError");
      store.set(k, v);
    },
  };
  vm.runInContext(HOST_SRC, vm.createContext({
    window: win, document: {}, localStorage, crypto: { getRandomValues: (b: Uint8Array) => b }, location: { origin: "http://localhost:8788" },
    WebSocket: class {}, TextEncoder, TextDecoder, btoa, atob, Map, Set, URL, Uint8Array, JSON,
  }));
  const host = win.ChrysalisBridgeHost as { serve: (f: unknown, a: string, u: string) => () => void; frameSrc: (a: string, u: string) => string; storageKey: (u: string, a: string) => string };
  const deliver = (source: unknown, data: unknown) => bus.queue.push(() => { for (const l of listeners) l({ source, data: structuredClone(data) }); });
  return {
    host,
    deliver,
    setQuotaFull: (v: boolean) => { quotaFull = v; },
    saved: (app = "rp", user = "u") => JSON.parse(store.get(host.storageKey(user, app)) ?? '{"local":{},"session":{}}') as { local: Record<string, string> },
  };
}

/** One app frame: a fixed contentWindow (it survives in-frame reloads) whose current document runs
 *  the bridge from the URL hash. `refuseRewrites` makes history.replaceState throw. */
function makeFrame(bus: Bus, shell: ReturnType<typeof makeShell>, opts: { app?: string } = {}) {
  const app = opts.app ?? "rp";
  let doc: { listeners: Listener[]; events: unknown[]; win: Record<string, any> } | null = null;
  let url = "http://localhost:8788" + shell.host.frameSrc(app, "u");
  let refuseRewrites = false;
  let reloads = 0;
  const contentWindow = {
    postMessage: (data: unknown) => {
      const d = doc;
      bus.queue.push(() => { if (d) for (const l of d.listeners) l({ source: d.win.parent, data: structuredClone(data) }); });
    },
  };
  shell.host.serve({ contentWindow }, app, "u");
  const boot = () => {
    const listeners: Listener[] = [];
    const events: unknown[] = [];
    const win: Record<string, any> = {
      parent: { postMessage: (data: unknown) => shell.deliver(contentWindow, data) },
      addEventListener: (t: string, fn: Listener) => { if (t === "message") listeners.push(fn); },
      dispatchEvent: (e: unknown) => { events.push(e); return true; },
    };
    win.window = win;
    const location = {
      get hash() { return url.includes("#") ? url.slice(url.indexOf("#")) : ""; },
      get href() { return url; },
      origin: "http://localhost:8788",
      protocol: "http:",
      host: "localhost:8788",
      reload: () => { reloads++; bus.queue.push(boot); },
    };
    const history = {
      state: null,
      replaceState: (_s: unknown, _t: string, next: string) => {
        if (refuseRewrites) throw new Error("SecurityError: too many calls");
        url = next;
      },
    };
    class CustomEvent { constructor(public type: string, public init?: { detail?: unknown }) {} }
    class StorageEvent { constructor(public type: string, public init?: Record<string, unknown>) {} }
    Object.assign(win, { location, history, CustomEvent, StorageEvent, document: { documentElement: null, cookie: "" } });
    vm.runInContext(FRAME_SRC, vm.createContext(Object.assign(win, {
      TextEncoder, TextDecoder, btoa, atob, URL, URLSearchParams, Uint8Array, Proxy, Reflect, Object, JSON, Promise, Date, String, Error, Array,
      setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined, encodeURIComponent, decodeURIComponent,
    })));
    doc = { listeners, events, win };
  };
  boot();
  return {
    get ls(): Storage { return doc!.win.localStorage; },
    get win() { return doc!.win; },
    get events() { return doc!.events; },
    get reloads() { return reloads; },
    reload() { bus.queue.length = 0; boot(); },
    refuseRewrites(v: boolean) { refuseRewrites = v; },
    rewritesOf: () => url,
  };
}

describe("app storage: acknowledgements and catching up after a reload", () => {
  it("a write the shell keeps is acknowledged; nothing is listed unsaved", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    f.ls.setItem("draft", "hello");
    bus.flush();
    expect(shell.saved().local.draft).toBe("hello");
    expect(f.win.chrysalisStorage.unsaved()).toEqual([]);
  });

  it("an unchanged write is not sent and does not spend a hash rewrite", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    f.ls.setItem("store", "{\"a\":1}");
    bus.flush();
    const sent: unknown[] = [];
    const post = f.win.parent.postMessage;
    f.win.parent.postMessage = (d: { type?: string }) => { if (d.type === "storage") sent.push(d); post(d); };
    const before = f.rewritesOf();
    for (let i = 0; i < 500; i++) f.ls.setItem("store", "{\"a\":1}");
    expect(sent).toEqual([]);
    expect(f.rewritesOf()).toBe(before);
    f.ls.removeItem("missing");
    expect(sent).toEqual([]);
    f.ls.setItem("store", "{\"a\":2}");
    expect(sent.length).toBe(1);
  });

  it("a write over the app's share is refused, listed unsaved, kept in the frame, and cleared by a later save", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    f.ls.setItem("draft", "short");
    bus.flush();
    f.ls.setItem("draft", "x".repeat(2 * 1024 * 1024 + 10));
    bus.flush();
    expect(shell.saved().local.draft).toBe("short");
    expect(f.ls.getItem("draft")!.length).toBe(2 * 1024 * 1024 + 10);
    expect(f.win.chrysalisStorage.unsaved()).toEqual([{ storage: "local", key: "draft", reason: "app-share-full" }]);
    const ev = f.events.find((e: any) => e.type === "chrysalis:storage") as { init: { detail: { unsaved: unknown[] } } };
    expect(ev.init.detail.unsaved.length).toBe(1);
    f.ls.setItem("draft", "fits again");
    bus.flush();
    expect(shell.saved().local.draft).toBe("fits again");
    expect(f.win.chrysalisStorage.unsaved()).toEqual([]);
  });

  it("a browser quota error in the shell is reported too", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    shell.setQuotaFull(true);
    f.ls.setItem("draft", "typed while the disk was full");
    bus.flush();
    expect(f.win.chrysalisStorage.unsaved()).toEqual([{ storage: "local", key: "draft", reason: "browser-quota" }]);
  });

  it("a late refusal of an older write does not mark the newer text unsaved", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    f.ls.setItem("draft", "x".repeat(2 * 1024 * 1024 + 10));
    f.ls.setItem("draft", "small");
    bus.flush();
    expect(shell.saved().local.draft).toBe("small");
    expect(f.win.chrysalisStorage.unsaved()).toEqual([]);
  });

  it("a reload from a stale hash (rewrites refused) comes back with the shell's newer draft", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    f.ls.setItem("draft", "old");
    bus.flush();
    f.refuseRewrites(true);
    f.ls.setItem("draft", "old and the newer words");
    bus.flush();
    expect(shell.saved().local.draft).toBe("old and the newer words");
    f.refuseRewrites(false);
    // the app reloads itself: the hash still says "old"; the app reads at boot (store hydrate)
    f.reload();
    expect(f.ls.getItem("draft")).toBe("old");
    bus.flush();
    // the handshake brought the shell's copy; the app had read, so one more reload shows it
    expect(f.reloads).toBe(1);
    expect(f.ls.getItem("draft")).toBe("old and the newer words");
    bus.flush();
    expect(f.reloads).toBe(1);
  });

  it("a reload while the rewrite budget is spent (150 in 10 s) still ends on the newest draft", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    for (let i = 0; i < 200; i++) f.ls.setItem("draft", "word ".repeat(i + 1));
    bus.flush();
    // the hash stopped at the 150th write; the shell has all 200
    f.reload();
    expect(f.ls.getItem("draft")).toBe("word ".repeat(150));
    bus.flush();
    expect(f.ls.getItem("draft")).toBe("word ".repeat(200));
  });

  it("a reload that catches up before the app reads needs no second reload", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    f.refuseRewrites(true);
    f.ls.setItem("draft", "newest");
    bus.flush();
    f.refuseRewrites(false);
    f.reload();
    bus.flush();
    expect(f.reloads).toBe(0);
    expect(f.ls.getItem("draft")).toBe("newest");
  });

  it("a key written after the reload is newer than the shell's copy and stays", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    f.refuseRewrites(true);
    f.ls.setItem("draft", "from before");
    bus.flush();
    f.refuseRewrites(false);
    f.reload();
    f.ls.setItem("draft", "typed right after the reload");
    bus.flush();
    expect(f.ls.getItem("draft")).toBe("typed right after the reload");
    expect(shell.saved().local.draft).toBe("typed right after the reload");
  });

  it("a refused draft survives an in-frame reload, stays listed, and is offered to the shell again", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    f.ls.setItem("draft", "kept");
    bus.flush();
    shell.setQuotaFull(true);
    f.ls.setItem("draft", "kept plus words the shell refused");
    bus.flush();
    expect(shell.saved().local.draft).toBe("kept");
    shell.setQuotaFull(false);
    f.reload();
    expect(f.ls.getItem("draft")).toBe("kept plus words the shell refused");
    expect(f.win.chrysalisStorage.unsaved().length).toBe(1);
    bus.flush();
    // the handshake did not take the shell's older value; the retry landed
    expect(f.ls.getItem("draft")).toBe("kept plus words the shell refused");
    expect(shell.saved().local.draft).toBe("kept plus words the shell refused");
    expect(f.win.chrysalisStorage.unsaved()).toEqual([]);
  });

  it("an ordinary saved draft survives a reload with no catching up", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    f.ls.setItem("draft", "plain");
    bus.flush();
    f.reload();
    f.ls.getItem("draft");
    bus.flush();
    expect(f.reloads).toBe(0);
    expect(f.ls.getItem("draft")).toBe("plain");
  });
});
