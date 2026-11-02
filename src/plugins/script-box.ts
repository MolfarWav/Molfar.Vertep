/**
 * Script box: runs the small pieces of JavaScript an agent file carries (the Agents plugin's Script card) on a
 * sandbox of their own. Design and limits: .fork/handoff/script-card/DESIGN.md.
 *
 * Why a worker of its own: a script is the most hostile code the engine runs (an agent file comes from anyone).
 * A memory bomb or a deep recursion poisons the worker that runs it, and the shared plugin worker serves every
 * plugin. Here the damage is one respawn of a worker only scripts use. The worker starts on first use and is
 * disposed after SCRIPT_IDLE_MS, so nobody who never uses a script holds a second wasm heap.
 *
 * The author's code travels as data in `ctx`, never inside the module source. Before it runs the wrapper removes
 * what the guest would otherwise see (the sandbox's `env`, `process`, `__fs`, `Date`, timers) and seeds
 * `Math.random`, so the same reply gives the same result.
 */
import { PluginSandbox } from "./sandbox.js";

export const SCRIPT_LIMITS = {
  /** Characters of code in one script. */
  codeChars: 8000,
  /** Bytes of input JSON handed in. */
  inputBytes: 64 * 1024,
  /** Bytes of output JSON handed back. */
  outputBytes: 32 * 1024,
  /** QuickJS interrupt: CPU time of one call. */
  cpuMs: 500,
  /** Memory of one call. */
  memoryBytes: 16 * 1024 * 1024,
  /** Wall clock of one call before the worker is terminated (a memory bomb ignores cpuMs). */
  hardMs: 2500,
  /** Time all the scripts of one pass may use together; later ones answer that the budget is used up. */
  passMs: 2000,
  /** Scripts one pass may ask for. */
  perPass: 16,
} as const;

/** Worker is disposed this long after the last script. */
const SCRIPT_IDLE_MS = 60_000;

export type ScriptResult = { ok: true; value: Record<string, unknown> } | { ok: false; error: string };

/**
 * The one module the script worker loads. `run(ctx)` strips the guest's ambient capabilities, then runs the
 * author's code as the body of `function (input, seed)`. Everything it returns is checked to be a plain object of
 * at most `outputBytes` of JSON before it leaves the sandbox.
 */
export const SCRIPT_MODULE = `
const MAX_OUT = ${SCRIPT_LIMITS.outputBytes};
function seeded(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
export function run(ctx) {
  const code = ctx.code, input = ctx.input, seed = String(ctx.seed || "");
  const fn = new Function("input", "seed", '"use strict";\\n' + code);
  const g = globalThis;
  for (const k of ["env", "process", "__fs", "Date", "setTimeout", "setInterval", "setImmediate", "clearTimeout", "clearInterval", "clearImmediate", "performance", "fetch", "Request", "Response", "Headers", "EventTarget", "Event", "CustomEvent", "URL", "URLSearchParams", "Buffer", "TextEncoder", "TextDecoder", "__parseURL"]) {
    try { Object.defineProperty(g, k, { value: undefined, writable: false, configurable: false }); } catch (e) {}
  }
  const rnd = seeded(seed);
  try { Object.defineProperty(Math, "random", { value: rnd, writable: false, configurable: false }); } catch (e) {}
  const out = fn(input, seed);
  if (out === null || typeof out !== "object" || Array.isArray(out)) throw new Error("the script must return an object");
  const json = JSON.stringify(out);
  if (typeof json !== "string") throw new Error("the script returned something that is not plain data");
  if (json.length > MAX_OUT) throw new Error("the script returned more than " + MAX_OUT + " bytes");
  return JSON.parse(json);
}
`;

let box: PluginSandbox | null = null;
let idle: ReturnType<typeof setTimeout> | null = null;

function getBox(): PluginSandbox {
  box ??= new PluginSandbox();
  if (idle) clearTimeout(idle);
  idle = setTimeout(() => void disposeScriptBox(), SCRIPT_IDLE_MS);
  idle.unref?.();
  return box;
}

