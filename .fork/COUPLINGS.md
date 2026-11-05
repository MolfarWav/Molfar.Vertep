# Couplings and traps (Molfar Vertep engine)

Purpose: this map names what is tied to what in the engine, which invariant must stay true, where it is enforced, and which test fails when it breaks. It is for a person or a session that changes one area and must not forget a link.
One entry per area. Each entry points to `CLAUDE.md`, `CHANGELOG.md` and the area's own docs, and writes down only what falls between them or is easy to forget.
A test that checks the pointers (paths and symbols named here must exist) is planned in #247; until it lands, check them by hand when you touch an entry.
Update the entry in the same change that touches the area.
Date: 2026-11-05.

### Agent system prompt is built once per instance
- **Touches:** `src/server/app.ts` (every route that changes an input of the prompt calls `evictAgents`); `src/agent/agent.ts` `instructionDocsStamp` (the stamp of the files that feed the prompt); `src/paths.ts` (workspace AGENTS.md text); the project stamp (`projects.projectStamp`, used in the same comparison).
- **Must stay true:** a change to anything that goes into the system prompt either evicts the cached agents of that user, or changes the stamp the cache compares. The stamp covers the size and mtime of `AGENTS.md`, `persona.md`, `notes/`, the active app's `AGENTS.md` and `data/README.md`, plus the project stamp and one settings flag (`appContractOnDemand`) written into the stamp itself.
- **Enforced in:** `src/server/app.ts` `evictAgents` (called from many routes); the comparison with `instructionDocsStamp(up)` in the same file; `src/agent/agent.ts` `instructionDocsStamp`.
- **Fails in:** `test/profiles.test.ts` and `test/app-contract-on-demand.test.ts` (both name the stamp). No test checks that each prompt-input route calls `evictAgents`.
- **Why / history:** a rule in `CLAUDE.md` (no issue number).
- **Trap:** the settings-change path in `app.ts` evicts unless every changed key is `guide` or `memory suggestions`. A new prompt input that is a setting, not a file, needs either an explicit part in the stamp (as `appContractOnDemand` has) or an eviction call. Otherwise the agent keeps the old prompt until the process restarts.

### Write denylist and protected paths
- **Touches:** `AGENT_WRITE_DENYLIST` (`src/paths.ts`, "never"); `src/agent/protect.ts` (`ALWAYS_PROTECTED`, `DEFAULT_PROTECTED_PATHS`, `protectedRefusal`, `allow`: "ask first"); the agent's file tools (`write_file`, the memory and skill proposals); app source paths `apps/*/src/**`.
- **Must stay true:** the denylist refuses in code, whatever the prompt says: `auth.json`, `mcp.json`, `settings.json`, `.git`, `assets-store`, `store`, and memory and skill paths (those change only through the confirmed tools). `protect.ts` asks the user first for `persona.md`, `model-params.json` and the default app source paths.
- **Enforced in:** `src/paths.ts` `AGENT_WRITE_DENYLIST` (checked in the loop at the function below it); `src/agent/protect.ts` `ALWAYS_PROTECTED` `DEFAULT_PROTECTED_PATHS` `protectedRefusal`.
- **Fails in:** `test/agent.test.ts` (a `write_file` to `auth.json` is refused); `test/protect.test.ts`.
- **Why / history:** no issue number; the comment in `paths.ts` gives the memory and skills reason.
- **Trap:** a memory or skill file written through a file tool skips the user's confirmation. The denylist exists for that reason. A path added to `DEFAULT_PROTECTED_PATHS` is not refused: the user can still allow it. Those are two different lists with two different meanings.

### Shell strings in 14 locales
- **Touches:** `client/src/i18n/*.ts` (`en`, `de`, `es`, `fr`, `it`, `ja`, `ko`, `nl`, `pl`, `pt`, `ru`, `tr`, `uk`, `zh`); `client-agent/` (English only, not in the list).
- **Must stay true:** every key of `en` has a value in every other locale with the same `{placeholders}`, and no locale has a key that `en` lacks. A new string goes into all 14 files in the same change.
- **Enforced in:** `test/i18n.test.ts` (its `DICTS` list holds the 13 non-English dictionaries; `en` is the key source).
- **Fails in:** `test/i18n.test.ts` (each locale: every key, placeholder for placeholder, no extra key).
- **Why / history:** rule in `CLAUDE.md`.
- **Trap:** `en` is not in `DICTS`, so an empty English value passes the test. A 15th locale file is never checked until its import and its `DICTS` line are added to the test.

