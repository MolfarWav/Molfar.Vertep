# Drive sync: push on one device, pull on another (GitHub MolfarWav/Molfar.Vertep#38)

Status 2026-10-16: idea agreed with the user, nothing built. This file is the brief for the session
that designs and builds it. Read `CLAUDE.md`, `.fork/STATE.md`, then this. Plan it with the user
(AskUserQuestion) before writing code: the open questions below are theirs to settle.

## What the user wants
Finish a session on the desktop, press push (to Google Drive), close the app, take the phone, press
pull and go on playing. And back. Like git, not live sync. Everything a game needs to continue:
chats, cards with images, presets, lorebooks, personas, regex, Litopys, the dashboard state; apps too.
The first push uploads everything, later ones only what changed. Keys, connections and model
settings may travel too, but only encrypted. The full profile export with keys (Settings → Backup)
stays as it is; this is not a replacement for it.

## Decided (user, 2026-10-16)
- Manual push / pull per device. No background sync.
- Only changed files go up or down after the first push; deletions travel too.
- Secrets only encrypted, with a passphrase the user types; it is never stored on Drive.
- In the engine, not in a Roleplay plugin: it serves every app and the Android build, and the plugin
  sandbox's per-route time limit (see #37) would not hold a sync of megabytes.
- Released together with the 1.1.0 fixes (branch `claude/v110-fixes` in the engine, `claude/v110`
  in the Roleplay fork); build it on its own branch from `claude/v110-fixes`, merged at release.

## Open questions for the user
1. Conflicts: this device has unpushed changes and Drive has a newer push from the other device.
   Proposal: never overwrite silently; show what differs (per chat / per file group) with "keep mine"
   / "take theirs"; a pull with no local changes just applies.
2. Scope switches: what is in by default (the whole workspace? Roleplay data only?) and what the user
   can switch off (images, apps, secrets).
3. Passphrase: one per Drive folder; what happens when it is forgotten (secrets lost, the rest pulls).
4. Phone sign-in to Google: the Android build's browser flow, or a code pasted from the desktop.
5. Other stores later (Dropbox, WebDAV, a plain synced folder): build the transport behind one
   interface from the start, or Drive only for now.

## What exists to build on (verify before relying on it)
- `src/profile-backup.ts`: the whole profile as one zip, with `secrets.enc` (scrypt + AES-256-GCM,
  password-based) and careful import rules (entry names checked, `.git` config and hooks never
  taken, restored apps marked `restored`). Reuse its encryption and its trust rules; sync is the same
  data moved per file.
- `src/paths.ts`: workspace layout; keys live in `auth.json` outside the workspace, connection
  definitions next to them.
- `src/git.ts`: every workspace is an isomorphic-git repository with history. A change set since the
  last push could come from it (commits since a recorded head) or from a manifest of file hashes;
  decide which. The workspace repo commits only text entities (see its header): images and binaries
  need the hash manifest anyway.
- `src/apps/backup.ts`: one app as a zip (fflate), size caps.
- Plugins cannot do this (sandbox, 10 s per route pass); `host.zip.build` (1.1.0) packs text natively
  if a plugin side is ever needed.

## Google Drive specifics to check
- OAuth with the `drive.file` scope only (files the app created): no access to the rest of the
  user's Drive. Where the OAuth client id comes from for a self-hosted engine (the user's own Google
  Cloud project vs a shared one) is a real question: a shared client id in a public repo is fine for
  installed apps (PKCE, loopback redirect), but check Google's current policy for unverified apps.
- Resumable uploads for big images; a manifest file on Drive listing path, hash, size, device, time.
- Refresh tokens are secrets: store them with the keys (`auth.json`), never in the workspace.

## Done means (besides CLAUDE.md "Done means")
- Push and pull tested between two engines on one machine (two data dirs), with a conflict.
- Android: at least a manual run of pull on the phone build, or a clear note why not yet.
- A Settings section a player finds without help (ux-review), en + 13 other locales in `client/`.
- README and the in-app guide mention it.
