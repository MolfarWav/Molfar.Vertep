#!/usr/bin/env python3
"""Turns the owner's map pictures (a painted plan of a place, 16:9) into the engine's map packs: WebP at the picture's own size, a small
thumbnail of each, and each pack's index.

Usage: python scripts/map-packs.py <folder> [<folder> ...] [--pack default]   (no --pack: every pack of the config)
Needs Pillow (pip install pillow). Reads "mapPacks" of scripts/place-icons.json (pack -> { name, maps: map name -> file names }, a file is
looked for in each folder given), writes builtin-assets/map-packs/<pack>/<kind>-<n>.webp, <kind>-<n>-thumb.webp and index.json.
The engine serves them at /v1/map-packs. A map name `map-city` is the kind `city`; `map-modern-downtown` is `modern-downtown`.
"""
import argparse, json, os, sys
from PIL import Image

THUMB_W = 320


def find(folders, name):
    for f in folders:
        p = os.path.join(f, name)
        if os.path.exists(p):
            return p
    raise FileNotFoundError(name)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="+")
    ap.add_argument("--pack")
    a = ap.parse_args()
    here = os.path.dirname(__file__)
    cfg = json.load(open(os.path.join(here, "place-icons.json"), encoding="utf-8"))
    for pack, spec in cfg["mapPacks"].items():
        if a.pack and pack != a.pack:
            continue
        out = os.path.join(here, "..", "builtin-assets", "map-packs", pack)
        os.makedirs(out, exist_ok=True)
        maps = []
        for name, files in spec["maps"].items():
            kind = name[len("map-"):] if name.startswith("map-") else name
            for n, f in enumerate(files, 1):
                im = Image.open(find(a.src, f)).convert("RGB")
                base = f"{kind}-{n}"
                im.save(os.path.join(out, base + ".webp"), "WEBP", quality=82, method=6)
                th = im.resize((THUMB_W, round(im.height * THUMB_W / im.width)), Image.LANCZOS)
                th.save(os.path.join(out, base + "-thumb.webp"), "WEBP", quality=76, method=6)
                maps.append({"id": base, "kind": kind, "w": im.width, "h": im.height})
        json.dump({"id": pack, "name": spec["name"], "maps": maps}, open(os.path.join(out, "index.json"), "w", encoding="utf-8"), indent=1)
        print("done", pack, len(maps), "maps")


if __name__ == "__main__":
    sys.exit(main())
