# Moving a SillyTavern player to Molfar Vertep: findings (2026-10-16)

Research only, nothing built. Code read: Roleplay 4.48.0 (fork main `c9c09e5`, worktree `E:\Claude\rp-v110`),
engine main 1.1.1. Measurements: a throwaway engine (browser-check `start.sh`, no browser) with the Roleplay
plugins copied in, fed synthetic cards and a synthetic SillyTavern (ST) data folder made by a script (no real data).
The user's installed Roleplay is 4.47.0; the import code is the same there.

## Verdict in one paragraph

Today a player can bring a few dozen to a few hundred cards over. A 2,000-card library cannot come over at all,
and worse: **past about 600 characters the Roleplay app stops starting** (`/bootstrap` runs out of memory), so a
player who keeps pressing Import bricks their own app. The ST backup-zip path exists and understands the ST layout,
but caps out near 150 PNG cards, drops every portrait, imports personas as nothing, groups as empty shells, never
imports group chats, and turns most message dates into the import time. The fix is two pieces: (P0) the app must stop
loading every full card at start, (P1) a "Move from SillyTavern" importer that reads the folder in the browser and
sends it in small resumable batches. Rough size: P0 3-4 days, P1 6-8 days, all in the Roleplay fork; the engine needs
at most one small change (chat files over 4 MB).

## 1. Cards today

### Import paths
| Where | What | How it travels |
|---|---|---|
| Characters page, Home, Store drop zone, Settings > Import > Characters | PNG / JSON / charx, `multiple` file picker (no folder picker, no zip of cards) | `importCardFiles` (`src/lib/card-import.ts`): the browser parses every file, makes a 512 px JPEG avatar data URL, then sends **all cards in ONE** `POST /import/batch` |
| Settings > Data > restore, Settings > Import > backup zip | our backup or a foreign (ST) backup zip | whole zip as base64 in ONE `POST /import/zip`; the plugin unpacks with `host.zip.entries()` |
| Store / link | Chub, RisuRealm, CharaVault, Wyvern, Pygmalion, direct links | one card per call |

Plugin: `plugins/studio-import/plugin.js` (route handler from line 1335; `/import/batch` 1815, `/import/zip` 1891).

### Limits in the way (engine)
| Limit | Value | Where |
|---|---|---|
| Any request body | 128 MB (declared length) | `src/server/app.ts:290` `EVERYDAY_BODY_BYTES`; the app route's own 220 MB cap for `/import/*` (app.ts:5552) never comes into play |
| Plugin route sandbox | 10 s clock, 64 MB heap (QuickJS) | `src/plugins/sandbox-worker.mjs:126` |
| Zip routes | own sandbox, 120 s, 512 MB; zip ≤ 200 MB base64, ≤ 256 MB unpacked, ≤ 60,000 entries; text entries ≥ 2 MB arrive as binary | `runtime.ts:819`, `sandbox-worker.mjs:240-283` |
| Plugin `fs.write` | 4 MB per file, text only (no binary write) | `sandbox-worker.mjs:358` |
| Every successful app route | one git commit of the workspace | `app.ts` `dispatchAppRoute` |

### Measured (synthetic V2 cards, ~11 KB text + 75 KB avatar = ~87 KB card.json each; a third with a 20-entry book)
| Test | Result |
|---|---|
| `/import/batch` 50 cards (4.3 MB) | 200, 3.7 s |
| 200 cards (17 MB) | 200, 12.6 s |
| 400 cards (34 MB) | 200, 26.8 s |
| 700 cards (60 MB) | **500 after 26.6 s, sandbox aborted — but 477 of the 700 were already written** (not committed to git; the client shows an error, a retry duplicates them) |
| 1,500 cards (129 MB) | 413 at once ("request body too large") |
| App start (`GET /bootstrap`) with 300 / 500 / 600 characters | 200 in 3.5-5.7 s / 7.9 s / 5.3-7.7 s (response 30 / 47 / 56 MB) |
| App start with 700 / 900 / 1,127 characters | **500 "out of memory"**: the Roleplay app does not open |
| ST backup zip `/import/zip` with 30 / 60 / 100 / 140 PNG cards of 300 KB (9 / 19 / 32 / 44 MB) | 200 in 13.4 / 8.7 / 13.5 / 19.8 s |
| Same with 200 cards (62 MB) | **500 in 1 s**, sandbox aborted |
| Re-importing the same 30-card zip | 60 characters: every card again as `name-2`; no duplicate check anywhere (`uid()` only avoids overwriting) |

