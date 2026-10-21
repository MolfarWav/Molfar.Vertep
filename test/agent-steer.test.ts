/**
 * A message sent while Molfar works (#70): the model gets it mid-run, the session keeps it
 * where it landed, the next run's history has it, and the chat shows it between the turns.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fauxProvider, fauxAssistantMessage } from "@earendil-works/pi-ai/providers/faux";
import { UserAgent } from "../src/agent/agent.js";
import { UserModelService } from "../src/models.js";
import { defaultInstanceConfig } from "../src/config.js";
import { bootstrapUserDir, userPaths } from "../src/paths.js";
import { UserService } from "../src/users.js";
import { msgsFromRuns } from "../client-agent/src/runs.js";
import type { EngineRun } from "../client-agent/src/api.js";

let dataDir: string;
beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentsteer-"));
  bootstrapUserDir(dataDir, "mia");
});
afterEach(() => {
  try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* watcher races */ }
});

const userTexts = (messages: unknown[]) =>
  messages
    .filter((m) => (m as { role: string }).role === "user")
    .map((m) => {
      const c = (m as { content: unknown }).content;
      return typeof c === "string" ? c : (c as { text?: string }[]).map((b) => b.text ?? "").join("");
    });

describe("steering a run", () => {
  it("lands after the turn it followed, in the session and the next run's history", async () => {
    const users = new UserService(dataDir);
    users.create("admin", "admin", { password: "admin-pass-1" });
    users.create("mia", "user", { password: "test-pass-1" });
    const svc = new UserModelService("mia", userPaths(dataDir, "mia"), defaultInstanceConfig());
    const handle = fauxProvider({ models: [{ id: "faux-agent" }] });
    svc.models.setProvider(handle.provider);
    let agent: UserAgent | null = null;
    const seen: string[][] = [];
    const events: string[] = [];
    handle.setResponses([
      () => {
        agent!.steer("make it blue");
        return fauxAssistantMessage([{ type: "toolCall", id: "a", name: "list_dir", arguments: { path: "." } }], { stopReason: "toolUse" });
      },
      (ctx) => {
        seen.push(userTexts(ctx.messages as unknown[]));
        return fauxAssistantMessage("blue it is");
      },
      (ctx) => {
        seen.push(userTexts(ctx.messages as unknown[]));
        return fauxAssistantMessage("still blue");
      },
    ]);
    agent = await UserAgent.create("mia", svc, userPaths(dataDir, "mia"), users, defaultInstanceConfig(), { sessionId: "s1" });
    expect((await agent.run("paint the button", { onEvent: (e) => events.push(e.type === "steer_landed" ? `steer_landed:${e.text}` : e.type === "tool_end" ? `tool_end:${e.name}` : e.type) })).finalText).toBe("blue it is");
    expect(seen[0]?.at(-1)).toBe("make it blue");
    // the page is told when the model has read the correction (#73), after the first turn's tool ran
    expect(events.filter((e) => e.startsWith("steer_landed")).length).toBe(1);
    expect(events.indexOf("steer_landed:make it blue")).toBeGreaterThan(events.indexOf("tool_end:list_dir"));

    const file = fs.readdirSync(path.join(userPaths(dataDir, "mia").root), { recursive: true }).map(String).find((f) => f.endsWith("s1.jsonl"));
    expect(file).toBeTruthy();
    const runs = fs.readFileSync(path.join(userPaths(dataDir, "mia").root, file!), "utf8").trim().split("\n").map((l) => JSON.parse(l)) as EngineRun[];
    const rec = runs.find((r) => r.type === "run") as EngineRun & { steers?: { text: string; turn: number }[] };
    expect(rec.steers).toEqual([{ text: "make it blue", turn: 1 }]);

    // a fresh agent on the same session rebuilds the history with the steer in place
    agent = await UserAgent.create("mia", svc, userPaths(dataDir, "mia"), users, defaultInstanceConfig(), { sessionId: "s1" });
    await agent.run("and the border?");
    expect(seen[1]).toEqual(["paint the button", "make it blue", "and the border?"]);

    // the chat shows: user, the first turn, the steer, the reply
    const msgs = msgsFromRuns(runs);
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(msgs[2]!.parts).toEqual([{ kind: "text", text: "make it blue" }]);
    expect(msgs[3]!.parts.at(-1)).toEqual({ kind: "text", text: "blue it is" });
  }, 30_000);
});
