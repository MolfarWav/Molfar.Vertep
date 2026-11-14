# Install, update and release: the engine, the apps, the Store

Verified at: molfar.vertep 8310b23

## What it does
- A downloaded engine program replaces itself from its release archive. A source checkout runs `Molfar-Vertep.bat`, which checks out the newest release tag, or the newest work branch with `dev`.
- Apps such as Roleplay and Social are git repositories cloned into the apps folder. Each updates from its own repository, and its `engine` range is checked against `APP_API_VERSION` (1.0.2).
- The Store is a JSON list read from the Store repository. Repositories under `https://github.com/MolfarWav/` count as official.
- Engine releases are tags `vX.Y.Z` on main, built by `release.yml`. Addons release from their own repositories.

## Owners
- `src/self-update.ts` `installUpdate`: downloads, checks size and checksum, unpacks, runs the new program, swaps the files.
- `src/self-update.ts` `pickAsset`: picks this computer's archive from a release by file name.
- `src/self-update.ts` `checkProgram`: runs the new program with `--version` and compares the version.
- `src/self-update.ts` `runReplacement`: the restart parent; restores the old program if the new one stops early.
- `src/updates.ts` `latestRelease`: reads the latest release (or `staging-latest`), cached for an hour.
- `src/updates.ts` `isNewer`: compares the tag, without its `v`, with the running version.
- `src/rollback.ts` `snapshotOnVersionChange`: copies account files aside before a version change.
- `src/rollback.ts` `rollBack`: restores account files only if the data format moved, then the program.
- `src/index.ts` `rollbackCommand`: the `rollback` command.
- `src/install.ts` `APP_API_VERSION`: the app contract number that app `engine` ranges are checked against.
- `src/apps/update.ts` `satisfiesRange`: checks a range such as `^1.0.0` against a version.
- `src/apps/store.ts` `OFFICIAL_SOURCES`: the owner prefixes treated as official.
- `src/apps/store.ts` `createCatalog`: fetches and caches the Store list (10 minutes, 1 MB cap).
- `src/config.ts` `DEFAULT_STORE_URL`: the raw `apps.json` of the Store repository.
- `src/apps/git.ts` `gitClone`: clones an app repository at a branch or tag.
- `src/server/app.ts` `updateApp`: clones an app's new version into staging, checks it, applies it.
- `src/server/app.ts` `runAppUpdateHooks`: runs each enabled plugin's `onAppUpdate`.
- `src/plugins/runtime.ts` `PLUGIN_HOOKS`: lists the plugin hooks, including `onAppUpdate`.
- `Molfar-Vertep.bat` `MV_TARGET`: the release tag the launcher checks out by default.
- `.github/workflows/release.yml` `merge-base`: refuses a tag that is not on main.

## Engine update
1. A newer GitHub release becomes the latest. `latestRelease` reads it, and only when an admin opens Settings > Server.
2. `POST /v1/admin/server/update` (`src/server/app.ts`) is refused unless `SELF_UPDATE` is true: a downloaded program, not a container, source checkout, npm package or Android app.
3. `pickAsset` takes an archive named `Chrysalis-*` or `Molfar-Vertep-*`, ending in the platform (for example `windows-x64`), as `.zip` or `.tar.gz`.
4. `startUpdate` runs `installUpdate` in the background.
5. The download must match the asset's size, and its SHA-256 when the release publishes a digest.
6. The archive is unpacked. `checkProgram` runs the new program with `--version`; it must print the release version.
7. `swapProgram` renames the running files to `.old` and moves the new ones in.
8. `runReplacement` saves `users.json`, `sessions.json` and `format.json`, then starts the new program as a child with the same arguments.
9. If the child exits before it has served for `proveMs` (15 seconds by default), the parent restores the old program and account files, then starts the old version, which reports the failure in Settings.
10. On the new version's first start, `snapshotOnVersionChange` runs before any data migration.
11. The user runs the new version. `molfar-vertep rollback [version]` calls `rollBack`, which restores the program from the `.old` files.

## App install and update
Install (`POST /v1/apps/import`, which clones with `gitClone`):
1. The first request clones into `apps/.staging/<slug>` and reads `manifest.json`. A missing or invalid manifest gives 422. The response is a preview.
2. A second request with `confirm` completes the install (not read in full).

Update (`POST /v1/apps/:id/update`, which calls `updateApp`):
1. Refused with 400 unless the app has a recorded install source.
2. The repository is cloned at its ref into `apps/.staging/<id>.update-<time>`.
3. The incoming `manifest.json` must be valid. Its `version` is compared with the installed one.
4. Version check: the incoming `engine` range must satisfy `APP_API_VERSION`, or the update stops with 409 ("Update the engine first"). An unreadable range counts as not satisfied.
5. Third-party apps: new packages and new plugin permissions must be reviewed. The confirm must send the reviewed commit (`head`), or 409. Official apps skip this.
6. The local copy is merged with `UPDATE_STRATEGIES`: `merge` (default), `mine`, `theirs` or `agent`.
7. `runAppUpdateHooks` runs `onAppUpdate` with `from` and `to`. A failed hook is kept as a pending upgrade and retried.