Why start dies: `/bootstrap` (`plugins/engine/plugin.js:3524`) returns every `card.json` whole (text, embedded
avatar data URL, expression sprites) in one sandbox call with a 64 MB heap. The ceiling is total card bytes, not a
count: with real ST cards (often 20-60 KB of text, embedded books of 100 KB+, sprites) it can be well under 600.
Even with avatars moved out, 2,000 cards of text alone are ~50 MB: the full-card bootstrap has to go regardless of
the importer.

### What breaks or is lost at scale
- **Count**: one request per pick; the 128 MB body cap is ~1,400 cards at 87 KB, the sandbox dies earlier (~500-700).
  Partial writes on failure, then duplicates on retry.
- **Zip of an ST folder**: a real ST `characters/` folder of 2,000 cards is ~1-4 GB (cards are 0.3-2 MB PNGs;
  estimate, not measured on a real library): far over every zip cap. Even within the caps the zip path stopped near 150.
- **Portraits**: the zip path never sets an avatar for a V2 PNG card (`writeCardWithBook(n, rawCard, null, "data:...")`
  passes the PNG only as `sourceAvatar`, which is read for V3 `ccdefault:` assets alone). Verified: `avatar` missing.
  The browser path keeps them, as 512 px JPEG data URLs inside card.json (the root of the start-up limit).
- **Duplicates**: none detected, in any path.
- **Embedded books** (`character_book`): imported as a separate book linked by `studio.embeddedLorebookId`. Works.
- **Alternate greetings, card tags, card regex scripts**: kept.
- **ST-only links**: `extensions.world` (the character's linked world book) and `extensions.fav` (favorite) ride along
  in `extensions` but nothing in the app reads them: the book is imported unlinked, favorites are lost (grep, and
  verified on the test zip). ST's own tags (`settings.json` `tags` + `tag_map`, the player's folders) are not read.
  Extra books per character (`world_info.charLore`) are not read.
- **Rendering**: the Characters page pages by 24, so the DOM is fine. The store still holds every full card in the
  browser (≈170 MB for 2,000 cards at today's size): heavy on a phone.
- **Model calls**: the browser path rates a card only when exactly one is imported (fine). After the zip test, two
  relationship-rating calls ran for the one character that got chats (seen in the engine log; trigger not traced).
  A mass import must not start one model call per character or chat.

## 2. Personas

- The browser path accepts `personas: [{name, description}]` in `/import/batch`, but no UI sends it.
- The zip path reads ST's `settings.json`, but looks for `st.personas` / `st.persona_descriptions` at the top level.
  ST keeps them under `power_user` (`power_user.personas`, `power_user.persona_descriptions`,
  `power_user.default_persona`). Verified: a zip with two ST personas imported **0**.
- Nothing reads `User Avatars/` (persona portraits), the default persona, a persona's linked book
  (`persona_descriptions[x].lorebook`), its description position/depth, or persona locks to characters/chats
  (`chat_metadata.persona`, `power_user.persona_locks` in newer ST: check against a real file).
- Needed: read `power_user.*`, upload each avatar from `User Avatars/<file>` (downscaled) as the persona avatar,
  map `default_persona` to `settings.personaId`, link the book by name after books are in, keep the avatar file
  name -> persona id map for chats.

## 3. Chats

Two ways in: Settings > Import > Chats and the chat manager's import (both: one request per `.jsonl`, and **both
attach every picked file to the currently active character**, ignoring `character_name` in the file), and the zip path
(`chats/<folder>/<file>.jsonl`, linked by folder name = card name). Converter: `normalizeChatLines` (plugin.js:649).
Checked on the synthetic zip:

