# Memory bridge: design note (issue #102)

Status 2026-10-22: draft for the owner's yes. Code exists only for step 1 (#100, Roleplay branch
`claude/memory-bridge`). Everything below marked **Decided** was answered by the owner in #98/#102;
**Proposed** needs a yes before code. UI mockups were shown in the 2026-10-22 thread (banner in three
states, "Said" block, card tab "Memory", import dialog, phone "Chat memory").

## 1. What exists after step 1 (#100)

- A chat that continues another (Litopys link `litopys/links.json`) copies the earlier chat's end state
  once, before its own first Dashboard snapshot: `state.inherited` = `{ from, title, at, turn, notes,
  threads, snap }` in `dashboard/state/<chatId>.json`. `snap` is the earlier end snapshot (characters'
  numbers, mood, holding, clock, scene, present, open threads); live notebook notes and names are copied
  with `src: "inherit"` and `fromChat`. The first sensor run reads on from `snap` (`base.key = null`).
- Switch: `POST /dashboard/inherit { chatId, on }` until the chat has a snapshot of its own.
- Chain: the nearest chat's end state (a chat that carried and never ran passes on what it carried).

## 2. The bridge object (generalising #100)

A chat's memory comes from **sources**. Today's two are special cases:

| Source | Carries | Where it enters the prompt | Switch |
|---|---|---|---|
| Previous chat (continuation) | Litopys chapters/facts (backstory, 800 tokens) and, since step 1, the Dashboard state | Litopys backstory block; Dashboard insert | `inherited.off` (Dashboard); Litopys link removal |
| Card memory (new) | imported histories of the card (section 4) | its own block "Character memory", ~400 tokens | per source switch in the card; per chat on "Chat memory" |
| Said (new, #98) | what characters said | its own block "Said" | Prompt board, setting per turn |

Proposed: no new generic engine. The "bridge" is only a per-chat record `meta.memory = { cardMemory: bool,
sources: { "<sourceId>": bool } }` in the chat meta, written by the "Chat memory" panel (mockup 5), read by the
card-memory block. Default: on, all sources that are on in the card.

## 3. Said facts (#98)  **Decided**: separate `said` list, own injection, lies hidden, 2 per turn (setting)

- Sensor reply gets one more key `said: [{ who, text, kind, lie? }]` (`kind`: vow, promise, threat,
  confession, order, refusal, secret). `who` is a present non-user character. Max per turn = setting
  (default 2, range 1-4). Code drops entries for the user or absent characters and counts them in
  `keptOut` (same rule as `learned`).
- Store: `state.said[name] = [{ id, text, kind, turn, src, hidden, source: "chat" }]`; `source` is `chat` now
  and may be `messenger` later (Telegram/Discord-style plugin writes into the same field). Same `src` rule as
  notes (active on the line), same overlay edits (retire, edit text, show/hide).
- Lies: the sensor sets `lie: true` only when the text shows it; the record is stored `hidden: true`, not
  marked in the open; the Dashboard shows "Hidden: N, Show" and a "lie" tag only when revealed.
- Injection: own block "Said" (not inside the notebook budget): the speaker's own recent/strongest `said`
  lines, ~120 tokens by default, listed on the Prompt board as its own switch. Hidden lies are injected too
  (the character knows what they said); the user sees them only after reveal.
- Prompt change comes after #97 is watched; keep the old sensor prompt as a past default.

## 4. Card memory  **Decided**: file `characters/<id>/memory.json`, tab "Memory", never in `card.json` or the export

```jsonc
{
  "v": 1,
  "sources": [{
    "id": "s1",                 // stable id
    "chatId": "c1",             // may point to a deleted chat
    "title": "Winter watch",    // kept at import time
    "importedAt": 1760000000000,
    "on": true,                 // feeds this memory and new chats
    "canon": "main",            // "main" or "separate": separate sources are never injected together with others
    "arc": "One paragraph: what happened to the character in this story.",
    "facts": [{ "text": "...", "subject": "..." }],
    "notes": [{ "who": "Aria", "how": "saw", "text": "..." }],
    "said": [{ "text": "...", "kind": "promise" }]
  }],
  "changes": [{ "id": "a1", "kind": "scar|title|other", "text": "Scar on the left palm", "from": { "chatId": "c1", "title": "Winter watch", "at": 1760000000000 }, "state": "proposed|accepted" }],
  "skills": [{ "id": "k1", "name": "Answers threats with silence", "rule": "2-6 lines: how she acts and what she does", "when": "optional one line", "on": true, "origin": "user|molfar|proposed", "from": { "chatId": "c1", "title": "Winter watch", "at": 1760000000000 }, "state": "proposed|accepted" }],
  "inject": { "enabled": true, "maxTokens": 400, "skillsMaxTokens": 250 }
}
```

- Storage is files, not SQLite (sync, backup, Molfar edits, export). If it grows, a rebuildable index in
  `data/.cache/`.
- **Precedence**: chat overlay (its own Soul and Dashboard) over card memory over card base. The card's
  description, Soul and Profile never change.
- **Import = a snapshot, compressed** (Proposed, accepted as sensible): an arc paragraph plus the strongest facts
  (top by weight/recency, default 9), live notes (default 6), strongest said (4). Built by the card-tasks model
  (#104) as a proposal the user reviews in the import dialog (checkboxes per part); raw chapters are never copied.
  A chat can be deleted afterwards; the entries keep its title and id.
- **Changes** (a scar, a title, a lasting fact about the character) are one-line records, proposed by the sensor
  (Soul rating style), confirmed by the user, injected in the card-memory block.
- **Skills** (owner, 2026-10-22, issue #106): NOT abilities ("reads lips") but short collections of rules for how and
  what to do, like Molfar's skills in small: a name, 2-6 lines of rule and an optional one-line `when`. They are the
  seed of the Canvas "character behaviour preset" (`.fork/handoff/canvas/PLAN.md` section 15, item 3): later a
  skill's `when` becomes a Decider condition and a generated behaviour board is a set of skills. Written by the
  user or Molfar, or proposed from a story and confirmed; each keeps the chat it came from. Own injection block
  "Character skills" (only the ones that are on, about 250 tokens, own Prompt board switch), deduplicated against
  the card text and the Soul by similarity (4b). Not SKILL.md files, not big.
- **Injection block** "Character memory": arc of each active source (shortest first), then facts ranked by
  relevance to the scene (Litopys ranking), then notes; budget 400 tokens (setting on the card), a Prompt board
  switch. Independent canons: sources with `canon: "separate"` are only injected when the chat selects them alone.
- Saved through the card editor's Save changes (#103); every tab dot and the leave guard apply.

### 4a. A deleted chat breaks nothing  (owner, 2026-10-22)

Every record that remembers its chat keeps a **copy** of the origin, never a pointer it must resolve:
`from: { chatId, title, at }` on each skill, change and import source (and `title` + `importedAt` on a source).
Rules:

1. The prompt is built from `memory.json` alone. The chat's files are never read to inject a skill, a change, a
   fact, a note or a said line; a missing chat is the normal case (that is the point of importing before deleting).
2. Deleting a chat, or its Litopys and Dashboard files, never writes to `memory.json`. The tab shows
   "chat deleted" next to the source and drops only the "Open chat" link (existence is checked when the tab loads,
   not stored).
3. Removing an **import source** from the card asks what to do with its skills and changes: keep them (default;
   they keep `from.title` and show "source removed") or remove them too. Skills are the user's rules, so they are
   never deleted silently with a source.
4. A skill the user edited or wrote by hand has `origin: user` and no `from`; it stays valid with no history at all.
5. Dedupe rule 2 (4b) compares `chatId`s as plain strings; an id that no longer exists simply never matches a live
   chat, so that source is injected normally.
6. Chat ids that are re-used or restored from a backup: the copy of the title is what the user reads; the id is
   only compared for dedupe, so a wrong match can at worst skip one source's duplicates, never lose data.

Tests: delete the source chat's files, then build the injection and open the tab: same output, the source shows as
deleted, skills still on; remove a source with the "keep" choice: skills stay with their title; with "remove too":
only that source's skills go; a hand-written skill has no `from` and loads.

### 4b. No duplicate injections  (owner, 2026-10-22: facts must not reach the model twice, from Litopys and from the card)

The same story fact can arrive by four routes: the chat's own Litopys record, the Litopys backstory of the
chat it continues, the card memory (imported from that same chat or a sibling), and the Dashboard notebook.
Rules, in the order they apply, all enforced in code and covered by tests:

1. **One builder, one pool.** The card-memory block is built inside the Litopys plugin, next to its insert and
   backstory (which already hold facts, ranking, `DICE_LIMIT` 0.85 and the backstory's `usedFacts` set). It does
   not live in a separate plugin: two plugins would each spend a budget and could not see what the other chose.
   Every candidate carries its origin (`chat`, `backstory`, `card`), and a fact is injected once.
2. **By source, exactly.** A card-memory source whose `chatId` is the chat itself, or any chat in this chat's
   backstory chain (`loadLinks` chain, at most 3), is skipped in full: Litopys already brings that story in
   its own, fresher form. The same source is skipped for the Dashboard when `state.inherited.from` is that chat
   (its notes were carried).
3. **By text, for the rest.** Before the card block is cut to its budget, each card fact is compared with the
   facts already chosen for the chat (own insert, then backstory) with the same Dice similarity as Litopys
   (`diceSimilarity` against `DICE_LIMIT`); a near copy is dropped from the card block, never from Litopys
   (the chat's own record is newer and has the scene ranking). The arc paragraph is dropped when every fact it
   summarises is already covered by a chapter of the chat or its backstory (a source-id rule, not text).
4. **Notes and said.** Card notes are compared with the chat's live notebook (`readDash`) by holder and
   similarity; card `said` lines with the chat's `said` list. A hit drops the card line.
5. **Budget order.** Litopys insert first, then backstory, then card memory gets what remains of its own
   budget (never more than 400), so a busy chat squeezes the card block, not the story.
6. **At import**, not only at injection: the dialog marks facts that the chat's Litopys already holds as one
   source (they are the same chat), and facts already in another imported source (similarity) are shown as
   "already in memory" and unchecked by default, so the card file does not grow with repeats either.
7. **Visible.** The Prompt board shows each block with its token cost; the "Chat memory" panel shows how many
   card lines were left out as duplicates ("3 lines already in the story"), so the user sees why a source gives
   less than it holds.

Tests (Roleplay `test/`): the same fact in the chat record and in a card source is injected once; a card source
equal to the continued chat contributes nothing; a near copy (text differs by a few words) is dropped; a distinct
fact survives; the order and the budget hold when all three are present.

## 5. Sectors (organising lens, Proposed, after the above)

Semantic (facts) / episodic (chapters) / procedural (skills, behaviour patterns) / emotional (Dashboard state) /
reflective (Soul, arcs) / said. A "Memory" panel per chat lists the blocks that were injected with their token
cost and a switch each; it reuses the Prompt board's `promptSources` entries rather than a new store.

## 6. Open questions (recommended answers first)

1. Import is a snapshot (recommended) or a live link to the chat?
2. A continuation carries what is alive (implemented) or everything?
3. Card memory budget 400 tokens, adjustable (recommended)?
4. `said` as its own store (decided) and the per-turn limit setting default 2.
5. Should "Start clean" also stop the Litopys backstory of the same link? (Recommended: yes, one switch for both:
   today they are two separate things, which is surprising. Needs the Litopys side to read `inherited.off`.)

## 7. Order and what each step touches

1. #100 server (done), UI banner (done), Litopys switch (question 5).
2. #98 `said`: relations plugin (prompt, `applySaid`, state, view, insert block), Dashboard view, config
   `saidPerTurn`, DATA-FORMATS "Dashboard state", tests.
3. Card memory: new plugin routes (`/memory/...`) next to the character plugin; `memory.json`; card tab;
   import dialog; chat panel "Chat memory"; Prompt board block. Updates in the same change: Roleplay
   `docs/DATA-FORMATS.md`, the card skill `.skills/edit-large-card/SKILL.md` and its engine copy
   `.fork/app-skills/roleplay/edit-large-card/SKILL.md`, a task for the built-in agent.
4. Changes and skills (#106) as proposals, then the sector panel.
5. Small neighbours when the files are open: #86 (threads dropped at the limit, retire stale ones), #85
   (post-history on imported ST presets, hidden blocks in the sensor window).
