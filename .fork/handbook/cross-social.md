# Social: traps and "change X, touch Y", collected from every page

Built by a script from the pages of this handbook; do not edit by hand. When a page changes,
rebuild this file. The page named in each heading has the detail.


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
- `relationBits`, `knowsOf`, `chatNote` or `lifeSubject`: the copy in `plugins/messenger/plugin.js`, since each plugin carries its own.
- `PAGE_SIZE`: `topicRoute`, `Pager.tsx`, `SearchPage.tsx`.
- `NOTICE_KINDS`: `noticesRoute`, `NoticesPage.tsx`, the badge in `src/lib/badges.ts`.

Traps:
- A pending request is not in `done`, and the slot moves only when a post files, so the next tick can plan another post (code reading; not run).
- A removed post loses its `repost` or `image` flag, so it frees that day's count (docs: DECISIONS, "Remove a post").
- The ceiling check runs on every new topic, but on a reply only when it is not to the user.
- Clubs are not in this plugin.


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
- The window, note or fold: `windowMessages`, `foldPlan`, `requestFold`, `SUMMARY_MAX`, `FOLD_INPUT_MAX`, `FOLD_MSG_MAX`, `NOTE_MAX`.
- `knowsOf`, `youFor`, `metLine`: their copies in the forum plugin (pinned by tests).
- A route key (`reply`, `rq`, `newsum`, `rep:`, `sum:`, `fm:`): second passes read `host.llm.results` by key.

Traps:
- `CHECKIN_AFTER_MS` is declared and never used; `checkInSubject` uses a literal `days < 3`.
- `profile.knows` overrides the Settings value; with "name", the About is dropped.
- Routes take the profile id and use the active persona's chat; a reply is filed in the chat it was asked in.
- `writeChat` keeps the newest 500 messages; the note is stored apart.
- A chat with a pending reply is never folded; a failed chat keeps `pending`, so its note waits for a retry or a new conversation.
- A failed reply is not retried by the tick; a lost call is asked again after 5 minutes; a failed fold is silent.
- Pictures are drawn by the open Social page only (`docs/DECISIONS.md`).
- Recalled text is data: `recallText` turns angle brackets into spaces and double quotes into single quotes.


## From `social-overview.md`

Change X, touch Y:
- Forum or messenger limits: `DEFAULTS` in `plugins/forum/plugin.js` and `DEFAULT_SETTINGS` in `plugins/profiles/plugin.js`, then `src/screens/settings/` and `.skills/guide/pages/`.
- A helper copied between plugins (`knowsOf`, `metLine`, `localDay`, `cut`, `overCeiling`): change every copy. `test/forum-user.test.ts` and `test/life-surfaces.test.ts` pin some.
- `reads` in `manifest.json`: also `RP_APP` in `plugins/profiles/plugin.js` and `test/profiles-import.test.ts`. Users are asked again on Home.
- `buildMaterial`: every profile counts as changed once (`hashText`).
- `networkHosts` in `manifest.json` and `SOURCES` in `plugins/life/plugin.js`: `test/life-plugin.test.ts` pins them.
- `chatPath`: also `adoptLegacy` and `chatNote`, plus `removeChats` and `RESET_PARTS`.
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
