# Direction: who is in a group chat's scene, the director, the lock

Verified at: molfar.vertep-roleplay branch claude/direction-phase2 (engine, plugin and UI; phase 2 not yet merged)

## What it does
- In a group chat, after each reply, one small director call reads the newest pair of messages and reports the kind of scene and which members are in it. Code maps the names to members and applies the `alone_moment` precedence.
- The engine reads that scene: only members in it take turns (naming someone still calls them in), an absent member's card is one line, Spotlight and voice notes cover only those present.
- The player can hold the scene to some members (the lock). Releasing it sends one return note on the next reply.
- Design and numbers: engine repo `.fork/handoff/direction/` (`DESIGN.md`, `RESULTS.md`, `PHASE1.md`); issue #496.

## Owners
- roleplay: `plugins/direction/plugin.js` `runRoute`: the director call for the newest reply, two passes, one retry.
- roleplay: `plugins/direction/plugin.js` `buildPrompt`, `parseReport`: what the director reads and how its answer is read.
- roleplay: `plugins/direction/plugin.js` `applyPrecedence`: alone with one member, commute, break, lunch and club become `alone_moment`.
- roleplay: `plugins/direction/plugin.js` `memberNames`, `matchMembers`: card name, first name, registry names and aliases of the card's person.
- roleplay: `plugins/direction/plugin.js` `reconcile`, `newestReport`: reports tied to `<msgId>#<swipe>`; a swipe or delete drops them.
- roleplay: `plugins/direction/plugin.js` `chatRoute`: the chat's switch and lock; a release writes `returning`.
- roleplay: `plugins/direction/plugin.js` `returnDue`, `sceneLines`, `llmRequest`: the lock and return notes on the reply.
- roleplay: `plugins/direction/plugin.js` `sceneNow`, `stateRoute`: what the bar shows (also the rules view, the queued note, the ledger).
- roleplay: `plugins/direction/plugin.js` `SETS`, `activeRules`, `cleanRules`: the built-in genre sets (rom-com) and the chat's edits to a rule's numbers.
- roleplay: `plugins/direction/plugin.js` `evalRule`, `replyRows`, `absentRun`: a rule's conditions over the director's reports, and who comes in (the longest away first).
- roleplay: `plugins/direction/plugin.js` `decideRules`, `ruleStatus`, `roll2d6`, `seededRandom`: cooldown, payoff silence, the seeded 2d6, the ledger entry (World's generator, copied: plugins do not import each other).
- roleplay: `plugins/direction/plugin.js` `judgeNext`: after the carrier reply is reported: came, mentioned or missed.
- roleplay: `plugins/direction/plugin.js` `ruleNote`, `worldCarries`, `reopenForSwipe`, `llmRequest`: the note on the reply, yielding to the lock, the return and World, a swipe of the carrier.
- roleplay: `plugins/direction/plugin.js` `rulesRoute`, `fireRoute`, `skipRoute`: the genre switch and edits, "Fire now", skipping the queued note.
- roleplay: `plugins/engine/plugin.js` `directionScene`: the engine's own reader of the same file (plugins do not import each other).
- roleplay: `plugins/engine/plugin.js` `groupTurnPlan`: the `scene` argument limits the pool.
- roleplay: `plugins/engine/plugin.js` `assemble`: `awayIds`, `awayLine`, `hereRoster` (roster, scene text, Spotlight, voices, inspector labels).
- roleplay: `plugins/engine/plugin.js` `hookInsertTable`: row "direction scene" (90 tokens) while a lock, a return or a queued rule note is set.
- roleplay: `plugins/relations/plugin.js` `byAttention`, `GROUP_FOCUS`: a group's Dashboard focuses four, most recently involved first.
- roleplay: `src/lib/direction.ts` `triggerDirection`, `directionOnForNewChat`, `loadDirection`, `setDirectionChat`, `saveDirectionModel`.
- roleplay: `src/lib/store.ts` `newChat`: a new group chat starts with Direction on when a model is picked.
- roleplay: `scripts/direction-bench.ts`: the phase 0 bench (synthetic corpus, variants, delivery, score); `deliverReal` sends the notes through the real prompt (0b).
- roleplay: `src/lib/direction-ui.ts` `presenceOf`, `barMode`, `useDirectionState`: what the bar and the member chips show.
- roleplay: `src/components/chat/director-bar.tsx` `GroupBars`, `DirectorBar`, `DirectorBarView`: the bar under the member bar (scene, model, switch, lock chip, log).
- roleplay: `src/components/chat/direction-sheet.tsx` `DirectionSheet`, `RulesTab`, `RuleCard`: the sheet (tabs Rules and Log), genre row, queued-note callout, a rule's state, Fire now, Numbers; `src/components/chat/direction-log.tsx` `DirectionLog`: the log in words (moved out of `director-bar.tsx`).
- roleplay: `src/components/chat/direction-note.tsx` `DirectionNote`: the mark under the reply that carried a rule's note (found by the firing's `carrier`), mounted in `chat-view.tsx` beside the dice notes.
- roleplay: `src/lib/direction.ts` `setDirectionRules`, `fireDirectionRule`, `skipDirectionNext`; `src/lib/direction-ui.ts` `RULE_DEFAULTS`, `needPercent`: client side of the rules (the rom-com defaults are repeated there for "Restore defaults", and `DIRECTION_SETS` in `direction.ts`, used by the group tab: change them with `SETS` in the plugin).
- roleplay: `src/components/chat/model-palette.tsx` `ModelPalette`, `ModelPaletteGroups`: the chat top bar's model palette, shared with the bar and the group's Direction tab.
- roleplay: `src/components/chat/group-member-bar.tsx` `PresenceMark`: away and locked marks; the member popover's lock and release.
- roleplay: `src/components/chat/create-group-dialog.tsx` `CreateGroupDialog` and `src/lib/group-picker.ts`: the wide member picker (search, scope, tags, sort, order).
- roleplay: `src/components/groups/group-direction.tsx`: the group's Direction tab (`direction: false` opts the group's new chats out).
- roleplay: `src/components/chat/new-chat-step.tsx`: the Direction switch of a group's new chat (the step always opens for a group).
- roleplay: `src/lib/store.ts` `createGroup`, `newGroupId`: a new group opens its editor with the first-chat banner, no chat is made.

