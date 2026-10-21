/**
 * Cost checks (#77) and the new-app guard (#78): when the agent asks about
 * money, and what happens to a file written into a folder that is not an app.
 */
import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { connectionCostChecks, costChecksApply, costChecksFor, effectiveCostChecksMode, readCostChecksMode, resolveCostChecksMode } from "../src/agent/cost-checks.js";
import { createConnection, readConnections, updateConnection, validateConnectionInput } from "../src/connections.js";
import { bootstrapUserDir } from "../src/paths.js";
import { modelShowsCost } from "../client-agent/src/lib/cost-display.js";
import { buildRunTools, newAppRefusal } from "../src/agent/run-tools.js";
import type { AskRequest } from "../src/agent/tools.js";

const tmp = (): string => fs.mkdtempSync(path.join(os.tmpdir(), "cost-checks-"));
const tool = (tools: AgentTool[], name: string): AgentTool => {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`no tool ${name}`);
  return t;
};
const run = async (t: AgentTool, params: unknown) => t.execute("t", params as never, undefined as never);
const out = (r: { content: { type: string; text?: string }[] }): string => r.content.map((c) => c.text ?? "").join("");

describe("cost checks mode", () => {
  it("reads the setting, auto when unset or wrong", () => {
    const dir = tmp();
    const file = path.join(dir, "settings.json");
    expect(readCostChecksMode(file, {})).toBe("auto");
    fs.writeFileSync(file, JSON.stringify({ costChecks: "off" }));
    expect(readCostChecksMode(file, {})).toBe("off");
    fs.writeFileSync(file, JSON.stringify({ costChecks: "on" }));
    expect(readCostChecksMode(file, {})).toBe("on");
    fs.writeFileSync(file, JSON.stringify({ costChecks: "sometimes" }));
    expect(readCostChecksMode(file, {})).toBe("auto");
  });

  it("MOLFAR_VERTEP_COST_CHECKS=off wins over the setting, the old name too", () => {
    const dir = tmp();
    const file = path.join(dir, "settings.json");
    fs.writeFileSync(file, JSON.stringify({ costChecks: "on" }));
    expect(readCostChecksMode(file, { MOLFAR_VERTEP_COST_CHECKS: "off" })).toBe("off");
    expect(readCostChecksMode(file, { CHRYSALIS_COST_CHECKS: "OFF" })).toBe("off");
    expect(readCostChecksMode(file, { MOLFAR_VERTEP_COST_CHECKS: "on" })).toBe("on");
  });

  it("auto skips a model on loopback, the LAN or a container name, and keeps a hosted one", () => {
    const m = (baseUrl: string) => ({ baseUrl });
    for (const url of ["http://localhost:8080/v1", "http://127.0.0.1:11434/v1", "http://192.168.1.20:8080/v1", "http://llama-swap:8080/v1", "http://host.docker.internal:1234/v1", "http://[::1]:8000/v1"]) {
      expect(costChecksApply("auto", m(url))).toBe(false);
    }
    for (const url of ["https://api.openai.com/v1", "https://openrouter.ai/api/v1", "http://169.254.169.254/v1"]) {
      expect(costChecksApply("auto", m(url))).toBe(true);
    }
    expect(costChecksApply("auto", {})).toBe(true);
    expect(costChecksApply("on", m("http://localhost:8080/v1"))).toBe(true);
    expect(costChecksApply("off", m("https://api.openai.com/v1"))).toBe(false);
  });
});

