/**
 * Housekeeping around updates: staging folders are removed off the main
 * thread (a synchronous delete froze the engine on Windows), and workspace
 * copies equal to ANY shipped version of a built-in skill stop blocking the
 * newest one.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pruneUnchangedSkillCopies, setBuiltinSkillsDir, skillTreeDigest } from "../src/agent/memory.js";
import { discardDir, discardStaleStaging } from "../src/apps/update.js";

const until = async (check: () => boolean, ms = 5000): Promise<void> => {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe("discardDir", () => {
  let base: string;
  beforeEach(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), "discard-"));
  });
  afterEach(() => {
    try { fs.rmSync(base, { recursive: true, force: true }); } catch { /* races */ }
  });

  it("frees the name at once and deletes the folder in the background", async () => {
    const dir = path.join(base, "roleplay.update-x");
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "a.ts"), "x");
    discardDir(dir);
    // moved aside synchronously: a new folder of the same name can be made now
    expect(fs.existsSync(dir)).toBe(false);
    await until(() => fs.readdirSync(base).length === 0);
  });

  it("a missing folder is not an error", async () => {
    const errors: string[] = [];
    discardDir(path.join(base, "nope"), (m) => errors.push(m));
    await new Promise((r) => setTimeout(r, 50));
    expect(errors).toEqual([]);
  });

  it("moves a folder out of its tree when told where, so walkers of that tree never meet it", async () => {
    const app = path.join(base, "apps", "roleplay");
    fs.mkdirSync(path.join(app, "dist", "assets"), { recursive: true });
    fs.writeFileSync(path.join(app, "dist", "assets", "font.woff"), "x");
    fs.writeFileSync(path.join(app, "package.json"), "{}");
    discardDir(path.join(app, "dist"), undefined, path.join(base, "apps", ".staging"));
    // the app folder holds no dist and no dist.discard-… at any moment
    expect(fs.readdirSync(app)).toEqual(["package.json"]);
    await until(() => !fs.readdirSync(path.join(base, "apps", ".staging")).length);
  });

  it("an aside folder left in an app is not code, not history and not backed up", async () => {
    const { readCodeTree } = await import("../src/apps/update.js");
    const { gitBoundaryIgnored, isDiscardDir } = await import("../src/paths.js");
    const app = path.join(base, "app");
    fs.mkdirSync(path.join(app, "dist.discard-mv01ktgjthji", "assets"), { recursive: true });
    fs.writeFileSync(path.join(app, "dist.discard-mv01ktgjthji", "assets", "noto.woff"), "x");
    fs.writeFileSync(path.join(app, "index.html"), "<p>");
    expect([...readCodeTree(app).keys()]).toEqual(["index.html"]);
    expect(gitBoundaryIgnored("apps/roleplay/dist.discard-mv01ktgjthji/assets/noto.woff")).toBe(true);
    expect(isDiscardDir("dist.discard-mv01ktgjthji")).toBe(true);
    expect(isDiscardDir("discard-notes")).toBe(false);
  });

  it("discardStaleStaging removes only that app's update folders", async () => {
    for (const n of ["roleplay.update-a", "roleplay.update-b", "roleplay-extra.update-c", "plugin-x"]) fs.mkdirSync(path.join(base, n));
    discardStaleStaging(base, "roleplay.update-");
    await until(() => !fs.readdirSync(base).some((n) => n.startsWith("roleplay.update-")));
    expect(fs.readdirSync(base).sort()).toEqual(["plugin-x", "roleplay-extra.update-c"]);
  });
});

describe("pruneUnchangedSkillCopies and past versions", () => {
  let builtin: string;
  let root: string;
  const put = (b: string, rel: string, text: string): void => {
    fs.mkdirSync(path.dirname(path.join(b, rel)), { recursive: true });
    fs.writeFileSync(path.join(b, rel), text);
  };
  const OLD = "---\nname: alpha\ndescription: Use for alpha.\n---\n# alpha\nOld text.\n";
  const NEW = "---\nname: alpha\ndescription: Use for alpha.\n---\n# alpha\nNew text.\n";

  beforeEach(() => {
    builtin = fs.mkdtempSync(path.join(os.tmpdir(), "prune-past-builtin-"));
    root = fs.mkdtempSync(path.join(os.tmpdir(), "prune-past-root-"));
    setBuiltinSkillsDir(builtin);
    put(builtin, "alpha/SKILL.md", NEW);
  });
  afterEach(() => {
    setBuiltinSkillsDir(null);
    for (const d of [builtin, root]) try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* races */ }
  });

  it("a copy of an earlier shipped version is removed when .digests.json lists it", () => {
    put(builtin, ".digests.json", JSON.stringify({ alpha: [skillTreeDigest(new Map([["SKILL.md", OLD]]))] }));
    put(root, "skills/alpha/SKILL.md", OLD.replace(/\n/g, "\r\n"));
    expect(pruneUnchangedSkillCopies(root)).toEqual(["alpha"]);
    expect(fs.existsSync(path.join(root, "skills/alpha"))).toBe(false);
  });

  it("without the listing, a copy of an earlier version is the user's and stays", () => {
    put(root, "skills/alpha/SKILL.md", OLD);
    expect(pruneUnchangedSkillCopies(root)).toEqual([]);
    expect(fs.existsSync(path.join(root, "skills/alpha/SKILL.md"))).toBe(true);
  });

  it("an edited copy stays even when old versions are listed", () => {
    put(builtin, ".digests.json", JSON.stringify({ alpha: [skillTreeDigest(new Map([["SKILL.md", OLD]]))] }));
    put(root, "skills/alpha/SKILL.md", OLD.replace("Old text.", "My text."));
    expect(pruneUnchangedSkillCopies(root)).toEqual([]);
  });
});

describe("builtin-skills/.digests.json", () => {
  // run `bun scripts/skill-digests.ts` after changing a built-in skill
  it("lists the current version of every built-in skill", () => {
    const dir = path.join(import.meta.dir, "..", "builtin-skills");
    const known = JSON.parse(fs.readFileSync(path.join(dir, ".digests.json"), "utf8")) as Record<string, string[]>;
    for (const name of fs.readdirSync(dir)) {
      const skill = path.join(dir, name);
      if (!fs.statSync(skill).isDirectory()) continue;
      const files = new Map<string, string>();
      const walk = (rel: string): void => {
        for (const e of fs.readdirSync(path.join(skill, rel), { withFileTypes: true })) {
          const r = rel ? `${rel}/${e.name}` : e.name;
          if (e.isDirectory()) walk(r);
          else files.set(r, fs.readFileSync(path.join(skill, r), "utf8"));
        }
      };
      walk("");
      expect(known[name] ?? []).toContain(skillTreeDigest(files));
    }
  });
});
