import { describe, expect, it } from "bun:test";
import { getInspected, inspectRequest } from "../src/inspector.js";
import { hookInsertions, locateSources, mergePromptSources, sanitizePromptSources, uncovered } from "../src/prompt-sources.js";

describe("prompt sources", () => {
  it("sanitize keeps known fields, caps sizes, maps unknown kinds to other", () => {
    expect(sanitizePromptSources(null)).toBeNull();
    expect(sanitizePromptSources({ parts: "x" })).toBeNull();
    const s = sanitizePromptSources({
      parts: [
        { kind: "card", label: "Aria · description", text: "A bard.", extra: 1 },
        { kind: "evil", label: "x".repeat(500), detail: 5, text: "Y" },
        { kind: "card", label: "no text", text: "   " },
        { kind: "card", text: "no label" },
      ],
      omitted: [{ kind: "lorebook", label: "Book · Gate", reason: "no key matched", tokens: 12.6 }, { label: "no reason" }],
      vars: [{ name: "pov", value: "first", label: "Point of view" }, { name: "on", value: true }, { value: "x" }],
    })!;
    expect(s.parts).toEqual([
      { kind: "card", label: "Aria · description", text: "A bard." },
      { kind: "other", label: "x".repeat(120), text: "Y" },
    ]);
    expect(s.omitted).toEqual([{ kind: "lorebook", label: "Book · Gate", reason: "no key matched", tokens: 13 }]);
    expect(s.vars).toEqual([{ name: "pov", value: "first", label: "Point of view" }, { name: "on", value: "true" }]);
  });

  it("locate finds parts in order, skips claimed text, keeps short texts after the cursor", () => {
    const src = sanitizePromptSources({
      parts: [
        { kind: "preset", label: "Main", text: "You are the narrator." },
        { kind: "card", label: "Aria · description", text: "Aria is a bard." },
        { kind: "history", label: "User · #1", text: "Hi" },
        { kind: "history", label: "Aria · #2", text: "Hi" },
        { kind: "note", label: "Missing", text: "never in the request" },
      ],
    })!;
    const system = "You are the narrator.\nAria is a bard.";
    const located = locateSources(src, system, ["Hi", "Hi"], 100);
    expect(located.spans).toEqual([
      { msg: -1, start: 0, end: 21, part: 0 },
      { msg: -1, start: 22, end: 37, part: 1 },
      { msg: 0, start: 0, end: 2, part: 2 },
      { msg: 1, start: 0, end: 2, part: 3 },
    ]);
    expect(located.parts.map((p) => p.located)).toEqual([true, true, true, true, false]);
    expect(located.unlabeled).toBe(100 - located.parts.filter((p) => p.located).reduce((n, p) => n + p.tokens, 0));
  });

  it("a long part found before the cursor still locates (an unplaced block moved up)", () => {
    const src = sanitizePromptSources({
      parts: [
        { kind: "history", label: "#1", text: "the story so far" },
        { kind: "lorebook", label: "Book · Gate", text: "The gate opens at dawn." },
      ],
    })!;
    const located = locateSources(src, "The gate opens at dawn.", ["the story so far"], 20);
    expect(located.spans).toEqual([
      { msg: -1, start: 0, end: 23, part: 1 },
      { msg: 0, start: 0, end: 16, part: 0 },
    ]);
  });

  it("a short part behind the cursor locates only as a whole message", () => {
    // post-history sections are labeled before the history they follow
    const src = sanitizePromptSources({
      parts: [
        { kind: "card", label: "After", text: "Stay in character." },
        { kind: "history", label: "#1", text: "Hi" },
        { kind: "note", label: "Inside", text: "ok" },
      ],
    })!;
    const located = locateSources(src, "", ["Hi", "Okay then, ok", "Stay in character."], 30);
    // the whole-message match moves the cursor back: the next short part is found after it
    expect(located.spans).toEqual([
      { msg: 0, start: 0, end: 2, part: 1 },
      { msg: 1, start: 11, end: 13, part: 2 },
      { msg: 2, start: 0, end: 18, part: 0 },
    ]);
    // a short text that is only part of a message, behind the cursor, stays unlocated
    const alone = locateSources(sanitizePromptSources({ parts: [{ kind: "card", label: "A", text: "Stay in character." }, { kind: "note", label: "B", text: "ok" }] })!, "", ["Okay then, ok", "Stay in character."], 10);
    expect(alone.parts.map((p) => p.located)).toEqual([true, false]);
  });

  it("hook insertions: a new message whole, an edited one by its new middle, a system prompt change", () => {
    const before = { systemPrompt: "Rules.", messages: [{ role: "system", content: "Card." }, { role: "user", content: "Hi" }, { role: "assistant", content: "Hello" }] };
    const after = {
      systemPrompt: "Rules.\n[Mood: calm]",
      messages: [
        { role: "system", content: "Card." },
        { role: "system", content: "[Story so far] They met." },
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello\n(stay in character)" },
      ],
    };
    expect(hookInsertions(before, after)).toEqual(["[Mood: calm]", "[Story so far] They met.", "(stay in character)"]);
    expect(hookInsertions(before, before)).toEqual([]);
  });

  it("uncovered: the hook's own parts are cut out, glue without letters is dropped", () => {
    const own = [{ kind: "memory" as const, label: "Chapter 1", text: "They met." }];
    expect(uncovered(["[Story so far] They met.", "\n---\n", "Mood: calm"], own)).toEqual(["[Story so far]", "Mood: calm"]);
  });

  it("merge adds, never replaces", () => {
    const a = sanitizePromptSources({ parts: [{ kind: "card", label: "A", text: "a" }] });
    const b = sanitizePromptSources({ vars: [{ name: "x", value: "1" }] });
    expect(mergePromptSources(a, b)).toEqual({ parts: [{ kind: "card", label: "A", text: "a" }], omitted: [], vars: [{ name: "x", value: "1" }] });
    expect(mergePromptSources(null, b)).toBe(b);
  });

  it("the inspector keeps located labels, not the texts again", () => {
    const sources = sanitizePromptSources({ parts: [{ kind: "card", label: "Aria · description", text: "Aria is a bard." }] });
    const e = inspectRequest("ps-user", { source: "app:roleplay/engine", model: "fake/m", systemPrompt: "Aria is a bard.", messages: [{ role: "user", content: "Hi" }], sources });
    const kept = getInspected("ps-user", e.id)!;
    expect(kept.sources?.parts).toEqual([{ kind: "card", label: "Aria · description", tokens: expect.any(Number), located: true }]);
    expect(kept.sources?.spans).toEqual([{ msg: -1, start: 0, end: 15, part: 0 }]);
    expect(JSON.stringify(kept.sources)).not.toContain("Aria is a bard.");
    const plain = inspectRequest("ps-user", { source: "agent", model: "fake/m", messages: [] });
    expect(plain.sources).toBeUndefined();
  });
});
