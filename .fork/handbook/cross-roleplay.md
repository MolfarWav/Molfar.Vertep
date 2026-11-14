# Roleplay: traps and "change X, touch Y", collected from every page

Built by a script from the pages of this handbook; do not edit by hand. When a page changes,
rebuild this file. The page named in each heading has the detail.


## From `roleplay-dashboard.md`

Change X, touch Y:
- Sensor output shape: the default sensor prompt parts, `applySensor` and the apply functions that read each field, `docs/DATA-FORMATS.md` "Dashboard state", `test/rp-dash-journal.test.ts`.
- Journal fields or caps: `keepJournalLines`, `journalPreviousLines`, `journalBlock`, prompt board key `plugin:journal` in `llmRequest`, the journal row in `docs/COUPLINGS.md`.
- A new insert part or budget: `insertCeiling` must match `buildInsert`, and the engine's fallback table must change with it (`docs/COUPLINGS.md`).
- The clock: `advanceClock`, `clockLine`, `NEW_DAY_BACK`, `test/rp-dash-clock.test.ts`.
- Lie beliefs: `believersOf` has a copy in the Litopys plugin (`docs/COUPLINGS.md`, beliefs).
- Name helpers: `askSensor` depends on `expandNamesFor`, which has copies in other plugins (`docs/COUPLINGS.md`, helper names).

Traps:
- A non-JSON answer is not retried. Only a rate-limit error is.
- A snapshot without `sig` is never read again.
- The sensor sees the previous people lines but never the previous thought.
- A clock time the report does not state is marked approximate. The day count only moves forward.
- A new insert part without a row in `insertCeiling` overflows the window silently.
- A user journal line always wins over a sensor line. No route writes user lines yet.
- `docs/JOURNAL-HANDOFF.md` is cited in the comment above `journalPreviousLines`, but the file is not in `docs/`.


## From `roleplay-entity-registry.md`

Change X, touch Y:
- Matching steps (`regFind`, `regTranslit`): edit `src/lib/entity-registry.js`, run `bun scripts/sync-registry.ts`, and keep `xsTranslit` in `plugins/engine/plugin.js` in step. Its comment asks for this.
- File shape or repairs (`regValidate`, `regLoad`): check the old-card repair tests in test/rp-dash-registry.test.ts.
- Thing id prefix: `regValidate`, the `t#` to `o#` rename in plugins/relations/plugin.js (near lines 1615, 2513 and 2526), and the World prompt's `ref` rule (plugins/world/plugin.js near line 2112).
- Merge rules (`regMerge`, `regApart`): the Dashboard merge UI in `src/components/dashboard/dash-merge.tsx` and the `MergeOp` type in `src/lib/dashboard.ts`.
- Anything the World DM stores as a name (`canonSpace` in `applyReport`).
- Voice colours: `voicesRoute`, `pickVoiceColors` and `src/lib/chat-voices.ts`.

Traps:
- docs/ENTITY-REGISTRY.md says World `holder` and `inside` become ids in phase B. The code still stores display names (`canonSpace` in plugins/world/plugin.js, via `regCanon` and `canonPlaceName`). Do not assume an id.
- There are two transliteration functions: `regTranslit` (registry) and `xsTranslit` (lorebook). They must agree on the same words. A test checks behaviour, not the two functions directly.
- The sync script copies the source into relations, world and litopys only. The engine and agents plugins have no copy of `resolveName`.
- `resolveName` can return `{ ambiguous }` with no `id`. Check `r.id` before use. Callers check `r.step > 1` before `regLearn`.
- `regLoad` uses the `from` chat's file only when the chat has no file of its own. A malformed file gives an empty registry, not the copy.
- `t#` is a Dashboard thread and a thing is `o#`. Older files are renamed on load. Some test titles still say `t#`, for example test/rp-world-ids.test.ts line 41.
- A Dashboard rename does not change registry names. A stale name in `personIds` is looked up again and dropped if it no longer resolves.


