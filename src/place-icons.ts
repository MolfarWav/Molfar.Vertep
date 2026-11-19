/**
 * The place icons of the Roleplay map (#454): hand-painted WebP icons, four variants per kind of place,
 * shipped with the engine in `builtin-assets/place-icons/` (made by `scripts/place-icons.py`). The engine
 * only serves them; which kind a place is, and which variant it gets, is the app's business.
 */
import fs from "node:fs";
import path from "node:path";
import { resourcesDir } from "./install.js";

/** `<kind>-<n>.webp`: a kind is lowercase words joined by `-`, n counts from 1. */
const FILE = /^([a-z]+(?:-[a-z]+)*)-([1-9][0-9]?)\.webp$/;

const dir = (): string => path.join(resourcesDir(), "builtin-assets", "place-icons");

let cached: { dir: string; icons: Record<string, number> } | null = null;

/** Which kinds have icons and how many variants each (`{ tavern: 4, ... }`); empty when the set is missing. */
export function placeIconIndex(): Record<string, number> {
  const d = dir();
  if (cached?.dir === d) return cached.icons;
  const icons: Record<string, number> = {};
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(d, "index.json"), "utf8")) as unknown;
    if (raw && typeof raw === "object") {
      for (const [kind, n] of Object.entries(raw)) {
        if (/^[a-z]+(?:-[a-z]+)*$/.test(kind) && Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 99) icons[kind] = n as number;
      }
    }
  } catch {
    /* no set shipped: the app keeps its emoji */
  }
  cached = { dir: d, icons };
  return icons;
}

/** The bytes of one icon, or null for a name that is not in the index (never touches a path built from the name). */
export function placeIconBytes(name: string): Buffer | null {
  const m = FILE.exec(name);
  if (!m) return null;
  const count = placeIconIndex()[m[1] ?? ""];
  if (!count || Number(m[2]) > count) return null;
  try {
    return fs.readFileSync(path.join(dir(), `${m[1]}-${m[2]}.webp`));
  } catch {
    return null;
  }
}
