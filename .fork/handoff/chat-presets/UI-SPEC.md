# UI spec: preset choices in the chat (Roleplay 4.31.0)

Work in the Roleplay clone `E:\Claude\Chrysalis-Engine\.claude\worktrees\rp-memory`, branch `presets`
(already checked out). Commit there in small commits (`area: what changed, in plain words` + a body
saying why + the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). Do not push.
Never commit `bun.lock`. Never put a model name in a commit or file.

The engine side is DONE and tested (`plugins/engine/plugin.js`, `test/rp-preset-choices.test.ts`):
do not change its behavior. Read `E:\Claude\Chrysalis-Engine\.claude\worktrees\v096\.fork\handoff\chat-presets\PLAN.md`
for the data formats.

## What exists
- Types: `src/lib/types.ts`: `PromptVariable` (types text, number, slider, dropdown, toggle, multi,
  and new `choice` with `question`, `choices[{id,label,value}]`, `multi`, `separator`, `display`
  list|buttons, `defaults` ids), `PresetNote`, `Preset.description`.
- A built-in read-only preset `data/presets/frankenx.json` ("FRANKENX 1.6", 15 choice variables,
  6 toggles, 1 text variable) to test with.
- Store `src/lib/store.ts`: `newChat(charId, greetingIndex)`, `startChatAndOpen`, `usePreset`
  (today makes the preset default AND switches the open chat), `updateChat`, `updatePreset`, `j()`.
- Engine mapping `src/lib/engine.ts`: `EngineChatMeta`, `engineChatToUI`.
- Chat: `src/components/chat/chat-quick-bar.tsx` (has a "Preset" palette), `chat-view.tsx`,
  `message-row.tsx`, `field-variant-picker.tsx` (a small per-chat picker to imitate), `prompt-peek-dialog.tsx`.
- Preset editor: `src/components/views/presets-view.tsx` (the variables block around the text
  "Typed variables usable in prompt sections").
- i18n: `src/lib/i18n.ts` (en + uk; `test/rp-i18n.test.ts` requires a uk string for every en key),
  hook `src/hooks/use-t.ts`.

## Engine API (all under the app's API base, as `j()` calls it)
- `POST /chats/:id/preset` body `{ presetId?, vars?: { name: value | value[] | null }, reset?: true }`
  -> the chat meta. Changes THIS chat only. Values: choice = choice ids (array for multi, a string or
  one-item array for single), toggle = "true"/"false", text/number = string, null = back to default.
  The meta carries `presetId`, `presetVars: { [presetId]: { name: value } }`, `presetNotes: PresetNote[]`.
