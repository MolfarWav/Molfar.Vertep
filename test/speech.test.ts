/**
 * Edge read-aloud synthesis wire formats — the keyless speech source backing
 * the Engine TTS provider. Verifies both output formats arrive as the bytes
 * they claim to be (mp3 frame sync / EBML magic), since clients choose the
 * format based on what their build can decode.
 *
 * Most tests talk to a local fake of the service, so a red run means our client
 * broke, not that Microsoft's endpoint refused a CI runner (it answers 403 to
 * them: #114). The probe against the real service stays, opt-in.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocketServer } from "ws";
import { edgeSpeakFmt, setEdgeEndpointForTests } from "../src/speech.js";

const MP3 = Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x00]), Buffer.alloc(1500, 0x55)]);
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(1500, 0x66)]);

/** What the fake saw and how it should answer the next connections. */
const fake = {
  /** statuses to refuse the next handshakes with (403 carries a Date header 40 s in the future) */
  refuse: [] as number[],
  urls: [] as string[],
  formats: [] as string[],
  ssml: [] as string[],
  silent: false,
};

let http: Server;
let wss: WebSocketServer;

const frame = (path: string, body: Buffer) => {
  const head = Buffer.from(`X-RequestId:abc\r\nContent-Type:audio/x\r\nPath:${path}\r\n`);
  return Buffer.concat([Buffer.from([0x00, head.length]), head, body]);
};

