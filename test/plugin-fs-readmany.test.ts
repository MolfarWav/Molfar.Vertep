/**
 * #432: `host.fs.readMany(paths)` reads several files of the app's data folder in one call (a plugin that read 161 regex scripts
 * one call each spent about half a second on the calls). Same jail as `read`; a missing path or a folder is null.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { discoverPlugins, invalidatePluginCache, runPluginRoute } from "../src/plugins/runtime.js";
import { PluginStoreService } from "../src/plugins/store.js";

let dir: string;
let appData: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "fs-readmany-"));
  appData = path.join(dir, "appdata");
  fs.mkdirSync(path.join(appData, "regex"), { recursive: true });
});
afterEach(() => {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* watcher races */ }
  invalidatePluginCache();
});

const deps = () => ({ store: new PluginStoreService(path.join(dir, "store")), models: {} as never, grantsFor: () => [] as string[] });

function plugin(code: string, permissions = ["routes", "fs"]) {
  const p = path.join(dir, "plugins", "reader");
  fs.mkdirSync(p, { recursive: true });
  fs.writeFileSync(path.join(p, "manifest.json"), JSON.stringify({ name: "Reader", version: "1", permissions, origin: "local" }));
  fs.writeFileSync(path.join(p, "plugin.js"), code);
  const found = discoverPlugins(path.join(dir, "plugins"))[0]!;
  found.fsRoot = appData;
  return found;
}
const call = async (code: string, body: unknown = {}, permissions?: string[]) =>
  (await runPluginRoute(plugin(code, permissions), { method: "POST", path: "/x", query: {}, body }, deps()))?.json as Record<string, any>;

const READ = `export function handleRoute(req, host) {
  try { return { status: 200, json: { out: host.fs.readMany(req.body.paths) } }; }
  catch (e) { return { status: 200, json: { error: String(e && e.message || e) } }; }
}`;

describe("host.fs.readMany", () => {
  it("answers the text of each path, in order, and null for a missing path or a folder", async () => {
    fs.writeFileSync(path.join(appData, "regex", "a.json"), '{"a":1}');
    fs.writeFileSync(path.join(appData, "regex", "b.json"), "второй");
    const r = await call(READ, { paths: ["regex/a.json", "regex/nope.json", "regex/b.json", "regex", "gone/deeper/x.json"] });
    expect(r.out).toEqual(['{"a":1}', null, "второй", null, null]);
  });

  it("gives the same text as read, file by file, for 200 files", async () => {
    for (let i = 0; i < 200; i++) fs.writeFileSync(path.join(appData, "regex", `s${i}.json`), JSON.stringify({ id: `s${i}`, order: i }));
    const code = `export function handleRoute(req, host) {
      const paths = host.fs.list("regex").map((n) => "regex/" + n);
      const one = paths.map((p) => host.fs.read(p));
      const many = host.fs.readMany(paths);
      return { status: 200, json: { n: many.length, same: JSON.stringify(one) === JSON.stringify(many) } };
    }`;
    expect(await call(code)).toEqual({ n: 200, same: true });
  });

  it("keeps the jail: a path that leaves the data folder throws, nothing is read", async () => {
    fs.writeFileSync(path.join(dir, "outside.txt"), "secret");
    const r = await call(READ, { paths: ["regex", "../outside.txt"] });
    expect(r.error).toContain("escapes");
    expect(JSON.stringify(r)).not.toContain("secret");
  });

  it("does not follow a link out of the data folder", async () => {
    fs.writeFileSync(path.join(dir, "outside.txt"), "secret");
    try { fs.symlinkSync(path.join(dir, "outside.txt"), path.join(appData, "regex", "link.json")); } catch { return; } // no link rights (Windows)
    const r = await call(READ, { paths: ["regex/link.json"] });
    expect(r.error).toBeTruthy();
    expect(JSON.stringify(r)).not.toContain("secret");
  });

  it("refuses what is not a list, and a list over 5000 paths", async () => {
    expect((await call(READ, { paths: "regex/a.json" })).error).toContain("a list of paths");
    expect((await call(READ, { paths: Array.from({ length: 5001 }, (_, i) => "regex/" + i) })).error).toContain("at most 5000");
  });

  it("is refused without the fs permission, like read", async () => {
    const r = await call(READ, { paths: ["regex/a.json"] }, ["routes"]);
    expect(r.error ?? "").toMatch(/fs|permission/i);
  });
});
