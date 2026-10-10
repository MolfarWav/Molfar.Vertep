// Times Roleplay's prompt preview (the send's assembly) in the engine's real QuickJS sandbox,
// with a heavy regex set and a long chat. Usage (from the engine worktree):
//   bun <this file> <roleplay dir> <regex dir> [messages] [plugin dir override]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { discoverAppPlugins, runPluginRoute } from "../../src/plugins/runtime.ts";
import { PluginStoreService } from "../../src/plugins/store.ts";

const [rpDir, regexDir, nArg, pluginsOverride] = process.argv.slice(2);
const N = Number(nArg ?? 150);
const root = fs.mkdtempSync(path.join(os.tmpdir(), "rpbench-"));
const app = path.join(root, "apps", "roleplay");
fs.cpSync(path.join(pluginsOverride ?? rpDir, pluginsOverride ? "." : "plugins"), path.join(app, "plugins"), { recursive: true });
const data = path.join(app, "data");
for (const d of ["characters/aria", "personas", "presets", "regex", "groups", "lorebooks", "chats"]) fs.mkdirSync(path.join(data, d), { recursive: true });
fs.writeFileSync(path.join(data, "presets", "default.json"), JSON.stringify({ id: "default", name: "Default", prompts: [], prompt_order: [] }));
fs.writeFileSync(path.join(data, "presets", "sola.json"), JSON.stringify({
  id: "sola", name: "Sola",
  prompts: [{ identifier: "main", name: "Main", role: "system", content: "Narrate.", marker: true }, { identifier: "chatHistory", marker: true }],
  prompt_order: [{ character_id: 100001, order: [{ identifier: "main", enabled: true }, { identifier: "chatHistory", enabled: true }] }],
  openai_max_context: 200000,
}));
// the regex set, retargeted at this preset (local copy only)
let k = 0;
for (const f of fs.readdirSync(regexDir).filter((x) => x.endsWith(".json"))) {
  const r = JSON.parse(fs.readFileSync(path.join(regexDir, f), "utf8"));
  if (r.scope === "preset") r.scopeTargetId = "sola";
  fs.writeFileSync(path.join(data, "regex", f), JSON.stringify(r));
  k++;
}
fs.writeFileSync(path.join(data, "characters", "aria", "card.json"), JSON.stringify({ spec: "chara_card_v2", name: "Aria", description: "A barista.", first_mes: "Hi." }));
fs.writeFileSync(path.join(data, "personas", "you.json"), JSON.stringify({ id: "you", name: "You", description: "Courier." }));
fs.writeFileSync(path.join(data, "settings.json"), JSON.stringify({ model: null, personaId: "you" }));
// a long chat whose replies carry HUD and HTML blocks (one left unclosed now and then)
const prose = "She turns to leave, then glances back over her shoulder. \"Not like it'll help you.\" ".repeat(25);
const hud = '<sola_hud digest="T=2 F=1 D=0"><details><summary>HUD</summary>$150 | 0 Followers | 0 Subs | Cheap Studio</details></sola_hud>\n<date>Day 3, evening</date>\n<scene_state>calm</scene_state>\n<!-- HTML_START --><div style="padding:8px">SEXME! CREATE AN ACCOUNT</div><!-- HTML_END -->';
const msgs = [];
for (let i = 0; i < N; i++) {
  const user = i % 2 === 0;
  msgs.push({ id: "m" + i, role: user ? "user" : "char", charId: user ? undefined : "aria", name: user ? "You" : "Aria", text: user ? "I check my phone." : prose + "\n" + hud + (i % 10 === 1 ? "\n<date>unclosed " : ""), at: i });
}
fs.writeFileSync(path.join(data, "chats", "c1.meta.json"), JSON.stringify({ id: "c1", characterId: "aria", presetId: "sola", personaId: "you" }));
fs.writeFileSync(path.join(data, "chats", "c1.jsonl"), msgs.map((m) => JSON.stringify(m)).join("\n") + "\n");

const plugin = discoverAppPlugins(path.join(root, "apps"), "roleplay").find((p) => p.id === "roleplay__engine")!;
const deps = { store: new PluginStoreService(path.join(root, "store")), models: {} as never, grantsFor: () => plugin.manifest.permissions };
const run = async () => {
  const t = performance.now();
  const r = await runPluginRoute(plugin, { method: "POST", path: "/prompt/preview", query: {}, body: { chatId: "c1", userText: "Hello" } }, deps as never);
  return { ms: Math.round(performance.now() - t), status: r?.status, err: (r?.json as { error?: string })?.error, n: ((r?.json as { messages?: unknown[] })?.messages ?? []).length };
};
console.log(`regex scripts ${k}, messages ${N}, chars/reply ${prose.length + hud.length}`);
for (let i = 0; i < 3; i++) console.log(await run());
fs.rmSync(root, { recursive: true, force: true });
process.exit(0);
