# Start here (new session)

Read `CLAUDE.md`, then `.fork/STATE.md`, then this file. One item at a time; commit and push each.
Finished work is not listed here: see STATE ("Released") and git history.

## Queue (open items only; the user picks the order unless it is written here)
0. **UX audit backlog** (user, 2026-10-12, ongoing): take a few items into each release from the audit
   document (STATE, "UX audit backlog", gives where it lives). Not a release of its own.
1. **Group chats = 1.0.0** (user, 2026-10-11): `.fork/handoff/group-chats/PLAN.md` (what exists, what is
   broken, the proposed shape; confirm the shape with the user first). Absorbs item 4 and the colour part of 6a.
1c. **Group scene generation** (user, 2026-10-12, "for the future"): the group editor's Scene tab has a
   "Generate scene" button marked "soon". First the shared scenario, then the openings (they follow from
   it). Before generating the scenario, ask the user what they want or offer modes, for example "Use
   the cards' information" and "Something wild".
1a. **1.0.1 = the phone version of the app** (user, 2026-10-11; later, scope to be set).
1b. **Molfar, the next agent batch** (after 1.0.1): part 3 of `.fork/handoff/molfar-agent/HANDOFF.md`
   (3.7 skills that learn, then 2.5 app_screenshot) and its live checks.
2. **Card editor leftovers**: `.fork/handoff/card-editor/PLAN.md` (the extra fields with the user, Lorebary
   extras, emotion images as full-size files).
5. **Data Bank, the rest** (`.fork/handoff/v094/data-bank.md`): embeddings through `/v1/embeddings`
   with the term search as fallback; "document -> lorebook entries".
6. **Plugin speed on phones** (from 0.9.7): the sandbox gives every route pass 10 s on every device and a
   phone runs QuickJS several times slower. Left after 0.9.7: Roleplay reads each regex script as its own
   host call (150 files ~0.3 s per pass; a bulk read in the engine would cut it); a longer limit on
   Android, only together with speed work. Measure first: `.fork/bench/`. The Discord player's own cause
   (2026-10-11) was a Roleplay that had not finished building on their phone; the 0.9.7 speed-ups stand on
   their own. Worth a look: how a half-built app shows itself (they saw only route timeouts) and whether the
   shell can say "this app did not finish building" with a rebuild button.
6a. **HTML blocks and dialogue colors in the chat** (user, 2026-10-10; for later, not 0.9.7): check how
   model-generated HTML blocks reach and render in a Roleplay chat (example: a reply that draws a sheet of
   paper with a note on it: what is sanitized, what styles survive, light/dark, the phone). With it,
   colored dialogue: each character's lines in their own color, which matters most in group chats with
   several characters (ties into item 4).
7. **"Reply ready" notification** (user, 2026-10-05): a Settings option, off by default, that pops up
   when a reply is ready while the app is in the background (browser Notifications API; check whether
   the Android service should post it). Plan and spec it first.
10. **pi-ai upgrade** (builtin catalogs miss newer models; latest major 1.x): its own careful step on a
    branch with the full test run, the agent and every OAuth flow checked on desktop and APK.
11. **Each only on the user's word:**
    - UI redesign, next round: `.fork/handoff/ui-pr1-shell/BRIEF.md` (read its status header; ask the
      user what is still wanted; Home content and the app-to-Molfar bridge).
    - Android APK leftovers: `.fork/handoff/android-apk/HANDOFF.md`; building Roleplay on the phone
      failed with "Failed to fetch" (needs the phone's engine log); compact, hideable shell tabs on phones.
    - Full rename of internal names (`chrysalis` command, `CHRYSALIS_*`, data paths) with data migration.
    - Threads as quests (main / side / everyday threads, side steps under a main one) for the dashboard
      and "Story, move"; "Story, move" with a twist (an event in none of the threads).
    - Dashboard event vocabulary: the bigger one shipped in Roleplay 4.36.0
      (STATE.md). Left: what lands in `other` on real chats (debug `unknownEvents`); a fuzzy match for ids
      small models invent (`jealousy`, `check_on_her`).
    - Better Chats page (agreed layout: list + a panel for the selected chat; story so far, last messages,
      the technical side; pins, time groups, sorts, bulk actions).
    - Image studio inside Roleplay (generators as connections, sprites and full-body art bound to cards);
      a model arena; a game-master mode.
    - A visual-novel chat look ("D") as an option.

## How to work here (learned 2026-10-02)
- The user runs the engine from `E:\Claude\Chrysalis-Engine` (the desktop; `C:\Users\sulaz\Chrysalis-Engine` links to it) with the launcher, which checks out release tags. Work in a git worktree (`git worktree add -b claude/<name> .claude/worktrees/<name> HEAD`, then EnterWorktree with that path), not in the user's running checkout: uncommitted edits there stop the launcher's updates, and its tag checkout rewrites files under you.
- The user pushes release tags (`git tag vX.Y.Z origin/main && git push origin vX.Y.Z`); fast-forward `main` to the release commit first. Release notes: English, user-facing, by the rule in `.fork/RELEASE.md`.
- Bash in this environment eats backslashes in inline scripts: for text with `\n`, `\0` or Windows paths, write the snippet with the Write tool and apply it from a file, or use Edit.
- Launcher tests: separate `LOCALAPPDATA`, port 8799, `CHRYSALIS_OPEN_BROWSER=false`, a pre-made `shortcut-asked` marker (or the test puts a shortcut on the real desktop).
- Pushing to the Roleplay fork's main ships to every install: ask the user first.

## Standing reminders
- Reply in Ukrainian; code, comments, commits and repo files in English. Short comments.
- Delegation rule: Opus/Fable orchestrate, cheaper models execute (Agent tool `model`, or the `ask-model` skill on the desktop).
- Update `.fork/STATE.md` at the end of each item; delete a handoff once its work is released (git keeps it), carrying anything still open into this queue or a live plan.
