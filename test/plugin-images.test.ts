/** Pictures a plugin sends with an llm request (src/plugins/runtime.ts): checked, never trimmed. */
import { describe, expect, it } from "bun:test";
import { PLUGIN_IMAGE_CHARS, sanitizePluginImages } from "../src/plugins/runtime.js";

describe("sanitizePluginImages", () => {
  it("passes good pictures and nothing for none", () => {
    expect(sanitizePluginImages(undefined)).toEqual({});
    expect(sanitizePluginImages([])).toEqual({});
    expect(sanitizePluginImages([{ data: "iVBORw0KGgo=", mimeType: "image/png" }])).toEqual({ images: [{ data: "iVBORw0KGgo=", mimeType: "image/png" }] });
  });

  it("refuses the wrong type, a data URL, too many and too big", () => {
    expect(sanitizePluginImages("x").error).toBeTruthy();
    expect(sanitizePluginImages([{ data: "AAAA", mimeType: "image/svg+xml" }]).error).toContain("type");
    expect(sanitizePluginImages([{ data: "data:image/png;base64,AAAA", mimeType: "image/png" }]).error).toContain("base64");
    expect(sanitizePluginImages(Array(5).fill({ data: "AAAA", mimeType: "image/png" })).error).toContain("at most");
    expect(sanitizePluginImages([{ data: "A".repeat(PLUGIN_IMAGE_CHARS + 4), mimeType: "image/png" }]).error).toContain("8 MB");
  });
});

describe("pickVisionModel (Auto)", () => {
  const m = (provider: string, modelId: string, images: boolean, price: number | null) => ({
    provider, modelId, images, pricing: price === null ? null : { input: price, output: price, cacheRead: 0, cacheWrite: 0 },
  });
  it("takes the cheapest model that reads pictures, unknown prices last", async () => {
    const { pickVisionModel } = await import("../src/models.js");
    expect(pickVisionModel([m("a", "text", false, 0), m("b", "dear", true, 5), m("c", "cheap", true, 0.1), m("d", "unknown", true, null)])).toBe("c/cheap");
    expect(pickVisionModel([m("d", "unknown", true, null)])).toBe("d/unknown");
    expect(pickVisionModel([m("a", "text", false, 0)])).toBeNull();
  });
});
