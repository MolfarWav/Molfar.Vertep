/**
 * The OpenAI SDK under pi-ai 1.2 fails a whole reply on any stream event that
 * is not JSON ("malformed server-sent event JSON", #59, Chub's Soji). A custom
 * connection reads its stream through tolerantSseFetch, which repairs or drops
 * such events; the reply survives.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { normalizeContext } from "@earendil-works/pi-ai";
import { streamSimple } from "@earendil-works/pi-ai/api/openai-completions";
import { buildProvider } from "../src/providers/custom.js";
import { cleanSseEvent } from "../src/providers/sse-tolerant.js";

const chunk = (content: string, finish?: string) =>
  JSON.stringify({ choices: [{ index: 0, delta: { content }, ...(finish ? { finish_reason: finish } : {}) }] });

/** Each case: the raw body the host sends. */
const BODIES: Record<string, string> = {
  plain: `data: ${chunk("Hello ")}\n\ndata: ${chunk("there.", "stop")}\n\ndata: [DONE]\n\n`,
  doneWithTrail: `data: ${chunk("Hello ")}\n\ndata: ${chunk("there.", "stop")}\n\ndata: [DONE] \n\n`,
  doneWithJunk: `data: ${chunk("Hello ")}\n\ndata: ${chunk("there.", "stop")}\n\ndata: [DONE]{"usage":null}\n\n`,
  keepAlive: `: ping\n\ndata: \n\ndata: ${chunk("Hello ")}\n\ndata: keep-alive\n\ndata: ${chunk("there.", "stop")}\n\ndata: [DONE]\n\n`,
  noBlankLine: `data: ${chunk("Hello ")}\ndata: ${chunk("there.", "stop")}\n\ndata: [DONE]\n\n`,
  unterminatedJunk: `data: ${chunk("Hello ")}\n\ndata: ${chunk("there.", "stop")}\n\ndata: {"id":`,
  crlf: `data: ${chunk("Hello ")}\r\n\r\ndata: ${chunk("there.", "stop")}\r\n\r\ndata: [DONE] \r\n\r\n`,
};

let server: http.Server;
let base = "";
let body = "";
let byteByByte = false;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    req.resume();
    req.on("end", async () => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      if (!byteByByte) return res.end(body);
      const bytes = Buffer.from(body);
      for (let i = 0; i < bytes.length; i += 3) {
        res.write(bytes.subarray(i, i + 3));
        await new Promise((r) => setTimeout(r, 0));
      }
      res.end();
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
afterAll(() => server.close());

type Result = { stopReason: string; errorMessage?: string; content: { type: string; text?: string }[] };
const ctx = () => normalizeContext({ messages: [{ role: "user", content: "hi", timestamp: Date.now() }] });
const provider = () =>
  buildProvider("c_soji", { name: "Soji", api: "openai-completions", baseUrl: base, models: [{ id: "soji" }] }, { keyless: true, readCredential: () => undefined });
const viaConnection = async (): Promise<Result> => {
  const p = provider();
  return (await p.streamSimple(p.getModels()[0]! as never, ctx(), { apiKey: "x" }).result()) as Result;
};
const text = (m: Result) => m.content.map((b) => b.text ?? "").join("");

describe("a custom connection's stream with events that are not JSON", () => {
  it("fails without the repair (the bug)", async () => {
    body = BODIES.doneWithTrail!;
    byteByByte = false;
    const m = (await streamSimple(provider().getModels()[0]! as never, ctx(), { apiKey: "x" }).result()) as Result;
    expect(m.errorMessage ?? "").toContain("malformed server-sent event JSON");
  });

  for (const split of [false, true]) {
    for (const name of Object.keys(BODIES)) {
      it(`keeps the reply: ${name}${split ? ", sent in 3-byte pieces" : ""}`, async () => {
        body = BODIES[name]!;
        byteByByte = split;
        const m = await viaConnection();
        expect(m.errorMessage ?? "").toBe("");
        expect(m.stopReason).toBe("stop");
        expect(text(m)).toBe("Hello there.");
      });
    }
  }
});

describe("cleanSseEvent", () => {
  const run = (block: string) => {
    const dropped: string[] = [];
    return { out: cleanSseEvent(block, (d) => dropped.push(d)), dropped };
  };
  it("passes JSON, comments and named events unchanged", () => {
    expect(run('data: {"a":1}').out).toBe('data: {"a":1}\n\n');
    expect(run(": ping").out).toBe(": ping\n\n");
    expect(run('event: error\ndata: {"error":{"message":"x"}}').out).toBe('event: error\ndata: {"error":{"message":"x"}}\n\n');
  });
  it("drops and reports anything else", () => {
    const r = run("data: upstream timeout");
    expect(r.out).toBe("");
    expect(r.dropped).toEqual(["upstream timeout"]);
  });
});

describe("a custom connection's stream with no reply, only text (#59, Chub's geo block)", () => {
  const BLOCKED = "This service is not available in your country.";
  for (const [name, raw] of [
    ["plain text", `${BLOCKED}\n`],
    ["text as a data event", `data: ${BLOCKED}\n\n`],
  ] as const) {
    it(`fails with the host's text: ${name}`, async () => {
      body = raw;
      byteByByte = false;
      const m = await viaConnection();
      expect(m.stopReason).toBe("error");
      expect(m.errorMessage ?? "").toContain(BLOCKED);
    });
  }
});