## From `roleplay-forge-agents.md`

Change X, touch Y:
- A card, checker rule or executor step: edit the source, run the sync script, commit both, update tests and the "Agents" section of `docs/DATA-FORMATS.md`.
- A Dashboard field: `DASH_FIELDS` and `DASH_WRITE_FIELDS`, the Dashboard in `plugins/relations`, and `docs/ARCHITECTURE.md`.
- A permission: `UNSUPPORTED_NEEDS`, the checker's `needs`, and the permission prompt text.
- An error code: `docs/DATA-FORMATS.md` and the `ag.issue.<CODE>` keys read by `src/lib/agent-issues.ts`.
- A recipe: its file in `.skills/agent-craft/references/`, then the recipe sync script.
- `expandNames`: five plugins carry a copy (see `docs/COUPLINGS.md`).

Traps:
- A hand edit between the markers is overwritten by the next sync, and the generated-block test fails.
- `summary` passes the checker as an Input source, but `sourceValue` returns nothing for it. `preGenInjections` and `parallelResults` are refused by `UNSUPPORTED_NEEDS`.
- `docs/DATA-FORMATS.md` says the `before` and `parallel` triggers are not yet run. The code runs them (`pickAgents`, `runBefore`), so that note looks stale.
- A regenerated reply restores state from before, so a rerun does not count twice.
- `.skills/agent-craft/SKILL.md` names paths under `apps/roleplay/`, which do not match this repo.


## From `roleplay-import.md`

Change X, touch Y:
- Card fields (`normalizeCard`): also `writeCardWithBook`, the export side `buildCardPng` in `src/lib/png-card.ts`, and the "Card and lorebook formats" entry in `docs/COUPLINGS.md`.
- PNG reading: two copies, `extractCharaFromPng` and `cardFromPngBase64`. They differ on iTXt.
- Picture caps: `EMOTION_BUDGET` in `src/lib/card-import.ts` and `EXPRESSIONS_BUDGET`, `MAX_EMOTION`, `MAX_AVATAR` in the plugin.
- Asset URL shape: `ASSET_URL` in the plugin must match `storeImageAsset` in `src/lib/engine.ts`.
- Folder names: `COLLECTION_DIRS`, `ROOT_FILES`, the phase list, and the `taken` paths in `uid`.
- Chat memory shape: `sources` entries written by `importChat`, read by `previewImport`.

Traps:
- The browser PNG reader ignores iTXt. Direct import of such a card fails. The plugin's iTXt handling applies only inside zips.
- File kind is by extension in `importCardFiles` but by bytes in `cardFileKind`.
- The size-limit text conflicts: the plugin says 16 MB, the browser says 200 MB for the same route.
- A library zip does not restore themes or backgrounds. The batch route does write themes.
- Re-import makes copies, not merges.
- Card regex scripts are stored twice.
- A chat without a sidecar lands on preset `default` and the settings persona.
- The chat-memory `dup` flag is a mark only; it does not block selection.


## From `roleplay-letters-mailbox.md`

Change X, touch Y:
- Adding a letter `why`: `WHYS` and `buildLetterRequest` in `plugins/letters/plugin.js`; `LetterWhy`, `candidatesFor` and `CARD_REFUSALS` in `src/lib/letters-core.ts`; `openLetter` in `src/components/shell/inbox.tsx`. Then the tests below.
- Changing a default limit: `DEFAULT_CONFIG` in `plugins/letters/plugin.js` and `DEFAULT_LETTERS_CONFIG` in `src/lib/letters-core.ts` both hold the same values. Change both, and the ranges in `cleanConfig`.
- Changing the streak: `FAIL_AFTER` and `MODEL_FAILURES` in `src/lib/letters-core.ts`; the streak tests.
- Changing the helper names: the `expandNames` copies (`plugins/letters` is one of five) listed in `docs/COUPLINGS.md`.
- Changing mailbox item kinds: `MailItem` and `valid` in `src/agent/mailbox.ts`, `acceptMail` in `src/agent/memory.ts`, and the preview in `listMail` in `src/server/app.ts`.

