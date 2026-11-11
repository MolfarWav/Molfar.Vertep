/**
 * One name per embeddings model (#374).
 *
 * Every stored vector carries the name of the model that made it, and a vector of another name is
 * not used: it is made again. The same model goes by different names depending on who serves it
 * (the model downloaded to this computer is `bge-m3`, OpenRouter's is `baai/bge-m3`, Ollama's is
 * `bge-m3:567m`), so two devices that share a workspace with the same model on both would throw
 * away each other's vectors on every sync. `canonicalEmbedModel` maps the known aliases to one
 * name; the engine applies it where it records which model made the vectors (`embedModelUsed`),
 * so the apps compare names that already agree.
 *
 * The table is deliberately short: a name is listed only when it is certain to be the same model.
 * Different sizes and different quantisations of one family (qwen3-embedding 0.6b / 4b / 8b) stay
 * different. Extend the table when a model is added.
 *
 * Caveat: the model downloaded to this computer is an int8 build, an online one is usually full
 * precision. The vectors differ slightly (not bit for bit) but live in the same space, so they are
 * treated as one model.
 */
const FAMILIES: Record<string, string[]> = {
  "bge-m3": ["bge-m3", "baai/bge-m3", "xenova/bge-m3", "bge-m3:latest", "bge-m3:567m"],
  "text-embedding-3-small": ["text-embedding-3-small", "openai/text-embedding-3-small"],
  "text-embedding-3-large": ["text-embedding-3-large", "openai/text-embedding-3-large"],
  "text-embedding-ada-002": ["text-embedding-ada-002", "openai/text-embedding-ada-002"],
};

const BY_ALIAS: ReadonlyMap<string, string> = new Map(
  Object.entries(FAMILIES).flatMap(([canon, aliases]) => aliases.map((a) => [a.toLowerCase(), canon] as const)),
);

/** The canonical name of a known model, or the name as it came (trimmed) when it is not in the table. */
export function canonicalEmbedModel(name: string): string {
  const trimmed = name.trim();
  return BY_ALIAS.get(trimmed.toLowerCase()) ?? trimmed;
}
