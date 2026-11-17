# Engine: traps and "change X, touch Y", collected from every page

Built by a script from the pages of this handbook; do not edit by hand. When a page changes,
rebuild this file. The page named in each heading has the detail.


## From `engine-agent.md`

Change X, touch Y:
- Any system prompt text, including `LANGUAGE_RULE` and `PRECEDENCE_RULE`: the stamp in `instructionDocsStamp` or an eviction in `app.ts`. The small-window prompt repeats both rules.
- A new tool: `buildUserTools` or `buildRunTools`; `WRITE_TOOLS` if it writes; `GROUP_OF`, `CORE_TOOLS` and the description maps in `small-window.ts`; `AUTO_CHECKPOINT_TOOLS` if it changes an app.
- A new write path that skips the tools: call `agentWriteDenied` and `protectedRefusal`.
- The auto-compact threshold: the literal 0.8 in `app.ts`, and the setting's range check in the same file.
- The session record: `persistRun`, `loadSessionDialogue` and `sessionListCache`.
- The client: `client-agent/src/api.ts` (`sessionsApi`, `mailboxApi`, `memoryApi`) and `MailboxTab.tsx`.

Traps:
- `appTools` does not reach this loop.
- `planGate` is off when cost checks are off. In `auto` mode that happens for a model on a local endpoint, so such a model can write many files without a plan.
- `transformContext` must not throw. When it does, the window can overflow with no retry.
- The system prompt is frozen per cached agent; an input missing from the stamp goes stale until restart.
- `saveEntry` swallows git commit errors.
- The post-run pass costs one more model call after runs of 8 or more steps.
- `KEEP_PER_APP` (30) drops old checkpoint records, so their commits can no longer be restored by id.
- Plan mode also removes `memory_propose` and `checkpoint`.


## From `engine-apps-bridge.md`

