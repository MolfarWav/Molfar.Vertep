/**
 * The shared catalog (#373): names, places, organizations and items with tags, read once by the engine so apps need no network
 * permission of their own. It lives in the Store repository (`catalog/`: `index.json`, `tags.json`, `packs/<author>/<pack>.json`) and is
 * found next to the Store list: `<store dir>/catalog/`.
 *
 * Everything fetched is untrusted text. The index names the pack files, and a URL is only built from a path of the exact shape
 * `packs/<author>/<pack>.json`; a pack must match the hash the index gives and say the id its path says; every entry is cleaned
 * (a bad one is skipped, never fatal: one bad pull request must not empty everyone's catalog) and nothing in it grants anything.
 * The last good copy is kept on disk, so a restart while offline still works.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const CATALOG_KINDS = ["name", "place", "organization", "item"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export interface CatalogEntry {
  /** `<author>/<pack>:<id>`: what a chat or world stores to point at it. */
  ref: string;
  pack: string;
  kind: CatalogKind;
  name: string;
  desc: string;
  aliases: Record<string, string[]>;
  tags: string[];
  culture?: string;
  part?: "given" | "family";
  gender?: "f" | "m" | "n";
}

export interface CatalogPackInfo {
  id: string;
  name: string;
  author: string;
  /** CC0-1.0 or CC-BY-4.0: CC-BY asks that the author be shown. */
  license: string;
  description: string;
  version: number;
  count: number;
  kinds: Partial<Record<CatalogKind, number>>;
}

export interface CatalogTags {
  version: number;
  kinds: string[];
  parts: string[];
  genders: string[];
  genres: string[];
  cultures: string[];
}

export interface CatalogState {
  packs: CatalogPackInfo[];
  entries: CatalogEntry[];
  tags: CatalogTags | null;
  /** When the index was last fetched successfully (ms), null if never. */
  fetchedAt: number | null;
  /** Why the latest fetch failed; the last good copy is still served. */
  error?: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
/** Plain text of at most `max` characters: control characters and angle brackets go, runs of spaces collapse. */
const plain = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = Array.from(v, (ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 || ch === "<" || ch === ">" ? " " : ch)).join("").replace(/\s+/g, " ").trim();
  return s && s.length <= max ? s : null;
};
export const norm = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const hashOf = (raw: string): string => createHash("sha256").update(raw).digest("hex").slice(0, 16);

const PACK_PATH = /^packs\/([a-z0-9][a-z0-9-]{0,31})\/([a-z0-9][a-z0-9-]{0,39})\.json$/;
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const TAG = /^[a-z][a-z0-9_]{0,31}$/;
const LICENSES = ["CC0-1.0", "CC-BY-4.0"];
const MAX_INDEX_BYTES = 256 * 1024;
const MAX_PACK_BYTES = 400 * 1024;
const MAX_PACKS = 200;
const MAX_ENTRIES_PER_PACK = 500;
const TTL_MS = 60 * 60 * 1000;
const RETRY_MS = 60 * 1000;

interface IndexRow {
  file: string;
  id: string;
  hash: string;
  info: CatalogPackInfo;
}

/** The pack rows of an index.json, each with a path that passes the shape check; a malformed row is skipped. */
export function parseIndex(raw: unknown): IndexRow[] {
  const list = isObj(raw) && Array.isArray(raw.packs) ? raw.packs : [];
  const out: IndexRow[] = [];
  const seen = new Set<string>();
  for (const r of list.slice(0, MAX_PACKS)) {
    if (!isObj(r) || typeof r.file !== "string") continue;
    const m = PACK_PATH.exec(r.file);
    if (!m) continue;
    const id = `${m[1]}/${m[2]}`;
    const name = plain(r.name, 80);
    const author = plain(r.author, 80);
    const description = plain(r.description, 300);
    const license = typeof r.license === "string" && LICENSES.includes(r.license) ? r.license : null;
    if (r.id !== id || !name || !author || !description || !license || typeof r.hash !== "string" || !/^[a-f0-9]{16}$/.test(r.hash) || seen.has(id)) continue;
    seen.add(id);
    out.push({ file: r.file, id, hash: r.hash, info: { id, name, author, license, description, version: Number.isInteger(r.version) ? (r.version as number) : 1, count: 0, kinds: {} } });
  }
  return out;
}

