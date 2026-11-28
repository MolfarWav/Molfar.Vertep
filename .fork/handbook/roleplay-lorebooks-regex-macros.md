# Lorebooks, regex scripts and macros
Verified at: molfar.vertep-roleplay e2796362 (key blocks and scene conditions, #547); molfar.vertep-roleplay c54eca7e (the Macros section, nested reader, #516); molfar.vertep-roleplay 4.147.0 (the Regex scripts storage line); earlier: molfar.vertep-roleplay 611d00a (the flags and cap lines); the rest at: molfar.vertep-roleplay efead2b (sections: Owners, Lorebook entry, The scan, secret entries); Owners, Traps also 4e0989b; the rest at 56bf594; scan step 14 (budget) at c603c31

## What it does
Lorebook entries enter the prompt by keys, by constant status, or by a vector match over a threshold. One server function runs the scan, budget and placement. Regex scripts rewrite text on save, on edit, in the prompt, or only for display. Macros are expanded on the server. The browser shows why each entry fired and runs a keyword test through the same scanner.

## Owners
- `plugins/engine/plugin.js` `activateWorldInfo`: the scan, from books in scope to placement.
- `plugins/engine/plugin.js` `wiEntryMatch`: primary and secondary keys and selective logic for one entry.
- `plugins/engine/plugin.js` `wiKeyBlocks`, `wiSceneFilter`, `snapshotOfLine`, `sceneOfSnapshot`, `wiSceneStop`, `sceneContext`: extra key blocks and conditions on the scene (#547).
- `src/lib/lore-conditions.ts` and `src/components/lore/entry-conditions.tsx`: the same caps and shapes in the app, and the editor blocks.
- `plugins/engine/plugin.js` `keyMatchDirect`: whole-word, regex, Cyrillic word-form and case rules.
- `plugins/engine/plugin.js` `wiVectorHits`: which vectorized entries the scan vector lets in.
- `plugins/engine/plugin.js` `wiBudgetChars`: the character budget from the preset.
- `plugins/engine/plugin.js` `wiFilterInclusionGroups`: one winner per group.
- `plugins/engine/plugin.js` `secretOf`, `secretView`, `loreKnowers`, `presenceOfLine`, `loreContext`, `cardNameSet`, route `lore-known`: secret entries (#416).
- `plugins/engine/plugin.js` `semanticEmbedWork`: which vectors still need embedding.
- `plugins/engine/plugin.js` `worldBookOf`: the chat's own world book.
- `plugins/engine/plugin.js` `recordFired`: writes the "what fired" log.
- `plugins/engine/plugin.js` `chatBookReport`: `GET /fired-books`, the chat's books against that log (never fired) and against the entry vectors.
- `plugins/engine/plugin.js` `runRegexScripts`: scope, placement, stage and depth gates.
- `plugins/engine/plugin.js` `applyRegexScript`: the replacement, with size guards.
- `plugins/engine/plugin.js` `expandMacros`: macro replacement; `expandFlat` runs the flat passes, `expandNested` the tree reader (#516); `expandIfBlocks` handles `{{#if}}` in the flat passes.
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
- `probability`, `group`, `groupWeight`, `groupPrioritize`, `groupOverride`, `sticky`, `cooldown`, `delay`, `delayUntilRecursion`, `nonRecursable`, `preventFurtherRecursion`, `ignoreBudget`, `matchSources`, the character and trigger filters, and `secret` (`{knownBy, cover, reveal}`, #416), `moreKeys` (up to 4 `{logic, keys}` blocks; all blocks must hold) and `sceneFilter` (`places`, `present`, `times`, `weather`, each list "any of", all filled lists must hold; #547).
- Book: `settings` (`scanDepth`, `contextPercent`, `budgetCap`, `minActivations`, `maxRecursion`, `recursiveScan`, `includeNames`, `insertionStrategy`) and `vectorized` (`topK`, `thresholdMode`, `scoreThreshold`).

## The scan, step by step
1. Books in scope: those listed in `meta.lorebookIds`, plus `worldBookOf`. `readBoundBooks` reads only these. The app fills `meta.lorebookIds` before each send.
2. Budget starts at the `wiBudgetChars` value. A book's `contextPercent` can raise it, and its `budgetCap` clamps it.
3. Scan depth: `cfg.scanDepth`, else the largest book `scanDepth`, else 4. Recursion passes (`maxPasses`): `cfg.recursionDepth`, else the largest `maxRecursion`, else 3.
4. Scanned text: the last `scanDepth` messages that are not system and not hidden (`windowOf`). `includeNames` adds "Name: ". The pending user text and the author's note (when `includeInWIScan` is set) join in `assemble`.
5. Entries sort by `order` per book. Disabled entries drop out. Each gets the id `bookId#uid`.
6. `wiVectorHits`: with 4 or more vectors the threshold is the mean plus the larger of 2 standard deviations and 0.10, never below 0.25. A smaller pool uses 0.55. `thresholdMode: "fixed"` uses `scoreThreshold`. At most `topK` (default 10) per book.
7. Holds, per entry: trigger, speaker and scene filters (`filterOut`; the scene is read once per scan and only when an entry asks, reasons `place`, `present`, `time`, `weather`), a secret the one speaker does not know with no cover (reason `secret`), `delay`, `cooldown`, `delayUntilRecursion`, `nonRecursable`. Held entries go to `blocked` with a reason.
8. A vector hit skips primary keys, and only secondary keys still decide. Otherwise `matchEntry` runs `wiEntryMatch` on the window, plus any `matchSources` text.
9. Probability is rolled once per entry per activation (`rolledOut`). Dry runs never roll. Sticky entries skip the roll.
10. After each pass, `wiFilterInclusionGroups` keeps one winner per group.
11. Recursion: text of newly fired entries joins the window, and the pass repeats up to `maxPasses`.
12. `minActivations`: while too few entries fired, the window deepens, up to `minActivationsDepthMax`.
13. `sticky` and `cooldown` state lives in `meta.wiTimed`. Dry runs leave it alone.
14. Budget: entries sort by strategy rank, then `order` descending. An entry that does not fit in the room left goes to `skipped` and costs nothing, so a shorter one after it can still fire (#397; it used to stop at the first overflow); `ignoreBudget` entries are always in and still spend.
15. Placement: admitted entries sort by rank, then `order` ascending. `WI_POSITIONS` maps `position` to a result list; `at_depth` goes to `depth`.

Secret entries: each item gets `secretV` once per scan (known: content; cover; marked: content plus a "[Secret: only A knows...]" line for several voices). `contentOf` feeds the prompt, the budget and recursion. Knowers come from the chat each scan: `knownBy`, a `reveal` word in a message (taught to its author and the Dashboard's `present`), `lore-known/<chat>.json` by hand.

## Regex scripts
- Storage: one file per script at `regex/<id>.json`, read by `loadRegexScripts` (engine, Litopys and the Dashboard sensor each in one `host.fs.readMany` call when the engine has it, one `fs.read` per file on an older engine; #432). Scope: `global`, `preset`, `chat` or `character`. Placements: `user_input`, `ai_output`, `slash`, `wi`, `reasoning`.
- When each kind runs (`regexAxes`, `runRegexScripts`):
  - Save: scripts with neither flag rewrite the saved text (`regexOnSave`).
  - Edit: scripts with `runOnEdit` run when a saved message is edited (the caller is line 7114 of `plugins/engine/plugin.js`).
  - Prompt: `promptOnly` scripts run on the outgoing prompt, including `wi` text.
  - Display: `markdownOnly` scripts run in the browser.
- Server guards: find patterns over 500 characters are skipped, input is cut to 20000 characters, a literal-head check skips patterns that cannot match, and a result over 3,000,000 characters leaves the text as it was (#442).
- Browser guards (`src/lib/safe-regex.ts`): a Worker with a 300 ms limit for display and 400 ms in the regex view. A timed-out pattern goes into `badPatterns` and is skipped, and the Worker is replaced. A new Worker gets `COLD_START_MS` extra time. A result over `MAX_OUTPUT_CHARS` (3,000,000) is dropped, the text stays as it was, and the pattern is not marked bad (#442).
- Flags: an empty `flags` string means no `g`, the first match only, on both paths (`applyRegexScript`, the Worker). `regexImport` keeps the slash form's flags exactly (`/(?:)/` gives `""`; it used to give `g`, which put the Voyage preset's stylesheet script at every position of every reply, #442). A script with no `flags` field, and a bare pattern without slashes, stay global. `plugins/litopys` and `plugins/relations` still read an empty flags string as `g` when they compile prompt-stripping patterns.

## Macros
`expandMacros` picks one of two readers. A text with a macro inside a macro, a `{{#setvar::name}}…{{/setvar}}` block or `{{#if::…}}` (`needsNestedMacros`) goes to `expandNested`: `macroTokens` and `macroNodes` build a tree, `evalMacroNodes` runs it left to right, inner macros first. A setvar stores its value already expanded, a branch not taken runs nothing, and every other macro goes through `expandFlat` once its inner macros are resolved. A SillyTavern-form `{{#if}}` (after `::` or built from macros, `ifCondition`) tests the expanded value and keeps its text as written; the app's own form goes to `evalIfCondition` and eats one newline at each end, as before. The tree reader also runs SillyTavern's newer forms: `shorthandMacro` (`{{.x}}`, `{{.x = v}}`, `++`, `+=`, `==`, `||`, `??`…, `$x` the same chat variables), `{{#if .x}}`, and `{{if …}}` without `#` (a `trim` node: `trimScoped` trims and dedents what it shows) with its inline form `{{if cond::content}}`; the ST-form test is `stTrue` (falsy: empty, false, 0, off). `expandMacros` first turns `<USER>`, `<BOT>`, `<CHAR>` into `{{user}}`/`{{char}}`, and `expandFlat` reads the global-variable macros as chat ones; flat `addvar` shows nothing. Any other text goes to `expandFlat`: `expandIfBlocks` handles `{{#if}}` first, then one pass per macro kind, so every setvar of the text runs before any getvar. `macroLookup` resolves operand names.
- Identity: `{{user}}`, `{{char}}`, `{{persona}}`, `{{description}}`, `{{personality}}`, `{{scenario}}`.
- Time: `{{time}}`, `{{isotime}}`, `{{date}}`, `{{isodate}}`, `{{weekday}}`.
- Messages: `{{lastMessage}}`, `{{lastUserMessage}}`, `{{lastCharMessage}}`, `{{idle_duration}}`, `{{summary}}` (always empty), `{{words}}`, `{{limit}}`.
- Variables: `{{setvar::}}`, `{{addvar::}}`, `{{incvar::}}`, `{{decvar::}}`, `{{getvar::}}`, `{{var::name}}`, and the bare name of a preset variable. Flags: `{{vertep.*}}`.
- Other: `{{random::}}`, `{{pick::}}`, `{{roll}}`, `{{trim}}`, `{{//comment}}`, `{{newline}}`.
- Where replaced: `applyRegexScript` (find, replacement and trim strings), `assemble` (prompt parts and lore text, after `rxWI`), transcript and greeting paths, and `saveMacros` on save. The browser Worker's `subMacros` handles only `{{user}}` and `{{char}}`.

## If you change X, also touch Y
- A lorebook field: `docs/DATA-FORMATS.md` ("Lorebooks"), `src/lib/types.ts`, `lorebookToEngine`, `normalizeBook` (`docs/COUPLINGS.md`).
- The Dashboard snapshot's `clock` or `present`, or a World place record's `inside`: the scene conditions read them (`sceneOfSnapshot` copies the place lookup of `plugins/world` `placeRecordOf`; `WI_BANDS` copies `BAND_WORDS`).
- Scan rules: `activateWorldInfo` and its `dryRun` guards, the labels in `blockedText`, and the `recordFired` shape (`docs/DATA-FORMATS.md`, "What fired").
- `chatBookReport` builds the "never" key as `recordFired` writes it (`<bookId>:<uid ?? title>`). The log keeps 300 entries, so a full log (`capped`) only hints at "never".
- Vectors: keep the cache local (`.cache/lorebooks`) and the model tag `m`. Embed calls must send `kinds` (`docs/COUPLINGS.md`).
- Regex stages: `runRegexScripts` and `resolveDisplayScripts`. The 500-character cap is in the engine and in `MAX_PATTERN`; keep them equal.
- Macros: `expandMacros` and `subMacros` in `WORKER_SRC`.

## Traps
- `used` grows for every entry, including skipped ones. After the first skip, every later entry is skipped too, even a short one that fits.
- Constant entries are not exempt from `probability` or the budget.
- A scene condition reads the last reply's snapshot: the message that moves the scene gets the new place's entries one reply later. With the Dashboard switched off, old snapshots still answer.
- A failed probability roll holds an entry for the whole reply. `delay` compares with the total message count.
- Keys are not macro-expanded: `matchEntry` and `keyMatchDirect` never call `expandMacros`. `docs/ARCHITECTURE.md` says `keyMatch()` already has `expandMacros`, which the code does not show.
- The server regex path has no time limit, only the 20000-character cut and the result cap. Only the browser Worker times out.
- The server cuts input to 20000 characters and returns only that cut text, so the rest is lost from a replaced message.
- Keys read the saved text, so a save-stage script changes what the scan sees. A display-only script does not.
- The two macro readers order differently: `{{getvar::x}}{{setvar::x::1}}` gives `1` in the flat passes and empty in the tree reader (SillyTavern's answer). One nested macro anywhere in a text switches the whole text to the tree reader.

## Tests that guard it
- `test/rp-lore-conditions.test.ts`, `test/rp-lore-conditions-app.test.ts`, `test/rp-lore-scan.test.ts`, `test/rp-lore-cross-script.test.ts`, `test/rp-wi-vectors.test.ts`
- `test/rp-lore-filters.test.ts`, `test/rp-lore-folders.test.tsx`, `test/rp-lore-export.test.ts`, `test/lore-entry.test.ts`, `test/ui-lore-entry.test.tsx`
- `test/rp-regex.test.ts`, `test/rp-safe-regex.test.ts`, `test/rp-preset-choices.test.ts`, `test/rp-st-nested-macros.test.ts`
- Against SillyTavern itself: `.fork/bench/st-presets/` (SillyBunny's macro engine run headless on a folder of presets; not a test, needs the owner's files).

## Not verified
- The Cyrillic three-letter rule and `phraseMatch`.
- Whether an `at_depth` entry with no preset slot falls to the end of the system block.
- `cacheWiVectorBatch` and the full model check.
- Regex scope beyond `inScope`, and display-path macros beyond the Worker.
- Importers other than the ST-style and card-spec shapes.
- Test assertions (file names only checked).
