/**
 * The output limit a caller asks for reaches the provider whole, however full the window is.
 * pi-ai lowers `maxTokens` to window - estimate - 4096 (min 1) on every call; an app that already
 * budgets its own prompt against the window (Roleplay: window minus the reply) then got max_tokens 1
 * as soon as the prompt came within 4096 tokens of the window: empty or 3-token replies, only on
 * windows the chat had outgrown (Discord report, 2026-11). Unlocked windows never hit it.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { defaultInstanceConfig } from "../src/config.js";
import { UserModelService } from "../src/models.js";
import { bootstrapUserDir } from "../src/paths.js";

let dataDir: string;
let server: http.Server;
let sent: Record<string, unknown> | null = null;

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "maxout-test-"));
  server = http.createServer((req, res) => {
    let buf = "";
    req.on("data", (c) => { buf += c; });
    req.on("end", () => {
      sent = buf ? (JSON.parse(buf) as Record<string, unknown>) : {};
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: "ok" }, finish_reason: "stop" }] })}\n\n`);
      res.end("data: [DONE]\n\n");
    });
  });
});
afterEach(() => {
  try { server.close(); } catch { /* already closed */ }
  try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* watcher races */ }
});

/** One generate() against a mock endpoint whose model has a `windowTokens` window. */
async function ask(windowTokens: number, promptChars: number, maxTokens?: number) {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  const p = bootstrapUserDir(dataDir, "alice");
  fs.writeFileSync(
    p.connections,
    JSON.stringify({ connections: { c_x: { name: "X", api: "openai-completions", baseUrl: `http://127.0.0.1:${port}/v1`, models: [{ id: "m", contextWindow: windowTokens }] } } }),
  );
  fs.writeFileSync(p.auth, JSON.stringify({ c_x: { type: "api_key", key: "k", boundBaseUrl: `http://127.0.0.1:${port}/v1` } }));
  const svc = new UserModelService("alice", p, defaultInstanceConfig());
  await svc.generate({
    model: "c_x/m",
    systemPrompt: "You are a narrator.",
    messages: [{ role: "user", content: "x".repeat(promptChars) }],
    ...(maxTokens ? { presetParams: { max_tokens: maxTokens } } : {}),
  });
  return sent!;
}

describe("max output against a nearly full window", () => {
  it("keeps the asked limit when the prompt leaves under 4096 tokens of the window", async () => {
    // ~97k estimated tokens in a 100k window: the library's own margin would leave nothing
    const body = await ask(100_000, 340_000, 4000);
    expect(body.max_tokens).toBe(4000);
  }, 20_000);
});
