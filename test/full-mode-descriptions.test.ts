import { describe, expect, test } from "bun:test";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { visibleTools } from "../src/agent/small-window.js";

const tool = (name: string, description: string, parameters: unknown = { type: "object", properties: { a: { type: "string", description: "keep me" } } }) =>
  ({ name, label: name, description, parameters, execute: async () => ({ content: [] }) }) as unknown as AgentTool;

describe("tool descriptions in full mode (issue #101)", () => {
  const long = "x".repeat(900);
  const all = [tool("read_file", long), tool("git", long), tool("checkpoint", long), tool("web_fetch", long), tool("app_rebuild", long)];
  const unlocked = new Set(["app"] as const);

  test("a tool with a short description is sent with it; one without keeps its own", () => {
    const sent = visibleTools(all, false, unlocked);
    const text = (n: string) => sent.find((t) => t.name === n)!.description;
    expect(text("read_file")).toBe(long);
    for (const n of ["git", "checkpoint", "web_fetch", "app_rebuild"]) expect(text(n).length).toBeLessThan(long.length / 2);
  });

  test("parameters are never touched", () => {
    const sent = visibleTools(all, false, unlocked);
    for (const t of sent) expect(JSON.stringify(t.parameters)).toContain("keep me");
  });

  test("the facts the model acts on survive", () => {
    const sent = visibleTools(all, false, unlocked);
    const text = (n: string) => sent.find((t) => t.name === n)!.description;
    // restoring a checkpoint leaves data/ alone only unless files are named in `data`
    expect(text("checkpoint")).toContain("`data`");
    expect(text("checkpoint")).not.toContain("never touched");
    // git has no staging area, branches or remotes
    expect(text("git")).toContain("no staging area");
    expect(text("git")).toContain("no branches");
  });

  test("small mode keeps its shorter text for the same tool", () => {
    const small = visibleTools(all, true, unlocked).find((t) => t.name === "git")!.description;
    const full = visibleTools(all, false, unlocked).find((t) => t.name === "git")!.description;
    expect(small.length).toBeLessThan(full.length);
  });
});
