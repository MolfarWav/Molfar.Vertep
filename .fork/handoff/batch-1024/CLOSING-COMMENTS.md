# Issue comments to paste (no gh on the laptop; no chat text in any of them)

## Close with Roleplay 4.66.0 (comment "How it was solved", then close)

**#118 Litopys does not chapter the scenes the owner sees**
Released in Roleplay 4.66.0 (fork main 802b211; commit f7d904e, plus 2d6cc78 for the hand-set scene).
Cause, read from a real chat (sensor and place log healthy, no errors): a scene shorter than `scene.minMessages` was folded into the previous one even when it began at a new place, and a scene closes only when the next one reaches the minimum. With the minimum at 4, five scenes became two, and the first chapter came when the third scene reached 4 messages (`recentMessages` is not involved; Rebuild said "no closed scene" because there was exactly one open scene).
Design: in `findScenes` (`plugins/litopys/plugin.js`) a new place or a clock jump over 6 hours is a hard boundary and always closes the scene before it; a boundary a sensor flag alone made is soft and still folds a short scene back. On the checked chat the layout went from 2 scenes to 5. A scene can also be set apart by hand (message menu, Story, Save as a scene): it is never folded and counts as closed.
Left on purpose: chapters already written are not touched (Rebuild rewrites them); the label of the minimum setting still reads "Scene, minimum messages" (it now applies to flag-only scenes; rewording goes with #122 part 2).
Checked: tests (`rp-memory-m2-worker`, `rp-litopys-marks`), `findScenes` run on the real chat truncated at 17 to 22 messages; not checked: a real model on the new layout.

**#119 Doubled user message after Stop**
Released in Roleplay 4.66.0 (commits d220f27, 66c53d6).
Cause, reproduced in a throwaway engine: Stop during thinking makes the engine answer the send route with an error, and that path wrote the user message alone; the page's cancelled commit (a reasoning model's thinking makes it keep something) then wrote it again, with an empty thinking-only reply, 0.1 to 0.4 s later. The reporter's installed 4.65.0 had neither the page's `afterMessageId` nor the server check.
Design: the page sends the id of the last message it knew; `/cancelled` answers 409 when a turn landed after it; the send route's error path also skips the user message when the same text was stored in the last 15 s (the other order).
Checked: tests in `rp-fast-tag`, the reproduction (3 runs per variant, with and without the field, both orders). Not checked: a real provider; messages already doubled in old chats stay.

**#120 Left rail does not scroll**: closing text from the CHANGELOG 4.66.0 line.

## Stay open
- #121 Vertep Lite: built and released, but not tried on the owner's real model (block B in HANDOFF.md). Close after that.
- #95 World DM trivia: block D.

## New issues to open (label enhancement)
- Litopys settings per chat (#122 part 2): see HANDOFF.md, "What each remaining block starts from".
- Phone: the message "More" menu is taller than the screen, its Delete group is cut off (label bug; device: phone, seen in a browser check at 390 px; not known whether older).
