import { describe, expect, it } from "bun:test";
import { parseGuideMarkdown, parseInline } from "../client/src/guide/markdown-parse.js";

describe("guide markdown", () => {
  it("headings, paragraphs, and wrapped lines", () => {
    const b = parseGuideMarkdown("# Title\n\nOne line\nsecond line.\n\n## Part\n\n### Sub\n");
    expect(b.map((x) => x.t)).toEqual(["h", "p", "h", "h"]);
    expect(b.map((x) => (x.t === "h" ? x.level : 0))).toEqual([1, 0, 2, 3]);
    expect(b[1]).toEqual({ t: "p", children: [{ t: "text", text: "One line second line." }] });
  });

  it("bullet and numbered lists", () => {
    const b = parseGuideMarkdown("- a\n- b\n\n1. one\n2. two\n3. three");
    expect(b[0]).toMatchObject({ t: "ul" });
    expect(b[1]).toMatchObject({ t: "ol" });
    expect(b[0]?.t === "ul" && b[0].items.length).toBe(2);
    expect(b[1]?.t === "ol" && b[1].items.length).toBe(3);
  });

  it("a note joins its lines", () => {
    const b = parseGuideMarkdown("> first\n> second");
    expect(b).toEqual([{ t: "note", children: [{ t: "text", text: "first second" }] }]);
  });

  it("bold, italic, code, nested", () => {
    expect(parseInline("a **b *c*** `d` *e*")).toEqual([
      { t: "text", text: "a " },
      { t: "bold", children: [{ t: "text", text: "b " }, { t: "italic", children: [{ t: "text", text: "c" }] }] },
      { t: "text", text: " " },
      { t: "code", text: "d" },
      { t: "text", text: " " },
      { t: "italic", children: [{ t: "text", text: "e" }] },
    ]);
  });

  it("external links: only http and https", () => {
    expect(parseInline("[x](https://example.com/a?b=1)")).toEqual([{ t: "link", href: "https://example.com/a?b=1", text: "x" }]);
    expect(parseInline("[x](http://example.com)")[0]).toMatchObject({ t: "link" });
  });

  it("unsafe links are plain text", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,<b>x</b>", "JaVaScRiPt:alert(1)", "ftp://x.y", "/relative"]) {
      expect(parseInline(`[click](${url})`)).toEqual([{ t: "text", text: "click" }]);
    }
  });

  it("wiki links: page, label, book, book and label", () => {
    expect(parseInline("[[models]]")).toEqual([{ t: "wiki", book: null, page: "models", label: null }]);
    expect(parseInline("[[models|the models page]]")).toEqual([{ t: "wiki", book: null, page: "models", label: "the models page" }]);
    expect(parseInline("[[roleplay:cards]]")).toEqual([{ t: "wiki", book: "roleplay", page: "cards", label: null }]);
    expect(parseInline("[[vertep:index|Start]]")).toEqual([{ t: "wiki", book: "vertep", page: "index", label: "Start" }]);
    expect(parseInline("see [[a]] and [[b]].").length).toBe(5);
  });

  it("HTML stays text", () => {
    const b = parseGuideMarkdown("<script>alert(1)</script> and <b>x</b>\n\n- <img src=x onerror=1>");
    expect(b[0]).toEqual({ t: "p", children: [{ t: "text", text: "<script>alert(1)</script> and <b>x</b>" }] });
    expect(b[1]).toMatchObject({ t: "ul", items: [[{ t: "text", text: "<img src=x onerror=1>" }]] });
  });

  it("a translation's source comment is dropped; unclosed marks stay text", () => {
    const b = parseGuideMarkdown("<!-- source: 0123456789ab -->\n# T\n\n2 * 3 and `open");
    expect(b.length).toBe(2);
    expect(b[1]).toEqual({ t: "p", children: [{ t: "text", text: "2 * 3 and `open" }] });
  });
});
