# Roleplay places map: the floating map of a chat's places
Verified at: molfar.vertep-roleplay and molfar.vertep (engine part), both branch `claude/map-454`, not merged (the lock, the full name and rename, the scene line, the check script: 2026-11-19)

## What it does
- A round chip over the chat opens a floating window with a board of the chat's World place records: painted icons, names, dashed roads between places the story moved between, the place the story is in marked.
- Layout is by code (no model): new places go next to the place the story came from, rooms (World "spots") around their place. The player drags places; positions are never moved by code afterwards. A map picture of the player's own can lie under the places.
- It is steps M2 and M1 of Molfar.Vertep#454: the window, and the painted icons (four per kind, shipped by the engine). Travel by a tap, a road's time and street are not built. Social City still uses its own emoji.

## Owners
- `src/lib/place-map.ts` `cleanPlaceMap`: the kept shape and its limits (the plugin keeps its own copy, named cleanPlaceMapMeta).
- `src/lib/place-map.ts` `layoutMap`: nodes from records, a position for each new one (`freeSpot`), `added` = positions to keep.
- `src/lib/place-map.ts` `stepRoute`: adds a road when the scene's whole place changes; `at` follows the story. A hand-drawn road is an ordinary entry of `routes`, so the tracker never adds it twice.
- `src/lib/place-map.ts` `moveNode`: a drag; a whole place takes its rooms along.
- `src/lib/place-map.ts` `toggleRoute`, `roadsOf`: a road drawn by hand (adds the pair, or removes it when there is one); `PlaceMap`'s `connectFrom` mode (the card's road button, then a tap on another whole place) calls it; while it is on the card is hidden (it would cover nodes) and rooms are dimmed.
- `src/lib/place-map.ts` `withPositions`: merges new positions, cap 200.
- `src/lib/float-box.ts` `boxRect`: where the window or chip stands inside an area (desktop: the chat column; phone: from the top of the messages to the message box).
- `src/lib/float-box.ts` `setFolded`, `dragTo`, `resizeTo`, `loadBox`, `saveBox`: fold, drag, resize and the browser-local copy (`rp.float.map.<chatId>`).
- `src/lib/place-kinds.ts` `placeKind`: the kind a name says (English whole words, Ukrainian and Russian stems), its emoji (the fallback when there is no icon).
- `src/lib/place-icons.ts` `placeIconPath`, `variantOf`, `usePlaceIconIndex`: the icon of a kind for a place (variant by a hash of the place id), the engine's list asked once per page load.
- Engine `builtin-assets/place-icons/<kind>-<n>.webp` + `index.json` (256 px WebP with alpha, 4 per kind, 52 kinds including the pin `place`), made by `scripts/place-icons.py` from the owner's magenta-background pictures and `scripts/place-icons.json`; `src/place-icons.ts` reads them; `GET /v1/place-icons` (the list) and `GET /v1/place-icons/<kind>-<n>.webp` in `src/server/app.ts`; `scripts/dist.ts` copies the folder into a release.
- `src/lib/place-map-lock.ts` `loadLock`, `saveLock`: the padlock (a drag from a place moves the map, a tap picks it), per chat in this browser (`rp.map.lock.<chatId>`); the board's `locked` prop turns a node press into a pan that remembers `tapId`.
- `src/lib/place-map-open.ts` `usePlaceMapOpen`: tells the sprite stage a phone's map is open.
- `src/components/chat/place-map.tsx` `PlaceMap`: reads the records and the scene's place (`scenePlace`, the Dashboard's free text, kept as `sceneText`), keeps positions and roads, the window, chip, lock, gear menu, spoiler gate, picture upload, the card with the full name and the rename (`saveName`: a label in `placeMap.labels`, the World record is not touched).
- `src/components/chat/place-map-board.tsx` `PlaceMapBoard`: pan, pinch, wheel, node drag, picture slot, routes.
- `plugins/engine/plugin.js` `cleanPlaceMapMeta`: cleans `placeMap` on `PATCH /chats/<id>`.
- `src/lib/engine.ts` `chatPatchOf`: sends `placeMap`; `src/lib/types.ts` `Chat.placeMap`.

## Data
- Chat meta `placeMap`: `{ v: 1, nodes: { <place record id>: { x, y } }, routes: [ { a, b } ], picture?: { id }, at?: <record id>, labels?: { <record id>: <name> } }`. Board units, 1600 x 1000, clamped 70 from the edge; 200 nodes; 400 routes (unordered, `a` sorts first). `picture.id` is an asset id in the engine's store (`/v1/assets/<id>`), not a Backgrounds item. Format text: Roleplay `docs/DATA-FORMATS.md` ("placeMap").
- Setting `showPlaceMap` (absent = on): hides the chip everywhere.
- Browser only: the window's place, size and fold, per chat.

