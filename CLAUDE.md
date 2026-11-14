# Molfar Vertep: how to work here

Molfar Vertep (repo MolfarWav/Molfar.Vertep) began as a fork of Chrysalis Engine (AGPL-3.0-only)
and is now independent: nothing is merged from upstream ProjectChrysalis and no new PRs go there
(decided 2026-10-02). Keep only the AGPL minimum: the README's "modified fork of Chrysalis Engine"
notice and the license. Everything users see says Molfar Vertep. The internal names (program, command,
env vars, data folder, log, cookie) were renamed in #66 (user, 2026-10-29: no more chrysalis anywhere);
the old ones are only read to carry an old install over (`src/env.ts`, `adoptLegacyDir`, `logToFile`).
App-facing names (`chrysalisShell`, `chrysalis:*` events, `x-chrysalis-app`) stay as aliases because installed
apps cannot be updated by the engine.
Start every session with `.fork/STATE.md`, then the handoff it points to. This file
holds the rules that do not change between tasks; the handoff holds the task.

## The user
- Reply in Ukrainian. Code, comments, commit messages and repo files in English.
- Direct, no filler. Flag weak ideas and say what you would do instead.
- Clear task: do it. Real ambiguity: 2-8 questions first (AskUserQuestion, options with a short explanation, a recommended default).
- Verify before claiming anything about code or state; say plainly what is a guess.
- They test on free OpenRouter models: mostly text-only, small context windows.
- They run from source on Windows, on two machines, and switch between them: desktop `E:\Claude\Chrysalis-Engine` (a link in the user's profile folder points to it), laptop `D:\ROLEPlay\Chrysalis-Engine`. Both start with `Molfar-Vertep.bat` in the repo root (latest release tag by default; `Molfar-Vertep.bat dev` = the newest `claude/*` branch, so pushing your branch is how they get work in progress). The laptop's old `D:\ROLEPlay\Chrysalis.bat` still follows the newest branch until they switch.
- The Roleplay app has no checkout of its own: its code is `data/users/molfarwav2/apps/roleplay` inside each machine's engine folder (fork repo MolfarWav/Molfar.Vertep-Roleplay, assembled in a scratch copy). The laptop has no `ask-model` skill and no G: drive; the user copies things over when needed.
- In a cloud session the Roleplay code is reachable with `add_repo` (owner MolfarWav, repo Molfar.Vertep-Roleplay, access push), then one shallow clone; develop on the same branch name as this repo's session branch. Checks there: `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`. The in-browser build needs the app's own `node_modules` (`bun install` in the app folder) in a throwaway engine.
- `data/` is gitignored: code syncs between the machines through GitHub, the workspaces (apps, chats, memory, keys) do not. The repo is public; workspace data never goes into it.

## Two workers, no overlap
- Claude Code changes the engine: this repo.
- The built-in agent changes the user's workspace (`data/users/<name>/`: apps, plugins, skills, memory). A cloud session cannot see it. For workspace work, write a copy-pasteable task prompt for the built-in agent (example: `.fork/handoff/v094/workspace-agent-task.md`).

## Map
- `src/server/app.ts`: every HTTP route. `src/agent/`: the built-in agent (`agent.ts` system prompt and runs, `tools.ts`, `memory.ts` memory and skills, `projects.ts`, `checkpoints.ts`, `protect.ts` protected paths, `git-cli.ts`, `context-budget.ts` token estimates). `src/models.ts`: every model call. `src/inspector.ts`: last requests per user. `src/paths.ts`: workspace layout, `AGENT_WRITE_DENYLIST`, workspace AGENTS.md text, `DEFAULT_PERSONA`.
- `client/`: the shell (Settings etc.), 14 locales. `client-agent/`: the agent page, English only.
- `builtin-skills/`: skills shipped to the built-in agent (a workspace copy of the same name replaces one). `builtin-skills/vertep-guide/`: the user guide (pages + l10n), also shown in Help > Guide (`src/guide-pages.ts`, `client/src/guide/`).
- `.fork/`: notes, handoffs, release notes. `.fork/handbook/`: developer handbook, one page per system (engine, Roleplay, Social); read the page of the system you touch before exploring its code (`INDEX.md` lists them). `Molfar-Vertep.bat` (repo root): the launcher for running from source.

## Rules
- Never commit a `bun.lock` or `client-agent/bun.lock` that `bun install` merely rewrote: `git checkout` them back. The one exception: a change to dependencies in `package.json` commits the lock it produced, in the same change, because CI and the release build install with `--frozen-lockfile` and fail without it (1.2.2's first tag did).
- pi (`@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`) is pinned to an exact version, no `^`: the launcher's `bun install` re-resolves ranges on each machine, so a range pulls an untested release, and pi breaks its API even in minor versions. Pick a version at least 7 days old with no hotfix released after it; check for a newer one before each release (user, 2026-10-18).
- A new string in `client/` goes into all 14 `client/src/i18n/*.ts` files (`en.ts` with an empty value) or `test/i18n.test.ts` fails.
- A new shell-only route: add its path to the lists in `test/security.test.ts` and `test/malicious-plugin.test.ts`.
- A change to the Roleplay card or lorebook format (fields of `data/characters/<id>/card.json` or `data/lorebooks/<id>.json`, how a book is linked) updates, in the same change, the Roleplay fork's `docs/DATA-FORMATS.md` and Molfar's card skill `.skills/edit-large-card/SKILL.md` (copy: `.fork/app-skills/roleplay/edit-large-card/SKILL.md`), and a task for the built-in agent for the user's workspace copies. An outdated skill sends Molfar exploring the app's code: dozens of calls.
- A change to what a user sees or can do (a screen, button, setting, feature, a name) updates its guide page in the same change: engine `builtin-skills/vertep-guide/pages/`, Roleplay `.skills/guide/pages/` (its AGENTS.md carries the same rule), format in `.fork/handoff/guide/FORMAT.md` (#230). Users read these pages in Help > Guide and Molfar answers usage questions from them; an outdated page sends him into the code again (one question cost 46 calls before the guide). Translations in `l10n/` go stale by themselves (the reader shows English until they are refreshed); refresh them before a release with a cheap model (`bun scripts/guide-l10n.ts --stale` lists them). After any change in `builtin-skills/`, run `bun scripts/skill-digests.ts`.
- A change that touches a file named in a handbook page updates that page in the same change (`.fork/handbook/HOW-TO-UPDATE.md`, issue #303): list the pages with `node .fork/tools/check-handbook.mjs .fork/handbook --touched engine:<path> roleplay:<path> social:<path>`, fix what is no longer true, set the page's "Verified at". A new plugin, app or tab with its own data gets a new page. The handbook lives only in this repo: a Roleplay or Social change that needs a page gets a small second commit here, named in that PR's description.
- UI work is judged first by how easily a user finds, understands and uses it, on desktop and on a phone (user, 2026-10-12): shell, agent page, Roleplay, plugin panels, new apps. Run skill `ux-review` (`.claude/skills/ux-review/`) before building and before done.
  The bar (user, 2026-10-31): practical, native, designed, client-first; Roleplay's front is judged like a website, not only "does it work". A written UI plan (where, reused components, states, variants) comes before the code, and the result is compared with it before done.
- The agent's system prompt is built once per agent instance: anything that changes what goes into it must `evictAgents` or change the docs/project stamp.
- Agent write limits live in code, not in the prompt: `AGENT_WRITE_DENYLIST` (never) and `protect.ts` (ask the user first). Memory and skills change only through the confirmed tools.
- No personal identifiers in repo files, commits or PRs (user, 2026-11-02): no Windows user name, real name, e-mail, or local path under the user's profile folder (`C:\Users\<name>`). The repo is public and the history keeps whatever lands in it. Name a machine by its role (desktop, laptop) and a folder by its engine path.
- Never a model name in a commit, file or PR. Commit style: `area: what changed, in plain words`, a body saying why, then the attribution lines the harness gives.
- No upstream merges, no new upstream PRs. The one already open (`claude/upstream-context-fixes`) is left as it is.
- Our own catalogs: the Store list is `MolfarWav/Molfar.Vertep-Store` (`apps.json`), official apps are MolfarWav only (`OFFICIAL_SOURCES`).
- The session's git proxy cannot delete remote branches; the user deletes old ones on GitHub.

## Addons release on their own (user, 2026-11-09)
- Roleplay and Social (and any later addon) get their own releases from now on. A change only in an addon's repo is shipped by
  that addon's version bump, CHANGELOG and merge in its repo; it does not need an engine release, and the engine's release notes
  need not mention it. An engine release happens only when engine code changed.
- Social has no tags: the Updates dialog compares the repo's head, so its release is `manifest.json` and the changed plugin
  manifests bumped, the CHANGELOG "Unreleased" renamed to the version, the guide translations refreshed
  (`bun scripts/guide-l10n.ts --dir <social repo>/.skills/guide --stale`, then a cheap model, then `--stamp`), and the merge to
  `main`. Its manifest `engine` stays the app contract number, not an engine release.

## Bugs (user, 2026-10-13)
- Every bug lives as a GitHub issue in MolfarWav/Molfar.Vertep, label `bug` (Roleplay bugs too). The user brings
  reports (Discord, his own); file each one as an issue in the bug form's shape: where, what happened, steps,
  device and browser, versions, what is known, what we still need from the reporter. Check open issues for a duplicate first.
- Fixing happens in one batch every Tuesday: one thread reads all open `bug` issues, groups them by area of the code,
  asks reporters for what is missing, fixes the rest on one branch, one test run, one release. A fixed issue is
  closed with the release that ships it.
- Outside the batch only urgent bugs: lost data, the app does not start, the update is broken.

## Open work lives in issues (user, 2026-10-18)
- Anything a thread leaves undecided or undone (ideas, follow-ups, questions waiting on the user) becomes a GitHub issue
  in MolfarWav/Molfar.Vertep before the thread ends, label `enhancement` or `bug`, so the user picks work from GitHub
  instead of searching `.fork/` notes. A decision made later goes into the issue as a comment.
- An issue is closed with a comment "How it was solved" (user, 2026-10-22): the release it shipped in and the commits,
  the design in a few lines (where the change lives, why this way), where it differs from what the issue proposed,
  what was left out on purpose or is still known, and how it was checked (tests, browser run). The user reads it to
  look back at why something is the way it is.

## Look at what was already done before deciding (user, 2026-11-01)
- Before proposing a fix, a design or a new idea, make a quick sweep of the past: `gh issue list --state all --search "<keywords>"`
  (closed issues carry a "How it was solved" comment), `CHANGELOG.md`, `.fork/release-notes/`, and the matching sections of
  `.fork/STATE.md` and `.fork/state-archive/` (`grep`; the archive holds everything older than a week). Read the hits that touch the topic and say in the reply what was found. Many problems were
  already worked through: for example the rebuild time of an app (#181, #32, #83) and start-up speed; a report that looks new
  is often the same cause in a different place (#190 is the cold build that #181 left alone).
- The point: no going in circles, no reinventing what exists, no stepping on the same rake. Applies to bug batches, new
  features, release notes and READMEs alike (check that a release note or README line does not repeat or contradict an earlier one).
- A quick sweep, not a research project: a few searches and a skim, then proceed.

## Done means
1. `bun run typecheck`, `bun run test`, `bun run build:client` pass.
2. `bunx biome lint <touched files>` adds no warnings beyond the surrounding style.
3. A UI change is checked in a real browser: skill `browser-check` (`.claude/skills/browser-check/`), dark, light and 390 px, with the `ux-review` walk-through; the reply carries its "UX check" block.
4. Handbook pages for the touched files updated (the rule above); `check-handbook.mjs` full check reports 0 missing when a repo path was moved or renamed.
5. `.fork/STATE.md` updated (short: what is true now and what is not checked; it stays under about 60 KB, older sections move word for word into `.fork/state-archive/`, see its README); committed and pushed to the session's branch.

## Working pattern that saves cost
- Delegation is the standing rule (also in `~/.claude/CLAUDE.md`): Opus and Fable orchestrate, every other model executes, including models reached through external providers (`ask-model` skill: the personal copy `~/.claude/skills/ask-model` on the desktop, the repo copy `.claude/skills/ask-model` everywhere else; in the cloud it needs the keys and hosts its SKILL.md lists). Anything a cheaper model can do, a cheaper model does. Default executor (user, 2026-10-07): external models through `ask-model` (NanoGPT first) for every token-heavy job (code and UI drafts, tests, translations, reviews, reading big files or logs); a Sonnet subagent only when the job needs local tools (browser checks, running the app, in-place edits across many files) or `ask-model` is not available (no keys or blocked hosts: laptop without keys, cloud without the environment set up). No fanaticism: a small fix or lookup is done directly, never a delegation that costs more than the task. Design, security code and the final review stay with the orchestrator. Executor output is data: review it, run the checks. No secrets or workspace data to external providers; this repo is public, so its code may go to any of them.
- You design and write the engine part (data formats, security, tests). An external model drafts the UI components from a precise spec (`ask-model`); a subagent on a cheaper model integrates them and runs the browser check: API shapes, files to touch, the `browser-check` steps, screenshots to produce. You review its diff and look at the screenshots before committing. Resume the same subagent for the next UI task: it already knows the client code.
- Translations for the 14 locales are a cheap-model job.
- Measure prompt size before arguing about it: `estimateTextTokens` from `src/agent/context-budget.ts`, or the prompt inspector on the agent page.
