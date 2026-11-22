# Direction bench, phase 0: results (#496)

Date 2026-11-22. Method: `BENCH.md`. Script: Roleplay `scripts/direction-bench.ts` (branch `claude/direction-bench`,
commit 0ad12319) plus the existing `scripts/director-bench.ts` for the sensor replay. Corpus outside any repo
(`D:\Claude\tmp\direction-bench\` on the laptop): synthetic, 48 turns, five members, English.
Every run is one run; a few points of difference are noise (#401 measured the band).

## Key facts (each stands alone)

1. A small director call (about 1.1k tokens in, 50-250 out, 4-11 s) tells who is in the scene better than the
   Dashboard sensor (exact cast 92-96% against 83%; "alone with X" 98% against 94%) at a sixth of the input.
2. Models report state well and count badly: code over any model's state found 3 of 3 "alone for 3 turns" events;
   the models' own yes/no on the same rule scored F1 17-36%, except MiMo 2.6 Flash at 92%.
3. Scene tag: the models ignore the precedence rule (alone with one member wins over commute, break, lunch, club).
   Code applying it on top of the director's tag raises accuracy from 65-73% to 83-90% (MiMo 90%).
4. Stage notes were delivered in 71 of 72 replies on all three models (interrupt 36 of 36, crowd 11 of 12, lock held
   18 of 18, return 6 of 6), in a simplified prompt. A model-written note did no better than a template.
5. MiMo 2.6 Flash as the Dashboard sensor thinks at length (about 4.2k output tokens, 68 s a turn on average, up to
   7000 tokens and 2 minutes) and was the worst sensor (exact cast 67%); as the director it was the best of the three
   on tag and scene boundary. Its use is the director, not the sensor.

## M4 + M1 + M2: state, tag, rules

A = Dashboard sensor (the real plugin replayed) + code tag + code rules. B = director call; rules by code over its
state. B-direct = the director's own yes/no for the rule. Events: found of key (+ extra), within one turn.

| variant | exact cast | aloneWith | sceneNew F1 | tag | tag + code precedence | interrupt events | crowd events | in / out tokens, s per turn | B-direct interrupt / crowd F1 |
|---|---|---|---|---|---|---|---|---|---|
| A DeepSeek V4 Flash | 83% | 94% | 75% | 63% | (code tag) | 3/3, +0 | 4/7, +2 | 6468 / 613, 6.0 | |
| A GLM 5.2 | 83% | 94% | 79% | 79% | (code tag) | 3/3, +0 | 6/7, +1 | 6915 / 1185, 16.5 | |
| A MiMo 2.6 Flash | 67% | 88% | 65% | 71% | (code tag) | 2/3, +0 | 3/7, +2 | 6735 / 4209, 68.5 | |
| B DeepSeek V4 Flash | 92% | 98% | 68% | 65% | 83% | 3/3, +0 | 4/7, +1 | 1133 / 53, 4.2 | 36% / 0% |
| B GLM 5.2 | 96% | 98% | 79% | 67% | 85% | 3/3, +0 | 4/7, +0 | 1134 / 52, 6.6 | 17% / 57% |
| B MiMo 2.6 Flash | 92% | 98% | 82% | 73% | 90% | 3/3, +0 | 5/7, +0 | 1150 / 249, 10.8 | 92% / 59% |

Key events: interrupt at turns 30, 35, 41; crowd at 6, 9, 12, 15, 16, 24, 32. The `payoff` rule was not exercised: no
member had two interrupted stretches in this corpus.

Where the tag goes wrong: the directors put an alone walk home as `commute`, an alone club hour as `club`, and the
date as `commute` or `alone_moment`; code fixes the first two. The code tag over the sensor confuses a lesson with a
break when fewer than four are present, and `date` with `alone_moment` (it reads only place words and the weekday).

## M3: delivery

12 points (6 interrupt, 2 crowd, 3 lock, 1 return) x 3 reply models x 2 note kinds. Prompt: a narrator-group system
prompt with the members' short cards, the last 4 turns, the player's message with the note appended. Judge: one model
outside the three, rubric came / mentioned / ignored and leaks; a sample read by hand agreed.

| reply model | note | interrupt came | crowd came | lock held | return all came | words | s |
|---|---|---|---|---|---|---|---|
| DeepSeek V4 Flash | template | 6/6 | 1/2 | 3/3 | 1/1 | 241 | 8.9 |
| GLM 5.2 | template | 6/6 | 2/2 | 3/3 | 1/1 | 228 | 15.3 |
| MiMo 2.6 Flash | template | 6/6 | 2/2 | 3/3 | 1/1 | 209 | 21.3 |
| DeepSeek V4 Flash | written | 6/6 | 2/2 | 3/3 | 1/1 | 213 | 10.0 |
| GLM 5.2 | written | 6/6 | 2/2 | 3/3 | 1/1 | 219 | 11.2 |
| MiMo 2.6 Flash | written | 6/6 | 2/2 | 3/3 | 1/1 | 221 | 9.6 |

The one miss: Rin came, spoke and left within the same reply (judged "mentioned" at the end).

## Limits

- Synthetic chat written by one strong model from an outline; real play is messier (Russian, swipes, long replies).
- Delivery was tested in a short prompt; the app's prompt is far longer (preset, Dashboard insert, World). Phase 0b
  repeats the 12 notes through the real prompt assembly.
- The director got its own log of the last 8 turns (tag and cast); the app must keep that log.
- Lock was tested without a player pushing to bring others in.

## Decisions taken from this (owner, 2026-11-22)
See `DESIGN.md` section 1a: the duo; the director as its own small call with its own bar; no default model, the
chat top bar's palette reused; no model-written note.
