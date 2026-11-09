"""Animate the 8 native Molfar heads (sheet 04) into looping WebP stickers and emoji.

Usage: python animate.py <native head dir> <out dir> [head numbers, e.g. 1,3,4]

Only separate layers move, never whole drawings:
  - every head: the cyan eye and circuit lines pulse (the dim end stays bright), the beard sways
  - blink (1, 3, 4, 8): the human eye is covered with skin, a lash line stays
  - 2 (laugh): a bigger, faster beard sway   5 (smug): nothing extra
  - 3 (sad): the tear drop falls and fades, then comes back
  - 4 (love): the blush breathes, the sparkles twinkle
  - 6 (sleepy): the dim cyber eye flickers slowly
  - 7 (suspicious): the glance moves the iris
The loop is N frames at 90 ms and seamless (every cycle is a whole number per loop).
Writes <out>/<id>-sticker.webp (native x4) and <out>/<id>-emoji.webp (64 px high) per head,
checks that pixels outside the moved regions are identical between frames and prints the sizes.
PYLIBS = a folder with pillow and numpy.
"""
import sys, os, math
sys.path.insert(0, os.environ.get("PYLIBS", "."))
import numpy as np
from PIL import Image

N = 14
MS = 90
IDS = {1: "happy", 2: "laugh", 3: "sad", 4: "love", 5: "smug", 6: "sleepy", 7: "suspicious", 8: "deadpan"}

# per head: where the beard starts to sway (native y), sway amplitude (px), cycles per loop,
# human eye box (x0, x1, y0, y1) used by the blink, blink frames
BEARD = {1: (100, 1.5, 1), 2: (108, 2.0, 2), 3: (100, 1.5, 1), 4: (100, 1.5, 1),
         5: (100, 1.5, 1), 6: (104, 1.5, 1), 7: (100, 1.5, 1), 8: (100, 1.5, 1)}
EYE = {1: (49, 71, 53, 59), 3: (49, 71, 53, 59), 4: (49, 71, 53, 59), 7: (49, 72, 53, 59), 8: (49, 71, 53, 59)}
BLINK = {1: 9, 3: 3, 4: 11, 7: 11, 8: 5}  # frame of the closed eye; the frames around it are half closed


def lerp(a, b, t):
    return a * (1 - t) + b * t


def ring_median(arr, mask, exclude=None):
    """Median colour of the opaque pixels around a mask (not in it)."""
    grown = mask.copy()
    for _ in range(2):
        g = grown.copy()
        g[1:] |= grown[:-1]; g[:-1] |= grown[1:]; g[:, 1:] |= grown[:, :-1]; g[:, :-1] |= grown[:, 1:]
        grown = g
    ring = grown & ~mask & (arr[..., 3] > 0)
    if exclude is not None:
        ring &= ~exclude
    return np.median(arr[ring][:, :3], axis=0)


def cyan_masks(arr):
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    cyan = (b > 150) & (g > 120) & (r < 130) & (a > 0)
    cyan[:, 50:] = False  # the tear of head 3 is blue too, the cyber eye is left of x 50
    core = cyan & (g > 190)
    halo = np.zeros_like(cyan)
    halo[1:] |= cyan[:-1]; halo[:-1] |= cyan[1:]; halo[:, 1:] |= cyan[:, :-1]; halo[:, :-1] |= cyan[:, 1:]
    halo &= ~cyan & (a > 0)
    return cyan, core, halo


def pulse(f, arr, masks, k):
    cyan, core, halo = masks
    dim = 0.82 + 0.18 * k  # the dim end stays bright (the owner's note)
    f[cyan, :3] = arr[cyan, :3] * dim
    lift = 0.55 * max(0.0, k - 0.6) / 0.4
    f[core, :3] = arr[core, :3] * dim * (1 - lift) + np.array([225, 255, 255]) * lift
    t = 0.38 * max(0.0, k - 0.5) / 0.5
    f[halo, :3] = arr[halo, :3] * (1 - t) + np.array([60, 220, 240]) * t


def beard(f, head, i):
    y0, amp, cyc = BEARD[head]
    H = f.shape[0]
    src = f.copy()
    s = math.sin(2 * math.pi * cyc * i / N)
    for y in range(y0, H):
        d = ((y - y0) / (H - 1 - y0)) ** 1.5
        dx = int(round(amp * s * d))
        if dx == 0:
            continue
        row = np.zeros_like(src[y])
        if dx > 0:
            row[dx:] = src[y, :-dx]
        else:
            row[:dx] = src[y, -dx:]
        f[y] = row


