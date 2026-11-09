"""Cuts the heads out of a Nano Banana sheet (flat magenta background) into separate RGBA PNGs and estimates the pixel pitch.
Usage: python extract.py <sheet.jpg> <outdir>
Work files only: nothing here goes into a repository."""
import sys, os
sys.path.insert(0, os.environ.get("PYLIBS", "."))
import numpy as np
from PIL import Image
from collections import Counter

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
im = Image.open(src).convert("RGB")
a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
# magenta score: both red and blue high, green low. Skin and grey are far from it.
score = np.minimum(r, b) - g
bg = score > 110
fg = ~bg

# connected components on a quarter-size mask (pure python flood fill, the mask is small)
small = fg[::4, ::4]
H, W = small.shape
lab = np.zeros((H, W), dtype=int)
n = 0
boxes = []
for y in range(H):
    for x in range(W):
        if small[y, x] and not lab[y, x]:
            n += 1
            stack = [(y, x)]
            lab[y, x] = n
            area = 0
            x0 = x1 = x
            y0 = y1 = y
            while stack:
                cy, cx = stack.pop()
                area += 1
                x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and small[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n
                        stack.append((ny, nx))
            boxes.append((area, x0 * 4, y0 * 4, (x1 + 1) * 4, (y1 + 1) * 4, n))

big = [bx for bx in boxes if bx[0] > 8000]
big.sort(key=lambda bx: (bx[2] // 600, bx[1]))  # rows first, then columns
print(len(boxes), "components,", len(big), "heads")


def pitch(arr):
    """Most common run length (in px) of equal colour along rows: the size of one art pixel."""
    runs = Counter()
    for row in arr[::7]:
        start = 0
        for x in range(1, len(row)):
            if np.abs(row[x] - row[x - 1]).sum() > 60:
                if x - start >= 3:
                    runs[x - start] += 1
                start = x
    return runs.most_common(6)


for i, (area, x0, y0, x1, y1, lab_id) in enumerate(big, 1):
    pad = 6
    box = (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad))
    crop = np.asarray(im.crop(box)).astype(int)
    m = (np.minimum(crop[..., 0], crop[..., 2]) - crop[..., 1]) <= 110
    # keep only this component (a stray object next to a head is dropped)
    comp = np.zeros(m.shape, dtype=bool)
    ys, xs = np.nonzero(m)
    # label lookup via the quarter-size labels
    yy = (np.arange(m.shape[0]) + box[1]) // 4
    xx = (np.arange(m.shape[1]) + box[0]) // 4
    yy = np.clip(yy, 0, H - 1)
    xx = np.clip(xx, 0, W - 1)
    comp = lab[np.ix_(yy, xx)] == lab_id
    # grow the component mask by one small step so the dark outline is kept, then intersect with the colour mask
    grown = comp.copy()
    for _ in range(4):
        g2 = grown.copy()
        g2[1:] |= grown[:-1]
        g2[:-1] |= grown[1:]
        g2[:, 1:] |= grown[:, :-1]
        g2[:, :-1] |= grown[:, 1:]
        grown = g2
    alpha = (m & grown).astype(np.uint8) * 255
    rgba = np.dstack([crop.astype(np.uint8), alpha])
    Image.fromarray(rgba, "RGBA").save(os.path.join(out, f"head{i:02d}.png"))
    print(i, (x1 - x0, y1 - y0), "pitch runs", pitch(crop)[:4])
