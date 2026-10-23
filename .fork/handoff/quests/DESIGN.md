# Quests: design note (issues #94 "Threads as quests" + #86)

Status 2026-10-23: design only, no code. Scope and four choices were answered by the owner in the thread
(**Decided**); everything marked **Proposed** needs a yes (or a silent default) before code.
Roleplay code lives in the Roleplay fork (MolfarWav/Molfar.Vertep-Roleplay); this repo carries the notes.

## 0. Decided (owner, 2026-10-23)

- Scope: quests (#94 item "Threads as quests") + all of #86: the silent drop at the limit (1), threads that
  stay open forever (2), event ids that land in `other` (3). The RPG layer (#94 item) is NOT part of this.
- Shape: three kinds, **main / side / everyday**, plus **one level of steps** under a main quest. No deeper tree.
- A new quest proposed above the limit goes to a **queue of proposals** the owner sees and decides on.
- A quest that hangs open gets a **proposal to close**; the owner confirms. Never closed by code on its own
  (except everyday, see 3).

## 1. What exists today (Roleplay 4.64.0, `plugins/relations/plugin.js`)

- A thread = `{ id, text, since, status: open|resolved, by?: "user", resolvedAt? }` inside each Dashboard
  snapshot (`dashboard/state/<chatId>.json`); user edits live in the notes overlay (`thread-add`, `thread-edit`).
- Limit `maxThreads` (default 3, 1-6) counts all open threads. `applyThreads`: a new thread above the limit is
  skipped (`else if (openCount() < limit)`), no notice. The user's own add refuses with 409 at the limit.
- "Thread check" (`threadCheckText`, every `threadCheckEvery` = 5 turns): asks the sensor about threads open
  that long; nothing expires.
- Sensor reply: `threads: { open: [{id|null, text}], resolved: [ids] }`. Fast mode reuses the same rules
  (`FAST_PARTS` includes `threads`). Prompt text: block "Threads:" in `DEFAULT_PROMPTS.sensor`.
- Reply prompt: `buildInsert` lists `Open threads` (line ~2157 is the sensor input; the reply insert is built
  from the same snapshot). "Story, move": `POST /dashboard/nudge {chatId, threadId?}` stores
  `dashboard/nudge/<chatId>.json`, `nudgeText` adds one note to the next reply.
- UI: `src/components/dashboard/dash-threads.tsx` (ThreadRow, AddThread), `dash-strip.tsx`, `dash-phone.tsx`,
  `dash-wide.tsx`, `src/components/chat/story-nudge.tsx` (the split button left of Send).
- Event ids: `readEvents` maps an unknown id to `ctx.vocab.other` and pushes the raw id to `unknownIds`, which
  only `writeDebug` writes (`unknownEvents`, only with `debug` on). It strips a `family.` prefix already.

## 2. Data (Proposed)

A thread gets two optional fields, a quest is just a thread with them:

```
kind?:   "main" | "side" | "everyday"      // missing = "side" (all existing threads)
parent?: "<id of a main quest>"            // set = this is a STEP of that main quest; kind is then ignored
checked?: number                           // Thread checks survived with no change (drives 4)
```

- A step belongs to an open main quest. Resolving a main quest resolves nothing automatically; its open steps
  are listed under it as "left open" and the sensor is asked about them at the next Thread check. A step whose
  parent is gone becomes a side quest.
- The state file gets one new list next to `keptOut`: `state.proposals`:
  `[{ id, type: "open"|"close", text, kind?, parent?, threadId?, turn, why: "limit"|"stale" }]`, newest last,
  cap 8 (older ones fall off and are counted in a notice). `state.counters.proposal` for ids.
- Old files keep working: no `kind` = side, no `proposals` = empty. Snapshots stay forward compatible.
- Docs to update in the same change: `docs/DATA-FORMATS.md` "Dashboard state" (threads, proposals,
  `otherSeen`). The card and lorebook formats are NOT touched, so the card skill stays as it is.

## 3. Limits and the queue (#86 item 1) (Proposed defaults)

Config (`dashboard/config.json`), all clamped like `maxThreads` today:

| Key | Default | Range | Meaning |
|---|---|---|---|
| `maxThreads` | 3 | 1-6 | open **side** quests (keeps its name, existing configs keep meaning) |
| `maxMain` | 1 | 1-2 | open main quests |
| `maxSteps` | 4 | 1-6 | open steps per main quest |
| `everydayTurns` | 8 | 0-30 | an everyday quest is closed by code after this many turns open (0 = never) |
| `retireAfter` | 3 | 0-10 | Thread checks without change before a "close" proposal (0 = never) |

Everyday quests are not counted against any limit, but at most 5 are open (the oldest closes first).
`applyThreads` above a limit: instead of `skip`, push `{type:"open", why:"limit"}` to `state.proposals`
(unless the same text is already queued or in the resolved history, `sameText`).

User actions (notes overlay ops, like `thread-add` today):
- `proposal-accept {id, replace?}`: opens it; when its kind is full, `replace` names the open quest to close
  (the UI makes the owner pick one). Without `replace` at the limit: 409 with the reason.
- `proposal-reject {id}`: drops it; for a "close" proposal it sets `checked = 0` so it waits `retireAfter`
  more checks.
- `thread-add` at the limit stops being a hard stop: it joins the queue too ("added to suggestions") unless the
  owner replaces an open one. Decision for the owner: **Proposed** yes, because the 409 is the same silent wall.

## 4. Retirement (#86 item 2) (Proposed)

- `threadCheckText` already picks threads open `threadCheckEvery` turns. After the reply, a thread that was in
  the check and is still open with the same text gets `checked += 1`; resolved or reworded resets it.
- `checked >= retireAfter` and kind is not everyday: push `{type:"close", why:"stale", threadId}`; main quests
  are proposed the same way (never closed by code). The row shows "open for N turns, nothing moved".
- Everyday: `everydayTurns` after `since` the code resolves it (history keeps it, `resolvedAt`). This is the one
  automatic close, chosen because an everyday quest is low stakes by definition.
- Not a model call: pure code on counters the sensor run already produces. Cost: nothing.

## 5. Sensor prompt (Proposed; one new past default)

Reply shape stays backward compatible: `threads: { open: [{id|null, text, kind?, parent?}], resolved: [ids] }`.
New "Threads:" lines (short, small models read them):

- kinds: main = what the story is about now (at most `maxMain`); side = an optional line the story could drop;
  everyday = a small chore or errand of the moment, gone in a few turns.
- step: give `parent` = the id of a main quest to add a concrete next step to it; at most `maxSteps` open.
- unchanged: "A question, greeting or order with nothing at stake is not a thread."
- the input line "Open thread limit: N." becomes "Open quests: main a/2, side b/3. Open steps per main: 4."
  and each open quest carries its kind and, for steps, the parent id.

The prompt change makes `SENSOR_PROMPT_14` (the old text becomes a past default; position-based tests such as
`PAST_DEFAULT_PROMPTS.sensor.at(-n)` in `rp-dashboard.test.ts`/`rp-prompts.test.ts` shift by one). A custom sensor
prompt keeps working: a reply with no `kind` is read as side. Measure the sensor input and the reply insert
before and after with `estimateTextTokens`-style counts: free OpenRouter models have small windows.

## 6. What the reply model sees (Proposed)

- `buildInsert`: main quests first, each with its open steps indented, then side quests. **Everyday quests are
  not injected** (they live on the Dashboard only): they are flavour and the owner's token budget is small.
  Open question 1 asks if that is right.
- Proposals are never injected: they are a note to the owner, not part of the story.

## 7. "Story, move" with a twist (Proposed)

- The nudge file gets `kind: "thread" | "twist"` (missing = thread). A thread nudge can now also pick one **step**.
- New prompt `nudgeTwist` in `DEFAULT_PROMPTS` (customisable and resettable like `nudge`, listed in
  `DELETE /dashboard/config/prompts?key=`): "this reply, let something happen that belongs to none of the open
  quests, but grows out of what is already present: the place, a character's habit or a loose end. Nothing from
  nowhere." Same safeguards as the nudge: only on send/next/swipe, consumed on use, 30 minutes to live.
- Afterwards the sensor may open a new quest from the twist; that goes through the normal limits and queue.
- UI: the split button in `story-nudge.tsx` becomes a small list: Any quest / Main: ... (with its steps) / Side:
  ... / Twist. The armed chip shows which.

## 8. Event ids (#86 item 3) (Proposed; needs real chats to tune)

Done in a second commit so it can be dropped without touching quests.
1. **Fuzzy match** in `readEvents` before falling back to `other`: normalise (lowercase, drop non-letters, drop a
   `family.` prefix, drop a trailing `ing`/`ed`/`s`), try exact on normalised ids and on each vocabulary row's
   aliases, then edit distance <= 2 for ids of 6+ letters; the best single match wins, a tie means `other`.
   Pure function, unit-tested on the ids from the issue (`jealousy`, `check_on_her`) and the real ones in
   `data/_debug/dashboard-runs.json`.
2. **A view of `other`**: `state.otherSeen = { "<raw id>": { n, lastTurn, quote } }`, cap 30 ids (least seen
   falls off), always on (not only with `debug`). Shown in Dashboard settings > Events as "Not recognised" with
   counts and a button "Add as event" that opens the existing user-vocabulary row editor (`PUT /dashboard/events`)
   with the id filled in. This also gives the data to decide which of the issue's candidate ids to add
   (introducing oneself / learning a name, inviting to meet, standing one's ground, an ultimatum, a veiled leverage
   threat): add a built-in id only after it shows up repeatedly in `otherSeen`.
3. **A `significant` event with an empty quote** is kept but downgraded to `notable` and counted in `keptOut`-style
   notice ("N events without a quote were lowered"). Open question 3.

## 9. UI (Proposed; run skill `ux-review` before building and before done)

`dash-threads.tsx` becomes the quests panel:
- **Main** quests as cards: title, "2 of 4 steps" (resolved/total), steps as a checklist under it, "Add step",
  resolve, edit, move kind (a small menu: Main / Side / Everyday).
- **Side** rows as today. **Everyday** collapsed under "Everyday (N)".
- **Suggestions** block above the lists when `proposals` is non-empty: "New: ..." with Accept / Reject (Accept at a
  full kind opens "Replace which quest?"); "Close?: ... open for N turns" with Close / Keep open.
- Strip (`dash-strip.tsx`): the main quest's title only (the progress count if steps exist). Phone tab: the same
  panel stacked, 40 px targets, no sideways scroll. All new strings en + uk. Nothing here is a new shell string.
- Settings (`dash-settings.tsx`): the five keys of section 3 in the existing thread block.
- Guide tip: one new tip `help.quests` (and `help.threads` text moved to it); `APP_VERSION` in `guide-tips.ts`.

## 10. Order of work and checks

Roleplay fork branch `claude/quests` from fork main (4.64.0), worktree `E:\Claude\rp-quests`; release as
Roleplay 4.65.0 on the owner's word (pushing to the fork's main ships to every install: ask first).
1. Server: data, limits, queue, retirement, sensor prompt + past default, insert, config validation, routes. Tests
   (`rp-dashboard.test.ts`, new `rp-quests.test.ts`): limit overflow queues instead of dropping, accept with and
   without `replace`, stale proposal after `retireAfter` checks and reject resets, everyday auto-close, a step
   under a resolved main becomes side, old snapshots read as side, custom sensor prompt with no `kind`.
2. UI: quests panel, suggestions, strip, phone, settings, nudge picker. UI drafts by an external model from a
   precise spec (`ask-model`); a subagent integrates and runs `browser-check` (1280 dark, 390 light, uk).
3. Twist nudge (server + picker).
4. Event ids (section 8).
5. DATA-FORMATS, CHANGELOG, tips, `APP_VERSION`, version; `bun run typecheck`, `bun test`, browser walk-through.
No engine change is expected. Not in scope: the RPG layer (`.fork/handoff/rpg-layer/IDEAS.md`), World DM fronts
(a front is a world clock, a quest is the characters' story; a link between them can come later), Litopys.

## 11. Open questions for the owner (recommended answers first)

1. Everyday quests: Dashboard only, not sent to the reply model (recommended), or sent too?
2. Defaults `maxMain` 1 and `maxThreads` 3 for side quests: one main quest keeps small models focused; two?
3. A `significant` event without a quote: lower it to `notable` (recommended), or leave as it is?
4. `thread-add` at a full limit joins the proposal queue instead of failing with 409 (recommended)?
5. When every step of a main quest is resolved: only suggest "close the main quest?" at the next Thread check
   (recommended), or nothing special?
