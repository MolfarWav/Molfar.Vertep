#!/usr/bin/env node
// Prints how Litopys sees one Roleplay chat: places, scene flags, the scenes it computes, its chapters.
// No message text is printed, only ids, numbers and place names. Works with node or bun.
//
//   node litopys-report.mjs --app <Roleplay app folder>            lists the chats
//   node litopys-report.mjs --app <Roleplay app folder> --chat <id or part of the title>
//
// The app folder is data/users/<name>/apps/roleplay inside the engine folder. The report runs the app's
// own plugins/litopys/plugin.js, so it shows what that installed version does.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : undefined; };
const app = arg("app");
if (!app) { console.error("usage: litopys-report.mjs --app <Roleplay app folder> [--chat <id or title part>]"); process.exit(2); }
const dataDir = fs.existsSync(path.join(app, "data")) ? path.join(app, "data") : app;
const fsx = {
  read: (rel) => fs.readFileSync(path.join(dataDir, rel), "utf8"),
  write: () => { throw new Error("read-only"); },
  list: (rel) => { try { return fs.readdirSync(path.join(dataDir, rel)); } catch { return []; } },
};
const L = await import(pathToFileURL(path.join(app, "plugins", "litopys", "plugin.js")).href);
const j = (rel, d = null) => { try { return JSON.parse(fsx.read(rel)); } catch { return d; } };

const metas = fsx.list("chats").filter((f) => f.endsWith(".meta.json")).map((f) => ({ id: f.slice(0, -10), ...j("chats/" + f, {}) }));
const want = arg("chat");
if (!want) {
  for (const m of metas.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 40)) console.log(m.id, "|", m.title || "", "|", m.updatedAt ? new Date(m.updatedAt).toISOString() : "");
  process.exit(0);
}
const meta = metas.find((m) => m.id === want) || metas.find((m) => String(m.title || "").toLowerCase().includes(want.toLowerCase()));
if (!meta) { console.error("no such chat"); process.exit(1); }

const rc = L.readChat(fsx, meta.id);
const line = L.activeLine(rc.msgs);
const dash = L.readDash(fsx, meta.id);
const cfg = L.loadConfig(fsx);
const st = L.loadChatFile(fsx, meta.id);
const snaps = dash && dash.snapshots ? dash.snapshots : {};
console.log(`chat ${meta.id} "${meta.title || ""}"`);
console.log(`active messages ${line.length} (of ${rc.msgs.length} lines), dashboard snapshots ${Object.keys(snaps).length}, places logged ${Object.keys(dash.places || {}).length}`);
console.log(`litopys enabled ${cfg.enabled !== false}, scene min ${cfg.scene.minMessages} max ${cfg.scene.maxMessages}, recentMessages ${cfg.recentMessages}`);

// what each source says, per message number (1-based)
let lastStrict = null, lastLit = null, lastClock = null;
const rows = [];
line.forEach((m, i) => {
  const key = m.id + "#" + (Number.isFinite(m.swipe) ? m.swipe : 0);
  const s = snaps[key];
  const rec = (dash.places || {})[key] || (s && s.clock) || null;
  const place = rec && typeof rec.place === "string" ? rec.place.trim() : "";
  const notes = [];
  if (!s) { if (i % 10 === 0 || i === line.length - 1) notes.push("no snapshot"); }
  if (place && place.toLowerCase() !== lastStrict) { notes.push(`header: place "${place}" (day ${rec.day ?? "?"} ${rec.time ?? ""})`); lastStrict = place.toLowerCase(); }
  const sp = s && s.clock && typeof s.clock.place === "string" ? s.clock.place.trim() : "";
  if (sp && lastLit !== null && !L.samePlace(sp, lastLit)) notes.push(`litopys: place change to "${sp}" (from "${lastLit}")`);
  if (sp) lastLit = sp;
  if (s && s.scene && s.scene.new === true) notes.push(`litopys: scene.new "${s.scene.label || ""}"`);
  const mins = s && s.clock && s.clock.time ? ((Number(s.clock.day) || 1) - 1) * 1440 + String(s.clock.time).split(":").map(Number).reduce((h, x) => h * 60 + x) : null;
  if (mins !== null && lastClock !== null && Math.abs(mins - lastClock) > 360) notes.push(`litopys: clock jump ${Math.round((mins - lastClock) / 60)} h`);
  if (mins !== null) lastClock = mins;
  if (notes.length) rows.push(`#${i + 1} ${m.role} ${m.id}: ${notes.join("; ")}`);
});
console.log("\nsignals:\n" + (rows.join("\n") || "(none)"));

console.log("\nscenes litopys computes now:");
for (const sc of L.findScenes(line, dash, cfg, st ? st.marks : [])) console.log(`  #${sc.fromIdx + 1}-#${sc.toIdx + 1} (${sc.count}) ${sc.kind}${sc.marked ? " marked" : ""} ${sc.closed ? "closed" : "open"} "${sc.label || ""}"`);
console.log("\nchapters in the record:");
if (!st) console.log("  (no record file)");
else {
  for (const ch of st.chapters) { const r = L.rangeOf(ch, line); console.log(`  ${ch.id} #${r.orphan ? "gone" : r.fromIdx + 1 + "-#" + (r.toIdx + 1)} ${ch.kind} ${ch.stale ? "stale " : ""}${ch.edited ? "edited " : ""}"${ch.label || ""}"`); }
  console.log(`worker ${JSON.stringify(st.worker || null)}, rebuilding ${!!st.rebuild}, marks ${JSON.stringify(st.marks || [])}, skipScenes ${(st.skipScenes || []).length}`);
}
