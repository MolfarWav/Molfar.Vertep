# Direction, phase 1: draft (#496)

Status 2026-11-22: draft for the owner, no code. Design: `DESIGN.md` (sections 1a, 3.1, 3.6, 3.7); numbers:
`RESULTS.md`. Roleplay branch `claude/direction-phase1` (off main 4.148.0).

## Proposed split: two releases
- **1a: the director and the scene cast.** The director call and its bar, presence driving who answers and whose card
  is whole, the lock "only X" and the return note, Spotlight among the present, a log. No new screens beyond the bar
  and its popovers.
- **1b: group creation.** The full-size picker (clickable mock first: it redesigns an existing screen), the new
  group's editor instead of the chat, a short "New chat" dialog for later chats.
1a does not depend on 1b; 1b is UI only.

## 1a. Engine side

### New plugin `plugins/direction/` (pattern: `plugins/meanwhile/`)
- Pure part first, tested before any model call: `cleanConfig`, `cleanState`, `buildInput`, `parseReport`,
  `applyPrecedence` (alone with one member: commute, break, lunch, club become `alone_moment`), `presenceFor`
  (director, else Dashboard, then the lock on top), `reconcile` (swipe or delete drops reports after the gone message).
- Routes under `/v1/apps/roleplay/`:
  - `GET /direction/state?chatId=`: config, this chat's switch and lock, the newest report, the log.
  - `PUT /direction/config {model?}`: the director's model, one for all chats (see question 1).
  - `PUT /direction/chat {chatId, on?, lock?: { ids } | null}`: the chat's switch and lock.
  - `POST /direction/run {chatId}`: one director call for the newest reply (the client calls it after a reply, in the
    chain of `src/lib/store.ts` after the Dashboard and World).
- The call: the bench prompt (`DIRECTOR_SYSTEM` of `scripts/direction-bench.ts`), member names exactly as on the cards,
  its own log of the last 8 turns (tag and cast), the previous reply cut to 1500 characters, the new pair. Output
  `{ tag, present, sceneNew }`; the bench's `interrupt` and `crowd` keys are not asked (code counts, phase 2).
  Names are matched to members by card name, first name and the registry's aliases (a Russian chat writes "Хана").
- Files: `direction/config.json`, `direction/state/<chatId>.json`
  `{ v, on, lock, pendingReturn, reports: [{ key: "<msgId>#<swipe>", tag, present, sceneNew, model, ms, usage }],
  log: [...] }` (reports keep the newest 30; the log keeps 30).
- No model picked: `run` answers `no-model` and makes no call. Switch off: no call (the client remembers it, like
  `triggerMeanwhile`).

### Scene cast in the engine plugin (`plugins/engine/plugin.js`)
- `groupTurnPlan` (natural): the pool is the present members when presence is known (director or Dashboard);
  naming someone still wins outright, even an absent one (the user calls her in). A pool that would be empty falls
  back to everyone, as now.
- Attention (#294): a weight per member read from the chat (named, spoke, touched by a Dashboard event: raise;
  0.85 a turn otherwise, floor 0.2); pick weight = talkativeness x attention x the Spotlight boost. Computed from the
  messages each time (like `silentTurns`), never stored, so a swipe cannot corrupt it.
- `rosterMembers` (narrator and append): present members whole; an absent member as one line
  "<Name> is not in this scene now." (in the roster, labelled, so the inspector shows it). Muted members stay out as now.
- `spotlightLine`: present members only.
- Lock: the members outside the lock count as absent whatever the reports say; one line goes with the reply:
  "Only <X> is here with <user>; the others appear only when the story brings them." Releasing the lock sets
  `pendingReturn`: the next reply gets "<A, B> come back into the scene: give them a way in." once.
- Where the lines go: appended to the newest user message, where World puts its event (the bench delivered there).

