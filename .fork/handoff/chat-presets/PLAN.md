# Presets with choices, Marinara import, FRANKENX built in (0.9.6, started 2026-10-10)

Roleplay work: clone `.claude/worktrees/rp-memory`, branch `presets` (from `v095`, 4.30.0 prepared).
Engine notes: branch `claude/v096-presets` (worktree `.claude/worktrees/v096`). No engine code expected.

## The user's decisions (2026-10-10)
- Choices are made in a "Preset" panel in the chat (quick bar), and in a short step when a new chat
  starts (only if the preset has variables; "Start with defaults" keeps everything).
- Switching the preset in a chat changes THIS chat only; "Make default" is a separate action.
- FRANKENX v1.6 (the user's own Marinara preset, `G:\ROLEPlay\Presets and Prompts\FRANKENX_v1_6_Marinara.json`)
  ships with Roleplay as a ready preset, with what duplicates our features or works differently
  removed (example: the scene header with date and place: the dashboard tracks that).
- Extras: token cost of each option; a muted line in the chat when a choice changes (never sent to
  the model); per-character memory (a new chat with a character starts with the preset and choices
  of that character's most recent chat). Not wanted: random option per generation.

## How Marinara does it (read in Pasta-Devs/Marinara-Engine, 2026-10-10)
`choiceBlocks[]`: `variableName`, `question`, `options[{id,label,value}]`, `multiSelect`, `separator`,
`randomPick`, `displayMode` (listbox|buttons). `preset.defaultChoices {var: value}`. Chat meta
`presetChoices {var: value | value[]}`. Sections use `{{var}}` and
`{{#if var == "x" || "y"}}…{{else if …}}…{{else}}…{{/if}}` (also `!=`, `contains`, `&&`, parens).
Groups wrap consecutive same-group sections (`wrapFormat` xml|markdown|none), as ours do.

## Data formats (orchestrator)
Preset studio bag, `variables[]` (`PromptVariable`), new type `choice`:
```
{ id, name, label, type: "choice", defaultValue: "",
  question?: string,                         // help line under the label
  choices: [{ id, label, value }],           // value is the prompt text, may hold macros
  multi?: boolean, separator?: string,       // several picks, values joined (default ", ")
  display?: "list" | "buttons",
  defaults?: string[] }                      // choice ids picked by default (first choice if none)
```
Chat meta `presetVars: { [presetId]: { [varName]: string | string[] } }`: choice = choice ids,
dropdown/multi = option strings, the rest a string. Missing or unknown ids fall back to the
preset's defaults, so an edited preset never breaks a chat; keyed by preset so switching back
keeps the picks. `meta.presetAt` marks a chat whose preset or picks the user chose (preset route,
new-chat step): per-character memory follows only those, so old chats never pin new ones.
Notes: `meta.presetNotes: [{ id, after: messageId, at, changes: [{ kind: "preset" | "var", label, shown }], from }]`
(max 50; not messages, so swipes, "last message" logic and the dashboard sensor never see them);
changes before the next message merge into one note, changing back removes it. A toggle shows "on"/"off".

Macros (engine plugin `expandMacros`, all text it expands):
- `{{name}}`, `{{var:name}}`, `{{var::name}}` read a preset variable (builtins like `{{user}}` win);
  `{{getvar::name}}` falls back to it. A multi choice gives the joined values.
- `{{#if cond}}…{{else if cond}}…{{else}}…{{/if}}`, nested. cond: operands are variable names or
  quoted literals (straight or typographic quotes); `==`, `!=`, `contains`, `not contains`; `||`,
  `&&`, `!`, parens; `a == "x" || "y"` = a is x or y; a lone name is true when set and not
  false/0/no/off. Comparisons trim and ignore case; `contains` on a multi choice checks the picks.
- The section `condition` field reads the same resolved values; `name` is on when set and not
  false/0/no/off, `!name` the opposite (toggle variables gate blocks this way).

## Built so far (Roleplay branch `presets`)
- f3a2397 engine: resolution, {{#if}}, routes `POST /chats/:id/preset`, `GET /preset-memory/:charId`,
  `POST /preset-costs/:presetId {chatId?, vars?}` -> `{ total, vars: { name: { choiceId: tokens } } }`, memory in chat creation
  (`POST /chats` takes `presetVars` from the step). Tests `test/rp-preset-choices.test.ts`.
- c6ada58 Marinara importer (`presetImport` detects `type: "marinara_preset"`), types, FRANKENX built in:
  `data/presets/frankenx.json` + template `_frankenx.json` (onAppUpdate < 4.31.0 copies it once).
  Built by `.fork/presets/frankenx/adapt.ts` from the user's export (exact replacements, fails on drift).
  Adaptation review drafted by an external model (Muse Spark 1.3 via NanoGPT), checked and decided here.

## Steps
1. Engine plugin: resolution, macros, conditions, routes (picks, option costs), notes, per-character
   memory in chat creation. Tests. (orchestrator)
2. Types + store + Marinara importer in `import-shapes.ts` (drafted by an external code model).
3. UI (external draft, Sonnet integrates, browser check): chat panel, new-chat step, preset editor
   for choice variables, the muted note line, option costs.
4. FRANKENX adapted -> `data/presets/frankenx.json` (read-only), added to existing installs by the
   upgrade hook when missing.
5. Docs (`docs/DATA-FORMATS.md` presets + chat meta), CHANGELOG, STATE.
