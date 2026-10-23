/**
 * The chats tool (look through the chats, archive, rename, move, delete) and the wall around
 * the transcripts: file tools may read agent/ but never write it.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildChatsTool, type ChatRow } from "../src/agent/chats.js";
import { availableGroups, buildToolsEnable, visibleTools } from "../src/agent/small-window.js";
import { buildUserTools, WRITE_TOOLS } from "../src/agent/tools.js";
import { agentReadDenied, agentWriteDenied, bootstrapUserDir, userPaths } from "../src/paths.js";

const DAY = 86_400_000;
const rows = (): ChatRow[] => [
  { sessionId: "now", runs: 3, lastAt: Date.now(), title: "This chat", archived: false, project: null },
  { sessionId: "busy", runs: 1, lastAt: Date.now() - DAY, title: "Working one", archived: false, project: null },
  { sessionId: "old1", runs: 2, lastAt: Date.now() - 90 * DAY, title: "Old card draft", archived: false, project: null },
  { sessionId: "old2", runs: 1, lastAt: Date.now() - 60 * DAY, title: "Old lorebook idea", archived: false, project: "project:ideas" },
  { sessionId: "old3", runs: 1, lastAt: Date.now() - 120 * DAY, title: "Very old", archived: true, project: null },
];

function setup(answer = "Delete", withAsk = true) {
  const state = { chats: rows(), removed: [] as string[], asked: [] as { question: string; detail?: string }[], forgotten: [] as string[][], titles: {} as Record<string, string>, moved: {} as Record<string, string | null> };
  const tool = buildChatsTool({
    sessionId: "now",
    isWorking: (id) => id === "busy" || id === "now",
    ...(withAsk
      ? {
          ask: async (q) => {
            state.asked.push({ question: q.question, ...(q.detail ? { detail: q.detail } : {}) });
            return answer;
          },
        }
      : {}),
    ops: {
      list: () => state.chats,
      rename: (id, title) => void (state.titles[id] = title),
      archive: (id, archived) => {
        const r = state.chats.find((x) => x.sessionId === id);
        if (r) r.archived = archived;
      },
      move: (id, project) => void (state.moved[id] = project),
      remove: (id) => {
        state.removed.push(id);
        state.chats = state.chats.filter((x) => x.sessionId !== id);
      },
      projects: () => [{ id: "project:ideas", title: "Ideas" }, { id: "app:roleplay", title: "Roleplay" }],
    },
    forgotten: (ids) => state.forgotten.push(ids),
  });
  const run = async (args: Record<string, unknown>) => ((await tool.execute("c", args as never, undefined as never)).content[0] as { text: string }).text;
  return { state, run, tool };
}

describe("chats: list", () => {
  it("shows the sidebar's chats with marks, projects and the ids to act on", async () => {
    const { run } = setup();
    const out = await run({ action: "list" });
    expect(out).toContain("4 chats");
    expect(out).toContain("- old2 | Old lorebook idea | last used");
    expect(out).toContain("project: Ideas");
    expect(out).toContain("| working");
    expect(out).toContain("this chat");
    expect(out).not.toContain("Very old"); // archived: only when asked for
    expect(out).toContain("Projects: project:ideas (Ideas), app:roleplay (Roleplay)");
    expect(await run({ action: "list", archived: true })).toContain("Very old");
  });

  it("finds old chats, oldest first, and by words in the title", async () => {
    const { run } = setup();
    const old = await run({ action: "list", olderThanDays: 30, archived: true });
    expect(old.indexOf("old3")).toBeLessThan(old.indexOf("old1"));
    expect(old.indexOf("old1")).toBeLessThan(old.indexOf("old2"));
    expect(old).not.toContain("Working one");
    const q = await run({ action: "list", query: "lorebook" });
    expect(q).toContain("1 chat:");
    expect(q).toContain("old2");
  });
});

describe("chats: archive, rename, move", () => {
  it("act at once, name what was not found, and tell the pages", async () => {
    const { state, run } = setup();
    expect(await run({ action: "archive", ids: ["old1", "nope"] })).toContain("Not found: nope");
    expect(state.chats.find((c) => c.sessionId === "old1")?.archived).toBe(true);
    await run({ action: "unarchive", ids: ["old1"] });
    expect(state.chats.find((c) => c.sessionId === "old1")?.archived).toBe(false);
    await run({ action: "rename", ids: ["old1"], title: "Card draft" });
    expect(state.titles.old1).toBe("Card draft");
    await expect(run({ action: "rename", ids: ["old1", "old2"], title: "x" })).rejects.toThrow("exactly one");
    expect(state.asked).toHaveLength(0);
    expect(state.forgotten.length).toBeGreaterThan(0);
  });

  it("move takes a project by id or by title, and none takes a chat out", async () => {
    const { state, run } = setup();
    await run({ action: "move", ids: ["old1"], project: "ideas" });
    expect(state.moved.old1).toBe("project:ideas");
    await run({ action: "move", ids: ["old1"], project: "app:roleplay" });
    expect(state.moved.old1).toBe("app:roleplay");
    await run({ action: "move", ids: ["old2"], project: "none" });
    expect(state.moved.old2).toBeNull();
    await expect(run({ action: "move", ids: ["old1"], project: "nowhere" })).rejects.toThrow("No project");
  });
});

describe("chats: delete", () => {
  it("asks first, names the chats, and removes only after Delete", async () => {
    const { state, run } = setup("Delete");
    const out = await run({ action: "delete", ids: ["old1", "old2"] });
    expect(state.asked).toHaveLength(1);
    expect(state.asked[0]!.question).toContain("2 chats");
    expect(state.asked[0]!.detail).toContain("Old card draft");
    expect(state.removed).toEqual(["old1", "old2"]);
    expect(out).toContain("Deleted 2 chats");
    expect(state.forgotten.at(-1)).toEqual(["old1", "old2"]);
  });

  it("removes nothing when the user says no, or does not answer", async () => {
    for (const answer of ["Don't delete", "(no answer — timed out)", "keep the second one"]) {
      const { state, run } = setup(answer);
      const out = await run({ action: "delete", ids: ["old1"] });
      expect(state.removed).toEqual([]);
      expect(out).toContain("Nothing was removed");
    }
  });

  it("never deletes this chat or a working one, and never asks about them", async () => {
    const { state, run } = setup("Delete");
    const out = await run({ action: "delete", ids: ["now", "busy"] });
    expect(state.asked).toHaveLength(0);
    expect(state.removed).toEqual([]);
    expect(out).toContain("this chat");
    expect(out).toContain("working now");
  });

  it("refuses when there is nobody to ask", async () => {
    const { state, run } = setup("Delete", false);
    await expect(run({ action: "delete", ids: ["old1"] })).rejects.toThrow("confirm");
    expect(state.removed).toEqual([]);
  });
});

describe("hiding and plan mode", () => {
  it("full mode sends the chats tool only after tools_enable, and plan mode strips it", () => {
    const { tool } = setup();
    const read = { name: "read_file" } as never;
    const all = [read, tool];
    expect(availableGroups(all)).toEqual(["chats"]);
    const enable = buildToolsEnable(["chats"], () => undefined);
    const withEnable = [...all, enable];
    expect(visibleTools(withEnable, false, new Set()).map((t) => t.name)).toEqual(["read_file", "tools_enable"]);
    expect(visibleTools(withEnable, false, new Set(["chats"])).map((t) => t.name)).toEqual(["read_file", "chats"]);
    expect(WRITE_TOOLS.has("chats")).toBe(true);
    expect(enable.description).toContain("chats:");
  });
});

describe("transcripts are read-only for the file tools", () => {
  let dataDir: string;
  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "chats-"));
    bootstrapUserDir(dataDir, "mia");
  });
  afterEach(() => {
    try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* watcher races */ }
  });

  it("agent/ is refused for writing and stays readable", async () => {
    expect(agentWriteDenied("agent/sessions/x.jsonl")).toContain("chats tool");
    expect(agentWriteDenied("./agent/sessions/x.jsonl")).not.toBeNull();
    expect(agentReadDenied("agent/sessions/x.jsonl")).toBeNull();
    const p = userPaths(dataDir, "mia");
    fs.mkdirSync(path.join(p.root, "agent", "sessions"), { recursive: true });
    fs.writeFileSync(path.join(p.root, "agent", "sessions", "x.jsonl"), '{"type":"start"}\n');
    const tools = buildUserTools("mia", p, { dataDir: p.root });
    const write = tools.find((t) => t.name === "write_file")!;
    await expect(write.execute("c", { path: "agent/sessions/x.jsonl", content: "" } as never, undefined as never)).rejects.toThrow("not agent-writable");
    expect(fs.readFileSync(path.join(p.root, "agent", "sessions", "x.jsonl"), "utf8")).toBe('{"type":"start"}\n');
    const read = tools.find((t) => t.name === "read_file")!;
    const got = await read.execute("c", { path: "agent/sessions/x.jsonl" } as never, undefined as never);
    expect((got.content[0] as { text: string }).text).toContain("start");
  });
});
