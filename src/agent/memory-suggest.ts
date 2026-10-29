/**
 * Memory suggestions after a long task (issue #99).
 *
 * The prompt asks the model to propose a memory entry at a natural stopping
 * point, and in a workspace of 145 runs it did so in 14 of the 90 runs with
 * eight or more tool calls (11 of those 14 were accepted). So when a long run
 * ends and the model proposed nothing, one more call, with the same model and
 * no history, reads the request, the tool trace, the reply and the memory as
 * it stands, and suggests at most three changes: add an entry, replace an
 * outdated one, or retire one that no longer holds. Each goes through the
 * confirm card memory_propose uses; nothing is written without a yes.
 */
import fs from "node:fs";
import path from "node:path";
import { appTouched, clipMemory, findEntry, listTopics, MEMORY_TOPIC, normalizeEntry, proposeEntry, proposeRetire, readMemory, resolveScope } from "./memory.js";
import type { AgentToolOptions } from "./tools.js";

/** A run needs this many steps (model calls) before the pass is worth its own model call. */
export const SUGGEST_MIN_STEPS = 8;
export const SUGGEST_MAX = 3;
/** Memory of one scope shown to the model, in characters (the core file is capped at 4000 anyway). */
const SCOPE_CHARS = 3000;
const REQUEST_CHARS = 1500;
const REPLY_CHARS = 2500;
const TRACE_CHARS = 2500;

export type Suggestion =
  | { action: "add"; scope: string; entry: string; topic?: string }
  | { action: "replace"; scope: string; entry: string; match: string; topic?: string }
  | { action: "retire"; scope: string; match: string };

/** The user's switch, `memorySuggest` in settings.json; on unless set to false. */
export function memorySuggestEnabled(settingsFile: string): boolean {
  try {
    return (JSON.parse(fs.readFileSync(settingsFile, "utf8")) as { memorySuggest?: unknown }).memorySuggest !== false;
  } catch {
    return true;
  }
}

export interface SuggestGate {
  enabled: boolean;
  /** Plan mode is read-only: nothing to remember from it, and no writes. */
  plan: boolean;
  hasAsk: boolean;
  stopped?: boolean;
  error?: string;
  reply: string;
  /** Steps (model calls) the run made. */
  steps: number;
  /** Tool names the run called. */
  tools: string[];
}

/** Whether a finished run gets the pass. */
export function shouldSuggest(g: SuggestGate): boolean {
  if (!g.enabled || g.plan || !g.hasAsk || g.stopped || g.error || !g.reply.trim()) return false;
  if (g.steps < SUGGEST_MIN_STEPS) return false;
  // the model already proposed something itself: do not pile a second round on top
  return !g.tools.includes("memory_propose");
}

type ToolRec = { name?: unknown; ok?: unknown; args?: unknown };

const clip = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, Math.floor(max * 0.6))}\n…\n${text.slice(text.length - Math.floor(max * 0.4))}`);

/** One line of what the run did: tool names with the path or command each touched. */
export function traceOf(tools: ToolRec[]): string {
  const counts = new Map<string, number>();
  for (const t of tools) {
    if (typeof t.name !== "string") continue;
    const a = (t.args && typeof t.args === "object" ? (t.args as Record<string, unknown>) : {}) as Record<string, unknown>;
    const target = ["path", "app", "pattern", "command"].map((k) => a[k]).find((v) => typeof v === "string" && v) as string | undefined;
    const key = `${t.name}${target ? ` ${target.replace(/\s+/g, " ").slice(0, 80)}` : ""}${t.ok === false ? " (failed)" : ""}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return clip([...counts].map(([k, n]) => (n > 1 ? `${k} x${n}` : k)).join("; "), TRACE_CHARS);
}

/** The scopes the model may use: global, the chat's project, and up to two apps the run touched. */
export function scopesFor(project: string | null, tools: ToolRec[]): string[] {
  const out = ["global"];
  if (project) out.push(project);
  for (const t of tools) {
    if (out.length >= 4) break;
    const app = typeof t.name === "string" ? appTouched(t.name, t.args) : undefined;
    if (app && !out.includes(`app:${app}`)) out.push(`app:${app}`);
  }
  return out;
}

const RULES = `You review one finished work session of a personal agent and decide what is worth keeping in its long-term memory for FUTURE chats. Memory is short dated lines: facts about the user and their preferences, decisions, where things live, gotchas that cost real time.

You may propose at most ${SUGGEST_MAX} changes:
- add: a new entry;
- replace: an entry that is outdated or contradicted by this session (match = a phrase from the old entry, entry = the new text);
- retire: an entry this session shows is wrong or no longer true (match = a phrase from it).

Rules:
- Nothing the memory already says. No trivia, no one-off task details, no summary of the work, no secrets (keys, passwords, tokens).
- Each entry is one self-contained, specific sentence (names, paths), at most 300 characters, in the language the user writes in.
- Use the narrowest scope: global only for what matters in every chat; app:<id> or project:<name> for what concerns one app or project. A topic (lowercase-dashes) is for details that should not ride along with every request.
- Most sessions deserve NO change. When unsure, propose nothing.

Reply with JSON only, no other text:
{"proposals":[{"action":"add","scope":"global","topic":"optional","entry":"..."},{"action":"replace","scope":"app:x","match":"phrase from the old entry","entry":"..."},{"action":"retire","scope":"global","match":"phrase from the entry"}]}
or {"proposals":[]}.`;

