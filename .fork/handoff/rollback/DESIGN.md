# Roll back to the previous version: design draft

Asked by the user 2026-10-18: a button that returns Molfar Vertep to the previous (working) version even when
everything is broken; back up only what the release changes. Scope and release not decided yet (proposed: its
own release after 1.2.2). Nothing below is built.

## What exists
- Downloaded program (`src/self-update.ts`): the update renames exe + `resources/` to `*.old`, snapshots
  `users.json`, `sessions.json`, `format.json`, `credentials/` to `data/.update-snapshot`, and a guard parent
  restores both if the new version dies on its first start. After the first healthy start `*.old` and the
  snapshot are deleted, so a problem found a day later has nothing to go back to.
- From source (`Molfar-Vertep.bat`): checks out the newest `v*` tag (or a `claude/*` branch with `dev`). No
  "previous" option.
- Apps: every app update is its own git commit in the workspace (`src/apps/update.ts`); the agent already
  points at it. No "undo last app update" button.
- APK: Android refuses to install an older APK over a newer one (only uninstall + install, which wipes data).

## Proposal
Code never needs a local backup: every release stays on GitHub (tags, archives, APKs). The risk is DATA a
newer version migrated. So:
1. **Data snapshot per update, kept until the next update** (not dropped after the first start): the engine's
   own files the new version may migrate (today's SNAPSHOT_FILES + credentials). Workspaces are git: record
   each workspace's HEAD at update time instead of copying it. Small: a few KB plus commit ids.
2. **Rollback = previous release's code + that snapshot + workspace HEADs left as they are** (new commits stay
   in history; only engine-format files go back). Refuse when the snapshot is from another version.
3. **Entry points outside the engine** (works when the engine does not start):
   - source: `Molfar-Vertep.bat previous` (checks out the tag before the current one, restores the snapshot);
     when the engine exits on start, the launcher offers it.
   - downloaded program: keep `*.old` until the next update instead of deleting it after the first run
     (one extra program copy, ~100 MB), plus a `--rollback` flag and a `Molfar-Vertep-Restore` shortcut.
   - also a Settings > Server button for the case where the engine runs but behaves badly.
4. **APK** (separate step): keep the previous engine payload inside the app's files and let the native start
   screen run it; needs the native shell to stay compatible with one older payload.
5. **Apps**: "Undo the last update" on an app = revert its update commit (merge-aware), separate step.

## Open questions for the user
- Keep `*.old` (~100 MB) or re-download the previous archive on rollback (needs internet when broken)?
- One step back only, or pick any earlier release?
