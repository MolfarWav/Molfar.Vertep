// Our expandMacros against SillyBunny's own macro engine, preset by preset, with ST's shipped switches (prompt_order 100001).
// bun --preload ./preload.ts compare-st.mjs <folder> <plugin.js> [file filter]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { stEval, stReset } from "./st.mjs";
const [, , dir, pluginPath, only] = process.argv;
const E = await import(pathToFileURL(pluginPath).href);
Math.random = () => 0;
const base = { userName: "Anna", charName: "Arthur", personaText: "PERSONA", chatId: "x", card: { description: "DESC", personality: "PERS", scenario: "SCEN" } };
const norm = (s) => s.replace(/\s+/g, " ").trim();
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".json") || (only && !f.includes(only))) continue;
  let j; try { j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { continue; }
  if (!j || !Array.isArray(j.prompts) || !Array.isArray(j.prompt_order)) continue;
  const po = j.prompt_order.find((o) => o.character_id === 100001) || j.prompt_order[0];
  if (!po?.order) continue;
  const byId = Object.fromEntries(j.prompts.map((p) => [p.identifier, p]));
  const items = po.order.filter((o) => o.enabled && byId[o.identifier] && !byId[o.identifier].marker).map((o) => byId[o.identifier]);
  const all = items.map((p) => p.content || "").join("\n");
  if (!/\{\{\s*(?:#?setvar|getvar|#?if|[.$][a-z])/i.test(all)) continue;
  stReset();
  const vars = {};
  let diffs = 0, first = null, frag = 0, len = 0;
  for (const p of items) {
    const t = String(p.content || "");
    const st = norm(E.expandMacros(stEval(t), { ...base, vars: {} }));
    const ours = norm(E.expandMacros(t, { ...base, vars }));
    len += ours.length; frag += (ours.match(/\{\{|\}\}/g) || []).length;
    if (st !== ours) {
      diffs++;
      let i = 0;
      while (st[i] === ours[i]) i++;
      const d = { section: p.name, st: st.slice(Math.max(0, i - 80), i + 140), ours: ours.slice(Math.max(0, i - 80), i + 140) };
      if (process.env.ALL_DIFFS) console.log("  ~ " + JSON.stringify(d));
      if (!first) first = d;
    }
  }
  console.log(JSON.stringify({ file: f.slice(0, 50), sections: items.length, chars: len, leftoverBraces: frag, sectionsDiffering: diffs, first }));
}
