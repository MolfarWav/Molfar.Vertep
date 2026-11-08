// The shell's colour theme reaches an app frame (client/public/app-bridge*.js): at the handshake and on every
// change, as data only (an id, a scheme, hex colours), and nothing else rides along.
import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const HOST_SRC = fs.readFileSync(path.resolve(process.cwd(), "client/public/app-bridge-host.js"), "utf8");
const FRAME_SRC = fs.readFileSync(path.resolve(process.cwd(), "client/public/app-bridge.js"), "utf8");

type Listener = (e: { source: unknown; data: unknown }) => void;

/** The shell page with the bridge host over a Map-backed localStorage. */
function makeShell(prefs: Record<string, string> = {}) {
  const store = new Map(Object.entries(prefs));
  const listeners: Listener[] = [];
  const win: Record<string, unknown> = { addEventListener: (_t: string, fn: Listener) => listeners.push(fn), open: () => null };
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  vm.runInContext(
    HOST_SRC,
    vm.createContext({
      window: win,
      document: {},
      localStorage,
      sessionStorage: localStorage,
      crypto: { getRandomValues: (b: Uint8Array) => b },
      location: { origin: "http://localhost:8788" },
      WebSocket: class {},
      TextEncoder,
      TextDecoder,
      btoa,
      atob,
      Map,
      Set,
      URL,
      Uint8Array,
      JSON,
    }),
  );
  const host = win.MolfarBridgeHost as { serve: (f: unknown, a: string, u: string) => () => void; pushTheme: () => void; shellTheme: () => { id: string; scheme: string; vars: Record<string, string> | null } };
  return { host, store, hear: (source: unknown, data: unknown) => listeners.forEach((l) => l({ source, data })) };
}

/** A frame window that records what the host posts to it. */
function makeWindow() {
  const got: any[] = [];
  return { got, win: { postMessage: (d: unknown) => got.push(JSON.parse(JSON.stringify(d))) } };
}

describe("the host tells a frame the shell's theme", () => {
  it("reads a built-in theme and a custom one (hex colours only)", () => {
    expect(makeShell().host.shellTheme()).toEqual({ id: "vertep", scheme: "dark", vars: null });
    expect(makeShell({ "molfar-theme": "light" }).host.shellTheme()).toEqual({ id: "light", scheme: "light", vars: null });
    const custom = makeShell({
      "molfar-theme": "sunset",
      "molfar-theme-scheme": "light",
      "molfar-theme-vars": JSON.stringify({ accent: "#ff8800", base: "#fff", evil: "url(javascript:alert(1))", "Bad Key": "#000", num: 5 }),
    }).host.shellTheme();
    expect(custom).toEqual({ id: "sunset", scheme: "light", vars: { accent: "#ff8800", base: "#fff" } });
    expect(makeShell({ "molfar-theme": "x", "molfar-theme-vars": "{not json" }).host.shellTheme()).toEqual({ id: "x", scheme: "dark", vars: null });
  });

  it("sends it with init, and again on every change, to every frame", () => {
    const shell = makeShell({ "molfar-theme": "dark" });
    const a = makeWindow();
    const b = makeWindow();
    shell.host.serve({ contentWindow: a.win }, "social", "u");
    shell.host.serve({ contentWindow: b.win }, "roleplay", "u");
    shell.hear(a.win, { __molfar: 1, type: "hello" });
    expect(a.got[0]).toMatchObject({ type: "init", theme: { id: "dark", scheme: "dark", vars: null } });
    shell.store.set("molfar-theme", "light");
    shell.host.pushTheme();
    expect(a.got.at(-1)).toEqual({ __molfar: 1, type: "shell-theme", theme: { id: "light", scheme: "light", vars: null } });
    expect(b.got.at(-1)).toEqual({ __molfar: 1, type: "shell-theme", theme: { id: "light", scheme: "light", vars: null } });
  });

  it("does not tell a frame that has been closed", () => {
    const shell = makeShell();
    const a = makeWindow();
    const off = shell.host.serve({ contentWindow: a.win }, "social", "u");
    off();
    shell.host.pushTheme();
    expect(a.got).toEqual([]);
  });
});

describe("the frame applies the theme it is told", () => {
  function makeFrame() {
    const listeners: Listener[] = [];
    const attrs: Record<string, string> = {};
    const events: { type: string; detail: unknown }[] = [];
    const parent = { postMessage: () => undefined };
    class CustomEvent {
      constructor(public type: string, public init?: { detail?: unknown }) {}
    }
    const win: Record<string, any> = {
      parent,
      addEventListener: (t: string, fn: Listener) => {
        if (t === "message") listeners.push(fn);
      },
      dispatchEvent: (e: CustomEvent) => {
        events.push({ type: e.type, detail: e.init?.detail });
        return true;
      },
      location: { hash: "", href: "http://localhost:8788/app/u/social/", origin: "http://localhost:8788", protocol: "http:", host: "localhost:8788", reload: () => undefined },
      history: { state: null, replaceState: () => undefined },
      open: () => "native",
      document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) }, cookie: "", addEventListener: () => undefined },
      CustomEvent,
      StorageEvent: class {},
    };
    win.window = win;
    vm.runInContext(
      FRAME_SRC,
      vm.createContext(
        Object.assign(win, {
          TextEncoder, TextDecoder, btoa, atob, URL, URLSearchParams, Uint8Array, Proxy, Reflect, Object, JSON, Promise, Date, String, Error, Array,
          setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined, encodeURIComponent, decodeURIComponent,
        }),
      ),
    );
    return { win, attrs, events, hear: (data: unknown) => listeners.forEach((l) => l({ source: parent, data })) };
  }

  it("sets window.molfarShell, the root attributes and an event at init and at a change", () => {
    const f = makeFrame();
    f.hear({ __molfar: 1, type: "init", nonce: "n", storage: { local: {}, session: {} }, theme: { id: "dark", scheme: "dark", vars: null } });
    expect(f.win.molfarShell.theme()).toEqual({ id: "dark", scheme: "dark", vars: null });
    expect(f.attrs["data-shell-scheme"]).toBe("dark");
    expect(f.events.at(-1)?.type).toBe("molfar:shell-theme");
    f.hear({ __molfar: 1, type: "shell-theme", theme: { id: "sunset", scheme: "light", vars: { accent: "#ff8800", bad: "red; x:y", "Bad Key": "#000" } } });
    expect(f.win.molfarShell.theme()).toEqual({ id: "sunset", scheme: "light", vars: { accent: "#ff8800" } });
    expect(f.attrs["data-shell-scheme"]).toBe("light");
    expect(f.attrs["data-shell-theme"]).toBe("sunset");
    expect(f.events).toHaveLength(2);
  });

  it("ignores a theme message that does not come from the parent, and garbage", () => {
    const f = makeFrame();
    f.hear({ __molfar: 1, type: "shell-theme", theme: "x" });
    f.hear({ __molfar: 1, type: "shell-theme" });
    expect(f.win.molfarShell.theme()).toBeNull();
    f.hear({ __molfar: 1, type: "shell-theme", theme: { scheme: "weird", id: 5 } });
    expect(f.win.molfarShell.theme()).toEqual({ id: "vertep", scheme: "dark", vars: null });
  });
});
