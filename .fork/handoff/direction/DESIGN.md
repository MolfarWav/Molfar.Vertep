# Direction ("Режисура") for group chats: design note (Roleplay)

Status 2026-11-22: design agreed with the owner, no code. Roleplay code lives in the Roleplay fork
(MolfarWav/Molfar.Vertep-Roleplay); this repo carries the notes. Folds in #294 (attention weight, who is in the scene)
and #430 point 2 (scene boundary). Earlier group work this builds on: `.fork/handoff/group-dynamics/DESIGN.md`
(interruptions, own goals, voices, Spotlight), `.fork/handoff/group-chats/PLAN.md`, #424 (bench, cast deck, judge).
Not to be confused with #401 "turn director" (which part of the sensor runs when); the scene-tag reading below may
later move into #401 as one of its specialists.

## 0. Why

The owner's example: a school romantic comedy with several girls, where the user and one of them can never stay alone
for long, someone always walks in. Today a group chat cannot be steered that way:
- The only hard lever on who is in the scene is the per-chat mute (member bar, `meta.turns.mutedIds`). It is manual,
  the model is never told the person left, and their lines stay in the history.
- The Dashboard sensor tracks `present` and `direction` (scene kind), but neither decides who answers (`groupTurnPlan`)
  nor whose card goes into the narrator or append roster (`rosterMembers`, muted only).
- Spotlight counts every unmuted member, not the present ones, so it pulls absent people back: the opposite of
  "only X for a while".
- Nothing plans scene beats or genre rules for the group's members; World DM plans the world (fronts, deck, bench).
- Creating a group is a 512 px dialog with a 2-column list capped at 288 px, no search, strings not translated, and
  "Create" opens a chat at once with defaults the user never saw (`create-group-dialog.tsx`, `createGroup`).

## 1. Decided (owner, 2026-11-22)

- **Who decides:** code decides that a rule or beat fires (conditions from the Dashboard state, 2d6 and cooldown);
  a model only writes the concrete stage note, behind a switch. Plus **scene-type reading** (an intimate moment between
  two, a general scene, a lesson, ...), tried both as code and as a director model on a **bench** before it is fixed.
- **v1 holds all four parts:** scene cast (#294 + lock), genre rules, beat plan + scene boundary (#430 p2), genre sets.
- **Who can be moved:** group members and World NPCs (bench and cast deck), judged by the existing came/mentioned judge.
- **Where:** a "Direction" button in the chat's member bar opens a sheet; group defaults live in the group editor.
- **Group creation:** a full-size picker, then the new group's editor (not the chat); a short "New chat" dialog for
  later chats of an existing group.

## 1a. Decided after the bench (owner, 2026-11-22; numbers in `RESULTS.md`)

- **The duo, confirmed:** the model reports the state (who is present, the base scene tag, a new scene), code applies
  the `alone_moment` precedence, counts turns and absences and decides firing. The model never counts.
- **The director is its own small call** (about 1.1k tokens in, 50-250 out), not a part of the Dashboard sensor. The
  sensor keeps its own job (moods, things, knowledge). In a group chat the director gets **its own bar** with a model
  choice.
- **No default model:** the user picks the director's model. The picker is the palette of the chat's top bar
  (`src/components/chat/chat-quick-bar.tsx`: favourites, search, every model by connection), moved into a shared
  component and reused, not a new picker. Until a model is picked, the director does not run and its bar says so.
- **No model-written note:** template notes delivered as well as model-written ones (71 of 72 together), so variant C
  and the "note writer" switch are dropped from the plan.

## 2. What exists and is reused

- Dashboard sensor (`plugins/relations/plugin.js`): `present`, `struck`, `direction` (domestic, social, intrigue,
  investigation, travel, combat, explicit, transition), `scene: { new, label }`, place, story clock, `at`, relation
  edges; manual `leave-scene` / `enter-scene` in `POST /dashboard/notes`.
- World (`plugins/world/plugin.js`): `rollFate` / `diceOutcome` (2d6 bands), the firm note, `judgeEntrance`
  (came / mentioned), snapshots and `reconcile` for swipes, the bench and the cast deck, the event slot in `llmRequest`.
- Engine plugin (`plugins/engine/plugin.js`): `groupTurnPlan`, `silentTurns`, `spotlightLine`, `groupDynamicsText`,
  `rosterMembers`, `groupExcludedBookIds`; the owner's 2026-11-08 decisions in #294 (four in full focus, others present
  never cut to nothing).
- UI: `GroupMemberBar` (`src/components/chat/group-member-bar.tsx`), the group editor (`group-editor.tsx`: tabs
  Overview, Members, Scene, Turns, Lore, Chats), the chat's Turns override.

## 3. Design

### 3.0 Scene type and genre tags
- Base: the sensor's `direction`, unchanged (World's stagnation depends on it).
- A genre set adds its own tags on top (rom-com: lesson, break, club, date, alone moment, festival, at home ...).
- Three variants on the bench (section 5): A code only (place, time of day, who and how many present, `direction`);
  B a director model picks a tag from the closed list; C code decides firing, the model writes the note.
- In the app: a per-chat switch "who reads the scene: code / model" for live tests.

### 3.1 Scene cast (#294 + lock)
- `natural`: only members in `present` can be picked when the Dashboard is on; naming someone still wins.
- Attention weight per member, kept in the chat: raised when named, when they speak, when a Dashboard event touches
  them; times 0.85 per turn without them, never below a floor. Pick weight = talkativeness x attention x Spotlight boost.
