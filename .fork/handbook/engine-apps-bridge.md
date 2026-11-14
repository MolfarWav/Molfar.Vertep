# Apps: the shell bridge, read access between apps, app notifications
Verified at: molfar.vertep 8310b23

## What it does
An app runs in a sandboxed frame and calls the shell through `window.molfarShell` (also `chrysalisShell`). The shell's host script accepts a frame message only when its nonce matches the frame's record. Engine requests from a frame are relayed by the shell and checked twice, in the browser and on the server. An app may read declared files of another app only after the user allows it. Shell actions and notifications are for trusted (official) apps only.

## Owners
- `client/public/app-bridge.js` `molfarShell`: frame-side API (`openApp`, `apps`, `openHome`, `openSettings`, `locale`, `notify`, `askMolfar`).
- `client/public/app-bridge-host.js` `shellRequest`: validates shell ops; returns null for every op unless the frame is trusted.
- `client/public/app-bridge-host.js` `handleShell`: forwards a valid op to `CH.onShellRequest` and replies.
- `client/public/app-bridge-host.js` `allowedRequest`: browser copy of the engine-request allowlist.
- `client/public/app-bridge-host.js` `MANAGEMENT_HEADS`: management routes no frame may call (browser copy).
- `client/src/App.tsx` `onShellRequest`: the handler set inside the `App` component; only `notify` and `locale` skip the on-screen check.
- `client/src/app-notices.tsx` `useAppNotices`: per-app counts and toasts; decides what a notify shows.
- `client/src/notice-rules.ts` `appNoticeMode`: picks `none`, `popup` or `system`.
- `src/server/app.ts` `appBridgeAllows`: the engine's copy of the allowlist, the second lock on relayed `/v1/*` requests.
- `src/server/app.ts` `buildApp`: the relay middleware, the `/v1/apps/:id/reads` routes and `peersFor`.
- `src/server/app.ts` `officialApp`: sets the trusted flag from the install record.
- `src/apps/reads.ts` `parseReads`: cleans a manifest's `reads`.
- `src/apps/reads.ts` `setGrant`: records one allow or deny.
- `src/apps/reads.ts` `readState`: a decision counts only while it covers every path the manifest now asks for.
- `src/apps/reads.ts` `peerMounts`: lists the peers a plugin may read, with their folder and patterns.
- `src/apps/reads.ts` `patternMatches`: matches a relative path against a declared pattern.
- `src/apps/manager.ts` `validateAppManifest`: calls `parseReads` when it reads a manifest.
- `src/plugins/sandbox-worker.mjs` `peerSvc`: the plugin's `host.peer` (read, list, stat), with its own matcher.
- `src/paths.ts` `userPaths`: sets `appReads`.

## Reads and writes
- Shell ops from a frame, each sent as `{ type: "shell", op }`:
  - `apps`, `open-app`, `open-home`, `open-settings`, `ask-molfar`: trusted, and the app must be on screen. `open-app` needs an `appId` that passes `SHELL_APP_ID` and is in the launcher list. `ask-molfar` only puts a draft in the composer, at most one per 2 seconds.
  - `open-settings`: a tab from an allowed list, or a `<provider>/<model>` ref, not both.
  - `locale`: trusted, no on-screen check.
  - `notify`: trusted, no on-screen check. `count` is an integer from 0 to 999, `title` at most 80 characters, `text` at most 200. Control characters become spaces.
- Engine routes in `buildApp`:
  - `GET /v1/apps/:id/reads`: each declared read with its state.
  - `PUT /v1/apps/:id/reads/:peer` with `{ granted: boolean }`: writes the decision and clears the plugin cache. 404 if the manifest does not ask for that peer.
  - Both return 403 when the request came through the bridge (`bridgeApp` is set).
  - `DELETE /v1/apps/:id` calls `forgetGrants` and `forgetPeer`. `POST /v1/apps/:id/rename` calls `moveGrants`.
- File: `credentials/<user>/app-reads.json`, written only by the functions in `src/apps/reads.ts`. It sits outside the workspace, so an app cannot write its own grant.
- Limits: 4 peer apps and 10 patterns per app, at most 6 segments per pattern. The worker refuses files over 2 MB and has no write method.

## Flow
1. App calls `openApp`:
   1. `molfarShell.openApp` in `client/public/app-bridge.js` posts `{ type: "shell", op: "open-app", appId }` to the parent.
   2. The message listener in `client/public/app-bridge-host.js` drops the message unless its nonce matches, then calls `handleShell`.
   3. `shellRequest` returns the op only for a trusted frame with a valid `appId`.
   4. `onShellRequest` in `client/src/App.tsx` refuses unless the app's tab is visible and on screen, then calls `openApp`.
   5. The frame gets `shell-result` or `shell-error`.
