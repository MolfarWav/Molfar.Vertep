# World DM, P3: start a world, carry it to a new chat (GitHub #52, follow-up)

Status: prepared 2026-10-18, NOT started (user: "not launching yet, but prepare"). Decisions answered by the
user 2026-10-18 (section "Decisions"); the user is still collecting what the DM does in play before the start. P0-P2 shipped in Roleplay
4.53.0 / engine 1.2.5. Design: `DESIGN.md` next to this file (read its "P0 as built" and "P1/P2 as built").
Code lives in the Roleplay fork (MolfarWav/Molfar.Vertep-Roleplay); this repo gets docs only.
Run `ux-review` before building each UI piece. Decisions marked "default" wait for the user's word.

## What exists today (read in code, Roleplay main 3ea6f1b)
- `plugins/world/plugin.js`: routes `/world/state|settings|peek|config|update`, the `llmRequest` hook (event
  after the chat history, one reply), `writeBook`/`bindBook` (book `lorebooks/world-<chatId>.json`), state
  `world/state/<chatId>.json` (`normalizeState`). A run = one DM call on the unread messages (8000 chars max,
  2500 per message), reply JSON `{add, update, retire, fronts, event, delivered, direction, summary}`,
  `applyReport` dedupes by name and alias, at most 8 changes per run, 300 records max.
- `settingsRoute`: switched on in a long chat, the DM reads only the newest `max(2, everyN*2)` messages;
  `fromStart: true` keeps `lastKey` null, but a run still reads only 8000 chars, so a long chat is never caught up.
- `cardNames`/`memberIds` read the chat's cards only for their names. Nothing reads a card's description,
  scenario or books for the DM.
- The engine plugin copies book + state on a fork (`forkWorld`, `plugins/engine/plugin.js` ~958). Nothing copies
  a world into a NEW chat. (DESIGN.md says "like Canvas carries its board": no such carry exists in code; the
  board is per chat meta `promptBoard`. So carry is new work, not a reuse.)
- New chat flow: `startChatAndOpen` -> optional `NewChatStep` (`src/components/chat/new-chat-step.tsx`, preset
  and its variables) -> `newChat` (`POST /chats`). The World DM sheet is `src/components/chat/world-sheet.tsx`.
- A card's books: `studio.embeddedLorebookId` and `studio.linkedLorebookIds` (engine plugin ~2273); group books:
  the group's `linkedLorebookIds`.

## Monitoring gaps found while answering "where do I see the DM" (fix first, small)
- The message menu's Prompt peek is a dry-run rebuild (`/prompt/preview`, `assemble(... dryRun)`): plugin hooks
  never run there, so the DM's event never shows in it. Only the engine's prompt Inspector (Molfar's page,
  header button "Prompts") shows it, as the "World DM" plugin part of the real request.
- The Inspector keeps the last 20 requests in memory (`src/inspector.ts` KEEP), and a reply now brings up to
  three more calls (Dashboard sensor, DM, Litopys): the reply that carried an event falls out fast. A restart
  forgets all of it.
- The sheet shows only the last run's summary; `state.log` keeps 30 runs nobody can see.
- The DM's own call shows in the Inspector as a separate row (source: the app), with its JSON reply: the only
  place to see fronts and the pending event besides the state file.
Proposed (decision 4): a "Run history" fold in the sheet (time, reason, changes, fronts moved; summaries behind
the same spoiler confirm as peek), and a line in Prompt peek when a hook part is pending: "World DM adds an event
to this reply: open the Inspector to see it" (no text, keeps the event hidden). Raise Inspector KEEP to 50.

## Scope and order
1. **Catch up on a whole chat** (cheapest, reuses the run): `POST /world/update {chatId, catchUp: true}` loops
   run after run (one model call per route pass, two-phase, stash carries the position) until `lastKey` reaches
   the newest message; no events during catch-up, chronicler rules only, fronts at the end. Sheet: when the DM is
   switched on in a chat with more unread text than one run reads, offer "Read the whole chat (N runs)" with the
   count shown before it starts. Progress through `useWorldLive`.
2. **Recipes** (`data/world/recipes/*.json`, built-ins `_`-prefixed and shipped in the app's `data/` like
   `_molfar.json`; a user copy without `_` wins). Shape, first draft:
   `{ v: 1, id, name, description, lang?, questions: [{ id, text, options?: [...], default? }],
      sections: [{ id, kinds: ["person"|...], max, prompt }], fronts: { count, prompt } }`.
   `GET /world/recipes` lists them (name, description, questions). Built-ins: `_from-cards` (sections only),
   `_interview` (genre, conflict, tone, scale). New kinds of worlds = a new JSON file, no code.
3. **Create from cards** (the recommended first visible feature): `POST /world/start {chatId, from: "cards",
   cardIds?, recipe?}`. Reads each chosen card's description, scenario, personality, and its embedded + linked
   books (and the group's books); splits the text into chunks that fit a small context window (6000 chars,
   cut at entry boundaries); one call per chunk returns the same `add` JSON as a run; `applyReport` merges by
   name; a last call writes up to `fronts.count` fronts (living level and up) from the records. Then the book
   is written and bound as today. The state gets `origin: { kind: "cards", cardIds, recipe, at }`.
   Where: the World DM sheet, a "Start a world" block shown while the chat has no player message yet (and a
   smaller "Build from cards again" link later, which only adds). Cards default to the chat's own cards.
