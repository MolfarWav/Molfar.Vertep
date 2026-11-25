globalThis.location = { pathname: "/app/u/roleplay/", origin: "http://localhost", href: "http://localhost/app/u/roleplay/", search: "", hash: "" } as any;
globalThis.localStorage = { getItem() { return null }, setItem() {}, removeItem() {} } as any;
const R = (process.env.ROLEPLAY_DIR || ".") + "/src/lib/";
const { presetImportFull } = await import(R + "import-shapes.ts");
const { buildDefaultPreset } = await import(R + "seed.ts");
const { presetToEngine } = await import(R + "engine.ts");
import fs from "node:fs";
import os from "node:os";
// output goes to OUT_DIR (default: the temp folder), never into the Roleplay folder these scripts run from
const OUT = process.env.OUT_DIR || os.tmpdir();
const json = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const res = presetImportFull(json, "Sola", buildDefaultPreset());
if (!res) { console.log("NOT RECOGNISED"); process.exit(1); }
console.log("source", res.report.source, "sections", res.preset.sections.length, "vars", res.preset.variables.length, "groups", res.preset.groups.length, "regex", res.regex.length);
for (const b of ["came", "approx", "dropped"]) console.log(b, JSON.stringify(res.report[b]).slice(0, 400));
console.log("regex flags", res.regex.map((r) => r.flags + (r.markdownOnly ? "/D" : "/P") + (r.minDepth ?? "")).join(" "));
const eng = presetToEngine({ ...res.preset, id: "preset_test" });
fs.writeFileSync(OUT + "/engine_shape.json", JSON.stringify(eng));
console.log("engine prompts", eng.prompts.length, "order", eng.prompt_order[0].order.filter((x) => x.enabled).length, "enabled");
