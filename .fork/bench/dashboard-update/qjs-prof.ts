// usage: NAMES=fn1,fn2 bun qjs-prof.ts <plugin.js> <out.js>; run time-update.ts on <out.js>
// per-function wall time inside the REAL QuickJS sandbox: wraps functions of the plugin with Date.now() timers, logs at the end of each pass
import fs from "node:fs";
const names = (process.env.NAMES || "").split(",").filter(Boolean);
let s = fs.readFileSync(process.argv[2]!, "utf8");
for (const n of names) {
  const re = new RegExp("^(export )?function " + n + "[(]", "m");
  if (!re.test(s)) { console.error("no", n); continue; }
  s = s.replace(re, (m, ex) => `${ex ?? ""}function ${n}(...__a) { const __t = Date.now(); try { return __${n}_impl(...__a); } finally { const o = (globalThis.__T ??= {}); const c = o["${n}"] ??= [0, 0]; c[0] += Date.now() - __t; c[1]++; } }\nfunction __${n}_impl(`);
}
s = s.replace(/^export function handleRoute\(/m, "export function handleRoute(...__a) { globalThis.__T = {}; const __t = Date.now(); try { return __hr(...__a); } finally { console.log('PASS ' + (Date.now() - __t) + 'ms ' + Object.entries(globalThis.__T).sort((a, b) => b[1][0] - a[1][0]).map(([k, v]) => k + '=' + v[0] + '/' + v[1]).join(' ')); } }\nfunction __hr(");
fs.writeFileSync(process.argv[3]!, s);
