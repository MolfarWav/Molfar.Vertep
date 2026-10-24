# Batch of 2026-10-24 (issues #118 to #122): handoff to a LOCAL session on the laptop

Why local: the cloud session cannot see the owner's workspace (`data/` is gitignored). The open work needs real chat
files, the Litopys record, the lorebook and a real model. Everything else is already built and pushed.

## 0. Start (10 minutes)
Machine: laptop, engine folder `D:\ROLEPlay\Chrysalis-Engine`. App folder (the owner's Roleplay, NOT a git checkout):
`D:\ROLEPlay\Chrysalis-Engine\data\users\molfarwav2\apps\roleplay`. Read `CLAUDE.md`, `.fork/STATE.md` (top section), this file.
1. Engine branch: `git fetch origin claude/dazzling-faraday-yccu51` and work on it (it only adds notes and `.fork/tools/litopys-report.mjs`;
   the launcher `Molfar-Vertep.bat dev` follows the newest `claude/*` branch).
2. Roleplay code lives in the fork MolfarWav/Molfar.Vertep-Roleplay. Clone it into a worktree, e.g. `D:\ROLEPlay\rp-batch`, branch
   `claude/dazzling-faraday-yccu51` (head d220f27 = fork main 4.65.0 + two commits). `bun install --frozen-lockfile`, then
   `bun run typecheck` and `bun test` (1528 pass expected). Develop on the SAME branch name, push to it.
3. To try the branch in the owner's real app: `data/credentials/<user>/app-upstream/roleplay.source.json` `ref` = the branch, update
   Roleplay in the shell, back to `HEAD` afterwards (the owner decides; ask first).
Rules that matter here: reply in Ukrainian; code, comments, commits in English; no chat text, card text or lorebook text in
issues, commits or public files (the repo is public); no model names in commits; the laptop has no `ask-model` skill.

## 1. What is already built (Roleplay branch, tests green, browser-checked for the two UI parts)
- #121 Vertep Lite: `scripts/vertep-lite.ts` (regenerate the two JSON templates with `bun scripts/vertep-lite.ts`): section
  `lite_control_tail` repeats "Only you" after the newest message (condition `control==Only you`); "Third person, close" keeps the user's mind
  closed; new point of view `pov_strict`. `plugins/engine/plugin.js` has an `olderThan(from, "4.66.0")` step giving a READ-ONLY built-in copy
  the new template. The number 4.66.0 is the NEXT release: bump manifest, `APP_VERSION`, CHANGELOG heading then, or the step never runs.
- #118 / #122 part 1: scenes set apart by hand. `st.marks` in `litopys/chats/<id>.json`; `findScenes(line, dash, cfg, marks)`;
  `POST /litopys/scenes {chatId, op: mark|unmark}`; chapter `marked`; worker prompt hint; message menu Story > "Save as a scene…"
  (`src/components/chat/scene-mark-dialog.tsx`); badge and "Take the mark off" in the chapter card. Tests `test/rp-litopys-marks.test.ts`.
- #120 the left rail scrolls (`src/components/shell/app-shell.tsx`). #119 guard in `/cancelled` (`afterMessageId`, 409), found by reading.

## 2. Work for this session, in order

### A. #118 Litopys does not chapter the scenes the owner sees (needs his data; the main job)
Owner's report (Campus chat, Marko and Alice): 2 to 3 scene changes happened, the chat shows scene headers ("street near campus, morning, day 2"),
but Litopys wrote a chapter only around turn 20 (when his "recent messages" setting of 20 ran out) and put several scenes in one. He expected it to catch
the natural end of a scene. "Rebuild from scratch" answers `no closed scene to rebuild from` although he sees closed, resolved scenes that are not in the record.
Example he cares about: a five-message scene where the user saved a girl from an assault was folded into a longer scene about eating and watching TV:
important, but short.
Hypothesis from reading code (UNVERIFIED): the chat header lists every change of place by exact lower-cased text (`scenesOf`, `plugins/relations/plugin.js`);
Litopys `findScenes` counts a place change only if `samePlace` (containment or Dice similarity < 0.6) says so, then folds any scene shorter than
`scene.minMessages` (default 6) into the one before. Also: `closed` means "a later scene exists"; with no Dashboard snapshots the only boundary is every
`maxMessages` (40), so a chat with a failing sensor never closes a scene before message 40.
Do this:
1. `node .fork\tools\litopys-report.mjs --app data\users\molfarwav2\apps\roleplay` (lists chats), then `--chat "<title part>"`. It prints places, scene flags,
   the scenes Litopys computes, the chapters, worker state. No message text.
2. Read the raw files for that chat when the report is not enough: `data/chats/<id>.meta.json` and `.jsonl`, `data/dashboard/state/<id>.json`
   (`snapshots`, `places`), `data/litopys/chats/<id>.json`, `data/litopys/config.json`, `data/litopys/worker.json`, `data/litopys/wake.json`.
3. Answer: (a) did the sensor give `scene.new` or place changes at all; (b) which of the header's changes did `samePlace` drop; (c) which scenes were under 6
   messages and got folded; (d) why the first chapter came at turn 20 (is the worker waiting on something? check `pickChats`, `retryAt`, `wake`, the worker line in the chat's record);
   (e) what exactly "scenes resolved" meant to the owner (ask him: the Dashboard's resolved threads? closed scenes in the record tab?).
4. Put the findings in #118 as a comment WITHOUT chat text (ids, counts, place names only if the owner agrees).
5. Ask the owner (AskUserQuestion, 3 options, a recommendation) which fix he wants for the automatic part: (a) make Litopys' place rule follow the header,
   (b) lower the default `scene.minMessages` (settings allow 1 to 40; workaround now: set 3 or 4), (c) let any change the header shows close a scene even when short,
   plus an importance signal from the sensor. Then build it with tests, and update `docs/DATA-FORMATS.md` if the record changes.
Also decide with him #122 part 2: Litopys settings per chat (`config` object in the chat's record merged over the global one; settings screen in the chat's record sheet).

### B. #121 Vertep Lite on the owner's real model
Ask which free model he uses and a chat where it wrote for him. Take the real request from the prompt inspector (agent page or the chat's prompt peek), check that
`lite_control_tail` is the last thing after the newest message and that the pick "Only you" is active. If the model still writes for the user: try shorter, positive wording
at the end, a one-line variant for small models, or a stricter second option. Measure tokens (`presetCosts`; the test keeps total under 2500 and heaviest pick under 3000).

### C. #119 doubled user message after Stop and delete
Reproduce on the laptop with a real streaming model: send, Stop mid-stream, delete the stopped reply. Look at `data/chats/<id>.jsonl` (two user lines with the same
text? their `at` and ids), and at the engine log. The guard in `/cancelled` covers one race (engine commit beat the abort); if the duplicate comes from somewhere else
(for example the staged `pending-user` bubble surviving a skipped refresh, see `refreshChat` and `bumpMutate` in `src/lib/store.ts`), fix that and add a test.

### D. #95 World DM writes trivia
Owner's example: lorebook entries "Marko's backpack" (key "рюкзак"), "Alice's water bottle" (key "бутылка воды") in the world "Campus ..." fire on every mention.
Look at the lorebook file in `data/lorebooks/` and the World DM prompt/route (`plugins/` + `src/components/world/`); propose a filter (person, place, rule, secret; not carried objects)
and a cap on entries per turn. Ask before changing the prompt.

### E. Small
- On a phone the message "More" menu is taller than the screen and its Delete group is cut off (seen in the browser check; not known whether older). File an issue or fix.
- The scene dialog's select text is cut on a phone (native control); numbering stays visible. Fine unless the owner minds.

## 3. Done means
`bun run typecheck`, `bun test`, `bunx biome lint` on touched files; UI checked in a browser (skill `browser-check`, dark, light, 390 px); CHANGELOG "Unreleased"; STATE.md updated;
committed and pushed to the same branch name in the fork (and the engine branch for notes). No release, no merge to the fork's main, no version bump without the owner's word.
Issues stay open until the release; closing comment "How it was solved" with release, commits, design, deviations, how it was checked.
