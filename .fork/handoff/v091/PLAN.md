# 0.9.1: the agent (Molfar) on phones, its token use, card and preset skills

Agreed with the user 2026-10-08. Engine branch `claude/v091` (worktree `.claude/worktrees/v091`, from
main `857cbfd` = 0.9.0). Roleplay parts in the clone `.claude/worktrees/rp-memory` on a new branch from
the fork's main (4.25.0). Fixes the user finds in 0.9.0 (Memory v2, arcs) go into this release too.

## Items, in order
1. DONE: release archives renamed `Chrysalis-*` → `Molfar-Vertep-*` (`scripts/dist.ts`, the CI smoke
   step in `build.yml`, README). Self-update and the staging check accept both names since 0.8.0.
2. DONE 2026-10-08 (user's choices: app skills by name, no trigger lists in the index): `memoryPromptSection`
   lists global skills with their description cut before "Triggers:", and app/project skills as one
   names-only line per scope; full lines still come with `projectContextFor` on the first touch.
   Desktop workspace: section 1860 → 1322 tokens (full), 877 → 840 (compact). Original text:
   **Lighter skills index** (handoff `.fork/handoff/molfar-skills/HANDOFF.md`, part A): the system
   prompt lists only global and built-in skills; app and project skills stop riding every chat (today
   `memoryPromptSection` lists them all, ~1k tokens for 11 skills on the desktop). Decide how Molfar
   still finds an app's skills when working on that app (e.g. listed when the session's project or the
   app's files are in play, or one index line per app). Measure before and after with
   `estimateTextTokens`.
3. BUILT 2026-10-08, waiting for the before/after run on the desktop: measured (`token-use.md`), four
   fixes chosen by the user: `src/agent/context-fold.ts` (earlier tasks' results cut to the reload
   summary, stale and over-budget results in a run cut, on a copy before each call; `RunState.startedAt`),
   read_file cap 40k characters with a note + `paths` (up to 8 files in one call), the batching rule
   in both prompts. Tests `test/context-fold.test.ts`. Then (user, same day): sandbox traps fixed (python3 argv/env note,
   `RUN_RESET`), in-run age fold (6 steps), app authoring sections moved to the app-authoring skill,
   app tools lazy in the full prompt too (`appCodeTouched`), json_get / json_set (`src/agent/json-edit.ts`,
   core tools), edit-large-card rewritten for them (`.fork/app-skills/roleplay/edit-large-card`).
   Original text:
   **Token use** (queue 0d; user's choice: measure, then fix the top 2-3 shares): per run, model calls,
   input/output per call, what the input is made of (system prompt, AGENTS.md and docs, skills index,
   history, tool results) and what repeats between calls; whether provider prompt caching is used. Data:
   the inspector (`src/inspector.ts`), `llm-logger.ts`, real runs on the desktop workspace read LOCALLY
   (never sent to external models). Report the numbers to the user, they choose the trade-offs.
4. **Card and preset skills for Molfar** (handoff part B; user 2026-10-08: they live as Roleplay app
   skills in the fork, `apps/roleplay/.skills/`, NOT in `builtin-skills/`; "As built-in skills" below is overruled): create / edit / adapt character cards, from
   the user's own skills (bot-writer, character-depth, lore-architect, rp-card-adaptation in
   `E:\Hermes\profiles\rp-platforms\skills\`, on the desktop only), and a new skill for creating and
   editing Roleplay presets. As built-in skills (`builtin-skills/`), loaded on demand by `skill_load`.
   Card and preset formats from the Roleplay code (cards: `data/characters/<id>/card.json`; presets:
   check the app). Drafts by an external model from a spec with made-up examples only.
5. **Molfar's page: reasoning and tool calls collapsed by default** (client-agent), desktop and phone.
6. **Roleplay card editor shows the card's id with a copy button** (Roleplay app), so Molfar can be told
   exactly which card to edit.
7. **Bash on the phone** (queue 0b2 item 2): Molfar cannot change or append to a card on Android. The
   agent shell never runs on the host: it runs in the browser, in a WebAssembly sandbox (wasmsh) inside a
   sandboxed frame of Molfar's page (`src/sandbox/`). Guesses to test, none proven: the Android WebView
   lacks something that sandbox needs, or the WebView pauses when the page is not on screen and the
   commands time out. Needs the user's repro on the phone: the engine log (Logs in the app) and the
   agent page's console. File tools may fail separately: check both.

8. **APK updates install over the old app** (user, 2026-10-08). DONE: the cause was the debug key a CI
   runner makes per build; the user created a release key and the four `ANDROID_KEY*` secrets
   (cert `CN=Molfar Vertep, O=MolfarWav`, SHA-256 `298ce687…4c5235`, checked in run 37840321053).
   The alias secret is `molfar`, so GitHub masks that word in every log (`io.github.***wav.vertep`).
   One-time reinstall for existing installs (backup, uninstall, install, restore): say it in the 0.9.1
   notes. Dockerfile fixed for the renamed archives (`Molfar-Vertep-*`). TODO (user: "do it later,
   so it never bothers again"): "Get update" downloads and installs the APK itself (PackageInstaller,
   no browser), checks the download's signing cert against the installed one and, on a mismatch,
   says plainly "a one-time reinstall is needed: back up in Settings > Backup" instead of Android's
   "App not installed".
   DONE 2026-10-09 `android: "Get update" downloads and installs the update itself` (Updater.java,
   PackageInstaller, REQUEST_INSTALL_PACKAGES; APK compiles in CI run 37844352178). Testable only once a
   newer release than the installed one exists (0.9.1 over the CI 0.9.0 build).
   Also found on the phone after the reinstall + restore: Roleplay did not build (fonts, react…: a backup
   carries no node_modules, and only boot installed missing packages). Fixed `2a70b8d`: the restore
   installs them at once (installMissingPackages). Bash on the phone (item 7): Molfar saw `ls /workspace`
   empty; the sandbox code reads fine (one small flaw: after a sandbox reset the remount uses the last
   known tree, without a pull). Needs from the user: the bash tool results (expanded) and Logs > Copy.
9. Small: `.claude/skills/browser-check/pw.mjs` hardcodes a Linux Chromium path; add a Windows
   fallback (Chrome under Program Files).

## Not in 0.9.1
Inspector with sources (0e), connections in the shell Settings + pi-ai upgrade, the five agent tools,
Molfar's own memory, skill usage chip.

## Note for item 4 (user, 2026-10-08)
Card and lorebook formats will change (new card fields, changed ones). So the format reference must
not be hand-written in a skill: it lives in the Roleplay fork next to the code (`data/README.md`
sections or `docs/CARD-FORMAT.md`), a Roleplay test fails when a field of the card/lorebook mapping
(`cardToCharacter`, `characterToCard`, `lorebookToEngine` in `src/lib/engine.ts`) is missing from it,
and edit-large-card moves into the fork's `.skills/` with the call order only, reading the reference
with one read_file. Until then the fork-only copy in `.fork/app-skills/roleplay/edit-large-card`
(copied to the desktop workspace 2026-10-08) carries today's format.

## Item 4 progress (2026-10-08, stopped at the usage limit)
User choices: all four skills (card craft, import from other platforms, lorebooks and world,
Roleplay presets), shipped in the Roleplay fork's `.skills/` without anything personal, drafted by an
external non-training model (`work` alias) from a spec, the format reference first.
DONE: Roleplay clone `.claude/worktrees/rp-memory`, branch `skills-v091` (from fork main 4.25.0,
pushed, not main): `d196218` `docs/DATA-FORMATS.md` + `test/rp-data-formats.test.ts` (proven to fail
on a missing field). Sources (newest): `E:\Hermes\profiles\silvi\skills\user-context\`
`rp-card-adaptation`, `rp-preset-architecture` (+ references); older only in
`E:\Hermes\profiles\rp-platforms\skills\`: `bot-writer`, `character-depth`, `lore-architect`.
They hold the user's own names and cases: strip them. Shared drafter spec written in the session
scratchpad (`skills/spec-common.md`); it is gone with the session, rewrite it from this list:
target Molfar, few tool calls, json_get/json_set, point to DATA-FORMATS.md, privacy rule, English,
description <= 280 chars, body <= 14k, <= 4 references of <= 15k, output `=== FILE: ... ===`.
DONE 2026-10-08 (second session): Roleplay `skills-v091` `13b38cd`: `.skills/card-craft`,
`card-import`, `lorebook-craft`, `preset-craft` (drafted by the external `work` model, about a
minute each, then reviewed: multi-line description that the engine's `parseSkill` reads as `>-`,
an author's own tag template presented as the RisuAI V3 format, claims the app has no macros or
regex, a wrong prompt_order list; all fixed against the code), `edit-large-card` cut to the call
order + DATA-FORMATS.md, AGENTS.md rule (format change = reference + skills), DATA-FORMATS.md fixed
(every preset editable unless `studio.readOnly`; new Macros and regex section). 750 Roleplay tests
pass. NEXT: the user's live test on the desktop (skills into the workspace's
`apps/roleplay/.skills/`, or a Roleplay release), then merge `skills-v091` into the fork's main.
Done before (first session): one drafter call per skill (card-craft: rp-card-adaptation core + bot-writer + character-depth;
card-import: rp-card-adaptation platform parts + wyvern format + bot-writer platform-delivery;
lorebook-craft: lore-architect; preset-craft: rp-preset-architecture without Marinara agent parts),
review each, rewrite `.skills/edit-large-card` to point to DATA-FORMATS.md, a rule in the fork's
AGENTS.md (format change = docs + skills), then the user's live test.
