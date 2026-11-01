import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { proposeEntry, proposeRetire, readMemory, resolveScope } from "../src/agent/memory.js";
import { buildSuggestPrompt, memorySuggestEnabled, parseSuggestions, scopesFor, shouldSuggest, suggestMemory, traceOf, usable } from "../src/agent/memory-suggest.js";
import { dropMail, listMail } from "../src/agent/mailbox.js";
import { bootstrapUserDir } from "../src/paths.js";

let dataDir: string;
let root: string;
beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mem-suggest-"));
  root = bootstrapUserDir(dataDir, "alice").root;
});
afterEach(() => fs.rmSync(dataDir, { recursive: true, force: true }));

const seed = (file: string, lines: string[]) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), `# Memory\n\n${lines.map((l) => `- 2026-10-01: ${l}`).join("\n")}\n`);
};
const gate = { enabled: true, plan: false, reply: "done", steps: 9, tools: ["read_file"] };
const global = () => readMemory(root, resolveScope(root, "global"));

describe("memory suggestions after a long run (issue #99)", () => {
  it("runs only for a long, finished, unaided run with the switch on", () => {
    expect(shouldSuggest(gate)).toBe(true);
    expect(shouldSuggest({ ...gate, steps: 7 })).toBe(false);
    expect(shouldSuggest({ ...gate, enabled: false })).toBe(false);
    expect(shouldSuggest({ ...gate, plan: true })).toBe(false);
    expect(shouldSuggest({ ...gate, stopped: true })).toBe(false);
    expect(shouldSuggest({ ...gate, error: "boom" })).toBe(false);
    expect(shouldSuggest({ ...gate, reply: "  " })).toBe(false);
    // the model proposed memory itself in this run
    expect(shouldSuggest({ ...gate, tools: ["read_file", "memory_propose"] })).toBe(false);
  });

  it("the switch is on unless settings.json says false", () => {
    const file = path.join(dataDir, "settings.json");
    expect(memorySuggestEnabled(file)).toBe(true);
    fs.writeFileSync(file, JSON.stringify({ memorySuggest: false }));
    expect(memorySuggestEnabled(file)).toBe(false);
    fs.writeFileSync(file, JSON.stringify({ memorySuggest: true }));
    expect(memorySuggestEnabled(file)).toBe(true);
    fs.writeFileSync(file, "not json");
    expect(memorySuggestEnabled(file)).toBe(true);
  });

  it("scopes: global, the chat's project, and the apps the run touched", () => {
    const tools = [
      { name: "read_file", args: { path: "apps/roleplay/src/App.tsx" } },
      { name: "read_file", args: { path: "apps/other/data/x.json" } },
    ];
    expect(scopesFor(null, tools)).toEqual(["global", "app:roleplay", "app:other"]);
    expect(scopesFor("app:roleplay", tools)).toEqual(["global", "app:roleplay", "app:other"]);
    expect(scopesFor("project:notes", [])).toEqual(["global", "project:notes"]);
  });

  it("the prompt carries the request, the trace, the reply and each scope's memory", () => {
    const trace = traceOf([
      { name: "read_file", args: { path: "a.txt" } },
      { name: "read_file", args: { path: "a.txt" } },
      { name: "bash", args: { command: "ls" }, ok: false },
    ]);
    expect(trace).toBe("read_file a.txt x2; bash ls (failed)");
    const prompt = buildSuggestPrompt({
      request: "fix the thing",
      reply: "fixed it",
      trace,
      memories: [{ scope: "global", label: "global memory", text: "- 2026-10-01: likes tea", topics: ["gotchas"] }],
    });
    for (const part of ["fix the thing", "fixed it", "read_file a.txt x2", "likes tea", "Topic files: gotchas", "Scopes you may use: global"]) expect(prompt).toContain(part);
  });

  it("parses the reply: fences, extra text, unknown scopes, bad shapes and the cap of three", () => {
    const scopes = ["global", "app:x"];
    const raw =
      '```json\n{"proposals":[{"action":"add","scope":"global","entry":"  One   fact. ","topic":"gotchas"},{"action":"replace","scope":"app:x","match":"old","entry":"new"},{"action":"retire","scope":"global","match":"stale"},{"action":"add","scope":"global","entry":"fourth"},{"action":"add","scope":"nowhere","entry":"x"}]}\n```';
    expect(parseSuggestions(raw, scopes)).toEqual([
      { action: "add", scope: "global", entry: "One fact.", topic: "gotchas" },
      { action: "replace", scope: "app:x", entry: "new", match: "old" },
      { action: "retire", scope: "global", match: "stale" },
    ]);
    expect(parseSuggestions('Sure! {"proposals":[{"action":"add","scope":"global","entry":"ok"}]} done', scopes)).toHaveLength(1);
    expect(parseSuggestions('{"proposals":[]}', scopes)).toEqual([]);
    expect(parseSuggestions("no json here", scopes)).toEqual([]);
    expect(parseSuggestions('{"proposals":[{"action":"replace","scope":"global","entry":"x"},{"action":"add","scope":"global","entry":""},{"action":"drop"}]}', scopes)).toEqual([]);
    // a bad topic name is dropped, the entry stays
    expect(parseSuggestions('{"proposals":[{"action":"add","scope":"global","entry":"e","topic":"Bad Topic!"}]}', scopes)).toEqual([{ action: "add", scope: "global", entry: "e" }]);
  });

  it("drops what the memory already says and targets that are not there", () => {
    seed("memory/MEMORY.md", ["the user writes Ukrainian", "build with bun"]);
    const kept = usable(root, [
      { action: "add", scope: "global", entry: "The user writes Ukrainian" },
      { action: "add", scope: "global", entry: "new fact" },
      { action: "replace", scope: "global", match: "build with", entry: "build with bun 1.4" },
      { action: "replace", scope: "global", match: "nothing like this", entry: "x" },
      { action: "retire", scope: "global", match: "ukrainian" },
      { action: "retire", scope: "global", match: "absent" },
    ]);
    expect(kept.map((s) => `${s.action}:${s.action === "add" ? s.entry : (s as { match: string }).match}`)).toEqual(["add:new fact", "replace:build with", "retire:ukrainian"]);
  });

  it("the whole pass leaves each suggestion in the mailbox: no card, nothing written", async () => {
    seed("memory/MEMORY.md", ["old build note", "the user is in Kyiv"]);
    const raw = JSON.stringify({
      proposals: [
        { action: "replace", scope: "global", match: "old build note", entry: "build runs with bun" },
        { action: "add", scope: "global", entry: "a new fact" },
        { action: "retire", scope: "global", match: "Kyiv" },
      ],
    });
    const out = await suggestMemory({ root, generate: async () => raw, project: null, request: "r", reply: "done", tools: [] });
    expect(out).toEqual({ asked: 3, queued: 3 });
    expect(listMail(root).map((m) => `${m.kind}:${m.from}`)).toEqual(["replace:after-run", "add:after-run", "retire:after-run"]);
    // nothing was written by the pass itself
    expect(global()).toContain("old build note");
    expect(global()).toContain("Kyiv");
    expect(global()).not.toContain("a new fact");
    // the same pass again finds the same things waiting: nothing is queued twice
    expect((await suggestMemory({ root, generate: async () => raw, project: null, request: "r", reply: "done", tools: [] })).queued).toBe(0);
    expect(listMail(root)).toHaveLength(3);
  });

  it("a suggestion the user skipped before is not queued again", async () => {
    const raw = JSON.stringify({ proposals: [{ action: "add", scope: "global", entry: "Skipped fact" }] });
    const run = () => suggestMemory({ root, generate: async () => raw, project: null, request: "r", reply: "d", tools: [] });
    expect((await run()).queued).toBe(1);
    dropMail(root, listMail(root)[0]!.id, true);
    expect((await run()).queued).toBe(0);
    expect(listMail(root)).toHaveLength(0);
  });

  it("nothing to suggest means nothing queued; a model that returns junk queues nothing", async () => {
    const base = { root, project: null, request: "r", reply: "d", tools: [] };
    expect(await suggestMemory({ ...base, generate: async () => '{"proposals":[]}' })).toEqual({ asked: 0, queued: 0 });
    expect(await suggestMemory({ ...base, generate: async () => "I think nothing is needed." })).toEqual({ asked: 0, queued: 0 });
    expect(listMail(root)).toEqual([]);
  });

  it("Stop ends the pass before the next suggestion", async () => {
    let calls = 0;
    const raw = JSON.stringify({ proposals: [{ action: "add", scope: "global", entry: "one" }, { action: "add", scope: "global", entry: "two" }] });
    const out = await suggestMemory({ root, generate: async () => raw, project: null, request: "r", reply: "d", tools: [], stopped: () => calls++ > 0 });
    expect(out.asked).toBe(1);
    expect(listMail(root)).toHaveLength(1);
  });
});

