/**
 * #432: what 161 plugin file reads cost one call each against one readMany call, in the real sandbox.
 *
 *     bun .fork/bench/fs-readmany.ts [files] [bytes each]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { discoverPlugins, runPluginRoute } from "../../src/plugins/runtime.js";
import { PluginStoreService } from "../../src/plugins/store.js";

const files = Number(process.argv[2]) || 161;
const bytes = Number(process.argv[3]) || 1500;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fs-readmany-bench-"));
const appData = path.join(dir, "appdata");
fs.mkdirSync(path.join(appData, "regex"), { recursive: true });
for (let i = 0; i < files; i++) fs.writeFileSync(path.join(appData, "regex", `s${i}.json`), JSON.stringify({ id: `s${i}`, find: "x".repeat(bytes) }));
const p = path.join(dir, "plugins", "bench");
fs.mkdirSync(p, { recursive: true });
fs.writeFileSync(path.join(p, "manifest.json"), JSON.stringify({ name: "Bench", version: "1", permissions: ["routes", "fs"], origin: "local" }));
fs.writeFileSync(path.join(p, "plugin.js"), `export function handleRoute(req, host) {
  const paths = host.fs.list("regex").map((n) => "regex/" + n);
  const t0 = Date.now(); for (const x of paths) host.fs.read(x);
  const t1 = Date.now(); host.fs.readMany(paths);
  const t2 = Date.now();
  return { status: 200, json: { one: t1 - t0, many: t2 - t1 } };
}`);
const plugin = discoverPlugins(path.join(dir, "plugins"))[0]!;
plugin.fsRoot = appData;
const deps = { store: new PluginStoreService(path.join(dir, "store")), models: {} as never, grantsFor: () => [] as string[] };
for (let run = 1; run <= 4; run++) {
  const r = await runPluginRoute(plugin, { method: "POST", path: "/x", query: {}, body: {} }, deps);
  console.log(`run ${run}: ${files} files, one call each ${r?.json?.one} ms, readMany ${r?.json?.many} ms`);
}
fs.rmSync(dir, { recursive: true, force: true });
process.exit(0); // the sandbox worker stays alive otherwise
