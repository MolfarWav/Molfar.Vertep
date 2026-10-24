# Batch of 2026-10-24 (issues #118 to #122): what is done, what needs data

Roleplay fork branch `claude/dazzling-faraday-yccu51` (pushed, not merged, not released; head after 2d6cc78 and d220f27).
Engine branch of the same name carries only these notes and `.fork/tools/litopys-report.mjs`.

## Done in the Roleplay branch (tests: 1528 pass, typecheck clean; NOT checked by me in a browser, see below)
- #121 Vertep Lite: `scripts/vertep-lite.ts` repeats "Only you" as a section after the newest message (`lite_control_tail`,
  condition `control==Only you`), "Third person, close" says the user's mind is closed, new point of view "Third person,
  strictly the character" (`pov_strict`). Template regenerated; `plugins/engine/plugin.js` has an `olderThan(from, "4.66.0")`
  step that gives a READ-ONLY built-in copy the new template (an editable copy keeps its text). The version number 4.66.0 is
  the next release's: bump manifest, `APP_VERSION`, CHANGELOG heading when releasing, or the step never runs. Not tried on a
  real model: whether the repeated line stops a small free model from writing the user is the owner's test.
- #118 / #122 part 1: scenes set apart by hand. `st.marks` in `litopys/chats/<id>.json`, `findScenes(line, dash, cfg, marks)`,
  `POST /litopys/scenes {chatId, op: mark|unmark}`, worker prompt hint, chapter `marked`, message menu "Save as a scene…"
  (`src/components/chat/scene-mark-dialog.tsx`), badge and "Take the mark off" in the chapter card. Format in DATA-FORMATS.
  Tests `test/rp-litopys-marks.test.ts`.
- #120 rail scroll (`app-shell.tsx`), #119 guard in `/cancelled` (`afterMessageId`).

## Found by reading code, not verified against real data (#118)
The chat's scene header (`SceneBefore`, `scenesOf` in `plugins/relations/plugin.js`) shows EVERY change of place by exact
(lower-cased) text. Litopys (`findScenes`) counts a place change only when `samePlace` says the places differ (one holds
the other, or Dice similarity under 0.6), and then folds any scene under `scene.minMessages` (default 6) into the one before.
So the user can see three headers while Litopys sees one scene, and Rebuild answers "no closed scene". A 4-message scene
(the rescue) is folded even when it is detected. Workaround today: Litopys settings, minimum scene length 3 to 4.

## Needs the owner's laptop data (cloud cannot see it)
Run, in the engine folder on the laptop (`D:\ROLEPlay\Chrysalis-Engine`), after `git pull` of the engine branch (or copy the
file): `node .fork\tools\litopys-report.mjs --app data\users\molfarwav2\apps\roleplay` (lists chats), then add
`--chat "<part of the title>"`. It prints places, scene flags, the scenes Litopys computes, the chapters and the worker state,
no message text. Paste the output into #118. With it: decide whether to (a) align Litopys' place rule with the header, (b) lower
the default minimum, (c) let a place change that the header shows close a scene even when short.
Also from the laptop for #119: does the duplicate survive a reload; one `chats/<id>.jsonl` of an affected chat (or just
the count of user lines with the same text and their `at`).

## Not built
- #122 part 2: Litopys settings per chat (`config` object in the chat record merged over the global one).
- World DM trivia (#95, comment added): filter in the prompt and code for what deserves an entry.
- #120 confirm on a real short window; #119 is a guard for a race found by reading, not a reproduced fix.

## To try before a release
Set `credentials/<user>/app-upstream/roleplay.source.json` `ref` to `claude/dazzling-faraday-yccu51`, update Roleplay, then
back to `HEAD`. Check: message menu, Story, Save as a scene; the rail on a short window; Vertep Lite with a free model.
