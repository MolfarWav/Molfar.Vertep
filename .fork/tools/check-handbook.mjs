#!/usr/bin/env node
// Checks the handbook's anchors: in every page's "## Owners" section, each line names a file
// and one or more identifiers in backticks; the file must exist and contain each identifier.
// Usage: node check-handbook.mjs <handbook dir> engine=<path> roleplay=<path> social=<path>
// A repo that is not given is skipped (its pages are reported as "skipped"). Exit code 1 on a miss.
// Second mode, for a change in progress: which pages name the files you touched?
//   node check-handbook.mjs <handbook dir> --touched <repo>:<path> [<repo>:<path> ...]
//   e.g. --touched roleplay:plugins/world/plugin.js engine:src/apps/reads.ts
// It prints the pages to re-read and update in the same change. Exit code 0.
import fs from "node:fs";
import path from "node:path";

const [dir, ...rest] = process.argv.slice(2);
if (!dir) { console.error("usage: check-handbook.mjs <handbook dir> engine=<path> roleplay=<path> social=<path>"); process.exit(2); }
const ti = rest.indexOf("--touched");
if (ti >= 0) {
  const want = rest.slice(ti + 1).map((a) => { const i = a.indexOf(":"); return { repo: a.slice(0, i), file: a.slice(i + 1).replace(/\\/g, "/") }; });
  const hits = new Map();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("cross-") && f !== "INDEX.md").sort()) {
    const prefix = file.split("-")[0];
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    for (const w of want) {
      const named = text.includes("`" + w.file + "`");
      const sameRepo = prefix === w.repo || text.includes(w.repo + ":");
      if (named && sameRepo) hits.set(file, [...(hits.get(file) || []), w.file]);
    }
  }
  if (!hits.size) console.log("no page names these files; if this is a new system, write a page (see HOW-TO-UPDATE.md)");
  for (const [f, files] of hits) console.log(`${f}  <- ${[...new Set(files)].join(", ")}`);
  process.exit(0);
}
const roots = Object.fromEntries(rest.map((a) => a.split("=")).filter((p) => p.length === 2));
const isPath = (t) => /[\\/]/.test(t) && /\.[A-Za-z0-9]{1,5}$/.test(t) && !/[<*]/.test(t);
const isName = (t) => /^[A-Za-z_$][\w$]{2,}(\(\))?$/.test(t);
let misses = 0, checked = 0, skipped = 0;

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
  const prefix = file.split("-")[0];
  if (!["engine", "roleplay", "social"].includes(prefix)) continue;
  let inOwners = false;
  const lines = fs.readFileSync(path.join(dir, file), "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.startsWith("## ")) inOwners = /^## Owners/.test(line);
    if (!inOwners || !line.trim().startsWith("-")) return;
    const ticks = [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const repo = (line.match(/^\s*-\s*`?(engine|roleplay|social):/) || [])[1] || prefix;
    const root = roots[repo];
    const paths = ticks.filter(isPath);
    if (!paths.length) return;
    if (!root) { skipped++; return; }
    const texts = [];
    for (const p of paths) {
      const full = path.join(root, p);
      if (!fs.existsSync(full)) { misses++; console.log(`${file}:${i + 1} missing file ${p}`); continue; }
      if (fs.statSync(full).isFile()) texts.push(fs.readFileSync(full, "utf8"));
    }
    if (!texts.length) return;
    for (const t of ticks.filter((x) => !isPath(x) && isName(x))) {
      const name = t.replace(/\(\)$/, "");
      checked++;
      if (!texts.some((s) => s.includes(name))) { misses++; console.log(`${file}:${i + 1} "${name}" not found in ${paths.join(", ")}`); }
    }
  });
}
console.log(`checked ${checked} anchors, ${misses} missing, ${skipped} lines skipped (repo path not given)`);
process.exit(misses ? 1 : 0);
