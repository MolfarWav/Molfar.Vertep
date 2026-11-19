// The app frame turns /v1/ asset URLs into blob: URLs fetched over the bridge, because a plain subresource load
// carries no session (client/public/app-bridge.js). An SVG <image> names its file in href or xlink:href (#460).
import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const FRAME_SRC = fs.readFileSync(path.resolve(process.cwd(), "client/public/app-bridge.js"), "utf8");

class FakeEl {
  attrs = new Map<string, string>();
  constructor(public localName: string, attrs: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(attrs)) this.attrs.set(k, v);
  }
  nodeType = 1;
  get tagName() { return this.localName.toUpperCase(); }
  textContent = "";
  hasAttribute(n: string) { return this.attrs.has(n); }
  getAttribute(n: string) { return this.attrs.has(n) ? this.attrs.get(n)! : null; }
  setAttribute(n: string, v: string) { this.attrs.set(n, v); }
}

/** One frame whose document holds `els`; the shell answers every fetch with a small picture. Returns what the page saw. */
async function boot(els: FakeEl[]) {
  const fetched: string[] = [];
  const queue: Array<(e: { source: unknown; data: unknown }) => void> = [];
  const observed: { filter?: string[] } = {};
  const selectors: string[] = [];
  const parent = {
    postMessage: (m: { type: string; id: number; url?: string }) => {
      if (m.type !== "fetch") return;
      fetched.push(m.url!);
      setTimeout(() => queue.forEach((l) => l({ source: parent, data: { __molfar: 1, type: "fetch-result", id: m.id, status: 200, headers: [["content-type", "image/png"]], body: new Uint8Array([1, 2, 3]).buffer } })), 0);
    },
  };
  const win: Record<string, any> = {
    parent,
    addEventListener: (t: string, fn: (e: { source: unknown; data: unknown }) => void) => { if (t === "message") queue.push(fn); },
    dispatchEvent: () => true,
  };
  win.window = win;
  const documentElement = Object.assign(new FakeEl("html"), {
    querySelectorAll: (sel: string) => {
      selectors.push(sel);
      return els;
    },
  });
  class FakeRequest {
    url: string;
    method = "GET";
    headers = { forEach: () => undefined };
    constructor(u: string) { this.url = new URL(u, "http://localhost:8788/").href; }
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
  }
  class FakeResponse {
    constructor(public body: unknown, public init: { status: number }) {}
    get ok() { return this.init.status < 400; }
    blob() { return Promise.resolve({ blob: true }); }
  }
  class FakeObserver {
    constructor(_cb: unknown) {}
    observe(_t: unknown, o: { attributeFilter?: string[] }) { observed.filter = o.attributeFilter; }
  }
  Object.assign(win, {
    location: { href: "http://localhost:8788/frame#x", origin: "http://localhost:8788", protocol: "http:", host: "localhost:8788", hash: "#x", reload() {} },
    history: { state: null, replaceState() {} },
    document: { documentElement, cookie: "", addEventListener() {} },
    Request: FakeRequest,
    Response: FakeResponse,
    MutationObserver: FakeObserver,
    CustomEvent: class { constructor(public type: string) {} },
    StorageEvent: class { constructor(public type: string) {} },
    URL: Object.assign(function (u: string, b?: string) { return new URL(u, b); }, { createObjectURL: () => "blob:test-" + fetched.length }),
    TextEncoder, TextDecoder, btoa, atob, URLSearchParams, Uint8Array, Proxy, Reflect, Object, JSON, Promise, Date, String, Error, Array,
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => undefined, encodeURIComponent, decodeURIComponent,
  });
  vm.runInContext(FRAME_SRC, vm.createContext(win));
  // the handshake: the shell tells the frame it may talk
  queue.forEach((l) => l({ source: parent, data: { __molfar: 1, type: "init", nonce: "n", theme: null } }));
  await new Promise((r) => setTimeout(r, 30));
  return { fetched, observed, selectors };
}

describe("app frame: engine pictures in an SVG <image> (#460)", () => {
  it("href and xlink:href of <image> become blob: URLs; a plain link and a foreign address are left alone", async () => {
    const a = new FakeEl("image", { href: "/v1/assets/aaa" });
    const b = new FakeEl("image", { "xlink:href": "/v1/assets/bbb?size=thumb" });
    const link = new FakeEl("a", { href: "/v1/assets/ccc" });
    const far = new FakeEl("image", { href: "https://example.com/x.png" });
    const frag = new FakeEl("image", { href: "#symbol" });
    const filter = new FakeEl("feImage", { href: "/v1/assets/ddd" });
    const r = await boot([a, b, link, far, frag, filter]);
    expect(a.getAttribute("href")).toMatch(/^blob:/);
    expect(b.getAttribute("xlink:href")).toMatch(/^blob:/);
    expect(filter.getAttribute("href")).toMatch(/^blob:/);
    expect(link.getAttribute("href")).toBe("/v1/assets/ccc");
    expect(far.getAttribute("href")).toBe("https://example.com/x.png");
    expect(frag.getAttribute("href")).toBe("#symbol");
    expect(r.fetched.sort()).toEqual(["/v1/assets/aaa", "/v1/assets/bbb?size=thumb", "/v1/assets/ddd"]);
  });

  it("the scan looks for <image> and the observer watches href and xlink:href", async () => {
    const r = await boot([]);
    expect(r.selectors.some((s) => /(^|,)image(,|$)/.test(s))).toBe(true);
    expect(r.observed.filter).toEqual(expect.arrayContaining(["src", "srcset", "style", "poster", "href", "xlink:href"]));
  });

  it("src of an <img> still works", async () => {
    const img = new FakeEl("img", { src: "/v1/assets/eee" });
    await boot([img]);
    expect(img.getAttribute("src")).toMatch(/^blob:/);
  });
});