### Dashboard (`plugins/relations/plugin.js`)
- `FULL_FOCUS` 3 to 4, ordered by attention instead of list order; the compact lines of the others present never cut
  to nothing (#294 decisions of 2026-11-08). Only in group chats.

## 1a. UI plan (ux-review section 1)

**Where and how many steps.** A group chat, under the member bar (`src/components/chat/group-member-bar.tsx`), a
second thin bar: the director bar. Zero steps to see it; one tap to change anything on it.

**The bar, left to right** (one row, 40 px on a phone, scrolls sideways inside itself like the member bar, never the
page):
1. Clapperboard icon + "Direction" label (the label hides below 480 px, the icon stays with `aria-label`).
2. Scene chip: the tag in words ("Alone moment", "Lesson") and "with Yuzu" or "4 here". Tap: a popover with who is
   here and who is not, the time of the last report, and "Report now".
3. Model chip: the model name with `ModelMark`, or a tonal "Pick a model" when none. Tap: the chat top bar's model
   palette, moved out of `src/components/chat/chat-quick-bar.tsx` into a shared component (favourites, search, every
   model by connection) and reused here; it writes the director's model, not the chat's.
4. Switch "On" for this chat (`ui/switch.tsx`), disabled with the visible text "Pick a model first" until one is set.
5. A "Log" ghost button: a popover (phone: a sheet, `ui/sheet.tsx`) with the last reports: turn, tag, cast, ms, tokens,
   and every lock and return line sent.

**Presence on the member bar.** Each member chip gets a state: present (as now), absent (dimmed avatar + a small
"away" mark, not colour alone), locked-out (dimmed + a lock mark). The member popover (already there: mute, answer
now, view card, move) gains "Only her in the scene" / "Release the lock" and shows "Here" or "Not in the scene".

**States.** No model: model chip tonal "Pick a model", switch disabled with the reason, scene chip hidden. Off: the bar
folds to the icon + "Direction: off" + the switch. Running: the scene chip shimmers (`TextShimmer`). Error or
`bad-reply`: the scene chip says "No report" with the reason in its popover; the chat falls back to the Dashboard's
presence. Locked: a lock chip "Only Yuzu" with an x to release, before the scene chip. Phone: 40 px targets, the label
words hide, the chips stay.

**Variants considered.**
- A. A second bar under the member bar (pick): always visible, the scene state is the point of the feature.
- B. One "Direction" button on the member bar opening a popover: lighter, but the scene state hides behind a tap.
- C. Inside the Turns popover: fewest new parts, but it is three steps deep and mixes per-chat turn settings with a
  live state.

**Reused:** `ui/popover.tsx`, `ui/switch.tsx`, `ui/sheet.tsx`, `ui/toggle-chip.tsx`, `ui/info-tip.tsx`, `ModelMark`
(`src/components/model-mark`), the palette of `chat-quick-bar.tsx` (extracted, not copied). **New:**
`src/components/chat/director-bar.tsx`, `src/lib/direction.ts` (client calls, the post-reply trigger).

**Words (en; Roleplay's 14 locales).** "Direction", "Pick a model", "Pick a model first", "Alone moment", "with {name}",
"{n} here", "Not in the scene", "Only her in the scene", "Release the lock", "Report now", "Log".

## 1b. Group creation (after 1a)
- Picker: a wide dialog on desktop (the World book dialog's sizing in `src/components/world/world-controls.tsx`:
  620 px or wider, full screen below 768 px). Search, tag filter, favourites, recent, sort; a grid of portraits; a tray
  of chosen members on top (order, remove); the group name with auto-name; "Next". Keeps every control of
  `create-group-dialog.tsx` (name, members, count, cancel, create) and moves its strings into `t()`.
- After Next: the group is made and its editor opens (`src/components/groups/group-editor.tsx`) with a banner "New group:
  check the settings" and a primary "Start chat"; a new "Direction" tab holds the group default (on or off).
- New chat of an existing group: a short dialog (who answers, Direction on or off, World Start or not), "Start", and a
  link to all group settings.
- Unchanged and kept (owner asked, 2026-11-22): a group tile on the Groups page opens that group's editor (settings and
  cast, no banner); its menu keeps New chat (now the short dialog), Favourite and Delete
  (`src/components/views/characters-view.tsx`, `GroupTiles`). In a chat, the member bar's Turns popover still links to
  the group's editor.
- A clickable HTML mock of the picker and the banner before code: `mock-group-create.html`, **approved by the owner
  2026-11-22** after two changes he asked for: a whole group tile opens its editor (the name reads as a link with a
  chevron), and in a group chat the chat's title opens the group's editor (settings and cast).

## Tests (1a)
- Plugin: the pure functions (precedence, name matching with aliases, reconcile on a swipe, no-model and off answers).
- Engine: `groupTurnPlan` with presence and a lock; roster lines for absent members; Spotlight among the present; the
  lock and return lines placed in the newest user message; the inspector labels them.
- Client: the bar's states (no model, off, on, locked, error), i18n keys in all 14 locales.
- Browser check (dark, light, 390 px) with a mock model; the guide page for group chats; the handbook (a new page
  `roleplay-direction.md`; the touched pages: prompt assembly, UI shell, Dashboard).

## Decided (owner, 2026-11-22)
- One director model for all chats, set from any bar.
- A new group chat starts with Direction on when a model is picked; old chats are not touched.
- An absent member's card is one line "<Name> is not in this scene now."; whole again when present.
- **One release** for 1a and 1b together (the split above stays the build order; 1b's mock goes to the owner while 1a
  is built).
- Variant A (the second bar) taken as recommended; question 5 was not asked.

## Questions for the owner (answered above)
1. The director's model: one for all chats (set from any bar), or per chat?
2. A new group chat: Direction on as soon as a model is picked, or off until the user turns it on in that chat?
3. Split into 1a and 1b as above?
4. Absent members' cards: one line "not in this scene" (pick), or keep their whole card but marked absent (costs tokens,
   keeps their look in mind)?
5. Variant A (second bar) for the director?
