# 0.9.2: portraits everywhere, connections in one place

Agreed with the user 2026-10-09. Engine branch `claude/v092` (create it from `main` in a worktree:
`git worktree add -b claude/v092 .claude/worktrees/v092 origin/main`). Roleplay parts in the clone
`.claude/worktrees/rp-memory`, on a new branch from the fork's main (4.26.1). Pushing the Roleplay
fork's main ships to every install: ask the user first.

## Carried over from 0.9.1 (check first, all small)
- The in-app APK updater (`android/.../Updater.java`, "Get update"): first real test is on the user's
  phone, a test 0.9.0 build signed with the release key, updating to 0.9.1. Ask how it went; on a
  failure get Logs > Copy and a screenshot.
- Roleplay 4.26.0/4.26.1 UI was not browser-checked: the card id copy button in the character
  editor, the Library map toggle, "Story, move" with an empty composer. Ask the user, or check with
  the `browser-check` skill (it works on Windows now; Roleplay must be installed in its workspace).

## Items, in order
1. **Library portraits on the dashboard and in Soul** (user, 2026-10-08; small, reuse M4c).
   The dashboard strip, wide view and phone sheet (`useAvatars` in Roleplay
   `src/components/dashboard/dash-mount.tsx`) and the Soul tab's characters match names only against
   the chat's card and its group members, so narrator-card and lorebook characters show initials.
   Use the Library's portraits the same way: read `GET /litopys/portraits` (`litopys/portraits.json`,
   one image per lower-cased name, for every chat) and let it win over the card match, then initials;
   open the same `PortraitDialog` (`src/components/library/portrait-dialog.tsx`: upload, take from any
   card/alternate/persona, or remove) from a click on a character's avatar wherever the dashboard
   lists its regular cast (strip, wide view, Soul). One store for both places, so a portrait set in
   the Library shows on the dashboard and back. Branch `memory-m4` holds the code to reuse (`94a7ec7`).
   Roleplay-only: ships as a Roleplay release.
2. **Connections in one place** (user, 2026-10-05; the main item of 0.9.2). BEFORE ANY DESIGN: ask the
   user for the Marinara screenshot of its connection screen. What is wanted:
   - Everything about a connection on one screen: provider, key, model and the model's parameters.
   - Sampling values (temperature, top_p and the like) belong to the model/connection, not to the
     preset. Needs a migration plan for presets that carry them today (Roleplay presets keep samplers
     at the top level and in `studio.samplers`; see the fork's `docs/DATA-FORMATS.md`).
   - Molfar's connections and model must not depend on the Roleplay app (when Roleplay does not build,
     Molfar has no model): connections live in the shell Settings, used by the agent and the apps.
   - Android shows no ready-made provider presets (NanoGPT, OpenRouter...) that the desktop has. Found
     earlier: the catalog is compiled in and the same on Android; on phones Settings hides behind the
     user menu. Confirm and make it reachable.
   - NOT in this item unless the user says so: the `@earendil-works/pi-ai` upgrade for newer builtin
     models (Opus 5.5, Sonnet 5.5). The user wants it as its own careful step (branch, full test run,
     the agent and every OAuth flow checked on desktop and APK).
   Plan with the user (AskUserQuestion) after the screenshot: what moves where, the data format of a
   connection's parameters, the preset migration, what the agent page shows.

## Done means (as always)
`bun run typecheck`, `bun run test` (13 known Windows failures, listed in STATE), `bun run build:client`,
lint of touched files, a browser check of UI changes (dark, light, 390 px), `.fork/STATE.md` updated,
committed and pushed.
