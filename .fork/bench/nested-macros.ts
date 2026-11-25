/**
 * #516: what expanding a variable-driven SillyTavern preset costs in the real plugin sandbox (QuickJS), the tree
 * reader against the flat passes. Takes the Roleplay engine plugin and a JSON list of section texts in reading
 * order (an imported preset's enabled sections); each run expands them all with one shared chat-variable map.
 *
 *     bun .fork/bench/nested-macros.ts <roleplay plugins/engine/plugin.js> <sections.json> [<older plugin.js>]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { discoverPlugins, runPluginRoute } from "../../src/plugins/runtime.js";
import { PluginStoreService } from "../../src/plugins/store.js";

const [pluginPath, listPath, olderPath] = process.argv.slice(2);
if (!pluginPath || !listPath) { console.error("usage: nested-macros.ts <plugin.js> <sections.json> [<older plugin.js>]"); process.exit(2); }

async function bench(label: string, src: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nested-macros-bench-"));
  const appData = path.join(dir, "appdata");
  fs.mkdirSync(appData, { recursive: true });
  fs.copyFileSync(listPath, path.join(appData, "sections.json"));
  const p = path.join(dir, "plugins", "bench");
  fs.mkdirSync(p, { recursive: true });
  fs.writeFileSync(path.join(p, "manifest.json"), JSON.stringify({ name: "Bench", version: "1", permissions: ["routes", "fs"], origin: "local", limits: { executionMs: 30000 } }));
  const code = src.replace(/export (async )?function handleRoute\(/, "$1function roleplayHandleRoute(") + `
export function handleRoute(req, host) {
  const list = JSON.parse(host.fs.read("sections.json"));
  const times = [];
  let size = 0;
  for (let run = 0; run < 5; run++) {
    const mc = { userName: "Anna", charName: "Arthur", chatId: "x", vars: {}, card: {} };
    const t0 = Date.now();
    size = 0;
    for (const s of list) size += expandMacros(s, mc).length;
    times.push(Date.now() - t0);
  }
  return { status: 200, json: { times, size } };
}`;
  fs.writeFileSync(path.join(p, "plugin.js"), code);
  const plugin = discoverPlugins(path.join(dir, "plugins"))[0]!;
  plugin.fsRoot = appData;
  const deps = { store: new PluginStoreService(path.join(dir, "store")), models: {} as never, grantsFor: () => [] as string[] };
  const r = await runPluginRoute(plugin, { method: "POST", path: "/x", query: {}, body: {} }, deps);
  console.log(`${label}: ${JSON.stringify(r?.json ?? r)}`);
  fs.rmSync(dir, { recursive: true, force: true });
}

await bench("current", fs.readFileSync(pluginPath, "utf8"));
if (olderPath) await bench("older", fs.readFileSync(olderPath, "utf8"));
process.exit(0); // the sandbox worker stays alive otherwise
