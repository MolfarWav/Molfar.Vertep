import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import isomorphicGit from "isomorphic-git";
import { buildUserTools } from "../src/agent/tools.js";
import { bootstrapUserDir } from "../src/paths.js";

let dataDir: string;
beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "edit-batch-"));
});
afterEach(() => fs.rmSync(dataDir, { recursive: true, force: true }));

const commitCount = async (dir: string): Promise<number> => (await isomorphicGit.log({ fs, dir }).catch(() => [])).length;

function setup(content: string, name = "note.txt") {
  const p = bootstrapUserDir(dataDir, "alice");
  const rel = `apps/roleplay/data/${name}`;
  const abs = path.join(p.root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  const edit = buildUserTools("alice", p, { dataDir: p.root }).find((t) => t.name === "edit_file")!;
  return { p, rel, abs, edit };
}

describe("edit_file with several edits in one call (issue #101)", () => {
  it("applies them in order, in one commit, one diff", async () => {
    const { p, rel, abs, edit } = setup("alpha\nbeta\ngamma\n");
    const before = await commitCount(p.root);
    const r = (await edit.execute("t", { path: rel, edits: [{ oldText: "alpha", newText: "ALPHA" }, { oldText: "gamma", newText: "GAMMA" }] })) as { content: { text: string }[]; details: { diff?: string } };
    expect(fs.readFileSync(abs, "utf8")).toBe("ALPHA\nbeta\nGAMMA\n");
    expect(r.content[0]!.text).toContain("2 edits");
    expect(r.details.diff).toContain("+ALPHA");
    expect(r.details.diff).toContain("+GAMMA");
    expect(await commitCount(p.root)).toBe(before + 1);
  });

  it("a later edit sees the text the earlier one left", async () => {
    const { rel, abs, edit } = setup("one two");
    await edit.execute("t", { path: rel, edits: [{ oldText: "one", newText: "three" }, { oldText: "three two", newText: "done" }] });
    expect(fs.readFileSync(abs, "utf8")).toBe("done");
  });

  it("all or nothing: a miss in the second edit leaves the file as it was and names the edit", async () => {
    const { rel, abs, edit } = setup("alpha beta");
    await expect(edit.execute("t", { path: rel, edits: [{ oldText: "alpha", newText: "A" }, { oldText: "nope", newText: "x" }] })).rejects.toThrow(/edit 2 of 2: oldText not found.*Nothing was changed/);
    expect(fs.readFileSync(abs, "utf8")).toBe("alpha beta");
  });

  it("an ambiguous oldText refuses, as a single edit does", async () => {
    const { rel, abs, edit } = setup("same same");
    await expect(edit.execute("t", { path: rel, edits: [{ oldText: "same", newText: "x" }] })).rejects.toThrow(/edit 1 of 1: oldText matches 2 times/);
    expect(fs.readFileSync(abs, "utf8")).toBe("same same");
  });

  it("a JSON file is checked once, on the final text: a step may be invalid if the result is not", async () => {
    const { rel, abs, edit } = setup('{"a":1,"b":2}', "x.json");
    await edit.execute("t", { path: rel, edits: [{ oldText: '"a":1,', newText: "" }, { oldText: '"b":2', newText: '"b":3' }] });
    expect(JSON.parse(fs.readFileSync(abs, "utf8"))).toEqual({ b: 3 });
    await expect(edit.execute("t", { path: rel, edits: [{ oldText: '"b":3', newText: '"b":' }] })).rejects.toThrow(/would not be valid JSON/);
    expect(JSON.parse(fs.readFileSync(abs, "utf8"))).toEqual({ b: 3 });
  });

  it("the old single form still works; mixing the two forms, or giving neither, is refused", async () => {
    const { rel, abs, edit } = setup("hello");
    await edit.execute("t", { path: rel, oldText: "hello", newText: "bye" });
    expect(fs.readFileSync(abs, "utf8")).toBe("bye");
    await expect(edit.execute("t", { path: rel, oldText: "bye", newText: "x", edits: [{ oldText: "bye", newText: "y" }] })).rejects.toThrow(/either/);
    await expect(edit.execute("t", { path: rel })).rejects.toThrow(/required/);
    await expect(edit.execute("t", { path: rel, edits: Array.from({ length: 21 }, () => ({ oldText: "bye", newText: "bye" })) })).rejects.toThrow(/At most 20/);
  });

  it("replacement text is literal: $& and $1 are not patterns", async () => {
    const { rel, abs, edit } = setup("price: X");
    await edit.execute("t", { path: rel, oldText: "X", newText: "$& and $1" });
    expect(fs.readFileSync(abs, "utf8")).toBe("price: $& and $1");
  });
});
