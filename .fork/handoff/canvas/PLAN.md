# Handoff: Node Canvas, stage 1 (Canvas tab, chat links, prompt control)

Status: ready to plan, not started. Written 2026-10-12 from the research thread
"node-canvas". Background reading (Ukrainian, in the project files, not the repo):
`/mnt/project-files/node-canvas/where-else-and-languages.md` and
`/mnt/project-files/node-canvas/blueprints-idea.md`.

Repos: the work is in the Roleplay fork (`MolfarWav/Molfar.Vertep-Roleplay`),
with engine changes only if stage 1b needs them. Pushing to the fork's `main`
ships to every install: ask the user first (START.md).

## 1. What the user decided (2026-10-12)

1. One visual node canvas, reused for many things over time: prompt control,
   links between chats in the Library, later Molfar's work and blueprints for
   apps and plugins. One editor; each use brings its own node types and rules.
2. Order: simple to complex. Stage 1 = the two things that already half exist:
   **links between chats** (the Library's chat map) and **control of what goes
   into the prompt** (change it, not only read it). Lay the foundation for
   blueprints now (node-type registry, JSON format with export); build them later.
3. A **separate tab in Roleplay's left rail**, next to Library and Presets,
   because it is a big layer that touches much of Roleplay.
4. **UX matters as much as function**: easy wiring, dragging, inserting nodes,
   hints. The user finds the system complex and wants it friendly.
5. **Phone: view, not edit.** A switch between "Edit" and "View"; on a phone the
   app says plainly that building graphs needs a bigger screen and offers the
   view and a simple list of steps.
6. Later, blueprints: a graph Molfar follows to build a plugin or app; share the
   blueprint and the built zip together. Not in stage 1.

## 2. One correction to the research thread

The thread said the canvas would live "in the engine as a shared library". The
app builder only reads code inside the app's own folder
(`Molfar.Vertep/src/builder/resolve.ts`: "Everything stays inside the app"),
and app packages come from `bun install --ignore-scripts` per app
(`src/apps/packages.ts`). There is no engine-shared module for apps today.

Proposal (confirm with the user): build the canvas kit **inside Roleplay** in an
isolated folder, `src/canvas-kit/`, that imports nothing from the rest of
Roleplay (only React, the UI primitives it is handed, and its own files). Move
it to its own repository, used as a git dependency, when a second consumer
appears (the agent page or a "blueprint workshop" app). This keeps stage 1
shippable without inventing a package channel first.

## 3. Building blocks that already exist (read in this session)

- **Library chat map**: `src/components/library/chats-map.tsx` (hand-written SVG,
  291 lines) + `chats-graph.ts` (`layoutChatMap`, `predecessorOf`, `chainBack`,
  `descendants`). Links are stored by the `litopys` plugin, route
  `POST /litopys/links` with `{chatId, from}` (`litopys-api.ts:337`, `setLitLink`).
  Model: each chat has at most one predecessor (`from`), so links form a forest.
  No drag, zoom or creation by mouse today.
- **Navigation**: `ViewKey` and `DRAWER_VIEWS` in `src/lib/store.ts:46`; views
  rendered in `src/components/shell/app-shell.tsx` (`case 'litopys'` at :165,
  drawer widths at :213). Labels via `t()`: `nav.litopys` = "Library" /
  "Бібліотека" (`src/lib/i18n.ts`; Roleplay has `en` and `uk`).
- **Prompt assembly**: `assemble()` in `plugins/engine/plugin.js` (card, preset
  sections, world info, history, memory, data bank, summary, author's note).
  Plugin inserts come through `llmRequest` hooks: `litopys` (priority 10,
  `plugins/litopys/plugin.js:954`) and `relations` (priority 20,
  `plugins/relations/plugin.js:3157`), run by `applyLlmRequestHooks` in
  `Molfar.Vertep/src/plugins/runtime.ts`. Every part is already labelled for the
  prompt inspector's Sources view (`Molfar.Vertep/src/prompt-sources.ts`).
- **Reorder lists**: `src/lib/drag-list.ts` (for the phone's list of steps).
- **UI rules**: skill `.claude/skills/ux-review/` (engine repo). Read it fully
  before designing; every point below follows it.

Library choice (checked on npm 2026-10-12): `@xyflow/react` (React Flow) 12.12.0,
MIT. Not yet measured: its bundle size in Roleplay and the effect on build time
**on a phone**, where Roleplay builds in the browser (START.md item 6: phone
builds already struggle). Measure before committing to it; load the Canvas tab
as its own chunk if the builder allows it.

## 4. Architecture

Three layers (the Blender/ComfyUI model):

1. **Canvas kit** (`src/canvas-kit/`): nodes, ports, wires, pan/zoom, minimap,
   selection, undo/redo, groups, auto-layout, the Edit/View switch, the phone list
   view. Knows nothing about chats or prompts.
2. **Node-type registry**: each board kind registers its node types: id, label,
   icon, colour token, ports (with a port type), a one-line hint, a longer
   explanation for the info popover, parameters, and a validator for the whole
   graph ("a chat has at most one predecessor", "a prompt has exactly one
   output"). The kit asks the registry whether a wire is allowed and why not.
3. **Adapters**: load a board from the app's data and save it back. The chat
   links adapter reads and writes through `/litopys/links`; the prompt adapter
   through whatever stage 1b settles on. A board is a **view and editor over
   existing data**, not a second copy of it.

Graph file format v1 (for export and later blueprints):

```json
{ "format": "vertep-canvas", "version": 1, "kind": "prompt",
  "title": "…", "nodes": [{ "id": "n1", "type": "prompt.card", "x": 0, "y": 0, "params": {}, "note": "" }],
  "edges": [{ "id": "e1", "from": "n1:out", "to": "n2:in" }] }
```

`kind` names the registry; an unknown kind or node type is shown as a grey
"unknown" node, never dropped. Positions belong to the file; data the adapter
owns (which chat links to which) is never duplicated into it. Export and import
of a board as a file from day one, even if only the prompt board uses it at first.

## 5. Stage 1a: the Canvas tab and the chat-links board

- New rail entry and `ViewKey` `canvas` (label "Canvas" in both locales, user 2026-10-12). The tab opens a board picker: "Chat links", "Prompt"
  (1b), later more. Empty state teaches: what a board is, one line per kind.
- Chat-links board: every Litopys chat is a node (title, character, fact count,
  last activity, as the map shows now). Drag from a chat's "continues" port to
  another chat = set `from`. Dropping on a chat that already has a predecessor
  asks to replace it. A wire that would make a loop is refused with the reason
  shown at the drop point. Deleting a wire = `setLitLink(chatId, null)`, with undo.
- The Library keeps its map, but **as the same canvas in View mode** with an
  "Edit on canvas" button. Two different editors for the same links would break
  the ux-review rule "a second way to do the same thing is a bug in waiting".
- Auto-layout by default (reuse `layoutChatMap`'s logic); positions the user
  moves are remembered per viewer.

## 6. Stage 1b: the prompt board (plan it with the user first)

Goal: see and change what goes into the request, before it is sent.

- Nodes = the labelled parts the inspector already knows: card fields, persona,
  preset sections, lorebook entries (grouped), history, memory, data bank,
  summary, author's note, Litopys insert, dashboard insert, tools. Wires = order
  into one Output node.
- Changes the user can make: turn a part off **for this chat** (user decision; no per-reply or per-character switch)
  (never rewriting the preset), change order where the preset allows it,
  open the part's own editor. "Preview prompt" uses the Sources view.
- Engine side to settle: where `assemble()` reads a per-chat override (chat
  meta vs its own file), and how plugin inserts honour "off for this chat"
  (they arrive via hooks after `assemble()`). If the preset or chat format
  changes, update `docs/DATA-FORMATS.md` in the same change (CLAUDE.md rule).
- Out of stage 1: Decider nodes, extra Generate nodes, pinning boards to
  characters. They come after the basic board feels good.

## 7. UX specification (the core of this stage)

Wiring and editing:
- Drag from a port: a live wire follows the pointer; valid target ports glow,
  invalid ones dim. Hovering an invalid one shows a short reason next to the
  pointer (and the same text stays on screen if dropped there).
- Drop a wire on empty space: a quick-add menu with only the node types that
  can take this wire, searchable.
- Drag a node onto an existing wire: the wire highlights and the node is
  inserted into it on drop.
- Palette on the left: search, grouped by task, drag onto the canvas or click to
  add at the centre of the view. Each entry has a one-line hint.
- Right-hand panel for the selected node: what it is in plain words, its
  settings with inline hints, and an "i" button for the long explanation
  (click or tap, never hover-only).
- Undo/redo (buttons and Ctrl+Z / Ctrl+Shift+Z), autosave with a visible
  "Saved" state, "Restore default" where a board has a default.
- A problems strip when the graph breaks a rule ("2 chats point to each
  other"), each item with "Show me".
- Keyboard: Delete removes, Esc cancels a drag, arrows nudge, Tab moves between
  nodes; a "Connect to…" menu on every node so wiring works without dragging.

Look:
- Colours from theme tokens only (`primary`, `cta`, `destructive`, `muted`);
  port types differ by shape and icon too, never by colour alone. Check the
  Vertep, dark and light themes.
- Node on/off: a switch on the node plus a dimmed body and a word ("Off").
- First visit: a three-step tour (add, wire, preview), skippable, shown once
  per viewer.

Phone (below 768 px):
- Opens in View mode with a plain note: "Building graphs needs a bigger screen.
  Here you can look and use the list." The Edit/View switch says the same when
  tapped.
- List of steps view: the board as an ordered list (on/off switches, reorder via
  `drag-list.ts`, "Connect to…" picker). Touch targets 40 px.

## 8. Done means

The engine `CLAUDE.md` rules, applied to the fork: typecheck, tests, build;
`ux-review` before building and its walk-through before done; `browser-check`
at 1280 px dark and 390 px light (and `uk`, since Ukrainian runs longer); the
reply carries the "UX check" block; new strings in both Roleplay locales.
Delegation as in `CLAUDE.md`: UI drafts by an external model from this spec, a
cheaper subagent integrates and runs the browser check, the orchestrator
designs the registry and format and reviews.

## 9. Answers (user, 2026-10-12)

1. Tab name: **Canvas** (in both locales; a plain name people recognise).
2. Yes: the Library map becomes the same canvas in View mode with "Edit on canvas".
3. Yes: canvas kit inside Roleplay first (`src/canvas-kit/`), own repo later.
4. **Off for this chat only** (user, 2026-10-12). No "off this time", no "off for this character".

## 9a. Original questions

1. Tab name: "Canvas" / "Полотно", or another?
2. OK that the Library's map becomes the same canvas in View mode with "Edit on canvas"?
3. Canvas kit inside Roleplay first, moved to its own repo when a second app needs it (section 2)?
4. Prompt board: is "off for this chat" enough at first, or also "off for this character"?

## 10. Visual direction (user, 2026-10-12)

Three throwaway sketches from an external model were published at
https://claude.ai/artifact/WUJitu25owxP56VKYnYsAr (copies, the spec that made
them and screenshots: `/mnt/project-files/node-canvas/sketches/`). The user picked:

1. **Base: sketch A** ("cards on a table"): cards with a colour strip by kind,
   wires flowing left to right into Output on the right.
2. **Collapsible side panels**: the palette (left) and the details panel
   (right) can be hidden for a while, so the canvas gets the whole width.
   Output must never hide behind a panel.
3. **Pan the field** by dragging the background (and with the scroll wheel /
   trackpad), **zoom in and out** with buttons and the wheel, as in sketch B.
4. **On/off switch on the card**, as in sketch C.
5. **Every card can be deleted** directly, not only connected: a delete action
   on the card (its "…" menu and the Delete key), with undo. Connecting and
   deleting are equally easy to find.

Also from the review of the sketches: a working minimap; no tangle of wires at
Output (show the order as a number); on a phone either the list or the graph,
never both stacked.

Next step: one polished mockup on this direction (later, in a fresh session),
then the canvas kit itself.

## 11. Reference mockup (2026-10-12)

A polished clickable mockup on the chosen direction:
https://claude.ai/artifact/7Da9dt9oYZ8fayz63pVxAR (source:
`/mnt/project-files/node-canvas/mockup/canvas-mockup.html`, screenshots beside it).
Vanilla HTML/JS, invented data, Ukrainian copy. It is the UX reference for the
real build, not code to port. Decisions it makes that the build should keep:
- Output ("Запит до моделі") lists each wired part as its own numbered row with
  its own input dot, so wires never pile up at one point; order = row order.
- Dropping a part on a wire inserts it at that place in the order; on the
  chat-links board dropping a free chat on a wire puts it between two chats.
- "Remove" on the chat-links board removes a chat from the canvas only (the chat
  stays in the Library); "Delete" on the prompt board removes the part from this
  chat's prompt. Both undo from the toast and with Ctrl+Z.
- No on/off switch on chat cards (it would mean nothing there); the switch lives
  on prompt parts only.
- Phone: View mode, a "Graph / List" switch; the list edits everything (links via
  a "continues" select, prompt parts via switch and up/down).

## 12. Stage 2 candidates (user, 2026-10-12)
Not stage 1 work. Recorded so stage 1 does not block them. Background and the
comparison with SillyCanvas and Lattice: `references-sillycanvas-lattice.md`.
- **Condition on the prompt board** (the user calls it Decider): a card that reads a
  Dashboard value or a keyword and switches prompt parts on or off ("HP < 30 → part
  'Wounded' on"). No model call. Missing data gives "unknown", not "false". Keep the
  prompt board's data shape open for it: a part's on/off may later come from a wire,
  not only from the switch.
- **Character canvas preset** ("behaviour model"): an option on the character card
  opens Canvas with a pre-built board for that character, generated by a model from
  the card, the same way character traits are generated today. Conditions on
  Dashboard state shape the character's behaviour and reactions. Pinned to the
  character, overridable per chat.
- **Low density first**: few card types, starter boards instead of a blank field.
- **Deep canvas for Molfar** (later): extra model calls, subgraphs, a shelf of saved
  systems, blueprints for plugins and apps. For people who want to dig.

## 13. Stage 1 additions (user, 2026-10-12)
Taken from SillyCanvas (see `references-sillycanvas-lattice.md`). Part of stage 1b.
- **Token counts**: each prompt part shows its estimated tokens; "Запит до моделі"
  shows the total and, when known, the model's context window. Use
  `estimateTextTokens` (`src/agent/context-budget.ts` holds the engine's version);
  recount quietly after a change, never by sending anything.
- **Why included or skipped**: "Що піде в запит" gives each part one line with the
  reason ("lorebook: keys Dragon, Magic fired", "off for this chat", "empty").
- **History filter**: the History part gets settings for last N messages, only the
  player or only the character, and stripping thinking blocks. The card label shows
  the filter ("last 20 · without thinking"). Defaults keep today's behaviour.

## 14. Stage 1b decisions (2026-10-14)
The user left the three questions to the orchestrator ("where it costs least and is most
reliable"). Decided after reading `assemble()` and both plugin hooks:

1. **Storage: the chat's meta**, one field `promptBoard` in `data/chats/<id>.meta.json`.
   `assemble()` and both plugin hooks (Litopys `readChat`, relations `readChat`) already read
   that file on every reply, so this adds no file read; it travels with the chat (copy, export,
   delete) and leaves no orphan files. A fork inherits it: add `promptBoard` to the copied-field
   list in the fork route (`plugins/engine/plugin.js`, the list with `parentChatId`).
   Shape (absent = today's behaviour, unknown keys ignored):
   ```json
   "promptBoard": { "v": 1,
     "off": ["section:<presetSectionId>", "card:description", "wi:<bookId>", "history",
             "memory", "databank", "summary", "authorNote", "plugin:litopys", "plugin:relations"],
     "history": { "lastN": 0, "only": "all", "thinking": true } }
   ```
   `off` holds only what the user switched off. Stage 2's Decider writes nothing here: it is
   evaluated at assembly and its result joins `off` in memory, so a rule never edits the user's
   switches. Part keys are stable ids, never labels (labels change with language and names).
   Chat format change: the Roleplay fork's `docs/DATA-FORMATS.md` in the same change.
2. **`assemble()`**: one helper `isOff(key)` built from `meta.promptBoard.off`; every place
   that adds a part checks it first and, when off, calls `omit(kind, label, "off for this chat",
   tokens)` instead of `addPart`, so the Sources view and "what goes into the request" show it.
   The History filter is applied to the visible history before the context-budget trim (so the
   trim works on what is actually sent). **No reordering in 1b**: the preset owns the order; the
   board shows it read-only. Reordering is a later small step if the user asks for it.
3. **Plugin inserts: each plugin checks the switch itself**, first thing in its `llmRequest`
   hook, from the meta it already reads, and returns `null` when off. No engine change; an off
   Litopys or Dashboard does no work at all (no vector search, no insert building). The check is
   five lines per plugin; the engine-side alternative (dropping labelled inserts) would still run
   the plugin and touches the engine for something only Roleplay uses.

Build order (small steps, each with tests, released separately if the user wants):
a. Data + `assemble()`: `promptBoard` field, `isOff`, the omit reasons, plugin checks, fork copy,
   DATA-FORMATS. Route to save it (`POST` on the chat meta, validated keys). No UI yet.
b. Token count per part and the total (from the Sources the preview already builds).
c. The prompt board UI (`boards/prompt.ts` + adapter), switches, the "why" lines, phone list.
d. History filter (settings on the History card).
