/**
 * OpenRouter ends a stream its upstream provider cut short with finish_reason "error" and the
 * provider's own reason in `native_finish_reason`. The library drops it; upstreamStreamError()
 * keeps it so the person sees why.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { normalizeContext } from "@earendil-works/pi-ai";
import { streamSimple } from "@earendil-works/pi-ai/api/openai-completions";
import { upstreamStreamError } from "../src/models.js";
import { buildProvider } from "../src/providers/custom.js";

let server: http.Server;
let base = "";
let failing: unknown;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const chunks = [
        { choices: [{ index: 0, delta: { role: "assistant", content: "Hello " } }] },
        failing
          ? { choices: [{ index: 0, delta: { content: "" }, finish_reason: "error", ...(failing as object) }] }
          : { choices: [{ index: 0, delta: { content: "there." }, finish_reason: "stop" }] },
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
  const provider = buildProvider("c_or", { name: "OR", api: "openai-completions", baseUrl: base, models: [{ id: "m" }] }, { keyless: true, readCredential: () => undefined });
  const model = provider.getModels()[0]!;
  const upstream = upstreamStreamError();
  const s = streamSimple(model as never, normalizeContext({ messages: [{ role: "user", content: "hi", timestamp: Date.now() }] }), {
    apiKey: "x",
    onProviderStreamEvent: upstream.watch,
  });
  const m = (await s.result()) as { stopReason: string; errorMessage?: string };
  return { m, upstream };
};

describe("upstreamStreamError", () => {
  it("keeps the cause OpenRouter puts in the failing chunk", async () => {
    failing = { native_finish_reason: "PROHIBITED_CONTENT" };
    const { m, upstream } = await run();
    expect(m.stopReason).toBe("error");
    expect(m.errorMessage).toBe("Provider finish_reason: error");
    expect(upstream.detail()).toBe(" (the host's reason: PROHIBITED_CONTENT)");
  });
  it("also reads an error message on the choice, and says nothing when the stream is fine", async () => {
    failing = { error: { message: "overloaded" } };
    expect((await run()).upstream.detail()).toBe(" (overloaded)");
    failing = { refusal_detail: "policy" };
    expect((await run()).upstream.detail()).toBe(' (the host also sent {"refusal_detail":"policy"})');
    failing = undefined;
    const ok = await run();
    expect(ok.m.stopReason).toBe("stop");
    expect(ok.upstream.detail()).toBe("");
  });
});
