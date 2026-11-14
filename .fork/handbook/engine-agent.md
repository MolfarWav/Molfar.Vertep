# The built-in agent: the loop, tools, memory, context folding, small windows

Verified at: molfar.vertep 5b6f37a

## What it does
- A run sends the user's message to a model, which calls tools on the user's workspace until it stops.
- Each run is appended to `agent/sessions/<id>.jsonl`. Every model call gets a folded, trimmed copy of that history.
- A small-window model gets one compact prompt and a short list of core tools.

## Owners
- `src/agent/agent.ts` `create`: builds tools, picks the model, builds the system prompt and wires the hooks.
- `src/agent/agent.ts` `runNow`: one run, from prompt to persisted record, including retries.
- `src/agent/agent.ts` `systemPromptFor`: the rules and workspace sections of the full prompt.
- `src/agent/agent.ts` `instructionDocsStamp`: decides whether a cached agent is still valid.
- `src/agent/agent.ts` `persistRun`: appends the run record, which `loadSessionDialogue` reads back.
- `src/agent/agent.ts` `suggestMemoryAfter`: the post-run memory pass.
- `src/server/app.ts` `getAgent`: the agent cache; `evictAgents` drops one user's agents.
- `src/agent/tools.ts` `buildUserTools`: file, git, app, bash and ask_user tools.
- `src/agent/run-tools.ts` `planGate`: the plan-first gate on writes.
- `src/paths.ts` `agentWriteDenied`: paths the agent never writes.
- `src/agent/protect.ts` `protectedRefusal`: paths the agent writes only after a yes.
- `src/agent/memory.ts` `proposeEntry`: asks the user, then saves or queues the entry.
- `src/agent/mailbox.ts` `queueMail`: the mailbox queue.
- `src/agent/memory-suggest.ts` `shouldSuggest`: the gate for the post-run pass.
- `src/agent/context-budget.ts` `fitContext`: trims the dialogue to the input budget.
- `src/agent/context-fold.ts` `foldToolResults`: folds old results on a copy.
- `src/agent/batch-nudge.ts` `nudgeBatching`: adds a reminder after a streak of single lookups.
- `src/agent/compact.ts` `summarizeSession`: writes the summary used by compaction.
- `src/agent/small-window.ts` `visibleTools`: the tools sent on each call.
- `src/agent/checkpoints.ts` `restoreCheckpoint`: puts an app's code back to a checkpoint.
- `src/agent/cost-checks.ts` `costChecksApply`: whether the plan gate and cost questions are on.
- `src/plugins/runtime.ts` `collectSiblingTools`: plugin `appTools`, which does not feed this loop.

## A turn, step by step
1. `POST /v1/agent` in `src/server/app.ts` calls `getAgent`, which reuses or creates the agent. A send to a chat that is already running gets a 409.
2. `create` builds the tools and removes `WRITE_TOOLS` in plan mode. It removes `bash` when no sandbox is on.
3. `create` picks the model: the request, the project, the user default, the instance default, then the first shown. A named model that is missing is an error.
4. `create` builds the system prompt once, with `systemPromptFor` or `compactPromptFor`, then the memory and project sections.
5. `runNow` appends any "@path" file contents to the prompt. The stored message keeps only what the user typed.
6. Before each model call, `transformContext` drops old system messages, folds results, trims to budget, adds the batching reminder and sends the visible tools. If it throws, the untrimmed history goes out.
7. `beforeToolCall` runs `newAppRefusal`, then `planGate` (only when cost checks are on), then the app-contract hold, then an automatic checkpoint before the first change to an app.
8. A file write checks `agentWriteDenied`, then the protected-path question, then writes and commits to git.
9. `afterToolCall` unlocks tool groups on a mapped `skill_load`. On the first result that touches an app, it adds the project memory and, with `appContractOnDemand`, the app contract.
10. `runNow` retries dropped calls (`TRANSIENT_DELAYS_MS`), retries an overflow once with a deep trim, and asks again for a malformed tool call.
11. `runCheckpoints` lists changed apps, `persistRun` writes the record, and `suggestMemoryAfter` may queue memory suggestions.
12. `POST /v1/agent` auto-compacts when the run's final usage reaches 80 percent of the window (a literal 0.8).

## Tools
- `buildUserTools` (`src/agent/tools.ts`): `ask_user`, `read_file`, `edit_file`, `grep`, `write_file`, `json_get`, `json_set`, `git`, `app_*`, `bash`.
- `buildRunTools` (`src/agent/run-tools.ts`): `plugin_log`, `app_request`, `agent_dry_run`, `model_try`, `image_generate`, `web_fetch`, `run_budget`.
- Also: memory tools, `checkpoint`, `bug_solution`, `chats`, `tools_enable`, and MCP tools named `mcp_<server>_<tool>` from `buildMcpTools` in `agent.ts`.
- An app does not add tools to this agent. `appTools` feeds only the generations of app plugins that ask for tools. The agent reaches an app through `app_request`.
- Refused: writes in plan mode; `AGENT_WRITE_DENYLIST` paths (`auth.json`, `mcp.json`, `settings.json`, `.git`, `memory/`, `skills/`, `agent/`, `uploads/`, project files); protected paths (`persona.md`, `model-params.json`, and by default `apps/*/src/**` and `apps/*/index.html`) without a yes per request; a write into a folder that is not an app; app-code writes or a fourth file before `run_budget` has an accepted plan.

