# Drive sync: design (GitHub MolfarWav/Molfar.Vertep#38)

Decided with the user 2026-10-16 (on top of PLAN.md "Decided"):
- Conflicts: a pull applies everything that does not collide; files changed on both sides are listed,
  each "keep mine" / "take Drive's", with one choice for all at the top. The version not kept is saved
  locally in `data/backups/sync-conflicts/` (kept 30 days). Nothing is lost silently.
- Scope: the whole workspace by default (as the profile backup, without git history, node_modules,
  dist). Switches: Molfar's chats and projects (on), pictures and media (on), keys (off).
- Passphrase: typed once per device, remembered on that device beside the keys; never on Drive.
  Forgotten: the keys on Drive cannot be opened, everything else still pulls; a device that has the
  keys can seal them again with a new passphrase ("replace the keys on Drive").
- Phone sign-in: "Sign in with Google" in the phone's browser, Google returns to the engine on
  127.0.0.1; when that cannot work (the engine opened over the network), paste the address the
  browser ended on.
- OAuth client: one shared "Molfar Vertep" Desktop client the user registers once (steps in
  `GOOGLE-CLIENT.md`), built into the release; anyone can put their own in Settings. Each player
  syncs into their own Drive; the client stores nothing.
- Stores: one interface; Google Drive and "a folder on this computer" now (the folder serves tests,
  Syncthing, Drive for desktop, a USB stick). Dropbox / WebDAV later as one more file.

## Model: like git, three-way, content-addressed
Each device keeps a **base**: the manifest as of its last successful push or pull. A sync compares
three file lists: local now (L), base (B), remote head (R).

| L vs B | R vs B | push | pull |
|---|---|---|---|
| same | same | nothing | nothing |
| changed | same | upload | nothing |
| same | changed | refused: "pull first" | apply |
| changed | changed, L = R | nothing (base moves) | nothing (base moves) |
| changed | changed, L != R | refused: "pull first" | conflict |

"Changed" includes added and deleted. A push needs R.rev = B.rev (nobody pushed since); otherwise
the user pulls first, exactly like git. Deletions travel as absence from the manifest.

## Remote layout (any store)
```
Molfar Vertep sync/              (Drive: a folder in My Drive; folder store: the chosen folder)
  head.json                      { format, kind, product, rev, manifest, device, pushedAt, engine }
  manifests/<rev>.json           the full file list of push number <rev>
  blobs/<sha256>                 file bodies, content-addressed (gzip when it saves >10%)
```
Push order: blobs, then the manifest, then head.json last. An interrupted push leaves the old head
valid; unreferenced blobs are removed by the next push (blobs used by the current and previous
manifest are kept). Rename = no upload (same hash). Drive has no compare-and-swap: head.json is
re-read right before it is written and the push aborts if it moved (manual sync makes the race
window seconds wide).

### manifests/<rev>.json
```json
{
  "format": 1, "kind": "molfar-vertep-sync", "product": "molfar-vertep",
  "rev": 7, "parent": 6, "engine": "1.1.0", "pushedAt": "2026-10-16T12:00:00Z",
  "device": { "id": "a1b2c3d4", "name": "Desktop" },
  "files": {
    "w/apps/roleplay/data/chats/x.jsonl": { "h": "<sha256 of the plain bytes>", "s": 1234, "z": 1 },
    "p/connections.json": { "h": "…", "s": 210 }
  },
  "apps": { "roleplay": { "git": "https://github.com/MolfarWav/Molfar.Vertep-Roleplay.git", "ref": "main" } },
  "secrets": { "h": "<sha256 of the sealed text>", "s": 900, "plain": "<sha256 of the plain bundle>" }
}
```
- `w/<rel>`: a workspace file. `p/<name>`: a private file outside the workspace, only
  `connections.json`, `speech.json`, `sandbox.json` (the same plain list as the profile backup).
- `secrets`: `auth.json` + `mcp.json` sealed with `sealSecrets` (scrypt + AES-256-GCM, from
  `profile-backup.ts`); the blob is the sealed JSON. `plain` lets a device tell whether its keys
  differ without opening them (a hash of high-entropy keys reveals nothing usable).
- `apps`: where each app was installed from (the install record), never its `restored` flag or its
  baseline.

## Local state (per account, outside the workspace)
`data/credentials/<user>/sync.json` (0600): device id and name, scope switches, the target
(`{kind:"drive", folderId, account}` or `{kind:"folder", path}`), the Drive refresh token, the
OAuth client override, the remembered passphrase, the base manifest, and a hash cache
(`rel -> {size, mtimeMs, h}`) so a check does not rehash unchanged files. It never travels:
`credentials/` is outside the workspace, and `sync.json` is not in the sealed set.

