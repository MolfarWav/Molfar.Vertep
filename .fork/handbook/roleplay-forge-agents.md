# Forge agents: custom agents built on the Canvas and run during play
Verified at: molfar.vertep-roleplay 91eec33

## What it does
- An agent is one Canvas file of kind `agent`, saved as `data/agents/<id>.vertep-agent.json`. Its cards are wired together on the Agents board. The file is data, not code.
- The checker fills in `agent.derived` (needed permissions, model call count, hash). The Agents plugin runs the agent only after the user allows those permissions.
- An agent runs after a reply, before a reply, beside a reply, or by hand. Triggers count replies (`everyN`) or match keywords in the last two messages. No clock trigger was found.
- It can ask the model, count in code, keep its own fields, write some Dashboard fields, show notes or buttons, and leave a hint.

## Owners
- `plugins/agents/plugin.js` `validateAgent`: the checker copy; its source is `src/canvas-kit/boards/agent-check.js`.
- `plugins/agents/plugin.js` `runAgent`: the executor copy; its source is `src/canvas-kit/boards/agent-run.js`.
- `plugins/agents/plugin.js` `installRoute`: `PUT /agents/install`, which checks, stores and records grants.
- `plugins/agents/plugin.js` `pickAgents`: decides which agents of a chat run in a phase, with a reason for each skipped one.
- `plugins/agents/plugin.js` `blocker`: names why an installed agent may not run (errors, unsupported needs, missing permission, call cap).
- `plugins/agents/plugin.js` `runRoute`: `POST /agents/run`, the run after a reply, beside it, or by hand.
- `plugins/agents/plugin.js` `runBefore`: the run before a reply, called from the request hook.
- `plugins/agents/plugin.js` `stepRun`: asks the models and scripts in rounds and collects the answers.
- `plugins/agents/plugin.js` `commitRun`: writes state, Dashboard changes, run log and hints.
- `plugins/agents/plugin.js` `applyDashWrites`: applies Dashboard writes and logs them for undo.
- `plugins/agents/plugin.js` `sourceValue`: the Input card's readers (history, card, persona, Litopys facts, lorebook).
- `plugins/agents/plugin.js` `dryRoute`: `POST /agents/dry`, the trial that writes nothing.
- `plugins/agents/plugin.js` `llmRequest`: adds stored hints to the last user message of the next reply.
- `src/canvas-kit/boards/agent.ts` `AGENT_BOARD`: the Agents board kind; it re-exports the checker.
- `src/components/canvas/agent-forge.tsx` `AgentForge`: the Forge screen (drafts, install, export, trial).
- `src/components/canvas/forge/agent-board.tsx` `AgentBoard`: draws the cards and wires.
- `src/lib/forge.ts` `exportOf`: exports a checked file.
- `src/lib/forge-recipes.ts` `AGENT_RECIPES`: the ready recipes, generated from the skill's files.
- `scripts/sync-agents-plugin.ts` `withBlock`: puts the generated block into the plugin.

## Card types
| Card | What it does | Reads or writes |
|---|---|---|
| Input | Gives the agent its values | Chat sources (last reply, user message, history, card, persona, author note, own previous text, Litopys facts, lorebook); Dashboard fields in `DASH_FIELDS` |
| Output | Sends the result out | Kinds `prompt-insert`, `note`, `choices`; shows only in allowed places |
| Template | Builds text from `{{slots}}` | Each slot is an input |
| Ask the model | One model call: text, yes/no or JSON | Costs one call; needs `llm` |
| Parse JSON | Checks text against a shape | Sends a `failed` signal |
| If | Yes, No or Unknown; never calls the model | Reads own state, dice or the chat |
| Merge | Fires when any input fires | Signals only |
| Write to Dashboard | Changes one Dashboard field | Field in `DASH_WRITE_FIELDS` (not `present`); queued until the run succeeds |
| Read / Set / Add / Change own state | The agent's own fields | `agents/state/<chatId>/<id>.json`; numbers clamped |
| Dice, Pick | Roll or pick in code | Same reply, same result |
| Extract, Cut | Keep part of a text | Text only |
| Script | Small program, values in and out | Needs `run:code`; no files, network or clock |
| Note | A note for people | Never sent to a model |

## When an agent runs and what it may change
- `after`: `POST /agents/run` once a new reply exists. `before`: `llmRequest` runs it on a send, and its hint goes into that reply. `parallel`: the app calls it when a send starts. `before` with `wait: false` runs as `parallel`.
- It runs only when every need is granted and its calls fit the user's cap (`maxCalls`, 1 to 50).
- It may write its own fields; Dashboard fields (clamped, logged in `dashboard/agent/<chatId>.json`, refused until the Dashboard has been read); show notes or choices; add a `prompt-insert` hint. A parallel agent cannot insert a prompt (`E_PARALLEL_INSERT`).
- Limits: seven model calls in a row (`AGENT_MAX_ROUNDS`); 40 state fields; 256 KB per file; 20000 characters of text; Script code 8000 characters, 6 scripts per agent (`SCRIPT_LIMITS`). The declared `limits.maxCalls` must cover the model cards (`E_BUDGET`).

