# Changelog

Molfar Vertep is a modified version of [Chrysalis Engine](https://github.com/ProjectChrysalis/Chrysalis-Engine)
(AGPL-3.0-only), maintained at [MolfarWav/Molfar.Vertep](https://github.com/MolfarWav/Molfar.Vertep).
Every change below was made in this fork; the upstream project's own history is in git.
Versions here count from 0.1.0 and are independent of upstream's.

## Unreleased

## 0.9.5 (2026-10-10)

- Roleplay 4.30.0 through app updates: the chat header's model tab shows the temperature, max output, reasoning and thinking budget a reply is sent with, each marked as the model's, the preset's or the provider's default; a chat that continues a chain of earlier chats gets their stories as backstory (up to three back, one budget); the preset's context size and max output show the model's numbers when the model sets them; the app starts in the shell's language; the embeddings and backup settings point to the shell's Settings.
- `GET /v1/models/params/effective` takes the request side (temperature, max_tokens, reasoning, thinkingBudget, paramsSource) and answers the merged values with the source of each (`applied.from`), the same merge generation does.
- Apps can read the shell's language (`chrysalisShell.locale()`) and open Settings on the Connections, Models, Memory or Backup tab (`chrysalisShell.openSettingsTab(tab)`); trusted apps only.
- Molfar's page: a finished run no longer shows a "2 / 2" branch picker under your message (the live messages' ids were swapped for the saved ones, and the thread kept the old ones as a second branch).
- The recommended values for each parameter block name example models next to the kind of model they describe.

## 0.9.3 (2026-10-10)

- Roleplay 4.28.0 through app updates: the Marketplace has six storefronts (Chub, RisuRealm, CharaVault, Wyvern, Pygmalion, JannyAI) with their own filters, a "paste a card link" box, cards of any size up to 200 MB with their emotion images, translation of cards in the Marketplace and in the character editor (with "Restore original"), expression sprites that follow Ukrainian and Russian replies, and a floating sprite that folds and resizes.
- Apps can pull big files: `GET /v1/apps/:appId/file?url=` streams a remote file up to 200 MB with the image proxy's gate (https, default port, a host an app plugin declared with the network permission granted, every redirect re-checked), as opaque octet-stream. A plugin's own network answer is held in its sandbox (20 MB at most), too small for a card with an image pack.
- The app bridge hands a fetch answer over as bytes (a transferred ArrayBuffer) instead of base64 text, so a large download is not held three times; frames still read base64 from an older shell.
- The app image proxy takes images sent with no type or a generic one when their bytes are PNG, JPEG, GIF or WebP (RisuRealm's thumbnails showed as placeholders); anything else, SVG included, is still refused.

## 0.9.2 (2026-10-09)

- Models in one place: Settings' "API connections" and "Models" tabs are one tab, "Connections and models". One search over every model; under each connection its models, each with "show in the pickers", a star for the quick switch and its own settings.
- A model's settings: its context window and prices, and its parameters in blocks by who calls it: Chat (app replies and API callers: temperature, top P/K, min P, penalties, seed, max output, reasoning, thinking tags, custom parameters JSON, extra headers), Plugins (trackers, memory, translation: a short set), one plugin of your choice, and Molfar. A switched-off field is not sent. The model's values win over what a request carries unless the request asks otherwise (Roleplay's preset switch); stored in `model-params.json` (routes `GET/PUT /v1/models/params`, `GET /v1/models/params/effective`; credential and transport headers are refused; Molfar asks before writing the file). Each block has recommended values with a "fill in" button, and Molfar warns when a model's window is under 64k.
- Quick switch: starred models in your order, each with an optional name of its own (`model-favorites.json`, served with `GET /v1/models`, `PUT /v1/models/favorites`); Molfar's picker and the apps offer them first. Molfar's picker no longer has its own star for hiding models: that is chosen in Settings.
- Apps can open Settings on one model's panel (`chrysalisShell.openSettings(model)`, trusted apps).
- Roleplay 4.27.0 through app updates: models chosen in Settings and switched in the chat (a model per chat), the model's parameters first, chats that continue each other with the earlier story as backstory, Library portraits on the dashboard and in Soul, full-screen drawers.
- The add-connection screen shows a failed provider list with "Try again" instead of offering only the sign-ins (seen on Android).
- The reasoning level "min" from older presets now means "minimal" instead of switching reasoning off.

## 0.9.1 (2026-10-09)

- Roleplay 4.26.0 through app updates: four skills for Molfar (card-craft, card-import, lorebook-craft, preset-craft) built on one reference for card, lorebook and preset files (`docs/DATA-FORMATS.md`, kept current by a test), and the card's id with a copy button in the character editor.
- Molfar spends far fewer tokens and calls: the same card task went from 49 model calls and 1.5M input tokens (0.9.0) to 6–9 calls and 0.1–0.2M. How: `json_get` / `json_set` read and change single fields of a card or lorebook (missing objects are created, the file keeps its format, a JSON file is never left broken); `read_file` and an @-mention show a big JSON file (a card with its portrait) as its fields and sizes; `read_file` takes up to 8 paths and cuts files over 40k characters with a note; older steps and earlier tasks are folded to short notes before each call; the skills index lists app skills by name; app authoring moved into its skill and app tools appear when an app's code is touched; a busy provider (429, 5xx) is retried; sandbox traps that cost calls are gone (python3 follows `cd`, a `set -x` no longer leaks into later commands).
- Molfar's page: the "/" menu scrolls and groups commands and skills, searching their descriptions too; "@" finds characters, lorebooks and presets by name; quick-action chips above the composer start a card, lorebook, preset or import job with its skill; the chat column is wider (56rem); a new chat keeps the composer at the bottom; on a phone the model name has a row of its own; reasoning and tool calls start folded to one line that names the live step.
- Android: the APK is signed with the project's own key, so updates install over the app with its data kept (installs from 0.9.0 and earlier need one reinstall: back up, uninstall, install, restore). "Get update" downloads the APK itself, checks its size, hash, package and key, and hands it to Android's installer; a different key gets a plain explanation instead of "App not installed".
- Android: bash and the file tools work: the workspace guard compared real paths with a root reached through `/data/user/0`, so every file looked outside the workspace and the sandbox stayed empty.
- A profile restored from a backup installs its apps' packages at once (a backup carries no node_modules; Roleplay failed to build until a restart).
- An app update no longer fails with ENOENT on `dist.discard-…`: the old build is moved out of the app before it is deleted, and leftover aside folders are skipped by updates, backups and git.
- Release archives are named `Molfar-Vertep-<version>-<system>` (they were `Chrysalis-*` up to 0.9.0); self-update finds both, so older copies still update.
- README rewritten for people new to the project, with screenshots, GIFs of Molfar rebuilding the app, a pixel Molfar, a work-in-progress and vibe-coding note, what Molfar's skills, projects and memory are for, and Ukrainian and Russian translations (`README.uk.md`, `README.ru.md`); a social preview banner in `.github/assets/`.

## 0.9.0 (2026-10-08)

- Roleplay 4.25.0 through app updates, Memory v2: Litopys becomes each chat's one story memory (chapters per scene, facts with who knows them, arcs over older chapters), the messages it holds leave the prompt while one budgeted block of chapters and facts rides each reply, and the Library shows and edits it all (Overview with a timeline and character cards, Ledger with chapters, facts, proposals and activity, search over the original messages, rebuild from scratch). The built-in Memory moves into Litopys by itself.
- Settings has a Memory tab for matching by meaning (embeddings) that apps' memory and lorebooks use: a status line with a check, where the embeddings come from (Automatic, OpenRouter, or one custom connection), the model (OpenRouter's default is `qwen/qwen3-embedding-4b`) and, when needed, an OpenRouter key saved as the ordinary OpenRouter connection. Before, it took a hand-made custom connection.
- Embeddings via OpenRouter post only to OpenRouter's fixed embeddings address with its builtin connection's key; each vector records the model that made it, and plugins can read which model and connection they get, since vectors of different models do not compare.

## 0.8.1 (2026-10-06)

- Roleplay 4.24.0 through app updates: "Story, move" (a one-time nudge that makes the next reply move the story, from the dashboard's open threads), the dashboard's fast mode (the story reply carries the state report, no separate sensor call), the new chat look (book-page text, arched portraits, your turns offset right, scene headings, hover actions with a grouped More menu), the portrait menu Card / Soul / Dashboard, and no more echoed "Name:" at the start of replies.
- The Vertep logo replaces the old one everywhere: login and start screens, browser tabs, the launcher's desktop shortcut and the Android app icon.
- App builds and package installs are written to the engine log (output size, write failures, the install result, route errors), so a failing build on a phone can be traced.
- Subscription sign-ins (Claude Pro/Max, ChatGPT Plus/Pro, GitHub Copilot, OpenRouter, Kimi, SuperGrok, Radius) work in the release builds and the Android app: they failed with "Cannot find module" because the compiled engine did not carry the sign-in code; running from source was not affected.
- Apps' prompt hooks work again for imported apps: the grant step leaves out "hooks" (it needs no grant), but the hook collector asked for exactly that grant, so after an app update or a fresh install the Roleplay dashboard's insert into replies (and with it "Story, move" and the dashboard's fast mode) silently stopped reaching the model. A plugin that declares hooks now runs on its granted model access.
- Molfar no longer stops mid-sentence when the provider drops a tool call it could not parse: the half-written reply stays, Molfar is asked once to repeat the call with valid arguments, and if that fails too, to answer or ask its questions as plain text.
- Android app: a failed start now stays on screen with its reason instead of falling back to "Stopped", and the Logs dialog shows a launcher log (device ABIs, the engine binary, exit code or signal). The app is named Molfar Vertep, has the Vertep logo and Ukrainian texts, and its package id is now `io.github.molfarwav.vertep`: it installs as a new app beside an old Chrysalis one, so export a backup from the old app and import it in the new one. The APK file is now `Molfar-Vertep-<version>-android-arm64.apk`.
- Android app starts on Android 11 to 13: Bun's server made system calls these versions do not allow apps (close_range at startup), and Android killed it at once ("Start does nothing"). A small preloaded library now turns such calls into "not supported", so Bun uses its fallbacks. This also keeps the engine alive while it installs an app's packages (the trap in Bun's child process used to take the engine down with it).

## 0.8.0 (2026-10-05)

- Roleplay 4.23.0 through app updates: the dashboard updates right after each reply (edits and Continue re-read, a live line under the newest message), its own settings (sensor, event vocabulary, what the model sees, Tune with Molfar, the sensor prompt in blocks), the user's own notes with pinned/important/everyday tags, managed story threads with periodic checks, forms of address, start values from souls saved later, and fixes for cheap sensor models.
- Self-update also recognises release archives named `Molfar-Vertep-*`, so a later release can drop the old `Chrysalis-*` names without stranding this version.
- README: the project's story first, the technical details below.

## 0.7.0 (2026-10-04)

- Roleplay 4.22.0 through app updates: the relationship dashboard (sensor, attitudes, constellations, scene clock, threads, notebooks, a words-only prompt insert), the Soul tab on cards, the scene strip, wide view and phone sheet, and UI work made with Molfar (rail labels collapse, persona filter, preset-bound regex, grouped regex list and Tools tabs).
- Agent page: an app's draft for Molfar is no longer lost when a chat is already open.
- Launcher: `dev` mode takes the branch's commit when a git worktree holds the branch; `dev NAME` follows `claude/NAME`.
- README: the Molfar Vertep logo and a short tour of what is inside.

- App plugins: a route's model request can carry `turn` labels (op, chatId, speakerId, speakerName, targetId, swipe). The model never sees them; sibling `llmRequest` hooks get them as `ctx.turn`, so a hook knows who speaks and whether it is a new reply, a swipe, a continue or an impersonation.
- Models that cannot switch thinking off and say so in NanoGPT's words ("Invalid value for reasoning.effort ... none") get the lowest level they list, so plugins that name no thinking level (the dashboard sensor, Litopys) work with them.

## 0.6.1 (2026-10-03)

- Roleplay 4.21.1 (app update): on a computer, sections open as a drawer over the page again, as before 4.20.0; phones keep pages.

- **Apps install the packages they are missing**: when an app update adds a package and its install fails (offline, a Bun error), the app no longer stays broken with `Could not resolve` in the build. Opening the app installs what `package.json` lists but `node_modules` lacks (at most once every 10 minutes per app), and every start does the same, not only for apps with no `node_modules` at all.
- **Molfar's app changes can become everyone's default**: a new built-in skill, `publishable-changes`, tells Molfar how to change an official app (such as Roleplay) so the change can ship to all users: defaults in code, no personal data, the commit message as its description, `local:` for a tweak that stays yours. The maintainers publish such changes with `scripts/publish-app.ts`, which lists the app's code changes since its last update (never `data/` or Molfar's memory of the app) and carries chosen files into the app's repository.

## 0.6.0 (2026-10-02)

- **Apps can reach Molfar**: an official app may open Molfar on a new chat with a request typed in but unsent (`window.chrysalisShell.askMolfar`), list the installed apps (`apps()`) and switch to one (`openApp(id)`). Only trusted apps get it, only while their tab is on screen, at most one draft every 2 seconds, 4000 characters at most; an app can never send a message for you.
- **Profile import checks the version**: a profile backup now records that Molfar Vertep made it (`product` in `profile.json`), and a backup from a newer Molfar Vertep is refused before the preview ("update this one first"), so newer data never lands on an older engine. Backups made before 0.6.0, and upstream Chrysalis ones, import as before.
- Roleplay 4.21.0 (app update) uses it: a new Home with Continue story, Create, Ask Molfar, achievements, recent chats with persona and character filters and delete, and My apps.

## 0.5.0 (2026-10-02)

- **The Vertep look**: one 46 px top bar (eye logo and the VERTEP wordmark in Kurale, the tabs with an accent underline, the app's Split, Fullscreen, Plugins and Rebuild moved up from the second row, Updates and the account on the right); on phones the tabs become a segment control. Vertep (black, oxblood red accent, cyan primary buttons) is the default theme; a stored Dark or Light choice is kept.
- **Themes of your own**: the account menu lists Vertep, Dark, Light and every valid `themes/<id>.json` in the workspace (hex colours for known tokens, on a dark or light base). `GET /v1/themes` lists them and the refused files with the reason; it is shell-only. Molfar's page follows the shell's theme. New built-in skill `shell-theme`.
- Primary buttons use a separate `--c-cta` colour. Kurale (OFL) is self-hosted. The tabs have gaps between them (phones: separate chips).
- Roleplay 4.20.0 (app update): the Vertep theme, a labeled grouped navigation rail, sections as full pages (a drawer only over an open chat), Ukrainian navigation.

## 0.4.0 (2026-10-02)

- **The agent is Molfar now**: an old Carpathian molfar, kind and wise, who also knows today's code. He has a name and a face across the interface (Мольфар in Ukrainian and Russian), a light touch of character in conversation (a warm word, now and then a proverb from the mountains), and none of it in code, files or commit messages. The character lives in the default instructions, so you can soften or remove it in Settings; if you never edited them, you get it on the next start.
- **Reports are easier to scan**: Molfar opens each block with a marker (🔍 finding · 🔧 action · ✅ done · ⚠️ risk · ❓ question · 💡 idea · 🧹 cleanup · 📦 side note), and long reports get headings with the marker on both sides.
- Fixed: plugins were found in a different order on Windows and Linux, so which plugin answered a route first could differ between machines (and CI failed since 0.3.0). The order is the same everywhere now.

## 0.3.1 (2026-10-02)

- **One-file launcher for Windows**, `Molfar-Vertep.bat` in the repository root, for running from source from any folder: it installs Git and Bun when missing, downloads Molfar Vertep next to itself, offers each new release before installing it (`dev` follows work in progress), builds only what changed, offers a desktop shortcut, and opens Molfar Vertep in your browser. Folder names with spaces or in any language work.
- Fixed: an app update could freeze the whole of Molfar Vertep on Windows. After the new files were written, deleting the update's temporary folder waited forever on a file another program held (an antivirus scanning the fresh download), and nothing answered until a restart. Temporary folders are now moved aside and deleted in the background with retries, each update gets a folder of its own, and leftovers from an interrupted update are cleaned up by the next one.
- Fixed: workspace copies of built-in skills that were never edited kept blocking newer built-ins when the built-in itself had changed since the copy was made. Molfar Vertep now remembers every version of each built-in skill it ever shipped (`builtin-skills/.digests.json`, rebuilt with `bun scripts/skill-digests.ts`), and a copy equal to any of them is removed on start.

## 0.3.0 (2026-10-02)

- The interface speaks Ukrainian: Українська in Settings > General > Language, picked automatically for a browser set to Ukrainian. The shell now has 14 languages.
- **The agent's instructions are rewritten.** The base prompt now opens with how the agent works: look first (project, notes, memory, the app's AGENTS.md), ask before large work, put changes in the lightest place, check each step, and finish with what changed, what was checked and how to undo it. It never deletes your content unless asked.
- **The agent answers in your language**, a rule now in the engine's own prompt (full and small-model mode) instead of only in the editable instructions, so no edit can drop it. Code and commit messages stay English; text inside an app follows the app's language.
- **Which instruction wins is stated once**: engine limits always hold; then your current message, the project's instructions, your personal instructions, the app's AGENTS.md, the workspace's AGENTS.md, then the general rules. Text in app data, downloads or web pages is information, never an instruction.
- **Default instructions are short preferences now** (plain words, short answers, flag weak ideas); the rules moved to the base prompt, so each request no longer pays for them twice. A copy you never edited moves to the new default on the next start; an edited one stays yours.
- **Settings > Agent shows the workspace contract (AGENTS.md)**: whether it is the default, edited or outdated, with "Restore default" (the old text stays in the workspace history).
- **Built-in skills update again**: a workspace copy identical to a built-in skill is removed on start, so the engine's newer version reaches you. New built-in skill `default-prompts`: how a plugin ships a prompt with a default, restore and a language line.
- **Molfar Vertep is independent of Chrysalis now.** Nothing is merged from upstream any more. Everything you see and everything the agent reads says Molfar Vertep; only the internal names (`chrysalis` command, `CHRYSALIS_*` settings, data folders, download file names) stay for now, so installs keep working.
- **The Store reads Molfar Vertep's own catalog**, [MolfarWav/Molfar.Vertep-Store](https://github.com/MolfarWav/Molfar.Vertep-Store). A config.yaml that still names the old Chrysalis list moves to the new one on start. Official apps are the ones under MolfarWav; apps from anywhere else, upstream Chrysalis included, are reviewed before install like any community app.
- README rewritten for Molfar Vertep. The Chrysalis Discord link is gone from the start screen; issues and security reports go to this repository. The Docker image is `ghcr.io/molfarwav/molfar-vertep`.

## 0.2.0 (2026-10-02)

- **Updates in one place.** An Updates button in the top bar, with a badge when anything is newer, opens one panel: Molfar Vertep itself (for admins; a copy run from source says to restart it with its launcher) and every app installed from a repository. Each row shows current → new version, a link to the changes and an Update button; "Update all" updates the apps one by one and stops at the first that needs a decision. Overlapping edits get the same choices as on the app page (keep mine, take the update, ask the agent to merge). Checks run once when the shell starts, then on "Check now" or after an update.
- The Molfar Vertep logo in the top bar opens the start screen.
- Releases are built from a `vX.Y.Z` tag on main, titled "Molfar.Vertep X.Y.Z", with notes from `.fork/release-notes/`.
- The project is now called **Molfar Vertep**: the interface (all 13 languages), page titles, console messages, README and `package.json`. Internal names stay (the `chrysalis` command, data folders, `CHRYSALIS_*` variables, release file names), so existing installs keep their data and upstream fixes still merge. Strings about the Store's official apps still credit the Chrysalis maintainers, who make them.
- Update checks and `package.json` point to the renamed repository, MolfarWav/Molfar.Vertep.
- **Roleplay comes from Molfar Vertep's own fork**, [MolfarWav/Molfar.Vertep-Roleplay](https://github.com/MolfarWav/Molfar.Vertep-Roleplay), never from upstream again. The Store installs the fork, and an existing install switches its update source to the fork on the next start (code and data untouched; the next update merges the fork in, without conflicts over the plugins' source fields). Apps under MolfarWav count as official.
- **Archivarius is now Litopys and ships with Roleplay** (Roleplay 4.19.0 in the fork). It reads the old `data/archivarius/*` until its first save.
- A plugin manifest can say `"replaces": ["<sibling id>"]`: the sibling it names stays on disk but never runs (listed as off), so a renamed plugin and the old copy never both call the model.
- Fixed: since 0.1.0 every app update was refused as needing a newer engine. Apps state engine needs in upstream Chrysalis numbers (`>=1.0.0`), and they were checked against the fork's own 0.1.0. They are now checked against the upstream app contract this engine keeps (1.0.2).

## 0.1.0 (2026-10-01)

Based on upstream 1.0.2 plus its staging branch as of 2026-09-30 (@ mentions,
user commands in `commands/`, the CLI). Everything else is the fork's.

### The agent's context
- Runs stay inside the model's context window: the oldest context is trimmed first, the trimmed prefix stays stable for prompt caching, and output is never asked to exceed what the window has left. A provider's "too long" refusal is retried once with a deeper trim; no false overflows on errors without a body.
- Auto-compaction runs on the session's own model.
- **Small-model mode** (Settings > Agent: Auto / On / Off). Auto turns on for a window of 32k tokens or less, or an unknown one. The agent gets one compact system prompt, short tool descriptions and only the core tools: about 2.6k tokens before the first message instead of about 9k. Other tools (app, skills, shell, admin, MCP) appear from the next step when the work needs them, or through `tools_enable`. The plugin contract and UI rules live in the built-in skill `app-authoring`.
- For every model: no bash schema when the instance has no shell, a shorter `ask_user` description, and no duplicate workspace map when AGENTS.md already carries it.
- **Prompt inspector** on the agent page: the last 20 model requests per user (agent, apps, API) with per-message token estimates, tools size, output, usage and errors. No keys or headers are kept.

### Memory and skills
- Long-term memory per scope (global, each app, each free project), written only through `memory_propose` after the user confirms. A project's memory reaches the agent the first time it touches that app.
- **Topic files**: `MEMORY.md` is the core (always in the prompt, capped at 4000 characters for the agent); other entries live in `memory/<topic>.md` files listed by name and read on demand. `memory_propose` takes a topic and can move entries.
- **`memory_search`**: searches every memory file with Ukrainian and Russian word matching (inflections, apostrophe variants, stop words, whole words only).
- Memory panel on the agent page: topics as groups, move entries between core and topics, search.
- Skills: built-in skills ship with the engine (`builtin-skills/`: `app-authoring`, `finish-change`, `two-phase-llm`, `plugin-silent-failure`, `cyrillic-text-matching`, `skill-authoring`); a workspace copy of the same name replaces one. `skill_propose`, `skill_edit` (shown as a diff), extra files per skill, `skill_load {file}`. The user writes, edits and resets skills from the panel. Skills appear in the composer's `/` menu.

### Projects and chats
- Projects on the agent page: every app is a project, plus free projects in `projects/<name>/` with instructions, a default model and reference uploads (kept out of git).
- Move a chat between projects (menu or drag), save a reply into project files.
- What each chat has cost, summed over every model call.
- A reasoning-level switch beside the model picker.

### Safety nets
- **Checkpoints**: one is taken before a run's first change to an app; the agent can create, list and restore them (restore is confirmed and puts back code only, never `data/`). Undo under a run and on the app's project page.
- **Protected paths**: by default an app's `src/` and `index.html`, and always `persona.md`. The agent changes them only after the user allows it in a card, once per request; the shell, git restore/revert and git rm are held to the same rule. The list is editable in Settings > Agent.
- Default agent instructions, with "Restore default instructions" in Settings.

### Asking the user
- `ask_user` options carry a description and a recommended mark, allow several picks, and several questions fit in one card. Loose shapes from weak models are normalized.

### Models and settings
- Settings > Models: choose which models the pickers show (grouped by connection, searchable).
- Settings > Backup: the whole profile as one zip, with keys encrypted under a password; import replaces the profile after zipping the current one.

### Fixes
- The agent's emulated git accepts `add` (a no-op: there is no staging area) and `rm`, so `git add -A && git commit` in the shell commits deletions instead of stopping at `add`.
- The hot build drops a deleted file, directory or import instead of keeping it until a full rebuild: importers re-resolve, unreachable modules are pruned, and the page removes their styles.
- `onTick(ctx, host)` documented with its real signature in the plugin docs and the system prompt.
- Update checks follow this fork's releases, not upstream's.
