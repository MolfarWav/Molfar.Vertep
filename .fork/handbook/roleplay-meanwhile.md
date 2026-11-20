# Meanwhile: life off screen (the rules, the routes, one model call per pass; Litopys reads the events as facts)
Verified at: molfar.vertep-roleplay branch claude/stage-backstage-448-449 (M1a)

## What it does
- People who are not in the scene act while time passes, and what they did becomes knowledge (#449). M1a is the rules as pure exported functions; M1b adds the routes (`handleRoute`), one model call per due pass, a log, and the World sheet's card with the switch. M2a: Litopys reads the kept events as facts for each reply (below). The journal line (M2b), letters and Social are not built.
- Design and decisions: engine repo `.fork/handoff/meanwhile-449/DESIGN.md`.

## Owners
- `plugins/meanwhile/plugin.js` `cleanEvent`: one event from the model's object, or the reason it fails. Nothing is repaired.
- `plugins/meanwhile/plugin.js` `buildEvents`: numbers the survivors (`m1`...), at most `k`, drops a repeated `what`.
- `plugins/meanwhile/plugin.js` `registryIndex`, `presentIds`: the registry's entities with merges followed; who stands in the scene: through the Dashboard's `personIds`, then by name, alias or id in plain lower case.
- `plugins/meanwhile/plugin.js` `dueReason`: whether a pass is due: switch on, not in a fight, at least `minReplies` replies after the cursor, then a new scene (`scene.new` in a Dashboard snapshot after the cursor) or a story-clock jump of `clockHours`.
- `plugins/meanwhile/plugin.js` `reconcile`, `dropUndone`, `recordPass`: rollback by message key; the cursor goes back to the newest pass still on the line.
- `plugins/meanwhile/plugin.js` `buildPrompt`, `parseEvents`: the request text (lists capped) and the reader of the answer.
- `plugins/meanwhile/plugin.js` `factDraft`: the Litopys fact an event becomes; `spoilerView`: what the panel may show.
- `plugins/meanwhile/plugin.js` `cleanConfig`, `cleanState`, `emptyState`.
- `plugins/meanwhile/plugin.js` `handleRoute`, `runRoute` (two passes: ask, then read the answer; one retry for an empty or rate-limited answer), `stateRoute`, `configRoute`, `gatherInput` (what a pass reads), `modelFor` (the model chain), `settle` (rollback on every read).
- `src/lib/meanwhile.ts` `triggerMeanwhile`: the pass after a reply, called from `src/lib/store.ts` after the World DM run; the switch is remembered ten minutes so a chat with it off makes no plugin call. `src/components/world/world-meanwhile.tsx` `MeanwhileCard`: the card in the World sheet and the World section's Overview (mounted in `world-controls.tsx`).

## Data
`meanwhile/config.json` and `meanwhile/state/<chatId>.json` (events, passes, log, usage); shapes in Roleplay `docs/DATA-FORMATS.md`, "Meanwhile". The pass reads `dashboard/state/<chatId>.json` (snapshots, `personIds`), `registry/<chatId>.json`, `world/state/<chatId>.json` (fronts, people and `regIds`) and the chat files.

## When a model is called
One call per due pass under the key `meanwhile` (`meanwhile_retry` for the one retry), model from `modelFor`: its own, the World's, the sensor's, Litopys', the chat's, the app's. `max_tokens` 1500, 6000 on the retry; no reasoning field.

## How the events reach a reply (M2a)
- A plugin cannot call another, and a second writer of `litopys/chats/<id>.json` would skip `saveChatFile`, so the events are never stored there. `plugins/litopys/plugin.js` `meanwhileFacts` reads `meanwhile/state/<chatId>.json` (only while `meanwhile/config.json` has `enabled: true`; active events, the newest 30) and builds facts with id `mw:<event id>`, `knownBy` = canonical names of who and witnesses (never the player's), `secret` for a secret event; `withMeanwhile` lays them over the record in memory.
- Call sites in Litopys: `llmRequest` (the reply; a chat with no record yet gets a blank one), `firedRoute`, `traceRoute`, `carriesRoute`. `castKnowledgeFor` skips an event nobody in the scene knows, so a narrator is not told it.
- Who gets one is the ordinary rule of `buildInsert`: a reply by a person who knows, or a reply that voices several when someone who knows is in the scene (Dashboard `present`). A swipe marks the event undone in the Meanwhile state and the next read drops it, so the fact leaves with it.
- Not read by the Dashboard's leak check, not listed in the Library's Facts tab or the "Who knows" map.

## Flow
1. After a reply `triggerMeanwhile` asks (only with the switch on, one pass at a time per chat); `dueReason` decides from the Dashboard's snapshots. A failed pass waits ten minutes (`lastFailAt`), "Run a pass now" (`force`) skips the wait.
2. `gatherInput` -> `buildPrompt` -> model -> `parseEvents` -> `buildEvents` -> `recordPass` and a log line. Facts will go to Litopys through a route inside Litopys (M2a), never by writing `litopys/chats/<id>.json` from here.
3. Every read first calls `settle` (`reconcile` on the chat's line, then `dropUndone`; M2a must retire the facts between the two).

## If you change X, also touch Y
- Event fields or effect types: `cleanEvent`, `cleanEffect`, the prompt's rules in `SYSTEM`, `spoilerView`, `factDraft`, Roleplay `docs/DATA-FORMATS.md`.
- Who may take part: the checks in `peopleList` and the "player never knows" line in `factDraft`; `test/rp-meanwhile.test.ts` guards both.

## Traps
- A person in the scene is found through the Dashboard's `personIds` (name to registry id) first, then by name or alias in plain lower case; a name the Dashboard never resolved and the registry spells otherwise is missed.
- The per-card switch is `offCards` (card ids) in `meanwhile/config.json`, global to all chats; no card field was added. A card character's `goal` is empty (the Dashboard journal is not read yet), so the model sees only name and place.
- `inCombat` is never passed: a fight does not stop a pass yet.
- An event's `where` may be free words; only an `l#` id is checked against the registry.
- `reconcile` marks events `undone` and keeps them: the caller must retire their facts, then call `dropUndone`, or the facts outlive the swipe.
- A reasoning model can answer with nothing (it spent the whole budget thinking): M1b retries once with more room, as World does.
- Item and NPC-move effects pass the checks but can be silly (a stolen ledger moved by an unrelated event); M1b applies only `front_clock` and `relation` by itself.
- A pass needs Dashboard snapshots; a chat with the Dashboard off is never due (`no-dashboard`).

## Tests that guard it
`test/rp-meanwhile.test.ts` (the checks, `dueReason`, rollback, state and config, the prompt and the reader, the fact and the spoiler view), `test/rp-meanwhile-routes.test.ts` (a pass end to end on a fake host: retry, log, cooldown, rollback, spoilers), `test/rp-meanwhile-client.test.ts` (the trigger, the cached switch, the card's lines, both languages).

## Not verified
- Small-window and weak models, and the owner's own chats. A bench with five models on an invented world (22 calls, English and Ukrainian) is in the engine repo `.fork/handoff/meanwhile-449/bench/`: every answer parsed, 53 of 53 events passed the rules, no one in the scene or the player in `who`; one empty answer from a reasoning model.
- The prompt's size: an estimate of about 4 characters a token, 544 to 558 tokens on the test input, not measured with the inspector.
- How Litopys will take the fact (M2a is not built).
