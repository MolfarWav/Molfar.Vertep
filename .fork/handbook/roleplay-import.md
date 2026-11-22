# Import: character cards, chats, lorebooks, and a whole library from another app
Verified at: molfar.vertep-roleplay 586f601 plus the zip-sprites change; the memory import lines (#495) at molfar.vertep-roleplay a3a2d043 (main, Roleplay 4.153.1)

## What it does
- A character card (PNG, charx or JSON) is read in the browser and posted in batches of 25 to the studio-import plugin, which writes `characters/<id>/card.json` with any embedded lorebook, regex scripts and pictures.
- A whole library, a zip of another app's data folder or of a backup, goes to `/import/zip`. It writes characters, lorebooks, presets, regex, personas, groups, chats and databank files in a fixed order, then returns a summary.
- Chats can be imported into a persona's or a saved world's memory through the Litopys routes. A card keeps no stories since #492: no import route, no UI, no prompt part. Nothing new is created as a chat.
- Each import is a job on a progress card with counts, Cancel between units, and failed files with reasons.
- Imports never overwrite. A new item that clashes gets a numeric suffix.

## Owners
- `src/lib/card-import.ts` `importCardFiles`: browser entry for card files; batches posts.
- `src/lib/card-import.ts` `cardFileKind`: sniffs downloaded link bytes to choose a route.
- `src/lib/card-import.ts` `storeEmotions`: sends sprite pictures to the engine asset store.
- `src/lib/import-shapes.ts` `extractCharaFromPng`: browser PNG reader, re-exported by `src/lib/interop.ts`.
- `plugins/studio-import/plugin.js` `cardFromPngBase64`: plugin PNG reader for cards inside a zip.
- `plugins/studio-import/plugin.js` `normalizeCard`: maps card fields to the app's shape.
- `plugins/studio-import/plugin.js` `writeCardWithBook`: writes the card, its lorebook, regex scripts and pictures.
- `plugins/studio-import/plugin.js` `handleRoute`: all import routes, the zip phase order and the summary.
- `plugins/studio-import/plugin.js` `writeChat`: writes a chat transcript and its meta.
- `plugins/litopys/plugin.js` `previewImport` and `importChat`: a chat's candidates for a persona's or a world's memory, and the write (a card gives 404).
- `src/lib/backup-assets.ts` `importBackupFile`: the browser side of Backup zip: puts the zip's pictures back, takes the sprite folders out, cuts the zip into parts and posts them one by one.
- `src/lib/backup-assets.ts` `splitLibrary`: drops media the plugin does not read, orders cards, then the rest, then chats (with sidecars), and packs parts of `PART_BUDGET` (18 MB).
- `src/lib/backup-assets.ts` `extractSprites`: `characters/<Name>/<emotion>.<img>` into the asset store; the plugin gets `body.sprites`.
- `src/lib/import-progress.ts` `beginImport`: job store, units, steps and cancel.
- `src/components/shell/import-progress-card.tsx` `ImportProgressCard`: the card on screen.

## A character card
Browser side (`importCardFiles`):
- Files are routed by extension. Anything that is not `.png` or `.charx` is parsed as JSON, so a JPEG or extensionless file fails with "could not parse".
- PNG: `extractCharaFromPng` reads only `tEXt` chunks and prefers `ccv3` over `chara`. The avatar is downscaled to 512 px.
- charx: `zipStartOf` finds the zip even behind a JPEG cover. `charxExtras` takes the icon named main as the portrait, and the emotion pictures. The browser then sends a card.json-only zip, with those pictures beside it.
- JSON: parsed as is. It has no picture unless the caller supplies one.

Plugin side (`normalizeCard`):
- V1 flat objects, V2 and V3 are read (a `data` object when present). A v3 card is written as `chara_card_v3`. A wrapper whose type starts with `marinara_` is unwrapped.
- Top-level fields: name, description, personality, scenario, first_mes, mes_example, system_prompt, post_history_instructions.
- `alternate_greetings` is kept when non-empty. `creatorcomment` becomes `creator_notes`. `tags` is kept when non-empty.
- `extensions` is kept as is. A depth prompt there becomes `studio.depthPrompt`.
- Any other non-null field is copied verbatim, so v3 extras survive.
- `character_book` goes to `lorebooks/<id>.json` through `embeddedBookToWorld`, and `card.studio.embeddedLorebookId` points at it. The field is not kept on card.json.
- `extensions.regex_scripts` become `regex/<id>.json` with scope character. They also stay inside `extensions`.
- Pictures: the avatar and `studio.expressions` come from `resolveCardAssets`, within the caps below.

Dropped or left out:
- PNG chunks other than `chara` and `ccv3`.
- Cards with no name ("card skipped").
- Emotion pictures over the caps, counted in a note.
- Lorebook outlet positions. They are not modelled and land after the character block.

## A whole library
1. `handleRoute` re-roots each zip entry at its first folder that matches `COLLECTION_DIRS`. Root files (card.json, settings.json, personas.json, library.json, meta.json) keep their names. `.charx` entries are skipped.
2. A zip with a root card.json is a charx package. It imports that one card and stops.
3. First: the preset map at `User Settings/openai_settings.json` and the files under `User Settings/regex/`. Chats resolve presets by name, so these must exist first.
4. Personas: the flat map is used only when no full persona record exists. Otherwise the persona maps in settings.json are used.
5. Other files follow a phase list: characters, worlds, lorebooks, presets, openai settings, textgen settings, extensions/regex, regex, personas, groups, chats, databank. Other paths are ignored.
6. Chats are `chats/<folder>/<file>.jsonl`. The folder is matched to a card name, else to a group. The `.meta.json` sidecar restores title, preset, persona and lorebooks by name. `.memories.json` restores the old vault list.
7. Settings: only the `ui` object of settings.json is restored, never the model. library.json is merged last.
8. The result is a summary of arrays (characters, groups, lorebooks, presets, regex, personas, themes, chats, databank) plus errors and notes. The settings screen reports "N skipped". The job card lists failed files.

Sprites and big libraries (the app bridge refuses a request body over 32 MB):
- The browser takes `characters/<Name>/<emotion>.png` out of the zip, stores each picture (`storeEmotions`) and sends `sprites: { <folder>: { <emotion>: <url> } }` beside the part whose card file carries the folder's name, else the first part. The plugin attaches them to the card of that name written by that request, else to the card whose file base name is the folder (`idByFileBase`), as `studio.expressions`; a name the card already has is kept. A folder with no card gets a note.
- A zip that is not small goes in parts of about 18 MB, in the order cards, the rest (books, presets, personas, settings: one part), chats with their `.meta.json` and `.memories.json`. The plugin's name maps (`bookIdByName` and the like) do not survive between parts: `diskIdOf` finds an earlier part's preset, persona or book by name on disk.
- A chat over about 3 MB cannot be written (`fs.write` caps a file at 4 MB) and is listed in `errors`; over 16 MB it arrives as a binary and is listed too.

Skipped silently:
- Pictures outside characters/ that are not at the root.
- Themes, backgrounds, user avatars and quick replies as separate files. The zip loop has no writer for them.
- Chat lines that are not JSON.
- A character PNG too large to read from the zip. It is reported as an error.

## Chats into a persona's or a world's memory
- POST `/litopys/memory/preview`, then POST `/litopys/memory/import`, with `{ kind: "persona"|"world", id, chatId }`, both routed by `cardMemoryPostRoute`. `kind: "card"` gives 400, and the old `/litopys/card-memory/preview` and `/import` no longer exist (#495).
- `previewImport` offers the chat's arc (cut to 1200 characters) and up to 30 active facts everybody knows that are about the owner (a persona: its subject or name; a world: subject or type `world`). A candidate another source already holds is marked `dup`, not pre-ticked. `IMPORT_TOP.facts` sets the pre-ticked count.
- `importChat` keeps only the selected fact ids. The arc is cut to 1500 characters, or is the `arcText` the dialog settled on.
- One source entry per chat goes into `memory/personas/<id>.json` or `memory/worlds/<id>.json`. Importing the same chat again replaces that entry.
- Nothing selected gives 400.

- PNG reading: two copies, `extractCharaFromPng` and `cardFromPngBase64`. They differ on iTXt.
- Picture caps: `EMOTION_BUDGET` in `src/lib/card-import.ts` and `EXPRESSIONS_BUDGET`, `MAX_EMOTION`, `MAX_AVATAR` in the plugin.
- Asset URL shape: `ASSET_URL` in the plugin must match `storeImageAsset` in `src/lib/engine.ts`.
- Folder names: `COLLECTION_DIRS`, `ROOT_FILES`, the phase list, and the `taken` paths in `uid`.
- Chat memory shape: `sources` entries written by `importChat`, read by `previewImport`.

## Traps
- The browser PNG reader ignores iTXt. Direct import of such a card fails. The plugin's iTXt handling applies only inside zips.
- File kind is by extension in `importCardFiles` but by bytes in `cardFileKind`.
- The size-limit text conflicts: the plugin says 16 MB, the browser says 200 MB for the same route.
- A library zip does not restore themes or backgrounds. The batch route does write themes.
- Re-import makes copies, not merges.
- Card regex scripts are stored twice.
- A chat without a sidecar lands on preset `default` and the settings persona.
- The chat-memory `dup` flag is a mark only; it does not block selection.
- A library zip with a sprite folder but no card of that name in the same import leaves the sprites unattached (a note says so); the pictures stay in the asset store.

## Tests that guard it
- `test/rp-card-png.test.ts`: non-ASCII text, v3 over v2, null for no card or truncated stream.
- `test/rp-card-sources.test.ts`: link routing, V3 ccv3 first, plain image or web page or non-card JSON, zip behind a JPEG cover.
- `test/rp-shared-memory.test.ts`: persona and world preview, write, duplicate marking, refused owners; `test/rp-card-memory.test.ts`: a card has no import and keeps its old story untouched.
- `test/rp-import-progress.test.ts`: progress fraction, units, cancel between units, failed files.
- `test/rp-preset-import-regex.test.ts`: imported preset regex, and the (2), (3) names.
- `test/rp-backup-assets.test.ts`: pictures in a backup.
- `test/rp-backup-assets.test.ts`: `extractSprites` and `splitLibrary`. `test/rp-studio.test.ts`: sprites attached by card name and by file name, and the note for sprites that reach the plugin.
- The tests call `/import/zip` with a mocked `host.zip`; none runs a real library through the browser (a 71 MB and a 53 MB one were run by hand on a test engine).

## Not verified
- The size cap on `/import/zip` and how `host.zip` reads entries.
- `backupFileForImport` in `src/components/views/settings-view.tsx`, and `SPRITE_MAX_PX`.
- The body of `normalizeChatLines`, the batch route's chat branch, and `resolveCardAssets` beyond the caps.
- Relinking details in `writeBook`, and `importFromLinkIn`.
- Handoff notes: `docs/COUPLINGS.md` points to `.fork/handoff/`, in the engine repo, not in this checkout. Not read. No import entry exists in `docs/COUPLINGS.md`.
