// A fake OpenAI-compatible model for real agent runs without API keys.
// Each request gets the next scripted turn (cycling): {"text": "..."} or
// {"tool": "<name>", "args": {...}}. Turns come from $MOCK_TURNS (a JSON file)
// or the default below; POST /__turns with a JSON array replaces them and
// rewinds, POST /__reset only rewinds. Usage is reported, so the composer,
// spend and the prompt inspector have numbers to show.
// a turn may wait `delayMs` before answering (a slow model)
// a turn may set `drop`: the connection breaks after the first words (a provider that closes the socket mid-stream);
// `dropTimes` breaks only that many requests, then the turn answers normally
type Turn = ({ text: string } | { tool: string; args?: Record<string, unknown> }) & { delayMs?: number; wordMs?: number; drop?: boolean; dropTimes?: number };
const dropped = new Map<number, number>();
const DEFAULT: Turn[] = [
  { tool: "read_file", args: { path: "AGENTS.md" } },
  { text: "I read AGENTS.md. It describes the workspace." },
];
let turns: Turn[] = process.env.MOCK_TURNS ? (JSON.parse(await Bun.file(process.env.MOCK_TURNS).text()) as Turn[]) : DEFAULT;
let next = 0;
const model = process.env.MOCK_MODEL ?? "mock-model";

Bun.serve({
  port: Number(process.env.MOCK_PORT ?? 8797),
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/__reset") { next = 0; return Response.json({ ok: true }); }
    if (url.pathname === "/__turns") { turns = (await req.json()) as Turn[]; next = 0; return Response.json({ ok: true, turns: turns.length }); }
    if (url.pathname.endsWith("/models")) return Response.json({ data: [{ id: model }] });
    const raw = await req.text();
    const turn = turns[next++ % turns.length] as Turn;
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
