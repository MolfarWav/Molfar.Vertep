// Opening an app after its sources changed (GitHub #181): the engine saves the
// dev builder's module graph with each build; a later session restores it and
// rebuilds only the files that differ, and documentation/tests/scripts stay out
// of the source fingerprint unless the last build read them.
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as esbuild from "esbuild";
import { createContext } from "../src/builder/context.js";
import { DevSession, type DevOutput } from "../src/builder/dev.js";
import { ackUnchangedBuild, appFsOps, buildReads, checkOutput, installMarker, isBuildSource, readDevMeta, resumePlan, sourceRev, writeOutput } from "../src/builder/server.js";

let dir = "";
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "builder-resume-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const sheets = Object.fromEntries(
  ["index.css", "theme.css", "preflight.css", "utilities.css"].map((n) => [n, fs.readFileSync(path.resolve("node_modules/tailwindcss", n), "utf8")]),
);
const html = '<script type="module" src="/src/main.ts"></script>';
const BUILDER = "b1";

/** An app on disk plus the two halves of the real flow: a builder session
 *  (what the browser frame does) and the engine writing its output. */
function setup(files: Record<string, string>) {
  const appsDir = path.join(dir, "apps");
  const appDir = path.join(appsDir, "a");
  const write = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(appDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(appDir, rel), text);
  };
  for (const [rel, text] of Object.entries(files)) write(rel, text);
  fs.writeFileSync(path.join(appDir, "manifest.json"), JSON.stringify({ name: "A", version: "1", kind: "app" }));
  const session = async () => {
    const ctx = await createContext(async (ops) => appFsOps(appsDir, "a", ops), { esbuild, tailwindSheets: sheets }, "development");
    return new DevSession(ctx, (readDevMeta(appDir) as never) ?? null);
  };
  const land = (out: DevOutput, rev: string) => {
    const checked = checkOutput(out);
    if (typeof checked === "string") throw new Error(checked);
    writeOutput(appsDir, "a", checked, rev, BUILDER);
  };
  /** the first (or a forced) full build, as a fresh page does it */
  const fullBuild = async () => {
    const rev = sourceRev(appDir);
    const out = await (await session()).full();
    land(out, rev);
    return out;
  };
  /** what a page opening now does: resume from the graph, else build everything */
  const open = async (): Promise<{ path: "none" | "full" | "update"; out?: DevOutput; changed?: string[]; why?: string; restored?: boolean }> => {
    const rev = sourceRev(appDir);
    const status = JSON.parse(fs.readFileSync(path.join(appDir, "dist", ".molfar-build.json"), "utf8")) as { rev: string };
    if (status.rev === rev) return { path: "none" };
    const plan = resumePlan(appDir, BUILDER);
    if (!plan.ok) {
      const out = await (await session()).full();
      land(out, rev);
      return { path: "full", out, why: plan.why };
    }
    const dev = await session();
    const restored = await dev.restore(plan.graph);
    const out = restored ? await dev.update(plan.changed) : await dev.full();
    if (!out.unchanged) land(out, rev);
    return { path: out.full ? "full" : "update", out, changed: plan.changed, restored };
  };
  const distText = (rel: string) => fs.readFileSync(path.join(appDir, "dist", rel), "utf8");
  /** everything a page would run: snapshot plus hot files */
  const pageCode = () => {
    const meta = JSON.parse(distText("dev/meta.json")) as { snapshot: string; hot: string[] };
    return [meta.snapshot, ...meta.hot].map(distText).join("\n");
  };
  const tick = () => new Promise((r) => setTimeout(r, 15));
  return { appDir, appsDir, write, rm: (rel: string) => fs.rmSync(path.join(appDir, rel), { recursive: true }), fullBuild, open, distText, pageCode, tick, session };
}

const base = {
  "index.html": html,
  "package.json": '{"name":"a"}',
  "src/main.ts": 'import { a } from "./a";\nimport { b } from "./b";\nconsole.log(a, b);\n',
  "src/a.ts": 'export const a = "A_ONE";\n',
  "src/b.ts": 'export const b = "B_ONE";\n',
  "README.md": "# readme\n",
  "LICENSE": "mit\n",
  "docs/guide.md": "docs\n",
  "test/a.test.ts": "// test\n",
  "scripts/tool.ts": "// tool\n",
};

