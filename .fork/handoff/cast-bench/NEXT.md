# Cast and world book: where we stopped, and how to continue (2026-11-16)

Read in this order: `.fork/STATE.md` (section "CAST, WORLD BOOK REWORK AND THE DM'S MEMORY"), `DESIGN.md` beside this file,
this file, issues #424 and #425 in MolfarWav/Molfar.Vertep, then the handbook page `.fork/handbook/roleplay-world-dm.md`.
Reply in Ukrainian, code and repo files in English (CLAUDE.md).

## What is done

| Step of the order | State |
|---|---|
| 1. default profile | Roleplay 4.130.0 (and 4.130.1: spinner, guide translated) |
| 2. record shape, entrances, bench ("лавка й поява") | **Roleplay 4.131.0, released 2026-11-16**: PR MolfarWav/Molfar.Vertep-Roleplay#152, merge `27e146c`, branch `claude/cast-bench` (merged, can be deleted). The owner presses Update on Roleplay. No engine release. |
| 2.5. repair: the DM's short input (v7-7), mention against stage (v7-2) | **built 2026-11-16, not released**: Roleplay branch `claude/cast-stage` (local, `585526d`, `b727cb5`, `590e85a`), tests and typecheck pass, docs and the handbook page updated. Not checked in a browser, on a live model or on a real Dashboard chat. The owner has not run any of the "Open, not checked" items below (answered 2026-11-16: none). Release only on the owner's word (version, "What's new" tip, guide translations, PR). |
| 3. book rework + DM memory step 0 | not started |
| 4. cast deck | not started |
| 5. DM tab, Memory view (#425) | not started |

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

## Added by step 2.5 (what to know before step 3)

- `dmInput` takes `full` (a Set built by `fullRecordIds` in `updateRoute`); no Set = old behaviour. Step 3's "do not record (the player removed)" line (v7-8) goes next to `BRIEF_NOTE` in the same function.
- Two silences: `silencesOf` returns `{ stage, mentioned }`; `silenceOf` is `stage`. With a Dashboard snapshot on a message only `present` counts as stage; a message with no snapshot counts by the name. `lastEntrance` has `res`; `castGap` and the `floor` flag implement the half gap and the medium floor.
- Decisions taken with the owner (2026-11-16): due and the 2d6 modifier use `stage`; a mention ends the entrance for every band (no stricter second try, that stays for a total miss); people in the scene's `present` are always in full; "due soon" = within one `everyN` of the threshold on the stage silence. Added on my own, for the log: `seen` in the log line and `floor` (shown as "raised to medium").
- Known risk: the judge reads the carrier's snapshot at the next request; if the sensor has not written it yet the name counts and the result is `came`. And a sensor that leaves a speaking character out of `present` makes the cast think they are away.
- `test/type-scale.test.ts` fails on `origin/main` itself (603 literals, baseline 599). Not from this work; fix it or lift the baseline in its own small change.

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
