# Social: the Forum plugin and its screens
Verified at: molfar.vertep-social 748197a

## What it does
- Boards, topics and posts written by the user and the characters. The Moderator (author id `_mod`) runs events, comments, closes and a daily chronicle.
- `plugins/forum/plugin.js` holds the data, routes and autonomy tick. `src/screens/forum/` draws the screens.
- An autonomous post is one model request. Reactions, votes and reposts follow rules.

## Owners
- `plugins/forum/plugin.js`, `onTick`: files finished requests, runs the free actions and the Moderator, then plans at most one post.
- `plugins/forum/plugin.js`, `planAction`: picks the author and the kind of post.
- `plugins/forum/plugin.js`, `autoBlock`: why an autonomous post may not happen now.
- `plugins/forum/plugin.js`, `systemPromptFor`: the system prompt of a post.
- `plugins/forum/plugin.js`, `requestPlan`: builds the knowledge lines and sends the request.
- `plugins/forum/plugin.js`, `relationBits`, `overCeiling`: relationship lines and the word check between characters.
- `plugins/forum/plugin.js`, `gossipCandidates`, `gossipSubject`: gossip.
- `plugins/forum/plugin.js`, `pickReaction`, `pickVote`, `pickRepost`: reactions, votes and reposts.
- `plugins/forum/plugin.js`, `modTick`, `eventDue`, `pickModClose`: the Moderator.
- `plugins/forum/plugin.js`, `addNotice`, `followNotices`: notices.
- `plugins/forum/plugin.js`, `fileResult`: files a reply or a topic, and holds the refusals.

## Data
- `forum/boards.json`: `{categories: [{id, name, boards: [{id, name, desc}]}]}` (`readBoards`).
- `forum/topics/<id>.json`: `{id, board, title, by, name, hue, createdAt, lastAt, locked, unread, owe, addressed, posts, poll?, event?}` (`readTopic`).
- Post: `{id, by, name, hue, at, text, quote?, image?, repost?, react?}`. A removed post keeps its place as `{text: "", removed: true}`.
- `forum/log.json`: `{day, posts, byAuthor, reacts, lastAutoAt, nextAt, lastAuthor, recent, error}` (`readLog`).
- `forum/gossip.json`: `{items (last 60), drafts (last 10, two hours)}`. `forum/notices.json`: `{items (last 60, live 14 days), seenAt}`.
- `forum/events.json`: Moderator timers (`EVENT_STATE`). `forum/life-used.json`: what each author has told.

