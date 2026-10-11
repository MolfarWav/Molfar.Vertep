/**
 * The agent tools that reach past the workspace files (run-tools.ts): the
 * plugin log, an app's own routes, one paid test generation, a public web
 * page, and the run budget.
 */
import { describe, it, expect, beforeEach } from "bun:test";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { buildRunTools, estimateRun, htmlToText, type RunToolOptions } from "../src/agent/run-tools.js";
import { clearPluginLog, readPluginLog, recordPluginLog } from "../src/plugins/plugin-log.js";
import { assertInternetHost } from "../src/net-guard.js";
import type { AskRequest } from "../src/agent/tools.js";

const tool = (tools: AgentTool[], name: string): AgentTool => {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`no tool ${name}`);
  return t;
};
const run = async (t: AgentTool, params: unknown) => t.execute("t", params as never, undefined as never);
const out = (r: { content: { type: string; text?: string }[] }): string => r.content.map((c) => c.text ?? "").join("");

beforeEach(() => clearPluginLog());

describe("plugin log", () => {
  it("keeps lines per user, narrows by app, plugin and errors", async () => {
    recordPluginLog("mia", { plugin: "engine", app: "roleplay", level: "log", text: "tick" });
    recordPluginLog("mia", { plugin: "engine", app: "roleplay", level: "error", text: "route GET /x failed: boom" });
    recordPluginLog("mia", { plugin: "other", level: "log", text: "hello" });
    recordPluginLog("bob", { plugin: "engine", app: "roleplay", level: "log", text: "not mia's" });
    expect(readPluginLog("mia").map((e) => e.text)).toEqual(["tick", "route GET /x failed: boom", "hello"]);
    expect(readPluginLog("mia", { app: "roleplay", errors: true }).map((e) => e.text)).toEqual(["route GET /x failed: boom"]);
    const t = tool(buildRunTools("mia", {}), "plugin_log");
    const text = out(await run(t, { plugin: "engine" }));
    expect(text).toContain("roleplay/engine: tick");
    expect(text).toContain("roleplay/engine ERROR: route GET /x failed: boom");
    expect(text).not.toContain("not mia's");
    expect(out(await run(t, { app: "nope" }))).toContain("No plugin output for app nope");
  });

  it("drops the oldest lines past its cap", () => {
    for (let i = 0; i < 600; i++) recordPluginLog("mia", { plugin: "p", level: "log", text: `line ${i}` });
    const all = readPluginLog("mia", { limit: 1000 });
    expect(all.length).toBe(500);
    expect(all[0]!.text).toBe("line 100");
  });
});

describe("app_request", () => {
  const calls: unknown[][] = [];
  const dispatch: RunToolOptions["appRequest"] = async (...a) => {
    calls.push(a);
    if (a[2] === "/missing") return null;
    return { status: 200, payload: { ok: true, path: a[2] } };
  };

  it("calls the route with method, path, query and body", async () => {
    calls.length = 0;
    const t = tool(buildRunTools("mia", { appRequest: dispatch }), "app_request");
    const r = await run(t, { id: "roleplay", method: "POST", path: "chats/new?full=1", body: { name: "x" } });
    expect(calls[0]).toEqual(["roleplay", "POST", "/chats/new", { full: "1" }, { name: "x" }]);
    expect(out(r)).toContain("200 json");
    expect(out(r)).toContain('"path": "/chats/new"');
    expect(out(await run(t, { id: "roleplay", path: "/missing" }))).toContain("No plugin of apps/roleplay answered GET /missing");
    await expect(run(t, { id: "../x", path: "/" })).rejects.toThrow("Not an app id");
  });

  it("allows only GET in plan mode", async () => {
    const t = tool(buildRunTools("mia", { appRequest: dispatch, mode: "plan" }), "app_request");
    await expect(run(t, { id: "roleplay", method: "DELETE", path: "/chats/1" })).rejects.toThrow("Plan mode");
    expect(out(await run(t, { id: "roleplay", path: "/chats" }))).toContain("200");
  });
});

