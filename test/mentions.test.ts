import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findMentionables, mentionedFiles } from "../src/agent/mentions.ts";

function workspace(): { root: string; apps: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mentions-"));
  const apps = path.join(root, "apps");
  const data = path.join(apps, "roleplay", "data");
  const write = (rel: string, doc: unknown) => {
    const abs = path.join(data, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, typeof doc === "string" ? doc : JSON.stringify(doc));
  };
  write("characters/ember/card.json", { spec: "chara_card_v2", name: "Ember", description: "A fox spirit." });
  write("characters/old-import/card.json", { spec: "chara_card_v3", data: { name: "Вартова Вежі" } });
  write("characters/broken/card.json", "{ not json");
  write("lorebooks/harbour.json", { id: "harbour", name: "Harbour Town", entries: [] });
  write("lorebooks/_example.json", { id: "_example", name: "Template", entries: [] });
  write("presets/default.json", { name: "Default", prompts: [] });
  return { root, apps };
}

describe("findMentionables", () => {
  it("lists characters, lorebooks and presets by name, characters first, templates left out", () => {
    const { root, apps } = workspace();
    const all = findMentionables(root, apps, "");
    // names sort by the runtime's locale; the kinds keep their order
    expect(all.map((m) => m.kind)).toEqual(["character", "character", "character", "lorebook", "preset"]);
    expect(all.map((m) => m.name).sort()).toEqual(["Default", "Ember", "Harbour Town", "broken", "Вартова Вежі"]);
    expect(all.find((m) => m.name === "Ember")?.path).toBe("apps/roleplay/data/characters/ember/card.json");
  });

  it("matches the name or the id, any case, Cyrillic included", () => {
    const { root, apps } = workspace();
    expect(findMentionables(root, apps, "harb").map((m) => m.path)).toEqual(["apps/roleplay/data/lorebooks/harbour.json"]);
    expect(findMentionables(root, apps, "вежі").map((m) => m.name)).toEqual(["Вартова Вежі"]);
    expect(findMentionables(root, apps, "OLD-IMPORT").map((m) => m.name)).toEqual(["Вартова Вежі"]);
  });

  it("sees a renamed character on the next call", () => {
    const { root, apps } = workspace();
    expect(findMentionables(root, apps, "ember")).toHaveLength(1);
    const card = path.join(apps, "roleplay", "data", "characters", "ember", "card.json");
    fs.writeFileSync(card, JSON.stringify({ spec: "chara_card_v2", name: "Cinder the Fox", description: "Renamed, longer." }));
    expect(findMentionables(root, apps, "cinder").map((m) => m.name)).toEqual(["Cinder the Fox"]);
  });

  it("is empty without apps", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mentions-none-"));
    expect(findMentionables(root, path.join(root, "apps"), "")).toEqual([]);
  });
});

describe("mentionedFiles", () => {
  it("inlines a small file and shows only the shape of a big JSON file", () => {
    const { root, apps } = workspace();
    const card = path.join(apps, "roleplay", "data", "characters", "ember", "card.json");
    fs.writeFileSync(card, JSON.stringify({ spec: "chara_card_v2", name: "Ember", avatar: `data:image/png;base64,${"A".repeat(40_000)}` }));
    const files = mentionedFiles(root, "fix @apps/roleplay/data/characters/ember/card.json and @apps/roleplay/data/presets/default.json.");
    expect(files.map((f) => f.path)).toEqual(["apps/roleplay/data/characters/ember/card.json", "apps/roleplay/data/presets/default.json"]);
    const [big, small] = files;
    expect(big!.text).toContain("- avatar: string, 40022 chars");
    expect(big!.text).toContain("json_get");
    expect(big!.text).not.toContain("AAAA");
    expect(small!.text).toBe(JSON.stringify({ name: "Default", prompts: [] }));
  });

  it("falls back to the text head when a big .json file does not parse", () => {
    const { root } = workspace();
    fs.writeFileSync(path.join(root, "big.json"), `{ "a": "${"x".repeat(20_000)}"`);
    const [f] = mentionedFiles(root, "@big.json");
    expect(f!.text.startsWith('{ "a": "xxx')).toBe(true);
  });

  it("never reads outside the workspace", () => {
    const { root } = workspace();
    expect(mentionedFiles(root, "@../etc/passwd @/etc/passwd")).toEqual([]);
  });
});