## Data
- `direction/config.json`: `{ v: 1, model }`, one model for every chat; "" = none, the director does not run.
- `direction/state/<chatId>.json`: `{ v, chatId, on, lock: { ids, at } | null, returning: { ids, after, at } | null, reports: [{ key, at, tag, present, sceneNew, model, ms, usage? }], log, usage }`; reports and log keep 30.
- Phase 2 adds `rules: { set, on, edits }`, `next` (the queued note: `{ id, rule, kind, who, with, after, forced, at }`) and `fires` (the ledger, newest 40: `{ id, rule, kind, who, with, after, n, roll, tension, hold, payoff, result, carrier, forced, why, at }`). Cooldown and tension are not stored as counters: they are read from the ledger (the last unforced firing of a rule: `hold` replies from its `n`), so a swipe or a delete that drops a firing takes its cooldown back.
- `on` is null until set; only `true` turns the director and the scene cast on. A chat made before the feature has no file. A chat has no genre set and the rules off until the player picks one.

## When a model is called
- Once per reply in a group chat with `on: true` and a model set, from the client after the reply, before the Dashboard (one call at a time). Max 600 output tokens; a thinking-only answer is retried once with 3000; a rate limit once.
- Never in `llmRequest`, `stateRoute` or `chatRoute`.

