# Turn director bench: all measurements (Molfar.Vertep #401)

```yaml
doc: measurements of the Roleplay Dashboard sensor, its split into specialists, a router, quest rules and models
issue: MolfarWav/Molfar.Vertep#401 (design and rounds), #400 (quest bug, closed by Roleplay 4.117.0)
dates: 2026-11-12 (phase 0 runs), 2026-11-13 (analysis, phase 1 runs)
design_note: .fork/handoff/turn-director/DESIGN.md (sections 7-10 are the round write-ups this doc consolidates)
machine_readable: .fork/handoff/turn-director/measurements.json (every derived number below, per chat and run)
code: Roleplay repo scripts/director-bench.ts (replay), scripts/director-score.ts (score), scripts/director-analyze.ts (this doc's numbers)
corpora: outside any repo, on the owner's laptop under D:\Claude\tmp\director-bench* (chat copies, answer keys, raw results)
status: phase 0 done (quest rules v2 shipped, Roleplay 4.117.0; split and router-gating not adopted); phase 1 done (section 11: noise band, ask-first, calibrated, flags as the director; nothing adopted, GLM ask-first to repeat)
```

## 0. How to read this

- **Chat ids** used everywhere: `narrator` (C), `single-npc` (A), `group` (S). See 1.1.
- **Turn `k`** = the line index of a character reply in the chat file (0 = greeting). A replay turn feeds the sensor the
  player line `k-1` and the reply `k`. Scoring skips `k = 0`.
- **Signal** = one of 13 yes/no questions about a turn (definitions in 3.1). **TP/FP/FN** = true positive / false
  positive (reported, not in the key) / false negative (in the key, not reported). **R** recall, **P** precision,
  **F1** their harmonic mean; "micro" = pooled over the 13 signals.
- **Tokens**: o200k BPE count (Roleplay `src/lib/tokens.ts`) unless marked **provider** (the `prompt_tokens` the API
  returned). Provider counts run about 4% above the o200k count for the same text (2.4).
- **Run tags**: `baseline` = the plugin as shipped before 4.117.0, one sensor call; `-v2` / `-v3` = quest rules
  variants (6); `split` = five specialists (4); `hybrid` = one sensor without quests + a quests call (6); `router` =
  signal questions only (5); prefixes `pro-`, `glm-`, `gem-` = another model (1.4); no prefix = DeepSeek V4 Flash.
- Every run is **one run** (no repeats). Differences of a few points are within noise; treat them as directions.

### Key facts (each stands alone)

1. The sensor call is ~4.2-4.3k tokens of fixed rules plus 2.4-7.2k tokens of input (o200k); provider count per call
   6.9k-11.8k on the narrator chat.
2. The fixed rules are the largest single piece of every call (35-60% of it); they do not grow with the chat.
3. What grows with the chat: New messages (reply length, capped at 12,000 characters), Notebooks (per present
   character, capped at 20 notes each), Previous state (cast present, their items), Word scan (reply length).
4. One sensor call on DeepSeek V4 Flash: signals F1 50-59% across the three chats; it over-reports secrets, relation
   events, clothes and items, and under-reports quest progress, quest ends and people entering.
5. Splitting into five specialists cost 2.4-2.8x the input tokens per turn, was not faster, and did not raise F1
   (48-63% vs 51-62% for the one call with the same quest rules v2).
6. A router (one cheap call with the 13 questions) is the best detector per signal (F1 61-77%); on Flash it misses 24-36% of
   changes at the signal level.
7. Gating specialists by the router (simulated) would miss 2-16% of needed specialist runs but still wake 3.2-4.3 of
   5 specialists a turn, so a routed split costs 20-28k input tokens a turn against 9-10k for the one call.
8. The quest bug came from the rules, not the prompt size: a quests specialist with the old rules closed 1 quest in a
   whole chat. Quest rules v2 raised closes (single-npc 2 -> 7 of 9) at no cost and shipped in Roleplay 4.117.0.
9. Model family mattered more than model strength: DeepSeek V4 Pro detected no better than Flash; GLM 5.3 was the best
   sensor (narrator chat F1 55%, recall 76%, quest_end F1 63%); Gemini 2.5 Flash thought by default, was 4x slower and
   4x dearer than GLM without being better.

## 1. Conditions

### 1.1 Chats (the owner's own, copied read-only into the corpora)

| id | card type | char replies replayed | characters (all text) | language | scenes | cast |
|---|---|---:|---:|---|---|---|
| narrator (C) | narrator card voicing several characters | 38 (k 0..74) | ~251k | Russian | several scene and place changes, one overnight skip | 4-6 named characters + NPCs |
| single-npc (A) | single-character card | 27 (k 0..52) | ~184k | Russian/English mix | a chase across many places | 1 main + NPCs, many unnamed |
| group (S) | group chat, 5 member cards | 16 (k 2..32) | ~99k | English | one continuous scene (no place change) | 3-5 present |

Corpus content per chat: the chat file and meta, the card(s), personas, the chat's lorebooks (not the World DM's world
book, which holds records from later in the chat), the preset, `dashboard/config.json` (Dashboard model
`nanogpt/deepseek/deepseek-v4-flash`, `maxThreads` 5, `maxMain` 2, `sensorMaxTokens` 7000, debug on). Each replay starts
with no Dashboard state, no entity registry, no debug file.

### 1.2 Answer keys

- Labelled by Claude subagents (one per chat) reading the whole transcript in order; **not spot-checked by the owner**.
- Per turn: the 13 signals (with a short evidence line for each true one), `present` (Latin names as on the card,
  never the player), `place`, `minutes`, optional note. Per chat: a quest ledger `{id, text, kind, opened, progress[],
  closed, how: done|failed|dropped|moot}`.
- Positives per signal (C / A / S): quest_progress 25/26/15, quest_end 8/8/5, new_goal 10/9/10, place_change
  10/14/0, time_jump 1/1/0, scene_cut 7/8/0, clothes_change 2/9/2, item_change 8/17/8, person_enter 12/17/3,
  person_leave 10/5/2, relation_event 10/11/13, secret_learned 15/4/4, vow_said 13/18/13. (A's labeller counted turns
  0..52 incl. 0; scoring skips 0.)
- Quests in the key: C 14 (10 closed), A 13 (9 closed), S 9 (5 closed).
- Known biases of the keys: unnamed NPCs ("a guard", "a delivery man") are in the key's `present` and never in the
  sensor's (A's person_enter reads 0-6% for the sensor because of this); `relation_event` is the most subjective signal;
  lies were counted as `vow_said` liberally in A.

### 1.3 Harness (Roleplay `scripts/director-bench.ts`)

- Replays the real `plugins/relations/plugin.js` through `handleRoute` turn by turn (chat file cut at `k+1` lines), so
  state accumulates exactly as in the app. Product code unchanged; variants are made by intercepting the sensor request.
- Sensor calls: temperature 0.2, `max_tokens` 7000 (the config). Router calls: temperature 0, `max_tokens` 400 (rounds
  1-3), then 3000 (round 4, see 5.1).
