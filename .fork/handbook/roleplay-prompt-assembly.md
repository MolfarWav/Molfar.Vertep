# Prompt assembly for a Roleplay reply, and the prompt inspector

Verified at: molfar.vertep-roleplay 91eec33, molfar.vertep 8310b23

## What it does
- The engine plugin's `assemble` builds a reply's messages from the preset, card, persona, lorebooks, regex, macros and history. It also returns `sources`, which records where each part came from.
- Sibling plugins add parts through the `llmRequest` hook. The host labels what they add and sends the request.
- The agent page's inspector keeps the last 50 requests per user in memory. The Roleplay peek shows an unsent prompt the same way.

## Owners
- roleplay: `plugins/engine/plugin.js` `assemble`: builds the reply prompt and its `sources` (about lines 3668 to 4598).
- roleplay: `plugins/engine/plugin.js` `orderedPrompts`: preset section order (layout 100001 first).
- roleplay: `plugins/engine/plugin.js` `activateWorldInfo`: lorebook scan, budget, timed effects, skipped and blocked trace.
- roleplay: `plugins/engine/plugin.js` `keyMatch`: primary and secondary keys; `wholeWordIn` checks word edges.
- roleplay: `plugins/engine/plugin.js` `wiBudgetChars`: the lorebook character budget.
- roleplay: `plugins/engine/plugin.js` `expandMacros`: macro pass for card, preset, lorebook and history text.
- roleplay: `plugins/engine/plugin.js` `runRegexScripts`: regex for one placement, prompt stage only.
- roleplay: `plugins/engine/plugin.js` `hookInsertBreakdown`: reserve for sibling inserts.
- roleplay: `plugins/engine/plugin.js` `estimateTokens`, `locateSources`: engine copies of the estimator and locator.
- roleplay: `plugins/engine/plugin.js` `handleRoute`: the `prompt/preview` route.
- roleplay: `plugins/engine/plugin.js` `cleanPromptBoard`: drops switch keys not in `PROMPT_BOARD_OFF_KEYS`.
- roleplay: `plugins/litopys/plugin.js` `llmRequest`: Litopys inserts, placed by `withInsert` and `withTailInsert`.
- roleplay: `plugins/relations/plugin.js` `llmRequest`: Dashboard inserts, placed by its own `withTailInsert`.
- roleplay: `plugins/world/plugin.js` `llmRequest`: World DM, dice, pace, life; `withLast` joins them to the newest user message.
- roleplay: `plugins/agents/plugin.js` `llmRequest`: agent hints; `withLastUser` joins them the same way.
- roleplay: `src/lib/engine.ts` `promptPreview`: client call for the peek.
- roleplay: `src/components/chat/prompt-peek-dialog.tsx` `PromptPeekDialog`; `src/components/chat/prompt-sources.tsx` `PromptSourcesPanel`, `MarkedPre`; `src/lib/tokens.ts` `estimateTokens` (BPE count, peek only).
- engine: `src/inspector.ts` `inspectRequest`: records a request with its sources and estimate; `listInspected`, `getInspected`, `clearInspected`.
- engine: `src/prompt-sources.ts` `locateSources`: finds each part's text; `hookInsertions` labels what a hook added.
- engine: `src/plugins/runtime.ts` `applyLlmRequestHooks`: runs sibling hooks and keeps allowlisted fields; `collectSiblingLlmHooks` picks them.
- engine: `src/models.ts` `inspectGenerate`: records the entry; `generateModel`: only the leading system run is the system prompt.
- engine: `src/agent/context-budget.ts` `estimateTextTokens`: the character-class estimate.
- engine: `src/server/app.ts` `/v1/inspector`: list, get by id, clear.
- engine: `client-agent/src/Inspector.tsx` `Inspector`, `Detail`; `client-agent/src/inspector-sources.tsx` `SourcesPanel`, `MarkedText`; `client-agent/src/api.ts` `inspectorApi`.

## Order of parts in a reply's prompt
1. Preset sections before the history marker, in preset order: main prompt, world info, card description, personality, scenario, persona, example chat. Card and preset text gets macros only. A section is dropped when switched off, off for this chat (`section:<id>`), failing its condition, or not matching the generation type.
2. Extras above the history: data bank chunks, author's note when not at a depth (not verified in full), new-chat marker, group nudge, stage directions, hint.
3. Chat history: visible turns minus those Litopys holds. Each turn gets regex, then macros, then a name prefix if the names setting asks. Depth injections are spliced in from the newest turn.
4. Preset sections after the history marker, then post-history instructions.
5. Squash of consecutive system messages if `studio.squashSystemMessages` is set. The assistant prefill goes last.
6. Sibling hooks run after assembly, lower priority first. Litopys memory and story go after the leading system block; Litopys tail parts and Dashboard parts go just before the newest non-system message; World and agent text is appended to the newest user message.

## How other plugins add parts (the hook)
- `llmRequest(ctx, host)` answers only for `ctx.key === "reply"` and returns a patch with `messages` and optionally `promptSources`.
- The runtime keeps only `LLM_PATCH_FIELDS` (messages, systemPrompt, model and a few more). A sibling needs the `hooks` and `llm` permissions; a crashing hook is skipped.
- A hook's own labels are kept. Text it added that no label covers gets the plugin's name, kind `plugin`.
- Users: Litopys (memory, story, recollections, who-knows, hidden plan), Dashboard (relationship, journal, said, fast sensor), World DM (event, "World · here", dice, pace, life), agents ("Agent: <label>"). Tools arrive only when the request sets `wantsTools`, through `siblingTools`.

