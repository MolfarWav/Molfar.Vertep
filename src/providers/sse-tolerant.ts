/**
 * A fetch for custom OpenAI-compatible connections that cleans up a chat
 * stream before the OpenAI SDK reads it.
 *
 * The SDK (7.x, under pi-ai 1.2) fails the whole reply on any `data:` event
 * that is not JSON ("Error reading response: malformed server-sent event
 * JSON.") and matches the end marker exactly (`[DONE]`), where 6.x accepted
 * anything starting with it. Some hosts (Chub's Soji, #59) send events like
 * that and worked before. Here:
 * - an end marker with trailing text becomes a plain `data: [DONE]`;
 * - an event whose `data:` lines are each JSON but not as one value (two
 *   chunks without the blank line between them) is split into one event each;
 * - any other non-JSON event is dropped and logged with a sample, so the next
 *   report shows what the host sent (the SDK no longer logs it).
 * JSON events, comments and named events pass through unchanged.
 *
 * A body with no reply in it at all, only text (Chub's geo block answers 200
 * with "This service is not available in your country."), fails the reply
 * with that text: dropping it would leave an empty reply and no reason.
 */
import { log } from "../logger.js";

type FetchFunction = typeof globalThis.fetch;

const DONE = "[DONE]";
const SAMPLE_CHARS = 200;
const MAX_LOGGED = 3;
const FIELD = /^(event|id|retry|data)(:|$)/;

function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/** One event (its lines, without the blank line that ends it) → the text to send on, or "" to drop it. */
export function cleanSseEvent(block: string, onDrop: (data: string) => void): string {
  const lines = block.split("\n");
  const data: string[] = [];
  for (const line of lines) {
    if (line === "data") data.push("");
    else if (line.startsWith("data:")) data.push(line.slice(line.startsWith("data: ") ? 6 : 5));
  }
  if (data.length === 0) return `${block}\n\n`;
  const joined = data.join("\n");
  if (joined === DONE || isJson(joined)) return `${block}\n\n`;
  if (joined.trim().startsWith(DONE)) return `data: ${DONE}\n\n`;
  const others = lines.filter((l) => l !== "data" && !l.startsWith("data:"));
  if (data.length > 1 && data.every((d) => d === DONE || isJson(d))) {
    return data.map((d) => `${[...others, `data: ${d}`].join("\n")}\n\n`).join("");
  }
  onDrop(joined);
  return "";
}

/** Rewrites an SSE body event by event; see the module comment. */
export function cleanSseBody(body: ReadableStream<Uint8Array>, label: string): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let dropped = 0;
  let replied = false;
  let textSample = "";
  const onDrop = (d: string) => {
    dropped++;
    if (!textSample && d.trim()) textSample = d.trim();
    if (dropped <= MAX_LOGGED) {
      log.warn(`[custom-provider:${label}] skipped a stream event that is not JSON: ${JSON.stringify(d.slice(0, SAMPLE_CHARS))}`);
    }
  };
  const drain = (final: boolean): string => {
    // hold a trailing \r back: its \n may come in the next chunk
    let ready = buffer;
    let rest = "";
    if (!final && ready.endsWith("\r")) {
      ready = ready.slice(0, -1);
      rest = "\r";
    }
    const events = ready.replace(/\r\n?/g, "\n").split("\n\n");
    const tail = final ? "" : (events.pop() ?? "");
    buffer = tail + rest;
    let out = "";
    for (const ev of events) {
      if (ev === "") continue;
      const cleaned = cleanSseEvent(ev, onDrop);
      if (/^data/m.test(cleaned)) replied = true;
      else if (!textSample) {
        // a line that is not an SSE field or comment: the host sent plain text
        const plain = ev.split("\n").filter((l) => l.trim() && !l.startsWith(":") && !FIELD.test(l));
        if (plain.length) textSample = plain.join(" ").trim();
      }
      out += cleaned;
    }
    return out;
  };
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const out = drain(false);
        if (out) controller.enqueue(encoder.encode(out));
      },
      flush(controller) {
        buffer += decoder.decode();
        const out = drain(true);
        if (out) controller.enqueue(encoder.encode(out));
        if (dropped > MAX_LOGGED) log.warn(`[custom-provider:${label}] skipped ${dropped} stream events that are not JSON`);
        if (!replied && textSample) {
          log.warn(`[custom-provider:${label}] the stream held no reply, only text: ${JSON.stringify(textSample.slice(0, SAMPLE_CHARS))}`);
          controller.error(new Error(`The connection sent no reply, only this text: ${textSample.slice(0, SAMPLE_CHARS)}`));
        }
      },
    }),
  );
}

/** A fetch whose successful non-JSON responses (the chat stream) go through cleanSseBody. */
export function tolerantSseFetch(label: string, base: FetchFunction = globalThis.fetch): FetchFunction {
  const wrapped = async (input: Parameters<FetchFunction>[0], init?: Parameters<FetchFunction>[1]) => {
    const res = await base(input, init);
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !res.body || type.includes("json")) return res;
    // the body is rewritten and already decoded: its length and encoding no longer apply
    const headers = new Headers(res.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(cleanSseBody(res.body, label), { status: res.status, statusText: res.statusText, headers });
  };
  return wrapped as FetchFunction;
}
