// The agents the Forge checks use, written as plain objects and compiled with the app's own checker, so the hash and the
// `derived` block are right whatever the format does next. Needs the app installed in the workspace (install-roleplay.sh).
import { pathToFileURL } from "node:url"
import { DATA } from "../pw.mjs"

let checker
async function compile(file) {
  checker ??= await import(pathToFileURL(`${DATA}/apps/roleplay/src/canvas-kit/boards/agent-check.js`).href)
  const r = checker.compileAgent(file)
  if (r.error) throw new Error(`fixture does not compile: ${r.error}`)
  if (r.report.errors.length) throw new Error(`fixture has errors: ${r.report.errors.map((e) => e.code + " " + e.message).join("; ")}`)
  return r.file
}

const node = (id, type, x, y, title, params) => ({ id, type, x, y, title, params })
const wire = (id, from, to) => ({ id, from, to })

/** A text field the model fills, shown by a float panel with an `html` widget (and a plain text widget for comparison).
 *  The model's sentence goes into `said` as it is: this is where hostile text from a model would land. */
export function echoBoard({ version = "1.0.0", extraSource = false } = {}) {
  return compile({
    format: "vertep-canvas", version: 1, kind: "agent", title: "Echo board",
    agent: {
      formatVersion: 1, id: "echo-board", version, name: "Echo board",
      description: "Writes one line the model made into a panel. Used by the Forge checks.", author: "forge-check",
      trigger: { when: "after", everyN: 1, keywords: [] },
      models: { fast: { hint: "cheap, short answers" } },
      limits: { maxCalls: 1, concurrency: 1 },
      state: { said: { type: "text" } },
      panels: [{
        id: "board", title: "Echo", place: "float",
        widgets: [
          { w: "html", bind: "said", height: 140, template: '<div style="padding:6px;border:1px solid #888"><b>Said:</b> <span>{{said}}</span> <i>{{#if said}}(set){{/if}}</i></div>' },
          { w: "text", label: "Plain", bind: "said" },
        ],
      }],
    },
    nodes: [
      node("in", "agent.input", 10, 100, "Input", { give: [{ id: "reply", source: "lastReply" }, ...(extraSource ? [{ id: "user", source: "lastUserMessage" }] : [])] }),
      node("ask", "model.ask", 250, 100, "Say it", {
        role: "fast", prompt: `FORGE-ECHO: say one line about this scene.${extraSource ? "\n\nPlayer: {{user}}" : ""}\n\n{{reply}}`,
        answer: { as: "text" }, maxTokens: 120, batchKey: null,
      }),
      node("set", "state.set", 500, 100, "Keep it", { field: "said", as: "text" }),
      node("out", "agent.output", 750, 100, "Output", { kind: "state-patch", show: "float" }),
    ],
    edges: [
      wire("e1", "in:reply", "ask:reply"),
      ...(extraSource ? [wire("e0", "in:user", "ask:user")] : []),
      wire("e2", "ask:text", "set:value"),
      wire("e3", "set:done", "out:in"),
    ],
  })
}
