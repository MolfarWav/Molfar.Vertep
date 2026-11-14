# Litopys: story memory, who knows what, and the What fired record
Verified at: molfar.vertep-roleplay 91eec33

## What it does
- Litopys keeps one record per chat: chapters (one per closed scene), arcs (older chapters merged), and facts, each with the people who know it. A background worker writes it; the reply hook only reads it.
- For each reply, the hook adds story parts to the prompt inside a token budget: the chat's record, the earlier chats it continues, and word-for-word passages of those chats.
- Each reply leaves a trace (`litopys/insert/`) and a counter of what it used (`litopys/fired/`), which the What fired panel reads.

## Owners
- `plugins/litopys/plugin.js` `onTick`: one worker step per tick, plus passage index refresh and embedding gaps.
- `plugins/litopys/plugin.js` `pickWork`: takes the next closed scene without a chapter (list from `workList`).
- `plugins/litopys/plugin.js` `findScenes`: proposes scene bounds from Dashboard snapshots.
- `plugins/litopys/plugin.js` `buildWorkerRequest`: the chapter worker's request.
- `plugins/litopys/plugin.js` `applyWorkerResult`: writes the chapter (cast = witnesses) and fact ops.
- `plugins/litopys/plugin.js` `applyTurns`: writes turning points.
- `plugins/litopys/plugin.js` `saveChatFile`: writer of `litopys/chats/<id>.json`; bumps `rev`, removes the far digest.
- `plugins/litopys/plugin.js` `llmRequest`: the reply hook. Builds prompt parts, writes the insert file, calls `recordLitFired`. No model call.
- `plugins/litopys/plugin.js` `buildInsert`: the story record for a reply (full, or ranked inside the budget).
- `plugins/litopys/plugin.js` `buildBackstory`, `backstoryPart`, `farPart`, `turnsFor`: earlier chats, near and far tier, turning points.
- `plugins/litopys/plugin.js` `farDigest`: condensed digest of one finished chat.
- `plugins/litopys/plugin.js` `verbatimFor`, `recallCandidates`, `recallBuild`, `recallSave`: word-for-word passages and their index.
- `plugins/litopys/plugin.js` `witnessed`, `castKnowledgeFor`, `soleVoice`: who knows what.
- `plugins/litopys/plugin.js` `liveLies`, `moveLies`, `endBeliefs`: lies and the belief facts they become.
- `plugins/litopys/plugin.js` `markUsed`, `causeRecord`, `pushTraceRing`: insert file use record and trace ring.
- `plugins/litopys/plugin.js` `recordLitFired`: writes the What fired counter.
- `plugins/litopys/plugin.js` `firedRoute`, `traceRoute`: serve GET /litopys/fired and the reply trace.
- `plugins/litopys/plugin.js` `vectorGaps`, `vectorOf`, `kickEmbedWant`: embedding gaps, lookup, request.
- `src/lib/fired-load.ts` `/litopys/fired`: client read of the counter.

## Data
Per chat unless noted.
- `litopys/chats/<id>.json`: the record. `chapters[]`: `id`, `from`, `to`, `label`, `text` (at most 1500 characters), `cast`, optional `views`, `marked`. `facts[]`: `id`, `text`, `subject`, `knownBy` (`"all"`, names or group tokens), `type` (event, trait, change, relation, world, plan, belief), `weight` (everyday, important, key), `pinned`, `status` (`active` or `retired`), `src`, `origin`, `at`, `updatedAt`. A belief adds `holder`, `lie`, `prov`. `turns[]`: `id`, `text`, `chapterId`, `cast`, `knownBy`, `origin`, optional `untrue`, `believers`, `liar`.
- `litopys/far/<id>.json`: digest `{v, chatId, rev, units, facts, turns}`.
- `.cache/litopys/vectors/<id>.json`: `{id: {hash, vector, m?}}`.
- `litopys/recall/<id>.json` (index: `p` = word stem to chunk numbers, `n`, `title`, `rev`) and `<id>.t.json` (chunks: `t`, `a`, `b`, `c` cast, `k` chapter).
- `litopys/insert/<id>.json`: `used`, `tokens`, `facts`, `chapters`, `cut`, optional `trace`, `causes`, `backstory`, `verbatim`.
- `litopys/fired/<id>.json`: `{v: 1, since, replies, facts, chapters, far?, verbatim?, last: {op, at, keys}}`; each map holds `{n, at}` per id.
- `litopys/config.json` (not per chat): only user changes. Defaults in `DEFAULT_CONFIG`: `budget` 800, `budgetMode` `auto`, `linkBudget` 800, `verbatimBudget` 400, `farShare` 18, `turnsShown` 12.

## When a model is called, and when code decides
- Model calls go through `host.llm`: the chapter worker from `onTick`, plus arc, consolidate, summary and scene-suggest requests. Embeddings go out as `host.llm.embed` under `lit_emb_<chat>` from `kickEmbedWant`.
- `llmRequest` makes no model call. It reads stored records and vectors.
- Code decides: scene bounds, the next scene, prompt part order and budget, ranking, passage matches (two or more shared stems and a chance under `RECALL_CHANCE`), turning-point dedupe (`DICE_LIMIT`), belief endings, the trace.

