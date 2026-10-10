# Molfar Vertep: project state

Fork of Chrysalis Engine; repo MolfarWav/Molfar.Vertep. Current as of 2026-10-10.
Standing rules: `CLAUDE.md`. The queue of work and how to start a session: `.fork/handoff/START.md`.
History: per release the CHANGELOG, `.fork/release-notes/`, and git history (the long logs that
used to live here and the finished handoffs were removed on 2026-10-10; `git log -- .fork` finds them).

## 0.9.4, deeper lorebooks: RELEASED 2026-10-10 as Roleplay 4.29.0 (fork main `a30f811`, the user's word)
Plan, rounds and the user's decisions: `.fork/handoff/v094/PLAN.md`; UI spec `UI-SPEC.md`; Data Bank
research `data-bank.md`; built-in agent task for workspace skill copies `workspace-agent-task.md`.
Roleplay clone `.claude/worktrees/rp-memory`, branch `lore-v094` (pushed, not main), release commit
`1898de8` + fixes: word forms in Cyrillic keys (phrase match), why an entry fired / was held back,
real keyword test (`POST /wi-test`), minActivations, every dead field working (filters, format
template, strategy, include names, group scoring), honest positions with a fallback, links only on the
card (group members' books, exports with `character_book`, delete cleanup, backups), Data Bank scope /
word forms / budget, the editor's translation preview with a persistent Save toast, llm translation in
pieces. 847 tests. UI built and browser-checked by a Sonnet subagent, reviewed by the orchestrator.
No engine code changed in 0.9.4: no engine release needed.
2026-10-10: the branch's 35 changed files were copied into the E: workspace for the user's live test
(not `data/`, not the root manifest: the app update sets it).
Live test 2026-10-10 (user): translation preview OK, filters OK, always-on entries now reach the chat. Fixed after it: card saves PATCH only changed fields (a card with emotion images passed the 1 MB app request cap: every edit failed, `body too large`; `49cad3d`), unique new book names; UI `2ff043c`: search in the card's book picker, "With Molfar" (askMolfar, lorebook-craft), bulk By meaning + vector note. Copied to the E: workspace again. Small: "1 entries" / "1 global books" plurals.
Released: `lore-v094` fast-forwarded into the fork main on the user's word ("I trust it, merge and release"). No engine release (no engine code changed); the E: workspace has the code, its root manifest updates with the app update.
Seen, not fixed: `updateCharacter` rewrites the card's whole studio bag with defaults on the first edit.

## 0.9.5: RELEASED to main 2026-10-10 (engine `b58218a`, Roleplay 4.30.0 on the fork main `5279c38`); the tag v0.9.5 is the user's
Plan, order and the user's decisions: `.fork/handoff/v095/PLAN.md`. Engine branch `claude/v095` (worktree
`.claude/worktrees/v095`, from main `5cc7711`); Roleplay clone `.claude/worktrees/rp-memory`, branch `v095` from
fork main 4.29.0.
- 1 BUILT: engine `GET /v1/models/params/effective` takes the preset side (temperature, max_tokens, reasoning,
  thinkingBudget, paramsSource) and answers `applied` with `from` (`effectiveParams`, test); Roleplay
  `effective-params.tsx` in the header switch's model tab (draft by an external code model, rewritten).
- 4 BUILT: backstory along the chain, up to 3 chats back, one budget (shares 50/30/20, unused rolls to the
  nearer chats), oldest first, a fact once, insert record `chain`; tests in `rp-chat-links.test.ts`.
- 5 BUILT: named examples in the model recommendations (`EXAMPLES` in `client/src/model-panel.tsx`, refresh each
  release), "For example: {names}." in 14 locales.
- 7 BUILT (user picked A, B, C, D of `.fork/handoff/v095/settings-audit.md`): Samplers show the model's window
  and Chat-block max output read-only (`FromModel`); the app follows the shell's language until picked
  (`languageChosen`; engine bridge `chrysalisShell.locale()`); embeddings field -> link to Settings > Memory
  (`chrysalisShell.openSettingsTab`, tabs api/models/memory/backup); backup buttons say "Roleplay data" and
  point to the shell's Backup. Not browser-checked yet.
- 8 FIXED (likely cause): `attachBranches` keeps one entry per chat id (newChat/forkChat prepend after awaits
  while a hydrate may already hold the chat). Cause found by reading; the original warning was never reproduced.
- 9 SETTLED: the S5 builder test passes alone and in its file (1.6 s warm, 8.5 s on a cold first run): the 5 s
  timeout was the environment. Also fixed: the session path test on Windows (12 known Windows failures left).
- 12 FIXED: stat tile labels hyphenate in the UI language and wrap.
- 13 CLOSED by the user: Enter on the phone stays a new line.
- 10 NOT REPRODUCED (browser check, ~260 open/close cycles at 1280 and 390, mouse and touch, after loads,
  chat switches, hydrates and streaming): closed unless the user sees it.
- 11 FIXED `befc2c9`: reproduced on every live run (the picker was on the USER message, above Molfar's reply):
  `reloadCurrent` swapped live ids for `u<at>`/`a<at>` and assistant-ui keeps every id it saw. `keepShownIds`
  (client-agent/src/runs.ts) keeps the shown ids; edit/regenerate find the run by `runAt`.
- Browser check round 1 (Sonnet subagent): item 1 passed (dark/light/390, override); Home tiles not clipped but
  broke mid-word at 1280 -> rows in a narrow column; the preset's thinking budget was marked "model" -> own row.
  Round 2 PASSED (all 7): no picker after live runs, edit/regenerate on live messages, Home rows, the budget
  row, Samplers read-only numbers (and editable with override / unknown window), the shell's language and an
  in-app pick that sticks, Memory and Backup links. Note: shell links and locale need a trusted (official)
  install; a hand-copied app is untrusted and gets "not allowed".
- 3 CLOSED by the user 2026-10-10 (the provider list works on the phone now).
- 2 DONE 2026-10-10 (user, NanoGPT GLM 5.2 thinking): the reply's requestParams carried the model's Chat block,
  every value `from: model`. Seen in that run: one first reply had the preset's "seven checks" planning as plain
  reply text (17.7k chars, no think tags at all; the swipe was clean). Not a parser fault; the user chose to leave it.
- RELEASED: both branches fast-forwarded into main on the user's word. Left: the tag v0.9.5 (the user).
- Seen 2026-10-10: the Roleplay clone `rp-memory` was switched to a new branch `presets` (same commit as v095),
  probably by another session; left as it is.
## Next
- 0.9.5 above.
- Plans for later, the user picks the version: the card editor (`.fork/handoff/card-editor/PLAN.md`,
  incl. emotion images as full-size files), group chats (do not work for the user: 1.0.0), the Data
  Bank's embeddings and "document -> entries" (`v094/data-bank.md`), the queue in START.md.

## Released (details: CHANGELOG, `.fork/release-notes/`, git history)
Tags are pushed by the user; `release.yml` builds the archives, the APK and the Docker image.
- 0.9.3 (2026-10-10; Roleplay 4.28.0): six card storefronts, paste-a-link, cards up to 200 MB through
  the engine file route, RisuAI emotion images, card translation. The first v0.9.3 tag sat on the old
  main and release.yml failed: the user moves the tag to the release commit.
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
