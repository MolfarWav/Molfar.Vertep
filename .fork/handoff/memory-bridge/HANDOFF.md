# Memory bridge: handoff to the next thread (2026-10-22)

Read first: `CLAUDE.md` (of main: it has a newer rule about closing an issue with a "How it was solved" comment),
`.fork/STATE.md` (top section "Memory bridge work"), this file, then issue #102 and `DESIGN.md` here.
The owner is doing a physical check of the branch now and will bring the findings; continue on the same branches.

## Where the work is

| What | Where | Head (2026-10-22) |
|---|---|---|
| Roleplay (all the features) | fork `MolfarWav/Molfar.Vertep-Roleplay`, branch `claude/memory-bridge`, worktree `E:\Claude\rp-memory`, from fork main 4.60.0 | `fb01efb` (skills #106: card skills, earned in play, screens; clean, pushed) |
| Engine notes (STATE, handoffs, card skill copy) | this repo, branch `claude/memory-bridge`, worktree `.claude/worktrees/memory-bridge` | `470b2cf` + this file |
| Chub fix (separate release candidate) | engine branch `claude/chub-system-role`, worktree `.claude/worktrees/chub-system-role` | `06ed6fc` |

Nothing is merged into any main and no tag is pushed. Release version is open (Roleplay 4.61.0 would be the next; manifest,
CHANGELOG "Unreleased", `APP_VERSION` in `src/lib/guide-tips.ts` and the What's new tip `since` must move together at
release; the CHANGELOG already has the entries). Pushing to the fork's main ships to every install: ask first.

The owner's machine runs it through `data/credentials/molfarwav2/app-upstream/roleplay.source.json` with
`"ref":"claude/memory-bridge"` (backup `roleplay.source.json.bak-2026-10-22-memory`); set it back to `HEAD` after the test
or the release. The branch only adds files and keys, the old code ignores them: going back loses nothing. How to try it:
`TRY.md` in this folder.

## What is built (all on the Roleplay branch, tests 1413 pass, typecheck clean, each UI browser-checked at 1280 dark / 390 light / uk)

- **#100** a chat that continues another carries its Dashboard end state in (threads, numbers, names, live notes, said),
  banner with Start clean / Carry it over again, one switch for the Dashboard and the Litopys backstory,
  `POST /dashboard/inherit` (`on`, `rebase`), late link: "Rebuild on top" (copy in `dashboard/rebase/`), the Dashboard
  insert drops its "does not know" claims in a chat linked but not started from the earlier one.
- **#98** `said` list (sensor key, `applySaid`, `SENSOR_PROMPT_12` past default, config `said.perTurn`/`inject`, own prompt
  part "Dashboard · said", Dashboard Said block with hidden lies and edit/remove/restore, Prompt board switch `plugin:said`).
- **Card memory** (`characters/<id>/memory.json`, Litopys routes `/litopys/card-memory*`, `cardMemoryFor`/`cardMemoryText`,
  the part "Litopys · character memory" above the history after the backstory, Prompt board switch `plugin:cardmemory`;
  the Memory tab with stories that open and edit; import with preview). Rules held by tests: no line twice (against the
  chat's and its chain's Litopys facts, the story so far, what the chat carried in, the card's own text); the text does
  not move between replies (prompt cache); a deleted chat breaks nothing; in a group only the speaker's card; Litopys
  inserts go above a trailing "[Start a new chat]" preset line.
- **#107 first version** the strip "What this chat carries" + panel (`GET /litopys/carries`, `carries-strip.tsx`,
  `src/lib/carries.ts`), World DM chip, desktop chip chooser (localStorage `rp.carries.hidden`).
- Smaller: scrollbars in two pickers (`CommandList`), the card's depth prompt labelled in the Author's note drawer.
- Docs updated: Roleplay `docs/DATA-FORMATS.md` (card memory, Dashboard state), the card skill (both copies), the workspace
  task for the built-in agent `workspace-agent-task.md` (to paste on each machine after the release).

## Left (each is an issue; pick with the owner after his check)

- **#109** UX/UI of the strip: the owner wants the chips in the header's free middle, not a row under it; what to show,
  how expanded. Design decision first (owner with Opus), no code until then.
- **Findings of the owner's physical check (2026-10-22):** the Jude rebuild worked (Dashboard and relations carried, the Memory tab opens and edits), but (1) the model still would not admit the story is a continuation even when asked: the Litopys headers say "do not retell it, do not contradict it" and the card memory block gives no instruction, and the chat's own first message was written without the memory: **#110** (an explicit instruction at the start of the memory parts, the owner's OOC idea; test on Gemma/GLM with the Jude chat); (2) the Said list fills too much and too often (a self-introduction and an ordinary request were stored as "confession" and "order"): comment on **#98** with the ideas (stricter wording with negative examples, perTurn default 1, a strength field, cooldown, per-character cap, compare with notes). The owner will take **#106 skills** next in a new chat.
- **#106** card skills: short rule blocks, the seed of the Canvas behaviour preset; `memory.json` keeps unknown keys so
  `skills`/`changes` can be added; design in `DESIGN.md` (sections 4 and 5).
- **#108** Canvas: save the Chat links board and start a new one (owner's screen: old links stay on the board).
- **#86** (threads dropped silently at the limit, stale threads never retired, event ids in `other`) and **#85** (imported ST
  presets lose post-history, narrator-group `{user}` line needs the owner's pick, hidden blocks fill the sensor and Litopys
  windows: apply prompt-only regex before cutting) are small neighbours; take them when the files are open.
- **#97** stays open until the notebook has been watched over more chats; **#98** later: inner thoughts, a messenger plugin.
- Card memory: the summary is built from Litopys arcs/chapters by code, no model call yet (a card-tasks model proposal
  is the planned upgrade); a per-chat choice of sources (`meta.memory.sources`, the server reads it, no UI except the
  Prompt board switch); the live Dashboard notes are NOT compared with card lines (known small duplicate, chosen for the
  prompt cache); the confirm dialog buttons are 32 px on phones (shared component).
- **Chub (#59, reopened, engine `claude/chub-system-role`)**: a custom connection now sends `system`, not `developer`, for a
  model marked as reasoning. Unverified against Chub (no key, geo block); the reporter's answer decides. Ships with its own
  engine release; do not mix it into the memory release.
- When the owner has tried it: close #100, #98, #107 (and #59 only on the reporter's word) with a "How it was solved"
  comment each, per the rule in main's CLAUDE.md.

## How the work was done (reuse)

- Orchestrator wrote server code, design and tests; UI was built by a Sonnet subagent from a precise spec and checked in a
  real browser with `browser-check` (helper scripts in `E:\Claude\rp-bc`: `seed*.mjs`, `walk*.mjs`, `pw.mjs` copy without
  `--hide-scrollbars`; screenshots in the session scratchpad `bc-*`). The orchestrator reviewed diffs and screenshots, ran
  `bun test test/` (1413) and `bun run typecheck` in `E:\Claude\rp-memory`, then committed.
- Position-based tests: every new past sensor default shifts `PAST_DEFAULT_PROMPTS.sensor.at(-n)` in
  `test/rp-dashboard.test.ts` and `test/rp-prompts.test.ts` by one.
- Gotchas: bash heredocs eat backslashes in JS written with `node -e`/template literals (write regexes with the Edit tool or a
  file); Edit needs the file Read first; `/tmp` in bash is not `/tmp` for node on Windows (use files in the worktree and
  delete them); never run python here (it hangs on stdin).
- Never use the owner's engine on 8788; run throwaway engines on 8806/8807 only.
