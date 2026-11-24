# Direction phase 3a: the beat plan and the scene boundary (#496)

Owner's decisions (2026-11-22, asked at the start of phase 3): two releases (3a: beat plan + scene boundary for beats and for World's
entrances; 3b: World NPCs inside rules and beats); the player writes beats by hand in a Plan tab (no templates, no draft from cards:
phase 4); the scene-boundary wait for World's entrances is a switch in World's settings, on by default, visible in World's cast panel.
Roleplay branch `claude/direction-phase3`. The 6-reply wait is a first guess (design 3.3), tuned in play.

## What is built (engine side; Roleplay `plugins/direction/plugin.js`, `plugins/world/plugin.js`)
- **Beat** = `{ id, text (400 max), who[] (members who take part; those away come in), when, wait, skipped }` plus server fields
  `skipN`, `addedN` (reply count when added), `dueKey`, `dueN`, `dueWhy`. `when`: `{kind:"replies", n}` after N replies from when it
  became the next beat (0 = at once), `{kind:"tag", tag}` the director reads this scene kind, `{kind:"place", place}` the Dashboard's
  place holds these words, `{kind:"manual"}` only "Fire now". At most 20 beats. State file: `plan: { beats }`.
- **Order.** Only the first unfinished beat is looked at. Finished = delivered (came / mentioned / sent), failed (two misses), skipped.
  The next beat counts from the reply count at which the one before it ended.
- **Boundary wait.** When the condition holds the beat is DUE (`dueKey`, `dueN`, log "beat due"); it then waits up to 6 replies
  (`BOUNDARY_WAIT`) for a scene boundary (the director's `sceneNew` of a reply from the due one on, or the Dashboard's newest snapshot of
  the newest reply saying a new scene or another place), then goes anyway. A beat with `wait: false`, a place beat (arriving is the
  boundary), and a retry after a miss or a yield go at once. Holds in an explicit Dashboard scene, under the lock, with the switch off.
- **Delivery = the rules' queue.** A firing is a ledger entry `rule: "beat:<id>"`, `kind: "beat"` and a queued `next` (who may be
  empty for an event-only beat); the note (label "Direction · beat") rides the next reply; the engine counts `next.who` as present.
  Decided in `runRoute` after the report, a beat before the rules (one note per reply). Judged like a rule (came / mentioned / missed);
  a beat with nobody to look for is `sent`. One retry after a miss (stricter note), then given up. A yield to World / the lock is not
  a miss: the beat stays and goes again at once. A beat's status is derived from the ledger, so a swipe of the carrier reopens it and a
  delete takes it back (`reconcile`, `reopenForSwipe` need no beat code); `dueKey` goes when its reply is gone.
- **Routes.** `PUT /direction/plan {chatId, beats}` (the whole list; new beats get an id and count from now; a changed `when` clears
  the due state; deleting or skipping drops a queued note), `POST /direction/fire {chatId, beat}` (Fire now: no condition, no wait),
  `GET /direction/state` returns `plan: { beats: [{ id, text, who, when, wait, tries, status, left?, hold?, result?, met? }], whenKinds,
  tags, boundaryWait, max, textMax }`; status = waiting | due | queued | delivered | skipped | failed | behind; `left` = replies still to
  count (waiting, replies kind) or replies left of the boundary wait (due); `hold` = off | lock | explicit.
- **World's entrances.** `sceneOf` returns `moved`; `sceneBoundary` (Dashboard + the director's report) and `boundaryHold` in
  `llmRequest`: a due bench or deck person waits up to 6 replies for the boundary (`state.castWait = { n }`, restored by rollback),
  then comes. Nothing waits when neither the Dashboard nor the director can say. Setting `castBoundary` (default true). `castStatus`
  returns `boundary: { on, wait, holding, left }`. The Life die's intrusion is not held.
