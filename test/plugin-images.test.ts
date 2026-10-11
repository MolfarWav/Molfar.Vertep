/** Pictures a plugin sends with an llm request (src/plugins/runtime.ts): checked, never trimmed. */
import { describe, expect, it } from "bun:test";
import { PLUGIN_IMAGE_CHARS, sanitizePluginImages } from "../src/plugins/runtime";

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
