/**
 * Cost checks (#77) and the new-app guard (#78): when the agent asks about
 * money, and what happens to a file written into a folder that is not an app.
 */
import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { costChecksApply, readCostChecksMode } from "../src/agent/cost-checks.js";
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
