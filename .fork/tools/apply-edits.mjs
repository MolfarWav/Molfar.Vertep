// usage: bun apply-edits.mjs <target> <edits.txt>  — FIND/REPLACE/END blocks, applied in order
import fs from "fs";
const [target, editsFile] = process.argv.slice(2);
let src = fs.readFileSync(target, "utf8");
const raw = fs.readFileSync(editsFile, "utf8").replace(/\r\n/g, "\n");
const re = /=====FIND=====\n([\s\S]*?)\n=====REPLACE=====\n([\s\S]*?)=====END=====/g;
let m;
let n = 0;
let bad = 0;
while ((m = re.exec(raw))) {
  n++;
  const find = m[1];
  let rep = m[2];
  if (rep.endsWith("\n")) rep = rep.slice(0, -1);
  const first = src.indexOf(find);
  if (first < 0) {
    bad++;
    console.log("#" + n + " NOT FOUND: " + JSON.stringify(find.slice(0, 90)));
    continue;
  }
  if (src.indexOf(find, first + 1) >= 0) {
    bad++;
    console.log("#" + n + " NOT UNIQUE: " + JSON.stringify(find.slice(0, 90)));
    continue;
  }
  src = src.slice(0, first) + rep + src.slice(first + find.length);
}
fs.writeFileSync(target, src);
console.log(n + " edits, " + bad + " failed");
