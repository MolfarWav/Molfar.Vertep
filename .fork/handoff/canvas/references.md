# Canvas references: SillyCanvas and Lattice (notes, 2026-10-12)

Research notes for the Canvas work. Logic and capabilities only, not visuals.
Our stage 1 is in `HANDOFF-stage1.md`; stage 2 candidates are in its section 12.

## 1. SillyCanvas (github.com/Dulgadurbit/SillyCanvas, MIT, v0.17, README and parts of code read 2026-10-12)

A SillyTavern extension that replaces the prompt with a graph. Vanilla JS, no build,
~14k lines, tests on Node. Same author as Lattice (`manifest.json` of both:
"Dulgadurbit"). SillyCanvas builds the *prompt*; Lattice builds a *story workflow*
around the reply. SillyCanvas is the closer match to our prompt board.

**Blocks.** Prompt (text with a role), SillyTavern (a preset prompt, read live,
overridable per canvas), History, Injection (World Info, Author's Note, summaries as
ST prepared them), Lorebook (picks entries itself: as ST would, by keys in wired text,
all, constant, ticked; budget in entries or tokens), Generate, Decider, State, Memory,
Output, Note (never sent). Blocks are read top to bottom; position = order.

**Wires.** Kinds: merge (own message), append/prepend (glued to the target), together
(two Generate blocks in parallel). Modes: Send (text travels), Activate (nothing travels,
the target only runs when a wire fires), Forward result (a Decider's choice or matched
words into `{{result}}`). **Wire filters ("Send what?")**: last/first N messages, only
user or only character, message numbers, keep only `<tag>` content, strip thinking;
the label shows `last 5 · user` and a preview with token count. **Conditions on wires**:
`energy <= 1`, text mentions a sword, after turn 10.

**Decider.** Routes: every match, first match, "let the AI sort" (one small call), weighted
random; "Otherwise" output. Rules: words present/absent, numbers (word count, message
count, variable, dice), probability, time of day, last speaker, character/model name, a
yes/no question to a model; AND/OR/NOT. A test box shows which outputs fire on sample
text, nothing sent. Paths not taken are skipped and cost nothing.

**State.** Several values per block; rules (every turn, every N turns, when words appear,
when a formula holds; add/set/multiply/reset) and a stage table that turns a number into
text, a library prompt, or a dot that activates other blocks. A chart of the value across
the chat; "Try a message" before sending. **Values are recomputed from the chat every
time**, so swipes, regenerations and deletions never count a turn twice. Formulas are
parsed by a small safe evaluator (`src/expr.js`, no eval). Unknown names read as 0.

**Memory.** Prose kept between messages; Generate answers or Decider choices save into it
(replace, append, keep last N paragraphs). Each save is tied to the message it answered,
so swipes overwrite their own save and deleting a message removes its saves. Can mirror
into one lorebook entry.

**Generate, loops.** Extra model call with its own connection and model; by default only
its answer goes on. Independent Generate blocks run in parallel. "Passes" repeat a block
until nothing changes; loop wires from a Generate block or a Decider key, with a limit.
On swipe: rerun Generate blocks or keep their answers (free).

**Around it.** "Seed from current prompt order" starts the canvas from what ST already
sends. Token count on every block (ST tokenizer, quiet preview). Preview with a line per
block saying why it was included or skipped; "What was actually sent". Groups as
"blankets" that fold into one block, with an on/off switch. Library of blocks, groups and
canvases; copy/paste as plain text to share. Pin a canvas to a chat, to a character
(saved in the card, exported with it) or as default; chat pin beats character pin beats
default. Switched off, ST builds the prompt as always. Seven themes.

## 2. Lattice (github.com/MentallyQuill/Lattice, MIT, read 2026-10-12)

A SillyTavern extension, v0.27 beta, Svelte + Vite, ~1260 files, ~360 KB of docs.
It uses SillyTavern's `generate_interceptor`. Same author as SillyCanvas; a newer and
much larger project aimed at story systems and reply review, not at the prompt itself.

**Core model.**
- One "unified workflow" per generation: **Preparation** nodes → one **Generate Reply**
  (the host model writes the reply as usual) → **Response** nodes → **Review / Publish**.
- **Typed artifacts** on wires: Context, Draft, Text, Data, Guidance, Patches, Candidate.
  No implicit conversion. An input takes one wire; an output feeds many.
- **Staged changes**: state, memory, clock and file writes are only *proposed* during a run.
  They commit when the user applies the reviewed reply (it becomes a new swipe) and are
  dropped on reject. Reading Preview or "Run to here" never commits.
- **Call budget per node**: the reference lists 0, 0–1 or 1 model calls for each operation;
  deterministic nodes need no model. The starter workflow makes no extra calls and
  ships disabled.