## What is in, what is out
In: every workspace file the profile backup takes, minus `.git/`. Always out: `.git`,
`node_modules`, `dist` of apps, `repos/`, staging and discard folders, anything that is not a plain
file (links are never followed). Scope switches:
- `agent` off: `agent/` (Molfar's chats) and `projects/` are left alone both ways.
- `media` off: files with picture/sound/video extensions are left alone both ways.
- `secrets` on: the sealed keys travel; needs a passphrase.
A path switched off on this device is taken from the remote head unchanged when this device pushes,
so switching something off never deletes it on Drive.

## Trust rules on pull (same spirit as the profile import)
- Every path is checked: `w/` + a relative path of plain segments (no `..`, no empty, no
  backslash, no drive letter, no `.git`, nothing the "always out" list names); `p/` only the three
  names. Anything else refuses the whole pull before anything is written.
- Every downloaded body is checked against its hash.
- Writes go to a temp file and rename into place; a target whose parent is a link is refused.
- App code (anything an app has outside `data/`, as `outsideCode` in `apps/update.ts` decides) that
  a pull changes marks the app's install record `restored: true` (git/ref kept, or taken from the
  manifest's `apps` for an app new on this device). The existing check makes it official again by
  itself when its code is byte for byte the official repository's (it also rewrites the baseline).
  Molfar's own edits to an official app's code therefore leave it unofficial on the other device,
  as a profile import does today (known; the reinstall-official follow-up in STATE covers it).
- Keys from Drive replace `auth.json`/`mcp.json` only when opened with the passphrase; the old
  `auth.json` is kept as `auth.json.before-sync`. MCP approvals never travel.
- After a pull: agents evicted (memory and skills may have changed), plugin cache and plugin
  stores dropped, model services rebuilt, MCP rebuilt when keys came, one workspace commit
  `sync: pulled from <device>`, missing app packages installed, changed apps rebuilt.
- A pull or push is refused while the agent runs (409), like a profile import.

## Google Drive
- OAuth 2 for installed apps, PKCE, scope `https://www.googleapis.com/auth/drive.file` only (files
  this client created; the rest of the Drive is invisible). Desktop client id + its client secret
  (Google requires it for Desktop clients; it is not a secret for installed apps) in
  `src/sync/drive-client.ts`, overridable in Settings or by `CHRYSALIS_DRIVE_CLIENT_ID` /
  `CHRYSALIS_DRIVE_CLIENT_SECRET`. Empty in the repo until the user registers the client.
- Redirect: `http://127.0.0.1:<port>/v1/sync/drive/callback`. The callback is a public route that
  only accepts a one-time `state` (32 random bytes, 10 minutes, bound to the account and the PKCE
  verifier). Fallback: `POST /v1/sync/drive/code` with the pasted address.
- Folder: found by name + `appProperties.molfarVertepSync = "1"` among files this client created,
  created when missing. Blobs, manifests and head.json are files inside it, names as above (Drive
  parents are flat: `blobs/<h>` is the name, one folder).
- Uploads: multipart up to 5 MB, resumable above; 4 in parallel; 429/5xx retried with backoff.
- The refresh token is stored in `sync.json`; access tokens only in memory.

## API (shell only; added to the lists in `test/security.test.ts` and `test/malicious-plugin.test.ts`)
- `GET  /v1/sync`: settings and target (no network): `{ device, scope, target, drive: {available},
  passphrase: bool, last: {rev, at, direction} | null, job }`.
- `PUT  /v1/sync/settings`: `{ deviceName?, scope?, passphrase? (>= 8, "" clears), client? }`.
- `POST /v1/sync/drive/start` -> `{ url }`; `GET /v1/sync/drive/callback` (public, HTML);
  `POST /v1/sync/drive/code` `{ url }`.
- `POST /v1/sync/folder` `{ path }` (admin only: it writes on the host).
- `DELETE /v1/sync/target`: forget the target and token (nothing on Drive is deleted).
- `POST /v1/sync/check` -> job; its result: `{ remote: {rev, device, pushedAt} | null,
  push: {files, bytes}, pull: {files, bytes}, conflicts: Group[], behind: bool }`.
- `POST /v1/sync/push` `{ replaceKeys? }` -> job. `POST /v1/sync/pull` `{ rev, resolutions:
  {group: "mine"|"theirs"} }` -> job (409 with the groups when a conflict has no answer).
- `GET  /v1/sync/job`: `{ kind, phase, done, total, bytes, error?, result? }`. Long work runs as
  one job per account (Bun's idle timeout and phone networks make one long request fragile).
- Conflict groups: files grouped by path without the extensions (`chats/x.jsonl` +
  `chats/x.meta.json` are one chat); each `{ id, app, label, files, mine: {at}, theirs: {device, at} }`.

## Settings UI (client, tab "Sync" after "Backup")
Not connected: one line on what it does, two choices ("Google Drive": Sign in with Google; "A
folder on this computer", admins), Advanced: your own Google client. Connected: where, this
device's name, last sync; two main buttons "Push" / "Pull" with counts from the last check and a
"Check" button; progress line while a job runs; "What travels" switches; passphrase field when keys
are on; Disconnect. Conflicts open a dialog: the groups, a two-way choice per row, "for all" at the
top, the note where the losing copy goes. Pull ends with a reload of the shell.
