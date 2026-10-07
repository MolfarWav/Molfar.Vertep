// usage: bun apply-multi.mjs <output.txt> [--dry]  — FILE and PATCH blocks, run from the repo root
import fs from "fs";
import path from "path";
const [outFile, flag] = process.argv.slice(2);
const dry = flag === "--dry";
const raw = fs.readFileSync(outFile, "utf8").replace(/\r\n/g, "\n");
const parts = raw.split(/^=====(FILE|PATCH) (\S+)=====[ \t]*$/m);
let bad = 0;
for (let k = 1; k < parts.length; k += 3) {
  const kind = parts[k], file = parts[k + 1], body = parts[k + 2];
  if (file.includes("..") || path.isAbsolute(file)) { console.log("REFUSED path", file); bad++; continue; }
  if (kind === "FILE") {
    const text = body.replace(/^\n/, "").replace(/\n*$/, "\n");
    if (!dry) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
    console.log("file", file, text.split("\n").length, "lines");
    continue;
  }
  if (!fs.existsSync(file)) { console.log("NO FILE", file); bad++; continue; }
  let src = fs.readFileSync(file, "utf8");
  const re = /=====FIND=====\n([\s\S]*?)\n=====REPLACE=====\n([\s\S]*?)=====END=====/g;
  let m, n = 0;
  while ((m = re.exec(body))) {
    n++;
    const find = m[1];
    let rep = m[2];
    if (rep.endsWith("\n")) rep = rep.slice(0, -1);
    const i = src.indexOf(find);
    if (i < 0) { console.log(file, "#" + n, "NOT FOUND:", JSON.stringify(find.slice(0, 100))); bad++; continue; }
    if (src.indexOf(find, i + 1) >= 0) { console.log(file, "#" + n, "NOT UNIQUE:", JSON.stringify(find.slice(0, 100))); bad++; continue; }
    src = src.slice(0, i) + rep + src.slice(i + find.length);
  }
  if (!dry) fs.writeFileSync(file, src);
  console.log("patch", file, n, "edits");
}
console.log(bad ? bad + " FAILED" : "all applied");