describe("the confirm card's answers (issue #99, found on the way)", () => {
  it("an answer that is the bridge's 'nobody answered' marker is never saved as the entry: it waits in the mailbox", async () => {
    for (const marker of ["(stopped)", "(no answer)", "(question could not be delivered)"]) {
      const r = await proposeEntry(root, "alice", async () => marker, { scope: "global", entry: "a real fact" });
      expect(r.saved).toBe(false);
      expect(r.text).toContain("mailbox");
    }
    expect(global()).not.toContain("(stopped)");
    // the same proposal three times is one letter
    expect(listMail(root).map((m) => m.from)).toEqual(["unanswered"]);
  });

  it("retire says so when nothing matches, and keeps the entry on anything but Remove", async () => {
    seed("memory/MEMORY.md", ["keep me"]);
    expect((await proposeRetire(root, "alice", async () => "Remove", { scope: "global", match: "absent" })).saved).toBe(false);
    expect((await proposeRetire(root, "alice", async () => "Keep", { scope: "global", match: "keep me" })).saved).toBe(false);
    expect((await proposeRetire(root, "alice", async () => "(stopped)", { scope: "global", match: "keep me" })).saved).toBe(false);
    expect(global()).toContain("keep me");
    // "Keep" is remembered as a no; the later asks are refused, so clear that to test the yes
    for (const m of listMail(root)) dropMail(root, m.id);
    fs.rmSync(path.join(root, "memory/mailbox"), { recursive: true, force: true });
    expect((await proposeRetire(root, "alice", async () => "Remove", { scope: "global", match: "keep me" })).saved).toBe(true);
    expect(global()).not.toContain("keep me");
  });
});
