# Releasing Molfar Vertep

Fork-only. The version line is the fork's own (1.16.3 today) and independent of upstream's; nothing is merged from upstream any more.
An addon (Roleplay, Social) is released from its own repository and needs no engine release; an engine release happens only when engine code changed (`CLAUDE.md`).

## Steps
1. **Pick the number.** A significant change is a minor bump (1.16.0 -> 1.17.0); a small fix is a patch (1.16.0 -> 1.16.1).
2. **Checks pass** on the branch: `bun run typecheck`, `bun run test` (on Windows a known set fails on `main` too: symlinks, file modes, the release installer, store/builder, sandbox shell; see the checks lines in `.fork/STATE.md`), `bun run build:client`.
2a. **Handbook check:** `node .fork/tools/check-handbook.mjs .fork/handbook engine=. roleplay=<Roleplay clone> social=<Social clone>` must report 0 missing. A page that fails does not block the release; it is fixed in the next change that touches its system and listed in `.fork/handbook/INDEX.md` under "Stale pages" until then.
3. **Bump `package.json` `version` before the tag.** Update checks compare the release's `tag_name` (a leading `v` is dropped) with this version; a mismatch makes every copy offer the update forever, and `release.yml` refuses a tag that does not match.
4. **CHANGELOG.md:** rename `## Unreleased` to `## X.Y.Z (YYYY-MM-DD)` and start a new empty `## Unreleased` above it.
5. **Release notes:** write `.fork/release-notes/X.Y.Z.md`, the body of the GitHub release. `release.yml` uses it; without it GitHub generates notes from commits. It is a full, correct preview for users, not a copy of the CHANGELOG (the user's rule, 2026-10-02):
   - First half: every change that improves play, the UI or the agent, each under its own large heading with an emoji (`### 🔄 Updates in one place`), explained in plain words: what the user sees, what it does for them, what changed from before. Include what the release brings through app updates (Roleplay versions), and say how to get those.
   - Then `## 🛠️ Fixes` for user-visible bug fixes.
   - Then `## Other changes`: minor and technical items, one line each.
   - End with how to get it (source, downloads, app updates) and a link to CHANGELOG.md.
   - Every claim checked against the code or the app's CHANGELOG; nothing that ships later.
   - Written in English (GitHub release pages are English; the user's rule, 2026-10-02).
6. **Main:** the release is built only from a tag on `main` (`release.yml` refuses a tag whose commit is not an ancestor of `origin/main`). Open a PR from the release branch and merge it on GitHub (the way 1.16.1 went); never push to `main` directly. Tag the merge commit.
7. **The tag:** the user pushes it, or Claude in a desktop session when the user says to push the release (v0.9.7 was pushed that way; a cloud session's proxy cannot push tags). From a terminal in the engine folder:
   ```
   git fetch origin
   git tag vX.Y.Z origin/main
   git push origin vX.Y.Z
   ```
   Push only the tag. Do NOT create the release in GitHub's "Draft a new release" form: the workflow creates the release itself, and a release that already exists makes it fail.
8. **The workflow** (`.github/workflows/release.yml`, tags `v*`): checks the tag matches `package.json` and sits on main, builds `Molfar-Vertep-<version>-<target>` archives (`.zip` for Windows, `.tar.gz` otherwise, `scripts/dist.ts`) and `Molfar-Vertep-<version>-android-arm64.apk`. Releases up to 0.9.0 used `Chrysalis-*` names; `self-update.ts` (`pickAsset`) accepts both, so an old install can still find its archive, publishes the release as "Molfar.Vertep X.Y.Z" with the notes file. The Docker image goes to `ghcr.io/molfarwav/molfar-vertep` (`:vX.Y.Z` and `:latest`). npm publishing runs only when an `NPM_TOKEN` secret exists (the fork has none).
9. **Verify:** the release page lists the archives; an older copy's update check ("Check for updates") offers the new version. A copy run from source starts the new release through `Molfar-Vertep.bat`, which picks the newest tag.

## One-time setup
- GitHub keeps a fork's workflows disabled until the owner enables them: repository > Actions tab > "I understand my workflows, go ahead and enable them". That has been done; the note stays for a new fork of this repository. (0.1.0 has no archives because workflows were off then and its tag had no `v`.)

## Keep apart
- `APP_API_VERSION` (`src/install.ts`) is the upstream app contract this engine keeps (1.0.2). Apps check their `engine` range against it, not against the fork version. Raise it only when an upstream merge changes the app contract.
- The tag `0.1.0` (no `v`) stays as it is. The in-app update check (`src/updates.ts`) drops a leading `v`, so it reads both forms; `Molfar-Vertep.bat` lists only `git tag -l "v*"` tags of the form `vX.Y.Z`, so it never picks `0.1.0`. Every new tag must be `vX.Y.Z`: a tag the launcher's pattern does not match is invisible to the source channel.
