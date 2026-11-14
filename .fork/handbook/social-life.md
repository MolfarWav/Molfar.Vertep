# Social: the Life plugin and the profile's daily life

Verified at: molfar.vertep-social 7587013

## What it does
The Life plugin (`plugins/life/plugin.js`) writes a daily diary per character (rules plus one model call), a list of people each character has met, one shared news feed per day from fixed hosts, and the user's weather place. Schedule and status live on the profile; Life does not enforce them.

## Owners
- `plugins/life/plugin.js` `onTick`: the only tick hook. Fetches the feed, asks for up to two diary days per tick, files results.
- `plugins/life/plugin.js` `dayDue`: whether a character's day is due (new local day, after 06:00, no recent failure).
- `plugins/life/plugin.js` `pickKind`: the shape of the day, by weight.
- `plugins/life/plugin.js` `dayUser`: the diary prompt, schedule included as text.
- `plugins/life/plugin.js` `fileDay`: appends the entries.
- `plugins/life/plugin.js` `diaryRoute`: the diary routes, including the manual write.
- `plugins/life/plugin.js` `scanPeople`: counts meetings every five minutes.
- `plugins/life/plugin.js` `noteDue` and `fileNotes`: the daily impression call and its filing.
- `plugins/life/plugin.js` `setRelation`: hand-set levels and ties, with family and work ties mirrored.
- `plugins/life/plugin.js` `peopleRoute` and `knownBy`: people routes and who holds a character in their list.
- `plugins/life/plugin.js` `graphView` and `reputationView`: map data and persona summary.
- `plugins/life/plugin.js` `worldDue`, `requestWorld`, `buildWorld`, `fileWorld`: the news feed.
- `plugins/life/plugin.js` `placeRoute`: looks up the weather place.
- `plugins/life/manifest.json` `networkHosts`: the 12 hosts the feed may reach.
- `plugins/profiles/plugin.js` `scheduleFor`: builds a new profile's week of statuses.
- `plugins/profiles/plugin.js` `forgetPersona`: removes a deleted persona from people lists.
- `plugins/profiles/plugin.js` `RESET_PARTS`: what "Start over" clears.
- `plugins/messenger/plugin.js` `statusAt` and `lifeSubject`: schedule status for reply timing, and the diary or feed item a reply may bring up.
- `src/screens/profiles/tabs/LifeTab.tsx` `LifeTab`: the diary editor.
- `src/screens/profiles/tabs/RelationsTab.tsx` `RelationsTab`: where ties are edited.
- `src/screens/profiles/family-model.ts` `familyOf` and `src/screens/profiles/MapScreen.tsx` `MapScreen`: the family tree and the map.

## Data
- `life/diary/<profileId>.json`: `{entries: [{id, at, day, text, kind, by: "model" or "you", item?}], mood, plan, lastDay, failedAt}`. At most 21 entries, 400 characters each.
- `life/people/<profileId>.json`: `{scanned, noteDay, failedAt, people}`. Each person has a `key` (`c:<id>`, `u:<persona>` or `n:<name>`), meeting counts, `note`, `fresh`, `feel`, hand-set `tier`, `pinned`, `follow`, `ties`, and computed `lvl`, `band`, `fol`, `marks`. At most 40 people.
- `life/place.json`: `{name, lat, lon}`, the user's weather place.
- `.cache/life/world.json`: the shared feed, at most 160 items. Derived, and left out of sync.
- `settings.json` block `life`: `on`, `world`, `cats`, `place` (typed text), `topics`.
- `profiles/<id>.json`: `life: {on, world}` and `schedule`.

## Diaries
- **When.** `dayDue` allows one write per character per local day, from the first tick after 06:00 in the user's time, when life is on for the app and the profile. A failure waits 30 minutes.
- **Schedule.** Not a gate. `dayDue` ignores status. The schedule enters the prompt as text (`scheduleLine`).
- **Shape.** Seven kinds, weighted: routine, win, trouble, seen, rest, plan, world. `plan` needs yesterday's plan. `world` needs a feed item.
- **Model call.** One request per due character, key `d:<id>:<kind>[:<item>]`, temperature 0.9, 500 output tokens. The model is the profile's own, else the messenger setting, else the engine default. The answer is 1 to 3 entries, a mood and a plan, as JSON.
- **Filing.** `fileDay` keeps 21 entries and sets mood, plan and `lastDay`.
- **User entries.** `PUT /life/diary/<id>/entry/<id or new>` saves with `by: "you"`, and editing an entry makes it the user's. `DELETE` removes one entry. `PUT .../state` sets mood and plan. `DELETE /life/diary/<id>` forgets everything.
- **Manual write.** `POST /life/diary/<id>/write` uses the result key `day` and a stash. `onTick` files only `d:` keys, so the route files its own result.
- **Readers.** The messenger and forum put the last four entries into prompts (`recentDays`), and topic choice uses the last three days. Stories and chatter also read the diary file.

