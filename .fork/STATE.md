# Molfar Vertep: project state

Fork of Chrysalis Engine; repo MolfarWav/Molfar.Vertep. Current as of 2026-10-11.
Standing rules: `CLAUDE.md`. The queue of work and how to start a session: `.fork/handoff/START.md`.
History: per release the CHANGELOG, `.fork/release-notes/`, and git history (the long logs that
used to live here and the finished handoffs were removed on 2026-10-10; `git log -- .fork` finds them).

## 0.9.7: RELEASED 2026-10-11 (tag v0.9.7 pushed on the user's word, release built with 6 assets; Roleplay 4.32.0 on the fork main `fa15553`)
The prompt inspector with sources: apps send a host-only `promptSources` (`src/prompt-sources.ts`: sanitize,
hook diff, locate), hook inserts are labeled for any app, Molfar's own prompt by section (byte-identical text),
a sources table + marks + "Left out" + choices on Molfar's page and in Roleplay's Prompt peek. Roleplay labels
every part in `assemble()`; drafts by external models (Kimi K2.7 Code, DeepSeek V4 Pro), reviewed and fixed;
peek port and browser check by a Sonnet subagent. Live test by the user: works; fixed after it: long system
prompts clipped at 20k hid late inserts (now 200k/50k), the view slid sideways (min-w-0 on the params rows).
Speed (a Discord player's phone timeouts): lorebook keys by indexOf (1000 entries 10+ s -> 0.6 s), macros and
regex scripts once per pass (400 messages with 150 scripts 3.3 s -> 1.3 s); bench in `.fork/bench/`.
Plurals: `t()` reads `{n|one|other}` by `Intl.PluralRules`; the i18n placeholder test works again.
Plan and UI spec were in `.fork/handoff/inspector-sources/` (git history).
The Discord player's timeouts turned out to be a Roleplay that had not finished building on their phone
(2026-10-11); the speed work stays (measured, and it removed real 10 s cases). CLOSED.
Android update 0.9.2 -> 0.9.7 (2026-10-11, user's Xiaomi): the in-app update was stopped by Play Protect ("never
checked apps from this developer", "Install anyway" not tappable); OK closed it silently (the session reports
ABORTED). Same APK downloaded from GitHub in the browser installed fine. MERGED into main (PR 3, `5f7fed7`):
ABORTED now shows "download in the browser"; shipped in 0.9.8 (it changes the installed app, so it helps from the
update after that). Not yet seen on a real phone. For good: Android developer verification (user's Google account).
CI lint on main was red from the `.fork/ui-assets` HTML mockups (3 duplicate CSS properties): `.fork/**/*.html`
is out of the lint now (`878c0e2`); main CI green again. On Windows, a local `bun run test` fails the 0600 and
`tar` tests (Windows-only, CI on Linux passes); `client-agent` needs its own `bun install` in a fresh worktree.

## 0.9.8: RELEASED 2026-10-11 (tag v0.9.8 on `70bc6c3`, release built with 6 assets; Roleplay 4.33.0 on the fork main `6be41bb`)
The card in fields (Profile tab, section switches, Structure it / Fill empty / Read from picture, the persona's
form and five questions, PNG/CHARX/JSON export), the vision model setting (`model-vision.json`, `GET/PUT
/v1/models/vision`, pictures in plugin llm requests), and the Molfar agent track (PRs 6, 7, 9: tools, run budget,
the new agent page; `.fork/handoff/molfar-agent/HANDOFF.md`). The user tested the card editor before the tag.
1.0.0 (user, 2026-10-11, revised the same evening): group chats, not the agent batch; 0.9.8 stays as released, agent included.
0.9.8's notes miss the agent page's colour pass and the "M" avatar fallback; the user may add them to the GitHub
release text by hand. Card editor leftovers: `.fork/handoff/card-editor/PLAN.md` (rewritten as a short "later" list).
The user's workspace copies of `edit-large-card`: `.fork/handoff/card-editor/workspace-agent-task.md`.

## 0.9.9: RELEASED 2026-10-11 (tag v0.9.9 on `24ffcec`; Roleplay 4.34.0 on the fork main `d3fa432`)
The user asked for "0.9.8.1"; the launcher and release.yml accept only vX.Y.Z, so it is 0.9.9.
Prompt restore audit: every prompt a user can edit has a way back to its default. Engine: Molfar's instructions,
workspace AGENTS.md, built-in skills already had one. Roleplay 4.34.0: utility prompts in editable preset copies got
a per-field Restore; Litopys and dashboard prompts restore one by one. Left on purpose: a copy's Main Prompt (its
"default" is its source preset, which a copy does not record).
"App settings live in the apps": Litopys settings open from a Library gear (Settings > Memory points there), the
dashboard's in-chat settings got note age + soul/nudge/fast prompts and a gear before the first build, the Tools
panels of both plugins are gone (no `uiPanel` export). "Open dashboard" sits at the top of the strip.
README (3 languages): download and Discord badges, profile.png and persona.png rows, "Work in progress" removed.

## 1.0.0: PREPARED 2026-10-12 (main fast-forwarded; the tag v1.0.0 is the user's to push). Group chats ship as Roleplay 4.35.0 (pushed to the fork's main on the user's word); the engine is unchanged from 0.9.11. Still open for groups: scene generation, the Chats page group part, the Characters type filter, small-model prompt tweaks, a workspace-agent task for the edit-large-card skill copy, a darker palette yellow on light themes.

## 1.0.1: PREPARED 2026-10-12 (main fast-forwarded; the tag v1.0.1 is the user's to push). Dashboard on local thinking models + the bigger event vocabulary, both in Roleplay 4.36.0 (pushed to the fork's main on the user's word). Local `bun run test`: 2 edge-tts tests fail in the cloud sandbox (live network 403), unrelated.
Reddit report: local Fenrir-X-26B-A4B (Gemma 4 finetune), default preset; the dashboard flooded the endpoint and came back
empty with cut-off thinking; Russian cards answered in English. Not the 0.9.10 Soji fix (that one threw away a finished
reply on a stream with no finish_reason; here the model spends the whole limit thinking and writes no answer). Fixed in
the Roleplay `relations` plugin: sensor and soul rating calls take the chat preset's reasoning level, thinking budget and
tags (a budget adds to the reply limit); an all-thinking answer names the cause; an inline `<think>` block before the JSON
is skipped; a bulk card import no longer rates every card (one card still is); the insert and the fast note say the reply
stays in the story's language. Inferred, not verified: a local OpenAI-compatible model the engine does not know as a
reasoning model gets no thinking fields at all, so on such a server only the server's own settings bound the thinking.
Engine part (same day, the user's word: "if not too big"): a chat completions connection has a "The models think (local
server)" switch in Settings (Add and Edit; `ConnectionDef.thinking`, `templateThinking` in `src/providers/custom.ts`).
On: every model of the connection counts as thinking and gets `chat_template_kwargs.enable_thinking` (true when the
preset asks for reasoning, false on Off). No budget field is sent: which per-request budget field llama.cpp reads is
unknown here. Tested against a fake server (`test/custom-template-thinking.test.ts`), not against a real llama.cpp.
Browser-checked (dark/light 1280, light 390). Text completion connections are untouched.

## UX audit backlog (2026-10-12; user: fix it bit by bit, together with the next releases)
Five external vision models reviewed 136 screenshots (shell, agent page, Roleplay 4.37.0; 1280/390; all
themes) against `ux-review`; findings checked against the code, wrong ones dropped. The document (Ukrainian,
ranked by impact/effort, exact screens and files) is NOT in the repo: desktop
`E:\Claude\Chrysalis-Engine\data\ux-audit\UX-AUDIT.md` (gitignored `data/`; screenshots in `screens/`, raw
reports in `reports/`), also in the project files `/mnt/project-files/ux-audit/`. The laptop has no copy; the
user copies it when needed. Take items into releases as the user picks; mark them done in the document.
Top items: connection delete has no confirm (`client/src/settings.tsx` ~1586); dashboard errors show "sensor reply
was not JSON" to users (`plugins/relations/plugin.js` ~2744); agent page "Full" is the permission mode with no
hint (`client-agent/src/Header.tsx` ~160); Roleplay Home "no model" chip did nothing in the test run and is hidden
on phones (`home-view.tsx`); desktop Settings dialog has no close button; Groups tab header says "Characters 0";
stock preset shows two notices and two copy buttons; tab rows overflow on phones (Tools, card editor, preset
editor); jargon without hints (Advanced tab, lorebooks, personas, Library/Litopys, Shortcuts).

## UX rule for UI work (2026-10-12; engine merged into main, Roleplay 4.37.0 on the fork's main `97b7c3b`, both on the user's word)
The user's rule: every UI change is judged first by how easily a user finds, understands and uses it, desktop and phone.
Skill `.claude/skills/ux-review/` (checklist on real components, tokens and breakpoints + a walk-through), a CLAUDE.md
rule and "done means" line, a "Usability" part in the built-in `app-authoring` skill (digests updated), and a pointer
in the Roleplay fork's AGENTS.md (same branch name there).
Round 2 (same day, same branches): `ux-review` is also a built-in skill for Molfar (`builtin-skills/ux-review`,
`app-authoring` and `finish-change` point to it; the small-model prompt stays under 3.7k). Roleplay 4.37.0: Characters/Groups tabs with a violet group colour (`--group` token, also group tiles and group
chats in the Chats list); FRANKENX Prose language is a pick of 14 languages + "Same as my messages" (migration in
`onAppUpdate` for presets that still have the text field); talkativeness: a card's own value, else (missing or the
usual 0.5) a word-list guess from its text, shown in the group editor (`src/lib/talkativeness.ts` mirrors the engine
plugin, test compares); a profile written without `compiled` is compiled on the app's next load, and Molfar's card
skills write profile fields. Queued: group scene generation (START.md 1c). Gaps found: no shared tap-friendly info-popover component in
the shell or Roleplay (hints are inline text; `title=` tooltips do nothing on phones); `size-8` icon buttons are 32 px.

