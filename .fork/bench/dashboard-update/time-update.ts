// Times POST /dashboard/update in the engine's real QuickJS sandbox (the 10 s limit per pass is the engine's, #245).
//   bun time-update.ts <state root made by build-state.ts> <plugin.js> [runs=3]      env RP = the Roleplay checkout
// Each run starts from a fresh copy of the state and adds one reply: run 0 is the first update after an upgrade.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { discoverAppPlugins, runPluginRoute } from "../../../src/plugins/runtime.ts";
import { PluginStoreService } from "../../../src/plugins/store.ts";

const [stateRoot, pluginFile, runsArg] = process.argv.slice(2);
const runs = Number(runsArg ?? 3);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "upd-"));
const app = path.join(tmp, "apps", "roleplay");
fs.mkdirSync(path.join(app, "plugins", "relations"), { recursive: true });
fs.copyFileSync((process.env.RP ?? path.resolve(import.meta.dir, "../../../../Molfar.Vertep-Roleplay")) + "/plugins/relations/manifest.json", path.join(app, "plugins", "relations", "manifest.json"));
fs.copyFileSync(pluginFile!, path.join(app, "plugins", "relations", "plugin.js"));
const plugin = discoverAppPlugins(path.join(tmp, "apps"), "roleplay").find((p) => p.id === "roleplay__relations")!;
const reply = JSON.stringify({ minutes: 5, present: ["Aria", "Bea", "Cleo", "Dana"], chars: { Aria: { mood: "calm", outfit: { add: ["a new scarf"] } } }, objects: { add: [{ item: "a book", where: "on the table" }] } });
let marks: number[] = [];
const models = { generate: async () => { marks.push(performance.now()); return { text: reply, model: "mock", usage: { input: 1, output: 1 }, genTimeMs: 1 }; }, embed: async () => null };
for (let r = 0; r < runs; r++) {
  // a fresh copy of the old state each run: the first update of an old chat is what is measured
  const data = path.join(app, "data");
  fs.rmSync(data, { recursive: true, force: true });
  fs.cpSync(stateRoot!, data, { recursive: true });
  const prose = "She turned toward the window and spoke quietly. ".repeat(40);
  fs.appendFileSync(path.join(data, "chats/c1.jsonl"), [{ id: "unew", role: "user", name: "You", text: "Go on." }, { id: "cnew", role: "char", name: "Four Beauties", text: prose, swipe: 0, characterId: "aria" }].map((m) => JSON.stringify(m)).join(String.fromCharCode(10)) + String.fromCharCode(10));
  const deps = { store: new PluginStoreService(path.join(tmp, "store")), models: models as never, grantsFor: () => plugin.manifest.permissions };
  marks = [];
  const t0 = performance.now();
  const out = await runPluginRoute(plugin, { method: "POST", path: "/dashboard/update", query: {}, body: { chatId: "c1", op: "send" } }, deps as never);
  const t1 = performance.now();
  const j: any = out?.json;
  const pass1 = marks.length ? marks[0]! - t0 : NaN;
  const rest = marks.length ? t1 - marks[marks.length - 1]! : NaN;
  console.log(`run ${r}: total ${Math.round(t1 - t0)} ms (pass1 ${Math.round(pass1)} ms, last pass ${Math.round(rest)} ms), llm calls ${marks.length}, ok=${j?.ok} ${j?.error ?? ""}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(0);
