/**
 * Several chats run at once (#69): the page keeps a left chat's run and shows the marks.
 */
import { describe, expect, it } from "bun:test";
import { foldParked, newSessionId, otherChats, rowMark, type ParkedRun } from "../client-agent/src/parallel.js";
import { canApplyProposal } from "../client-agent/src/reply-actions.js";
import type { EngineSession } from "../client-agent/src/api.js";

const row = (sessionId: string, extra: Partial<EngineSession> = {}): EngineSession => ({ sessionId, runs: 1, lastAt: 1, title: sessionId, ...extra });

describe("a new chat's id", () => {
  it("is one the engine accepts, and differs from call to call", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newSessionId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
    expect(newSessionId(new Date("2026-10-23T10:00:00Z"), () => 0)).toMatch(/^2026-10-23-000000[0-9a-z]$/);
  });
});

describe("a left chat's run", () => {
  const parked = (): ParkedRun => ({
    msgs: [
      { id: "m1", role: "user", parts: [{ kind: "text", text: "hi" }] },
      { id: "live1", role: "assistant", parts: [], streaming: true },
    ],
    liveId: "live1",
    steerPending: [{ id: "s1", text: "blue" }],
    spend: null,
    usage: null,
  });

  it("keeps filling the live message as the stream goes on", () => {
    const run = parked();
    foldParked(run, { type: "text", delta: "Hel" });
    foldParked(run, { type: "text", delta: "lo" });
    foldParked(run, { type: "tool_start", id: "t1", name: "list_dir", args: { path: "." } });
    expect(run.msgs).toHaveLength(2);
    expect(run.msgs[0]?.parts).toEqual([{ kind: "text", text: "hi" }]);
    const parts = run.msgs[1]?.parts ?? [];
    expect(parts[0]).toEqual({ kind: "text", text: "Hello" });
    expect(parts.some((part) => part.kind === "tool")).toBe(true);
  });

  it("starts a message when the first event arrives before the page drew one", () => {
    const run = parked();
    run.msgs.pop();
    foldParked(run, { type: "text", delta: "x" });
    expect(run.msgs).toHaveLength(2);
    expect(run.msgs[1]?.role).toBe("assistant");
    expect(run.liveId).toBe(run.msgs[1]?.id ?? "");
  });

  it("drops a correction once the model has read it, and ignores question cards", () => {
    const run = parked();
    foldParked(run, { type: "ask_user", id: "a", question: "?" });
    foldParked(run, { type: "ask_user_done", id: "a" });
    expect(run.steerPending).toHaveLength(1);
    expect(run.msgs[1]?.parts).toEqual([]);
    foldParked(run, { type: "steer_landed", text: "blue" });
    expect(run.steerPending).toHaveLength(0);
  });
});

describe("the chat list marks", () => {
  const unseen = { c: true } as const;
  it("shows a waiting question over a run in progress over a finished run", () => {
    expect(rowMark(row("a", { running: true, waiting: true }), "z", {})).toBe("waiting");
    expect(rowMark(row("a", { running: true }), "z", {})).toBe("running");
    expect(rowMark(row("c"), "z", unseen)).toBe("finished");
    expect(rowMark(row("b"), "z", unseen)).toBeNull();
  });

  it("leaves the open chat to its own spinner", () => {
    expect(rowMark(row("a", { running: true }), "a", {})).toBeNull();
    expect(rowMark(row("c"), "c", unseen)).toBeNull();
  });

  it("lists the other chats that want a look, waiting first, archived ones never", () => {
    const list = [row("done", { title: "Done" }), row("work", { running: true, title: "Work" }), row("ask", { running: true, waiting: true, title: "Ask" }), row("old", { running: true, archived: true }), row("open", { running: true })];
    const got = otherChats(list, "open", { done: true });
    expect(got.map((c) => [c.title, c.mark])).toEqual([
      ["Ask", "waiting"],
      ["Work", "running"],
      ["Done", "finished"],
    ]);
  });
});

describe("Apply proposal", () => {
  it("is offered in plan mode only, where Molfar proposes and changes nothing", () => {
    expect(canApplyProposal("plan")).toBe(true);
    expect(canApplyProposal("normal")).toBe(false);
    expect(canApplyProposal("accept")).toBe(false);
  });
});
