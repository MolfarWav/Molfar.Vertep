// Builds the built-in Sola preset files of the Roleplay repo from the compiled port (own-format JSON).
// bun build_stock.ts <port.json> <roleplay repo dir>   (run with cwd = the Roleplay repo, for its tsconfig paths)
globalThis.location = { pathname: "/app/u/roleplay/", origin: "http://localhost", href: "http://localhost/app/u/roleplay/", search: "", hash: "" } as any;
globalThis.localStorage = { getItem() { return null }, setItem() {}, removeItem() {} } as any;
import fs from "node:fs";
import path from "node:path";
const [, , portPath, repo] = process.argv;
const R = path.join(repo, "src/lib/");
const { presetImportFull } = await import(R + "import-shapes.ts");
const { buildDefaultPreset } = await import(R + "seed.ts");
const { presetToEngine, regexToEngine } = await import(R + "engine.ts");

const ID = "sola";
const NAME = "Sola V5 Flame (Vertep)";
const CREDIT =
  "Sola V5 Flame by Pyrxpia (https://pyrxpia.github.io/sola-hub/), ported to Molfar Vertep with the author's permission. " +
  "Sola is the storyteller: pick her Mind, point of view, reply length and modules in Choices. Trackers the app already keeps " +
  "(Dashboard, World DM, Litopys) are left out; Sola's Desk teaches her to read those notes as her crew's working papers. " +
  "Story Movement, Notebook, Marginalia and the Chatterbox show as folded blocks drawn by this preset's regex scripts; " +
  "dialogue colours and dynamic styling are optional. About 14 to 16 thousand tokens with the default switches: heavy for small free models.";

const json = JSON.parse(fs.readFileSync(portPath, "utf8"));
const res = presetImportFull(json, NAME, buildDefaultPreset());
if (!res || res.report.source !== "vertep") throw new Error("not read as own format");
const lite = JSON.parse(fs.readFileSync(path.join(repo, "data/presets/_vertep-lite.json"), "utf8"));
const samplers = { ...lite.studio.samplers, temperature: { value: 1, enabled: true }, top_p: { value: 1, enabled: true }, min_p: { value: 0, enabled: false }, maxTokens: 8192 };
const preset = { ...res.preset, id: ID, name: NAME, readOnly: true, isDefault: false, folderId: null, picture: null, createdAt: 0, description: CREDIT, samplers };
const eng = presetToEngine(preset);
eng.id = ID;
const text = JSON.stringify(eng, null, 2) + "\n";
fs.writeFileSync(path.join(repo, "data/presets/sola.json"), text);
fs.writeFileSync(path.join(repo, "data/presets/_sola.json"), text);

const slug = (s: string) => s.toLowerCase().replace(/^sola\s*·\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const scripts = res.regex.map((r: any, i: number) => {
  const id = "sola-" + slug(r.name);
  const out = regexToEngine({ ...r, id, order: 2000 + i, scope: "preset", scopeTargetId: ID });
  return out;
});
const ids = scripts.map((s: any) => s.id);
if (new Set(ids).size !== ids.length) throw new Error("duplicate regex ids: " + ids.join(", "));
const bundle = {
  _note: "Regex scripts of the built-in Sola V5 Flame (Vertep) preset: they draw Sola's HUD, Chatterbox, footnotes, hover tags, dialogue colours and dynamic styling on screen, fold a thinking sheet left in a reply, and keep those blocks out of the prompt and of the helpers' reading of the story. The app update writes each one to regex/<id>.json when that file is missing.",
  scripts,
};
fs.writeFileSync(path.join(repo, "data/_sola-regex.json"), JSON.stringify(bundle, null, 2) + "\n");
for (const s of scripts) fs.writeFileSync(path.join(repo, "data/regex", s.id + ".json"), JSON.stringify(s, null, 2) + "\n");
console.log("sections", preset.sections.length, "variables", preset.variables.length, "regex", scripts.length);
console.log(ids.join("\n"));
