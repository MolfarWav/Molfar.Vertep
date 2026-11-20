/**
 * Image backends beyond the pi-ai catalog, each against a mock server on
 * 127.0.0.1: NanoGPT (fixed host pointed at the mock), ComfyUI, AUTOMATIC1111
 * and a generic OpenAI-compatible endpoint. Checks the wire shapes, that keys
 * go only where they were saved for, that provider errors come back in plain
 * words with the right status, and the address rules.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ImageError, clearNanoGptCache, nearestListedSize, parseImageAspect, shapeSize, comfyVars, createImageEndpoint, endpointGenerate, endpointPromptStyle, listEndpointOptions, imageEndpoint, imageHosts, listEndpointModels, listImageEndpoints,
  geminiGenerate, geminiImageModels, nanoGptGenerate, nanoGptImageModels, providerError, imageErrorBody, setComfyPollMs, setRunpodPollMs, runpodEndpointId, splitAvoid, updateImageEndpoint, validateImageEndpointInput,
  type ImageEndpointDef,
} from "../src/images.js";
import { UserModelService, defaultImageModel, type ImageModelInfo } from "../src/models.js";
import { adaptComfyWorkflow, deleteImageEndpoint, readImageFavorites, validateImageFavorites, writeImageFavorites } from "../src/images.js";
import { buildApp } from "../src/server/app.js";
import { EventBus } from "../src/server/ws.js";
import { SessionService } from "../src/sessions.js";
import { UserService } from "../src/users.js";
import { defaultInstanceConfig } from "../src/config.js";
import { bootstrapUserDir } from "../src/paths.js";

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("rest-of-png")]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type Seen = { method: string; path: string; auth: string | null; body: unknown };
let seen: Seen[] = [];
/** What the mock answers: set per test, keyed by "METHOD /path". */
let routes: Record<string, (req: Request, body: unknown) => Response | Promise<Response>> = {};
let server: ReturnType<typeof Bun.serve>;
let base: string;
let dataDir: string;

beforeAll(() => {
  setComfyPollMs(5);
  setRunpodPollMs(5);
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "images-test-"));
  server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const u = new URL(req.url);
      const text = req.method === "GET" ? "" : await req.text();
      let body: unknown = text;
      try { body = text ? JSON.parse(text) : null; } catch { /* raw */ }
      seen.push({ method: req.method, path: u.pathname + u.search, auth: req.headers.get("authorization"), body });
      const handler = routes[`${req.method} ${u.pathname}`];
      return handler ? handler(req, body) : new Response("not found", { status: 404 });
    },
  });
  base = `http://127.0.0.1:${server.port}`;
  imageHosts.nanogpt = base;
  imageHosts.runpod = base;
});
afterAll(() => {
  server.stop(true);
  try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* ignore */ }
});
const reset = (r: typeof routes) => { seen = []; routes = r; };

async function rejects(p: Promise<unknown>): Promise<ImageError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ImageError);
    return e as ImageError;
  }
  throw new Error("expected a rejection");
}

describe("image endpoint input and storage", () => {
  it("refuses link-local addresses, credentials in the URL and broken workflows", () => {
    const ok = { name: "Comfy", kind: "comfyui", baseUrl: "http://127.0.0.1:8188/" };
    expect(validateImageEndpointInput(ok)).toMatchObject({ ok: true, value: { baseUrl: "http://127.0.0.1:8188" } });
    for (const baseUrl of ["http://169.254.169.254", "http://[fe80::1]:80", "file:///etc", "http://u:p@host", "nope"]) {
      expect(validateImageEndpointInput({ ...ok, baseUrl }).ok, baseUrl).toBe(false);
    }
    expect(validateImageEndpointInput({ ...ok, kind: "midjourney" }).ok).toBe(false);
    expect(validateImageEndpointInput({ ...ok, workflow: "{not json" }).ok).toBe(false);
    expect(validateImageEndpointInput({ ...ok, workflow: '{"1":{"inputs":{}}}' }).ok).toBe(false); // no %prompt%
    expect(validateImageEndpointInput({ ...ok, workflow: '{"1":{"inputs":{"text":"%prompt%"}}}' }).ok).toBe(true);
    expect(validateImageEndpointInput({ ...ok, width: 10 }).ok).toBe(false);
    expect(validateImageEndpointInput({ name: "x" }, true)).toEqual({ ok: true, value: { name: "x" } });
  });

  it("a key stays with the address it was saved for and never appears in a listing", () => {
    const p = bootstrapUserDir(dataDir, "store");
    const v = validateImageEndpointInput({ name: "Images", kind: "openai", baseUrl: "https://api.example.com/v1", models: "a, b,,a", key: "sk-secret" });
    if (!v.ok) throw new Error(v.error);
    const ep = createImageEndpoint(p, v.value);
    expect(ep.models).toEqual(["a", "b"]);
    expect(JSON.stringify(listImageEndpoints(p))).not.toContain("sk-secret");
    expect(fs.readFileSync(p.images, "utf8")).not.toContain("sk-secret");
    expect(imageEndpoint(p, ep.id)?.key).toBe("sk-secret");
    // a changed address drops the key
    updateImageEndpoint(p, ep.id, { baseUrl: "https://evil.example.com/v1" });
    expect(imageEndpoint(p, ep.id)?.key).toBeUndefined();
    expect(listImageEndpoints(p)[0]?.hasKey).toBe(false);
    // and moving back does not bring it back: it was removed
    updateImageEndpoint(p, ep.id, { baseUrl: "https://api.example.com/v1" });
    expect(imageEndpoint(p, ep.id)?.key).toBeUndefined();
  });

  it("moves an '(Avoid: …)' tail into the negative prompt", () => {
    expect(splitAvoid("a cat\n(Avoid: blur, text)")).toEqual({ positive: "a cat", negative: "blur, text" });
    expect(splitAvoid("a cat (Avoid: nothing)")).toEqual({ positive: "a cat (Avoid: nothing)", negative: "" });
  });
});

describe("provider errors in plain words", () => {
  it("maps statuses", () => {
    expect(providerError("X", 401, '{"error":{"message":"User not found."}}')).toMatchObject({ status: 401, message: "X refused the API key: check it in Settings (User not found.)" });
    expect(providerError("X", 402, "").status).toBe(402);
    expect(providerError("X", 429, "").status).toBe(429);
    expect(providerError("X", 422, "<html><b>bad</b></html>").message).toBe("X refused the request (bad)");
    expect(providerError("X", 500, "").status).toBe(502);
  });

  it("carries a code and the pieces, so the shell can say it in the user's language", () => {
    expect(providerError("X", 401, '{"error":{"message":"User not found."}}')).toMatchObject({ code: "key", vars: { who: "X", detail: "User not found." } });
    expect(providerError("X", 402, "").code).toBe("credit");
    expect(providerError("X", 429, "").code).toBe("rate");
    expect(providerError("X", 404, "").code).toBe("unknown_model");
    expect(providerError("X", 422, "").code).toBe("refused");
    expect(providerError("X", 503, "")).toMatchObject({ code: "failed", vars: { who: "X", status: 503 } });
  });

  it("answers with the English text, plus the code when there is one", () => {
    expect(imageErrorBody(providerError("X", 402, ""))).toEqual({ error: "X says the account has no credit left", code: "credit", vars: { who: "X", detail: "" } });
    expect(imageErrorBody(new Error("boom"))).toEqual({ error: "boom" });
  });
});