- Tests: `test/rp-direction-plan.test.ts` (28), `test/rp-world-cast-boundary.test.ts` (9), 3 more in `rp-world-cast-stage.test.ts`.

## UI plan (text; `ux-review` section 1)
- **Where.** The Direction sheet gets a Plan tab: Rules | Plan | Log. Steps: bar > Rules button (opens the sheet) > Plan > Add beat.
  The bar's Next chip and the sheet's queued-note callout say "beat" for a beat. World: the cast settings get one switch.
- **Reuse.** `direction-sheet.tsx` (tabs, `Card variant="rows"`, `SettingRow`, `Segmented`, `NumTile`, `Fold`, the callout), `ui/confirm`
  for delete, `ui/textarea`, `ui/input`, `ui/select`, `ui/switch`, the member chips of `director-bar.tsx`/`group-member-bar.tsx`,
  `direction-log.tsx`, `direction-note.tsx`, `lib/direction-ui.ts`. New: `direction-plan.tsx` (the tab) and the beat editor in it.
- **Plan tab, top to bottom.** (1) One hint line: what a beat is and that beats go in order. (2) The queued-note callout when a beat
  is queued (text, Skip). (3) One card per beat: number, its text (three lines at most), who takes part (names), "When" in plain
  words, a status line with a dot (Waiting: N more replies / Due: waiting for a new scene, up to N replies / Goes with the next reply /
  Delivered: came, mentioned, sent / Did not land / Skipped / After the beats before it), the hold reason as visible text when held
  (Direction is off, scene locked, explicit scene); actions: Fire now (ghost, disabled with a visible reason), Edit, Skip or Unskip,
  Move up, Move down, Delete (confirm). (4) An "Add beat" button (outline, tonal) below the list; the editor opens in place.
  (5) Empty state: what a beat is, an example, the Add beat button.
- **Beat editor** (inline card, also used to edit): textarea "What happens" (placeholder: an example), "Who takes part" member chips
  (optional; hint: members who are away come in for it), "When" segmented After some replies / Scene / Place / By hand with its one
  value (a number tile 0-200 "replies", a select of the scene kinds in plain words, a text input with placeholder "e.g. roof, café",
  nothing), switch "Wait for a new scene" (default on; hint: waits up to 6 replies for a new place or a time jump; for a place beat and
  a by-hand beat the switch is replaced by the line "Goes the moment the story is there" / "Only when you fire it"), Save (primary)
  and Cancel. Save is disabled with a visible reason while the text is empty. The whole list is sent back with `PUT /direction/plan`.
- **States.** Director off / no model: the plan is editable, a line says it runs only while Direction is on. Over 20 beats: Add
  disabled with the reason. Error from a route: toast with the plugin's message. Phone: the sheet is the full-height bottom sheet, rows
  and icon buttons 40 px or more, nothing hover-only, no sideways scroll.
- **Log and marks.** Log lines `kind: "beat"` (`state: due | fired`, `beat`, `text`, `who`, `why`, `forced`): "Beat «text» is due (why)",
  "Beat «text» goes with the next reply (why)"; `kind: "result"` with `rule: "beat:<id>"` shows the beat's text as the name; result
  `sent` reads "went in". The mark under the carrier reply: "Direction: beat «text» · came".
- **World.** Settings > cast (where Frequency and the deck switch are): switch "Wait for a new scene" with the hint "Someone who is due
  to come back waits up to 6 replies for a new place or a time jump, then comes anyway." The cast panel's status line says "Waiting for a
  new scene: N more replies" while `boundary.holding`.

## Left on purpose (3a)
Beat templates and a draft from the cards (phase 4); a beat's own dice or probability; conditions by time of day or warmth; a beat
bringing a World NPC (3b); reordering by drag (up and down buttons only); the Scene tab.

## Not checked yet
A real model and a real chat: do beats land, is `came` common, is 6 replies the right wait, does a place text match the Dashboard's
wording (a free-text substring match, case-insensitive).
