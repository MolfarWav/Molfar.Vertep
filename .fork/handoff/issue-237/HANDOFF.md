# #237: presets that know the app's features (handoff, 2026-11-04)

Read issue #237 in full first: it holds the design, the flag names, the tests and "Done when".
This file says what is done and where the code is, so the next session does not search for it.

## Done
- REQUIRED comment on #237: Vertep Lite's `CORE` (`scripts/vertep-lite.ts`) now says
  "Vertep is the roleplay app this story runs in, not a place, person, power or thing inside the
  story; never bring it into the story. It adds notes in square brackets." Regenerated
  `data/presets/_vertep-lite.json` and `vertep-lite.json`, test in `test/rp-preset-choices.test.ts`.
  Molfar and FRANKENX name Vertep only inside `{{// }}` comments (never sent: the engine strips
  `{{//[^}]*}}`), so no change there. No migration: `onAppUpdate` refreshes every read-only built-in
  copy from its `_<id>.json` template on each update (`plugins/engine/plugin.js`, loop over
  `["frankenx", "molfar", "vertep-lite"]`).
  Roleplay branch `claude/great-hamilton-9o3cov-237` (off `main`), draft PR in the Roleplay repo.

## Left (steps 1-4 of the issue), on the same branch
Base: rebase on Roleplay PR #68 (#238/#239) once it is merged: it exports `expandMacros` from
`plugins/engine/plugin.js` (step 2 needs it) and touches `src/lib/st-structure.ts` / preset docs.

1. **Flags.** `chatFeatures(fsx, meta)` in `plugins/engine/plugin.js`, called once in `assemble()`.
   The lookups to extend: `macroLookup(mc)`, `sectionCondPasses(cond, presetVars, chatVars)` and
   `presetVarOf` (all near the top of the file, ~lines 240-520). `vertep.*` names come after preset
   and chat variables and cannot be shadowed: the `{{setvar}}` regex in `expandMacros` must refuse a
   `vertep.` name. The hooks the flags must agree with (one agreement test per flag on fixture chats):
   `llmRequest` in `plugins/litopys/plugin.js` (~2742), `plugins/relations/plugin.js` (~6998,
   Dashboard), `plugins/world/plugin.js` (~2860, World DM + dice + life + news),
   `plugins/agents/plugin.js` (~2571). Data bank and author's note are engine-side
   (`meta.promptBoard.off`: `databank`, `authorNote`). The files are 7-8k lines: grep the hook
   and read its first decisions, never the whole file.
2. **Utility prompts.** Impersonation: `preset.utilityPrompts.impersonation` in the impersonate
   route (~6138); continue nudge (~6012, not expanded today); Polish: `polishTemplate(preset)` in
   `plugins/polish/plugin.js` (line 75, used at 183 with a plain `{{user}}` split). All three go
   through `expandMacros` with the chat's `resolvePresetVars` and the flags. Test: the built-in
   presets send byte-equal text before and after.
3. **Panel line.** `sources.features` in `POST /prompt/preview`, and one line in
   `src/components/chat/preset-panel.tsx` (133 lines; it lists only `preset.variables`). Strings via
   `src/lib/i18n.ts` (en + uk). Written UI plan first, `ux-review` before and after, browser check
   dark/light/390 px (`.claude/skills/browser-check/` in this repo; needs a throwaway engine with the
   app's own `node_modules`).
4. **Docs.** `docs/DATA-FORMATS.md` (macros: `vertep.*`; presets: utility prompts expand macros),
   `.skills/preset-craft/SKILL.md`, guide `.skills/guide/pages/` and Help article `kb.presets` in
   `src/lib/help-articles.json` (run `node scripts/validate-help.mjs src/lib/help-articles.json
   --repo . --fix-lines` after moving lines), CHANGELOG.
