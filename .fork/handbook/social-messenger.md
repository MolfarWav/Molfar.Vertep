# Social: the Messenger plugin, its chats, memory note and recall
Verified at: molfar.vertep-social 7587013

## What it does
- One chat per character and persona pair; a model writes each reply in the character's voice.
- A reply comes at once when the schedule says the character is online; away waits 1 to 4 minutes.
- Characters may open a conversation about their own life (writing first), within daily limits.
- Old messages are folded into a memory note; with recall on, a few are quoted word for word.

## Owners
- `plugins/messenger/plugin.js`, `handleRoute`: the `/messenger/*` routes. Chat files: `chatPath`, `readChat`, `writeChat`, `adoptLegacy`.
- `plugins/messenger/plugin.js`, `sendRoute`, `retryRoute`, `onTick`, `dueChats`: sending, retrying, the tick that files and asks.
- `plugins/messenger/plugin.js`, `requestReply`, `fileReply`, `systemPromptFor`: the reply request, its filing, the prompt.
- `plugins/messenger/plugin.js`, `contextOf`, `windowMessages`, `foldPlan`, `fileFold`: the window and the memory note.
- `plugins/messenger/plugin.js`, `summaryRoute`, `newRoute`, `clearRoute`: note edit, new conversation, clear.
- `plugins/messenger/plugin.js`, `recallFor`, `recallVector`, `recallKeyword`, `recallTick`: recall.
- `plugins/messenger/plugin.js`, `planFirst`, `fileFirst`: writing first.
- `plugins/messenger/plugin.js`, `chatGossipLine`, `stickerHint`, `takeSticker`, `takeImageMarker`: gossip, stickers, pictures.
- `src/screens/messenger/live.ts`, `useLiveMessenger`: real mode; calls the routes.
- `src/screens/messenger/index.tsx`, `Messenger`: the screen.

## Data
Chat file `chats/<profileId>.<personaId>.json` (`chats/<profileId>.json` with no persona):
- `messages`: `{id, who ("me" or "them"), at (ms), text, first?, image?}`.
- `pending`: `{at, dueAt (ms or null), asking?}`: a reply is owed; null `dueAt` means due when online.
- `failed`: `{error, code?: "no-model"}`. `unread`. `shared`: ids of diary or world items used (60 at most).
- `summary`: `{text, upto, at, edited?}`, the note. `breaks`: divider times (50 at most). `foldFailAt`.

Read: `profiles/<id>.json`, `you.json`, `settings.json`. Written: `firstlog.json`. Derived: `.cache/recall/`.

## A reply, step by step
1. `sendRoute` stores the user's text (cut to `TEXT_MAX`, 2000) and clears `failed`.
2. `statusAt` gives the status. Online: `pending.dueAt` is now and the reply is asked at once (key `reply`); the route is called again with the answer (`stash`). With recall on, the query is embedded first (key `rq`) and `pending.asking` stops the tick from asking too.
3. Not online: `dueAt` is now + `awayDelayMs` for "away", else null. The route answers `queued: true`.
4. Each minute `onTick` calls `dueChats`: due when `dueAt` has passed (or, if null, when online), status online or away. At most `TICK_BATCH` (2) per tick; a call asked less than `ASKING_MS` (5 minutes) ago is not asked again; failed chats are skipped.
5. `fileReply` removes image and sticker markers, cleans the text (`cleanReply`), stores the reply, clears `pending` and `failed`, sets `unread`. A sticker is its own message, one millisecond later.
6. On failure `fileReply` sets `failed` and `pending` stays. Only `retryRoute` or a new message asks again.

