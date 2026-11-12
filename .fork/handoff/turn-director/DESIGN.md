# Turn director: design note (Roleplay)

Status 2026-11-12: design only, no code. The owner agreed to the scheme and answered the questions in the thread
(**Decided**). Roleplay code lives in the Roleplay fork (MolfarWav/Molfar.Vertep-Roleplay); this repo carries the notes.
Issues: #401 (this design, label `enhancement`), #400 (quests never close, label `bug`; fixed by phase 1).

## 0. Why

The Dashboard sensor is one model call per turn that tracks everything at once. Measured on a real chat
(owner's laptop, 37 Dashboard turns, sensor on a cheap flash model):

- system prompt about 12,300 characters (~3k tokens): Scene 4.7k, Knowledge 3.4k, Events 1.3k, Direction 0.9k,
  Threads 0.9k, the rest role and format;
- input 17-18k characters (~4.5k tokens): Previous state 3.2k, notebooks 4.5k, word scan 3.1k, card attire 0.8k,
  new messages 6.5k;
- output: 20+ fields (clock, place, weather, scene, events, outfit, holding, objects, learned, names, said, journal,
  blind spots, edges, threads, background).

What it costs in quality, seen on the same chat: quests do not close. In the 7 of the last 10 runs that returned the
`threads` key, `resolved` was empty every time, including two runs with an explicit Thread check; 6-9 quests were
open. A side quest opened at turn 21 and settled two turns later was still open at turn 37. 8 close/open proposals
waited for the owner. In 3 of 10 runs the model left `threads` out entirely. The quest rules also lean against
closing ("Silence is not resolution: a thread nobody mentioned stays open").

For comparison, Marinara's Quest Tracker (capability package `quest` 1.0.4) is a separate agent with one job, run after
every reply: explicit `create | update | complete | fail`, objectives as a checklist with `completed`, "Do not let
resolved or dead quests linger as active", and a cap of 3 that makes the model close finished quests before opening
new ones. Code removes fully completed quests (`quest-state.ts`, `autoRemoveFullyCompleted`).

The same pressure exists across Roleplay: the Dashboard grew many parts, and "when does what run" is decided in four
places, each with its own rules:
- Dashboard sensor: every turn, one call; Thread check every 5 turns; leak check only when code found candidates.
- World DM: `everyN` (5), `stagnation`, `onTransition` (after a time skip), `onPlace` (the Dashboard shows a new place).
- Litopys: its own workers and conditions.
- Forge agents: `trigger.everyN` / `keywords`; `model.ask` cards already answer YES/NO.

## 1. Decided (owner, 2026-11-12)

- **Solve first, fit to free models later.** The design is judged by whether it works; free-model limits (request
  quotas, small windows) are a later optimisation, not a constraint now.
- **Code and model together.** Code decides what it knows for sure; a model decides the rest. Not one prompt, not
  one model.
- **Out of the box.** Nothing for the user to install or wire. Forge agents must compose with the director (they can
  subscribe to its signals), but the director never depends on one; the owner uses none today.
- **A model per specialist is possible, not a rule.** By default every specialist uses the sensor's model.
- **Measure before building.** Phase 0 below decides whether it is better than today, and by how much, on accuracy,
  speed and cost, per chat type and per cast size.
- **An ordinary model first.** The router is first tried on an ordinary chat model through the existing connection. A
  new connection type (decision models, see 6) is built only if the ordinary model is not good enough. "Good enough
  for now": a fraction of a cent per turn and a quick answer.
- **Split before routing** (question 2): phase 1 splits the sensor and wakes every specialist every turn, so the effect
  of the split is measured apart from the effect of routing.
- **Signal vocabulary** (question 4): a base set is ours; Forge agents may add their own questions to the same router call.
- **Quest rules v2 can be taken** (owner, after round 1): the closing rules of the bench (`QUESTS_V2` in
  `scripts/director-bench.ts`: a "done when" in the text, done / failed / dropped, scene goals end with their scene, a
  full limit closes first) are a candidate for the #400 fix, tuned so long goals stay open (v3).
- **Visibility** (question 5): a separate button in the chat header's tool group, next to World DM and Fired
  (`src/components/chat/chat-tools.tsx`), opening what the director did on the last turn.

## 2. Shape

**Signals.** A fixed vocabulary of what can happen in a turn, each one yes/no question. Draft base set:
quest moved, quest finished or failed, new goal, place changed, time jumped, scene cut, clothes changed, a thing
changed hands, a new person, someone left, a relationship event, a secret revealed or learned, a promise or vow made.

**Detectors** fill the signals:
- code, for what it knows for sure: the Skip time stage direction, a swipe or regenerate, the word scan (clothes,
  touch), a new name in the entity registry, message counts;
- one router call with all model-judged signal questions at once. An uncertain answer counts as yes: a wasted call is
  cheaper than a missed change.

**Specialists.** Each has its own prompt, inputs, model role (default: the sensor's model) and the Dashboard fields
it owns, and names the signals that wake it. Draft cut by what each needs as input:
- quests: open quests (with a "done when" line each) and the last 2-3 turns;
- scene: clock, place, weather, present, layout;
- wardrobe and things: outfit, holding, objects (needs the word scan and card attire);
- relations: events, said, names, edges;
- knowledge: notebooks, learned, blind spots, journal;
- later: World DM, Litopys scene close, Forge agents (a new trigger "on signal X").

**Rules** (the regulation, per specialist): on/off, model, wake threshold, at most every N turns, calls per turn.
Plus a **safety sweep**: every N turns all specialists run regardless of signals (today's behaviour).

**Order.** Specialists run side by side; a second wave only for those that need a first-wave result (World DM's
`onPlace` needs the scene's new place). Every field has one owner, so the outputs merge into one object and the
existing apply code (`applyThreads`, `applyEdges`, ...) stays. One specialist failing loses only its fields (today a
broken JSON loses the whole turn).

**Where.** A new plugin inside the Roleplay app (`plugins/<id>/`, beside `relations`, `world`, `litopys`), not a
separate addon like Social: its whole job is Roleplay's data, and the sibling plugins already read each other's files
(World DM reads `dashboard/state/<chatId>.json`). Out of the box means it ships with Roleplay.

**Visible.** Per turn: which signals fired (and from code or the router), who woke, what changed, time and tokens.

## 3. Phases

0. **Bench, no product change.** Answer key: a strong model reads chosen chats from the owner's disk inside a Claude
   Code session and labels every turn (which signals happened, the correct field values); the owner checks 10-15 turns
   of the key. Then replay the same turns through (a) today's sensor (baseline), (b) the split specialists, all awake,
   (c) router + specialists. Harness: Roleplay `scripts/sensor-replay.ts` (#236) extended with signal labels; corpus
   stays outside the repository.
   Measures, each against the baseline: accuracy per field and per signal (missed and false), wall time per turn,
   tokens and money per turn. Matrix: a single-character card, a narrator card, a group chat; casts of 1, 3, 6 and
   more present characters and NPCs (where does accuracy start to blur); the languages the owner plays in.
1. **Split** the sensor into specialists, all woken every turn. Quests get the closing rules (done / failed /
   dropped instead of "silence is not resolution"), a "done when" line per quest, and the pressure of a full limit.
2. **Director**: specialists wake on signals; the safety sweep stays; the header button.
3. **Move the other triggers** onto signals: World DM, Litopys, Forge agents.

Each phase goes ahead only if the bench says it is better, or the owner accepts a stated cost.

## 4. Open (to decide during phase 0)

- The router's model: which ordinary model, and the wake threshold.
- The safety sweep's N, and whether it is per chat.
- Whether the quest proposals queue (#117) and its "never closed by code" rule stay once quests close reliably.
- How the director's per-turn record is stored (size cap, like `dashboard-runs.json` keeping the newest 10).
- Custom sensor prompts users already saved (`SENSOR_PARTS` per block): how they map onto specialists.

## 5. Not doing now

- No decision-model connection (6) unless the ordinary model fails the bench.
- No free-model tuning before the design works.
- No super-DM that creates cards and agents (#64, closed as outdated).

## 6. Experiment for later: decision models

A class of non-generative models that answer typed questions (yes/no, choice, score) with probabilities and write no
text: TypeSafe's "System One" models, reachable through OpenRouter's Decisions API (`POST /api/alpha/decisions`:
`state` = texts, `questions` = named typed questions, many per call; output tokens free). Similar open ones exist and
run locally (Ollama). A natural fit for the router, but it needs a new call type in the engine (`src/models.ts` and
the plugin host), the API is alpha, and nothing says how it handles Ukrainian or Russian text. Try it on the phase 0
bench only after the ordinary model has been measured.

## 7. Phase 0, round 1 (2026-11-12)

Chat: the owner's narrator-card chat (38 replies, about 250k characters, Russian, several scene changes). Answer key: 38
turns x 13 signals and a ledger of 14 quests (10 closed), labelled by a Claude subagent, not yet spot-checked by the
owner. Sensor model: the chat's Dashboard model (a cheap flash model through NanoGPT). One run per variant (no
repeats, temperature 0.2). Harness: Roleplay `scripts/director-bench.ts` and `scripts/director-score.ts` (branch
`claude/turn-director`); corpus and results outside the repository.

| run | signals F1 (micro, 13) | quest closes (key 10) | open quests at the end (key 4) | present (Jaccard) | time per turn | input tokens per turn |
|---|---:|---:|---:|---:|---:|---:|
| baseline (today) | 51% | 7 | 7 | 0.63 | 16.5 s | 9.9k |
| baseline + quest rules v2 | 51% | 8 | 1 | 0.61 | 15.2 s | 10.1k |
| split into 5 specialists | 47% | 1 | 8 | 0.71 | 16.9 s | 27.5k |
| split + quest rules v2 | 48% | 6 | 2 | 0.68 | 17.0 s | 27.7k |
| router only (signals) | 64% | - | - | - | 4.2 s | 4.2k |

Signals of replay runs are derived from the snapshot changes and the sensor's JSON (a proxy: item churn in the ledger
counts as a change); the router answers the questions directly, so its column is not fully comparable.

What it says:
- **The split alone does not fix quests; it made them worse.** A specialist with today's rules closed one quest in the
  whole chat and ended with 8 open. Today's baseline still had the opening quest of turn 1 (settled at turn 8 in the
  key) open at the end. The cause is the rules ("silence is not resolution"), which a
  focused model obeys even more strictly.
- **The quest rules v2 make quests close** (texts become goals with a "done when", the first quests close on time), but
  they now under-track: 1-2 open where the key has 3-7. A v3 must keep long goals open and close only scene-bound ones
  with their scene.
- **The split costs 2.8x the input tokens and is not faster** (the slowest specialist sets the time). Gains: present
  list +8 points. Other signals about the same. Not worth it on its own; it can only pay with routing (fewer
  specialists a turn) or trimmed inputs.
- **The router on the same cheap model is cheap and quick** (4.2 s, 4.2k tokens, 105 output tokens) and more precise
  than the sensor-derived signals (P 59% vs 41%), but its recall is 70%: too low to gate specialists by itself. Weak:
  quest_end 13%, person_enter 25%, vow_said 46%. Strong: place_change, time_jump, scene_cut, clothes_change,
  secret_learned.

Next candidates: quest rules v3 in the single prompt (fixes #400 with no extra calls); a better router (sharper
questions, examples, another model) measured for recall; the owner spot-checks the key; more chats for the matrix
(single card, group, cast size).

## 8. Phase 0, round 2 (2026-11-12): three chats, a stronger model, hybrid, router v2

Chats: the narrator chat of round 1 (38 replies), a single-character card with NPCs (27 replies), a group chat (16
replies, one continuous scene). Keys by Claude subagents, not yet spot-checked by the owner. Same cheap flash model
unless named; "pro" = a stronger model of the same family (same subscription). One run per variant. NanoGPT rate
limits hit when many runs went side by side; the harness now waits and retries (5-60 s), and the runs with lost turns
were redone one at a time (the two pro runs of the narrator chat each kept one lost turn). Time per turn depends on the
provider's load at the moment, so it is only comparable between runs made at the same time.

Signals F1 (micro, 13 signals) / quest closes against the key / mean (open - key open) per turn:

| run | narrator chat | single card + NPCs | group chat |
|---|---|---|---|
| baseline (today) | 51% / 7 of 10 / -0.5 | 50% / 2 of 9 / +3.0 | 59% / 2 of 5 / +1.0 |
| baseline + quest rules v2 | 51% / 8 / -1.9 | 58% / 7 / +4.2 | 62% / 2 / -0.5 |
| split + v2 | 48% / 6 / -1.2 | 54% / 4 / -0.1 | 63% / 5 / +1.6 |
| router (signals only) | 64% (v2 wording 68%) | 69% | 77% |
| pro baseline (today's rules) | 53% / 5 / +1.2 | | |
| pro baseline + v2 | 51% / 8 / -0.4 | | |
| hybrid: flash sensor + quests on pro, v2 | 51% / 21 opened-and-closed / +3.7 | | |
| baseline + quest rules v3 (flash) | 48% / 2 / -0.8 | | |

Input tokens per turn: one sensor 9.2-10.1k; split 22-28k (2.4-2.8x); hybrid 14.3k; router 3.4-4.2k (105 out).

What it says:
- **Quest rules v2 are the best single change**: no extra cost, more closes in two chats of three (2 to 7 in the single
  card chat), signals F1 up 0-8 points. The open count is still off (under-tracks in the narrator chat, over-tracks
  with NPCs). v3 on the flash model swung the other way (2 closes): on this model the rules flip between too eager and
  too shy.
- **A stronger model does not detect changes better** (F1 51-53% either way) **but tracks quests best with v2**: the
  pro + v2 open count follows the key most closely of all runs (-0.4). With today's rules the stronger model is the
  worst (11 open at the end against 4): it obeys "silence is not resolution" even more.
- **The split is not worth it as a whole**: 2.4-2.8x tokens, F1 within a few points either way. Its one clear gain:
  the group chat's quest closes (0% to 60% recall on quest_end).
- **A quests specialist on its own fills the limit** (hybrid: 29 opened, 8 open at the end against 4, many "wonders
  why" side threads), though many of its closes land on the key's turn. It needs a "fewer, bigger quests" rule.
- **The router is the best detector in every chat** (F1 64-77%, precision 59-78%) at a third of a sensor call's
  tokens, but its recall is 64-76%: as a gate it would drop a quarter or more of real changes. Its quest_end is weak
  everywhere (0-25%): it judges against the thread list, so it needs a good list first. v2 wording (lies count as
  binding, a call or return is an entrance) raised its F1 by 4 points.
- **Known limits of the key**: unnamed NPCs (a guard, a delivery man) are present in the key but never in the
  sensor's list, so person_enter reads 0-6% for the sensor in the NPC chat; the derived quest_progress signal does not
  work with v2 texts (they stay the same while the quest moves).

Candidates: ship quest rules v2 for #400 (prompt change only); test the router as hints inside the one sensor call
(not as a gate); a quests specialist with a "fewer, bigger quests" rule on the stronger model; repeat runs to measure
noise; field values (not only "noticed a change") in the key.

## 9. Phase 0, round 3 (2026-11-12): another model family on the narrator chat

Owner: "run Campus on another family, GLM 5.3". Same chat and key as rounds 1-2, GLM 5.3 through the same subscription,
one run per variant, no lost turns that mattered (one failed specialist call in the split).

| run | signals F1 | recall | quest_end R / P | quest closes (key 10) | open - key | present | input / output tokens per turn |
|---|---:|---:|---|---:|---:|---:|---|
| flash, today's rules | 51% | 66% | 25% / 50% | 7 | -0.5 | 0.63 | 9.9k / 1.1k |
| flash + v2 | 51% | 65% | 50% / 57% | 8 | -1.9 | 0.61 | 10.1k / 1.1k |
| pro + v2 | 51% | 65% | 38% / 38% | 8 | -0.4 | 0.61 | 9.9k / 1.1k |
| **GLM, today's rules** | **55%** | **76%** | **75% / 55%** | 18 | +1.1 | **0.76** | 9.8k / 1.8k |
| GLM + v2 | 53% | 69% | 50% / 29% | 17 | -0.5 | 0.71 | 9.7k / 1.8k |
| GLM split + v2 | 52% | 78% | 88% / 35% | 24 | -0.3 | 0.69 | 26.8k / 2.4k |
| router flash / GLM | 64% / 66% | 70% / 76% | | | | | 4.2k / 0.1-0.2k |

What it says:
- **The model family matters more than its strength.** The stronger DeepSeek detected nothing more; GLM is the best
  sensor of all runs: recall 76%, present list 0.76, vows F1 80% (flash 55%), people leaving 69% (flash 45%).
- **GLM closes quests even with today's rules** (quest_end recall 75%, 18 closes; the "kept after class" quest closes
  on the key's turn). It also opens more small ones, so the end count is still over (7 against 4). With v2 its open
  count follows the key better (-0.5) but its closes get less precise.
- **The split stays not worth it** on GLM too (2.7x tokens, F1 lower than GLM alone).
- **The GLM router** finds people coming in far better (87% against 25%) but is no better overall (66%).
- Quirks: GLM writes 1.6x more output tokens, and wrote some quest texts in the story's language although the rules
  ask for English.

Takeaway for the owner's setup: the cheapest big gain is the Dashboard model, not new architecture. GLM 5.3 as the
sensor model, then quest rules v2 or not by a second look at its quest list. A cheaper GLM (5.3 flash) is the next
candidate to try.
