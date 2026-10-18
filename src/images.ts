/**
 * Image generation backends beyond the pi-ai images catalog (engine-level,
 * any app reaches them through POST /v1/images):
 *
 *  · NanoGPT — the user's NanoGPT connection key, endpoint fixed in code.
 *  · Image endpoints — user-configured servers: a local ComfyUI, a local
 *    AUTOMATIC1111 / Forge, or any OpenAI-compatible /images/generations.
 *    Definitions live in images.json beside the credentials (outside the
 *    workspace, written only by Settings); keys go to auth.json under
 *    "images/<id>", bound to the base URL they were saved for.
 *
 * Keys never leave the engine. Configured endpoints may be local (that is
 * what ComfyUI is), but never link-local: that is where cloud metadata
 * services live. Image URLs a provider hands back are fetched only from the
 * public internet or from the endpoint's own origin. Provider errors come
 * back as ImageError with a status the route passes on.
 */
import dns from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { randomBytes, randomInt } from "node:crypto";
import type { UserPaths } from "./paths.js";
import { readAuth, writeAuth } from "./connections.js";
import { assertInternetHost } from "./net-guard.js";

export type ImageEndpointKind = "comfyui" | "a1111" | "openai";
export const IMAGE_ENDPOINT_KINDS: readonly ImageEndpointKind[] = ["comfyui", "a1111", "openai"];

export interface ImageEndpointDef {
  name: string;
  kind: ImageEndpointKind;
  baseUrl: string;
  /** openai: the image model ids to offer (an OpenAI-compatible /models lists chat models too) */
  models?: string[];
  /** comfyui: an API-format workflow with %prompt%, %negative_prompt%, %model%, %width%, %height%, %seed%, %steps%, %cfg%,
   *  %sampler%, %scheduler%, %denoise%, %clip_skip%, %LORA_1%..%LORA_5% and %LORA_1_strength%..%LORA_5_strength% */
  workflow?: string;
  width?: number;
  height?: number;
  /** comfyui / a1111 sampling */
  steps?: number;
  cfg?: number;
  /** comfyui / a1111: always added to the negative prompt */
  negative?: string;
  /** comfyui / a1111: put in front of every prompt (quality tags and the like) */
  prefix?: string;
  /** comfyui / a1111: sampler and scheduler names as the server lists them */
  sampler?: string;
  scheduler?: string;
  /** comfyui / a1111: a fixed seed; absent = a new random one each picture */
  seed?: number;
  /** comfyui: denoise strength, 1 for text-to-image */
  denoise?: number;
  /** comfyui / a1111: skip the last CLIP layers (2 is common for anime checkpoints) */
  clipSkip?: number;
  /** comfyui / a1111: up to five LoRAs with their strength */
  loras?: ImageLora[];
  /** how prompts for this server are written; absent = tags for comfyui/a1111 */
  style?: ImagePromptStyle;
  /** extra guidance for whoever writes the prompt (Molfar, an app's describer) */
  instructions?: string;
}

export interface ImageLora {
  name: string;
  strength: number;
}

export type ImagePromptStyle = "tags" | "description";

export const MAX_LORAS = 5;

/** The prompt style a server's pictures want: its own setting, else tags for
 *  the tag-trained local servers. */
export function endpointPromptStyle(def: Pick<ImageEndpointDef, "kind" | "style">): ImagePromptStyle {
  return def.style ?? (def.kind === "openai" ? "description" : "tags");
}

export interface ImageEndpointInfo extends ImageEndpointDef {
  id: string;
  hasKey: boolean;
}

/** A failure with the HTTP status the image route should answer with. */
export class ImageError extends Error {
  constructor(message: string, readonly status: 400 | 401 | 402 | 404 | 429 | 502 | 504) {
    super(message);
  }
}

/** Fixed hosts. Tests point these at a mock server. */
export const imageHosts = { nanogpt: "https://nano-gpt.com" };

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const MAX_WORKFLOW_CHARS = 512 * 1024;
const LIST_TIMEOUT = 5_000;
/** Image generation is slow, not endless: the ten minutes the chat adapter allows. */
const GENERATE_TIMEOUT = 10 * 60_000;

// ---------- endpoints store (images.json + auth.json) ----------

function readEndpoints(p: UserPaths): Record<string, ImageEndpointDef> {
  try {
    const file = JSON.parse(fs.readFileSync(p.images, "utf8")) as { endpoints?: Record<string, ImageEndpointDef> };
    return file.endpoints ?? {};
  } catch {
    return {};
  }
}

