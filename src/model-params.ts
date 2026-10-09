// Parameters that belong to a model, not to a preset (0.9.2, .fork/handoff/v092/CONNECTIONS-SPEC.md).
// One entry per model ref in <workspace>/model-params.json, split into blocks by who calls the model:
// `chat` (an app's chat replies: plugin requests under the key "reply", and API callers), `plugins`
// (every other plugin call), `plugin:<app>/<plugin>` (one plugin, added on demand) and `molfar` (the
// built-in agent). A field that is absent is not sent. A block's fields win over the request's own,
// unless the request says `paramsSource: "request"`.

import fs from "node:fs";
import path from "node:path";

export const MODEL_PARAMS_FILE = "model-params.json";

export const REASONING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
export type ReasoningLevel = (typeof REASONING_LEVELS)[number];

export interface ParamBlock {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  min_p?: number;
  repetition_penalty?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
  max_tokens?: number;
  reasoning?: ReasoningLevel;
  thinkingBudget?: number;
  reasoningTags?: { open: string; close: string };
  /** Custom JSON, merged last into the sampling params. */
  params?: Record<string, unknown>;
  /** Extra request headers (no credentials). */
  headers?: Record<string, string>;
}

export type ModelParamsEntry = Record<string, ParamBlock>;
export interface ModelParamsFile {
  v: 1;
  models: Record<string, ModelParamsEntry>;
}

/** [min, max, integer] per numeric sampler. */
const NUMERIC: Record<string, [number, number, boolean]> = {
  temperature: [0, 2, false],
  top_p: [0, 1, false],
  top_k: [0, 100_000, true],
  min_p: [0, 1, false],
  repetition_penalty: [0, 3, false],
  frequency_penalty: [-2, 2, false],
  presence_penalty: [-2, 2, false],
  seed: [-2_147_483_648, 2_147_483_647, true],
  max_tokens: [1, 1_000_000, true],
  thinkingBudget: [0, 1_000_000, true],
};
/** Sampler keys sent as sampling params (temperature and max_tokens have their own options). */
export const SAMPLER_KEYS = ["top_p", "top_k", "min_p", "repetition_penalty", "frequency_penalty", "presence_penalty", "seed"] as const;
/** What plugin blocks may hold: the short set. */
const SHORT = new Set(["temperature", "max_tokens", "reasoning", "thinkingBudget", "params"]);
const BLOCK_NAME = /^(chat|plugins|molfar|plugin:[a-z0-9][a-z0-9_.-]{0,63}\/[a-z0-9][a-z0-9_.-]{0,63})$/;
const HEADER_NAME = /^[A-Za-z0-9-]{1,64}$/;
/** Headers that carry credentials or transport: never set from here. */
const HEADER_DENY = /^(authorization|cookie|set-cookie|host|content-length|content-type|connection|transfer-encoding|x-api-key|api-key|x-goog-api-key|anthropic-api-key|proxy-.*)$/i;
const PARAMS_MAX = 4096;

export class ModelParamsError extends Error {}

