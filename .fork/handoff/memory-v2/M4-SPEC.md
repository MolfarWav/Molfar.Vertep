# M4 spec: the Library (Roleplay), editing, arcs, originals

Part of `PLAN.md` (read "Decisions", "Data format", "Library look"). Prepared 2026-10-07 at the end of
the M3 session; built in a NEW session. M3 is in the desktop workspace for the user's live test:
read `.fork/STATE.md` first for its result and any fixes it asked for.

## Starting point
- Roleplay clone `.claude/worktrees/rp-memory` (desktop main checkout `E:\Claude\Chrysalis-Engine`),
  branch `memory-m3` (pushed to the fork `MolfarWav/Molfar.Vertep-Roleplay`, not main). Make
  `memory-m4` from it. No version bumps, no CHANGELOG, never commit `bun.lock`.
- Litopys today (`plugins/litopys/plugin.js`): chapters + facts + proposals per chat
  (`data/litopys/chats/<chatId>.json`), worker (one call per closed scene), insert hook, cut,
  sweep, rebuild as a shadow generation (`st.rebuild`), view routes `GET /litopys/chats`,
  `GET /litopys/chat`, config routes, `POST /litopys/rebuild`. UI: `src/components/library/`
  (rail section `litopys-view.tsx`, shared `LitopysChatDetail`, chat sheet `chat-record-sheet.tsx`,
  `chapters-list.tsx`, `facts-list.tsx`, `proposals-list.tsx`, `worker-line.tsx`, `litopys-api.ts`).
- Mockups: the parts the user picked are listed in `M4-mockups.md` (an external model's
  inventory); the HTML lives untracked in the desktop main checkout `.fork/ui-assets/library/`
  (A.html Chronicle, B.html Codex, C.html Ledger, D.html Threads). Made-up data only.

## User decisions for M4 (2026-10-06/07)
- Two modes over the same data, a tab inside the Library: "Overview" (A's chapter timeline with
  facts under each chapter + cast rail; B's character cards + proposals column; D's graph of chats)
  and "Ledger" (C: chat list, tabs Chapters / Facts / Proposals / Activity, filters, search,
  inline actions). Editing (edit, pin, retire, delete) works in BOTH modes.
- Order of work: M4a editing API + proposals → M4b Ledger → M4c Overview → M4d arcs, originals,
  size check → M4e leftovers.
- Bridges between chats come AFTER M4, but inside the Library itself (its facts and chapters),
  not as a separate plugin. M4c's graph shows chats and their fork lineage (`parentChatId`) and
  keeps a disabled "Draw a bridge" control as the slot for it.
- Pins: at most `pinLimit` (5) per character; only the user pins; the worker may PROPOSE a pin
  for a key fact. Unpinning says the fact stays in the record and comes back when relevant.

## M4a Litopys editing API (plugin; orchestrator writes the data rules, tests by an external model)
All routes take `chatId` (SAFE_ID), re-read the chat file, apply, save, and answer the chat view
(`chatView`). Every change appends to `st.activity` (newest last, keep 100):
`{ at, by: "user"|"worker"|"sweep"|"notes"|"rebuild", kind, text, ids }`; the worker, sweep,
notes move and rebuild write their entries too (Activity tab).
- `POST /litopys/facts { chatId, op, id?, ... }`, op:
  `add {text, subject, knownBy, type, weight}` (origin "user"), `edit {id, text?, subject?,
  knownBy?, type?, weight?}` (sets `edited: true`, `updatedAt`), `pin {id}` / `unpin {id}`,
  `retire {id}` / `restore {id}`, `delete {id}` (gone for good). Pin over the limit for that
  subject answers 409 `{ error: "pin limit", pinned: [facts] }` so the UI opens the pin limit
  dialog; `pin {id, replace: otherId}` unpins the other one in the same write.
- The worker never changes an `edited` fact: its update/retire ops on one become proposals.
- `POST /litopys/chapters { chatId, op, id, ... }`: `edit {label?, text?}` (`edited: true`, the
  worker never rebuilds it), `rewrite` (`stale: true, edited: false`: rebuilt in place by the
  worker), `delete` (removes it; its scene is chaptered again unless the user also chose
  `keepGone: true`, stored as `st.skipScenes: [{from,to}]` that pickWork skips).
- `POST /litopys/proposals { chatId, id, op: "accept"|"reject" }`: accept applies it
  (merge: retire the targets, add the merged text; retire; rewrite: edit text; pin: pin with the
  limit rule), status accepted/rejected, kept for the Activity tab.
- Concurrency: check in the engine (`src/plugins/runtime.ts`) whether a plugin's routes and its
  schedule tick can run interleaved. If they can, add `st.rev` (incremented on every save) and
  make saves compare-and-retry; either way a route must never save a state it read before an
  `await`.
- Tests for every op, the pin limit, worker vs edited facts, proposals, activity.

