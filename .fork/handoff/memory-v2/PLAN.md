# Memory v2: one chat memory for Roleplay (plan, agreed 2026-10-06)

Scope: chat memory of the Roleplay app only. Molfar's own memory and token use are a separate,
later release (decided by the user 2026-10-06); lessons from here are applied there afterwards.
Release line: the memory series is 0.9.x. The old "0.8.2" (connections in one place, pi-ai upgrade,
START item 0a "Connection settings") moves after it, not before 0.9.2.

## Decisions (user, 2026-10-06)
- One memory, one worker, one insert, one budget. Code does everything it can; the model only
  where code would be a crutch (summarising a scene, judging a note's weight).
- Litopys becomes THE memory plugin: id `litopys` kept (grants and `data/litopys/` survive),
  version 2.0.0, shown as "Літопис" / "Chronicles". Archivarius is removed everywhere (plugin,
  Litopys's legacy fallback); the empty `plugins/quests/` folder is deleted by the user on each machine.
- Chapters replace the single rolling summary. A chapter = one closed scene. Old messages stay in
  the chat file but leave the prompt once a chapter covers them and they are older than the recent window.
- Scene boundaries: code (dashboard place change, time skip) OR the dashboard sensor's new field
  `scene: {new: bool, label}` (fight start/end, a conversation ends, same room). No extra model call.
  Guards: a scene under `minMessages` joins its neighbour; a scene over `maxMessages` is cut into
  parts on message boundaries; the current scene is never compressed.
- A chapter states consequences, not a blow-by-blow retelling (who won, who is hurt, what was
  lost, what changed between people, what was decided or promised, who learned what).
- One worker call per closed scene returns the chapter AND fact operations (add / update / retire).
  It sees the facts that concern the scene's characters, so it updates instead of duplicating.
- Embeddings only boost. Lexical recall (stems, rare-word weight) must work alone.
- Facts have two independent axes: weight (everyday / important / key) and type (event, trait,
  change, relation, world, plan). "change" = a lasting change that overrides the card (a lost arm)
  and rides whenever that character is present. "trait" (limps, snores) rides by presence too.
- Facts know `subject` (about whom) and `knownBy` (who knows). A visible trait is stored once with
  the list of who saw it, never copied per holder.
- Pins: at most `pinLimit` (5) per character. The sensor/worker may PROPOSE a pin for a "key"
  fact; only the user pins. Unpinning says the fact stays in Litopys and comes back when relevant.
- Background writes plain new facts itself; risky operations (merge, retire, rewrite of an
  existing fact) go to the proposals queue, as Litopys does today.
- Dashboard = "now", Litopys = "long ago". Dashboard notes age out of the dashboard insert into
  Litopys facts (code: by age and weight), keeping `knownBy`.
- The Library is a Roleplay section in the left rail next to Lorebooks (a page, reachable without
  a chat); the in-chat memory panel is the same view filtered to one chat. Code lives apart:
  `plugins/litopys/`, `src/components/library/`, data `data/litopys/`.
- Bridge between chats: user-started only, never automatic (a failed chat is often restarted on
  purpose). In the Library the user draws a thread from one chat to another and picks the facts and
  chapters to carry; code assembles them; a model rewrite into an intro is optional.
- Not now: a memory tool the model calls itself, a vector database, Molfar's memory.

## Facts found in the inventory (Roleplay 4.24.0, engine 0.8.1)
Mechanisms today: engine-plugin Memory (one summary + cutoff `meta.memoryCutoffMessageId`; facts
vault `chats/<id>.memories.json` with hybrid lexical+cosine recall, 1500 chars / 8 facts; auto
extraction off by default), Litopys 1.4 (scribe every 4 messages over the last 24, curator,
proposals, recap; insert off by default, nothing reads it), dashboard notebook, lorebooks (keys +
vectorized entries), data bank. Archivarius is dormant, `quests/` empty.
Bugs that matter for long chats:
- `assemble()` trims history at `openai_max_context * 4` chars: no reserve for the reply, and hook
  inserts (dashboard, Litopys) are added after the trim. Server estimates chars/4 (Cyrillic is ~2).
- The scan vector exists only for send/peek: next, swipe, continue, impersonate lose semantic
  recall and vectorized lorebook entries.
- Deleting the cutoff message brings the whole history back with the summary; a fork before the
  cutoff copies the summary; the first fold of a long chat is one request with the whole backlog.
- Dashboard notebook: unbounded on disk, but the insert takes the 12 newest notes per character and
  the sensor sees the last 20, so knowledge older than ~10-25 turns falls out and gets re-written as new.
  Body/outfit details ride only the turn they were seen (`relations/plugin.js` ~2763): a lost arm is
  forgotten the next turn.
- Chat delete leaves `.memories.json` and Litopys entries behind.
Engine: `host.llm.embed` works only through custom OpenAI-compatible connections with a key;
no tokenizer or vector helper for plugins; plugin fs writes up to 4 MB, store.json capped at 1 MB.

## Data format (Litopys 2.0)
`data/litopys/chats/<chatId>.json` (one file per chat, not one store for all):
```
{ v: 2, chatId,
  chapters: [{ id, from, to, count, sig, label, text, kind: "scene"|"part"|"merged",
               place?, at, model?, stale?: true, edited?: true }],
  facts: [{ id, text, subject, knownBy: [names] | "all", type, weight, pinned, pinProposed?,
            status: "active"|"retired"|"superseded", supersedes?, src: { from, to, chapter? },
            origin: "chapter"|"dashboard"|"user"|"migrated", at, updatedAt }],
  proposals: [{ id, op: "merge"|"retire"|"rewrite"|"pin", targets, text?, reason, status }],
  scene: { openFrom, label? },          // the scene in progress, never compressed
  counters: { chapter, fact, proposal } }
```
- `sig` = FNV-1a of the covered messages' active texts (same idea as the dashboard): an edit,
  swipe or delete inside a chapter marks it `stale`; it is rebuilt lazily.
- Vectors in a sidecar `data/litopys/vectors/<chatId>.json` keyed by fact/chapter id + text hash.
- Fork: facts and chapters whose `src.to` is at or before the fork point are copied. Chat delete
  removes the file and the sidecar.
- `data/litopys/config.json`: `budget { now, pinned, recall }` (tokens), `recentMessages`,
  `scene { minMessages, maxMessages }`, `model`, `curateEvery` (chapters), `pinLimit`, `inject`.
Dashboard additions (relations): sensor output `scene`, notes get `about`, `type`, `weight`.

## The prompt (code)
Canon (card, preset, lorebook) / Litopys insert / dashboard insert / recent messages verbatim.
Litopys insert = "where we are now" built by code (place, time, who is present from the dashboard;
open threads; the last chapter's closing lines) + pinned facts + traits/changes of present
characters + facts and older chapters recalled by relevance, inside the user's budgets.
The cut (which old messages leave) and the insert are decided together; `assemble()` reserves the
reply length and the configured insert caps before trimming.

## Stages (each: spec, build, tests, live check by the user, then the next)
M1 Foundations, no new formats (Roleplay patch release):
  1. Honest history budget in `assemble()`: reserve reply tokens and hook insert caps; script-aware
     estimate (port `estimateTextTokens` rules from the engine's `context-budget.ts`).
  2. Scan vector for next / swipe / continue / impersonate.
  3. Chat delete removes `.memories.json` and the Litopys entry.
  4. Remove Archivarius (plugin dir, Litopys legacy fallback, docs).
  5. Dashboard notes: insert and sensor pick notes by relevance to the scene (reuse the engine
     plugin's recall code), pinned/important first; trigram dedup (~0.85) before a note is written.
M2 Litopys 2.0 in shadow mode (builds memory, does not change the prompt yet):
  format above; sensor `scene` field and note weight/type/about; worker (one call per closed
  scene: chapter + fact ops); migration (old Litopys store, `.memories.json`, `meta.summary` as
  chapter 0 up to the old cutoff); proposals; vectors; fork/delete. The user compares it live
  with the old Memory before anything switches.
M3 Switch the prompt: Litopys insert + cut, the budgets, notes aging from the dashboard into
  Litopys, "change"/"trait" by presence, old summary and facts vault retired (engine plugin
  code removed after migration), Litopys 1.x recap and insert gone.
M4 Library: rail section next to Lorebooks (all chats: chapters timeline, facts with edit / pin /
  retire, proposals, activity), in-chat panel = same view for one chat, pin limit dialog.
Later (own items): bridge between chats (drawn thread, picked facts), "remember this" from a
  message menu, notes about other characters and traits from the sensor, archive search over
  raw old messages, Molfar's memory and tokens.

## How we work
- Roleplay code in a scratch clone of `MolfarWav/Molfar.Vertep-Roleplay` (branch per stage), never
  in the workspace; copying into a workspace only with the user's ok, after any pending app update
  is applied (STATE lesson of 2026-10-05).
- Delegation: the orchestrator writes specs, data formats, migration and the worker's core and
  reviews every diff; a Sonnet subagent builds tests, UI (from a precise spec, with `browser-check`)
  and bulk edits; uk/en strings by a cheap model. External models get repo code and made-up
  examples only, never workspace data or chat text.
- Every model-facing prompt names the story's language and says "use only what the text says".
- Measure prompt sizes with the prompt inspector before arguing about them.