## Known people, relations, map, family tree
- **Counting.** `scanPeople` reads `forum/topics` and `chats` through `topicEvents` and `chatEvents`. "Events" means meetings with a person. Life has no calendar.
- **Levels.** Seven rungs in `LEVELS`. `autoIndex` sets the automatic rung from talks, sightings and feeling. A hand-set level is a floor unless pinned (`settle`). A feeling of -3 or less caps the automatic rung at acquaintance.
- **Ties.** `TIE_TYPES` lists family, work, rival and romance. Romance needs adults. `setRelation` mirrors family and work ties to the other file, never romance.
- **Impressions.** `noteDue` allows one call per local day for up to five people with three or more new meetings, key `pn:<id>`.
- **Hand notes.** `PUT /life/people/<id>/<key>` saves the user's wording.
- **Who knows her.** `knownBy` in `GET /life/people/<id>`, at most 20 characters.
- **Map.** `GET /life/graph` (`graphView`) gives one link per pair, with no impressions. `MapScreen` shows it behind the List, Map and Family switch (`ViewSwitch`).
- **Family tree.** `familyOf` builds rows from the same graph. `FamilyTree` draws it, and `FamilyOutline` gives the text version.

## Schedule and status
- **Stored.** `schedule` on `profiles/<id>.json`: 8 bands of 3 hours by 7 days from Monday. Each cell is online, away, dnd, na or off. Edited in `src/screens/profiles/tabs/StatusesTab.tsx`.
- **New profiles.** `scheduleFor` builds the week from hints in the text and the profile id. A client copy is in `src/mock/schedule.ts`.
- **Computed.** Each plugin has its own `statusAt(schedule, date, tz)`. The band comes from the local hour and the day from Monday. A missing cell is off.
- **Obeyed by.** The messenger (contacts, reply timing, first messages), the forum (posts, reactions, who is online), chatter and clubs (both members around), and stories (online or away, with life on).
- **Not obeyed.** The diary and the impressions.

## Places and locations today
None for characters. Neither `plugins/life/plugin.js` nor `plugins/profiles/plugin.js` has a location field for a character or persona. The one place is the user's, in `life/place.json`, and it is used only for the weather item (`sourcesFor`). The diary's "seen" line says "a place" in general terms. 
## The world feed
- **When.** `worldDue` fetches when the feed is on and the day, a category, the place or the topics changed. It waits two hours after a failure. It has no 06:00 gate, and it runs before diary requests in the same tick.
- **Sources.** `SOURCES` holds 14 fixed feeds across nine categories. `TOPIC_SOURCES` adds chosen topics, and Open-Meteo gives the weather.
- **Hosts.** `sourceHosts()` must equal the manifest's `networkHosts`. `test/life-plugin.test.ts` pins this.
- **Limits.** 1.5 MB per response, 15 seconds per request, 6 items per source (12 for topic feeds), 160 in all. Titles are cut at 160 characters and texts at 300.
- **Filing.** `fileWorld` keeps the old feed when a fetch brings nothing, and records `failedAt`.
- **Reaching a character.** The messenger and forum quote an item inside `<outside>` tags. A diary `world` entry keeps the item id. The fetch makes no model call.

## When a model is called, and what limits it
- **Diary.** At most two calls per tick, one per character per local day. The prompt holds the last six entries, and output is capped at 500 tokens.
- **Impressions.** At most one call per tick, only when no diary was asked. Once per local day, 450 tokens.
- **Manual write.** One call on request, outside the tick limit.
- **No model.** `failure` returns `code: "no-model"`. There is no fallback text.

## If you change X, also touch Y
- Day kinds or the diary prompt: `pickKind`, `dayUser`, and the readers `recentDays` and `lifeSubject` in the messenger and the forum, which must stay identical.
- A feed host: the manifest `networkHosts` and `sourceHosts()`.
- Level rules: `autoIndex`, `settle`, the `LEVELS` copy in `people-api.ts`, and the map and family models.
- Schedule bands: `statusAt` in five plugins, `scheduleFor` and `src/mock/schedule.ts`.
- Profile deletion: the profiles plugin removes the diary, but `life/people/<id>.json` goes only in Life's sweep.

## Traps
- The header route list omits `GET /life/graph`, `GET /life/reputation` and `GET /life/topics`.
- `worldDue` has no 06:00 gate. `dayDue` does.
- `forgetPersona` writes `life/people/*.json` from the profiles plugin, but the docs say only Life writes there.
- `sweep` runs hourly from `onTick`, not on profile delete.
- The messenger comment names `test/life-readers.test.ts`, which does not exist. The test is `test/life-surfaces.test.ts`.
- `docs/DECISIONS.md` line 268 says the family tree is not built. Lines 285 and 286 say it was built on 2026-11-10.
- `docs/DECISIONS.md` line 282 and the `MapScreen.tsx` header say ties are edited in the Life tab. The code uses the Relations tab.
- `docs/DECISIONS.md` says only Life has `network`. `plugins/stickers/manifest.json` also has it.
- `statusAt` is copied into five plugins. Only the messenger copy has a test.

## Tests that guard it
- `test/life-plugin.test.ts`: day rules, `pickKind`, `worldDue`, manifest hosts.
- `test/life-surfaces.test.ts`: the messenger and forum readers, and `lifeSubject`.
- `test/profile-schedule.test.ts`: `scheduleFor` and its client copy.
- `test/messenger-plugin.test.ts`: `statusAt`.
- `test/people.test.ts`, `test/relations.test.ts`, `test/relationship-map.test.ts`, `test/family-tree.test.ts`: named from their imports only.

## Not verified
- No model was run, so diary and impression text, and parsing of real answers, are unchecked.
- The feed hosts were not reached. `docs/DECISIONS.md` reports that some did not answer from the build container.
- The `statusAt` copies in chatter, stories, forum and clubs were not compared line by line.
- The bodies of the people, relations, map, family-tree, chat-life and community-life tests were not read.