## The system prompt, block by block
In the order `systemPromptFor` builds it:
1. Identity: name, the user's name or "the user", or "someone you do not know yet".
2. What the character knows of the user (`youFor`, from `knowsOf`: `profile.knows`, else `messengerKnows`, default "knows"): "knows" gives the persona's About (600 characters); "name" the name only; "stranger" nothing.
3. The character's About (1500 characters), interests (12), habits (10), voice text (800).
4. Recent days: the last 4 diary entries (`recentDays`).
5. Person line (`metUser`, `metLine`). Never for a stranger. Gossip, one line on a share of replies (`chatGossipLine`).
6. Memory note, cut to `SUMMARY_MAX` (1500), from `contextOf`; recalled messages, if any (`recallFor`).
7. Length and emoji (`LENGTH_WORDS`, `EMOJI_WORDS`), formality, `voice.never` (12), `voice.words` (8).
8. Output rules: plain chat text, no label; `OOC_HINT`; the user's language.
9. Pictures, when `mayImage` allows: `IMAGE_HINT`. Stickers, while one is left today: `stickerHint`.

History is `historyFor` over the window: user messages as "user", the character's as "assistant".

## Writing first
- `onTick` calls `planFirst` after folds and recall. Per tick the chance is `min(1, 1 / max(10, awake minutes / perDay))`.
- Settings (`firstSettings`): `messengerFirst`, `messengerPerDay` (default 5), `messengerQuiet` ("same": `quietFrom` 01:00 to `quietTo` 08:00).
- Limits: `perDay` in total per local day (`log.n`); `FIRST_GAP_MS` (20 minutes) between two; one per profile per day (`log.by`).
- Per profile: online; no pending or failed reply; last message not a first message and older than `FIRST_AFTER_TALK_MS` (30 minutes).
- Subject: `lifeSubject` (a diary entry of 3 days, or a world item), or `checkInSubject` (3 quiet days with a close friend). Never for a stranger.
- Weight (`firstWeight`): stranger 0.25 up to confidant 2.5 by level; feeling 3 or more x1.3; -3 or less x0.3.
- Failure waits `FIRST_FAIL_WAIT_MS` (10 minutes).

## The memory note and the fold
- Due: `onTick` looks only when no chat is pending, one fold per tick. `foldPlan` needs `messengerSummary` not false, no failure in the last `FOLD_FAIL_WAIT_MS` (10 minutes), and more open messages after `upto` than `n + slackOf(n)`. `n` is `historyLimit` (`messengerContext`, 4 to 500, default `HISTORY`, 24); slack is max(4, ceil(n / 3)). With defaults, above 32 open messages.
- Input: the oldest open messages, leaving `n`; each cut to `FOLD_MSG_MAX` (600); the batch stops at `FOLD_INPUT_MAX` (12000), but takes at least one.
- Call: `requestFold`, key `sum:<profile>:<upto>`, temperature 0.3, `max_tokens` 600.
- Output: `fileFold` runs `cleanNote` (`SUMMARY_MAX`, 1500) and stores `{text, upto, at}`.
- Failure: `foldFailAt` is set; the old note stays; the user sees nothing.
- Edit: `summaryRoute` sets `edited: true`; the dialog limit is `NOTE_MAX`.
- New conversation: `newRoute` folds the open messages first (key `newsum`, not waiting for the failure), then adds a divider. Without `keepNote` the note is cleared; a failed fold still makes the divider and answers `warn: "note"`.
- Clear: `clearRoute` empties chat, note and recall cache.

## Recall
- Switch `messengerRecall` (`recallOn`), off by default.
- Pool (`recallPool`): messages after the last divider and outside the window, newest first, at most `RECALL_POOL` (400) scanned; text under `RECALL_MIN_CHARS` (8) and sticker-only messages skipped.
- Query: the last `RECALL_QUERY_MSGS` (3) messages.
- Vectors (`recallVector`), when they cover `RECALL_COVERAGE` (0.5) of the pool. Bar: `RECALL_COSINE_SMALL` (0.5) below 8 messages; else the larger of `RECALL_COSINE_FLOOR` (0.35) and median + 3 scaled median absolute deviations.
- Keywords (`recallKeyword`) otherwise: score `RECALL_MIN_SCORE` (0.6) or more, with a rare word (held by at most max(3, 3% of the pool), `RECALL_RARE_SHARE`).
- `recallTake`: at most `RECALL_COUNT` (3), none within `RECALL_NEAR_MS` (5 minutes) of another, oldest first.
- Lines (`recallFor`): text cut to `RECALL_MSG_MAX` (280); all within `RECALL_TOTAL_MAX` (900).
- Vectors (`recallTick`): after folds; `RECALL_BATCH` (16) newest messages per call, key `rec:`.
- Failure: no embed for `RECALL_FAIL_WAIT_MS` (30 minutes).
- Files: `.cache/recall/meta/`, `.cache/recall/vec/`; kept when the switch goes off, removed on clear.