export interface SuggestInput {
  request: string;
  reply: string;
  trace: string;
  /** Allowed scopes with the memory each holds now. */
  memories: { scope: string; label: string; text: string; topics: string[] }[];
}

export function buildSuggestPrompt(i: SuggestInput): string {
  const memory = i.memories
    .map((m) => `## ${m.scope} (${m.label})\n${m.text.trim() ? clip(m.text.trim(), SCOPE_CHARS) : "(empty)"}${m.topics.length ? `\nTopic files: ${m.topics.join(", ")}` : ""}`)
    .join("\n\n");
  return `${RULES}\n\nScopes you may use: ${i.memories.map((m) => m.scope).join(", ")}.\n\n<memory>\n${memory}\n</memory>\n\n<session>\nUser request:\n${clip(i.request, REQUEST_CHARS)}\n\nWhat the agent did: ${i.trace || "(no tool calls)"}\n\nAgent's final reply:\n${clip(i.reply, REPLY_CHARS)}\n</session>`;
}

/** The model's reply as validated suggestions; anything malformed is dropped. */
export function parseSuggestions(raw: string, scopes: readonly string[]): Suggestion[] {
  const text = raw.replace(/```(?:json)?/gi, "").trim();
  let data: unknown;
  for (const candidate of [text, text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)]) {
    try {
      data = JSON.parse(candidate);
      break;
    } catch {
      /* try the next candidate */
    }
  }
  const list = (data as { proposals?: unknown } | undefined)?.proposals;
  if (!Array.isArray(list)) return [];
  const out: Suggestion[] = [];
  for (const raw of list) {
    if (out.length >= SUGGEST_MAX) break;
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const scope = typeof r.scope === "string" ? r.scope.trim() : "global";
    if (!scopes.includes(scope)) continue;
    const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
    const topic = str(r.topic);
    const topicOk = topic && MEMORY_TOPIC.test(topic) && topic !== "memory" ? { topic } : {};
    if (r.action === "add") {
      const entry = normalizeEntry(str(r.entry));
      if (entry) out.push({ action: "add", scope, entry, ...topicOk });
    } else if (r.action === "replace") {
      const entry = normalizeEntry(str(r.entry));
      const match = str(r.match);
      if (entry && match) out.push({ action: "replace", scope, entry, match, ...topicOk });
    } else if (r.action === "retire") {
      const match = str(r.match);
      if (match) out.push({ action: "retire", scope, match });
    }
  }
  return out;
}

/** Drop what the memory already says, and replace/retire targets that are not there. */
export function usable(root: string, list: Suggestion[]): Suggestion[] {
  return list.filter((s) => {
    const scope = resolveScope(root, s.scope);
    if (s.action === "add") {
      const known = readMemory(root, scope).toLowerCase();
      return !known.includes(s.entry.toLowerCase());
    }
    return !!findEntry(root, scope, s.match);
  });
}

export interface SuggestDeps {
  root: string;
  username: string;
  ask: AgentToolOptions["ask"];
  /** One model call with no history; returns the reply text. */
  generate: (prompt: string) => Promise<string>;
  /** The chat's project ("app:<id>" or "project:<name>") or null. */
  project: string | null;
  request: string;
  reply: string;
  tools: ToolRec[];
  /** True once the user pressed Stop. */
  stopped?: () => boolean;
}

export interface SuggestOutcome {
  asked: number;
  saved: number;
}

/** The whole pass: build the prompt, ask the model, show each suggestion as a card. */
export async function suggestMemory(d: SuggestDeps): Promise<SuggestOutcome> {
  const scopes = scopesFor(d.project, d.tools);
  const memories = scopes.map((s) => {
    const scope = resolveScope(d.root, s);
    return { scope: s, label: scope.label, text: clipMemory(readMemory(d.root, scope), SCOPE_CHARS, scope.file), topics: listTopics(d.root, scope).map((t) => t.topic) };
  });
  const raw = await d.generate(buildSuggestPrompt({ request: d.request, reply: d.reply, trace: traceOf(d.tools), memories }));
  const list = usable(d.root, parseSuggestions(raw, scopes));
  const out: SuggestOutcome = { asked: 0, saved: 0 };
  const origin = "Suggested after this task:";
  for (const s of list) {
    if (d.stopped?.()) break;
    out.asked++;
    const r =
      s.action === "retire"
        ? await proposeRetire(d.root, d.username, d.ask, { scope: s.scope, match: s.match, origin })
        : await proposeEntry(d.root, d.username, d.ask, { scope: s.scope, entry: s.entry, topic: s.topic, replaces: s.action === "replace" ? s.match : undefined, origin });
    if (r.saved) out.saved++;
  }
  return out;
}

/** The settings file of a workspace root. */
export const settingsFileOf = (root: string): string => path.join(root, "settings.json");
