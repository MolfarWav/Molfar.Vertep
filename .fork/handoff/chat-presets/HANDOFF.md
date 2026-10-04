# Presets per chat, with choices (queued 2026-10-04)

Roleplay app work (fork `MolfarWav/Molfar.Vertep-Roleplay`, built in a scratch clone).
Order: after the relationship dashboard; where it goes against Memory v2 and Molfar's skills is
the user's call.

## What the user asked (2026-10-04)

Like Marinara: when a new chat starts, offer a choice of preset; the preset is bound to that chat.
A good preset has sections with sub-options (for example POV: first person / second / third), and
the user picks which ones are used. In the chat the user can switch to another preset, or change
which sub-options are on.

## What the app already has (checked in the clone, 2026-10-04)

- Every chat stores its own `presetId` (chat meta). The quick bar's "Preset:" palette
  (`src/components/chat/chat-quick-bar.tsx`) calls `usePreset` (`src/lib/store.ts`), which switches
  the open chat AND makes that preset the default for new chats: a side effect to split.
- Presets have typed `variables` (text, number, slider, dropdown, toggle, multi; `src/lib/types.ts`
  `PromptVariable`), "values are picked per chat": stored in chat meta `chatVars`, used as
  `{{var:name}}`. A section can have a `condition` on a chat variable (`var`, `var==value`,
  `var!=value`), honoured by the prompt assembly in `plugins/engine/plugin.js` (`condPasses`).
  Sections can sit in `groups` (`SectionGroup`: name, wrap format).
- Missing: any UI that sets `chatVars` in a chat; a preset choice when a chat starts; a plain
  "choose one / choose several" group without writing conditions by hand.

## Proposal

1. Choice groups in the preset: `SectionGroup` gains `choice: "one" | "many"` (absent = an ordinary
   group). Its sections are the options (POV: first / second / third). The preset editor shows such a
   group as radio buttons or checkboxes and marks the preset's default option(s).
2. The chat keeps its picks: chat meta `presetChoices: { <groupId>: [sectionId, ...] }`; missing =
   the preset's defaults. The assembly includes a section of a choice group only when picked.
   Unknown ids are ignored (a preset edited later never breaks a chat).
3. New chat: a short step (or a popover on the first send) with the preset picker (the default
   preselected; the last preset used with this character remembered) and that preset's choice groups
   and variables. "Start" keeps the defaults if the user changes nothing.
4. In the chat: a "Preset" panel from the quick bar: switch the preset for THIS chat only ("Make
   default" is a separate action), the choice groups, the variables (finally a UI for `chatVars`).
   Changes apply from the next reply. Show the token cost of each option.
5. Import: map Marinara presets' choice structure onto choice groups when a preset is imported (check
   how Marinara encodes it; the user's `ai-roleplay-platforms` / `marinara-engine-expert` skills know).
   SillyTavern presets have only on/off prompts: they import as ordinary sections.

## Ideas to offer the user (not decided)

- A muted line in the chat where a choice changed ("POV → first person"), never sent to the model,
  so the history explains why the style shifted.
- A character's default preset and choices (the card remembers what was used with it last).
- "Tune with Molfar" for presets: Molfar edits a preset's sections and choice groups from a request.
- Swipes and regenerations use the choices active now (simple); per-message snapshots are not worth it.

## First step next time
Ask the user (AskUserQuestion) about the open points: the new-chat step (dialog before the chat, or a
popover on the first send), "switch for this chat only" vs today's "also make it default", and which
Marinara presets to use as import examples (ask them to copy one into the session's folders).
