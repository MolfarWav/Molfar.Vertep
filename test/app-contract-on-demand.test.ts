/**
 * The active app's contract on demand (issue #174): with the switch
 * `appContractOnDemand` OFF (the default) the system prompt is what it always
 * was; ON, the contract arrives with the first tool result that touches the
 * app, once per task, and survives folding.
 */
import { getCurrentSystemPrompt } from "@earendil-works/pi-ai";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fauxAssistantMessage, fauxProvider } from "@earendil-works/pi-ai/providers/faux";
import { UserAgent, instructionDocsStamp } from "../src/agent/agent.js";
import {
  appContractOnDemandEnabled,
  appContractText,
  appsNamed,
  contractPointer,
  isMutatingCall,
  splitContracts,
} from "../src/agent/app-contract.js";
import { estimateTextTokens, fitContext } from "../src/agent/context-budget.js";
import { foldToolResults, KEEP_STEPS } from "../src/agent/context-fold.js";
import { projectPromptSection } from "../src/agent/projects.js";
import { defaultInstanceConfig } from "../src/config.js";
import { UserModelService } from "../src/models.js";
import { bootstrapUserDir, userPaths, type UserPaths } from "../src/paths.js";
import { UserService } from "../src/users.js";
import { invalidatePluginCache } from "../src/plugins/runtime.js";

let dataDir: string;
let p: UserPaths;
let users: UserService;
let token: string;

// the contract text is long on purpose (as the real one is) and carries markers
const RULES = (id: string): string => `# AGENTS.md: ${id}\nMARKER-RULES-${id}\n${"Change data/ first, never the source.\n".repeat(120)}`;
const SHAPES = (id: string): string => `# data/ of ${id}\nMARKER-SHAPES-${id}\n${"cards live in characters/<id>/card.json\n".repeat(60)}`;

function put(rel: string, text: string): void {
  fs.mkdirSync(path.dirname(path.join(p.root, rel)), { recursive: true });
  fs.writeFileSync(path.join(p.root, rel), text);
}
function makeApp(id: string): void {
  put(`apps/${id}/manifest.json`, JSON.stringify({ name: id, version: "1", kind: "web", origin: "local" }));
  put(`apps/${id}/AGENTS.md`, RULES(id));
  put(`apps/${id}/data/README.md`, SHAPES(id));
  put(`apps/${id}/data/characters/kit/card.json`, '{"name":"Kit"}');
  put(`apps/${id}/src/App.tsx`, "export const App = 1;");
}
function settings(extra: Record<string, unknown> = {}): void {
  put("settings.json", JSON.stringify({ activeApp: "rp", agentProtectedPaths: [], ...extra }));
}

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "contract-"));
  p = bootstrapUserDir(dataDir, "mia");
  makeApp("rp");
  makeApp("other");
  users = new UserService(dataDir);
  token = users.create("mia", "user", { password: "test-pass-1" }).token;
});
afterEach(() => {
  try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* watcher races */ }
  invalidatePluginCache();
});

type Ctx = { messages: unknown[] };
type Call = { name: string; arguments: Record<string, unknown> };
const toolCall = (id: string, c: Call) => fauxAssistantMessage([{ type: "toolCall", id, name: c.name, arguments: c.arguments as never }], { stopReason: "toolUse" });
const textOfContent = (c: unknown): string =>
  typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join("") : "";
const allText = (ctx: Ctx): string =>
  ctx.messages
    .map((m) => ({ role: (m as { role: string }).role, text: textOfContent((m as { content: unknown }).content) }))
    // tool results, and the notice a window trim leaves in place of the history it cut
    .filter((m) => m.role === "toolResult" || (m.role === "user" && m.text.includes("Earlier context was trimmed")))
    .map((m) => m.text)
    .join("\n----\n");
const count = (hay: string, needle: string): number => hay.split(needle).length - 1;

