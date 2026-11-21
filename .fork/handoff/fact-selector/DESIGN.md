# Fact selector: design note (Roleplay, issue #488)

Status 2026-11-21: design and a bench, no app code. **The bench did not support the model selector** (section 3): cutting or
choosing the facts did not reduce the repetition it was meant to fix. Read section 3 before building any of section 1. The owner agreed to the shape in the thread of #183 and allowed
the bench to use external models on his chats. Roleplay code lives in MolfarWav/Molfar.Vertep-Roleplay; this repo carries
the notes and the bench script (`bench.py` here; it reads a local data folder and writes only to its `--out` folder: the
chats never enter this repository).

## 0. Why

A diagnostic of 77 replies from three of the owner's chats (#183, comment of 2026-11-21) found repetition (33 replies) and
continuity drift (23) far ahead of colliding push notes (2 of 77). The owner's own example: an unpaid clinic bill that came
back in reply after reply "like a holy relic".

What feeds it, read in the code (Roleplay `plugins/litopys/plugin.js`, molfar.vertep-roleplay 1375e09):

1. **Everything fits, so nothing is chosen.** `autoBudget` gives Litopys a share of the model's window, capped at
   `BUDGET_MAX = 16000` tokens. When every active fact and chapter fits (`buildInsert`, the `fullHead`/`fullTail` branch),
   the insert is "full": 39 to 76 facts, 3.4k to 5k tokens, every turn, duplicates included. Ranking only matters below that.
