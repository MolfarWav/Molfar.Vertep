// Upload the animated Molfar pack to an engine and write the pack list Social keeps (stickers/packs.json).
// Usage: node build-pack.mjs <dir with <id>-sticker.webp and <id>-emoji.webp> <engine url> <cookie jar (curl format)> <out packs.json>
// The files are uploaded untouched (PUT /v1/assets); the reply's size is compared with the file's.
import { readFileSync, writeFileSync } from "node:fs";
const [dir, engine, jarPath, out] = process.argv.slice(2);
const jar = readFileSync(jarPath, "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("# ")).map((l) => l.replace(/^#HttpOnly_/, "").split("\t")).filter((c) => c.length >= 7);
const cookie = jar.map((c) => `${c[5]}=${c[6]}`).join("; ");
const ITEMS = [
  ["happy", "Happy", ["smile", "joy", "радість"]],
  ["laugh", "Laughing", ["lol", "wink", "сміх"]],
  ["sad", "Sad", ["tear", "cry", "сум"]],
  ["love", "Love", ["blush", "heart", "любов"]],
  ["smug", "Smug", ["wink", "cheeky", "хитрий"]],
  ["sleepy", "Sleepy", ["tired", "yawn", "сон"]],
  ["suspicious", "Suspicious", ["side eye", "doubt", "підозра"]],
  ["deadpan", "Deadpan", ["flat", "neutral", "байдуже"]],
];
async function up(file) {
  const buf = readFileSync(`${dir}/${file}`);
  const r = await fetch(`${engine}/v1/assets`, { method: "PUT", headers: { cookie, origin: engine, "content-type": "image/webp" }, body: buf });
  const j = await r.json();
  if (!r.ok || j.size !== buf.length) throw new Error(`${file}: ${r.status} ${JSON.stringify(j)} (file ${buf.length})`);
  return `/v1/assets/${j.id}`;
}
const packs = [];
for (const [pid, name, kind, suffix] of [["molfar", "Molfar", "sticker", "sticker"], ["molfar-emoji", "Molfar emoji", "emoji", "emoji"]]) {
  const items = [];
  for (const [id, label, tags] of ITEMS) items.push({ id, name: label, url: await up(`${id}-${suffix}.webp`), tags });
  packs.push({ id: pid, name, kind, items });
}
writeFileSync(out, JSON.stringify({ packs }, null, 2));
console.log("uploaded", packs.reduce((n, p) => n + p.items.length, 0), "files ->", out);
