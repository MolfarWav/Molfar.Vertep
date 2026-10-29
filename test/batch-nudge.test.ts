import { describe, expect, test } from "bun:test";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { BATCH_NUDGE, lookupStreak, nudgeBatching } from "../src/agent/batch-nudge.js";

const START = 1_000;
let clock = START;
const user = () => ({ role: "user", content: [{ type: "text", text: "go" }], timestamp: clock++ }) as unknown as AgentMessage;
const step = (...calls: [string, unknown][]) =>
  ({ role: "assistant", content: calls.map(([name, args], i) => ({ type: "toolCall", id: `c${clock}${i}`, name, arguments: args })), timestamp: clock++ }) as unknown as AgentMessage;
const result = (text = "ok") => ({ role: "toolResult", toolCallId: "c", toolName: "x", content: [{ type: "text", text }], isError: false, timestamp: clock++ }) as unknown as AgentMessage;
const texts = (m: AgentMessage) => ((m as unknown as { content: { text?: string }[] }).content).map((b) => b.text ?? "").join("");

describe("batching reminder (issue #101)", () => {
  test("two single lookups in a row get the reminder on the newest result only", () => {
    const msgs = [user(), step(["read_file", { path: "a" }]), result("A"), step(["grep", { pattern: "x" }]), result("B")];
    expect(lookupStreak(msgs, START)).toBe(2);
    const out = nudgeBatching(msgs, START);
    expect(texts(out.at(-1)!)).toContain(BATCH_NUDGE);
    expect(texts(out.at(-1)!).startsWith("B")).toBe(true);
    expect(texts(out[2]!)).toBe("A");
    // the input list and its message are not changed
    expect(texts(msgs.at(-1)!)).toBe("B");
  });

  test("one lookup is not a streak; a step with two calls ends it", () => {
    expect(nudgeBatching([user(), step(["read_file", { path: "a" }]), result()], START).length).toBe(3);
    const one = [user(), step(["read_file", { path: "a" }]), result()];
    expect(texts(nudgeBatching(one, START).at(-1)!)).not.toContain(BATCH_NUDGE);
    const two = [user(), step(["read_file", { path: "a" }]), result(), step(["grep", { pattern: "x" }], ["grep", { pattern: "y" }]), result()];
    expect(lookupStreak(two, START)).toBe(0);
    expect(texts(nudgeBatching(two, START).at(-1)!)).not.toContain(BATCH_NUDGE);
  });

  test("an edit or a writing bash command ends the streak", () => {
    const msgs = [user(), step(["read_file", { path: "a" }]), result(), step(["edit_file", { path: "a" }]), result(), step(["read_file", { path: "a" }]), result()];
    expect(lookupStreak(msgs, START)).toBe(1);
    const sh = [user(), step(["bash", { command: "rm -rf x" }]), result(), step(["read_file", { path: "a" }]), result()];
    expect(lookupStreak(sh, START)).toBe(1);
  });

  test("looking bash commands count, with a leading cd", () => {
    const msgs = [user(), step(["bash", { command: "cd apps/roleplay && grep -rn foo src" }]), result(), step(["bash", { command: "ls apps" }]), result()];
    expect(lookupStreak(msgs, START)).toBe(2);
  });

  test("it repeats every third step of a long streak, not on each", () => {
    const msgs: AgentMessage[] = [user()];
    const fired: number[] = [];
    for (let i = 1; i <= 8; i++) {
      msgs.push(step(["read_file", { path: `f${i}` }]), result());
      if (texts(nudgeBatching(msgs, START).at(-1)!).includes(BATCH_NUDGE)) fired.push(i);
    }
    expect(fired).toEqual([2, 5, 8]);
  });

  test("steps of earlier tasks are not counted", () => {
    const old = [{ role: "assistant", content: [{ type: "toolCall", id: "o", name: "read_file", arguments: {} }], timestamp: 5 }, { role: "toolResult", content: [{ type: "text", text: "r" }], timestamp: 6 }] as unknown as AgentMessage[];
    const msgs = [...old, user(), step(["read_file", { path: "a" }]), result()];
    expect(lookupStreak(msgs, START)).toBe(1);
  });
});
