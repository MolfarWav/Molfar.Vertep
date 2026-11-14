# Social: clubs, chatter and stories (what characters do without the user)
Verified at: molfar.vertep-social 748197a

## What it does
Chatter has two characters write to each other in a private chat. Clubs has three or four characters talk in a group chat around an interest, and the user may join. Stories posts a line that vanishes after 24 hours, taken from a character's diary of the day.
All three are off by default and run from the plugin tick, which starts at most one model request.
They read profiles and the Life lists, and keep files under `chatter/`, `clubs/` and `stories/`.

## Owners
- `plugins/chatter/plugin.js`, `pickPair`: chooses the pair and the speaker.
- `plugins/chatter/plugin.js`, `fileChatResult`: files a reply, checks the ceiling, counts the day.
- `plugins/chatter/plugin.js`, `relationLine`: the relationship line from Life.
- `plugins/chatter/plugin.js`, `onTick`: files pending replies, else starts one request.
- `plugins/clubs/plugin.js`, `pickTurn`: owed answers first, then idle talk.
- `plugins/clubs/plugin.js`, `buildRequest`: the prompt; drops the user's lines when answers run out.
- `plugins/clubs/plugin.js`, `modClub`: the Moderator's club, by rules only.
- `plugins/clubs/plugin.js`, `sendRoute`: stores the user's message and makes the first reply.
- `plugins/clubs/plugin.js`, `fileClubResult`: files a reply and counts it.
- `plugins/stories/plugin.js`, `pickStory`: chooses a character and an unused diary line.
- `plugins/stories/plugin.js`, `readFile`: drops stories older than `STORY_MS`.
- `plugins/stories/plugin.js`, `fileStoryResult`: parses the JSON reply, files a pending picture.

## Chatter
Data: `chatter/<a>__<b>.json` with sorted ids (`keyOf`): `on`, `day`, `today`, the last 200 `messages`, `pending`, `failedAt`.

Pairing: the user posts to `/chatter/pair` (two different characters, on by default, at most 8 on). A pair is a candidate when it is on, under `chatsPerDay` today, not failed in 30 minutes, not pending for 10 minutes, and quiet for 5 minutes. Both profiles must be readable and online or away by schedule (`statusAt`). One candidate is drawn at random. The speaker is whoever did not write last.

Why: `relationLine` gives the speaker's note on the other, a feeling band, and ties; romance only when both are adult and the tone allows. `jealousChatLine` and `chatGossipLine` (from `forum/gossip.json`, a quarter of the time, switch `community.gossip`) add lines. The other character's About never enters the prompt. An empty pair opens from one diary line of today (`diarySeed`).

Steps:
1. A tick files any `ch:` replies that came back, then stops.
2. Otherwise, with chats on and a 12% roll, `pickPair` runs, the pair is marked pending, and the request goes out as `ch:<key>:<speaker>`.
3. The prompt holds the speaker's About (800 characters), voice, relation lines and the last 12 lines (300 each). Temperature 0.9, 220 output tokens.
4. On a later tick the reply loses reasoning blocks, tags and any name label, and is cut to 600 characters. `overCeiling` refuses explicit wording.
5. A refused or empty reply sets `failedAt`; a filed line raises `today`.
6. No end message: a talk stops when switched off, at the day's count, or after a failure.

The user sees pairs (`GET /chatter`, `GET /chatter/chat`) and can make, switch or remove them. Read only (AGENTS.md).

## Clubs
Data: `clubs/<id>.json` with `name` (40), `interest` (60), `by` ("user" or "mod"), `members` (3 or 4), `on`, `today`, `answered`, the last 300 `messages`, `pending`, `failedAt`. `clubs/state.json` holds `lastAuto` and `removed`.

Formed: the user posts to `/clubs/club` (3 or 4 characters, at most 3 clubs, on at once). The Moderator (`modClub`) acts only with `community.clubs` and `clubsMod` on (default on), on a 10% roll, with fewer than 3 clubs, none of its own in 3 days, and an interest at least three profiles share. Interests match as a whole phrase or word of four letters or more, lower case, no stemming, after a stop list (`interestGroups`). Members are the four who know each other best in Life (`closest`). An interest the user deleted stays out for 14 days.

Who speaks (`pickTurn`):
- Owed first: the user wrote last within 3 hours and fewer than two members have answered since. A member around, not the last speaker, is drawn, weighted by forum frequency. No roll or gap, but only while `answered` is under `clubsAnswers`.
- Idle: club on, under `clubsPerDay`, two members around, 3 minute gap, then a 12% roll.
- When answers run out, `buildRequest` leaves the user's lines out, so the members talk among themselves.

Prompt (`clubSystem`): the speaker's About, interests and voice, the other members by name with one relation line each (never their About), a jealousy line, a note that the user is real when a persona wrote lately, the tone ceiling. Temperature 0.9, 220 tokens. Key `cl:<club>:<speaker>`.

The user: `POST /clubs/send` stores the message with the active persona. If members are around, answers remain and nothing is pending, the first reply goes out in the same send under key `reply`, in two passes. Otherwise it waits for a tick. `chatView` sets `limited` when answers run out. No images or stickers.

