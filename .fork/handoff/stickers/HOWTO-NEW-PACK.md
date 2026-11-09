# How the Molfar sticker pack was made, and how to make another (issues #329, #347)

Shipped in Social 0.6.0 (2026-11-09). This is the recipe, so a second pack (the owner's sheets 05 and 06, other characters, a seasonal set) does not start from zero. Results and decisions: `.fork/STATE.md`, entries "#329 THE ANIMATED MOLFAR PACK BUILT AND CHECKED" and "#329 STEP 4".

## 1. Art in, sprites out (Python, Pillow and numpy; `PYLIBS` = a folder with them)
1. Sheets: flat magenta background, 8 heads (4x2) a sheet, JPG 2752x1536 (Nano Banana). Pick the cleanest sheet; the owner's art is not committed anywhere.
2. `tools/extract.py <sheet> <dir>`: cuts each head to RGBA (magenta found by `min(R,B) - G > 110`).
3. `tools/native.py <dir> <out> [pitch]`: samples each art pixel at its centre (pitch 5.6 for these sheets), drops the magenta fringe. **Never quantize to few colours** (the cyan eye turned grey).
4. Look at the contact sheets it writes, dark and light.

## 2. Animation (`tools/animate.py <native dir> <out dir> [heads]`)
- Move separate layers only, never swap whole drawings: colour pulse of the glowing parts, blink (cover the eye box with skin from the cheek row below, keep a lash line), the lower rows of the beard shear 1 to 2 px, plus one thing per mood (tear falls, blush breathes, sparkles twinkle, iris glances).
- 14 frames, 90 ms, every cycle a whole number per loop (seamless). Per-head tables at the top of the file hold the eye boxes and blink frames; find them by zooming the sprite with a grid.
- Output: animated lossless WebP, sticker = native x4 (about 356x540, 165 to 275 KB), emoji = box-scaled to 64 px high (26 to 41 KB). A file must be under 512 KB; nothing rescales an animation, so draw at the final size. GIF is 3 to 10 times larger, SVG is refused.
- Check frame strips (written next to the files) and the pack in a real page at 24 px and 200 px.

## 3. Pack data and bundling
- Pack and item ids: letters, digits, `_`, `-`, at most 40 (they sit in the token `:pack/item:`). Table in Social `src/stickers/molfar-pack.ts`; files in `src/stickers/molfar/<item>-<sticker|emoji>.webp`.
- Bundling (the constraint that decided it): the app frame has `connect-src 'none'` and a plugin's `fs` is the data folder, so files cannot be fetched. They are lazy `import.meta.glob("./molfar/*.webp", {query: "?inline", import: "default"})` data URLs (`molfar-files.ts`), turned into Files and uploaded by the page (`addMolfarPacks` in `packs.ts`). An asset PUT with a bare cookie has no owner app and the frame gets 404.
- Bun (tests, preview) has no glob: the call sits in try/catch and the card is hidden.

## 4. Checks
- `tools/build-pack.mjs` + `tools/verify-pack.mjs` against a throwaway engine (`browser-check` skill): every served file equals the file on disk, `image/webp`.
- The real path: Social installed in the throwaway engine, Playwright: card shows, button adds the packs, picker lists them, a sticker sends, emoji draw inline. Phone-width runs need the shell tours skipped (`[data-guide-overlay]`).
- `test/stickers-molfar.test.ts` (Social) compares the table with the folder (animated, under the limit).

## 5. Ideas not done
- A catalog of free packs (#347 part 2: CC0, CC-BY or MIT only, author and licence on the card): the frame cannot fetch from outside, so it needs an engine route or a plugin with `network`.
- A second Molfar set from sheets 05 and 06 (three-quarter views); more moods; the contact-list and forum-search previews still show raw `:pack/item:` tokens.
