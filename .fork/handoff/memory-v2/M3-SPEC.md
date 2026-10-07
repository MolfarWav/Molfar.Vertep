# M3 spec: Litopys takes over the prompt, the old Memory goes (Roleplay)

Part of `PLAN.md`. User decisions 2026-10-07: Litopys insert budget 800 tokens by default (user
setting); the old Memory's data is DELETED once Litopys holds it; dashboard notes that age out of
the dashboard insert become Litopys facts when important or key (everyday ones fade); the chat
menu "Memory" opens Litopys for that chat, and Roleplay Settings get a Litopys section in place of
the old memory section. Records are English (`402a3b0`).
Clone `.claude/worktrees/rp-memory`, branch `memory-m3` from `memory-m2d`. No version bumps, no
CHANGELOG, never commit `bun.lock`. Code map of the old Memory: session scratchpad
`m3-inventory-out.md` (drafted by an external model; line numbers approximate).

Parts: M3a engine plugin, M3b Litopys, M3c dashboard, M3d UI. Order of work: M3b, M3a, M3c, M3d.

## Terms
- line: the chat's active messages (`activeLine`: user/char, with id, not hidden), in order.
- covered(chat): the index K such that line[0..K-1] is covered without a gap by chapters that are
  not stale and not orphan, starting at index 0 (a merged chapter counts). 0 when the first
  message has no chapter or a gap comes first. Chapters past a gap do not count.
- cut(chat) = min(K, line.length - recentMessages), at least 0. Messages line[0..cut-1] leave the
  prompt; their content reaches the model only through the Litopys insert.

## M3b Litopys (`plugins/litopys/plugin.js`, manifest)
1. Config (`DEFAULT_CONFIG`, `loadConfig`, `patchConfig`, `uiPanel`): add `insert: true` (not `inject`: a 1.x key that was off by default) and
   `budget: 800` (tokens, clamp 200..4000). Keep the other keys. Manifest `schedule.intervalMs`
   30000 (rebuilds go one scene per tick). Plugin version stays (release later).
2. Cut record: after every tick that touched a chat, store `st.cut = { upTo: <id of line[cut-1]>
   | null, count: cut, at }` in the chat file. Export `coveredCount(st, line)` and
   `cutCount(st, line, cfg)` (pure) and test them: gaps, stale, orphan, merged, recent window.
