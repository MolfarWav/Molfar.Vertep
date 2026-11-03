// The guide (Help > Guide in the shell, issue #225/#230): Markdown pages kept in a
// skill folder, so Molfar reads the same pages with skill_load. The engine's book is
// the built-in skill `vertep-guide`; an app's book is its skill `guide`
// (apps/<id>/.skills/guide). English pages are in pages/, translations in
// l10n/<locale>/ with a `<!-- source: <hash> -->` first line: a translation whose hash
// no longer matches the English page is stale and the English page is served instead.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { findSkill, skillDirAbs } from "./agent/memory.js";

export const ENGINE_BOOK = "vertep";
const ENGINE_SKILL = "vertep-guide";
const APP_SKILL = "guide";
const PAGE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const BOOK_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const LOCALE = /^[a-z]{2}$/;
const MAX_PAGE_BYTES = 64_000;
const SOURCE_LINE = /^<!--\s*source:\s*([0-9a-f]{12})\s*-->\r?\n/;

export interface GuidePageInfo {
  id: string;
  title: string;
}
export interface GuideBook {
  id: string;
  title: string;
  pages: GuidePageInfo[];
}
export interface GuidePage {
  book: string;
  id: string;
  title: string;
  markdown: string;
  /** The language actually served: the asked one, or "en" when it has no up-to-date translation. */
  lang: string;
  /** A translation exists but is older than the English page. */
  stale: boolean;
}

/** The first 12 hex digits of the sha256 of the English page (LF line endings). */
export function pageHash(text: string): string {
  return crypto.createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex").slice(0, 12);
}

/** The folder holding a book's skill, or null when the book does not exist. */
function bookDir(root: string, book: string): string | null {
  if (!BOOK_ID.test(book)) return null;
  const s = book === ENGINE_BOOK ? findSkill(root, ENGINE_SKILL, "global") : findSkill(root, APP_SKILL, `app:${book}`);
  if (!s) return null;
  const dir = skillDirAbs(root, s);
  return fs.existsSync(path.join(dir, "pages", "index.md")) ? dir : null;
}

function readCapped(file: string): string | null {
  try {
    const st = fs.lstatSync(file);
    if (!st.isFile() || st.size > MAX_PAGE_BYTES) return null;
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/** `# Title` on the first line; the page id when there is none. */
function titleOf(markdown: string, id: string): string {
  const m = /^﻿?#\s+(.+?)\s*$/m.exec(markdown.split("\n", 3).join("\n"));
  return m?.[1] ? m[1].slice(0, 80) : id;
}

/** The translation when it is current, else null; `stale` when one exists but is out of date. */
function translation(dir: string, id: string, english: string, lang: string): { text: string | null; stale: boolean } {
  if (lang === "en" || !LOCALE.test(lang)) return { text: null, stale: false };
  const raw = readCapped(path.join(dir, "l10n", lang, `${id}.md`));
  if (raw === null) return { text: null, stale: false };
  const m = SOURCE_LINE.exec(raw);
  if (!m || m[1] !== pageHash(english)) return { text: null, stale: true };
  return { text: raw.slice(m[0].length), stale: false };
}

function bookTitle(root: string, book: string): string {
  if (book === ENGINE_BOOK) return "Molfar Vertep";
  try {
    const m = JSON.parse(fs.readFileSync(path.join(root, "apps", book, "manifest.json"), "utf8")) as { name?: unknown };
    if (typeof m.name === "string" && m.name.trim()) return m.name.trim().slice(0, 60);
  } catch {
    // no manifest: the id is the title
  }
  return book;
}

function bookPages(dir: string, lang: string): GuidePageInfo[] {
  let names: string[];
  try {
    names = fs.readdirSync(path.join(dir, "pages"));
  } catch {
    return [];
  }
  const out: GuidePageInfo[] = [];
  for (const name of names) {
    const id = name.endsWith(".md") ? name.slice(0, -3) : "";
    if (!PAGE_ID.test(id)) continue;
    const english = readCapped(path.join(dir, "pages", name));
    if (english === null) continue;
    const local = translation(dir, id, english, lang).text;
    out.push({ id, title: titleOf(local ?? english, id) });
  }
  // the start page first, the rest by title
  return out.sort((a, b) => (a.id === "index" ? -1 : b.id === "index" ? 1 : a.title.localeCompare(b.title)));
}

/** Every book: the engine's first, then the installed apps that ship a guide. */
export function listGuideBooks(root: string, lang: string): GuideBook[] {
  const ids = [ENGINE_BOOK];
  try {
    for (const e of fs.readdirSync(path.join(root, "apps"), { withFileTypes: true })) if (e.isDirectory() && BOOK_ID.test(e.name) && e.name !== ENGINE_BOOK) ids.push(e.name);
  } catch {
    // no apps folder yet
  }
  const out: GuideBook[] = [];
  for (const id of ids) {
    const dir = bookDir(root, id);
    if (dir) out.push({ id, title: bookTitle(root, id), pages: bookPages(dir, lang) });
  }
  return out;
}

/** One page in `lang`, falling back to English; null when the book or page does not exist. */
export function readGuidePage(root: string, book: string, id: string, lang: string): GuidePage | null {
  if (!PAGE_ID.test(id)) return null;
  const dir = bookDir(root, book);
  if (!dir) return null;
  const english = readCapped(path.join(dir, "pages", `${id}.md`));
  if (english === null) return null;
  const t = translation(dir, id, english, lang);
  const markdown = (t.text ?? english).replace(/^﻿/, "");
  return { book, id, title: titleOf(markdown, id), markdown, lang: t.text === null ? "en" : lang, stale: t.stale };
}
