// Check that an engine serves every picture of a packs.json byte for byte as image/webp.
// Usage: node verify-pack.mjs <dir with the webp files> <engine url> <cookie jar> <packs.json>
import { readFileSync } from "node:fs";
const [dir, engine, jarPath, packsPath] = process.argv.slice(2);
const cookie = readFileSync(jarPath, "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("# ")).map((l) => l.replace(/^#HttpOnly_/, "").split("\t")).filter((c) => c.length >= 7).map((c) => `${c[5]}=${c[6]}`).join("; ");
let n = 0, bad = 0;
for (const pk of JSON.parse(readFileSync(packsPath, "utf8")).packs)
  for (const it of pk.items) {
    const r = await fetch(engine + it.url, { headers: { cookie } });
    const got = Buffer.from(await r.arrayBuffer());
    const want = readFileSync(`${dir}/${it.id}-${pk.kind === "sticker" ? "sticker" : "emoji"}.webp`);
    n++;
    if (!got.equals(want) || !(r.headers.get("content-type") || "").startsWith("image/webp")) { bad++; console.log("DIFF", pk.id, it.id, r.headers.get("content-type")); }
  }
console.log(n, "checked,", bad, "different");