describe("model_try", () => {
  const sent: unknown[] = [];
  const tryModel: RunToolOptions["tryModel"] = {
    resolve: (ref) => (ref && ref !== "a/b" ? null : { ref: "a/b", price: (u) => (u.input + u.output) / 1_000_000 }),
    generate: async (req) => {
      sent.push(req);
      return { text: "Hi there", model: "a/b", usage: { input: 10, output: 3, cacheRead: 0, cacheWrite: 0, costTotal: 0.00001, priced: true } } as never;
    },
  };
  const asking = (answer: string, seen: AskRequest[]) => async (q: AskRequest) => {
    seen.push(q);
    return answer;
  };

  it("asks with the model and an estimate, then generates once with a capped length", async () => {
    sent.length = 0;
    const seen: AskRequest[] = [];
    const t = tool(buildRunTools("mia", { tryModel, ask: asking("Send", seen) }), "model_try");
    const r = await run(t, { messages: "Say hi", maxTokens: 99_999 });
    expect(seen[0]!.question).toContain("a/b");
    expect(seen[0]!.detail).toContain("up to 4,096 out");
    expect(sent.length).toBe(1);
    expect(sent[0]).toMatchObject({ model: "a/b", source: "agent:try", presetParams: { max_tokens: 4096 }, messages: [{ role: "user", content: "Say hi" }] });
    expect(out(r)).toContain("Hi there");
  });

  it("sends nothing when the user skips, or no one can confirm, or the model is unknown", async () => {
    sent.length = 0;
    const skip = tool(buildRunTools("mia", { tryModel, ask: asking("Skip", []) }), "model_try");
    expect(out(await run(skip, { messages: [{ role: "user", content: "x" }] }))).toContain("Not sent");
    const nobody = tool(buildRunTools("mia", { tryModel }), "model_try");
    expect(out(await run(nobody, { messages: [{ role: "user", content: "x" }] }))).toContain("Not sent");
    await expect(run(skip, { model: "c/d", messages: [{ role: "user", content: "x" }] })).rejects.toThrow("No model c/d");
    expect(sent.length).toBe(0);
  });
});

describe("web_fetch", () => {
  it("is built only with the internet switch and refuses when it is off", async () => {
    expect(buildRunTools("mia", {}).some((t) => t.name === "web_fetch")).toBe(false);
    const t = tool(buildRunTools("mia", { internet: () => false }), "web_fetch");
    await expect(run(t, { url: "https://example.com" })).rejects.toThrow("Internet access is off");
  });

  it("refuses local and private hosts", async () => {
    for (const h of ["localhost", "app.localhost", "127.0.0.1", "10.0.0.5", "192.168.1.1", "169.254.169.254", "[::1]", "printer.local"]) {
      await expect(assertInternetHost(h)).rejects.toThrow();
    }
    await expect(assertInternetHost("8.8.8.8")).resolves.toBeUndefined();
    const t = tool(buildRunTools("mia", { internet: () => true }), "web_fetch");
    await expect(run(t, { url: "http://127.0.0.1:8787/v1/me" })).rejects.toThrow("not a public address");
    await expect(run(t, { url: "file:///etc/passwd" })).rejects.toThrow("only http(s)");
    await expect(run(t, { url: "https://user:pw@example.com/" })).rejects.toThrow("credentials");
  });

  it("reduces HTML to readable text", () => {
    const html = `<html><head><title>Mira &amp; Co</title><style>p{color:red}</style></head><body><script>alert(1)</script><h1>Card</h1><p>Line one<br>line two</p><ul><li>a</li><li>b</li></ul><!-- hidden --><p>5 &lt; 6 &#8212; ok</p></body></html>`;
    const text = htmlToText(html);
    expect(text.startsWith("# Mira & Co")).toBe(true);
    expect(text).toContain("Card");
    expect(text).toContain("Line one\nline two");
    expect(text).toContain("- a");
    expect(text).toContain("5 < 6 — ok");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("hidden");
  });
});

describe("run_budget", () => {
  it("grows with steps and context, and prices on the model", () => {
    const price = (u: { input: number; output: number }) => (u.input * 1 + u.output * 4) / 1_000_000;
    const a = estimateRun(10, 8000, price);
    expect(a.input).toBe(10 * 8000 + (1500 * 10 * 9) / 2);
    expect(a.output).toBe(4000);
    expect(a.cost).toBeCloseTo((a.input + a.output * 4) / 1_000_000);
    expect(estimateRun(10, 8000, () => null).cost).toBeNull();
  });

  it("shows the estimate on a card and passes the answer on", async () => {
    const seen: AskRequest[] = [];
    const t = tool(
      buildRunTools("mia", {
        budgetBasis: () => ({ contextTokens: 12_000, model: "a/b", price: (u) => (u.input + u.output) / 1_000_000 }),
        ask: async (q) => {
          seen.push(q);
          return "Smaller";
        },
      }),
      "run_budget",
    );
    const r = await run(t, { steps: 12, plan: "Rewrite the dashboard" });
    expect(seen[0]!.question).toContain("Rewrite the dashboard");
    expect(seen[0]!.options?.[0]).toMatchObject({ label: "Go on", recommended: true });
    expect(out(r)).toContain("about 12 steps");
    expect(out(r)).toContain("smaller run");
    expect(r.details).toMatchObject({ steps: 12, model: "a/b", answer: "Smaller" });
  });
});
