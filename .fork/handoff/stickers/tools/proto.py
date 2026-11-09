"""Prototype: a native head sprite -> a pulsing-eye animation as a sticker (x4) and as a custom emoji (64 px high).
Usage: python proto.py <native head png> <outprefix>"""
import sys, os, math
sys.path.insert(0, os.environ.get("PYLIBS", "."))
import numpy as np
from PIL import Image

src, prefix = sys.argv[1], sys.argv[2]
base = Image.open(src).convert("RGBA")
arr = np.asarray(base).astype(float)
r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
# the glowing eye and the circuit lines: clearly cyan pixels
cyan = (b > 150) & (g > 120) & (r < 130) & (a > 0)
# the bright core of the eye (lightest cyan) pulses more
core = cyan & (g > 190)
print("cyan pixels", int(cyan.sum()), "core", int(core.sum()))

def grow(m):
    o = m.copy()
    o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
    return o

halo = grow(cyan) & ~cyan & (a > 0)

def frame(k):
    """k in [0, 1]: 0 = dim, 1 = full glow."""
    f = arr.copy()
    # cyan pixels: darker when dim, lighter toward white when bright
    dim = 0.62 + 0.38 * k
    f[cyan, :3] = f[cyan, :3] * dim
    lift = 0.55 * max(0.0, k - 0.6) / 0.4
    f[core, :3] = f[core, :3] * (1 - lift) + np.array([225, 255, 255]) * lift
    # a soft halo on the skin around the eye while it is bright
    t = 0.38 * max(0.0, k - 0.5) / 0.5
    f[halo, :3] = f[halo, :3] * (1 - t) + np.array([60, 220, 240]) * t
    return Image.fromarray(np.clip(f, 0, 255).astype(np.uint8), "RGBA")

N = 12
ks = [0.5 - 0.5 * math.cos(2 * math.pi * i / N) for i in range(N)]
frames = [frame(k) for k in ks]

def save(frames, path, ms, scale_nearest=None, fit_h=None):
    out = []
    for fr in frames:
        if scale_nearest:
            fr = fr.resize((fr.width * scale_nearest, fr.height * scale_nearest), Image.NEAREST)
        if fit_h:
            w = round(fr.width * fit_h / fr.height)
            fr = fr.resize((w, fit_h), Image.BOX)
        out.append(fr)
    out[0].save(path + ".webp", save_all=True, append_images=out[1:], duration=ms, loop=0, lossless=True, method=6, exact=True)
    # GIF: one transparent colour index; edges are hard anyway in pixel art
    gif = []
    for fr in out:
        p = fr.convert("RGB").quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        alpha = fr.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
        mask = Image.eval(alpha, lambda v: 255 if v == 0 else 0)
        p.paste(255, mask)
        gif.append(p)
    gif[0].save(path + ".gif", save_all=True, append_images=gif[1:], duration=ms, loop=0, transparency=255, disposal=2)
    for ext in ("webp", "gif"):
        print(os.path.basename(path) + "." + ext, os.path.getsize(path + "." + ext) // 1024, "KB", out[0].size)
    return out

os.makedirs(os.path.dirname(prefix), exist_ok=True)
st = save(frames, prefix + "-sticker", 90, scale_nearest=4)
em = save(frames, prefix + "-emoji", 90, fit_h=64)

# a strip of the emoji frames, magnified, on dark and light grounds, to look at
for name, bg in (("dark", (40, 42, 54)), ("light", (235, 235, 240))):
    w, h = em[0].size
    strip = Image.new("RGB", (w * 4 * 6 + 10, h * 4 * 2 + 10), bg)
    for i, fr in enumerate(em[:12]):
        big = fr.resize((w * 4, h * 4), Image.NEAREST)
        strip.paste(big, ((i % 6) * w * 4 + 5, (i // 6) * h * 4 + 5), big)
    strip.save(prefix + f"-emoji-strip-{name}.png")