- `POST /preset-costs/:presetId` body `{ chatId?, vars? }` -> `{ total, vars: { name: { choiceId: tokens } } }`
  (`total`: tokens of the preset's own text with these picks; per option: what it adds, may be negative).
- `GET /preset-memory/:characterId` -> `{ presetId: string | null, vars: { name: value } }`: the preset and
  picks of this character's last chat where the user chose them.
- `POST /chats` now also takes `presetId` and `presetVars: { name: value }` (the step's picks).

How a variable's current value resolves (mirror it in the UI for display): stored value for this
preset in `chat.presetVars[presetId][name]`, else the default: choice -> `defaults` ids, or the first
choice for a single choice when none; others -> `defaultValue`. Stored ids the preset no longer has
count as missing.

## Build
1. Data plumbing: `Chat` gets `presetVars?` and `presetNotes?` (from `EngineChatMeta` in
   `engineChatToUI`). Store actions: `setChatPreset(chatId, body)` (POST, then merge the returned
   meta's presetId / presetVars / presetNotes into the chat in the store), `fetchPresetCosts`,
   `fetchPresetMemory`; `newChat(charId, greetingIndex, opts?: { presetId?, presetVars? })`.
2. `PresetChoices` component, shared by the panel and the step. Props: preset, values (name -> value),
   costs (or null), onChange(name, value | null). Per variable, in preset order: label, `question` as a
   muted help line, the control, the default option marked ("default"):
   - choice, single: `display: "list"` -> radio rows, each with its cost on the right ("+120", "−8",
     muted, omitted when 0); more than 8 options -> a compact select whose items show the cost.
     `display: "buttons"` -> wrapped toggle buttons, cost in a tooltip/small text.
   - choice, multi: checkboxes (list) or toggle chips (buttons), each with its cost.
   - toggle: a switch. text: input (textarea when the value is long), saved on blur / Enter.
     number / slider / legacy dropdown / multi: simple controls.
   Long lists must scroll inside the panel, never the page; works at 390 px.
3. Chat "Preset" panel, opened from the quick bar's Preset entry (keep the existing palette's role
   of choosing a preset, but switching there now changes THIS chat only, via `setChatPreset`).
   Panel: preset select (this chat only) + a small "Make default" button (sets `isDefault` via the
   existing preset update; disabled when already default); the total ("≈ 11.6k tokens of
   instructions"); the preset's `description` in a collapsed "About this preset"; `PresetChoices`
   bound to the chat (each change saves at once with `setChatPreset`, costs refresh debounced
   ~300 ms); "Reset to defaults" (`reset: true`); a muted hint "Changes apply from the next reply."
   Desktop: a side sheet or dialog like the app's other chat panels; 390 px: full-height sheet.
4. New-chat step: `startChatAndOpen` shows a dialog instead of creating at once when
   `settings.ui.askPresetOnNewChat !== false` AND (more than one preset exists OR the preselected
   preset has variables). Preselected preset: memory's `presetId` (from `fetchPresetMemory`, single
   characters only) else the user's default preset; values: memory's `vars` when that preset is
   selected, else defaults. Dialog: title "New chat with {name}", the preset select, `PresetChoices`
   in local state (costs via `vars`), "Start" (primary, Enter) -> `newChat(charId, greetingIndex,
   { presetId, presetVars: <all current local values> })` then open the chat as today, "Cancel",
   and a "Don't ask again" checkbox (sets `askPresetOnNewChat: false`). Settings: add a switch
   "Ask for the preset when a chat starts" next to the other chat behavior settings.
5. Notes in the chat: for each `chat.presetNotes` entry render, right after the message whose id is
   `after` (after the last message when not found), one muted, centered, small line:
   `Point of view → First · Tense → Present`; `kind: "preset"` shows the translated word "Preset";
   `shown` "on"/"off" are translated. A note is not a message: no actions, never changes which
   message counts as the last one (swipe arrows, regenerate, continue stay on the last reply).
6. Preset editor (`presets-view.tsx`, variables block): add the `choice` type: name, label, question,
   display (list / buttons), multi switch, separator (when multi), option rows (label input, value
   textarea, default checkbox — radio-like for single — move up/down, delete, "Add option"). Toggle
   type: its default as a switch. Update the help text: `{{name}}` or `{{var:name}}` insert a value;
   `{{#if name == "value"}}…{{else}}…{{/if}}` picks text; a section condition `name` / `!name` /
   `name==value` turns a section on or off. Add a "Description" textarea to the preset's settings.
   Read-only presets stay read-only (as now).
7. i18n: every new string in the panel, the step, the notes and the settings switch goes through
   `t()` with en and natural Ukrainian uk. The preset editor's new strings may stay inline English
   like the rest of that view.

## Checks (all before you report)
- In the clone: `bun run typecheck` clean, `bun test test/` all pass.
- Browser check with the engine's skill `E:\Claude\Chrysalis-Engine\.claude\skills\browser-check\SKILL.md`
  (read it whole; run it from `E:\Claude\Chrysalis-Engine`). Notes from earlier rounds on Windows: copy
  the clone into `$DATA/apps/roleplay` (robocopy, with node_modules), open it through the shell's app
  card and wait up to ~2 min for the first build; the app's language/theme come from
  `$DATA/apps/roleplay/data/settings.json` (`ui.language`, `ui.themeMode`); `pw.mjs` may hard-code a
  Linux Chromium: use the installed Chrome with `playwright-core` (`CHROME_PATH`). Scripts and
  screenshots go in your scratchpad, never in the repo. The mock model answers sends.
- Seed: the shipped data has a card and the default preset; `frankenx.json` ships too. Add a second
  card if needed.
- Flows to prove (screenshot each; dark 1280 px; the panel and the step also light and 390 px; one
  screenshot of the panel in Ukrainian):
  1. Start a chat with a card: the step shows; pick FRANKENX, change Point of view, Start: the chat opens.
  2. The panel in that chat: variables with costs, total; switch "Reasoning plan (BOLT)" off and Tense
     to Present: the total drops; the prompt peek shows "present tense" and no "# Reasoning Rules".
  3. Send a message (mock reply), then change Point of view: a muted note line appears after the
     last message; swipe arrows and regenerate still work on the last reply.
  4. Start another chat with the same card: the step preselects FRANKENX with the changed picks.
  5. Switch the preset in the panel to Default: only this chat changes (another chat keeps FRANKENX),
     a note "Preset → Default" appears; "Make default" makes it the default.
  6. Preset editor: duplicate FRANKENX, add an option to a choice variable: it shows in the panel.
- Report: commits (hash + one line each), screenshot paths, anything you could not do or decided
  differently and why, any bug you saw in the engine side (do not fix it, describe it).