describe("questions about money in the tools", () => {
  const generate = async () => ({ model: "m/x", text: "ok", usage: { input: 5, output: 2 } }) as never;
  const messages = [{ role: "user", content: "hi" }];

  it("model_try asks by default and goes straight through when confirm is false", async () => {
    const seen: AskRequest[] = [];
    const ask = async (q: AskRequest) => {
      seen.push(q);
      return "Send";
    };
    const asked = tool(buildRunTools("mia", { ask, tryModel: { resolve: () => ({ ref: "m/x", price: () => 0.01 }), generate } }), "model_try");
    expect(out(await run(asked, { messages }))).toContain("ok");
    expect(seen.length).toBe(1);

    seen.length = 0;
    const local = tool(buildRunTools("mia", { ask, tryModel: { resolve: () => ({ ref: "m/x", price: () => null, confirm: false }), generate } }), "model_try");
    expect(out(await run(local, { messages }))).toContain("ok");
    expect(seen.length).toBe(0);
    // no one to ask is fine too: nothing to confirm
    const noAsk = tool(buildRunTools("mia", { tryModel: { resolve: () => ({ ref: "m/x", price: () => null, confirm: false }), generate } }), "model_try");
    expect(out(await run(noAsk, { messages }))).toContain("ok");
  });

  it("run_budget is built only with its basis", () => {
    const basis = { contextTokens: 1000, model: "a/b", price: () => 0 };
    expect(buildRunTools("mia", { budgetBasis: () => basis }).some((t) => t.name === "run_budget")).toBe(true);
    expect(buildRunTools("mia", {}).some((t) => t.name === "run_budget")).toBe(false);
  });
});

describe("new app guard", () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, "apps", "real"), { recursive: true });
  fs.writeFileSync(path.join(root, "apps", "real", "manifest.json"), "{}");

  it("refuses a file in a folder with no manifest and points at app_create", () => {
    const why = newAppRefusal(root, "write_file", { path: "apps/messenger/src/App.tsx", content: "x" });
    expect(why).toContain("app_create");
    expect(why).toContain('"messenger"');
    expect(newAppRefusal(root, "write_file", { path: "./apps\\messenger\\index.html", content: "x" })).toContain("app_create");
  });

  it("lets through real apps, the manifest itself, other paths and other tools", () => {
    expect(newAppRefusal(root, "write_file", { path: "apps/real/src/App.tsx", content: "x" })).toBeUndefined();
    expect(newAppRefusal(root, "write_file", { path: "apps/messenger/manifest.json", content: "{}" })).toBeUndefined();
    expect(newAppRefusal(root, "write_file", { path: "projects/demo/index.html", content: "x" })).toBeUndefined();
    expect(newAppRefusal(root, "write_file", { path: "notes/apps/x.md", content: "x" })).toBeUndefined();
    expect(newAppRefusal(root, "read_file", { path: "apps/messenger/src/App.tsx" })).toBeUndefined();
  });
});

