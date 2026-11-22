# Direction (#496): where it stands and what is next

For the next session. Read `.fork/STATE.md` first, then this file, then `DESIGN.md` (sections 1, 1a, 3, 5).

## Done (2026-11-22)
- **Design** `DESIGN.md`; owner's decisions in sections 1 and 1a.
- **Phase 0, bench** `BENCH.md`, `RESULTS.md`; script Roleplay `scripts/direction-bench.ts` (corpus outside the repos on the
  laptop: `D:\Claude\tmp\direction-bench\`, synthetic, 48 turns). Includes 0b (notes through the real prompt).
- **Phase 1, released in Roleplay 4.149.0** (PR 191, merge `2f8c992c`): plan `PHASE1.md`, approved mock
  `mock-group-create.html`, handbook `../../handbook/roleplay-direction.md`. #294 closed. The owner presses Update.

## Not checked yet (ask the owner after he plays)
- A real model in the app: does the director's report match the scene; which model he picked.
- A Russian or Ukrainian group chat (names in Cyrillic go through the registry's aliases).
- A long real group chat; the phone with three bars above the chat (Dashboard, members, Direction).
- The lock and return on a free model in the owner's own preset.

## Next: phase 2 (genre rules), design section 3.2 and 3.5
- Rules `when -> do` with a closed list of conditions over the director's reports (scene tag, who and how many present,
  "alone with X for N replies", place, time, warmth, after an event) and actions (bring in a member or NPC, interrupt,
  take out, event, Spotlight); chance by 2d6 (`rollFate` in World), cooldown, limit; build-up and payoff (K, M).
- Delivery: one stage note per reply for World and Direction together (World's pending event wins), the template notes
  of the bench (`templateNote` in the bench script), judged came / mentioned by World's `judgeEntrance` logic.
- Visible (owner's standing rule): a switch, a log (rule, conditions, roll, who, why, delivered), a mark under the reply,
  "Fire now" per rule. The rom-com set first.
- Where: the Direction plugin (`plugins/direction/`); the bar's sheet gets tabs Rules, Plan, Log (design 3.7).
- Ask the owner first: the rom-com set's rules and numbers (K, M, cooldowns), whether the rules sheet is its own tab or a
  popover, and whether World NPCs come in phase 2 or 3.

## Later
- Phase 3: beat plan and the scene boundary (#430 point 2), also for World's bench and deck.
- Phase 4: other genre sets, draft from the cards.
- From #294: the compact lines of others present are still the first cut over the Dashboard budget.

## Traps learned here
- Plugins do not import each other: the engine reads `direction/state/<chatId>.json` with its own `directionScene`;
  change it together with the plugin's `sceneNow` and `cleanState`.
- Python `open(..., "w")` on Windows writes CRLF; git normalizes, but pass `newline="\n"` for files a hash is taken of
  (guide l10n stamps).
- The cheap model translated the Ukrainian guide page into Russian once: check `uk` by eye after every guide refresh.
