/**
 * Fewer rounds (issue #101). Every model step resends the whole history, so
 * a lookup done in its own step costs a full round trip. In the owner's runs
 * 81% of steps carried a single tool call, and about a third of the steps that
 * followed a lookup were another lookup (read_file after read_file, grep after
 * grep, one `grep`/`ls`/`cat` bash command per step), although read_file takes
 * several paths and a reply may hold several calls. The prompt already says
 * so; models drift from it under a long task.
 *
 * So after two single-call lookup steps in a row, and again every third step
 * of such a streak, a one-line reminder rides on the newest tool result. It is
 * added to the copy sent to the model: the transcript and the cached prefix
 * are untouched (the newest message is new on every call anyway).
 */
import type { AgentMessage } from "@earendil-works/pi-agent-core";

const LOOKUPS = new Set(["read_file", "grep", "json_get", "memory_search"]);
/** First words of a bash command that only looks. */
const LOOKING_COMMANDS = new Set(["grep", "rg", "ls", "cat", "sed", "head", "tail", "find", "wc", "jq", "tree", "file", "stat"]);

export const BATCH_NUDGE =
  "[Reminder: the last steps were each one lookup. If the next lookups do not depend on each other, ask for them all in ONE reply: several tool calls, read_file with paths, or several commands in one bash call.]";

type Block = { type?: string; name?: string; arguments?: unknown };
type Msg = { role?: string; timestamp?: number; content?: unknown };

function isLookup(b: Block): boolean {
  if (!b.name) return false;
  if (LOOKUPS.has(b.name)) return true;
  if (b.name !== "bash") return false;
  const cmd = (b.arguments as { command?: unknown } | undefined)?.command;
  if (typeof cmd !== "string") return false;
  const first = cmd.replace(/^\s*cd\s+\S+\s*(&&|;)\s*/, "").trim().split(/\s+/)[0] ?? "";
  return LOOKING_COMMANDS.has(first);
}

/** How many of this run's latest steps, counted back from the newest, each made exactly one call and it was a lookup. */
export function lookupStreak(msgs: readonly AgentMessage[], runStart: number): number {
  let n = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i] as Msg;
    if (typeof m.timestamp !== "number" || m.timestamp < runStart) break;
    if (m.role !== "assistant" || !Array.isArray(m.content)) continue;
    const calls = (m.content as Block[]).filter((b) => b.type === "toolCall");
    const only = calls[0];
    if (calls.length !== 1 || !only || !isLookup(only)) break;
    n++;
  }
  return n;
}

/** The messages to send: the same list, with the reminder added to the newest tool result when a streak calls for it. */
export function nudgeBatching(msgs: AgentMessage[], runStart: number): AgentMessage[] {
  const streak = lookupStreak(msgs, runStart);
  if (streak < 2 || (streak - 2) % 3 !== 0) return msgs;
  const last = msgs[msgs.length - 1] as Msg | undefined;
  if (last?.role !== "toolResult" || !Array.isArray(last.content)) return msgs;
  const out = msgs.slice();
  out[out.length - 1] = { ...(last as object), content: [...(last.content as Block[]), { type: "text", text: `\n\n${BATCH_NUDGE}` }] } as unknown as AgentMessage;
  return out;
}