function readImagesFile(p: UserPaths): Record<string, unknown> {
  try {
    const file = JSON.parse(fs.readFileSync(p.images, "utf8")) as unknown;
    return file && typeof file === "object" && !Array.isArray(file) ? (file as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Rewrites one key of images.json, keeping the others (endpoints, favorites). */
function writeImagesKey(p: UserPaths, key: string, value: unknown): void {
  const file = readImagesFile(p);
  if (value === undefined) delete file[key];
  else file[key] = value;
  fs.mkdirSync(path.dirname(p.images), { recursive: true });
  fs.writeFileSync(p.images, `${JSON.stringify(file, null, 2)}\n`);
}

function writeEndpoints(p: UserPaths, endpoints: Record<string, ImageEndpointDef>): void {
  writeImagesKey(p, "endpoints", endpoints);
}

/** One model on the user's shortlist (Settings > Images): its "provider/id",
 *  a name of their own and what it is for, which Molfar reads to pick. The
 *  first is the default for callers that name no model. */
export interface ImageFavorite {
  ref: string;
  name?: string;
  use?: string;
}

const MAX_FAVORITES = 30;
const REF = /^[^/\s]+\/\S+$/;

export function readImageFavorites(p: UserPaths): ImageFavorite[] {
  const v = validateImageFavorites(readImagesFile(p).favorites);
  return v.ok ? v.value : [];
}

export function validateImageFavorites(raw: unknown): { ok: true; value: ImageFavorite[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "favorites must be a list" };
  if (raw.length > MAX_FAVORITES) return { ok: false, error: `at most ${MAX_FAVORITES} favorites` };
  const out: ImageFavorite[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const f = item as { ref?: unknown; name?: unknown; use?: unknown } | null;
    if (!f || typeof f !== "object" || typeof f.ref !== "string" || f.ref.length > 300 || !REF.test(f.ref)) return { ok: false, error: "each favorite needs a provider/id ref" };
    if (f.name !== undefined && (typeof f.name !== "string" || f.name.length > 60)) return { ok: false, error: "a favorite's name is text up to 60 characters" };
    if (f.use !== undefined && (typeof f.use !== "string" || f.use.length > 120)) return { ok: false, error: "a favorite's use is text up to 120 characters" };
    if (seen.has(f.ref)) continue;
    seen.add(f.ref);
    const name = typeof f.name === "string" ? f.name.trim() : "";
    const use = typeof f.use === "string" ? f.use.trim() : "";
    out.push({ ref: f.ref, ...(name ? { name } : {}), ...(use ? { use } : {}) });
  }
  return { ok: true, value: out };
}

export function writeImageFavorites(p: UserPaths, favorites: ImageFavorite[]): void {
  writeImagesKey(p, "favorites", favorites.length ? favorites : undefined);
}

const authTarget = (id: string) => `images/${id}`;
const normalizeUrl = (u: string): string => u.trim().replace(/\/+$/, "");

/** The stored key only counts for the base URL it was saved against. */
function endpointKeyFor(p: UserPaths, id: string, def: ImageEndpointDef): string | undefined {
  const cred = readAuth(p)[authTarget(id)] as { key?: unknown; boundBaseUrl?: unknown } | undefined;
  if (!cred || typeof cred.key !== "string" || !cred.key) return undefined;
  if (typeof cred.boundBaseUrl !== "string" || normalizeUrl(cred.boundBaseUrl) !== normalizeUrl(def.baseUrl)) return undefined;
  return cred.key;
}

export function listImageEndpoints(p: UserPaths): ImageEndpointInfo[] {
  return Object.entries(readEndpoints(p))
    .map(([id, def]) => ({ id, ...def, hasKey: !!endpointKeyFor(p, id, def) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function imageEndpoint(p: UserPaths, id: string): { def: ImageEndpointDef; key?: string } | null {
  const def = readEndpoints(p)[id];
  if (!def) return null;
  const key = endpointKeyFor(p, id, def);
  return key ? { def, key } : { def };
}

/** An address a configured endpoint may never point at: link-local, where
 *  cloud metadata services answer. Loopback and the LAN are fine — a local
 *  ComfyUI is the point. */
function isLinkLocal(ip: string): boolean {
  const low = ip.toLowerCase();
  if (low.startsWith("::ffff:")) return isLinkLocal(low.slice("::ffff:".length));
  // two metadata services outside link-local: Alibaba's, and AWS's IPv6 one
  // (CGNAT as a whole stays allowed: Tailscale addresses live there)
  if (low === "100.100.100.200" || low === "fd00:ec2::254") return true;
  if (net.isIPv4(low)) return low.startsWith("169.254.");
  return /^fe[89ab]/.test(low);
}

function checkBaseUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (isLinkLocal(u.hostname.replace(/^\[|\]$/g, ""))) return null;
  return normalizeUrl(`${u.origin}${u.pathname}`);
}

/** Resolve the endpoint's host before each call: a name may not lead to a
 *  link-local address either. */
async function assertEndpointHost(url: string): Promise<void> {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  if (isLinkLocal(host)) throw new ImageError(`refused: ${host} is a link-local address`, 400);
  if (net.isIP(host)) return;
  let addrs: { address: string }[] = [];
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    return; // the fetch reports an unknown host
  }
  if (addrs.some((a) => isLinkLocal(a.address))) throw new ImageError(`refused: ${host} resolves to a link-local address`, 400);
}

type EndpointInput = {
  name?: unknown; kind?: unknown; baseUrl?: unknown; models?: unknown; workflow?: unknown;
  width?: unknown; height?: unknown; steps?: unknown; cfg?: unknown; negative?: unknown; key?: unknown;
  prefix?: unknown; sampler?: unknown; scheduler?: unknown; seed?: unknown; denoise?: unknown; clipSkip?: unknown;
  loras?: unknown; style?: unknown; instructions?: unknown;
};
type EndpointValue = Omit<ImageEndpointDef, "name" | "kind" | "baseUrl"> & { name?: string; kind?: ImageEndpointKind; baseUrl?: string; key?: string };

const intIn = (v: unknown, lo: number, hi: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v) : undefined;

/** Check untrusted input. `partial` (an update) lets every field be absent. */
export function validateImageEndpointInput(input: EndpointInput, partial = false): { ok: true; value: EndpointValue } | { ok: false; error: string } {
  const out: EndpointValue = {};
  if (input.name !== undefined || !partial) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name || name.length > 60) return { ok: false, error: "name must be 1-60 characters" };
    out.name = name;
  }
  if (input.kind !== undefined || !partial) {
    if (!IMAGE_ENDPOINT_KINDS.includes(input.kind as ImageEndpointKind)) return { ok: false, error: "kind must be comfyui, a1111 or openai" };
    out.kind = input.kind as ImageEndpointKind;
  }
  if (input.baseUrl !== undefined || !partial) {
    const baseUrl = typeof input.baseUrl === "string" ? checkBaseUrl(input.baseUrl.trim()) : null;
    if (!baseUrl) return { ok: false, error: "the address must be an http(s) URL (not a link-local one)" };
    out.baseUrl = baseUrl;
  }
  if (input.models !== undefined) {
    const list = Array.isArray(input.models) ? input.models : typeof input.models === "string" ? input.models.split(/[,\n]/) : null;
    if (!list) return { ok: false, error: "models must be a list of model ids" };
    const models = [...new Set(list.filter((m): m is string => typeof m === "string").map((m) => m.trim()).filter(Boolean))];
    if (models.length > 50 || models.some((m) => m.length > 200)) return { ok: false, error: "at most 50 model ids of up to 200 characters" };
    out.models = models;
  }
  if (input.workflow !== undefined) {
    const workflow = typeof input.workflow === "string" ? input.workflow.trim() : null;
    if (workflow === null || workflow.length > MAX_WORKFLOW_CHARS) return { ok: false, error: "the workflow must be text of at most 512 KB" };
    if (workflow) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(workflow);
      } catch {
        return { ok: false, error: "the workflow is not valid JSON (export it with Save (API Format))" };
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: "the workflow must be a JSON object in ComfyUI's API format" };
      if (!workflow.includes("%prompt%")) return { ok: false, error: "the workflow needs a %prompt% placeholder where the prompt goes" };
    }
    out.workflow = workflow;
  }
  for (const [field, lo, hi] of [["width", 64, 4096], ["height", 64, 4096], ["steps", 1, 150], ["cfg", 0, 30]] as const) {
    const v = input[field];
    if (v === undefined || v === null) continue;
    const n = field === "cfg" ? (typeof v === "number" && v >= lo && v <= hi ? Math.round(v * 10) / 10 : undefined) : intIn(v, lo, hi);
    if (n === undefined) return { ok: false, error: `${field} must be a number from ${lo} to ${hi}` };
    out[field] = n;
  }
  if (input.negative !== undefined) {
    if (typeof input.negative !== "string" || input.negative.length > 2000) return { ok: false, error: "the negative prompt must be text of at most 2000 characters" };
    out.negative = input.negative.trim();
  }
  for (const [field, max] of [["prefix", 2000], ["instructions", 1000]] as const) {
    const v = input[field];
    if (v === undefined) continue;
    if (v !== null && (typeof v !== "string" || v.length > max)) return { ok: false, error: `${field} must be text of at most ${max} characters` };
    out[field] = typeof v === "string" ? v.trim() : "";
  }
  for (const field of ["sampler", "scheduler"] as const) {
    const v = input[field];
    if (v === undefined) continue;
    if (v !== null && v !== "" && (typeof v !== "string" || !/^[\w.+ -]{1,60}$/.test(v))) return { ok: false, error: `${field} must be a name as the server lists it` };
    out[field] = typeof v === "string" ? v.trim() : "";
  }
  // a fixed seed, a denoise or a clip skip can be cleared again with null
  if (input.seed !== undefined) {
    const n = input.seed === null || input.seed === -1 ? null : intIn(input.seed, 0, 2 ** 47);
    if (n === undefined) return { ok: false, error: "seed must be -1 (random) or a number from 0" };
    out.seed = n ?? undefined;
  }
  if (input.denoise !== undefined) {
    const v = input.denoise;
    if (v !== null && !(typeof v === "number" && v >= 0 && v <= 1)) return { ok: false, error: "denoise must be a number from 0 to 1" };
    out.denoise = v === null ? undefined : Math.round(v * 100) / 100;
  }
  if (input.clipSkip !== undefined) {
    const n = input.clipSkip === null ? null : intIn(input.clipSkip, 0, 12);
    if (n === undefined) return { ok: false, error: "clip skip must be a number from 0 to 12" };
    out.clipSkip = n ? n : undefined;
  }
  if (input.loras !== undefined) {
    if (input.loras !== null && !Array.isArray(input.loras)) return { ok: false, error: "loras must be a list" };
    const list = (input.loras ?? []) as unknown[];
    const loras: ImageLora[] = [];
    for (const item of list) {
      const l = item as { name?: unknown; strength?: unknown } | null;
      const name = typeof l?.name === "string" ? l.name.trim() : "";
      if (!name) continue;
      const strength = l?.strength === undefined ? 1 : l.strength;
      if (name.length > 200 || /[<>]/.test(name) || typeof strength !== "number" || !Number.isFinite(strength) || strength < -5 || strength > 5) {
        return { ok: false, error: "each LoRA needs a file name and a strength from -5 to 5" };
      }
      loras.push({ name, strength: Math.round(strength * 100) / 100 });
    }
    if (loras.length > MAX_LORAS) return { ok: false, error: `at most ${MAX_LORAS} LoRAs` };
    out.loras = loras;
  }
  if (input.style !== undefined) {
    if (input.style !== null && input.style !== "" && input.style !== "tags" && input.style !== "description") return { ok: false, error: "style must be tags or description" };
    out.style = input.style === "tags" || input.style === "description" ? input.style : undefined;
  }
  if (input.key !== undefined) {
    const key = typeof input.key === "string" ? input.key.trim() : "";
    if (!key || key.length > 500) return { ok: false, error: "key must be non-empty when provided" };
    out.key = key;
  }
  return { ok: true, value: out };
}

function newEndpointId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "images";
  return `i_${slug}-${randomBytes(3).toString("hex")}`;
}

