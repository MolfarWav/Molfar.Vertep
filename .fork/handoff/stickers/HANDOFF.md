# Handoff: stickers and custom emoji in Social, and the animated "Molfar" pack (issue #329)

Written 2026-11-09. For the session (another account) that animates the pack. Read `CLAUDE.md`, `.fork/STATE.md` (entry "#329 STICKERS"), then this file.

## What is built (Social repo MolfarWav/Molfar.Vertep-Social, branch `claude/issue-329-stickers`, PR open, not merged)
- Step 1, the user's own packs: plugin `stickers` (`stickers/packs.json`), `src/stickers/` (model, shared list, manager dialog, `RichText`), a pack row in the emoji picker, a tap on a sticker sends it at once in a chat or a forum reply, custom emoji are `:pack/item:` tokens drawn inline.
- Step 2, characters: `profile.stickerPacks` switched in Profiles > Writing manner; the plugins' `stickers-shared` block; `[[sticker: pack/item]]`; at most 3 a day; a new forum topic gets no sticker.
- Animated pictures: an animated WebP or APNG is stored untouched (`src/lib/animated-image.ts`), 4 tests. 295 tests pass.
- Details: Social `AGENTS.md` ("Stickers and custom emoji"), `docs/STICKERS-DESIGN.md`, the guide section in `.skills/guide/pages/messenger.md` and `profiles.md`.

## Facts that decide how the art is made
- Stored formats: PNG, WebP, GIF, JPEG. **Animated WebP** (lossless, alpha) is the right format: a 356x540 sticker with 12 frames is 52 KB; the same as GIF is 638 KB and fails the **512 KB** limit of the manager. APNG works but is larger than WebP. SVG is refused.
- A file is kept **untouched** when it is an animated WebP/APNG or a GIF, so **draw it at the final size**: sticker up to 512 px on the long side (displayed up to 200 css px), custom emoji up to 64 px (shown 1.5 em high, about 24 px in a chat line). Nothing rescales an animation.
- The engine stores the bytes as they are (`PUT /v1/assets`, served as `image/webp`); checked byte for byte on a throwaway engine. No engine change is needed.
- A pack id and an item id are letters, digits, `_` and `-`, at most 40 each (they sit in the token `:pack/item:`). At most 200 items a pack, 40 packs.
- A custom emoji at 42x64 shows the silhouette, the beard and the cyan eye; fine marks (tear, blush) are visible only in the sticker. Do not rely on small details in the emoji version.
- Characters are told only the id and the name of up to 12 items per pack, never the pictures.

## The art source and the pipeline (all of it is on the laptop, outside every repo)
- Source: Nano Banana sheets of pixel-art heads of Molfar on a flat magenta background, 8 heads (4x2) a sheet, JPG 2752x1536. Folder `molfar-sticker` next to the repo checkouts on the laptop (`D:\Claude\molfar-sticker`): `01.jpg` to `06.jpg`. **The art is the owner's; do not commit it or its derivatives to a public repo until he decides the pack ships with Social.**
- Best sheet: **`04.jpg`** (cleanest edges, most stable faces). `01.jpg` is also clean. `02.jpg` has a magenta tint on a beard, `03.jpg` is coarser. `05.jpg` and `06.jpg` are three-quarter views (heads cut off at the bottom in 05), usable as a second set; head 6 of sheet 06 has the cyber eye off and black.
- Order of the 8 heads on sheet 04 (left to right, top row then bottom): 1 happy, 2 laughing with a wink, 3 sad with a tear, 4 love (blush, sparkles by the eye), 5 smug wink, 6 sleepy (cyber eye dim, mouth open), 7 suspicious side glance, 8 deadpan. A stray brown stick in cell 7 is dropped by the extractor.
- Tools in `tools/` here (Python, Pillow and numpy; install with `pip install --no-cache-dir --target <folder> pillow numpy` and give the folder as `PYLIBS`; on the laptop the owner wants nothing installed on drive C: beyond what exists, so the libraries are in `D:\Claude\pylibs`):
  1. `extract.py <sheet.jpg> <outdir>` cuts each head into `headNN.png` (RGBA). Magenta is found by `min(R,B) - G > 110`; components are found on a quarter-size mask; small components are dropped. It also prints the pixel pitch.
  2. `native.py <headdir> <outdir> [pitch]` samples each **art pixel at its centre** (pitch 5.6 for these sheets, about 90x135 art pixels a head), drops the magenta fringe of the JPEG (`min(R,B) - G > 45`), writes `headNN.png` at native size and contact sheets. **Do not quantize to few colours: it turned the cyan eye grey.**
  3. `proto.py <native head png> <outprefix>` is the prototype: the cyan pixels (`b>150, g>120, r<130`) and their bright core pulse over 12 frames, with a soft halo on the skin; it writes the sticker (x4 nearest) and the emoji (box-scaled to 64 px high) as animated WebP and GIF, and a frame strip to look at.