## When a model is called
Never. Reads: `GET /world/state` (the count of places and the DM level), `GET /world/peek` (the records), `GET /world/here` (the scene's place record). Writes: `PATCH /chats/<id>`.

## Flow
1. The chat view mounts `PlaceMap`; it loads the World view; with at least one place the chip shows.
2. Records are read again after each World run (`lastRunAt`); the scene's place is read again after each Dashboard reading and each message.
3. Whenever records are read, `layoutMap` gives positions to nodes that have none, and `stepRoute` adds a road; both are written to the chat meta in one patch, even while the window is folded.
4. A drag writes the new position (and its rooms') once, when the finger or button is lifted.
5. A world built before the story asks the World section's spoiler question before the board shows names (`needsGate`, `isRevealed`).

## If you change X, also touch Y
- The `placeMap` shape or limits: `cleanPlaceMap` and `cleanPlaceMapMeta` together, `docs/DATA-FORMATS.md`, `test/rp-place-map.test.ts`, the `rp-studio` meta case.
- The sprite stage's phone limit (`useComposer`, `limitArea`, `stageArea` are exported for the map): `place-map.tsx` uses them.
- The World record fields `size`, `inside`, `visits`, `background`: `layoutMap`, the node card.
- A new kind in `PLACE_KINDS`: a picture set `<id>-1..4.webp` in the engine (`scripts/place-icons.json`, `scripts/place-icons.py`, `builtin-assets/place-icons/index.json`) and the kind list in the engine's `test/place-icons.test.ts`; without them the node keeps its emoji.
- A new icon: the same four places above; the app needs no change, it reads the engine's list.

## Traps
- The board is its own component, not `canvas-kit`: its cards carry ports and are 200 x 74.
- A swiped reply does not take back a road it walked; `at` is the last whole place seen.
- Positions are saved from an effect that runs on each records or scene read; `layoutMap` returns `added` only for nodes without a position, or it would write forever.
- The window's drag and resize use pointer capture and a `buttons === 0` guard: an app frame does not always hear a button released outside it.
- A page reload takes about 8 s before the chip shows (the World state call comes after the app boots).
- A road needs the scene's place to resolve to a World place record (`hereOf` in `plugins/world/plugin.js`: by registry id or by the words of the name). The Dashboard's place line is free text: when it names somewhere the book has no record of, `here` is null, `placeMap.at` is never set and no road is ever drawn (the owner's first real chat: 4 places, no `at`, no roads). The map says so in a line under the header (`place-map-scene`). The tracker only sees moves while the chat is open; it does not read the story's past.
- A rename on the map is a label in `placeMap.labels`, by record id: the record's name is never changed there, because the book, the Dashboard, spots' `inside` and things' `place` go by that name and travel by a tap will go by the record. `MapNode.name` is the label or the record name, `bookName` the record's, `names` all of them (the icon's kind is read from them).
- Two floating things fight for a phone's room: while the map is open the sprite stage returns nothing (`usePlaceMapOpen`).
- In the app frame an `<img src="/v1/...">` first fails (no session) and only then gets a blob URL from the bridge. An `onError` that acts on the first failure hides a healthy picture; the board acts only on an error whose `src` is a `blob:` URL.
- A hook placed after the `if (!visible) return` in `PlaceMap` breaks the page ("Rendered more hooks"); the browser check caught it, no unit test can.

## Tests that guard it
`test/rp-place-map.test.ts`, `test/rp-float-box.test.ts`, `test/rp-place-kinds.test.ts`, `test/rp-place-icons.test.ts`, `test/rp-place-map-lock.test.ts`, `test/rp-studio.test.ts` (the `placeMap` meta case). End to end in a real browser (27 checks, exit code): `.claude/skills/browser-check/placemap-check.mjs` in the engine repo. Engine: `test/place-icons.test.ts` (the set, the routes, the bridge rule), `test/malicious-plugin.test.ts` (the host copy of the rule).

## Not verified
- The road tracker with a real Dashboard sensor and World DM: the browser check writes the Dashboard's snapshot by hand (a scene place), it does not run the sensor.
- A real phone's keyboard and touch pinch (checked at 390 px with a mouse and touch-sized controls only).
- Many places (more than about 40) in a real chat; the light theme was checked, a custom theme was not.
