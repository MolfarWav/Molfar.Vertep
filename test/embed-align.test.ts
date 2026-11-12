import { describe, expect, it } from "bun:test";
import { alignEmbeddings } from "../src/embed-model-names.js";

describe("embeddings handed to a plugin line up with its texts", () => {
  it("puts null where a blank text was dropped, so texts[i] pairs with vectors[i]", () => {
    // embed() answered for the two non-blank texts only
    expect(alignEmbeddings(["  ", "scan words", "entry one", ""], [[1], [2]])).toEqual([null, [1], [2], null]);
  });
  it("leaves a list with no blank text as it is", () => {
    expect(alignEmbeddings(["a", "b"], [[1], [2]])).toEqual([[1], [2]]);
  });
  it("is null when the engine had nothing (no endpoint, or only blank texts)", () => {
    expect(alignEmbeddings(["a"], null)).toBeNull();
  });
  it("counts a text as blank by the same rule embed() uses (the first 8000 characters, trimmed)", () => {
    expect(alignEmbeddings([" ".repeat(9000) + "x", "y"], [[7]])).toEqual([null, [7]]);
  });
});
