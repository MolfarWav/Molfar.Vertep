/**
 * The agent tools that reach past the workspace files (run-tools.ts): the
 * plugin log, an app's own routes, one paid test generation, a public web
 * page, and the run budget.
 */
import { describe, it, expect, beforeEach } from "bun:test";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { buildRunTools, estimateRun, htmlToText, newPlanState, planGate, PLAN_FILES, type RunToolOptions } from "../src/agent/run-tools.js";
import { clearPluginLog, readPluginLog, recordPluginLog } from "../src/plugins/plugin-log.js";
import { assertInternetHost } from "../src/net-guard.js";
import type { AskRequest } from "../src/agent/tools.js";
import { groupOf, visibleTools, type ToolGroup } from "../src/agent/small-window.js";

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

describe("plan first", () => {
  it("lets three files through, refuses the fourth and any app code until the user says go", () => {
    const st = newPlanState();
    for (let i = 1; i <= PLAN_FILES; i++) expect(planGate(st, "write_file", { path: `data/x${i}.json` }, false)).toBeUndefined();
    // a file already written stays writable
    expect(planGate(st, "edit_file", { path: "./data/x1.json" }, false)).toBeUndefined();
    expect(planGate(st, "write_file", { path: "data/x4.json" }, false)).toContain("file 4");
    expect(planGate(newPlanState(), "edit_file", { path: "apps/rp/src/App.tsx" }, true)).toContain("app's code");
    // reads and other tools never wait
    expect(planGate(newPlanState(), "read_file", { path: "apps/rp/src/App.tsx" }, true)).toBeUndefined();
    st.answer = "go";
    expect(planGate(st, "write_file", { path: "data/x9.json" }, true)).toBeUndefined();
    st.answer = "stop";
    expect(planGate(st, "write_file", { path: "data/x9.json" }, false)).toContain("said stop");
  });

  it("run_budget lists the files and opens the gate on Go on, keeps it shut on Stop", async () => {
    const plan = newPlanState();
    const seen: AskRequest[] = [];
    let reply = "Go on";
    const t = tool(
      buildRunTools("mia", {
        plan,
        budgetBasis: () => ({ contextTokens: 8000, model: "a/b", price: () => null }),
        ask: async (q) => {
          seen.push(q);
          return reply;
        },
      }),
      "run_budget",
    );
    const files = ["apps/rp/src/a.ts", "apps/rp/src/b.ts", "apps/rp/src/c.ts", "apps/rp/src/d.ts", "apps/rp/src/e.ts"];
    const r = await run(t, { steps: 6, plan: "Split the editor", files });
    expect(seen[0]!.question).toContain("Changing 5 files: apps/rp/src/a.ts");
    expect(seen[0]!.question).toContain(", …");
    expect(seen[0]!.detail).toContain("- apps/rp/src/e.ts");
    expect(r.details).toMatchObject({ files });
    expect(plan.answer).toBe("go");
    reply = "Stop";
    await run(t, { steps: 6, plan: "Split the editor" });
    expect(plan.answer).toBe("stop");
  });
});