3. Insert: export `llmRequest(ctx, host)`. Only `ctx.key === "reply"` with `ctx.turn.chatId`, and
   only when `cfg.enabled !== false && cfg.insert !== false`; never for `op: "impersonate"`.
   Read the chat (line), the Litopys file and the dashboard state; compute `cut` itself (do not
   trust `st.cut`, it may be a tick old). Nothing to insert (no chapters and no facts) = null.
   Block text (English), built by code, within `budget` tokens (`estimateTokens` as in the engine
   plugin: ascii/3.5 + other letters/2 + CJK 1; copy the function):
   ```
   [Story record (Litopys): what happened before the messages below and what stays true. Background for the next reply: do not retell it, do not contradict it.]
   Earlier chapters:
   - <label>: <text>
   Facts:
   - <text> (known to: A, B)          ← "(known to ...)" only when knownBy is a list
   ```
   Fill order, each item whole or not at all, stop adding a group's items when the budget is used:
   a) pinned facts whose subject is present or "world"; b) facts of type `change` or `trait`
   whose subject is present; c) the LAST chapter before the cut (the bridge to the first
   message the model still sees); d) other facts ranked by relevance; e) other chapters before
   the cut ranked by relevance, at most 6. Chapters print in story order, facts in fill order.
   Facts eligible: status active; knownBy "all", or a list meeting present ∪ {user's name};
   d) also skips facts whose src chapter is fully after the cut (their messages are still in the
   prompt) unless pinned or change/trait.
   Present = the newest dashboard snapshot's `present` at or before the newest message, plus
   `ctx.turn.speakerName`; no dashboard = names of the messages in the recent window. User's name
   = the chat meta's `userName` (fallback "You").
   Relevance (lexical only; embeddings stay a later boost): scan text = the contents of the last
   6 non-system messages of `ctx.request.messages`. Port `rankNotes`' scoring from
   `plugins/relations/plugin.js` (rare-word matches weighted by ln(1+N/df), stems by the
   relations stemmer if it has one) and add weight: key +6, important +3, everyday 0; chapters
   score on label + text. Ties: newer first.
   Placement: one system message right after the leading system messages (same as the
   dashboard's `withInsert`); priority 10 already puts it before the dashboard block (20).
   Return `{ messages }`. Write `st.lastInsert = { at, tokens, facts: n, chapters: n, cut }` to
   the chat file only when it changed by more than the `at` (cheap enough; used by the UI).
4. Migration sweep (once per chat, code only, no model): `ensureChat` already migrates chats
   updated in the last 7 days. Add a sweep in `onTick` that also migrates every other chat
   (at most 20 per tick, oldest last), so every chat has a Litopys file. For every migrated chat
   whose `chats/<id>.memories.json` exists: import each entry whose text has no active fact with
   Dice >= 0.85 (any subject) as a fact {subject "world", knownBy "all", type "event", weight
   "everyday" (pinned entries: weight "important", pinned true), origin "migrated"}, save the
   Litopys file, THEN delete the `.memories.json` file. Litopys never writes chat meta: the engine
   strips the old meta keys (M3a 4).
5. Migrated facts weigh everyday: `migrateChat` writes weight "everyday" from now on; a one-time
   pass (`st.v2fix` flag) sets weight "everyday" on existing facts with origin "migrated" that
   still read "important" and were never edited (`updatedAt === at`).
6. Skip facts that repeat the card or the lorebook (in `applyWorkerResult` adds): split the
   chat's card text (description, personality, scenario, first message; for a group every
   member's card) and the content of every enabled entry of the chat's lorebooks
   (`meta.lorebookIds` + the card's own book) into sentences; an add whose text has Dice >= 0.7
   with any sentence is skipped and counted in `st.worker.facts.skipped`. Read the card and
   lorebook files the way the engine plugin does (implementer: find their paths and shapes in
   `plugins/engine/plugin.js`, do not guess). Cache per tick.
7. Dashboard notes into facts (decision: important and key only): in `onTick`, for each chat
   read the dashboard notebook (state `notebook` + the overlay `dashboard/notes/<chatId>.json`
   through the same effective-notebook rules as relations; port the minimal reader) and take
   notes with weight or tag important|key|pinned, not retired, whose `turn` is older than the
   newest snapshot turn minus `noteAgeTurns` (dashboard config, default 30). Each becomes a fact
   {text, subject: the user's name, knownBy: [holder], type "relation", weight as the note
   (pinned tag → important + pinned), origin "dashboard", src: {from/to: null}} unless a fact
   with Dice >= 0.85 exists. Record moved note ids in `st.fromNotes` (never move one twice).
8. Rebuild from scratch: `POST /litopys/rebuild {chatId}`: drop all chapters, facts with origin
   chapter|migrated, all proposals, `worker`, `cut`, `lastInsert`; keep facts with origin user or
   dashboard and `fromNotes`; save. The worker then re-chapters closed scenes, oldest first.
   Answer `{ scenes: <closed scenes now> }` so the UI can say how many calls it will take.
9. Chat view route additions: `chatView` returns `cut: {count, upTo}`, `lastInsert`,
   `facts.skipped` in the worker view, and `rebuildScenes` (closed scenes count).

## M3a engine plugin (`plugins/engine/plugin.js`)
1. Remove the old Memory: summary compaction (`POST /chats/:id/compact`, `/compact/undo`,
   redo), `DEFAULT_SUMMARY_PROMPT` and its past list, `summaryPromptOf`,
   `withoutDefaultSummaryPrompt`, route `settings/summary-prompt`, the summary insert in
   `assemble`, the facts vault (`loadMemories`, `saveMemories`, `recallMemories`,
   `memoryExtractPrompt`, `parseMemoriesReply`, `mergeMemories`, all `/chats/:id/memories*`
   routes, the auto extraction in send pass A/B and `memoryExtractedAt`), the long-term-memories
   insert in `assemble`, `memories` in the backup export, and the scan-vector work that existed
   only for memories (keep what lorebooks/databank use). `{{summary}}` macro returns "".
2. Cut in `assemble`: replace the `memoryCutoffMessageId` slice with the Litopys cut: read
   `litopys/config.json` (enabled/insert) and `litopys/chats/<chatId>.json`, compute
   `coveredCount` / `cutCount` with a COPY of the M3b functions (same tests run against both;
   plugins cannot import each other), and drop history messages before the cut (by id). When
   Litopys is off, missing or its file is missing: no cut. Token trimming stays after it.
3. `hookInsertReserve`: Litopys adds `budget + 100` when enabled and insert is on (instead of
   `inject === true ? 1200`).
4. Strip the old meta keys: `saveChat` (or the one place meta is written) deletes `summary`,
   `memoryCutoffMessageId`, `compactions`, `memoryExtractedAt` when
   `litopys/chats/<id>.json` exists with `migrated: true`. PATCH no longer accepts
   `memoryCutoffMessageId` or `summary`. Fork no longer copies them (they are stripped anyway);
   chat and character delete keep removing a leftover `.memories.json`.
5. The send/next response no longer needs `trimmed` for compaction; keep the field (the UI may
   show "out of context").
6. GET chat (the shape `engineChatToUI` reads) adds `litopysCut: { count, upTo }` computed like 2,
   so the UI can mark messages that are now in Litopys.

## M3c dashboard (`plugins/relations/plugin.js`)
1. Config `noteAgeTurns` (default 30, clamp 5..500), in GET/PUT config like `maxThreads`.
2. The insert (`buildInsert` / `relevantNotes` callers) skips notes older than `noteAgeTurns`
   turns unless tagged pinned. The sensor's notebook view is unchanged.

## M3d UI (Roleplay `src/`)
Built from this section by an external model via `ask-model` (components) and integrated with a
browser check; strings en + uk in `src/lib/i18n.ts` (keys `lit.*`), uk without grammatical gender.
1. Remove: `src/components/chat/memory-panel.tsx`, the summary/memory parts of
   `memory-summary-section.tsx` (keep the embeddings part: it serves lorebooks and Litopys
   vectors), automatic compaction in `store.ts` `runStream` and its toasts, `compactChat`,
   `undoCompaction`, memory API helpers in `src/lib/engine.ts`, `settings.summary` and
   `settings.memory` from types, defaults and hydrate (drop the stored keys on hydrate), the
   `summarized` prop from message rows' old meaning.
2. Chat menu "Memory" (brain icon, desktop kebab and mobile menu) opens a sheet with the M2b
   `LitopysView` for this chat only (no chat list), plus: a line "N older messages are in the
   record" (from `cut.count`), the last insert's size ("last reply carried ~T tokens: F facts,
   C chapters"), and a "Rebuild from scratch" button with a confirm that says it drops chapters
   and facts written from the chat (user and dashboard facts stay) and takes about N worker calls,
   one per ~30 s.
3. Message rows before `litopysCut.count` get the existing dimmed "summarized" look with the
   tooltip "In the story record (Litopys)"; the divider above the first kept message reads "Older
   messages are in the story record" (replacing the summary wording).
4. Roleplay Settings, memory section becomes "Story record (Litopys)": insert on/off, budget
   (tokens), recent messages, model (the existing model picker), min/max messages per scene,
   pin limit, the chapter prompt with Reset; reads/writes `GET/PUT /litopys/config`
   (`DELETE /litopys/config/prompts` for Reset). The embeddings block stays below it.
5. The Litopys rail section keeps working; `facts.skipped` shows in the worker line.

## Tests (each part with its code; run the full Roleplay suite)
- coveredCount/cutCount: gap, stale, orphan, merged first chapter, recent window, empty.
- Engine `assemble`: history starts at the cut; no cut when Litopys is off or has no file; the
  old summary and memories never appear; `{{summary}}` is "".
- One reply request (send through the mock host with both plugins' hooks applied in priority
  order) carries exactly one Litopys block and one dashboard block and nothing else from memory;
  Litopys block comes first; impersonate carries no Litopys block.
- Insert budget: fill order a-e, whole items only, never over budget; knownBy filtering.
- Sweep: `.memories.json` imported then deleted; meta keys stripped by the engine on next save
  only when the Litopys file is migrated.
- Card/lorebook repeat skipped; dashboard note moved once; rebuild keeps user and dashboard facts.
- `hookInsertReserve` uses the Litopys budget.

## Not in M3
Embedding boost for the insert, editing in the Library (M4), the bridge between chats, the
prompt preview showing hook inserts (hooks run only on real requests; the engine inspector shows
them), the shell Settings "Memory" tab content.
