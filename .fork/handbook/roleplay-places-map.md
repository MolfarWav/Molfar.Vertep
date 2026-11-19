# Roleplay places map: the floating map of a chat's places
Verified at: molfar.vertep-roleplay c0e95cb (branch `claude/map-454`, not merged)

## What it does
- A round chip over the chat opens a floating window with a board of the chat's World place records: icons, names, dashed roads between places the story moved between, the place the story is in marked.
- Layout is by code (no model): new places go next to the place the story came from, rooms (World "spots") around their place. The player drags places; positions are never moved by code afterwards. A map picture of the player's own can lie under the places.
- It is step M2 of Molfar.Vertep#454. Travel by a tap, a road's time and street, and the engine's shared icon set (M1) are not built.

## Owners
- `src/lib/place-map.ts` `cleanPlaceMap`: the kept shape and its limits (the plugin keeps its own copy, named cleanPlaceMapMeta).
- `src/lib/place-map.ts` `layoutMap`: nodes from records, a position for each new one (`freeSpot`), `added` = positions to keep.
- `src/lib/place-map.ts` `stepRoute`: adds a road when the scene's whole place changes; `at` follows the story.
- `src/lib/place-map.ts` `moveNode`: a drag; a whole place takes its rooms along.
- `src/lib/place-map.ts` `withPositions`: merges new positions, cap 200.
- `src/lib/float-box.ts` `boxRect`: where the window or chip stands inside an area (desktop: the chat column; phone: from the top of the messages to the message box).
- `src/lib/float-box.ts` `setFolded`, `dragTo`, `resizeTo`, `loadBox`, `saveBox`: fold, drag, resize and the browser-local copy (`rp.float.map.<chatId>`).
- `src/lib/place-kinds.ts` `placeKind`: the kind a name says (English whole words, Ukrainian and Russian stems), its emoji; the seed of the shared icon set.
- `src/lib/place-map-open.ts` `usePlaceMapOpen`: tells the sprite stage a phone's map is open.
- `src/components/chat/place-map.tsx` `PlaceMap`: reads the records and the scene's place, keeps positions and roads, the window, chip, gear menu, spoiler gate, picture upload.
- `src/components/chat/place-map-board.tsx` `PlaceMapBoard`: pan, pinch, wheel, node drag, picture slot, routes.
- `plugins/engine/plugin.js` `cleanPlaceMapMeta`: cleans `placeMap` on `PATCH /chats/<id>`.
- `src/lib/engine.ts` `chatPatchOf`: sends `placeMap`; `src/lib/types.ts` `Chat.placeMap`.

## Data
- Chat meta `placeMap`: `{ v: 1, nodes: { <place record id>: { x, y } }, routes: [ { a, b } ], picture?: { id }, at?: <record id> }`. Board units, 1600 x 1000, clamped 70 from the edge; 200 nodes; 400 routes (unordered, `a` sorts first). `picture.id` is an asset id in the engine's store (`/v1/assets/<id>`), not a Backgrounds item. Format text: Roleplay `docs/DATA-FORMATS.md` ("placeMap").
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
- A new icon set from the engine: `placeKind` ids become the file names; the board draws `kind.emoji` today.

## Traps
- The board is its own component, not `canvas-kit`: its cards carry ports and are 200 x 74.
- A swiped reply does not take back a road it walked; `at` is the last whole place seen.
- Positions are saved from an effect that runs on each records or scene read; `layoutMap` returns `added` only for nodes without a position, or it would write forever.
- The window's drag and resize use pointer capture and a `buttons === 0` guard: an app frame does not always hear a button released outside it.
- A page reload takes about 8 s before the chip shows (the World state call comes after the app boots).
- Two floating things fight for a phone's room: while the map is open the sprite stage returns nothing (`usePlaceMapOpen`).

## Tests that guard it
`test/rp-place-map.test.ts`, `test/rp-float-box.test.ts`, `test/rp-place-kinds.test.ts`, `test/rp-studio.test.ts` (the `placeMap` meta case).

## Not verified
- The road tracker in a real play: the scene's place came from unit tests only (no Dashboard sensor or World DM ran in the browser check).
- A real phone's keyboard and touch pinch (checked at 390 px with a mouse and touch-sized controls only).
- Many places (more than about 40) in a real chat; the light theme was checked, a custom theme was not.