function cleanDef(def: ImageEndpointDef): ImageEndpointDef {
  const out: ImageEndpointDef = { name: def.name, kind: def.kind, baseUrl: def.baseUrl };
  if (def.kind === "openai" && def.models?.length) out.models = def.models;
  if (def.kind === "comfyui" && def.workflow) out.workflow = def.workflow;
  for (const k of ["width", "height"] as const) if (def[k] !== undefined) out[k] = def[k];
  if (def.kind !== "openai") {
    for (const k of ["steps", "cfg", "seed", "clipSkip"] as const) if (def[k] !== undefined) out[k] = def[k];
    for (const k of ["negative", "prefix", "sampler", "scheduler"] as const) if (def[k]) out[k] = def[k];
    if (def.loras?.length) out.loras = def.loras;
  }
  if (def.kind === "comfyui" && def.denoise !== undefined) out.denoise = def.denoise;
  if (def.style) out.style = def.style;
  if (def.instructions) out.instructions = def.instructions;
  return out;
}

export function createImageEndpoint(p: UserPaths, value: EndpointValue): ImageEndpointInfo {
  const endpoints = readEndpoints(p);
  let id = newEndpointId(value.name ?? "");
  while (endpoints[id]) id = newEndpointId(value.name ?? "");
  const { key, ...rest } = value;
  const def = cleanDef(rest as ImageEndpointDef);
  endpoints[id] = def;
  writeEndpoints(p, endpoints);
  if (key) {
    const auth = readAuth(p);
    auth[authTarget(id)] = { type: "api_key", key, boundBaseUrl: def.baseUrl };
    writeAuth(p, auth);
  }
  return { id, ...def, hasKey: !!key };
}

