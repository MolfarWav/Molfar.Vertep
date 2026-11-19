// The shared catalog reader (#373): what is parsed and what is skipped, search and look-up, the fetch with its hash check and its disk cache, the routes.
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { catalogBase, createCatalogReader, lookupEntries, norm, parseIndex, parsePack, parseTags, searchEntries, type CatalogEntry } from "../src/catalog.js";
import { defaultInstanceConfig } from "../src/config.js";
import { EventBus } from "../src/server/ws.js";
import { SessionService } from "../src/sessions.js";
import { UserService } from "../src/users.js";
import { bootstrapUserDir } from "../src/paths.js";
import { buildApp } from "../src/server/app.js";

const hashOf = (raw: string) => createHash("sha256").update(raw).digest("hex").slice(0, 16);
const BASE = "https://raw.githubusercontent.com/MolfarWav/Molfar.Vertep-Store/main/catalog/";

const place = { id: "ash-gate", kind: "place", name: "Ash Gate", desc: "A burnt-out city gate.", tags: ["dark_fantasy", "medieval"], aliases: { uk: ["Попелясті ворота"] } };
const item = { id: "ash-gate-key", kind: "item", name: "Gate Key", desc: "Opens the ash gate.", tags: ["fantasy"] };
const olena = { id: "olena", kind: "name", name: "Олена", culture: "ukrainian", part: "given", gender: "f", aliases: { en: ["Olena"] } };
const kovalenko = { id: "kovalenko", kind: "name", name: "Коваленко", culture: "ukrainian", part: "family" };

function files(extra: Record<string, unknown> = {}) {
  const pack = { format: 1, id: "molfar/general", name: "General", author: "Molfar", license: "CC0-1.0", description: "Things.", version: 1, entries: [place, item, olena, kovalenko] };
  const packText = JSON.stringify(pack);
  const index = { format: 1, packs: [{ id: "molfar/general", file: "packs/molfar/general.json", name: "General", author: "Molfar", license: "CC0-1.0", description: "Things.", version: 1, count: 4, hash: hashOf(packText) }] };
  const tags = { version: 1, kinds: ["name", "place"], parts: ["given", "family"], genders: ["f", "m", "n"], genres: ["fantasy", "dark_fantasy"], cultures: ["ukrainian"] };
  return { "index.json": JSON.stringify(index), "tags.json": JSON.stringify(tags), "packs/molfar/general.json": packText, ...extra } as Record<string, string>;
}
function fetcherOf(map: Record<string, string>, log: string[] = []) {
  return (async (url: string) => {
    const rel = String(url).slice(BASE.length);
    log.push(rel);
    return rel in map ? new Response(map[rel]) : new Response("no", { status: 404 });
  }) as unknown as typeof fetch;
}

