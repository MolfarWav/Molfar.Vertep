// Agent for the Script card check: a script draws an svg bar chart from the last reply and also tries hostile markup.
import { pathToFileURL } from "node:url"
import { DATA } from "../pw.mjs"
let checker
export async function compile(file) {
  checker ??= await import(pathToFileURL(`${DATA}/apps/roleplay/src/canvas-kit/boards/agent-check.js`).href)
  const r = checker.compileAgent(file)
  if (r.error) throw new Error(`fixture does not compile: ${r.error}`)
  if (r.report.errors.length) throw new Error(`fixture has errors: ${r.report.errors.map((e) => e.code + " " + e.message).join("; ")}`)
  return r.file
}
const node = (id, type, x, y, title, params) => ({ id, type, x, y, title, params })
const wire = (id, from, to) => ({ id, from, to })
export const CODE = `const t = String(input.text || '');
const n = t.length;
const bars = [n % 7, (n * 3) % 11, (n * 5) % 13].map(function (v) { return 10 + v * 3; });
let svg = '<svg viewBox="0 0 120 60" width="240" height="120"><rect x="0" y="0" width="120" height="60" fill="#223344"/>';
bars.forEach(function (h, i) { svg += '<rect x="' + (10 + i * 35) + '" y="' + (55 - h) + '" width="25" height="' + h + '" fill="#e8b04a"/>'; });
svg += '<text x="5" y="10" fill="#ffffff" font-size="8">length ' + n + '</text></svg>';
svg += '<script>top.__pwned=1</script><img src="http://evil.invalid/p.png" onerror="top.__pwned=2"><a href="javascript:top.__pwned=3">x</a>';
return { result: svg };`
export function scriptDemo(id = "script-demo") {
  return compile({
    format: "vertep-canvas", version: 1, kind: "agent", title: "Script demo",
    agent: {
      formatVersion: 1, id, version: "1.0.0", name: "Script demo",
      description: "A script draws a small chart from the last reply. Used by the Script card checks.", author: "script-check",
      trigger: { when: "after", everyN: 1, keywords: [] },
      models: {}, limits: { maxCalls: 0, concurrency: 1 },
      state: { art: { type: "text" } },
      panels: [{ id: "chart", title: "Chart", place: "float", widgets: [{ w: "html", bind: "art", height: 160 }] }],
    },
    nodes: [
      node("in", "agent.input", 10, 100, "Input", { give: [{ id: "reply", source: "lastReply" }] }),
      node("sc", "code.script", 250, 100, "Draw chart", { code: CODE, inputs: [{ id: "text", type: "text" }], outputs: [{ id: "result", type: "text" }] }),
      node("set", "state.set", 500, 100, "Keep it", { field: "art", as: "text" }),
      node("out", "agent.output", 750, 100, "Output", { kind: "state-patch", show: "float" }),
    ],
    edges: [wire("e1", "in:reply", "sc:text"), wire("e2", "sc:result", "set:value"), wire("e3", "set:done", "out:in")],
  })
}