Traps:
- The premise that the engine mailbox holds letters or finished chats is wrong. Its kinds are `skill`, `add`, `replace` and `retire`. Roleplay has no reference to `/v1/agent/mailbox` or `queueMail`.
- The failure streak lives in the browser's localStorage, not on the server. Another browser does not see it.
- The day cap counts only letters that were written, on the UTC day. A failed pass does not use up the cap.
- The plugin's Soul check (`hasSouls`, the card file) and the client's (`soulsOf`) can disagree. The plugin decides.
- `dismissLetters` keeps the cooldown, so a dismissed card waits. Opening a letter also dismisses it.
- `{{user}}` stays raw in unplayed and nosoul letters on purpose (`docs/COUPLINGS.md`).
- `docs/COUPLINGS.md` has no Letters section. Letters appear only under "Names in helper requests".


## From `roleplay-litopys.md`

Change X, touch Y:
- Fact or chapter shape: `applyWorkerResult`, `factOps`, `farDigest`, `factLineOf`, `knownByOf`, `saveChatFile`.
- Budget rule: `budgetModeOf`. `docs/COUPLINGS.md` says the engine's `hookInsertBreakdown` must match; that copy was not read.
- Insert file fields: `traceRoute`, `carriesRoute`, `causeRecord`, and the engine readers listed in `docs/COUPLINGS.md`.
- What fired: `recordLitFired`, `firedRoute`, `src/lib/fired-load.ts`. The engine keeps its own counter, shown beside this one.
- Passage index format: `recallSave`, `recallBuild`, `recallCandidates`, `verbatimFor`; bump `RECALL_V`.
- Embedding model: `vectorOf`, `vectorGaps`. Vectors of another model are not used.
- Lies and beliefs: `liveLies`, `endBeliefs`, `moveLies`, and the believers copy in the Dashboard plugin.

Traps:
- `witnessed` returns true for a chapter with no `cast`; an old chapter without one is visible to every character.
- A fact with no `knownBy` is known to whoever is in the scene, not to everyone.
- `saveChatFile` is the only place that removes the far digest. A new writer of the chat file that skips it leaves a stale far part.
- `budgetModeOf`: a stored `budget` with no `budgetMode` is read as fixed.
- `recallChain` and the link loop in `buildBackstory` both walk the links and must stay in step.
- `recordLitFired` does nothing unless the reply had a trace, a far part or passages.
- `verbatimFor` needs three or more word stems in the scan window; a chat with no link gets no passages.
- The passage index refreshes on the tick only when `cfg.verbatim === true`.


## From `roleplay-lorebooks-regex-macros.md`

Change X, touch Y:
- A lorebook field: `docs/DATA-FORMATS.md` ("Lorebooks"), `src/lib/types.ts`, `lorebookToEngine`, `normalizeBook` (`docs/COUPLINGS.md`).
- Scan rules: `activateWorldInfo` and its `dryRun` guards, the labels in `blockedText`, and the `recordFired` shape (`docs/DATA-FORMATS.md`, "What fired").
- Vectors: keep the cache local (`.cache/lorebooks`) and the model tag `m`. Embed calls must send `kinds` (`docs/COUPLINGS.md`).
- Regex stages: `runRegexScripts` and `resolveDisplayScripts`. The 500-character cap is in the engine and in `MAX_PATTERN`; keep them equal.
- Macros: `expandMacros` and `subMacros` in `WORKER_SRC`.

Traps:
- `used` grows for every entry, including skipped ones. After the first skip, every later entry is skipped too, even a short one that fits.
- Constant entries are not exempt from `probability` or the budget.
- A failed probability roll holds an entry for the whole reply. `delay` compares with the total message count.
- Keys are not macro-expanded: `matchEntry` and `keyMatchDirect` never call `expandMacros`. `docs/ARCHITECTURE.md` says `keyMatch()` already has `expandMacros`, which the code does not show.
- The server regex path has no time limit. Only the browser Worker times out.
- The server cuts input to 20000 characters and returns only that cut text, so the rest is lost from a replaced message.
- Keys read the saved text, so a save-stage script changes what the scan sees. A display-only script does not.