### Shell-only routes and the app bridge mirror
- **Touches:** `appBridgeAllows` and `APP_MANAGEMENT_HEADS` (`src/server/app.ts`, the relay for app frames); `allowedRequest` in `client/public/app-bridge-host.js` (the browser copy of the same rule); the relay header `x-molfar-app` (read first) and `x-chrysalis-app` (see the alias entry below); the `trusted` flag from `officialApp`.
- **Must stay true:** an app frame cannot reach the management routes of its own app (`tree`, `install`, `build`, `activate`, `rename`, `export`, the `plugins/` and `build/` subtrees, and similar) nor any other app's routes. The browser copy gives the same answer as the server copy for the same path. A new shell-only route is added to the management set or refused by path in both copies.
- **Enforced in:** `src/server/app.ts` `appBridgeAllows` `APP_MANAGEMENT_HEADS`; `client/public/app-bridge-host.js` `allowedRequest`.
- **Fails in:** `test/security.test.ts` (the relayed-request list of blocked paths, and `appBridgeAllows`); `test/malicious-plugin.test.ts` (its list of shell-only paths, run against `allowedRequest` in a VM).
- **Why / history:** the comment above `appBridgeAllows` says `test/malicious-plugin.test.ts` keeps the two copies in step.
- **Trap:** both test lists are plain arrays. A route added to the server only is in neither list, so no test fails. Add the path to both test lists and to `allowedRequest` in the same change.

### Plugin sandbox clocks
- **Touches:** `src/plugins/sandbox.ts` (`CALL_TIMEOUT_MS` 20 s, `CALL_OVERHEAD_MS` 10 s, `SETTLE_LIMIT_MS` 10 s, idle retire 5 min); `src/plugins/runtime.ts` (`zipLimits`, `NET_DEFAULT_TIMEOUT_MS`, `NET_MAX_TIMEOUT_MS` 60 s); `src/server/app.ts` (`UPGRADE_LIMITS`, the 10 s command timeout in the shell call); `src/plugins/script-box.ts` (`SCRIPT_LIMITS`); the Roleplay app's per-reply clock (see the Roleplay COUPLINGS file, entry on #245).
- **Must stay true:** a call that runs past its clock is ended by the worker. A call with an execution limit gets that limit plus `CALL_OVERHEAD_MS` as its wall clock. A plugin network request is capped at `NET_MAX_TIMEOUT_MS`.
- **Enforced in:** `src/plugins/sandbox.ts` `CALL_TIMEOUT_MS` `CALL_OVERHEAD_MS` `call`; `src/plugins/runtime.ts` `NET_MAX_TIMEOUT_MS`; `src/plugins/script-box.ts` `SCRIPT_LIMITS`.
- **Fails in:** no test checks `CALL_TIMEOUT_MS` or `CALL_OVERHEAD_MS` directly. `test/sandbox.test.ts` covers the shell timeout (`shellTimeoutSeconds`), not the plugin clock. `test/plugins.test.ts` and `test/malicious-plugin.test.ts` run plugins in the sandbox.
- **Why / history:** no issue number in the constants. The Roleplay #245 fix depends on this clock.
- **Trap:** a plugin route's exact clock is UNVERIFIED: no route-level constant was found, and the comment at `CALL_TIMEOUT_MS` says the sandbox "caps at 10s". Changing `CALL_OVERHEAD_MS` changes the wall clock of every plugin call, and no test fails for it.