Change X, touch Y:
- `appBridgeAllows` in `src/server/app.ts`: also `allowedRequest` in `client/public/app-bridge-host.js`, and the cases in `test/security.test.ts` and `test/malicious-plugin.test.ts`.
- `APP_MANAGEMENT_HEADS` in `src/server/app.ts`: also `MANAGEMENT_HEADS` in `client/public/app-bridge-host.js`.
- A new shell op: `molfarShell` in `client/public/app-bridge.js`, `shellRequest` in `client/public/app-bridge-host.js`, a branch in `onShellRequest` in `client/src/App.tsx`, and the op list in `test/security.test.ts`.
- The notify limits in `shellRequest`: also the notify cases in `test/security.test.ts` and `client/src/notice-rules.ts`.
- `patternMatches` in `src/apps/reads.ts`: also `seg` and `matches` in `peerSvc` in `src/plugins/sandbox-worker.mjs`.
- `parseReads` or the `reads` manifest shape: also `validateAppManifest` in `src/apps/manager.ts`, `peerMounts`, and `test/app-reads.test.ts`.
- `userPaths` in `src/paths.ts`: also `readGrants` and `writeGrants` in `src/apps/reads.ts`.
- `GET /v1/apps/:id/build` answers `built` (dist/index.html exists); `src/builder/browser/host.ts` puts it on an error status so the shell and the standalone page can say "nothing to show yet" instead of "last good build" when no build ever finished (#337).
- The delete and rename routes in `buildApp`: keep calling `forgetGrants`, `forgetPeer` and `moveGrants`.

Traps:
- The allowlist exists twice. A route added to one copy only is a gap, or a block the other copy does not share.
- Every shell op needs `trusted`, including `notify`. An untrusted app gets an error for all of them.
- `notify` skips the on-screen check, so a background app can change its count.
- `parseReads` lives in `src/apps/reads.ts`, not `src/apps/manager.ts`. The manager only calls it.
- A decision covers only the patterns it was made for. A manifest that asks for a new pattern makes the user answer again.
- The worker's matcher is a separate copy and must stay in step with `patternMatches`.
- The frame's `fetch` is the bridge: a request body over 32 MB (`TOO_BIG` in `client/public/app-bridge.js`) is refused inside the frame, before any network, and the app's own error wrapper shows it as a lost connection. An app that has more to send sends it in parts (Roleplay's backup import does, `splitLibrary`).
- No server code handles app notices. The `notify` op stops in the browser. The `bus.emit` call in `src/server/app.ts` is the agent's event bus, not an app notice.
- The browser copy decodes the path with `decodeURIComponent` and refuses a path that does not decode. The server relies on the router's decoded path.


## From `engine-models-embeddings.md`

Change X, touch Y:
- A plugin request field: `request` in src/plugins/sandbox-worker.mjs, the strip list in `runPassRequests`, `GenerateRequest` in src/models.ts, and `LLM_PATCH_FIELDS` if hooks may set it.
- A parameter block field: `SHORT`, `NUMERIC`, `validateBlock` and `mergeParams` in src/model-params.ts.
- A local model: `LOCAL_MODELS` (revision, sizes, sha256), the `LocalModelId` type, and `FAMILIES` in src/embed-model-names.ts if a remote copy exists.
- Embedding order or defaults: `embed` and `readEmbedSettings` in src/models.ts, `src/embed-settings.ts`, and the PUT check in src/server/app.ts.
- A provider wire: `buildProvider` in src/providers/custom.ts and the registration in src/models.ts. Keep `tolerantSseFetch` on custom connections.
- Pacing: `DEFAULT_PACE` and the bounds in src/plugins/llm-pace.ts.
- A new cache mode: `CACHE_MODES` in src/model-cache.ts, `ModelInfo.cache`, the PUT route, `CacheLifetime` in client/src/model-panel.tsx, and the "shell only" lists in test/security.test.ts and test/malicious-plugin.test.ts.

Traps:
- `embed` drops blank texts before embedding, and `runPassRequests` returns the shorter list unchanged. A plugin can get fewer vectors than texts; check the length and align by position.
- A default model is swapped silently when its connection goes offline; a named one throws.
- Vectors of different models do not compare; `embedInfo` says which model made them.
- `host.llm.results` exists only in the next pass.
- A cancelled stream commits nothing; a rate-limit retry does not happen after streamed text was sent.


## From `engine-plugin-sandbox.md`

Change X, touch Y:
- `CALL_OVERHEAD_MS` or `CALL_TIMEOUT_MS`: every plugin call's wall clock; see "Plugin sandbox clocks" in `.fork/COUPLINGS.md`.
- `POISONED` or the retry rule in `evalAttempt`: `test/plugins.test.ts` timeout and memory cases.
- A host capability or key: the harness in `src/plugins/sandbox-worker.mjs`, `runPassRequests`, `passWants`, and the header of `src/plugins/runtime.ts`.
- A permission name: `PluginPermission`, `hasCapAny`'s alias map, `declaredPermissions` and `grantsFor` in `src/server/app.ts`, and the approve route's default set.
- `PLUGIN_HOOKS`: the `source.includes` pre-checks in `collectSiblingLlmHooks` and `collectInsertCeilings`.
- `LLM_PATCH_FIELDS`: what an `llmRequest` hook may change.
- `writeFileAtomic`: also used by `src/plugins/store.ts`; `test/atomic-write.test.ts`.

Traps:
- A full pool queues a call on the least loaded worker, and the worker's message handler is async: the two calls take turns on its one thread in small slices, and each one's clock runs for both. Measured with one worker: two calls of 1.5 s of work each both took 5.6 s. Calls of one app with `fs` cannot meet this way during a write (the gate gives a write the data folder alone), but reads of one app can, and so can calls of different apps or without `fs`.
- Clocks apply per pass. A route with three model rounds makes three worker calls, and `runPluginRoute` sets no overall limit.
- Store writes from a failed pass still apply: `applyStoreWrites` runs before the `!r.ok` check. Files written before a crash stay on disk, and a 500 queues no commit.
- `insertCeiling` checks for a `hooks` grant. Imported plugins get no `hooks` from the approve defaults or `declaredPermissions`, so the hook silently does not run. Confirmed on `main` at 8310b23: a test in `test/plugins.test.ts` (`it.failing`, branch `claude/handbook-findings`, d8ef627) pins it. The Roleplay repository's manifests say `origin: "local"`, but installing or updating an app from its repository rewrites every bundled plugin to `imported` (`src/apps/store.ts`, `src/server/app.ts`), so installed Roleplay plugins are imported too; whether their `insertCeiling` runs depends on the grants an official install gives ("granted roleplay's bundled plugins the permissions they declare" in the log): not checked. The `llmRequest` loop gates on a declared `hooks` plus a granted `llm`; the proposed fix is the same gate here. Not changed: security code, waiting for review.
- A manifest without `origin` is trusted: `hasCapAny` asks for grants only when origin is `imported`.
- `PluginPermission` lists `fs:${string}`, but `hasCapAny` matches only the exact name `fs`.


## From `engine-shell-client.md`

Change X, touch Y:
- A settings tab: the `TabValue` union, the `tabs` array and both render lists in `client/src/settings.tsx` (phone and desktop), plus the admin gate if it is admin-only.
- A shell string: `scripts/i18n-keys.ts` output and all 13 dictionaries.
- A shell-only route: the route lists in `test/security.test.ts` and `test/malicious-plugin.test.ts` (per the repo's rules file).
- A theme key or colour name: `client/src/theme.ts`, `src/themes.ts` (`THEME_COLOR_KEYS`, which the comment says must match), and the reads in `client/public/app-bridge-host.js`.
- A renamed preference key: `RENAMED_KEYS` in both `client/src/prefs.ts` and `client-agent/src/legacy-prefs.ts`.
- The frame handshake or storage snapshot: `client/public/app-bridge.js` and `app-bridge-host.js` together.
- Notice rules: `client/src/notice-rules.ts` and the two notice tests.

Traps:
- `client/src/store.tsx` is the app Store, not shared state.
- No "app rail" exists in the code; the strip holds tabs of kind `agent`, `app` or `new`.
- The settings tab `models` is redirected to `api` (`SettingsBody`).
- The extraction script only sees double-quoted literals in `tr("...")`; a computed key is missed, and no test compares `en.ts` with the call sites.
- A missing translation falls back to English at runtime without a message. Only `test/i18n.test.ts` catches it.
- `tipText` in `client/src/guide/guide.ts` returns Ukrainian tips only for `uk`; every other locale sees the English tip text.
- A custom theme whose file is gone falls back to Vertep when the list loads (`useThemeControl`).
- The three theme storage keys are read by apps and the agent page; a rename breaks both.
- A notice is hidden while Molfar's page is visible, focused and on screen (`shouldShowNotice`).


## From `engine-sync.md`

Change X, touch Y:
- A synced path rule: `skippedInWorkspace` in `src/profile-backup.ts` (shared with the profile backup), then `workspacePathOk` and `inScope` in `src/sync/manifest.ts`.
- A private plain file: `PLAIN_PRIVATE` in `src/profile-backup.ts`; `scanLocal` and `syncPathOk` read that list.
- A key file: `SECRET_FILES` in `src/profile-backup.ts`, then `readSecretBundle` in `src/sync/local.ts`.
- A store: implement `SyncStore` in `src/sync/store.ts`, then `storeFor` in `src/sync/service.ts`.
- The manifest or blob format: bump `SYNC_FORMAT` in `src/sync/manifest.ts`; check `encodeBlob` and `decodeBlob` in `src/sync/engine.ts`.
- A route or setting: `src/server/app.ts`, `viewOf`, `client/src/sync-settings.tsx`, `test/sync-routes.test.ts`.
- What a pull changes for open apps: the pull callback in `src/server/app.ts`.

Traps:
- `BUILTIN_CLIENT` in `src/sync/drive.ts` holds a client id and secret in the code, while the design doc says the client is empty until registered. Review this; the value is not copied here.
- The design doc lists three private files; `PLAIN_PRIVATE` has four. Code wins.
- Keep mine saves nothing locally; the design says the version not kept is saved. Only `theirs` saves.
- Workspace-root `.cache/` is synced. Only `apps/<id>/data/.cache/` is excluded.
- Drive has no compare-and-swap. Push re-reads the head, but a race window of seconds remains.
- The refresh token and passphrase sit in plain JSON in `sync.json`.
- Pull applies files one by one after the checks; a failure midway leaves the base unchanged.
- `replace` deletes remote files that are in scope here but absent here.
- Sync is manual; an idle device stays stale.


## From `engine-update-release.md`

Change X, touch Y:
- `APP_API_VERSION` (`src/install.ts`): app `engine` ranges, and `.fork/RELEASE.md` ("Keep apart"). Only on an upstream app-contract change.
- Archive names: `pickAsset` (`src/self-update.ts`) and the build outputs in `build.yml`.
- `version` in `package.json`: the tag check in `release.yml`, CHANGELOG, release notes.
- `DEFAULT_STORE_URL` (`src/config.ts`): add the old URL to `PAST_DEFAULT_STORE_URLS`.
- `SNAPSHOT_FILES` (`src/self-update.ts`): both the engine update and `rollBack` depend on it.
- Tag format: the `v*` filter in `release.yml`, `MV_TARGET` in `Molfar-Vertep.bat`, `.fork/RELEASE.md`.

Traps:
- The launcher picks only tags of the form `vX.Y.Z` (`MV_TARGET` runs `git tag -l "v*"`); `0.1.0` is never picked. The in-app update check drops a leading `v`, so it reads both. `.fork/RELEASE.md` says so since d8ef627 (branch `claude/handbook-findings`).
- CHANGELOG.md had no `## Unreleased` heading at 8310b23; d8ef627 adds an empty one. Keep it after each release (step 4).
- Staging copies follow `staging-latest`. Its title must read `Staging <version>`.
- A tag that does not match `package.json`, or is not on main, fails `release.yml`.
- An app's `engine` range is the app contract, not the engine version. Do not bump `APP_API_VERSION` for an ordinary release.
- `rollback` for a downloaded program needs the `.old` files; the error text says 1.2.2 or newer keeps them.