/** One agent; each entry of `runs` is a task whose tool calls go one per model call. Returns what the model saw after each call. */
async function drive(runs: Call[][], opts: { project?: string; window?: number } = {}): Promise<{ system: string; seen: string[][]; agent: UserAgent }> {
  const svc = new UserModelService("mia", userPaths(dataDir, "mia"), defaultInstanceConfig());
  const handle = fauxProvider({ models: [{ id: "faux-a", ...(opts.window ? { contextWindow: opts.window } : {}) }] });
  svc.models.setProvider(handle.provider);
  let system = "";
  const seen: string[][] = runs.map(() => []);
  const responses: Parameters<typeof handle.setResponses>[0] = [];
  runs.forEach((calls, r) => {
    calls.forEach((c, i) => {
      responses.push((ctx) => {
        if (!system) system = getCurrentSystemPrompt((ctx as Ctx).messages as never);
        if (i > 0) seen[r]!.push(allText(ctx as Ctx));
        return toolCall(`t${r}-${i}`, c);
      });
    });
    responses.push((ctx) => {
      seen[r]!.push(allText(ctx as Ctx));
      if (!system) system = getCurrentSystemPrompt((ctx as Ctx).messages as never);
      return fauxAssistantMessage("done");
    });
  });
  handle.setResponses(responses);
  const agent = await UserAgent.create("mia", svc, userPaths(dataDir, "mia"), users, defaultInstanceConfig(), opts.project ? { project: opts.project } : {});
  for (const [r] of runs.entries()) {
    await agent.run(`task ${r}`);
    await new Promise((res) => setTimeout(res, 5));
  }
  return { system, seen, agent };
}

