# STATUS at the end of the laptop session (2026-10-24): read this first, HANDOFF.md is the original plan

Released: Roleplay 4.66.0 = fork main 802b211 (every install gets it through the Updates panel). Engine: nothing shipped
(no engine code change; the branch only carries notes and the report tool). Done: A (#118) and C (#119); #120, #121 and
the hand-set scene were built earlier. Still to do, in this order, from another account: B, D, E, #122 part 2.
Comments to paste into the issues: `CLOSING-COMMENTS.md` (no `gh` on the laptop).

## Start here (next session)
- Machine: the owner's laptop, engine folder `D:\ROLEPlay\Chrysalis-Engine`, workspace user folder `data\users\molfarwav`
  (the owner also calls it molfarwav2). Roleplay clone for work: `D:\ROLEPlay\rp-batch` (fork MolfarWav/Molfar.Vertep-Roleplay;
  its branch `claude/dazzling-faraday-yccu51` equals fork main 4.66.0; branch from main for new work).
  `bun install --frozen-lockfile`, `bun run typecheck`, `bun test` (1531 pass).
- Git push from the laptop works through Git Credential Manager after the owner signed in to GitHub in the browser (it
  needed a 2FA recovery code; the sign-in is stored). If a push hangs it waits for a sign-in window: run it in the owner's
  own terminal. `gh` is not installed: issues and comments are pasted by the owner.
- The workspace's Roleplay folder is not a git checkout. To try a branch in the real app use `roleplay.source.json` `ref` (ask first).
- Tools: `node .fork/tools/litopys-report.mjs --app data/users/molfarwav/apps/roleplay --chat <id or title part>` (no message
  text). A throwaway engine with a mock model: skill `browser-check`. The Stop reproduction (send, abort the fetch, POST
  `__abort`, optional `/cancelled`, read the .jsonl) is described in STATE.md.

## What each remaining block starts from
- **B. #121 Vertep Lite on the owner's real model.** Built and tested with scripts only. Ask the owner which free model writes
  for him and in which chat; take the real request from the prompt inspector and check that `lite_control_tail` is the LAST
  thing after the newest message and the pick "Only you" is active. If the model still writes for the user: shorter positive
  wording at the end, a one-line variant for small models, a stricter second option. Measure tokens (`presetCosts`; the test
  keeps the total under 2500 and the heaviest pick under 3000). Regenerate the templates with `bun scripts/vertep-lite.ts`.
  The built-in read-only copy updates through `olderThan(from, "4.66.0")` in `plugins/engine/plugin.js`: 4.66.0 is released,
  so a later change needs a NEW version step (4.67.0), not an edit of that one.
- **D. #95 World DM writes trivia.** The owner's example is in the Campus chat's lorebook (world `world-<chat id>`):
  carried-object entries (a backpack, a water bottle) fire on every mention. Look at `data/lorebooks/campus-sluts.json`
  (read it, never copy it anywhere public) and the World DM prompt and route (the world plugin in `plugins/`,
  `src/components/world/`). Propose a filter by entry kind (person, place, rule, secret; not carried objects) and a cap on
  entries per turn; ask before changing the prompt.
- **E. Small.** On a phone the message "More" menu is taller than the screen and its Delete group is cut off (not known
  whether older): fix it or file it. The scene dialog's select text is cut on a phone (native control): fine unless the owner minds.
- **#122 part 2.** Litopys settings per chat: a `config` object in the chat's record merged over the global config, a settings
  screen in the chat's record sheet. Not started. The label "Scene, minimum messages" now applies only to scenes a sensor flag
  alone started (a place change or a clock jump always closes a scene, #118): reword it with this work.

## Unchecked or left
- A real model on the new scene layout (chapter count and cost on a long chat). Rebuild is needed to rewrite chapters written
  under the old layout.
- Stop on a real provider: does the generation really stop (the engine's abort signal does reach the call; a mock cannot show
  the provider's side). The owner thinks Continue then writes on from the stop; Continue extends the last character message.
- Messages already doubled in old chats are not repaired (the Campus chat has two pairs).
