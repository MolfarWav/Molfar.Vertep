# World DM: the plugin that builds a world from the story and moves it during play
Verified at: molfar.vertep-roleplay 91eec33

## What it does
- After a reply, a DM model reads the new part of the story and returns small JSON. Code turns it into the chat's world book: one record per person, place, group, thing or fact that matters beyond the scene.
- Fronts (factions, threats, powers) carry clocks. Above the chronicler level the clocks tick off screen, and a front's goal comes true when its clock is full.
- Events and dice reach the reply prompt through a hook that calls no model.
- A Start drafts a world from the cards or an interview; the player trims and accepts it.
- Swiping or deleting a reply rolls the world back to the snapshot taken before the run that read it.

## Owners
- `plugins/world/plugin.js`, `updateRoute`: the DM run; checks, model call, apply, tick, save.
- `plugins/world/plugin.js`, `dueReason`: code rule for when a run is due.
- `plugins/world/plugin.js`, `applyReport`: writes the model's add, update and retire ops as records.
- `plugins/world/plugin.js`, `cleanEntity`: record shape; an unknown kind becomes `fact`.
- `plugins/world/plugin.js`, `applyCarry`: wear and carry, used only when carrySource is `dm`.
- `plugins/world/plugin.js`, `applyLevel`: front add, tick and retire; the pending event; the deck card pick.
- `plugins/world/plugin.js`, `tickClocks`: code clock ticks, one d6 per active front.
- `plugins/world/plugin.js`, `clockStep`: maps a d6 to nothing, +1, or +1 and stirred.
- `plugins/world/plugin.js`, `clockStage`: the prompt's words for early, growing and late.
- `plugins/world/plugin.js`, `cleanFront`: front shape; clock kept between 0 and size.
- `plugins/world/plugin.js`, `cleanDeck`: deck cards, at most 24 kept.
- `plugins/world/plugin.js`, `deckRoute`: asks the build model for a new events deck.
- `plugins/world/plugin.js`, `startRoute`: begins a Start draft, then runs one build step per call.
- `plugins/world/plugin.js`, `draftRoute`: accepts or discards a draft.
- `plugins/world/plugin.js`, `llmRequest`: adds the event, dice and "World · here" to the reply.
- `plugins/world/plugin.js`, `rollFate`: one roll; a percent gate, then 2d6 plus a modifier.
- `plugins/world/plugin.js`, `diceOutcome`: maps the total to miss, no but, yes but or full.
- `plugins/world/plugin.js`, `pushSnap`: stores the core state before a run changes it.
- `plugins/world/plugin.js`, `reconcile`: undoes runs whose message is gone; resends a lost event.
- `plugins/world/plugin.js`, `firstGone`: finds the oldest snapshot no longer on the chat's line.
- `plugins/world/plugin.js`, `eventLost`: says whether the reply that carried the event is gone.
- `plugins/world/plugin.js`, `undoFrom`: restores the core keys and keeps the player's own edits.
- `plugins/world/plugin.js`, `rollbackRoute`: POST /world/rollback, which calls settle.
- `plugins/world/plugin.js`, `systemFor`: builds the DM system prompt from profile blocks and level rules.
- `plugins/world/plugin.js`, `sweepCandidates`: lists places and things the book lacks.
- `plugins/tools/plugin.js`, `rollDice`: the roll_dice tool a model may call; separate from World's dice (two kinds on purpose; `docs/COUPLINGS.md`, "Two kinds of dice": roll_dice is unseeded and read by the model, World's check is seeded, rolled by code, and re-rolls on a swipe; the roll log is not rewound).
- `plugins/world/plugin.js`, `deckRoute` answers `short: true, min: 8` when fewer than `DECK_MIN` cards came back; the cards are kept either way (Roleplay branch `claude/handbook-findings`, 9fab294). `DECK_MIN` is a request in the prompt, not a limit.
- `src/lib/world.ts`, `triggerWorldUpdate`: client call after a reply.
- `src/lib/world.ts`, `rollbackWorld`: client call that asks the server to roll back.
- `src/lib/store.ts`, `rollbackWorld`: the store calls it on swipe, delete and regenerate.
- `src/components/world/world-start.tsx`, `DraftPanel`: the Start draft, its steps and accept.
- `src/components/world/world-records.tsx`, `WorldRecords`: the Records tab; player edits.
- `src/components/world/dice-log.tsx`, `DiceLog`: shows the roll log.
- `src/components/world/world-settings.tsx`, `WorldSettingsDialog`: level, cadence and other settings.

## Data
- `world/state/<chatId>.json`: settings, cursors (lastKey, levelKey), `entities` (ids like `n3`), `fronts` (ids `f1`), `event`, `deck` (`[{ id: "e1", text }]`), `carry`, `clockReplies`, `log`, `usage`.
- `world/snaps/<chatId>.json`: up to 8 snapshots `{ upTo, at, head, core }`.
- `world/dice/<chatId>.json`: the newest 60 rolls.
- `lorebooks/world-<chatId>.json`: the world book; one entry per record, memo `world:<id>`.
- `world/config.json`, `world/profiles/`, `world/recipes/`, `world/library/`: see `docs/DATA-FORMATS.md`, "World DM".

