# Sync between a user's devices

Verified at: molfar.vertep 32fc4f6

## What it does
- Compares a user's workspace files by SHA-256 hash against one shared store: a Google Drive folder or a local folder.
- Works like git with three lists: local files, the base (state at this device's last push or pull), and the remote head.
- Push uploads what changed here; pull applies what changed there. Files changed on both sides wait for a choice.
- Runs only when asked (check, push, pull). No timer in `src/sync/` or the sync routes was found.
- Key files (`auth.json`, `mcp.json`) travel only sealed with a passphrase, and only when the keys switch is on.

## Owners
- `src/sync/manifest.ts` `plan`: sorts each path into up, down, conflicts or agreed.
- `src/sync/manifest.ts` `inScope`: applies the agent, media and secrets switches.
- `src/sync/manifest.ts` `syncPathOk`: checks each path of a remote manifest; one bad path refuses the pull.
- `src/sync/manifest.ts` `groupConflicts`: merges a chat's files (`x.jsonl`, `x.meta.json`) into one choice.
- `src/sync/engine.ts` `check`: computes what a push and a pull would do, with no writes.
- `src/sync/engine.ts` `push`: uploads blobs, then the manifest, then `head.json` last.
- `src/sync/engine.ts` `pull`: stages downloads, checks hashes, then writes; throws `ConflictError` before any write.
- `src/sync/engine.ts` `decodeBlob`: reads the tag byte, gunzips, checks size and hash.
- `src/sync/local.ts` `scanLocal`: walks the workspace and private files, reusing cached hashes.
- `src/sync/local.ts` `applyFile`: writes through a temp file and rename, or deletes; refuses links.
- `src/sync/local.ts` `conflictsDir`: makes the conflict backup folder and removes folders older than 30 days.
- `src/sync/store.ts` `SyncStore`: the store interface; `FolderStore` implements it for a folder.
- `src/sync/drive.ts` `DriveStore`: the same layout on Google Drive; `DriveAuth` refreshes the token in memory.
- `src/sync/drive.ts` `SignIns`: one-time sign-in states, valid 10 minutes; `findOrCreateFolder` finds the Drive folder.
- `src/sync/state.ts` `readState`, `writeState`: this device's `sync.json`, written with mode 0600.
- `src/sync/service.ts` `SyncJobs`: one job per account; `storeFor` builds the store from the target.
- `src/profile-backup.ts` `skippedInWorkspace`: the exclusion list sync shares with the profile backup.
- `src/profile-backup.ts` `PLAIN_PRIVATE`, `SECRET_FILES`, `sealSecrets`: private files, key files, passphrase sealing.
- `src/paths.ts` `APP_CACHE`, `isDiscardDir`: the app cache and discard folder patterns.
- `src/server/app.ts` `syncCtx`, `setSyncTarget`, `agentBusy`: helpers the sync routes use.
- `client/src/sync-settings.tsx` `SyncTab`, `ConflictPanel`: the settings tab and the conflict choice panel.

## What is synced and what is not
Synced (`w/` is a workspace file, `p/` a private file):
- Every workspace file, app code and app data included. Chats and `projects/` only when the agent switch is on; pictures, sound and video only when the media switch is on.
- `p/connections.json`, `p/speech.json`, `p/images.json`, `p/sandbox.json` (the four names in `PLAIN_PRIVATE`).
- `secrets.enc`: `auth.json` and `mcp.json` sealed together, only with the keys switch on.

Not synced:
- `.git` at any depth (`workspacePathOk` rejects any `.git` segment).
- `node_modules`, `*.discard-*` folders, `repos/`, `.staging` folders, `apps/<id>/dist`, `assets-store/.trash`.
- `apps/<id>/data/.cache/` (`APP_CACHE`). Symlinks are skipped.
- Credentials, `sync.json`, `sync-cache.json`, the refresh token and the passphrase: all outside the workspace.

## One sync pass, step by step
1. Scan: `scanLocal` lists the workspace and the four private files, reusing hashes when size and mtime match `sync-cache.json`.
2. Read the remote: `readHead`, then that rev's manifest. `checkManifest` checks every key and hash.
3. Plan: `plan` compares local, base and remote. Keys out of scope are ignored.
4. Push guard: 409 when the head rev differs from the base rev ("pull first"), or while the agent runs.
5. Push upload: only changed files the store lacks, four at a time. A blob is gzipped only when that saves more than 10%.
6. Push commit: write `manifest-<rev>`, read the head again, then write `head.json`. If the head moved, the new manifest is deleted and the push fails.
7. Push finish: base and `last` are updated; `collectGarbage` keeps the current and previous manifests and their blobs.
8. Pull guard: 404 when nothing was pushed. A group without a choice raises `ConflictError` (409). Keys are opened first, so a wrong passphrase stops the pull.
9. Pull stage: downloads go to `.sync-staging/<user>` and every hash is checked. Versions replaced by a "theirs" choice are copied to the conflict folder.
10. Pull apply: files are applied in sorted order; keys last, with `auth.json` first copied to `auth.json.before-sync`. Then base and `last` are set.
11. After the pull (route): agents are evicted, model services, plugin stores and plugin cache dropped, MCP rebuilt if keys came, and `git.commitAll` writes "sync: pulled from <device>".

## Conflicts and deletions
- A conflict is a path changed on both sides to different content. Pull needs `mine` or `theirs` per group, or one `all` choice.
- `mine`: the local file stays and the base moves to the remote, so the next push sends it. The remote version is not saved locally.
- `theirs`: the local version is copied to `data/backups/sync-conflicts/<user>-<timestamp>/` first, then the remote version is applied.
- Backup folders older than 30 days are removed only when a `theirs` choice creates a new folder.
- A file deleted here leaves the manifest, so the deletion travels. A file deleted there is removed by pull, with empty folders above it.
- Out-of-scope paths keep the remote's entry on push, so switching a switch off never deletes anything remote.
- Keys removed here are never deleted by pull or push.
- Push with `replace` makes the base the in-scope remote files, so the sync ends up holding exactly this device's in-scope files.

## Credentials and routes
- `credentials/<user>/sync.json` (mode 0600) holds device id and name, scope, target, the Google refresh token, the remembered passphrase, any own OAuth client, base and `last`, all as plain JSON.
- Key files are sealed with scrypt and AES-256-GCM (`sealSecrets`). The passphrase needs at least 8 characters.
- Routes in `src/server/app.ts`: `GET /v1/sync`, `PUT /v1/sync/settings`, `POST /v1/sync/drive/start`, `GET /v1/sync/drive/callback` (public, in `PUBLIC_PATHS`), `POST /v1/sync/drive/code`, `POST /v1/sync/folder` (admin only, folder outside the data folder), `DELETE /v1/sync/target` (forgets the target, deletes nothing in the store), `POST /v1/sync/check`, `POST /v1/sync/push`, `POST /v1/sync/pull`, `GET /v1/sync/job`.
- One job per account at a time; a second start gets 409.

## If you change X, also touch Y
- A synced path rule: `skippedInWorkspace` in `src/profile-backup.ts` (shared with the profile backup), then `workspacePathOk` and `inScope` in `src/sync/manifest.ts`.
- A private plain file: `PLAIN_PRIVATE` in `src/profile-backup.ts`; `scanLocal` and `syncPathOk` read that list.
- A key file: `SECRET_FILES` in `src/profile-backup.ts`, then `readSecretBundle` in `src/sync/local.ts`.
- A store: implement `SyncStore` in `src/sync/store.ts`, then `storeFor` in `src/sync/service.ts`.
- The manifest or blob format: bump `SYNC_FORMAT` in `src/sync/manifest.ts`; check `encodeBlob` and `decodeBlob` in `src/sync/engine.ts`.
- A route or setting: `src/server/app.ts`, `viewOf`, `client/src/sync-settings.tsx`, `test/sync-routes.test.ts`.
- What a pull changes for open apps: the pull callback in `src/server/app.ts`.

## Traps
- `BUILTIN_CLIENT` in `src/sync/drive.ts` holds a client id and secret in the code, while the design doc says the client is empty until registered. Review this; the value is not copied here.
- The design doc lists three private files; `PLAIN_PRIVATE` has four. Code wins.
- Keep mine saves nothing locally; the design says the version not kept is saved. Only `theirs` saves.
- Workspace-root `.cache/` is synced. Only `apps/<id>/data/.cache/` is excluded.
- Drive has no compare-and-swap. Push re-reads the head, but a race window of seconds remains.
- The refresh token and passphrase sit in plain JSON in `sync.json`.
- Pull applies files one by one after the checks; a failure midway leaves the base unchanged.
- `replace` deletes remote files that are in scope here but absent here.
- Sync is manual; an idle device stays stale.

## Tests that guard it
- `test/sync.test.ts`: the three-way plan, two-device push and pull, keep mine, replace, keys and scope, crafted manifests, bad blobs, the Drive store through a fake Drive, and the area summary.
- `test/sync-routes.test.ts`: push and pull through the routes with a conflict group, the admin folder rule and passphrase minimum, and the public Google callback.

## Not verified
- The design doc says `test/security.test.ts` and `test/malicious-plugin.test.ts` list the sync routes. I found no sync route name in them and did not check further.
- Where embedding vectors are stored, and whether that falls under the workspace.
- Whether MCP approvals are excluded from sync, as the design doc says.
- Whether any automatic sync trigger exists outside the sync module and routes.
- Whether app manifests declare derived data beyond `.cache/`.
- `.fork/COUPLINGS.md` has no "sync" line.