- Providers: NanoGPT subscription endpoint (DeepSeek, GLM); NanoGPT pay-as-you-go endpoint for Gemini (`nanogpt-paid`).
- Retries: 429 / 5xx / "too many requests" and network failures wait 5, 10, 20, 40, 60 s (added in round 2 after rate
  limits lost turns; network retries added in round 4 after a DNS failure).
- Time per turn = wall time of the whole update (all calls of that turn, side by side where parallel). It depends on
  the provider's load at that moment: compare only runs made at the same time.

### 1.4 Run matrix (all valid unless marked)

| tag | chat | model | mode | quest rules | turns | call errors | note |
|---|---|---|---|---|---:|---:|---|
| baseline | C, A, S | DeepSeek V4 Flash | one call | old | 38 / 27 / 16 | 0 | reference |
| baseline-v2 | C, A, S | DeepSeek V4 Flash | one call | v2 | 38 / 27 / 16 | 0 | |
| baseline-v3 | C | DeepSeek V4 Flash | one call | v3 | 38 | 0 | |
| split | C | DeepSeek V4 Flash | 5 specialists | old | 38 | 0 | |
| split-v2 | C, A, S | DeepSeek V4 Flash | 5 specialists | v2 | 38 / 27 / 16 | 0 | |
| hybrid-pro-v2 | C | Flash sensor + V4 Pro quests | 2 calls | v2 | 38 | 0 | |
| pro-baseline | C | DeepSeek V4 Pro | one call | old | 38 | 1 | 1 turn lost to a rate limit |
| pro-baseline-v2 | C | DeepSeek V4 Pro | one call | v2 | 38 | 1 | 1 turn lost to a rate limit |
| pro-split-v2 | C | DeepSeek V4 Pro | 5 specialists | v2 | 38 | 7 | **not used**: rate limits |
| glm-baseline | C | GLM 5.3 | one call | old | 38 | 0 | |
| glm-baseline-v2 | C | GLM 5.3 | one call | v2 | 38 | 0 | |
| glm-split-v2 | C | GLM 5.3 | 5 specialists | v2 | 38 | 1 | |
| gem-baseline | C | Gemini 2.5 Flash ("nothinking", still thinks) | one call | old | 38 | 0 | |
| gem-baseline-v2 | C | Gemini 2.5 Flash | one call | v2 | 38 | 0 | |
| gem-split-v2 | C | Gemini 2.5 Flash | 5 specialists | v2 | 38 | 47 | **invalid**: 9 turns lost to DNS failure |
| router | C, A, S | DeepSeek V4 Flash | router | n/a | 38 / 27 / 16 | 0 | inputs from `baseline` |
| router-v2 | C | DeepSeek V4 Flash | router, v2 wording | n/a | 38 | 0 | |
| pro-router | C | DeepSeek V4 Pro | router | n/a | 38 | 1 | |
| glm-router | C | GLM 5.3 | router | n/a | 38 | 0 | inputs from `glm-baseline` |
| gem-router | C | Gemini 2.5 Flash | router | n/a | 38 | 0 | inputs from `gem-baseline`; max_tokens 3000 |

Same chat set? No: models other than DeepSeek V4 Flash ran on C only. Flash ran the same variants on all three.

## 2. Tokens per input block

### 2.1 System prompt (fixed per call, same for every chat)

Captured from a real request (plugin as of 4.117.0, quest rules v2). o200k tokens.

| part | tokens | note |
|---|---:|---|
| role + reply format | 94 | |
| language | 76 | |
| truth | 57 | |
| events | 304 | |
| scene (clock, present, place, scene, chars, thought, outfit/holding, at/objects) | 1129 | largest part |
| direction | 205 | |
| knowledge (learned, said, told, people, names, blindSpot, edges) | 773 | |
| threads (quest rules v2) | 319 | old rules were 196 |
| reply size | 12 | |
| event vocabulary | 644 | |
| output shape | 712 | |
| **total** | **4332** | old rules: ~4209 |

### 2.2 Input blocks at sampled turns (baseline runs, DeepSeek V4 Flash; o200k tokens)

Blocks: Characters (cast with class and pronouns), Previous state (clock, place, per present character attitude,
mood, items, layout, open threads, limits), Notebooks (one block per present character), Thread check (only every 5th
turn), Backgrounds (only with the chat's auto background on), Word scan (code-found sentences about clothes and
contact), Card attire, New messages. Leak check never appeared in these chats.

narrator (C):

| k | Characters | Previous state | Notebooks (count) | Thread check | Backgrounds | Word scan | Card attire | New messages | input total | provider prompt tokens |
|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 2 | 77 | 306 | 37 (1) | - | 134 | 252 | 134 | 1454 | 2396 | 6874 |
| 18 | 77 | 323 | 333 (1) | 53 | 134 | 529 | 134 | 1502 | 3086 | 7650 |
| 38 | 77 | 871 | 797 (5) | 53 | 133 | 885 | 167 | 4245 | 7232 | 11809 |
| 56 | 77 | 882 | 703 (3) | - | 136 | 919 | 167 | 3701 | 6587 | 11097 |
| 74 | 77 | 530 | 489 (1) | - | 136 | 1187 | 134 | 3467 | 6021 | 10514 |

single-npc (A):

| k | Characters | Previous state | Notebooks (count) | Backgrounds | Word scan | Card attire | New messages | input total | provider |
|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 2 | 23 | 207 | 22 (1) | 241 | 862 | 199 | 2073 | 3630 | 8268 |
| 12 | 31 | 614 | 239 (2) | 242 | 912 | 199 | 2475 | 4716 | 9464 |
| 26 | 31 | 720 | 467 (1) | 242 | 621 | 199 | 1726 | 4009 | 8589 |
| 40 | 31 | 728 | 504 (1) | 242 | 1154 | 199 | 1901 | 4762 | 9322 |
| 52 | 31 | 589 | 514 (1) | 242 | 808 | 199 | 2083 | 4469 | 9131 |

group (S):

| k | Characters | Previous state | Notebooks (count) | Backgrounds | Word scan | Card attire | New messages | input total | provider |
|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 4 | 90 | 459 | 83 (3) | 119 | 789 | 190 | 2049 | 3784 | 8422 |
| 10 | 90 | 545 | 320 (3) | 119 | 1034 | 190 | 2168 | 4471 | 9128 |
| 18 | 90 | 771 | 581 (3) | 119 | 1216 | 190 | 2154 | 5126 | 9842 |
| 26 | 90 | 845 | 772 (3) | 119 | 882 | 190 | 2462 | 5365 | 10040 |
| 32 | 90 | 875 | 1010 (3) | 119 | 640 | 190 | 1357 | 4286 | 8836 |

### 2.3 What grows with the chat, and what bounds it

| block | grows with | bound in code | observed range |
|---|---|---|---|
| rules (system) | nothing | fixed | 4.2-4.3k |
| Characters | cards and souls in the chat | fixed per chat | 23-90 |
| Previous state | characters present, their items, open threads | none explicit; follows the cast | 207-882 |
| Notebooks | present characters x notes learned | newest 8 + 12 ranked older notes per character | 22-1010 |
| Thread check | threads open 5+ turns, every 5th turn only | every N turns | 0 or ~53 |
| Backgrounds | the background folder | fixed per chat | 119-242 |
| Word scan | reply length (sentences about clothes and touch) | none explicit | 252-1216 |
| Card attire | card | fixed | 134-199 |
| New messages | reply length | 12,000 characters (`SENSOR_TEXT_MAX`) | 1357-4245 |

