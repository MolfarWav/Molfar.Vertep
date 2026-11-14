# App plugins: the sandbox, the host API, hooks and limits
Verified at: molfar.vertep 8310b23

## What it does
An app plugin is `plugins/<id>/plugin.js` with a `manifest.json` beside it, inside an app folder. Each call evaluates the current source in a QuickJS runtime owned by a pooled worker thread. The plugin asks for models and the network through `host`, and the engine does that work between passes. A call that fails or overruns ends its worker. Manifest permissions gate each capability.

## Owners
- `src/plugins/runtime.ts` `discoverPlugins`: reads manifests and `plugin.js`, cached by mtimes.
- `src/plugins/runtime.ts` `discoverAppPlugins`: ids become `<app>__<id>`; file scope is the app's `data/` dir.
- `src/plugins/runtime.ts` `hasCapAny`: permission check; only imported plugins need a grant.
- `src/plugins/runtime.ts` `runPluginRoute`: route pass loop; a failure becomes a 500.
- `src/plugins/runtime.ts` `hookPasses`: hook pass loop; a failure returns `ok: false`.
- `src/plugins/runtime.ts` `runPassRequests`: runs embed, net, script and llm requests host-side.
- `src/plugins/runtime.ts` `syncSchedules`: arms `onTick` timers.
- `src/plugins/sandbox.ts` `PluginSandbox`: worker pool, per-data-dir gate, retries in `evalAttempt`.
- `src/plugins/sandbox.ts` `call`: wall clock per call; a timeout ends the worker.
- `src/plugins/sandbox-worker.mjs` `harnessCode`: wraps `plugin.js` and picks the hook.
- `src/plugins/sandbox-worker.mjs` `fsSvc`: the `host.fs` jail.
- `src/plugins/atomic-write.mjs` `writeFileAtomic`: temp file, then rename over the target.
- `src/plugins/store.ts` `PluginStoreService`: per-plugin JSON store.
- `src/plugins/script-box.ts` `SCRIPT_LIMITS`: limits for `host.script` runs.
- `src/server/app.ts` `dispatchAppRoute`: app route entry; queues the commit of a route's writes.
- `src/server/app.ts` `declaredPermissions`: grants recorded on git import, without `hooks`.
- `src/server/app.ts` `syncUserSchedules`: keeps timers in step.

## The host API
Every call gets `host` from `src/plugins/sandbox-worker.mjs`. Permission in brackets.
- `host.log(...)`: up to 200 lines of 500 characters.
- `host.store.get/put/delete/keys`: JSON store, 1 MB cap per plugin, written after the pass. [store]
- `host.llm.request(key, req)`: model call, 16 per pass; the answer arrives in `host.llm.results[key]` on the next pass. `req.images` takes up to 4 pictures of 8 MB each. [llm]
- `host.llm.embed(key, {texts, model?, kinds?})`: embeddings, 8 per pass; vectors in `host.llm.embedResults[key]`, the model in `host.llm.embedInfo[key]`. [llm]
- `host.net.request(key, {url, method, headers, body, form, json, binary, timeoutMs, maxBytes, followRedirects})`: fetch run by the engine with no credentials, 32 per pass, answer in `host.net.results[key]`. [network; host listed in `networkHosts`]
- `host.script.request(key, {code, input, seed})`: small script on its own sandbox, 16 per pass. [script]
- `host.fs`: `read`, `readBase64`, `write`, `list`, `stat`, `remove` inside the app's `data/` dir; escapes and dangling symlinks are refused. [fs; app-bundled plugins only]
- `host.peer`: `apps`, `read`, `stat` on other apps' data the user allowed, limited to manifest-declared paths; read only. [peer]
- `host.zip`: `build` needs no permission; `list` and `entries` read an uploaded zip. [zip, for those two]
- `host.siblingTools`, `host.insertCeilings`: present only with `?siblingtools=1` or `?insertceilings=<chat>`.
- Notify: no such call; an `onTick` return value becomes a `plugin_event`. [schedule]

