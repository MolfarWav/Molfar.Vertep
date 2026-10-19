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

## The World section (agreed with the user 2026-10-19)
User: the section is the DM's hub, prompts shared by all chats; the chat's piece is the fine setting per chat
(how often it runs, which DM). Order agreed: section shell with Overview + Runs + token control first, then
Records and prompts, then Start. Prior art read and mapped in `PRIOR-ART.md` (same folder): the DM prompt as a block
list, per-chat "what the DM reads", Start as drafts to review, the recipe question shape. "Which DM" per chat
means DM profiles (user, 2026-10-19): the five levels already are profiles, only their prompts are hidden
(`LEVEL_RULES`, `CHRONICLER_SYSTEM` in `plugins/world/plugin.js`). They become built-in default profiles the user
can open, change and roll back, the pattern we already use (built-in `_`-prefixed files shipped in the app's
`data/` beside the user's copy, as presets `_molfar.json` / `molfar.json`; Litopys's stored-diff prompts with a
reset per prompt). A profile = prompt blocks (output block locked) + defaults (triggers, what the DM reads, hard
or soft events, model optional). The user can also add a profile of their own. A chat picks a profile; its fine
settings (how often, what it reads) override the profile's defaults. User's aim: gather the scattered tools into
one, adapted and improved, instead of inventing from scratch.
Original proposal:
The user wants the DM as its own controllable part, like Litopys (Library) and Canvas: finer settings, prompts the
user can change. Proposal:
- A rail item **World** in `src/components/shell/sections.ts`, group 1 after Canvas, a master-detail page like
  `litopys-view.tsx`: left, the chats that have a DM (level, last run, an error dot); right, one chat's world.
