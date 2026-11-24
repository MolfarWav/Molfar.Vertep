# World DM profile draft: "Fan-service comedy" (situational ecchi comedy)

Status: RELEASED as a level in Roleplay 4.155.0 (PR 201, merge 151f6d93; not played on a live model); the texts below are the third pass. Idea from the owner, 2026-11-24:
a comic DM that leans toward situation comedy and awkward moments (a trip into a bad pose, a door that
opens on someone in the shower, a gust of wind), "a little lewd, a little fun". A profile of its own next to
"Anime fantasy" (#500), not a sub-genre switch inside it.

History, same day: first a rule-heavy version (a33c0c5), then a short signpost with a list of situations
(53cb9b9). Third pass, the owner's two points:
1. A list of situations (steam, doors, towels) anchors the model: it sends an unlocked door ten chats in a row
   instead of reading the scene. So the block names no situations: the joke comes from this place, these things,
   these people.
2. How lewd it gets, and how a character takes it, is decided by the card and the Dashboard, not by the DM: for a
   married couple a flustered slap looks odd. So the DM sends the situation only, never the reaction. This
   matches the split already in code: the hard-event block says "the characters react in character", and the
   reply model is the one that sees the cards and the Dashboard.

What the DM actually sees (checked in `dmInput` / `levelInput`, Roleplay 4.154.1): the names of carded
characters (not their cards), the world record, the scene's place, what people wear and carry, the new part of
the story, the fronts, the pending event, the direction, and on director, antagonist and anime the Dashboard's
open threads. Not the Dashboard's relationship numbers, not its own past events.

Plan: try it as a player profile (World > Profiles > New, base **director**, paste the blocks below), play a
few sessions, then decide whether it becomes a built-in level like #500.

## Settings

- Base: **director** (hard events, none in a fight; gets the Dashboard's threads).
- Options: `breather` 4 or more (quiet replies after a big event), `diceLife` 5 or 0. `eventByClock` not needed.

## Block "level"

```
Your level: fan-service comedy. Beyond the record, you nudge the story toward light, teasing situation comedy, the romcom and anime kind: awkward moments, mix-ups, close calls, a little lewd, played for laughs.
- fronts: comic set-ups in the making, taken from this story (a plan, a trip, a secret, a rivalry, a misunderstanding), with a goal and a clock (4, 6 or 8 segments); a full clock means the set-up pays off.
- event: one awkward or comic situation in the next scene, built from what is there now: this place, the things in it, who is present and what they are doing. Each one different from the last. If the scene offers nothing funny, send no event.
- Send the situation only, never the reaction: how each character takes it is up to them, who they are and where they stand with each other.
- Lewd moments only between adult characters.
```

## Block "life" (what the "life intervenes" die means, three lines)

```
minor: a small comic mishap made of what is in the scene
notable: an awkward turn: bad timing, a mix-up, someone where they should not be
major: a comic situation the scene must answer, the most awkward thing this place and these people allow
```

## Block "event"

Keep the default hard-event block (it already says "the characters react in character").

## Why the age line stays (orchestrator's view, given to the owner)

The card and the Dashboard decide the heat, but the DM picks the situation without seeing the cards (names
only), and its event reaches the reply model as "must happen in this reply". So the one thing the DM itself must
not send is a lewd situation for a younger character. One short line, no effect on adult chats.

## If it becomes a built-in level: one code idea

The DM does not see the events it sent before (`state.log` keeps run summaries, not events), so "each one
different from the last" is a hope, not a check. Feeding the last 3-5 delivered events into `levelInput`
("Recent events, do not repeat their kind") would fix repetition for every level, not only this one.

## Open for the owner

1. After the trial: built-in level or stays a player profile.
2. Name and icon if built in.
3. The recent-events idea above: worth doing for all levels?
