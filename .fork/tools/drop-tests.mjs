// usage: bun drop-tests.mjs <file> <title>...  — removes it("title"...) / describe("title"...) blocks
import fs from "fs";
const [file, ...titles] = process.argv.slice(2);
let s = fs.readFileSync(file, "utf8");
for (const title of titles) {
  let start = -1;
  for (const kw of ["it(", "describe(", "test("]) {
    for (const q of ['"', "'", "`"]) {
      const i = s.indexOf(kw + q + title + q);
      if (i >= 0) start = i;
    }
  }
  if (start < 0) { console.log("NOT FOUND", title); continue; }
  // from the opening paren of it(, match to its closing paren, then the ";" and newline
  let j = s.indexOf("(", start);
  let depth = 0, inStr = null, esc = false, end = -1;
  for (; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "/" && s[j + 1] === "/") { j = s.indexOf("\n", j); continue; }
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  if (end < 0) { console.log("NO END", title); continue; }
  if (s[end] === ";") end++;
  if (s[end] === "\n") end++;
  // take the indentation and a blank line before it too
  let ls = s.lastIndexOf("\n", start - 1) + 1;
  s = s.slice(0, ls) + s.slice(end);
  console.log("dropped", title);
}
fs.writeFileSync(file, s);