## Budgets and what gets cut
- Window: the model's context (`presetMaxCtx`). Reply reserve: the preset's max-output setting, else 1024.
- Hook reserve: the ceilings of sibling inserts, from settings, not measured sizes.
- History budget: window minus reply minus hook reserve minus 64 tokens.
- History cut: first the messages Litopys holds as chapters (`litopysFitCut`), then the oldest turns while over budget, keeping one. Reported as "over the context budget". If it still does not fit, `tooSmall` is returned.
- Lorebook: its own budget in characters, a quarter of (window minus reply) in tokens times 4. `contextPercent` and `budgetCap` rescale it. Entries claim it by `order`, higher first. `ignoreBudget` entries are always in but still spend. The first normal entry that does not fit, and every later one, is skipped with reason "budget".
- Preset sections are never cut by budget; only switches and conditions drop them.

## The inspector (data path from a reply to the screen)
1. `assemble` returns `sources` (parts, omitted, vars). Generation calls pass them as `promptSources`.
2. The runtime sanitizes `promptSources`, then applies the sibling hooks.
3. `inspectGenerate` in `src/models.ts` calls `inspectRequest`, which builds tokens per message, tool sizes and the estimate.
4. `locateSources` finds each part's text in the request. Texts under 12 characters match only as whole messages. A part not found shows, but its tokens count as unlabelled.
5. Entries are kept per user, newest first, up to 50, in memory. A restart clears them.
6. `/v1/inspector` serves the list, one entry by id (404 "not in the inspector any more") and clear. `SourcesPanel` groups parts by kind and shows each share of `entry.estimate`.
7. Labels are written where each part is added: "<card> · <field>", "<preset> · <section>", "<book> · <entry>", "<speaker> · #<n>", "<file> #<n>". Unknown kinds show as "other".
8. Token estimate (`estimateTextTokens`): ASCII characters divided by 3.5, characters below U+2E80 divided by 2, the rest one each, rounded up. A message adds 4. It is deliberately conservative: on sample Roleplay texts it came out 13% above Roleplay's BPE count for English prose, 25% for an English guide page, 27% for Ukrainian prose, 5% below for JSON, and 21% above for one mixed prompt (system plus 8 messages: 3217 against 2666). So the peek and the inspector differ for one prompt by design; neither is the provider's count. Measured 2026-11-11 with `gpt-tokenizer` o200k_base (Roleplay `src/lib/tokens.ts`) against `src/agent/context-budget.ts`.
9. The peek: `promptPreview` posts to `prompt/preview`; the engine runs `assemble` with `dryRun: true`. `PromptPeekDialog` shows the panel.

## If you change X, also touch Y
- Add a part kind: `SOURCE_KINDS` in `src/prompt-sources.ts`, and the KIND tables in both `client-agent/src/inspector-sources.tsx` and `src/components/chat/prompt-sources.tsx`.
- Add a sibling insert: its row in `hookInsertTable` or an `insertCeiling` export, or the history budget leaves no room.
- Change the token estimate: `estimateTextTokens` in `src/agent/context-budget.ts` and `estimateTokens` in `plugins/engine/plugin.js`. The peek's BPE count is separate.
- Change the locator: `locateSources` in `src/prompt-sources.ts` and its copy in `plugins/engine/plugin.js`.
- Change the message hash: `promptHash` in `plugins/engine/plugin.js` and `plugins/litopys/plugin.js`.
- Change tail placement: `withTailInsert` in `plugins/litopys/plugin.js` and `plugins/relations/plugin.js`.
- Add a board switch key: `PROMPT_BOARD_OFF_KEYS`. A key missing from it is erased on save.

## Traps
- One prompt, two totals: the peek counts with a BPE tokenizer, the inspector with the character estimate.
- The lorebook budget counts characters, not tokens.
- Only the leading run of system messages is the system prompt. A later system part stays in place (see `generateModel`).
- World and agent text is joined into the newest user message, not sent as its own turn.
- The hook reserve is a ceiling. A hook that writes more than its ceiling is not cut.
- Lorebook and history text get regex; card and preset text do not.
- `{{random}}` and `{{roll}}` re-roll on each expansion; `{{summary}}` is always empty.
- A preview runs with `dryRun`: no timed lorebook state, no probability roll, no files written.
- Inspector labels rely on exact text; a part a hook edited shows as unlabelled.

## Tests that guard it
- roleplay: `test/rp-prompt-order.test.ts`, `test/rp-prompt-board.test.ts`, `test/rp-prompt-sources.test.ts`, `test/rp-hook-reserve.test.ts`, `test/rp-lore-scan.test.ts`, `test/rp-litopys-budget.test.ts`.
- engine: `test/inspector.test.ts`, `test/prompt-sources.test.ts`, `test/context-budget.test.ts`.

## Not verified
- Whether a real Roleplay reply shows its sources outside the peek.
- How sibling hook priorities are set in manifests.
- Dashboard and Litopys insert text, beyond the table rows.
- `keyMatchDirect`, `crossScriptKey`, the vector path, `withModelLimits`, `expandIfBlocks`.
- When `wantsTools` is set on Roleplay replies.
- What happens when a hook exceeds its reserve.
- The author's note placement rule in full.