2. **The rank rewards repetition.** `factRecency` (#50) adds recency from the last time a fact *was put in a prompt*
   (`lastUsed`) and a bonus for how often (`0.2 * uses`, `markUsed`). Under a tight budget the facts that were sent most
   are the ones kept. That is the opposite of what a writer needs.
3. **The model echoes itself.** A detail named in the last few replies comes back even without the fact; dropping the fact
   alone may not end the loop.

## 1. The selector

One small model call per turn that decides which facts the next reply gets. Agreed with the owner (thread of #183):

- **In:** the active facts the reader may know (id and one line; pinned ones marked "always in"), a short scene state from
  the Dashboard (place, who is present, what is going on), the last 2-3 messages, and an echo count from code: how many of
  the last N replies touched each fact.
- **Out, a closed choice by id, validated by code:**
  - `now`: up to about 8 facts this scene needs;
  - `hold`: secrets not to touch yet (`hint: true|false`);
  - `worn`: facts whose details the replies keep repeating and this scene does not need.
  Everything else is background (not sent). An id in two lists: the insert wins (see bench finding 2).
- **Code keeps:** who knows what (`knownBy`, the speaker filter: never the model's), pinned facts, the facts the player's new
  message names (Litopys's own scan at reply time, words and vectors), and today's behaviour when the call fails or is late.
- **When:** after a reply, in the background, on the build model (as the World DM does), so the next turn does not wait.
  Stored per chat and keyed to the reply it read (`litopys/select/<chatId>.json`); a swipe or a regenerate makes it stale
  and the insert falls back to code until the next run.
- **What the writer sees:** the chosen facts in today's format, plus, only if the bench says it helps, one line naming the
  worn motifs ("do not bring these up again unless the scene needs them"). Telling a model what not to say can backfire;
  variant D measures it.
- **Visible:** a switch (off by default until measured on real play), and a log per turn: what was taken, held and called
  worn, and the model's one-line reason. The owner asked that every mechanism under test ships a switch and a log.

### Echo count in code

The bench uses a tagging model as a stand-in. In the app it must be cheap and work across languages (facts are English,
the story may not be): Litopys already keeps fact vectors (`.cache/litopys/vectors`); compare them with the vectors of the
last N replies (one embedding per reply, already computed for recall where the setting is on). Without embeddings, fall back
to the fact's `also` words and names.

### Code-only parts worth doing either way

- `factRecency` should not reward being sent. Reward being *needed* (named by the player, picked by the selector), and
  lower a fact whose details the replies keep echoing.
- A cap on facts per turn even when everything fits (a share of the budget, not all of it), so ranking does its job.

## 2. The bench (`bench.py`)

Checkpoints: real user messages from the owner's chats; the facts and chapters Litopys had at that moment (by time and by
the message range of each fact); the last 8 messages; the card. Four variants of the memory insert:

| | What reaches the writer |
|---|---|
| A | every active fact (today, when all fit) |
| B | code: pinned + rank (weight, present people, recency of writing), cap 12, worn facts dropped unless the player named them |
| C | the selector over every fact (pinned + `now`) |
| D | code prefilters 20 by B's rank, the selector picks, and a "worn out" line goes to the writer |

Writers: a small (12B), a mid (24B) and a larger fast model, the same prompt per variant. A tagging model marks which facts
each of the last 6 replies and the player's message touch (worn = 3 of 6 or more; needed = named by the player). A judge from
another model family reads the four replies of one writer blind and in random order: worn facts echoed, contradictions with
the facts or the scene, and scores for fit, freshness and character.

Limits: the writer prompt is a simplified one (card, memory insert, history; no preset, no Dashboard insert); chapters are
the same in all variants; one run per cell (temperature 0.8), so small differences are noise; the judge is one model.

## 3. Results (2026-11-21, 9 checkpoints from 3 chats, 3 writers, 7 variants, about 300 model calls)

Variants added after round 1: **E** (B's facts and a "worn out" line naming only the relics, facts echoed in 5-6 of the last 6
replies), **G** (all facts, the same line at the END of the request, after the history), **H** (all facts, a director's note at
the end: "this has come up in nearly every reply without changing; move it forward with something concrete, or leave it out").
Round 1 had a bench bug: C and D did not add the facts the player named (3-4 of 15 lost); fixed in round 2 (0 lost).

**Relics echoed in the new reply** (a relic: a fact echoed in at least 5 of the last 6 real replies; 20 relic slots per writer;
counted by the tagger, two passes with a different order):

| writer | A | B | C | D | E | G | H |
|---|---|---|---|---|---|---|---|
| large | 9 / 12 | 9 / 8 | 11 / 10 | 12 / 13 | 10 / 11 | 7 / 9 | 11 / 12 |
| mid | 4 / 3 | 3 / 3 | 3 / 5 | 5 / 6 | 2 / 3 | 3 / 6 | 3 / 6 |
| small | 8 / 10 | 8 / 9 | 9 / 9 | 8 / 10 | 8 / 10 | 9 / 9 | 7 / 10 |
| **all (of 120)** | **46** | **40** | **47** | **54** | **44** | **43** | **49** |

The tagger's own noise: up to 3-4 per cell between its two passes on the same replies.

**Insert size:** A 2,942 tokens on average; B 1,708; C 1,698; D 1,871; E 1,786 (about 40% less).

**The judge's scores** (fit, fresh, character, contradictions) moved by up to 0.5 between rounds on the same replies, and its
echo counts by 2x (A: 19, 18 and 8 of 60 in three rounds), so the judge cannot separate the variants; its tables are kept
in the bench output only. Two patterns held in every round: on the large writer, B and C scored a little lower on freshness
than A (fewer facts, less material), and nothing scored worse on the small writer with fewer facts.

**Reading:**
1. No variant reduced the relics beyond the noise: not cutting the facts (B, C), not naming the worn motifs at the top (D, E)
   or at the end (G), not a director's "move it or drop it" (H). In variant B the relic facts were not in the prompt at all and
   the replies still brought them back about as often: the loop lives in the chat history, not in the memory insert.
2. Cutting the insert by about 40% cost nothing measurable on the small and mid writers, a little freshness on the large one.
3. A model selector (C, D) adds a call per turn and gave nothing over code (B) on any measure.

**Decision proposed to the owner:** do not build the model selector for repetition. Look at the history side instead (see 5).

## 4. Bench findings that change the design

1. **Echo count is not "worn".** Raw counts also catch the facts of the scene that is happening right now (they are named
   in every recent reply because they are current). Code cannot tell "current" from "stale"; that is the selector's job, and
   the reason a pure code variant may drop what the scene needs.
2. **The model names one id in two lists** (now and hold, or now and worn), mostly pinned facts that code adds anyway. Fix:
   show pinned facts as "always in" or leave them out of the model's pool; code resolves the rest (the insert wins).
3. **A one-model judge reading several long replies at once is not a measuring tool** for differences this small. Use a
   tagger per fact (repeatable, two passes) for anything countable, and keep judges for large, obvious differences.
4. **The bench's limits:** 8 messages of history (the app sends many more, so the real echo from history is stronger); a
   simplified prompt (no preset, no Dashboard insert); 9 checkpoints, one generation per cell. It can show a large effect
   (halving the relics), not a small one.

## 5. What to try next (not decided)

The relic loop is fed by the model's own recent replies. Levers on that side, cheapest first:
- **Sampling:** a repetition or DRY penalty in the preset (what SillyTavern users use). It works on repeated wording, not on
  a repeated idea in new words, so expect a partial effect; free to test.
- **History:** let Litopys's prompt cut (#261) keep fewer verbatim replies and more chapter text, so the old mentions are
  summarised once instead of read in every reply. Testable in this bench with a history-length variant.
- **Story:** a relic is often an unresolved stake (the bill is a deadline). It repeats because nothing moves it. A thread that
  stalls is the turn director's job (#401, quests that never close, #400): a nudge to move the thread, chosen from the
  quest state, not from a list of facts. H tried a generic version of this and did not help, so a real test needs the
  quest state behind it.