2. App reads a peer's file:
   1. `validateAppManifest` in `src/apps/manager.ts` runs `parseReads` on the manifest's `reads`.
   2. The shell lists them with `GET /v1/apps/:id/reads` and answers with `PUT /v1/apps/:id/reads/:peer`. `setGrant` writes `app-reads.json`.
   3. A plugin run calls `peersFor` in `buildApp`, which calls `peerMounts`. Only granted peers with a `manifest.json` are mounted, rooted at `apps/<peer>/data`.
   4. `peerSvc` in `src/plugins/sandbox-worker.mjs` checks the path is clean, matches a declared pattern, has no symlink on the way, and is at most 2 MB.
3. App sends a notification:
   1. `molfarShell.notify` sends the op. A frame that is not trusted gets "not allowed for this app".
   2. `shellRequest` checks and cleans the fields.
   3. `onShellRequest` in `client/src/App.tsx` calls `notify` from `useAppNotices`, with no on-screen check.
   4. `useAppNotices` clears the count if the user switched the app's notices off. Otherwise it sets the count, applies a minimum gap to the text, and asks `appNoticeMode` for `none`, `popup` or `system`.
   5. A popup becomes a toast; `system` calls `showAppSystemNotice`. The frame gets `{ shown }`.

## If you change X, also touch Y
- `appBridgeAllows` in `src/server/app.ts`: also `allowedRequest` in `client/public/app-bridge-host.js`, and the cases in `test/security.test.ts` and `test/malicious-plugin.test.ts`.
- `APP_MANAGEMENT_HEADS` in `src/server/app.ts`: also `MANAGEMENT_HEADS` in `client/public/app-bridge-host.js`.
- A new shell op: `molfarShell` in `client/public/app-bridge.js`, `shellRequest` in `client/public/app-bridge-host.js`, a branch in `onShellRequest` in `client/src/App.tsx`, and the op list in `test/security.test.ts`.
- The notify limits in `shellRequest`: also the notify cases in `test/security.test.ts` and `client/src/notice-rules.ts`.
- `patternMatches` in `src/apps/reads.ts`: also `seg` and `matches` in `peerSvc` in `src/plugins/sandbox-worker.mjs`.
- `parseReads` or the `reads` manifest shape: also `validateAppManifest` in `src/apps/manager.ts`, `peerMounts`, and `test/app-reads.test.ts`.
- `userPaths` in `src/paths.ts`: also `readGrants` and `writeGrants` in `src/apps/reads.ts`.
- The delete and rename routes in `buildApp`: keep calling `forgetGrants`, `forgetPeer` and `moveGrants`.

## Traps
- The allowlist exists twice. A route added to one copy only is a gap, or a block the other copy does not share.
- Every shell op needs `trusted`, including `notify`. An untrusted app gets an error for all of them.
- `notify` skips the on-screen check, so a background app can change its count.
- `parseReads` lives in `src/apps/reads.ts`, not `src/apps/manager.ts`. The manager only calls it.
- A decision covers only the patterns it was made for. A manifest that asks for a new pattern makes the user answer again.
- The worker's matcher is a separate copy and must stay in step with `patternMatches`.
- No server code handles app notices. The `notify` op stops in the browser. The `bus.emit` call in `src/server/app.ts` is the agent's event bus, not an app notice.
- The browser copy decodes the path with `decodeURIComponent` and refuses a path that does not decode. The server relies on the router's decoded path.

## Tests that guard it
- `test/security.test.ts`: compares `appBridgeAllows` with `allowedRequest`, and covers the shell op cases, `notify` sanitising and untrusted refusals.
- `test/malicious-plugin.test.ts`: runs `allowedRequest` against blocked paths, including `/reads` and `/reads/<peer>`.
- `test/app-reads.test.ts`: the reads model, the grant file, `peerMounts`, and `host.peer` through `sandbox.eval`, which runs the real worker.
- `test/app-reads-routes.test.ts`: the reads routes, and the plugin following a grant, a revoke and a removed app.
- `test/notice-rules.test.ts` and `test/notice-rules-apps.test.ts`: `appNoticeMode`.

## Not verified
- Whether the `peer` permission check exists in the plugin permission code. The comment in `src/apps/reads.ts` says so; I did not trace it.
- Whether `test/app-reads.test.ts` checks the worker's matcher against `patternMatches` case by case.
- The frame's `call` helper in `client/public/app-bridge.js`, so I did not confirm how it attaches the nonce.
- The definitions of `SHELL_APP_ID`, `SHELL_SETTINGS_TABS`, the minimum-gap constant, and `appNoticeEnabled` in `client/src/notice.ts`.
- `isOfficialSource`, which `officialApp` calls.
- Whether `peersFor` sits inside `buildApp`; inferred from line ranges.
