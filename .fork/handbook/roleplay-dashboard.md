# Dashboard: the sensor pass, relations, the character journal, the clock
Verified at: molfar.vertep-roleplay 91eec33

## What it does
- After a reply, a sensor model call reads the new messages and returns one JSON report: present people, clock, scene, events, each character's mood, condition, outfit, holding and goal, what each learned, what was said or promised, threads (quests), journal lines and edges between people.
- The report carries no relationship numbers. Code derives stats from events and stores one snapshot per `<msgId>#<swipe>`.
- Before the next reply, a "Relationship dashboard" block is built from the snapshot, with "Dashboard · journal" and "Dashboard · said" parts, placed just before the newest turn.
- The story clock is advanced by code from the report.
- A swipe, edit or Continue leaves later snapshots built on text that is gone. Those are dropped and read again.

## Owners
- `plugins/relations/plugin.js` `sensorSystem`: builds the sensor's system prompt from prompt text, event vocabulary and output shape.
- `plugins/relations/plugin.js` `OUTPUT_SHAPE`: the JSON shape the sensor is asked for; `OUTPUT_SHAPE_NO_JOURNAL` is derived from it.
- `plugins/relations/plugin.js` `askSensor`: sends the sensor call (model from `sensorModel`, else the chat model; temperature 0.2).
- `plugins/relations/plugin.js` `parseSensorText`: reads the JSON, tolerates a code fence, keeps a cut-off reply's complete fields as `__partial`.
- `plugins/relations/plugin.js` `runUpdate`: runs the passes (rating, sensor, one retry on rate limit, commit).
- `plugins/relations/plugin.js` `readUpdate`: the `/dashboard/update` route; between passes it returns `__llmPending` with a stash.
- `plugins/relations/plugin.js` `planUpdate`: finds the active line, the newest key and the base snapshot, and decides what to read again.
- `plugins/relations/plugin.js` `standingFrom`: the last snapshot on the line that still stands.
- `plugins/relations/plugin.js` `dropSnapshot`: removes one snapshot with its notebook, names, history, journal and place lines.
- `plugins/relations/plugin.js` `commitUpdate`: a non-JSON reply records `lastError` and keeps the old state; otherwise it applies the report.
- `plugins/relations/plugin.js` `applySensor`: writes the snapshot, runs the apply functions, keeps the newest `SNAPSHOT_LIMIT` (40).
- `plugins/relations/plugin.js` `charEntry`: one character's stats, mood, condition, outfit and holding ledger, and thought.
- `plugins/relations/plugin.js` `applyNotebook`: what each character saw, heard or guessed.
- `plugins/relations/plugin.js` `applySaid`: vows, promises, threats and similar lines, limited per turn.
- `plugins/relations/plugin.js` `applyThreads`: quests (main, side, everyday) and their steps.
- `plugins/relations/plugin.js` `applyJournal`: stores up to `JOURNAL_PER_TURN` (2) journal lines per turn.
- `plugins/relations/plugin.js` `keepJournalLines`: keeps the newest `JOURNAL_KEEP` (4) sensor lines per character and person.
- `plugins/relations/plugin.js` `journalPreviousLines`: the people lines shown to the sensor, never a thought.
- `plugins/relations/plugin.js` `journalBlock`: the "[What <name> thinks and feels (journal)" block, trimmed to budget.
- `plugins/relations/plugin.js` `advanceClock`: moves day, time, band and minutes forward.
- `plugins/relations/plugin.js` `buildInsert`: builds the reply insert and trims it to budget.
- `plugins/relations/plugin.js` `withTailInsert`: places a system message before the newest turn.
- `plugins/relations/plugin.js` `insertCeiling`: the token rows the engine reserves for the Dashboard.
- `plugins/relations/plugin.js` `llmRequest`: adds the parts to the reply request and labels them.
- `plugins/relations/plugin.js` `voicesRoute`: voice colours per chat (UI only).
- `src/components/dashboard/use-dashboard.ts` `useDashboard`: the UI's calls, among them `/dashboard/update` with `op: send`.
- `src/components/dashboard/dash-journal.tsx` `JournalBox`: the journal panel of one character.
- `src/lib/chat-voices.ts` `useLoadChatVoices`: loads a chat's voice colours.

## Data
- `data/dashboard/state/<chatId>.json`: `snapshots`, `places`, `notebook`, `names`, `history`, `said`, `journal`, `counters`, `usage`, `lastError`, `calendar`, `removed`, `personIds`. A snapshot holds `turn`, `at`, `sig`, `base`, `clock`, `scene`, `present`, `events`, `chars`, `layout`, `edges`, `threads`.
- A character in `chars` holds `mood`, `condition`, `outfit`, `holding` (texts of an `items` ledger, each `{id, kind: wear|hold, text}`), `goal`, `leads`, `at`, `stats`, `thought`, `thoughtTurn`.
- `data/dashboard/notes/<chatId>.json`: the user's notes and threads. Updates never write it.
- `data/dashboard/voices/<chatId>.json`: `{v, mode, colors, hand}`, one colour per person.