## M4a+ The worker is visibly alive (user, 2026-10-07, from the live test of M3)
Seen live: during "Rebuild from scratch" the record showed "Rebuilding: 2 chapters so far" while the
worker line said "The worker has not run for this chat yet": the rebuild generation keeps its own
`st.rebuild.worker`, and the view only shows `st.worker`. Nothing told the user whether the
background work was moving, waiting for the model, or dead.
- Data (plugin): when the tick sends a worker request, record `worker.inFlight = { key, from, to,
  since }` on the generation it works for (cleared when the result is applied or fails);
  `chatView` returns the worker of the generation in progress (the rebuild one while rebuilding)
  plus `inFlight`, `lastProgressAt` (last chapter written) and `next` (closed scenes left).
- UI, everywhere the worker line shows (Ledger, Overview, the chat sheet, the chat list dot): a
  spinning ring while a request is in flight ("writing the chapter for messages 41-60, 25 s"), a
  steady dot when idle with nothing to do, an amber "waiting to retry at 12:40" after a failure,
  and a red "no progress for N minutes" when work is left but nothing moved for 3 ticks or more
  (the model or the engine may be down); the rebuild line shows "chapter 3 of about 9". Poll every
  5 s while something is in flight, 15 s otherwise.

## M4b Ledger (UI; components drafted by an external model from this spec + C.html)
- The rail section becomes "Library" (uk "Бібліотека"); keep the `litopys` section id or
  migrate it so the rail position stays next to Lorebooks. A mode switch Overview | Ledger.
- Ledger: chat list (title, status dot from worker ok/error, fact and chapter counts, cast
  names); tabs Chapters / Facts / Proposals / Activity with counts; Facts filter bar (search,
  type, weight, who = subject or knownBy, state active/pinned/retired/superseded); inline
  actions on hover and in a ⋯ menu for touch: Edit (inline editor), Pin/Unpin, Retire/Restore,
  Delete (confirm); chapters: Edit, Rewrite, Delete; proposals: Accept, Reject; pin limit dialog
  (radio list of the subject's pinned facts, Cancel / Replace).
- The chat's record sheet (M3) becomes the same Ledger for one chat (no chat list).
- Phones (390 px): tabs never clipped (wrap or a select), actions in the ⋯ menu.

## M4c Overview (UI; from A.html, B.html, D.html)
- Chapter timeline (A): chapters in story order, each with the facts whose `src.chapter` is it,
  badges stale / part / edited / merged, same actions as the Ledger.
- Cast rail (A) and character cards (B): per subject: pinned facts, traits, lasting changes,
  "knows about others" (facts whose knownBy holds the character and whose subject is someone
  else); the world card spans two columns. Portraits from the character cards when the name
  matches a card (the app already resolves names to cards for the dashboard: reuse that).
- Proposals column (B).
- Graph of chats (D): SVG, nodes = chats (radius by fact count), lines = fork lineage; click
  selects and shows the chat's newest facts and first chapters; "Draw a bridge" present but
  disabled with a "coming next" hint (bridges are the next item after M4).

## M4d Arcs, originals, size check (plugin; orchestrator designs, external model drafts)
- Arcs: when the chapters before the cut do not fit the insert budget, neighbouring older
  chapters merge into an arc (one model call per merge, English, consequences only), stored as
  `st.arcs: [{ id, chapterIds, from, to, label, text, sig, at }]`. The insert takes the newest
  chapters whole and older stretches as arcs; a stale chapter makes its arc stale (rebuilt).
  Design the exact trigger with token numbers before building (measure real chats first).
- Originals: `GET /litopys/messages?chatId&from&to` (the messages behind a chapter or a fact's
  src, read-only) and `GET /litopys/search?chatId&q&before` (plain case-insensitive search over
  the ORIGINAL messages, never the summaries; 20 hits newest first: id, number, date, snippet,
  the chapter that holds it). UI: "Open the messages" on a chapter and a fact; the Ledger search
  box searches facts and, with a toggle, the originals.
- Size check: a chapter whose text is longer than the text of the messages it replaces is
  rejected and the call retried once with "at most N words" (N = a third of the source words).

## M4e Leftovers from M3
- 390 px: the record's third tab clipped (fixed by M4b), "Про: world" untranslated, English
  "Back" from MasterDetail on phones, old chat-menu items and Settings strings still English.
- `chapterSig` needed when seeding test data by hand (the browser check found it): document it in
  the test kit.

## How to work (standing rules, see CLAUDE.md and ~/.claude/CLAUDE.md)
- External models through `ask-model` (NanoGPT first) for every token-heavy job: component
  drafts, tests, translations, reviews, reading big files. Sonnet subagent only for the browser
  check (local tools). Small fixes directly.
- Poke the executors: every call under `timeout`; long ones in the background with a Monitor on
  the output file and the process; kill, shrink or switch model when stuck. Lessons from M3:
  whole files of 1500+ lines hang or loop, so ask for marked blocks or FIND/REPLACE edits and apply
  them with `.fork/tools/` (README there); Kimi K2.7 Code
  needs `--max-tokens` 60000; inputs over ~200k tokens time out; DeepSeek V4 Pro is fast for
  edits and inventories (30-90 s).
- Never send workspace data or chat text to external models; repo code and made-up examples only.
- Copy into the desktop workspace only with the user's ok, after checking each file there equals
  the branch base.
