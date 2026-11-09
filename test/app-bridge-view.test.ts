// The shell's Settings sends the user to an app's own settings page (#334): the manifest names the view, the bridge host
// hands the name to the app's frame (now, or at its handshake), the frame passes it to `molfarShell.onView`.
import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { validateAppManifest } from "../src/apps/manager.js";

const HOST_SRC = fs.readFileSync(path.resolve(process.cwd(), "client/public/app-bridge-host.js"), "utf8");
const FRAME_SRC = fs.readFileSync(path.resolve(process.cwd(), "client/public/app-bridge.js"), "utf8");

type Listener = (e: { source: unknown; data: unknown }) => void;

function makeShell() {
  const store = new Map<string, string>();
  const listeners: Listener[] = [];
  const win: Record<string, unknown> = { addEventListener: (_t: string, fn: Listener) => listeners.push(fn), open: () => null };
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const now = { t: 1_000_000 };
  vm.runInContext(
    HOST_SRC,
    vm.createContext({
      window: win, document: {}, localStorage, sessionStorage: localStorage, crypto: { getRandomValues: (b: Uint8Array) => b },
      location: { origin: "http://localhost:8788" }, WebSocket: class {}, TextEncoder, TextDecoder, btoa, atob, Map, Set, URL, Uint8Array, JSON,
      Date: { now: () => now.t },
    }),
  );
  const host = win.MolfarBridgeHost as { serve: (f: unknown, a: string, u: string) => () => void; openView: (a: unknown, v: unknown) => void };
  return { host, now, hear: (source: unknown, data: unknown) => listeners.forEach((l) => l({ source, data })) };
}

function makeWindow() {
  const got: any[] = [];
  return { got, win: { postMessage: (d: unknown) => got.push(JSON.parse(JSON.stringify(d))) } };
}

describe("manifest settingsView", () => {
  const base = { name: "Roleplay", version: "1", kind: "app" };
  it("keeps a short lowercase name and drops anything else", () => {
    expect(validateAppManifest({ ...base, settingsView: "settings" })?.settingsView).toBe("settings");
    expect(validateAppManifest({ ...base, settingsView: "app-settings2" })?.settingsView).toBe("app-settings2");
    for (const bad of ["", "Settings", "2fast", "a b", "x".repeat(33), "../x", 5, null]) {
      expect(validateAppManifest({ ...base, settingsView: bad })?.settingsView).toBeUndefined();
    }
    expect(validateAppManifest(base)?.settingsView).toBeUndefined();
  });
});

describe("the host hands a view to an app", () => {
  it("tells a running frame at once, and not twice", () => {
    const shell = makeShell();
    const a = makeWindow();
    shell.host.serve({ contentWindow: a.win }, "roleplay", "u");
    shell.hear(a.win, { __molfar: 1, type: "hello" });
    shell.host.openView("roleplay", "settings");
    expect(a.got.at(-1)).toEqual({ __molfar: 1, type: "open-view", view: "settings" });
    const later = makeWindow();
    shell.host.serve({ contentWindow: later.win }, "roleplay", "u");
    shell.hear(later.win, { __molfar: 1, type: "hello" });
    expect(later.got[0].view).toBeUndefined();
  });

  it("holds it for a frame that does not exist yet, and sends it with init", () => {
    const shell = makeShell();
    shell.host.openView("roleplay", "settings");
    const a = makeWindow();
    shell.host.serve({ contentWindow: a.win }, "roleplay", "u");
    shell.hear(a.win, { __molfar: 1, type: "hello" });
    expect(a.got[0]).toMatchObject({ type: "init", view: "settings" });
    shell.hear(a.win, { __molfar: 1, type: "hello" });
    expect(a.got[1].view).toBeUndefined();
  });

  it("holds it for the app asked, a minute at most", () => {
    const shell = makeShell();
    shell.host.openView("roleplay", "settings");
    const other = makeWindow();
    shell.host.serve({ contentWindow: other.win }, "social", "u");
    shell.hear(other.win, { __molfar: 1, type: "hello" });
    expect(other.got[0].view).toBeUndefined();
    shell.now.t += 61_000;
    const late = makeWindow();
    shell.host.serve({ contentWindow: late.win }, "roleplay", "u");
    shell.hear(late.win, { __molfar: 1, type: "hello" });
    expect(late.got[0].view).toBeUndefined();
  });

  it("drops a name that is not a plain word", () => {
    const shell = makeShell();
    const a = makeWindow();
    shell.host.serve({ contentWindow: a.win }, "roleplay", "u");
    shell.hear(a.win, { __molfar: 1, type: "hello" });
    for (const bad of ["Settings", "a/b", "", "x".repeat(40), 3, null, undefined, { a: 1 }]) shell.host.openView("roleplay", bad);
    shell.host.openView(7, "settings");
    expect(a.got).toHaveLength(1);
  });
});

describe("the frame passes a view to the app", () => {
  function makeFrame() {
    const listeners: Listener[] = [];
    const parent = { postMessage: () => undefined };
    const win: Record<string, any> = {
      parent,
      addEventListener: (t: string, fn: Listener) => { if (t === "message") listeners.push(fn); },
      dispatchEvent: () => true,
      location: { hash: "", href: "http://localhost:8788/app/u/roleplay/", origin: "http://localhost:8788", protocol: "http:", host: "localhost:8788", reload: () => undefined },
      history: { state: null, replaceState: () => undefined },
      open: () => "native",
      document: { documentElement: { setAttribute: () => undefined }, cookie: "", addEventListener: () => undefined },
      CustomEvent: class {},
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
    return { win, hear: (data: unknown) => listeners.forEach((l) => l({ source: parent, data })) };
  }
  const init = { __molfar: 1, type: "init", nonce: "n", storage: { local: {}, session: {} }, theme: { id: "dark", scheme: "dark", vars: null } };

  it("calls the listener for a view that comes later", () => {
    const f = makeFrame();
    const seen: string[] = [];
    f.win.molfarShell.onView((v: string) => seen.push(v));
    f.hear(init);
    f.hear({ __molfar: 1, type: "open-view", view: "settings" });
    expect(seen).toEqual(["settings"]);
  });

  it("keeps a view that came with init until a listener is registered", () => {
    const f = makeFrame();
    f.hear({ ...init, view: "settings" });
    const seen: string[] = [];
    f.win.molfarShell.onView((v: string) => seen.push(v));
    expect(seen).toEqual(["settings"]);
    f.win.molfarShell.onView((v: string) => seen.push(`2:${v}`));
    expect(seen).toEqual(["settings"]);
  });

  it("stops listening when asked, and ignores a bad name or a message from elsewhere", () => {
    const f = makeFrame();
    const seen: string[] = [];
    const off = f.win.molfarShell.onView((v: string) => seen.push(v));
    f.hear(init);
    f.hear({ __molfar: 1, type: "open-view", view: "Bad Name" });
    f.hear({ type: "open-view", view: "settings" });
    off();
    f.hear({ __molfar: 1, type: "open-view", view: "settings" });
    expect(seen).toEqual([]);
  });
});
