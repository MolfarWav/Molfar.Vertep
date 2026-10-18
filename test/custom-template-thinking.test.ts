/**
 * Local servers (llama.cpp, vLLM, LM Studio) switch a model's thinking with
 * chat_template_kwargs.enable_thinking. A connection marked "thinking" sends it
 * on every request: true when the preset asks for thinking, false when it does
 * not, so "off" really turns thinking off. Unmarked connections send nothing.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { normalizeContext } from "@earendil-works/pi-ai";
import { streamSimple } from "@earendil-works/pi-ai/api/openai-completions";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createConnection, readConnections, updateConnection, validateConnectionInput } from "../src/connections.js";
import { bootstrapUserDir } from "../src/paths.js";
import { buildProvider } from "../src/providers/custom.js";

let server: http.Server;
let base = "";
let lastBody: Record<string, unknown> = {};
beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      lastBody = JSON.parse(raw);
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { role: "assistant", content: "ok" }, finish_reason: "stop" }] })}\n\n`);
      res.end("data: [DONE]\n\n");
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
afterAll(() => server.close());

const send = async (templateThinking: boolean, reasoning?: "low") => {
  const provider = buildProvider(
    "c_local",
    { name: "Local", api: "openai-completions", baseUrl: base, models: [{ id: "gemma" }], ...(templateThinking ? { templateThinking } : {}) },
    { keyless: true, readCredential: () => undefined },
  );
  const model = provider.getModels()[0]!;
  await streamSimple(model as never, normalizeContext({ messages: [{ role: "user", content: "hi", timestamp: Date.now() }] }), { apiKey: "x", ...(reasoning ? { reasoning } : {}) }).result();
  return { model, body: lastBody };
};

describe("a local connection whose models think", () => {
  it("marks every model as thinking and sends enable_thinking", async () => {
    const on = await send(true, "low");
    expect(on.model.reasoning).toBe(true);
    expect(on.body.chat_template_kwargs).toEqual({ enable_thinking: true });
    expect(on.body.reasoning_effort).toBeUndefined();
    const off = await send(true);
    expect(off.body.chat_template_kwargs).toEqual({ enable_thinking: false });
  });
  it("sends nothing about thinking when the connection is not marked", async () => {
    const plain = await send(false, "low");
    expect(plain.model.reasoning).toBe(false);
    expect(plain.body.chat_template_kwargs).toBeUndefined();
  });
  it("is kept only for chat completions endpoints", () => {
    const ok = validateConnectionInput({ name: "L", api: "openai-completions", baseUrl: "http://localhost:8080/v1", thinking: true });
    expect(ok.ok && ok.value.thinking).toBe(true);
    const text = validateConnectionInput({ name: "L", api: "openai-text", baseUrl: "http://localhost:8080/v1", thinking: true });
    expect(text.ok && text.value.thinking).toBeFalsy();
    expect(validateConnectionInput({ name: "L", api: "openai-completions", baseUrl: "http://localhost:8080/v1", thinking: "yes" }).ok).toBe(false);
  });
  it("is switched on and off on an existing connection", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "thinking-"));
    try {
      const p = bootstrapUserDir(dir, "alice");
      const c = createConnection(p, { name: "Local", api: "openai-completions", baseUrl: "http://localhost:8080/v1", models: "auto" });
      expect(c.thinking).toBeUndefined();
      updateConnection(p, c.id, { thinking: true });
      expect(readConnections(p).connections[c.id]?.thinking).toBe(true);
      updateConnection(p, c.id, { thinking: false });
      expect(readConnections(p).connections[c.id]?.thinking).toBeUndefined();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
