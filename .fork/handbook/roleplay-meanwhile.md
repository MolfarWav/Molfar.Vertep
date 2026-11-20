# Meanwhile: life off screen (the rules; no routes and no model call yet)
Verified at: molfar.vertep-roleplay branch claude/stage-backstage-448-449 (M1a)

## What it does
- People who are not in the scene act while time passes, and what they did becomes knowledge (#449). This first piece (M1a) is only the rules, as pure exported functions; `handleRoute` answers nothing, the plugin writes no file and calls no model. M1b adds the routes and the model call, M2a the Litopys wiring, M1c the panel.
- Design and decisions: engine repo `.fork/handoff/meanwhile-449/DESIGN.md`.

## Owners
- `plugins/meanwhile/plugin.js` `cleanEvent`: one event from the model's object, or the reason it fails. Nothing is repaired.
- `plugins/meanwhile/plugin.js` `buildEvents`: numbers the survivors (`m1`...), at most `k`, drops a repeated `what`.
- `plugins/meanwhile/plugin.js` `registryIndex`, `presentIds`: the registry's entities with merges followed; who stands in the scene, by name, alias or id (plain lower case, not the registry's `resolveName`).
- `plugins/meanwhile/plugin.js` `dueReason`: whether a pass is due: switch on, not in a fight, at least `minReplies` replies after the cursor, then a new scene (`scene.new` in a Dashboard snapshot after the cursor) or a story-clock jump of `clockHours`.
- `plugins/meanwhile/plugin.js` `reconcile`, `dropUndone`, `recordPass`: rollback by message key; the cursor goes back to the newest pass still on the line.
- `plugins/meanwhile/plugin.js` `buildPrompt`, `parseEvents`: the request text (lists capped) and the reader of the answer.
- `plugins/meanwhile/plugin.js` `factDraft`: the Litopys fact an event becomes; `spoilerView`: what the panel may show.
- `plugins/meanwhile/plugin.js` `cleanConfig`, `cleanState`, `emptyState`.

## Data
`meanwhile/config.json` and `meanwhile/<chatId>.json`; shapes in Roleplay `docs/DATA-FORMATS.md`, "Meanwhile". Nothing writes them yet.

## When a model is called
Never yet. M1b: one call per due pass under its own key, with its own model pick.

## Flow (planned, M1b)
1. After a reply the client asks; `dueReason` decides from the Dashboard's snapshots.
2. `buildPrompt` -> model -> `parseEvents` -> `buildEvents` -> `recordPass`; facts go to Litopys through a route inside Litopys (M2a), never by writing `litopys/chats/<id>.json` from here.
3. Every read first calls `reconcile` on the chat's line.

## If you change X, also touch Y
- Event fields or effect types: `cleanEvent`, `cleanEffect`, the prompt's rules in `SYSTEM`, `spoilerView`, `factDraft`, Roleplay `docs/DATA-FORMATS.md`.
- Who may take part: the checks in `peopleList` and the "player never knows" line in `factDraft`; `test/rp-meanwhile.test.ts` guards both.

## Traps
- A person in the scene is found by name or alias in plain lower case; a transliterated spelling is missed. M1b should use the registry's `resolveName`.
- An event's `where` may be free words; only an `l#` id is checked against the registry.
- `reconcile` marks events `undone` and keeps them: the caller must retire their facts, then call `dropUndone`, or the facts outlive the swipe.
- A reasoning model can answer with nothing (it spent the whole budget thinking): M1b retries once with more room, as World does.
- Item and NPC-move effects pass the checks but can be silly (a stolen ledger moved by an unrelated event); M1b applies only `front_clock` and `relation` by itself.
- A pass needs Dashboard snapshots; a chat with the Dashboard off is never due (`no-dashboard`).

## Tests that guard it
`test/rp-meanwhile.test.ts` (24 tests: the checks, `dueReason`, rollback, state and config, the prompt and the reader, the fact and the spoiler view).

## Not verified
- Small-window and weak models, and the owner's own chats. A bench with five models on an invented world (22 calls, English and Ukrainian) is in the engine repo `.fork/handoff/meanwhile-449/bench/`: every answer parsed, 53 of 53 events passed the rules, no one in the scene or the player in `who`; one empty answer from a reasoning model.
- The prompt's size: an estimate of about 4 characters a token, 544 to 558 tokens on the test input, not measured with the inspector.
- How Litopys will take the fact (M2a is not built).
