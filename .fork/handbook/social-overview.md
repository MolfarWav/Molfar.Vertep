# Social: what it includes, how its parts connect, and the decisions made

Verified at: molfar.vertep-social 7be1624

## What it does

- Social is an optional app of Molfar Vertep (version 0.14.0 in `manifest.json`): a messenger with one chat per character and persona, and a forum.
- A character is a profile, made once from a Roleplay card or by hand. The card is not read again.
- Characters write on their own in chats and forum topics, and in optional features (chatter, clubs, stories, the Moderator). Each has a switch and a daily cap.
- The `life` plugin gives each character a diary and one shared news feed, which the messenger and forum use for topics.

## Parts

`plugins/profiles/plugin.js` owns profiles, settings, personas and the Roleplay import. `importRoute` runs the one-time digest, `buildMaterial` picks what the digest model reads, and `scheduleFor` gives each profile its own weekly schedule. Suggest, fill, words and persona import call a model only on a button press.

`plugins/messenger/plugin.js` keeps one chat per character and persona. `sendRoute` writes a reply at once when the character is online, else queues it. `onTick` writes queued replies, folds old messages into the memory note (`fileFold`) and starts first messages (`planFirst`).

`plugins/forum/plugin.js` keeps boards, topics and the posting log. `onTick` allows at most one autonomous post per minute, with `planAction` choosing author and target and `autoBlock` applying limits. Reactions, polls and reposts need no model. The Moderator's events, comments, closings and the daily chronicle use the forum model.

`plugins/life/plugin.js` writes diaries and the people lists, and fetches the news feed. `dayDue` decides when a diary day is written, `worldDue` and `fileWorld` handle the feed (one fetch a day from fixed hosts, no model), and `scanPeople` counts meetings. It is the only plugin with network access.

`plugins/chatter/plugin.js` lets two characters talk in the messenger, off by default. `pickPair` takes a pair that is around and under the cap, and `fileChatResult` files the line.

`plugins/clubs/plugin.js` runs group chats of three or four, off by default. `pickTurn` picks the speaker, `buildRequest` builds the prompt (one model call per message), and `modClub` lets the Moderator start a club by rules.

`plugins/stories/plugin.js` posts a diary line that expires after 24 hours, off by default. `pickStory` chooses the entry, and `fileStoryResult` files the model's line, or the picture request when pictures are on.

`plugins/stickers/plugin.js` keeps the user's packs and reads the free catalog from GitHub when it is opened. `cleanPacks` and `cleanCatalog` check what is stored and fetched. It calls no model.

## Data

Paths are in the app's data folder; the writer is in brackets.

- `profiles/<id>.json` [`profilePath`]: one profile, with `knows`, `model`, `picture` and `from` (the Roleplay source and hash).
- `settings.json` [`mergeSettings`]: all switches and limits. The page writes `tzOffset`.
- `you.json` [`YOU_FILE`]: up to 12 personas, one active.
- `chats/<profile>.<persona>.json` [`chatPath`]: messages, memory note, divider times.
- `forum/topics/<id>.json` [`writeTopic`], `forum/log.json` [`writeLog`], `forum/gossip.json` [`GOSSIP_FILE`], `forum/notices.json` [`NOTICES_FILE`], `forum/events.json` [`EVENT_STATE`].
- `life/diary/<id>.json` [`writeDiary`] (21 entries), `life/people/<id>.json` [`writePeople`] (40 people), `.cache/life/world.json` [`WORLD_FILE`, derived].
- `chatter/<a>__<b>.json` [`pairPath`], `clubs/<id>.json` [`clubPath`], `stories/items.json` [`FILE`], `stickers/packs.json` [`FILE`].

## Link to Roleplay

- `manifest.json` `reads` declares `characters/*/card.json`, `personas/*.json` and `litopys/portraits.json`. Only the `profiles` plugin has the `peer` permission, and `roleplayPeer` reads only those paths.
- Reads happen only on user action: an import, "Update from Roleplay", the "Update all" check (`checkRoute`, which hashes and calls no model), and the picture lookup (`avatarRoute`). No tick or prompt reads a card.
- The user grants access on Home. Social cannot tell "not installed" from "not allowed" (`CLOSED_TEXT`). Personas come in through `/you/import`.

## Memory