Reading: the input roughly doubles from the first turns to the middle of a long chat (C: 2.4k -> 7.2k) and then
moves with the cast present and the reply length, not with the number of turns. In C the biggest swing is New
messages (replies got longer: 1.5k -> 4.2k) and Notebooks (5 present characters at k 38). The chat's length itself
is not in the sensor's input: only the newest replies are.

### 2.4 Calibration

Provider prompt tokens = o200k input + o200k system (~4209 with the old rules) + ~4%. Example C k 2: 2396 + 4209 =
6605 vs 6874 provider.

## 3. Accuracy per field

### 3.1 Signals and how they are scored

| signal | key definition (abridged) | derived from a replay run (proxy) |
|---|---|---|
| quest_progress | an open goal moved or got harder | an open thread's text changed, or a new step (thread with parent) |
| quest_end | an open goal achieved, failed, moot or abandoned | a thread open before is not open now |
| new_goal | a new goal with stakes the story will follow | a new open thread id |
| place_change | the scene moved to another place | `clock.place` changed (normalized text) |
| time_jump | time skipped beyond the scene (> ~30 min) | `minutes` > 30 or day increased |
| scene_cut | one scene ended and another began | sensor `scene.new` true |
| clothes_change | clothing put on, off, changed, damaged | the set of worn items of any character changed |
| item_change | a thing picked up, handed, put down, lost, found, used | held items or scene objects changed |
| person_enter | someone not present appears (incl. call, message) | a name in `present` not there before |
| person_leave | a present character leaves, sleeps, hangs up | a name gone from `present`, or `struck` non-empty |
| relation_event | an act that changes how two feel about each other | an event of weight significant or pivotal |
| secret_learned | hidden information learned or revealed | a learned note not "everyday", or said kind secret/confession |
| vow_said | promise, vow, threat, confession, ultimatum, binding order, lie | any `said` entry |

The proxy matters for three signals: `clothes_change` and `item_change` also fire when the sensor merely rewrites an
item's text (ledger churn), so their FP counts overstate real mistakes; `quest_progress` cannot be seen with v2 texts
(the goal text stays the same while the quest moves), so its recall is near 0 for v2 runs by construction. Router runs
answer the questions directly, so their column is not a proxy.

### 3.2 Direction of errors, DeepSeek V4 Flash one call (sum over C + A + S)

| signal | TP | FP | FN | direction | reading |
|---|---:|---:|---:|---|---|
| secret_learned | 23 | 54 | 0 | over-reports | almost every "learned" note is marked important or key |
| relation_event | 31 | 36 | 3 | over-reports | ordinary acts weighted significant |
| clothes_change | 8 | 28 | 5 | over-reports | ledger churn (proxy) plus real misreads |
| item_change | 25 | 28 | 8 | over-reports | same |
| vow_said | 37 | 27 | 7 | over-reports | ordinary statements kept as "said" |
| new_goal | 14 | 14 | 15 | both | opens beats as quests, misses real goals |
| scene_cut | 11 | 8 | 4 | slightly over | |
| person_leave | 6 | 7 | 11 | both, leans to misses | |
| place_change | 21 | 6 | 3 | good | the most reliable field |
| time_jump | 1 | 1 | 1 | too few cases | |
| quest_end | 3 | 5 | 18 | **misses** | the #400 bug: settled quests stay open |
| quest_progress | 17 | 3 | 49 | **misses** | partly the proxy (3.1) |
| person_enter | 6 | 9 | 26 | **misses** | most misses are A's unnamed NPCs (1.2) |

### 3.3 Per signal per run (TP/FP/FN)

| signal | C baseline | A baseline | S baseline | C glm | C gem | C pro | C router | A router | S router | C glm-router |
|---|---|---|---|---|---|---|---|---|---|---|
| quest_progress | 7/2/18 | 5/0/21 | 5/1/10 | 9/5/16 | 1/2/24 | 2/3/23 | 22/12/3 | 25/0/1 | 14/1/1 | 22/10/3 |
| quest_end | 2/2/6 | 1/1/7 | 0/2/5 | 6/5/2 | 5/3/3 | 3/2/5 | 1/1/7 | 0/0/8 | 0/0/5 | 3/3/5 |
| new_goal | 5/7/5 | 5/5/4 | 4/2/6 | 8/14/2 | 6/7/4 | 7/8/3 | 4/7/6 | 5/2/4 | 7/1/3 | 6/4/4 |
| place_change | 9/2/1 | 12/4/2 | 0/0/0 | 8/4/2 | 10/2/0 | 9/0/1 | 10/2/0 | 11/3/3 | 0/2/0 | 10/2/0 |
| time_jump | 1/1/0 | 0/0/1 | 0/0/0 | 1/1/0 | 1/1/0 | 1/1/0 | 1/0/0 | 0/0/1 | 0/0/0 | 1/0/0 |
| scene_cut | 7/4/0 | 4/3/4 | 0/1/0 | 7/11/0 | 7/11/0 | 7/5/0 | 6/2/1 | 1/0/7 | 0/0/0 | 4/3/3 |
| clothes_change | 2/18/0 | 5/10/4 | 1/0/1 | 2/23/0 | 2/27/0 | 2/20/0 | 2/0/0 | 7/7/2 | 1/1/1 | 2/6/0 |
| item_change | 7/15/1 | 15/9/2 | 3/4/5 | 8/14/0 | 8/20/0 | 7/12/1 | 7/12/1 | 16/4/1 | 7/7/1 | 7/12/1 |
| person_enter | 6/8/6 | 0/1/17 | 0/0/3 | 6/6/6 | 5/10/7 | 6/6/6 | 3/1/9 | 9/0/8 | 1/0/2 | 10/1/2 |
| person_leave | 5/7/5 | 1/0/4 | 0/0/2 | 9/7/1 | 8/5/2 | 8/4/2 | 6/3/4 | 2/1/3 | 1/0/1 | 8/3/2 |
| relation_event | 9/20/1 | 10/14/1 | 12/2/1 | 9/17/1 | 10/24/0 | 9/25/1 | 10/15/0 | 10/9/1 | 11/2/2 | 10/14/0 |
| secret_learned | 15/21/0 | 4/22/0 | 4/11/0 | 15/15/0 | 13/20/2 | 15/17/0 | 14/6/1 | 4/5/0 | 4/1/0 | 11/8/4 |
| vow_said | 11/16/2 | 13/8/5 | 13/3/0 | 12/5/1 | 11/15/2 | 13/13/0 | 6/3/7 | 4/1/14 | 11/1/2 | 5/4/8 |

(C glm / gem / pro = glm-baseline / gem-baseline / pro-baseline, old quest rules.)

### 3.4 Micro F1 / recall over the 13 signals