## Dashboard event vocabulary, bigger (2026-10-11, in Roleplay 4.36.0 with the thinking fix)
19 new events in `EVENT_ROWS` (`plugins/relations/plugin.js`), 3 meanings widened (protected_her, protected_her_standing,
insult); `trust.shared_secret`-style ids count. Draft by an external model, reviewed and cut. Measured on 72 scenes
(uk/ru/en, `/mnt/project-files/dashboard-vocab/`): DeepSeek V4.1 Flash 39 -> 2-6 turns with no usable event; Gemma 4
26B A4B improves but swings between runs and often invents ids. +~300 tokens on the sensor prompt. Not yet: what lands
in `other` on the user's real chats (debug `unknownEvents`).

## 0.9.11: RELEASED 2026-10-11 (tag v0.9.11 pushed by the user). Fix: with no model picked, Molfar runs the first shown model, not the catalog's first (OpenRouter "~anthropic/claude-fable-latest").

## 0.9.10: RELEASED 2026-10-11 (tag v0.9.10 pushed by the user)
Two Discord fixes, engine only (Roleplay unchanged at 4.34.0): the agent model pick and the custom stream end, below.

## Agent model pick: no quiet swap (2026-10-11, in 0.9.10)
A Discord player picked Kimi K2.5 for Molfar and was billed for a Claude model. `UserAgent.create` fell through
request model -> project -> user default -> instance default -> the alphabetically first model whenever a named one
was missing (the cause for that player is inferred, not seen). Now the first named model must exist, else a clear
error (503), like `models.ts` resolveModel; the dynamic catalogs refresh before the pick. Tests in
`test/agent-memory.test.ts`. Not checked in a browser: how the agent page shows that error.

