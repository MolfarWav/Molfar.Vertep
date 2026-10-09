import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fauxProvider, fauxAssistantMessage } from "@earendil-works/pi-ai/providers/faux";
import { blockFor, blockValues, mergeParams, pluginBlockName, ModelParamsError, readModelParams, validateBlock, writeModelParams } from "../src/model-params.js";
import { UserModelService } from "../src/models.js";
import { defaultInstanceConfig } from "../src/config.js";
import { bootstrapUserDir } from "../src/paths.js";
import { UserService } from "../src/users.js";

describe("model params: validation", () => {
  it("accepts the full set on chat and molfar, the short set on plugin blocks", () => {
    expect(validateBlock("chat", { temperature: 0.9, top_p: 0.95, top_k: 40, seed: 7, reasoning: "high", params: { a: 1 }, headers: { "X-Provider": "x" } })).toEqual({
      temperature: 0.9, top_p: 0.95, top_k: 40, seed: 7, reasoning: "high", params: { a: 1 }, headers: { "X-Provider": "x" },
    });
    expect(validateBlock("plugin:roleplay/relations", { temperature: 0.2, max_tokens: 1500 })).toEqual({ temperature: 0.2, max_tokens: 1500 });
    expect(() => validateBlock("plugins", { top_p: 0.9 })).toThrow(ModelParamsError);
    expect(() => validateBlock("plugins", { headers: { "X-A": "b" } })).toThrow(ModelParamsError);
  });

  it("refuses out-of-range numbers, unknown fields and blocks, and credential headers", () => {
    expect(() => validateBlock("chat", { temperature: 3 })).toThrow(/temperature/);
    expect(() => validateBlock("chat", { top_k: 1.5 })).toThrow(/whole number/);
    expect(() => validateBlock("chat", { reasoning: "med" })).toThrow(/reasoning/);
    expect(() => validateBlock("chat", { nope: 1 })).toThrow(/unknown/);
    expect(() => validateBlock("writer", { temperature: 1 })).toThrow(/block/);
    expect(() => validateBlock("plugin:../x", { temperature: 1 })).toThrow(/block/);
    for (const h of ["Authorization", "cookie", "X-Api-Key", "Proxy-Authorization", "Host"]) {
      expect(() => validateBlock("chat", { headers: { [h]: "v" } }), h).toThrow(/not allowed/);
    }
    expect(() => validateBlock("chat", { headers: { "X-A": "line\nbreak" } })).toThrow(/one-line/);
    expect(() => validateBlock("chat", { params: { big: "x".repeat(5000) } })).toThrow(/limited/);
  });
});

describe("model params: which block and who wins", () => {
  const entry = { chat: { temperature: 0.95 }, plugins: { temperature: 0.3 }, "plugin:roleplay/relations": { temperature: 0.2 }, molfar: { reasoning: "medium" as const } };
  it("picks the block by caller", () => {
    expect(blockFor(entry, { source: "app:roleplay/roleplay__engine", key: "reply" })).toBe("chat");
    expect(blockFor(entry, { source: "app:roleplay/roleplay__engine", key: "translation" })).toBe("plugins");
    expect(blockFor(entry, { source: "app:roleplay/roleplay__relations", key: "sense_c1" })).toBe("plugin:roleplay/relations");
    expect(blockFor(entry, { source: "app:roleplay/roleplay__litopys", key: "lit_c1" })).toBe("plugins");
    expect(blockFor(entry, { source: "agent" })).toBe("molfar");
    expect(pluginBlockName("app:roleplay/roleplay__relations")).toBe("plugin:roleplay/relations");
    expect(pluginBlockName("app:notes")).toBe("plugin:user/notes");
    expect(blockFor(entry, { source: "api:/v1/chat/completions" })).toBe("chat");
    expect(blockFor({ chat: { temperature: 1 } }, { source: "agent" })).toBeNull();
    expect(blockFor(undefined, { source: "agent" })).toBeNull();
  });

  it("a plugin block falls back field by field to Plugins", () => {
    const e = { plugins: { temperature: 0.3, max_tokens: 2048 }, "plugin:roleplay/relations": { temperature: 0.2 } };
    expect(blockValues(e, "plugin:roleplay/relations")).toEqual({ temperature: 0.2, max_tokens: 2048 });
    expect(blockValues(e, "plugins")).toEqual({ temperature: 0.3, max_tokens: 2048 });
    expect(blockValues(e, null)).toBeUndefined();
  });

  it("the model wins unless the request asks to; custom params come last", () => {
    const block = { temperature: 0.95, top_p: 0.9, params: { top_p: 0.8, provider: { order: ["x"] } } };
    const req = { presetParams: { temperature: 0.5, max_tokens: 300, params: { top_p: 0.7, min_p: 0.1 } }, reasoning: "low" };
    const m = mergeParams(block, "chat", req);
    expect(m.temperature).toBe(0.95);
    expect(m.max_tokens).toBe(300);
    expect(m.reasoning).toBe("low");
    expect(m.params).toEqual({ top_p: 0.8, min_p: 0.1, provider: { order: ["x"] } });
    expect(m.from).toMatchObject({ temperature: "model", max_tokens: "request", reasoning: "request", top_p: "model", min_p: "request" });
    const r = mergeParams(block, "chat", { ...req, paramsSource: "request" });
    expect(r.temperature).toBe(0.5);
    expect(r.params?.top_p).toBe(0.7);
    expect(r.from.temperature).toBe("request");
  });
});