## Data
- `data/agents/<id>.vertep-agent.json`: the installed, compiled agent.
- `data/agents/drafts/<name>.vertep-agent.json`: a draft waiting for install.
- `data/agents/grants/<id>.json`: `{ v, needs, asked }`, permissions the user confirmed.
- `data/agents/config.json`: model choices and `byAgent` (`maxCalls`, `everyN`).
- `data/agents/state/<chatId>/<id>.json`: `{ v, own, last, memo, n, before }`.
- `data/agents/runs/<chatId>.json`: `{ v, runs }`, newest 100.
- `data/agents/inserts/<chatId>.json`: `{ v, items }`, hints for the next reply.
- `dashboard/agent/<chatId>.json`: ledger of Dashboard writes, for undo.

## Flow
1. Build: the Forge's Agents board edits the cards, starting from a recipe in `AGENT_RECIPES` or a blank agent. It checks the file as it changes and saves a draft.
2. Assistant: the built-in assistant follows `.skills/agent-craft/SKILL.md`. It copies a reference recipe, writes a draft under `data/agents/drafts/`, and runs a dry run on a real chat. The user installs it from the Agents tab.
3. Compile: the checker adds `agent.derived`; `exportOf` writes the shareable file.
4. Install: `PUT /agents/install` checks again, stores the file and keeps permissions already given. Nothing runs until the user grants them.
5. Run after a reply: `POST /agents/run` goes through `runRoute`, `pickAgents`, `stepRun` and `commitRun`.
6. Run before a reply: `llmRequest` calls `runBefore` on a send, then adds the hints.
7. Dry run: `POST /agents/dry` (`dryRoute`) runs one agent over the chat, with example answers or, with `live`, the model. Nothing is written.

## The generated block and how to keep it in sync
- The checker and executor are copies of `src/canvas-kit/boards/agent-check.js` and `agent-run.js`, placed between `// ==== BEGIN GENERATED` and `// ==== END GENERATED` in `plugins/agents/plugin.js`. Edit the sources, never the block.
- Run `bun scripts/sync-agents-plugin.ts`; `--check` exits 1 when the block is stale. At 91eec33 `--check` exits 0.
- The test "the generated block is what the sources say" in `test/rp-agents-plugin.test.ts` compares the file with `withBlock(now, generatedBlock())`.
- `src/lib/forge-recipes.ts` is generated from `.skills/agent-craft/references/` by `bun scripts/sync-agent-recipes.ts`; `test/rp-forge.test.ts` fails when it is stale.

## If you change X, also touch Y
- A card, checker rule or executor step: edit the source, run the sync script, commit both, update tests and the "Agents" section of `docs/DATA-FORMATS.md`.
- A Dashboard field: `DASH_FIELDS` and `DASH_WRITE_FIELDS`, the Dashboard in `plugins/relations`, and `docs/ARCHITECTURE.md`.
- A permission: `UNSUPPORTED_NEEDS`, the checker's `needs`, and the permission prompt text.
- An error code: `docs/DATA-FORMATS.md` and the `ag.issue.<CODE>` keys read by `src/lib/agent-issues.ts`.
- A recipe: its file in `.skills/agent-craft/references/`, then the recipe sync script.
- `expandNames`: five plugins carry a copy (see `docs/COUPLINGS.md`).

## Traps
- A hand edit between the markers is overwritten by the next sync, and the generated-block test fails.
- `summary` passes the checker as an Input source, but `sourceValue` returns nothing for it. `preGenInjections` and `parallelResults` are refused by `UNSUPPORTED_NEEDS`.
- `docs/DATA-FORMATS.md` says the `before` and `parallel` triggers are not yet run. The code runs them (`pickAgents`, `runBefore`), so that note looks stale.
- A regenerated reply restores state from before, so a rerun does not count twice.
- `.skills/agent-craft/SKILL.md` names paths under `apps/roleplay/`, which do not match this repo.

## Tests that guard it
All under `test/`: `rp-agents-plugin.test.ts` (generated block, routes), `rp-agent-run.test.ts`, `rp-agent-check-sandbox.test.ts`, `rp-agent-dry.test.ts`, `rp-agents-dry.test.ts`, `rp-agent-board.test.ts`, `rp-agent-script.test.ts`, `rp-agent-permissions.test.ts`, `rp-dash-agent-writes.test.ts`, `rp-agent-if-memory.test.ts`, `rp-forge.test.ts`, `rp-agent-craft-skill.test.ts`.

## Not verified
- The app code that calls `POST /agents/run` after a reply, and the chat UI (`agents-panel.tsx`, `agent-block.tsx`).
- The assistant's tools (`agent_dry_run`, file writes); they are not in this repo.
- Whether `forge/card-form.tsx` and `forge/dash-fields.tsx` read `AGENT_CARDS` and `DASH_FIELDS`.
- The `state-patch` Output kind: `SHOW_BY_KIND` lists it, but `NEEDS_BY_OUTPUT` does not.
- The engine's side of `limits.passes`, and the "before" swipe rule (docs only).
- Only the generated-block check was run. No test was run; the test files were checked by name only.
