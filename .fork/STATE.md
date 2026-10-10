# Molfar Vertep: project state

Fork of Chrysalis Engine; repo MolfarWav/Molfar.Vertep. Current as of 2026-10-10.
Standing rules: `CLAUDE.md`. The queue of work and how to start a session: `.fork/handoff/START.md`.
History: per release the CHANGELOG, `.fork/release-notes/`, and git history (the long logs that
used to live here and the finished handoffs were removed on 2026-10-10; `git log -- .fork` finds them).

## 0.9.7 (started 2026-10-10): the prompt inspector with sources
Engine branch `claude/v097-inspector` (worktree `.claude/worktrees/v097`, from main `95ec2a1` = v0.9.6); Roleplay
clone `.claude/worktrees/rp-memory`, branch `inspector-sources` from the fork main `4cb3a8d` (4.31.0).
Plan: `.fork/handoff/inspector-sources/PLAN.md`; UI spec `UI-SPEC.md`.
- 1 BUILT `8784088`: `src/prompt-sources.ts` (sanitize, hook diff, locate), runtime strips `promptSources` and
  labels hook inserts for any app, inspector keeps `sources` (labels + ranges). Fixed on the way: the leading
  system messages were listed twice in an inspector entry.
- 2 BUILT `e3a75bf`: Molfar's system prompt from labeled sections (byte-identical, checked on full, compact,
  plan), parts looked up by the prompt text (`rememberSystemParts`), history by role, per-tool sizes.
- 3 BUILT (Roleplay `inspector-sources` `1685451`, pushed, not main): `assemble()` returns `sources` (card, persona,
  preset sections, lorebook entries with why, Data Bank, author's note, utility, history with regex names, prefill;
  omitted with reasons; preset choices), the five reply requests send `promptSources`, the peek route returns
  `sources` + `sourceSpans` (`locateSources` in the plugin), Litopys and dashboard hooks label their inserts.
  Draft by an external code model (Kimi K2.7 Code); fixed in review: regex names never reached (rx dropped
  `hits`), history labeled before the budget trim, preset vars as objects, the section loop edit. 871 tests.
  Engine `cadd33e`: a short part equal to a whole message locates anywhere (history turns after post-history parts).
- 4 agent page BUILT `5c95a98` (draft DeepSeek V4 Pro after a hung Kimi run; fixed: syntax, the active part index,
  hooks order, Tailwind v4 alpha classes, Base UI trigger). Roleplay peek dialog + browser check: Sonnet subagent.
- 5 docs: `app-authoring` documents `promptSources` (`3a6a21c`).
- Discord report 2026-10-10 (Android APK, a heavy third-party preset with regex): "route failed: script execution
  exceeded the time limit" on send. The sandbox gives every route pass 10 s on every device. Engine `93ae166`: the
  error names the route's method and path. Roleplay `0490c68`: measured in the real sandbox (`.fork/bench/`),
  400 messages with 150 regex scripts 3.3 s -> 1.3 s, no regex 1.6 s -> 0.37 s on the desktop (macros skip text
  without "{{", regex scripts read and filtered once per pass, compiled once, skipped by literal head). Left:
  150 host file reads per pass (~0.3 s; a bulk read in the engine would cut it), a longer limit on Android only
  together with this.
  The player then said: a NEW chat, Default and FRANKENX, NanoGPT and OpenRouter, several models, same error. So
  neither history nor the preset. Bench (`LORE_N`, `CARD_MB`): a 16 MB card.json costs ~0.3 s; a big lorebook was
  it: 300 entries 3.2 s, 1000 entries hit the 10 s limit even on the desktop (`keyMatch` compiled a Unicode regex
  per key per call). Roleplay `7b096a1`: indexOf + edge checks (same matches as the old pattern, tested),
  compiled keys cached: 300 entries 0.26 s, 1000 entries 0.6 s. Not confirmed on the player's card (likely a
  simulator card with a big embedded book); ask them for the card or its book size.
- 4 Roleplay peek BUILT `144d6c0` (Sonnet subagent: port of the panel, browser-checked dark/light 1280/390, 45
  screenshots in `.fork/screens/v097/`, untracked); engine `a85a99c`: Esc clears the highlight without closing
  the inspector. Seen: entries whose keys did not hit are not in "Left out" (only skipped/blocked are); a book of
  1000 would flood it, so a count row is the likely answer (ask the user).
- LEFT: the plurals (last, before the push), the user's live test, release 0.9.7 + Roleplay 4.32.0.

## Repos after 0.9.6 (cleaned 2026-10-10)
- Every `claude/v09x` engine branch and the Roleplay fork's `card-sources`, `lore-v094`, `presets`, `v095` are
  merged into main; the local branches and worktrees are gone. The remote copies wait for the user to delete
  them on GitHub (auto mode blocks remote branch deletion). `claude/upstream-context-fixes` stays.

