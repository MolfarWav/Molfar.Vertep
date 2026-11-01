/**
 * The Script card's sandbox (src/plugins/script-box.ts, design in .fork/handoff/script-card/DESIGN.md).
 * These run on the engine's real QuickJS worker: the point is what a hostile script can and cannot do.
 */
import { describe, it, expect, afterAll, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runScript, runScripts, disposeScriptBox, SCRIPT_LIMITS } from "../src/plugins/script-box.js";
import { sandbox } from "../src/plugins/sandbox.js";
import { discoverPlugins, invalidatePluginCache, runPluginRoute } from "../src/plugins/runtime.js";
import { PluginStoreService } from "../src/plugins/store.js";

afterAll(async () => {
  await disposeScriptBox();
});

const run = (code: string, input: Record<string, unknown> = {}, seed = "s") => runScript({ code, input, seed }, "test script");

describe("script box: what a script is", () => {
  it("runs the code as a function body of (input, seed) and returns its object", async () => {
    const r = await run("return { n: input.a + input.b, s: seed };", { a: 2, b: 3 }, "abc");
    expect(r).toEqual({ ok: true, value: { n: 5, s: "abc" } });
  });

  it("is strict: an undeclared assignment is an error, not a global", async () => {
    const r = await run("leak = 1; return {};");
    expect(r.ok).toBe(false);
  });

  it("repeats: Math.random follows the seed, a different seed gives another sequence", async () => {
    const a = await run("return { r: [Math.random(), Math.random(), Math.random()] };", {}, "turn-1");
    const b = await run("return { r: [Math.random(), Math.random(), Math.random()] };", {}, "turn-1");
    const c = await run("return { r: [Math.random(), Math.random(), Math.random()] };", {}, "turn-2");
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a.ok && (a.value.r as number[]).every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it("has no clock", async () => {
    const r = await run("return { d: typeof Date, p: typeof performance, t: typeof setTimeout };");
    expect(r).toEqual({ ok: true, value: { d: "undefined", p: "undefined", t: "undefined" } });
  });

  it("reports a syntax error and a thrown value in words", async () => {
    const syn = await run("return {");
    expect(syn.ok).toBe(false);
    const thrown = await run("throw 'plain string';");
    expect(thrown.ok).toBe(false);
    const err = await run("throw new Error('boom');");
    expect(err).toMatchObject({ ok: false });
    expect((err as { error: string }).error).toContain("boom");
  });

  it("must return a plain object", async () => {
    for (const code of ["return 5;", "return [1];", "return null;", "return undefined;", "return () => 1;", "const a = {}; a.a = a; return a;", "return { n: 1n };"]) {
      const r = await run(code);
      expect(r.ok).toBe(false);
    }
  });
});

describe("script box: a hostile script", () => {
  it("is stopped when it loops forever, within the CPU limit", async () => {
    const t = Date.now();
    const r = await run("while (true) {}");
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toContain(`${SCRIPT_LIMITS.cpuMs} ms`);
    expect(Date.now() - t).toBeLessThan(SCRIPT_LIMITS.hardMs + 1500);
  });

  it("is ended when it eats memory, long before the engine's default 10 s watchdog", async () => {
    const t = Date.now();
    const r = await run("const a = []; while (true) { a.push(new Array(100000).fill(1)); }");
    expect(r.ok).toBe(false);
    expect(Date.now() - t).toBeLessThan(SCRIPT_LIMITS.hardMs + 2500);
  }, 20000);

  it("cannot double a string into the gigabytes", async () => {
    const r = await run("let s = 'x'; while (true) { s += s; }");
    expect(r.ok).toBe(false);
  });

  it("survives deep recursion as a failure of the script, and the box serves the next one", async () => {
    const r = await run("function f() { return f() + 1; } return { v: f() };");
    expect(r.ok).toBe(false);
    const after = await run("return { ok: 1 };");
    expect(after).toEqual({ ok: true, value: { ok: 1 } });
  });

  it("cannot return more than the output limit", async () => {
    const r = await run("return { s: 'x'.repeat(5e6) };");
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toContain("more than");
  });

  it("cannot return a deeply nested value that breaks the reader", async () => {
    const r = await run("let o = {}; for (let i = 0; i < 20000; i++) o = { a: o }; return o;");
    expect(r.ok).toBe(false);
  });

  it("does not see the sandbox, the process, the file system, the network or the clock", async () => {
    const r = await run(`
      const seen = {};
      for (const k of ["env", "process", "__fs", "fetch", "Date", "require", "Request", "Buffer", "setTimeout", "host"]) seen[k] = typeof globalThis[k];
      return seen;`);
    expect(r.ok).toBe(true);
    for (const [k, v] of Object.entries((r as { value: Record<string, string> }).value)) expect([k, v]).toEqual([k, "undefined"]);
  });

  it("cannot read a file, even by importing the module that names them", async () => {
    const r = await run(`
      const m = await import("node:fs").catch((e) => ({ err: String(e) }));
      let read = "no";
      try { read = String(m.readFileSync("/etc/passwd", "utf8")).slice(0, 20); } catch (e) { read = "refused"; }
      return { read };`);
    // an async body is a Promise, which is not a plain object: the card refuses it
    expect(r.ok).toBe(false);
    const sync = await run(`
      let read = "no";
      try { read = String(__fs.readFileSync("/etc/passwd", "utf8")).slice(0, 20); } catch (e) { read = "refused"; }
      return { read };`);
    expect(sync).toEqual({ ok: true, value: { read: "refused" } });
  });

  it("leaves nothing behind for the next script (a polluted prototype is gone)", async () => {
    await run("Object.prototype.polluted = 1; Math.max = () => 0; return {};");
    const r = await run("return { p: ({}).polluted === undefined, m: Math.max(1, 2) };");
    expect(r).toEqual({ ok: true, value: { p: true, m: 2 } });
  });

  it("refuses code and input that are too big or the wrong shape before the sandbox starts", async () => {
    expect(await runScript({ code: "x".repeat(SCRIPT_LIMITS.codeChars + 1), input: {}, seed: "" }, "t")).toMatchObject({ ok: false });
    expect(await runScript({ code: "return {};", input: { s: "x".repeat(SCRIPT_LIMITS.inputBytes + 1) }, seed: "" }, "t")).toMatchObject({ ok: false });
    expect(await runScript({ code: "return {};", input: [1], seed: "" }, "t")).toMatchObject({ ok: false });
    expect(await runScript({ code: "  ", input: {}, seed: "" }, "t")).toMatchObject({ ok: false });
    expect(await runScript(null, "t")).toMatchObject({ ok: false });
  });
});

describe("script box: it does not hurt anything else", () => {
  it("a script killed on its own worker leaves the plugin worker serving", async () => {
    const plugin = "export function f(ctx) { return { n: ctx.n * 2 }; }";
    const bomb = run("const a = []; while (true) { a.push(new Array(100000).fill(1)); }");
    const served = await sandbox.eval({ source: plugin, hook: "f", ctx: { n: 21 }, storeSnapshot: {} });
    expect(served.ok).toBe(true);
    expect(served.out).toEqual({ n: 42 });
    expect((await bomb).ok).toBe(false);
    const again = await sandbox.eval({ source: plugin, hook: "f", ctx: { n: 1 }, storeSnapshot: {} });
    expect(again.ok).toBe(true);
  }, 20000);

  it("a pass of slow scripts stops running them once the pass budget is spent", async () => {
    const slow = { code: "const t = 0; let i = 0; while (i < 3e8) i++; return {};", input: {}, seed: "" };
    const many = Array.from({ length: 8 }, (_, i) => ({ key: `k${i}`, req: slow }));
    const t = Date.now();
    const out = await runScripts(many, "t");
    expect(Object.keys(out)).toHaveLength(8);
    expect(Object.values(out).some((r) => !r.ok && /used up/.test(r.error))).toBe(true);
    expect(Date.now() - t).toBeLessThan(SCRIPT_LIMITS.passMs + SCRIPT_LIMITS.hardMs + 2000);
  }, 30000);

  it("asks for at most perPass scripts", async () => {
    const reqs = Array.from({ length: SCRIPT_LIMITS.perPass + 4 }, (_, i) => ({ key: `k${i}`, req: { code: "return {};", input: {}, seed: "" } }));
    const out = await runScripts(reqs, "t");
    expect(Object.keys(out)).toHaveLength(SCRIPT_LIMITS.perPass);
  }, 30000);
});

describe("script box: the plugin side of the exchange", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "script-plugin-"));
  });
  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* watcher races */ }
    invalidatePluginCache();
  });

  const code = `
    export function handleRoute(req, host) {
      const got = host.script.results.sum;
      if (got) return { json: got };
      host.script.request("sum", { code: "return { sum: input.a + input.b };", input: { a: 4, b: 5 }, seed: "x" });
      return { __llmPending: true };
    }`;
  const make = (permissions: string[]) => {
    const p = path.join(dir, "plugins", "scripty");
    fs.mkdirSync(p, { recursive: true });
    fs.writeFileSync(path.join(p, "manifest.json"), JSON.stringify({ name: "S", version: "1", origin: "local", permissions }));
    fs.writeFileSync(path.join(p, "plugin.js"), code);
    return discoverPlugins(path.join(dir, "plugins")).find((x) => x.id === "scripty")!;
  };
  const deps = () => ({ store: new PluginStoreService(path.join(dir, "store")), models: {} as never, grantsFor: () => [] });

  it("a plugin with the script permission gets the answer on the next pass", async () => {
    const out = await runPluginRoute(make(["routes", "script"]), { method: "GET", path: "/x", query: {}, body: null }, deps());
    expect(out?.json).toEqual({ ok: true, value: { sum: 9 } });
  });

  it("a plugin without it cannot ask", async () => {
    const out = await runPluginRoute(make(["routes"]), { method: "GET", path: "/x", query: {}, body: null }, deps());
    expect(out?.status).toBe(500);
    expect(JSON.stringify(out?.json)).toContain('permission \\"script\\" not granted');
  });
});
