/**
 * Chats that run at once write into one workspace (#69): a write tool says when another
 * chat, still working, changed the same file.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beginWork, endWork, neighbourNote, noteWrite } from "../src/agent/neighbours.js";
import { buildUserTools } from "../src/agent/tools.js";
import { bootstrapUserDir, userPaths } from "../src/paths.js";

describe("the registry of working chats", () => {
  it("names only other chats that are still working and changed the file", () => {
    beginWork("mia", "a", "make the header blue");
    beginWork("mia", "b", "fix the footer");
    expect(noteWrite("mia", "a", "src/App.tsx", 1000)).toEqual([]);
    expect(noteWrite("mia", "b", "./src//App.tsx", 31_000)).toEqual([{ task: "make the header blue", agoMs: 30_000 }]);
    // a chat's own earlier change is not a neighbour's; the other chat's still is
    expect(noteWrite("mia", "b", "src/App.tsx", 32_000)).toEqual([{ task: "make the header blue", agoMs: 31_000 }]);
    endWork("mia", "a");
    expect(noteWrite("mia", "b", "src/App.tsx", 33_000)).toEqual([]);
    endWork("mia", "b");
  });

  it("keeps users apart", () => {
    beginWork("mia", "a", "one");
    beginWork("leo", "a", "two");
    noteWrite("mia", "a", "f.txt");
    expect(noteWrite("leo", "b", "f.txt")).toEqual([]);
    endWork("mia", "a");
    endWork("leo", "a");
  });

  it("words the note by what the tool did to the file", () => {
    const others = [{ task: "fix the footer", agoMs: 40_000 }];
    expect(neighbourNote([], "f.txt", true)).toBe("");
    expect(neighbourNote(others, "f.txt", true)).toContain("replaced the file as that chat left it");
    expect(neighbourNote(others, "f.txt", false)).toContain("Read the file again");
    expect(neighbourNote(others, "f.txt", false)).toContain('"fix the footer" (40 s ago)');
    expect(neighbourNote(others, "f.txt", false)).toContain("git log --oneline -n 5 -- f.txt");
  });
});

describe("write tools", () => {
  let dataDir: string;
  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "neigh-"));
    bootstrapUserDir(dataDir, "mia");
  });
  afterEach(() => {
    try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* watcher races */ }
    endWork("mia", "chat-a");
    endWork("mia", "chat-b");
  });

  it("tell a chat that another working chat changed the file", async () => {
    const p = userPaths(dataDir, "mia");
    const tools = (sessionId: string) => buildUserTools("mia", p, { dataDir: p.root, sessionId });
    const run = async (sessionId: string, name: string, args: Record<string, unknown>) => {
      const tool = tools(sessionId).find((t) => t.name === name)!;
      const r = await tool.execute("c", args as never, undefined as never);
      return (r.content[0] as { text: string }).text;
    };
    beginWork("mia", "chat-a", "make it blue");
    beginWork("mia", "chat-b", "make it round");
    expect(await run("chat-a", "write_file", { path: "notes/x.txt", content: "one\ntwo\n" })).not.toContain("Note:");
    const edited = await run("chat-b", "edit_file", { path: "notes/x.txt", oldText: "two", newText: "2" });
    expect(edited).toContain('Note: another chat that is still working changed notes/x.txt too: "make it blue"');
    const rewritten = await run("chat-a", "write_file", { path: "notes/x.txt", content: "fresh\n" });
    expect(rewritten).toContain('"make it round"');
    expect(rewritten).toContain("This write replaced the file");
    // another file: no note
    expect(await run("chat-a", "write_file", { path: "notes/y.txt", content: "y" })).not.toContain("Note:");
  });
});
