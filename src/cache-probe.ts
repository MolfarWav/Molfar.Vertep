/**
 * "Check the cache" for one model (Settings → model panel): the same prompt again and again, one
 * call after the other, and what the provider says it read from its cache after the first call.
 * A provider that spreads calls over several servers can miss once and hit the next time (GLM on
 * NanoGPT did), so a miss gets one more try before the check says "none".
 *
 * The calls run in turn, not at once: a provider writes its cache while it reads the first
 * request, so two parallel calls both miss. The prompt is about 2.5k tokens because providers
 * cache in blocks of about 1024 tokens and skip shorter prompts; a fresh line at its start keeps
 * an earlier check from warming it. The answer is capped at a few tokens, so a check takes
 * seconds and costs next to nothing.
 */
import type { GenerateRequest, GenerateResult } from "./models.js";

export interface CacheCall {
  /** The whole prompt: what the provider read fresh plus what it read from or wrote to its cache. */
  prompt: number;
  cacheRead: number;
  cacheWrite: number;
  ms: number;
}

export interface CacheProbeResult {
  model: string;
  /** cached: the second call read from the cache. none: it did not. silent: the provider reported no token counts at all. */
  verdict: "cached" | "none" | "silent";
  first: CacheCall;
  /** The last call: the first one that read from the cache, or the last try. */
  second: CacheCall;
  /** How many calls the check made (2 or 3). */
  calls: number;
}

const LINES = [
  "The archive keeps its records in the order they arrived, never in the order they matter.",
  "Every shelf carries a label written by hand, and every label names the season it was filled.",
  "A visitor who asks for a record by its title is told to ask by its season instead.",
  "The keeper walks the rows at dawn and at dusk, counting the boxes that moved during the day.",
  "When a box is missing, the keeper writes its number on a slate by the door and waits.",
  "Most boxes come back within a week; a few come back years later, heavier than they left.",
  "No one is allowed to open two boxes at once, because their papers would mix on the table.",
  "The lamps burn oil from the same press each year, so the smoke smells the same every winter.",
];

/** About 2.5k tokens of fixed text: numbered lines, so nothing in it changes between the two calls. */
export function probeText(nonce: string): string {
  const out = [`Cache check ${nonce}. Read the notes below; they are only there to make the prompt long enough to cache.`];
  for (let i = 0; i < 96; i++) out.push(`${i + 1}. ${LINES[i % LINES.length]}`);
  return out.join("\n");
}

const callOf = (r: GenerateResult, ms: number): CacheCall => {
  const u = r.usage;
  const cacheRead = Number(u?.cacheRead) || 0;
  const cacheWrite = Number(u?.cacheWrite) || 0;
  return { prompt: (Number(u?.input) || 0) + cacheRead + cacheWrite, cacheRead, cacheWrite, ms };
};

export function cacheVerdict(first: CacheCall, second: CacheCall): CacheProbeResult["verdict"] {
  if (second.cacheRead > 0) return "cached";
  if (first.prompt === 0 && second.prompt === 0) return "silent";
  return "none";
}

export async function cacheProbe(generate: (req: GenerateRequest) => Promise<GenerateResult>, model: string): Promise<CacheProbeResult> {
  const nonce = Math.random().toString(36).slice(2, 10);
  const req: GenerateRequest = {
    model,
    sessionId: `cache-check-${nonce}`,
    source: "engine:cache-check",
    paramsSource: "request",
    reasoning: "off",
    presetParams: { temperature: 0, max_tokens: 16 },
    messages: [
      { role: "system", content: probeText(nonce) },
      { role: "user", content: "Answer with one word: ready." },
    ],
  };
  const run = async (): Promise<CacheCall> => {
    const t0 = Date.now();
    const r = await generate(req);
    if (r.model === "error") throw new Error(r.error || "the model call failed");
    return callOf(r, Date.now() - t0);
  };
  const first = await run();
  let second = await run();
  let calls = 2;
  if (second.cacheRead === 0 && second.prompt > 0) {
    second = await run();
    calls = 3;
  }
  return { model, verdict: cacheVerdict(first, second), first, second, calls };
}
