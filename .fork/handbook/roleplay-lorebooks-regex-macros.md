# Lorebooks, regex scripts and macros

Verified at: molfar.vertep-roleplay 56bf594

## What it does
Lorebook entries enter the prompt by keys, by constant status, or by a vector match over a threshold. One server function runs the scan, budget and placement. Regex scripts rewrite text on save, on edit, in the prompt, or only for display. Macros are expanded on the server. The browser shows why each entry fired and runs a keyword test through the same scanner.

## Owners
- `plugins/engine/plugin.js` `activateWorldInfo`: the scan, from books in scope to placement.
- `plugins/engine/plugin.js` `wiEntryMatch`: primary and secondary keys and selective logic for one entry.
- `plugins/engine/plugin.js` `keyMatchDirect`: whole-word, regex, Cyrillic word-form and case rules.
- `plugins/engine/plugin.js` `wiVectorHits`: which vectorized entries the scan vector lets in.
- `plugins/engine/plugin.js` `wiBudgetChars`: the character budget from the preset.
- `plugins/engine/plugin.js` `wiFilterInclusionGroups`: one winner per group.
- `plugins/engine/plugin.js` `semanticEmbedWork`: which vectors still need embedding.
- `plugins/engine/plugin.js` `worldBookOf`: the chat's own world book.
- `plugins/engine/plugin.js` `recordFired`: writes the "what fired" log.
- `plugins/engine/plugin.js` `runRegexScripts`: scope, placement, stage and depth gates.
- `plugins/engine/plugin.js` `applyRegexScript`: the replacement, with size guards.
- `plugins/engine/plugin.js` `expandMacros`: macro replacement; `expandIfBlocks` handles `{{#if}}`.
- `plugins/engine/plugin.js` `"wi-status"` route: the status view. `"wi-test"` route: the keyword test (dry run).
- `src/lib/engine.ts` `lorebookToEngine`: app book to engine book; `fetchWIStatus` and `wiTest` call the routes.
- `src/lib/safe-regex.ts` `runRegexSafe`: runs a user pattern in a worker with a timeout.
- `src/lib/display-scripts.ts` `resolveDisplayScripts`: picks display-stage scripts; `MAX_PATTERN` caps length.
- `src/hooks/use-display-texts.ts` `useDisplayTexts`: applies display scripts off the render path.
- `src/lib/lore-entry.ts` `statusOf`: maps the three appearances to status values.
- `src/lib/lore-filters.ts` `matchesEntryFilter`, `src/lib/lore-folders.ts` `cleanFolder`, `src/lib/lore-usage.ts` `bookKind`, `src/lib/lore-export.ts` `exportOneBook`: list filters, folders, book kind, export.
- `src/components/lore/why-rows.tsx` `blockedText`: the held-back labels. `src/components/lore/wi-status-view.tsx` `WiStatusView` and `src/components/lore/keyword-test.tsx` `KeywordTest`: the status panel and test dialog.
- `plugins/studio-import/plugin.js` `normalizeBook` and `embeddedBookToWorld`: book import from card formats.
- `plugins/studio-import/plugin.js` `normalizeRegex` and `PLACEMENT`: regex script import.

## Lorebook entry
Fields the scan reads (book shape in `docs/DATA-FORMATS.md`, "Lorebooks"):
- `keys`, `secondaryKeys`, `selectiveLogic`, `keysRegex`. A key written as `/pattern/flags` is a pattern.
- `status`: `normal`, `constant` or `vectorized`. The `constant` boolean is a legacy mirror.
- `content`, `enabled`, `order` (default 100), `position`, `depth`, `role`.
- `probability`, `group`, `groupWeight`, `groupPrioritize`, `groupOverride`, `sticky`, `cooldown`, `delay`, `delayUntilRecursion`, `nonRecursable`, `preventFurtherRecursion`, `ignoreBudget`, `matchSources`, and the character and trigger filters.
- Book: `settings` (`scanDepth`, `contextPercent`, `budgetCap`, `minActivations`, `maxRecursion`, `recursiveScan`, `includeNames`, `insertionStrategy`) and `vectorized` (`topK`, `thresholdMode`, `scoreThreshold`).

## The scan, step by step
1. Books in scope: those listed in `meta.lorebookIds`, plus `worldBookOf`. `readBoundBooks` reads only these. The app fills `meta.lorebookIds` before each send.
2. Budget starts at the `wiBudgetChars` value. A book's `contextPercent` can raise it, and its `budgetCap` clamps it.
3. Scan depth: `cfg.scanDepth`, else the largest book `scanDepth`, else 4. Recursion passes (`maxPasses`): `cfg.recursionDepth`, else the largest `maxRecursion`, else 3.
4. Scanned text: the last `scanDepth` messages that are not system and not hidden (`windowOf`). `includeNames` adds "Name: ". The pending user text and the author's note (when `includeInWIScan` is set) join in `assemble`.
5. Entries sort by `order` per book. Disabled entries drop out. Each gets the id `bookId#uid`.
6. `wiVectorHits`: with 4 or more vectors the threshold is the mean plus the larger of 2 standard deviations and 0.10, never below 0.25. A smaller pool uses 0.55. `thresholdMode: "fixed"` uses `scoreThreshold`. At most `topK` (default 10) per book.
7. Holds, per entry: trigger and speaker filters (`filterOut`), `delay`, `cooldown`, `delayUntilRecursion`, `nonRecursable`. Held entries go to `blocked` with a reason.
8. A vector hit skips primary keys, and only secondary keys still decide. Otherwise `matchEntry` runs `wiEntryMatch` on the window, plus any `matchSources` text.
9. Probability is rolled once per entry per activation (`rolledOut`). Dry runs never roll. Sticky entries skip the roll.
10. After each pass, `wiFilterInclusionGroups` keeps one winner per group.
11. Recursion: text of newly fired entries joins the window, and the pass repeats up to `maxPasses`.
12. `minActivations`: while too few entries fired, the window deepens, up to `minActivationsDepthMax`.
13. `sticky` and `cooldown` state lives in `meta.wiTimed`. Dry runs leave it alone.
14. Budget: entries sort by strategy rank, then `order` descending. Those past the budget go to `skipped`, unless `ignoreBudget` is set.
15. Placement: admitted entries sort by rank, then `order` ascending. `WI_POSITIONS` maps `position` to a result list; `at_depth` goes to `depth`.