describe("ComfyUI", () => {
  const def: ImageEndpointDef = { name: "Comfy", kind: "comfyui", baseUrl: "", width: 832, height: 1216, steps: 28, cfg: 5.5, negative: "lowres" };

  it("lists checkpoints and draws through the default workflow", async () => {
    def.baseUrl = base;
    let polls = 0;
    reset({
      "GET /object_info/CheckpointLoaderSimple": () => json({ CheckpointLoaderSimple: { input: { required: { ckpt_name: [["waiIllustrious.safetensors", "SDXL\\anima.safetensors"]] } } } }),
      "POST /prompt": () => json({ prompt_id: "p1", number: 1 }),
      "GET /history/p1": () => (++polls < 2 ? json({}) : json({ p1: { status: { status_str: "success", completed: true }, outputs: { "9": { images: [{ filename: "molfar_0001.png", subfolder: "", type: "output" }] } } } })),
      "GET /view": () => new Response(PNG, { headers: { "content-type": "image/png" } }),
    });
    expect(await listEndpointModels(def)).toEqual([
      { id: "waiIllustrious.safetensors", label: "waiIllustrious.safetensors" },
      { id: "SDXL\\anima.safetensors", label: "SDXL\\anima.safetensors" },
    ]);
    const out = await endpointGenerate(def, undefined, "waiIllustrious.safetensors", 'a "quoted" fox\n(Avoid: blur)');
    expect(out.mimeType).toBe("image/png");
    expect(out.data.equals(PNG)).toBe(true);
    const graph = (seen.find((s) => s.path === "/prompt")!.body as { prompt: Record<string, { inputs: Record<string, unknown> }> }).prompt;
    expect(graph["4"]!.inputs.ckpt_name).toBe("waiIllustrious.safetensors");
    expect(graph["6"]!.inputs.text).toBe('a "quoted" fox');
    expect(graph["7"]!.inputs.text).toBe("blur, lowres");
    expect(graph["5"]!.inputs).toMatchObject({ width: 832, height: 1216 });
    expect(graph["3"]!.inputs).toMatchObject({ steps: 28, cfg: 5.5 });
    expect(typeof graph["3"]!.inputs.seed).toBe("number");
    expect(seen.find((s) => s.path.startsWith("/view"))!.path).toContain("filename=molfar_0001.png");
  });

  it("a custom workflow without %model% offers itself as the one model", async () => {
    const custom = { ...def, baseUrl: base, workflow: JSON.stringify({ "1": { class_type: "X", inputs: { text: "%prompt%" } } }) };
    expect(await listEndpointModels(custom)).toEqual([{ id: "workflow", label: "Comfy workflow" }]);
  });

  it("a refused workflow and a failed run come back in plain words", async () => {
    reset({ "POST /prompt": () => json({ error: { type: "prompt_outputs_failed_validation", message: "Prompt outputs failed validation", details: "Value not in list: ckpt_name" }, node_errors: {} }, 400) });
    const e1 = await rejects(endpointGenerate({ ...def, baseUrl: base }, undefined, "missing.safetensors", "x"));
    expect(e1.status).toBe(400);
    expect(e1.message).toContain("Value not in list: ckpt_name");
    reset({
      "POST /prompt": () => json({ prompt_id: "p2" }),
      "GET /history/p2": () => json({ p2: { status: { status_str: "error", completed: false, messages: [["execution_error", { node_type: "KSampler", exception_message: "CUDA out of memory.\nTried to allocate" }]] }, outputs: {} } }),
    });
    const e2 = await rejects(endpointGenerate({ ...def, baseUrl: base }, undefined, "m", "x"));
    expect(e2).toMatchObject({ status: 502, message: "Comfy failed while drawing in KSampler: CUDA out of memory." });
  });

  it("a server that is not running is named, not a stack trace", async () => {
    const e = await rejects(listEndpointModels({ ...def, baseUrl: "http://127.0.0.1:9" }));
    expect(e.status).toBe(502);
    expect(e.message).toBe("could not reach Comfy at http://127.0.0.1:9: is it running?");
  });

  it("an answer that is not a picture is refused", async () => {
    reset({
      "POST /prompt": () => json({ prompt_id: "p3" }),
      "GET /history/p3": () => json({ p3: { status: { completed: true }, outputs: { "9": { images: [{ filename: "a.png" }] } } } }),
      "GET /view": () => new Response("<svg onload=alert(1)>", { headers: { "content-type": "image/png" } }),
    });
    expect((await rejects(endpointGenerate({ ...def, baseUrl: base }, undefined, "m", "x"))).message).toBe("Comfy sent something that is not a picture");
  });
});

