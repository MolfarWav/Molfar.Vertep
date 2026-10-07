// usage: bun apply-blocks.mjs <target.js> <blocks.txt> [skip names...]
import fs from "fs";
const [target, blocksFile, ...skip] = process.argv.slice(2);
let src = fs.readFileSync(target, "utf8");
const raw = fs.readFileSync(blocksFile, "utf8");
const parts = raw.split(/^=====(ADD AFTER|ADD BEFORE|REPLACE) (\S+)=====[ \t]*$/m);
function declAt(name) {
  for (const kw of ["export async function ", "export function ", "async function ", "function ", "export const ", "const ", "let "]) {
    const needle = kw + name;
    let from = 0;
    for (;;) {
      const i = src.indexOf(needle, from);
      if (i < 0) break;
      const after = src[i + needle.length];
      const lineStart = i === 0 || src[i - 1] === "\n";
      if (lineStart && !/[\w$]/.test(after)) return { index: i, isFn: kw.includes("function") };
      from = i + 1;
    }
  }
  return null;
}
function span(name) {
  const d = declAt(name);
  if (!d) return null;
  let i;
  if (d.isFn) {
    // skip the parameter list, then the body brace
    const paren = src.indexOf("(", d.index);
    let depth = 0, j = paren;
    for (; j < src.length; j++) {
      if (src[j] === "(") depth++;
      else if (src[j] === ")" && --depth === 0) break;
    }
    i = src.indexOf("{", j);
  } else {
    const eq = src.indexOf("=", d.index);
    const rest = src.slice(eq + 1);
    i = eq + 1 + rest.search(/[{\[(]/);
  }
  let depth = 0, inStr = null, esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "/" && src[j + 1] === "/") { j = src.indexOf("\n", j); continue; }
    if (c === "/" && src[j + 1] === "*") { j = src.indexOf("*/", j) + 1; continue; }
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") {
      depth--;
      if (depth === 0) {
        let end = j + 1;
        while (src[end] === ")" || src[end] === ";") end++;
        return [d.index, end];
      }
    }
  }
  return null;
}
for (let k = 1; k < parts.length; k += 3) {
  const op = parts[k], name = parts[k + 1], body = parts[k + 2].trim();
  if (skip.includes(name)) { console.log("skip", op, name); continue; }
  const s = span(name);
  if (!s) { console.log("NOT FOUND", op, name); continue; }
  if (op === "REPLACE") src = src.slice(0, s[0]) + body + src.slice(s[1]);
  else if (op === "ADD AFTER") src = src.slice(0, s[1]) + "\n\n" + body + "\n" + src.slice(s[1]);
  else src = src.slice(0, s[0]) + body + "\n\n" + src.slice(s[0]);
  console.log("ok", op, name);
}
fs.writeFileSync(target, src);