Cost (DECISIONS.md, estimated): about 830 input tokens a message; idle talk about 30,000 a day for three clubs at defaults, answers up to about 50,000 more.

## Stories
Data: `stories/items.json` with `day`, `counts` (today), `stories` (`text` at most 140 characters, `at`, optional `image`), `seen`, `used` (30 diary ids per character), `pending`, `failedAt`.

Made (`pickStory`): a 10% roll, `community.stories` on, `storiesPerDay` (default 1 per character a day). The character needs Life on, to be online or away, to be under today's count, and to have an unused diary entry of today that it wrote itself. At most 24 live (`MAX_LIVE`).
- Pictures off (`images.on` not true): no model call; the caption is the diary line's first sentence or two (`captionFrom`).
- Pictures on: one call, key `st:<profile>:<entry>`, 200 tokens, asking for JSON with a caption and an image sentence (`storySystem`). Model: the character's own, else `models.forum`.

The 24 hours: `STORY_MS` counts from `at`. `readFile` drops older stories on every read. The GET route does not write; the tick rewrites the file when the count changed.

The picture: `addStory` files `image: {state: "pending"}`. The page draws it through `GET /stories/images` and `POST /stories/image`, with `src/pictures/worker.ts` doing the work. The user sees live stories (`GET /stories`) and can mark or remove them.

## Calls, caps and defaults
| Plugin | When a model is called | Cap | Default |
|---|---|---|---|
| Chatter | Per message, 220 tokens | `chatsPerDay` 0 to 30, default 4 per pair a day; 8 pairs on | Off (`community.chats`) |
| Clubs, idle talk | Per message, 220 tokens | `clubsPerDay` 1 to 40, default 12 per club a day; 3 clubs | Off (`community.clubs`) |
| Clubs, answers | Same call, first reply under `reply` | `clubsAnswers` 0 to 100, default 20 per club a day | Follows clubs switch |
| Clubs, Moderator | None | One club per 3 days; fewer than 3 clubs | On with clubs (`clubsMod`) |
| Stories | With pictures on, 200 tokens; picture by the page | `storiesPerDay` 0 to 10, default 1 per character a day; 24 live | Off (`community.stories`) |

## Not done, on purpose
- Clubs (DECISIONS.md, "Clubs, group chats of characters"): no pictures, stickers, forum clubs, follows, recall or quotes; Life does not count club talk; no several personas in one club; no unread mark or notification; no gossip line in club prompts; no retry button.
- Chatter and stories: DECISIONS.md has no "not done" line for either. Chatter is read only for the user. Stories draw pictures only while Social is open. The "Pictures in messages and posts" section may apply to story pictures, since they share the worker.

## If you change X, also touch Y
- Relation or gossip blocks: each copy is marked (`<relation-shared>`, `<chat-life-shared>`); `test/chat-life.test.ts` pins them.
- A new file under `chatter/`, `clubs/` or `stories/`: add it to `RESET_PARTS` in `plugins/profiles/plugin.js`; `test/reset.test.ts` pins the list.
- A community switch or default: `COMMUNITY_DEFAULTS` in `src/mock/settings.ts`, the defaults in `plugins/profiles/plugin.js`, the plugin's `readSettings`, and `src/screens/settings/strings.ts`.
- `STORY_MS` also sets `until`, which the page reads.
- The owed rule: `owedState`, `pickTurn`, `fileClubResult`, `chatView`.
- Interest matching: `norm`, `wordsOf` and `interestGroups` together.

## Traps
- `src/mock/settings.ts` turns `stories` and `chats` on in the preview fixture. The real defaults are off.
- Stories use `models.forum` for text; chatter and clubs use the messenger model.
- Deleting a character leaves `chatter/<a>__<b>.json` (`removeChats` touches only `chats/`). A new character with the same id revives the pair, still on. Read, not run.
- `onTick` files only `cl:` keys; the first club reply is filed only by the second pass in `sendRoute`. The outcome if that pass never comes is not verified.
- Owed answers do not count toward `clubsPerDay`. `clubsAnswers` 0 stops answers to the user only.
- Chatter ignores the Life switch; stories honour it.

## Tests that guard it
- `test/chatter.test.ts`: `pickPair`, `fileChatResult`, `chatSystem`.
- `test/clubs.test.ts`: `pickTurn`, `owedState`, `fileClubResult`, `buildRequest`, `modClub`.
- `test/stories.test.ts`: `pickStory`, `readFile`, `captionFrom`, `fileStoryResult`.
- `test/chat-life.test.ts`, `test/relations.test.ts`, `test/community-life.test.ts`, `test/reset.test.ts`.

## Not verified
- The tick interval and plugin priority for chatter and stories.
- The engine's two-pass mechanics (`__llmPending`, `stash`, `llm.results`).
- Token figures are estimates; the stories JSON and a pair's talk were not checked on a real model.
- `test/clubs-ui.test.ts` and the messenger screens were read only by name.
