import { describe, expect, test } from "bun:test";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { estimateMessageTokens, estimateTextTokens, toolsTokens } from "../src/agent/context-budget.js";
import { addCallToSplit, describeSplit, newRunSplit } from "../src/agent/context-split.js";

const START = 1_000;
const user = (text: string, timestamp: number) => ({ role: "user", content: [{ type: "text", text }], timestamp }) as unknown as AgentMessage;
const result = (text: string, timestamp: number) =>
  ({ role: "toolResult", toolCallId: "c1", toolName: "read_file", content: [{ type: "text", text }], isError: false, timestamp }) as unknown as AgentMessage;
const step = (text: string, timestamp: number) =>
  ({ role: "assistant", content: [{ type: "text", text }], timestamp }) as unknown as AgentMessage;

describe("run split (issue #101)", () => {
  const tools = [{ name: "read_file", description: "Read a file", parameters: { type: "object" } }];
  const messages = [user("old question", 10), result("old file ".repeat(200), 20), user("now", START + 1), step("looking", START + 2), result("new file ".repeat(300), START + 3)];

  test("sorts one call into prompt, tools, earlier tasks, steps and results", () => {
    const s = newRunSplit();
    addCallToSplit(s, { systemPrompt: "You are an agent. ".repeat(50), tools, messages }, START);
    expect(s.calls).toBe(1);
    expect(s.prompt).toBe(estimateTextTokens("You are an agent. ".repeat(50)));
    expect(s.tools).toBe(toolsTokens(tools));
    expect(s.earlier).toBe(estimateMessageTokens(messages[0]!) + estimateMessageTokens(messages[1]!));
    expect(s.steps).toBe(estimateMessageTokens(messages[2]!) + estimateMessageTokens(messages[3]!));
    expect(s.results).toBe(estimateMessageTokens(messages[4]!));
    expect(s.sent).toBe(s.prompt + s.tools + s.earlier + s.steps + s.results);
  });

  test("adds calls up: the history is counted again on every call", () => {
    const s = newRunSplit();
    addCallToSplit(s, { systemPrompt: "p", tools: [], messages: messages.slice(0, 3) }, START);
    const once = { ...s };
    addCallToSplit(s, { systemPrompt: "p", tools: [], messages: messages.slice(0, 3) }, START);
    expect(s.calls).toBe(2);
    expect(s.earlier).toBe(once.earlier * 2);
    expect(s.sent).toBe(once.sent * 2);
  });

  test("a message with no timestamp counts as an earlier task", () => {
    const s = newRunSplit();
    const bare = { role: "user", content: "restored" } as unknown as AgentMessage;
    addCallToSplit(s, { systemPrompt: "", tools: [], messages: [bare] }, START);
    expect(s.earlier).toBeGreaterThan(0);
    expect(s.steps).toBe(0);
  });

  test("describes the shares, largest first, and says nothing for an empty split", () => {
    expect(describeSplit(newRunSplit())).toBe("");
    const s = newRunSplit();
    addCallToSplit(s, { systemPrompt: "p", tools: [], messages }, START);
    const text = describeSplit(s);
    expect(text.startsWith("tool results") || text.startsWith("earlier tasks")).toBe(true);
    expect(text).toContain("%");
  });
});
