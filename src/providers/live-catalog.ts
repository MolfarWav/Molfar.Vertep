/**
 * Live model lists for built-in providers.
 *
 * The built-in catalogs ship inside pi-ai and only change with a pi-ai release, so a
 * model a provider started serving last week is missing until the next upgrade. For
 * providers whose OpenAI-compatible `GET /models` is known to list chat models only (or
 * says which ones are chat), the ids the catalog does not know yet are added from that
 * list. The catalog stays the source for every model it knows: its windows, prices,
 * thinking levels and compat flags are tuned per model, which a bare `/models` entry
 * cannot replace. A new model is a copy of its closest catalog sibling (same vendor
 * prefix, else the provider's first entry on the same wire API) with its own id, name
 * and whatever limits and prices the list quotes; an unknown window stays 0 (unknown),
 * which the small-window mode and the context meter already treat as unknown.
 *
 * Nothing is removed: a catalog id the list no longer names still shows, as before.
 */
import type { Api, Model, Provider, RefreshModelsContext } from "@earendil-works/pi-ai";
import { mapOpenAiModelsResponse } from "./custom.js";

interface LiveSource {
  /** The provider's model list route. */
  url: string;
  /** Send the stored key: false for a public list. */
  auth: boolean;
  /** Keep only the entries that are chat models (the raw list items). */
  chat?: (item: Record<string, unknown>) => boolean;
  /** The list quotes windows, prices and reasoning; without it a new model
   *  thinks like its sibling and its window stays unknown. */
  rich?: boolean;
}

/** Text in, text out: OpenRouter also lists image and audio generators. */
const openRouterChat = (item: Record<string, unknown>): boolean => {
  const arch = (item.architecture ?? {}) as Record<string, unknown>;
  const out = arch.output_modalities;
  return !Array.isArray(out) || out.includes("text");
};

/** Providers whose `/models` is checked to list chat models (or to mark them). */
export const LIVE_SOURCES: Record<string, LiveSource> = {
  openrouter: { url: "https://openrouter.ai/api/v1/models", auth: false, chat: openRouterChat, rich: true },
  deepseek: { url: "https://api.deepseek.com/models", auth: true },
  moonshotai: { url: "https://api.moonshot.ai/v1/models", auth: true },
  "moonshotai-cn": { url: "https://api.moonshot.cn/v1/models", auth: true },
};

const vendorOf = (id: string): string => (id.includes("/") ? id.slice(0, id.indexOf("/")) : "");

const sharedPrefix = (a: string, b: string): number => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

/** The catalog model a new id most likely behaves like: same vendor, then the
 *  longest shared id prefix ("deepseek-v5" is closer to "deepseek-v4" than to
 *  "deepseek-flash"). */
function siblingOf(id: string, known: readonly Model<Api>[]): Model<Api> {
  const vendor = vendorOf(id);
  const same = known.filter((k) => vendorOf(k.id) === vendor);
  // an unknown vendor goes over the plain OpenAI-compatible wire, never over
  // another vendor's own API (OpenRouter serves Claude as anthropic-messages)
  const plain = known.filter((k) => k.api === "openai-completions");
  const pool = same.length ? same : plain.length ? plain : known;
  let best = pool[0]!;
  let score = -1;
  for (const k of pool) {
    const n = sharedPrefix(id, k.id);
    if (n > score) [best, score] = [k, n];
  }
  return best;
}

/** The listed ids the catalog does not have, each built on its closest sibling. */
export function liveAdditions(known: readonly Model<Api>[], listed: unknown, source: Pick<LiveSource, "chat" | "rich">): Model<Api>[] {
  const raw = (listed as { data?: unknown[] })?.data;
  if (!Array.isArray(raw) || !known.length) return [];
  const chat = source.chat;
  const kept = chat ? { data: raw.filter((x) => !!x && typeof x === "object" && chat(x as Record<string, unknown>)) } : listed;
  const ids = new Set(known.map((m) => m.id));
  const out: Model<Api>[] = [];
  for (const m of mapOpenAiModelsResponse(kept)) {
    if (ids.has(m.id)) continue;
    ids.add(m.id);
    const like = siblingOf(m.id, known);
    const reasoning = source.rich ? m.reasoning === true : like.reasoning;
    const model: Model<Api> = {
      ...like,
      id: m.id,
      name: m.name ?? m.id,
      reasoning,
      input: m.vision || (!source.rich && like.input.includes("image")) ? ["text", "image"] : ["text"],
      cost: m.cost ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: m.contextWindow ?? 0,
      maxTokens: m.maxTokens ?? like.maxTokens,
    };
    // a sibling's thinking map means nothing to a model that does not think
    if (!reasoning) delete (model as { thinkingLevelMap?: unknown }).thinkingLevelMap;
    out.push(model);
  }
  return out;
}

function keyOf(credential: unknown): string | undefined {
  const c = credential as { type?: string; key?: string } | undefined;
  return c?.type === "api_key" && typeof c.key === "string" && c.key ? c.key : undefined;
}

/** The provider with the live additions from its `/models`; every other behaviour is its own. */
export function withLiveCatalog(provider: Provider, opts: { fetch?: typeof fetch } = {}): Provider {
  const source = LIVE_SOURCES[provider.id];
  if (!source || provider.refreshModels) return provider;
  let extra: Model<Api>[] = [];
  const fetchFn = opts.fetch ?? fetch;
  const refreshModels = async (context: RefreshModelsContext): Promise<void> => {
    if (context.stored) {
      const restored = context.stored.models.filter((m) => (m as Model<Api>).provider === provider.id) as Model<Api>[];
      if (!(await context.publish({ update: () => { extra = restored; } }))) return;
    }
    if (!context.allowNetwork || context.signal.aborted) return;
    const key = keyOf(context.credential);
    // a list behind a key is asked only once the user has one
    if (source.auth && !key) return;
    const res = await fetchFn(source.url, {
      headers: source.auth && key ? { authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.any([context.signal, AbortSignal.timeout(15_000)]),
    });
    if (!res.ok) throw new Error(`${source.url} → HTTP ${res.status}`);
    const added = liveAdditions(provider.getModels(), await res.json(), source);
    if (context.signal.aborted) return;
    await context.publish({ persist: { models: added, checkedAt: Date.now() }, update: () => { extra = added; } });
  };
  return new Proxy(provider, {
    get(target, prop) {
      if (prop === "getModels") return () => [...target.getModels(), ...extra];
      if (prop === "getAllModels") {
        const all = target.getAllModels?.bind(target);
        return () => [...(all ? all() : target.getModels()), ...extra];
      }
      if (prop === "refreshModels") return refreshModels;
      const v = Reflect.get(target, prop, target);
      return typeof v === "function" ? v.bind(target) : v;
    },
    has(target, prop) {
      return prop === "refreshModels" || Reflect.has(target, prop);
    },
  });
}