## Flow
1. A scene closes. `findScenes` proposes bounds; `sceneEnds` marks where scenes end. `pickWork` takes the next scene without a chapter.
2. `onTick` sends `buildWorkerRequest` under `lit_<chat>_<from>_<to>` (`litr_` during a rebuild). An answer longer than the scene allows is asked again once, shorter (`sizeLimit`).
3. `parseWorkerReply` reads the answer. `applyWorkerResult` adds the chapter and facts; `applyTurns` adds a turning point; `saveChatFile` writes the record.
4. `vectorGaps` lists chapters and active facts without a current vector; `kickEmbedWant` asks for them.
5. For a reply, `llmRequest` calls `buildBackstory`, `buildInsert`, `verbatimFor`, `castKnowledgeFor` and the other blocks. `buildInsert` uses the full record when it fits the budget. Otherwise it fills in order: pinned facts of present people or the world, changes and traits of present people, the bridge chapter, then ranked facts and chapters. Chapters get `CHAPTER_SHARE` (0.4) of what is left.
6. `llmRequest` writes `litopys/insert/<id>.json` (never the chat file) and moves the previous trace to the ring through `pushTraceRing`.
7. `recordLitFired` runs for ops `send`, `next`, `swipe`, `continue` or empty. It adds one count per traced fact and chapter. On swipe or continue it first removes the last reply's keys. Each map is capped at `FIRED_CAP` (200).

## Who knows what (knownBy, witnesses, beliefs: where set, where read)
- Set: `queueAdd` gives a new fact `knownBy: "all"` by default. `applyWorkerResult` sets the chapter's `cast` from witnesses. `applyTurns` sets a turning point's `knownBy` to its witnesses, or `"all"`.
- Beliefs: `moveLies` writes a belief with `knownBy: [holder]`, `holder`, `lie`, `prov`, `origin: "dashboard"`. `endBeliefs` retires it when the holder is exposed or the lie is removed. `liveLies` computes believers as those who heard the lie, less those exposed and the liar.
- Read: `buildInsert` (its `known` test), `witnessed`, `castKnowledgeFor`, `turnsFor`/`knownTo`, `untrueTail`, and `verbatimFor` (passages, via `witnessed`).
- Names go through the entity registry (`litCanon`).

## If you change X, also touch Y
- Fact or chapter shape: `applyWorkerResult`, `factOps`, `farDigest`, `factLineOf`, `knownByOf`, `saveChatFile`.
- Budget rule: `budgetModeOf`. `docs/COUPLINGS.md` says the engine's `hookInsertBreakdown` must match; that copy was not read.
- Insert file fields: `traceRoute`, `carriesRoute`, `causeRecord`, and the engine readers listed in `docs/COUPLINGS.md`.
- What fired: `recordLitFired`, `firedRoute`, `src/lib/fired-load.ts`. The engine keeps its own counter, shown beside this one.
- Passage index format: `recallSave`, `recallBuild`, `recallCandidates`, `verbatimFor`; bump `RECALL_V`.
- Embedding model: `vectorOf`, `vectorGaps`. Vectors of another model are not used.
- Lies and beliefs: `liveLies`, `endBeliefs`, `moveLies`, and the believers copy in the Dashboard plugin.

## Traps
- `witnessed` returns true for a chapter with no `cast`; an old chapter without one is visible to every character.
- A fact with no `knownBy` is known to whoever is in the scene, not to everyone.
- `saveChatFile` is the only place that removes the far digest. A new writer of the chat file that skips it leaves a stale far part.
- `budgetModeOf`: a stored `budget` with no `budgetMode` is read as fixed.
- `recallChain` and the link loop in `buildBackstory` both walk the links and must stay in step.
- `recordLitFired` does nothing unless the reply had a trace, a far part or passages.
- `verbatimFor` needs three or more word stems in the scan window; a chat with no link gets no passages.
- The passage index refreshes on the tick only when `cfg.verbatim === true`.

## Tests that guard it
Names confirmed in `test/`. Coverage claims come from `docs/COUPLINGS.md`; test bodies were not read.
- `test/rp-litopys-far-turns.test.ts`, `test/rp-chat-links.test.ts`, `test/rp-litopys-causes.test.ts`, `test/rp-litopys-recency.test.ts`, `test/rp-litopys-budget.test.ts`
- `test/rp-memory-trace.test.ts`, `test/rp-fired-lit.test.ts`, `test/rp-fired-log.test.ts`, `test/rp-verbatim.test.ts`, `test/rp-fired-verbatim.test.tsx`
- `test/rp-litopys-beliefs.test.ts`, `test/rp-litopys-risky.test.ts`, `test/rp-trace-belief.test.tsx`, `test/rp-presence-cut.test.ts`, `test/rp-studio.test.ts`

## Not verified
- `docs/DATA-FORMATS.md` was not searched.
- Not read: `autoEmbedScan` (token cap), `meaningRegions`, `arcStep`, `finishEmbed`, `rankFacts`, `factLineOf`, the call site of `moveLies`, `findScenes` past line 1715, `applyWorkerResult` past line 4110.
- UI files (`src/components/chat/fired-panel.tsx`, `fired-tabs.tsx`, `src/components/library/`, `src/components/memory/`) were only confirmed to exist.
- Engine copies (`hookInsertBreakdown`, `chatChain`, `recordFired`, `believersOf`) were not read.
- "Deep memory" is not a term in the plugin. The feature found is word-for-word passages over linked chats.