## Memory
- Files: `memory/MEMORY.md` plus topic files; `apps/<id>/.memory/` and `projects/<name>/.memory/`; skills in `skills/` and the matching `.skills/` folders; the mailbox in `memory/mailbox/`.
- Writers: `memory_propose` goes through `proposeEntry`, which shows Save, Later or Skip. With no card, the entry is queued. The post-run pass only queues entries.
- Prompt: `memoryPromptSection` clips core memory to 6000 characters (2000 in small mode). `projectPromptSection` clips project memory to 4000.
- Limits: `ENTRY_MAX` 500 characters per entry, `CORE_MEMORY_CAP` 4000 for the core (then a topic is required), `MAILBOX_MAX` 50, `DECLINED_KEEP` 300.
- A skipped entry is recorded in `declined.json` and cannot be proposed again.

## Keeping the context small
- Token estimate (`context-budget.ts`): 3.5 characters per token for ASCII, 2 for alphabetic text, 1 otherwise. An image costs `IMAGE_TOKENS` (1600).
- Input budget (`inputBudget`): the window, minus the output reserve, minus a safety margin of at least 4096 or 3 percent of the window.
- `fitContext` runs only when over budget, or after a forced overflow. It trims to `TRIM_TARGET` (0.6 of the budget), or `FORCED_TRIM_TARGET` (0.5). Pass 1 cuts old results and arguments to 1200 characters. Pass 2 cuts them to 200. Pass 3 drops the oldest history up to an assistant message. Pass 4 shares the rest among tool results. The last `PROTECTED_TAIL` (6) messages are not cut.
- `foldToolResults` (`context-fold.ts`), on a copy: results of earlier runs are cut to `PAST_RESULT_CHARS` (300). Steps older than the last `KEEP_STEPS` (6) keep an 800-character head of results over 2000 characters. Arguments over 1500 characters are cut to 400. An older full read of a file is stubbed once it has been read again or written later.
- `nudgeBatching`: after two single-call lookup steps in a row, and then every third (literals). The reminder rides a copy only.
- Small window (`small-window.ts`): `SMALL_WINDOW_MAX` is 32000. In `auto` mode, small mode is on at or below that, or when the window is unknown. Only `CORE_TOOLS` are sent until a group unlocks. Tools in no group are always sent.
- Compaction (`summarizeSession`): each chunk gets 60 percent of the input budget (literal), at least 2000 tokens, at most `MAX_CHUNKS` (6) newest chunks, and a reply of `SUMMARY_MAX_TOKENS` (4096). The compact record restarts the model's context from the summary. The file keeps everything.
- Stored text: `SUMMARY_CHARS` (300) and `OUTPUT_CHARS` (20000). Tool reads: `READ_CAP_CHARS` (40000). Both are in the files named above or in `tools.ts`.

## If you change X, also touch Y
- Any system prompt text, including `LANGUAGE_RULE` and `PRECEDENCE_RULE`: the stamp in `instructionDocsStamp` or an eviction in `app.ts`. The small-window prompt repeats both rules.
- A new tool: `buildUserTools` or `buildRunTools`; `WRITE_TOOLS` if it writes; `GROUP_OF`, `CORE_TOOLS` and the description maps in `small-window.ts`; `AUTO_CHECKPOINT_TOOLS` if it changes an app.
- A new write path that skips the tools: call `agentWriteDenied` and `protectedRefusal`.
- The auto-compact threshold: the literal 0.8 in `app.ts`, and the setting's range check in the same file.
- The session record: `persistRun`, `loadSessionDialogue` and `sessionListCache`.
- The client: `client-agent/src/api.ts` (`sessionsApi`, `mailboxApi`, `memoryApi`) and `MailboxTab.tsx`.

## Traps
- `appTools` does not reach this loop.
- `planGate` is off when cost checks are off. In `auto` mode that happens for a model on a local endpoint, so such a model can write many files without a plan.
- `transformContext` must not throw. When it does, the window can overflow with no retry.
- The system prompt is frozen per cached agent; an input missing from the stamp goes stale until restart.
- `saveEntry` swallows git commit errors.
- The post-run pass costs one more model call after runs of 8 or more steps.
- `KEEP_PER_APP` (30) drops old checkpoint records, so their commits can no longer be restored by id.
- Plan mode also removes `memory_propose` and `checkpoint`.

## Tests that guard it
- `test/agent.test.ts` (writes to `auth.json` refused), `test/context-budget.test.ts`, `test/context-fold.test.ts`, `test/context-split.test.ts`, `test/batch-nudge.test.ts`.
- `test/small-window.test.ts`, `test/run-tools.test.ts` (`planGate`), `test/cost-checks.test.ts` (`newAppRefusal`).
- `test/memory-suggest.test.ts`, `test/mailbox.test.ts`, `test/agent-memory.test.ts`, `test/protect.test.ts`, `test/checkpoints.test.ts`.
- No test name covers `buildMcpTools`, `compactSystemPrompt` or the 0.8 auto-compact threshold.

## Not verified
- The client event transport (`client-agent/src/streaming.ts`), `compactSession`, `git-cli.ts`, and the sandbox behavior of `bash`.
- The tests were not run; the list is by name only.
