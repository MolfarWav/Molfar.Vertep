/**
 * Some OpenAI-compatible hosts (Chub's Soji) end a chat stream without a finish_reason.
 * A custom connection's reply must survive that instead of failing with
 * "Stream ended without finish_reason" after the text already streamed.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { streamSimple } from "@earendil-works/pi-ai/api/openai-completions";
import { buildProvider } from "../src/providers/custom.js";

let server: http.Server;
let base = "";
let withFinish = false;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const chunks = [
        { choices: [{ index: 0, delta: { role: "assistant", content: "Hello " } }] },
        { choices: [{ index: 0, delta: { content: "there." }, ...(withFinish ? { finish_reason: "length" } : {}) }] },
      ];
      for (const c of chunks) res.write(`data: ${JSON.stringify(c)}\n\n`);
      res.end("data: [DONE]\n\n");
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
afterAll(() => server.close());

const run = async () => {
  const provider = buildProvider("c_soji", { name: "Soji", api: "openai-completions", baseUrl: base, models: [{ id: "soji" }] }, { keyless: true, readCredential: () => undefined });
  const model = provider.getModels()[0]!;
  const s = streamSimple(model as never, { messages: [{ role: "user", content: "hi", timestamp: Date.now() }] }, { apiKey: "x" });
  return (await s.result()) as { stopReason: string; errorMessage?: string; content: { type: string; text?: string }[] };
};

describe("a custom connection's stream without finish_reason", () => {
  it("keeps the reply", async () => {
    withFinish = false;
    const m = await run();
    expect(m.errorMessage ?? "").toBe("");
    expect(m.stopReason).toBe("stop");
    expect(m.content.map((b) => b.text ?? "").join("")).toBe("Hello there.");
  });
  it("still reads a finish_reason that comes", async () => {
    withFinish = true;
    const m = await run();
    expect(m.stopReason).toBe("length");
  });
});
