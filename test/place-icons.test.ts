// The place icons of the Roleplay map (#454): the set shipped in builtin-assets/place-icons, the two routes that serve it
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
import { placeIconBytes, placeIconIndex } from "../src/place-icons.js";

const SET = path.join(import.meta.dir, "..", "builtin-assets", "place-icons");
/** The kinds the Roleplay map knows (its `PLACE_KINDS`, plus the pin that stands for any other place). */
const KINDS = ["smithy", "bakery", "library", "school", "temple", "church", "graveyard", "tavern", "inn", "shop", "market", "mill", "farm", "lighthouse", "ship", "port", "bridge", "gate", "castle", "fortress", "tower", "palace", "dungeon", "cellar", "cave", "mine", "ruins", "camp", "portal", "street", "road", "forest", "meadow", "field", "mountain", "hills", "river", "lake", "sea", "beach", "swamp", "desert", "snow", "garden", "park", "cottage", "house", "village", "town", "city", "room", "place"];

let dataDir: string;
let token: string;
let app: Hono<AppEnv>;
beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "place-icons-"));
  const users = new UserService(dataDir);
  users.create("admin", "admin", { password: "admin-pass-1" });
  token = users.create("alice", "user", { password: "test-pass-1" }).token;
  bootstrapUserDir(dataDir, "alice");
  app = buildApp({ users, sessions: new SessionService(dataDir), config: defaultInstanceConfig(), dataDir, bus: new EventBus() });
});
afterEach(() => fs.rmSync(dataDir, { recursive: true, force: true }));
const get = (p: string, auth = true) => app.request(p, { headers: auth ? { authorization: `Bearer ${token}` } : {} });

describe("the shipped place icons", () => {
  it("has every kind the map knows, four variants each, and a file behind every number", () => {
    const index = placeIconIndex();
    expect(Object.keys(index).sort()).toEqual([...KINDS].sort());
    for (const kind of KINDS) {
      expect(index[kind], kind).toBe(4);
      for (let n = 1; n <= 4; n++) expect(fs.existsSync(path.join(SET, `${kind}-${n}.webp`)), `${kind}-${n}`).toBe(true);
    }
    // nothing in the folder that the index does not list
    const files = fs.readdirSync(SET).filter((f) => f.endsWith(".webp"));
    expect(files.length).toBe(KINDS.length * 4);
  });

  it("every icon is a real WebP with an alpha channel, square, small", () => {
    for (const kind of KINDS) {
      for (let n = 1; n <= 4; n++) {
        const b = placeIconBytes(`${kind}-${n}.webp`)!;
        expect(b, `${kind}-${n}`).not.toBeNull();
        expect(b.subarray(0, 4).toString("latin1"), `${kind}-${n} RIFF`).toBe("RIFF");
        expect(b.subarray(8, 12).toString("latin1"), `${kind}-${n} WEBP`).toBe("WEBP");
        // VP8X header: bit 4 of the flags byte is the alpha flag; a lossy file with alpha is always VP8X
        expect(b.subarray(12, 16).toString("latin1"), `${kind}-${n} VP8X`).toBe("VP8X");
        expect((b[20]! & 0x10) !== 0, `${kind}-${n} alpha`).toBe(true);
        const w = 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16));
        const h = 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16));
        expect([w, h], `${kind}-${n} size`).toEqual([256, 256]);
        expect(b.length, `${kind}-${n} bytes`).toBeLessThan(60_000);
      }
    }
  });

  it("only serves names from the index, never a path", () => {
    expect(placeIconBytes("tavern-1.webp")).not.toBeNull();
    for (const bad of ["tavern-5.webp", "tavern-0.webp", "tavern.webp", "nothing-1.webp", "../package.json", "..%2Fpackage.json", "tavern-1.webp/../x", "TAVERN-1.webp", "tavern-1.png", "index.json", ""]) {
      expect(placeIconBytes(bad), bad).toBeNull();
    }
  });
});

describe("the place icon routes", () => {
  it("lists the kinds and serves an icon as an image", async () => {
    const list = (await (await get("/v1/place-icons")).json()) as { icons: Record<string, number> };
    expect(list.icons.tavern).toBe(4);
    expect(Object.keys(list.icons).length).toBe(KINDS.length);
    const r = await get("/v1/place-icons/tavern-2.webp");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/webp");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("cache-control")).toContain("max-age");
    expect(Buffer.from(await r.arrayBuffer()).equals(fs.readFileSync(path.join(SET, "tavern-2.webp")))).toBe(true);
  });

  it("answers 404 for an unknown name and needs a signed-in user", async () => {
    expect((await get("/v1/place-icons/tavern-9.webp")).status).toBe(404);
    expect((await get("/v1/place-icons/..%2Fpackage.json")).status).toBe(404);
    expect((await get("/v1/place-icons/tavern-1.webp", false)).status).toBe(401);
  });

  it("an app frame may read them and nothing else under the same word", () => {
    expect(appBridgeAllows("roleplay", "GET", "/v1/place-icons", false)).toBe(true);
    expect(appBridgeAllows("roleplay", "GET", "/v1/place-icons/inn-3.webp", false)).toBe(true);
    expect(appBridgeAllows("roleplay", "PUT", "/v1/place-icons/inn-3.webp", false)).toBe(false);
    expect(appBridgeAllows("roleplay", "POST", "/v1/place-icons", true)).toBe(false);
  });
});