- Working copies on the laptop: `work/s04` (cut heads), `work/n04` (native sprites), `work/proto` (the happy-head prototype).

## To do (in this order)
1. **Animate all 8 heads of sheet 04** as animated WebP, each as a sticker (native x4, about 356x540) and as an emoji (64 px high). Move only separate layers, never swap whole drawings (the head would shake; see the skill `animated-character-assets`). Per head: the cyan eye pulses (as in `proto.py`; the dim end of the pulse is a little too dark, keep it brighter), the human eye blinks, the beard sways a pixel or two, and what the mood needs: the tear rolls down (3), the blush blinks and the sparkles twinkle (4), the cyber eye stays dim with a slow flicker (6), the eyes glance (7). Keep loops seamless, 90 ms a frame is fine, 8 to 14 frames. Check pixels outside the moved regions are identical between frames and every file is under 512 KB.
2. **Look at it in a browser at the real display size**, on a dark and a light ground, at 24 px and at 200 px (the emoji line and the sticker). Say honestly which is measured and which is only looked at.
3. **Build the pack**: pack id `molfar`, two packs, `molfar` (kind sticker, 8 items) and `molfar-emoji` (kind emoji, 8 items), item ids like `happy`, `laugh`, `sad`, `love`, `smug`, `sleepy`, `suspicious`, `deadpan`, names in English (Ukrainian optional in the tags for search). Test by choosing the files in Social's pack manager on a throwaway engine (`browser-check` skill; Social is not installed there by default, so also test the plain path: upload with `curl -X PUT $ENGINE_URL/v1/assets` and write `stickers/packs.json`).
4. **Ship it with Social (needs the owner's yes first)**: the page cannot write binary files, so a bundled pack is files in the app's folder plus a button "Add the Molfar pack" that fetches them from the app's own address and uploads them with `uploadItem`-like code (the same path a catalog of free packs would use). Open an issue for this together with the catalog idea (free packs from a curated repo, only CC0, CC-BY or MIT, never NC; author and licence shown on the card). Check first whether the app frame's CSP lets the page fetch from GitHub.

## Do not
- Do not write a key, a token or a file of the owner's art into a repo. (A key was committed by mistake on 2026-11-04 in `.agents/skills/ask-model/keys.env`; it is still in history and tags and was revoked.)
- Do not quantize the art to a small palette, do not rescale an animation in the browser, do not use SVG.
- Do not write "close #329" in a PR body (GitHub would close the issue before its "How it was solved" comment). #329 stays open until the pack and the character side are judged done.

## Open in #329 (also in the issue)
Pack size in the manager, a starter pack (this work), tokens in forum board and search previews showing as plain text, which 12 items are listed for packs over 12 (the first 12 now), guide translations for the new text (stale until refreshed before a release), a real model following the marker format, the forum reply path and the manager on a phone in a browser. #345 (fold check on a real model) still waits for a working key.
