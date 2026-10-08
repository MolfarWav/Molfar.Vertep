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
3. **Token use** (queue 0d; user's choice: measure, then fix the top 2-3 shares): per run, model calls,
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

## Not in 0.9.1
Inspector with sources (0e), connections in the shell Settings + pi-ai upgrade, the five agent tools,
Molfar's own memory, skill usage chip.