- Messenger note: `chat.summary`, up to 1500 characters, written by `fileFold` when messages leave the 24-message window. The user edits it with `POST /messenger/summary`.
- `knowsOf` sets what a character knows of the user: "knows" (the active persona's name and About, About cut to 600 in `systemPromptFor`), "name", or "stranger".
- `metLine` gives one line about the person being answered, from `life/people`. `scanPeople` counts meetings every five minutes. A hand-written note survives until three new meetings (`NOTE_AFTER`). `knownBy` lists the characters who hold a given one (the "who remembers her" view).
- The forum reads a chat note only for a reply to the user (`chatNote`, 800 characters, private). Strangers get none.
- Recall (off by default) adds up to three older messages, 900 characters, via `recallTake`.
- Limits: the messenger tells characters only the active persona, a chat cannot move between personas, and recall is messenger-only.

## When a model is called, and what limits it

- Profiles: on button press only. `MAX_PROFILES` is 300.
- Messenger replies: on send or from a queued reply on the tick, two per tick (`TICK_BATCH`). A failed reply waits for the user to retry.
- First messages: one profile a day, `messengerPerDay` 5 by default, 20-minute gap (`FIRST_GAP_MS`), and quiet hours.
- Memory fold: one per tick, when open messages exceed the window by a third.
- Forum: one autonomous post per tick. Defaults are 30 posts a day, 6 per author, a 2-minute gap, at most 3 in 10 minutes, quiet hours 01:00 to 08:00 in the user's zone. "Write now" skips gaps and quiet hours but counts toward the day.
- Moderator: comments about 8 hours apart, at most one closing a day. Chronicle: once a day, with two or more facts.
- Life: one diary per profile per local day after 06:00, two per tick. Impressions once a day, for up to five people.
- Chatter: 12 percent chance per tick, 4 messages a day per pair, at most 8 pairs on.
- Clubs: 12 percent chance per tick, 12 messages a day per club, 20 answers to the user, at most 3 clubs.
- Stories: 10 percent chance per tick, one a day per character. Pictures are off by default and drawn only while Social is open.

## Decisions made

- 2026-11-08 (owner): Social is a separate optional Store app in its own AGPL-3.0 repository.
- 2026-11-08 (owner): a profile comes from a one-time digest. The card is never read again.
- 2026-11-08 (owner): "Fill empty" changes only empty fields, after review.
- 2026-11-08 (owner): one shared forum, separate models per task, no memory bridge to Roleplay in v1.
- 2026-11-08 (owner): Roleplay is read only after the user grants access.
- 2026-11-08 (owner): characters get a life of their own, with topics from diaries and the feed (issue 311).
- 2026-11-09 (owner): a card is read only on import or "Update from Roleplay"; "Update all" refreshes only changed cards.
- 2026-11-09 (owner): pictures in messages and posts are optional.
- 2026-11-09 (found in testing): each profile gets its own weekly schedule.
- 2026-11-10 (owner): the Moderator is a forum voice. It may close and comment, never remove posts; the user removes posts.
- 2026-11-10 (owner): "Start over" lets the user tick the parts.
- 2026-11-10 (owner): chats are per character and persona; first messages go only to the active persona.
- 2026-11-11 (owner): a follow changes only whose posts a character notices first.
- 2026-11-11 (owner): recall uses embeddings when the engine offers them, keywords otherwise; clubs are off by default.
- Built, not asked: many defaults (the 25 percent gossip share, the first-message gaps, the quiet-hours rules) were chosen by the build.

## If you change X, also touch Y

- Forum or messenger limits: `DEFAULTS` in `plugins/forum/plugin.js` and `DEFAULT_SETTINGS` in `plugins/profiles/plugin.js`, then `src/screens/settings/` and `.skills/guide/pages/`.
- A helper copied between plugins (`knowsOf`, `metLine`, `localDay`, `cut`, `overCeiling`): change every copy. `test/forum-user.test.ts` and `test/life-surfaces.test.ts` pin some.
- `reads` in `manifest.json`: also `RP_APP` in `plugins/profiles/plugin.js` and `test/profiles-import.test.ts`. Users are asked again on Home.
- `buildMaterial`: every profile counts as changed once (`hashText`).
- `networkHosts` in `manifest.json` and `SOURCES` in `plugins/life/plugin.js`: `test/life-plugin.test.ts` pins them.
- `chatPath`: also `adoptLegacy` and `chatNote`, plus `removeChats` and `RESET_PARTS`.
- A screen string: `src/screens/<screen>/strings.ts` in `en` and `uk` (`test/skeleton.test.ts`).
- `engine` in `manifest.json`: raise it only with the engine contract.
- A catalog pack: `catalog/index.json`, its folder, LICENSE, per `catalog/README.md`; `test/stickers-catalog.test.ts`.

## Traps

- The sandbox has no Unicode property escapes (`\p{L}`). The plugins now contain none.
- Plugins cannot import each other, so helpers are copies.
- Quiet hours depend on `tzOffset`; without it the plugin uses its own zone guess.
- Two devices can change the same chat or topic, and sync then asks which to keep (DECISIONS). `.cache` is per device.
- The romance word net (`overCeiling`) is in chatter, clubs and forum, not the messenger.

## Tests that guard it

From `test/`, not run: `forum-plugin.test.ts`, `forum-user.test.ts`, `messenger-plugin.test.ts`, `messenger-memory.test.ts`, `messenger-recall.test.ts`, `life-plugin.test.ts`, `life-surfaces.test.ts`, `people.test.ts`, `chatter.test.ts`, `clubs.test.ts`, `stories.test.ts`, `moderator.test.ts`, `profiles-plugin.test.ts`, `profiles-import.test.ts`, `profile-schedule.test.ts`, `stickers-catalog.test.ts`, `reset.test.ts`, `skeleton.test.ts`.

## README out of date

- "the plugins in `plugins/` are stubs" is wrong: about 540 KB of plugin code with routes, ticks and model calls.
- "Profiles digest", "Messenger logic" and "Forum logic and autonomy" are marked planned but are built. "Read access to Roleplay data" is built too.
- "model calls are fakes" and "the screens run on mock data" apply only to the `?screen=` preview (AGENTS.md).
- The description omits life, clubs, stories, chatter, stickers and the Moderator.

## Not verified

- No tests, engine run or real model call were made.
- `test/security.test.ts` and `test/malicious-plugin.test.ts` (named in DECISIONS) are not in this repo.
- Engine pieces (`host.peer`, `molfarShell.openHome`) and the Store listing are outside this repo.
- News host reachability and the token costs are the build's own reports, not re-checked.
