/**
 * A custom connection sends the system prompt as `system`, also for a model marked as reasoning:
 * the library's `developer` role is OpenAI's own, and a server that checks the body refuses it
 * (Chub's Soji answered "input too large or malformed" within 1.5 s, #59).
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { normalizeContext } from "@earendil-works/pi-ai";
import { buildProvider } from "../src/providers/custom.js";

let server: http.Server;
let base = "";
let sent: any = null;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      sent = JSON.parse(body);
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: "ok" }, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`);
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/soji/v1`;
});
afterAll(() => server.close());

const ask = async (reasoning: boolean) => {
  const p = buildProvider("c_soji", { name: "Soji", api: "openai-completions", baseUrl: base, models: [{ id: "soji", ...(reasoning ? { reasoning: true } : {}) }] }, { keyless: true, readCredential: () => undefined });
  const ctx = normalizeContext({ systemPrompt: "You are Aria.", messages: [{ role: "user", content: "hi", timestamp: Date.now() }] });
  await p.streamSimple(p.getModels()[0]! as never, ctx, { apiKey: "x", maxTokens: 100 } as never).result();
  return sent;
};

describe("system role on a custom connection", () => {
  it("is `system` for a plain model and for one marked as reasoning", async () => {
    for (const reasoning of [false, true]) {
      const body = await ask(reasoning);
      expect(body.messages[0]).toEqual({ role: "system", content: "You are Aria." });
      expect(JSON.stringify(body)).not.toContain("developer");
      expect(body.max_tokens).toBe(100);
      expect(body.store).toBeUndefined();
    }
  });

  it("OpenAI itself keeps the developer role for its reasoning models", () => {
    const p = buildProvider("c_openai", { name: "OpenAI", api: "openai-completions", baseUrl: "https://api.openai.com/v1", models: [{ id: "o-test", reasoning: true }] }, { keyless: true, readCredential: () => undefined });
    const compat = (p.getModels()[0] as { compat?: Record<string, unknown> }).compat ?? {};
    expect(compat.supportsDeveloperRole).toBeUndefined();
  });
});
