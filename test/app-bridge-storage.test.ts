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
function makeShell(bus: Bus, kept: { local: Map<string, string>; session: Map<string, string> } = { local: new Map(), session: new Map() }) {
  const store = kept.local;
  let quotaFull = false;
  const listeners: Listener[] = [];
  const opened: unknown[][] = [];
  const win: Record<string, unknown> = { addEventListener: (_t: string, fn: Listener) => listeners.push(fn), open: (...a: unknown[]) => { opened.push(a); return null; } };
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      if (quotaFull) throw new Error("QuotaExceededError");
      store.set(k, v);
    },
    removeItem: (k: string) => { store.delete(k); },
  };
  const sessionStorage = {
    getItem: (k: string) => (kept.session.has(k) ? kept.session.get(k)! : null),
    setItem: (k: string, v: string) => { kept.session.set(k, v); },
    removeItem: (k: string) => { kept.session.delete(k); },
  };
  vm.runInContext(HOST_SRC, vm.createContext({
    window: win, document: {}, localStorage, sessionStorage, crypto: { getRandomValues: (b: Uint8Array) => b }, location: { origin: "http://localhost:8788" },
    WebSocket: class {}, TextEncoder, TextDecoder, btoa, atob, Map, Set, URL, Uint8Array, JSON,
  }));
  const host = win.MolfarBridgeHost as { serve: (f: unknown, a: string, u: string) => () => void; frameSrc: (a: string, u: string) => string; storageKey: (u: string, a: string) => string };
  const deliver = (source: unknown, data: unknown) => bus.queue.push(() => { for (const l of listeners) l({ source, data: structuredClone(data) }); });
  return {
    host,
    deliver,
    opened,
    setQuotaFull: (v: boolean) => { quotaFull = v; },
    /** What a full reload of the shell keeps: the browser's storages. */
    kept,
    saved: (app = "rp", user = "u") => JSON.parse(store.get(host.storageKey(user, app)) ?? '{"local":{},"session":{}}') as { local: Record<string, string> },
  };
}

/** One app frame: a fixed contentWindow (it survives in-frame reloads) whose current document runs
 *  the bridge from the URL hash. `refuseRewrites` makes history.replaceState throw. */
