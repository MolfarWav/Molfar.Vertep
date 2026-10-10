/**
 * Prompt sources: where each part of a model request came from, for the
 * prompt inspector. An app sends, beside its request, a host-only list of the
 * exact texts it put in and what each one is (a card field, a preset section,
 * a lorebook entry…); the engine finds those texts in the final request and
 * keeps ranges. Merges (squashed system messages, wrapped section groups, one
 * flattened prompt) only join texts, so each part stays a substring. What an
 * llmRequest hook adds is labeled by the engine from a before/after diff.
 * Nothing here ever reaches a provider.
 */
import { estimateTextTokens } from "./agent/context-budget.js";

/** Legend kinds; anything else shows as "other". */
export const SOURCE_KINDS = [
  "card", "persona", "preset", "lorebook", "example", "databank", "note", "history", "group",
  "memory", "dashboard", "utility", "prefill", "plugin",
  // Molfar's own requests
  "rules", "workspace", "apps", "docs", "skills", "tools", "user", "assistant", "toolResult",
  "other",
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export interface SourcePart { kind: SourceKind; label: string; detail?: string; text: string }
export interface SourceOmitted { kind: SourceKind; label: string; detail?: string; reason: string; tokens?: number }
export interface SourceVar { name: string; value: string; label?: string }
export interface PromptSources { parts: SourcePart[]; omitted: SourceOmitted[]; vars: SourceVar[] }

/** What the inspector keeps: labels and ranges, not the texts again. */
export interface LocatedSources {
  parts: { kind: SourceKind; label: string; detail?: string; tokens: number; located: boolean }[];
  /** msg -1 is the system prompt; offsets are in the unclipped text. */
  spans: { msg: number; start: number; end: number; part: number }[];
  omitted: SourceOmitted[];
  vars: SourceVar[];
  /** Tokens no part covers: separators, wrappers, engine text. */
  unlabeled: number;
}

const MAX_PARTS = 2000;
const MAX_OMITTED = 500;
const MAX_VARS = 100;
const MAX_TEXT_TOTAL = 4 * 1024 * 1024;
/** A text this short matches too easily anywhere: it is looked for only after the previous part. */
const SHORT = 12;

const KIND_SET = new Set<string>(SOURCE_KINDS);
const kindOf = (v: unknown): SourceKind => (typeof v === "string" && KIND_SET.has(v) ? (v as SourceKind) : "other");
const str = (v: unknown, max: number): string | undefined => (typeof v === "string" && v.trim() ? v.slice(0, max) : undefined);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** An app's `promptSources`, kept to known fields and sizes; null when nothing usable. */
export function sanitizePromptSources(raw: unknown): PromptSources | null {
  if (!isObj(raw)) return null;
  const parts: SourcePart[] = [];
  let total = 0;
  for (const p of Array.isArray(raw.parts) ? raw.parts.slice(0, MAX_PARTS) : []) {
    if (!isObj(p) || typeof p.text !== "string" || !p.text.trim()) continue;
    const label = str(p.label, 120);
    if (!label) continue;
    // past the cap a part keeps its row but loses its text: it shows as not located
    const text = total + p.text.length <= MAX_TEXT_TOTAL ? p.text : "";
    total += text.length;
    const detail = str(p.detail, 300);
    parts.push({ kind: kindOf(p.kind), label, ...(detail ? { detail } : {}), text });
  }
  const omitted: SourceOmitted[] = [];
  for (const o of Array.isArray(raw.omitted) ? raw.omitted.slice(0, MAX_OMITTED) : []) {
    if (!isObj(o)) continue;
    const label = str(o.label, 120);
    const reason = str(o.reason, 300);
    if (!label || !reason) continue;
    const detail = str(o.detail, 300);
    const tokens = typeof o.tokens === "number" && Number.isFinite(o.tokens) && o.tokens >= 0 ? Math.round(o.tokens) : undefined;
    omitted.push({ kind: kindOf(o.kind), label, ...(detail ? { detail } : {}), reason, ...(tokens != null ? { tokens } : {}) });
  }
  const vars: SourceVar[] = [];
  for (const v of Array.isArray(raw.vars) ? raw.vars.slice(0, MAX_VARS) : []) {
    if (!isObj(v)) continue;
    const name = str(v.name, 120);
    if (!name) continue;
    const value = typeof v.value === "string" ? v.value.slice(0, 200) : typeof v.value === "number" || typeof v.value === "boolean" ? String(v.value) : "";
    const label = str(v.label, 200);
    vars.push({ name, value, ...(label ? { label } : {}) });
  }
  return parts.length || omitted.length || vars.length ? { parts, omitted, vars } : null;
}

export function mergePromptSources(a: PromptSources | null, b: PromptSources | null): PromptSources | null {
  if (!a) return b;
  if (!b) return a;
  return {
    parts: [...a.parts, ...b.parts].slice(0, MAX_PARTS),
    omitted: [...a.omitted, ...b.omitted].slice(0, MAX_OMITTED),
    vars: [...a.vars, ...b.vars].slice(0, MAX_VARS),
  };
}

type Msg = { role?: string; content?: unknown };
const textOf = (m: Msg): string => (typeof m?.content === "string" ? m.content : "");

/** The middle of `after` that `before` lacks (common prefix and suffix cut). */
function middle(before: string, after: string): string {
  let p = 0;
  const max = Math.min(before.length, after.length);
  while (p < max && before[p] === after[p]) p++;
  let s = 0;
  while (s < max - p && before[before.length - 1 - s] === after[after.length - 1 - s]) s++;
  return after.slice(p, after.length - s);
}

/** Which before-message each after-message equals (longest common subsequence on texts). */
function alignByText(a: string[], b: string[]): (number | null)[] {
  const match: (number | null)[] = b.map(() => null);
  // big histories: equal heads and tails are enough
  if (a.length * b.length > 1_000_000) {
    let h = 0;
    while (h < a.length && h < b.length && a[h] === b[h]) {
      match[h] = h;
      h++;
    }
    let t = 0;
    while (t < a.length - h && t < b.length - h && a[a.length - 1 - t] === b[b.length - 1 - t]) {
      match[b.length - 1 - t] = a.length - 1 - t;
      t++;
    }
    return match;
  }
  const n = a.length;
  const m = b.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) match[j++] = i++;
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  return match;
}

