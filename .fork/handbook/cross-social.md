# Social: traps and "change X, touch Y", collected from every page

Built by a script from the pages of this handbook; do not edit by hand. When a page changes,
rebuild this file. The page named in each heading has the detail.


## From `social-city.md`

Change X, touch Y:
- The shape of `city/now.json` or `city/places.json`: every copy of `cityNow` (six plugins) and `test/city-readers.test.ts`.
- Band or schedule shape: `bandNow`, `statusAt` here are copies of the stories plugin's; change every copy.
- The stock town: `src/screens/city/strings.ts` (names by id) and `test/city.test.ts`, `test/rooms.test.ts`, `test/city-places.test.ts`, `test/city-readers.test.ts`.
- A place field: `cleanPlace`, `placeRoute`, `cityView`, `src/screens/city/api.ts`, `editors.tsx`, the guide page `city`.
- The picture of a place: `roomPicture` (clubs) and `placeOf` (messenger) read `background`, then `picture`, from the places file themselves.
- `HOME_TIES`: the life plugin, the city plugin and `src/screens/profiles/people-api.ts` have the same list.
- A new place kind: `KIND_LOOK` in `iso.ts` (else it is drawn as `custom`).
- The stock place names (`src/screens/city/strings.ts`, English): `place-name.ts` matches stored names against them, so renaming a stock place in the strings orphans the names already stored in posts and stories.

Traps:
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


## From `social-clubs-chatter-stories.md`

Change X, touch Y:
- Relation or gossip blocks: each copy is marked (`<relation-shared>`, `<chat-life-shared>`); `test/chat-life.test.ts` pins them.
- A new file under `chatter/`, `clubs/` or `stories/`: add it to `RESET_PARTS` in `plugins/profiles/plugin.js`; `test/reset.test.ts` pins the list.
- A community switch or default: `COMMUNITY_DEFAULTS` in `src/mock/settings.ts`, the defaults in `plugins/profiles/plugin.js`, the plugin's `readSettings`, and `src/screens/settings/strings.ts`.
- `STORY_MS` also sets `until`, which the page reads.
- The owed rule: `owedState`, `pickTurn`, `fileClubResult`, `chatView`.
- Interest matching: `norm`, `wordsOf` and `interestGroups` together.

Traps:
- `src/mock/settings.ts` turns `stories` and `chats` on in the preview fixture. The real defaults are off.
- Stories use `models.forum` for text; chatter and clubs use the messenger model.
- Deleting a character leaves `chatter/<a>__<b>.json` (`removeChats` touches only `chats/`). A new character with the same id revives the pair, still on. Read, not run.
- `onTick` files only `cl:` keys; the first club reply is filed only by the second pass in `sendRoute`. The outcome if that pass never comes is not verified.
- Owed answers do not count toward `clubsPerDay`. `clubsAnswers` 0 stops answers to the user only.
- Chatter ignores the Life switch; stories honour it.


## From `social-forum.md`