## Hooks a plugin can export
| Export | When it is called | Time limit |
|---|---|---|
| `handleRoute(ctx, host)` | An app request that reaches the plugin [routes] | 10 s execution, 20 s wall, per pass; 3 passes, up to 12 |
| `handleTool` with `TOOLS` | The agent calls a plugin tool [tools] | 10 s / 20 s per pass; 3 passes |
| `onTick(ctx, host)` | Every `schedule.intervalMs`, floor 5 s [schedule] | 10 s / 20 s |
| `uiPanel(ctx, host)` | A read of an app's `__panels` route | 10 s / 20 s |
| `appTools(host)` | A model call sets `wantsTools` [tools] | 10 s / 20 s |
| `llmRequest(ctx, host)` | Before a route-driven model call; `hooks` declared, `llm` granted | 10 s / 20 s; patch fields only |
| `insertCeiling(ctx, host)` | A sibling route called with `?insertceilings` [hooks] | 10 s / 20 s |
| `onAppUpdate({from, to}, host)` | Once after an app update | 5 min, 512 MB |

`PLUGIN_HOOKS` in `src/plugins/runtime.ts` lists the names the engine calls on its own. `TOOLS` is read with no hook run.

## Limits
- `CALL_TIMEOUT_MS` = 20 s: wall clock of a call with no own limit, boot included. `src/plugins/sandbox.ts`
- `CALL_OVERHEAD_MS` = 10 s: added to an execution limit to make the wall clock. `src/plugins/sandbox.ts`
- `executionTimeoutMs` = 10 s and `memoryLimitBytes` = 64 MB by default. `src/plugins/sandbox-worker.mjs`
- `POOL_SIZE`: 2 to 4 workers by default; `MOLFAR_VERTEP_SANDBOX_WORKERS` up to 8. `src/plugins/sandbox.ts`
- `IDLE_RETIRE_MS` = 5 min, `SETTLE_LIMIT_MS` = 10 s, `HEAP_RETIRE_BYTES` = 192 MB. `src/plugins/sandbox.ts`
- Zip restore route: `zipLimits` 120 s and 512 MB; 200 MB payload; 60000 entries; 256 MB total (`MAX_TOTAL`). `src/plugins/runtime.ts`, `src/plugins/sandbox-worker.mjs`
- Net: `NET_DEFAULT_TIMEOUT_MS` 15 s, `NET_MAX_TIMEOUT_MS` 60 s, `NET_DEFAULT_MAX_BYTES` 5 MB, `NET_HARD_MAX_BYTES` 20 MB. `src/plugins/runtime.ts`
- `MIN_INTERVAL_MS` = 5 s for timers; `MAX_TOOL_PASSES` = 3. `src/plugins/runtime.ts`
- Manifest `limits`: `PASSES_DEFAULT` 3, `PASSES_MAX` 12, `CONCURRENCY_MAX` 4; `DEFAULT_PACE` 250 ms gap, 3 retries. `src/plugins/llm-pace.ts`
- `PLUGIN_IMAGE_MAX` = 4, `PLUGIN_IMAGE_CHARS` = 8 MB. `src/plugins/runtime.ts`
- `SCRIPT_LIMITS`: 8000 code chars, 64 KB in, 32 KB out, 500 ms CPU, 2.5 s wall, 2 s per pass. `src/plugins/script-box.ts`
- Store 1 MB, `fs.write` 4 MB, peer read `MAX_READ` 2 MB. `src/plugins/sandbox-worker.mjs`
- `UPGRADE_LIMITS`: 5 min, 512 MB; `SCHEDULE_SYNC_MS` = 10 s. `src/server/app.ts`