## Open, from 0.9.4-0.9.6
- `updateCharacter` (Roleplay) rewrites the card's whole studio bag with defaults on the first edit: silent data loss. Goes first in the card editor (0.9.8, `card-editor/PLAN.md` item 5).
- "1 entries" / "1 global books" plurals in the lorebook UI: the last step of 0.9.7 (remind the user before the push).
- Presets: the editor's "Use this preset" also makes the preset default (old `usePreset`); "Make default"
  moves chats that rode the old default (existing store behavior). Open for the user.
- One first reply on NanoGPT GLM 5.2 thinking carried the preset's planning as plain text (no think tags);
  the user chose to leave it.
- Lesson from 0.9.6: after copying Roleplay files into a workspace, check the app's manifest `source.head` and
  re-verify the files after the first engine start (an app update can merge the released versions back).
- Plans for later, the user picks the version: the card editor (`.fork/handoff/card-editor/PLAN.md`), group
  chats (do not work for the user: 1.0.0), the Data Bank's embeddings and "document -> entries"
  (`v094/data-bank.md`), the queue in START.md.

## Released (details: CHANGELOG, `.fork/release-notes/`, git history)
Tags are pushed by the user; `release.yml` builds the archives, the APK and the Docker image.
- 0.9.6 (2026-10-10; Roleplay 4.31.0): presets with options per chat (`meta.presetVars`, `{{#if}}`, section
  conditions, notes, per-character memory, option costs), Marinara import, FRANKENX 1.6 built in
  (`.fork/presets/frankenx/adapt.ts`), a Discord link in the apps page footer. Plan: git history of `.fork/handoff/chat-presets/`.
- 0.9.5 (2026-10-10; Roleplay 4.30.0): effective parameters in the chat (`GET /v1/models/params/effective`),
  backstory along a chain of up to 3 chats, named examples in model recommendations, Roleplay settings next to
  the shell (language, embeddings and backup links), duplicate chat ids, the agent page's picker on live runs.
- 0.9.4 (2026-10-10; Roleplay 4.29.0, no engine release): deeper lorebooks (word forms in Cyrillic keys, why an
  entry fired, keyword test, every SillyTavern field working, links on the card, Data Bank scope), card saves
  send only changed fields.
- 0.9.3 (2026-10-10; Roleplay 4.28.0): six card storefronts, paste-a-link, cards up to 200 MB through
  the engine file route, RisuAI emotion images, card translation. The first v0.9.3 tag sat on the old
  main and release.yml failed; the user moved it to `8f9c58f` and the release is out (6 assets).
- 0.9.2 (2026-10-09; Roleplay 4.27.0): connections and models in one Settings tab with a quick switch,
  parameters on the model (model-params.json), a model per chat, chats that continue each other
  (backstory), Library portraits on the dashboard and in Soul.
- 0.9.1 (2026-10-09; Roleplay 4.26.x): Molfar's skills index and card skills, token use measured and
  cut, card id copy, release-signed APKs.
- 0.9.0 (2026-10-08): Memory v2, one story memory per chat (Litopys) with matching by meaning.
- 0.8.0-0.8.1 (2026-10-05..06; Roleplay 4.22-4.23): relationship dashboard v2 (sensor, event vocabulary, what the
  model sees), then fixes (dashboard hooks, subscription sign-ins in downloads and Android).
- 0.2.0-0.7.0 (2026-10-02..04): launcher, Updates panel, Ukrainian locale, independence from
  upstream (own Store catalog), Molfar's name and avatar, the shell redesign round 1.