/** A changed address drops the stored key unless a new one comes with it:
 *  a key pasted for one server must not follow an edit to another. */
export function updateImageEndpoint(p: UserPaths, id: string, patch: EndpointValue & { clearKey?: boolean }): ImageEndpointInfo | null {
  const endpoints = readEndpoints(p);
  const old = endpoints[id];
  if (!old) return null;
  const { key, clearKey, ...rest } = patch;
  const def = cleanDef({ ...old, ...rest });
  endpoints[id] = def;
  writeEndpoints(p, endpoints);
  const auth = readAuth(p);
  if (key) auth[authTarget(id)] = { type: "api_key", key, boundBaseUrl: def.baseUrl };
  else if (clearKey || normalizeUrl(old.baseUrl) !== normalizeUrl(def.baseUrl)) delete auth[authTarget(id)];
  writeAuth(p, auth);
  return { id, ...def, hasKey: !!endpointKeyFor(p, id, def) };
}

export function deleteImageEndpoint(p: UserPaths, id: string): boolean {
  const endpoints = readEndpoints(p);
  if (!endpoints[id]) return false;
  delete endpoints[id];
  writeEndpoints(p, endpoints);
  const auth = readAuth(p);
  delete auth[authTarget(id)];
  writeAuth(p, auth);
  return true;
}

// ---------- HTTP plumbing ----------

/** Read a body up to `max` bytes; a bigger one is an error, not a truncation. */
async function readCapped(res: Response, max: number, who: string): Promise<Buffer> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > max) throw new ImageError(`${who} sent ${Math.round(declared / 1048576)} MB, more than the ${Math.round(max / 1048576)} MB allowed`, 502);
  if (!res.body) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  let size = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      throw new ImageError(`${who} sent more than the ${Math.round(max / 1048576)} MB allowed`, 502);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/** A JSON answer that carries a picture as base64 is a third bigger than the picture. */
const MAX_IMAGE_JSON_BYTES = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1024 * 1024;

async function readJson(res: Response, who: string, max = MAX_JSON_BYTES): Promise<unknown> {
  const buf = await readCapped(res, max, who);
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    throw new ImageError(`${who} answered with something that is not JSON`, 502);
  }
}

/** The provider's own words from an error body, short and without markup. */
function errorDetail(text: string): string {
  let said = "";
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    const e = j.error;
    const pick = (v: unknown): string => (typeof v === "string" ? v : "");
    said = pick((e as { message?: unknown } | undefined)?.message) || pick(e) || pick(j.message) || pick(j.detail) || pick((j.detail as { message?: unknown } | undefined)?.message);
    // ComfyUI: { error: { message, details }, node_errors }
    const details = pick((e as { details?: unknown } | undefined)?.details);
    if (details && !said.includes(details)) said = said ? `${said}: ${details}` : details;
  } catch {
    said = text.replace(/<[^>]*>/g, " ");
  }
  said = said.replace(/\s+/g, " ").trim();
  return said.length > 300 ? `${said.slice(0, 300)}…` : said;
}

/** A provider's HTTP refusal in plain words, with the status to pass on. */
export function providerError(who: string, status: number, body: string): ImageError {
  const detail = errorDetail(body);
  const tail = detail ? ` (${detail})` : "";
  if (status === 401 || status === 403) return new ImageError(`${who} refused the API key: check it in Settings${tail}`, 401);
  if (status === 402) return new ImageError(`${who} says the account has no credit left${tail}`, 402);
  if (status === 429) return new ImageError(`${who} is limiting requests: wait a moment and try again${tail}`, 429);
  if (status === 404) return new ImageError(`${who} does not know this model or address${tail}`, 404);
  if (status >= 400 && status < 500) return new ImageError(`${who} refused the request${tail}`, 400);
  return new ImageError(`${who} failed (${status})${tail}`, 502);
}

