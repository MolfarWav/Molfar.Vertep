/**
 * Models a built-in provider serves that the bundled pi-ai catalog does not list yet.
 *
 * Static catalogs (Anthropic) only change with a pi-ai release, and the next one is a
 * major upgrade that changes how prompts and tools reach providers. Until that lands, a
 * new model is added here as a copy of its closest known sibling (same API, thinking
 * and compat behaviour) with its own id, name, limits and prices.
 * Drop an entry once the bundled catalog has the model: the catalog's own entry wins.
 */
import type { Api, Model, Provider } from "@earendil-works/pi-ai";

interface Addition {
  /** an id the bundled catalog already has: the new model behaves like it */
  like: string;
  id: string;
  name: string;
  cost: Model<Api>["cost"];
  contextWindow: number;
  maxTokens: number;
}

const ADDITIONS: Record<string, Addition[]> = {
  anthropic: [
    { like: "claude-opus-5", id: "claude-opus-5-5", name: "Claude Opus 5.5", cost: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 }, contextWindow: 1_000_000, maxTokens: 128_000 },
    { like: "claude-sonnet-5", id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", cost: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 }, contextWindow: 1_000_000, maxTokens: 128_000 },
    { like: "claude-sonnet-5", id: "claude-haiku-5-5", name: "Claude Haiku 5.5", cost: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 }, contextWindow: 1_000_000, maxTokens: 128_000 },
  ],
};

/** The added models for a provider, given the models it already lists. */
export function catalogAdditions(providerId: string, known: readonly Model<Api>[]): Model<Api>[] {
  const out: Model<Api>[] = [];
  const ids = new Set(known.map((m) => m.id));
  for (const a of ADDITIONS[providerId] ?? []) {
    if (ids.has(a.id)) continue;
    const base = known.find((m) => m.id === a.like);
    if (!base) continue;
    out.push({ ...base, id: a.id, name: a.name, cost: a.cost, contextWindow: a.contextWindow, maxTokens: a.maxTokens });
  }
  return out;
}

/** The provider with its catalog additions; every other behaviour is the provider's own. */
export function withCatalogAdditions(provider: Provider): Provider {
  if (!ADDITIONS[provider.id]) return provider;
  return new Proxy(provider, {
    get(target, prop) {
      if (prop === "getModels") {
        return () => {
          const known = target.getModels();
          return [...known, ...catalogAdditions(target.id, known)];
        };
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}
