/**
 * Tool results take most of what an agent run sends: every model call
 * resends every result so far. Measured on a real workspace (2026-10-08),
 * results of EARLIER runs in the same chat were ~46% of all input. This
 * folds them before each model call, on a copy: the agent's state and the
 * session file keep everything.
 *
 * - Earlier runs: a result is cut to the 300-character summary a chat
 *   reloaded from its file gets anyway (loadSessionDialogue), so a chat costs
 *   the same with or without an engine restart in between.
 * - This run: an older copy of a file that was read again in full or
 *   rewritten becomes a stub, and steps older than the last few lose the
 *   bulk of long results and long arguments (a heredoc script that already
 *   ran). In a measured card edit (49 calls) bash commands and their output
 *   were half of all input.
 * - Every task: long tool-call arguments of earlier tasks are cut the same way.
 *
 * Each message changes once, when it ages past the line, and then stays the
 * same. Provider caching does not help here: subscriptions such as NanoGPT
 * count cached input tokens against the quota like any others.
 */
import type { AgentMessage } from "@earendil-works/pi-agent-core";

/** Same length as the summaries a reloaded chat carries. */
export const PAST_RESULT_CHARS = 300;

const PAST_NOTE = "[result from an earlier task, cut to save tokens. Read a file again if you need it; do not repeat actions that change things]";

/** Steps of this run (model replies with tool calls) that stay whole. */
export const KEEP_STEPS = 6;
/** In older steps, a result longer than this keeps its head only. */
const OLD_RESULT_CHARS = 2000;
const OLD_RESULT_HEAD = 800;
/** In older steps and earlier tasks, a string argument longer than this keeps its head only. */
const OLD_ARG_CHARS = 1500;
const OLD_ARG_HEAD = 400;

/** A tool call's arguments with long strings cut; the same object when nothing is long. */
function clipArgs(args: unknown): { args: unknown; cut: boolean } {
  if (!args || typeof args !== "object" || Array.isArray(args)) return { args, cut: false };
  let cut = false;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args as Record<string, unknown>)) {
    if (typeof v === "string" && v.length > OLD_ARG_CHARS) {
      out[k] = `${v.slice(0, OLD_ARG_HEAD)}\n[${v.length - OLD_ARG_HEAD} more characters left out to save tokens; this call already ran]`;
      cut = true;
    } else out[k] = v;
  }
  return { args: cut ? out : args, cut };
}

/** An assistant message with its tool calls' long arguments cut; undefined when none are long. */
function clipCalls(m: AgentMessage): AgentMessage | undefined {
  const r = m as Msg;
  if (r.role !== "assistant" || !Array.isArray(r.content)) return undefined;
  let any = false;
  const content = (r.content as { type: string; arguments?: unknown }[]).map((b) => {
    if (b.type !== "toolCall") return b;
    const c = clipArgs(b.arguments);
    if (!c.cut) return b;
    any = true;
    return { ...b, arguments: c.args };
  });
  return any ? ({ ...(m as object), content } as unknown as AgentMessage) : undefined;
}

type Block = { type: string; text?: string };
type Msg = { role?: string; timestamp?: number; toolCallId?: string; content?: unknown };
type Call = { name: string; args: Record<string, unknown> };

const textOf = (m: Msg): string =>
  Array.isArray(m.content) ? (m.content as Block[]).map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("") : "";

const withText = (m: AgentMessage, text: string): AgentMessage => ({ ...(m as object), content: [{ type: "text", text }] }) as unknown as AgentMessage;

const normPath = (p: unknown): string | undefined =>
  typeof p === "string" && p.trim() ? p.trim().replace(/\\/g, "/").replace(/^\.\//, "") : undefined;

/** A read_file call that took the whole file: one path, no range. */
const fullRead = (c: Call): string | undefined =>
  c.name === "read_file" && c.args.offset === undefined && c.args.limit === undefined ? normPath(c.args.path) : undefined;

export interface FoldResult {
  messages: AgentMessage[];
  /** results changed in the copy */
  folded: number;
}

/**
 * Fold tool results in `msgs`. `runStart` is when the current run began
 * (Date.now()); results stamped earlier, or not stamped (rebuilt from the
 * session file), belong to earlier runs.
 */
export function foldToolResults(msgs: AgentMessage[], runStart: number): FoldResult {
  const calls = new Map<string, Call>();
  for (const m of msgs as Msg[]) {
    if (m.role !== "assistant" || !Array.isArray(m.content)) continue;
    for (const b of m.content as { type: string; id?: string; name?: string; arguments?: unknown }[]) {
      if (b.type === "toolCall" && b.id && b.name) calls.set(b.id, { name: b.name, args: b.arguments && typeof b.arguments === "object" ? (b.arguments as Record<string, unknown>) : {} });
    }
  }
  const out = msgs.slice();
  let folded = 0;
  const inRun = (r: Msg) => typeof r.timestamp === "number" && r.timestamp >= runStart;
  // this run's steps; all but the newest KEEP_STEPS are old
  const steps = out.flatMap((m, i) => {
    const r = m as Msg;
    return r.role === "assistant" && inRun(r) && Array.isArray(r.content) && (r.content as Block[]).some((b) => b.type === "toolCall") ? [i] : [];
  });
  const oldSteps = new Set(steps.slice(0, Math.max(0, steps.length - KEEP_STEPS)));
  const oldCalls = new Set<string>();
  for (const i of oldSteps) {
    for (const b of (out[i] as Msg).content as { type: string; id?: string }[]) if (b.type === "toolCall" && b.id) oldCalls.add(b.id);
  }
  // long arguments: earlier tasks and old steps of this one
  out.forEach((m, i) => {
    const r = m as Msg;
    if (r.role !== "assistant" || (inRun(r) && !oldSteps.has(i))) return;
    const clipped = clipCalls(m);
    if (!clipped) return;
    out[i] = clipped;
    folded++;
  });
  const current: number[] = [];
  out.forEach((m, i) => {
    const r = m as Msg;
    if (r.role !== "toolResult") return;
    if (typeof r.timestamp === "number" && r.timestamp >= runStart) {
      current.push(i);
      return;
    }
    const text = textOf(r);
    if (text.length <= PAST_RESULT_CHARS + PAST_NOTE.length + 2) return;
    out[i] = withText(m, `${text.slice(0, PAST_RESULT_CHARS)}\n${PAST_NOTE}`);
    folded++;
  });

  // this run, newest first: a whole-file read or a rewrite makes older copies stale
  const laterFull = new Set<string>();
  for (let k = current.length - 1; k >= 0; k--) {
    const i = current[k]!;
    const r = out[i] as Msg;
    const call = r.toolCallId ? calls.get(r.toolCallId) : undefined;
    if (!call) continue;
    const target = fullRead(call) ?? (call.name === "write_file" ? normPath(call.args.path) : undefined);
    if (call.name === "read_file" && target && laterFull.has(target)) {
      out[i] = withText(out[i]!, `[read_file ${target}: an older copy, dropped to save tokens; the file was read again or rewritten later in this task]`);
      folded++;
      continue;
    }
    if (target) laterFull.add(target);
    const text = textOf(r);
    if (r.toolCallId && oldCalls.has(r.toolCallId) && text.length > OLD_RESULT_CHARS) {
      out[i] = withText(
        out[i]!,
        `${text.slice(0, OLD_RESULT_HEAD)}\n[${text.length - OLD_RESULT_HEAD} more characters of this older result left out to save tokens; run the tool again (read_file with offset/limit) if you need them]`,
      );
      folded++;
    }
  }
  return { messages: folded ? out : msgs, folded };
}
