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
  "acquired": [{ "id": "a1", "kind": "skill|scar|title|other", "text": "Reads lips", "sourceId": "s1", "state": "proposed|accepted" }],
  "inject": { "enabled": true, "maxTokens": 400 }
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
- **Acquired** one-line records are proposed by the sensor (Soul rating style) and need the user's confirmation;
  not SKILL.md files.
- **Injection block** "Character memory": arc of each active source (shortest first), then facts ranked by
  relevance to the scene (Litopys ranking), then notes; budget 400 tokens (setting on the card), a Prompt board
  switch. Independent canons: sources with `canon: "separate"` are only injected when the chat selects them alone.
- Saved through the card editor's Save changes (#103); every tab dot and the leave guard apply.

## 5. Sectors (organising lens, Proposed, after the above)

Semantic (facts) / episodic (chapters) / procedural (acquired, behaviour patterns) / emotional (Dashboard state) /
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
4. Acquired proposals, then the sector panel.
5. Small neighbours when the files are open: #86 (threads dropped at the limit, retire stale ones), #85
   (post-history on imported ST presets, hidden blocks in the sensor window).