## The tick: how an action is planned
1. `onTick` files finished requests (keys `ar:`, `an:`, `ev:`, `mc:`, `mx:`, `cr:`) and returns. A filed post calls `recordPost`; anything else calls `recordFailure`.
2. Reactions (`reactTick`): chance `REACT_CHANCE` 0.3, off in quiet hours, at most `reactionsPerDay` (default 8). Votes (`pollTick`): chance 0.25. Reposts (`repostTick`): chance `REPOST_CHANCE` 0.08, at most `repostsPerDay` (default 2).
3. Moderator (`modTick`): waits `MOD_PENDING_MS` (10 minutes) after a request, `EVENT_FAIL_WAIT_MS` (30 minutes) after a failure. An event (`eventDue`) needs two profiles, no quiet hours, and `EVENT_GAP_MS`. Comments and closes each have chance `MOD_COMMENT_CHANCE` 0.15 and their gaps. A chronicle (`chronicleDue`) comes after the quiet check, daily (`CHRONICLE_GAP_MS`). A Moderator request ends the tick.
4. `autoBlock` stops the post for: `off`; `limit` (today at `postsPerDay`, default 30); `quiet` (default 01:00 to 08:00, user time); `gap` (`MIN_GAP_MS`, 2 minutes); `cap` (`CAP_COUNT`, 3 posts in `CAP_WINDOW_MS`, 10 minutes); `wait` (before `nextAt`).
5. Eligible: status `online` or `away` (`statusAt`, three-hour bands from Monday), and fewer than `postsPerAuthor` posts today (default 6).
6. Weight: `5 + forum.frequency` (1 when `writers` is `equal`), times 0.4 when away, times 0.3 for the last author.
7. A mention of the author is dropped with `AVOID_CHANCE` 0.6 when the feeling is at or below `AVOID_AT` (-7), unless the user wrote it or the author is jealous.
8. Order in `planAction`: addressed to the author (`addressed`); a user post still owed a reply (`owe`); an event invitation (`EVENT_LIVE_MS`, 2 days); a mention in the last six posts (`LIVE_MS`, 7 days); then a new topic or a live one.
9. New topic: forced when no live topic exists, else chance `newTopicShare` (default 20%).
10. Live lean: feeling divided by 12, clamped 0.15 to 2; jealousy at least 1.5; a grudge times 0.6; a rumour about the author times 2 (max 3); a followed author times `FOLLOW_LEAN` (1.6).
11. Next slot (`nextGapMs`): `avgGapMs` (awake minutes over `postsPerDay`, times `ACTIVITY_SCALE`) times a random 0.5 to 1.5, never under `MIN_GAP_MS`. The slot moves only when a post files.
12. Subject (`pickSubject`): a rumour with chance `GOSSIP_SHARE` (0.25) while today's count is under `gossipPerDay` (default 2); else a Life subject; else one interest.
13. Request (`requestPost`): the author's model, else `settings.models.forum`. Reply tokens 250, 450 or 800 by length; new topic 900.
14. A failed call, an empty text, a repeat or an over-ceiling post waits `FAIL_WAIT_MS` (10 minutes) and is not counted.

## What a character knows when it posts
`systemPromptFor` writes these blocks in order:
1. Identity, and stay in character.
2. Who you are: the About, cut to 1500 characters; interests (up to 12); habits (up to 10).
3. How you write: the voice text, cut to 800.
4. Recent diary lines from `recentDays`, to be taken as true.
5. The user: name and About (600 characters) from `userKnownTo`. `knowsOf` gives `knows`, `name` or `stranger`; `stranger` hides the name, and the prompt then says not to guess it.
6. Met lines (`metLine`) and the `met` text from `requestPlan`: feeling toward the post's author, jealousy (`jealousLine`), and a rumour about the author (`aboutMeLine`).
7. The private note (`chatNote`, cut to 800). Only for a reply to the user, when the author is not a stranger and the messenger's note switch is on. It must not be quoted.
8. Length, emoji level and formality. Never write (up to 12) and signature words (up to 8).
9. Plain text only, and the language of the recent posts. Do not invent facts.
10. Picture and sticker hints.
`relationBits` adds romance only when both profiles are adult. Between characters, `communityLevel` (none, warm, flirty) caps it.

## Gossip, reactions, polls, reposts
- Gossip (`gossipCandidates`): `rift`, `close` or `sweet`, from talks, feelings and romance. A rumour is not told to the same author twice within 7 days (`GOSSIP_AGAIN_MS`). `gossipSubject` forbids added details. A draft waits until its topic files (`fileGossip`).
- Reactions (`pickReaction`, `reactionFor`): one of six fixed emoji, by keyword. Never twice on one post.
- Polls: the Moderator's `poll` event makes one. A character votes once, weighted by interests and feelings. Open 3 days (`POLL_LIVE_MS`).
- Reposts (`putRepost`): a stock line (`repostLine`) and a quote, no remark. The author must like the post or be a close friend.

## The Moderator, notices, reputation
- The Moderator is not a profile: no contacts entry, not editable. It is named "Moderator", or "Модератор" for Cyrillic text (`modName`).
- Comments (`pickModComment`) go to a live topic with five or more posts. Closes (`modCloseReason`): an event older than 3 days, 14 quiet days, or 400 posts. Closing locks the topic.
- Notices (`addNotice`): kinds `reply`, `react`, `repost`. `followNotices` builds "started following you" rows on request, not stored. `noticesRoute` returns the newest 30.
- Reputation: only the "cool" feeling line in `relationBits` was found.