| run | C | A | S |
|---|---|---|---|
| baseline (Flash) | 51% / 66% | 50% / 51% | 59% / 56% |
| baseline-v2 | 51% / 65% | 58% / 61% | 62% / 59% |
| baseline-v3 | 48% / 57% | | |
| split | 47% / 63% | | |
| split-v2 | 48% / 63% | 54% / 56% | 63% / 68% |
| hybrid-pro-v2 | 51% / 70% | | |
| pro-baseline | 53% / 68% | | |
| pro-baseline-v2 | 51% / 65% | | |
| glm-baseline | **55% / 76%** | | |
| glm-baseline-v2 | 53% / 69% | | |
| glm-split-v2 | 52% / 78% | | |
| gem-baseline | 48% / 66% | | |
| gem-baseline-v2 | 46% / 66% | | |
| router (Flash) | 64% / 70% | 69% / 64% | 77% / 76% |
| router-v2 (Flash) | 68% / 75% | | |
| pro-router | 63% / 72% | | |
| glm-router | 66% / 76% | | |
| gem-router | 61% / 89% (P 47%) | | |

### 3.5 Present list (who is in the scene)

Per turn, names in the key but not the sensor's list (missed) and the reverse (extra); first word, lowercase.

| run | C missed / extra | A missed / extra | S missed / extra | C Jaccard |
|---|---|---|---|---:|
| baseline | 0.2 / 1.1 | 1.2 / 0.0 | 0.4 / 0.1 | 0.63 |
| baseline-v2 | 0.2 / 1.1 | 1.2 / 0.0 | 0.4 / 0.1 | 0.61 |
| split-v2 | 0.0 / 1.1 | 1.3 / 0.1 | 0.4 / 0.1 | 0.68 |
| glm-baseline | 0.0 / 0.8 | | | 0.76 |
| gem-baseline | 0.1 / 0.7 | | | 0.71 |
| pro-baseline | 0.2 / 1.2 | | | 0.57 |

Direction: on C the sensor keeps people present after they left (extra ~1 a turn); on A it never lists unnamed NPCs
(missed ~1.2 a turn, a key convention as much as an error); S (one scene) is fine.

### 3.6 Quests (open count against the key's ledger)

| run | chat | mean(open - key) | mean abs | closes | open at end (key) |
|---|---|---:|---:|---:|---|
| baseline | C | -0.5 | 1.4 | 7 | 7 (4) |
| baseline-v2 | C | -1.9 | 1.9 | 8 | 1 (4) |
| baseline-v3 | C | -0.8 | 1.3 | 2 | 6 (4) |
| split | C | +0.1 | 1.4 | 1 | 8 (4) |
| split-v2 | C | -1.2 | 1.2 | 6 | 2 (4) |
| hybrid-pro-v2 | C | +3.7 | 3.7 | 21 | 8 (4) |
| pro-baseline | C | +1.2 | 2.2 | 5 | 11 (4) |
| pro-baseline-v2 | C | -0.4 | 0.8 | 8 | 6 (4) |
| glm-baseline | C | +1.1 | 1.5 | 18 | 7 (4) |
| glm-baseline-v2 | C | -0.5 | 0.9 | 17 | 2 (4) |
| glm-split-v2 | C | -0.3 | 0.9 | 24 | 4 (4) |
| gem-baseline | C | +0.8 | 1.0 | 13 | 5 (4) |
| gem-baseline-v2 | C | +0.6 | 1.3 | 22 | 6 (4) |
| baseline | A | +3.0 | 3.0 | 2 | 9 (4) |
| baseline-v2 | A | +4.2 | 4.2 | 7 | 11 (4) |
| split-v2 | A | -0.1 | 0.7 | 4 | 5 (4) |
| baseline | S | +1.0 | 1.1 | 2 | 5 (4) |
| baseline-v2 | S | -0.5 | 0.5 | 2 | 3 (4) |
| split-v2 | S | +1.6 | 1.6 | 5 | 5 (4) |

Key closes: C 10, A 9, S 5. "closes" counts threads that were open and are not open a turn later (includes small
quests the key never had, so a high count is not by itself good: GLM opens and closes many small ones).

## 4. The split into specialists

### 4.1 What each specialist got

