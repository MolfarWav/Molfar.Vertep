# Direction (#496): where it stands and what is next

For the next session. Read `.fork/STATE.md` first, then this file, then `DESIGN.md` (sections 1, 1a, 3, 5).

## Done (2026-11-22)
- **Design** `DESIGN.md`; owner's decisions in sections 1 and 1a.
- **Phase 0, bench** `BENCH.md`, `RESULTS.md`; script Roleplay `scripts/direction-bench.ts` (corpus outside the repos on the
  laptop: `D:\Claude\tmp\direction-bench\`, synthetic, 48 turns). Includes 0b (notes through the real prompt).
- **Phase 1, released in Roleplay 4.149.0** (PR 191, merge `2f8c992c`): plan `PHASE1.md`, approved mock
  `mock-group-create.html`, handbook `../../handbook/roleplay-direction.md`. #294 closed. The owner presses Update.

## Phase 3b BUILT, not released (2026-11-22)
World people in beats and rules, Roleplay branch `claude/direction-phase3b` (commit `37b8eff7`, pushed, no PR). What is built and the UI
plan: `PHASE3B.md`. Next: the owner plays it (or "Мердж і реліз": 4.152.0, tip, CHANGELOG, `direction` translations, full suite, PR,
merge). Then phase 4 (other genre sets, a draft from the cards) or the Scene tab.

## Phase 3a RELEASED in 4.151.0 (2026-11-22)
Beat plan + scene boundary, Roleplay 4.151.0 (PR 193, merge `ee3c8fc2`). What is built and the UI plan: `PHASE3.md`. The owner presses Update and plays it. Next, 3b: World NPCs inside rules and beats (a rule or a
beat may bring a bench or deck person; a note for someone who is not a group member, no card, judged by World's came / mentioned).

## Phase 2 RELEASED in 4.150.0 (2026-11-22)
Roleplay 4.150.0 (PR 192, merged and released 2026-11-22). Plan and what is built:
`PHASE2.md`. Before a release: refresh the `direction` guide translations (`bun scripts/guide-l10n.ts --stale`, then a cheap model,
check `uk` by eye, `--stamp`); bump `manifest.json` and `APP_VERSION`; CHANGELOG "Unreleased" renamed. Phase 2 left on purpose:
place, time and warmth conditions, actions leave/spotlight/event, a firing limit, own rules, other sets; `RULE_DEFAULTS` and
`DIRECTION_SETS` repeat the plugin's set on the client (better: a `default` per rule and a sets route in the plugin).
The log's rule names and "why" text come from the plugin in English (not translated).

## Not checked yet (ask the owner after he plays)
- Phase 2 with a real model: do the rom-com rules fire at sensible moments, is `came` common, are need, cooldown, K and M right.
- A real model in the app: does the director's report match the scene; which model he picked.
- A Russian or Ukrainian group chat (names in Cyrillic go through the registry's aliases).
- A long real group chat; the phone with three bars above the chat (Dashboard, members, Direction).
- The lock and return on a free model in the owner's own preset.

## (Phase 2 as it was planned; now built, see above and PHASE2.md. Next is phase 3: beat plan, scene boundary, World's NPCs.)
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
