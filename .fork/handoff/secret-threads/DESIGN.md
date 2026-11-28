# World DM: secret threads (#545), thread age (#544), chapters before arcs (#543)

Design and UI plan, 2026-11-28. No code yet: waits for the owner's "ok".
Read at Roleplay 4.166.0 (`e0a4764a`). Names of functions are the anchors.

## Order and release

1. #544 (a few lines).
2. #543 (Litopys).
3. #545 server, then UI, then the bench on free models.

One Roleplay branch, one Roleplay release. No engine code.

---

## #544 The DM sees how long a thread has waited

- `plugins/world/plugin.js` `dashThreads`: add the age to each line: `<text> (open for N turns)`,
  `N = snapshot.turn - thread.since`. No age when either number is missing or N < 1.
- Units match: sensor threads get `since = turn` of the snapshot, user-added ones `since = snap.turn`.
- `levelInput`, the "Open threads" line, gains one sentence: a thread that has waited long is a good one
  to move or pay off. No stock examples (#506).
- No UI, no setting, no new call.
- Tests: `rp-world` (age in the input; no age on a missing field).

## #543 Send the original chapters while they fit

Behaviour (`plugins/litopys/plugin.js`):
- `buildInsert`: before the full-record check, build the head from the **original** chapters
  (`allBefore`). If that head plus the facts tail fits the budget, send it. Else today's path
  (arcs in place of their chapters, then ranked).
- `arcMode: "off"` means off: `buildInsert` ignores existing arcs, and `arcWork` returns before it
  re-merges a stale one. Arcs stay in the file and come back when the mode does.
- `arcsView` (the Library's "used in the insert" flag) follows the same rule.
- Not touched: far digest, backstory, summaries.

Setting (Settings > Memory > block **Arcs**, `memory-summary-section.tsx`):
- one switch row under the mode select, with the block's own `switchRow`:
  "Send chapters while they fit" / "An arc takes their place only when the chapters no longer fit the
  memory size." Config `arcsWhenNeeded`, **default on**. Hidden when the mode is Off.
- the hint of mode Off says arcs are neither made nor sent.

Cache: the head changes when the record crosses the budget, as the full-to-ranked switch does today.
Tests: `rp-litopys-budget` (fits: chapters; does not fit: arc; switch off: arc; mode off: chapters,
no stale re-merge). Docs: guide `litopys`, Help article if one names arcs, handbook `roleplay-litopys`.

---

## #545 Secret threads

### Decided by the owner (issue comments)
Optional; not in the Dashboard quests; the DM creates them; levels above chronicler; 1 by default,
up to 3; tone follows the DM level; spoiler reveal; short hints on their own timer (default 6 replies,
0 = off) held when the reply has a DM event or a Direction note, in a fight or an explicit scene; at
most 1 event in 3 from a thread, past the events deck; group chats included; a log for testing.

### UI plan

Where: the chat's World controls (`world-controls.tsx` `WorldControls`), so it appears both in the
chat's World sheet and on the World page's overview. From a chat: open World, scroll to the card (2 steps).

Variants:
- **A.** Rows inside "Events and dice". Short, but that card is already long, and the spoiler list and
  log would be buried in it.
- **B. (pick)** An own card **"Secret threads"** after "Events and dice", built like the cast card
  (`Section variant="tinted"`, `SettingRow`, `Segmented`, `Fold`).
- **C.** A tab on the World page. Easy to read a long log, but out of reach from the chat.

Card, top to bottom:

| Row | Control | Text (en) |
| --- | --- | --- |
| Threads | `Segmented` Off / 1 / 2 / 3, default Off | "Hidden through-lines the DM keeps and plays. You do not see them unless you look." |
| Hint every | `NumControl` 0..30, default 6 | "Replies between quiet hints to the story. 0 = events only." |
| Mark replies with a hint | `Switch`, default off | "A small mark under a reply that carried one. For testing; shows no secret." |
| Status | one line, no spoilers | see states |
| Look | outline button "Show (spoilers)" | opens the fold below after a confirm |

The fold (after confirm, `useConfirm` as in `use-world-book.tsx`, once per session via
`world-reveal.ts`, key `s:<chatId>`):
- per thread: the idea, what has surfaced, the next hint, status; actions **Edit** (dialog: idea and
  next hint), **Drop** (confirm), and **Send the hint next** (testing);
- **Log**, newest first, like `CastLog`: hint sent / held (and why) / event from a thread / thread
  added, finished, dropped.

States:
- DM off: card dimmed with a note, like "Events and dice". Chronicler: card hidden, as that card is.
- Off (chip "Off"): only the first row.
- On, none yet: "The DM makes the first one on its next run." Button hidden.
- On: "1 thread · next hint in 4 replies"; held: "hint waits: a fight" (or: an event in this reply,
  a Direction note).
- Loading the secrets: skeleton in the fold; error: toast and the fold stays closed.
- Phone (390 px): `Segmented` full width, buttons 40 px or more, thread actions wrap under the text.
- Chip on the card header: "Off" or "1 thread · every 6".

Mark under a reply: the same path as the cast mark (`dice-note.tsx`), "Secret hint", no content.

### Data (`world/state/<chatId>.json`)

- `settings.secrets` 0..3 (0), `settings.hintEvery` 0..30 (6), `settings.secretShow` (false).
- `secrets: [{ id: "s1", idea, surfaced: [..last 4], hint, hintAfter?, status: "active"|"done", at, by }]`.
  Text caps: idea 300, hint 200. Done ones: keep the last 3.
- `secretOrigins`: origins of the last events set (for 1 in 3). `secretMark: { after, id }`: the reply
  the last hint followed. `secretLog`: last 30 rows.
- `secrets`, `secretOrigins`, `secretLog` join `CORE_KEYS`, so a swipe or delete takes the DM's changes
  back. `undoFrom` keeps the player's later edits and drops, as for records.
- `secretMark` is checked against the chat's messages, like `breath`: a deleted carrier frees the timer.

### The DM run (no new call)

Only when `secrets > 0`, level above chronicler, a full run. Off: the prompt is byte-identical to today.
- Added to the system prompt: the secrets block rules (yours alone: never write them into records,
  summary or any other field; keep at most N; add one that fits this level's genre when fewer; give
  each a next hint: one concrete detail, not an explanation). No stock examples.
- Added to the input: the active threads (id, idea, surfaced, how long untouched), and whether this
  run's event may serve a thread.
- Output: `"secrets":[{"op":"add","idea","hint"},{"op":"update","id","surfaced","hint"},{"op":"done","id"}]`
  and `"event":{"text","secret":"s1"}`.
- Code (`applyLevel`): caps and ids by code. An event marked with a thread uses its own text, even with
  the deck on, and takes no card; the deck prompt says so. Marked while not allowed (one of the last
  two events was a thread's): the event is dropped and logged.
- Known limit: a thread's event the model does not mark is not counted.

### The hint (`llmRequest`, code only)

Due when: `secrets > 0`, `hintEvery > 0`, `settings.insert`, level above chronicler, `hintEvery` replies
since `secretMark` (reuse `pauseLeft`), and a thread has an unused hint. The first one waits the same
number of replies after the first thread appears.
Held (logged with the reason) when this reply already has: a DM event, a person coming back, a Life
intrusion; a queued Direction beat or rule note (`direction/state/<chatId>.json` `next`, read only:
World runs first and Direction does not yield to a hint); the scene is combat or explicit.
Which thread: the one whose hint went longest ago.
Sent as one part, label **"World DM · secret hint"**, appended to the newest user message:
`[A quiet detail for this reply, if it fits: {hint} Show it in passing; do not explain it or draw
attention to it, and never mention where this note came from.]`
A swipe of the carrier sends the same hint again. A used hint is not repeated: the next DM run writes a
new one.

### Where a secret must not leak

- `stateView`: counts and timer only. Content comes from `GET /world/secrets` after the confirm.
- Run summaries and the error details of a bad DM reply (the raw text): strip or hide when threads are on.
- World records and the world book (prompt rule only: code cannot recognise a paraphrase).
- Saving a world to the library: threads are not saved. A copied or branched chat keeps them.
- The prompt inspector shows the DM's request and the hint: left as is, it is the testing view.

### Other places to touch

- Routes: `GET /world/secrets`, `POST /world/secrets` (`edit`, `drop`, `next`).
- `plugins/engine/plugin.js` `hookInsertTable`: reserve row "world secret hint" (about 120 tokens).
- Strings in every app language; guide page `world-dm`; Help article about the World DM
  (`help-articles.json`); `docs/DATA-FORMATS.md`; `docs/COUPLINGS.md` (World reads Direction's `next`);
  handbook `roleplay-world-dm`, `roleplay-direction`, `roleplay-prompt-assembly`.
- Tests, new `test/rp-world-secrets.test.ts`: off changes nothing; add, update, done, limit; 1 in 3;
  deck untouched; timer, each hold, swipe, delete; rollback and player edits; no secret text in
  `stateView`; routes.

### Bench before release (question 7)

Free models through OpenRouter, synthetic story, 20 DM runs each: JSON survives the extra keys (the
DM's `maxTokens` is 1500: count cut-offs), ids stay stable, a secret does not show up in records or
summary, how often a thread's event is left unmarked, whether hints read as one detail.

## Choices made here that the owner can overturn

1. Own card (variant B), count as Off / 1 / 2 / 3, off by default, per chat only (no profile default).
2. The mark under a reply, off by default.
3. Hints are also held by a returning person and by a Life intrusion, not only by a DM event.
4. The hint's wording is fixed (not an editable profile block) in the first version.
5. #543: switch on by default; mode Off stops sending existing arcs.

## Built (2026-11-28), and where it differs from the plan above

- Roleplay branch `claude/secret-threads-545` (`d8d67bd4`), not merged, not released.
- The run summary is dropped only for a run that added or finished a thread (not for every run of a chat with threads).
- The DM input does not say how long a thread has been untouched.
- The profile blocks and the hint wording are not editable.
- #543 had no "used in the insert" flag to change in the Library; with Arcs off the arc card says "Not sent: arcs are off" and loses "Merge again".
- Not done: the bench on free models (question 7); the Arcs switch was not screenshotted at 390 px.
