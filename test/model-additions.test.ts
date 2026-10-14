/**
 * Models the bundled pi-ai catalog does not list yet (src/model-additions.ts): they show up
 * in the Anthropic catalog as copies of their closest sibling, and a catalog that already
 * has one keeps its own entry.
 */
import { describe, expect, it } from "bun:test";
import { createModels } from "@earendil-works/pi-ai";
import { builtinProviders } from "@earendil-works/pi-ai/providers/all";
import { catalogAdditions, withCatalogAdditions } from "../src/model-additions.js";

const anthropic = () => {
  const p = builtinProviders().find((x) => x.id === "anthropic");
  if (!p) throw new Error("no built-in anthropic provider");
  return p;
};

describe("catalog additions", () => {
  it("Claude Opus, Sonnet and Haiku 5.5 are in the Anthropic catalog", () => {
    const models = createModels();
    models.setProvider(withCatalogAdditions(anthropic()));
    const opus = models.getModel("anthropic", "claude-opus-5-5");
    const sonnet = models.getModel("anthropic", "claude-sonnet-5-5");
    expect(opus?.name).toBe("Claude Opus 5.5");
    expect(sonnet?.name).toBe("Claude Sonnet 5.5");
    expect(models.getModel("anthropic", "claude-haiku-5-5")?.name).toBe("Claude Haiku 5.5");
    // they behave like their sibling: same API, base URL and thinking map
    const opus5 = models.getModel("anthropic", "claude-opus-5");
    expect(opus?.api).toBe(opus5?.api);
    expect(opus?.baseUrl).toBe(opus5?.baseUrl);
    expect(opus?.thinkingLevelMap).toEqual(opus5?.thinkingLevelMap);
    expect(opus?.cost.input).toBe(4);
  });

  it("the provider's other behaviour is its own", () => {
    const base = anthropic();
    const wrapped = withCatalogAdditions(base);
    expect(wrapped.id).toBe(base.id);
    expect(typeof wrapped.streamSimple).toBe("function");
    expect(wrapped.getModels().length).toBe(base.getModels().length + 3);
  });

  it("a catalog that already lists a model keeps its own entry", () => {
    const known = anthropic().getModels();
    const opus5 = known.find((m) => m.id === "claude-opus-5");
    if (!opus5) throw new Error("no claude-opus-5 in the catalog");
    const own = { ...opus5, id: "claude-opus-5-5", name: "From the catalog" };
    const added = catalogAdditions("anthropic", [...known, own]);
    expect(added.some((m) => m.id === "claude-opus-5-5")).toBe(false);
  });

  it("other providers are returned as they are", () => {
    const other = builtinProviders().find((x) => x.id !== "anthropic");
    if (!other) throw new Error("no other built-in provider");
    expect(withCatalogAdditions(other)).toBe(other);
  });
});
