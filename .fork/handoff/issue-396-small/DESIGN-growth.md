# #396 item 2: "how the character changed" (growth), and item 3 check (2026-11-13)

Owner's picks: its own file `growth.json`; entries wait as `proposed`; a ready agent "Character growth" ships in the same
PR; the token room is set by the user and must go far above the habits' 50 to 800; and the growth must be able to
**override what the card says** (example, only an example: a tsundere who thaws into another type).

## What already exists (the body of #396 missed it)
`characters/<id>/memory.json` is taken: card memory (sources = snapshots of chats) and habits (rules of behaviour,
`proposed` / `accepted`, `inject.maxTokens` 100 to 1500, `habitsMaxTokens` 50 to 800), written by the Litopys plugin, edited
in the card's Memory tab, injected as "Litopys · character memory" and "Litopys · character habits" with Prompt board switches
`plugin:cardmemory` and `plugin:cardhabits`. Habits are rules ("how they act"); growth is what changed ("who they became").
Different thing, so a separate list. The body's name `memory.json` for the sidecar must not be used.

## Item 2: design
- **File** `characters/<id>/growth.json`, written only by the agents plugin (atomic writes; the plugin host has no
  plugin-to-plugin calls, files are the only shared channel, and one writer means no lost update against Litopys):
  `{ "v": 1, "next": <n>, "entries": [ { "id": "g1", "was": "<optional, what the card or an earlier entry said>", "now": "<what it is now>", "on": true, "state": "proposed"|"accepted", "origin": "agent"|"user", "agent": "<agent id>", "from": { "chatId", "title", "at" } } ], "inject": { "enabled": true, "maxTokens": 800 } }`.
  `was` + `now` is the override device: a before/after pair says outright what is replaced, which a weak model follows better
  than a lone statement that contradicts the card.
- **Write path.** A new Forge card `write.growth` (permission `write:card.growth`, Allow-page sentence names the card and says
  entries wait for a yes). It adds one `proposed` entry for the chat's character (in a group the named speaker). Limits: an entry
  `was` and `now` at most 300 characters each; at most 200 entries; at most 2 new proposals per run; a duplicate (same `now`)
  is dropped. The user accepts, edits, switches off or deletes in the card's Memory tab (a new section "How they changed").
  Nothing is injected before it is accepted. The agent's own undo is "delete the entry".