## Custom connections: a stream without finish_reason keeps its reply (2026-10-11, in 0.9.10)
A Discord player on Chub's Soji (`https://inference.chub.ai/soji/v1`, custom OpenAI-compatible) saw replies vanish
with "Stream ended without finish_reason". pi-ai throws when `compat.supportsFinishReason` is on and the stream ends
without one; custom openai-completions models now carry `supportsFinishReason: false` (`src/providers/custom.ts`
toModel), so the stream end counts as done and a finish_reason that comes is still read. Reproduced and covered in
`test/custom-finish-reason.test.ts`; not tried against Soji itself (no key). Trade-off: a stream cut mid-way by the
network now reads as a finished short reply on custom endpoints.

## Next: 1.0.0 = group chats (user, 2026-10-11)
Looked into live: groups work in the engine, but a group cannot be deleted (wrong route), opens in the card
editor where edits are dropped, and has no UI for members. Plan: `.fork/handoff/group-chats/PLAN.md`. Steps 1-2 done on the Roleplay branch (not released); step 3 = the narrator mode.
1.0.1 = the phone version; the agent batch (3.7, 2.5) comes after.

## Repos (checked 2026-10-11, after 0.9.8)
- Engine: every `claude/*` branch except `claude/upstream-context-fixes` is fully in main (0 commits ahead):
  `android-update-fallback`, `project-thread-c3878l`, `-eed1tv`, `-mqq0gh`, `-ukmmm7`, `-a2fc82`, `v098-card`.
  `claude/upstream-context-fixes` stays (the open upstream PR, CLAUDE.md).
