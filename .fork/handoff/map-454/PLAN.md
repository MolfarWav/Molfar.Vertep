# #454: the places map: plan for M2 (the window) and the icon set (M1)

Status (2026-11-19, later): **M2 is built** on Roleplay branch `claude/map-454` (not merged, not released); the icon prompts are in
`ICONS.md`. What changed against this plan while building: the route tracker is not at the three store sites but inside the always-mounted
`PlaceMap` (it reads the scene's place after each Dashboard reading and message); the picture is an engine asset id, not a Backgrounds
item; the chip shows whenever the book has places (a DM switched off only adds a note in the window); a removed place keeps its position
only while the 200 cap allows, not for a month; the place kinds match Ukrainian and Russian stems too (the table lives in Roleplay
`src/lib/place-kinds.ts`); the selected place's card floats over the board instead of pushing it down. The handbook page is
`roleplay-places-map.md`. Issue: MolfarWav/Molfar.Vertep#454. Owner's choice for this thread: start with M2;
the icons are made by the owner in an image model from the prompts below (M1 = the list, the prompts, the files' place in the engine).
Roleplay code goes to branch `claude/map-454` (worktree `rp-map-454`, from Roleplay `main` 7639f2e).

## What was read (so nobody reads it again)
- Roleplay `src/components/chat/expression-panel.tsx`: the sprite window. Drag, resize by the corner, fold to a 48 px chip, a phone limit
  (`PhoneLimit`: between the messages' top and the message box, `useComposer`), layout kept per chat in `localStorage`
  (`loadLayout` / `saveLayout`, `src/lib/sprite-stage.ts`). It has grown (several windows, strip, behind-the-text, #456, #464): do not
  refactor it for the map; the map gets its own small hook and reuses the pure geometry (`fitIn`, `Area`).
- Roleplay `src/canvas-kit/canvas-board.tsx` is a board of 200x74 cards with ports, wires and undo. A map is small icons, plain lines,
  a picture underneath, no ports. **Deviation from the issue ("board on canvas-kit"):** the map has its own light board; it copies the
  pan and zoom feel and the dotted look of the Agents board, nothing else.
- Places: World records of kind `place` (`WorldRecord`: `size: 'spot'`, `inside`, `visits`, `background`), tree in `src/lib/world-places.ts`
  (`buildPlaceTree`), the scene's place from `GET /world/here`. Registry ids `l1`.. exist (`docs/ENTITY-REGISTRY.md`), `state.regIds` links them.
- Per-chat data that must follow the chat across devices lives in the chat's meta (`chats/<id>.meta.json`, PATCH `/chats/:id`, whitelist in
  `plugins/engine/plugin.js`, mapping in `src/lib/engine.ts`; example `spriteOutfits`). The sprite window's own position stays in `localStorage`.
- The place the story is in changes after each Dashboard update: `triggerDashUpdate(...).then(applySceneBackground)` at three sites in
  `src/lib/store.ts` (reply, swipe, edit). The route tracker hooks in at the same three sites.
- Past work: #278 (place keys, closed), #445 and #452 (Social City: emoji `icon`, a place `picture`, closed), #373 (shared kind list, open idea).

## UI plan (M2)
**Where.** A floating window over the chat, mounted in `chat-view.tsx` next to `<ExpressionPanel>`. Component `PlaceMapWindow`
(`src/components/chat/place-map.tsx`), the board in `src/components/chat/place-map-board.tsx`, pure layout in `src/lib/place-map.ts`,
the window hook in `src/lib/float-box.ts`.

**Open and fold.** Folded = a 48 px round chip with a map icon, draggable, position kept. It shows only in a chat whose World book has at
least one place (no empty chip in chats with the DM off). A tap opens the window where the chip stood (pulled back on screen).
The × folds it back. Window position, size and fold are kept per chat in `localStorage` (as the sprite stage). A Settings switch "Show the
places map" (default on) hides the chip everywhere, the way "show expression sprites" does.

**Desktop.** Default 360 x 300 at the lower right, above the message box, resize by the corner (both ways), clamp to the chat's column.
**Phone (390 px).** The window opens as a panel standing on the message box, the full width minus 8 px each side, about 55% of the chat
height, in the same `PhoneLimit` area; the sprite window and the cast strip step aside while it is open (they come back when it folds).
Grip button (moves the window), fold, a "Fit" button; the board itself pans with one finger and zooms by pinch, buttons + and - too.
Every control 40 px or more on a phone. The window never catches a touch outside its box.

**Board.** Dotted grid by default (theme tokens, dark and light), or the map picture under the nodes. Pan, zoom (wheel, pinch, buttons),
"Fit all". Nodes: an icon (round, 44 px; spots 32 px) with the name under it, truncated to two lines. The current place has a ring in
the primary colour and a small "you are here" mark; places never visited are dimmed. A tap on a node selects it and shows a small
card under the window's top bar: name, kind, "visited N times", a Backgrounds picture thumbnail when bound (M2 shows; travel buttons
come in M3). Drag a node to move it (mouse or touch, a drag starts after 8 px; a tap is a tap). Spots sit around their place and move
with it; dragging a spot moves only the spot.

**Routes.** A thin line between two whole places the story moved between, with a small arrow-less dash; drawn under the nodes. A route
is added when the scene's place changes from A to B (both whole places, or the whole places the spots belong to). Read-only in M2: no
label yet (M3 shows the minutes and the street).

**Layout by code, no model.** Whole places: the first one in the middle, each new one at the nearest free spot on a ring around the place
the story came from (distance 150 px, angle by the place's index so they fan out, then a spiral until free); spots: a small ring
(radius 70 px) around their place. Positions are kept the moment a node is placed or dragged. A place removed from the book disappears
from the map; its position is kept for a month in case it comes back (restore). No auto re-layout of what the user moved.

**Map picture (the owner's comment on the issue).** The window's menu (gear): "Map picture: Upload / Generate / Remove", "Reset layout".
Upload: the Backgrounds store path and the same limits (`storeBackground`, WebP); Remove keeps the positions. The picture is stretched to
the board's frame, aspect kept (letterbox on the dotted grid). Frame = 1600 x 1000 board units; nodes live in those units, so
positions stay valid when the picture changes. Generate: M4 (the button reuses the background prompt path, prompt "top-down map of
<world or area>, no text"); in M2 the gear menu has Upload only.

**States.**
- no places yet: no chip. The window itself is only reachable through the chip, so the empty state cannot be seen from outside.
- DM off after the window was open: the window shows "The World DM is off: the places come from it" with the link to the World section.
- loading: the nodes fade in; the previous nodes stay while the book is being re-read after a reply (no blink).
- error reading the book: one line "Could not read the places" and a retry.
- very many places (50+): nodes shrink to dots with the name on hover and on select; "Fit all" always works.

**Variants considered.** (a) a side panel in the Dashboard strip: rejected by the owner (decision 1). (b) an overlay sheet that covers the
chat: no, it hides the story. (c) the Agents board reused as is: no, card size and ports. Chosen: the floating window.

**Data (chat meta `placeMap`, written by PATCH `/chats/:id`, null clears it).**
```json
{ "v": 1,
  "nodes": { "<place record id>": { "x": 812, "y": 400 } },
  "routes": [ { "a": "<record id>", "b": "<record id>" } ],
  "picture": { "id": "<background id or asset url>", "at": 0 } }
```
Keys are World record ids (`n3`-style ids of the places; the registry id is looked up through `regIds` in M3 when the route is walked).
At most 200 nodes, 400 routes. A route is unordered (`a` < `b` as strings). `docs/DATA-FORMATS.md` gets a "Chat meta: placeMap" section in
the same change; the card skill is not touched (it is not a card or lorebook field).

**Reply cost.** Zero model calls in M2.

**Guide and handbook.** Roleplay `.skills/guide/pages/` gets a "Places map" page (English; translations at release); handbook page
`roleplay-world-dm.md` and `roleplay-ui-shell.md` updated, `roleplay-pictures-sprites.md` for the picture path; a new small page
`roleplay-places-map.md` once the data is real.

**Checks.** Unit tests for `place-map.ts` (layout: no overlap, spots around the place, determinism; route tracking: only whole places,
no duplicates, a swiped reply does not leave a route, positions survive a picture change). Real-browser run (`browser-check`): dark,
light, 390 px: open the chip, drag, fold, reload (positions kept), upload a picture, remove it (positions kept), phone with the message
box focused. The reply carries the "UX check" block.

## Steps (each committed on its own)
1. `src/lib/place-map.ts` (+ tests): layout, routes, meta shape, limits. `placeMap` in chat meta (plugin whitelist, `engine.ts`, types).
2. `src/lib/float-box.ts`: drag, resize, fold, clamp, phone limit, kept in `localStorage`. Tests for the pure parts.
3. `place-map-board.tsx`: pan, zoom, nodes, routes, picture, drag of nodes.
4. `place-map.tsx` window, chip, gear menu (upload, remove, reset), the Settings switch (14 locales), the phone behaviour.
5. Route tracker at the three `triggerDashUpdate` sites.
6. Guide page, `DATA-FORMATS.md`, handbook, CHANGELOG; `ux-review` and the browser check; STATE.

## Icons (M1): what the owner makes, and where the files go
**The set** (50 kinds; the engine keeps this list as the source, English words are for matching a place's name; the Ukrainian words come
from the aliases the story already has, so the match runs on English kind words only and falls back to `place`):
`town`, `village`, `city`, `castle`, `fortress`, `tower`, `palace`, `house`, `cottage`, `farm`, `mill`, `inn`, `tavern`, `shop`,
`market`, `smithy` (forge), `bakery`, `library`, `school`, `temple`, `church`, `graveyard`, `ruins`, `cave`, `mine`, `dungeon`, `camp`,
`street`, `road`, `bridge`, `gate`, `port`, `ship`, `lighthouse`, `forest`, `field`, `meadow`, `mountain`, `hills`, `river`, `lake`, `sea`,
`beach`, `swamp`, `desert`, `snow`, `garden`, `park`, `room` (a room or a spot), `cellar`, `portal`, and `place` (the fallback).

**Style (one text for every icon, so the set matches):**
> A single game map icon of a {KIND}, hand-painted fantasy illustration style, soft ink outline, warm muted colours, gentle top-left light,
> centred on a transparent background, a little shadow under it, no text, no frame, no border, no letters, square 1:1, simple readable
> silhouette that is still clear when it is only 64 pixels wide.

Per kind, replace `{KIND}` with the object (the engine will hold the same one-line subject so a new kind later uses the same text):
tavern = "a cosy tavern with a hanging sign and a lit window"; smithy = "a blacksmith's forge with an anvil and glowing chimney";
temple = "a stone temple with columns"; street = "a short cobbled street seen from above at an angle"; forest = "a small cluster of
tall trees"; house = "a small timber house with a tiled roof"; castle = "a stone castle with two towers and a flag"; shop = "a shop front
with an awning and a crate of goods"; and so on for the rest by the same pattern (the full list of 50 subject lines goes in a file the
owner can paste from: step M1, next).

**Format and where they go (owner, 2026-11-19: the model gives a plain JPEG, no transparency, on a flat pink background):** the prompt asks for
"a flat solid pure magenta (#FF00FF) background, nothing else in that colour, no shadow on the background". One JPEG per kind, named
`<kind>.jpg`. A script (`scripts/place-icons.ts`) keys the pink out (distance from the corner colour, soft edge, then despill), crops to
the content, pads to a square and writes WebP 128 x 128 and 256 x 256 with alpha to `builtin-assets/place-icons/<kind>.webp`. The icon's
own shadow is kept only if it is not pink-tinted; the script reports any icon whose edge looks dirty so it can be redone.
In the style text above, replace "centred on a transparent background, a little shadow under it" with "centred on a flat solid pure
magenta (#FF00FF) background, no shadow on the background".
Serving: a route `GET /v1/place-icons/<kind>.webp` and a list `GET /v1/place-icons` (`{ kinds: [{ id, words }], version }`), read-only, open to
apps (a path rule in `src/server/app.ts` like `/v1/assets`), so Roleplay and Social City read the same files. Until M1 is released
the map shows a drawn glyph per kind (Phosphor icons from the code that the app already has), so the window works without the set.
Transparent PNGs: if the model gives a flat background instead, I cut it with a script, or ask for "plain white background" and key it out.
The engine needs a release when the files land (guide page and `/v1/place-icons` are engine changes); Social City switches its emoji to
the set in its own release.

## Not decided (say if you want it different)
- Whether the chip also shows in a chat with no World book but with places the Dashboard sensor named: M2 says no (the map reads the book).
- Who travels in a group chat: M3.
- A map picture per chat or per world: per chat in M2 (the owner's comment: "positions stay per chat").

## M3: travel by a tap (owner's answers, 2026-11-19)
Decided: (1) a tap is the player's own move plus a hidden direction (`[[...]]`, the same channel as Skip time); (2) the minutes come from the
distance on the board by code, the player can edit them, and the edit is kept on the road; (3) the Dashboard clock is NOT moved by code: the
direction names the minutes, the reply narrates them and the sensor's reading moves the clock, as Skip time does, so a swipe loses nothing;
(4) when the story's place is unknown the trip has no road and no minutes: just the move and the arrival. Defaults not asked: the whole party
goes (the direction says "the player's character and whoever is with them"); a road event is not built (World DM may add it later).

**Where.** The selected place's card gets a "Go there" button (a place the story is not in). It opens a dialog like Skip time:
From (the current place, or "somewhere the map does not know"), mode chips (On foot / Riding / Skip the road), Minutes (a number, default from
the distance, editable; hidden for "Skip the road" and for an unknown start), Road name (optional; remembered on the road, and the next trip says
"keep to it"), Your move (a text, default "I head to <place>.", editable), Go. On a phone the map folds after Go so the reply is seen.
**States.** No current place: the dialog says so, no minutes, no road name. A room of the place the story is in: "move within" (no minutes).
Phone: the dialog is the app's ordinary Dialog (full width). **Reused:** `Dialog`, `ToggleChip`, `Input` as in `time-skip-dialog.tsx`.
**Data.** A road may carry `minutes` (1..99999, the foot time) and `via` (up to 120 characters): `routes: [{ a, b, minutes?, via? }]`.
Cleaned by the page and the plugin, `docs/DATA-FORMATS.md` updated. **Model cost:** none beyond the reply itself.
**Check:** unit tests (minutes, direction text, route info), the browser check (open the dialog, edit, Go: the message and its direction
are in the chat, the road keeps minutes and name), UX walk-through on desktop and 390 px.