/** Texts a hook put into a request: new messages whole, changed ones by their new middle. */
export function hookInsertions(
  before: { systemPrompt?: unknown; messages?: unknown },
  after: { systemPrompt?: unknown; messages?: unknown },
): string[] {
  const out: string[] = [];
  const add = (t: string) => { const s = t.trim(); if (s) out.push(s); };
  const sysA = typeof before.systemPrompt === "string" ? before.systemPrompt : "";
  const sysB = typeof after.systemPrompt === "string" ? after.systemPrompt : "";
  if (sysB !== sysA) add(middle(sysA, sysB));
  const a = (Array.isArray(before.messages) ? before.messages : []).map((m) => textOf(m as Msg));
  const b = (Array.isArray(after.messages) ? after.messages : []).map((m) => textOf(m as Msg));
  const match = alignByText(a, b);
  // between two matched messages, unmatched ones pair up in order (an edited
  // message); the extra after-messages are new
  let prevA = -1;
  for (let j = 0; j < b.length; ) {
    if (match[j] != null) { prevA = match[j]!; j++; continue; }
    let k = j;
    while (k < b.length && match[k] == null) k++;
    const nextA = k < b.length ? match[k]! : a.length;
    const gapA = a.slice(prevA + 1, nextA);
    for (let x = j; x < k; x++) {
      const was = gapA[x - j];
      add(was != null ? middle(was, b[x]!) : b[x]!);
    }
    j = k;
  }
  return out;
}

/** The pieces of each insertion that none of the hook's own parts cover. */
export function uncovered(insertions: string[], own: SourcePart[]): string[] {
  const out: string[] = [];
  for (const ins of insertions) {
    let pieces = [ins];
    for (const p of own) {
      if (!p.text) continue;
      pieces = pieces.flatMap((piece) => piece.split(p.text));
    }
    for (const piece of pieces) if (/[\p{L}\p{N}]/u.test(piece)) out.push(piece.trim());
  }
  return out;
}

/** Molfar's system prompts and their parts, by the prompt's exact text: the agent
 *  builds a prompt once per instance, the request site only sees the string. */
const systemParts = new Map<string, SourcePart[]>();
const KEEP_PROMPTS = 32;

export function rememberSystemParts(prompt: string, parts: SourcePart[]): void {
  systemParts.delete(prompt);
  systemParts.set(prompt, parts);
  while (systemParts.size > KEEP_PROMPTS) systemParts.delete(systemParts.keys().next().value as string);
}

export function systemPartsFor(prompt: string | undefined): SourcePart[] | null {
  return (prompt && systemParts.get(prompt)) || null;
}

/**
 * Find each part's text in the request. `texts[0]` is the system prompt (may
 * be empty), the rest the messages in order. Parts are searched in order from
 * where the previous one ended, then anywhere unclaimed (long texts only).
 */
export function locateSources(src: PromptSources, system: string, messages: string[], estimate: number): LocatedSources {
  const texts = [system, ...messages];
  const claimed: [number, number][][] = texts.map(() => []);
  const free = (t: number, s: number, e: number) => claimed[t]!.every(([a, b]) => e <= a || s >= b);
  const findFrom = (needle: string, t0: number, off0: number, tEnd: number): [number, number] | null => {
    for (let t = t0; t < tEnd; t++) {
      const hay = texts[t]!;
      let at = hay.indexOf(needle, t === t0 ? off0 : 0);
      while (at >= 0) {
        if (free(t, at, at + needle.length)) return [t, at];
        at = hay.indexOf(needle, at + 1);
      }
    }
    return null;
  };
  let cur: [number, number] = [0, 0];
  const parts: LocatedSources["parts"] = [];
  const spans: LocatedSources["spans"] = [];
  let labeled = 0;
  src.parts.forEach((p, i) => {
    const tokens = p.text ? estimateTextTokens(p.text) : 0;
    let hit = p.text ? findFrom(p.text, cur[0], cur[1], texts.length) : null;
    if (!hit && p.text.length >= SHORT) hit = findFrom(p.text, 0, 0, texts.length);
    // a short text that is a whole message (a history turn like "Hi") is safe to match anywhere
    if (!hit && p.text) {
      const t = texts.findIndex((x, k) => x.trim() === p.text && free(k, x.indexOf(p.text), x.indexOf(p.text) + p.text.length));
      if (t >= 0) hit = [t, texts[t]!.indexOf(p.text)];
    }
    parts.push({ kind: p.kind, label: p.label, ...(p.detail ? { detail: p.detail } : {}), tokens, located: !!hit });
    if (!hit) return;
    const [t, at] = hit;
    claimed[t]!.push([at, at + p.text.length]);
    spans.push({ msg: t - 1, start: at, end: at + p.text.length, part: i });
    labeled += tokens;
    cur = [t, at + p.text.length];
  });
  spans.sort((x, y) => x.msg - y.msg || x.start - y.start);
  return { parts, spans, omitted: src.omitted, vars: src.vars, unlabeled: Math.max(0, estimate - labeled) };
}
