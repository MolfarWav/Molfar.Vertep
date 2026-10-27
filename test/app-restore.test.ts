/**
 * Putting an app's code back to the version it shipped in (the launcher's
 * "Restore Roleplay" and `chrysalis restore-app`).
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { codeProblems, planRestore, restoreApp } from "../src/apps/restore.js";
import { writeBaseline } from "../src/apps/update.js";
import { userPaths } from "../src/paths.js";
import * as git from "../src/git.js";

const tree = (files: Record<string, string>) => new Map(Object.entries(files).map(([k, v]) => [k, Buffer.from(v)]));
const GOOD = "export const x = { a: 1, b: 2 };\n";
const MARKED = "export const x = {\n  a: 1,\n<<<<<<< yours\n  b: 3,\n=======\n  b: 2,\n>>>>>>> v2\n};\n";

let dataDir: string;
beforeEach(() => { dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "restore-app-")); });
afterEach(() => { fs.rmSync(dataDir, { recursive: true, force: true }); });

function install(current: Record<string, string>, shipped: Record<string, string>) {
  const p = userPaths(dataDir, "u");
  const dir = path.join(p.apps, "roleplay");
  for (const [rel, body] of Object.entries(current)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  fs.mkdirSync(path.join(dir, "data", "chats"), { recursive: true });
  fs.writeFileSync(path.join(dir, "data", "chats", "c1.jsonl"), "keep me\n");
  fs.writeFileSync(path.join(dir, "manifest.json"), '{"id":"roleplay","version":"4.72.0"}\n');
  writeBaseline(p.appUpstream, "roleplay", "4.72.0", tree(shipped));
  return { p, dir };
}

describe("finding what keeps an app from starting", () => {
  it("names a conflict marker with its line, and a plugin that does not parse", () => {
    const found = codeProblems(tree({ "plugins/engine/plugin.js": MARKED, "plugins/world/plugin.js": "export const x = { a: 1, ;\n", "plugins/tools/plugin.js": GOOD, "README.md": "<<<<<<< not code\n" }));
    expect(found.map((x) => x.file)).toEqual(["plugins/engine/plugin.js", "plugins/world/plugin.js"]);
    expect(found[0]!.what).toBe("a merge conflict marker at line 3");
    expect(found[1]!.what).toContain("does not parse");
  });
});

describe("restoring to the shipped version", () => {
  it("plans without touching anything", () => {
    const { dir } = install({ "plugins/engine/plugin.js": MARKED, "src/a.ts": "1\n", "extra.js": "x\n" }, { "plugins/engine/plugin.js": GOOD, "src/a.ts": "1\n", "src/new.ts": "n\n" });
    const plan = planRestore(dataDir, "u", "roleplay");
    expect(plan).toMatchObject({ app: "roleplay", user: "u", version: "4.72.0", changed: ["plugins/engine/plugin.js"], added: ["src/new.ts"], removed: ["extra.js"] });
    expect(plan.problems.map((x) => x.file)).toEqual(["plugins/engine/plugin.js"]);
    expect(fs.readFileSync(path.join(dir, "plugins/engine/plugin.js"), "utf8")).toBe(MARKED);
  });

  it("puts the shipped code back, keeps data and the manifest, drops the built interface and commits", async () => {
    const { p, dir } = install({ "plugins/engine/plugin.js": MARKED, "extra.js": "x\n" }, { "plugins/engine/plugin.js": GOOD });
    await git.commitAll(p.root, "u", "before");
    fs.mkdirSync(path.join(dir, "dist"), { recursive: true });
    fs.writeFileSync(path.join(dir, "dist", "app.js"), "built");
    await restoreApp(dataDir, "u", "roleplay");
    expect(fs.readFileSync(path.join(dir, "plugins/engine/plugin.js"), "utf8")).toBe(GOOD);
    expect(fs.existsSync(path.join(dir, "extra.js"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "dist"))).toBe(false);
    expect(fs.readFileSync(path.join(dir, "data", "chats", "c1.jsonl"), "utf8")).toBe("keep me\n");
    expect(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")).toContain("4.72.0");
    expect((await git.log(p.root, 1))[0]!.message).toContain("app(roleplay): restored to the shipped v4.72.0");
    expect(planRestore(dataDir, "u", "roleplay").changed).toEqual([]);
  });

  it("refuses an unknown app, an app with no saved copy, and a saved copy that is itself broken", async () => {
    expect(() => planRestore(dataDir, "u", "nope")).toThrow('no app "nope"');
    const { p, dir } = install({ "a.js": GOOD }, { "a.js": GOOD });
    fs.rmSync(path.join(p.appUpstream, "baselines"), { recursive: true, force: true });
    fs.rmSync(p.appUpstream, { recursive: true, force: true });
    expect(() => planRestore(dataDir, "u", "roleplay")).toThrow("no saved copy");
    writeBaseline(p.appUpstream, "roleplay", "4.72.0", tree({ "plugins/engine/plugin.js": MARKED }));
    await expect(restoreApp(dataDir, "u", "roleplay")).rejects.toThrow("problems of its own");
    expect(fs.readFileSync(path.join(dir, "a.js"), "utf8")).toBe(GOOD);
  });
});
