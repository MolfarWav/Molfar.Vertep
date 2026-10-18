/**
 * Live model lists for built-in providers (src/providers/live-catalog.ts): ids the bundled
 * catalog does not know come from the provider's /models, built on their closest catalog
 * sibling; the catalog's own entries are never replaced.
 */
import { describe, expect, it } from "bun:test";
import type { Api, Model, RefreshModelsContext } from "@earendil-works/pi-ai";
import { builtinProviders } from "@earendil-works/pi-ai/providers/all";
import { LIVE_SOURCES, liveAdditions, withLiveCatalog } from "../src/providers/live-catalog.js";

const builtin = (id: string) => {
  const p = builtinProviders().find((x) => x.id === id);
  if (!p) throw new Error(`no built-in ${id}`);
  return p;
};

const context = (over: Partial<RefreshModelsContext> = {}): RefreshModelsContext => ({
  publish: async (p) => {
    p.update?.();
    return true;
  },
  allowNetwork: true,
  signal: new AbortController().signal,
  ...over,
});

describe("live additions", () => {
  const openrouter = builtin("openrouter").getModels() as Model<Api>[];
  const known = openrouter.find((m) => m.api === "openai-completions")!;
  const claude = openrouter.find((m) => m.id.startsWith("anthropic/") && m.api === "anthropic-messages");

  it("adds only ids the catalog does not have, with the list's window and prices", () => {
    const listed = {
      data: [
        { id: known.id, name: "From the list", context_length: 1 },
        { id: "newvendor/brand-new", name: "Brand New", context_length: 65536, top_provider: { max_completion_tokens: 8000 }, pricing: { prompt: "0.000001", completion: "0.000002" }, supported_parameters: ["reasoning"] },
      ],
    };
    const added = liveAdditions(openrouter, listed, LIVE_SOURCES.openrouter!);
    expect(added.map((m) => m.id)).toEqual(["newvendor/brand-new"]);
    const m = added[0]!;
    expect(m.name).toBe("Brand New");
    expect(m.contextWindow).toBe(65536);
    expect(m.maxTokens).toBe(8000);
    expect(m.cost.input).toBeCloseTo(1);
    expect(m.cost.output).toBeCloseTo(2);
    expect(m.reasoning).toBe(true);
    expect(m.provider).toBe("openrouter");
  });

  it("an unknown vendor rides the plain OpenAI-compatible wire; a known one its sibling's", () => {
    const listed = { data: [{ id: "nobody/model-x" }, ...(claude ? [{ id: "anthropic/claude-next-9" }] : [])] };
    const added = liveAdditions(openrouter, listed, LIVE_SOURCES.openrouter!);
    expect(added.find((m) => m.id === "nobody/model-x")?.api).toBe("openai-completions");
    if (claude) expect(added.find((m) => m.id === "anthropic/claude-next-9")?.api).toBe(claude.api);
  });

  it("drops what is not a text model on OpenRouter", () => {
    const listed = { data: [{ id: "x/painter", architecture: { output_modalities: ["image"] } }, { id: "x/talker", architecture: { output_modalities: ["text"] } }] };
    expect(liveAdditions(openrouter, listed, LIVE_SOURCES.openrouter!).map((m) => m.id)).toEqual(["x/talker"]);
  });

  it("a plain list leaves the window unknown and thinks like the closest id", () => {
    const deepseek = builtin("deepseek").getModels() as Model<Api>[];
    const near = deepseek[0]!;
    const added = liveAdditions(deepseek, { data: [{ id: `${near.id}-next` }] }, LIVE_SOURCES.deepseek!);
    expect(added[0]?.contextWindow).toBe(0);
    expect(added[0]?.reasoning).toBe(near.reasoning);
  });
});

describe("withLiveCatalog", () => {
  it("lists the additions after a refresh and keeps the catalog", async () => {
    const base = builtin("openrouter");
    const fetchFn = (async () => new Response(JSON.stringify({ data: [{ id: "newvendor/live-one", context_length: 4096 }] }))) as unknown as typeof fetch;
    const wrapped = withLiveCatalog(base, { fetch: fetchFn });
    const before = wrapped.getModels().length;
    expect(before).toBe(base.getModels().length);
    await wrapped.refreshModels!(context());
    expect(wrapped.getModels().length).toBe(before + 1);
    expect(wrapped.getModels().some((m) => m.id === "newvendor/live-one")).toBe(true);
    expect(wrapped.id).toBe("openrouter");
  });

  it("a list behind a key is not asked without one", async () => {
    let asked = 0;
    const fetchFn = (async () => {
      asked++;
      return new Response("{}");
    }) as unknown as typeof fetch;
    await withLiveCatalog(builtin("deepseek"), { fetch: fetchFn }).refreshModels!(context());
    expect(asked).toBe(0);
    await withLiveCatalog(builtin("deepseek"), { fetch: fetchFn }).refreshModels!(context({ credential: { type: "api_key", key: "k" } as never }));
    expect(asked).toBe(1);
  });

  it("a refused list is an error the refresh reports, and the catalog stays", async () => {
    const fetchFn = (async () => new Response("no", { status: 403 })) as unknown as typeof fetch;
    const wrapped = withLiveCatalog(builtin("openrouter"), { fetch: fetchFn });
    await expect(wrapped.refreshModels!(context())).rejects.toThrow("HTTP 403");
    expect(wrapped.getModels().length).toBe(builtin("openrouter").getModels().length);
  });

  it("providers without a checked list are returned as they are", () => {
    const anthropic = builtin("anthropic");
    expect(withLiveCatalog(anthropic)).toBe(anthropic);
  });
});