Store listing: `createCatalog` fetches `apps.store` (default `DEFAULT_STORE_URL`) with a 10 second timeout. If the fetch fails, the last list is served with the error attached.

## Release procedure
The executor is whoever has the branch. The owner is the user.
1. Executor: pick the number. A significant change is a minor bump; a small fix is a patch (`.fork/RELEASE.md`, step 1).
2. Executor: run `bun run typecheck`, `bun run test`, `bun run build:client`.
3. Executor: refresh stale guide translations and check the pinned versions in `CLAUDE.md`.
4. Executor: set `version` in `package.json` before the tag.
5. Executor: rename CHANGELOG `## Unreleased` to `## X.Y.Z (date)` and add an empty `## Unreleased` above it.
6. Executor: write `.fork/release-notes/X.Y.Z.md`, which becomes the release body.
7. Executor: fast-forward main with `git push origin HEAD:main`.
8. Owner: pushes the tag (`git tag vX.Y.Z origin/main`, then `git push origin vX.Y.Z`). A cloud session cannot push tags.
9. Owner: does not create the release in GitHub's form; a pre-existing release makes `release.yml` fail.
10. `release.yml` checks the tag against `package.json` and main, builds, publishes the release and the Docker image, and runs npm only with `NPM_TOKEN`.
11. Owner: checks the archives are listed and an older copy offers the update.
12. Owner, once: enables the fork's workflows in the Actions tab.

Addons: Roleplay and Social bump their own version, CHANGELOG and merge in their own repository. An engine release happens only when engine code changed (`CLAUDE.md`, "Addons release on their own"). Social has no tags.

## CI workflows
- `ci.yml`: on pushes to main and staging, pull requests and by hand. Typecheck, lint, tests, then calls `build.yml`. A staging push refreshes the `staging-latest` pre-release.
- `build.yml`: reusable only (`workflow_call`). Builds archives for Windows, macOS, Linux, the npm package and the Android APK, then smoke tests.
- `release.yml`: on tags `v*`. Verifies the tag, calls `build.yml`, publishes the release and the Docker image.
- `workflow-audit.yml`: on pushes to main or staging and on pull requests that change `.github/**`.

## If you change X, also touch Y
- `APP_API_VERSION` (`src/install.ts`): app `engine` ranges, and `.fork/RELEASE.md` ("Keep apart"). Only on an upstream app-contract change.
- Archive names: `pickAsset` (`src/self-update.ts`) and the build outputs in `build.yml`.
- `version` in `package.json`: the tag check in `release.yml`, CHANGELOG, release notes.
- `DEFAULT_STORE_URL` (`src/config.ts`): add the old URL to `PAST_DEFAULT_STORE_URLS`.
- `SNAPSHOT_FILES` (`src/self-update.ts`): both the engine update and `rollBack` depend on it.
- Tag format: the `v*` filter in `release.yml`, `MV_TARGET` in `Molfar-Vertep.bat`, `.fork/RELEASE.md`.

## Traps
- The launcher picks only tags of the form `vX.Y.Z` (`MV_TARGET` runs `git tag -l "v*"`); `0.1.0` is never picked. The in-app update check drops a leading `v`, so it reads both. `.fork/RELEASE.md` says so since d8ef627 (branch `claude/handbook-findings`).
- CHANGELOG.md had no `## Unreleased` heading at 8310b23; d8ef627 adds an empty one. Keep it after each release (step 4).
- Staging copies follow `staging-latest`. Its title must read `Staging <version>`.
- A tag that does not match `package.json`, or is not on main, fails `release.yml`.
- An app's `engine` range is the app contract, not the engine version. Do not bump `APP_API_VERSION` for an ordinary release.
- `rollback` for a downloaded program needs the `.old` files; the error text says 1.2.2 or newer keeps them.

## Tests that guard it
- Engine: `test/self-update.test.ts`, `test/rollback.test.ts`, `test/update-housekeeping.test.ts`.
- Apps and Store: `test/app-update.test.ts`, `test/app-git.test.ts`, `test/app-store.test.ts`, `test/app-restore.test.ts`, `test/app-contract-on-demand.test.ts`.
- Distribution: `test/distribution.test.ts`.

These files were checked for existence only; their contents were not read.

## Not verified
- The contents of the test files, and whether they pass.
- Whether the import preview refuses an app whose `engine` range does not match. Only the update route was read.
- The exact order of merge, `onAppUpdate` and package install in `updateApp`.
- The `confirm` step of `POST /v1/apps/import`.
- The client code for Settings > Server and the Store page.
- The check interval inside `runReplacement`.
- The full launcher behaviour beyond the tag choice and `dev`.
- The detailed build outputs, and `.fork/release-notes/INDEX.md`.
- The known Windows-only test failures in `.fork/STATE.md`; only its addon section was read.