/** fetch with a deadline and no silent redirects; network failures become
 *  plain ImageErrors naming the server. */
async function call(url: string, init: RequestInit & { timeout: number; keepRedirect?: boolean }, who: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(init.timeout) });
  } catch (e) {
    const err = e as Error & { code?: string; cause?: { code?: string } };
    if (err.name === "TimeoutError" || err.name === "AbortError") throw new ImageError(`${who} did not answer within ${Math.round(init.timeout / 1000)} seconds`, 504);
    // Bun puts the code on the error, Node on its cause
    const code = err.code ?? err.cause?.code ?? "";
    if (code === "ECONNREFUSED" || code === "ConnectionRefused") throw new ImageError(`could not reach ${who} at ${new URL(url).origin}: is it running?`, 502);
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") throw new ImageError(`could not find ${who} at ${new URL(url).host}: check the address`, 502);
    throw new ImageError(`could not reach ${who}: ${err.message}`, 502);
  }
  if (res.status >= 300 && res.status < 400 && !init.keepRedirect) {
    await res.body?.cancel();
    throw new ImageError(`${who} redirected the request elsewhere: put the final address in Settings`, 502);
  }
  return res;
}

async function failUnlessOk(res: Response, who: string): Promise<void> {
  if (res.ok) return;
  const body = (await readCapped(res, 64 * 1024, who).catch(() => Buffer.alloc(0))).toString("utf8");
  throw providerError(who, res.status, body);
}

/** The picture's real type from its first bytes: only raster images the
 *  asset store and app pages can show (no SVG, no HTML error pages). */
export function sniffImage(buf: Buffer): string | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString("latin1", 0, 6))) return "image/gif";
  return null;
}

function toImage(buf: Buffer, who: string): { data: Buffer; mimeType: string } {
  const mimeType = sniffImage(buf);
  if (!mimeType) throw new ImageError(`${who} sent something that is not a picture`, 502);
  return { data: buf, mimeType };
}

function fromBase64(b64: string, who: string): { data: Buffer; mimeType: string } {
  const raw = b64.trim().replace(/^data:[^,]*,/, "");
  if (raw.length > (MAX_IMAGE_BYTES * 4) / 3 + 4) throw new ImageError(`${who} sent a picture over the size limit`, 502);
  return toImage(Buffer.from(raw, "base64"), who);
}

/** Download a picture a provider answered with a link to. Only the public
 *  internet, or the endpoint's own origin (a local server linking its own
 *  output); each redirect hop is checked again. */
async function downloadResult(link: string, who: string, ownOrigin: string | null): Promise<{ data: Buffer; mimeType: string }> {
  let url = link;
  for (let hop = 0; hop < 4; hop++) {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new ImageError(`${who} answered with a broken picture link`, 502);
    }
    if (u.username || u.password) throw new ImageError(`${who} answered with a picture link the engine will not open`, 502);
    if (u.origin !== ownOrigin) {
      if (u.protocol !== "https:") throw new ImageError(`${who} answered with a picture link the engine will not open (${u.protocol})`, 502);
      try {
        await assertInternetHost(u.hostname);
      } catch {
        throw new ImageError(`${who} answered with a picture link to a private address; refused`, 502);
      }
    }
    const res = await call(url, { timeout: 120_000, keepRedirect: true }, who);
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      await res.body?.cancel();
      if (!next) throw new ImageError(`${who} picture link redirected nowhere`, 502);
      url = new URL(next, url).toString();
      continue;
    }
    await failUnlessOk(res, who);
    return toImage(await readCapped(res, MAX_IMAGE_BYTES, who), who);
  }
  throw new ImageError(`${who} picture link redirected too many times`, 502);
}

// ---------- prompts ----------

/** Roleplay (and other apps written for single-prompt models) append the
 *  negative prompt as "(Avoid: …)". Diffusion backends have a real negative
 *  prompt: move it there. */
export function splitAvoid(prompt: string): { positive: string; negative: string } {
  const m = /\n\(Avoid: ([\s\S]*)\)\s*$/.exec(prompt);
  return m ? { positive: prompt.slice(0, m.index).trim(), negative: m[1]!.trim() } : { positive: prompt, negative: "" };
}

const joinNegative = (...parts: (string | undefined)[]): string => parts.map((s) => s?.trim()).filter(Boolean).join(", ");

// ---------- NanoGPT ----------

export interface ListedImageModel {
  id: string;
  label: string;
}

let nanoCache: { at: number; base: string; models: (ListedImageModel & { size?: string })[] } | null = null;

/** NanoGPT's image catalog (public; cached ten minutes). */
export async function nanoGptImageModels(): Promise<ListedImageModel[]> {
  const base = imageHosts.nanogpt;
  if (nanoCache && nanoCache.base === base && Date.now() - nanoCache.at < 10 * 60_000) return nanoCache.models;
  const who = "NanoGPT";
  const res = await call(`${base}/api/v1/image-models`, { timeout: 15_000 }, who);
  await failUnlessOk(res, who);
  const body = (await readJson(res, who)) as { data?: unknown };
  const models: (ListedImageModel & { size?: string })[] = [];
  for (const m of Array.isArray(body.data) ? body.data : []) {
    const r = m as { id?: unknown; name?: unknown; pricing?: { per_image?: Record<string, unknown> }; supported_parameters?: { resolutions?: unknown } };
    if (typeof r.id !== "string" || !r.id) continue;
    const sizes = Array.isArray(r.supported_parameters?.resolutions) ? r.supported_parameters.resolutions.filter((s): s is string => typeof s === "string") : [];
    const size = sizes.includes("1024x1024") ? "1024x1024" : sizes[0];
    const price = size ? r.pricing?.per_image?.[size] : undefined;
    const name = typeof r.name === "string" && r.name ? r.name : r.id;
    models.push({ id: r.id, label: typeof price === "number" ? `${name} · $${price}` : name, ...(size ? { size } : {}) });
  }
  nanoCache = { at: Date.now(), base, models };
  return models;
}

