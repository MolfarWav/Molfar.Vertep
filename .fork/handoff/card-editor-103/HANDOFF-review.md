# Handoff for review: card editor draft + Save (#103), Profile section marks (#105), card task model (#104)

Session 2026-10-22, written by Sonnet 5.5 for review by Opus. Nothing is committed or pushed yet.
Issues (MolfarWav/Molfar.Vertep): #103 Save changes / Discard / leave guard; #104 model for the card's own tasks; #105 section headings in exported cards. The owner asked to do them in one pass.

## Where the work is
- Roleplay fork worktree `E:\Claude\rp-card`, branch `claude/card-editor-103-105`, from fork main `b6e83ed` (Roleplay 4.59.3). **Uncommitted** (29 files, +2059/-98). `node_modules` is a junction to `E:\Claude\rp-inbox\node_modules` (do not commit; it is git-ignored).
- Engine repo `E:\Claude\Chrysalis-Engine` (detached HEAD at the 1.2.13 release commit): only `.fork/app-skills/roleplay/edit-large-card/SKILL.md` (copy of the app's skill) and the new `.fork/handoff/card-editor-103/` (this file + `workspace-agent-task.md`) changed. `.fork/STATE.md` NOT yet updated. No engine code changed.
- Checks run: `bun run typecheck` clean; `bun test test/` in the worktree: **1362 pass, 0 fail** (80 files). Not run: biome lint (Roleplay has no biome.json), engine tests (no engine change).

## What changed, by issue

### #103 draft + Save + leave guard
- `src/lib/card-draft.ts` (pure): `effectivePatch`, `mergeDraft` (3-way: base when the draft began / stored now / mine; `cardExtras` merged per sub-key and per `extensions` key, other fields conflict), `changedPanels`, `FIELD_LABEL`.
- `src/lib/leave-guard.ts`: a registered guard + `guardLeaving(set, get)` wrapper. `src/lib/store.ts` wraps the store's `set` (`(rawSet, get) => { const set = guardLeaving(...); return ({...}) }`): a state change that alters `view`, `drawer`, `activeCharacterId` or `activeChatId` while the editor is dirty is held, the guard asks, and the change is replayed after Save/Discard. This covers every navigation path with one hook (review point: it evaluates function updaters once early when dirty; assumes they are pure).
- `src/hooks/use-back-close.ts`: a layer's `close` may return `false` = stay (the entry is pushed back). Used for the phone back gesture.
- `src/components/character/use-card-draft.ts`: the draft hook (`up`, `saveNow`, `discard`, prompts, conflict flow, beforeunload, `withSavedCard` for export/duplicate, `SideDraft` for a change saved together). `settle()` keeps edits made while a save runs.
- `src/components/character/draft-dialogs.tsx`: leave / action / conflict dialogs.
- `src/lib/store.ts` `updateCharacter(id, patch, onDone?)`: new optional callback with `true/false` (success only after the engine accepted; rollback path calls `false`). Existing optimistic write/rollback untouched.
- `src/components/views/character-editor.tsx`: all edits via `up` into the draft (`c` = stored + draft); old autosave and "Saved" flash removed; bottom Save bar (Discard / Save changes (N)), header chip, amber dots on changed tabs (desktop strip, phone groups, phone menu rows); favourite star, `CardKindMenu` and `SoulTab` use the stored `character` and still write at once (explicit actions); export/duplicate use the stored card via `withSavedCard`; Translate gets `blocked`; field-translate callbacks read `cRef` (working copy). `characters-view.tsx`: `<CharacterEditor key={active.id}>` so a draft never carries to another card.
- Strings `cd.*` in `src/lib/i18n.ts` (en + uk).

### #105 section marks
- `src/lib/profile.ts`: `compileOne` refactored into `partsOf` (same output, the 33 old profile tests pass unchanged); new `compileProfileMarked`, `markedExport`, `hasMarks`, `unmarkText`, `profileFromMarked`, `adoptMarkedSections`. Headings: `## Identity/Appearance/Background/Circles/Relationships/Notes` (description), `## Personality/Behaviors/Goals/Trauma/Sexuality/Notes` (personality); a cast keeps `### Name` and uses `####` inside, shared notes `## Notes` last. Removing heading lines gives the plain text exactly (tested).
- `src/lib/engine.ts` `characterToExportCard(c, books, {markSections?})`; default from `src/lib/export-prefs.ts` (localStorage `rp.export.markSections`, on). No marks for Free write or a hand-edited text (`profileOutOfDate`).
- Import side is at load, not in the importer: `store.ts` (hydrate loop and `loadCharacter`) calls `adoptMarkedSections(c) ?? compileIfWrittenElsewhere(c)`. **Deliberate deviation from the issue**: with the profile present, headings are stripped only if the hash of the unmarked text equals `compiled.hash`; without it, the profile is rebuilt only if it compiles back to exactly the unmarked text. Otherwise the card is untouched (many community cards use `## Personality`; unmatched lines going to notes would reorder their text). The issue said unmatched lines go to the section's notes; not done. A cast without its profile is not rebuilt (headings stay).
- Export menu checkbox "Mark the profile sections" (only for a card with a profile). Strings `ex.*`.

### #104 model for card tasks
- Stored in `characters/<id>/card-tasks.json` (`model`, `maxInput`, `maxOutput`), not in card.json (as the issue recommended). App-wide: `settings.ui.cardTasks.model` (`AppSettings.cardTasks`), Settings > "Card tasks" (`src/components/settings/card-tasks-section.tsx`, nav item in `settings-view.tsx`).
- Chain (client `resolveCardModel` in `src/lib/card-tasks.ts`, plugin `resolveTaskModel`): unsaved pick in the request (`taskModel`) -> card's own -> app-wide -> Dashboard `sensorModel` -> app default.
- `plugins/profile/plugin.js`: `GET/PUT /profile/card-tasks`; Structure it/Fill empty use the chain; request carries `limits {inputChars, outputTokens}` (clamped 3000..400000 / 800..64000) and `card {name, description, personality, scenario, mes_example}` (the editor's working text laid over the stored card); `cardParts` splits a long card at paragraph/line/word edges under field labels (scenario/example only in part 0); `/profile/structure` takes `part`, answers `{part, parts, done}`, merges parts via `mergeProposals` into `profile-drafts/<id>.json` (`partial` flag until done; a failed part deletes the half proposal). Old behaviour (no limits) = one part up to 12000 chars, replacing the old silent cut at 8000/4000. `plugins/relations/plugin.js` `soulModel(..., cardId)`: card's model -> app-wide -> existing order.
- Client: `src/lib/card-tasks.ts` (`taskLimits`: reply = own or 12000/8000, capped by model `maxOut` and half the window, input = window - reply - 1500 overhead; `fitReport`, `requestLimits` using the text's own chars/token), `use-card-tasks.ts` (loads/saves, exposes `SideDraft` so the model choice is written by the same Save), `card-model-panel.tsx` (collapsible panel at the top of the Profile tab), `structure-draft.tsx` (`useProfileDraft(..., extra)`; `runStructure` loops over parts, button shows "Reading the card… 2/4"), `profile-tab.tsx`. Strings `ct.*`.
- Not covered (from the issue): card **translation** (has its own Tools translator) and **Read from picture** (uses the Portrait/Vision model) do not follow the card model; "hide non-vision models" not needed for that reason. Known side effect: on a failed Soul rating, "Choose another model" sets the sensor model, which a card with its own model overrides.

### Docs / tests
- Roleplay: `CHANGELOG.md` (Unreleased, no version bump), `docs/DATA-FORMATS.md` (section marks + card-tasks.json), `.skills/edit-large-card/SKILL.md` (same text copied to the engine repo's `.fork/app-skills/...`). Task for the built-in agent: `.fork/handoff/card-editor-103/workspace-agent-task.md`.
- New tests: `test/rp-card-draft.test.ts` (16), `test/rp-profile-marks.test.ts` (19), `test/rp-card-tasks.test.ts` (23). No component/DOM tests exist for the editor.

## Review focus (my own doubts)
1. `guardLeaving` in the store's `set` (store.ts top of the creator): side effects of evaluating updater functions twice; actions that call `set` and then continue (e.g. `startChatAndOpen` creates the chat on the server before the deferred `set`; if the user stays, an unopened chat remains).
2. Draft semantics in `use-card-draft.ts`: `settle()` after a save, base handling when the stored card changes externally, `saveNow` re-entrancy, conflict prompt replacing the leave prompt (resolved via promise chain).
3. Writers that bypass the draft: `chat-view.tsx` depth-prompt edit, `GroupEditor`, Soul/CardKind/Lorebook links/avatar-from-list, `compileIfWrittenElsewhere` at load. They write straight to the store; the 3-way merge should reconcile, but this is untested in a browser.
4. `adoptMarkedSections` runs for every card at load (cheap `hasMarks` pre-check); it writes through `updateCharacter` (adds an auto version entry).
5. Plugin: chunk merge rules (`mergeProposals`: differing text fields joined with "; "), the rejection of `part` out of range, and that `taskModel`/`card` come from the app's own client (no auth difference, same plugin sandbox).
6. UX not yet checked by eye: Save bar on a phone, dot placement in the phone dropdown, Ukrainian string lengths, the 40 px rule (Save bar buttons `max-md:h-10`, panel inputs `max-md:h-10`).

## Left to do
- Read the browser-check report, fix findings, re-run `bun run typecheck` and `bun test test/`.
- Update `.fork/STATE.md` (engine repo); commit both repos (Roleplay branch; engine: skill copy + handoff docs); push the Roleplay branch only on the owner's word; do not merge to the fork's main (ships to every install: ask first). Bump Roleplay version/APP_VERSION/What's-new tip only at release.
- After release: comment/close #103, #104, #105; note the strict import and the translation/picture exceptions in the #104/#105 comments. File follow-up issues if wanted: unmatched-line notes on import (#105 as written), card translation and Soul "choose another model" following the card model.

## Update after the browser check (same session)
The subagent report: items 1-3 pass at 1280 dark/light, 390 light, uk (leave guard on back arrow/rail/phone history.back, beforeunload only when dirty, export/duplicate asks, conflict dialog, export marks and re-import, card model panel, card-tasks.json only after Save, Settings > Card tasks, Structure it in 12 parts; no app console errors). Findings and what was done:
- A conflict was missed when the external change was less than ~4 s old (the store had not heard of it): FIXED, new store action `refreshCharacter` is awaited in `saveNow` before the merge.
- Save bar text truncated in uk on a phone: FIXED (wraps). Unsaved chip low contrast: FIXED (amber). "11 parts" vs 12 calls: wording changed to "about N parts".
- NOT fixed: toast bottom-right covers part of the Save bar on desktop (shell toaster position); header icon buttons 28 px on phones (existing); Soul tab dot beside the unsaved dot; no hover list of the changed fields (the leave dialog lists them).
Re-run after the fixes: typecheck clean, 1362 tests pass. The browser check was NOT repeated for these small fixes. Both repos are committed locally (Roleplay branch above; engine: this folder + skill copy + STATE), nothing pushed.