## Flow
1. The store commits a reply; `triggerDirection` returns at once for a chat that is not a group or when no model is set.
2. `POST /direction/run` settles the file against the chat (`reconcile`), finds the newest reply, and skips it when a report for its key exists (`done`).
3. The call reads: the members, its log of up to 8 earlier reports on the line, the reply before (last 1500 characters), the new player message and reply (6000 each).
4. The answer `{ tag, present, sceneNew }` becomes a report: names to member ids, `applyPrecedence`, stored under the reply's key; a spent return is cleared.
5. On the next request the engine's `directionScene` decides the cast: the lock first; else, with `on`, the newest report on the line; else the Dashboard's newest `present`; members of a due return count as present.
6. `llmRequest` appends the lock note while a lock holds, or the return note on the first reply after a release (and its swipe), to the newest user message.
7. Genre rules, in `runRoute` right after a report is saved: `judgeNext` settles the note the reported reply carried (came: the member is in `present`; mentioned: the name is in the reply; else missed), then `decideRules` looks at the newest reply: switch on, rules on, no lock, not an explicit Dashboard scene, no decision for it yet; the first rule whose conditions hold, whose cooldown and payoff silence are over, and whose seeded 2d6 reaches `need` becomes `next` and a ledger entry. The engine reads `next.who` as present for the reply that follows (the card is whole); `llmRequest` adds the note, unless the lock, a return or a World event or entrance (World runs first, priority 30 against 35) is already in that reply: then the entry is marked `yielded`. A swipe of the carrier reopens the entry (same note again); a delete of the reported reply drops it.
8. "Fire now" (`/direction/fire`) writes a forced entry (no roll, no cooldown, no tension) and replaces a queued note.

## What reaches the prompt
- Narrator and append groups: a present member's card fields whole; an absent one "[Name]\nName is not in this scene now." in the description only. The scene text lists those present and "Not in this scene now: ...". Inspector label "<Name> · not in this scene".
- "Direction · lock", "Direction · return" and "Direction · rule" parts, appended to the newest user message; never more than one of them in a reply.
- Swap groups: the scene text names the absent members; the speaker is never cut.

## If you change X, also touch Y
- The file shape: `cleanState` in the plugin and `directionScene` in the engine (two readers).
- The scene's priority (lock, director, Dashboard): `sceneNow` and `directionScene` together.
- A group's Dashboard focus: `GROUP_FOCUS` in relations and `DASHBOARD_FOCUS` in the engine's `hookInsertTable`.
- The note texts: `sceneLines`, `ruleNote`, and the reserve row "direction scene".
- A rule's shape or a set's numbers: `SETS`, `activeRules`, `cleanRules`, the Rules tab of the sheet, the guide page `direction`.
- The queued note: `cleanNext` in the plugin and `directionScene` in the engine (it counts `next.who` as present).

## Traps
- With no lock and `on` not true, the engine behaves exactly as before: no presence limit, every card whole. The state route then answers `source: "none"`, so the bar and the chips show no marks either (`sceneNow`).
- The lock works with the switch off and with no model: it is the player's, code only.
- An empty present list (the player alone) still counts as a known scene: every card is one line, but the turn pool falls back to everyone.
- The Dashboard fallback matches names by full name or first word only; the director's own matching also uses registry aliases.
- A report is tied to the reply's swipe: a swipe makes the director read the new text again.
- A rule is decided once per reported reply and the dice are seeded by chat, rule and reply key: asking again gives the same roll, a swiped reply (new key) rolls again.
- The engine counts a queued member as present at assembly, before `llmRequest` knows the note yields to World: in that rare reply the card is whole for someone who does not enter. A swipe of the carrier is not counted by `directionScene` (same as the return note).
- No rule fires without a director report for the newest reply: a failed director call means no rules that turn.
- Not built yet (phase 2 on purpose): place, time and warmth conditions; the `leave`, `spotlight` and `event` actions; a firing limit; rules written from scratch; other sets. World's NPCs are phase 3.

## Tests that guard it
- roleplay: `test/rp-direction-rules.test.ts` (conditions, decision, cooldown, payoff, queued note, judgement, yielding, swipe, Fire now), `test/rp-direction.test.ts` (plugin), `test/rp-direction-cast.test.ts` (engine), `test/rp-direction-ui.test.tsx` (bar states, marks, picker filters), `test/rp-insert-ceiling.test.ts` (group focus of four).

## Not verified
- The bar on a real chat with a real model (the browser check used a mock model and seeded reports).
- Delivery of the lock and return notes through the full prompt of a real preset (phase 0b done on Vertep Medium; the rule note uses the same template, not run through a real preset).
- The rom-com numbers (need, cooldown, K, M) in a long real chat; the `came` rate; the Rules tab with a real model.