/** Answer of an OpenAI-shaped /images/generations: base64 or a link. */
async function readImagesAnswer(res: Response, who: string, ownOrigin: string | null): Promise<{ data: Buffer; mimeType: string }> {
  await failUnlessOk(res, who);
  const body = (await readJson(res, who, MAX_IMAGE_JSON_BYTES)) as { data?: { b64_json?: unknown; url?: unknown }[] };
  const first = body.data?.[0];
  if (typeof first?.b64_json === "string" && first.b64_json) return fromBase64(first.b64_json, who);
  if (typeof first?.url === "string" && first.url) {
    if (first.url.startsWith("data:")) return fromBase64(first.url, who);
    return downloadResult(first.url, who, ownOrigin);
  }
  throw new ImageError(`${who} answered without a picture`, 502);
}

export async function nanoGptGenerate(key: string, model: string, prompt: string): Promise<{ data: Buffer; mimeType: string }> {
  const who = "NanoGPT";
  const size = nanoCache?.models.find((m) => m.id === model)?.size;
  const res = await call(
    `${imageHosts.nanogpt}/v1/images/generations`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, n: 1, response_format: "b64_json", ...(size ? { size } : {}) }),
      timeout: GENERATE_TIMEOUT,
    },
    who,
  );
  return readImagesAnswer(res, who, null);
}

// ---------- configured endpoints ----------

/** The built-in text-to-image graph: checkpoint, then each LoRA in turn,
 *  then an optional CLIP skip, then the sampler. */
function defaultWorkflow(def: Pick<ImageEndpointDef, "loras" | "clipSkip">): Record<string, unknown> {
  const g: Record<string, unknown> = {
    "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "%model%" } },
    "5": { class_type: "EmptyLatentImage", inputs: { width: "%width%", height: "%height%", batch_size: 1 } },
    "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["4", 2] } },
    "9": { class_type: "SaveImage", inputs: { filename_prefix: "molfar", images: ["8", 0] } },
  };
  let model: [string, number] = ["4", 0];
  let clip: [string, number] = ["4", 1];
  (def.loras ?? []).forEach((_, i) => {
    const id = String(20 + i);
    g[id] = {
      class_type: "LoraLoader",
      inputs: { lora_name: `%LORA_${i + 1}%`, strength_model: `%LORA_${i + 1}_strength%`, strength_clip: `%LORA_${i + 1}_strength%`, model, clip },
    };
    model = [id, 0];
    clip = [id, 1];
  });
  if (def.clipSkip) {
    g["30"] = { class_type: "CLIPSetLastLayer", inputs: { stop_at_clip_layer: -def.clipSkip, clip } };
    clip = ["30", 0];
  }
  g["6"] = { class_type: "CLIPTextEncode", inputs: { text: "%prompt%", clip } };
  g["7"] = { class_type: "CLIPTextEncode", inputs: { text: "%negative_prompt%", clip } };
  g["3"] = {
    class_type: "KSampler",
    inputs: {
      seed: "%seed%", steps: "%steps%", cfg: "%cfg%", sampler_name: "%sampler%", scheduler: "%scheduler%", denoise: "%denoise%",
      model, positive: ["6", 0], negative: ["7", 0], latent_image: ["5", 0],
    },
  };
  return g;
}

/** Placeholder values for a ComfyUI workflow. Empty LoRA slots read "None",
 *  which rgthree's Lora Loader Stack and similar nodes take as "no LoRA". */
export function comfyVars(def: ImageEndpointDef, v: { positive: string; negative: string; model: string; width: number; height: number; seed: number; steps: number; cfg: number }): Record<string, string | number> {
  const vars: Record<string, string | number> = {
    "%prompt%": v.positive, "%negative_prompt%": v.negative, "%model%": v.model, "%width%": v.width, "%height%": v.height,
    "%seed%": v.seed, "%steps%": v.steps, "%cfg%": v.cfg,
    "%sampler%": def.sampler ?? "euler_ancestral", "%scheduler%": def.scheduler ?? "normal", "%denoise%": def.denoise ?? 1,
    "%clip_skip%": def.clipSkip ? -def.clipSkip : -1,
  };
  for (let i = 1; i <= MAX_LORAS; i++) {
    const l = def.loras?.[i - 1];
    vars[`%LORA_${i}%`] = l?.name ?? "None";
    vars[`%LORA_${i}_strength%`] = l?.strength ?? 1;
  }
  return vars;
}

/** The one entry a custom workflow without %model% offers: the workflow
 *  picks its own model. */
export const WORKFLOW_MODEL = "workflow";

/** Fill placeholders structurally: a string that IS a placeholder takes the
 *  value with its type (numbers stay numbers); one that contains it gets the
 *  text. The prompt never touches JSON syntax. */
function fillPlaceholders(value: unknown, vars: Record<string, string | number>): unknown {
  if (typeof value === "string") {
    if (Object.hasOwn(vars, value)) return vars[value];
    return value.replace(/%[A-Za-z0-9_]+%/g, (m) => (Object.hasOwn(vars, m) ? String(vars[m]) : m));
  }
  if (Array.isArray(value)) return value.map((v) => fillPlaceholders(v, vars));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillPlaceholders(v, vars)]));
  return value;
}