## From `roleplay-memory-chain.md`

Change X, touch Y:
- The chain rule: `chatChain` in the engine and `recallChain` or `buildBackstory` in litopys. They are two copies.
- `verbatimBudget` limits: the reserve row "litopys verbatim" in `hookInsertTable` (engine) uses the same clamp.
- The vector file shape: Litopys `SHELF_*` names, engine `shelfVectorsFor`, and the split code on both sides.
- Editing a Data Bank file's text: use the `PATCH` branch of `/databank/:id`, which drops the stale vector (`dropShelfVector`).
- A snapshot book's shape: `bookChunks`, `chunkVisibleTo`, and DATA-FORMATS.
- Who knows what: `bookKnowers` must expand group tokens as the groups do.
- The archive rule: `ARCHIVE_BLOCKED` and `linkRoute` together.

Traps:
- DATA-FORMATS says a chat-scoped file reaches "up to 3 links back". The code walks up to 40 (`CHAIN_WALK_MAX`, `RECALL_CHAIN_MAX`), and COUPLINGS says 40. Treat the DATA-FORMATS line as stale.
- The CONTINUES sentence repeats in every near part, about 130 tokens each. At the default `linkBudget` of 800, a chain of four or more chats leaves the oldest near chat no room (COUPLINGS).
- A snapshot book matches names by spelling. "Sin" does not match "Sina Rose", and a nickname does not match at all (COUPLINGS).
- The profile plugin has no memory code. Character memory from imports is `importChat` in litopys.
- Making a link archives the earlier chat without asking, unless `archiveOnContinue` is off.
- Vectors of another model are ignored, and a file of another model is replaced as a whole.


## From `roleplay-personas-profile.md`

Change X, touch Y:
- The persona frame text (`personaFrame`): the litopys `PERSONA_MEMORY_RULE` and the presets' own lines (docs/COUPLINGS.md, "The persona text carries a knowledge frame"). Run `test/rp-persona-frame.test.ts`.
- The profile fields (`SHAPE`, `FIELDS`): the prompts, `src/lib/profile.ts`, and docs/DATA-FORMATS.md.
- `DEFAULT_POLISH`: `src/lib/seed.ts`. `test/rp-polish.test.ts` checks that the two are equal.
- The talkativeness rule: the engine copy and `src/lib/talkativeness.ts`. `test/rp-talkativeness.test.ts` compares them.
- The dice (`roll_dice`): do not feed it into the World DM check (docs/COUPLINGS.md, "Two kinds of dice").
- The binding rule: `newChat` in `src/lib/store.ts`, and the fallback in `chatPersona`.
- The Soul fields: docs/SOUL.md, `src/lib/soul.ts`, `hasSouls` in letters, and the relations plugin.

Traps:
- The profile plugin never writes a card or a persona, and it never writes `molfar_soul`. Only the Soul tab writes the Soul.
- A card's compiled text is overwritten on the next save after a hand edit, once the app has asked.
- `chatPersona` must not call `chatUserName`: the comment in the engine says the recursion overflowed the stack.
- Helper calls with no chat leave `{{user}}` raw on purpose.
- Binding mode `chat` does not change which persona a new chat starts with.
- Editing the profile text changes group speaking weights for cards with no talkativeness value.
- The persona frame adds about 45 tokens to every request for every preset (docs/COUPLINGS.md).
- `roll_dice` is not seeded, so a swipe gives a new number. The World DM check is seeded.
- Custom tool handlers are stored code run with the host object. Treat imported tools as code.


## From `roleplay-pictures-sprites.md`