| ST data | Today |
|---|---|
| `mes`, `name`, `is_user` | kept |
| `swipes`, `swipe_id` | kept; `swipe_info` (each swipe's own date, model, reasoning) dropped |
| `send_date` | ISO strings kept. The classic ST form `"September 26, 2024 10:10pm"` and epoch-ms strings become the **import time** (the sandbox's `Date.parse` cannot read them). ST has written both forms over the years |
| header line (`user_name`, `character_name`, `create_date`, `chat_metadata`) | dropped: no user name (always "User" or the active persona), `createdAt` = import time, author's note (`note_prompt`, depth, interval), variables, objectives lost |
| `is_system` (ST: a hidden message) | becomes a normal visible message with its sender's role |
| `extra.reasoning`, `extra.model`, `extra.api`, `gen_started/finished` | dropped (only our own `extra.chry` is read) |
| `extra.bookmark_link`, `chat_metadata.main_chat` (branches/checkpoints) | dropped: each branch comes in as an unrelated chat |
| title | "Synthetic 2 — Synthetic 2   2024 09 26@22h10m05s" (file name un-slugged) |
| chat folder of a renamed or duplicate-named card (`chats/Seraphina1/`) | not linked: an orphan chat with no character |
| `group chats/*.jsonl` | **not imported at all** (the zip path reads only `chats/`) |
| `groups/*.json` (ST shape `members: ["file.png"]`) | a group with **no members** (the code expects our `memberIds`/`_memberNames`) |
| a `.jsonl` over 2 MB inside a zip | arrives as binary and is **silently skipped** |
| a chat over 4 MB as stored | cannot be written (`fs.write` cap); long ST chats with swipes reach this |
| linking cost | each chat scans every `card.json` to match a name: O(chats x characters) reads in a 10 s sandbox |

## 4. Proposed design: "Move from SillyTavern"

### P0 (prerequisite, app): start without loading every card
- `/bootstrap` returns character **summaries** (id, name, avatar URL, tags, favorite, creator, short description,
  token estimate, updatedAt) built from a small index file (`characters/_index.json`, kept up to date on every card
  write, rebuilt when missing). The full card is fetched when it is opened, edited or used (prompt assembly already
  reads cards from disk in the plugin).
- New and imported avatars go to the engine asset store (`storeImageAsset` -> `/v1/assets/<id>`, already used by the
  gallery; card `avatar` already allows "a stored media URL" per DATA-FORMATS, so no format change). Out of git, 2 GB
  quota. Existing cards keep data URLs; an optional one-time move later.
- Check after: export/backup and Drive sync carry asset-store avatars (gallery images already depend on it).
- Size: 3-4 days, mostly client places that read full `Character` fields from the list.
  This alone also helps every player with a few hundred cards.

### P1: the importer (Roleplay app, browser-driven)
Why in the browser and not an engine route that reads a disk path: it works the same for a remote engine and on a
phone, needs no new "read any folder" surface in the engine, and keeps ST knowledge in the app where Marinara/ST
import code already lives. The engine needs no new permissions.

1. **Source**: "Choose your SillyTavern folder" (`<input webkitdirectory>`, pick `data/<user>` or the install root;
   the app finds `characters/`, `chats/`, `group chats/`, `groups/`, `worlds/`, `User Avatars/`, `settings.json`) or a
   zip of it (read in the browser with fflate's streaming `Unzip`, entry by entry, never whole). Folder picking on
   phones is unreliable (guess): the zip is the phone route.
2. **Scan and plan screen** (nothing written yet): counts per kind, size, problems found (unreadable PNGs, chats over
   the limit), duplicates against what is already in the app, choices: what to bring (characters / personas /
   chats / groups / books / ST tags as Roleplay tags / favorites), duplicate rule (skip identical, keep both, replace).
3. **Duplicate key**: card name + hash of the normalized card text (description, first_mes, personality, scenario,
   mes_example, book). Stored per card as `studio.importedFrom = { source: "sillytavern", file, hash }` (new studio
   key: DATA-FORMATS + edit-large-card skill updated in the same change).
4. **Batches**: books first, then cards (25 per `/import/batch`, avatars uploaded to the asset store before each
   batch), personas, groups, then chats grouped by character. Each batch is idempotent: the plugin skips a card whose
   `importedFrom.hash` exists, so a retry never duplicates.
5. **Progress and resume**: a job file `imports/<jobId>.json` in app data (source label, plan, done keys, ST avatar
   file -> new character id map, errors). Progress bar with counts and time left; Pause; closing the tab and coming
   back offers "Continue the import" (needs the same folder picked again: the browser cannot reopen it on its own).
   One git commit per batch is acceptable (~80 for 2,000 cards); one model call per character is not: import marks
   cards as not rated.
6. **Mapping fixes** (shared with the existing paths, so the plain zip import improves too):
   - Chats linked through the ST avatar file name (folder = avatar base name), not by display name.
   - Dates: parse ISO, epoch ms and the `MMMM D, YYYY h:mma` form in the converter itself (no `Date.parse`);
     `create_date` `2024-09-26@22h10m05s` -> `createdAt`.
   - Header: `user_name` -> chat `userName` (and persona by name when one matches); `note_prompt`/depth/interval ->
     author's note; title from the file name without the character prefix.
   - `is_system` -> `hidden: true`; `extra.reasoning` -> our reasoning field, `extra.model` -> the model stamp;
     `swipe_info[i].extra.reasoning` per swipe where our format has room (check DATA-FORMATS).
   - Branches: `chat_metadata.main_chat` -> `parentChatId` of the imported parent (by file name), bookmarks dropped
     with a note.
   - Groups: `members` (avatar files) -> member ids, `disabled_members` -> `mutedIds`, `activation_strategy`/
     `generation_mode` -> our `mode` where one exists; `group chats/<chat_id>.jsonl` imported for the group, speakers
     mapped through `original_avatar`/`force_avatar`.
   - `extensions.world` and `world_info.charLore` -> `linkedLorebookIds`; `extensions.fav` -> favorite; ST tags via
     `tag_map` -> card tags (choice on the plan screen).
   - V2 PNG portrait in the zip path: use the PNG as the avatar (downscaled in the browser path; the plugin cannot
     resize, so the zip path should also move to the browser reader).
7. **Big chats**: a chat over ~3.5 MB is split into parts ("… (part 2)", linked as a continuation) or, better, the
   engine gets an append/chunked write for app data (small engine change, decided separately).
8. **Report at the end**: what came over, what was skipped and why, downloadable as a text file; "Undo this import"
   = delete everything carrying this job's id (soft: to the trash).

### Size of the work (rough, one implementer, with tests and the UX/browser checks the rules require)
| Piece | Days |
|---|---|
| P0 slim start (index, summaries, lazy full card, asset-store avatars on import) | 3-4 |
| ST reader in the browser (folder + streaming zip, PNG/JSON cards, settings.json) + plan screen | 2 |
| Batches, duplicate key, job file, progress/resume/undo | 2 |
| Chat converter fixes (dates, header, hidden, reasoning, branches) + groups + group chats + personas | 2-3 |
| Big chats (split, or the engine append change) | 0.5-1 |
| Tests on a synthetic ST folder of 2,000 cards and 5,000 chats, browser check (desktop + 390 px), docs | 1-2 |
| **Total** | **~10-14** |

Format changes to carry in the same change: `studio.importedFrom` on cards (and on chats/books for undo), the
character index file. Each updates the fork's `docs/DATA-FORMATS.md`, the edit-large-card skill and its
`.fork/app-skills` copy, plus a workspace-agent task for the user's workspace copies.

## Decided with the user (2026-10-16)
- P0 goes first, now, as its own release (bug issue #46).
- Big chats: split invisibly inside Roleplay (a chat stored as segment files, one chat to the player), not an engine
  limit change and not visible "part 2" chats. Comes with the importer (P1), with DATA-FORMATS and the skill updated.

## Open questions for the user (asked before the decisions above)
1. P0 first as its own release (it is also a stability fix: today ~600 cards brick the app), then the importer?
2. Big chats: split into parts in the app, or raise/chunk the engine's 4 MB app-data write limit?
3. Duplicate default: skip identical cards, or always ask?
4. ST tags and folders: import as Roleplay tags, or skip in the first version?
5. Should the "600 cards bricks the app" problem get a GitHub `bug` issue now (it is "the app does not start", which the
   rules treat as urgent), with a stopgap guard in the importer (refuse past a safe total) until P0 ships?

## Reproduce
Scripts were in the session scratchpad and are gone with it; the recipe: start a throwaway engine (`browser-check`
`start.sh` without the Playwright lines), copy the fork's `manifest.json` and `plugins/` into
`$DATA/apps/roleplay/`, generate `{cards:[{card, avatar}]}` bodies and an ST-shaped zip
(`SillyTavern/data/default-user/{characters/*.png (tEXt chara), chats/<name>/*.jsonl, group chats/, groups/,
settings.json with power_user.personas, User Avatars/}`), POST them to `/v1/apps/roleplay/import/batch` and
`/import/zip`, then `GET /v1/apps/roleplay/bootstrap`.