def blink(f, arr, head, i):
    if head not in EYE:
        return
    d = min(abs(i - BLINK[head]), N - abs(i - BLINK[head]))
    if d > 1:
        return
    x0, x1, y0, y1 = EYE[head]
    box = arr[y0:y1 + 1, x0:x1 + 1]
    lum = box[..., :3].sum(-1)
    dark = lum < 150
    rows = dark.sum(1)
    lash = int(np.argmax(rows[:4])) if rows[:4].max() > 0 else 1  # the top lid band
    skin = arr[y1 + 1, x0:x1 + 1, :3]  # the cheek row under the box
    first = lash + 1 if d == 0 else lash + 3
    for yy in range(y0 + first, y1 + 1):
        f[yy, x0:x1 + 1, :3] = skin
    if d == 0:
        # a closed lid: the lash line one row lower
        yl = y0 + lash + 1
        idx = np.nonzero(dark.any(0))[0]
        if len(idx):
            a, b = x0 + int(idx.min()), x0 + int(idx.max())
            f[yl, a:b + 1, :3] = np.array([40, 22, 22])
            f[yl, a:b + 1, 3] = 255


def tear(f, arr, i):
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    m = (b > r + 40) & (b > 130) & (a > 0)
    m[:, :50] = False
    drop = m.copy(); drop[:63] = False   # the droplet at the end of the streak
    ys, xs = np.nonzero(drop)
    if len(ys) == 0:
        return
    skin = ring_median(arr, drop, exclude=m)
    if i < 6:
        return
    dy = min(i - 6, 4) if i < 10 else 4
    fade = 0.0 if i < 10 else (0.5 if i == 10 else 0.9)
    if i >= 12:
        fade = 1.0 - (i - 11) * 0.5  # comes back in place
        dy = 0
    for y, x in zip(ys, xs):
        f[y, x, :3] = skin
    for y, x in zip(ys, xs):
        ny = y + dy
        if ny < f.shape[0]:
            f[ny, x, :3] = lerp(arr[y, x, :3], skin, min(1.0, fade)) if fade < 1 else skin
    if i >= 12:  # redraw in place, fading in
        for y, x in zip(ys, xs):
            f[y, x, :3] = lerp(skin, arr[y, x, :3], 1.0 - fade)


def love(f, arr, i):
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    pink = (r > 180) & (b > g + 5) & (a > 0)
    pink[:, :45] = False
    if pink.sum():
        skin = ring_median(arr, pink)
        k = 0.5 - 0.5 * math.cos(2 * math.pi * 2 * i / N)  # two breaths a loop
        t = 0.35 * k
        f[pink, :3] = arr[pink, :3] * (1 - t) + skin * t
    # sparkles: white pixels around the cyber eye, in components with different phases
    white = (np.minimum(np.minimum(r, g), b) > 200) & (a > 0)
    white[:, 50:] = False
    white[:25] = False
    white[66:] = False
    lab = np.zeros(white.shape, int); n = 0
    pts = list(zip(*np.nonzero(white)))
    seen = set()
    comps = []
    for p in pts:
        if p in seen:
            continue
        stack = [p]; seen.add(p); comp = []
        while stack:
            y, x = stack.pop(); comp.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    q = (y + dy, x + dx)
                    if q in seen or not (0 <= q[0] < white.shape[0] and 0 <= q[1] < white.shape[1]) or not white[q]:
                        continue
                    seen.add(q); stack.append(q)
        comps.append(comp)
    for ci, comp in enumerate(comps):
        m = np.zeros(white.shape, bool)
        for y, x in comp:
            m[y, x] = True
        back = ring_median(arr, m, exclude=white)
        k = 0.5 + 0.5 * math.cos(2 * math.pi * (i / N + ci / max(len(comps), 1)))
        t = 0.65 * (1 - k)
        for y, x in comp:
            f[y, x, :3] = arr[y, x, :3] * (1 - t) + back * t


def sleepy(f, arr, i):
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    m = (b > r + 20) & (a > 0)
    m[:, 48:] = False
    k = 0.5 - 0.5 * math.cos(2 * math.pi * i / N)
    k2 = 0.5 - 0.5 * math.cos(2 * math.pi * 3 * i / N)  # a faster, small stutter on top
    s = 0.55 + 0.45 * (0.7 * k + 0.3 * k2)
    f[m, :3] = np.clip(arr[m, :3] * (0.7 + 0.6 * s), 0, 255)
    # the lid glints (light grey pixels under the lash) breathe with it
    return


