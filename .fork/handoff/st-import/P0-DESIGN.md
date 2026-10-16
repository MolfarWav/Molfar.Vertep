# P0: Roleplay starts from a character index (GitHub #46)

Decided with the user 2026-10-16: P0 first, as its own release. Findings and numbers: `FINDINGS.md`.

## Problem
`GET /bootstrap` returns every `card.json` whole in one plugin call (64 MB heap, 10 s): ~700 characters of
~87 KB and the app does not start. The browser also keeps every full card in memory.

## Shape
### Engine (1.1.2)
- `host.fs.stat(rel)` for plugins with `fs`: `{ size, mtimeMs, dir }`, or `null` when missing. Same path
  jail as `read` (lexical + realpath); never follows a link out.
- `apps/<app>/data/.cache/`: local-only app data. Not in git (user `.gitignore` + `gitBoundaryIgnored`), not in a
  profile backup or Drive sync (`skippedInWorkspace`), not in an app backup. For derived files an app can rebuild.

### Roleplay (plugin `engine`)
- Index file `.cache/characters-index.json`: `{ v: 1, entries: { <id>: { size, mtimeMs, summary } } }`.
  Never the source of truth: on every read each `characters/<id>/card.json` is `stat`ed and an entry whose size or
  mtime differs, or that is missing, is rebuilt from the card. Cards that vanished drop out. So edits by Molfar,
  a sync pull, a git undo or a hand edit all show up without any writer having to update the index.
- Rebuilding is time-boxed (~4 s per call): the route answers with what it has and `indexPending: n`; the client
  calls `GET /characters/summaries` until nothing is pending. Without `fs.stat` (older engine) every card is
  re-read each time, still one at a time (memory-safe), with the same time box.
- Summary = everything light on `Character`: id, name, tags, favorite, folderId, createdAt, lastChatAt, creator,
  version, colors, stats, embeddedLorebookId, linkedLorebookIds, characterRegexIds, defaultExpression, voice
  fields, plus `blurb` (first 300 characters of the description), `tokens` (the plugin's estimate of description
  + personality + scenario + first message + examples) and `avatar`: the portrait when it is a URL or a data URL
  under 16 KB, else omitted with `avatarLazy: true`.
- `/bootstrap` returns `characters` as summaries, each with `stub: true`.
- `POST /characters/avatars { ids }` returns `{ avatars: { id: dataUrl } }`, stopping at ~6 MB; the client fetches
  lazy portraits in the background after start and fills them in.
- `GET /characters/:id` (exists) returns the full card. `PUT /characters/:id` refuses a body with `_stub`
  (409): a summary must never be written over a card. `GET /characters` (full list) stays for compatibility,
  nothing in the app calls it.

### Roleplay (client)
- `Character.stub?: true` marks a summary. `loadCharacter(id)` (single-flight per id) fetches the full card and
  replaces the stub.
- Full cards are loaded for: the active chat's character and a group's members, the character open in the
  editor / profile / dashboard soul tab / group editor, and before duplicate, export, convert to persona, translate.
  A hook `useFullCharacter(id)` gives components a loading state.
- `updateCharacter` on a stub loads the card first, then applies the patch (chained per id, order kept).
  `characterToCard` of a stub carries `_stub`, so even a missed path is refused by the plugin.
- Characters page: search over name, tags and `blurb`; token sort and badge from `tokens`.

## Not in P0
Moving portraits into the asset store (export and sync questions), the importer (P1), chat segments.
No card or lorebook format change: DATA-FORMATS gets the `.cache` note only.