## Screens (one line per file)
- `src/screens/forum/index.tsx`: the `Forum` screen for the real app.
- `src/screens/forum/live.tsx`: wires the real views to the data.
- `src/screens/forum/preview.tsx`: design preview on mock data.
- `src/screens/forum/data.ts`: polled GET hooks and the Write now call.
- `src/screens/forum/model.ts`: maps engine answers to screen data.
- `src/screens/forum/Home.tsx`: front page with banner, strip and statistics.
- `src/screens/forum/Strip.tsx`: autonomy strip, switch and Write now button.
- `src/screens/forum/Boards.tsx`: board list.
- `src/screens/forum/BoardPage.tsx`: a board's topics.
- `src/screens/forum/TopicView.tsx`: a topic's posts and reply box.
- `src/screens/forum/PostCard.tsx`: one post.
- `src/screens/forum/PollCard.tsx`: poll under the opening post.
- `src/screens/forum/Pager.tsx`: page links for long topics.
- `src/screens/forum/NewTopic.tsx`: new-topic form.
- `src/screens/forum/SearchPage.tsx`: search with snippets.
- `src/screens/forum/NoticesPage.tsx`: "Replies to you".
- `src/screens/forum/mention.tsx`: @ suggestions.
- `src/screens/forum/mention-logic.ts`: the typed @word.
- `src/screens/forum/Ava.tsx`: letter avatar.
- `src/screens/forum/Icons.tsx`: small board icons.
- `src/screens/forum/labels.ts`: plural forms.
- `src/screens/forum/strings.ts`: translation keys.
- `src/screens/forum/forum.css`: styles under `.s-forum`.

## If you change X, also touch Y
- A limit or gap constant: `autoBlock`, `avgGapMs`, `Strip.tsx`, `test/forum-plugin.test.ts`.
- A reaction emoji: `REACTIONS`, `reactionFor`, `readNotices`.
- `relationBits`, `knowsOf`, `chatNote` or `lifeSubject`: the copy in `plugins/messenger/plugin.js`, since each plugin carries its own.
- `PAGE_SIZE`: `topicRoute`, `Pager.tsx`, `SearchPage.tsx`.
- `NOTICE_KINDS`: `noticesRoute`, `NoticesPage.tsx`, the badge in `src/lib/badges.ts`.

## Traps
- A pending request is not in `done`, and the slot moves only when a post files, so the next tick can plan another post (code reading; not run).
- A removed post loses its `repost` or `image` flag, so it frees that day's count (docs: DECISIONS, "Remove a post").
- The ceiling check runs on every new topic, but on a reply only when it is not to the user.
- Clubs are not in this plugin.

## Tests that guard it (names only)
- `test/forum-plugin.test.ts`, `test/forum-real.test.ts`, `test/forum-user.test.ts`, `test/moderator.test.ts`, `test/events.test.ts`, `test/chronicle.test.ts`, `test/polls-reposts.test.ts`, `test/notices-reputation.test.ts`, `test/community-life.test.ts`, `test/follows.test.ts`

## Not verified
- Bodies of `recentDays`, `metLine`, `communityLevel`, `lifeSubject`, `chronicleFacts`, `fileChronicle`, `fileEventResult`, `fileModPost`, `pollVote`.
- Routes not read: `forceRoute`, `voteRoute`, `topicRoute`, `homeRoute`, the lock and remove routes, the picture routes; `takeImageMarker`, `cleanImage`, `takeSticker`.
- Whether the engine serialises requests (the first trap depends on it); reputation as a screen or route; the Moderator's club.
- Real-model behaviour and play balance (DECISIONS: not checked).