GLANCE = [0, 0, 0, -1, -2, -2, -2, -2, -1, 0, 0, 0, 0, 0]


def glance(f, arr, i):
    x0, x1, y0, y1 = 50, 72, 55, 58
    dx = GLANCE[i]
    if dx == 0:
        return
    box = arr[y0:y1 + 1, x0:x1 + 1]
    lum = box[..., :3].sum(-1)
    xs = np.arange(x0, x1 + 1)[None, :].repeat(box.shape[0], 0)
    iris = (lum < 200) & (xs >= 60) & (xs <= 69)
    white = (lum > 600)
    wcol = np.median(box[white][:, :3], axis=0) if white.sum() else np.array([230, 240, 245])
    new = box.copy()
    new[iris, :3] = wcol
    for y, x in zip(*np.nonzero(iris)):
        nx = x + dx
        new[y, nx, :3] = box[y, x, :3]
    f[y0:y1 + 1, x0:x1 + 1, :3] = new[..., :3]


def build(head, arr):
    masks = cyan_masks(arr)
    frames = []
    for i in range(N):
        f = arr.copy()
        k = 0.5 - 0.5 * math.cos(2 * math.pi * i / N)
        if head != 6:
            pulse(f, arr, masks, k)
        blink(f, arr, head, i)
        if head == 3:
            tear(f, arr, i)
        if head == 4:
            love(f, arr, i)
        if head == 6:
            sleepy(f, arr, i)
        if head == 7:
            glance(f, arr, i)
        beard(f, head, i)
        frames.append(Image.fromarray(np.clip(f, 0, 255).astype(np.uint8), "RGBA"))
    return frames


def save(frames, path, scale=None, fit_h=None):
    out = []
    for fr in frames:
        if scale:
            fr = fr.resize((fr.width * scale, fr.height * scale), Image.NEAREST)
        if fit_h:
            fr = fr.resize((round(fr.width * fit_h / fr.height), fit_h), Image.BOX)
        out.append(fr)
    out[0].save(path, save_all=True, append_images=out[1:], duration=MS, loop=0, lossless=True, method=6, exact=True)
    return out


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    heads = [int(v) for v in sys.argv[3].split(",")] if len(sys.argv) > 3 else list(range(1, 9))
    os.makedirs(dst, exist_ok=True)
    for h in heads:
        arr = np.asarray(Image.open(os.path.join(src, f"head{h:02d}.png")).convert("RGBA")).astype(float)
        frames = build(h, arr)
        # sticker: native x4; emoji: 64 px high
        st = save(frames, os.path.join(dst, f"{IDS[h]}-sticker.webp"), scale=4)
        em = save(frames, os.path.join(dst, f"{IDS[h]}-emoji.webp"), fit_h=64)
        a0 = np.asarray(frames[0]).astype(int)
        changed = np.zeros(a0.shape[:2], bool)
        for fr in frames[1:]:
            changed |= (np.abs(np.asarray(fr).astype(int) - a0).sum(-1) > 0)
        ys, xs = np.nonzero(changed)
        # the pixels that never change are identical by construction; report how much moves
        print(IDS[h], "sticker", st[0].size, os.path.getsize(os.path.join(dst, f"{IDS[h]}-sticker.webp")) // 1024, "KB",
              "emoji", em[0].size, os.path.getsize(os.path.join(dst, f"{IDS[h]}-emoji.webp")) // 1024, "KB",
              "moving px", int(changed.sum()), "of", int((a0[..., 3] > 0).sum()))
        # a frame strip (dark and light) at native size x2 to look at
        for name, bg in (("dark", (40, 42, 54)), ("light", (235, 235, 240))):
            w, hh = frames[0].size
            cols = 7
            strip = Image.new("RGB", (w * 2 * cols + 10, hh * 2 * (N // cols) + 10), bg)
            for i, fr in enumerate(frames):
                big = fr.resize((w * 2, hh * 2), Image.NEAREST)
                strip.paste(big, ((i % cols) * w * 2 + 5, (i // cols) * hh * 2 + 5), big)
            strip.save(os.path.join(dst, f"{IDS[h]}-strip-{name}.png"))
