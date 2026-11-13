# Turn director: three experiments after phase 0

Date: 2026-11-13. For the executor who owns `scripts/director-bench.ts` (Roleplay) and the
corpora. Read first: `.fork/handoff/turn-director/MEASUREMENTS.md` (key facts, 3.2, 3.4, 5.3, 9).
Nothing here changes the shipped plugin; every item is a new run tag in the bench.

## What phase 0 already settled (not to be repeated)
- Splitting into specialists and gating them by a router costs 2x or more and does not raise F1.
- The chat's length is not in the sensor's input. Input moves with the reply length and the cast.
  The fixed rules (4.3k tokens) are 35 to 60% of every call.
- One call on the cheap model costs about $0.11 per 100 turns. Cost is not the problem.
  The problems are accuracy (signals F1 50 to 59%) and time per turn (14 to 22 s).
- The model family and the wording of the rules moved the numbers; the architecture did not.
- The 13 direct questions were the most accurate detector (F1 61 to 77%), as a separate call.

## Experiment 0: the noise band (do this first; it decides how to read everything else)
Repeat `baseline-v2` three times on the narrator chat (C) with the same model and settings.
Report per signal and micro F1: mean, min, max. Any later difference smaller than this band is
not a result. Cost: three runs of a call that is already cheap.

## Experiment 1: questions first, inside the one sensor call (run tag `ask-first`)
Idea: keep one call and one input, but make the model decide what changed before it writes
anything, and write only what changed.
- The output's first key is `changed`: the 13 booleans of the router (same definitions as 3.1,
  v2 wording, "when unsure, answer true").
- Rule added to the output shape: "Write a section only when its question is true. Leave every
  other key out; the tracker keeps the previous value." Mapping, same as the specialists' signal
  ownership in 4.1: place, time, scene cut, people in or out -> the scene keys; clothes, items ->
  outfit, holding, objects; relation event -> events, edges; secret, vow -> learned, said, told,
  people, blindSpot; the three quest signals -> threads. Mood, condition and thought of present
  characters stay every turn.
- Code side in the bench: a key that is absent means "unchanged" (check that the plugin's
  `applySensor` path already treats a missing key so; where it does not, shim it in the bench
  only). The rules text for each section stays as it is.
What it should show, against `baseline-v2` on C, A and S with the cheap model and with the best
sensor model of the model table:
- signals F1 and recall, from the `changed` flags and, separately, from the state as today;
- false positives of `clothes_change` and `item_change` (ledger churn should fall, because an
  unchanged section is not rewritten);
- output tokens and time per turn (quiet turns should get short);
- turns where a flag is false but the key says a change happened (the price of skipping).
Adopt only if recall does not fall beyond the noise band while FP, output tokens or time fall
clearly. Zero extra calls, about 150 extra rule tokens.

## Experiment 2: base rates and quotas for the over-reported fields (run tag `calibrated`)
3.2 shows three fields reported about twice as often as they happen: `secret_learned` (23 TP,
54 FP), `relation_event` (31, 36), `vow_said` (37, 27). This is wording, not architecture.
- Compute from the answer keys how often each really happens (share of turns), per chat.
- Add one sentence per field to the rules with that base rate in plain words ("most turns have
  no significant relation event; in a story like this about one turn in N has one"), and a
  quota where it fits ("at most one note per turn may be marked key").
- Do not use the keys' own turns as examples in the prompt (that would train on the test).
Report FP and FN of the three fields against `baseline-v2`. Adopt if FP fall by a third or more
with FN inside the noise band. Run it alone and together with `ask-first`.

## Experiment 3: the flags as the director (no new run; a reading of experiment 1)
If `ask-first` holds, the `changed` object is the turn director's signal, free of charge:
`scene_cut`, `place_change` and `time_jump` are the triggers that World DM (`onPlace`,
`onTransition`), Litopys scene close, the background picker and any later "meanwhile" pass wait
for. From the `ask-first` results, count for each of these three: how many real triggers the
flags would have caught and missed, and how many false wakes they would cause. A missed trigger
only delays such a job by a turn, so recall of 70% or more is enough here. This answers the
open idea in 5.3 and the "decided in four places" problem of DESIGN.md section 0 without a
router call.

## Not proposed
- A cheaper state input: the notebooks and the previous state are already bounded (2.3).
- A slower cadence for the knowledge part: a skipped turn's messages would have to be re-sent
  later, which eats the saving. `ask-first` gives the same effect turn by turn.
- Prompt caching: the fixed rules are an ideal cached prefix, but at this price per turn it is a
  later optimisation. Worth one look at the provider's cached-token count, nothing more.

## Report
One table per experiment in the manner of MEASUREMENTS.md, added to that file and to
`measurements.json`, with the noise band stated next to every difference.
