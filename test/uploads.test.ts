import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { zipSync } from "fflate";
import { mentionedFiles } from "../src/agent/mentions.js";
import { documentText, saveUpload, uploadName } from "../src/agent/uploads.js";
import { agentWriteDenied, gitBoundaryIgnored } from "../src/paths.js";

const root = () => fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
const bytes = (s: string) => new TextEncoder().encode(s);

describe("chat uploads", () => {
  it("saves a text file under uploads/<day>/ and a message naming it gets its text", () => {
    const r = root();
    const saved = saveUpload(r, "My Card.json", bytes('{"name":"Ember"}'));
    expect(saved.path).toMatch(/^uploads\/\d{4}-\d{2}-\d{2}\/My-Card\.json$/);
    expect(fs.readFileSync(path.join(r, saved.path), "utf8")).toBe('{"name":"Ember"}');
    const [file] = mentionedFiles(r, `fix this @${saved.path}`);
    expect(file?.text).toBe('{"name":"Ember"}');
  });

  it("keeps a name in any script, and a mention still finds it", () => {
    const r = root();
    const saved = saveUpload(r, "картка героя.txt", bytes("Вартова"));
    expect(saved.path.endsWith("/картка-героя.txt")).toBe(true);
    expect(mentionedFiles(r, `@${saved.path}`)[0]?.text).toBe("Вартова");
  });

  it("stores the same file once and a different one beside it", () => {
    const r = root();
    const a = saveUpload(r, "a.md", bytes("one"));
    expect(saveUpload(r, "a.md", bytes("one")).path).toBe(a.path);
    expect(saveUpload(r, "a.md", bytes("two")).path).toBe(a.path.replace(/a\.md$/, "a-2.md"));
  });

  it("refuses binaries, unknown types and names that are only punctuation", () => {
    const r = root();
    expect(() => saveUpload(r, "x.json", new Uint8Array([123, 0, 1, 2]))).toThrow(/not a text file/);
    expect(() => saveUpload(r, "x.txt", new Uint8Array([0x41, 0xc3, 0x28]))).toThrow(/not in UTF-8/);
    // Notepad's "Unicode": UTF-16 with a byte order mark
    const notepad = saveUpload(r, "n.txt", new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0x16, 0x04]));
    expect(fs.readFileSync(path.join(r, notepad.path), "utf8")).toBe("AЖ");
    expect(() => uploadName("movie.mp4")).toThrow(/cannot be attached/);
    expect(() => uploadName(" ... ")).toThrow(/not allowed/);
    expect(() => saveUpload(r, "../../escape.txt", bytes("x"))).not.toThrow();
    expect(fs.existsSync(path.join(r, "..", "escape.txt"))).toBe(false);
  });

  it("turns a Word document into its text", () => {
    const xml = '<w:document><w:body><w:p><w:r><w:t>Hello &amp; welcome</w:t></w:r></w:p><w:p><w:r><w:t>Line</w:t><w:tab/><w:t>two</w:t></w:r></w:p></w:body></w:document>';
    const docx = zipSync({ "word/document.xml": bytes(xml), "[Content_Types].xml": bytes("<x/>") });
    expect(documentText(docx, "docx")).toBe("Hello & welcome\nLine\ttwo");
    const r = root();
    const saved = saveUpload(r, "notes.docx", docx);
    expect(saved.path.endsWith("/notes.docx.txt")).toBe(true);
    expect(() => saveUpload(r, "bad.docx", bytes("not a zip"))).toThrow(/could not be opened/);
  });

  it("stays out of git and out of the agent's writes", () => {
    expect(gitBoundaryIgnored("uploads/2026-10-18/a.json")).toBe(true);
    expect(agentWriteDenied("uploads/2026-10-18/a.json")).toMatch(/attached in chat/);
    expect(agentWriteDenied("apps/roleplay/uploads/a.json")).toBeNull();
  });
});
