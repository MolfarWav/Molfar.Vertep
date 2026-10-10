// Copies the Roleplay plugins and wraps chosen functions with timers (console.log totals per pass).
import fs from "node:fs";
import path from "node:path";
const [src, dst] = process.argv.slice(2);
fs.cpSync(src, dst, { recursive: true });
const f = path.join(dst, "engine", "plugin.js");
let s = fs.readFileSync(f, "utf8");
const names = ["loadChat", "loadRegexScripts", "runRegexScripts", "activateWorldInfo", "transcriptMacros", "expandMacros", "assemble", "searchDatabank", "chatMembers", "chatPersona", "litopysCut", "litopysLine", "hookInsertReserve", "estimateTokens", "applyRegexScript", "semanticPrep", "locateSources", "orderedPrompts", "resolvePresetVars"];
let wrapped = [];
for (const n of names) {
  const re = new RegExp(`^(export )?function ${n}\\(`, "m");
  if (!re.test(s)) continue;
  s = s.replace(re, (m, ex) => `${ex ?? ""}function ${n}(...__a) { const __t = Date.now(); try { return __${n}_impl(...__a); } finally { (globalThis.__T ??= {})["${n}"] = ((globalThis.__T["${n}"]) ?? 0) + Date.now() - __t; (globalThis.__C ??= {})["${n}"] = ((globalThis.__C["${n}"]) ?? 0) + 1; } }\nfunction __${n}_impl(`);
  wrapped.push(n);
}
// report at the end of every route pass
s = s.replace(/^export function handleRoute\(/m, "export function handleRoute(...__a) { const __t = Date.now(); globalThis.__T = {}; globalThis.__C = {}; try { return __handleRoute_impl(...__a); } finally { console.log('PASS ' + (Date.now() - __t) + 'ms ' + JSON.stringify(Object.entries(globalThis.__T).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + v + 'ms/' + globalThis.__C[k]))); } }\nfunction __handleRoute_impl(");
fs.writeFileSync(f, s);
console.log("wrapped", wrapped.join(","));