describe("ComfyUI on RunPod Serverless (#471)", () => {
  const rp = (): ImageEndpointDef => ({ name: "Pod", kind: "comfyui", baseUrl: `${base}/v2/ep123`, models: ["illustrious.safetensors"], width: 832, height: 1216 });
  const done = (output: unknown) => json({ id: "j1", status: "COMPLETED", output });

  it("the address says it is RunPod: only ComfyUI, only the RunPod host, only /v2/<id>", () => {
    expect(runpodEndpointId(rp())).toBe("ep123");
    expect(runpodEndpointId({ kind: "comfyui", baseUrl: `${base}/v2/ep123/` })).toBe("ep123");
    expect(runpodEndpointId({ kind: "a1111", baseUrl: `${base}/v2/ep123` })).toBeNull();
    expect(runpodEndpointId({ kind: "comfyui", baseUrl: base })).toBeNull();
    expect(runpodEndpointId({ kind: "comfyui", baseUrl: `${base}/v2/ep123/extra` })).toBeNull();
    expect(runpodEndpointId({ kind: "comfyui", baseUrl: "http://127.0.0.1:8188" })).toBeNull();
    expect(runpodEndpointId({ kind: "comfyui", baseUrl: "https://api.runpod.ai.example.com/v2/ep123" })).toBeNull();
  });

  it("queues the workflow, asks the status until it ends and reads a base64 picture", async () => {
    let polls = 0;
    reset({
      "POST /v2/ep123/run": () => json({ id: "j1", status: "IN_QUEUE" }),
      "GET /v2/ep123/status/j1": () => (++polls < 3 ? json({ id: "j1", status: polls === 1 ? "IN_QUEUE" : "IN_PROGRESS" }) : done({ images: [{ filename: "a.png", type: "base64", data: PNG.toString("base64") }] })),
    });
    const out = await endpointGenerate(rp(), "rpa_key", "illustrious.safetensors", 'a "quoted" fox\n(Avoid: blur)');
    expect(out.mimeType).toBe("image/png");
    expect(out.data.equals(PNG)).toBe(true);
    expect(polls).toBe(3);
    const run = seen.find((s) => s.path === "/v2/ep123/run")!;
    expect(run.auth).toBe("Bearer rpa_key");
    const body = run.body as { input: { workflow: Record<string, { inputs: Record<string, unknown> }> }; policy: { ttl: number } };
    expect(body.policy.ttl).toBeGreaterThan(0);
    expect(body.input.workflow["4"]!.inputs.ckpt_name).toBe("illustrious.safetensors");
    expect(body.input.workflow["6"]!.inputs.text).toBe('a "quoted" fox');
    expect(body.input.workflow["5"]!.inputs).toMatchObject({ width: 832, height: 1216 });
    expect(seen.every((s) => s.auth === "Bearer rpa_key")).toBe(true);
    expect(seen.some((s) => s.path.startsWith("/prompt") || s.path.startsWith("/history"))).toBe(false);
  });

  it("reads the picture of a worker older than 5.0.0 (output.message) and a data URI", async () => {
    reset({
      "POST /v2/ep123/run": () => json({ id: "j1" }),
      "GET /v2/ep123/status/j1": () => done({ message: `data:image/png;base64,${PNG.toString("base64")}`, status: "success" }),
    });
    expect((await endpointGenerate(rp(), "k", "m", "x")).data.equals(PNG)).toBe(true);
  });

  it("a picture link is fetched from the public internet only, never from the machine itself", async () => {
    reset({
      "POST /v2/ep123/run": () => json({ id: "j1" }),
      "GET /v2/ep123/status/j1": () => done({ images: [{ filename: "a.png", type: "s3_url", data: `${base}/bucket/a.png` }] }),
      "GET /bucket/a.png": () => new Response(PNG, { headers: { "content-type": "image/png" } }),
    });
    await rejects(endpointGenerate(rp(), "k", "m", "x"));
    expect(seen.some((s) => s.path === "/bucket/a.png")).toBe(false);
  });

  it("failures come back in plain words", async () => {
    reset({ "POST /v2/ep123/run": () => json({ id: "j1" }), "GET /v2/ep123/status/j1": () => json({ id: "j1", status: "FAILED", error: JSON.stringify({ error_message: "CUDA out of memory." }) }) });
    const failed = await rejects(endpointGenerate(rp(), "k", "m", "x"));
    expect(failed.status).toBe(502);
    expect(failed.message).toContain("Pod failed while drawing");
    reset({ "POST /v2/ep123/run": () => json({ id: "j1" }), "GET /v2/ep123/status/j1": () => json({ id: "j1", status: "FAILED", output: { error: "Value not in list: ckpt_name" } }) });
    expect((await rejects(endpointGenerate(rp(), "k", "m", "x"))).message).toContain("Value not in list: ckpt_name");
    reset({ "POST /v2/ep123/run": () => json({ id: "j1" }), "GET /v2/ep123/status/j1": () => json({ id: "j1", status: "CANCELLED" }) });
    expect((await rejects(endpointGenerate(rp(), "k", "m", "x"))).message).toContain("cancelled");
    reset({ "POST /v2/ep123/run": () => json({ id: "j1" }), "GET /v2/ep123/status/j1": () => done({ images: [] }) });
    expect(await rejects(endpointGenerate(rp(), "k", "m", "x"))).toMatchObject({ status: 502, code: "no_picture" });
  });

  it("a missing or refused key says so, and a hiccup while asking is asked again", async () => {
    reset({});
    expect(await rejects(endpointGenerate(rp(), undefined, "m", "x"))).toMatchObject({ status: 401, code: "key" });
    expect(seen).toHaveLength(0);
    reset({ "POST /v2/ep123/run": () => new Response("denied", { status: 401 }) });
    expect(await rejects(endpointGenerate(rp(), "bad", "m", "x"))).toMatchObject({ status: 401, code: "key" });
    let polls = 0;
    reset({
      "POST /v2/ep123/run": () => json({ id: "j1" }),
      "GET /v2/ep123/status/j1": () => (++polls === 1 ? new Response("busy", { status: 503 }) : done({ images: [{ type: "base64", data: PNG.toString("base64") }] })),
    });
    expect((await endpointGenerate(rp(), "k", "m", "x")).data.equals(PNG)).toBe(true);
  });

  it("lists the typed models after the endpoint answers its health, and offers no sampler lists", async () => {
    reset({ "GET /v2/ep123/health": () => json({ workers: { idle: 0, ready: 0 } }) });
    expect(await listEndpointModels(rp(), "k")).toEqual([{ id: "illustrious.safetensors", label: "illustrious.safetensors" }]);
    expect(seen[0]).toMatchObject({ path: "/v2/ep123/health", auth: "Bearer k" });
    reset({ "GET /v2/ep123/health": () => new Response("no", { status: 401 }) });
    expect(await rejects(listEndpointModels(rp(), "bad"))).toMatchObject({ status: 401, code: "key" });
    reset({});
    expect(await listEndpointOptions(rp(), "k")).toEqual({ samplers: [], schedulers: [], loras: [] });
    expect(seen).toHaveLength(0);
  });
});

describe("AUTOMATIC1111 / Forge", () => {
  it("a server that never answers times out with 504", async () => {
    reset({ "GET /sdapi/v1/sd-models": () => new Promise<Response>(() => undefined) });
    const e = await rejects(listEndpointModels({ name: "Slow", kind: "a1111", baseUrl: base }));
    expect(e).toMatchObject({ status: 504, message: "Slow did not answer within 5 seconds" });
  }, 15_000);

  it("lists sd-models and sends txt2img with the checkpoint override", async () => {
    const def: ImageEndpointDef = { name: "Forge", kind: "a1111", baseUrl: base, width: 768, height: 1152 };
    reset({
      "GET /sdapi/v1/sd-models": () => json([{ title: "wai.safetensors [abc123]", model_name: "wai" }]),
      "POST /sdapi/v1/txt2img": () => json({ images: [PNG.toString("base64")], info: "{}" }),
    });
    expect(await listEndpointModels(def)).toEqual([{ id: "wai.safetensors [abc123]", label: "wai.safetensors [abc123]" }]);
    const out = await endpointGenerate(def, undefined, "wai.safetensors [abc123]", "a fox\n(Avoid: blur)");
    expect(out.data.equals(PNG)).toBe(true);
    const body = seen.find((s) => s.path === "/sdapi/v1/txt2img")!.body as Record<string, unknown>;
    expect(body).toMatchObject({ prompt: "a fox", negative_prompt: "blur", width: 768, height: 1152, override_settings: { sd_model_checkpoint: "wai.safetensors [abc123]" } });
    expect(seen.every((s) => s.auth === null)).toBe(true);
  });
});

