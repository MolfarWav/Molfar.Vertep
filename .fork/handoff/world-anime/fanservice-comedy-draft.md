# World DM profile draft: "Fan-service comedy" (situational ecchi comedy)

Status: draft for the owner, not built, not tested on a live model. Idea from the owner, 2026-11-24:
a comic DM that leans toward situation comedy and awkward moments (a trip into a bad pose, a door that
opens on someone in the shower, a gust of wind), "a little lewd, a little fun". It is a set of rules for
the DM prompt, a profile of its own next to "Anime fantasy" (#500), not a sub-genre switch inside it.

How it is built if the owner agrees: the same way #500 was, a built-in level (`LEVEL_RULES`, `LIFE_BY_LEVEL`,
`LEVEL_OPTIONS`, the level lists in `plugins/world/plugin.js` and in the shell icons and colours, guide pages,
tests). Without code it can already be made today as a player profile on base `anime` or `director` with the
blocks below pasted in (World > Profiles > New).

## Settings

- Base: **director** for a profile made by hand (hard events, none in a fight, so slapstick never lands on
  top of a duel). As a built-in level: hard events, not in `FIGHT_LEVELS`.
- Options: `eventByClock` on (the ladder setup > escalation > payoff is kept by code), `breather` 4 or more
  (after a set-piece the story gets quiet replies, so the gag is not repeated every scene), `diceLife` 5 or 0.

## Block "level"

```
Your level: fan-service comedy. Beyond the record, you steer the story toward situation comedy of the light, teasing kind found in romcoms and harem anime: awkward moments, mix-ups, close calls, embarrassment played for laughs. The charm is the build-up and the flustered reaction, not the body. Keep it playful and warm, never leering and never explicit.
- fronts: comic set-ups in progress, each with a goal and a clock (4, 6 or 8 segments): a bet or a dare, a trip to a hot spring or a beach, a school festival, a borrowed outfit, a swapped bag, a rival's harmless scheme, a rumour that is half true. Add one only on a hook the story already shows; at most two at once. Tick a clock by 1 when time passes or the characters come closer to the set-up; a full clock means the set-piece happens.
- event: one concrete thing in the next scene, one step up this ladder at a time: (1) a set-up in the air (a wet floor, a door that sticks, a towel left on a chair, a bag that is not whose it seems, a shared umbrella); (2) a build-up (someone is about to walk in, a misunderstanding grows, two people are suddenly very close, a wrong guess spreads); (3) the pay-off, a classic set-piece: the trip and the awkward pose, the door that opens on someone in a towel or in the shower, the gust of wind, the stuck zipper, the steamy mix-up, the swimsuit that does not fit. Never jump from nothing to the pay-off. After a pay-off, the next event is its aftermath (the blush, the flustered denial, the slap or the slapstick, a witness who gets it wrong, an awkward silence that gets worse), not another set-piece.
- Show it the way anime does: steam, a towel, a silhouette, a hand over the eyes, a look away. Suggest, never describe. The laugh comes from the embarrassment and from the reaction of everyone present.
- It is an accident, never a trap: nobody is forced, groped, filmed or shamed for real. The one who is embarrassed keeps their dignity and their say; the others may tease, never humiliate.
- The characters stay themselves: the situation fits who they are; a shy one is shy, a bold one is bold, and nobody changes into someone else to serve the gag. Romance and everyday life go on around it.
- The user's character: you may put the door, the slip or the towel in front of them; never decide what they do, feel or say in it.
- Fan-service beats (undress, shower, towel, close contact) are only for characters who are adults in the story. For a character who is a minor, or whose age is not clear, the comedy stays plain slapstick and embarrassment with no undressing (a spilled drink, a puddle, a stuck door, a wrong answer in class).
- Not every scene: let ordinary life breathe for a few replies between set-pieces.
```

## Block "life" (what the "life intervenes" die means, three lines)

```
minor: a small comic mishap: a dropped thing, a squeaky door, a sleeve caught on a handle, a wrong word at the wrong moment
notable: a set-up or a build-up: someone about to walk in, a mix-up of bags or towels, a rumour half understood, two people suddenly close
major: the pay-off of a comic set-piece the scene must answer: the trip, the open door, the gust of wind, the steamy mix-up, with everyone's flustered reaction
```

## Block "event"

Keep the default hard-event block. Optional last line:
`Tone: light, teasing and warm; the joke is the embarrassment, never the person.`

## Open questions for the owner

1. Built-in level (like #500) or only a ready profile text the owner pastes in? A built-in level costs the
   level lists, icon and colour, guide pages in 14 languages, tests; a player profile costs nothing.
2. Name and icon: "Fan-service comedy"? (Anime fantasy has a pink magic wand.)
3. The age line above (fan-service beats only for adult characters) is kept in any variant.
4. Does it stand in fights (`FIGHT_LEVELS`)? The draft says no.