beforeAll(async () => {
  http = createServer();
  wss = new WebSocketServer({
    server: http,
    verifyClient: (info, done) => {
      fake.urls.push(info.req.url ?? "");
      const status = fake.refuse.shift();
      if (status) done(false, status, "Refused", { Date: new Date(Date.now() + 40_000).toUTCString() });
      else done(true);
    },
  });
  wss.on("connection", (ws) => {
    ws.on("message", (data, isBinary) => {
      const text = isBinary ? "" : data.toString("utf8");
      if (text.includes("Path:speech.config")) {
        fake.formats.push(/"outputFormat":"([^"]+)"/.exec(text)?.[1] ?? "");
        return;
      }
      if (!text.includes("Path:ssml")) return;
      fake.ssml.push(text);
      if (fake.silent) {
        ws.send("X-RequestId:abc\r\nPath:turn.end\r\n\r\n{}");
        return;
      }
      const webm = fake.formats[fake.formats.length - 1]?.startsWith("webm");
      const audio = webm ? WEBM : MP3;
      ws.send(frame("audio.metadata", Buffer.from("{}")), { binary: true });
      ws.send(frame("audio", audio.subarray(0, 700)), { binary: true });
      ws.send(frame("audio", audio.subarray(700)), { binary: true });
      ws.send("X-RequestId:abc\r\nPath:turn.end\r\n\r\n{}");
    });
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  setEdgeEndpointForTests(`ws://127.0.0.1:${(http.address() as AddressInfo).port}/`);
});

afterAll(async () => {
  setEdgeEndpointForTests(null);
  for (const c of wss.clients) c.terminate();
  await new Promise<void>((resolve) => wss.close(() => resolve()));
  await new Promise<void>((resolve) => http.close(() => resolve()));
});

const reset = () => {
  fake.refuse = [];
  fake.urls = [];
  fake.formats = [];
  fake.ssml = [];
  fake.silent = false;
};

describe("edge tts wire formats", () => {
  it("mp3 output starts with an MPEG frame sync, joined from the audio frames and nothing else", async () => {
    reset();
    const clip = await edgeSpeakFmt({ text: "Format probe.", voice: "en-US-AriaNeural", speed: 1, format: "mp3" });
    expect(fake.formats).toEqual(["audio-24khz-48kbitrate-mono-mp3"]);
    expect(clip.equals(MP3)).toBe(true);
    expect(clip[0]).toBe(0xff);
    expect(clip[1]! & 0xe0).toBe(0xe0);
  });

  it("webm output starts with the EBML magic (opus-in-webm for codec-stripped clients)", async () => {
    reset();
    const clip = await edgeSpeakFmt({ text: "Format probe.", voice: "en-US-AriaNeural", speed: 1, format: "webm" });
    expect(fake.formats).toEqual(["webm-24khz-16bit-mono-opus"]);
    // 1A 45 DF A3 — every webm container starts with it
    expect([...clip.subarray(0, 4)]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
    expect(clip.equals(WEBM)).toBe(true);
  });

  it("sends the voice, its language, the speed as a rate and an escaped text", async () => {
    reset();
    await edgeSpeakFmt({ text: "Tom & <Jerry>", voice: "uk-UA-OstapNeural", speed: 1.5, format: "mp3" });
    const ssml = fake.ssml[0]!;
    expect(ssml).toContain("xml:lang='uk-UA'");
    expect(ssml).toContain("<voice name='uk-UA-OstapNeural'>");
    expect(ssml).toContain("rate='+50%'");
    expect(ssml).toContain("Tom &amp; &lt;Jerry&gt;");
  });

  it("a 403 with the server's clock is retried once with the clock corrected", async () => {
    reset();
    fake.refuse = [403];
    const clip = await edgeSpeakFmt({ text: "Skew.", voice: "en-US-AriaNeural", speed: 1, format: "mp3" });
    expect(clip.equals(MP3)).toBe(true);
    expect(fake.urls).toHaveLength(2);
    const gec = (u: string) => /Sec-MS-GEC=([0-9A-F]+)/.exec(u)?.[1];
    // the fake's clock is 40 s ahead: the retry signs another 5-minute window only when that crosses one, so
    // the proof is that both attempts carry a token and the second one went through
    expect(gec(fake.urls[0]!)).toMatch(/^[0-9A-F]{64}$/);
    expect(gec(fake.urls[1]!)).toMatch(/^[0-9A-F]{64}$/);
  });

  it("gives up after a second refusal and says why", async () => {
    reset();
    fake.refuse = [403, 403];
    await expect(edgeSpeakFmt({ text: "No.", voice: "en-US-AriaNeural", speed: 1, format: "mp3" })).rejects.toThrow("clock skew correction failed");
    expect(fake.urls).toHaveLength(2);
  });

  it("another refusal is not retried", async () => {
    reset();
    fake.refuse = [429];
    await expect(edgeSpeakFmt({ text: "No.", voice: "en-US-AriaNeural", speed: 1, format: "mp3" })).rejects.toThrow("handshake failed (429)");
    expect(fake.urls).toHaveLength(1);
  });

  it("a reply without audio is an error", async () => {
    reset();
    fake.silent = true;
    await expect(edgeSpeakFmt({ text: "Quiet.", voice: "en-US-AriaNeural", speed: 1, format: "mp3" })).rejects.toThrow("returned no audio");
  });
});

// The real service answers 403 to many datacenter and CI addresses, so this is a probe to run by hand:
//   EDGE_TTS_LIVE=1 bun test test/speech.test.ts
describe.skipIf(!process.env.EDGE_TTS_LIVE)("edge tts, the real service (EDGE_TTS_LIVE=1)", () => {
  it("answers both formats as the bytes they claim to be", async () => {
    setEdgeEndpointForTests(null);
    const mp3 = await edgeSpeakFmt({ text: "Format probe.", voice: "en-US-AriaNeural", speed: 1, format: "mp3" });
    expect(mp3.byteLength).toBeGreaterThan(1000);
    expect(mp3[0]).toBe(0xff);
    expect(mp3[1]! & 0xe0).toBe(0xe0);
    const webm = await edgeSpeakFmt({ text: "Format probe.", voice: "en-US-AriaNeural", speed: 1, format: "webm" });
    expect([...webm.subarray(0, 4)]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
  }, 60_000);
});
