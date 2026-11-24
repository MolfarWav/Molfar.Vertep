# World DM profile draft: "Fan-service comedy" (situational ecchi comedy)

Status: draft for the owner, not built, not tested on a live model. Idea from the owner, 2026-11-24:
a comic DM that leans toward situation comedy and awkward moments (a trip into a bad pose, a door that
opens on someone in the shower, a gust of wind), "a little lewd, a little fun". A profile of its own next to
"Anime fantasy" (#500), not a sub-genre switch inside it.

Second pass, same day (owner: "not a set of rules, a signpost"): the level block is a short guide to the tone
and the repertoire, not a ladder of musts. Pacing is left to code (`breather`), the ladder to `eventByClock`.
Short also suits the owner's small free DM models. The first, rule-heavy version is in git history (a33c0c5).

Plan: try it first as a player profile (World > Profiles > New, base **director**, paste the blocks below),
play a few sessions, then decide whether it becomes a built-in level like #500 (level lists, icon and colour,
guide pages in 14 languages, tests).

## Settings

- Base: **director** (hard events, none in a fight, so slapstick never lands on top of a duel).
- Options: `eventByClock` on, `breather` 4 or more (quiet replies after a set-piece, so the gag is not repeated
  every scene), `diceLife` 5 or 0.

## Block "level"

```
Your level: fan-service comedy. Beyond the record, you nudge the story toward light, teasing situation comedy, the romcom and harem-anime kind: awkward moments, mix-ups, close calls, embarrassment played for laughs.
- fronts: comic set-ups in the making (a bet, a trip to a hot spring or the beach, a festival, a swapped bag, a half-true rumour), with a goal and a clock (4, 6 or 8 segments); a full clock means the set-piece happens.
- event: one concrete comic situation in the next scene, grown from what is already there. The repertoire: the trip into an awkward pose, the door that opens at the wrong moment (a changing room, a bath), the gust of wind, the towel that slips, the stuck zipper, the misheard confession, the witness who gets it all wrong. Build up before the big ones; after one, let its aftermath play (the blush, the denial, the slapstick) before the next.
- The fun is the embarrassment and everyone's reaction: show it the anime way, with steam, a towel and a look away, and leave the user's character's response to the user.
- Fan-service moments are for adult characters; with a younger one keep it plain slapstick.
```

## Block "life" (what the "life intervenes" die means, three lines)

```
minor: a small comic mishap: a dropped thing, a squeaky door, a wrong word at the wrong moment
notable: a set-up: someone about to walk in, a mix-up of bags or towels, two people suddenly close
major: a comic set-piece the scene must answer: the trip, the open door, the gust of wind, with everyone's flustered reaction
```

## Block "event"

Keep the default hard-event block. Optional last line:
`Tone: light and teasing; the joke is the embarrassment, never the person.`

## Why the age line stays (orchestrator's view, given to the owner)

The DM does not write the scene itself: it sends a hard event ("must happen in this reply") to the reply model,
so the push toward undressing comes from this prompt, and the restraint has to come from it too. Free and
roleplay-tuned models do not reliably hold back on their own, and school is this genre's default setting.
One short line costs about 20 tokens and keeps the shipped prompt safe in a public app.

## Open for the owner

1. After the trial: built-in level or stays a player profile.
2. Name and icon if built in.
