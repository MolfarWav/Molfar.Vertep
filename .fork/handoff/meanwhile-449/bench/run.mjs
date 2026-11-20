import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { entities, fronts, inputs } from "./fixture.mjs";
const RP = process.env.RP_DIR || "../../../../../Molfar.Vertep-Roleplay", ASK = process.env.ASK_MODEL || "../../../../.claude/skills/ask-model/scripts/ask.mjs"; // RP_DIR: a Roleplay checkout with plugins/meanwhile
const mw = await import(pathToFileURL(RP + "/plugins/meanwhile/plugin.js").href);
const index = mw.registryIndex(entities);
const ctx = { index, present: mw.presentIds(index, ["Cora", "Mira", "Кора", "Міра"]), fronts };
const models = (process.argv[2] || "").split(",").filter(Boolean).map((s) => s.split("/"));
const targets = models.map((m) => ({ p: m[0], m: m.slice(1).join("/") }));
mkdirSync("out", { recursive: true });
const call = (t, sysFile, userFile) => new Promise((res) => {
  const t0 = Date.now(); let out = "", err = "";
  const c = spawn("node", [ASK, "-p", t.p, "-m", t.m, "--system-file", sysFile, "--prompt-file", userFile, "--no-fallback", "--timeout", "240", "--max-tokens", "6000"]);
  c.stdout.on("data", (d) => (out += d)); c.stderr.on("data", (d) => (err += d));
  c.on("close", () => res({ out, err: err.trim().split("\n").pop(), ms: Date.now() - t0 }));
});
const jobs = [];
for (const t of targets) for (const lang of ["en", "uk"]) for (const rep of [1, 2]) jobs.push({ t, lang, rep });
const results = [];
let next = 0;
async function worker() {
  while (next < jobs.length) {
    const j = jobs[next++];
    const prompt = mw.buildPrompt(inputs[j.lang]);
    const base = `out/${j.t.m.replace(/[^\w.-]/g, "_")}-${j.lang}-${j.rep}`;
    writeFileSync(base + ".sys.txt", prompt.system); writeFileSync(base + ".user.txt", prompt.user);
    const r = await call(j.t, base + ".sys.txt", base + ".user.txt");
    writeFileSync(base + ".answer.txt", r.out);
    const raw = mw.parseEvents(r.out);
    const built = raw ? mw.buildEvents(raw, ctx, { k: 3, afterKey: "m9#0" }) : null;
    results.push({ model: j.t.m, lang: j.lang, rep: j.rep, ms: r.ms, promptTokens: prompt.tokens, answerChars: r.out.length, parsed: !!raw, offered: raw ? raw.length : 0, kept: built ? built.events.length : 0, dropped: built ? built.dropped.map((d) => d.reason) : [], err: r.out ? "" : r.err, sample: built && built.events[0] ? built.events[0].what : "" });
  }
}
await Promise.all([worker(), worker(), worker()]);
writeFileSync("out/results.json", JSON.stringify(results, null, 2));
for (const r of results.sort((a, b) => (a.model + a.lang + a.rep).localeCompare(b.model + b.lang + b.rep))) console.log(JSON.stringify(r));