describe("parsing", () => {
  const row = parseIndex(JSON.parse(files()["index.json"]!))[0]!;
  it("keeps good rows and skips a row whose path, id, hash or licence is wrong", () => {
    const good = JSON.parse(files()["index.json"]!).packs[0];
    const bad = [
      { ...good, file: "../secrets.json" }, { ...good, file: "packs/a/b/c.json" }, { ...good, id: "x/y" }, { ...good, hash: "nothex" }, { ...good, license: "MIT" }, { ...good, name: "" },
    ];
    expect(parseIndex({ packs: [good, ...bad] }).map((r) => r.id)).toEqual(["molfar/general"]);
    expect(parseIndex({ packs: [good, good] })).toHaveLength(1);
    expect(parseIndex(null)).toEqual([]);
  });

  it("cleans entries and skips bad ones", () => {
    const raw = { id: "molfar/general", entries: [place, { ...item, id: "Bad Id" }, { ...item, kind: "monster" }, { ...item, id: "k2", name: "<b>Key</b>\u0000x" }, { ...item, id: "k3", desc: "x".repeat(300) }, place, "junk", { ...olena, gender: "x" }] };
    const out = parsePack(raw, row)!.entries;
    expect(out.map((e) => e.ref)).toEqual(["molfar/general:ash-gate", "molfar/general:k2", "molfar/general:olena"]);
    expect(out[1]!.name).toBe("b Key /b x");
    expect(out[2]!.gender).toBeUndefined();
    expect(out[0]!.aliases).toEqual({ uk: ["Попелясті ворота"] });
  });

  it("a file that is not the pack its path says is refused", () => {
    expect(parsePack({ id: "other/pack", entries: [place] }, row)).toBeNull();
    expect(parsePack({ id: "molfar/general" }, row)).toBeNull();
  });

  it("the vocabulary keeps tag-shaped words only", () => {
    expect(parseTags({ version: 2, genres: ["fantasy", "Bad Tag", 5], cultures: [] })).toMatchObject({ version: 2, genres: ["fantasy"], cultures: [] });
    expect(parseTags([])).toBeNull();
  });

  it("the catalog is found next to the Store list, and only there", () => {
    expect(catalogBase("https://raw.githubusercontent.com/MolfarWav/Molfar.Vertep-Store/main/apps.json")).toBe(BASE);
    expect(catalogBase("https://example.com/feed.json")).toBeNull();
    expect(catalogBase("http://example.com/apps.json")).toBeNull();
    expect(catalogBase(null)).toBeNull();
  });
});

describe("search and look-up", () => {
  const entries: CatalogEntry[] = parsePack(JSON.parse(files()["packs/molfar/general.json"]!), parseIndex(JSON.parse(files()["index.json"]!))[0]!)!.entries;

  it("filters by kind, every tag, name facets and words", () => {
    expect(searchEntries(entries, { kind: "place" }).items.map((e) => e.name)).toEqual(["Ash Gate"]);
    expect(searchEntries(entries, { tags: ["dark_fantasy", "medieval"] }).total).toBe(1);
    expect(searchEntries(entries, { tags: ["dark_fantasy", "fantasy"] }).total).toBe(0);
    expect(searchEntries(entries, { kind: "name", part: "given", gender: "f", culture: "ukrainian" }).items.map((e) => e.name)).toEqual(["Олена"]);
    expect(searchEntries(entries, { anyTags: ["fantasy", "medieval"] }).items.map((e) => e.name)).toEqual(["Ash Gate", "Gate Key"]);
    expect(searchEntries(entries, { kind: "name", culture: ["polish", "ukrainian"], part: "family" }).items.map((e) => e.name)).toEqual(["Коваленко"]);
    expect(searchEntries(entries, { culture: ["polish"] }).total).toBe(0);
    expect(searchEntries(entries, { q: "ash gate" }).total).toBe(2);
    expect(searchEntries(entries, { q: "попелясті" }).total).toBe(1);
    expect(searchEntries(entries, { pack: "molfar/other" }).total).toBe(0);
  });

  it("pages and shuffles (the total is before the limit)", () => {
    const r = searchEntries(entries, { limit: 2, offset: 1 });
    expect(r.total).toBe(4);
    expect(r.items.map((e) => e.name)).toEqual(["Gate Key", "Олена"]);
    let n = 0;
    const shuffled = searchEntries(entries, { random: true, limit: 4 }, () => (n++ % 2 ? 0.1 : 0.9)).items.map((e) => e.name);
    expect(new Set(shuffled)).toEqual(new Set(entries.map((e) => e.name)));
    expect(shuffled).not.toEqual(entries.map((e) => e.name));
  });

  it("look-up: the name in any case and punctuation, an alias, then whole words; the kind narrows it", () => {
    expect(lookupEntries(entries, "ASH-gate")[0]).toMatchObject({ match: "name", entry: { name: "Ash Gate" } });
    expect(lookupEntries(entries, "попелясті ворота")[0]).toMatchObject({ match: "alias" });
    expect(lookupEntries(entries, "olena")[0]).toMatchObject({ match: "alias", entry: { name: "Олена" } });
    expect(lookupEntries(entries, "the ash gate")[0]).toMatchObject({ match: "words" });
    expect(lookupEntries(entries, "ash gate", "item")).toEqual([]);
    expect(lookupEntries(entries, "   ")).toEqual([]);
    expect(norm("Ash-Gate!")).toBe("ashgate");
  });
});