function makeFrame(bus: Bus, shell: ReturnType<typeof makeShell>, opts: { app?: string } = {}) {
  const app = opts.app ?? "rp";
  let doc: { listeners: Listener[]; events: unknown[]; win: Record<string, any>; clicks: Array<(e: unknown) => void> } | null = null;
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
    const clicks: Array<(e: unknown) => void> = [];
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
    Object.assign(win, { location, history, CustomEvent, StorageEvent, open: () => "native", document: { documentElement: null, cookie: "", addEventListener: (t: string, fn: (e: unknown) => void) => { if (t === "click") clicks.push(fn); } } });
    vm.runInContext(FRAME_SRC, vm.createContext(Object.assign(win, {
      TextEncoder, TextDecoder, btoa, atob, URL, URLSearchParams, Uint8Array, Proxy, Reflect, Object, JSON, Promise, Date, String, Error, Array,
      setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined, encodeURIComponent, decodeURIComponent,
    })));
    doc = { listeners, events, win, clicks };
  };
  boot();
  return {
    get ls(): Storage { return doc!.win.localStorage; },
    get win() { return doc!.win; },
    get events() { return doc!.events; },
    /** Click an <a> in the app: returns whether the page's own navigation was cancelled. */
    click(a: { href: string; target?: string; download?: boolean }, mods: { ctrlKey?: boolean } = {}) {
      let prevented = false;
      const el = { href: a.href, target: a.target ?? "", hasAttribute: (n: string) => n === "download" && !!a.download };
      const e = { defaultPrevented: false, button: 0, ctrlKey: false, metaKey: false, shiftKey: false, ...mods, target: { closest: () => el }, preventDefault: () => { prevented = true; } };
      for (const fn of doc!.clicks) fn(e);
      return prevented;
    },
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

  // #66: the names up to 1.7.x stay for apps written against them
  it("molfarShell and molfarStorage are the same objects as chrysalisShell and chrysalisStorage", () => {
    const bus = makeBus();
    const f = makeFrame(bus, makeShell(bus));
    bus.flush();
    expect(f.win.molfarShell).toBe(f.win.chrysalisShell);
    expect(f.win.molfarStorage).toBe(f.win.chrysalisStorage);
    expect(typeof f.win.molfarShell.askMolfar).toBe("function");
  });

  it("an unsaved write is announced under both event names", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    shell.setQuotaFull(true);
    f.ls.setItem("draft", "typed while the disk was full");
    bus.flush();
    const types = (f.events as Array<{ type: string }>).map((e) => e.type);
    expect(types).toContain("molfar:storage");
    expect(types).toContain("chrysalis:storage");
  });

  it("an app's storage saved under the 1.7.x key is still there, and moves to the new key on the next save", () => {
    const bus = makeBus();
    const kept = { local: new Map<string, string>(), session: new Map<string, string>() };
    const shell0 = makeShell(bus, kept);
    const legacyKey = shell0.host.storageKey("u", "rp").replace("molfar.app-storage.", "chrysalis.app-storage.");
    kept.local.delete(shell0.host.storageKey("u", "rp"));
    kept.local.set(legacyKey, JSON.stringify({ local: { old: "from 1.7" }, session: {} }));
    const shell = makeShell(bus, kept);
    const f = makeFrame(bus, shell);
    bus.flush();
    expect(f.ls.getItem("old")).toBe("from 1.7");
    f.ls.setItem("fresh", "now");
    bus.flush();
    expect(shell.saved().local).toEqual({ old: "from 1.7", fresh: "now" });
    expect(kept.local.has(legacyKey)).toBe(false);
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

  it("a draft the shell refused survives a full reload of the shell, listed unsaved, and saves once there is room", () => {
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
    // the whole shell page reloads: a new host and a new frame, over the same browser storage
    const bus2 = makeBus();
    const shell2 = makeShell(bus2, shell.kept);
    const f2 = makeFrame(bus2, shell2);
    expect(f2.ls.getItem("draft")).toBe("kept plus words the shell refused");
    expect(f2.win.chrysalisStorage.unsaved()).toEqual([{ storage: "local", key: "draft", reason: "browser-quota" }]);
    bus2.flush();
    // room again: the handshake offers the draft to the shell, which keeps it and drops its spare copy
    expect(f2.ls.getItem("draft")).toBe("kept plus words the shell refused");
    expect(shell2.saved().local.draft).toBe("kept plus words the shell refused");
    expect(f2.win.chrysalisStorage.unsaved()).toEqual([]);
    expect(shell2.kept.session.size).toBe(0);
  });

  it("the spare copy follows the draft: removed when the app saves, removes or clears it", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    const refuse = () => { shell.setQuotaFull(true); f.ls.setItem("draft", "refused " + Math.random()); bus.flush(); shell.setQuotaFull(false); };
    refuse();
    expect(shell.kept.session.size).toBe(1);
    f.ls.setItem("draft", "saved now");
    bus.flush();
    expect(shell.kept.session.size).toBe(0);
    refuse();
    f.ls.removeItem("draft");
    bus.flush();
    expect(shell.kept.session.size).toBe(0);
    refuse();
    f.ls.clear();
    bus.flush();
    expect(shell.kept.session.size).toBe(0);
  });

  it("a refused draft too big for the frame's URL is not put in it", () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    f.ls.setItem("draft", "x".repeat(2 * 1024 * 1024 + 10));
    bus.flush();
    expect(f.win.chrysalisStorage.unsaved().length).toBe(1);
    const shell2 = makeShell(makeBus(), shell.kept);
    expect(shell2.host.frameSrc("rp", "u").length).toBeLessThan(2 * 1024 * 1024);
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

describe("links to other sites open from the shell (#58)", () => {
  const setup = () => {
    const bus = makeBus();
    const shell = makeShell(bus);
    const f = makeFrame(bus, shell);
    bus.flush();
    return { bus, shell, f };
  };

  it("a target=_blank link to another site is handed to the shell, which opens it detached", () => {
    const { bus, shell, f } = setup();
    expect(f.click({ href: "https://jannyai.com/characters/abc", target: "_blank" })).toBe(true);
    bus.flush();
    expect(shell.opened).toEqual([["https://jannyai.com/characters/abc", "_blank", "noopener,noreferrer"]]);
  });

  it("window.open to another site goes the same way; engine pages and other schemes do not", () => {
    const { bus, shell, f } = setup();
    expect(f.win.open("https://chub.ai/characters/x")).toBeNull();
    bus.flush();
    expect(shell.opened.length).toBe(1);
    expect(f.win.open("/app/u/other/")).toBe("native");
    expect(f.click({ href: "http://localhost:8788/v1/apps", target: "_blank" })).toBe(false);
    expect(f.click({ href: "javascript:alert(1)", target: "_blank" })).toBe(false);
    expect(f.click({ href: "mailto:a@b.c", target: "_blank" })).toBe(false);
    bus.flush();
    expect(shell.opened.length).toBe(1);
  });

  it("a plain link, a download and a click already handled are left alone", () => {
    const { bus, shell, f } = setup();
    expect(f.click({ href: "https://jannyai.com/x" })).toBe(false);
    expect(f.click({ href: "https://jannyai.com/x", target: "_blank", download: true })).toBe(false);
    bus.flush();
    expect(shell.opened).toEqual([]);
  });

});