- **Injection.** The agents plugin's `llmRequest` adds one part "Character growth" at the end of the leading system block
  (after the card sections and the persona; the `system-end` position built in #396's first batch), framed:
  "How {{char}} has changed over the story so far. Where this differs from the character description above, this is more recent and wins." then
  lines "Was: ...  Now: ...". Own Prompt board switch `plugin:cardgrowth`; per chat on or off (chat meta `growth: false`),
  default on. `insertCeiling` counts it exactly (it is on disk), so the engine's history budget leaves room.
- **Budget.** `inject.maxTokens` set by the user in the Memory tab: 100 to 8000, default 800. The part shows "used N of M" and
  warns when the room is above a quarter of the chat model's window. Over the room: the newest accepted entries stay, the oldest
  are not sent and the tab says "N older not sent" (owner's pick was open; this was my default, the owner said only that the
  room is the user's to set).
- **Stronger override, optional (not in the first PR).** Models weigh late text more. A switch "Also remind near the newest
  message" would repeat the last two entries before the newest user message (the tail slot Litopys and the Dashboard use).
- **Starter agent** "Character growth" (recipe): every 5th reply, one call: the last replies and the current accepted entries in;
  out: `{changed: yes/no, was, now}`; an If keeps only `yes`; `write.growth`. Cost shown by the new estimate.
- **What the card sees.** A card with a Profile rewrites `description`/`personality` from the profile, so growth is an overlay
  and never edits the card: it survives a save, and an export never carries it (like memory.json).

## Touch points (checklist for the build)
Agents plugin: card type, checker, executor, route `GET|PUT|DELETE /agents/growth`, `llmRequest` part, `insertCeiling`;
engine plugin: `PROMPT_BOARD_OFF_KEYS`, board entry, omit trace; app: `board-names.ts`, `prompt-order.ts`, `carries.ts`
(`CarrySwitch`), the Memory tab section, `docs/DATA-FORMATS.md`, `docs/COUPLINGS.md`, the guide pages `memory`/`agents`,
skill `agent-craft` (`cards.md`), `edit-large-card` (one line: leave `growth.json` alone; and its copy in `.fork/app-skills/roleplay/`),
a task for the built-in agent for the workspace copies, a recipe in `.skills/agent-craft/references/` + sync scripts.

## Item 3 check: search by meaning for an agent card
- **Embedding calls are open to the agents plugin.** It has the `llm` permission, and in the engine (`src/plugins/runtime.ts`) embed requests ride the
  same `caps.llm`. Litopys also respects a user setting (`embedAllowed`) and `embedWorked`; an agent search must too, else words only.
- **Vectors.** Chapters and facts: `.cache/litopys/vectors/<chatId>.json` `{ id: { hash, vector } }`; Data Bank: split files in
  `.cache/databank-vectors/`, read through engine-plugin helpers. Every vector carries its model; vectors of different models do not
  compare. The query needs one embed call per search (async: asked in one pass, answered in the next, like a model call).
- **The catch.** The readers, the cosine and the model check live inside the Litopys and engine plugin files; plugins are single
  sandboxed files and cannot call each other. An agent search would need a copy of ~100 lines (COUPLINGS already tracks five copies
  of `expandNames`), or Litopys would write a ranked result file for the agents plugin to read. Today's passage search only
  reorders what words found; an agent search that adds what words did not find is new behaviour in Litopys.
- **Not verified:** whether the lorebook has vectors (the code shows none: words only), the cost of a full cosine pass over a
  5000-chapter chat (the long-chat bench is the place to look), how the searched text is cut to the card's output limit.
- **Verdict:** feasible, medium size, separate from item 2. Cleanest split: Litopys exposes ranking as a file the agents read; the
  card needs a permission `read:memory-search` and shows its embedding cost. Not started.

---

# Revision 2 (2026-11-13, after the owner saw the screenshots)

Owner: one-line "was / now" entries are thin sprinkles; the model needs a whole picture: changes as BLOCKS like the
description's, plus what developed over the story (relationships, secrets, skills, the past), so the character is better
understood and revealed. Answers: a living portrait in blocks; block by block, with a hand button; how often it runs is the
user's setting (not fixed at 10); a full replacement of description / personality is NOT possible (they are compiled from the
Profile's fields); research where such changes are best put.

## What was found (Roleplay 607147f)
- A Profile card's `description` and `personality` are COMPILED TEXT from `extensions.molfar_profile` (`compileProfile`,
  `src/lib/profile.ts`): identity, appearance, background, circles, relationships, notes go to `description`; personality
  (traits, values, fears, strengths, flaws), behaviors, goals, trauma, sexuality go to `personality`. A narrator card with
  several characters has `### Name` blocks. In the prompt the text has NO section headings (headings exist only in exports,
  `compileProfileMarked`), so "replace this section" inside the prompt would be text surgery on unmarked lines: fragile.
- The prompt takes the card through the preset sections `charDescription` / `charPersonality` / `scenario` (engine
  `assemble`, ~line 3819), as plain text, with only macros applied. A plain (non-Profile) card is one free text.
- So the safe place is NOT inside those fields. It is a separate named part right after them (end of the leading system block,
  which the first batch's `system-end` position and the growth part already use), written in the SAME section words the Profile
  tab uses, so the model matches "Behaviors, now" with what the card says and the user reads the same words in the Memory tab.

## Revised design
- Entry (block) in `growth.json` v2: `{ id, section, kind: "changed"|"added", title?, text (up to 1200 characters), basis?
  (what it supersedes, in a few words), state, on, origin, agent?, runKey?, from?, prev?: [last 3 texts], at }`.
  `section` is a Profile section (identity, appearance, personality, behaviors, goals, background, relationships, trauma,
  sexuality) or `other`. v1 entries (was/now) are migrated on read: `text` = "Was: ... Now: ...", `kind` "changed".
  Not released, so no compatibility burden beyond the migration.
- Prompt part: one part, "<Name> as of now", introduced by "Where this differs from the description and personality above,
  this is more recent and wins", then one block per section in the Profile's order: `## Behaviors (now)` then the text. Several
  blocks of one section are joined. `kind: "added"` blocks sit under their own title. Room: the user's, 100 to 8000, default 1500.
- Writing: the agent returns ONE block per run, the most important change or development since the last run (a Forge JSON can
  carry scalars, not a list): `section`, `kind`, `title`, `text`, `basis`. It is told the card text, the blocks already there and
  the recent story, and to write in the card's own style and language. How often: the agent's existing "Every Nth reply" (the
  user's own cadence per agent already exists, `byAgent.<id>.everyN`); the recipe's default is every 8th reply.
  A block about a section that already has an accepted block is a REVISION: accepting it keeps the old text in `prev` and the
  Memory tab shows the two side by side with a Revert.
- Hand button "Update from the story" in the Memory tab: one bigger call (route in the agents plugin, two-phase like the profile
  plugin's) that proposes up to 4 blocks at once. Second step, not in the first rebuild.
- Phase 2 (only if the duplicate tokens matter), Profile cards only: leave the superseded section out of the compiled text that
  goes to the prompt. Needs a copy of `compileProfile` in the engine plugin (COUPLINGS: "Shared code copied into plugins"); the
  hash that detects a hand edit already tells when the text is the compiled one. Not planned until real use shows the cost.