## When a model is called, and when code decides
- Model: the sensor call, one per reply. In fast mode the reply carries a `<vertep_state>` tag and `fastReply` uses it instead. A card with no soul is rated first.
- Code: stats, clock, snapshot keys, stale snapshots, journal and said caps, insert text, trimming and budget.
- The model supplies words and ids only. Stat values come from `applyTurn`.

## Flow
1. The reply ends. The UI posts `/dashboard/update`. `readUpdate` calls `runUpdate`, which calls `planUpdate`.
2. Snapshots after the base that no longer match the line are dropped. With no new messages, the update stops with no model call.
3. `askSensor` sends the prompt. The route returns `__llmPending` with a stash, and the host calls it again when the answer is in.
4. `commitUpdate` parses the answer. A non-JSON answer sets `lastError` and keeps the old state. Only a rate-limit error is retried.
5. `applySensor` writes snapshot `K`, then runs `applyNotebook`, `applySaid`, `applyJournal`, `applyThreads` and `applyEdges`, and saves the file only if it changed.
6. A journal line is stored only about the user or a present character, and only when it differs from the current one. `keepJournalLines` then trims that pair to four sensor lines.
7. Before the next reply, `llmRequest` calls `buildInsert`, which reads the snapshot the line stands on.
8. `journalBlock` and the said block follow the Dashboard block; each goes in with `withTailInsert`, in that order.
9. A swipe rolls back by reading the snapshot before its target. Later snapshots are dropped with `dropSnapshot` and read again from the last one that stands.

## What reaches the reply prompt
- "Relationship dashboard": the scene line, one block per focused character (the speaker, or up to `FULL_FOCUS` (3) in a group or narrator chat), notebook lines, layout, edges, an "Also present" line, open threads (main quests first, with steps) and a closing line. Words only.
- "Dashboard · journal": `journalBlock` for each focused character whose notebook may show. The thought appears only while fresh (`thoughtTurns`, default 3). People lines are cut to `journal.maxTokens` (40 to 400).
- "Dashboard · said": a fixed room of `SAID_TOKENS` (120).
- "Dashboard · note", "reminder" and "fast sensor" appear only with a nudge or fast mode.
- Voice colours never reach the prompt.

## If you change X, also touch Y
- Sensor output shape: the default sensor prompt parts, `applySensor` and the apply functions that read each field, `docs/DATA-FORMATS.md` "Dashboard state", `test/rp-dash-journal.test.ts`.
- Journal fields or caps: `keepJournalLines`, `journalPreviousLines`, `journalBlock`, prompt board key `plugin:journal` in `llmRequest`, the journal row in `docs/COUPLINGS.md`.
- A new insert part or budget: `insertCeiling` must match `buildInsert`, and the engine's fallback table must change with it (`docs/COUPLINGS.md`).
- The clock: `advanceClock`, `clockLine`, `NEW_DAY_BACK`, `test/rp-dash-clock.test.ts`.
- Lie beliefs: `believersOf` has a copy in the Litopys plugin (`docs/COUPLINGS.md`, beliefs).
- Name helpers: `askSensor` depends on `expandNamesFor`, which has copies in other plugins (`docs/COUPLINGS.md`, helper names).

## Traps
- A non-JSON answer is not retried. Only a rate-limit error is.
- A snapshot without `sig` is never read again.
- The sensor sees the previous people lines but never the previous thought.
- A clock time the report does not state is marked approximate. The day count only moves forward.
- A new insert part without a row in `insertCeiling` overflows the window silently.
- A user journal line always wins over a sensor line. No route writes user lines yet.
- The comment above `journalPreviousLines` and `test/rp-dash-journal.test.ts` cited `docs/JOURNAL-HANDOFF.md`, a handoff file deleted in the commit that built the journal (03978ad). Both now point at `docs/DATA-FORMATS.md`, "The character journal" (Roleplay branch `claude/handbook-findings`, 0185b00).

## Tests that guard it
- `test/rp-dashboard.test.ts`: partial JSON, a non-JSON answer keeps the old state, the insert in `llmRequest`.
- `test/rp-dash-clock.test.ts`: `advanceClock` and the scene line of the insert.
- `test/rp-dash-journal.test.ts`: `OUTPUT_SHAPE`, `llmRequest`, `journalBlock`.
- `test/rp-insert-ceiling.test.ts`: `insertCeiling` rows.
## Not verified
- The 10 second plugin limit. `docs/COUPLINGS.md` cites a 10 second sandbox cap and a 20 second `CALL_TIMEOUT_MS`, but that constant is in the engine repo. No route-level limit was found here.
- The engine's reserve and fallback table for `insertCeiling`.
- Swipe rollback has no test read here. `test/rp-quests.test.ts` and `test/rp-dash-said.test.ts` were not opened.
- The UI loop in `src/lib/store.ts` that waits for `__llmPending`: the function holding it was not identified.
- `test/rp-dash-journal-box.test.tsx` was not read.
