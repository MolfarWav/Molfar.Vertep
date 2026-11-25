// Every SillyTavern preset of a folder through the app's importer, then its enabled sections expanded in order (the
// imported defaults), for one Roleplay checkout. bun import-all.ts <roleplay repo> <folder>
globalThis.location = { pathname: "/app/u/roleplay/", origin: "http://localhost", href: "http://localhost/app/u/roleplay/", search: "", hash: "" } as any;
globalThis.localStorage = { getItem() { return null }, setItem() {}, removeItem() {} } as any;
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const [, , repo, dir] = process.argv;
const R = pathToFileURL(repo + "/src/lib/").href;
const { presetImportFull } = await import(R + "import-shapes.ts");
const { buildDefaultPreset } = await import(R + "seed.ts");
const { presetToEngine } = await import(R + "engine.ts");
const { expandMacros, resolvePresetVars, sectionCondPasses } = await import(pathToFileURL(repo + "/plugins/engine/plugin.js").href);
const realRandom = Math.random;
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith(".json")) continue;
  let j: any; try { j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { continue; }
  if (!j || !Array.isArray(j.prompts) || !Array.isArray(j.prompt_order)) continue;
  const all = j.prompts.map((p: any) => p.content || "").join("\n");
  if (!/\{\{\s*(?:#?setvar|getvar|setglobalvar|#?if|[.$][a-z])/i.test(all)) continue;
  Math.random = realRandom;
  const res = presetImportFull(j, "P", buildDefaultPreset());
  Math.random = () => 0;
  if (!res) { console.log(f, "NOT RECOGNISED"); continue; }
  const preset = presetToEngine({ ...res.preset, id: "p" });
  const pv = resolvePresetVars(preset, {}, {});
  const mc = { userName: "Anna", charName: "Arthur", personaText: "PERSONA", chatId: "x", vars: {}, card: { description: "DESC", personality: "PERS", scenario: "SCEN" }, presetVars: pv };
  const out: string[] = [];
  for (const s of preset.studio.sections) {
    if (!s.enabled || (s.marker && !String(s.content || "").trim()) || !sectionCondPasses(s.condition, pv, mc.vars, null)) continue;
    const t = expandMacros(s.content || "", mc);
    if (t.trim()) out.push(t.trim());
  }
  const text = out.join("\n\n");
  const frags = (text.match(/\{\{|\}\}/g) || []).length;
  const unknown = (res.report.dropped.find((i: any) => i.id === "macros")?.names || []).join(" ");
  console.log(JSON.stringify({ file: f.slice(0, 44), tokens: Math.round(text.length / 4), braces: frags, unknownMacros: unknown.slice(0, 120) }));
}
