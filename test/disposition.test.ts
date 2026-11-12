import { describe, expect, it } from "bun:test";
import { contentDisposition } from "../src/server/disposition.js";

describe("contentDisposition", () => {
  it("keeps a plain name readable", () => {
    expect(contentDisposition("inline", "photo.png")).toBe(`inline; filename="photo.png"; filename*=UTF-8''photo.png`);
  });

  it("builds a header a Response accepts for a name with a long dash and Cyrillic", () => {
    for (const name of ["Vaela — Twilight Bloom", "Алиса и Влад.png", 'quote"back\slash\r\n.txt']) {
      const value = contentDisposition("attachment", name);
      expect(/^[\x20-\x7e]*$/.test(value)).toBe(true);
      expect(() => new Response("x", { headers: { "content-disposition": value } })).not.toThrow();
    }
    expect(contentDisposition("inline", "Vaela — Twilight Bloom")).toContain("filename*=UTF-8''Vaela%20%E2%80%94%20Twilight%20Bloom");
  });

  it("falls back to a name when nothing is left", () => {
    expect(contentDisposition("inline", "\r\n")).toContain('filename="file"');
  });
});