describe("Marinara-style sampling settings", () => {
  const done = (id: string) => ({
    "POST /prompt": () => json({ prompt_id: id }),
    [`GET /history/${id}`]: () => json({ [id]: { status: { completed: true }, outputs: { "9": { images: [{ filename: "a.png", type: "output" }] } } } }),
    "GET /view": () => new Response(PNG, { headers: { "content-type": "image/png" } }),
  });
  const graphOf = () => (seen.find((s) => s.path === "/prompt")!.body as { prompt: Record<string, { class_type: string; inputs: Record<string, unknown> }> }).prompt;

  it("validates and keeps the new fields, and clears them again", () => {
    const v = validateImageEndpointInput({
      name: "C", kind: "comfyui", baseUrl: "http://127.0.0.1:8188", prefix: " masterpiece, best quality, ", sampler: "dpmpp_2m", scheduler: "karras",
      seed: 42, denoise: 0.555, clipSkip: 2, loras: [{ name: "Anime_Detailed", strength: 0.8 }, { name: "  " }, { name: "b.safetensors" }],
      style: "description", instructions: "Mention the lighting.",
    });
    expect(v.ok && v.value).toMatchObject({
      prefix: "masterpiece, best quality,", sampler: "dpmpp_2m", scheduler: "karras", seed: 42, denoise: 0.56, clipSkip: 2,
      loras: [{ name: "Anime_Detailed", strength: 0.8 }, { name: "b.safetensors", strength: 1 }], style: "description", instructions: "Mention the lighting.",
    });
    for (const bad of [{ sampler: "x;rm" }, { seed: -2 }, { denoise: 2 }, { clipSkip: 13 }, { loras: [{ name: "<x>" }] }, { loras: Array.from({ length: 6 }, (_, i) => ({ name: `l${i}` })) }, { style: "prose" }, { instructions: "x".repeat(1001) }]) {
      expect(validateImageEndpointInput(bad, true).ok, JSON.stringify(bad).slice(0, 60)).toBe(false);
    }
    const u = path.join(dataDir, "marinara");
    fs.mkdirSync(u, { recursive: true });
    const p = bootstrapUserDir(u, "m");
    const ep = createImageEndpoint(p, (v as unknown as { value: never }).value);
    const cleared = validateImageEndpointInput({ seed: -1, clipSkip: 0, denoise: null, loras: [], sampler: "", prefix: null, style: null }, true);
    const after = updateImageEndpoint(p, ep.id, (cleared as unknown as { value: never }).value)!;
    for (const k of ["seed", "clipSkip", "denoise", "loras", "sampler", "prefix", "style"]) expect(after, k).not.toHaveProperty(k);
    expect(after).toMatchObject({ scheduler: "karras", instructions: "Mention the lighting." });
  });

  it("the default workflow chains the LoRAs and the clip skip and takes the sampler settings", async () => {
    reset(done("m1"));
    const def: ImageEndpointDef = {
      name: "Comfy", kind: "comfyui", baseUrl: base, prefix: "masterpiece, ", sampler: "dpmpp_2m", scheduler: "karras", seed: 7, denoise: 0.9, clipSkip: 2,
      loras: [{ name: "a.safetensors", strength: 0.7 }, { name: "b.safetensors", strength: 1.2 }],
    };
    await endpointGenerate(def, undefined, "wai.safetensors", "1girl, fox ears");
    const g = graphOf();
    expect(g["20"]).toMatchObject({ class_type: "LoraLoader", inputs: { lora_name: "a.safetensors", strength_model: 0.7, strength_clip: 0.7, model: ["4", 0], clip: ["4", 1] } });
    expect(g["21"]!.inputs).toMatchObject({ lora_name: "b.safetensors", strength_model: 1.2, model: ["20", 0], clip: ["20", 1] });
    expect(g["30"]).toMatchObject({ class_type: "CLIPSetLastLayer", inputs: { stop_at_clip_layer: -2, clip: ["21", 1] } });
    expect(g["6"]!.inputs).toEqual({ text: "masterpiece, 1girl, fox ears", clip: ["30", 0] });
    expect(g["3"]!.inputs).toMatchObject({ seed: 7, sampler_name: "dpmpp_2m", scheduler: "karras", denoise: 0.9, model: ["21", 0] });
  });

  it("without the new settings the default workflow is the plain one", async () => {
    reset(done("m2"));
    await endpointGenerate({ name: "Comfy", kind: "comfyui", baseUrl: base }, undefined, "m", "x");
    const g = graphOf();
    expect(Object.keys(g).sort()).toEqual(["3", "4", "5", "6", "7", "8", "9"]);
    expect(g["3"]!.inputs).toMatchObject({ sampler_name: "euler_ancestral", scheduler: "normal", denoise: 1, model: ["4", 0] });
    expect(g["6"]!.inputs).toEqual({ text: "x", clip: ["4", 1] });
  });

  it("a custom workflow gets LoRA slots, with None for the empty ones (rgthree Lora Loader Stack)", async () => {
    reset(done("m3"));
    const workflow = JSON.stringify({
      "4": { class_type: "KSampler", inputs: { seed: "%seed%", sampler_name: "%sampler%", scheduler: "%scheduler%", denoise: "%denoise%" } },
      "5": { class_type: "CLIPTextEncode", inputs: { text: "%prompt%" } },
      "12": { class_type: "Lora Loader Stack (rgthree)", inputs: { lora_01: "%LORA_1%", strength_01: "%LORA_1_strength%", lora_02: "%LORA_2%", strength_02: "%LORA_2_strength%" } },
    });
    await endpointGenerate({ name: "Comfy", kind: "comfyui", baseUrl: base, workflow, loras: [{ name: "Anime_Detailed", strength: 1 }] }, undefined, "m", "x");
    const g = graphOf();
    expect(g["12"]!.inputs).toEqual({ lora_01: "Anime_Detailed", strength_01: 1, lora_02: "None", strength_02: 1 });
    expect(g["4"]!.inputs).toMatchObject({ sampler_name: "euler_ancestral", scheduler: "normal", denoise: 1 });
    expect(typeof g["4"]!.inputs.seed).toBe("number");
    expect(comfyVars({ name: "c", kind: "comfyui", baseUrl: "" }, { positive: "", negative: "", model: "", width: 1, height: 1, seed: 1, steps: 1, cfg: 1 })).toMatchObject({ "%clip_skip%": -1, "%LORA_5%": "None" });
  });

  it("Forge gets the sampler, scheduler, clip skip, seed and LoRAs as prompt tags", async () => {
    reset({ "POST /sdapi/v1/txt2img": () => json({ images: [PNG.toString("base64")] }) });
    await endpointGenerate(
      { name: "Forge", kind: "a1111", baseUrl: base, prefix: "masterpiece,", sampler: "DPM++ 2M", scheduler: "Karras", seed: 5, clipSkip: 2, loras: [{ name: "detail", strength: 0.6 }] },
      undefined, "wai", "a fox",
    );
    const body = seen.find((s) => s.path === "/sdapi/v1/txt2img")!.body as Record<string, unknown>;
    expect(body).toMatchObject({
      prompt: "masterpiece, a fox <lora:detail:0.6>", sampler_name: "DPM++ 2M", scheduler: "Karras", seed: 5,
      override_settings: { sd_model_checkpoint: "wai", CLIP_stop_at_last_layers: 2 },
    });
  });

  it("lists the samplers, schedulers and LoRAs a server offers", async () => {
    reset({
      "GET /object_info/KSampler": () => json({ KSampler: { input: { required: { sampler_name: [["euler", "dpmpp_2m"]], scheduler: [["normal", "karras"]] } } } }),
      "GET /object_info/LoraLoader": () => json({ LoraLoader: { input: { required: { lora_name: [["a.safetensors"]] } } } }),
    });
    expect(await listEndpointOptions({ name: "C", kind: "comfyui", baseUrl: base })).toEqual({ samplers: ["euler", "dpmpp_2m"], schedulers: ["normal", "karras"], loras: ["a.safetensors"] });
    reset({
      "GET /sdapi/v1/samplers": () => json([{ name: "Euler a" }, { name: "DPM++ 2M" }]),
      "GET /sdapi/v1/loras": () => json([{ name: "detail", path: "x" }]),
    });
    // no scheduler list on older builds: the rest still comes back
    expect(await listEndpointOptions({ name: "F", kind: "a1111", baseUrl: base })).toEqual({ samplers: ["Euler a", "DPM++ 2M"], schedulers: [], loras: ["detail"] });
  });

  it("the prompt style follows the setting, else the kind", () => {
    expect(endpointPromptStyle({ kind: "comfyui" })).toBe("tags");
    expect(endpointPromptStyle({ kind: "openai" })).toBe("description");
    expect(endpointPromptStyle({ kind: "comfyui", style: "description" })).toBe("description");
  });
});