describe("source fingerprint: documentation and tooling are not build input", () => {
  it("docs/, test/, tests/, scripts/, top-level *.md and LICENSE leave the revision alone", async () => {
    const app = setup({ ...base, "tests/b.test.ts": "//" });
    const rev = sourceRev(app.appDir);
    await app.tick();
    app.write("README.md", "# changed\n");
    app.write("LICENSE", "other\n");
    app.write("docs/guide.md", "changed\n");
    app.write("docs/new.md", "new\n");
    app.write("test/a.test.ts", "// changed\n");
    app.write("tests/b.test.ts", "// changed\n");
    app.write("scripts/tool.ts", "// changed\n");
    app.write("CHANGELOG.md", "x");
    expect(sourceRev(app.appDir)).toBe(rev);
    // a source file still moves it, and so does a markdown file below src/
    app.write("src/a.ts", 'export const a = "A_TWO";\n');
    const afterSrc = sourceRev(app.appDir);
    expect(afterSrc).not.toBe(rev);
    await app.tick();
    app.write("src/notes.md", "x");
    expect(sourceRev(app.appDir)).not.toBe(afterSrc);
  });

  it("isBuildSource follows, unless the last build read the path", () => {
    for (const no of ["a/docs/x.md", "a/test/x.ts", "a/tests/x.ts", "a/scripts/x.sh", "a/README.md", "a/CHANGELOG.md", "a/LICENSE", "a/LICENSE.txt"]) expect(isBuildSource(no), no).toBe(false);
    for (const yes of ["a/docs", "a/src/notes.md", "a/lib/test/x.ts", "a/src/main.ts", "a/package.json"]) expect(isBuildSource(yes), yes).toBe(true);
    expect(isBuildSource("a/docs/x.md", new Set(["docs/x.md"]))).toBe(true);
    expect(isBuildSource("a/docs/y.md", new Set(["docs/x.md"]))).toBe(false);
  });

  it("a doc the last build imported (?raw) still counts, the others do not", async () => {
    const app = setup({
      ...base,
      "src/main.ts": 'import { a } from "./a";\nimport note from "../docs/note.md?raw";\nconsole.log(a, note);\n',
      "docs/note.md": "NOTE_ONE\n",
    });
    await app.fullBuild();
    expect([...buildReads(app.appDir)]).toEqual(["docs/note.md"]);
    // the first build learned it reads the doc, so the fingerprint now covers
    // it: one open finds nothing different and acknowledges
    const first = await app.open();
    expect(first.changed).toEqual([]);
    expect(ackUnchangedBuild(app.appDir, sourceRev(app.appDir))).toBe(true);
    expect((await app.open()).path).toBe("none");
    await app.tick();
    app.write("docs/guide.md", "changed\n");
    expect((await app.open()).path).toBe("none");
    app.write("docs/note.md", "NOTE_TWO\n");
    const r = await app.open();
    expect(r.path).toBe("update");
    expect(r.changed).toEqual(["docs/note.md"]);
    expect(app.pageCode()).toContain("NOTE_TWO");
  }, 30_000);
});