Change X, touch Y:
- Emotion list (`RULES`, `STANDARD_EXPRESSIONS`): the Cyrillic stems, `SYNONYMS` and `parseSpriteFile` in `src/lib/expressions.ts`, and the datalist in `sprite-batch-dialog.tsx`.
- Sprite shape: `mergeSprites` in `src/lib/sprite-batch.ts`, `SpritesPanel`, and `keepStoredSpriteImages` in `plugins/engine/plugin.js`, which keeps stored images on save.
- Picture modes: `IMAGE_PROMPT_MODES` in `plugins/engine/plugin.js` and `IMAGE_MODES` in `src/lib/image-gen.ts`.
- Picture tool text: `handleTool` and `IMAGE_TAGS_DESCRIPTION` in `plugins/tools/plugin.js`.
- Portrait text: `portraitRoute` in `plugins/profile/plugin.js` and `portraitPrompt` in `src/lib/portrait-draw.ts`.
- Any call that sends a picture: `images: [img]` in `fillRoute` and `structureRoute` (`plugins/profile/plugin.js`), and the warning in `structure-draft.tsx`.

Traps:
- A sprite with no URL is an empty slot. `spritePool` leaves it out.
- Deleting the default sprite moves the default to the first one left. Deleting an outfit's last sprite clears the card's outfit (`sprites-panel.tsx`).
- Sprites show only when `showExpressionSprites` is true. An unset value counts as on in the expression panel, but off in the message row.
- Keyword rules match word starts, so one stray word can pick the wrong label.
- When the vision branch is off, the structure draft sends no picture and shows no warning. The warning appears only when a portrait cannot be read.
- A portrait for a group is never drawn (`missingPortraits`).
- A hidden picture is out of the model's history, but its prompt is visible in the attachment name.
- No image model gives a 503 with a plain message (`generateImage`).


## From `roleplay-presets.md`

Change X, touch Y:
- A field on `Preset` (`src/lib/types.ts`): `presetToEngine`, `enginePresetToUI`, the reader in `assemble`, and `presetExport`.
- A stock preset: its `_<id>.json` template and its file. A new stock id must join the loop in `onAppUpdate`; `test/rp-chat-features.test.ts` lists the built-ins.
- A prompt board switch key: `PROMPT_BOARD_OFF_KEYS` or `PROMPT_BOARD_OFF_RE`, and the carries strip (`docs/COUPLINGS.md`).
- The persona line in the built-in presets: `personaFrame` in `assemble` (`docs/COUPLINGS.md`).

Traps:
- An empty object from the new-chat step is truthy, so `stepVars || ...` skips per-character memory and the user's default picks.
- `presetToEngine` writes a top-level `stop`, but no reader of it appears in `plugins/engine/plugin.js`; stop strings come from `studio.samplers.stopStrings`.
- Only the string `"absolute"` makes a depth injection. Raw SillyTavern numeric `injection_position: 1` is read as a normal section.
- `default.json` writes `prompt_order` as a flat list the engine skips, so every section is on.
- `importPreset` saves the preset before the regex batches, with no rollback.
- A file without `samplers` takes the open preset's numbers.
- The diff matches sections by name; two sections with one name show as one row.
- The engine's preset `PUT` does not enforce `readOnly`; only `updatePreset` does.


## From `roleplay-prompt-assembly.md`

Change X, touch Y:
- Add a part kind: `SOURCE_KINDS` in `src/prompt-sources.ts`, and the KIND tables in both `client-agent/src/inspector-sources.tsx` and `src/components/chat/prompt-sources.tsx`.
- Add a sibling insert: its row in `hookInsertTable` or an `insertCeiling` export, or the history budget leaves no room.
- Change the token estimate: `estimateTextTokens` in `src/agent/context-budget.ts` and `estimateTokens` in `plugins/engine/plugin.js`. The peek's BPE count is separate.
- Change the locator: `locateSources` in `src/prompt-sources.ts` and its copy in `plugins/engine/plugin.js`.
- Change the message hash: `promptHash` in `plugins/engine/plugin.js` and `plugins/litopys/plugin.js`.
- Change tail placement: `withTailInsert` in `plugins/litopys/plugin.js` and `plugins/relations/plugin.js`.
- Add a board switch key: `PROMPT_BOARD_OFF_KEYS`. A key missing from it is erased on save.