describe("model params: file and generation", () => {
  let dataDir = "";
  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mparams-"));
  });
  afterEach(() => {
    try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* watcher races */ }
  });

  it("writes one model's blocks, drops a bad hand edit, removes with null", () => {
    const users = new UserService(dataDir);
    users.create("dana", "user", { password: "test-pass-1" });
    const p = bootstrapUserDir(dataDir, "dana");
    writeModelParams(p.root, "nanogpt/x", { chat: { temperature: 1 }, plugins: {} });
    expect(readModelParams(p.root).models).toEqual({ "nanogpt/x": { chat: { temperature: 1 } } });
    const raw = JSON.parse(fs.readFileSync(path.join(p.root, "model-params.json"), "utf8"));
    raw.models["nanogpt/x"].molfar = { temperature: 99 };
    fs.writeFileSync(path.join(p.root, "model-params.json"), JSON.stringify(raw));
    expect(readModelParams(p.root).models["nanogpt/x"]).toEqual({ chat: { temperature: 1 } });
    expect(() => writeModelParams(p.root, "nanogpt/x", { chat: { temperature: 9 } })).toThrow(ModelParamsError);
    writeModelParams(p.root, "nanogpt/x", null);
    expect(readModelParams(p.root).models).toEqual({});
  });

  it("generate sends the block's values and echoes where they came from", async () => {
    const users = new UserService(dataDir);
    users.create("dana", "user", { password: "test-pass-1" });
    const p = bootstrapUserDir(dataDir, "dana");
    const svc = new UserModelService("dana", p, defaultInstanceConfig());
    const handle = fauxProvider({ models: [{ id: "faux-m", contextWindow: 32_000, maxTokens: 4000 }] });
    svc.models.setProvider(handle.provider);
    const ref = `${handle.provider.id}/faux-m`;
    writeModelParams(p.root, ref, { chat: { temperature: 0.95, top_p: 0.9, headers: { "X-Route": "fast" } }, plugins: { temperature: 0.2 } });
    const seen: Record<string, unknown>[] = [];
    handle.setResponses([
      (_ctx, opts) => {
        seen.push({ ...(opts as Record<string, unknown>) });
        return fauxAssistantMessage("ok");
      },
      (_ctx, opts) => {
        seen.push({ ...(opts as Record<string, unknown>) });
        return fauxAssistantMessage("ok");
      },
    ]);
    const reply = await svc.generate({
      model: ref, messages: [{ role: "user", content: "hi" }], source: "app:roleplay/roleplay__engine", paramsKey: "reply",
      presetParams: { temperature: 0.5, max_tokens: 200 },
      // a caller cannot smuggle headers in: only model-params.json sets them
      modelHeaders: { Authorization: "Bearer stolen" },
    });
    expect(seen[0]!.temperature).toBe(0.95);
    expect(seen[0]!.maxTokens).toBe(200);
    expect(seen[0]!.samplingParams).toEqual({ top_p: 0.9 });
    expect((seen[0]!.headers as Record<string, string>)["X-Route"]).toBe("fast");
    expect((seen[0]!.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(reply.requestParams).toMatchObject({ block: "chat", temperature: 0.95, from: { temperature: "model", max_tokens: "request" } });

    const tracker = await svc.generate({ model: ref, messages: [{ role: "user", content: "hi" }], source: "app:roleplay/roleplay__relations", paramsKey: "sense" });
    expect(seen[1]!.temperature).toBe(0.2);
    expect(tracker.requestParams).toMatchObject({ block: "plugins" });
  }, 30_000);
});
