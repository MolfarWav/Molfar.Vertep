# Start here (new session)

Read `CLAUDE.md`, then `.fork/STATE.md`, then this file. One item at a time; commit and push each.
Finished work is not listed here: see STATE ("Released") and git history.

## Queue (open items only; the user picks the order unless it is written here)
00000000000000000000000000000. **1.16.1 prepared** 2026-11-11 (on the owner's word: PRs created and merged by Claude, the owner pushes the tag v1.16.1): #374 one name per embeddings model and vectors that stay on each device, carries Roleplay 4.112.0 = that move, the older presets (FRANKENX, Molfar, Lite) explaining the app's notes (STATE, "RELEASE 1.16.1 PREPARED"). After the tag: close #374 with "How it was solved". Left: the cosine of int8 vs full-precision bge-m3 is unmeasured; the Vertep Medium rename was not done; Settings hint not checked in a browser.
0000000000000000000000000000. **1.16.0 prepared** (#243, #220, #254, #235) (2026-11-10; engine branch `claude/issues-243-220-254-235`, Roleplay branch `claude/issues-220-254-235`; STATE, "ISSUES #243, #220, #254, #235"): atomic plugin file writes, `insertCeiling` in the four memory plugins (+0.3 s a call, the owner decides if it stays on), names across alphabets in lorebook keys, the recollection counter. Left: #235 point 2 (a new issue proposes a per-card default speaker), #220's other #217 items, "translate keys only" (#254). Before a release: refresh the guide translations (`memory` page of Roleplay), merge Roleplay first.
000000000000000000000000000. **1.15.0 prepared** 2026-11-10 (the owner merges Roleplay PR 119 and engine PR 363, pushes the tag v1.15.0): the mailbox takes skills and finished chats, a badge that does not lag, carries Roleplay 4.109.0 = a red Letters failure after three failed passes (#198; STATE, "RELEASE 1.15.0 PREPARED"). After the tag: close #198 with "How it was solved". Left: cost hints and reminders as mailbox kinds (no trigger defined).
00000000000000000000000000. **1.14.1 prepared** 2026-11-10 (the owner merges the PRs and pushes the tag v1.14.1): the local embeddings model runs in a process of its own (#352), carries Roleplay 4.107.0 = Suggest scenes, the message list for closing scenes, #353 (STATE, "RELEASE 1.14.1 PREPARED"). Order: merge Roleplay PR 117, merge engine PR 355, push the tag, update the engine, Update on Roleplay. After the tag: close #352 and #353 with "How it was solved". Left: #354 (automatic scenes), a real-model run of Suggest scenes, and the Windows run of the embeddings model after idle.
0000000000000000000000000. **Social stickers: done** (2026-11-09): Social 0.6.0 released with the animated Molfar pack; #329 and #347 closed. Left: #348 (catalog of free packs), #349 (leftovers). Recipe: `.fork/handoff/stickers/HOWTO-NEW-PACK.md`.
000000000000000000000000. **1.13.2 prepared** 2026-11-09 (the owner pushes the tag v1.13.2): engine code unchanged, carries Social 0.3.0 (STATE, "RELEASE 1.13.2 PREPARED"). Order: merge the engine PR and the Social PR, push the tag, update the engine, Update on Social, allow Roleplay access again on Home. After the tag: #311 closed; #316 (owner decides), #327 (real-model check) and #329 (stickers) stay open.
00000000000000000000000. **1.13.1 prepared** 2026-11-09 (the owner pushes the tag v1.13.1): engine only, `molfarShell.openHome()` (Social PR 12 uses it for the Home button). Social PRs 12 and 13 (forum search, pages, Back, moderation) are merged and ship by Update on Social. After the tag: issues #320 and #322 close only after a real-model check of the forum prompts and of the Roleplay import (the owner's key).
0000000000000000000000. **1.13.0 prepared** 2026-11-09 (the owner merges the PR and pushes the tag v1.13.0): engine only, carries #310 steps 2, 5 and 7 (read access between apps, app notifications, shell theme). Social PR 9 (real Roleplay import, #322) merges after the tag. After the tag: comments on #310 and #322 (#322 after a real-model import was tried).
00000000000000000000. **1.12.2 prepared** 2026-11-08 (the owner merges the PRs and pushes the tag v1.12.2): carries Roleplay 4.103.0 = six Help articles (#235), the Tool Calling note (#274 point 1), the refreshed guide translations (#304). After the tag: close #304 with "How it was solved"; #235 points 2, 4, 5 and #306 stay open.
00000000000000000000. **1.12.1 prepared** 2026-11-08 (the owner merges the PRs and pushes the tag v1.12.1): carries Roleplay 4.102.0 = #264 deep memory over the archived chats of a story (STATE, "RELEASE 1.12.1 PREPARED" and "#264 DEEP MEMORY"). After the tag: close #264 with "How it was solved". #300 (calibrating the meaning switch) waits for a long story; align the stand with the engine's scan window first. The guide translations were refreshed afterwards (#304, merged) and ship in 1.12.2.
00000000000000000. **1.12.0 prepared** 2026-11-08 (the owner merges the PRs and pushes the tag v1.12.0): carries Roleplay 4.100.0 = #288 (far tier, turning points, the Data Bank chain, the wide entry panel, World settings like Litopys; STATE, "#288 FAR TIER AND TURNING POINTS"). Order: merge the engine PR and Roleplay PR 101 (publishes 4.100.0), push the tag, update the engine, Update on Roleplay. After the release: close #288 with "How it was solved". Next: #264 in a new thread (PR A: archive search by words on by default; PR B: vectors, two doors).
000000000000000. **1.11.8 prepared** 2026-11-08 (the user merges the PRs and pushes the tag v1.11.8): carries Roleplay 4.99.0 = #263 (archive) and #293 (leftovers: server-side auto-archive, no model call in an archived chat, read-only preset) and the refreshed guide translations (STATE, "RELEASE 1.11.8 PREPARED"). Order: merge the engine PR and the Roleplay PR (publishes 4.99.0), push the tag, update the engine, Update on Roleplay. After the release: close #263 and #293 with "How it was solved". Next: #288, then #264.
00000000000000. **1.11.7 prepared** 2026-11-07 (the user pushes the tag v1.11.7): carries Roleplay 4.98.0 = #184 P7 (groups in `knownBy`), P8 (ties line, the change line under the newest reply, docs) and step 8 (word-for-word passages) (STATE, "#184 P7 AND P8" and "#184 STEP 8"). Order: merge the engine PR, push the tag, update the engine, then merge the Roleplay PR (publishes 4.98.0) and press Update on Roleplay. After the release: close #184 with "How it was solved" (the release, PRs 94 to 97, the design, what is left in #264 and #291). **The owner's order from here (2026-11-07): #263 (archive finished chats; everything depends on it), then #288 (far tier and turning points), then #264 (verbatim recall: diagnosis first, vectors, chain admission)**; #291 (import a long text) and #220 stay open. #263 and #293 are built (Roleplay PR #98 merged; release 1.11.8 with Roleplay 4.99.0 prepared, STATE "RELEASE 1.11.8 PREPARED"); next is #288.
00000000000000. **1.11.6 prepared** 2026-11-07 (the user pushes the tag v1.11.6): carries Roleplay 4.97.0 = #184 P4 (beliefs) and P5 (review by risk) (STATE, "#184 P4 STEPS 1 AND 2"). Order: merge the engine PR #286 and the Roleplay PR #92 (publishes 4.97.0), push the tag, Update on Roleplay. After the release: tick P4 and P5 in #184. Next in #184: P7, P8, then #263 (archive status) and #264 (verbatim recall); a check of the sensor and worker on a real model (the NanoGPT key in `keys.env` was rejected on 2026-11-07).
0000000000000. **1.11.5 prepared** 2026-11-07 (the user pushes the tag v1.11.5): carries Roleplay 4.96.0 (helper names, silent worker, reserve rows) and engine fixes #143, #163, #180 (STATE, "ISSUES #216, #180, #156, #143, #163, #173 WORKED"). After the tag: merge the Roleplay PR first or together, close what the batch leaves open.
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