### Where Roleplay comes from and when it is official
- **Touches:** `OFFICIAL_SOURCES` and `isOfficialSource` (`src/apps/store.ts`); the catalog entry `roleplay` (`src/apps/store.ts`, the Roleplay repo URL); the redirect of the old upstream URL to the fork (`src/apps/store.ts`); `officialApp` (`src/server/app.ts`, sets `trusted` for an app frame); the install and update code in `src/apps/manager.ts` and `src/apps/update.ts` (named here, not read in detail); the Store list `MolfarWav/Molfar.Vertep-Store` (`apps.json`, read by the store code).
- **Must stay true:** only sources under `https://github.com/MolfarWav/` are official. An official app gets the `trusted` flag, which lets it do more through the relay (for example `mcp` writes in `appBridgeAllows`). The old upstream Roleplay URL is redirected to the fork.
- **Enforced in:** `src/apps/store.ts` `OFFICIAL_SOURCES` `isOfficialSource`; `src/server/app.ts` `officialApp`.
- **Fails in:** `test/app-store.test.ts`, `test/self-update.test.ts`, `test/app-restore.test.ts`. Whether one of them checks the redirect map is UNVERIFIED.
- **Why / history:** no issue number in the code.
- **Trap:** a new official app under another owner is not official and loses `trusted`; nothing warns. The Store list and the official source list are two separate things: a Store entry does not make a source official.

### Legacy names read only to carry an install over
- **Touches:** `LEGACY_ENV_PREFIX` and `readEnv` (`src/env.ts`, `CHRYSALIS_*` read after `MOLFAR_VERTEP_*`); `adoptLegacyDir` and the old `chrysalis` data folder (`src/install.ts`); `logToFile` (`src/logger.ts`, carries `chrysalis.log` over); `LEGACY_CLI_NAME` (`src/index.ts`, removes the old command); `LEGACY_SESSION_COOKIE` (`src/server/app.ts`, `chrysalis_session`); `AGENTS_MD_MARKER` (`src/paths.ts`, accepts the `chrysalis-workspace-agents` marker).
- **Must stay true:** each legacy name is only read to migrate an old install. Every new write uses the new name.
- **Enforced in:** `src/env.ts` `readEnv`; `src/install.ts` `adoptLegacyDir`; `src/logger.ts` `logToFile`; `src/server/app.ts` `LEGACY_SESSION_COOKIE`; `src/paths.ts` `AGENTS_MD_MARKER`.
- **Fails in:** `test/rename-66.test.ts`; `test/profiles.test.ts` (legacy session cookie). Whether any test covers `adoptLegacyDir` or `AGENTS_MD_MARKER` is UNVERIFIED.
- **Why / history:** #66 (the rename; `CLAUDE.md` says the old names are only read for migration).
- **Trap:** a cleanup that removes "chrysalis" from the code looks right, and it strands the users who upgrade from 1.7.x. Search for the old names before a rename; keep the readers.

### App-facing aliases that must stay
- **Touches:** `window.chrysalisShell` (`client/public/app-bridge.js`, next to `molfarShell`); the `chrysalis:*` event alias for `molfar:*` (`src/builder/browser/runtime.ts`); `x-chrysalis-app` (`src/server/app.ts`, read after `x-molfar-app`); the storage key prefix `chrysalis.app-storage.` and the `__chrysalis` message marker (`client/public/app-bridge-host.js`).
- **Must stay true:** apps built for 1.7.x keep working, because the engine cannot update installed apps. The names above stay as aliases, and a new name is added beside them, not in place of them.
- **Enforced in:** `client/public/app-bridge.js` (the `chrysalisShell` assignment); `src/builder/browser/runtime.ts` (the event alias expression); `src/server/app.ts` (the header read); `client/public/app-bridge-host.js` (the storage key and the marker check).
- **Fails in:** `test/app-bridge-storage.test.ts` (storage key, `chrysalisShell`); `test/malicious-plugin.test.ts` (events); `test/security.test.ts` (relay header). No test loads an app built for 1.7.x (UNVERIFIED that none exists elsewhere).
- **Why / history:** #66 (the rename) and the comments in `CLAUDE.md`.
- **Trap:** removing one alias passes every test here and breaks installed apps only. Check the apps' own copies before you remove an alias.

### Pinned pi packages
- **Touches:** `package.json` (`@earendil-works/pi-agent-core` and `@earendil-works/pi-ai`, both `1.2.0`); `bun.lock`; the launcher `Molfar-Vertep.bat` (runs `bun install` on each machine, which re-resolves ranges); the agent and model code that calls the pi API (`src/agent/`, `src/models.ts`).
- **Must stay true:** both packages are pinned to an exact version, with no `^` and no `~`. A new version is adopted only after it is at least 7 days old and no hotfix came after it (`CLAUDE.md`, user, 2026-10-18).
- **Enforced in:** `package.json` (the two dependency lines).
- **Fails in:** no test. No test reads `package.json` for the pin form; the test files that name these packages only import them.
- **Why / history:** rule in `CLAUDE.md` (pi breaks its API even in minor versions).
- **Trap:** `bun add` without a version writes a caret. A range lets each machine install a different release on the next launch.

