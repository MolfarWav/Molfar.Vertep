/**
 * Token use: earlier tasks' tool results and stale ones in a run are cut
 * before each model call (on a copy), and read_file keeps big reads small
 * and takes several files at once.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { PAST_RESULT_CHARS, foldToolResults } from "../src/agent/context-fold.js";
import { appTouched } from "../src/agent/memory.js";
import { buildUserTools } from "../src/agent/tools.js";
import { bootstrapUserDir } from "../src/paths.js";

const RUN = 1_000_000;
const user = (text: string, at: number): AgentMessage => ({ role: "user", content: text, timestamp: at }) as AgentMessage;
const call = (id: string, name: string, args: Record<string, unknown>, at: number): AgentMessage =>
  ({ role: "assistant", content: [{ type: "toolCall", id, name, arguments: args }], stopReason: "toolUse", usage: {}, timestamp: at }) as unknown as AgentMessage;
const result = (id: string, text: string, at?: number): AgentMessage =>
  ({ role: "toolResult", toolCallId: id, toolName: "x", content: [{ type: "text", text }], isError: false, ...(at === undefined ? {} : { timestamp: at }) }) as unknown as AgentMessage;
const text = (m: AgentMessage | undefined): string => ((m as { content: { text: string }[] }).content[0]?.text ?? "");

describe("folding tool results", () => {
  it("cuts earlier tasks' results to the reload summary and leaves the original alone", () => {
    const big = "a".repeat(20_000);
    const msgs = [user("old task", 1), call("c1", "read_file", { path: "x.json" }, 2), result("c1", big, 3), user("new task", RUN), call("c2", "read_file", { path: "y.json" }, RUN + 1), result("c2", big, RUN + 2)];
    const { messages, folded } = foldToolResults(msgs, RUN);
    expect(folded).toBe(1);
    expect(text(messages[2])).toStartWith("a".repeat(PAST_RESULT_CHARS));
    expect(text(messages[2]).length).toBeLessThan(PAST_RESULT_CHARS + 200);
    expect(text(messages[2])).toContain("earlier task");
    expect(text(messages[5])).toBe(big);
    expect(text(msgs[2])).toBe(big);
  });

  it("treats unstamped results (rebuilt from the session file) as earlier", () => {
    const msgs = [user("old", 1), call("c1", "grep", { pattern: "x" }, 2), result("c1", "b".repeat(5000)), user("new", RUN)];
    expect(foldToolResults(msgs, RUN).folded).toBe(1);
  });

  it("returns the same array when nothing needs folding", () => {
    const msgs = [user("t", RUN), call("c1", "read_file", { path: "a" }, RUN), result("c1", "short", RUN)];
    expect(foldToolResults(msgs, RUN).messages).toBe(msgs);
  });

  it("drops an older copy of a file read again in full, not a ranged read", () => {
    const msgs = [
      user("t", RUN),
      call("c1", "read_file", { path: "apps/rp/card.json" }, RUN),
      result("c1", "v1 ".repeat(1000), RUN),
      call("c2", "read_file", { path: "apps/rp/other.json", offset: 1, limit: 10 }, RUN),
      result("c2", "slice", RUN),
      call("c3", "read_file", { path: "./apps\\rp/card.json" }, RUN),
      result("c3", "v2 ".repeat(1000), RUN),
    ];
    const { messages } = foldToolResults(msgs, RUN);
    expect(text(messages[2])).toContain("an older copy");
    expect(text(messages[4])).toBe("slice");
    expect(text(messages[6])).toStartWith("v2");
  });

  it("keeps this run's results whole however many there are (a stable prefix for caching)", () => {
    const msgs: AgentMessage[] = [user("t", RUN)];
    for (let i = 0; i < 8; i++) {
      msgs.push(call(`c${i}`, "grep", { pattern: String(i) }, RUN), result(`c${i}`, `${i}`.repeat(40_000), RUN));
    }
    expect(foldToolResults(msgs, RUN).messages).toBe(msgs);
  });
});

describe("read_file", () => {
  let dataDir: string;
  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "fold-"));
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
    const read = buildUserTools("alice", p, { dataDir: p.root }).find((t) => t.name === "read_file")!;
    const run = async (args: Record<string, unknown>) => ((await read.execute("t", args)) as { content: { text: string }[] }).content[0]!.text;
    return { p, run };
  };

  it("returns the start of a big file with a note how to read on", async () => {
    const { p, run } = setup();
    const lines = Array.from({ length: 5000 }, (_, i) => `line ${i + 1} ${"x".repeat(40)}`).join("\n");
    fs.writeFileSync(path.join(p.root, "notes", "big.txt"), lines);
    const out = await run({ path: "notes/big.txt" });
    expect(out.length).toBeLessThan(42_000);
    expect(out).toMatch(/^\[notes\/big\.txt: lines 1-\d+ of 5000/);
    expect(out).toContain("read on with offset");
    // a slice still works
    expect(await run({ path: "notes/big.txt", offset: 4999, limit: 2 })).toContain("4999| line 4999");
  });

  it("cuts a one-line file by characters and points to grep", async () => {
    const { p, run } = setup();
    fs.writeFileSync(path.join(p.root, "notes", "card.json"), JSON.stringify({ description: "d".repeat(100_000) }));
    const out = await run({ path: "notes/card.json" });
    expect(out.length).toBeLessThan(41_000);
    expect(out).toContain("use grep");
    // a long first line in a multi-line file points to offset 2
    fs.writeFileSync(path.join(p.root, "notes", "wide.txt"), `${"w".repeat(50_000)}\nsecond`);
    expect(await run({ path: "notes/wide.txt" })).toContain("offset 2");
  });

  it("a slice cut for size says which lines came back", async () => {
    const { p, run } = setup();
    fs.writeFileSync(path.join(p.root, "notes", "rows.txt"), Array.from({ length: 3000 }, () => "r".repeat(100)).join("\n"));
    const out = await run({ path: "notes/rows.txt", offset: 1, limit: 3000 });
    const m = /^\[notes\/rows\.txt lines 1-(\d+) of 3000 \(cut for size; read on with offset (\d+)\)\]/.exec(out);
    expect(m).not.toBeNull();
    expect(Number(m![2])).toBe(Number(m![1]) + 1);
    expect(out.length).toBeLessThan(82_000);
  });

  it("reads several files in one call, errors inline, refused paths still refused", async () => {
    const { p, run } = setup();
    fs.writeFileSync(path.join(p.root, "notes", "a.md"), "alpha");
    fs.writeFileSync(path.join(p.root, "notes", "b.md"), "beta");
    const out = await run({ paths: ["notes/a.md", "notes/b.md", "notes/missing.md", "auth.json"] });
    expect(out).toContain("=== notes/a.md ===\nalpha");
    expect(out).toContain("=== notes/b.md ===\nbeta");
    expect(out).toContain("=== notes/missing.md ===\nError: File not found");
    expect(out).toContain("=== auth.json ===\nError: File not found");
    await expect(run({})).rejects.toThrow(/path is required/);
    await expect(run({ paths: Array.from({ length: 9 }, (_, i) => `n${i}`) })).rejects.toThrow(/at most 8/);
  });

  it("an app named in paths counts as touched", () => {
    expect(appTouched("read_file", { paths: ["notes/a.md", "apps/rp/src/main.tsx"] })).toBe("rp");
  });
});
