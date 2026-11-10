/**
 * #243: a plugin's file write is atomic, so a reader that lands while a chat is being rewritten sees the old
 * transcript or the new one, never an empty or partial file.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { writeFileAtomic } from "../src/plugins/atomic-write.mjs";

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atomic-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

/** A chat of n messages, one JSON line each. */
const chat = (n: number): string => Array.from({ length: n }, (_, i) => JSON.stringify({ i, text: "x".repeat(200) })).join("\n") + "\n";

describe("writeFileAtomic", () => {
  it("creates a file, replaces one, and leaves no temp file behind", () => {
    const file = path.join(tmp, "chats", "a.jsonl");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    writeFileAtomic(file, "one\n");
    expect(fs.readFileSync(file, "utf8")).toBe("one\n");
    writeFileAtomic(file, "two\n");
    expect(fs.readFileSync(file, "utf8")).toBe("two\n");
    expect(fs.readdirSync(path.dirname(file))).toEqual(["a.jsonl"]);
  });

  it("keeps the mode of the file it replaces", () => {
    if (process.platform === "win32") return; // no POSIX modes
    const file = path.join(tmp, "secret.json");
    fs.writeFileSync(file, "{}", { mode: 0o600 });
    writeFileAtomic(file, '{"a":1}');
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  it("removes its temp file and throws when the target cannot be written", () => {
    const dir = path.join(tmp, "taken");
    fs.mkdirSync(dir);
    expect(() => writeFileAtomic(dir, "x")).toThrow();
    expect(fs.readdirSync(tmp)).toEqual(["taken"]);
  });

  it("a reader in another process never sees fewer messages while the file is rewritten in a loop", async () => {
    const file = path.join(tmp, "big.jsonl");
    const small = chat(50);
    const large = chat(4000);
    writeFileAtomic(file, small);
    // the reader: counts lines in a tight loop until told to stop; reports the fewest it ever saw
    const readerSrc = `
      const fs = require("node:fs");
      const file = process.argv[1];
      let min = Infinity, reads = 0, errors = 0;
      const end = Date.now() + Number(process.argv[2]);
      while (Date.now() < end) {
        try {
          const text = fs.readFileSync(file, "utf8");
          const lines = text === "" ? 0 : text.split("\\n").length - 1;
          if (lines < min) min = lines;
          if (text !== "" && !text.endsWith("\\n")) min = -1;
          reads++;
        } catch { errors++; }
      }
      console.log(JSON.stringify({ min, reads, errors }));
    `;
    const reader = Bun.spawn([process.execPath, "-e", readerSrc, file, "1500"], { stdout: "pipe", stderr: "pipe" });
    const until = Date.now() + 1500;
    let i = 0;
    while (Date.now() < until) {
      writeFileAtomic(file, i++ % 2 ? small : large);
      await new Promise((r) => setTimeout(r, 1));
    }
    const out = JSON.parse(await new Response(reader.stdout).text());
    expect(i).toBeGreaterThan(20);
    expect(out.reads).toBeGreaterThan(50);
    // never an empty file, never a cut-off one: always 50 or 4000 whole lines
    expect(out.min).toBe(50);
  }, { timeout: 20_000 });
});