### Lockfile rule
- **Touches:** `bun.lock`, `client-agent/bun.lock`, `.github/workflows/ci.yml` and `.github/workflows/build.yml` (both run `bun install --frozen-lockfile`), the launcher `Molfar-Vertep.bat`.
- **Must stay true:** a commit carries a lock file only when `package.json` dependencies changed in the same change. A lock file that `bun install` only rewrote is restored (`git checkout`).
- **Enforced in:** `.github/workflows/ci.yml` (the frozen install step); `.github/workflows/build.yml` (the same step).
- **Fails in:** CI itself fails when `package.json` and the lock disagree. No unit test.
- **Why / history:** `CLAUDE.md` says the first tag of 1.2.2 failed for a missing lock.
- **Trap:** a dependency change without its lock fails only in CI, after the push. Check locally with a frozen install before you push.

### Guide pages (in-app Help and Molfar's answers)
- **Touches:** `builtin-skills/vertep-guide/pages/*.md` and `builtin-skills/vertep-guide/l10n/`; `src/guide-pages.ts` (the book loader); `client/src/guide/`; the page format in `.fork/handoff/guide/FORMAT.md`; `scripts/guide-l10n.ts` (`--stale` lists the stale translations); the Roleplay copy `.skills/guide/pages/` (not in this repo).
- **Must stay true:** a change to what a user sees or can do updates its page in the same change. Each page starts with a `# Title` line, its links resolve, and a translation names a page that exists. A stale translation shows English.
- **Enforced in:** `src/guide-pages.ts` (the loader); `scripts/guide-l10n.ts`.
- **Fails in:** `test/guide-pages.test.ts` (the start page, the page format, the links, the translations). No test checks that a changed screen has its page.
- **Why / history:** rule in `CLAUDE.md`; the owner's note in `CLAUDE.md` gives the cost of a missing page (46 calls for one question).
- **Trap:** a new feature with no page passes every test. Molfar then reads the code, which costs many calls.

### Built-in skills and their digests
- **Touches:** `builtin-skills/*/` (the shipped skills); `builtin-skills/.digests.json`; `scripts/skill-digests.ts`; a user's workspace copy of a skill with the same name, which replaces the shipped one; `src/agent/memory.ts` (skills).
- **Must stay true:** `.digests.json` lists the digest of every shipped version of each skill. An old shipped copy in a workspace is recognized and removed on update because its digest is in the list. After any change under `builtin-skills/`, run `bun scripts/skill-digests.ts`.
- **Enforced in:** `scripts/skill-digests.ts`; `builtin-skills/.digests.json`.
- **Fails in:** `test/update-housekeeping.test.ts` (the `builtin-skills/.digests.json` block, which reads the file and checks it against the shipped skills; read the test before relying on the exact check).
- **Why / history:** rule in `CLAUDE.md`.
- **Trap:** an edit to a skill with no digest run leaves the list out of date. Also, a workspace copy of the same name wins over the shipped skill, so a fix to the shipped skill does not reach a user who already has a copy.

### Workspace AGENTS.md version
- **Touches:** `AGENTS_MD_VERSION` (currently 14) and `AGENTS_MD_MARKER` (`src/paths.ts`); the workspace AGENTS.md text in `src/paths.ts`; routes `/v1/settings/agents-md` and `/v1/settings/agents-md/restore`; the version check at the function that returns `false` when the marker is current.
- **Must stay true:** the workspace file carries the version and a digest in its marker line. A file whose version is at least `AGENTS_MD_VERSION` is current and is not rewritten.
- **Enforced in:** `src/paths.ts` `AGENTS_MD_VERSION` `AGENTS_MD_MARKER`.
- **Fails in:** `test/default-prompts.test.ts`; `test/security.test.ts` (the `agents-md` routes). Whether a test covers the rewrite of an edited file is UNVERIFIED.
- **Why / history:** no issue number.
- **Trap:** a text change in `paths.ts` with no bump of `AGENTS_MD_VERSION` never reaches existing workspaces. A bump rewrites files that are not current; read the code path for an edited file before you bump.