describe("open after a source change continues from the saved module graph", () => {
  it("a doc/test/script edit changes nothing at all", async () => {
    const app = setup(base);
    await app.fullBuild();
    expect(JSON.parse(app.distText("dev/graph.json")).files).toBeTruthy();
    await app.tick();
    app.write("docs/guide.md", "changed\n");
    app.write("README.md", "changed\n");
    app.write("test/a.test.ts", "// changed\n");
    expect((await app.open()).path).toBe("none");
  }, 30_000);

  it("one changed file: only it is rebuilt, and the result equals a full build", async () => {
    const app = setup(base);
    await app.fullBuild();
    await app.tick();
    app.write("src/a.ts", 'export const a = "A_TWO";\n');
    const r = await app.open();
    expect(r.path).toBe("update");
    expect(r.restored).toBe(true);
    expect(r.changed).toEqual(["src/a.ts"]);
    const hot = r.out!.files.find((f) => f.path === r.out!.hot?.file)!.contents;
    expect(hot).toContain("A_TWO");
    // b and main were not rebuilt or resent
    expect(hot).not.toContain("B_ONE");
    expect(hot).not.toContain("console.log");
    // what a page loads now is what a full build of these sources says
    const page = app.pageCode();
    const fresh = (await (await app.session()).full()).files.find((f) => f.path.startsWith("dev/app-"))!.contents;
    for (const needle of ["A_TWO", "B_ONE", "console.log"]) expect(page).toContain(needle);
    expect(fresh).toContain("A_TWO");
    expect(fresh).not.toContain("A_ONE");
    // the next open, nothing changed again, has nothing to do
    expect((await app.open()).path).toBe("none");
  }, 30_000);

  it("a change that builds to the same output is acknowledged and not found again", async () => {
    const app = setup(base);
    await app.fullBuild();
    await app.tick();
    app.write("src/a.ts", 'export const a = "A_ONE"; // only a comment\n');
    const r = await app.open();
    expect(r.path).toBe("update");
    expect(r.out!.unchanged).toBe(true);
  }, 30_000);

  it("an added, a removed and a renamed file are followed", async () => {
    const app = setup(base);
    await app.fullBuild();
    await app.tick();
    // added and imported
    app.write("src/c.ts", 'export const c = "C_ONE";\n');
    app.write("src/main.ts", 'import { a } from "./a";\nimport { b } from "./b";\nimport { c } from "./c";\nconsole.log(a, b, c);\n');
    let r = await app.open();
    expect(r.path).toBe("update");
    expect(r.changed!.sort()).toEqual(["src/c.ts", "src/main.ts"]);
    expect(app.pageCode()).toContain("C_ONE");
    // renamed (a removal and an addition), importer updated
    await app.tick();
    fs.renameSync(path.join(app.appDir, "src", "c.ts"), path.join(app.appDir, "src", "d.ts"));
    app.write("src/main.ts", 'import { a } from "./a";\nimport { b } from "./b";\nimport { c } from "./d";\nconsole.log(a, b, c);\n');
    r = await app.open();
    expect(r.path).toBe("update");
    expect(r.changed!.sort()).toEqual(["src/c.ts", "src/d.ts", "src/main.ts"]);
    expect(r.out!.errors).toEqual([]);
    expect(app.pageCode()).toContain('"./d":"src/d.ts"');
    // removed together with its import
    await app.tick();
    app.rm("src/d.ts");
    app.write("src/main.ts", 'import { a } from "./a";\nimport { b } from "./b";\nconsole.log(a, b);\n');
    r = await app.open();
    expect(r.path).toBe("update");
    expect(r.out!.errors).toEqual([]);
    expect(r.out!.files.find((f) => f.path === r.out!.hot?.file)!.contents).toContain('"removed":["src/d.ts"]');
    // removed while still imported: the error a full build gives
    await app.tick();
    app.rm("src/b.ts");
    r = await app.open();
    expect(r.out!.errors.map((e) => e.text).join()).toContain('Could not resolve "./b"');
  }, 60_000);

  it("a file only a worker imports is followed", async () => {
    const app = setup({
      ...base,
      "src/main.ts": 'import W from "./w?worker";\nconsole.log(W);\n',
      "src/w.ts": 'import { dep } from "./dep";\nself.postMessage(dep);\n',
      "src/dep.ts": 'export const dep = "DEP_ONE";\n',
    });
    await app.fullBuild();
    await app.tick();
    app.write("src/dep.ts", 'export const dep = "DEP_TWO";\n');
    const r = await app.open();
    expect(r.changed).toEqual(["src/dep.ts"]);
    expect(r.path).toBe("update");
    expect(r.out!.unchanged).toBeFalsy();
    expect(r.out!.files.some((f) => f.contents.includes("DEP_TWO"))).toBe(true);
  }, 30_000);

  it("a new file nothing imports yet is found and costs nothing", async () => {
    const app = setup(base);
    await app.fullBuild();
    await app.tick();
    app.write("src/lonely.ts", "export {};\n");
    const r = await app.open();
    expect(r.changed).toEqual(["src/lonely.ts"]);
    expect(r.out!.unchanged).toBe(true);
  }, 30_000);

  it("a changed package.json (the deps key) or lockfile builds everything", async () => {
    const app = setup(base);
    await app.fullBuild();
    await app.tick();
    app.write("package.json", '{"name":"a","dependencies":{"x":"1"}}');
    let r = await app.open();
    expect(r.changed).toEqual(["package.json"]);
    expect(r.path).toBe("full");
    await app.tick();
    app.write("yarn.lock", "# lock\n");
    r = await app.open();
    expect(r.path).toBe("full");
  }, 60_000);

  it("falls back to a full build: reinstalled packages, public/ files, no graph, another builder, edits during the build", async () => {
    const app = setup({ ...base, "public/x.txt": "x" });
    await app.fullBuild();
    expect(resumePlan(app.appDir, BUILDER).ok).toBe(true);
    expect(resumePlan(app.appDir, "other").ok).toBe(false);
    // public/ is copied by a full build only
    await app.tick();
    app.write("public/x.txt", "y");
    expect(resumePlan(app.appDir, BUILDER)).toMatchObject({ ok: false, why: expect.stringContaining("public/") });
    app.write("public/x.txt", "x");
    // packages reinstalled: the marker moves
    fs.mkdirSync(path.join(app.appDir, "node_modules"), { recursive: true });
    expect(installMarker(app.appDir)).not.toBe("0");
    expect(resumePlan(app.appDir, BUILDER)).toMatchObject({ ok: false, why: expect.stringContaining("reinstalled") });
    await app.fullBuild();
    expect(resumePlan(app.appDir, BUILDER).ok).toBe(true);
    // a graph that belongs to another build
    const g = path.join(app.appDir, "dist", "dev", "graph.json");
    const graph = JSON.parse(fs.readFileSync(g, "utf8"));
    fs.writeFileSync(g, JSON.stringify({ ...graph, seq: graph.seq + 5 }));
    expect(resumePlan(app.appDir, BUILDER).ok).toBe(false);
    fs.writeFileSync(g, "not json");
    expect(resumePlan(app.appDir, BUILDER)).toMatchObject({ ok: false, why: expect.stringContaining("no module graph") });
    fs.rmSync(g);
    expect(resumePlan(app.appDir, BUILDER).ok).toBe(false);
    // a dist from before graphs existed
    await app.fullBuild();
    fs.rmSync(g);
    expect((await app.open()).path === "none" || resumePlan(app.appDir, BUILDER).ok === false).toBe(true);
  }, 60_000);

  it("a source edited while the build ran is not recorded as built", async () => {
    const app = setup(base);
    const rev = sourceRev(app.appDir);
    const out = await (await app.session()).full();
    await app.tick();
    app.write("src/a.ts", 'export const a = "A_LATE";\n'); // after the build started
    const checked = checkOutput(out) as never;
    writeOutput(app.appsDir, "a", checked, rev, BUILDER);
    expect(resumePlan(app.appDir, BUILDER)).toMatchObject({ ok: false, why: expect.stringContaining("while the last build ran") });
  }, 30_000);

  it("a restored session folds its hot files into a snapshot with a full build", async () => {
    const app = setup(base);
    await app.fullBuild();
    for (let i = 0; i < 22; i++) {
      await app.tick();
      app.write("src/a.ts", `export const a = "A_${i}";\n`);
      const r = await app.open();
      expect(r.out!.errors).toEqual([]);
      if (r.path === "full") {
        expect(i).toBeGreaterThanOrEqual(19);
        expect(app.pageCode()).toContain(`A_${i}`);
        return;
      }
    }
    throw new Error("never folded");
  }, 120_000);
});
