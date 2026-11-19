// The map packs of the Roleplay places map (#454): the pack shipped in builtin-assets/map-packs, the routes that serve it
// and the rule that lets an app frame read them.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Hono } from "hono";
import { buildApp, appBridgeAllows, type AppEnv } from "../src/server/app.js";
import { EventBus } from "../src/server/ws.js";
import { SessionService } from "../src/sessions.js";
import { UserService } from "../src/users.js";
import { defaultInstanceConfig } from "../src/config.js";
import { bootstrapUserDir } from "../src/paths.js";
import { mapPackBytes, mapPacks } from "../src/map-packs.js";

const ROOT = path.join(import.meta.dir, "..", "builtin-assets", "map-packs");
/** The packs and the kinds of map each has: four maps of a kind. */
const PACKS: Record<string, { name: string; kinds: string[] }> = {
  default: { name: "Molfar Vertep", kinds: ["coast", "region", "wilds", "city", "village", "port-town", "interior", "underground"] },
  modern: { name: "Modern city", kinds: ["modern-downtown", "modern-residential", "modern-industrial", "modern-campus", "modern-waterfront", "modern-old-town", "modern-airport", "modern-metropolis", "modern-park", "modern-small-town"] },
};

let dataDir: string;
let token: string;
let app: Hono<AppEnv>;
beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "map-packs-"));
  const users = new UserService(dataDir);
  users.create("admin", "admin", { password: "admin-pass-1" });
  token = users.create("alice", "user", { password: "test-pass-1" }).token;
  bootstrapUserDir(dataDir, "alice");
  app = buildApp({ users, sessions: new SessionService(dataDir), config: defaultInstanceConfig(), dataDir, bus: new EventBus() });
});
afterEach(() => fs.rmSync(dataDir, { recursive: true, force: true }));
const get = (p: string, auth = true) => app.request(p, { headers: auth ? { authorization: `Bearer ${token}` } : {} });

/** Width and height of a WebP (VP8 lossy or VP8X): enough to know the file is the picture it claims to be. */
function webpSize(b: Buffer): [number, number] {
  if (b.subarray(12, 16).toString("latin1") === "VP8X") return [1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16)), 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16))];
  // lossy VP8: 14-bit width and height after the start code 9d 01 2a
  const i = b.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
  return [b.readUInt16LE(i + 3) & 0x3fff, b.readUInt16LE(i + 5) & 0x3fff];
}

describe("the shipped map packs", () => {
  it("has the packs, their kinds, four maps each, and a map and a thumbnail behind every entry", () => {
    const packs = mapPacks();
    expect(packs.map((p) => p.id)).toEqual(["default", "modern"]);
    for (const pack of packs) {
      const want = PACKS[pack.id]!;
      expect(pack.name).toBe(want.name);
      expect([...new Set(pack.maps.map((m) => m.kind))].sort()).toEqual([...want.kinds].sort());
      for (const kind of want.kinds) expect(pack.maps.filter((m) => m.kind === kind).length, `${pack.id} ${kind}`).toBe(4);
      for (const m of pack.maps) {
        expect(fs.existsSync(path.join(ROOT, pack.id, `${m.id}.webp`)), m.id).toBe(true);
        expect(fs.existsSync(path.join(ROOT, pack.id, `${m.id}-thumb.webp`)), `${m.id} thumb`).toBe(true);
      }
      // nothing in the folder the index does not list
      expect(fs.readdirSync(path.join(ROOT, pack.id)).filter((f) => f.endsWith(".webp")).length).toBe(pack.maps.length * 2);
    }
  });

  it("every map is a 16:9 WebP of its recorded size, every thumbnail 320 wide and small", () => {
    for (const pack of mapPacks()) {
      for (const m of pack.maps) {
        const full = mapPackBytes(pack.id, `${m.id}.webp`)!;
        expect(full.subarray(0, 4).toString("latin1"), m.id).toBe("RIFF");
        expect(full.subarray(8, 12).toString("latin1"), m.id).toBe("WEBP");
        const [w, h] = webpSize(full);
        expect([w, h], `${m.id} size`).toEqual([m.w, m.h]);
        expect(w / h, `${m.id} ratio`).toBeGreaterThan(1.7);
        expect(w / h, `${m.id} ratio`).toBeLessThan(1.8);
        expect(full.length, `${m.id} bytes`).toBeLessThan(400_000);
        const th = mapPackBytes(pack.id, `${m.id}-thumb.webp`)!;
        expect(webpSize(th)[0], `${m.id} thumb`).toBe(320);
        expect(th.length, `${m.id} thumb bytes`).toBeLessThan(40_000);
      }
    }
  });

  it("only serves names the index lists, never a path", () => {
    expect(mapPackBytes("default", "city-1.webp")).not.toBeNull();
    expect(mapPackBytes("default", "city-1-thumb.webp")).not.toBeNull();
    for (const bad of ["city-5.webp", "city-0.webp", "city.webp", "nothing-1.webp", "../index.json", "..%2Findex.json", "city-1.png", "index.json", "city-1-thumb-thumb.webp", ""]) {
      expect(mapPackBytes("default", bad), bad).toBeNull();
    }
    for (const bad of ["other", "..", "Default", "default/../default", ""]) expect(mapPackBytes(bad, "city-1.webp"), bad).toBeNull();
  });
});

describe("the map pack routes", () => {
  it("lists the packs and serves a map and its thumbnail as images", async () => {
    const list = (await (await get("/v1/map-packs")).json()) as { packs: { id: string; maps: { id: string; kind: string }[] }[] };
    expect(list.packs.map((p) => p.id)).toEqual(["default", "modern"]);
    expect(list.packs.map((p) => p.maps.length)).toEqual([32, 40]);
    for (const file of ["region-2.webp", "region-2-thumb.webp"]) {
      const r = await get(`/v1/map-packs/default/${file}`);
      expect(r.status).toBe(200);
      expect(r.headers.get("content-type")).toBe("image/webp");
      expect(r.headers.get("x-content-type-options")).toBe("nosniff");
      expect(Buffer.from(await r.arrayBuffer()).equals(fs.readFileSync(path.join(ROOT, "default", file)))).toBe(true);
    }
    expect((await get("/v1/map-packs/modern/modern-airport-3.webp")).status).toBe(200);
  });

  it("answers 404 for an unknown name and needs a signed-in user", async () => {
    expect((await get("/v1/map-packs/default/region-9.webp")).status).toBe(404);
    expect((await get("/v1/map-packs/nope/region-1.webp")).status).toBe(404);
    expect((await get("/v1/map-packs/default/..%2Findex.json")).status).toBe(404);
    expect((await get("/v1/map-packs/default/region-1.webp", false)).status).toBe(401);
  });

  it("an app frame may read them and nothing else under the same word", () => {
    expect(appBridgeAllows("roleplay", "GET", "/v1/map-packs", false)).toBe(true);
    expect(appBridgeAllows("roleplay", "GET", "/v1/map-packs/default/city-3.webp", false)).toBe(true);
    expect(appBridgeAllows("roleplay", "PUT", "/v1/map-packs/default/city-3.webp", false)).toBe(false);
    expect(appBridgeAllows("roleplay", "POST", "/v1/map-packs", true)).toBe(false);
  });
});