**Nodes worth noting (~75 operations).**
- **Condition** (0 calls): compare a Data path with equals / greater-than / exists etc.
  Missing data is "unresolved", a third outcome, not "false".
- **Decision** (1 call): the model answers authored questions (yes/no, choice, score)
  with short evidence and confidence. **Confidence Gate** routes accepted / rejected /
  unresolved by thresholds.
- **Branch** (0 calls): yes / no / unresolved outputs; unselected outputs are "skipped".
  **Join / Collect** merge branches back.
- **State** (0 calls): numeric values with progression rules (caps per scene/day,
  cooldowns, diminishing returns, duplicate events ignored) and time decay toward a
  baseline on story time.
- **Story Clock / Advance Time / Time Trigger**: in-story time, events due when time
  crosses a boundary (rain at 14:00, a curse after 8 hours).
- **Random Pick / Effect Library**: weighted random effects without a model; a draw is
  reused for the same event (stable rerolls).
- **Actor Context / Character Direction / Prompted Memory**: private per-character
  context and memories; one event, two private perspectives.
- **Model Call, Revise Draft, Extract, Enrich**: extra model jobs, a model per job.
- **Read File / Write to File / Collection**: scoped per-chat data documents.

**Authoring UX.**
- Search a node, drag it in, a setup dialog opens, "Create node". Details panel edits it.
- **"?" on every node**: an illustrated guide with a live example graph and
  "Add example to current tab" (one undoable edit).
- **30 example lessons**, each with its setup and its model-call budget.
- **Subgraphs**: select nodes, make one box that opens as its own tab; save to a shelf.
  **"Add system…"** connects a saved subgraph to Main; each system can be switched off.
- **Run to here** and recorded **Preview** at each node.
- Portable export drops local model-profile ids; "active model" stays portable.

**What it warns us about.** The docs are dense ("authorized targets", "host authority",
"settlement"), and simple ideas need many nodes (the wand needs extraction, confirmation,
holder checks, a library, a pick, an outcome commit). It is a tool for people who want to
dig. That supports our plan: simple Canvas for everyone, the deep layer later and for Molfar.

## 3. Ours (stage 1) vs both

Ours shows the existing Vertep pipeline and lets the user control it: which parts go in,
their order, "off for this chat", chat links in the Library, a preview from real data.
No conditions, no extra calls, no state machine, no loops. We have Library chat links,
a typed Dashboard and Molfar (blueprints); they have neither.

## 4. What to take, and when

| Idea | From | Verdict |
| --- | --- | --- |
| Condition on Dashboard state → enable a part (0 calls) | both | **Stage 2, first.** Our Dashboard state is already typed. |
| Third outcome "unknown" when data is missing | Lattice | Take with the Condition. Saves silent wrong branches. |
| Character canvas preset ("behaviour model"), generated by a model from the card | SillyCanvas (pin to character) + user idea | **Stage 2.** See handoff section 12. |
| Model-call budget shown on each node and on the board | Lattice | Take as soon as any node can call a model. Free models need it. |
| "?" guide with a live example on each node | Lattice | Take for stage 1 polish; our info popover is the start. |
| Example boards ("lessons") | Lattice | Stage 2: 3–5 starters, not 30. |
| Staged changes committed on accept, dropped on reject/swipe | Lattice | Worth checking against how Dashboard and Litopys update today (open question). |
| Decision (model judges a question) | Lattice | Later, optional: an extra call. |
| Generate / Model Call nodes, chains of models | both | Later, optional, Molfar's deep canvas. |
| Subgraphs saved to a shelf, "Add system" | Lattice | Deep canvas (Molfar), with blueprints. |
| Story clock, random effects, private per-actor memory | Lattice | Not Canvas work; plugin ideas for Litopys/Dashboard. |
| Loops, schedules, parallel generations | SillyCanvas | No. `onTick` plugins already cover periodic work. |
| Token count on every part and the total on Output | SillyCanvas | **Stage 1.** Free models have small windows; `estimateTextTokens` exists. |
| Preview line per part: why included or skipped | SillyCanvas | **Stage 1**, in "Що піде в запит". |
| Filter on the History part (last N, only user/character, strip thinking) | SillyCanvas | Stage 1b or early stage 2: real control over the biggest part. |
| "Seed from what is sent now" | SillyCanvas | Already our approach: the prompt board starts from Vertep's pipeline. |
| State derived from the chat, so swipes never double-count | SillyCanvas | Check Dashboard against it (same open question as staged changes). |
| Formula evaluator without eval | SillyCanvas `src/expr.js` (MIT, 208 lines) | Can be reused with its notice, or written anew. Change: unknown name → "unknown", not 0. |
| Pin a canvas to a character inside the card | SillyCanvas | With the character preset. A card format change: needs DATA-FORMATS and the card skill updated. |
| Decider test box on sample text | SillyCanvas | Take with the Condition card. |