/** Models the endpoint offers. Throws an ImageError when it cannot be asked. */
export async function listEndpointModels(def: ImageEndpointDef, key?: string): Promise<ListedImageModel[]> {
  const who = def.name;
  const base = normalizeUrl(def.baseUrl);
  if (def.kind === "openai") return (def.models ?? []).map((id) => ({ id, label: id }));
  await assertEndpointHost(base);
  const auth = key ? { authorization: `Bearer ${key}` } : undefined;
  if (def.kind === "a1111") {
    const res = await call(`${base}/sdapi/v1/sd-models`, { timeout: LIST_TIMEOUT, ...(auth ? { headers: auth } : {}) }, who);
    await failUnlessOk(res, who);
    const list = (await readJson(res, who)) as { title?: unknown; model_name?: unknown }[];
    return (Array.isArray(list) ? list : [])
      .map((m) => (typeof m?.title === "string" ? m.title : typeof m?.model_name === "string" ? m.model_name : ""))
      .filter(Boolean)
      .map((id) => ({ id, label: id }));
  }
  // comfyui
  if (def.workflow && !def.workflow.includes("%model%")) return [{ id: WORKFLOW_MODEL, label: `${def.name} workflow` }];
  const res = await call(`${base}/object_info/CheckpointLoaderSimple`, { timeout: LIST_TIMEOUT, ...(auth ? { headers: auth } : {}) }, who);
  await failUnlessOk(res, who);
  const info = (await readJson(res, who)) as { CheckpointLoaderSimple?: { input?: { required?: { ckpt_name?: unknown[] } } } };
  const names = info.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
  return (Array.isArray(names) ? names : []).filter((n): n is string => typeof n === "string").map((id) => ({ id, label: id }));
}

export interface EndpointOptions {
  samplers: string[];
  schedulers: string[];
  loras: string[];
}

const names = (v: unknown): string[] => (Array.isArray(v) ? v.filter((n): n is string => typeof n === "string") : []);

/** The samplers, schedulers and LoRA files a local server offers, for the
 *  settings form. Empty lists for an OpenAI-compatible server. */
export async function listEndpointOptions(def: ImageEndpointDef, key?: string): Promise<EndpointOptions> {
  if (def.kind === "openai") return { samplers: [], schedulers: [], loras: [] };
  const who = def.name;
  const base = normalizeUrl(def.baseUrl);
  await assertEndpointHost(base);
  const init = { timeout: LIST_TIMEOUT, ...(key ? { headers: { authorization: `Bearer ${key}` } } : {}) };
  const get = async (path: string): Promise<unknown> => {
    const res = await call(`${base}${path}`, init, who);
    await failUnlessOk(res, who);
    return readJson(res, who);
  };
  if (def.kind === "a1111") {
    const [samplers, schedulers, loras] = await Promise.all([
      get("/sdapi/v1/samplers"),
      get("/sdapi/v1/schedulers").catch(() => []), // older Forge and A1111 builds have no scheduler list
      get("/sdapi/v1/loras").catch(() => []),
    ]);
    const field = (list: unknown, k: string) => (Array.isArray(list) ? list : []).map((x) => (x as Record<string, unknown>)?.[k]).filter((n): n is string => typeof n === "string");
    return { samplers: field(samplers, "name"), schedulers: field(schedulers, "name"), loras: field(loras, "name") };
  }
  const info = (await get("/object_info/KSampler")) as { KSampler?: { input?: { required?: Record<string, unknown[]> } } };
  const req = info.KSampler?.input?.required ?? {};
  const lora = (await get("/object_info/LoraLoader").catch(() => ({}))) as { LoraLoader?: { input?: { required?: Record<string, unknown[]> } } };
  return { samplers: names(req.sampler_name?.[0]), schedulers: names(req.scheduler?.[0]), loras: names(lora.LoraLoader?.input?.required?.lora_name?.[0]) };
}