describe("image_generate", () => {
  type Row = { provider: string; id: string; label: string; api: string; connectionName?: string };
  const local: Row = { provider: "comfy", id: "sdxl", label: "SDXL local", api: "comfyui", connectionName: "My ComfyUI" };
  const paid: Row = { provider: "openrouter", id: "flux", label: "Flux", api: "openrouter-images", connectionName: "OR key" };
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("abcd")]);
  const setup = (rows: Row[], answer?: string, throwMsg?: string, favs: { ref: string; name?: string; use?: string }[] = []) => {
    const gen: { prompt: string; model: string }[] = [];
    const stored: { name: string; mime: string }[] = [];
    const asked: AskRequest[] = [];
    const images = {
      list: async () => rows as never,
      favorites: () => favs,
      generate: async (req: { prompt: string; model: string }) => {
        gen.push(req);
        if (throwMsg) throw new Error(throwMsg);
        return { data: png, mimeType: "image/png", model: req.model };
      },
      store: (_d: Buffer, mime: string, name: string) => {
        stored.push({ name, mime });
        return "/v1/assets/abc123";
      },
    };
    const ask = answer === undefined ? undefined : async (q: AskRequest) => (asked.push(q), answer);
    const t = tool(buildRunTools("mia", { images, ask }), "image_generate");
    return { t, gen, stored, asked };
  };

  it("says so when the user has no image model", async () => {
    const { t, gen } = setup([]);
    const r = await run(t, { prompt: "a cat" });
    expect(out(r)).toContain("no image model");
    expect(gen.length).toBe(0);
  });

  it("lists refs with the default first, local ones marked free, when list is true or no prompt", async () => {
    const { t, gen } = setup([local, paid]);
    for (const params of [{ list: true, prompt: "x" }, {}]) {
      const text = out(await run(t, params));
      expect(text).toContain("2 image model(s)");
      expect(text.indexOf("comfy/sdxl")).toBeLessThan(text.indexOf("openrouter/flux"));
      const localLine = text.split("\n").find((l) => l.includes("comfy/sdxl"))!;
      expect(localLine).toContain("local, free");
      expect(text.split("\n").find((l) => l.includes("openrouter/flux"))!).not.toContain("free");
    }
    expect(gen.length).toBe(0);
  });

  it("draws on a local model without asking, keeps it, and cleans the file name", async () => {
    const { t, gen, stored } = setup([paid, local], "Skip");
    const r = await run(t, { prompt: "  1girl, solo ", model: "comfy/sdxl", name: "Jude Avatar!.png" });
    expect(out(r)).toContain("/v1/assets/abc123");
    expect((r as { details?: { drawn?: boolean } }).details?.drawn).toBe(true);
    expect(gen).toEqual([{ prompt: "1girl, solo", model: "comfy/sdxl" }]);
    expect(stored[0]!.name).toBe("Jude-Avatar.png");
    const d = setup([local]);
    await run(d.t, { prompt: "x" });
    expect(d.stored[0]!.name).toMatch(/\.png$/);
    expect(d.stored[0]!.name).toBe("image.png");
  });

  it("lists only the user's list, in their order, with names and uses, when they made one", async () => {
    const other: Row = { provider: "nano", id: "kl", label: "Klein", api: "nanogpt-images", connectionName: "Nano" };
    const favs = [{ ref: "openrouter/flux", name: "Pretty", use: "backgrounds" }, { ref: "comfy/sdxl" }, { ref: "gone/x" }];
    const { t, gen, asked } = setup([local, paid, other], "Draw", undefined, favs);
    const text = out(await run(t, { list: true }));
    expect(text.indexOf("openrouter/flux: Pretty, for: backgrounds")).toBeGreaterThan(-1);
    expect(text.indexOf("openrouter/flux")).toBeLessThan(text.indexOf("comfy/sdxl"));
    expect(text).not.toContain("nano/kl");
    expect(text).toContain("(1 on their list not available now)");
    expect(text).toContain("1 other model(s)");
    expect(out(await run(t, { list: true, all: true }))).toContain("nano/kl");
    await run(t, { prompt: "a castle" }); // no model: the first favorite
    expect(gen).toEqual([{ prompt: "a castle", model: "openrouter/flux" }]);
    expect(asked.length).toBe(1); // paid: asked
  });

  it("without a list: everything, a local model first and no ask card, and a hint", async () => {
    const { t, gen, asked } = setup([paid, local], "Skip");
    const text = out(await run(t, { list: true }));
    expect(text.indexOf("comfy/sdxl")).toBeLessThan(text.indexOf("openrouter/flux"));
    expect(text).toContain("has not made a list");
    const r = await run(t, { prompt: "a castle" });
    expect(gen).toEqual([{ prompt: "a castle", model: "comfy/sdxl" }]);
    expect(asked.length).toBe(0);
    expect((r as { details?: { drawn?: boolean } }).details?.drawn).toBe(true);
  });

  it("falls back when no favorite is listed", async () => {
    const { t, gen } = setup([paid, local], "Skip", undefined, [{ ref: "gone/model" }]);
    await run(t, { prompt: "x" });
    expect(gen[0]!.model).toBe("comfy/sdxl");
  });

  it("asks before a paid picture and draws once on Draw", async () => {
    for (const api of ["openrouter-images", "nanogpt-images"]) {
      const row = { ...paid, api };
      const { t, gen, asked } = setup([row], "Draw");
      const r = await run(t, { prompt: "a castle" });
      expect(asked[0]!.question).toContain("Flux");
      expect(asked[0]!.question).toContain("OR key");
      expect(gen).toEqual([{ prompt: "a castle", model: "openrouter/flux" }]);
      expect((r as { details?: { drawn?: boolean } }).details?.drawn).toBe(true);
    }
  });

  it("does not draw on Skip, shows free text, and does not draw without an ask", async () => {
    const skip = setup([paid], "Skip");
    expect(out(await run(skip.t, { prompt: "x" }))).toContain("Not drawn");
    expect(skip.gen.length).toBe(0);
    const talk = setup([paid], "make it blue instead");
    const text = out(await run(talk.t, { prompt: "x" }));
    expect(text).toContain("Not drawn");
    expect(text).toContain("make it blue instead");
    expect(talk.gen.length).toBe(0);
    const nobody = setup([paid]);
    const r = await run(nobody.t, { prompt: "x" });
    expect(out(r)).toContain("Not drawn");
    expect((r as { details?: { drawn?: boolean } }).details?.drawn).toBe(false);
    expect(nobody.gen.length).toBe(0);
  });

  it("refuses an unknown model ref and points to the list", async () => {
    const { t, gen } = setup([local]);
    const r = await run(t, { prompt: "x", model: "nope/none" });
    expect(out(r)).toContain("list: true");
    expect((r as { details?: { drawn?: boolean } }).details?.drawn).toBe(false);
    expect(gen.length).toBe(0);
  });

  it("fails the step with the reason when drawing fails", async () => {
    const { t } = setup([local], undefined, "ComfyUI is not reachable");
    await expect(run(t, { prompt: "x" })).rejects.toThrow("Not drawn: ComfyUI is not reachable");
  });

  it("cuts the prompt to 4000 characters", async () => {
    const { t, gen } = setup([local]);
    await run(t, { prompt: "a".repeat(5000) });
    expect(gen[0]!.prompt.length).toBe(4000);
  });

  it("is absent in plan mode and without images", () => {
    const images = { list: async () => [] as never, favorites: () => [], generate: async () => ({ data: png, mimeType: "image/png", model: "m" }), store: () => "/v1/assets/x" };
    expect(buildRunTools("mia", { images }).some((t) => t.name === "image_generate")).toBe(true);
    expect(buildRunTools("mia", { images, mode: "plan" }).some((t) => t.name === "image_generate")).toBe(false);
    expect(buildRunTools("mia", {}).some((t) => t.name === "image_generate")).toBe(false);
  });

  it("belongs to the image group, hidden in small mode until unlocked", () => {
    expect(groupOf("image_generate")).toBe("image");
    const images = { list: async () => [] as never, favorites: () => [], generate: async () => ({ data: png, mimeType: "image/png", model: "m" }), store: () => "/v1/assets/x" };
    const all = buildRunTools("mia", { images });
    const names = (u: ToolGroup[]) => visibleTools(all, true, new Set(u)).map((t) => t.name);
    expect(names([])).not.toContain("image_generate");
    expect(names(["image"])).toContain("image_generate");
  });
});
