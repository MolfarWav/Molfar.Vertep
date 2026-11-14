# Developer handbook (issue #303)

For us, not for users. Read the page of the system you are about to touch instead of exploring
the code again. Each page is under 11 KB, says which commit it was verified at, and names its
anchors as `file` + `function`, so a stale page can be found by a script.

Status: four batches (27 pages and 3 collected pages), 2026-11-11 to 2026-11-13, written by crawling the three repos at the commits below and
checked by a script (every named function exists in the repo it is named for). Not yet reviewed
by the owner. In force since 2026-11-14: `CLAUDE.md` (rule and "Done means") and `.fork/RELEASE.md` (step 2a) require pages to be kept up to date.

| You are touching | Read |
| --- | --- |
| How an app calls the shell, opens another app, reads another app's files, notifies | `engine-apps-bridge.md` |
| Names, ids, aliases of persons, things, places in a chat | `roleplay-entity-registry.md` |
| World records, fronts, clocks, the events deck, World's own dice | `roleplay-world-dm.md` |
| Scenes, facts, who knows what, beliefs, What fired, word-for-word recall | `roleplay-litopys.md` |
| The sensor after a reply, relations, journal, story clock, the Dashboard insert | `roleplay-dashboard.md` |
| Social: profiles, messenger, forum, life, clubs, chatter, stories, stickers, its memory | `social-overview.md` |
| The order of parts in a reply's prompt, the `llmRequest` hook, budgets, the prompt inspector | `roleplay-prompt-assembly.md` |
| The chain of chats, the archive, backstory, the Data Bank, snapshot books, vectors | `roleplay-memory-chain.md` |
| A plugin's host API, hooks, permissions, time limits, the sandbox worker | `engine-plugin-sandbox.md` |
| Engine self-update, app install and update, the launcher, CI, the release procedure | `engine-update-release.md` |
| Letters from characters, Roleplay's inbox, the engine mailbox (two different things) | `roleplay-letters-mailbox.md` |
| Forge agents: cards, triggers, dry run, the generated block | `roleplay-forge-agents.md` |
| The built-in agent: a turn, tools, memory, context folding, small windows | `engine-agent.md` |
| Connections, model calls from plugins, parameters, local and remote embeddings | `engine-models-embeddings.md` |
| Lorebook scan and budget, regex scripts, macros | `roleplay-lorebooks-regex-macros.md` |
| Roleplay's shell, sections, chat panels, themes, shared UI pieces, languages | `roleplay-ui-shell.md` |
| Social Life: diaries, known people, relations, schedule and status, the world feed | `social-life.md` |
| Social Messenger: a reply, the system prompt, writing first, the note and fold, recall | `social-messenger.md` |
| Sync between a user's devices: what is synced, a pass, conflicts | `engine-sync.md` |
| The engine's shell client: screens, settings panels, languages, themes, app frames | `engine-shell-client.md` |
| Presets: the file, stock presets and their updates, import, how a reply reads one | `roleplay-presets.md` |
| Import: cards, chats into memory, a whole library from another app | `roleplay-import.md` |
| Portraits, sprites and outfits, backgrounds, pictures drawn in play, voice | `roleplay-pictures-sprites.md` |
| Personas, a character's Profile and Soul, the polish and tools plugins | `roleplay-personas-profile.md` |
| Social Forum: the tick, what a character knows, gossip, polls, the Moderator | `social-forum.md` |
| Social profiles, the import from Roleplay, the You page, the picture worker, stickers | `social-profiles-import.md` |
| Social clubs, chatter and stories | `social-clubs-chatter-stories.md` |
| Every trap and every "change X, touch Y" of one repo on one page | `cross-engine.md`, `cross-roleplay.md`, `cross-social.md` |

Verified at: batches 1 and 2 at engine `8310b23`, Roleplay `91eec33`, Social `7be1624`; batch 3 at
engine `5b6f37a`, Roleplay `56bf594`, Social `7587013`; batch 4 at engine `32fc4f6`, Roleplay
`607147f`, Social `748197a`. All 697 owner anchors of all pages were re-checked against the batch 4
commits with `check-handbook.mjs`: none missing. Each page names its own commit.

## Page template
Title; "Verified at"; What it does; Owners (`file` `function`, one line); Data or Reads and
writes; When a model is called; Flow; What reaches the prompt; If you change X, also touch Y;
Traps; Tests that guard it; Not verified.

## Rules
- A page states only what was read in code or docs. Anything else goes under "Not verified".
- Do not copy the existing maps; link to them: Roleplay `docs/COUPLINGS.md`,
  `docs/DATA-FORMATS.md`, `docs/ARCHITECTURE.md`, `docs/ENTITY-REGISTRY.md`, engine
  `.fork/COUPLINGS.md`, Social `docs/DECISIONS.md`.
