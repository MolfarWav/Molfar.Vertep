/**
 * The agent's grep tool (issue #482): a path that is one file searches that file, a path that does
 * not exist is an error, a leading (?i) and \p{L} work, and an empty result says what was searched.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildUserTools, grepRegex } from "../src/agent/tools.js";
import { bootstrapUserDir } from "../src/paths.js";

describe("grepRegex", () => {
  it("turns a leading inline flag group into flags", () => {
    expect(grepRegex("(?i)self").test("a SELF b")).toBe(true);
    expect(grepRegex("(?is)self").flags).toContain("s");
    expect(grepRegex("self", true).flags).toContain("i");
  });
  it("reads \p{...} as a Unicode class, not the literal text", () => {
    expect("щось".match(grepRegex(String.raw`\p{L}+`))?.[0]).toBe("щось");
  });
  it("retries without the u flag for a pattern only the plain mode accepts", () => {
    expect(grepRegex(String.raw`a\-b`).test("a-b")).toBe(true);
  });
  it("still rejects a broken pattern", () => {
    expect(() => grepRegex("(")).toThrow("Invalid regex");
  });
});

describe("grep tool", () => {
  let dataDir: string;
  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "grep-"));
  });
  afterEach(() => {
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch {
      /* watcher races */
    }
  });
  const setup = () => {
    const p = bootstrapUserDir(dataDir, "alice");
    fs.mkdirSync(path.join(p.root, "notes", "sub"), { recursive: true });
    fs.writeFileSync(path.join(p.root, "notes", "a.md"), "# Title\nMolfar Vertep is here\n");
    fs.writeFileSync(path.join(p.root, "notes", "sub", "b.md"), "nothing\nvertep again\n");
    const grep = buildUserTools("alice", p, { dataDir: p.root }).find((t) => t.name === "grep")!;
    const run = async (args: Record<string, unknown>) => ((await grep.execute("t", args)) as { content: { text: string }[] }).content[0]!.text;
    return { p, run };
  };

  it("searches one file when the path names a file", async () => {
    const { run } = setup();
    expect(await run({ pattern: "Vertep", path: "notes/a.md" })).toBe("notes/a.md:2: Molfar Vertep is here");
  });

  it("gives the same lines for the file and for its folder", async () => {
    const { run } = setup();
    expect(await run({ pattern: "Vertep", path: "notes" })).toContain("notes/a.md:2: Molfar Vertep is here");
  });

  it("errors on a path that does not exist", async () => {
    const { run } = setup();
    await expect(run({ pattern: "x", path: "notes/nope.md" })).rejects.toThrow("Path not found");
  });

  it("honours (?i) and says how many files an empty search covered", async () => {
    const { run } = setup();
    expect(await run({ pattern: "(?i)MOLFAR", path: "notes/a.md" })).toContain("notes/a.md:2");
    expect(await run({ pattern: "zzz", path: "notes" })).toMatch(/^\(no matches in \d+ files searched\)$/);
  });

  it("still refuses a credentials file named directly", async () => {
    const { p, run } = setup();
    fs.writeFileSync(path.join(p.root, "notes", "auth.json"), '{"k":"secret"}');
    await expect(run({ pattern: "secret", path: "notes/auth.json" })).rejects.toThrow("File not found");
  });
});
