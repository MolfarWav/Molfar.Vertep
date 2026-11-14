# Import: character cards, chats, lorebooks, and a whole library from another app
Verified at: molfar.vertep-roleplay 607147f

## What it does
- A character card (PNG, charx or JSON) is read in the browser and posted in batches of 25 to the studio-import plugin, which writes `characters/<id>/card.json` with any embedded lorebook, regex scripts and pictures.
- A whole library, a zip of another app's data folder or of a backup, goes to `/import/zip`. It writes characters, lorebooks, presets, regex, personas, groups, chats and databank files in a fixed order, then returns a summary.
- Chats can be imported into a card's memory through the Litopys plugin. Nothing new is created as a chat.
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
- `plugins/litopys/plugin.js` `previewImport` and `importChat`: a chat's candidates for card memory, and the write.
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

Skipped silently:
- Pictures outside characters/ that are not at the root.
- Themes, backgrounds, user avatars and quick replies as separate files. The zip loop has no writer for them.
- Chat lines that are not JSON.
- A character PNG too large to read from the zip. It is reported as an error.

## Chats into a card's memory
- POST `/litopys/card-memory/preview`, then POST `/litopys/card-memory/import`, both routed by `cardMemoryPostRoute`.
- `previewImport` offers the chat's arc (cut to 1200 characters), up to 30 facts and 30 notes held by the card, and said lines. A candidate another source already holds is marked `dup`, not pre-ticked. `IMPORT_TOP` sets the pre-ticked counts.
- `importChat` keeps only the selected ids. The arc is cut to 1500 characters. Habits become accepted story habits.
- One source entry per chat goes into `characters/<id>/memory.json`. Importing the same chat again replaces that entry.
- Nothing selected gives 400. A habits-only import writes no source.

## Limits, duplicates, re-import
- Browser: 25 cards per request. Each file and each batch counts as one unit.
- Plugin: avatar data URL under 900 KB. Each expression data URL under 700 KB, 3 MB in total, at most 300 keys.
- Emotion pictures sit in the asset store as `/v1/assets/<64 hex>` URLs. Avatars and fallback pictures are data URLs inside card.json.
- Duplicates: `uid` appends -2, -3 while the target exists. It covers characters, lorebooks, presets, personas, regex, chats, groups, databank and themes. A re-imported card is a second card, and the first is untouched.
- Lorebooks and personas link to cards by name, so links follow names, not old ids.

## If you change X, also touch Y
- Card fields (`normalizeCard`): also `writeCardWithBook`, the export side `buildCardPng` in `src/lib/png-card.ts`, and the "Card and lorebook formats" entry in `docs/COUPLINGS.md`.
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

## Tests that guard it
- `test/rp-card-png.test.ts`: non-ASCII text, v3 over v2, null for no card or truncated stream.
- `test/rp-card-sources.test.ts`: link routing, V3 ccv3 first, plain image or web page or non-card JSON, zip behind a JPEG cover.
- `test/rp-card-memory.test.ts`: chat preview, second import refreshes, duplicate marking.
- `test/rp-import-progress.test.ts`: progress fraction, units, cancel between units, failed files.
- `test/rp-preset-import-regex.test.ts`: imported preset regex, and the (2), (3) names.
- `test/rp-backup-assets.test.ts`: pictures in a backup.
- No test in `test/` calls `/import/zip` for the library import.

## Not verified
- The size cap on `/import/zip` and how `host.zip` reads entries.
- `backupFileForImport` in `src/components/views/settings-view.tsx`, and `SPRITE_MAX_PX`.
- The body of `normalizeChatLines`, the batch route's chat branch, and `resolveCardAssets` beyond the caps.
- Relinking details in `writeBook`, and `importFromLinkIn`.
- Handoff notes: `docs/COUPLINGS.md` points to `.fork/handoff/`, in the engine repo, not in this checkout. Not read. No import entry exists in `docs/COUPLINGS.md`.