## When a model is called, and when code decides
- Play model, in `updateRoute`: the DM run returns records, front ops, a delivered flag and an event choice. A sweep is a records-only run of the same route.
- Build model, through `buildAsk` in `startRoute`, `deckRoute` and the opening: Start steps and the deck.
- Code only: when a run is due, clock ticks in code mode, front and event rules, dice, the reply insert, and rollback.
- No model call: `llmRequest` and `rollbackRoute`.

## Flow
1. After a reply the client calls `triggerWorldUpdate`. `updateRoute` first runs settle, so changes from a deleted or swiped reply are taken back.
2. If the level is off, the run is records-only and only the sweep is due. With no unread text, or no due trigger, the route answers skipped.
3. A due run calls the model under the key `world`. A thinking-only answer is retried once with more room; a rate-limited one is retried as it was.
4. On an answer, `pushSnap` saves the core at the message the run reads up to. Then `applyReport` writes records, `applyCarry` runs only with carrySource `dm`, and `applyLevel` runs above the chronicler on full runs.
5. A front's clock advances in one of two ways. In code mode, `tickClocks` rolls a d6 per active front every clockEvery replies: 1-2 nothing, 3-4 one segment, 5-6 one segment and stirred. The model's tick ops are ignored there. In model mode, `applyLevel` applies each tick, clamped to minus 2 through plus 2.
6. An event is dealt. With the deck option on, `applyLevel` takes the card the model names and removes it from the deck; otherwise the model's text is used. Nothing is dealt in a quiet scene or during catch-up.
7. On the next send, next or swipe reply, `llmRequest` marks the event sent, records the message it follows in `after`, and adds it. A later run reads the delivered flag: true clears the event; false is retried once, then dropped.
8. On a swipe or a deleted reply, the store calls `rollbackWorld`, which posts to /world/rollback. `settle` calls `reconcile`; `firstGone` finds the snapshot and `undoFrom` restores CORE_KEYS. An event whose carrier reply is gone becomes due again.
9. On a swipe, `llmRequest` runs settle again before it builds the event.

## What reaches the reply prompt
`llmRequest` appends parts to the last user message:
- "World · here": the scene's place, its things, and who wears and carries what. Added at every level, and with the DM off.
- "World DM": the pending event. Above chronicler, with insert on, on send, next or swipe, and not in combat unless the level is antagonist or chaos.
- "Dice": a 2d6 FATE line, when the gate passes. "Pace" and "Life" are the other two rolls.
The DM's system prompt is never sent with the reply. Records reach the reply through the world book.

## If you change X, also touch Y
- Clock sizes or front fields: `cleanFront`, `applyLevel`, `clockStage`, `docs/DATA-FORMATS.md`.
- Dice bands or tilts: `DICE_BANDS`, `DICE_TILTS`, `diceOutcome`, `src/lib/world.ts`, `dice-log.tsx`.
- Record kinds or fields: `KINDS`, `cleanEntity`, `applyReport`, `entryOf`, and `docs/COUPLINGS.md`, "World DM and Dashboard shared ids".
- Anything that must rewind on swipe: `CORE_KEYS`, `undoFrom`, and the coupling in `docs/COUPLINGS.md`, "World DM rollback follows the chat's line".
- Deck size: `DECK_MIN`, `DECK_MAX`, `cleanDeck`, `DECK_SYSTEM`.

## Traps
- `DECK_MIN` (8) appears only in the deck prompt text. `deckRoute` keeps whatever the model returns.
- The roll_dice tool in `plugins/tools/plugin.js` uses Math.random and is not logged by World. World's dice are seeded per chat, message and swipe.
- `llmRequest` marks the event sent before the reply exists. A reply that never lands is caught later by `eventLost`.
- In code mode the model's tick ops are dropped silently.
- A deck card is used up only when an event is set. A catch-up run leaves the deck alone.
- `undoFrom` keeps records the player edited after the snapshot, so a deleted reply does not undo hand edits.
- A chat with no state file counts as on at chronicler; only level `off` in a state file keeps it off.

## Tests that guard it
- `test/rp-world.test.ts`: tickClocks, clockStep, clockStage, rollFate, diceOutcome, llmRequest, applyLevel.
- `test/rp-world-rollback.test.ts`: reconcile, firstGone, eventLost, the rollback route.
- `test/rp-world-start.test.ts`: Start steps, draft accept, applyLevel, applyReport.
- `test/rp-world-stage3.test.ts`: deck cards.
- `test/rp-world-ids.test.ts`, `test/rp-registry-bridges.test.ts`: applyReport and applyLevel with the registry.
- `test/rp-tools.test.ts`: rollDice.

## Not verified
- The Dashboard scene sensor (sceneOf, directionOf, sensorCarry): only called.
- Level rules beyond living and director, and the default profile blocks.
- writeBook and bindBook; sweepDue; the stagnation factors.
- hereInsert, eventInsert, the auto-mode dice text, the pace and life texts.
- The Start UI beyond DraftPanel, and the store.ts send path that waits for worldSettling.
- Whether the tests pass: they were listed, not run.
