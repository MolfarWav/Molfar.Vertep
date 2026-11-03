// The guide's translations (issue #230): which pages are missing or stale per locale,
// and stamping a fresh translation with the hash of the English page it was made from.
//   bun scripts/guide-l10n.ts [--dir <skill folder>]                 every locale's state
//   bun scripts/guide-l10n.ts [--dir <skill folder>] --stale         "<locale>/<page>" to (re)translate
//   bun scripts/guide-l10n.ts [--dir <skill folder>] --stamp <locale> <page>...
// --dir defaults to builtin-skills/vertep-guide; Roleplay's book is <its repo>/.skills/guide.
// A stamped file is l10n/<locale>/<page>.md with its first line `<!-- source: <hash> -->`.
import fs from "node:fs";
import path from "node:path";
import { LOCALES } from "../client/src/i18n/locales.ts";
import { pageHash } from "../src/guide-pages.ts";

const args = process.argv.slice(2);
const at = args.indexOf("--dir");
const dir = path.resolve(at >= 0 ? args[at + 1] : path.join(import.meta.dir, "..", "builtin-skills", "vertep-guide"));
const locales = Object.keys(LOCALES).filter((l) => l !== "en");
const SOURCE = /^<!--\s*source:\s*([0-9a-f]{12})\s*-->\r?\n/;
const pages = fs
  .readdirSync(path.join(dir, "pages"))
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.slice(0, -3))
  .sort();
const english = (id: string): string => fs.readFileSync(path.join(dir, "pages", `${id}.md`), "utf8");
const l10nFile = (lang: string, id: string): string => path.join(dir, "l10n", lang, `${id}.md`);

function state(lang: string, id: string): "ok" | "stale" | "missing" {
  const f = l10nFile(lang, id);
  if (!fs.existsSync(f)) return "missing";
  const m = SOURCE.exec(fs.readFileSync(f, "utf8"));
  return m && m[1] === pageHash(english(id)) ? "ok" : "stale";
}

const stamp = args.indexOf("--stamp");
if (stamp >= 0) {
  const [lang, ...ids] = args.slice(stamp + 1);
  if (!locales.includes(lang) || ids.length === 0) throw new Error(`usage: --stamp <${locales.join("|")}> <page>...`);
  for (const id of ids) {
    if (!pages.includes(id)) throw new Error(`no English page "${id}"`);
    const f = l10nFile(lang, id);
    const body = fs.readFileSync(f, "utf8").replace(SOURCE, "").replace(/^﻿/, "");
    fs.writeFileSync(f, `<!-- source: ${pageHash(english(id))} -->\n${body.replace(/\r\n/g, "\n")}`);
    console.log(`stamped ${lang}/${id}`);
  }
} else if (args.includes("--stale")) {
  for (const lang of locales) for (const id of pages) if (state(lang, id) !== "ok") console.log(`${lang}/${id}`);
} else {
  for (const lang of locales) {
    const s = pages.map((id) => state(lang, id));
    console.log(`${lang}: ${s.filter((x) => x === "ok").length} ok, ${s.filter((x) => x === "stale").length} stale, ${s.filter((x) => x === "missing").length} missing`);
  }
}