All five ran side by side on the same model as the sensor; each system prompt = a one-line role ("one specialist of the
scene sensor ... report only X; leave every other key out"), the reply-format line, the Language and Truth parts of the
real prompt, its own rule lines, its own output shape. Their JSON replies were merged into one object (characters'
`chars` entries merged per name) and handed to the unchanged plugin.

| specialist | rule lines (from the real prompt) | input blocks | output keys | signals it owns |
|---|---|---|---|---|
| scene | Scene: minutes, time and day, present, place and weather, scene, chars (mood, condition, goal, leads, contact); Direction | Characters, Previous state, Backgrounds, New messages | present, struck, minutes, time, day, date, place, weather, scene, chars{mood,condition,goal,leads,contact}, background | place_change, time_jump, scene_cut, person_enter, person_leave |
| things | Scene: outfit and holding, at/userAt/objects | Characters, Previous state, Word scan, Card attire, New messages | chars{outfit,holding,at}, userAt, objects | clothes_change, item_change |
| relations | Events part, the edges line, Event vocabulary | Characters, Previous state, New messages | events, edges | relation_event |
| knowledge | Knowledge part without edges, the thought line | Characters, Previous state, Notebooks, Leak check, New messages | learned, said, told, retire, names, people, blindSpot, chars{thought}, leaks | secret_learned, vow_said |
| quests | Threads part (old or v2) | Previous state, Thread check, New messages | threads | quest_progress, quest_end, new_goal |

### 4.2 Input tokens per specialist at sampled turns (o200k, input only, C)

| k | scene | things | relations | knowledge | quests | one sensor input |
|---:|---:|---:|---:|---:|---:|---:|
| 2 | 1972 | 2223 | 1837 | 1875 | 1760 | 2396 |
| 18 | 2037 | 2565 | 1902 | 2235 | 1878 | 3086 |
| 38 | 5327 | 6246 | 5193 | 5992 | 5169 | 7232 |
| 74 | 4211 | 5395 | 4074 | 4563 | 3997 | 6021 |

Every specialist carries Previous state and New messages, which are most of the input; that is why five calls cost
2.4-2.8x one call even though each specialist's rules are short.

### 4.3 Measured cost per specialist (provider tokens, mean per call; ms)

| run | scene in/out/ms | things | relations | knowledge | quests | per turn in / out / ms |
|---|---|---|---|---|---|---|
| C split-v2 (Flash) | 5222/334/10218 | 6184/326/9214 | 5385/254/7792 | 6273/658/16559 | 4605/125/6087 | 27669 / 1697 / 16980 |
| C glm-split-v2 | 5054/411/6263 | 5997/493/8722 | 5207/319/5970 | 6119/874/16553 | 4443/284/4467 | 26819 / 2381 / 18582 |
| A split-v2 | 4273/249/6786 | 5314/327/6900 | 4326/317/6218 | 4812/598/10732 | 3601/236/5796 | 22325 / 1727 / 12079 |
| S split-v2 | 4376/356/5134 | 5493/407/4137 | 4557/364/4771 | 5324/838/8871 | 3770/268/3054 | 23519 / 2233 / 11073 |

The knowledge specialist is the slowest and sets the turn's time; the one sensor call on the same model and date took
16.5 s (C), 15.9 s (A), 21.6 s (S).

### 4.4 Outcome

F1 within -4..+1 points of the one call with the same quest rules (C 48 vs 51, A 54 vs 58, S 63 vs 62); present list
+7..8 points of Jaccard on C; quest closes better only on S (quest_end recall 0% -> 60%). Not adopted.

## 5. The router

### 5.1 What it is

- One call per turn, after the reply. Input: the turn's Previous state block and New messages block only (taken from
  the `baseline` run's recorded sensor input of that turn), ~3.4-4.3k provider tokens.
- System prompt: "You watch an ongoing roleplay story for a tracker ... For each question below, answer true or false
  about what the New messages show. The Previous state is only background. When you are unsure, answer true. Reply with
  one JSON object with exactly these keys and true or false as values." + the 13 questions (3.1 key definitions).
- Output: 13 booleans, ~105 tokens (Flash), 226 (GLM), 1755 (Gemini, of which most thinking).
- v2 wording (`--router v2`): quest_progress and quest_end judged "whether or not it is in the thread list";
  person_enter counts a call, a message or a return; vow_said counts "ANY lie, even casual".
- `max_tokens` 400 cut Gemini's thinking answer (results read as partial); the run was redone with 3000.

### 5.2 What it would switch on and off

Nothing was gated live. The simulation (`scripts/director-analyze.ts`) wakes a specialist when any of its signals
(4.1) is true in the router's answer, and counts a specialist as needed when any of its signals is true in the key.

| router run | chat | woken / turn (of 5) | needed / turn | missed share of needed | wasted / turn | input tokens / turn (router + woken specialists) | one sensor input / turn |
|---|---|---:|---:|---:|---:|---:|---:|
| router | C | 3.2 | 2.4 | 8% | 1.1 | 21.7k | 9.9k |
| router-v2 | C | 3.3 | 2.4 | 2% | 1.0 | 21.9k | 9.9k |
| pro-router | C | 3.4 | 2.4 | 8% | 1.2 | 22.4k | 9.9k |
| glm-router | C | 3.2 | 2.4 | 8% | 1.0 | 21.4k | 9.9k |
| gem-router | C | 4.3 | 2.4 | 0% | 2.0 | 27.9k | 9.9k |
| router | A | 3.8 | 3.8 | 16% | 0.6 | 20.1k | 9.2k |
| router | S | 3.8 | 3.5 | 13% | 0.7 | 21.1k | 9.2k |

Specialist token costs in this table are the Flash `split-v2` means of the same chat (4.3). Misses by specialist:
C router: quests 3, knowledge 2, scene 2; A router: knowledge 9, scene 5.

### 5.3 Outcome

Per signal the router is the most accurate detector (3.4) and the cheapest call (a third of a sensor call's tokens,
2-5 s). As a gate it saves little: 3.2-4.3 of 5 specialists still wake, and a routed split stays at ~2x the one call's
tokens. Its weak signals are the judgement ones: quest_end (13-38% recall; it judges against the sensor's thread list,
which was stale before the fix), person_enter (25% Flash, 87% GLM), vow_said (lies). Not adopted as a gate. Open idea:
use it as a trigger for rare costly jobs (World DM, Litopys scene close, pictures), where a missed trigger only delays
the job.

## 6. Quest rule variants and the hybrid

- **old** (before 4.117.0): "Never drop one to make room for a new one. Silence is not resolution: a thread nobody
  mentioned stays open. Resolve a thread only when the new text settles it."
- **v2** (shipped in Roleplay 4.117.0, `QUEST_RULES_2` in `plugins/relations/plugin.js`): goals with stakes; a new
  thread's text is `goal | done when: condition`; every turn each open thread is resolved when its done-when happened
  (done), it can no longer happen (failed), or the story moved past it (dropped; a thread tied to one scene ends with
  it); a full limit resolves finished threads first. Code stores the condition as `done` apart from the text.
- **v3** (bench only): v2 plus "open a thread for every stake that matters beyond this moment", main = goals spanning
  scenes that never end with a scene, only side/everyday ones dropped with their scene. On Flash it swung back to 2
  closes (C).
- **hybrid** (bench only): the one sensor call without the Threads rules and key + a quests specialist (v2) on DeepSeek
  V4 Pro, side by side. 14.3k input tokens a turn; the specialist opened 29 quests and closed 21; it fills the limit
  with small "wonders why" threads (open - key +3.7).

Outcome: v2 shipped (no extra calls; more closes on A and C; closest open-count tracking with Pro and GLM on C).
Remaining error: on Flash v2 under-tracks on C (1 open at the end vs 4) and over-tracks on A (11 vs 4).

## 7. Models (C, one sensor call, old quest rules; $ at OpenRouter list prices of 2026-11-12)

| model | price in / out per 1M | provider in / out tokens per turn | $ per turn | $ per 100 turns | time per turn | F1 | recall | quest_end F1 | present Jaccard |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| DeepSeek V4 Flash | 0.09 / 0.18 | 9926 / 1137 | 0.0011 | 0.11 | 16.5 s | 51% | 66% | 33% | 0.63 |
| DeepSeek V4 Pro | 0.111 / 4.44 | 9818 / 1060 | 0.0058 | 0.58 | 14.5 s | 53% | 68% | 46% | 0.57 |
| GLM 5.3 | 0.07 / 1.40 | 9842 / 1786 | 0.0032 | 0.32 | 14.1 s | 55% | 76% | 63% | 0.76 |
| Gemini 2.5 Flash | 0.30 / 2.50 | 9735 / 4604 | 0.0144 | 1.44 | 61.7 s | 48% | 66% | 63% | 0.71 |

Runs were bought through NanoGPT (subscription for DeepSeek and GLM,
balance for Gemini); the $ column uses OpenRouter prices so the numbers apply to users of either. Gemini's
"nothinking" variant on NanoGPT still spent ~1000 reasoning tokens on a short answer; `reasoning: {max_tokens: 0}`
reduced it to ~20 in a probe, other parameters returned "service unavailable"; the runs used the default. Without a
Dashboard model set, the sensor uses the chat's own model (`str(cfg.sensorModel) || str(meta.model)` in `askSensor`).

## 8. Decisions and outcomes

| item | decision | evidence |
|---|---|---|
| Quest rules v2 | shipped, Roleplay 4.117.0 (PR Roleplay #131, #132) | 3.6, 6 |
| `done` kept apart from the quest text | shipped with v2 | `splitDone`, docs/DATA-FORMATS.md |
| Saved Threads block equal to any past default follows the default | shipped with v2 | `isDefaultPart` |
| Split the sensor into specialists | not adopted | 4.4 |
| Router as a gate for specialists | not adopted | 5.2, 5.3 |
| Recommended sensor model for users | GLM 5.3 (direction from one chat) | 7 |
| Decision models (Decisions API) | deferred; ordinary models first | DESIGN.md section 6 |

## 9. Open

- Owner spot check of the answer keys (most doubtful turns: C 14, 18, 24, 58, 74; A 8, 14-16, 28-30, 36, 50; S 2, 4, 10-18).
- Repeat runs to measure noise: done for Flash on C in 11.1 (band 49-53% micro F1); A and S by one control pair; GLM not measured.
- GLM 5.3 flash (about ten times cheaper than GLM 5.3) and the model table on A and S.
- Field values, not only "noticed a change": the outfit text, the event id, the place name, the note content.
- Sensor over-reporting of `secret_learned`, `relation_event`, `vow_said` (3.2): wording with base rates and quotas did not cure it (11.3); next a code-side downgrade of `weight` or a small separate decision.
- The router as a trigger for rare costly jobs (5.3): answered in 11.4, a code-derived signal from the sensor output gives 88% recall on Flash.
- `ask-first` on GLM 5.3 three times (its band), and GLM on the other fields (11.2).

## 10. Reproduce

```bash
# in the Roleplay repo; corpus dirs hold root/ (data copy) and labels-key.json
bun scripts/director-bench.ts <corpus> --mode baseline|split|hybrid [--quests v2|v3] [--model <provider>/<model>] [--quest-model ...] --tag <t>
bun scripts/director-bench.ts <corpus> --mode router [--router v2] --from results-<baseline tag>.json [--model ...] --tag <t>
bun scripts/director-score.ts <corpus> --key labels-key.json --runs <t1>,<t2>,... --out <file>
bun scripts/director-analyze.ts <corpus>... --out analysis.json
```

Providers in the bench: `nanogpt/` (subscription), `nanogpt-paid/` (balance), `openrouter/`. Keys are read from
`~/.claude/skills/ask-model/keys.env`; never printed.

## 11. Phase 1 (2026-11-13): noise band, `ask-first`, `calibrated`, the flags as the director

Plan: `.fork/handoff/turn-director/TURN-DIRECTOR-NEXT-EXPERIMENTS.md`. Code: Roleplay `scripts/director-bench.ts` (`--ask-first`,
`--calibrated`, both on the baseline mode with `--quests v2`), `scripts/director-score.ts --json`, `scripts/director-phase1.ts`
(every table below). Numbers per run and chat: `measurements.json` key `phase1`. Same chats, keys and harness as section 1;
the plugin is unchanged, variants patch the sensor's system prompt in the bench. Runs: DeepSeek V4 Flash on C, A, S for each
variant; GLM 5.3 for `ask-first` and for `baseline-v2` on A and S (C's `glm-baseline-v2` is from phase 0). Runs went in waves of
three to five in parallel, so wall time differs between waves (see 11.6).

### 11.1 Experiment 0: the noise band (C, Flash, `baseline-v2` repeated three times)

| signal | key + | noise-1 | noise-2 | noise-3 | baseline-v2 | mean | min | max |
|---|---:|---|---|---|---|---:|---:|---:|
| quest_progress | 25 | 20% (3/2/22) | 14% (2/1/23) | 21% (3/1/22) | 21% (3/1/22) | 18% | 14% | 21% |
| quest_end | 8 | 53% (4/3/4) | 46% (3/2/5) | 31% (2/3/6) | 53% (4/3/4) | 43% | 31% | 53% |
| new_goal | 10 | 60% (6/4/4) | 40% (3/2/7) | 33% (3/5/7) | 56% (5/3/5) | 44% | 33% | 60% |
| place_change | 10 | 95% (9/0/1) | 86% (9/2/1) | 90% (9/1/1) | 80% (8/2/2) | 90% | 86% | 95% |
| time_jump | 1 | 67% (1/1/0) | 67% (1/1/0) | 67% (1/1/0) | 40% (1/3/0) | 67% | 67% | 67% |
| scene_cut | 7 | 74% (7/5/0) | 63% (6/6/1) | 63% (6/6/1) | 67% (6/5/1) | 67% | 63% | 74% |
| clothes_change | 2 | 18% (2/18/0) | 17% (2/19/0) | 17% (2/20/0) | 18% (2/18/0) | 17% | 17% | 18% |
| item_change | 8 | 55% (8/13/0) | 57% (8/12/0) | 52% (8/15/0) | 50% (8/16/0) | 55% | 52% | 57% |
| person_enter | 12 | 40% (5/8/7) | 43% (5/6/7) | 50% (7/9/5) | 52% (7/8/5) | 44% | 40% | 50% |
| person_leave | 10 | 57% (6/5/4) | 60% (6/4/4) | 42% (5/9/5) | 50% (6/8/4) | 53% | 42% | 60% |
| relation_event | 10 | 50% (10/20/0) | 49% (9/18/1) | 47% (10/23/0) | 49% (9/18/1) | 48% | 47% | 50% |
| secret_learned | 15 | 59% (15/21/0) | 64% (15/17/0) | 59% (15/21/0) | 57% (14/20/1) | 60% | 59% | 64% |
| vow_said | 13 | 62% (12/14/1) | 56% (10/13/3) | 68% (13/12/0) | 63% (12/13/1) | 62% | 56% | 68% |
| **all 13 (micro)** | 131 | 53% (88/114/43) | 50% (79/103/52) | 49% (84/126/47) | 51% (85/118/46) | 51% | 49% | 53% |

- Micro F1 (state proxy) over the three repeats **49-53%** (mean 51%; the phase-0 run: 51%); micro recall **60-67%**; micro precision 40-44%.
- Per signal the band is wide on the small ones: quest_end F1 31-53%, new_goal 33-60%, person_leave 42-60%, scene_cut 63-74%. The large
  fields are stable: relation_event FP 18-23, secret_learned FP 17-21, vow_said FP 12-14, clothes_change FP 18-20, item_change FP 12-16.
- Cost per turn: 15.2-16.3 s, 10.0-10.1k provider input tokens, 1.06-1.15k output tokens.
- A and S were not repeated three times; a control pair later in the day (`ctl-baseline-v2`, run beside `ctl-ask-first`) gave micro
  F1 A 52% (phase-0 run 58%), S 61% (62%); recall A 52% (61%), S 57% (59%). So A's band is about 6 points of F1 and 9 of recall, S's about 1-2.
- Read every later difference against these bands: a change of 3-4 points of micro F1 on one chat is not a result.

### 11.2 Experiment 1: `ask-first` (one call; `changed` first, write only the sections whose question is true)

What the prompt got (bench patch, about 150 rule tokens, +270 provider tokens a turn): a "Changed" block with the 13 questions in
the router-v2 wording ("when unsure, answer true"), the key `"changed": {13 booleans}` as the first key of the output shape, and the
mapping of flags to sections: place_change / time_jump / scene_cut / person_enter / person_leave -> place, weather, time, day, date,
scene, present, struck, userAt, at; clothes_change / item_change -> outfit, holding, objects; relation_event -> events, edges;
secret_learned / vow_said -> learned, said, told, retire, people, blindSpot; the three quest signals -> threads; always written:
minutes, names, and per present character mood, condition, goal, leads, contact, thought. The plugin already treats a missing key as
"unchanged" (its own rule: "When the new text shows nothing for a key, leave the key out"), so no shim was needed.

Micro F1 / recall / precision, state proxy (same scoring as 3.4):

| run | C | A | S | pooled |
|---|---|---|---|---|
| baseline-v2 | 51% / 65% / 42% | 58% / 61% / 56% | 62% / 59% / 66% | 56% / 62% / 51% |
| **ask-first** | 49% / 51% / 47% | 45% / 37% / 57% | 52% / 47% / 59% | **48% / 44% / 53%** |
| ctl-baseline-v2 (A, S, later) | | 52% / 52% / 52% | 61% / 57% / 66% | 55% / 54% / 56% |
| ctl-ask-first (A, S, later) | | 49% / 42% / 58% | 53% / 47% / 60% | 50% / 44% / 59% |
| glm-baseline-v2 | 53% / 69% / 43% | 60% / 69% / 53% | 63% / 73% / 56% | 58% / 70% / 49% |
| **glm-ask-first** | 57% / 70% / 48% | 62% / 68% / 56% | 66% / 71% / 62% | **61% / 69% / 54%** |

Per signal TP/FP/FN pooled over C, A, S (state proxy; quest_progress is blind for v2 texts, see 3.1):

| signal | baseline-v2 | ask-first | glm-baseline-v2 | glm-ask-first |
|---|---|---|---|---|
| quest_progress | 18/1/48 | 6/1/60 | 17/0/49 | 16/2/50 |
| quest_end | 6/8/15 | 3/2/18 | 12/19/9 | 13/15/8 |
| new_goal | 18/10/11 | 9/3/20 | 23/21/6 | 17/18/12 |
| place_change | 20/3/4 | 21/5/3 | 23/15/1 | 23/10/1 |
| time_jump | 1/3/1 | 1/2/1 | 1/2/1 | 1/1/1 |
| scene_cut | 10/9/5 | 7/8/8 | 13/23/2 | 12/15/3 |
| clothes_change | 7/29/6 | 9/28/4 | 12/46/1 | 13/40/0 |
| item_change | 31/26/2 | 29/29/4 | 30/27/3 | 29/23/4 |
| person_enter | 7/9/25 | 7/8/25 | 13/9/19 | 17/11/15 |
| person_leave | 7/8/10 | 5/6/12 | 13/9/4 | 14/6/3 |
| relation_event | 31/31/3 | 31/25/3 | 31/30/3 | 32/31/2 |
| secret_learned | 22/51/1 | 11/21/12 | 21/44/2 | 21/28/2 |
| vow_said | 40/22/4 | 18/2/26 | 39/10/5 | 37/8/7 |

Output tokens and time per turn (provider tokens; the whole turn in seconds):

| run | C s / in / out | A s / in / out | S s / in / out |
|---|---|---|---|
| baseline-v2 | 15.2 / 10084 / 1096 | 9.7 / 9433 / 1410 | 10.1 / 9219 / 1444 |
| ask-first | 13.7 / 10357 / 1039 | 12.9 / 9807 / 1090 | 18.0 / 9648 / 1589 |
| ctl-baseline-v2 | | 14.3 / 9292 / 1233 | 16.0 / 9200 / 1513 |
| ctl-ask-first | | 11.9 / 9734 / 1055 | 20.5 / 9822 / 1614 |
| glm-baseline-v2 | 14.3 / 9736 / 1756 | 37.0 / 8958 / 2172 | 39.7 / 8969 / 2523 |
| glm-ask-first | 32.8 / 10353 / 1904 | 41.4 / 9746 / 2468 | 42.2 / 9644 / 2612 |

How the output followed the flags (Flash `ask-first`, pooled, 81 turns; "written" = the group's keys present and not empty):

| group | flag true, written | flag true, left out | flag false, written | flag false, left out |
|---|---:|---:|---:|---:|
| scene (place, scene, present ...) | 45 | 0 | 36 | 0 |
| things (outfit, holding, objects) | 54 | 0 | 26 | 1 |
| relations (events, edges) | 57 | 0 | 14 | 10 |
| knowledge (learned, said ...) | 23 | 0 | 38 | 20 |
| threads | 68 | 0 | 9 | 4 |

GLM (80 turns): flag false and left out: scene 0 of 32, things 7 of 26, relations 1 of 22, knowledge 6 of 25, threads 5 of 13.

The flags as an answer (scored against the key like a router run, pooled): Flash micro F1 / recall / precision **65% / 60% / 70%**
(router-v2 Flash on C alone: 68% / 75%), GLM **71% / 76% / 67%**. Where the flag is false and the key says it happened (price of
skipping), Flash: vow_said 30 of 44, secret_learned 16 of 23, quest_end 18 of 21, new_goal 22 of 29, person_enter 16 of 32, scene_cut 8 of
15, person_leave 9 of 17, item_change 7 of 33, place_change 4 of 24, relation_event 3 of 34. GLM: person_enter 13 of 32, new_goal 15 of 29,
quest_end 12 of 21, quest_progress 11 of 66, vow_said 9 of 44, secret_learned 6 of 23, scene_cut 4 of 15.

Reading:
- **Flash: recall fell from 62% to 44% pooled (C 65 -> 51, A 61 -> 37, S 59 -> 47); the control pair repeats it (54 -> 44)**. That is well
  outside the bands (11.1). The FP that fell (secret_learned 51 -> 21, vow_said 22 -> 2) fell because the knowledge keys were not
  written on 20 of 58 turns where the flag was false: FN rose with them (secret 1 -> 12, vow 4 -> 26). The model says "false" for a binding
  statement or a secret on the turns where it then used to write one.
- The saving is small: output tokens C -5%, A -23% (ctl -14%), S +10% (ctl +7%); input +3%. Time per turn has no consistent sign (A -17% in the control,
  S +28% in both pairs); wall times move with provider load.
- The ledger churn of clothes and items did not fall (clothes FP 29 -> 28, item 26 -> 29): the model writes the things group on 26 of 27
  turns with a false flag, and the scene group on every turn. Skipping works mostly where it hurts (knowledge, relations).
- **GLM 5.3 follows the prompt better**: pooled F1 58% -> 61%, recall 70% -> 69%; FP secret_learned 44 -> 28, clothes 46 -> 40, item 27 -> 23,
  place 15 -> 10, scene_cut 23 -> 15; FN +1 to +4 on a few signals, person_enter FN 19 -> 15. Output tokens +8% / +14% / +4%, so no saving; times
  are not comparable (the GLM baselines on A and S ran at 37-40 s beside four other runs). GLM's own noise band was not measured: +3 points of F1 is inside the
  Flash band of 4.
- Adoption rule of the plan (recall not beyond the band, and FP, output tokens or time falling clearly): **not met on Flash** (recall), **not
  clearly met on GLM** (FP falls, tokens and time do not, F1 gain within a plausible band). Not adopted. A GLM repeat with three runs would settle it.

### 11.3 Experiment 2: `calibrated` (base rates and quotas in the rules; alone and with `ask-first`)

Base rates in the answer keys (share of scored turns; C 37 turns, A 26, S 16; pooled 79):

| field | C | A | S | pooled |
|---|---:|---:|---:|---:|
| secret_learned | 15 (41%) | 4 (15%) | 4 (25%) | 23 (29%) |
| relation_event | 10 (27%) | 11 (42%) | 13 (81%) | 34 (43%) |
| vow_said | 13 (35%) | 18 (69%) | 13 (81%) | 44 (56%) |

The rates differ a lot by chat, so the prompt got generic words, not the numbers of one chat, and none of the keys' turns as examples. Pooled,
the sensor reports secret_learned on 92% of turns ((22 + 51) of 79 scored turns in the state proxy), relation_event on 78%, vow_said on 78%.
Three sentences were appended to the existing rules: after the note-weight line ("Most notes are everyday: in a story like this about one
turn in four has a note that is important or key, and key is rare (a handful in a whole story). At most one note a turn may be marked
important or key."); after the event-weight line ("Ordinary talk, small help, teasing and flirting are routine. In a story like this about
two turns in five have a significant event and pivotal is rare. At most one event a turn may be significant or pivotal."); after the
`said` rule ("In a story like this about every second turn has one; a promise of the moment, an ordinary refusal or an order nobody must
obey is not one. Report at most one per turn.").

| run | micro F1 / recall / precision pooled | secret_learned | relation_event | vow_said | clothes_change | item_change |
|---|---|---|---|---|---|---|
| baseline-v2 | 56% / 62% / 51% | 22/51/1 | 31/31/3 | 40/22/4 | 7/29/6 | 31/26/2 |
| **calibrated** | 53% / 56% / 50% | 23/45/0 | 29/25/5 | 38/27/6 | 8/28/5 | 29/29/4 |
| ask-first | 48% / 44% / 53% | 11/21/12 | 31/25/3 | 18/2/26 | 9/28/4 | 29/29/4 |
| **ask-first + calibrated** | 49% / 42% / 57% | 10/10/13 | 26/13/8 | 11/2/33 | 8/26/5 | 30/25/3 |

(fields as TP/FP/FN.) Per chat micro F1 / recall: calibrated C 52% / 64%, A 52% / 50%, S 57% / 52%; ask-first + calibrated C 50% / 49%,
A 46% / 37%, S 51% / 41%. Output tokens per turn: calibrated C 1153, A 1144, S 1632; combined 910, 918, 1412 (baseline 1096, 1410, 1444).

Reading:
- **`calibrated` alone: FP secret_learned -12% (51 -> 45), relation_event -19% (31 -> 25), vow_said +23% (22 -> 27)**. The bar of the plan was
  one third with FN inside the band: not met. The sentences move relation_event and secret_learned a little; the model does not count
  turns. Recall fell 6 points pooled (A 61 -> 50), at the edge of the band. Not adopted.
- Together with `ask-first` FP fall further (secret 10, relation 13, vow 2), but they fall the same way as in 11.2: by leaving the keys out, with
  recall 42%. The combination is the lowest-recall run of the phase.
- The over-reporting of these three fields is therefore not cured by wording at this strength. What is left to try is a separate decision on the
  `weight` field (a second call, or code that downgrades notes by itself), not a longer rule.

### 11.4 Experiment 3: the flags as the director (a reading of 11.2; recall of 70% is enough for a trigger)

Trigger quality against the key (pooled over C, A, S; 81 turns Flash, 80 GLM; a false wake is a turn where the flag is true and the key is false):

| source | trigger | real | caught | missed | recall | false wakes | wakes per 100 turns |
|---|---|---:|---:|---:|---:|---:|---:|
| Flash ask-first flags | scene_cut | 15 | 7 | 8 | 47% | 4 | 14 |
| Flash ask-first flags | place_change | 24 | 20 | 4 | 83% | 4 | 30 |
| Flash ask-first flags | time_jump | 2 | 1 | 1 | 50% | 0 | 1 |
| Flash ask-first + calibrated flags | scene_cut | 15 | 9 | 6 | 60% | 4 | 16 |
| GLM ask-first flags | scene_cut | 15 | 11 | 4 | 73% | 12 | 29 |
| GLM ask-first flags | place_change | 24 | 23 | 1 | 96% | 5 | 35 |
| GLM ask-first flags | time_jump | 2 | 1 | 1 | 50% | 1 | 3 |

Any of the three together (one wake for "the scene changed"), against the same key:

| source | real | caught | missed | recall | false wakes | wakes per 100 turns |
|---|---:|---:|---:|---:|---:|---:|
| Flash baseline-v2, the sensor's own signals (`scene.new`, place text, minutes) | 25 | 22 | 3 | 88% | 6 | 35 |
| Flash ask-first flags | 25 | 21 | 4 | 84% | 4 | 32 |
| Flash ask-first + calibrated flags | 25 | 21 | 4 | 84% | 6 | 34 |
| GLM baseline-v2, the sensor's own signals | 25 | 24 | 1 | 96% | 25 | 62 |
| GLM ask-first flags | 25 | 24 | 1 | 96% | 9 | 42 |

Reading:
- As a trigger for World DM `onPlace`/`onTransition`, Litopys scene close and the background picker the criterion (recall 70%+) holds for
  place_change and for the three together on both models. time_jump has two cases in the keys: no reading. scene_cut alone is weak on Flash (47-60%).
- **The flags add nothing on Flash**: the sensor's own output already gives 88% recall at 35 wakes per 100 turns; `ask-first` gives 84%.
  A trigger from the existing snapshot diff and `scene.new` is available today, with no prompt change. On GLM the flags cut false wakes
  from 25 to 9 (62 -> 42 wakes per 100 turns) at equal recall: the one clear gain of the phase, bought with the `ask-first` prompt whose other
  effects are in 11.2.
- Open idea answered for 5.3 and DESIGN.md section 0: the "decided in four places" problem can be settled by one derived signal
  (place changed, or `scene.new`, or minutes above 30) computed in code after the sensor call, with no router; a flag from the model is
  optional and only worth it on a model that follows the format.

### 11.5 Caching probe (the plan's "one look"; not a run)

NanoGPT's subscription endpoint reports `prompt_tokens_details.cached_tokens` and caches by itself: a second call with the same 5.1k-token
system prompt returned 4864 cached of 5107 (DeepSeek V4 Flash) and 5032 of 5056 (GLM 5.3); the first call 0. The fixed rules sit first in the
prompt, so their 4.3k tokens are the cacheable prefix. The bench runs did not log cached tokens, so how much of the phase's turns hit the cache
is not measured; the price column of section 7 counts them as ordinary input.

### 11.6 Caveats of phase 1

- One run per variant and chat; the only repeats are Flash `baseline-v2` on C (three) and the control pair on A and S. GLM has no noise band.
- Wall time is not comparable across waves: three to five runs ran side by side, and the same variant took 10 s in one wave and 16-20 s in
  another (S `baseline-v2` 10.1 s, later 16.0 s). Use output tokens, not seconds, for the effect of a prompt.
- The answer keys are still the labellers' (not checked by the owner); the state proxy for clothes and items counts text rewrites as changes (3.1).
- The three chats are the owner's own, in two languages; the base rates differ by chat (11.3).

### 11.7 Decisions after phase 1

| item | decision | evidence |
|---|---|---|
| `ask-first` on the cheap model | not adopted: recall 62% -> 44% | 11.2 |
| `ask-first` on GLM 5.3 | candidate; repeat three times to get its band before any change | 11.2, 11.4 |
| `calibrated` base-rate sentences | not adopted: FP -12% / -19% / +23%, below the one third bar | 11.3 |
| A scene-change trigger for rare jobs | derive it in code from the sensor's own output (88% recall on Flash); no router, no new prompt | 11.4 |
| The model's `weight` over-reporting (secret_learned, relation_event) | wording does not cure it; next: a code-side downgrade or a separate small decision | 11.3 |