Change X, touch Y:
- A limit or gap constant: `autoBlock`, `avgGapMs`, `Strip.tsx`, `test/forum-plugin.test.ts`.
- A reaction emoji: `REACTIONS`, `reactionFor`, `readNotices`.
- `relationBits`, `knowsOf`, `publicFacts` (the `public-facts-shared` block, also in the clubs plugin; `test/public-facts.test.ts`) or `lifeSubject`: the copy in `plugins/messenger/plugin.js`, since each plugin carries its own.
- `PAGE_SIZE`: `topicRoute`, `Pager.tsx`, `SearchPage.tsx`.
- `NOTICE_KINDS`: `noticesRoute`, `NoticesPage.tsx`, the badge in `src/lib/badges.ts` (which also polls `/journal/unread` for the Journal's badge since #453).

Traps:
- A pending request is not in `done`, and the slot moves only when a post files, so the next tick can plan another post (code reading; not run).
- A removed post loses its `repost` or `image` flag, so it frees that day's count (docs: DECISIONS, "Remove a post").
- The ceiling check runs on every new topic, but on a reply only when it is not to the user.
- Clubs are not in this plugin.


## From `social-journal.md`

Change X, touch Y:
- Anything that would show a journal post to a character (a prompt, a comment, a mention): ask `canRead` with the character that speaks. The user always sees everything.
- The story's life (`STORY_MS`, the sweep in `plugins/stories/plugin.js`): the mirror's 24 h and 5 minute slack in `plugins/journal/plugin.js`, `test/journal.test.ts`.
- A post field: `cleanPost`, `src/screens/journal/api.ts`, the guide page `journal`.
- The badge shape (`badges` in `src/shell/nav.tsx`): `src/lib/badges.ts`, `src/shell/app-shell.tsx`, `src/screens/settings/phone.tsx`.
- Reset parts: `RESET_PARTS` and `RESET_WITH_PROFILES` in the profiles plugin, `src/screens/settings/reset-api.ts`, `test/reset.test.ts`.

Traps:
- Clearing the characters also clears the user's own posts (the part goes with the profiles so no journal waits under a reused id).
- The tick removes a journal whose profile is gone, but only when the profiles folder lists at least one profile.
- Stories that vanished before the journal shipped cannot be recovered.
- The user's key is "you", so a profile id "you" is refused.


## From `social-life.md`

Change X, touch Y:
- Day kinds or the diary prompt: `pickKind`, `dayUser`, and the readers `recentDays` and `lifeSubject` in the messenger and the forum, which must stay identical.
- A feed host: the manifest `networkHosts` and `sourceHosts()`.
- Level rules: `autoIndex`, `settle`, the `LEVELS` copy in `people-api.ts`, and the map and family models.
- Schedule bands: `statusAt` in five plugins, `scheduleFor` and `src/mock/schedule.ts`.
- Profile deletion: the profiles plugin removes the diary, but `life/people/<id>.json` goes only in Life's sweep.

Traps:
- The header route list omits `GET /life/graph`, `GET /life/reputation` and `GET /life/topics`.
- `worldDue` has no 06:00 gate. `dayDue` does.
- `forgetPersona` writes `life/people/*.json` from the profiles plugin, but the docs say only Life writes there.
- `sweep` runs hourly from `onTick`, not on profile delete.
- The messenger comment names `test/life-readers.test.ts`, which does not exist. The test is `test/life-surfaces.test.ts`.
- `docs/DECISIONS.md` line 268 says the family tree is not built. Lines 285 and 286 say it was built on 2026-11-10.
- `docs/DECISIONS.md` line 282 and the `MapScreen.tsx` header say ties are edited in the Life tab. The code uses the Relations tab.
- `docs/DECISIONS.md` says only Life has `network`. `plugins/stickers/manifest.json` also has it.
- `statusAt` is copied into five plugins. Only the messenger copy has a test.


## From `social-messenger.md`

Change X, touch Y:
- A chat field: `readChat`, `writeChat`, `viewOf`, and the types in `real.ts`.
- The window, note or fold: `windowMessages`, `foldPlan`, `requestFold`, `SUMMARY_MAX`, `FOLD_INPUT_MAX`, `FOLD_MSG_MAX`, `NOTE_MAX`. The fold answer: `parseFoldAnswer`, `fileFold`, `mergeFacts`, `factsFor`, `FACTS_PROMPT_MAX`.
- A message field (`used`, `pinned`): `readChat`, `cleanUsed`, `EngineMessage` and `logItems` in `real.ts`, `LogItem` in `src/mock/messenger.ts`.
- A fact field: `cleanFact`, `cleanLedger`, `factsRoute`, `Fact` in `facts-api.ts`, the preview ledger there.
- `knowsOf`, `youFor`, `metLine`: their copies in the forum plugin (pinned by tests).
- A route key (`reply`, `rq`, `newsum`, `rep:`, `sum:`, `fm:`): second passes read `host.llm.results` by key.

Traps:
- `CHECKIN_AFTER_MS` is declared and never used; `checkInSubject` uses a literal `days < 3`.
- `profile.knows` overrides the Settings value; with "name", the About is dropped.
- Routes take the profile id and use the active persona's chat; a reply is filed in the chat it was asked in.
- `writeChat` keeps the newest 500 messages; the note is stored apart.
- A chat with a pending reply is never folded; a failed chat keeps `pending`, so its note waits for a retry or a new conversation.
- A failed reply is not retried by the tick; a lost call is asked again after 5 minutes; a failed fold is silent.
- The forum and clubs read only the public facts (`private === false`) through `publicFacts`, never the note (M3, #446); they do not write facts (M4 is not built). `factsShare` in Settings cuts the readers off.
- Writing first has no `used`; the forum and clubs do not read pinned messages. Stem overlap in `factsFor` is a stand-in for "nearest in meaning" (the recall vectors are not used for facts).
- Pictures are drawn by the open Social page only (`docs/DECISIONS.md`).
- Recalled text is data: `recallText` turns angle brackets into spaces and double quotes into single quotes.


## From `social-overview.md`

Change X, touch Y:
- Forum or messenger limits: `DEFAULTS` in `plugins/forum/plugin.js` and `DEFAULT_SETTINGS` in `plugins/profiles/plugin.js`, then `src/screens/settings/` and `.skills/guide/pages/`.
- A helper copied between plugins (`knowsOf`, `metLine`, `localDay`, `cut`, `overCeiling`): change every copy. `test/forum-user.test.ts` and `test/life-surfaces.test.ts` pin some.
- `reads` in `manifest.json`: also `RP_APP` in `plugins/profiles/plugin.js` and `test/profiles-import.test.ts`. Users are asked again on Home.
- `buildMaterial`: every profile counts as changed once (`hashText`).
- `networkHosts` in `manifest.json` and `SOURCES` in `plugins/life/plugin.js`: `test/life-plugin.test.ts` pins them.
- `chatPath`: also `adoptLegacy` and `publicFacts`, plus `removeChats` and `RESET_PARTS`.
- A screen string: `src/screens/<screen>/strings.ts` in `en` and `uk` (`test/skeleton.test.ts`).
- `engine` in `manifest.json`: raise it only with the engine contract.
- A catalog pack: `catalog/index.json`, its folder, LICENSE, per `catalog/README.md`; `test/stickers-catalog.test.ts`.

Traps:
- The sandbox has no Unicode property escapes (`\p{L}`). The plugins now contain none.
- Plugins cannot import each other, so helpers are copies.
- Quiet hours depend on `tzOffset`; without it the plugin uses its own zone guess.
- Two devices can change the same chat or topic, and sync then asks which to keep (DECISIONS). `.cache` is per device.
- The romance word net (`overCeiling`) is in chatter, clubs and forum, not the messenger.


## From `social-profiles-import.md`

Change X, touch Y:
- A profile field: `cleanProfile`, `MockProfile` (`src/mock/profiles.ts`), the editor, `test/profiles-plugin.test.ts`.
- Card material (`buildMaterial`, `soulLine`, `partFor`, `DIGEST_SYSTEM`): every imported profile reads "changed" once in "Update all".
- `importId`: imported profiles get new ids and the old ones are orphaned.
- `scheduleFor`: the client copy in `src/mock/schedule.ts` must agree.
- Licences: `LICENSES`, `catalog/README.md`, `test/stickers-catalog.test.ts`.

Traps:
- DECISIONS.md says a card is cut to about 12000 characters. No such cap exists: the parts total about 11100, plus the Soul line. `MAX_TEXT_CHARS` (12000) belongs to the "From a file" path.
- In `cleanProfile` the comment about `knows` sits above the sticker lines; the `knows` line has none.
- The persona section comment says "without a model"; `youRoute` does call the model.
- `importRoute` never re-reads a saved card; only "Update from Roleplay" refreshes it.
- `adult` comes from the card's age only at import; the age line can still reach the digest model.
- `cleanPacks` keeps packs with no items, `cleanCatalog` drops them; `isAdded` compares ids only.
- `catalog/README.md` says every Social update downloads the folder; the plugin fetches from GitHub on open.