/** tags.json cleaned to lists of tag-shaped strings; null when it is not usable. */
export function parseTags(raw: unknown): CatalogTags | null {
  if (!isObj(raw)) return null;
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((t): t is string => typeof t === "string" && TAG.test(t)).slice(0, 100) : []);
  return { version: Number.isInteger(raw.version) ? (raw.version as number) : 1, kinds: list(raw.kinds), parts: list(raw.parts), genders: list(raw.genders), genres: list(raw.genres), cultures: list(raw.cultures) };
}

/** The entries of one pack file; a bad entry is skipped. Null when the file is not the pack its path and index row say. */
export function parsePack(raw: unknown, row: IndexRow): { entries: CatalogEntry[] } | null {
  if (!isObj(raw) || raw.id !== row.id || !Array.isArray(raw.entries)) return null;
  const entries: CatalogEntry[] = [];
  const ids = new Set<string>();
  for (const e of raw.entries.slice(0, MAX_ENTRIES_PER_PACK)) {
    if (!isObj(e) || typeof e.id !== "string" || !ID.test(e.id) || ids.has(e.id)) continue;
    const kind = CATALOG_KINDS.find((k) => k === e.kind);
    const name = plain(e.name, 60);
    if (!kind || !name) continue;
    const desc = e.desc === undefined ? "" : plain(e.desc, 200);
    if (desc === null) continue;
    const aliases: Record<string, string[]> = {};
    if (isObj(e.aliases)) {
      for (const [lang, list] of Object.entries(e.aliases).slice(0, 6)) {
        if (!/^[a-z]{2}$/.test(lang) || !Array.isArray(list)) continue;
        const a = list.map((x) => plain(x, 60)).filter((x): x is string => !!x).slice(0, 5);
        if (a.length) aliases[lang] = a;
      }
    }
    const tags = Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === "string" && TAG.test(t)).slice(0, 8) : [];
    const culture = typeof e.culture === "string" && TAG.test(e.culture) ? e.culture : undefined;
    const part = e.part === "given" || e.part === "family" ? e.part : undefined;
    const gender = e.gender === "f" || e.gender === "m" || e.gender === "n" ? e.gender : undefined;
    ids.add(e.id);
    entries.push({ ref: `${row.id}:${e.id}`, pack: row.id, kind, name, desc, aliases, tags, ...(culture ? { culture } : {}), ...(part ? { part } : {}), ...(gender ? { gender } : {}) });
  }
  return { entries };
}

export interface CatalogSearch {
  kind?: string;
  /** Every tag listed must be on the entry. */
  tags?: string[];
  culture?: string;
  part?: string;
  gender?: string;
  pack?: string;
  /** Words that must all appear in the name, an alias or the description. */
  q?: string;
  /** Random order, for suggestions; without it the order is the packs' own. */
  random?: boolean;
  limit?: number;
  offset?: number;
}