/** Stop the script worker now (tests, shutdown). The next script starts a fresh one. */
export async function disposeScriptBox(): Promise<void> {
  if (idle) clearTimeout(idle);
  idle = null;
  const b = box;
  box = null;
  await b?.dispose().catch(() => undefined);
}

/** A request as a plugin may send it: anything. Returns what is wrong with it, or null. */
function refusal(req: unknown): string | null {
  const r = req as { code?: unknown; input?: unknown; seed?: unknown } | null;
  if (!r || typeof r !== "object") return "a script request is { code, input, seed }";
  if (typeof r.code !== "string" || !r.code.trim()) return "the script has no code";
  if (r.code.length > SCRIPT_LIMITS.codeChars) return `the code is longer than ${SCRIPT_LIMITS.codeChars} characters`;
  if (r.input === null || typeof r.input !== "object" || Array.isArray(r.input)) return "the input must be an object";
  let json: string;
  try { json = JSON.stringify(r.input); } catch { return "the input is not plain data"; }
  if (json.length > SCRIPT_LIMITS.inputBytes) return `the input is larger than ${SCRIPT_LIMITS.inputBytes} bytes`;
  return null;
}

/** Run one script. Never throws; a failure is `{ ok: false, error }` in words the card can show. */
export async function runScript(req: unknown, label: string): Promise<ScriptResult> {
  const bad = refusal(req);
  if (bad) return { ok: false, error: bad };
  const r = req as { code: string; input: Record<string, unknown>; seed?: unknown };
  const res = await getBox().eval({
    source: SCRIPT_MODULE,
    hook: "run",
    ctx: { code: r.code, input: r.input, seed: typeof r.seed === "string" ? r.seed.slice(0, 200) : "" },
    storeSnapshot: {},
    storeAllowed: false,
    llmAllowed: false,
    executionTimeoutMs: SCRIPT_LIMITS.cpuMs,
    memoryLimitBytes: SCRIPT_LIMITS.memoryBytes,
    hardTimeoutMs: SCRIPT_LIMITS.hardMs,
    label,
  });
  if (res.ok) {
    const out = res.out;
    if (out && typeof out === "object" && !Array.isArray(out)) return { ok: true, value: out as Record<string, unknown> };
    return { ok: false, error: "the script returned no object" };
  }
  return { ok: false, error: scriptError(res.error ?? "the script failed") };
}

/** The sandbox's own words, shortened into something an author can act on. */
function scriptError(raw: string): string {
  if (/maximum allowed time|interrupted/i.test(raw)) return `the script ran longer than ${SCRIPT_LIMITS.cpuMs} ms`;
  if (/timed out/i.test(raw)) return `the script did not stop in ${SCRIPT_LIMITS.hardMs / 1000} s and was ended`;
  if (/out of memory|memory/i.test(raw)) return `the script used more than ${SCRIPT_LIMITS.memoryBytes / 1024 / 1024} MB`;
  if (/aborted|exited|worker error/i.test(raw)) return "the script crashed the sandbox and was ended";
  return raw.replace(/\s+/g, " ").slice(0, 300);
}

/**
 * The scripts one pass asked for, in order, within the pass budget. A script that starts after the budget is spent
 * is not run: it answers that, so a pass of 16 hostile scripts cannot hold a route for minutes.
 */
export async function runScripts(requests: { key: string; req: unknown }[], label: string): Promise<Record<string, ScriptResult>> {
  const out: Record<string, ScriptResult> = {};
  const started = Date.now();
  for (const { key, req } of requests.slice(0, SCRIPT_LIMITS.perPass)) {
    out[key] = Date.now() - started >= SCRIPT_LIMITS.passMs
      ? { ok: false, error: "the scripts of this run used up their time" }
      : await runScript(req, label);
  }
  return out;
}
