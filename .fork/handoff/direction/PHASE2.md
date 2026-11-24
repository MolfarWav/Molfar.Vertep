# Direction phase 2: genre rules, delivery, log, mark, the rom-com set (#496)

Owner's decisions (2026-11-22, asked at the start of the session): the rules live in tabs of the Direction sheet (the sheet's
Scene and Plan tabs come with phase 3; now Rules and Log); World's NPCs are phase 3; the rom-com numbers are my first guesses,
tuned in play; creating rules from scratch and other sets are phase 4. Roleplay branch `claude/direction-phase2`.

## What is built (engine side, Roleplay `plugins/direction/plugin.js`, tests `test/rp-direction-rules.test.ts`)
- **A rule** = `when` (closed list: `tag`, `tagNot`, `min`/`max` present, `alone` N = the same single member alone with the player
  for N replies, `empty` N = nobody present for N replies) + `do` (`interrupt` someone walks in on the moment, `join` someone joins the
  group, `return` someone away comes back) + `need` (2d6 total at least this; 2 = sure, 13 = never) + `cooldown` (replies) + `payoff`
  (`k`, `m`: every K-th firing the rule stays quiet M replies more than its cooldown).
- **The rom-com set** (`SETS.romcom`): `interrupted` "Interrupted moment" (alone 3, interrupt, need 8, cooldown 5, payoff 3/4),
  `nobody` "Someone comes by" (empty 3, not at_home, return, need 7, cooldown 4), `crowd` "Friends join the break" (break, lunch or club,
  two or fewer here, join, need 9, cooldown 6). Defaults of a chat: no set, rules off: an existing chat is never surprised.
- **Decision** after each director report (`runRoute`): judge the note the reported reply carried, then `decideRules`: first enabled
  rule whose conditions hold, not cooling down, with the roll (seeded by chat, rule and the reported reply's key: the same reply always
  rolls the same dice, a swiped reply rolls again). Nothing fires under the lock, in an explicit Dashboard scene, with the switch off,
  when the newest reply has no report, or when this reply has a decision already.
- **Delivery**: the decision is a queued `next` (`{ id, rule, kind, who, with, after, forced, at }`); the engine's `directionScene` counts
  `next.who` as present for that reply (card whole, may answer); `llmRequest` appends the note (the bench's template) to the newest user
  message, label "Direction · rule". Priority: lock, return, World's event or entrance already in this reply, then the rule; a note that
  yields is logged `yielded`. One note per reply.
- **Result**: the director's report of the carrier reply says `came` (the member is in `present`), `mentioned` (the name is in the text) or
  `missed`; written to the firing and the log. A swipe of the carrier opens the firing again so the new try gets the note; deleting the
  reported reply takes the firing (and its cooldown and tension) back.
- **Visible**: per-chat switch `rules.on`, `GET /direction/state` returns `rules` (set, on, sets, items with status ready / cooldown /
  payoff / off, `left`, `tension`), `next`, `fires`; log lines `kind: rule | result | rules | skip`; `POST /direction/fire` (Fire now: no
  roll, no cooldown, no tension, replaces a queued note), `POST /direction/skip`, `PUT /direction/rules`.
- Left out on purpose: place, time and warmth conditions (they need the Dashboard's clock and edges), the `leave`, `spotlight` and
  `event` actions, a per-rule firing limit (cooldown and payoff cover it), writing rules from scratch, other sets.
- Known edge: the engine counts a queued member as present at assembly, before the hook decides the note yields to World; a rare reply
  then has a whole card for someone who does not enter. The player's swipe of the carrier is not counted by `directionScene` (parity with
  the return note).

## UI plan (text; `ux-review` section 1)
- **Where.** The director bar under the member bar. The "Log" button becomes a "Rules" button (opens the Direction sheet, tabs Rules and
  Log; a log popover for a one-off peek is gone, the log is a tab). A chip "Next: <names>" with a skip button shows in the bar while a
  note is queued. Group editor's Direction tab: "Default genre" for new chats. Mark under a reply: beside the dice notes.
- **Steps.** Bar > Rules > pick a genre (one tap) > done; the switch is on with the genre. Fire now: bar > Rules > rule row > Fire now.
- **Reuse.** `director-bar.tsx` (`DirectorBarView`, `DirectionLog`), `ui/sheet.tsx` (bottom sheet on a phone, as the log has now) and
  `ui/dialog.tsx` or a right sheet on desktop, `ui/tabs.tsx`, `ui/fold.tsx` for a rule's numbers, `ui/switch.tsx`, `ui/select.tsx` or a
  segmented row for the genre, `chat/dice-note.tsx` as the model for the mark, `groups/group-direction.tsx`.
- **Rules tab, top to bottom.** (1) Genre row: "Genre" + segmented None / School rom-com (the choice turns the rules on), hint "Rules bring
  characters in by chance when the scene calls for it. Code decides, the model only reports the scene." (2) The rules switch with its
  state in visible words: "Needs the director on" when the chat's Direction is off, "Pick a genre first" with no genre. (3) The queued
  note, when there is one: callout "Next reply: Yuzu walks in on Kaito and Hana. (Interrupted moment)" with Skip; with a forced one
  "(fired by hand)". (4) One card per rule: name, a one-line sentence of what it does in plain words, its switch; a status line: Ready /
  "Cooling down: 3 more replies" / "Quiet for the payoff: 6 more replies" / "Tension 2 of 3"; a ghost "Fire now" button (disabled with a visible
  reason when nobody is away or the scene is locked); a fold "Numbers" with chance (2d6 at least N, with the percent next to it: 100, 97,
  92, 83, 72, 58, 42, 28, 17, 8, 3 for 2 to 12; 13 = never), cooldown (replies), payoff every K and quiet M (0 = no payoff), each with a
  hint line. A "Restore defaults" on the card when edited.
- **Log tab.** The phase 1 log plus: rule fired ("Interrupted moment: Yuzu walks in. alone with Hana for 3 replies. 2d6 = 9, needed 8"),
  rule rolled but missed ("Interrupted moment: roll 2d6 = 6, needed 8, nothing happens"), result (came / only mentioned / did not come /
  yielded to World, the lock or the return), genre switched, skipped.
- **Mark under a reply.** One muted line with an icon: "Direction: Yuzu walks in (Interrupted moment, 2d6 = 9, needed 8) · came"; for
  Fire now "fired by hand". Shown for the reply that carried the note, found by the firing's `carrier`; no mark with the switch off.
- **States.** No plugin: nothing. Director off: the Rules tab shows the genre and numbers read-only with the reason. No model: the same.
  Loading: skeleton. Error from a route: toast with the plugin's message. Empty log: the existing empty text. Phone: the sheet is the
  full-height bottom sheet, rows 40 px or more, the numbers fold full width.
- **Variants considered.** (A) tabs in the sheet (chosen by the owner); (B) a popover only for rules (rejected: the log and Fire now
  need room, a phone needs a page).

## Not checked yet (after this phase)
- A real model: do the rules fire at sensible moments in a long chat; are the numbers right (K 3, M 4, cooldowns).
- The note landing in the narrator's reply on a free model; `came` rate in play.
