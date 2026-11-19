#!/usr/bin/env python3
"""Turns the owner's place-icon pictures (an object on a flat magenta background) into transparent WebP icons.

Usage: python scripts/place-icons.py <folder> [<folder> ...] [--only kind] [--missing] [--size 256]
Needs Pillow and numpy (pip install pillow numpy). Reads scripts/place-icons.json (kind -> file names; a file is looked for in each folder
given), writes builtin-assets/place-icons/<kind>-<n>.webp and builtin-assets/place-icons/index.json (kind -> how many variants).
--missing makes only the kinds that have no <kind>-1.webp yet and keeps the rest of the index (for a new set of pictures).
The maps of scripts/place-icons.json ("mapPacks") are not converted here: see scripts/map-packs.py.
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image

LO, HI = 55, 125  # "magentaness" below LO is the object, above HI is background


def shift(a, dy, dx):
    out = np.zeros_like(a)
    h, w = a.shape
    ys, yd = (slice(dy, h), slice(0, h - dy)) if dy >= 0 else (slice(0, h + dy), slice(-dy, h))
    xs, xd = (slice(dx, w), slice(0, w - dx)) if dx >= 0 else (slice(0, w + dx), slice(-dx, w))
    out[yd, xd] = a[ys, xs]
    return out


def dilate(mask, n):
    for _ in range(n):
        m = mask.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            m |= shift(mask, dy, dx)
        mask = m
    return mask


def key(im):
    c = np.asarray(im.convert("RGB")).astype(np.float32)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    m = np.minimum(r, b) - g                      # high only for magenta and pink
    alpha = np.clip((HI - m) / (HI - LO), 0, 1)
    edge = dilate(alpha < 0.98, 3) & (alpha > 0.0) | (dilate(alpha < 0.5, 2) & (alpha > 0.0))
    spill = np.maximum(0, np.minimum(r, b) - g)   # pull the pink out of the rim only
    for ch in (0, 2):
        c[..., ch] = np.where(edge, c[..., ch] - spill, c[..., ch])
    rgba = np.dstack([np.clip(c, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def fit(im, size, margin=0.05):
    a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 8)
    if len(ys) == 0:
        raise ValueError("empty picture")
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    side = int(max(im.size) * (1 + 2 * margin))
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return sq.convert("RGBa").resize((size, size), Image.LANCZOS).convert("RGBA")


def find(folders, name):
    for f in folders:
        p = os.path.join(f, name)
        if os.path.exists(p):
            return p
    raise FileNotFoundError(name)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="+")
    ap.add_argument("--only")
    ap.add_argument("--missing", action="store_true")
    ap.add_argument("--size", type=int, default=256)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "builtin-assets", "place-icons"))
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(os.path.dirname(__file__), "place-icons.json"), encoding="utf-8"))
    os.makedirs(a.out, exist_ok=True)
    index_path = os.path.join(a.out, "index.json")
    index = json.load(open(index_path)) if (a.missing and os.path.exists(index_path)) else {}
    done = 0
    for kind, files in cfg["kinds"].items():
        if a.only and kind != a.only:
            continue
        if a.missing and os.path.exists(os.path.join(a.out, f"{kind}-1.webp")):
            index.setdefault(kind, len(files))
            continue
        for n, f in enumerate(files, 1):
            icon = fit(key(Image.open(find(a.src, f))), a.size)
            icon.save(os.path.join(a.out, f"{kind}-{n}.webp"), "WEBP", quality=84, method=6)
            done += 1
        index[kind] = len(files)
    if not a.only:
        json.dump({k: index[k] for k in cfg["kinds"] if k in index}, open(index_path, "w"), indent=1)
    print("done", done, "icons")


if __name__ == "__main__":
    sys.exit(main())