describe("OpenAI-compatible endpoint", () => {
  const def = (): ImageEndpointDef => ({ name: "Imgs", kind: "openai", baseUrl: `${base}/v1`, models: ["flux-dev", "gpt-image-1"] });

  it("sends the key, reads base64, and drops response_format for gpt-image", async () => {
    reset({ "POST /v1/images/generations": () => json({ data: [{ b64_json: PNG.toString("base64") }] }) });
    expect(await listEndpointModels(def())).toEqual([{ id: "flux-dev", label: "flux-dev" }, { id: "gpt-image-1", label: "gpt-image-1" }]);
    await endpointGenerate(def(), "sk-local", "flux-dev", "a fox");
    await endpointGenerate(def(), "sk-local", "gpt-image-1", "a fox");
    expect(seen.map((s) => s.auth)).toEqual(["Bearer sk-local", "Bearer sk-local"]);
    expect(seen[0]!.body).toMatchObject({ model: "flux-dev", prompt: "a fox", n: 1, size: "1024x1024", response_format: "b64_json" });
    expect(seen[1]!.body).not.toHaveProperty("response_format");
  });

  it("follows a link to the endpoint's own origin, never to a private one elsewhere", async () => {
    reset({
      "POST /v1/images/generations": () => json({ data: [{ url: `${base}/out/1.png` }] }),
      "GET /out/1.png": () => new Response(PNG),
    });
    expect((await endpointGenerate(def(), undefined, "flux-dev", "x")).data.equals(PNG)).toBe(true);
    reset({ "POST /v1/images/generations": () => json({ data: [{ url: "http://10.0.0.5/secret.png" }] }) });
    expect((await rejects(endpointGenerate(def(), undefined, "flux-dev", "x"))).message).toContain("will not open");
    reset({ "POST /v1/images/generations": () => json({ data: [{ url: "https://localhost/secret.png" }] }) });
    expect((await rejects(endpointGenerate(def(), undefined, "flux-dev", "x"))).message).toContain("private address");
  });

  it("does not follow a redirect from the endpoint itself", async () => {
    reset({ "POST /v1/images/generations": () => new Response(null, { status: 307, headers: { location: "http://169.254.169.254/" } }) });
    expect((await rejects(endpointGenerate(def(), undefined, "flux-dev", "x"))).message).toContain("redirected");
  });

  it("passes refusals on with their status", async () => {
    for (const [status, want] of [[401, 401], [402, 402], [429, 429], [503, 502]] as const) {
      reset({ "POST /v1/images/generations": () => json({ error: { message: "nope" } }, status) });
      expect((await rejects(endpointGenerate(def(), "k", "flux-dev", "x"))).status).toBe(want);
    }
  });
});

describe("NanoGPT", () => {
  it("lists the catalog with prices and sends the key with the model's size", async () => {
    reset({
      "GET /api/v1/image-models": () => json({ data: [
        { id: "flux-klein", name: "FLUX Klein", pricing: { per_image: { "1024x1024": 0.009 } }, supported_parameters: { resolutions: ["768x768", "1024x1024"] } },
        { id: "hidream", name: "HiDream", supported_parameters: { resolutions: ["1024x1536"] } },
      ] }),
      "POST /v1/images/generations": () => json({ data: [{ b64_json: `data:image/png;base64,${PNG.toString("base64")}` }] }),
    });
    expect(await nanoGptImageModels()).toEqual([{ id: "flux-klein", label: "FLUX Klein · $0.009", size: "1024x1024" }, { id: "hidream", label: "HiDream", size: "1024x1536" }] as never);
    const out = await nanoGptGenerate("sk-nano", "hidream", "a fox");
    expect(out.data.equals(PNG)).toBe(true);
    const call = seen.find((s) => s.method === "POST")!;
    expect(call.auth).toBe("Bearer sk-nano");
    expect(call.body).toMatchObject({ model: "hidream", prompt: "a fox", size: "1024x1536", response_format: "b64_json" });
    expect(seen.find((s) => s.method === "GET")!.auth).toBeNull();
  });
});