describe("the switch and the markers", () => {
  it("is off unless settings.json says true", () => {
    const file = path.join(dataDir, "s.json");
    expect(appContractOnDemandEnabled(file)).toBe(false);
    for (const [v, want] of [[true, true], [false, false], ["yes", false], [1, false]] as const) {
      fs.writeFileSync(file, JSON.stringify({ appContractOnDemand: v }));
      expect(appContractOnDemandEnabled(file)).toBe(want);
    }
    fs.writeFileSync(file, "not json");
    expect(appContractOnDemandEnabled(file)).toBe(false);
  });

  it("a flip changes the docs stamp, so a cached agent is rebuilt", () => {
    settings();
    const off = instructionDocsStamp(p);
    settings({ appContractOnDemand: false });
    expect(instructionDocsStamp(p)).toBe(off);
    settings({ appContractOnDemand: true });
    expect(instructionDocsStamp(p)).not.toBe(off);
  });

  it("the settings route stores the switch and refuses a non-boolean", async () => {
    const { buildApp } = await import("../src/server/app.js");
    const { SessionService } = await import("../src/sessions.js");
    const { EventBus } = await import("../src/server/ws.js");
    const app = buildApp({ users, sessions: new SessionService(dataDir), config: defaultInstanceConfig(), dataDir, bus: new EventBus() as never });
    const call = (method: string, body?: unknown) =>
      app.request("/v1/settings", { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    expect(((await (await call("GET")).json()) as { appContractOnDemand: boolean }).appContractOnDemand).toBe(false);
    expect((await call("PUT", { appContractOnDemand: "yes" })).status).toBe(400);
    expect((await call("PUT", { appContractOnDemand: true })).status).toBe(200);
    expect(((await (await call("GET")).json()) as { appContractOnDemand: boolean }).appContractOnDemand).toBe(true);
    expect(instructionDocsStamp(p)).toContain("appContractOnDemand");
  });

  it("finds the apps a call names: paths, arrays, nested edits, shell and git text, app tool ids", () => {
    expect(appsNamed("read_file", { path: "apps/rp/data/x.json" })).toEqual(["rp"]);
    expect(appsNamed("read_file", { paths: ["notes/a.md", "apps/rp/src/a.ts", "apps/other/AGENTS.md"] })).toEqual(["rp", "other"]);
    expect(appsNamed("edit_file", { path: "x", edits: [{ oldText: "see apps/other/data", newText: "y" }] })).toEqual(["other"]);
    expect(appsNamed("grep", { pattern: "x", path: "apps/rp" })).toEqual(["rp"]);
    expect(appsNamed("bash", { command: "cd /workspace && cat ./apps/rp/data/chats.json | head" })).toEqual(["rp"]);
    expect(appsNamed("bash", { command: "ls -la apps\\rp\\data" })).toEqual(["rp"]);
    expect(appsNamed("git", { args: "log --oneline -n 5 -- apps/rp" })).toEqual(["rp"]);
    expect(appsNamed("app_check", { id: "rp" })).toEqual(["rp"]);
    expect(appsNamed("json_get", { path: "apps/rp/data/a.json", pointer: "/x" })).toEqual(["rp"]);
    // not an app: staging, a longer name, a path that only ends in apps
    expect(appsNamed("read_file", { path: "apps/.staging/x" })).toEqual([]);
    expect(appsNamed("read_file", { path: "notes/apps.md" })).toEqual([]);
    expect(appsNamed("bash", { command: "ls myapps/rp" })).toEqual([]);
  });

  it("tells a call that changes things from one that reads", () => {
    expect(isMutatingCall("write_file", { path: "apps/rp/x" })).toBe(true);
    expect(isMutatingCall("edit_file", { path: "apps/rp/x" })).toBe(true);
    expect(isMutatingCall("json_set", { path: "apps/rp/x" })).toBe(true);
    expect(isMutatingCall("app_deps", { id: "rp" })).toBe(true);
    expect(isMutatingCall("read_file", { path: "apps/rp/x" })).toBe(false);
    expect(isMutatingCall("grep", { path: "apps/rp" })).toBe(false);
    expect(isMutatingCall("app_check", { id: "rp" })).toBe(false);
    expect(isMutatingCall("bash", { command: "cat apps/rp/data/a.json | jq .name" })).toBe(false);
    expect(isMutatingCall("bash", { command: "ls apps/rp && grep -rn Kit apps/rp/data" })).toBe(false);
    expect(isMutatingCall("bash", { command: "echo x > apps/rp/data/a.json" })).toBe(true);
    expect(isMutatingCall("bash", { command: "sed -i s/a/b/ apps/rp/data/a.json" })).toBe(true);
    expect(isMutatingCall("bash", { command: "rm apps/rp/src/a.ts" })).toBe(true);
    expect(isMutatingCall("bash", { command: "python3 - <<'PY'\nopen('apps/rp/x','w')\nPY" })).toBe(true);
    expect(isMutatingCall("git", { args: "log -- apps/rp" })).toBe(false);
    expect(isMutatingCall("git", { args: "commit -m x" })).toBe(true);
  });

  it("the contract text carries both files between markers, and splits back out", () => {
    const text = appContractText(p.root, "rp")!;
    expect(text).toContain("MARKER-RULES-rp");
    expect(text).toContain("MARKER-SHAPES-rp");
    expect(appContractText(p.root, "nope")).toBeNull();
    const { body, blocks, ids } = splitContracts(`file text\n\n${text}\n\nafter`);
    expect(ids).toEqual(["rp"]);
    expect(body).toBe("file text\n\nafter");
    expect(blocks).toContain("MARKER-RULES-rp");
    expect(splitContracts("plain")).toEqual({ body: "plain", blocks: "", ids: [] });
    expect(contractPointer("rp")).toContain("apps/rp/AGENTS.md");
  });
});

describe("the system prompt", () => {
  it("OFF: the contract rides the prompt as it always did, with or without an explicit false", async () => {
    settings();
    const a = await drive([[]]);
    settings({ appContractOnDemand: false });
    const b = await drive([[]]);
    expect(a.system).toBe(b.system);
    expect(a.system).toContain("# The active app's own contract: rp (apps/rp/AGENTS.md)\n# AGENTS.md: rp\nMARKER-RULES-rp");
    expect(a.system).toContain("# The active app's data shapes: rp (apps/rp/data/README.md)\n# data/ of rp\nMARKER-SHAPES-rp");
    expect(a.system).not.toContain("not in this prompt");
    // the other app's contract is only named
    expect(a.system).not.toContain("MARKER-RULES-other");
  }, 30_000);

  it("OFF: a project chat of the app keeps its Instructions section", async () => {
    settings();
    const r = await drive([[]], { project: "app:rp" });
    expect(r.system).toContain("## Instructions (apps/rp/AGENTS.md)\n# AGENTS.md: rp");
    expect(count(r.system, "MARKER-RULES-rp")).toBe(2);
  }, 30_000);

  it("ON: the contract is out of the prompt and a pointer stands in", async () => {
    settings({ appContractOnDemand: true });
    const r = await drive([[]]);
    expect(r.system).not.toContain("MARKER-RULES-rp");
    expect(r.system).not.toContain("MARKER-SHAPES-rp");
    expect(r.system).toContain(contractPointer("rp"));
    expect(r.system).toContain("apps/rp/data/README.md");
    expect(r.system).toContain("first tool result");
    // the workspace contract and the rest are untouched
    expect(r.system).toContain("# The workspace contract (AGENTS.md)");
  }, 30_000);

  it("ON: a project chat of the app has the contract from the start, once", async () => {
    settings({ appContractOnDemand: true });
    const r = await drive([[]], { project: "app:rp" });
    expect(count(r.system, "MARKER-RULES-rp")).toBe(1);
    expect(count(r.system, "MARKER-SHAPES-rp")).toBe(1);
    expect(r.system).not.toContain("not in this prompt");
    expect(r.system).toContain("## Instructions (apps/rp/AGENTS.md)\nIn the app's contract section of this prompt.");
  }, 30_000);

  it("ON: a project chat of another app has that app's contract, and a pointer for the active one", async () => {
    settings({ appContractOnDemand: true });
    const r = await drive([[]], { project: "app:other" });
    expect(count(r.system, "MARKER-RULES-other")).toBe(1);
    expect(r.system).not.toContain("MARKER-RULES-rp");
    expect(r.system).toContain(contractPointer("rp"));
  }, 30_000);

  it("ON saves the contract's tokens in a plain chat and the duplicate in a project chat", async () => {
    settings();
    const off = await drive([[]]);
    const offProject = await drive([[]], { project: "app:rp" });
    settings({ appContractOnDemand: true });
    const on = await drive([[]]);
    const onProject = await drive([[]], { project: "app:rp" });
    const t = estimateTextTokens;
    expect(t(on.system)).toBeLessThan(t(off.system) - 1000);
    expect(t(onProject.system)).toBeLessThan(t(offProject.system));
  }, 60_000);

  it("the project section drops only the app's own AGENTS.md copy", () => {
    put("apps/rp/.project/project.json", JSON.stringify({ title: "RP" }));
    put("apps/rp/.memory/MEMORY.md", "# Memory\n\n- 2026-10-01: keep cards short\n");
    const full = projectPromptSection(p.root, "app:rp");
    const slim = projectPromptSection(p.root, "app:rp", { appInstructionsInPrompt: true });
    expect(full).toContain("MARKER-RULES-rp");
    expect(slim).not.toContain("MARKER-RULES-rp");
    expect(slim).toContain("keep cards short");
    expect(estimateTextTokens(slim)).toBeLessThan(estimateTextTokens(full) - 500);
    // a free project's PROJECT.md is its own and stays
    put("projects/notes/PROJECT.md", "free project rules");
    expect(projectPromptSection(p.root, "project:notes", { appInstructionsInPrompt: true })).toContain("free project rules");
  });
});

describe("delivery on the first touch", () => {
  beforeEach(() => settings({ appContractOnDemand: true }));

  const contractsIn = (s: string, id = "rp"): number => count(s, `[App contract: apps/${id} `);

  it("a read of a file under the app delivers it once; a second touch does not repeat it", async () => {
    const r = await drive([
      [
        { name: "read_file", arguments: { path: "apps/rp/data/characters/kit/card.json" } },
        { name: "read_file", arguments: { path: "apps/rp/src/App.tsx" } },
      ],
    ]);
    const [afterFirst, afterSecond] = r.seen[0]!;
    expect(contractsIn(afterFirst!)).toBe(1);
    expect(afterFirst).toContain("MARKER-RULES-rp");
    expect(afterFirst).toContain("MARKER-SHAPES-rp");
    expect(afterFirst).toContain('"name":"Kit"');
    // the second touch adds nothing: still one contract in the whole context
    expect(contractsIn(afterSecond!)).toBe(1);
    expect(count(afterSecond!, "MARKER-RULES-rp")).toBe(1);
  }, 30_000);

  it("a call that touches nothing under apps/ delivers nothing", async () => {
    put("notes/a.md", "a note");
    const r = await drive([[{ name: "read_file", arguments: { path: "notes/a.md" } }]]);
    expect(r.seen[0]!.at(-1)).not.toContain("MARKER-RULES");
  }, 30_000);

  it("paths in an array, grep, json_get and git each deliver", async () => {
    const classes: Call[] = [
      { name: "read_file", arguments: { paths: ["notes/none.md", "apps/rp/src/App.tsx"] } },
      { name: "grep", arguments: { pattern: "Kit", path: "apps/rp" } },
      { name: "json_get", arguments: { path: "apps/rp/data/characters/kit/card.json", pointer: "/name" } },
      { name: "git", arguments: { args: "log --oneline -n 3 -- apps/rp" } },
    ];
    for (const c of classes) {
      const r = await drive([[c]]);
      const last = r.seen[0]!.at(-1)!;
      expect(contractsIn(last), c.name).toBe(1);
      expect(last, c.name).toContain("MARKER-RULES-rp");
    }
  }, 60_000);

  it("a first call that would change the app is held back with the contract, and goes through when repeated", async () => {
    const edit: Call = { name: "edit_file", arguments: { path: "apps/rp/data/characters/kit/card.json", edits: [{ oldText: '"Kit"', newText: '"Kit2"' }] } };
    const r = await drive([[edit, edit]]);
    const [afterBlock, afterRepeat] = r.seen[0]!;
    expect(afterBlock).toContain("Not run");
    expect(contractsIn(afterBlock!)).toBe(1);
    expect(afterBlock).toContain("MARKER-SHAPES-rp");
    // nothing was written by the first, held-back call
    expect(afterRepeat).not.toContain("Refused");
    expect(fs.readFileSync(path.join(p.root, "apps/rp/data/characters/kit/card.json"), "utf8")).toBe('{"name":"Kit2"}');
    // the repeat did not bring the contract again
    expect(contractsIn(afterRepeat!)).toBe(1);
  }, 30_000);

  it("write_file to the app is held back the same way", async () => {
    const w: Call = { name: "write_file", arguments: { path: "apps/rp/data/new.json", content: "{}" } };
    const r = await drive([[w]]);
    expect(r.seen[0]!.at(-1)).toContain("MARKER-RULES-rp");
    expect(fs.existsSync(path.join(p.root, "apps/rp/data/new.json"))).toBe(false);
  }, 30_000);

  it("a touch of a different app delivers that app's own contract", async () => {
    const r = await drive([
      [
        { name: "read_file", arguments: { path: "apps/rp/src/App.tsx" } },
        { name: "read_file", arguments: { path: "apps/other/src/App.tsx" } },
      ],
    ]);
    const end = r.seen[0]!.at(-1)!;
    expect(contractsIn(end, "rp")).toBe(1);
    expect(contractsIn(end, "other")).toBe(1);
    expect(end).toContain("MARKER-RULES-other");
  }, 30_000);

  it("the next task delivers it again, and the old delivery is folded away", async () => {
    const r = await drive([
      [{ name: "read_file", arguments: { path: "apps/rp/src/App.tsx" } }],
      [{ name: "read_file", arguments: { path: "apps/rp/data/characters/kit/card.json" } }],
    ]);
    const end = r.seen[1]!.at(-1)!;
    expect(contractsIn(end)).toBe(1);
    expect(end).toContain("was delivered here");
  }, 30_000);

  it("a project chat of the app never delivers it on a tool result: it is in the prompt", async () => {
    const r = await drive([[{ name: "read_file", arguments: { path: "apps/rp/src/App.tsx" } }]], { project: "app:rp" });
    expect(contractsIn(r.seen[0]!.at(-1)!)).toBe(0);
    expect(count(r.system, "MARKER-RULES-rp")).toBe(1);
  }, 30_000);

  it("a window trim that cuts the delivered contract out brings it again with the next touch", async () => {
    // a window this small cuts old history as soon as a few results pile up (the full prompt, not the small-window one)
    settings({ appContractOnDemand: true, smallModelMode: "off" });
    const read = (n: number): Call => ({ name: "read_file", arguments: { path: `apps/rp/data/chunk${n}.txt` } });
    for (let n = 0; n < 8; n++) put(`apps/rp/data/chunk${n}.txt`, `chunk ${n}\n${"padding line\n".repeat(300)}`);
    const r = await drive([[read(0), read(1), read(2), read(3), read(4), read(5), read(6), read(7)]], { window: 20_000 });
    const sent = r.seen[0]!;
    // no request carried it twice; the trim cut it out again and again, and each next touch brought it back
    expect(sent.every((t) => contractsIn(t) <= 1)).toBe(true);
    expect(sent.some((t) => t.includes("Earlier context was trimmed"))).toBe(true);
    expect(sent.filter((t) => contractsIn(t) === 1).length).toBeGreaterThanOrEqual(2);
  }, 60_000);

  it("OFF delivers nothing on a tool result", async () => {
    settings();
    const r = await drive([[{ name: "read_file", arguments: { path: "apps/rp/src/App.tsx" } }]]);
    expect(contractsIn(r.seen[0]!.at(-1)!)).toBe(0);
    expect(r.system).toContain("MARKER-RULES-rp");
  }, 30_000);
});

describe("folding keeps a delivered contract", () => {
  type M = Record<string, unknown>;
  const assistant = (id: string, ts: number): M => ({ role: "assistant", timestamp: ts, content: [{ type: "toolCall", id, name: "read_file", arguments: { path: `apps/rp/src/f${id}.ts` } }] });
  const result = (id: string, text: string, ts: number): M => ({ role: "toolResult", toolCallId: id, timestamp: ts, content: [{ type: "text", text }] });
  const contract = (): string => appContractText(p.root, "rp")!;
  const textOf = (m: M): string => (m.content as { text: string }[]).map((b) => b.text).join("");

  it("an old step of this run keeps the contract whole while its own text is cut", () => {
    const t0 = 1000;
    const msgs: M[] = [{ role: "user", timestamp: t0, content: [{ type: "text", text: "go" }] }];
    msgs.push(assistant("a", t0 + 1), result("a", `${"long file line\n".repeat(400)}\n\n${contract()}`, t0 + 2));
    for (let i = 0; i < KEEP_STEPS + 2; i++) msgs.push(assistant(`s${i}`, t0 + 10 + i), result(`s${i}`, "short", t0 + 10 + i));
    const { messages } = foldToolResults(msgs as never, t0);
    const folded = textOf(messages[2] as never as M);
    expect(folded).toContain("more characters of this older result left out");
    expect(folded).toContain("MARKER-RULES-rp");
    expect(folded).toContain("MARKER-SHAPES-rp");
    expect(folded).toContain("[End of the contract of apps/rp]");
    expect(folded.length).toBeLessThan(contract().length + 2000);
  });

  it("an older copy of a file read again is a stub, and the contract that rode it stays", () => {
    const t0 = 1000;
    const msgs: M[] = [{ role: "user", timestamp: t0, content: [{ type: "text", text: "go" }] }];
    const read = (id: string, ts: number) => assistant(id, ts);
    const call = (id: string): M => ({ role: "assistant", timestamp: 0, content: [{ type: "toolCall", id, name: "read_file", arguments: { path: "apps/rp/src/same.ts" } }] });
    msgs.push({ ...call("x"), timestamp: t0 + 1 }, result("x", `first copy\n\n${contract()}`, t0 + 2));
    msgs.push({ ...call("y"), timestamp: t0 + 3 }, result("y", "second copy", t0 + 4));
    void read;
    const { messages } = foldToolResults(msgs as never, t0);
    const stub = textOf(messages[2] as never as M);
    expect(stub).toContain("an older copy, dropped to save tokens");
    expect(stub).toContain("MARKER-RULES-rp");
  });

  it("a contract delivered in an earlier task is replaced by one line", () => {
    const t0 = 5000;
    const msgs: M[] = [
      { role: "user", timestamp: 1, content: [{ type: "text", text: "earlier" }] },
      assistant("e", 2),
      result("e", `some result\n\n${contract()}`, 3),
      { role: "user", timestamp: t0, content: [{ type: "text", text: "now" }] },
    ];
    const { messages } = foldToolResults(msgs as never, t0);
    const folded = textOf(messages[2] as never as M);
    expect(folded).not.toContain("MARKER-RULES-rp");
    expect(folded).toContain("the contract of apps/rp was delivered here");
    expect(folded).toContain("some result");
  });

  it("window-pressure clipping leaves the contract whole too", () => {
    const filler = (i: number): M[] => [assistant(`f${i}`, 10 + i), result(`f${i}`, "x".repeat(8000), 10 + i)];
    const msgs: M[] = [{ role: "user", timestamp: 1, content: [{ type: "text", text: "go" }] }, assistant("a", 2), result("a", `${"y".repeat(8000)}\n\n${contract()}`, 3)];
    for (let i = 0; i < 12; i++) msgs.push(...filler(i));
    const model = { contextWindow: 40_000, maxTokens: 2000 } as never;
    const fit = fitContext(model, { systemPrompt: "sys", messages: msgs as never, tools: [] }, { force: true });
    expect(fit.trimmed).toBe(true);
    const first = (fit.messages as unknown as M[]).find((m) => m.role === "toolResult" && textOf(m).startsWith("yyyy"));
    // the older result is clipped to its head; the contract that rode it is not
    expect(first).toBeDefined();
    expect(textOf(first!)).toContain("MARKER-RULES-rp");
    expect(textOf(first!)).toContain("[End of the contract of apps/rp]");
    expect(textOf(first!).length).toBeLessThan(8000 + contract().length);
  });
});