export async function endpointGenerate(def: ImageEndpointDef, key: string | undefined, model: string, prompt: string): Promise<{ data: Buffer; mimeType: string }> {
  const who = def.name;
  const base = normalizeUrl(def.baseUrl);
  await assertEndpointHost(base);
  const auth: Record<string, string> = key ? { authorization: `Bearer ${key}` } : {};
  const width = def.width ?? 1024;
  const height = def.height ?? 1024;

  if (def.kind === "openai") {
    // gpt-image models always answer in base64 and reject response_format
    const res = await call(
      `${base}/images/generations`,
      {
        method: "POST",
        headers: { "content-type": "application/json", ...auth },
        body: JSON.stringify({ model, prompt, n: 1, size: `${width}x${height}`, ...(/^gpt-image/i.test(model) ? {} : { response_format: "b64_json" }) }),
        timeout: GENERATE_TIMEOUT,
      },
      who,
    );
    return readImagesAnswer(res, who, new URL(base).origin);
  }

  const { positive, negative } = splitAvoid(prompt);
  const neg = joinNegative(negative, def.negative);
  const steps = def.steps ?? 25;
  const cfg = def.cfg ?? 6;
  const seed = def.seed ?? randomInt(0, 2 ** 47);
  const lead = def.prefix?.trim();
  const pos = lead ? `${lead.replace(/,\s*$/, "")}, ${positive}` : positive;

  if (def.kind === "a1111") {
    const loraTags = (def.loras ?? []).map((l) => `<lora:${l.name}:${l.strength}>`).join(" ");
    const overrides: Record<string, unknown> = {
      ...(model ? { sd_model_checkpoint: model } : {}),
      ...(def.clipSkip ? { CLIP_stop_at_last_layers: def.clipSkip } : {}),
    };
    const res = await call(
      `${base}/sdapi/v1/txt2img`,
      {
        method: "POST",
        headers: { "content-type": "application/json", ...auth },
        body: JSON.stringify({
          prompt: loraTags ? `${pos} ${loraTags}` : pos, negative_prompt: neg, width, height, steps, cfg_scale: cfg, seed,
          sampler_name: def.sampler ?? "Euler a", ...(def.scheduler ? { scheduler: def.scheduler } : {}), batch_size: 1, n_iter: 1,
          ...(Object.keys(overrides).length ? { override_settings: overrides, override_settings_restore_afterwards: false } : {}),
        }),
        timeout: GENERATE_TIMEOUT,
      },
      who,
    );
    await failUnlessOk(res, who);
    const body = (await readJson(res, who, MAX_IMAGE_JSON_BYTES)) as { images?: unknown[] };
    const first = body.images?.[0];
    if (typeof first !== "string" || !first) throw new ImageError(`${who} answered without a picture`, 502);
    return fromBase64(first, who);
  }

  // comfyui: queue the workflow, wait for its history entry, fetch the file
  const started = Date.now();
  const graph = def.workflow ? (JSON.parse(def.workflow) as unknown) : defaultWorkflow(def);
  const filled = fillPlaceholders(graph, comfyVars(def, { positive: pos, negative: neg, model, width, height, seed, steps, cfg }));
  const queued = await call(
    `${base}/prompt`,
    { method: "POST", headers: { "content-type": "application/json", ...auth }, body: JSON.stringify({ prompt: filled, client_id: "molfar-vertep" }), timeout: 30_000 },
    who,
  );
  if (!queued.ok) {
    const text = (await readCapped(queued, 256 * 1024, who).catch(() => Buffer.alloc(0))).toString("utf8");
    if (queued.status === 400) throw new ImageError(`${who} refused the workflow (${errorDetail(text) || "bad workflow"})`, 400);
    throw providerError(who, queued.status, text);
  }
  const promptId = ((await readJson(queued, who)) as { prompt_id?: unknown }).prompt_id;
  if (typeof promptId !== "string" || !promptId) throw new ImageError(`${who} did not queue the workflow`, 502);
  for (;;) {
    if (Date.now() - started > GENERATE_TIMEOUT) {
      // a busy ComfyUI would still draw it later for nobody: take it off the queue
      await fetch(`${base}/queue`, {
        method: "POST", headers: { "content-type": "application/json", ...auth }, body: JSON.stringify({ delete: [promptId] }),
        redirect: "manual", signal: AbortSignal.timeout(5_000),
      }).catch(() => undefined);
      throw new ImageError(`${who} did not finish within ${GENERATE_TIMEOUT / 60_000} minutes (busy with other work?)`, 504);
    }
    await new Promise((r) => setTimeout(r, comfyPollMs));
    const res = await call(`${base}/history/${encodeURIComponent(promptId)}`, { timeout: 30_000, ...(key ? { headers: auth } : {}) }, who);
    // a refusal will not change by asking again; a hiccup might
    if (res.status === 401 || res.status === 403 || res.status === 404) await failUnlessOk(res, who);
    if (!res.ok) {
      await res.body?.cancel();
      continue;
    }
    const entry = ((await readJson(res, who)) as Record<string, ComfyHistory>)[promptId];
    if (!entry) continue;
    const status = entry.status;
    if (status?.status_str === "error") {
      const err = status.messages?.find((m) => Array.isArray(m) && m[0] === "execution_error")?.[1] as { exception_message?: string; node_type?: string } | undefined;
      const said = err?.exception_message?.trim().split("\n")[0]?.slice(0, 300);
      throw new ImageError(`${who} failed while drawing${err?.node_type ? ` in ${err.node_type}` : ""}${said ? `: ${said}` : ""}`, 502);
    }
    const file = Object.values(entry.outputs ?? {}).flatMap((o) => o.images ?? []).find((f) => f.type !== "temp") ??
      Object.values(entry.outputs ?? {}).flatMap((o) => o.images ?? [])[0];
    if (!file) {
      if (status?.completed) throw new ImageError(`${who} finished the workflow without a picture: it needs a SaveImage or PreviewImage node`, 502);
      continue;
    }
    const q = new URLSearchParams({ filename: file.filename, subfolder: file.subfolder ?? "", type: file.type ?? "output" });
    const img = await call(`${base}/view?${q}`, { timeout: 60_000, ...(key ? { headers: auth } : {}) }, who);
    await failUnlessOk(img, who);
    return toImage(await readCapped(img, MAX_IMAGE_BYTES, who), who);
  }
}

interface ComfyHistory {
  outputs?: Record<string, { images?: { filename: string; subfolder?: string; type?: string }[] }>;
  status?: { status_str?: string; completed?: boolean; messages?: unknown[][] };
}

/** How often ComfyUI's history is asked; tests shorten it. */
export let comfyPollMs = 1000;
export function setComfyPollMs(ms: number): void {
  comfyPollMs = ms;
}

/** Errors from the pi-ai images path read "401: {json}": the same plain words. */
export function mapCatalogError(message: string, who: string): ImageError | null {
  const m = /^(\d{3})\b[:\s]*([\s\S]*)$/.exec(message.trim());
  if (!m) return null;
  return providerError(who, Number(m[1]), m[2] ?? "");
}
