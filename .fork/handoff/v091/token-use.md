# Molfar's token use: measured 2026-10-08 (item 3)

Source: the desktop workspace's agent session files (`agent/sessions/*.jsonl`, 24 files), read
locally. Each run record has `spend` (input, output, cacheRead summed over the run's model calls)
and `turns` (one per model call, with the tool results stored up to 20 000 characters each).
Scripts: session scratchpad (`runs.ts`, `split.ts`, `cache.ts`), not in the repo.

## Totals (34 runs with `spend`, 412 model calls, $1.67 recorded)
- Input 18.5M tokens (14.7M plain + 3.8M read from the provider's cache = 20%); output 0.17M.
  Input is 99% of the volume. About 12 model calls per run.
- What each call sends, estimated (per-call token counts are not stored; the split below solves
  each run's total against the stored tool results, so tool shares are lower bounds):
  - fixed part: system prompt, tool schemas, memory and skills index, ~10-12k per call
    (a one-call run in a fresh session costs 10-12k): ~4.5M, ~25%;
  - earlier runs of the same chat, carried IN FULL: ~8.6M, ~46%;
  - the run's own tool results and calls, resent on every later call: ~5.3M, ~29%
    (read_file 3.7M, bash 0.6M, grep 0.4M, edit_file 0.2M, skill_load 0.16M).

## Why earlier runs cost so much
The server keeps one agent per chat in memory (`agentInstances`, `src/server/app.ts`), and its
messages keep every tool result of every earlier task in full until the context trim kicks in at
the window's edge. The context at the start of a run grows from ~12k to 38k, 87k, 104k within a
day's chat (sessions `2026-10-04-46b32r`, `-vbz1hn`). A chat reloaded from the file (after a
restart or an eviction) gets 300-character summaries of old tool results instead
(`loadSessionDialogue`), so the same chat costs far less after a restart: two behaviours for one chat.

## Inside a run
read_file returns whole files up to 256 KB when no range is given, and every result stays in the
context for all later calls of the run, also after the file was edited or read again.

## The user's view (2026-10-08) and the fixes chosen
The user: the pain is how OFTEN Molfar calls the provider. On the laptop, a trivial "change the
description in a card" ate up to 1M tokens in a minute or two: dozens of calls a few seconds apart,
each with ~51-56k input and 13-60 output tokens (one small tool call per model call). It hits the
subscription's request limit, speed, and money on paid models. The desktop data agree: calls are
about equal to tool calls (52 calls for 51 tools, 32 for 41): the model almost never batches.
Fixes chosen for 0.9.1:
1. Earlier tasks folded: before each model call, tool results of earlier runs in the chat are cut to
   the same 300-character summary a reloaded chat gets.
2. Inside a run: a file read again in full or rewritten leaves a stub in place of the older copy;
   the newest tool results stay in full up to a budget, older large ones are cut with a note.
3. read_file without a range returns the start of a large file with a note how to read on.
4. Batched steps: a prompt rule (independent reads, greps and checks in one step, several tool calls
   in one reply) and read_file with several paths.
Not in 0.9.1 but the strongest fix for card edits: json_get / json_set (`.fork/handoff/agent-tools/`).

## Fresh run on the desktop (2026-10-08, session `2026-10-08-hf0g0u`, GLM 5.3 Flash via NanoGPT)
A card task (dialogue examples, a lorebook, a deeper card): 49 model calls, one tool per call, 1.5M
input (88% read from the provider cache; NanoGPT counts cached tokens against the weekly quota of
60M all the same, so caching saves the user nothing). Start context ~15k per call (48% of the
input); the run's own bash commands (heredocs with card text) and their output 52%.
11 of the 49 calls fought the browser sandbox: python3 there gets no argv and no exported variables
(wasmsh-pyodide 0.8.0 runs scripts through a fixed launcher, `compile(..., "<string>")`, in its wasm
binary; not fixable in the engine), and a `set -x` from one command traced every later one.
Fixed: the bash tool description says so; every command starts with `RUN_RESET` (prelude.ts).
In-run age fold added (older than 6 steps: long results and long arguments cut): simulated on the
recorded runs, -19% for this run, -17..27% for other long runs.
Base per call on the desktop: the active app's AGENTS.md (Roleplay) ~4.0k tokens, static prompt
~2.4k + shell part ~0.6k, tool schemas ~2.5k+, workspace AGENTS.md ~1.6k, memory and skills ~1.3k,
persona ~0.3k. Open: what to cut there (the user decides).
User 2026-10-08, base and calls: (a) the app/plugin authoring and app UI sections of the static
prompt move into the built-in skill app-authoring; (b) the app tools show only when needed, in the
full prompt too (like small-window groups); (c) json_get / json_set from the agent-tools handoff join
0.9.1 (the other three tools stay queued); edit-large-card then builds on them.