## Screens
- `src/screens/messenger/index.tsx`, `Messenger`: the screen, desktop and phone; the note sits in the info column.
- `src/screens/messenger/live.ts`, `useLiveMessenger`: real mode; polls the contact list every `POLL_MS` (20 seconds).
- `src/screens/messenger/real.ts`, `chatView`, `logItems`: pure helpers for real mode.
- `src/screens/messenger/parts.tsx`, `ChatLog`, `Composer`: shared pieces for both layouts.
- `src/screens/messenger/phone.tsx`, `PhoneList`, `PhoneChat`: phone layouts; the header opens the memory dialog.
- `src/screens/messenger/memory.tsx`, `MemoryDialog`: the note (saved only when changed), new conversation (keep or drop the note), clear (asks first).
- `src/screens/messenger/community.tsx`, `community-api.ts`: story bar and "characters talk" dialog.
- `src/screens/messenger/clubs.tsx`, `clubs-api.ts`, `clubs-model.ts`: clubs; not covered here.
- `src/screens/messenger/strings.ts`, `messenger.css`: texts and styles.

## If you change X, also touch Y
- A chat field: `readChat`, `writeChat`, `viewOf`, and the types in `real.ts`.
- The window, note or fold: `windowMessages`, `foldPlan`, `requestFold`, `SUMMARY_MAX`, `FOLD_INPUT_MAX`, `FOLD_MSG_MAX`, `NOTE_MAX`.
- `knowsOf`, `youFor`, `metLine`: their copies in the forum plugin (pinned by tests).
- A route key (`reply`, `rq`, `newsum`, `rep:`, `sum:`, `fm:`): second passes read `host.llm.results` by key.

## Traps
- `CHECKIN_AFTER_MS` is declared and never used; `checkInSubject` uses a literal `days < 3`.
- `profile.knows` overrides the Settings value; with "name", the About is dropped.
- Routes take the profile id and use the active persona's chat; a reply is filed in the chat it was asked in.
- `writeChat` keeps the newest 500 messages; the note is stored apart.
- A chat with a pending reply is never folded; a failed chat keeps `pending`, so its note waits for a retry or a new conversation.
- A failed reply is not retried by the tick; a lost call is asked again after 5 minutes; a failed fold is silent.
- Pictures are drawn by the open Social page only (`docs/DECISIONS.md`).
- Recalled text is data: `recallText` turns angle brackets into spaces and double quotes into single quotes.

## Tests that guard it
- `test/messenger-plugin.test.ts`, `test/messenger-memory.test.ts`, `test/messenger-recall.test.ts`: routes, first messages, the note, recall.
- `test/messenger-real.test.ts`: the helpers in `real.ts`.
- `test/chat-pairs.test.ts`, `test/persona-context.test.ts`, `test/chat-life.test.ts`, `test/stickers.test.ts`, `test/pictures.test.ts`.

## Not verified
- Real model behaviour: never run; the tests use fakes.
- The recall bar and keyword values (`docs/DECISIONS.md` calls them guesses).
- Bodies of `cleanImage`, `chatRoute`, `contactsRoute`, `lineOf`.
- Whether Settings shows `messengerContext`.
- Test bodies, except `messenger-memory` and `messenger-recall`.
