# Engine: the shared catalog reader (#373)
Verified at: molfar.vertep branch claude/social-memory-m4-catalog-373 (step 2 of the catalog); the data side is the Store repository's `catalog/` (branch claude/catalog-373, step 1)

## What it does
- The engine reads a shared base of names, places, organizations and items (with tags) from the Store repository and serves it to the shell and to apps through read-only routes. An app needs no network permission of its own.
- The catalog lives next to the Store list: `catalogBase` turns `.../apps.json` into `.../catalog/`; with the Store off (`apps.store: false`) or a feed that is not an `apps.json`, the catalog is off.
- Nothing here writes to the repository and nothing is held per user yet (the user's "held" entries and the update rules of the design are step 3 or later).

## Owners
- `src/catalog.ts` `createCatalogReader`: fetches `index.json`, `tags.json` and each pack, keeps them an hour (a failed try is retried after a minute), serves the last good copy.
- `src/catalog.ts` `parseIndex`, `parsePack`, `parseTags`: clean what was fetched; a bad row or entry is skipped, never fatal.
- `src/catalog.ts` `searchEntries`, `lookupEntries`, `norm`: filters, paging, shuffle; look-up by name, alias or shared words.
- `src/catalog.ts` `catalogBase`: where the catalog is for a Store URL.
- `src/server/app.ts` `buildApp`: the routes `GET /v1/catalog`, `/v1/catalog/search`, `/v1/catalog/lookup`, `/v1/catalog/entry`, and `catalogOf` (one reader per base URL).
- `src/server/app.ts` `appBridgeAllows` and `client/public/app-bridge-host.js` `allowedRequest`: both list GET `/v1/catalog` and `/v1/catalog/*` for apps.

- Consumers: Roleplay's World DM (the `names-pool` module of its client) searches with `kind`, `part`, `gender`, `culture` (a list), `anyTags`, `random=1`, `limit` and reads `items[].name`, and `/v1/catalog` for the vocabulary and counts (#373, step 3).

## Data
- Remote, in the Store repo: `catalog/index.json` (packs with `file`, `hash`, licence, counts; written by the repo's script), `catalog/tags.json` (the vocabulary), `catalog/packs/<author>/<pack>.json`. An entry: `id`, `kind` (name, place, organization, item), `name`, `desc`, `aliases` {lang: [names]}, `tags` (genres), and for a name `culture`, `part` (given, family), `gender` (f, m, n). Its reference is `<author>/<pack>:<id>`.
- Local cache: `<data dir>/catalog/index.json` ({at, index, tags}) and `catalog/packs/<author>__<pack>.json` ({hash, pack}); derived data, so it is safe to delete.

## When a model is called
Never. Look-up is by words; embeddings are a possible later step.

## Flow
1. A route calls `reader.get()`. Inside the hour the memo answers; otherwise one fetch runs at a time (`inflight`).
2. The first run loads the disk copy as the starting point, so an offline start still has data.
3. `index.json` is fetched (at most 256 KB) and cleaned by `parseIndex`: a row counts only when `file` has the exact shape `packs/<author>/<pack>.json`, its `id` equals that path, the hash is 16 hex characters and the licence is CC0-1.0 or CC-BY-4.0. At most 200 packs.
4. For each row whose hash differs from the cached one the pack file is fetched (at most 400 KB); its SHA-256 prefix must equal the index hash and its `id` the path, else it is skipped and named in `error`. A pack no longer in the index is dropped.
5. `GET /v1/catalog/search` takes `kind`, `tags` (comma list, all must match), `culture` (one or a comma list), `part`, `gender`, `pack`, `anyTags` (at least one of a comma list; `tags` needs all), `q` (words in name, alias or description), `random=1`, `limit` (1 to 100, default 20), `offset`. Every entry in an answer carries `author` and `license` of its pack, so a CC-BY credit can be shown.
6. `GET /v1/catalog/lookup?name=&kind=` answers up to 10 `{match: "name" | "alias" | "words", entry}`: the exact name (letters only, any case), an alias, then entries that share all their words with the asked name (one contained in the other, at least two words).
7. `GET /v1/catalog/entry?ref=author/pack:id` answers one entry or 404; a ref of another shape is 400.

## If you change X, also touch Y
- The pack format in the Store repo (`scripts/catalog-lib.ts`): `parsePack` here and the test fixtures in `test/catalog.test.ts`.
- A new `/v1/catalog` route that apps may call: both allowlists and the path list in `test/security.test.ts` ("the engine and bridge copies of the allowlist agree").
- A new source (an extra repository): `catalogOf` builds one reader per base URL; extra sources must stay unofficial and read only `catalog/`.

## Traps
- Entry text is untrusted: `plain` strips control characters and angle brackets and caps the length, but an app that renders it as HTML must still escape it.
- The reader fetches the whole catalog (every pack) on the first call; the seed is about 400 KB. A much larger catalog needs lazy pack loading.
- The cache is keyed by pack hash, not by a clock: a pack changed without an index rewrite is never refetched. The Store's workflow rewrites the index on every push to `main`.
- `catalogBase` needs an `https://` Store URL ending in `/apps.json`; a custom feed with another file name has no catalog.

## Tests that guard it
- `test/catalog.test.ts`: parsing and skipping, search, look-up, the reader (hash check, cache, offline, a changed or removed pack, a path outside `packs/`), the routes.
- `test/security.test.ts`: the two allowlist copies agree on the catalog paths; an app may GET and not POST or PUT them.

## Not verified
- A run against the real GitHub URL (the reader was run against the files of the Store clone through a fake fetcher: 11 packs, 2118 entries, 51 ms).
- A pack served with CRLF line endings (the Store's `.gitattributes` keeps catalog files LF, so the hash matches).
- Plugins (server-side) cannot reach the catalog yet: only the shell and app frames can, through the routes.