describe("Gemini API", () => {
  const imagenAnswer = () => json({ predictions: [{ bytesBase64Encoded: PNG.toString("base64"), mimeType: "image/png" }] });
  const geminiAnswer = () => json({ candidates: [{ content: { parts: [{ text: "Here you go" }, { inlineData: { mimeType: "image/png", data: PNG.toString("base64") } }] } }] });

  it("lists only image models the key can call, and sends the key in a header", async () => {
    imageHosts.gemini = base;
    reset({
      "GET /v1beta/models": () => json({ models: [
        { name: "models/imagen-4.0-generate-001", displayName: "Imagen 4", supportedGenerationMethods: ["predict"] },
        { name: "models/gemini-2.5-flash-image", displayName: "Nano Banana", supportedGenerationMethods: ["generateContent", "countTokens"] },
        { name: "models/gemini-2.5-flash", displayName: "Gemini 2.5 Flash", supportedGenerationMethods: ["generateContent"] },
        { name: "models/imagen-old", displayName: "No predict", supportedGenerationMethods: ["generateContent"] },
        { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
      ] }),
    });
    expect(await geminiImageModels("g-key")).toEqual([
      { id: "imagen-4.0-generate-001", label: "Imagen 4" },
      { id: "gemini-2.5-flash-image", label: "Nano Banana" },
    ]);
    expect(seen[0]!.path).toContain("pageSize");
  });

  it("draws with Imagen through :predict and with Gemini Image through :generateContent", async () => {
    imageHosts.gemini = base;
    reset({
      "POST /v1beta/models/imagen-4.0-generate-001:predict": imagenAnswer,
      "POST /v1beta/models/gemini-2.5-flash-image:generateContent": geminiAnswer,
    });
    const a = await geminiGenerate("g-key", "imagen-4.0-generate-001", "a fox");
    expect(a.data.equals(PNG)).toBe(true);
    expect(seen[0]!.body).toMatchObject({ instances: [{ prompt: "a fox" }], parameters: { sampleCount: 1 } });
    const b = await geminiGenerate("g-key", "gemini-2.5-flash-image", "a fox");
    expect(b.mimeType).toBe("image/png");
    expect(seen[1]!.body).toMatchObject({ contents: [{ parts: [{ text: "a fox" }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } });
  });

  it("says why in plain words: a bad key, a refusal as text, a blocked prompt, a filtered Imagen picture", async () => {
    imageHosts.gemini = base;
    reset({
      "POST /v1beta/models/bad:generateContent": () => json({ error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } }, 400),
    });
    const key = await rejects(geminiGenerate("nope", "bad", "x"));
    expect([key.status, key.code]).toEqual([401, "key"]);
    reset({
      "POST /v1beta/models/gemini-x-image:generateContent": () => json({ candidates: [{ content: { parts: [{ text: "I cannot draw that." }] } }] }),
      "POST /v1beta/models/gemini-y-image:generateContent": () => json({ promptFeedback: { blockReason: "SAFETY" } }),
      "POST /v1beta/models/imagen-z:predict": () => json({ predictions: [{ raiFilteredReason: "Blocked by safety filter" }] }),
    });
    expect((await rejects(geminiGenerate("k", "gemini-x-image", "x"))).message).toContain("I cannot draw that.");
    expect((await rejects(geminiGenerate("k", "gemini-y-image", "x"))).message).toContain("SAFETY");
    const filtered = await rejects(geminiGenerate("k", "imagen-z", "x"));
    expect([filtered.code, filtered.message]).toEqual(["refused", expect.stringContaining("safety filter")]);
  });

  it("joins the model service when the Google provider has a key", async () => {
    imageHosts.gemini = base;
    const p = bootstrapUserDir(dataDir, "gem");
    fs.mkdirSync(path.dirname(p.auth), { recursive: true });
    fs.writeFileSync(p.connections, JSON.stringify({ connections: { c_g: { name: "My Gemini", providerId: "google" } } }));
    fs.writeFileSync(p.auth, JSON.stringify({ google: { type: "api_key", key: "g-key-svc" } }), { mode: 0o600 });
    reset({
      "GET /v1beta/models": () => json({ models: [{ name: "models/gemini-2.5-flash-image", displayName: "Nano Banana", supportedGenerationMethods: ["generateContent"] }] }),
      "POST /v1beta/models/gemini-2.5-flash-image:generateContent": geminiAnswer,
    });
    const svc = new UserModelService("gem", p, defaultInstanceConfig());
    const models = await svc.imageModels();
    expect(models.find((m) => m.provider === "gemini")).toMatchObject({ id: "gemini-2.5-flash-image", api: "gemini-images", connectionName: "My Gemini" });
    const out = await svc.generateImage({ prompt: "a fox", model: "gemini/gemini-2.5-flash-image" });
    expect(out.data.equals(PNG)).toBe(true);
    expect(out.model).toBe("gemini/gemini-2.5-flash-image");
    expect(seen.find((s) => s.method === "POST")!.path).toBe("/v1beta/models/gemini-2.5-flash-image:generateContent");
  });
});

describe("through the model service", () => {
  it("lists NanoGPT and endpoint models together and routes each ref to its backend", async () => {
    const p = bootstrapUserDir(dataDir, "svc");
    fs.mkdirSync(path.dirname(p.auth), { recursive: true });
    fs.writeFileSync(p.connections, JSON.stringify({ connections: { c_nano: { name: "My NanoGPT", providerId: "nanogpt" } } }));
    fs.writeFileSync(p.auth, JSON.stringify({ nanogpt: { type: "api_key", key: "sk-nano" } }), { mode: 0o600 });
    const v = validateImageEndpointInput({ name: "Comfy", kind: "comfyui", baseUrl: base });
    if (!v.ok) throw new Error(v.error);
    const ep = createImageEndpoint(p, v.value);
    const down = validateImageEndpointInput({ name: "Off", kind: "a1111", baseUrl: "http://127.0.0.1:9" });
    if (!down.ok) throw new Error(down.error);
    createImageEndpoint(p, down.value);
    reset({
      "GET /api/v1/image-models": () => json({ data: [{ id: "flux-klein", name: "FLUX Klein" }] }),
      "GET /object_info/CheckpointLoaderSimple": () => json({ CheckpointLoaderSimple: { input: { required: { ckpt_name: [["wai.safetensors"]] } } } }),
      "POST /prompt": () => json({ prompt_id: "s1" }),
      "GET /history/s1": () => json({ s1: { status: { completed: true }, outputs: { "9": { images: [{ filename: "a.png" }] } } } }),
      "GET /view": () => new Response(PNG),
    });
    const svc = new UserModelService("svc", p, defaultInstanceConfig());
    const models = await svc.imageModels();
    expect(models.find((m) => m.provider === "nanogpt")).toMatchObject({ id: "flux-klein", connectionName: "My NanoGPT", api: "nanogpt-images" });
    expect(models.find((m) => m.provider === ep.id)).toMatchObject({ id: "wai.safetensors", connectionName: "Comfy", api: "comfyui" });
    expect(models.some((m) => m.connectionName === "Off")).toBe(false); // down: lists nothing, breaks nothing
    const out = await svc.generateImage({ prompt: "a fox", model: `${ep.id}/wai.safetensors` });
    expect(out).toMatchObject({ model: `${ep.id}/wai.safetensors`, mimeType: "image/png" });
    // the NanoGPT key never went to the local server
    expect(seen.filter((s) => s.auth === "Bearer sk-nano").every((s) => s.path.startsWith("/v1/images") || s.path.startsWith("/api/"))).toBe(true);
  }, 30_000);
});

describe("review follow-ups", () => {
  it("refuses metadata addresses outside link-local, keeps Tailscale's range", () => {
    const ok = { name: "C", kind: "comfyui", baseUrl: "" };
    expect(validateImageEndpointInput({ ...ok, baseUrl: "http://100.100.100.200" }).ok).toBe(false);
    expect(validateImageEndpointInput({ ...ok, baseUrl: "http://[fd00:ec2::254]" }).ok).toBe(false);
    expect(validateImageEndpointInput({ ...ok, baseUrl: "http://100.101.5.7:8188" }).ok).toBe(true);
  });

  it("takes a base64 picture bigger than the plain JSON limit", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(9 * 1024 * 1024)]);
    reset({ "POST /sdapi/v1/txt2img": () => json({ images: [big.toString("base64")] }) });
    const out = await endpointGenerate({ name: "Forge", kind: "a1111", baseUrl: base }, undefined, "m", "x");
    expect(out.data.length).toBe(big.length);
  });

  it("a refused history poll fails at once with its status", async () => {
    reset({ "POST /prompt": () => json({ prompt_id: "r1" }), "GET /history/r1": () => json({ error: "no" }, 403) });
    expect((await rejects(endpointGenerate({ name: "Comfy", kind: "comfyui", baseUrl: base }, "k", "m", "x"))).status).toBe(401);
  });
});

describe("image favorites", () => {
  const row = (provider: string, id: string, api: string): ImageModelInfo => ({ provider, id, label: id, api, connectionName: provider }) as ImageModelInfo;
  const paid = row("or", "flux", "openrouter-images");
  const paid2 = row("nano", "klein", "nanogpt-images");
  const comfy = row("c1", "sdxl", "comfyui");
  const forge = row("f1", "wai", "a1111");

  it("defaultImageModel: first listed favorite, else the first local server, else the first", () => {
    expect(defaultImageModel([paid, paid2, comfy], [{ ref: "gone/x" }, { ref: "nano/klein" }, { ref: "or/flux" }])).toBe(paid2);
    expect(defaultImageModel([paid, forge, comfy], [])).toBe(forge);
    expect(defaultImageModel([paid, comfy], [{ ref: "gone/model" }])).toBe(comfy);
    expect(defaultImageModel([paid, paid2], [])).toBe(paid);
    expect(defaultImageModel([], [{ ref: "or/flux" }])).toBeUndefined();
  });

  it("validateImageFavorites cleans and refuses", () => {
    expect(validateImageFavorites(null)).toEqual({ ok: true, value: [] });
    expect(validateImageFavorites(undefined)).toEqual({ ok: true, value: [] });
    expect(validateImageFavorites([{ ref: "a/b", name: "  Pretty ", use: "  " }, { ref: "a/b", name: "dup" }, { ref: "c/d/e" }])).toEqual({
      ok: true,
      value: [{ ref: "a/b", name: "Pretty" }, { ref: "c/d/e" }],
    });
    for (const bad of ["x", {}, [{}], [{ ref: "nope" }], [{ ref: 5 }], [{ ref: "a b/c" }], [{ ref: "a/" + "b".repeat(300) }], [{ ref: "a/b", name: "n".repeat(61) }], [{ ref: "a/b", use: "u".repeat(121) }], Array.from({ length: 31 }, (_, i) => ({ ref: `p/m${i}` }))]) {
      expect(validateImageFavorites(bad).ok, JSON.stringify(bad).slice(0, 40)).toBe(false);
    }
    expect(validateImageFavorites(Array.from({ length: 30 }, (_, i) => ({ ref: `p/m${i}` }))).ok).toBe(true);
  });

  it("the favorites and the endpoints share images.json without erasing each other", () => {
    const p = bootstrapUserDir(dataDir, "favs");
    expect(readImageFavorites(p)).toEqual([]);
    writeImageFavorites(p, [{ ref: "or/flux", use: "cheap" }]);
    const v = validateImageEndpointInput({ name: "Comfy", kind: "comfyui", baseUrl: base });
    if (!v.ok) throw new Error(v.error);
    const ep = createImageEndpoint(p, v.value);
    expect(readImageFavorites(p)).toEqual([{ ref: "or/flux", use: "cheap" }]);
    updateImageEndpoint(p, ep.id, { name: "Comfy 2" });
    deleteImageEndpoint(p, ep.id);
    expect(readImageFavorites(p)).toEqual([{ ref: "or/flux", use: "cheap" }]);
    expect(listImageEndpoints(p)).toEqual([]);
    const ep2 = createImageEndpoint(p, v.value);
    writeImageFavorites(p, []);
    expect(readImageFavorites(p)).toEqual([]);
    expect(listImageEndpoints(p).map((e) => e.id)).toEqual([ep2.id]);
    expect(JSON.parse(fs.readFileSync(p.images, "utf8"))).not.toHaveProperty("favorites");
  });

  it("a broken images.json reads as no favorites", () => {
    const p = bootstrapUserDir(dataDir, "favs-bad");
    fs.mkdirSync(path.dirname(p.images), { recursive: true });
    fs.writeFileSync(p.images, "{nope");
    expect(readImageFavorites(p)).toEqual([]);
  });

  it("HTTP: PUT /v1/images/favorites stores a cleaned list, GET /v1/images/models returns it", async () => {
    const dir = fs.mkdtempSync(path.join(dataDir, "http-"));
    const users = new UserService(dir);
    users.create("admin", "admin", { password: "admin-pass-1" });
    const token = users.create("root", "admin", { password: "test-pass-1" }).token;
    const app = buildApp({ users, sessions: new SessionService(dir), config: defaultInstanceConfig(), dataDir: dir, bus: new EventBus() });
    const h = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    const put = (body: unknown) => app.request("/v1/images/favorites", { method: "PUT", headers: h, body: JSON.stringify(body) });
    const get = async () => (await (await app.request("/v1/images/models", { headers: h })).json()) as { models: unknown[]; favorites: unknown[] };

    expect((await get()).favorites).toEqual([]);
    const ok = await put({ favorites: [{ ref: "comfy_1/sdxl.safetensors", name: " SDXL ", use: "portraits" }, { ref: "comfy_1/sdxl.safetensors" }] });
    expect(ok.status).toBe(200);
    const want = [{ ref: "comfy_1/sdxl.safetensors", name: "SDXL", use: "portraits" }];
    expect(await ok.json()).toEqual({ favorites: want });
    expect((await get()).favorites).toEqual(want);
    expect((await put({ favorites: [] })).status).toBe(200);
    expect((await get()).favorites).toEqual([]);
    for (const bad of [{}, { favorites: "nope" }, { favorites: [{ ref: "nope" }] }, { favorites: [{ ref: "a/b", name: "n".repeat(61) }] }]) {
      expect((await put(bad)).status, JSON.stringify(bad)).toBe(400);
    }
    expect((await app.request("/v1/images/favorites", { method: "PUT", headers: h, body: "{not json" })).status).toBe(400);
  });
});