Traps:
- One prompt, two totals: the peek counts with a BPE tokenizer, the inspector with the character estimate.
- The lorebook budget counts characters, not tokens.
- Only the leading run of system messages is the system prompt. A later system part stays in place (see `generateModel`).
- World and agent text is joined into the newest user message, not sent as its own turn.
- The hook reserve is a ceiling. A hook that writes more than its ceiling is not cut.
- Lorebook and history text get regex; card and preset text do not.
- `{{random}}` and `{{roll}}` re-roll on each expansion; `{{summary}}` is always empty.
- A preview runs with `dryRun`: no timed lorebook state, no probability roll, no files written.
- Inspector labels rely on exact text; a part a hook edited shows as unlabelled.


## From `roleplay-ui-shell.md`

Change X, touch Y:
- Add a section: `SECTIONS` in `sections.ts`, `ViewKey` in `store.ts`, `renderView`, `RAIL_HUES`, `DRAWER_VIEWS` if a drawer, and both languages.
- Add a settings tab: `SECTIONS` or `navItems` in `settings-view.tsx`.
- Change a palette token: `globals.css` `:root` and `.dark`, and `ThemeApplier`'s key list.
- Change Dashboard tabs: `DashTabId`, `TONE_TAB` (`dash-common.tsx`).
- Change Canvas boards: `CanvasBoardKey` (`src/lib/canvas-board.ts`) and the Agents item.

Traps:
- `settings` has group `'none'` (off the rail); Home's Settings button opens it.
- Two arrays are named `SECTIONS`: `sections.ts` and `settings-view.tsx`.
- Agents and Canvas share the key `canvas`, so `SectionDrawer` titles an open Agents drawer "Canvas".
- `ViewKey` also holds `connections` (shows Home) and `chat`; neither is in `SECTIONS`.
- On desktop a persisted section view becomes a drawer over Home; `drawer` is not persisted.
- Settings nav mixes hard-coded English labels with translated ones.
- `ThemeApplier`'s doc comment sits above `PROSE_FONTS`, not the component.


## From `roleplay-world-dm.md`

Change X, touch Y:
- Clock sizes or front fields: `cleanFront`, `applyLevel`, `clockStage`, `docs/DATA-FORMATS.md`.
- Dice bands or tilts: `DICE_BANDS`, `DICE_TILTS`, `diceOutcome`, `src/lib/world.ts`, `dice-log.tsx`.
- Record kinds or fields: `KINDS`, `cleanEntity`, `applyReport`, `entryOf`, and `docs/COUPLINGS.md`, "World DM and Dashboard shared ids".
- Anything that must rewind on swipe: `CORE_KEYS`, `undoFrom`, and the coupling in `docs/COUPLINGS.md`, "World DM rollback follows the chat's line".
- Deck size: `DECK_MIN`, `DECK_MAX`, `cleanDeck`, `DECK_SYSTEM`.

Traps:
- `DECK_MIN` (8) appears only in the deck prompt text. `deckRoute` keeps whatever the model returns.
- The roll_dice tool in `plugins/tools/plugin.js` uses Math.random and is not logged by World. World's dice are seeded per chat, message and swipe.
- `llmRequest` marks the event sent before the reply exists. A reply that never lands is caught later by `eventLost`.
- In code mode the model's tick ops are dropped silently.
- A deck card is used up only when an event is set. A catch-up run leaves the deck alone.
- `undoFrom` keeps records the player edited after the snapshot, so a deleted reply does not undo hand edits.
- A chat with no state file counts as on at chronicler; only level `off` in a state file keeps it off.