4. **Carry a world to a new chat**: `POST /world/carry {fromChatId, toChatId}`: copies records and fronts into a
   new book and state for the new chat; resets `lastKey`, `event`, `log`, `transitionKey`, `lastError`; keeps
   settings. Entry points: the sheet ("Use this world in a new chat") and `NewChatStep` (a "World" select: none /
   one of this character's chats that has a world). The engine plugin's `POST /chats` stays untouched: the app
   calls carry right after `newChat`.
5. **Interview**: a form in the sheet built from the recipe's questions (options + free text), then one call per
   section, same merge as 3. Not a chat-style dialogue with the model (one form, few calls: free models).
6. **Tests** (`test/rp-world.test.ts`): recipe validation and override; chunking cuts at entry boundaries and
   stays under the limit; a mock-model start from two cards merges duplicates; carry resets the run fields and
   keeps records; catch-up stops at the newest message and sends no event; the world book stays hidden.
7. **Docs in the same change**: the fork's `docs/DATA-FORMATS.md` "World DM" (recipes, `origin`, catch-up),
   guide tip + What's new, CHANGELOG. No card or lorebook format change is planned, so the card skill and a
   workspace task are not needed unless decision 1 changes that.

Files touched (Roleplay fork): `plugins/world/plugin.js`, `src/lib/world.ts`, `src/components/chat/world-sheet.tsx`,
`src/components/chat/new-chat-step.tsx` (step 4), `src/lib/i18n.ts` (en + uk), `src/lib/store.ts` (carry after
`newChat`), `data/world/recipes/_*.json`, `test/rp-world.test.ts`, `docs/DATA-FORMATS.md`, `CHANGELOG.md`.
Engine repo: this file, `DESIGN.md` "P3 as built", `.fork/STATE.md`, `src/inspector.ts` KEEP 50 (decision 4).
Decision 2 adds the app's rail section and a new view (`src/components/views/`), with the sheet slimmed down.

## Decisions (answered by the user 2026-10-18)
1. Card lore: the DM **learns** from it, never copies it into the world book.
2. The World DM becomes **its own section in the app's left rail**, next to Litopys and the Library (user: "it was
   meant as a separate app; the chat holds only its piece"). "Start a world", recipes, carry, run history and token
   use live there; the chat keeps a small piece (the current sheet: on/off, level, triggers, World turn). Design the
   split with `ux-review` before building (how Litopys's rail section and its chat piece divide the work is the model).
3. Carry: records and fronts as they stand, clocks included.
4. Monitoring: all three (run history, Prompt peek line, Inspector KEEP 50).
5. Interview: a form.

## Token control for the DM (user, 2026-10-18)
Seen on the user's machine: model `nanogpt/z-ai/glm-5.3:thinking`, error "the DM model spent its whole reply limit
thinking and wrote no answer", the DM never ran. Cause (inference from `callParams`): the reply limit is
`config.maxTokens` (default 1500, 500-8000) + the chat preset's thinking budget only when that preset has reasoning
on; a `:thinking` model thinks anyway and burns the 1500. The error tells the player to "raise the DM's reply
limit", but no UI sets `maxTokens` (`world-sheet.tsx` reads only `model`). Also a double period: `emptyReplyError`
ends with "." and `world.error` adds another.
Plan, first in P3 (with monitoring):
- The reply limit: the engine already has per-model parameter blocks per plugin (Settings > Connections and models >
  a model > Parameters > "World DM"; `withModelParams` in `src/models.ts`, the block wins over the plugin's
  `presetParams`). The user set one up 2026-10-18 (max output 2048, reasoning off). It is keyed by the model id, so a
  `:thinking` variant needs its own block. So: no second limit field in the DM; the DM settings show the limit in
  force and link to that block, and the empty-reply error names it instead of "raise the DM's reply limit".
- Per run, keep `usage` (input, output, cost when priced) and `ms` in `log` (the llm result has them; Litopys does
  the same in `plugins/litopys/plugin.js` ~1386). Show the last run's tokens and the chat's total in the status
  block, and per run in the run history.
- Show the input size before a run (records + unread text, `estimateTokens`) and cap it: the existing caps are
  8000 chars of new text, 2500 per message; make the new-text cap a setting too if the user wants (open).
- Fix the double period.
- Make it work without knowing the engine (user, 2026-10-18: "I figured it out because I build the app; users
  won't"). Seen next: GLM 5.3 with the block's reasoning "off" returns 400 "always thinks and does not support
  disabling reasoning". So: (a) an empty reply caused by thinking retries once by itself with the limit raised
  (thinking budget + answer room, capped), before any error shows; (b) errors read as one plain sentence with
  the next step ("this model always thinks: pick another, or give it a bigger limit here [link]"), raw provider
  JSON only behind "details"; (c) a "Test the DM model" button in the DM settings: one tiny call, says "works" or
  the plain reason. Engine side, for the batch: the model block's Reasoning picker should not offer "off" for a
  model that cannot turn it off (catalog flag or the remembered 400).
Workaround today: pick the model without `:thinking`, or "Use the chat's model".

## Unknown / not decided
- `/worldbuild` (START.md queue, #52 line): a slash command in the chat, a Molfar tool, or both is not written
  anywhere. Ask before building.
- RPG layer (`.fork/handoff/rpg-layer/IDEAS.md`) and DM dice rolls stay "later", outside P3.
