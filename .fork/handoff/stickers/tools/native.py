"""Turns the cut heads (work/sNN/headNN.png) into native-resolution pixel sprites: one art pixel = one real pixel.
Usage: python native.py <headdir> <outdir> [pitch]
The pitch is the size of one art pixel in the source (about 5.6 for these sheets)."""
import sys, os, glob
sys.path.insert(0, os.environ.get("PYLIBS", "."))
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
pitch = float(sys.argv[3]) if len(sys.argv) > 3 else 5.6
os.makedirs(out, exist_ok=True)
sheet = []
for f in sorted(glob.glob(os.path.join(src, "head*.png"))):
    im = Image.open(f)
    w, h = im.size
    nw, nh = round(w / pitch), round(h / pitch)
    rgb = im.convert("RGB").resize((nw, nh), Image.NEAREST)  # the centre of each art pixel: no mixed colours
    al = im.getchannel("A").resize((nw, nh), Image.NEAREST)
    a = np.asarray(rgb).astype(int)
    # a magenta tint left by the JPEG at the edge is not part of the art: drop those pixels
    tint = (np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 45
    alpha = np.where(tint, 0, np.asarray(al)).astype(np.uint8)
    sp = rgb.convert("RGBA")
    sp.putalpha(Image.fromarray(alpha, "L"))
    sp.save(os.path.join(out, os.path.basename(f)))
    sheet.append(sp)
    print(os.path.basename(f), sp.size)

# contact sheet: x3 nearest, on a light and a dark ground
cell_w = max(s.width for s in sheet) * 3 + 10
cell_h = max(s.height for s in sheet) * 3 + 10
cols = 4
rows = (len(sheet) + cols - 1) // cols
for name, bg in (("dark", (40, 42, 54)), ("light", (235, 235, 240))):
    img = Image.new("RGB", (cols * cell_w, rows * cell_h), bg)
    for i, s in enumerate(sheet):
        big = s.resize((s.width * 3, s.height * 3), Image.NEAREST)
        img.paste(big, ((i % cols) * cell_w + 5, (i // cols) * cell_h + 5), big)
    img.save(os.path.join(out, f"contact-{name}.png"))
