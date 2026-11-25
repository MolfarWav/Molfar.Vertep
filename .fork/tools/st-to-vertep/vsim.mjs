// Vertep engine rendering of a preset's sections for given picks: condition gate + {{#if}} blocks,
// using the engine's own exported functions.
import { pathToFileURL } from "node:url";
import path from "node:path";
const ENGINE = pathToFileURL(path.join(process.env.ROLEPLAY_DIR || ".", "plugins/engine/plugin.js")).href;
const { expandIfBlocks, resolvePresetVars, sectionCondPasses } = await import(ENGINE);
import fs from "node:fs";
const [, , presetPath, cfgPath, outPath] = process.argv;
const preset = JSON.parse(fs.readFileSync(presetPath, "utf8"));
const cfgs = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const CARD = new Set(["personaDescription", "charDescription", "charPersonality", "dialogueExamples"]);
const out = [];
for (const cfg of cfgs) {
  const pv = resolvePresetVars(preset, {}, cfg.stored);
  const lookup = (name) => {
    if (/^vertep\./i.test(String(name))) { const f = cfg.feat[String(name).slice(7)]; return { value: f ? "true" : "false", picks: null }; }
    const k = Object.keys(pv).find((x) => x.toLowerCase() === String(name).toLowerCase());
    return k ? pv[k] : undefined;
  };
  const parts = [];
  for (const s of preset.studio.sections) {
    const enabled = Object.prototype.hasOwnProperty.call(cfg.secon, s.id) ? cfg.secon[s.id] : s.enabled;
    if (s.marker) {
      parts.push(CARD.has(s.id) ? "[[CARD]]" : enabled ? "[[M:" + s.id + "]]" : "");
      continue;
    }
    if (!enabled) continue;
    if (!sectionCondPasses(s.condition, pv, {}, null)) continue;
    parts.push(expandIfBlocks(s.content, lookup));
  }
  out.push({ text: parts.join("\n") });
}
fs.writeFileSync(outPath, JSON.stringify(out));
