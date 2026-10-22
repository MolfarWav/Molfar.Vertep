# Trying the memory bridge branch on your machine (2026-10-22)

What is on the branch: Roleplay fork `MolfarWav/Molfar.Vertep-Roleplay`, branch `claude/memory-bridge`, head `1853ab4`
(11 commits on top of 4.60.0, nothing merged into the fork's main). Engine: nothing to test there; the engine branch
`claude/memory-bridge` is 1.2.14 plus notes. The Chub fix is a separate engine branch, `claude/chub-system-role`.

## 1. Set up

1. Close the app. In `data/credentials/molfarwav2/app-upstream/roleplay.source.json` put exactly:

```json
{"git":"https://github.com/MolfarWav/Molfar.Vertep-Roleplay","ref":"claude/memory-bridge"}
```

   (copy the old file to `roleplay.source.json.bak-2026-10-22-memory` first, as before).
2. Run `Molfar-Vertep.bat dev`. It moves the engine to the newest `claude/*` branch, which is `claude/memory-bridge`
   (engine code = 1.2.14; harmless). To test the Chub fix instead, run `Molfar-Vertep.bat dev chub-system-role`.
3. In the app open the Roleplay update panel (where you updated it before) and update. The update is by git head,
   so the version stays 4.60.0. If you changed Roleplay files in your workspace, the update merges and may ask.
4. Back to normal after the test: set `ref` back to `HEAD`, update Roleplay again. The branch only adds files and keys
   (`said`, `inherited` in `dashboard/state/*.json`, `characters/<id>/memory.json`); the old code ignores them, so going
   back loses nothing and breaks nothing.

## 2. What to check by hand (about 20 minutes)

A. Nothing broke. Open an old chat, the Dashboard opens, a reply works, Litopys and the Prompt board open.

B. Continuation (#100). Take two chats of one story: make chat B continue chat A (Canvas: drag a wire from A to B, or the
   Chats map: "Continues"). Open B's Dashboard (a chat with only the first message, before you write).
   - Expect a banner "Carried over from “A”: notes N, threads M ..." with "Start clean", and A's threads, numbers,
     notes in B's Dashboard.
   - "Start clean": the banner turns neutral, the carried items go, and A's Litopys backstory leaves B's prompt too
     (Prompt board > Litopys, or the inspector). "Carry it over again" brings both back.
   - Write one message in B and let the Dashboard read it: the banner becomes one grey line, the button is gone.

C. What was said (#98). Play 3-4 turns with a character who promises or threatens something.
   - Dashboard > Notebook of that character: a "Said" block. A lie is covered ("Hidden entry") until "Show hidden".
   - Edit one, remove one, restore it. Dashboard settings: "What characters said: at most this many per turn" and the
     switch to remind the model. Prompt board: a row "What characters said" with its own switch.
   - If nothing ever appears: Dashboard settings > the Knowledge block of the sensor prompt may be your own edited copy
     (marked custom); the new `said` rule is only in the default. Restore the default to try it.

D. Card memory (the big one).
   - Characters > a card with a finished chat > tab Memory (pink). Empty state, then "Add a chat to memory": pick the
     chat, look at the preview: ticks are the top picks, lines already in memory are unticked. Add.
   - The row shows counts and "chat exists". Switch it off and on. Budget field: type 9000, leave it, it becomes 1500.
   - Open a NEW chat with that card. Prompt board: a row "Character memory"; the request inspector shows a message
     "[What <name> remembers from earlier stories (character memory): ...]" above the history, after the preset text.
   - No repeats: a fact that Litopys of the new chat already holds must not appear in that message. A chat that
     continues the source chat (step B) must NOT get the card block for that story (Litopys backstory carries it).
   - Cache: send two replies in a row and compare that message in the inspector: it must be the same text.
   - Delete the source chat. The story stays in the tab as "only in memory" and still reaches new chats.
   - Prompt board switch "Character memory" off for one chat: the message disappears for that chat only.

E. Things that are NOT there yet (not bugs): a "Chat memory" panel per chat (only the Prompt board switch), skills and
   changes in the Memory tab (#106), a model-written summary (the summary comes from Litopys arcs; a chat with no
   chapters yet has none and only facts/notes/said are offered).

## 3. What to tell me

Anything that looks wrong in B, C or D, with the chat and what you saw; an item in the Memory preview that makes no
sense (what the list offered); and whether the block feels too long or too short for ~400 tokens.