## Regex scripts
- Storage: one file per script at `regex/<id>.json`, read by `loadRegexScripts`. Scope: `global`, `preset`, `chat` or `character`. Placements: `user_input`, `ai_output`, `slash`, `wi`, `reasoning`.
- When each kind runs (`regexAxes`, `runRegexScripts`):
  - Save: scripts with neither flag rewrite the saved text (`regexOnSave`).
  - Edit: scripts with `runOnEdit` run when a saved message is edited (the caller is line 7114 of `plugins/engine/plugin.js`).
  - Prompt: `promptOnly` scripts run on the outgoing prompt, including `wi` text.
  - Display: `markdownOnly` scripts run in the browser.
- Server guards: find patterns over 500 characters are skipped, input is cut to 20000 characters, and a literal-head check skips patterns that cannot match.
- Browser guards (`src/lib/safe-regex.ts`): a Worker with a 300 ms limit for display and 400 ms in the regex view. A timed-out pattern goes into `badPatterns` and is skipped, and the Worker is replaced. A new Worker gets `COLD_START_MS` extra time.

## Macros
`expandMacros` does the replacement, after `expandIfBlocks` handles `{{#if}}`. `macroLookup` resolves operand names.
- Identity: `{{user}}`, `{{char}}`, `{{persona}}`, `{{description}}`, `{{personality}}`, `{{scenario}}`.
- Time: `{{time}}`, `{{isotime}}`, `{{date}}`, `{{isodate}}`, `{{weekday}}`.
- Messages: `{{lastMessage}}`, `{{lastUserMessage}}`, `{{lastCharMessage}}`, `{{idle_duration}}`, `{{summary}}` (always empty), `{{words}}`, `{{limit}}`.
- Variables: `{{setvar::}}`, `{{addvar::}}`, `{{incvar::}}`, `{{decvar::}}`, `{{getvar::}}`, `{{var::name}}`, and the bare name of a preset variable. Flags: `{{vertep.*}}`.
- Other: `{{random::}}`, `{{pick::}}`, `{{roll}}`, `{{trim}}`, `{{//comment}}`, `{{newline}}`.
- Where replaced: `applyRegexScript` (find, replacement and trim strings), `assemble` (prompt parts and lore text, after `rxWI`), transcript and greeting paths, and `saveMacros` on save. The browser Worker's `subMacros` handles only `{{user}}` and `{{char}}`.

## If you change X, also touch Y
- A lorebook field: `docs/DATA-FORMATS.md` ("Lorebooks"), `src/lib/types.ts`, `lorebookToEngine`, `normalizeBook` (`docs/COUPLINGS.md`).
- Scan rules: `activateWorldInfo` and its `dryRun` guards, the labels in `blockedText`, and the `recordFired` shape (`docs/DATA-FORMATS.md`, "What fired").
- Vectors: keep the cache local (`.cache/lorebooks`) and the model tag `m`. Embed calls must send `kinds` (`docs/COUPLINGS.md`).
- Regex stages: `runRegexScripts` and `resolveDisplayScripts`. The 500-character cap is in the engine and in `MAX_PATTERN`; keep them equal.
- Macros: `expandMacros` and `subMacros` in `WORKER_SRC`.

## Traps
- `used` grows for every entry, including skipped ones. After the first skip, every later entry is skipped too, even a short one that fits.
- Constant entries are not exempt from `probability` or the budget.
- A failed probability roll holds an entry for the whole reply. `delay` compares with the total message count.
- Keys are not macro-expanded: `matchEntry` and `keyMatchDirect` never call `expandMacros`. `docs/ARCHITECTURE.md` says `keyMatch()` already has `expandMacros`, which the code does not show.
- The server regex path has no time limit. Only the browser Worker times out.
- The server cuts input to 20000 characters and returns only that cut text, so the rest is lost from a replaced message.
- Keys read the saved text, so a save-stage script changes what the scan sees. A display-only script does not.

## Tests that guard it
- `test/rp-lore-scan.test.ts`, `test/rp-lore-cross-script.test.ts`, `test/rp-wi-vectors.test.ts`
- `test/rp-lore-filters.test.ts`, `test/rp-lore-folders.test.tsx`, `test/rp-lore-export.test.ts`, `test/lore-entry.test.ts`, `test/ui-lore-entry.test.tsx`
- `test/rp-regex.test.ts`, `test/rp-safe-regex.test.ts`, `test/rp-preset-choices.test.ts`

## Not verified
- The Cyrillic three-letter rule and `phraseMatch`.
- Whether an `at_depth` entry with no preset slot falls to the end of the system block.
- `cacheWiVectorBatch` and the full model check.
- Regex scope beyond `inScope`, and display-path macros beyond the Worker.
- Importers other than the ST-style and card-spec shapes.
- Test assertions (file names only checked).
