import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setBuiltinSkillsDir } from "../src/agent/memory.js";
import { listGuideBooks, pageHash, readGuidePage } from "../src/guide-pages.js";
import { LOCALES } from "../client/src/i18n/locales.js";

const put = (root: string, rel: string, text: string): void => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};
const SKILL = (name: string): string => `---\nname: ${name}\ndescription: test\n---\nbody\n`;

describe("guide books", () => {
  let tmp: string;
  let builtin: string;
  let root: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "guide-"));
    builtin = path.join(tmp, "builtin");
    root = path.join(tmp, "ws");
    setBuiltinSkillsDir(builtin);
    put(builtin, "vertep-guide/SKILL.md", SKILL("vertep-guide"));
    put(builtin, "vertep-guide/pages/index.md", "# Start here\n\nSee [[apps]].\n");
    put(builtin, "vertep-guide/pages/apps.md", "# Apps\n\nText.\n");
    put(root, "apps/roleplay/manifest.json", JSON.stringify({ name: "Roleplay" }));
    put(root, "apps/roleplay/.skills/guide/SKILL.md", SKILL("guide"));
    put(root, "apps/roleplay/.skills/guide/pages/index.md", "# Roleplay\n");
    put(root, "apps/bare/manifest.json", JSON.stringify({ name: "Bare" }));
  });
  afterEach(() => {
    setBuiltinSkillsDir(null);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("lists the engine book first, then apps that ship a guide, start page first", () => {
    const books = listGuideBooks(root, "en");
    expect(books.map((b) => [b.id, b.title])).toEqual([["vertep", "Molfar Vertep"], ["roleplay", "Roleplay"]]);
    expect(books[0]?.pages).toEqual([{ id: "index", title: "Start here" }, { id: "apps", title: "Apps" }]);
  });

  it("serves a current translation and falls back to English for a stale one", () => {
    const en = fs.readFileSync(path.join(builtin, "vertep-guide/pages/apps.md"), "utf8");
    put(builtin, "vertep-guide/l10n/uk/apps.md", `<!-- source: ${pageHash(en)} -->\n# Застосунки\n\nТекст.\n`);
    put(builtin, "vertep-guide/l10n/de/apps.md", "<!-- source: 000000000000 -->\n# Apps (alt)\n");
    expect(readGuidePage(root, "vertep", "apps", "uk")).toMatchObject({ title: "Застосунки", lang: "uk", stale: false });
    expect(readGuidePage(root, "vertep", "apps", "de")).toMatchObject({ title: "Apps", lang: "en", stale: true });
    expect(readGuidePage(root, "vertep", "apps", "fr")).toMatchObject({ lang: "en", stale: false });
    expect(listGuideBooks(root, "uk")[0]?.pages.find((p) => p.id === "apps")?.title).toBe("Застосунки");
  });

  it("refuses bad ids and missing pages", () => {
    expect(readGuidePage(root, "vertep", "../SKILL", "en")).toBeNull();
    expect(readGuidePage(root, "vertep", "nope", "en")).toBeNull();
    expect(readGuidePage(root, "bare", "index", "en")).toBeNull();
    expect(readGuidePage(root, "..", "index", "en")).toBeNull();
    expect(readGuidePage(root, "vertep", "apps", "../x")).toMatchObject({ lang: "en" });
  });
});

// The shipped engine guide: what the reader and Molfar rely on.
describe("the shipped vertep-guide", () => {
  const dir = path.resolve(import.meta.dir, "../builtin-skills/vertep-guide");
  const pages = fs.existsSync(path.join(dir, "pages")) ? fs.readdirSync(path.join(dir, "pages")).filter((f) => f.endsWith(".md")) : [];
  const ids = new Set(pages.map((f) => f.slice(0, -3)));
  const LINK = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;

  it("has a start page and well-formed pages whose links resolve", () => {
    expect(ids.has("index")).toBe(true);
    for (const f of pages) {
      const id = f.slice(0, -3);
      expect(id).toMatch(/^[a-z0-9][a-z0-9-]{0,39}$/);
      const text = fs.readFileSync(path.join(dir, "pages", f), "utf8");
      expect(text.split("\n")[0]).toMatch(/^# .{1,60}$/);
      expect(text).not.toMatch(/chrysalis/i);
      for (const m of text.matchAll(LINK)) {
        const target = (m[1] ?? "").trim();
        if (target.includes(":") && !target.startsWith("vertep:")) continue; // another book
        expect(ids.has(target.replace(/^vertep:/, "")), `${f} links to ${target}`).toBe(true);
      }
    }
  });

  it("translations name a page that exists, in a shell locale, with a source line", () => {
    const l10n = path.join(dir, "l10n");
    if (!fs.existsSync(l10n)) return;
    for (const lang of fs.readdirSync(l10n)) {
      expect(Object.keys(LOCALES)).toContain(lang);
      for (const f of fs.readdirSync(path.join(l10n, lang))) {
        expect(ids.has(f.slice(0, -3)), `${lang}/${f}`).toBe(true);
        const text = fs.readFileSync(path.join(l10n, lang, f), "utf8");
        expect(text).toMatch(/^<!-- source: [0-9a-f]{12} -->\n# /);
        // a translation keeps the English page's link targets, so no link leads nowhere
        const targets = (t: string): string[] => [...t.matchAll(LINK)].map((m) => (m[1] ?? "").trim()).sort();
        expect(targets(text), `${lang}/${f}`).toEqual(targets(fs.readFileSync(path.join(dir, "pages", f), "utf8")));
      }
    }
  });
});
