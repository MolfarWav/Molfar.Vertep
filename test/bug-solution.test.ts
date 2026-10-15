/**
 * A bug Molfar fixed in the user's copy: the patch is the app's code since the
 * checkpoint taken before the fix, never data/, memory or uploads, and files
 * that look private carry a warning.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildBugSolutionTool, patchWarnings, solutionPatch } from "../src/agent/bug-solution.js";
import { createCheckpoint } from "../src/agent/checkpoints.js";
import * as git from "../src/git.js";
import { bootstrapUserDir, type UserPaths } from "../src/paths.js";

let dataDir: string;
let p: UserPaths;
beforeEach(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bug-solution-"));
  p = bootstrapUserDir(dataDir, "mia");
  await git.ensureRepo(p.root);
  put("apps/rp/manifest.json", JSON.stringify({ name: "rp", version: "4.2.0", kind: "web", origin: "local" }));
  put("apps/rp/src/App.tsx", "export const App = 1;\n");
  put("apps/rp/src/old.ts", "old\n");
  put("apps/rp/data/chats.json", "[1]");
  await git.commitAll(p.root, "mia", "seed");
});
afterEach(() => {
  try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* watcher races */ }
});

function put(rel: string, text: string): void {
  fs.mkdirSync(path.dirname(path.join(p.root, rel)), { recursive: true });
  fs.writeFileSync(path.join(p.root, rel), text);
}
const out = (r: unknown) => (r as { content: { text: string }[] }).content[0]!.text;

describe("bug solution", () => {
  it("the patch is the app's code since the checkpoint, relative to the app", async () => {
    put("apps/rp/src/early.ts", "changed before the bug work\n");
    await git.commitAll(p.root, "mia", "earlier work");
    const cp = await createCheckpoint(p.root, "mia", "rp", "bug: profile crash");
    put("apps/rp/src/App.tsx", "export const App = 2;\n");
    put("apps/rp/src/fix.ts", "export const fixed = true;\n");
    fs.rmSync(path.join(p.root, "apps/rp/src/old.ts"));
    await git.commitAll(p.root, "mia", "agent: fix");
    // data, memory and uploads never go out; an uncommitted code edit does
    put("apps/rp/data/chats.json", "[1,2]");
    put("apps/rp/.memory/notes.md", "private");
    put("apps/rp/.project/upload.png", "x");
    put("apps/rp/src/later.ts", "const key = 'sk-abcdefghijklmnopqrstuvwxyz';\n");

    const sp = await solutionPatch(p.root, "mia", "rp", cp.id);
    expect(sp.appVersion).toBe("4.2.0");
    expect(sp.files.map((f) => `${f.status} ${f.path}`)).toEqual(["modified src/App.tsx", "added src/fix.ts", "added src/later.ts", "deleted src/old.ts"]);
    expect(sp.files.find((f) => f.path === "src/later.ts")?.warnings).toContain("looks like a secret");
    expect(sp.patch).toContain("diff --git a/src/App.tsx b/src/App.tsx\n--- a/src/App.tsx\n+++ b/src/App.tsx");
    expect(sp.patch).toContain("-export const App = 1;\n+export const App = 2;");
    expect(sp.patch).toContain("--- /dev/null\n+++ b/src/fix.ts");
    expect(sp.patch).toContain("--- a/src/old.ts\n+++ /dev/null");
    expect(sp.patch).not.toContain("early.ts");
    expect(sp.patch).not.toMatch(/chats|notes|upload|Index |====/);

    // it applies with git in a copy of the app as the checkpoint had it
    const clone = fs.mkdtempSync(path.join(os.tmpdir(), "bug-solution-clone-"));
    try {
      fs.mkdirSync(path.join(clone, "src"));
      fs.writeFileSync(path.join(clone, "src/App.tsx"), "export const App = 1;\n");
      fs.writeFileSync(path.join(clone, "src/old.ts"), "old\n");
      fs.writeFileSync(path.join(clone, "fix.patch"), sp.patch);
      const r = spawnSync("git", ["apply", "fix.patch"], { cwd: clone, encoding: "utf8" });
      expect(r.stderr).toBe("");
      expect(fs.readFileSync(path.join(clone, "src/App.tsx"), "utf8")).toBe("export const App = 2;\n");
      expect(fs.existsSync(path.join(clone, "src/fix.ts"))).toBe(true);
      expect(fs.existsSync(path.join(clone, "src/old.ts"))).toBe(false);
    } finally {
      fs.rmSync(clone, { recursive: true, force: true });
    }
  });

  it("a checkpoint of another app is refused", async () => {
    put("apps/other/manifest.json", JSON.stringify({ name: "o", version: "1" }));
    await git.commitAll(p.root, "mia", "other");
    const cp = await createCheckpoint(p.root, "mia", "other", "x");
    await expect(solutionPatch(p.root, "mia", "rp", cp.id)).rejects.toThrow(/no checkpoint/);
  });

  it("the tool needs the checkpoint when an app is named and lists what the patch carries", async () => {
    const tool = buildBugSolutionTool("mia", p.root);
    const base = { solved: true, problem: "Profile crashes", cause: "a string where a list was expected", fix: "coerce the field" };
    expect(out(await tool.execute("1", base))).toMatch(/No app code goes with it/);
    await expect(tool.execute("2", { ...base, app: "rp" })).rejects.toThrow(/checkpoint/);
    const cp = await createCheckpoint(p.root, "mia", "rp", "bug: crash");
    expect(out(await tool.execute("3", { ...base, app: "rp", checkpoint: cp.id }))).toMatch(/description only/);
    put("apps/rp/src/App.tsx", "export const App = 3;\n");
    expect(out(await tool.execute("4", { ...base, app: "rp", checkpoint: cp.id }))).toMatch(/patch carries: modified src\/App\.tsx/);
  });

  it("warnings name what should not leave the workspace", () => {
    expect(patchWarnings("bun.lock", Buffer.from(""), "mia")).toEqual(["lockfile: do not copy, run bun install in the clone"]);
    expect(patchWarnings("src/a.ts", Buffer.from("C:\\Users\\mia\\x"), "mia")).toEqual(["absolute local path", 'mentions the user name "mia"']);
    expect(patchWarnings("src/a.ts", Buffer.from("fine"), "mia")).toEqual([]);
  });
});