- When a change moves or renames an anchor, update the page in the same change and its
  "Verified at" line.

## Found while writing (handed to an executor as `TASK-handbook-findings.md`, 2026-11-11)
- `docs/ENTITY-REGISTRY.md` says in one place that World `holder` and `inside` become ids and in
  another that `holder` is a display name; the code stores names. The doc needs one answer.
- `DECK_MIN` is only written into the deck prompt; `deckRoute` does not enforce it.
- `plugins/relations/plugin.js` and `test/rp-dash-journal.test.ts` cite `docs/JOURNAL-HANDOFF.md`,
  which is not in `docs/`.
- Social `README.md` calls the plugins stubs; they are working code.
- Social `docs/DECISIONS.md` names `test/security.test.ts` and `test/malicious-plugin.test.ts`;
  they are in the engine repo, not in Social.

## Found in the second batch (items 7 to 11 of the same task file)
- Engine `src/plugins/runtime.ts`: `collectInsertCeilings` skips a sibling without the "hooks"
  capability; a comment in the same file says "hooks" is never granted to an imported plugin. If
  so, `insertCeiling` never runs on an imported (not official) install. Security code: confirm
  before any change.
- Engine `CHANGELOG.md` has no `## Unreleased` heading after 1.16.1; `.fork/RELEASE.md` step 4
  expects one.
- Engine `.fork/RELEASE.md` says the launcher accepts the tag `0.1.0` without `v`; the launcher
  lists only `v*` tags. The file's examples still use the 0.x line.
- Roleplay `docs/DATA-FORMATS.md` may lag behind the code in two places (Data Bank reach along
  the chain; Forge `before` and `parallel` triggers). Reported by the crawl, not confirmed.

## Found in the third batch (`TASK-handbook-findings-2.md`, 11 items)
Seen in code: `embed()` drops blank texts and returns fewer vectors than texts; the server-side
regex helper returns only the first 20,000 characters; the lorebook budget counts a skipped entry
(likely on purpose); `docs/UI-CATALOG.md` says nothing is built while four shared pieces exist;
Social `CHECKIN_AFTER_MS` is unused; Social comments cite a test file that does not exist; Social
Profiles writes into `life/people/` on a profile delete.
Reported only: the Agents drawer is titled "Canvas"; a failed reply may stop the memory note; the
family tree lines in Social `docs/DECISIONS.md`; a default model swapped silently when offline.

## Found in the fourth batch (`TASK-handbook-findings-3.md`, 12 items)
Seen in code: the sprite switch has two different defaults (`expression-panel.tsx` treats unset as
on, `message-row.tsx` as off); deleting a Social profile cleans `chats/` and `clubs/` but not
`chatter/`.
Reported only: a new chat's `presetVars: {}` may hide the character's and the user's default
picks; `onAppUpdate` refreshes a fixed list of stock presets; a preset import inherits missing
fields from the open preset; the browser card reader and iTXt; themes and backgrounds in the
library zip import; a forum tick planning a second post while one is pending; sync and the
workspace-root `.cache/`; two doc lines in Social (the 12000 character cut, personas "without a
model").

## Facts, not faults
- Two kinds of dice, on purpose (owner, 2026-11-11): the `roll_dice` tool in
  `plugins/tools/plugin.js` (any dice, `Math.random`, started by the model) and the World DM's own
  check (2d6 plus a Dashboard number, rolled by code before the reply).
- App notices have no server side; `notify` is handled in the browser shell.
- Two mailboxes: the engine's (`src/agent/mailbox.ts`) holds only the built-in agent's memory
  and skill proposals; letters from characters use Roleplay's own inbox. Roleplay never calls the
  engine mailbox.
- Social has no notion of a character's place today; the only place is the user's weather place
  (`life/place.json`). A City tab needs a new data layer.
- The `appTools` hook is reported to feed plugin generations only, not the built-in agent's loop
  (not confirmed).
- The sync client id and secret in `src/sync/drive.ts` are a desktop client's, public by design
  (the comment there says so); the scope is the app's own files only.
- A character's Soul lives in the card (`extensions.molfar_soul`), not in the profile plugin.
- Social stories are worded by the forum's model, not the messenger's.
- Two token counts: Roleplay's prompt peek and the engine inspector estimate tokens differently,
  so their totals for one prompt differ (reported by the crawl, not confirmed).

## Coverage and upkeep
Every system named in issue #303 has a page. Not covered on purpose: the user guide, single UI
components, and the data formats (use Roleplay `docs/DATA-FORMATS.md`).
Upkeep: see `HOW-TO-UPDATE.md`. In short: run `.fork/tools/check-handbook.mjs` in two modes,
`--touched` while working and the full check before a release. The full check fails when an
owner anchor no longer exists. A page that fails is rewritten for the changed part only and gets
a new "Verified at". The three `cross-*.md` pages are rebuilt from the pages, never edited.
