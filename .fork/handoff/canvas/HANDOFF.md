# Canvas (node editor): handoff (2026-10-13)

For a new session, possibly on another Claude account. Read `CLAUDE.md` and `.fork/STATE.md`
first, then this file. Everything you need is in this folder:
- `PLAN.md`: the whole plan. Decisions, architecture, UX spec (section 7), the user's answers
  (sections 9 to 13), stage 2 ideas (section 12).
- `mockup.html`: the approved UX reference (vanilla HTML/JS, Ukrainian copy). Open it in a
  browser; it shows both boards, including the prompt board that is not built yet.
- `references.md`: what SillyCanvas and Lattice (two SillyTavern node editors) do and what we
  take from them, with a "take / when" table.

## Where we stopped
**Stage 1a is released**: Roleplay **4.42.0** on the fork's main (`9e68e44`,
MolfarWav/Molfar.Vertep-Roleplay). The user tests it live from there. No engine change.
What it is: a "Canvas" tab in the left rail with the chat-links board (Library chats as cards,
wires = "continues", forks as dashed locked wires, undo/redo, Tidy, Fit, Edit/View, info panel;
phones: View mode + a list with a "Continues" pick). The Library map is the same board in
View mode, with "Edit links on the canvas".

**Stage 1b is built (2026-10-14), not released: see `.fork/STATE.md`. What follows is the original plan text. Do not build before the user answers the three questions (answered: `PLAN.md` section 14)
below.** The user wants this part done carefully (2026-10-13): plan first, small steps.

## Stage 1b: the three questions to settle with the user first
The chat-links board only drew an existing route (`/litopys/links`). The prompt board has no
such route; three decisions come first (engine and Roleplay):
1. **Where "off for this chat" is stored**: in the chat's meta (`data/chats/<id>.meta.json`)
   or in its own file per chat. Chat meta is simplest and travels with the chat; a separate
   file keeps meta small. Either way it is a chat format change: update the Roleplay fork's
   `docs/DATA-FORMATS.md` in the same change (CLAUDE.md rule).
2. **How `assemble()` reads it**: `plugins/engine/plugin.js`, `assemble()` builds the request
   from labelled parts (card, preset sections, world info, history, memory, data bank, summary,
   author's note). It must skip parts switched off for this chat and apply the History filter.
   Also where order changes are allowed (only where the preset allows it).
3. **How plugin inserts honour it**: Litopys (priority 10) and the Dashboard/relations (priority 20)
   add their parts through `llmRequest` hooks *after* `assemble()`
   (`applyLlmRequestHooks`, engine `src/plugins/runtime.ts`). Options: each plugin reads the
   chat's switches itself, or the engine drops labelled inserts by the chat's list (engine change).

Stage 1b also carries (user, `PLAN.md` 13): token count on every part and the total on Output
(`gpt-tokenizer` is already a Roleplay dependency; the engine has `estimateTextTokens`), a line
per part in "what goes into the request" saying why it was taken or skipped, and a History
filter (last N messages, only player / only character, without thinking). Prepare in the data
shape: a part's on/off may later come from a wire (the Decider in stage 2), not only a switch.

Out of 1b, stage 2 (user: not now, careful): Decider (a condition on Dashboard state that turns
parts on, three outcomes yes / no / unknown), a character canvas preset, a deep canvas for Molfar.

## Code map (Roleplay fork)
- `src/canvas-kit/graph.ts`: UI-free core. `PortDef` (type, `max`), `CanvasEdge.locked`,
  `canConnect` (reason strings in English, mapped to `canvas.why.*` keys in the view), `connect`,
  `insertOnEdge`, `removeNode/Edge`, `moveNode`, History (`commit/undo/redo`), `layoutForest`,
  `toFile`/`fromFile` (format `vertep-canvas` v1). Tests: `test/rp-canvas-kit.test.ts`.
- `src/canvas-kit/boards/chat-links.ts`: the chat-links board kind, `boardFromChats`,
  `linkChanges` (graph diff -> `setLitLink` calls; a chat removed from the board is only hidden).
  A prompt board goes next to it as `boards/prompt.ts` with its own adapter.
- `src/canvas-kit/canvas-board.tsx`: the generic renderer (cards 200x74, SVG wires, pan/zoom,
  wire drag with glow and reason bubble, insert on wire, View mode). Board-agnostic.
- `src/components/canvas/canvas-view.tsx`: the Canvas section (board switch with Prompt marked
  "soon", header actions, phone list, info panel, positions and hidden chats in localStorage).
- `src/components/canvas/canvas-focus.ts`: Library -> Canvas hand-off of the selected chat.
- `src/components/library/chats-map.tsx`: the Library map, now a view-only `CanvasBoard`.
- Strings: `canvas.*`, `nav.canvas`, `lit.map.editOnCanvas` in `src/lib/i18n.ts` (en, uk).
- Rail: `sections.ts`, `store.ts` (`ViewKey`, `DRAWER_VIEWS`), `app-shell.tsx`.

## Known, accepted
- The per-chat Library map drops the fork wire of a chat that also has a continues link
  (`layoutChatMap` keeps one predecessor); the full Canvas shows both.
- After inserting a card on a short wire the cards sit tight; Tidy fixes it.
- The phone graph is wider than the screen on purpose (readable cards); pan to see the rest.
- The 4.42.0 merge with main (Chats page, scene generation, error boundaries...) passed
  typecheck and all 998 tests but was not re-checked in a browser after the merge.

## How we worked (cheap, and it worked well)
- **Drafting by external models** through the `ask-model` skill (the NanoGPT key works in the
  cloud; `node .claude/skills/ask-model/scripts/ask.mjs --check`). Core: GLM 5.3 from a precise
  spec. UI: DeepSeek V4 Pro from the spec plus `mockup.html` (`-f`). One file per call: a thinking
  model runs out of output on two big files. Extract `FILE: <path>` blocks with a small script.
- **Review by the orchestrator**: read the core line by line (found real bugs: a port `max`
  counted on the wrong side, link semantics for hidden chats). The drafted UI had six blocking
  bugs that only a browser showed (infinite reload from a new `t()` per render, wires drawn
  before the transform, wrong port ids, pointer capture eating clicks).
- **Browser checks by a Sonnet subagent** with skill `browser-check`. Setup that works: copy the
  Roleplay checkout **with its node_modules** into the test workspace `apps/roleplay`;
  `bun install` in the engine's `client-agent` before `build:client`, then `git checkout` the
  lockfiles; seed chats as `data/chats/<id>.meta.json` (+ `parentChatId` for a fork) and links
  in `data/litopys/links.json`; light theme = `ui.activeThemeId: "theme_daylight"` in the test
  workspace `data/settings.json`. The app opens at `/app/molfar/roleplay/` via Launch.
- Screenshots of the three checks are in the project files (`node-canvas/build-shots/`), not in
  the repo.
