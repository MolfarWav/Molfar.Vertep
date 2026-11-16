# Cast and world book: where we stopped, and how to continue (2026-11-16)

Read in this order: `.fork/STATE.md` (section "CAST, WORLD BOOK REWORK AND THE DM'S MEMORY"), `DESIGN.md` beside this file,
this file, issues #424 and #425 in MolfarWav/Molfar.Vertep, then the handbook page `.fork/handbook/roleplay-world-dm.md`.
Reply in Ukrainian, code and repo files in English (CLAUDE.md).

## What is done

| Step of the order | State |
|---|---|
| 1. default profile | Roleplay 4.130.0 (and 4.130.1: spinner, guide translated) |
| 2. record shape, entrances, bench ("лавка й поява") | **Roleplay 4.131.0, released 2026-11-16**: PR MolfarWav/Molfar.Vertep-Roleplay#152, merge `27e146c`, branch `claude/cast-bench` (merged, can be deleted). The owner presses Update on Roleplay. No engine release. |
| 2.5 + 3 RELEASED as one Roleplay release, **4.133.0**, 2026-11-16 (PR #155, merge `63c8fa7`). Rows 2.5 and 3 below describe what was built; the next work is row 4. |
| 2.5. repair: the DM's short input (v7-7), mention against stage (v7-2) | **built 2026-11-16, not released**: Roleplay branch `claude/cast-stage` (local, `585526d`, `b727cb5`, `590e85a`, `6aa85a0`), tests and typecheck pass, docs and the handbook page updated, browser check done with a mock model (`cast-stage-check.mjs` in this folder: dark, Daylight, 390 px). Not checked on a live model or on a real Dashboard chat. The owner has not run any of the "Open, not checked" items below (answered 2026-11-16: none). Release only on the owner's word (version, "What's new" tip, guide translations, PR). |
| 3. book rework + DM memory step 0 | **built 2026-11-16, not released**: Roleplay branch `claude/cast-book` on top of `claude/cast-stage` (`b77e847`, `ad06351`, `6c0a2eb`, `c224bc5`); see STATE. Release order: 2.5 first, then this. Browser check done (`cast-book-check.mjs` in this folder, 28 checks; dark, Daylight, 390 px) and the full suite run (4283 pass, `openCard` fails as known). Not checked: a live model, the Litopys move in a browser, guide translations. |
| 4. cast deck | **RELEASED 2026-11-16 as Roleplay 4.134.0** (PR 156, merge `32a04bf`), with point 6 of v7 (the DM's `returns`) and point 9 (the `tie`). The whole suite was not run for it. Next: step 5, the DM tab (#425). The row's old text follows: Tests and typecheck pass; docs, guide page, handbook written. **Browser check done (see STATE); not done: a live model, guide translations, the "What's new" tip, version bump, PR.** |
| 5. DM tab, Memory view (#425) | **first half BUILT 2026-11-16/17, not released** (Roleplay branch `claude/dm-tab`: `a0da14e`, `d4d62d7`, `bc22ae9`; local, not pushed). Second half (rules in words, a small model call, the prompt block, a second confirmation for a global rule) waits for the owner's word "далі". Read "Added by step 5, first half" below. |

**The next step is 2.5, not 3** (owner, 2026-11-16, DESIGN "Corrections v7", read it before anything else in DESIGN: it
changes the things tidy-up, the entrance judge and where world facts go). Step 2.5 is one small release that repairs what
is shipped: the DM's input sends only the relevant records in full (v7 point 7), and the cast tells "mentioned" from
"on stage" (v7 point 2). Then step 3 with v7 points 1, 4 and 8, then step 4 with 6 and 9. Roleplay `main` is 4.132.0.

Issue #424 is still open (steps 3 and 4 remain). A comment with what shipped is on it. #425 keeps its own list.

## What step 2 built (the facts to rely on; details in the handbook page and `docs/DATA-FORMATS.md` "Cast")

- Record fields (person and group): `relation`, `weight`; person: `link {book, uid, title}`, `noReturn`; status `dormant` (read only for now: nothing writes it yet).
- Settings `cast` (off, rare, normal, often; absent = off, so old chats stay off) and `castShow` (the testing mark). Profile option `cast` (default normal). New chats start on the profile's value.
- State keys `entrance` and `lastEntrance` (own keys, NOT `event`: works at the chronicler level, has a code judge, rides `reconcile` and `CORE_KEYS`).
- Silence is never stored. `castIdentity` + `silenceOf` + `seenIn` in `plugins/world/plugin.js` read the chat and the Dashboard's snapshots: registry id first (the owner's rule: "id prevails over names"), names and the registry's aliases second; a name the registry gives to two people counts for nobody; a record with no `regIds` is looked up in the registry by its name (read only).
- Entrance: threshold Rare 60 / Normal 30 / Often 15 (times 0.75 to 1.25 per person, seeded), roll 2d6 + 0..3 silence + weight, bands 6 / 9, firm note, stricter second note after a miss, gap 20 / 10 / 5 replies, not in the first 6 replies, one at a time, not in combat, not while a DM event waits, cast-aware Life. Delivery is judged by code on the next request (`judgeEntrance`), the result is written into the log line (`markCastResult`).
- Bench adoption: `POST /world/bench` (one build call, link not copy, skips secret entries, joins the registry) and a Start step `{ bench: true }` (switch "People from the lorebooks", on).
- Stubs of weight 1 or more are `constant` entries in the world book (heaviest 8, `benchConstant`). Insert ceiling row `world cast` (160) is written twice: world plugin `insertCeiling` and engine-side `hookInsertBreakdown` in `plugins/engine/plugin.js`.
- Testing UI the owner asked for: card "People coming back" in the chat's World sheet (`src/components/world/world-cast.tsx`: Frequency, "Show under the reply", the bench with silence and "due", the entrance, the last one, a log, the adopt button); a mark under the reply (`src/components/chat/dice-note.tsx`, matched by the message the note followed, not by message count); `GET /world/cast`.

## Open, not checked (do these first, they need the owner's tests)

1. **A live model.** Does the firm note make a small free model bring the person in? Is the scale (small, medium, big) right? Does the adoption call pick sensible people? The owner is testing; read their results (issue comments, Discord reports they bring) before changing numbers. Thresholds and bands are first guesses: `CAST_SILENCE`, `CAST_GAP`, `rollEntrance`.
2. Light theme and the record form on a phone; the Start switch in a browser (unit tests only).
3. Silence by id on a real Dashboard chat (the browser run seeded the registry by hand).
4. Guide translations of `world-dm` are stale again (the English page changed after 4.130.1's translations): `bun scripts/guide-l10n.ts --dir <roleplay repo>/.skills/guide --stale`, cheap model, `--stamp`. Help article not touched.
5. The dice marks under replies: in the browser harness the EXISTING dice mark did not show either, because the engine saves the player's line after the request, so `n` is one short and `n === index` fails. The cast mark was moved to the `last` key. Check in a real chat whether the dice marks work; if not, fix them the same way (`rollsFor`).

## Added by step 5, first half (the DM tab and levers, 2026-11-16/17)

- Read STATE ("Step 5, first half BUILT") for what was built and the decisions taken on my own; handbook `roleplay-world-dm.md` (owners, traps, tests); `docs/DATA-FORMATS.md` ("The DM's memory") and `docs/COUPLINGS.md` ("The DM's memory: levers...").
- **For the second half:** `state.learned` already has `rules`, `proposals`, `answered`, `log`; a prose rule is a rule with `lever` replaced by `text` (extend `cleanRule`, `cleanProposal`, `learnLog`, the log words). The prompt block "what this player prefers" (about 10 rules, about 600 characters, both scopes) goes next to `learnNote` in `dmInput` (the `learned` argument is already a string; build it from the rules and the lever note), and counts in the DM's input estimate. The proposal comes from a small call of its own (not inside `updateRoute`'s DM run); evidence is already in `learnEvidence`. A rule for all chats written in words needs the second confirmation. The profile editor card `LearnedMemoryCard` already shows `note` (it is the exact string): add the rules' text there. Rules must not enter `cleanWorld`.
- **Not checked (do first when the owner allows the heavy run):** the screens in a browser: dark, Daylight, 390 px. Walk: the DM tab and its dot, the Memory row, the view with a seeded proposal (put 5 `delete` signals with `madeBy: "dm"`, `kind: "thing"`, recent `at`, into `world/state/<chat>.json`, then send once so `updateRoute` raises it), the three answers, Edit, Remove, Add a rule, Remembered exactly with Show list and Clear, Reset all, the profile editor's card, the chat sheet's card and its log, the switch, the things lever in a real DM run (a mock model's JSON with a thing that has no `why`). Traps from step 4 apply (Escape before the app row, never click `Close toast`, fresh engine each run, `lang: "en"`).
- A `loadState` that applies the rules to a chat with no state file shows them in `GET /world/state` only after the first save for `things`; `cast` may need one more read after `startSettings`.

## Added by step 4, the cast deck (2026-11-16): what to know and what to check

- Read STATE ("Step 4 BUILT") for the shape and the decisions taken on my own. Handbook `roleplay-world-dm.md` has the owners, traps and tests; `docs/DATA-FORMATS.md` ("Cast deck") the format.
- Browser check DONE (2026-11-16): `cast-deck-check.mjs` and `cast-deck-start-check.mjs` in this folder; `roleplay.patched.mjs` is the helper file with the two fixes this machine needs (Escape before the app row, force click and a long Launch timeout). Traps found: never click `Close toast` buttons in the World pages (the toast's action opens the Library and the page moves away); the first `openRp` after install may fail once, run it again; `getByText("Start", { exact: true })` is the Start tab; the draft's reveal button is "Show me"; an engine copy of the Roleplay folder also copies its `data/` folder. What it walked is in STATE. The older notes follow:
- Browser check (old text): copy `cast-book-check.mjs` as the base. Things to walk: a Start with the switch on (draft lists the cards, "Remove" one, accept, the card in the sheet and the chip count), the card "Cast deck" (switch, counts, "Add new people now", the log), the chip and the tile in the book dialog ("Show the cards", edit, remove, a name clash, a tie nobody goes by), a draw with a seeded state (set `castDeck`, a card, 100 replies: the note goes in, the log line has the tie and the pick, the carrier reply naming the person turns the card into a record and a member of its faction), the profile option, and "People coming back" no longer lists deck lines. Dark, Daylight, 390 px; `lang: "en"`; the mock model cannot answer JSON, so a refill from the button shows its error toast (seed the cards by hand or give the mock a `world_cast` answer).
- Traps: a card is a record only after the judge, in the `llmRequest` hook (it needs `chat.meta` for the registry and the book); `state.cast` and `settings.castDeck` are different things from `settings.cast` (the Frequency); the insert ceiling row `world cast` is in two plugins (`deckNoteTokens`); `startPlan` has a 4th argument; a recipe file without `cast` gets 3 factions and 2 each; a Start now plans cast steps by default, so tests that count steps pass `cast: false`.
- Still guesses: the deck uses the bench's thresholds (60/30/15) and bands (6/9); a card is 5 to 10 sentences, up to 1200 characters; 10 replies between refill tries; three cards as the floor. Change them only after the owner's live-model tests.
- Left out on purpose: the Life die draws only from the bench; the DM does not name a card (`out.event.cast` of the design is not built); a saved world's cards cannot be edited from the Worlds tab (the chip shows only for a chat); the card's faction cannot be changed in the form.

## Added by step 2.5 (what to know before step 3)

- `dmInput` takes `full` (a Set built by `fullRecordIds` in `updateRoute`); no Set = old behaviour. Step 3's "do not record (the player removed)" line (v7-8) goes next to `BRIEF_NOTE` in the same function.
- Two silences: `silencesOf` returns `{ stage, mentioned }`; `silenceOf` is `stage`. With a Dashboard snapshot on a message only `present` counts as stage; a message with no snapshot counts by the name. `lastEntrance` has `res`; `castGap` and the `floor` flag implement the half gap and the medium floor.
- Decisions taken with the owner (2026-11-16): due and the 2d6 modifier use `stage`; a mention ends the entrance for every band (no stricter second try, that stays for a total miss); people in the scene's `present` are always in full; "due soon" = within one `everyN` of the threshold on the stage silence. Added on my own, for the log: `seen` in the log line and `floor` (shown as "raised to medium").
- Known risk: the judge reads the carrier's snapshot at the next request; if the sensor has not written it yet the name counts and the result is `came`. And a sensor that leaves a speaking character out of `present` makes the cast think they are away.
- `test/type-scale.test.ts` fails on `origin/main` itself (603 literals, baseline 599). Not from this work; fix it or lift the baseline in its own small change.

- Browser harness notes for the next run: use `getByRole("button", { name: /World DM/ })` for the chat sheet (the label becomes "World DM: last run failed" when the mock cannot answer JSON); `setAppTheme(page, app, "Daylight")` works only from Home (the chat view has no settings button); for a second light shot reinstall is not needed: copy the changed `src` file into `$DATA/apps/roleplay/src`, click Rebuild in the shell and wait about 60 s. Write the carrier reply's Dashboard snapshot by hand between the two turns (the mock sensor returns no scene).

## Left out of step 2 on purpose (later steps or small follow-ups)

- The tidy-up that writes `dormant` (step 3: things named fewer than 3 times in 10 replies and belonging to nobody are archived by code every 10 replies; see DESIGN "Things: the tidy-up rule").
- A "silent N" hint on the record card (the bench list in the card shows it).
- "Far away: message or call only": the note says it in words, nothing checks the Dashboard's contact (#415).
- The cast deck, the book rework (kinds as labels, tiles, sheet, search, bulk actions), step 0 of the DM's memory (store what was deleted), the DM tab (#425).

## Owner preferences seen in this thread

- No HTML mocks ("html мок не треба"): describe the UI plan in text, then build; the real screen is checked in the browser.
- For anything under test the owner wants a visible switch and log: who came, why the DM picked them, how the dice fell. Keep that for the cast deck and the tidy-up (log every archive and every draw).
- Short design question first, then "ok", then code. Recommended defaults are usually accepted ("інше як рекомендуєш").
- They publish fast when tired of testing: "коміт, пуш та публікація одразу" means branch, PR, merge, version bump and CHANGELOG in the addon repo.

## How to work here (traps found; none is in CLAUDE.md)

- **Where the code is.** The engine repo holds notes, design and handbook; Roleplay code is the Roleplay repo (`MolfarWav/Molfar.Vertep-Roleplay`). On the laptop: a checkout beside the engine folder. Branch from `origin/main`, not from an old `claude/*` branch the checkout may sit on. Develop the next step on a new branch (for example `claude/cast-book`).
- **Line endings.** `plugins/world/plugin.js`, `plugins/engine/plugin.js` and several others are CRLF in the working tree (`core.autocrlf`). The Edit tool works. For many edits write a small Node script that reads the file, normalises `\r\n` to `\n`, replaces, and writes back with `\r\n` (keep scripts outside the repo). Do NOT use `sed -i` (it silently turned a file into LF once) and do not trust `grep -c $'\r'` in Git Bash (use `file` or Node). Python is installed on the owner's machines (Miniconda) but is not on the PATH of the Bash tool: look for it in the Miniconda folder before saying it is missing.
- **Tests.** Run only what you touched plus its neighbours; the full suite (`bun test test/`) takes over 10 minutes and the foreground limit kills it, so split it: files up to `rp-recall-bench` and files after it. Known failures: `openCard` and `Vertep Lite stays light` (flaky). `test/rp-dice-note.test.ts` and `rp-world-stage2` fail when run alone (`location is not defined`) and pass in the full run; to run one alone, import it from a file that sets `globalThis.location` first. `test/type-scale.test.ts` is a ratchet: no new `text-[11px]`, use `text-caption`. New UI strings go to `src/lib/i18n.ts` in English and Ukrainian only (other languages fall back).
- **The client reads records only through `GET /world/peek`** (`peekRoute` lists fields by hand): a new record field must be added there or a save from the form clears it (this happened).
- **Heavy runs break a running engine** on the laptop (memory note): do not run the suite and a browser check at once.
- **Browser check** (skill `browser-check`): `cast-check.mjs` in this folder is the script used for step 2; copy it into the work folder next to `pw.mjs` and `roleplay.mjs`. It seeds the app's data (`$DATA/apps/roleplay/data/`: a chat of 100 messages that never name the person, a world state with her, a registry file), reloads, plays two turns against the mock model (`turns([{ match: "...", text: "..." }])`) and reads the dice log file. Needed fixes to the harness on this machine, not yet in the skill: open with `lang: "en"` (the machine's locale is Ukrainian and the helpers look for English labels); the shell's guide overlay can cover the page (press Escape before clicking the app row, click with `force: true`, and wait up to 20 s for "Launch"); `mockLog()` returns only byte counts, not request text, so the note in the prompt is proved by the log line the hook writes, not by the mock; start from a fresh engine each run (`stop.sh`, `start.sh`, `install-roleplay.sh`).
- **Registry.** Person records get `regIds` at creation (`applyReport`), at adoption (`joinPeople`) and when a Start draft is accepted. Older records may have none; the cast copes (see above).
- **Release flow for Roleplay:** version in `manifest.json` and `APP_VERSION` in `src/lib/guide-tips.ts` (a test keeps them equal), CHANGELOG heading, a "What's new" tip when users decide with it, guide translations, PR, merge; the owner presses Update. Do not write "close #N" in a PR body (memory note).
