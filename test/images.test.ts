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
  ImageError, createImageEndpoint, endpointGenerate, imageEndpoint, imageHosts, listEndpointModels, listImageEndpoints,
  nanoGptGenerate, nanoGptImageModels, providerError, setComfyPollMs, splitAvoid, updateImageEndpoint, validateImageEndpointInput,
  type ImageEndpointDef,
} from "../src/images.js";
import { UserModelService } from "../src/models.js";
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