describe("the reader", () => {
  let dir: string;
  beforeEach(() => void (dir = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-"))));
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
  const make = (map: Record<string, string>, log?: string[]) => createCatalogReader({ base: BASE, cacheDir: dir, fetcher: fetcherOf(map, log), userAgent: "test" });

  it("fetches the index, the vocabulary and each pack once and serves from memory for an hour", async () => {
    const log: string[] = [];
    const r = make(files(), log);
    const s = await r.get();
    expect(s.error).toBeUndefined();
    expect(s.packs).toMatchObject([{ id: "molfar/general", count: 4, kinds: { name: 2, place: 1, item: 1 } }]);
    expect(s.entries).toHaveLength(4);
    expect(s.tags?.genres).toContain("fantasy");
    expect(log).toEqual(["index.json", "tags.json", "packs/molfar/general.json"]);
    await r.get();
    expect(log).toHaveLength(3);
    // a forced refresh asks for the index again but not for a pack whose hash did not change
    await r.get({ fresh: true });
    expect(log).toEqual(["index.json", "tags.json", "packs/molfar/general.json", "index.json", "tags.json"]);
  });

  it("a pack that does not match its hash is not served, and the rest still is", async () => {
    const map = files();
    const idx = JSON.parse(map["index.json"]!);
    idx.packs.push({ ...idx.packs[0], id: "molfar/other", file: "packs/molfar/other.json", hash: "0123456789abcdef" });
    map["index.json"] = JSON.stringify(idx);
    map["packs/molfar/other.json"] = JSON.stringify({ format: 1, id: "molfar/other", entries: [place] });
    const s = await make(map).get();
    expect(s.packs.map((p) => p.id)).toEqual(["molfar/general"]);
    expect(s.error).toContain("does not match the index");
  });

  it("an index with a path outside packs/ never makes a request", async () => {
    const map = files();
    const idx = JSON.parse(map["index.json"]!);
    idx.packs[0].file = "../../apps.json";
    map["index.json"] = JSON.stringify(idx);
    const log: string[] = [];
    const s = await make(map, log).get();
    expect(s.packs).toEqual([]);
    expect(log.some((l) => l.includes(".."))).toBe(false);
  });

  it("offline: the copy on disk answers, with the reason", async () => {
    await make(files()).get();
    const down = createCatalogReader({ base: BASE, cacheDir: dir, fetcher: (async () => { throw new Error("offline"); }) as unknown as typeof fetch, userAgent: "test" });
    const s = await down.get();
    expect(s.error).toContain("offline");
    expect(s.entries).toHaveLength(4);
    expect(s.fetchedAt).not.toBeNull();
    // a failed try is not repeated at once
    let calls = 0;
    const counting = createCatalogReader({ base: BASE, cacheDir: path.join(dir, "empty"), fetcher: (async () => { calls++; throw new Error("offline"); }) as unknown as typeof fetch, userAgent: "test" });
    const none = await counting.get();
    await counting.get();
    expect(none.entries).toEqual([]);
    expect(calls).toBe(1);
  });

  it("a changed pack is fetched again, a removed one disappears", async () => {
    const map = files();
    const r = make(map);
    await r.get();
    const pack = JSON.parse(map["packs/molfar/general.json"]!);
    pack.version = 2;
    pack.entries.push({ id: "new", kind: "item", name: "Brand New", desc: "x", tags: ["fantasy"] });
    const text = JSON.stringify(pack);
    const idx = JSON.parse(map["index.json"]!);
    idx.packs[0].hash = hashOf(text);
    const next = { ...map, "index.json": JSON.stringify(idx), "packs/molfar/general.json": text };
    const r2 = createCatalogReader({ base: BASE, cacheDir: dir, fetcher: fetcherOf(next), userAgent: "test" });
    expect((await r2.get({ fresh: true })).entries).toHaveLength(5);
    const gone = createCatalogReader({ base: BASE, cacheDir: dir, fetcher: fetcherOf({ ...next, "index.json": JSON.stringify({ packs: [] }) }), userAgent: "test" });
    expect((await gone.get({ fresh: true })).entries).toEqual([]);
  });
});

describe("the routes", () => {
  let dataDir: string;
  let token: string;
  const build = (map: Record<string, string>, store: string | null | undefined = undefined) => {
    const config = defaultInstanceConfig();
    if (store !== undefined) config.apps.store = store;
    return buildApp({ users: new UserService(dataDir), sessions: new SessionService(dataDir), config, dataDir, bus: new EventBus(), storeFetch: fetcherOf(map) });
  };
  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-routes-"));
    const users = new UserService(dataDir);
    users.create("admin", "admin", { password: "admin-pass-1" });
    token = users.create("alice", "user", { password: "test-pass-1" }).token;
    bootstrapUserDir(dataDir, "alice");
  });
  afterEach(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const get = async (app: ReturnType<typeof build>, url: string) => {
    const res = await app.request(url, { headers: { authorization: `Bearer ${token}` } });
    return { status: res.status, body: (await res.json()) as Record<string, any> };
  };

  it("lists the packs and the vocabulary", async () => {
    const r = await get(build(files()), "/v1/catalog");
    expect(r.body.enabled).toBe(true);
    expect(r.body.packs[0]).toMatchObject({ id: "molfar/general", license: "CC0-1.0" });
    expect(r.body.tags.genres).toContain("dark_fantasy");
  });

  it("searches, with the author and the licence on every entry", async () => {
    const app = build(files());
    const r = await get(app, "/v1/catalog/search?kind=name&part=given&gender=f&limit=5");
    expect(r.body.total).toBe(1);
    expect(r.body.items[0]).toMatchObject({ ref: "molfar/general:olena", name: "Олена", author: "Molfar", license: "CC0-1.0" });
    expect((await get(app, "/v1/catalog/search?tags=dark_fantasy,medieval")).body.items[0].name).toBe("Ash Gate");
    expect((await get(app, "/v1/catalog/search?limit=abc")).status).toBe(200);
    expect((await get(app, "/v1/catalog/search?kind=name&culture=polish,ukrainian&part=given&gender=f")).body.total).toBe(1);
    expect((await get(app, "/v1/catalog/search?anyTags=fantasy,dark_fantasy&kind=place")).body.total).toBe(1);
  });

  it("looks a name up and fetches one entry by its ref", async () => {
    const app = build(files());
    const l = await get(app, "/v1/catalog/lookup?name=ash%20gate&kind=place");
    expect(l.body.matches[0]).toMatchObject({ match: "name", entry: { ref: "molfar/general:ash-gate" } });
    expect((await get(app, "/v1/catalog/lookup")).status).toBe(400);
    expect((await get(app, "/v1/catalog/entry?ref=molfar/general:olena")).body.entry.name).toBe("Олена");
    expect((await get(app, "/v1/catalog/entry?ref=molfar/general:nope")).status).toBe(404);
    expect((await get(app, "/v1/catalog/entry?ref=../etc/passwd")).status).toBe(400);
  });

  it("is off when the Store is off or has no catalog next to it", async () => {
    for (const store of [null, "https://example.com/feed.json"]) {
      const app = build(files(), store);
      expect((await get(app, "/v1/catalog")).body.enabled).toBe(false);
      expect((await get(app, "/v1/catalog/search?kind=name")).body).toMatchObject({ enabled: false, items: [] });
    }
  });

  it("needs a signed-in user", async () => {
    const res = await build(files()).request("/v1/catalog");
    expect(res.status).toBe(401);
  });
});
