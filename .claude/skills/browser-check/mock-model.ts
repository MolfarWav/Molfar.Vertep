// A fake OpenAI-compatible model for real agent runs without API keys.
// Each request gets the next scripted turn (cycling): {"text": "..."} or
// {"tool": "<name>", "args": {...}}. Turns come from $MOCK_TURNS (a JSON file)
// or the default below; POST /__turns with a JSON array replaces them and
// rewinds, POST /__reset only rewinds. Usage is reported, so the composer,
// spend and the prompt inspector have numbers to show.
// a turn may wait `delayMs` before answering (a slow model)
// a turn may set `drop`: the connection breaks after the first words (a provider that closes the socket mid-stream);
// `dropTimes` breaks only that many requests, then the turn answers normally
// a turn may set `match`: it answers every request whose body contains that text (first match wins) and is not part of the
// cycle; the cycling turns answer the rest. Used when several callers share the model (a chat reply, an agent's question).
// POST /__refuse-tools {"on": true} makes a request that carries tools answer 404 "No endpoints found that support tool use" (a free model without tool use)
// POST .../embeddings answers an embedding of 8 numbers made from the words of each text (texts that share words are near);
// POST /__embed {"fail": true} makes it answer 500 until {"fail": false}, `delayMs` slows each answer, and GET /__embed counts the requests
type Turn = ({ text: string } | { tool: string; args?: Record<string, unknown> }) & { delayMs?: number; wordMs?: number; drop?: boolean; dropTimes?: number; match?: string };
let refuseTools = false;
const dropped = new Map<number, number>();
const DEFAULT: Turn[] = [
  { tool: "read_file", args: { path: "AGENTS.md" } },
  { text: "I read AGENTS.md. It describes the workspace." },
];
let turns: Turn[] = process.env.MOCK_TURNS ? (JSON.parse(await Bun.file(process.env.MOCK_TURNS).text()) as Turn[]) : DEFAULT;
let next = 0;
// what was asked, for a check to count: GET /__log gives [{ at, match, bytes }] (match = the routed turn's text or null), POST /__log empties it
const log: { at: number; match: string | null; bytes: number }[] = [];
const model = process.env.MOCK_MODEL ?? "mock-model";
const embed = { fail: false, delayMs: 0, calls: 0, texts: 0 };
const embedding = (text: string): number[] => {
  const v = new Array<number>(8).fill(0);
  for (const w of text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)) {
    let h = 5381;
    for (const c of w) h = (h * 33 + c.charCodeAt(0)) >>> 0;
    v[h % 8] += 1;
  }
  return v;
};

Bun.serve({
  port: Number(process.env.MOCK_PORT ?? 8797),
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/__log") { if (req.method === "POST") { log.length = 0; return Response.json({ ok: true }); } return Response.json(log); }
    if (url.pathname === "/__refuse-tools") { if (req.method === "POST") refuseTools = Boolean(((await req.json()) as { on?: boolean }).on); return Response.json({ on: refuseTools }); }
    if (url.pathname === "/__reset") { next = 0; return Response.json({ ok: true }); }
    if (url.pathname === "/__turns") { turns = (await req.json()) as Turn[]; next = 0; return Response.json({ ok: true, turns: turns.length }); }
    if (url.pathname.endsWith("/models")) return Response.json({ data: [{ id: model }] });
    if (url.pathname === "/__embed") {
      if (req.method === "POST") Object.assign(embed, await req.json());
      return Response.json(embed);
    }
    if (url.pathname.endsWith("/embeddings")) {
      const body = (await req.json()) as { input?: string[] };
      embed.calls++;
      embed.texts += (body.input ?? []).length;
      if (embed.delayMs) await new Promise((r) => setTimeout(r, embed.delayMs));
      if (embed.fail) return new Response("embeddings are down", { status: 500 });
      return Response.json({ data: (body.input ?? []).map((t) => ({ embedding: embedding(String(t)) })) });
    }
    const raw = await req.text();
    // a provider that rejects a request carrying tools (OpenRouter's text for a model without tool use)
    if (refuseTools && /"tools"\s*:\s*\[\s*\{/.test(raw)) {
      log.push({ at: Date.now(), match: "refused-tools", bytes: raw.length });
      return Response.json({ error: { message: "No endpoints found that support tool use. To learn more about provider routing, visit: https://openrouter.ai/docs/provider-routing", code: 404 } }, { status: 404 });
    }
    const routed = turns.find((x) => x.match && raw.includes(x.match));
    const cycle = turns.filter((x) => !x.match);
    log.push({ at: Date.now(), match: routed?.match ?? null, bytes: raw.length });
    const turn = (routed ?? cycle[next++ % Math.max(cycle.length, 1)] ?? { text: "ok" }) as Turn;
    const enc = new TextEncoder();
    const chunk = (o: unknown) => enc.encode(`data: ${JSON.stringify(o)}\n\n`);
    const base = { id: `c${next}`, object: "chat.completion.chunk", created: 1, model };
    const usage = { prompt_tokens: Math.ceil(raw.length / 4), completion_tokens: 20, total_tokens: Math.ceil(raw.length / 4) + 20 };
    if (turn.delayMs) await Bun.sleep(turn.delayMs);
    const body = new ReadableStream({
      async start(c) {
        if ("tool" in turn) {
          c.enqueue(chunk({ ...base, choices: [{ index: 0, delta: { role: "assistant", tool_calls: [{ index: 0, id: `call_${next}`, type: "function", function: { name: turn.tool, arguments: JSON.stringify(turn.args ?? {}) } }] }, finish_reason: null }] }));
          c.enqueue(chunk({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }], usage }));
        } else {
          // wordMs: stream the text a word at a time, to watch a reply being written
          const parts = turn.wordMs ? turn.text.split(/(?<= )/) : [turn.text];
          const at = (next - 1) % turns.length;
          const seen = dropped.get(at) ?? 0;
          if (turn.drop && seen < (turn.dropTimes ?? Infinity)) {
            dropped.set(at, seen + 1);
            c.enqueue(chunk({ ...base, choices: [{ index: 0, delta: { role: "assistant", content: parts[0] ?? "" }, finish_reason: null }] }));
            await Bun.sleep(50);
            c.error(new Error("socket closed"));
            return;
          }
          for (const [i, part] of parts.entries()) {
            if (i && turn.wordMs) await Bun.sleep(turn.wordMs);
            c.enqueue(chunk({ ...base, choices: [{ index: 0, delta: { ...(i ? {} : { role: "assistant" }), content: part }, finish_reason: null }] }));
          }
          c.enqueue(chunk({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage }));
        }
        c.enqueue(enc.encode("data: [DONE]\n\n"));
        c.close();
      },
    });
    return new Response(body, { headers: { "content-type": "text/event-stream" } });
  },
});
console.log(`mock model "${model}" on ${process.env.MOCK_PORT ?? 8797}, ${turns.length} turn(s)`);
