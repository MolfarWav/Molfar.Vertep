import { describe, expect, it } from "bun:test";
import { canonicalEmbedModel } from "../src/embed-model-names.js";

describe("canonical embeddings model names (#374)", () => {
  it("the same bge-m3 under every name it is served by reads as one", () => {
    for (const n of ["bge-m3", "baai/bge-m3", "BAAI/bge-m3", "Xenova/bge-m3", "bge-m3:latest", "bge-m3:567m", "  baai/bge-m3 "]) {
      expect(canonicalEmbedModel(n)).toBe("bge-m3");
    }
  });
  it("OpenAI's models read the same with and without the OpenRouter prefix", () => {
    expect(canonicalEmbedModel("openai/text-embedding-3-small")).toBe("text-embedding-3-small");
    expect(canonicalEmbedModel("text-embedding-3-large")).toBe("text-embedding-3-large");
    expect(canonicalEmbedModel("openai/text-embedding-ada-002")).toBe("text-embedding-ada-002");
  });
  it("different models stay different, and an unknown name comes back as it was", () => {
    expect(canonicalEmbedModel("qwen/qwen3-embedding-4b")).toBe("qwen/qwen3-embedding-4b");
    expect(canonicalEmbedModel("qwen/qwen3-embedding-8b")).toBe("qwen/qwen3-embedding-8b");
    expect(canonicalEmbedModel("embeddinggemma-2")).toBe("embeddinggemma-2");
    expect(canonicalEmbedModel("bge-m3-large")).toBe("bge-m3-large");
    expect(canonicalEmbedModel("text-embedding-3-small")).not.toBe(canonicalEmbedModel("text-embedding-3-large"));
  });
});
