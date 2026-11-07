# Start here (new session)

Read `CLAUDE.md`, then `.fork/STATE.md`, then this file. One item at a time; commit and push each.
Finished work is not listed here: see STATE ("Released") and git history.

## Queue (open items only; the user picks the order unless it is written here)
000000000000. **1.11.4 prepared** 2026-11-07 (the user pushes the tag v1.11.4): carries Roleplay 4.95.0 (lorebook folders, drawer, Chat CSS, phone scroll fix; STATE, "RELEASE 1.11.4 PREPARED"). After the tag: Update on Roleplay in Updates; close #279 with "How it was solved"; ask the phone reporter to test.
00000000000. **1.11.3 prepared** 2026-11-06 (the user pushes the tag v1.11.3): carries Roleplay 4.94.0 (Draw places switch always listed, 402 on the description call, drawn places in the story's setting, Look of the pictures; STATE, "RELEASE 1.11.3 PREPARED"). After the tag: Update on Roleplay in Updates, then retry a drawn place.
0000000000. **1.11.2 prepared** 2026-11-06 (the user pushes the tag v1.11.2): carries Roleplay 4.93.0 (vector files split #266/#267, letters offer, #210, Botbooru, card portraits, places drawn on the spot; STATE, "RELEASE 1.11.2 PREPARED"). After the tag: close #266, #267, #210 with "How it was solved"; the Discord reporter presses Embed. Leftovers: #268.
000000000. **1.11.1 prepared** 2026-11-06 (the user pushes the tag v1.11.1): carries Roleplay 4.92.0 (Request size button and alarm #261, one-click continue #262, What fired #253; STATE, "RELEASE 1.11.1 PREPARED"). After the tag: close #261, #262, #253 with "How it was solved". Not tried with a real provider, on Windows or a phone.
00000000. **1.11.0 prepared** 2026-11-05 (the user merges the PRs and pushes the tag v1.11.0): the local embeddings model with one click (#255, transformers.js; STATE, "RELEASE 1.11.0 PREPARED"), carries Roleplay 4.91.0 (the #184 memory batch). After the tag: close #247, #248, #255, #245 with "How it was solved"; tick P6 in #184. Not tried on Windows or a phone. Next: #253, #254, then P4, P5, P7, P8.
0000000. **1.10.6 prepared** 2026-11-05 (the user pushes the tag v1.10.6): carries Roleplay 4.90.0 (voice colours, #245; STATE, "RELEASE 1.10.6"). After the tag: close #245 with "How it was solved"; the Discord reporter and the owner should retry their long chats; a phone was not measured.
000000. **1.10.5 prepared** 2026-11-04 (main holds it; the user pushes the tag v1.10.5): carries Roleplay 4.89.0 (#237, #238, #239), build watchdog #190 (STATE, "RELEASE 1.10.5"). After the tag: close #237/#238/#239 with "How it was solved"; #190 waits for the reporter.
00000. **1.9.3 prepared** 2026-11-01 (main holds it; the user pushes the tag v1.9.3): Agent forge leftovers, carries Roleplay 4.82.0 (STATE, "RELEASE 1.9.3 PREPARED"). Next on the Forge: #140 (Script card, `html` mode B, `batchKey`), #132 write access, and the manual real-model checklist of #141 (`.fork/handoff/forge-checks/MANUAL.md`).
0000. **1.2.2 released** 2026-10-18 (main fast-forwarded; the user pushes the tag v1.2.2): pi 1.2.0, live model lists, #59, desktop rollback (STATE). Next asked: a key-driven start menu in `Molfar-Vertep.bat`; renaming `chrysalis` (exe, command) needs a data migration and the user's word.
000. **Next releases (user, 2026-10-17)**: release P0 for large libraries (#46) with the threads fix (#47) first, on the
   user's word (engine `claude/slim-start-engine` + Roleplay `claude/slim-start`, STATE). Then, easiest first, from the
   ecosystem scan (`E:\Obsidian\Vault\Projects\RP\Molfar Vertep — Ecosystem Scan 2026-10-16.md`): #50 Litopys fact
   decay in ranking (~half a day), #51 Consolidate facts as proposals (1-2 days), #52 worldbuilding as a small plugin
   with recipes + `/worldbuild` (3-4 days, the user wants it extensible). Also open: #48 Dashboard re-read after an
   earlier message changes (~1 day), #49 Z.ai Coding Plan report (waits for the reporter). Image generation for many
   providers (Marinara's list) runs in its own session/branch (`image-providers`). The SillyTavern importer (P1) is
   designed in `.fork/handoff/st-import/FINDINGS.md`, not started.
000a. **World DM P3** (user, 2026-10-18: prepare, not started): `.fork/handoff/world-dm/P3-PLAN.md`; decisions answered; start on the user's word.
00. **1.1.0 released 2026-10-16** (STATE). Open from it: #34 waits for the reporter; Drive sync on a real phone (the user checks the APK); the project site (session branch `claude/beautiful-mccarthy-a159c9`, its own handoff).
0. **Canvas, after stage 1b** (1b shipped in Roleplay 4.44.0, 2026-10-14): the agreed order is in
   `.fork/handoff/canvas/PLAN.md` section 15: settle 4.44.0, Decider (+ Molfar's tool), character
   behaviour preset (+ Molfar's tool), agent forge (+ Molfar's create / validate / dry run), then
   Molfar's work graph and blueprints on the forge's blocks. Items may interleave with other queue
   items while a release settles.
0a. **In-app guide** (user, 2026-10-14, next big item): What's new after an update, section tours, a help "?" with
   "Show me"; Roleplay, the shell and Molfar's page; en + uk. Plan and decisions: `.fork/handoff/guide/PLAN.md`.
0. **UX audit backlog** (user, 2026-10-12, ongoing): take a few items into each release from the audit
   document (STATE, "UX audit backlog", gives where it lives). Not a release of its own.
1. **Group chats = 1.0.0** (user, 2026-10-11): `.fork/handoff/group-chats/PLAN.md` (what exists, what is
   broken, the proposed shape; confirm the shape with the user first). Absorbs item 4 and the colour part of 6a.
1c. **Group scene generation + Chats page**: released as Roleplay 4.38.0 (STATE). Scene generation ran on a real
   model (user, 2026-10-12: a good scenario, the model played by it). Left: the group editor's tabs are icon-only on phones.
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
10. **pi-ai upgrade**: done on branch `claude/project-thread-9jjtzp` for 1.2.2 (STATE, "pi 1.2.0"). Left before the
    release: the agent, every OAuth flow and the APK checked by hand on a real model. From now on: the pin rule in CLAUDE.md.
12. **Long-range: an RPG layer next to the Dashboard** (user, 2026-10-13; idea only): inventory, HP, skills,
    conditions for adventure campaigns, built on the Dashboard sensor and the dice tool.
    `.fork/handoff/rpg-layer/IDEAS.md` (what exists, ideas from Discord and SpatialEngine, open questions).
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
    - Image studio inside Roleplay (generators as connections, sprites and full-body art bound to cards);
      a model arena; a game-master mode.
    - A visual-novel chat look ("D") as an option.

## How to work here (learned 2026-10-02)
- The user runs the engine from `E:\Claude\Chrysalis-Engine` (the desktop; a link in the user's profile folder points to it) with the launcher, which checks out release tags. Work in a git worktree (`git worktree add -b claude/<name> .claude/worktrees/<name> HEAD`, then EnterWorktree with that path), not in the user's running checkout: uncommitted edits there stop the launcher's updates, and its tag checkout rewrites files under you.
- The user pushes release tags (`git tag vX.Y.Z origin/main && git push origin vX.Y.Z`); fast-forward `main` to the release commit first. Release notes: English, user-facing, by the rule in `.fork/RELEASE.md`.
- Bash in this environment eats backslashes in inline scripts: for text with `\n`, `\0` or Windows paths, write the snippet with the Write tool and apply it from a file, or use Edit.
- Launcher tests: separate `LOCALAPPDATA`, port 8799, `CHRYSALIS_OPEN_BROWSER=false`, a pre-made `shortcut-asked` marker (or the test puts a shortcut on the real desktop).
- Pushing to the Roleplay fork's main ships to every install: ask the user first.

## Standing reminders
- Before you change an area, read its entry in `.fork/COUPLINGS.md` (engine) or, for the Roleplay app, `docs/COUPLINGS.md` in its repo: what the area is tied to and the traps (#247). Update the entry in the same change.
- Reply in Ukrainian; code, comments, commits and repo files in English. Short comments.
- Delegation rule: Opus/Fable orchestrate, cheaper models execute (Agent tool `model`, or the `ask-model` skill on the desktop).
- Update `.fork/STATE.md` at the end of each item; delete a handoff once its work is released (git keeps it), carrying anything still open into this queue or a live plan.
