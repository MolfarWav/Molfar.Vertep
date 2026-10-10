# Start here (new session)

Read `CLAUDE.md`, then `.fork/STATE.md`, then this file. One item at a time; commit and push each.
Finished work is not listed here: see STATE ("Released") and git history.

## Queue (open items only; the user picks the order unless it is written here)
Small leftovers from 0.9.4-0.9.6 (the studio bag overwrite, plurals, preset defaults): STATE, "Open".
3. **Card editor** (user, 2026-10-10): `.fork/handoff/card-editor/PLAN.md` (button labels, export
   icon, export variants that keep emotions and the book, emotion images as full-size files, a pass
   over the extra fields with the user).
4. **Group chats** do not work for the user (seen 2026-10-10, cause unknown): look into them for 1.0.0.
5. **Data Bank, the rest** (`.fork/handoff/v094/data-bank.md`): embeddings through `/v1/embeddings`
   with the term search as fallback; "document -> lorebook entries".
6. **Prompt inspector with sources: IN WORK as 0.9.7** (user, 2026-10-06; plan
   `.fork/handoff/inspector-sources/PLAN.md`): on Molfar's page (`src/inspector.ts`), label
   every part of one request by its source (card fields, group members, persona, preset blocks,
   lorebook entries with book/entry/why, Litopys, the dashboard insert, the "Story, move" note, regex
   changes, history and what the budget cut). Likely: Roleplay's `assemble()` and each llmRequest hook
   tag what they add, the engine keeps the tags for the inspector and strips them before the provider.
   0.9.4's why-rows are the lorebook part's data.
6a. **HTML blocks and dialogue colors in the chat** (user, 2026-10-10; for later, not 0.9.7): check how
   model-generated HTML blocks reach and render in a Roleplay chat (example: a reply that draws a sheet of
   paper with a note on it: what is sanitized, what styles survive, light/dark, the phone). With it,
   colored dialogue: each character's lines in their own color, which matters most in group chats with
   several characters (ties into item 4).
7. **"Reply ready" notification** (user, 2026-10-05): a Settings option, off by default, that pops up
   when a reply is ready while the app is in the background (browser Notifications API; check whether
   the Android service should post it). Plan and spec it first.
8. **Molfar's skill usage chip** (left from 0.9.1): show in the chat which skills Molfar loaded.
9. **Release archives named Molfar-Vertep-*** (planned since 0.8.0): `release.yml` still writes
   Chrysalis-*; `self-update.ts` already accepts both.
10. **pi-ai upgrade** (builtin catalogs miss newer models; latest major 1.x): its own careful step on a
    branch with the full test run, the agent and every OAuth flow checked on desktop and APK.
11. **Each only on the user's word:**
    - UI redesign, next round: `.fork/handoff/ui-pr1-shell/BRIEF.md` (read its status header; ask the
      user what is still wanted; Home content and the app-to-Molfar bridge).
    - Five agent tools: `.fork/handoff/agent-tools/HANDOFF.md`.
    - Android APK leftovers: `.fork/handoff/android-apk/HANDOFF.md`; building Roleplay on the phone
      failed with "Failed to fetch" (needs the phone's engine log); compact, hideable shell tabs on phones.
    - Full rename of internal names (`chrysalis` command, `CHRYSALIS_*`, data paths) with data migration.
    - Threads as quests (main / side / everyday threads, side steps under a main one) for the dashboard
      and "Story, move"; "Story, move" with a twist (an event in none of the threads).
    - Dashboard event vocabulary, a bigger one (`EVENT_ROWS` in Roleplay `plugins/relations/plugin.js`):
      list what lands in `other` on real chats, add events with deltas, check cheap sensors pick them.
    - Better Chats page (agreed layout: list + a panel for the selected chat; story so far, last messages,
      the technical side; pins, time groups, sorts, bulk actions).
    - Image studio inside Roleplay (generators as connections, sprites and full-body art bound to cards);
      a model arena; a game-master mode.
    - A visual-novel chat look ("D") as an option.

## How to work here (learned 2026-10-02)
- The user runs the engine from `C:\Users\sulaz\Chrysalis-Engine` with the launcher, which checks out release tags. Work in a git worktree (`git worktree add -b claude/<name> .claude/worktrees/<name> HEAD`, then EnterWorktree with that path), not in the user's running checkout: uncommitted edits there stop the launcher's updates, and its tag checkout rewrites files under you.
- The user pushes release tags (`git tag vX.Y.Z origin/main && git push origin vX.Y.Z`); fast-forward `main` to the release commit first. Release notes: English, user-facing, by the rule in `.fork/RELEASE.md`.
- Bash in this environment eats backslashes in inline scripts: for text with `\n`, `\0` or Windows paths, write the snippet with the Write tool and apply it from a file, or use Edit.
- Launcher tests: separate `LOCALAPPDATA`, port 8799, `CHRYSALIS_OPEN_BROWSER=false`, a pre-made `shortcut-asked` marker (or the test puts a shortcut on the real desktop).
- Pushing to the Roleplay fork's main ships to every install: ask the user first.

## Standing reminders
- Reply in Ukrainian; code, comments, commits and repo files in English. Short comments.
- Delegation rule: Opus/Fable orchestrate, cheaper models execute (Agent tool `model`, or the `ask-model` skill on the desktop).
- Update `.fork/STATE.md` at the end of each item; delete a handoff once its work is released (git keeps it), carrying anything still open into this queue or a live plan.