/** One block, checked and cleaned; throws ModelParamsError with a message for the user. */
export function validateBlock(name: string, raw: unknown): ParamBlock {
  if (!BLOCK_NAME.test(name)) throw new ModelParamsError(`unknown block "${name}"`);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ModelParamsError(`block "${name}" must be an object`);
  const short = name !== "chat" && name !== "molfar";
  const out: ParamBlock = {};
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    if (short && !SHORT.has(key)) throw new ModelParamsError(`"${key}" is not a plugin parameter (plugins take temperature, max_tokens, reasoning, thinkingBudget, params)`);
    const range = NUMERIC[key];
    if (range) {
      const n = Number(v);
      const [lo, hi, int] = range;
      if (typeof v === "boolean" || !Number.isFinite(n) || n < lo || n > hi || (int && !Number.isInteger(n))) {
        throw new ModelParamsError(`${key} must be ${int ? "a whole number" : "a number"} from ${lo} to ${hi}`);
      }
      (out as Record<string, number>)[key] = n;
    } else if (key === "reasoning") {
      if (!REASONING_LEVELS.includes(v as ReasoningLevel)) throw new ModelParamsError(`reasoning must be one of ${REASONING_LEVELS.join(", ")}`);
      out.reasoning = v as ReasoningLevel;
    } else if (key === "reasoningTags") {
      const t = v as { open?: unknown; close?: unknown };
      if (typeof t !== "object" || typeof t.open !== "string" || typeof t.close !== "string" || !t.open || !t.close || t.open.length > 64 || t.close.length > 64) {
        throw new ModelParamsError("reasoningTags needs open and close tags (up to 64 characters each)");
      }
      out.reasoningTags = { open: t.open, close: t.close };
    } else if (key === "params") {
      if (typeof v !== "object" || Array.isArray(v)) throw new ModelParamsError("custom parameters must be a JSON object");
      if (JSON.stringify(v).length > PARAMS_MAX) throw new ModelParamsError(`custom parameters are limited to ${PARAMS_MAX} characters`);
      if (Object.keys(v as object).length) out.params = v as Record<string, unknown>;
    } else if (key === "headers") {
      if (typeof v !== "object" || Array.isArray(v)) throw new ModelParamsError("headers must be a JSON object of strings");
      const entries = Object.entries(v as Record<string, unknown>);
      if (entries.length > 16) throw new ModelParamsError("at most 16 headers");
      const headers: Record<string, string> = {};
      for (const [h, hv] of entries) {
        if (!HEADER_NAME.test(h)) throw new ModelParamsError(`"${h}" is not a header name`);
        if (HEADER_DENY.test(h)) throw new ModelParamsError(`"${h}" is not allowed here: credentials and transport headers belong to the connection`);
        if (typeof hv !== "string" || hv.length > 512 || /[\r\n]/.test(hv)) throw new ModelParamsError(`header "${h}" needs a one-line string value (up to 512 characters)`);
        headers[h] = hv;
      }
      if (entries.length) out.headers = headers;
    } else {
      throw new ModelParamsError(`unknown parameter "${key}"`);
    }
  }
  return out;
}

/** A model's blocks, checked; empty blocks are dropped. */
export function validateEntry(raw: unknown): ModelParamsEntry {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ModelParamsError("blocks must be an object");
  const out: ModelParamsEntry = {};
  for (const [name, block] of Object.entries(raw as Record<string, unknown>)) {
    const clean = validateBlock(name, block);
    if (Object.keys(clean).length) out[name] = clean;
  }
  return out;
}

const VALID_REF = (ref: string) => ref.length <= 300 && ref.includes("/") && !/[\r\n]/.test(ref);

/** The file as stored; anything that no longer validates is left out (a hand edit never breaks a generation). */
export function readModelParams(root: string): ModelParamsFile {
  const out: ModelParamsFile = { v: 1, models: {} };
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(root, MODEL_PARAMS_FILE), "utf8"));
  } catch {
    return out;
  }
  const models = raw && typeof raw === "object" ? (raw as { models?: unknown }).models : null;
  if (!models || typeof models !== "object") return out;
  for (const [ref, entry] of Object.entries(models as Record<string, unknown>)) {
    if (!VALID_REF(ref) || !entry || typeof entry !== "object") continue;
    const clean: ModelParamsEntry = {};
    for (const [name, block] of Object.entries(entry as Record<string, unknown>)) {
      try {
        const b = validateBlock(name, block);
        if (Object.keys(b).length) clean[name] = b;
      } catch {
        // one bad block drops only itself
      }
    }
    if (Object.keys(clean).length) out.models[ref] = clean;
  }
  return out;
}

/** Replace (or remove with null) one model's entry. Throws ModelParamsError on bad input. */
export function writeModelParams(root: string, ref: string, blocks: unknown): ModelParamsFile {
  if (typeof ref !== "string" || !VALID_REF(ref)) throw new ModelParamsError("model must be a provider/model ref");
  const file = readModelParams(root);
  const entry = blocks == null ? {} : validateEntry(blocks);
  if (Object.keys(entry).length) file.models[ref] = entry;
  else delete file.models[ref];
  fs.writeFileSync(path.join(root, MODEL_PARAMS_FILE), JSON.stringify(file, null, 2));
  return file;
}

/** Who is calling, as generate() knows it. */
export interface ParamsCaller {
  /** GenerateRequest.source: "agent", "agent-compact", "app:<app>/<plugin>", "api:..." */
  source?: string;
  /** The plugin's own key for the request ("reply", "translation", "lit_...") */
  key?: string;
}

/**
 * The block name of one plugin from its llm source: "app:roleplay/roleplay__relations" (an app's
 * plugin, whose id carries the app's prefix) -> "plugin:roleplay/relations"; "app:notes" (a plugin of
 * the user's own, outside any app) -> "plugin:user/notes".
 */
