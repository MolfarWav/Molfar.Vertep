import { pathToFileURL } from "node:url";
import path from "node:path";
const ENGINE = pathToFileURL(path.join(process.env.ROLEPLAY_DIR || ".", "plugins/engine/plugin.js")).href;
const { expandMacros, resolvePresetVars, sectionCondPasses } = await import(ENGINE);
import fs from "node:fs";
const preset = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const pv = resolvePresetVars(preset, {}, {});
const mc = { userName: "Anna", charName: "Arthur", personaText: "PERSONA", chatId: "x", features: { litopys: true, memories: true, castknowledge: true, hiddenplan: false, dashboard: true, fastsensor: false, world: true, worldnews: true, dice: true, life: true, databank: true, authornote: false }, vars: {}, card: { description: "DESC", personality: "PERS", scenario: "SCEN" }, presetVars: pv };
const groups = new Map(preset.studio.groups.map((g) => [g.id, g]));
const rows = [];
for (const s of preset.studio.sections) {
  if (!s.enabled || !sectionCondPasses(s.condition, pv, {}, null)) continue;
  const t = s.marker ? "[[" + s.marker + "]]" : expandMacros(s.content, mc);
  if (t.trim()) rows.push({ g: s.groupId, t, name: s.name });
}
let out = [];
for (let i = 0; i < rows.length;) {
  const g = rows[i].g; let j = i; while (j < rows.length && rows[j].g === g) j++;
  const inner = rows.slice(i, j).map((r) => r.t).join("\n");
  if (g) { const tag = groups.get(g).name.toLowerCase().replace(/[^a-z0-9]+/g, "-"); out.push("<" + tag + ">\n" + inner + "\n</" + tag + ">"); } else out.push(inner);
  i = j;
}
const all = out.join("\n\n");
fs.writeFileSync(process.argv[3], all);
const left = all.match(/\{\{[^\n]{0,50}|[^\n]{0,30}\}\}/g) || [];
console.log("chars", all.length, "leftover braces", left.length, left.slice(0, 10));
