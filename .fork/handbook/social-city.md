# Social: the city (places, homes, who is where)
Verified at: molfar.vertep-social 8d6971c (main, Social 0.18.1); the rearranging lines at branch claude/social-458-remains (bb0dcd3); the More tiles at branch claude/batch-471 (#471)

## What it does
A town the characters live in. By rules, with no model call, it gives every profile a flat and works out, once per 3-hour band, where each character is. The user can look, listen, walk in and make places and districts of their own (issue 445, C1 to C3), and other plugins read where a character is (C4). #452 adds a wide picture to places and districts; #453 adds workplaces, shared flats, rooms that share the day's caps and stock names in the page's language. C5 draws each district as an isometric plate above the tiles. Packs (C6) are a later phase.

## Owners
- `plugins/city/plugin.js`, `stockTown`: the neutral present-day town (districts, places with an 8 by 7 open grid, tags, seats).
- `plugins/city/plugin.js`, `readTown`: the places file as stored; a damaged file or a bad place falls back or is dropped.
- `plugins/city/plugin.js`, `assignHomes`, `readHomes`: one flat per profile, a new building when full, a leaver's flat freed.
- `plugins/city/plugin.js`, `placeAt`: where one profile is in a band (seeded draw, weights).
- `plugins/city/plugin.js`, `whereAll`: everyone in id order, so every reader gets the same answer.
- `plugins/city/plugin.js`, `cityView`, `handleRoute`: `GET /city`.
- `plugins/life/plugin.js`, `plugins/chatter/plugin.js`, `plugins/clubs/plugin.js`, `plugins/stories/plugin.js`, `plugins/journal/plugin.js`, `plugins/messenger/plugin.js`, `cityNow`: C4, one read-only copy of the same function between `<city-shared>` markers (pinned by `test/city-readers.test.ts`); uses: Life's `seen` diary day (`shape.place`), `pickPair`, `pickTurn` (x3 together), stories and journal `place`, the messenger's `placeLineFor`.
- `plugins/city/plugin.js`, `placeRoute`, `districtRoute`, `gridFromHours`, `hoursOf`: C3, the user's places and districts (`POST /city/place|place/remove|district|district/remove|reset`); a stock one the user edits becomes `by: "you"`.
- `src/screens/city/editors.tsx`: the place and district forms; `WidePicture`, `placePrompt`, `districtPrompt`; the picture is the profile's picture window in its `wide` mode (`src/screens/profiles/picture-dialog.tsx`).
- `src/screens/city/index.tsx` `Detail` (the place's `background` behind the opened card, `.ct-detail.has-bd`); Homes has "Edit district" for its name and picture.
- `src/screens/city/iso.ts` (`isoFrame`, `isoLots`, `isoAllLots`, `isoSlots`, `isoGrid`, `isoPin`, `isoHeight`, `KIND_LOOK`, `ISO_MAX`) and `src/screens/city/iso-map.tsx` (`IsoMap`, `isoSvg`): C5, the drawn district; `index.tsx` builds `mapSpots` and `pickOnMap` (opens the place, scrolls to `ct-cell-<id>` or, in Homes, `ct-b-<id>`). A district's `background` replaces the drawing under the same pins. Layout (0.18.1): `.ct-body` holds `.ct-map-col` and `.ct-list-col`; from 1000 px on desktop they sit side by side and the map column is sticky; on a phone the map column is hidden while a form is open.
- `plugins/city/plugin.js`, `workplaceOf`: (#453) the profile's `workplace`, else that of the first tied boss, subordinate or colleague (by id); `whereAll` passes it to `placeAt` as `c.workplace`.
- `plugins/city/plugin.js`, `homeGroups`, `assignHomes(homes, ids, groups)`: (#453) shared flats from ties marked `home: true` (`HOME_TIES`), either side.
- `plugins/clubs/plugin.js`, `endRoom`, `roomCounts`, `roomPicture`: (#453) rooms share the day's counts in `clubs/state.json` `rooms`; (#452) a room's view carries `room.picture`.
- `plugins/messenger/plugin.js`, `placeOf`: (#452) `chat.place {id, name, picture}` on `GET /messenger/chat`, only with `messengerPlace` on.
- `src/screens/city/place-name.ts`, `usePlaceName`: (#453) a stored stock place name back to its id, shown in the page's language (journal posts, stories).
- `src/screens/profiles/tabs/StatusesTab.tsx` `Workplace`: (#453) Status schedule > Work > "Works at"; `src/screens/profiles/tabs/RelationEditor.tsx`: the "Lives together with" switch.
- `plugins/city/plugin.js`, `listenView`: `GET /city/listen`, the last 6 lines (3 days) of chatter pairs and clubs whose members are at the place, read only, never the user's.
- `plugins/clubs/plugin.js`, `roomRoute`, `presentAt`, `byAcquaintance`, `sweepRooms`, `bandOf`: `POST /clubs/room`, a club with `room: {place, until}`; the tick removes it at `until`.
- `src/screens/messenger/clubs.tsx`: the "Room" tag and "Leave the room" (`ClubHead`); `src/shell/nav.tsx` `openClub` carries the City to the Messenger.
- `plugins/city/plugin.js`, `onTick`: writes the stock town once, the flats, and the band's places once per band.
- `src/screens/city/index.tsx`, `strings.ts`: the screen; stock names and lines are translated by id there.
- `src/shell/app-shell.tsx`, `src/shell/nav.tsx`: the desktop tab; on a phone the tab "more" (`src/screens/more/index.tsx`, a grid of icon tiles, #471) opens it, and its back arrow returns to More.

## Data
- `city/places.json` {districts, places}; a place and a district may have `background` (#452, an asset url); a place may still have the small `picture` of C3. `city/homes.json` {buildings, flats: {profileId: {b, n}}}, two or more profiles on one flat when they live together; `city/now.json` {id: "day#band", at, where: {profileId: placeId | "home"}}.
- Read only from other plugins: profiles (`schedule`, `interests`, `life.on`, `workplace`), `life/people/<id>.json` (`fol`, `lvl`, `ties` with `type` and `home`, the user's key `u:<persona>`), `you.json` (the active persona).

## When a model is called
Not by the city itself (a test uses a model that throws on any use). A room is a club: one model call a message, the club's own caps.

## Flow
1. The tick writes the stock town once, assigns flats (empty profile list: nothing assigned or freed), and when the band id differs from `now.json` writes everyone's place.
2. `placeAt`: life off or status off = home; na or dnd = the workplace (`workplaceOf`: its own, else a tied boss's, subordinate's or colleague's) in work hours (Monday to Friday, bands 3 to 5) if open with room, else home; online or away = a seeded draw over home (weight 1.5) and the open places with a free seat (1, plus 2 per matching interest tag, plus 1.5 per close person already there, at most 3).
3. The view uses the stored band if it is the current one, else works the places out on the spot without writing.
4. A door is lit (home, awake), dark (home, status off) or out; where an absent character is shows only when the active persona is at least an acquaintance to them.

## If you change X, also touch Y
- The shape of `city/now.json` or `city/places.json`: every copy of `cityNow` (six plugins) and `test/city-readers.test.ts`.
- Band or schedule shape: `bandNow`, `statusAt` here are copies of the stories plugin's; change every copy.
- The stock town: `src/screens/city/strings.ts` (names by id) and `test/city.test.ts`, `test/rooms.test.ts`, `test/city-places.test.ts`, `test/city-readers.test.ts`.
- A place field: `cleanPlace`, `placeRoute`, `cityView`, `src/screens/city/api.ts`, `editors.tsx`, the guide page `city`.
- The picture of a place: `roomPicture` (clubs) and `placeOf` (messenger) read `background`, then `picture`, from the places file themselves.
- `HOME_TIES`: the life plugin, the city plugin and `src/screens/profiles/people-api.ts` have the same list.
- A new place kind: `KIND_LOOK` in `iso.ts` (else it is drawn as `custom`).
- The stock place names (`src/screens/city/strings.ts`, English): `place-name.ts` matches stored names against them, so renaming a stock place in the strings orphans the names already stored in posts and stories.

## Traps
- `cityNow` returns null unless `now.json` is of the current band; a place read just after a band change may be missing for up to a minute.
- A story's or post's `place` is a stored name; the page translates it only when it equals a stock place's English name (`usePlaceName`).
- `POST /v1/images` takes a shape, `aspect: "wide"` (engine #455), which Social sends for place and district pictures; a backend that cannot take it (the pi-ai catalog, OpenRouter) draws its own shape, so the picture is still shown with `cover` and the prompt still asks for 16:9. An engine older than the change ignores the field.
- A room's picture is read when the club view is built, so a place picture changed while the room is open shows on the next load.
- Meeting at a place does not change who knows whom (People is untouched by design).
- `messengerPlace` is off by default and costs about 30 tokens (27 to 40) per reply and first message.
- The page translates a place or district name only when `by` is `stock`: anything the user touched shows its stored name, so editing a stock place freezes its name in the page's language of that moment.
- At most 60 places and 12 districts; no place in the Homes district; Homes is never removed.
- The pictures are asset urls made by the picture window; the city never draws or uploads.
- A room is a new club, but (#453) a room of the same day starts from the counts of the rooms that ended that day; it is outside `MAX_CLUBS`; one at a time; the room needs `city/now.json` to be of the current band (a stale file means "try again in a minute").
- `bandOf` in the clubs plugin and `bandId` here are copies; change both.
- Weights and the work hours are guesses.
- A workplace that is not a place of the town (removed later) counts as none; the Profiles field shows it as "A place that is gone".
- Shared flats: one side's mark is enough (a romantic tie is one way); a group is at most 6; the first holder by id keeps the flat when the mark goes.
- Clearing all profiles leaves `city/` until a new profile appears (the tick does nothing on an empty list).
- The place plate is cosmetic: tiles show everyone in a place anyway.
- The drawing is set with `dangerouslySetInnerHTML`: `isoSvg` must stay numbers and theme tokens only, never a name (a test checks for text and hex colours). At most 25 places are drawn; the rest only in the list. A building's spot follows the tiles' order unless the user moved it: Rearrange (#458) saves `lots: { g, at: { <place id>: lot index } }` on the district (`POST /city/layout`, `layoutRoute`, `cleanLots` in `plugins/city/plugin.js`; `isoSlots` reads it), never on the place, because saving a place marks it `by: "you"`. A layout made for another grid size `g` is ignored, so a district that gains a place and grows a row is drawn in the tiles' order again; Homes cannot be rearranged. Without a layout a removed place shifts the ones after it.

## Tests that guard it
`test/city.test.ts`, `test/rooms.test.ts`, `test/city-places.test.ts`, `test/city-readers.test.ts`, `test/city-452-453.test.ts`, `test/city-iso.test.ts`, `test/city-layout.test.ts`.

## Not verified
Real generated or uploaded pictures in a real engine (#452; the preview uses drawn placeholders), the room and chat backdrop with a real place picture, workplaces and shared flats over a real day (#453). Earlier: Whether the place line changes how characters write with a real model; Drawing or uploading a picture for a place in a real engine; A real engine across a band change; the room's header with "Leave the room" in a browser (the preview has no room); a real model in a room; a phone; how the weights feel with real profiles; the guide translations.