describe("a workflow exported from ComfyUI", () => {
  // what Workflow > Export (API) writes for a two-pass SDXL graph
  const exported = {
    "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "juggernautXL.safetensors" } },
    "5": { class_type: "EmptyLatentImage", inputs: { width: 832, height: 1216, batch_size: 1 } },
    "6": { class_type: "CLIPTextEncode", inputs: { text: "a red fox in snow", clip: ["4", 1] } },
    "7": { class_type: "CLIPTextEncode", inputs: { text: "blurry", clip: ["4", 1] } },
    "10": { class_type: "ControlNetApply", inputs: { conditioning: ["6", 0], control_net: ["11", 0], image: ["12", 0], strength: 0.6 } },
    "3": { class_type: "KSampler", inputs: { seed: 123, steps: 28, cfg: 5.5, sampler_name: "dpmpp_2m", scheduler: "karras", denoise: 1, model: ["4", 0], positive: ["10", 0], negative: ["7", 0], latent_image: ["5", 0] } },
    "13": { class_type: "LatentUpscaleBy", inputs: { samples: ["3", 0], scale_by: 1.5 } },
    "14": { class_type: "KSampler", inputs: { seed: 456, steps: 12, cfg: 5.5, sampler_name: "dpmpp_2m", scheduler: "karras", denoise: 0.4, model: ["4", 0], positive: ["10", 0], negative: ["7", 0], latent_image: ["13", 0] } },
    "9": { class_type: "SaveImage", inputs: { filename_prefix: "x", images: ["8", 0] } },
  };

  it("gets the prompts, seeds, size and checkpoint as placeholders and keeps the sampler settings", () => {
    const { graph, filled } = adaptComfyWorkflow(exported);
    const g = graph as Record<string, { inputs: Record<string, unknown> }>;
    expect(g["6"]?.inputs.text).toBe("%prompt%");
    expect(g["7"]?.inputs.text).toBe("%negative_prompt%");
    expect(g["3"]?.inputs.seed).toBe("%seed%");
    expect(g["14"]?.inputs.seed).toBe("%seed%");
    expect(g["5"]?.inputs).toMatchObject({ width: "%width%", height: "%height%" });
    expect(g["4"]?.inputs.ckpt_name).toBe("%model%");
    expect(g["3"]?.inputs).toMatchObject({ steps: 28, cfg: 5.5, sampler_name: "dpmpp_2m", scheduler: "karras" });
    expect(filled.sort()).toEqual(["%height%", "%model%", "%negative_prompt%", "%prompt%", "%seed%", "%width%"]);
    expect(exported["6"].inputs.text).toBe("a red fox in snow");
  });

  it("on import, hands the first pass's settings, CLIP skip and LoRAs to the form", () => {
    const withLora = {
      ...exported,
      "20": { class_type: "LoraLoader", inputs: { lora_name: "detail.safetensors", strength_model: 0.7, strength_clip: 0.7, model: ["4", 0], clip: ["4", 1] } },
      "30": { class_type: "CLIPSetLastLayer", inputs: { stop_at_clip_layer: -2, clip: ["20", 1] } },
    };
    const { graph, values } = adaptComfyWorkflow(withLora, { all: true });
    const g = graph as Record<string, { inputs: Record<string, unknown> }>;
    expect(values).toEqual({ width: 832, height: 1216, steps: 28, cfg: 5.5, sampler: "dpmpp_2m", scheduler: "karras", denoise: 1, clipSkip: 2, loras: [{ name: "detail.safetensors", strength: 0.7 }] });
    expect(g["3"]?.inputs).toMatchObject({ steps: "%steps%", cfg: "%cfg%", sampler_name: "%sampler%", scheduler: "%scheduler%", denoise: "%denoise%" });
    // the hires pass keeps its own
    expect(g["14"]?.inputs).toMatchObject({ steps: 12, denoise: 0.4, sampler_name: "dpmpp_2m" });
    expect(g["20"]?.inputs).toMatchObject({ lora_name: "%LORA_1%", strength_model: "%LORA_1_strength%", strength_clip: "%LORA_1_strength%" });
    expect(g["30"]?.inputs.stop_at_clip_layer).toBe("%clip_skip%");
  });

  it("is adapted when saved, and the editor's own format is refused with how to export", () => {
    const saved = validateImageEndpointInput({ name: "Local", kind: "comfyui", baseUrl: "http://127.0.0.1:8188", workflow: JSON.stringify(exported) });
    expect(saved.ok && saved.value.workflow?.includes('"%prompt%"')).toBe(true);
    const editor = validateImageEndpointInput({ name: "Local", kind: "comfyui", baseUrl: "http://127.0.0.1:8188", workflow: JSON.stringify({ nodes: [], links: [] }) });
    expect(!editor.ok && editor.error).toMatch(/Export \(API\)/);
    const noPrompt = validateImageEndpointInput({ name: "Local", kind: "comfyui", baseUrl: "http://127.0.0.1:8188", workflow: JSON.stringify({ "1": { class_type: "SaveImage", inputs: {} } }) });
    expect(!noPrompt.ok && noPrompt.error).toMatch(/no prompt node/);
  });
});

