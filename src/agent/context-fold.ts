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
 *   rewritten becomes a stub.
 *
 * Both change a message once and then keep it the same for every later call,
 * so the prefix stays stable for provider prompt caching (88% of the input
 * came from the cache in a measured run). Cutting by a sliding budget would
 * shift the prefix on every call, so it is left to fitContext at the window's
 * edge.
 */
import type { AgentMessage } from "@earendil-works/pi-agent-core";

/** Same length as the summaries a reloaded chat carries. */
export const PAST_RESULT_CHARS = 300;

const PAST_NOTE = "[result from an earlier task, cut to save tokens. Read a file again if you need it; do not repeat actions that change things]";

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
  }
  return { messages: folded ? out : msgs, folded };
}
