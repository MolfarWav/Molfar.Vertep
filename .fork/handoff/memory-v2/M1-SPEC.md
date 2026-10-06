# M1 spec: memory foundations (Roleplay)

Part of `.fork/handoff/memory-v2/PLAN.md`. No new data formats, no UI work. Work in a clone of
`MolfarWav/Molfar.Vertep-Roleplay` (base `331bd41`, Roleplay 4.24.0), branch `memory-m1`.
Files: `plugins/engine/plugin.js` (ENG), `plugins/relations/plugin.js` (REL),
`plugins/litopys/plugin.js` (LIT), `plugins/archivarius/`, tests in `test/`.
Do not bump versions or edit CHANGELOG (the release step does that). Never commit `bun.lock`
changes caused by `bun install`.

## 1. Honest history budget in `assemble()` (ENG ~1545)
Today: `budget = presetMaxCtx(preset) * 4` chars; history trimmed while fixed blocks + history
exceed it. No reply reserve; hook inserts added later are not counted; chars/4 undercounts Cyrillic.
Change:
- Add `estimateTokens(text)` to ENG, ported from the engine's `src/agent/context-budget.ts`
  `estimateTextTokens` (E:\Claude\Chrysalis-Engine\src\agent\context-budget.ts, read it): ASCII ~3.5
  chars/token, other letters (Cyrillic etc.) ~2, CJK/other 1; plus 4 tokens per message.
- Budget in tokens: `presetMaxCtx(preset) - replyReserve - insertReserve - 64`, where
  `replyReserve` = `openai_max_tokens` when > 0, else 1024, and `insertReserve` =
  `hookInsertReserve(fsx)`:
  - dashboard (REL) config `data/dashboard/config.json` (stored keys override defaults:
    injection `{enabled: true, maxTokens: 300}`, REL ~1518): when enabled, `maxTokens * 2 + 200`
    (two focus characters + scene/thread/closing lines). Missing/unreadable config = defaults.
  - Litopys config (LIT `DEFAULT_CONFIG`, `inject` default false): when `inject === true`, 1200
    (its insert is cut at 4000 chars).
  Read configs defensively; any error = that plugin's default.
- Trim by tokens with the same loop shape (oldest first, keep at least 1 message); `trimmed` keeps
  its meaning (auto compaction depends on it).
- `wiBudgetChars` stays as is (separate concern).
Tests: a Cyrillic history that fit under chars/4 now trims; reserve grows with
`openai_max_tokens`; dashboard injection disabled lowers the reserve; `trimmed` count reported.

## 2. Scan vector for every reply op (ENG)
Today only `send` (~3117-3145) and peek (~2390-2413) run the embed pass that yields `scanVec`;
next, swipe, continue and impersonate call `assemble()` without it, so semantic fact recall and
vectorized lorebook entries are off for them.
- Extract the send block into a helper (e.g. `semanticPrep(host, fsx, meta, staged, text, req)`)
  that returns either `{ pending: <pendingOut> }` (embed requested this pass) or `{ scanVec }`.
- Use it in next, swipe, continue and impersonate. Scan text = pending text (if any) + last 4
  messages, as in send.
- Check the pass budget: a route has at most 3 passes (engine runtime). Confirm each route still
  fits (embed pass, then the llm request pass, then the result pass). If a route cannot fit,
  skip the embed there and say so in the report; do not break the route.
Tests: each of the four ops passes a vector to `assemble` when embeddings are available
(follow the existing test style for send; mock host).

## 3. Chat delete leaves no memory behind
- ENG chat delete (~3071-3075, removes `.jsonl` and `.meta.json`): also remove
  `chats/<id>.memories.json` if present.
- LIT `onTick`: drop `store.chats[chatId]` entries whose `chats/<chatId>.jsonl` no longer exists,
  and their proposals and `vault-chats/*-<chat6>.md` file (look at how REL ~2586 cleans orphans).
  Save only when something was dropped.
Tests for both.

## 4. Remove Archivarius
- Delete `plugins/archivarius/`.
- LIT: replace the read-only legacy fallback (`LEGACY_DIR`, ~150) with a one-time move: when
  `litopys/store.json` is missing and `archivarius/store.json` exists, copy store, proposals and
  config into `litopys/` once; after that never read `archivarius/`. Leave the old files on disk.
- LIT manifest: drop `"replaces": ["archivarius"]` only if nothing else needs it (check the engine:
  `src/plugins/runtime.ts` `replacedBy`; a missing replaced plugin must be harmless). If unsure,
  keep it and say why.
- Remove Archivarius from docs (AGENTS.md, docs/ARCHITECTURE.md, README.md, data/README.md) and
  any UI/i18n strings; keep CHANGELOG history untouched.
Tests: the one-time move (old dir only → copied once; both present → litopys wins, nothing copied).

## 5. Dashboard notes: relevance and dedup (REL)
Today the insert takes `pickNotes(list, NOTE_LIMIT=12)` (pinned, then by tag rank, newest first;
REL ~2742) and the sensor sees `notes.slice(-20)` (REL ~1702), so older knowledge falls out.
- Copy into REL the Cyrillic-aware matching helpers from ENG (`norm`, `tokens`, `stem`,
  `sameWord`, the stop-word set; ENG ~596-636) unless plugins can share a module (check how
  plugins load; do not invent an import the sandbox cannot resolve).
- `relevantNotes(list, sceneText, limit)`: pinned always; then score = rare-word weighted stem
  matches against `sceneText` (same formula as ENG `recallMemories`: `10*ln(1+N/df)` per matched
  stem) + tag bonus (important +5) + small recency bonus (newest note +3 fading to 0 over the last
  20 notes); notes with no match are still eligible by tag and recency. Ties: newer first.
- Insert: `pickNotes` uses `relevantNotes` with scene text = last user message + the newest 3
  messages in the request (the hook has `request.messages`) + present names. The tag order rule
  stays: pinned are never dropped; the existing budget trimming (others first, then notebook lines)
  stays.
- Sensor (`notebookTexts`): give the 8 newest notes plus up to 12 most relevant to the new messages
  (dedup by id), in chronological order.
- Dedup on write (`applyNotebook`, REL ~2024): skip a new note when its character-trigram Dice
  similarity (normalized with `norm`) to a live note of the same holder is >= 0.85. Same for
  `told` copies.
Tests: an old relevant note beats newer unrelated ones; pinned always present; the sensor block
holds a matching old note; near-duplicate (one word changed) is skipped, a different note is kept.

## Done means
`bun install` (do not commit lockfile changes), `bun run typecheck` (one known old error at
`src/components/extensions/plugin-panel.tsx:88` is allowed; nothing new), `bun run test` all pass.
Report: files touched, test counts before/after, anything skipped and why, any spec point you
think is wrong.