describe("a shape asked for (#455)", () => {
  const ok = () => json({ data: [{ b64_json: PNG.toString("base64") }] });
  const lastBody = () => seen.filter((s) => s.method === "POST").at(-1)!.body as Record<string, unknown>;

  it("keeps the pixel budget, in steps of 64, and knows only the three shapes", () => {
    expect(shapeSize(1024, 1024, "wide")).toEqual({ width: 1344, height: 768 });
    expect(shapeSize(1024, 1024, "tall")).toEqual({ width: 768, height: 1344 });
    expect(shapeSize(1024, 1024, "square")).toEqual({ width: 1024, height: 1024 });
    expect(shapeSize(512, 512, "wide")).toEqual({ width: 704, height: 384 });
    expect(shapeSize(64, 64, "tall").width).toBe(64);
    expect(parseImageAspect("wide")).toBe("wide");
    expect(parseImageAspect("panorama")).toBeUndefined();
    expect(parseImageAspect(undefined)).toBeUndefined();
    expect(parseImageAspect(16)).toBeUndefined();
  });

  it("picks the listed size nearest to the shape, then nearest to one megapixel", () => {
    expect(nearestListedSize(["768x768", "1024x1024", "1536x1024", "1024x1536"], "wide")).toBe("1536x1024");
    expect(nearestListedSize(["768x768", "1024x1024", "1536x1024", "1024x1536"], "tall")).toBe("1024x1536");
    expect(nearestListedSize(["768x768", "1024x1024"], "square")).toBe("1024x1024");
    // only square sizes listed: the nearest is still one of them, never nothing
    expect(nearestListedSize(["768x768", "1024x1024"], "wide")).toBe("1024x1024");
    expect(nearestListedSize(["auto", "x"], "wide")).toBeUndefined();
    expect(nearestListedSize([], "wide")).toBeUndefined();
  });

  it("A1111 and ComfyUI take the endpoint's budget in the asked shape; without a shape the endpoint's own size", async () => {
    const a1111: ImageEndpointDef = { name: "Forge", kind: "a1111", baseUrl: base, width: 1024, height: 1024 };
    reset({ "POST /sdapi/v1/txt2img": () => json({ images: [PNG.toString("base64")] }) });
    await endpointGenerate(a1111, undefined, "m", "a town", "wide");
    expect(lastBody()).toMatchObject({ width: 1344, height: 768 });
    await endpointGenerate(a1111, undefined, "m", "a town");
    expect(lastBody()).toMatchObject({ width: 1024, height: 1024 });
    reset({
      "POST /prompt": () => json({ prompt_id: "s1" }),
      "GET /history/s1": () => json({ s1: { status: { completed: true }, outputs: { "9": { images: [{ filename: "a.png", type: "output" }] } } } }),
      "GET /view": () => new Response(PNG, { headers: { "content-type": "image/png" } }),
    });
    await endpointGenerate({ name: "Comfy", kind: "comfyui", baseUrl: base, width: 832, height: 1216 }, undefined, "m", "a town", "wide");
    const graph = (seen.find((x) => x.path === "/prompt")!.body as { prompt: Record<string, { inputs: Record<string, unknown> }> }).prompt;
    const latent = Object.values(graph).find((n) => "width" in n.inputs && "height" in n.inputs)!;
    // 832 x 1216 is about a megapixel: the wide one is 1152 x 896 at 16:9 rounded to 64 (1152 x 896 is not 16:9, so check the order only)
    expect(Number(latent.inputs.width)).toBeGreaterThan(Number(latent.inputs.height));
  });

  it("an OpenAI-compatible endpoint: the listed sizes of gpt-image and dall-e-3, a reshaped budget for the rest, and the endpoint's own size if that is refused", async () => {
    const def: ImageEndpointDef = { name: "Imgs", kind: "openai", baseUrl: `${base}/v1`, models: ["flux-dev", "gpt-image-1", "dall-e-3"] };
    reset({ "POST /v1/images/generations": ok });
    await endpointGenerate(def, "k", "gpt-image-1", "x", "wide");
    expect(lastBody()).toMatchObject({ size: "1536x1024" });
    await endpointGenerate(def, "k", "gpt-image-1", "x", "tall");
    expect(lastBody()).toMatchObject({ size: "1024x1536" });
    await endpointGenerate(def, "k", "dall-e-3", "x", "wide");
    expect(lastBody()).toMatchObject({ size: "1792x1024" });
    await endpointGenerate(def, "k", "flux-dev", "x", "wide");
    expect(lastBody()).toMatchObject({ size: "1344x768" });
    await endpointGenerate(def, "k", "flux-dev", "x");
    expect(lastBody()).toMatchObject({ size: "1024x1024" });
    // a server that refuses the reshaped size is asked again with the endpoint's own
    reset({ "POST /v1/images/generations": (_r, body) => ((body as { size?: string }).size === "1344x768" ? json({ error: { message: "bad size" } }, 400) : ok()) });
    const out = await endpointGenerate(def, "k", "flux-dev", "x", "wide");
    expect(out.data.equals(PNG)).toBe(true);
    expect(seen.map((x) => (x.body as { size: string }).size)).toEqual(["1344x768", "1024x1024"]);
    // a refusal that is not about the size (no key) is not retried
    reset({ "POST /v1/images/generations": () => json({ error: { message: "no" } }, 401) });
    expect((await rejects(endpointGenerate(def, "k", "flux-dev", "x", "wide"))).status).toBe(401);
    expect(seen).toHaveLength(1);
  });

  it("NanoGPT sends the model's listed size nearest to the shape, and its default when it lists none", async () => {
    clearNanoGptCache();
    reset({
      "GET /api/v1/image-models": () => json({ data: [
        { id: "multi", name: "Multi", supported_parameters: { resolutions: ["1024x1024", "1536x1024", "1024x1536"] } },
        { id: "plain", name: "Plain" },
      ] }),
      "POST /v1/images/generations": ok,
    });
    await nanoGptImageModels();
    await nanoGptGenerate("k", "multi", "x", "wide");
    expect(lastBody()).toMatchObject({ size: "1536x1024" });
    await nanoGptGenerate("k", "multi", "x");
    expect(lastBody()).toMatchObject({ size: "1024x1024" });
    await nanoGptGenerate("k", "plain", "x", "wide");
    expect(lastBody()).not.toHaveProperty("size");
  });

  it("Gemini sends the ratio: aspectRatio for Imagen, imageConfig for Gemini Image", async () => {
    imageHosts.gemini = base;
    reset({
      "POST /v1beta/models/imagen-4.0-generate-001:predict": () => json({ predictions: [{ bytesBase64Encoded: PNG.toString("base64") }] }),
      "POST /v1beta/models/gemini-2.5-flash-image:generateContent": () => json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: PNG.toString("base64") } }] } }] }),
    });
    await geminiGenerate("g", "imagen-4.0-generate-001", "x", "wide");
    expect(lastBody()).toMatchObject({ parameters: { sampleCount: 1, aspectRatio: "16:9" } });
    await geminiGenerate("g", "gemini-2.5-flash-image", "x", "tall");
    expect(lastBody()).toMatchObject({ generationConfig: { imageConfig: { aspectRatio: "9:16" } } });
    await geminiGenerate("g", "imagen-4.0-generate-001", "x");
    expect((lastBody() as { parameters: object }).parameters).not.toHaveProperty("aspectRatio");
  });
});