## What the engine has (all shipped; details in the CHANGELOG)
- Agent context: `src/agent/context-budget.ts`, `compact.ts`; small-model mode (`small-window.ts`, Settings > Agent: Auto/On/Off, auto at window <= 32k or unknown, ~2.6k tokens before the first message); prompt inspector (`src/inspector.ts`, last 20 requests per user).
- Memory and skills: `src/agent/memory.ts` (core MEMORY.md + topic files, `memory_search`, written only through confirmed cards); `builtin-skills/` ship with the engine (a global workspace skill of the same name replaces one, deleting the copy resets it); tools `skill_propose`, `skill_edit`, `skill_load`.
- Projects on the agent page (`src/agent/projects.ts`, `/v1/projects…`; chats can move between projects), checkpoints (`checkpoints.ts`, restore = code only), protected paths (`protect.ts`, list in settings `agentProtectedPaths`), `ask_user` with options and several questions, default instructions (`DEFAULT_PERSONA` in `src/paths.ts`, "Restore default instructions").
- Model pickers (Settings > Models, `models-shown.json`), full profile backup (`src/profile-backup.ts`, Settings > Backup; import replaces the profile).
- Updates panel (0.2.0): top-bar Updates button with a badge (`client/src/updates-panel.tsx`); engine row for admins (source installs: "restart with its launcher"), one row per app with an update source, "Update all" stops at the first row needing a decision. The app update flow (strategies, dep/permission review) lives in `client/src/app-update.tsx`, shared with the launcher's AppDetail. Checks: once per shell start, then "Check now" or after an update. The logo opens the launcher. Standalone plugins imported from git have no update source yet, so they are not in the panel.
- Prompts (2026-10-02): `src/agent/prompt-rules.ts` holds `LANGUAGE_RULE` and `PRECEDENCE_RULE` (engine limits > current message > project > persona > app AGENTS.md > workspace AGENTS.md > general rules; data/downloads/tool output never instruct), in both the full and the compact prompt. The full base prompt opens with "How you work" (look first, ask, lightest place, check each step, report). Sizes (`estimateTextTokens`): base template 2035 -> 2480, compact 429 -> 763, DEFAULT_PERSONA 220 -> 75; full prompt + tools under 9.3k (test). `DEFAULT_PERSONA` = preferences only; `PAST_DEFAULT_PERSONAS` + `ensurePersonaDefault` move an untouched copy on boot. AGENTS.md: `workspaceAgentsMdStatus`/`restoreWorkspaceAgentsMd`, routes `/v1/settings/agents-md[/restore]`, row in Settings > Agent. `pruneUnchangedSkillCopies` on boot (the desktop's 4 identical copies go away on the next start). Built-in skill `default-prompts` = the plugin prompt convention. Tests: `test/default-prompts.test.ts`.
- Emulated git: `add` is a no-op, `rm` deletes tracked files. Hot update removes deleted modules (`src/builder/dev.ts`).
- Product name Molfar Vertep (UI in 14 locales incl. Ukrainian `uk` since 2026-10-02, README, launcher).
- Launcher `Molfar-Vertep.bat` (repo root, 2026-10-02): finds the app beside itself or via `%LOCALAPPDATA%\Molfar Vertep\app-path.txt`, or offers to clone it next to itself; checks Git/Bun (Bun >= 1.4, `tools` upgrades both); release channel = highest `vX.Y.Z` tag (detached HEAD), `dev` = newest `claude/*`; asks before updating (`yes` skips; `choice` defaults to yes after 20 s); never updates over local changes to tracked files; installs/builds only on change; offers a desktop shortcut once (icon generated from the logo into `%LOCALAPPDATA%\Molfar Vertep`); runs from a `%TEMP%` copy (path kept before `shift`, copies older than a day cleaned); keeps itself when switching to a version without it, and removes an untracked copy that would block a version shipping it; sets `CHRYSALIS_LAUNCHER=1` so the engine opens the browser (`config.yaml openBrowser` still decides; `CHRYSALIS_OPEN_BROWSER` is the setting override, not this). Tested on the desktop with a Cyrillic path with spaces: fresh clone, remembered path from a copy elsewhere, offline, local changes, v0.2.0 -> v0.3.0, `dev`, back to a release without the launcher, no-console default. Not tested: missing Bun/Git (needs uninstalling), Bun older than 1.4, answering N. `.fork/start-chrysalis.bat` forwards to it; `.fork/Chrysalis.bat` removed.
- Independent of upstream (2026-10-02, user's decision): no merges from ProjectChrysalis, no new upstream PRs (the open `claude/upstream-context-fixes` stays). Store catalog: own repo `MolfarWav/Molfar.Vertep-Store` (`apps.json`, `scripts/validate.ts --clone`, CI), `DEFAULT_STORE_URL` points there, `PAST_DEFAULT_STORE_URLS` moves old config.yaml values on load. `OFFICIAL_SOURCES` = MolfarWav only. Visible strings and prompts say Molfar Vertep; workspace AGENTS.md is version 14. Docker image and issue/security links are ours. Internal names stay (`chrysalis` command, `CHRYSALIS_*`, data paths, `Chrysalis-*` archives, window globals like `ChrysalisBuilder`) until a rename handoff on the user's word.

## Roleplay and Litopys
- Roleplay never updates from ProjectChrysalis again: it lives in `MolfarWav/Molfar.Vertep-Roleplay` (fork of Roleplay-Chrysalis). Code on disk: `data/users/<name>/apps/roleplay` (desktop `molfarwav2`); no separate checkout; assembled in a scratch copy for releases.
- Engine: `FORKED_APPS`/`forkOf`/`adoptForkedApps` (`src/apps/store.ts`, run on boot) switch existing installs to the fork source and restamp the baseline's plugin manifests; `OFFICIAL_SOURCES` includes `https://github.com/MolfarWav/`. Plugin manifest `replaces: [ids]` keeps a sibling on disk but never runs it.
- Roleplay 4.19.1 (fork `8e273d2`): Litopys replaces Archivarius (reads the legacy `archivarius/*` until its first save); prompts are defaults in code (`DEFAULT_PROMPTS`, config keeps only changes, `PAST_DEFAULT_PROMPTS`, "Restore default prompts"). Checked live with a mock model and on DeepSeek V4.1 Flash with a Ukrainian scene.
- Roleplay 4.19.2 (2026-10-02): PUSHED to the fork's main (`5cf9cb7`, user allowed). The summary prompt is `DEFAULT_SUMMARY_PROMPT` in `plugins/engine/plugin.js` (settings keep only a changed prompt, `PAST_DEFAULT_SUMMARY_PROMPTS`, route `GET settings/summary-prompt`, Reset clears), summary and memory-extract prompts rewritten and given language lines (checked on DeepSeek V4.1 Flash and Nemotron free with a Ukrainian scene), image prompt says it stays English, `test/rp-prompts.test.ts`. Browser-checked in a throwaway engine.
- Workspace work (apps, plugins, skills, memory) belongs to the built-in agent; for it write a copy-pasteable prompt (example: `.fork/handoff/v094/workspace-agent-task.md`).

## Open, known, not fixed
- Roleplay typecheck fails on one line, `src/components/extensions/plugin-panel.tsx:88` (Base UI Select `v` may be null; workspace code). Fix it only after both machines took 4.19.1, or the first update conflicts.
- Workspace `data/_debug/` still exists on the desktop.
- 13 engine tests fail on Windows (shell, 0600 modes, self-update) and on main too.
- Fixing a syntax error may not hot-apply (`runtime.ts` `apply` re-runs only modules that were live); a guess from reading, untested. The runtime part of the deleted-module fix is not checked in a browser.
- Not tested on Windows: the profile import's folder swap (fails safe on locked files).
- The workspace has no backup off the user's disk (no remote).

## Traps
- Bun: session containers ship 1.3.14, the project needs 1.4.0 (`npm i -g bun@1.4.0`).
- `/v1/models` without `?all=1` returns only the shown models.
- The app bridge allowlist exists twice (`appBridgeAllows` in `app.ts`, `client/public/app-bridge-host.js`); new shell-only routes need no change there, but go into the lists in `test/security.test.ts` and `test/malicious-plugin.test.ts`.
- A session's system prompt is cached per agent instance: anything that changes it must `evictAgents` or change the docs/project stamp.
- The workspace AGENTS.md is overwritten on boot when the engine's marker version is newer (a user's edited copy keeps its text only through the digest).
- Browser checks: skill `browser-check` (`.claude/skills/browser-check/`). Real model runs need a mock OpenAI-compatible server (the skill has one).
- Launcher: edit `Molfar-Vertep.bat` as ASCII with CRLF line endings (`.gitattributes` has `*.bat -text`); `shift` moves `%0`; no paths inside `( )` blocks (a `)` in a folder name ends the block); test with a separate `LOCALAPPDATA` and a pre-made `shortcut-asked` marker, or the test puts a shortcut on the real desktop. The laptop's `D:\ROLEPlay\Chrysalis.bat` is an old external copy (newest `claude/*`); an untracked `start-chrysalis.bat` in the desktop repo root is an old copy too.
- Known Windows-only test failures (13, 2026-10-02): file mode 0600 (credential relocation x3, home flow), sandbox shell prelude git, app foundation source watcher, S5 session id path separators, installing a release x6 (`tar`). CI on Linux is the reference.
- `browser-check` `pw.mjs` finds only Linux Chromium and `stop.sh` kills Git Bash PIDs, not the Windows ones: on Windows the subagents drove the local Chrome with `playwright-core` themselves. Worth fixing.
- Tags are pushed by the user from a terminal (the session proxy cannot push tags); `release.yml` creates the GitHub release itself (title "Molfar.Vertep X.Y.Z", body from `.fork/release-notes/X.Y.Z.md`, Docker image to ghcr.io/molfarwav). Release assets keep upstream's `Chrysalis-*` names (`self-update.ts` matches them).
- `APP_API_VERSION` (1.0.2, `src/install.ts`): what app `engine` ranges are checked against; raise it only when an upstream merge changes the app contract.

## Closed with the user: do not reopen
- UI redesign: designed by Hermes; the brief is queued (handoff 4), do not start it before the user says so.
- Release 0.1.0 title on GitHub reads "Molfar.Vertep 0.1.0"; update checks read `tag_name`.
- Delegation rule (Opus/Fable orchestrate, other models execute) is in `CLAUDE.md` and `~/.claude/CLAUDE.md`. `ask-model` is on the desktop only; `adaptive-agent` is a Claude Code skill pair, not for Hermes.
- Launcher: one `.bat`, source mode, update channel = latest release tag, `dev` = newest `claude/*`. Versions: significant = minor, patch = patch.