/** Entries that match the filters, with the count before the limit. `rand` is injectable for tests. */
export function searchEntries(entries: CatalogEntry[], s: CatalogSearch, rand: () => number = Math.random): { items: CatalogEntry[]; total: number } {
  const words = (s.q ?? "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  let list = entries.filter((e) => {
    if (s.kind && e.kind !== s.kind) return false;
    if (s.culture && e.culture !== s.culture) return false;
    if (s.part && e.part !== s.part) return false;
    if (s.gender && e.gender !== s.gender) return false;
    if (s.pack && e.pack !== s.pack) return false;
    if (s.tags?.length && !s.tags.every((t) => e.tags.includes(t))) return false;
    if (words.length) {
      const hay = [e.name, e.desc, ...Object.values(e.aliases).flat()].join(" ").toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const total = list.length;
  if (s.random) {
    list = [...list];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
  }
  const offset = Math.max(0, Math.floor(s.offset ?? 0));
  const limit = Math.min(100, Math.max(1, Math.floor(s.limit ?? 20)));
  return { items: list.slice(offset, offset + limit), total };
}

/** Look-up before creating: an entry whose name or alias is the given name (letters only, any case), then ones that contain it as whole words. `kind` narrows it. */
export function lookupEntries(entries: CatalogEntry[], name: string, kind?: string): { entry: CatalogEntry; match: "name" | "alias" | "words" }[] {
  const key = norm(name);
  if (!key) return [];
  const words = name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const out: { entry: CatalogEntry; match: "name" | "alias" | "words"; rank: number }[] = [];
  for (const e of entries) {
    if (kind && e.kind !== kind) continue;
    if (norm(e.name) === key) out.push({ entry: e, match: "name", rank: 0 });
    else if (Object.values(e.aliases).some((l) => l.some((a) => norm(a) === key))) out.push({ entry: e, match: "alias", rank: 1 });
    else {
      // "The Ash Gate" against "Ash Gate" (the entry's words are all in the asked name), or "Ash Gate" against "The Ash Gate" (two or more asked words, all in the entry)
      const split = (x: string) => x.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
      const sameWords = [e.name, ...Object.values(e.aliases).flat()].some((n) => {
        const w = split(n);
        return (w.length >= 2 && w.every((x) => words.includes(x))) || (words.length >= 2 && words.every((x) => w.includes(x)));
      });
      if (sameWords) out.push({ entry: e, match: "words", rank: 2 });
    }
  }
  return out.sort((a, b) => a.rank - b.rank).slice(0, 10).map(({ entry, match }) => ({ entry, match }));
}

/** Where the catalog lives for a Store list URL: `.../apps.json` becomes `.../catalog/`; anything else has no catalog. */
export function catalogBase(storeUrl: string | null): string | null {
  if (!storeUrl) return null;
  const m = /^(https:\/\/[^\s?#]+\/)apps\.json$/.exec(storeUrl);
  return m ? `${m[1]}catalog/` : null;
}

interface PackCache {
  hash: string;
  entries: CatalogEntry[];
}

/**
 * The catalog, fetched on demand and kept for an hour. The index says which packs exist and their hashes; a pack is fetched again only when
 * its hash changed. The last good copy of everything is on disk under `cacheDir`.
 */
export function createCatalogReader(opts: { base: string; cacheDir: string; fetcher?: typeof fetch; userAgent: string }) {
  const fetcher = opts.fetcher ?? fetch;
  let memo: { checkedAt: number; state: CatalogState } | null = null;
  let inflight: Promise<CatalogState> | null = null;
  const packs = new Map<string, PackCache>();
  let loadedDisk = false;

  const file = (...p: string[]) => path.join(opts.cacheDir, ...p);
  const readCache = (name: string): unknown => {
    try {
      return JSON.parse(fs.readFileSync(file(name), "utf8"));
    } catch {
      return null;
    }
  };
  const writeCache = (name: string, text: string): void => {
    try {
      fs.mkdirSync(path.dirname(file(name)), { recursive: true });
      fs.writeFileSync(file(name), text, "utf8");
    } catch { /* the in-memory copy still serves */ }
  };
  const getText = async (rel: string, max: number): Promise<string> => {
    const res = await fetcher(opts.base + rel, { headers: { accept: "application/json", "user-agent": opts.userAgent }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`${rel} answered ${res.status}`);
    const body = await res.text();
    if (body.length > max) throw new Error(`${rel} is too large`);
    return body;
  };

  const assemble = (rows: IndexRow[], tags: CatalogTags | null, fetchedAt: number | null, error?: string): CatalogState => {
    const infos: CatalogPackInfo[] = [];
    const entries: CatalogEntry[] = [];
    for (const r of rows) {
      const c = packs.get(r.id);
      if (!c) continue;
      const kinds: Partial<Record<CatalogKind, number>> = {};
      for (const e of c.entries) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
      infos.push({ ...r.info, count: c.entries.length, kinds });
      entries.push(...c.entries);
    }
    return { packs: infos, entries, tags, fetchedAt, ...(error ? { error } : {}) };
  };

  /** What is on disk, as the starting point (and the answer while offline). */
  const fromDisk = (): CatalogState | null => {
    const idx = readCache("index.json") as { at?: unknown; index?: unknown; tags?: unknown } | null;
    if (!idx || typeof idx.at !== "number") return null;
    const rows = parseIndex(idx.index);
    for (const r of rows) {
      if (packs.get(r.id)?.hash === r.hash) continue;
      const raw = readCache(`packs/${r.id.replace("/", "__")}.json`) as { hash?: unknown; pack?: unknown } | null;
      const parsed = raw && raw.hash === r.hash ? parsePack(raw.pack, r) : null;
      if (parsed) packs.set(r.id, { hash: r.hash, entries: parsed.entries });
    }
    return assemble(rows, parseTags(idx.tags), idx.at);
  };

  const refresh = async (): Promise<CatalogState> => {
    if (!loadedDisk) {
      loadedDisk = true;
      const d = fromDisk();
      if (d) memo = { checkedAt: 0, state: d };
    }
    let state: CatalogState;
    try {
      const indexText = await getText("index.json", MAX_INDEX_BYTES);
      const index = JSON.parse(indexText) as unknown;
      const rows = parseIndex(index);
      let tags: CatalogTags | null = null;
      try {
        tags = parseTags(JSON.parse(await getText("tags.json", MAX_INDEX_BYTES)));
      } catch { /* the vocabulary is for pickers; search works without it */ }
      const problems: string[] = [];
      for (const r of rows) {
        if (packs.get(r.id)?.hash === r.hash) continue;
        try {
          const text = await getText(r.file, MAX_PACK_BYTES);
          if (hashOf(text) !== r.hash) throw new Error("does not match the index");
          const parsed = parsePack(JSON.parse(text) as unknown, r);
          if (!parsed) throw new Error("is not the pack its path says");
          packs.set(r.id, { hash: r.hash, entries: parsed.entries });
          writeCache(`packs/${r.id.replace("/", "__")}.json`, JSON.stringify({ hash: r.hash, pack: JSON.parse(text) }));
        } catch (e) {
          problems.push(`${r.file} ${(e as Error).message}`);
        }
      }
      for (const id of [...packs.keys()]) if (!rows.some((r) => r.id === id)) packs.delete(id);
      const at = Date.now();
      writeCache("index.json", JSON.stringify({ at, index, tags }));
      state = assemble(rows, tags, at, problems.length ? `Some packs were not read: ${problems.slice(0, 3).join("; ")}` : undefined);
    } catch (e) {
      const last = memo?.state.fetchedAt ? memo.state : null;
      const reason = e instanceof SyntaxError ? "the catalog is not valid JSON" : (e as Error).message;
      state = { packs: last?.packs ?? [], entries: last?.entries ?? [], tags: last?.tags ?? null, fetchedAt: last?.fetchedAt ?? null, error: `Couldn't reach the catalog: ${reason}` };
    }
    memo = { checkedAt: Date.now(), state };
    return state;
  };

  return {
    get(req: { fresh?: boolean } = {}): Promise<CatalogState> {
      const ttl = memo && memo.checkedAt > 0 && Date.now() - memo.checkedAt < (memo.state.error ? RETRY_MS : TTL_MS);
      if (!req.fresh && ttl) return Promise.resolve(memo!.state);
      inflight ??= refresh().finally(() => { inflight = null; });
      return inflight;
    },
  };
}