- Tabs of a chat's world: **Overview** (level, triggers, World turn, status: today's sheet), **Records** (the world
  book's records; edit, retire, add by hand: writes go to `state.entities`, the book follows), **Fronts and events**
  (behind an "Author view" switch, off by default, same spoiler confirm as peek), **Runs** (history: time, reason,
  changes, tokens, cost, error; the last run's input and raw reply for debugging), **Start** (create from cards,
  interview, carry from another chat: P3 steps 3-5).
- **World settings** (all chats), a gear on the page: the DM model + "Test the model", limits (new text per run,
  changes per run, records max), prompts, recipes.
- **Prompts** follow Litopys (`plugins/litopys/plugin.js` `customPrompts`/`resetPrompts`: only what differs from the
  default is stored, reset per prompt, a "changed" mark). Editable: the keeper's rules, each level's rules, the event
  insert texts (hard and soft). Locked: the output JSON shape and its parser instructions, shown read-only under
  the editor, because `parseReply`/`applyReport` depend on them and a broken shape means silent failed runs.
- The chat keeps a small piece: the current sheet slimmed to on/off, level, World turn, status line, and
  "Open in World". The Canvas prompt board switch stays.
- Per-chat prompt overrides: not now (global prompts + per-chat level); later if asked.
Order with this: section shell with Overview + Runs + token control + monitoring first, then Records and prompts,
then Start (cards, carry, interview).

## UI design, round 1 (2026-10-19, waits for the user's review)
Mockups (private canvas): https://claude.ai/artifact/Dq4q3RJkCX2Meiw27y7gKk . Nine boards: hub Overview, saved
Worlds, Plot (author view), Runs, Profiles, Start (review drafts), World settings, the chat piece (phone, desktop
sheet with an error). New decisions from the user on 2026-10-19, built into it:
- **Two models** in World settings: a **play model** (runs after replies: fast, cheap, multilingual; empty = the
  chat's model) and a **build model** (creates, remixes, reads cards: stronger, more inventive; empty = the play
  model). Each with "Test", and the limit in force from the engine's model block ("World DM" / "World DM build").
  A chat may override the play model.
- **Saved worlds are a library** (tab Worlds): a world is kept apart from chats, reused in new chats, remixed (the
  build model changes era, genre or place; the user reviews the changes), exported. A chat plays its **own copy**;
  "Save as a world" in a chat keeps its state as a new world or version. Format sketch: `data/world/worlds/<id>.json`
  `{ v, id, name, blurb, tags, cover?, origin {kind, from, recipe, at}, entities, fronts, opening? }`; the chat
  state gets `worldId` (where its copy came from). Carry-to-new-chat becomes "New chat in this world".
- **Backgrounds**: "Make a background" on a world, through the app's existing image connection (Settings, Images);
  shown in Worlds and optionally behind the world's chats. Image model picked in World settings.
- Hub tabs: Worlds | In chats | Profiles (recipes live under Start and the gear). A chat's world: Overview, Records,
  Plot (behind an author-view confirm), Runs, Start.
- The chat piece: on/off, World (its own or a saved one), Profile, every N, a "More" fold, World turn as the one
  primary action at the thumb; status line; errors in plain words with the fix buttons; a status dot on a globe
  icon in the chat header so a failed run shows without opening anything.

## UI design, round 2 (user review 2026-10-19)
- Links become buttons everywhere; chips carry colour by kind (person pink, place teal, group violet, thing/front
  amber, fact/built-in blue, hard event red), the same scheme across the hub.
- **Models**: the parameters stay in Settings > API connections (the model's "World DM" block, as the user set it
  up); the hub only shows them and offers an "Override for the World" checkbox that opens its own fields. Fallbacks:
  play model not set -> the Dashboard sensor's model, then Litopys's; build model not set -> the chat's model.
- **Backgrounds**: no live per-scene generation (Marinara style). Pre-generated sets with the cost shown first:
  a direction for the whole set (style text + quick styles), a list of places (from the world's place records,
  plus the user's: tavern, castle, modern house, school), variants per place; or upload, or pick existing images.
  All land in one folder of the existing Backgrounds library (`BackgroundItem` has `folderId`) named after the
  world. In play, when the Dashboard names the scene's place, the chat's `backgroundId` switches to the image
  whose name matches the place or one of its aliases; no match = no change. Off by default (World settings).
- Storage answer given to the user: a saved world is our own JSON (`data/world/worlds/<id>.json`); in a chat its
  records become the chat's world lorebook (keyword entries, as P0-P2) and fronts + event live in the state file;
  the event is injected after the chat history through the `llmRequest` hook. Not the data bank (P0-P2 never used
  it). Litopys stays separate: it keeps what happened, the DM keeps the world off screen; the DM does not read
  Litopys today (open: let the DM read the Litopys record instead of raw messages for long chats).

## Round 3 (user, 2026-10-19)
- **What the DM reads today** (checked in code, `unreadMessages` + `dmInput`): only messages after `lastKey`, each cut
  to 2500 chars, the whole joined text cut to its newest 8000 chars (about 2-3k tokens). Not the whole history. But
  two real gaps: (a) when more than 8000 chars are unread, the older part is dropped for good, since `lastKey` jumps
  to the newest message; (b) `lastKey` stays null when the state file existed before a level was picked (a first
  save with level off), so the first run reads "everything" and keeps only the last 8000 chars. P3 fix: catch-up
  reads in chunks (step 1), and the user agreed the DM should read Litopys's record for long chats instead of raw
  messages (cheaper and deeper): a "What the DM reads" option "Litopys summary + new messages".
- **Who switches the background**: the Dashboard sensor, not the DM (user's call). One more part in its existing
  call, no extra model call: it gets the names and tags of the images in the chat's background folder (the world's
  folder when the chat has a world) and returns the one that fits the scene, by place or by association, or none.
  The app sets the chat's `backgroundId`. A Dashboard part with its own switch, off by default.
- **"Look at and name the images"**: for uploaded or existing images, a vision model (the app already does this for
  card avatars: appearance from the picture) proposes an English snake_case file name and tags (tavern, tavern_2,
  tavern_kitchen; night, rain, crowded); the user checks the list, then the files are renamed. Names in English only.
  Cost shown before it runs.

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

- **Background switching is off by default** (user, 2026-10-19): it changes how the chat looks, so it is opt-in
  per chat (and a default in the hub settings).
- **Backgrounds are stored as WebP** (user, 2026-10-19): generated, uploaded and renamed images are converted on save
  (quality ~85, longest side capped, e.g. 1920 px). Do it in the client with `canvas.toBlob('image/webp')`: no new
  dependency. Keep GIF/animated files as they are (canvas would freeze them) and skip a file if WebP comes out larger.
  Existing library images: an explicit "Convert to WebP" button, never a silent rewrite.

## Stage 1b (user, 2026-10-19): failures reach the inbox, toasts by colour
- **Failed background work in the inbox** ("Waiting on you", `src/components/shell/inbox.tsx`, `src/lib/attention.ts`):
  today it lists only what Litopys or Soul want reviewed; a failed run shows nowhere unless the player opens its
  panel. Add a kind "failed" with one row per chat and worker: World DM (`lastError`, from `/world/chats`), Litopys
  (worker `failed`/`retry`), Dashboard sensor (`lastError`). A red mark, one plain line by error code, the row opens
  the place to fix it (World section, Library, the chat's Dashboard settings). A row clears by itself when the next
  run of that worker succeeds, or by "Dismiss" until a new failure. On by default, with a switch per kind like the
  existing attention settings.
- **A failure also pops up** (user, 2026-10-19: the inbox is easy to ignore, theirs holds 6 Soul reviews left for
  later): an error toast once per new failure, saying where (World DM / Litopys / Dashboard, which chat) and what,
  with an "Open" button to the place to fix it. Not again for the same failure (worker + chat + its time); the same
  error code again within 10 minutes is not repeated. No toast while the player already looks at that panel.
- **Inbox colours by kind**: the inbox count turns red when any row is a failure (else the usual colour); rows differ
  by kind: failure red, Litopys approvals (proposals to accept) one colour and icon, Soul reviews of a card another,
  with a short kind label, so "needs a fix", "needs a decision" and "can wait" read apart at a glance.
- **Toasts by type** (Roleplay `src/components/ui/sonner.tsx`): today success, error and plain toasts share one
  colour, only the icon differs. Error red-tinted and staying longer, warning amber, success green, info blue, plain
  neutral; both themes. Audit plain `toast()` calls that report a failure and make them `toast.error`.
  The shell (`client/`) has no toasts, so this is Roleplay only.

## Unknown / not decided
- `/worldbuild` (START.md queue, #52 line): a slash command in the chat, a Molfar tool, or both is not written
  anywhere. Ask before building.
- RPG layer (`.fork/handoff/rpg-layer/IDEAS.md`) and DM dice rolls stay "later", outside P3.