export function pluginBlockName(source: string): string {
  const rest = source.replace(/^app:/, "").toLowerCase();
  const slash = rest.indexOf("/");
  if (slash < 0) return `plugin:user/${rest}`;
  const app = rest.slice(0, slash);
  const id = rest.slice(slash + 1);
  return `plugin:${app}/${id.startsWith(`${app}__`) ? id.slice(app.length + 2) : id}`;
}

/** The block name a call takes, and the blocks to try in order. */
export function blockFor(entry: ModelParamsEntry | undefined, caller: ParamsCaller): string | null {
  const src = caller.source ?? "";
  const pick = (...names: string[]) => names.find((n) => entry?.[n]) ?? null;
  if (src === "agent" || src === "agent-compact") return pick("molfar");
  if (src.startsWith("app:")) {
    if (caller.key === "reply") return pick("chat");
    return pick(pluginBlockName(src), "plugins");
  }
  return pick("chat");
}

/** The values a block name stands for: a plugin's own block falls back field by field to `plugins`. */
export function blockValues(entry: ModelParamsEntry | undefined, name: string | null): ParamBlock | undefined {
  if (!entry || !name) return undefined;
  if (name.startsWith("plugin:")) return { ...entry.plugins, ...entry[name] };
  return entry[name];
}

export type ParamSource = "model" | "request";

export interface AppliedParams {
  block: string | null;
  temperature?: number;
  max_tokens?: number;
  reasoning?: string;
  thinkingBudget?: number;
  params?: Record<string, unknown>;
  reasoningTags?: { open: string; close: string };
  headers?: Record<string, string>;
  /** Where each applied value came from. */
  from: Record<string, ParamSource>;
}

interface RequestSide {
  presetParams?: { temperature?: number; max_tokens?: number; params?: Record<string, unknown> };
  reasoning?: string;
  thinkingBudget?: number;
  reasoningTags?: { open: string; close: string };
  paramsSource?: string;
}

/**
 * Merge a block into what the request asked for. The block wins field by field unless the request
 * says paramsSource "request"; the request fills what the block leaves out. Custom `params` merge
 * after the block's samplers, so a key the user typed there is the last word.
 */
export function mergeParams(block: ParamBlock | undefined, blockName: string | null, req: RequestSide): AppliedParams {
  const requestWins = req.paramsSource === "request";
  const from: Record<string, ParamSource> = {};
  const out: AppliedParams = { block: block ? blockName : null, from };
  const take = <T>(name: string, mine: T | undefined, theirs: T | undefined): T | undefined => {
    const first = requestWins ? theirs : mine;
    const second = requestWins ? mine : theirs;
    if (first !== undefined) {
      from[name] = requestWins ? "request" : "model";
      return first;
    }
    if (second !== undefined) {
      from[name] = requestWins ? "model" : "request";
      return second;
    }
    return undefined;
  };
  const b = block ?? {};
  const pp = req.presetParams ?? {};
  const t = take("temperature", b.temperature, pp.temperature);
  if (t !== undefined) out.temperature = t;
  const mt = take("max_tokens", b.max_tokens, pp.max_tokens);
  if (mt !== undefined) out.max_tokens = mt;
  const r = take("reasoning", b.reasoning, req.reasoning);
  if (r !== undefined) out.reasoning = r;
  const tb = take("thinkingBudget", b.thinkingBudget, req.thinkingBudget);
  if (tb !== undefined) out.thinkingBudget = tb;
  const tags = take("reasoningTags", b.reasoningTags, req.reasoningTags);
  if (tags !== undefined) out.reasoningTags = tags;

  const blockSamplers: Record<string, unknown> = {};
  for (const k of SAMPLER_KEYS) if (b[k] !== undefined) blockSamplers[k] = b[k];
  const mine = { ...blockSamplers, ...(b.params ?? {}) };
  const theirs = { ...(pp.params ?? {}) };
  const params = requestWins ? { ...mine, ...theirs } : { ...theirs, ...mine };
  for (const k of Object.keys(params)) from[k] = k in (requestWins ? theirs : mine) ? (requestWins ? "request" : "model") : requestWins ? "model" : "request";
  if (Object.keys(params).length) out.params = params;
  if (b.headers && Object.keys(b.headers).length) out.headers = { ...b.headers };
  return out;
}
