# World + DM: a Roleplay plugin that builds the world and moves it during play (GitHub #52)

Status: design agreed with the user 2026-10-17. P0-P2 built 2026-10-18 on branch `claude/issue-52-t5omkq`
(Roleplay fork + this repo's docs): see "P0 as built" at the end. Replaces the first #52 shape (a one-off
lorebook builder). `ux-review` before building any UI. Code lives in the Roleplay fork
(MolfarWav/Molfar.Vertep-Roleplay), assembled in a scratch copy as usual.

## The idea
The Dashboard tracks the micro level: people in the scene, their relations, threads. The Chronicle keeps
what already happened. Nothing moves the world around the characters. The DM is a separate player that
does: factions act off screen, threats close in, new people and places appear, finished ones leave the
board. It writes a world lorebook and the data bank for one chat, and reaches the prose model only
through a prompt insert.

Roles, one owner each:
- Prose is canon. The DM reads it and never rewrites what already happened in it.
- Dashboard owns the scene (who is here, mood, place, threads).
- Chronicle owns the past.
- DM owns the world off screen and what is coming.

## Two halves, one plugin (working name `world`)
1. **Start a world** (the old #52): either
   - an interview (genre, conflict, tone, scale), or
   - **"Create from cards"**: the user picks one or more character cards; the DM reads their description,
     scenario and embedded/linked lorebooks and writes one shared world book for the chat plus the first
     fronts, with its own additions. Big cards are read in chunks (small context windows).
   Recipes (`data/world/recipes/*.json`, built-ins `_`-prefixed) still list sections, questions, the
   prompt per section and the entry shape, so new kinds of worlds need no code.
2. **Live DM**: runs during play, see below.

## World state (the DM's own data, per chat)
Fronts and clocks (Blades in the Dark / Dungeon World): each faction or threat has a goal and a clock
(e.g. 0/6). A DM run returns small JSON, never prose: clock moves with a reason, NPCs added/changed/
retired, places, facts, hooks for the next scene. Small, structured, hard to spoil on small models.
Exact schema: first design task (fronts, clocks, npcs with one canonical id and aliases, hooks, history).

## Where it writes
- **A world lorebook per chat**: created with the chat, bound to it, hidden from the Lorebooks library.
  Today a chat cannot own a book: `scopeBookIds` (`src/lib/store.ts`) rebuilds the scope before every send
  from global books + the character's/group's books, so a chat-only book would drop out. Needs a chat field
  (working name `worldBookId`) that `scopeBookIds` always adds, and a flag on the book that hides it from the
  library. This is a lorebook/chat format change: same change updates the fork's `docs/DATA-FORMATS.md`,
  the card skill `.skills/edit-large-card/SKILL.md` (copy `.fork/app-skills/roleplay/edit-large-card/SKILL.md`)
  and a task for the built-in agent.
- **The data bank**: already supports `scope: "chat"` + `scopeTargetId` (`plugins/engine/plugin.js`,
  `databankInScope`). No format change.
- The DM creates, edits and retires entries itself; no user confirmation (it is a player, at least at first).
- **Retired figures are not deleted.** A dead villain or a finished front gets status "past": `constant`
  off, keyword-only, cut to one or two sentences. The model still knows who it was when someone names it;
  it stops costing context and stops acting.

## How it reaches the prose model
- A direct prompt insert, the same path as the Dashboard's `buildInsert` ("off screen / hook" block).
- **Hard and late** (user, 2026-10-17): the event is a MANDATORY rule for the writing model, weak models
  included, which drop rules they skim past. So it sits at the end of the prompt, after the chat history,
  next to the last user turn (post-history position), not among the system rules at the top.
- **Size: one paragraph, 3-4 sentences, in a fixed shape.** A single line is too thin for a weak model to
  know what to do; more than a paragraph dilutes it. The shape matters more than the length:
  ```
  [WORLD EVENT: must happen in this reply]
  What: <one concrete event, seen or heard in the scene: who, what, where>.
  How: bring it into this reply as part of the scene; the characters react in character.
  Do not: resolve it in this reply, explain where it came from, or mention a game master.
  ```
- **Hard vs soft by level.** Chronicler injects no event. Living world injects rumours as soft ("may come
  up"). Director, Antagonist and Total chaos inject the hard block. Explicit: no event at all.
- **One shot.** An event goes into one reply. The next DM run reads the prose: delivered, it moves on;
  missed, it may re-inject once, then drops it. Standing world facts never ride the insert: they live in the
  world book and fire by keywords like any lore.
- Can be switched off in Canvas and in the chat's settings.
- **Hidden from the chat.** No panel shows the DM's plans; the insert is visible only in the prompt
  Inspector. (Unlike the Dashboard's "What the model sees", which is shown.)

## When it runs (the player decides)
Settings in the DM sheet, any combination:
- every N turns;
- scene stagnation: N turns without change (place, cast and goals unchanged per the sensor), subject to the
  scene direction below;
- manual ("World turn" button);
- always on a time skip / transition.
The run is in the background after the reply, while the user reads and writes. It does not need to be
parallel to the prose call: its result only goes into the next prompt anyway. If the user sends before the
DM finishes, the previous state goes in. (Marinara's parallel agents never visibly fired for the user, so
do not depend on parallel calls; verify how our sensor call is scheduled before building.)

## Its own model
Picked in the DM's settings like the Dashboard's: a choice from the connections the user set up in
Settings. Called separately from prose and the sensor.

## Levels
1. **Chronicler**: records only. New places, NPCs and facts from the prose go into the world book and
   data bank. Injects nothing new.
2. **Living world**: clocks tick off screen, the world changes, news reaches the party as rumour; no pressure.
3. **Director**: hooks, complications, visitors in the scene.
4. **Antagonist**: consequences and pressure; uses the Dashboard's threads to hit relations where they hurt.
5. **Total chaos**: ignores the genre and logic of the world (killer rabbits from space in a slow-burn
   romance). Still respects prose as canon and the pause in explicit scenes.

## Scene directions
The Dashboard sensor adds one field, the scene direction, to its existing pass (no extra call). The DM
uses it for the stagnation trigger and for what it may do. If the Dashboard is off: no stagnation trigger
(only every-N and manual), and the DM classifies the scene itself when it runs.

| Direction | When | Stagnation threshold | What the DM may do |
|---|---|---|---|
| Domestic | private familiar space, 1-2 people | slow (x2): the conversation is the event | outside news, a letter, a knock; Director and above |
| Social (academy, court, tavern) | 3+ people in an institutional or social setting | normal | gossip, new faces, overheard talk, status moves |
| Intrigue | secret deals, politics, bargaining | normal | faction moves, leaks, double agents |
| Investigation | search, mystery, inquiry | normal | new clues, false clues, a witness vanishes |
| Travel / adventure | hostile or unknown ground | fast (x0.5) | weather, a lost route, encounters, resources |
| Combat / action | violence under way | counter paused | nothing new mid-fight; reinforcements only on Antagonist and Chaos |
| Explicit | sexual scene | **counter frozen** | **nothing**, Chaos included; it waits until the scene ends |
| Transition / time skip | road, "three days later" | triggers at once | the best moment for a world turn: clocks tick, the DM always runs |

Stability rules (from the user's own mode prompt):
- A direction holds until a named trigger fires. A mood change or a single line is not a trigger;
  ambiguity keeps the current direction.
- Leaving Explicit is mandatory: when the act ends, is interrupted or the place changes, the direction
  before it returns.

## Carrying a world to a new chat
Like Canvas carries its board from chat to chat: the world book, the data bank files and the DM state
copy into the new chat.

## Phases
- **P0**: world state format, the chat-owned hidden world book (format change above), Chronicler level,
  DM model choice, the insert (Inspector only), every-N and manual triggers.
- **P1**: Living world; scene direction in the sensor; stagnation and transition triggers; Canvas/chat toggles.
- **P2**: Director, Antagonist, Total chaos; threads from the Dashboard.
- **P3**: Start a world: interview and "Create from cards", recipes; carry to a new chat.
- Later: the RPG layer (`.fork/handoff/rpg-layer/IDEAS.md`), the DM rolling dice through `roll_dice`.

## Tests (each phase)
World state validation; a mock-model DM run that adds, edits and retires entries in the chat's world book
in the right format; the world book never shows in the library and is always in the chat's scope; the
insert respects the toggles; Explicit freezes the counter; Chaos still pauses in Explicit.

## Open before P0
- How the Dashboard sensor call is scheduled today (after the reply? awaited?), to put the DM run next to it.
- The world state schema in detail.
- The DM's settings sheet and where it opens (Dashboard-like sheet on phones); `ux-review`.

## P0 as built (2026-10-18)
Answers to "Open before P0":
- **Sensor scheduling** (read in code): the app, not the plugin, starts it. After a committed reply with no
  group members left to speak, `store.ts` calls `triggerDashUpdate` (`src/lib/dash-live.ts`): 1.5 s wait,
  then `POST /dashboard/update {auto: true}`, two-phase (the model runs inside the route). The DM chains
  after it (`triggerDashUpdate(...).then(() => triggerWorldUpdate(...))`, `src/lib/world.ts`), so the two
  calls never run at once on rate-limited free models, and P1 can read the sensor's scene direction of the
  same turn. A dashboard update already running folds the call and the DM may then run beside it: accepted.
- **World state schema**: `data/world/state/<chatId>.json`, documented in the fork's `docs/DATA-FORMATS.md`
  ("World DM"). P0 keeps `settings {level, everyN}`, `lastKey` (newest message read), `entities`
  (`id` n1.., `kind` person|place|group|thing|fact, `name`, `aliases`, `text`, `status` active|past, `uid`
  of its book entry), `log`, `lastError`. Fronts/clocks and the pending event come with P1/P2.
- **Settings sheet**: an item "World DM" in the chat's tools menu (desktop kebab, phone chat menu) opens a
  right-side sheet (`src/components/chat/world-sheet.tsx`): level as radio cards with a hint each, every N
  replies, the World turn button, a status block (records, retired, last run and its summary, last error),
  the DM model (all chats; empty = the chat's model).

Decisions taken as defaults (told to the user 2026-10-18, not confirmed yet):
- The DM is per chat and off by default: each run is one more model call.
- Records are written in the story's language: keys must match the prose.
- Switching on in a long chat reads only the newest `max(2, everyN*2)` messages, not the whole chat
  (`fromStart: true` reads all; a P3 "start a world" job).

The format change:
- The world book is `lorebooks/world-<chatId>.json` with `ownerChatId`; the chat meta's `worldBookId`
  names it. The engine plugin adds it to the scan scope (`worldBookOf` in `activateWorldInfo` and
  `semanticEmbedWork`), copies book + state on a fork (`forkWorld`: the copy's `lastKey` moves back to the
  fork point when the DM had read past it) and deletes both with the chat. The app drops books with
  `ownerChatId` from every list (`libraryBooks`, `src/lib/world.ts`): the library, pickers and the chat
  panel never see it. Backups and exports still carry it. The Canvas prompt board lists it as a book, so
  it can already be switched off per chat there (`book:world-<chatId>`).
- The DM writes only entries whose `memo` starts with `world:`; other entries in the book stay.
- A run: unread messages (cut to 8000 chars, 2500 per message) + the active records (+ retired names) + the
  card names and the user's name (never recorded). Reply JSON `{add, update, retire, summary}`; at most 8
  changes; a known name in `add` becomes an update; retired records never change again and are cut to two
  sentences, `order` 50 instead of 100. A failed or non-JSON reply records `lastError` and leaves `lastKey`,
  so the next run reads the same messages. One retry on a rate limit.

## P1/P2 as built (2026-10-18)
Scope P0-P2 on the user's word; the player may peek at the records (spoiler warning), never at fronts or events.
- Direction comes from the Dashboard sensor (new part "Direction", 8 values, `before` kept for explicit); without
  the Dashboard the DM names it itself. Explicit: no run, no event, chaos and World turn included.
- Triggers: every N, transition (once per sensor snapshot), stagnation (place and cast unchanged, scaled by
  direction: domestic x2, travel x0.5, combat paused), manual. Toggles for stagnation, transition and the insert.
- Fronts: up to 8 active, clocks of 4/6/8. Event: one at a time, hard for director and above, soft news for
  living; carried by one reply (send, next, swipe), checked against the prose next run, re-sent once, then dropped.
  No new event in combat below antagonist. Antagonist and director read the Dashboard's threads.
- Two languages in one chat: record text in the replies' language, the player's spelling of each name as an alias;
  the engine already matches Cyrillic keys in any word form.
