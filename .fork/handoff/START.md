# Start here (new session)

Read `CLAUDE.md`, then `.fork/STATE.md` ("Where things stand"), then this file. One item at a time; commit and push each.
This file holds only what is open. Finished work is in `CHANGELOG.md`, `.fork/release-notes/`, `.fork/STATE.md` and
`.fork/state-archive/`. The old queue (24 "release prepared" lines and the plans of October) is in
`.fork/state-archive/START-queue-until-2026-11-14.md`.
Before touching a system, read its page in `.fork/handbook/INDEX.md`.

## Queue
The queue is GitHub: `gh issue list --state open --label enhancement` and `--label bug`. The owner picks the order unless it is
written here. Bugs are fixed in the Tuesday batch (CLAUDE.md, "Bugs"). Where the next work stands (2026-11-14):

- **Roleplay, the owner's current line:** group dynamics (#404, #405: member voices, check on real free models, tune the wording),
  the Dashboard clock (#406: released, waits for a live session), the turn director (#401: design is in STATE, no code yet),
  Agent forge follow-ups (#396 items left, #402, #403), the persona frame on a real model (#398), the lorebook budget question (#397).
- **Bugs open:** #407 (browser-check fixture does not compile against Roleplay), #394 (relations: the full review of the event
  table by relationship stage), #390 (Updates dialog on a phone, cause unknown: needs the phone's engine log),
  #384, #383, #382 (Stop in the chat), #387 (decision needed: `insertCeiling` on imported installs), #385 (Social tests with fixed days),
  #295, #270.
- **Memory:** #300 (calibrate deep memory on a long chat), #291 (import a long text into the memory), #378.
- **Ideas not scheduled:** #94 collects the old ones (Data Bank rest, plugin speed on phones, RPG layer #123, chat looks and
  modes, Canvas next steps, UI redesign leftovers, card leftovers). Pick one, split it into its own issue first.
- **Handbook (#303):** committed 2026-11-14 and now part of "done" (CLAUDE.md). Waiting for the owner's review.

### Not in an issue yet (make one when you pick it up)
- Molfar's `app_screenshot` tool (part 3.5 of `.fork/handoff/molfar-agent/HANDOFF.md`; not in `src/` as of 2026-11-14).
- Group editor: the tabs are icon-only on phones (noted 2026-10-12, not re-checked).

### Only on the owner's word
- UI redesign, next round: `.fork/handoff/ui-pr1-shell/BRIEF.md` (read its status header; ask what is still wanted). Issue #338.
- Android APK leftovers: `.fork/handoff/android-apk/HANDOFF.md`; ready-made Roleplay build for phones (#337).
- Image studio inside Roleplay, a model arena, a game-master mode, a visual-novel chat look: all in #94.

## How to work here
- The owner runs the engine from source with `Molfar-Vertep.bat` on two machines (CLAUDE.md, "The user"). Work in a git worktree
  (`git worktree add -b claude/<name> .claude/worktrees/<name> HEAD`, then EnterWorktree with that path), not in the running
  checkout: uncommitted edits there stop the launcher's updates, and its tag checkout rewrites files under you.
- Releases follow `.fork/RELEASE.md` (PR merged on GitHub, tag on the merge commit, never a push to `main`). The owner pushes the
  tag unless they say otherwise. Release notes: English, user-facing.
- Bash in this environment eats backslashes in inline scripts: for text with `\n`, `\0` or Windows paths, write the snippet with
  the Write tool and apply it from a file, or use Edit.
- Launcher tests: separate `LOCALAPPDATA`, port 8799, `MOLFAR_VERTEP_OPEN_BROWSER=false`, a pre-made `shortcut-asked` marker (or the
  test puts a shortcut on the real desktop).
- Pushing to the Roleplay fork's `main` ships to every install: ask the owner first.

## Standing reminders
- Before you change an area, read its handbook page and its entry in `.fork/COUPLINGS.md` (engine) or, for the Roleplay app,
  `docs/COUPLINGS.md` in its repo: what the area is tied to and the traps (#247). Update them in the same change.
- Reply in Ukrainian; code, comments, commits and repo files in English. Short comments.
- Delegation rule: `CLAUDE.md`, "Working pattern that saves cost".
- Update `.fork/STATE.md` at the end of each item (short; see its header). Delete a handoff once its work is released (git keeps
  it), carrying anything still open into an issue.
