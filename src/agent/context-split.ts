/**
 * Where a run's input tokens go (issue #101). Every model call resends the
 * system prompt, the tool list and the whole history, so a run's input is the
 * sum of what each call carried. This sorts one call's request into five
 * parts, by the same estimate the context budget uses, and adds the calls up:
 *
 * - prompt: the system prompt (memory, project text, plan mode included);
 * - tools: the tool definitions offered on this call;
 * - earlier: messages from tasks before this one (the chat so far);
 * - steps: this task's own messages that are not tool results (the request,
 *   the model's text, its tool calls);
 * - results: this task's tool results.
 *
 * Estimates, not the provider's numbers: they show the shares, and `sent`
 * (their total) sits beside the reported `input` + `cacheRead` in the record
 * so a reader can see how far apart the two are.
 */
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { estimateMessageTokens, estimateTextTokens, toolsTokens } from "./context-budget.js";

export interface RunSplit {
  /** Model calls counted. */
  calls: number;
  prompt: number;
  tools: number;
  earlier: number;
  steps: number;
  results: number;
  /** The five parts, added: what the estimate says was sent over all calls. */
  sent: number;
}

export function newRunSplit(): RunSplit {
  return { calls: 0, prompt: 0, tools: 0, earlier: 0, steps: 0, results: 0, sent: 0 };
}

/** Adds one model call's request to `into`. `runStart` is when the task began
 *  (messages stamped before it are earlier tasks); `messages` is the dialogue
 *  as sent, without the system lead. */
export function addCallToSplit(
  into: RunSplit,
  request: { systemPrompt: string; tools: readonly unknown[]; messages: readonly AgentMessage[] },
  runStart: number,
): void {
  const prompt = estimateTextTokens(request.systemPrompt);
  const tools = toolsTokens(request.tools);
  let earlier = 0;
  let steps = 0;
  let results = 0;
  for (const m of request.messages) {
    const tokens = estimateMessageTokens(m);
    const stamp = (m as { timestamp?: unknown }).timestamp;
    if (typeof stamp !== "number" || stamp < runStart) earlier += tokens;
    else if (m.role === "toolResult") results += tokens;
    else steps += tokens;
  }
  into.calls++;
  into.prompt += prompt;
  into.tools += tools;
  into.earlier += earlier;
  into.steps += steps;
  into.results += results;
  into.sent += prompt + tools + earlier + steps + results;
}

/** The shares of a split in whole percent, largest part first, for a log line. */
export function describeSplit(s: RunSplit): string {
  if (!s.sent) return "";
  const parts: [string, number][] = [
    ["prompt", s.prompt],
    ["tools", s.tools],
    ["earlier tasks", s.earlier],
    ["this task's steps", s.steps],
    ["tool results", s.results],
  ];
  return parts
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `${name} ${Math.round((n / s.sent) * 100)}%`)
    .join(", ");
}