describe("a connection's own cost checks (#91)", () => {
  const paid = { baseUrl: "https://api.example.com/v1" };
  const mkUser = () => bootstrapUserDir(tmp(), "alice");

  it("the override beats the global setting, unset follows it", () => {
    expect(resolveCostChecksMode("on", "off", {})).toBe("off");
    expect(resolveCostChecksMode("off", "on", {})).toBe("on");
    expect(resolveCostChecksMode("off", undefined, {})).toBe("off");
    expect(resolveCostChecksMode("on", undefined, {})).toBe("on");
    expect(resolveCostChecksMode("on", "auto", {})).toBe("auto");
  });

  it("the instance switch MOLFAR_VERTEP_COST_CHECKS=off beats every override", () => {
    expect(resolveCostChecksMode("on", "on", { MOLFAR_VERTEP_COST_CHECKS: "off" })).toBe("off");
  });

  it("finds the connection of a model: a custom connection by id, a builtin one by provider id", () => {
    const conns = {
      c_a: { name: "A", api: "openai-completions", baseUrl: "https://a.example/v1", costChecks: "off" },
      c_b: { name: "B", providerId: "openrouter", costChecks: "on" },
      c_c: { name: "C", api: "openai-completions", baseUrl: "https://c.example/v1" },
    } as const;
    expect(connectionCostChecks(conns as never, "c_a")).toBe("off");
    expect(connectionCostChecks(conns as never, "openrouter")).toBe("on");
    expect(connectionCostChecks(conns as never, "c_c")).toBeUndefined();
    expect(connectionCostChecks(conns as never, "unknown")).toBeUndefined();
    expect(connectionCostChecks(conns as never, undefined)).toBeUndefined();
  });

  it("reads the effective mode and the yes or no for a model from the user's files", () => {
    const p = mkUser();
    const a = createConnection(p, { name: "Quiet", api: "openai-completions", baseUrl: "https://quiet.example/v1", models: "auto", costChecks: "off" });
    const b = createConnection(p, { name: "Loud", api: "openai-completions", baseUrl: "https://loud.example/v1", models: "auto", costChecks: "on" });
    const c = createConnection(p, { name: "Plain", api: "openai-completions", baseUrl: "https://plain.example/v1", models: "auto" });
    expect(readConnections(p).connections[c.id]?.costChecks).toBeUndefined();
    fs.writeFileSync(p.settings, JSON.stringify({ costChecks: "on" }));
    expect(effectiveCostChecksMode(p, { provider: a.id }, {})).toBe("off");
    expect(effectiveCostChecksMode(p, { provider: c.id }, {})).toBe("on");
    expect(costChecksFor(p, { provider: a.id, ...paid }, {})).toBe(false);
    expect(costChecksFor(p, { provider: c.id, ...paid }, {})).toBe(true);
    fs.writeFileSync(p.settings, JSON.stringify({ costChecks: "off" }));
    expect(costChecksFor(p, { provider: b.id, ...paid }, {})).toBe(true);
    expect(costChecksFor(p, { provider: c.id, ...paid }, {})).toBe(false);
    // a local model under a connection set to on is still asked about
    expect(costChecksFor(p, { provider: b.id, baseUrl: "http://localhost:8080/v1" }, {})).toBe(true);
  });

  it("validates the value on create and rejects a wrong one", () => {
    const ok = validateConnectionInput({ name: "X", api: "openai-completions", baseUrl: "https://x.example/v1", costChecks: "off" });
    expect(ok.ok && ok.value.costChecks).toBe("off");
    const builtin = validateConnectionInput({ name: "X", providerId: "openrouter", key: "k", costChecks: "on" });
    expect(builtin.ok && builtin.value.costChecks).toBe("on");
    const unset = validateConnectionInput({ name: "X", api: "openai-completions", baseUrl: "https://x.example/v1" });
    expect(unset.ok && unset.value.costChecks).toBeUndefined();
    const bad = validateConnectionInput({ name: "X", api: "openai-completions", baseUrl: "https://x.example/v1", costChecks: "sometimes" });
    expect(bad.ok).toBe(false);
    const wrongType = validateConnectionInput({ name: "X", providerId: "openrouter", costChecks: true });
    expect(wrongType.ok).toBe(false);
  });

  it("patches the value and clears it with null", () => {
    const p = mkUser();
    const c = createConnection(p, { name: "Plain", api: "openai-completions", baseUrl: "https://plain.example/v1", models: "auto" });
    expect(updateConnection(p, c.id, { costChecks: "off" })?.costChecks).toBe("off");
    expect(readConnections(p).connections[c.id]?.costChecks).toBe("off");
    expect(updateConnection(p, c.id, { name: "Renamed" })?.costChecks).toBe("off");
    expect(updateConnection(p, c.id, { costChecks: null })?.costChecks).toBeUndefined();
    expect(Object.keys(readConnections(p).connections[c.id] ?? {})).not.toContain("costChecks");
  });
});

describe("price figures on the agent page (#91)", () => {
  const model = (id: string, costChecks?: boolean, shown = true) =>
    ({ provider: "c_x", modelId: id, label: id, connectionName: null, reasoning: false, reasoningLevels: [], contextWindow: null, shown, images: false, ...(costChecks === undefined ? {} : { costChecks }) });
  const models = [model("paid", true), model("quiet", false), model("old")];

  it("hides the price for a model whose cost checks are off, keeps it otherwise", () => {
    expect(modelShowsCost(models, "c_x/quiet")).toBe(false);
    expect(modelShowsCost(models, "c_x/paid")).toBe(true);
  });

  it("counts an engine that sends no flag, an unknown model and no model as on", () => {
    expect(modelShowsCost(models, "c_x/old")).toBe(true);
    expect(modelShowsCost(models, "c_x/missing")).toBe(true);
    expect(modelShowsCost([], null)).toBe(true);
  });

  it("with no model named, the first shown model decides", () => {
    expect(modelShowsCost([model("a", false, false), model("b", true)], null)).toBe(true);
    expect(modelShowsCost([model("a", false), model("b", true)], null)).toBe(false);
  });
});
