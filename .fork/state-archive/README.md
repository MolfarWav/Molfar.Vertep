# State archive

`.fork/STATE.md` is the short, current file. Its older sections live here, moved word for word (2026-11-14, when STATE.md
had reached 488 KB). One file per period, newest first inside each. Nothing here is current by itself: a section may say
"not released" or "open" about something that has since shipped; the release's CHANGELOG entry, the GitHub issue and
`.fork/release-notes/` have the final word.

| File | Covers |
| --- | --- |
| `2026-11-19-to-11-21.md` | 2026-11-19 to 2026-11-21: the places map step M2, owner's batch #467 to #463, engine 1.20.0 / 1.21.0 with Roleplay 4.141 to 4.147, the fact selector (#488), growth bound to chats (#450), Roleplay #448 steps T3 to T5 |
| `2026-11-15-to-11-18.md` | 2026-11-15 to 2026-11-18: Roleplay 4.128 to 4.139 (who perceives and who knows, phone typing lag and the grey frame, sprite windows), Social 0.18 to 0.21 (Journal, City, memory ledger M1 to M3), engine 1.17 to 1.18.0 |
| `2026-11-13-to-11-15.md` | 2026-11-13 to 2026-11-15: Roleplay 4.119 to 4.123 (agent forge, group dynamics, dashboard clock and clothes, Kingmaker concept), cache keep-alive, Updates dialog wording, big library zip import |
| `2026-11-11-to-11-12.md` | 2026-11-11 to 2026-11-12: Roleplay 4.114 to 4.118, engine 1.16.2 to 1.16.4 (prepared or released), turn director design |
| `2026-11-08-to-11-11.md` | 2026-11-08 to 2026-11-11: Roleplay 4.103 to 4.113, engine 1.12.2 to 1.16.1 (prepared or released) |
| `2026-11-01-to-11-07.md` | 2026-11-01 to 2026-11-07: engine 1.9.0 to 1.11.7, Roleplay 4.80 to 4.98 |
| `2026-10-24-to-10-31.md` | 2026-10-24 to 2026-10-31: engine 1.3.5 to 1.8.1, Roleplay 4.65 to 4.79 |
| `2026-10-17-to-10-23.md` | 2026-10-17 to 2026-10-23: engine 1.2.0 to 1.3.5 |
| `2026-10-11-to-10-17.md` | 2026-10-02 to 2026-10-17, plus three old reference blocks that no longer describe the project: engine 0.9.x to 1.2.0 (the oldest part of the file, including "Repos", "Open, from 0.9.4-0.9.6", "Released") |
| `START-queue-until-2026-11-14.md` | the old queue of `.fork/handoff/START.md`: 24 "release prepared" lines and the plans of October |

## When to look here
- Before proposing a fix or a design (CLAUDE.md, "Look at what was already done"): `grep -ri "<keyword>" .fork/state-archive .fork/STATE.md`.
- A handoff or note that says `STATE, "SOME SECTION"` points at a section that is now in one of these files.

## When to add here
When `.fork/STATE.md` passes about 60 KB: move every section older than a week (keep the closing evergreen blocks) into a new
file named by its dates, add a row above, leave the live file with a refreshed "Where things stand". Move text, do not rewrite it.
