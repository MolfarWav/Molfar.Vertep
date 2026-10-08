/**
 * json_get / json_set: one field of a big JSON file, read or changed in
 * place, the file written back in the format it was found in.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyEdits, detectStyle, parsePointer, serialize, viewValue } from "../src/agent/json-edit.js";
import { buildUserTools, WRITE_TOOLS } from "../src/agent/tools.js";
import { bootstrapUserDir } from "../src/paths.js";

const card = { spec: "chara_card_v2", data: { name: "Ашлі", description: "old", tags: ["a"], character_book: { entries: [{ keys: ["вежа"], content: "x" }] } } };

describe("pointers and edits", () => {
  it("reads both pointer forms", () => {
    expect(parsePointer("/data/character_book/entries/0/content")).toEqual(["data", "character_book", "entries", "0", "content"]);
    expect(parsePointer("data.character_book.entries[0].content")).toEqual(["data", "character_book", "entries", 0, "content"]);
    expect(parsePointer("/a~1b/c~0d")).toEqual(["a/b", "c~d"]);
    expect(parsePointer("")).toEqual([]);
  });

  it("sets, adds, deletes and appends; a missing step names the keys there", () => {
    const doc = structuredClone(card);
    const { lines } = applyEdits(doc, [
      { pointer: "/data/description", value: "new" },
      { pointer: "data.mes_example", value: "<START>" },
      { pointer: "/data/tags", op: "append", value: "b" },
      { pointer: "/data/character_book/entries/0/keys", op: "delete" },
    ]);
    expect(doc.data.description).toBe("new");
    expect((doc.data as Record<string, unknown>).mes_example).toBe("<START>");
    expect(doc.data.tags).toEqual(["a", "b"]);
    expect((doc.data.character_book.entries as unknown[])[0]).toEqual({ content: "x" });
    expect(lines[0]).toBe("set /data/description: string, 3 chars → string, 3 chars");
    expect(() => applyEdits(structuredClone(card), [{ pointer: "/data/nope/x", value: 1 }])).toThrow(/no such key\. Keys here: name, description/);
    expect(() => applyEdits(structuredClone(card), [{ pointer: "/data/tags/5", value: 1 }])).toThrow(/out of range/);
  });

  it("shows a big value as its shape, a long string as its head", () => {
    const big = { avatar: "A".repeat(50_000), name: "x", list: [1, 2, 3] };
    const shape = viewValue(big, "/", 2000);
    expect(shape).toContain("- avatar: string, 50000 chars");
    expect(shape).toContain("- list: array, 3 items");
    expect(shape).not.toContain("AAAA");
    expect(viewValue(big.avatar, "/avatar", 100)).toContain("the first 100 shown");
    expect(viewValue("short", "/name", 100)).toBe('[/name: string, 5 chars]\n"short"');
  });
});

describe("format kept", () => {
  const roundTrip = (raw: string) => serialize(JSON.parse(raw), detectStyle(raw));

  it("one line, compact or with Python's spaces", () => {
    expect(roundTrip('{"a":1,"b":[1,2],"c":{"d":"x"}}')).toBe('{"a":1,"b":[1,2],"c":{"d":"x"}}');
    expect(roundTrip('{"a": 1, "b": [1, 2], "c": {"d": "x"}}\n')).toBe('{"a": 1, "b": [1, 2], "c": {"d": "x"}}\n');
  });

  it("indented with spaces or tabs, CRLF, empty containers", () => {
    const two = JSON.stringify({ a: 1, b: [], c: {}, d: [{ e: "ж" }] }, null, 2);
    expect(roundTrip(two)).toBe(two);
    const tabs = JSON.stringify({ a: { b: 1 } }, null, "\t");
    expect(roundTrip(tabs)).toBe(tabs);
    const crlf = `${JSON.stringify({ a: [1] }, null, 4).replace(/\n/g, "\r\n")}\r\n`;
    expect(roundTrip(crlf)).toBe(crlf);
  });

  it("keeps non-ASCII escaped when the file escapes it", () => {
    const raw = '{"name":"\\u0410\\u0448\\u043b\\u0456","emoji":"\\ud83d\\ude00"}';
    expect(roundTrip(raw)).toBe(raw);
    expect(roundTrip('{"name":"Ашлі"}')).toBe('{"name":"Ашлі"}');
  });
});

describe("the tools", () => {
  let dataDir: string;
  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "json-edit-"));
  });
  afterEach(() => {
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch {
      /* watcher races */
    }
  });
  const setup = () => {
    const p = bootstrapUserDir(dataDir, "alice");
    const tools = buildUserTools("alice", p, { dataDir: p.root });
    const run = async (name: string, args: Record<string, unknown>) =>
      ((await tools.find((t) => t.name === name)!.execute("t", args)) as { content: { text: string }[] }).content[0]!.text;
    return { p, run };
  };

  it("json_get reads several fields; json_set changes them and keeps a one-line file one line", async () => {
    const { p, run } = setup();
    const rel = "apps/roleplay/data/characters/ashley/card.json";
    fs.mkdirSync(path.join(p.root, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(p.root, rel), JSON.stringify(card));
    const got = await run("json_get", { path: rel, pointers: ["/data/name", "data.tags", "/data/missing"] });
    expect(got).toContain('"Ашлі"');
    expect(got).toContain('[/data/tags: array, 1 items]');
    expect(got).toContain("[/data/missing] Error: /data/missing: no such key");
    const set = await run("json_set", { path: rel, edits: [{ pointer: "/data/description", value: "A new description." }, { pointer: "/data/tags", op: "append", value: "b" }] });
    expect(set).toMatch(/format kept, committed [0-9a-f]{8}/);
    const after = fs.readFileSync(path.join(p.root, rel), "utf8");
    expect(after.includes("\n")).toBe(false);
    expect(JSON.parse(after).data.description).toBe("A new description.");
  });

  it("write_file and edit_file never leave a JSON file broken", async () => {
    const { p, run } = setup();
    const rel = "apps/roleplay/data/lorebooks/new-book.json";
    fs.mkdirSync(path.join(p.root, path.dirname(rel)), { recursive: true });
    // a new data file with a stray word: refused, nothing written
    await expect(run("write_file", { path: rel, content: '{"settings":{"minActivations": hot water}}' })).rejects.toThrow(/would not be valid JSON.*Nothing was written/);
    expect(fs.existsSync(path.join(p.root, rel))).toBe(false);
    await run("write_file", { path: rel, content: '{"entries":[],"enabled":true}' });
    await expect(run("edit_file", { path: rel, oldText: "true", newText: "true," })).rejects.toThrow(/would not be valid JSON/);
    expect(JSON.parse(fs.readFileSync(path.join(p.root, rel), "utf8")).enabled).toBe(true);
    // a file that never was strict JSON (comments) stays editable
    fs.writeFileSync(path.join(p.root, "notes", "tsconfig.json"), "{ // comment\n}");
    await run("edit_file", { path: "notes/tsconfig.json", oldText: "// comment", newText: "// other" });
  });

  it("json_set refuses what write_file refuses, and is a write tool", async () => {
    const { p, run } = setup();
    fs.writeFileSync(path.join(p.root, "notes", "bad.json"), "{nope");
    await expect(run("json_set", { path: "notes/bad.json", edits: [{ pointer: "/a", value: 1 }] })).rejects.toThrow(/not valid JSON/);
    await expect(run("json_get", { path: "auth.json" })).rejects.toThrow(/File not found/);
    await expect(run("json_set", { path: "../outside.json", edits: [{ pointer: "/a", value: 1 }] })).rejects.toThrow();
    expect(WRITE_TOOLS.has("json_set")).toBe(true);
    // a protected path (an app's src/) asks first; nobody to ask means no
    const src = path.join(p.root, "apps", "roleplay", "src", "config.json");
    fs.mkdirSync(path.dirname(src), { recursive: true });
    fs.writeFileSync(src, '{"a":1}');
    await expect(run("json_set", { path: "apps/roleplay/src/config.json", edits: [{ pointer: "/a", value: 2 }] })).rejects.toThrow(/protected/);
    expect(fs.readFileSync(src, "utf8")).toBe('{"a":1}');
  });
});
