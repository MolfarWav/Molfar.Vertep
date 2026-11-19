/**
 * Map packs of the Roleplay places map (#454): painted plans (a region, a town, a dungeon...) shipped with the engine in
 * `builtin-assets/map-packs/<pack>/`, made by `scripts/map-packs.py`. Each pack has an index.json (`{ id, name, maps: [{ id, kind, w, h }] }`),
 * and for every map `<id>.webp` and `<id>-thumb.webp`. The engine only serves them; the app lists them in its gallery and
 * picks a default by what the chat's places are. More packs are more folders.
 */
import fs from "node:fs";
import path from "node:path";
import { resourcesDir } from "./install.js";

const PACK = /^[a-z][a-z0-9-]{0,30}$/;
const MAP_ID = /^[a-z]+(?:-[a-z]+)*-[1-9][0-9]?$/;
const FILE = /^([a-z]+(?:-[a-z]+)*-[1-9][0-9]?)(-thumb)?\.webp$/;

export interface MapEntry { id: string; kind: string; w: number; h: number }
export interface MapPack { id: string; name: string; maps: MapEntry[] }

const root = (): string => path.join(resourcesDir(), "builtin-assets", "map-packs");

let cached: { dir: string; packs: MapPack[] } | null = null;

function readPack(dir: string, id: string): MapPack | null {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, id, "index.json"), "utf8")) as { name?: unknown; maps?: unknown };
    const maps: MapEntry[] = [];
    for (const m of Array.isArray(raw.maps) ? raw.maps : []) {
      const e = m as Partial<MapEntry>;
      if (typeof e.id !== "string" || !MAP_ID.test(e.id) || typeof e.kind !== "string" || !/^[a-z]+(?:-[a-z]+)*$/.test(e.kind)) continue;
      maps.push({ id: e.id, kind: e.kind, w: Number.isInteger(e.w) ? (e.w as number) : 0, h: Number.isInteger(e.h) ? (e.h as number) : 0 });
    }
    return maps.length ? { id, name: typeof raw.name === "string" && raw.name ? raw.name.slice(0, 80) : id, maps } : null;
  } catch {
    return null;
  }
}

/** Every pack that is shipped, with its maps (empty when none is). */
export function mapPacks(): MapPack[] {
  const d = root();
  if (cached?.dir === d) return cached.packs;
  const packs: MapPack[] = [];
  try {
    for (const id of fs.readdirSync(d).sort()) {
      if (!PACK.test(id)) continue;
      const p = readPack(d, id);
      if (p) packs.push(p);
    }
  } catch {
    /* no pack shipped: the app keeps its grid */
  }
  cached = { dir: d, packs };
  return packs;
}

/** The bytes of one map (or its thumbnail), or null for a name the index does not list (never builds a path from the request). */
export function mapPackBytes(pack: string, file: string): Buffer | null {
  const m = FILE.exec(file);
  if (!m || !PACK.test(pack)) return null;
  const p = mapPacks().find((x) => x.id === pack);
  if (!p?.maps.some((e) => e.id === m[1])) return null;
  try {
    return fs.readFileSync(path.join(root(), pack, `${m[1]}${m[2] ?? ""}.webp`));
  } catch {
    return null;
  }
}