- Roleplay fork: `claude/v098-card` and `quick-fixes` are fully in main.
- The session's proxy cannot delete remote branches: the user deletes the merged ones on GitHub.

## Open, from 0.9.4-0.9.6
- Presets: "Make default" still moves chats that rode the old default (store behavior). The studio bag hole and
  the "Use in this chat" / "Make default" split shipped in Roleplay 4.33.0.
- One first reply on NanoGPT GLM 5.2 thinking carried the preset's planning as plain text (no think tags);
  the user chose to leave it.
- Lesson from 0.9.6: after copying Roleplay files into a workspace, check the app's manifest `source.head` and
  re-verify the files after the first engine start (an app update can merge the released versions back).
- Plans for later: the queue in START.md.

## Released (details: CHANGELOG, `.fork/release-notes/`, git history)
Tags are pushed by the user; `release.yml` builds the archives, the APK and the Docker image.
- 0.9.8 (2026-10-11; Roleplay 4.33.0): the card in fields, one vision model for apps, Molfar's new page, run
  budget and four new tools, the Android update fallback.
- 0.9.7 (2026-10-11; Roleplay 4.32.0): where each part of the prompt comes from (inspector and Prompt peek),
  Molfar's own prompt labeled, fast sends with big lorebooks and preset regex, plurals.
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
- Workspace `data/_debug/` still exists on the desktop.
- 12 engine tests fail on Windows (shell, 0600 modes, self-update, the source watcher) and on main too.
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
- `browser-check` on Windows: `pw.mjs` finds the installed Chrome or Edge; `stop.sh` also stops what listens on the engine and mock ports (taskkill), since killing the Git Bash PID can leave bun.exe running (fixed 2026-10-11).
- Tags are pushed by the user from a terminal (the session proxy cannot push tags); `release.yml` creates the GitHub release itself (title "Molfar.Vertep X.Y.Z", body from `.fork/release-notes/X.Y.Z.md`, Docker image to ghcr.io/molfarwav). Release assets keep upstream's `Chrysalis-*` names (`self-update.ts` matches them).
- `APP_API_VERSION` (1.0.2, `src/install.ts`): what app `engine` ranges are checked against; raise it only when an upstream merge changes the app contract.

## Closed with the user: do not reopen
- UI redesign: designed by Hermes; the brief is queued (handoff 4), do not start it before the user says so.
- Release 0.1.0 title on GitHub reads "Molfar.Vertep 0.1.0"; update checks read `tag_name`.
- Delegation rule (Opus/Fable orchestrate, other models execute) is in `CLAUDE.md` and `~/.claude/CLAUDE.md`. `ask-model`: the personal copy on the desktop (`~/.claude/skills/ask-model`, keys in its `keys.env`) and, since 2026-10-11, a repo copy `.claude/skills/ask-model` for the laptop and cloud (keys from env; in the cloud also the hosts in Allowed domains, set by the user in the project's cloud environment); `adaptive-agent` is a Claude Code skill pair, not for Hermes.
- Launcher: one `.bat`, source mode, update channel = latest release tag, `dev` = newest `claude/*`. Versions: significant = minor, patch = patch.