## Flow
1. The app page calls `/v1/apps/<app>/...`. The `app.all` handler in `src/server/app.ts` reads the body (8 MB cap) and calls `dispatchAppRoute`.
2. `dispatchAppRoute` takes the enabled plugins from `discoverAppPlugins` and calls `runPluginRoute` on each until one answers.
3. `runPluginRoute` checks `routes`. Each pass calls `sandbox.eval` with hook `__route`; `harnessCode` imports `plugin.js` and calls `handleRoute(ctx, host)`.
4. Model call: the plugin calls `host.llm.request("draft", ...)` and returns `__llmPending` with a `stash`. `runPassRequests` runs the call in the engine; keys never enter the sandbox. The next pass reads `host.llm.results.draft`, and the route returns `{status, json | text}`.
5. Writes with a status below 400 are committed by `queueRouteCommit`. With no answer, the app returns 404 from `noRouteReason`.
6. Crash: an exception in plugin code comes back as `ok: false`. The worker stays, and the route returns 500 naming the plugin, method, path and error.
7. Timeout: the `call` timer resolves with "sandbox call timed out". `POISONED` matches, and `evalAttempt` condemns and disposes the worker. Calls queued behind it come back as bystanders and run again elsewhere only for GET and HEAD routes. The timed-out call itself is not retried.

Reload: `discoverPlugins` checks file mtimes on each app request and re-reads only what changed. Source travels with each call and the worker caches no module, so the next call runs new code. Timers start at boot and re-sync at most every 10 s on signed-in requests; `invalidatePluginCache` stops timers whose `plugin.js` is gone.

## If you change X, also touch Y
- `CALL_OVERHEAD_MS` or `CALL_TIMEOUT_MS`: every plugin call's wall clock; see "Plugin sandbox clocks" in `.fork/COUPLINGS.md`.
- `POISONED` or the retry rule in `evalAttempt`: `test/plugins.test.ts` timeout and memory cases.
- A host capability or key: the harness in `src/plugins/sandbox-worker.mjs`, `runPassRequests`, `passWants`, and the header of `src/plugins/runtime.ts`.
- A permission name: `PluginPermission`, `hasCapAny`'s alias map, `declaredPermissions` and `grantsFor` in `src/server/app.ts`, and the approve route's default set.
- `PLUGIN_HOOKS`: the `source.includes` pre-checks in `collectSiblingLlmHooks` and `collectInsertCeilings`.
- `LLM_PATCH_FIELDS`: what an `llmRequest` hook may change.
- `writeFileAtomic`: also used by `src/plugins/store.ts`; `test/atomic-write.test.ts`.

## Traps
- Clocks apply per pass. A route with three model rounds makes three worker calls, and `runPluginRoute` sets no overall limit.
- Store writes from a failed pass still apply: `applyStoreWrites` runs before the `!r.ok` check. Files written before a crash stay on disk, and a 500 queues no commit.
- `insertCeiling` checks for a `hooks` grant. Imported plugins get no `hooks` from the approve defaults or `declaredPermissions`, so the hook silently does not run. Confirmed on `main` at 8310b23: a test in `test/plugins.test.ts` (`it.failing`, branch `claude/handbook-findings`, d8ef627) pins it. The official Roleplay plugins say `origin: "local"` in their manifests, so they are not affected; only an imported plugin that declares `hooks` is. The `llmRequest` loop gates on a declared `hooks` plus a granted `llm`; the proposed fix is the same gate here. Not changed: security code, waiting for review.
- A manifest without `origin` is trusted: `hasCapAny` asks for grants only when origin is `imported`.
- `PluginPermission` lists `fs:${string}`, but `hasCapAny` matches only the exact name `fs`.

## Tests that guard it
- `test/plugins.test.ts`: discovery, timeouts and memory isolation, two-phase llm and net, limits, sibling tools, `insertCeiling`, `llmRequest` hooks, grants, timers.
- `test/malicious-plugin.test.ts`: a hostile plugin with all permissions.
- `test/atomic-write.test.ts`, `test/llm-pace.test.ts`, `test/plugin-images.test.ts`, `test/script-box.test.ts`.

## Not verified
- How the QuickJS runner applies `executionTimeout` and `memoryLimit`; the library behind `getRun` was not read, so the 10 s figure is the configured value, not a measurement.
- No test checks `CALL_TIMEOUT_MS` or `CALL_OVERHEAD_MS` directly.
- Whether bundled app plugins set `origin`, and whether any code reads the `fs:` permission form.
- Whether a later out-of-band commit records files a failed route left behind.
