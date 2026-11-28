# Bench of the World DM's secret threads (#545, question 7), 2026-11-28

Script: `.fork/bench/secret-threads.ts`. The plugin's real DM run and reply hook on a synthetic story (English and
Ukrainian), the story's replies scripted, a DM run after every reply (harsher than play: the default is every 5th).
No OpenRouter key on this machine, so small open models of two other providers stood in for the free ones.
Four models: a 31B instruct model (A), a 120B reasoning model (B), a 30B reasoning model (C), a free reasoning
model (D). One thread, hint every 2 replies.

## First run (10 runs per story)

| Model | Runs that worked, en / uk | First answers cut at 1500 tokens |
| --- | --- | --- |
| A | 10 / 10 | 0 of 20 |
| B | 10 / 10 | 20 of 20 (the retry saved them) |
| C | 8 / 6 | most |
| D | 0 / 0 | all |

Where it worked: one thread per chat, no unknown id, no add past the limit, hints renewed.

## Without threads (control, 6 runs per story)

A: no cut-off. B: 12 of 12 cut once, 11 of 12 worked. C: 7 of 12 worked. D: 3 of 12. **The cut-offs are not caused by
the threads.**

## Faults seen, and the rules added for them

- A run summary (the player sees it) named the thread: the summary is no longer kept while a thread is live (code).
- A record said what a clue pointed to; a thread's event named the answer: both now forbidden in the rules.
- Events that served a thread came without its id, so "one in three" did not count them: now asked for.
- An English thread in a Ukrainian story: the rules now ask for the story's language.
- A vague idea ("something is hidden"): a definite answer is now asked for.

## Rerun with the new rules (A and B, 10 runs per story)

All 40 runs worked. Ukrainian threads came in Ukrainian. A: no leak sign. B: one record still ended with what the
clue hints at; its English idea stayed vague and one event gave away much of it. Judged by reading, the rules help
and do not close the gap: **a small model can still leak a thread into the world book or into an event.**

## Not measured

Real play with a real writing model; more than one thread; group chats; the actual free models of OpenRouter.