- Prompt (narrator, append): present members in full, the top four by attention in full Dashboard focus; absent members
  as one line "X is elsewhere (where, if known)". Compact lines of the present never cut to nothing (#294 decisions).
- Spotlight counts only present members.
- **Lock "only X"** (chip in the member bar and the sheet): the others count as absent whatever the sensor says; the
  reply gets "Only X is here with {{user}}; the others appear only when the story brings them". Releasing the lock sends
  one return note on the next reply ("they come back: give them a way in").
- Mute stays and means "out of this chat", not "out of this scene".
- Without the Dashboard: degraded, names in the user's message only.

### 3.2 Genre rules
- Rule = **when** (closed list of conditions: scene type or tag; who and how many present; "user alone with X for N
  replies"; place; time of day; relation warmth at least; after an event or beat) -> **do** (bring in a member or NPC,
  interrupt, take someone out, an event text, Spotlight someone) + chance (2d6 band) + cooldown + limit.
- **Build-up and payoff:** each time a rule fires it adds 1 to its tension counter; at K the rule yields a window of
  M replies where it does not fire ("finally alone"), optionally a planned beat. Without the payoff the trope wears out
  by the third time.
- Note text: a template with names filled in (variant C, a model-written note, was dropped after the bench).

### 3.3 Beat plan + scene boundary (#430 p2)
- Ordered beats: `{ text, who[], when: after N replies | at a place | scene tag | time | after beat X | manual "now",
  status: pending | due | delivered | skipped }`.
- A due beat, and a due bench or deck entrance of World, waits up to 6 replies for a scene boundary (`scene.new`:
  place change or time jump), then fires anyway. A time jump of a day or more adds to a person's silence.
- Delivery judged like World events and entrances (delivered flag, came / mentioned); one retry, then skipped.

### 3.4 Genre sets
- Built in: school rom-com, harem, slice of life, drama. Each = tags + rules + beat templates.
- "Draft from the cards": one build-model call drafts rules and beats from the members' cards; the user trims and
  accepts, as in World Start.

### 3.5 Delivery, rollback, visibility
- At most one stage note per reply for World and Direction together. Priority: lock or return > beat > rule. Direction
  yields to a pending World event. Rules of the built-in sets do not fire in `explicit` unless the rule says so.
- The note is appended to the newest user message, where World puts its event.
- State per chat with snapshots like World: a swipe or a delete rolls back, the dice roll again.
- Visible (owner's standing rule for anything under test): a main switch; a log (rule, which conditions matched, the
  roll, who, why, delivered or not, came or mentioned); a mark under the reply ("Direction: Mia walks in (Interrupted
  moment, 2d6 = 9)"); "Fire now" on every rule and beat.

### 3.6 Group creation
- **Picker:** a wide sheet on desktop, full screen on a phone. Search, tag filter, favourites, recent, sort; a grid of
  large portraits (3-5 columns on desktop); a tray of chosen members on top (order, remove); group name with auto-name
  when blank; "Next". Keeps every control of the old dialog (name, members, count, cancel, create). Strings go through
  the app's i18n. Clickable mock before code (redesign of an existing screen).
- **After Next:** the group is created and its editor opens (not the chat), with a banner "New group: check the
  settings" and a primary "Start chat". A new "Direction" tab in the editor holds the group defaults (set, rules, plan;
  in phase 1 only the scene cast).
- **New chat of an existing group:** a short dialog with this chat's overrides (who answers, Direction set, World Start
  or not), "Start" and a link to all group settings; reuses the chat's Turns override.
- No separate wizard: it would duplicate the editor's settings.

### 3.7 UI plan (text, ux-review before building and before done)
- Director bar: its own thin bar in a group chat, under the member bar: the scene tag and who is here as the director
  sees them, the model chip (opens the shared model palette; "pick a model" until one is picked), the switch, and the
  button that opens the sheet. Each member's avatar in the member bar marks present, absent or locked.
- Sheet: 620 px dialog on desktop, full screen on a phone; tabs Scene (type and tag, who is here, lock chip, attention
  per member), Rules, Plan, Log.
- Group editor: tab "Direction" (default set and defaults); banner and primary button for a new group.
- Mark under the reply next to the existing World and dice marks.

## 4. Where the code goes (proposal, check while building)
- A new plugin `plugins/direction/` beside relations and world: reads Dashboard snapshots and the World bench the way
  World already reads the Dashboard; owns rules, beats, tension counters, the log and its snapshots.
- Cast changes (3.1) live where the code is today: `groupTurnPlan`, `rosterMembers`, `spotlightLine` (engine plugin),
  the focus in relations.
- Scene boundary for World entrances goes into World's bench code.

## 5. Phases
0. **Bench.** Replay real group chats (start from `scripts/sensor-replay.ts` of #236 and #401). Answer key labelled by a
   strong model, spot-checked by the owner. Compare A, B and C on scene tag and on which rule should fire: accuracy,
   tokens, time, on free models; groups of 3-5 present.
   Done 2026-11-22 (`RESULTS.md`). Still open: **0b**, the same 12 notes through the app's real prompt assembly
   (preset, Dashboard insert, World), before phase 2 relies on delivery.
1. **Scene cast + group creation + the director call and its bar.** 3.1, 3.6, 3.7; scene cast reads `present` from
   the director when it runs, from the Dashboard otherwise.
2. **Rules, delivery, log, mark, the rom-com set.**
3. **Beat plan and the scene boundary** (also for World's bench and deck).
4. **Other sets, draft from the cards.**

## 6. Open
- K and M of the payoff, the 0.85 decay and the floor, the 6-reply boundary wait: first guesses, tuned on the bench and
  in play.
- Whether the scene-tag reader becomes a #401 specialist once #401 is built.
- How a genre set is shared (file format, a Store entry or only built in).
