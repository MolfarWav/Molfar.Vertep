# Memory across chats: the chain, the archive, the Data Bank, snapshot books, and vectors

Verified at: molfar.vertep-roleplay 91eec33

## What it does

A Canvas link makes a chat continue an earlier chat of the same story. The link lives in `litopys/links.json`, and the earlier chat is archived (read-only) by default. Litopys reads the earlier chats into the new chat's backstory and finds word-for-word passages from them when a reply needs one. The engine's chain rule carries chat-scoped Data Bank files, snapshot books included, forward. Vectors only reorder passages the words already found. They are a local cache and are never synced.

## Layers

- **Chain.** One `{ from, at }` link per chat in `litopys/links.json`. Made by POST `/litopys/links`. Setting: `archiveOnContinue` (default on) also archives the earlier chat.
- **Archive.** `archived: true` in `chats/<id>.meta.json`. Plugin: engine. Refuses transcript writes with 409.
- **Backstory.** Nearest 3 chats whole, older ones condensed. Plugin: litopys. Cache: `litopys/far/<id>.json`. Settings: `linkBudget` (800), `farShare` (18 percent), `turnsShown`, the Dashboard's "start clean".
- **Word-for-word passages.** Plugin: litopys. Files: `litopys/recall/<id>.json` and `<id>.t.json`. Settings: `verbatim` (on), `verbatimBudget` (400, range 150 to 1200), board key `plugin:verbatim`.
- **Meaning tier (door B).** Setting: `verbatimMeaning` (off). Picks which chapter to search; adds no text.
- **Data Bank.** `databank/<id>.json`, searched by words. Plugin: engine. Setting: feature `databank`.
- **Snapshot books.** Data Bank files with `kind: "snapshot"`, written by litopys. No setting; the user saves one.
- **Data Bank vectors.** `.cache/databank-vectors/<fileId>.json`. Setting: `autoEmbed` (on), or a click.
- **Character memory from imports.** `characters/<id>/memory.json`. Plugin: litopys, not profile. Board key `plugin:cardmemory`; inject `maxTokens` (400).

## Owners

- `plugins/litopys/plugin.js` `linkRoute`: makes or removes a link, archives the earlier chat, builds its passage index.
- `plugins/engine/plugin.js` `chatChain`: walks links back for the Data Bank, up to `CHAIN_WALK_MAX` (40).
- `plugins/engine/plugin.js` `ARCHIVE_BLOCKED`: the routes an archived chat refuses.
- `plugins/litopys/plugin.js` `buildBackstory`: the backstory block for a chain; null under "start clean".
- `plugins/litopys/plugin.js` `farDigest`: condenses an older chat into the cached far digest.
- `plugins/litopys/plugin.js` `saveChatFile`: deletes the far digest on every save of a chat's record.
- `plugins/litopys/plugin.js` `recallChain`: lists the earlier chats, up to 40.
- `plugins/litopys/plugin.js` `recallBuild`: cuts a chat into passages and marks the rare words.
- `plugins/litopys/plugin.js` `recallIndexChat`: writes a chat's passage index.
- `plugins/litopys/plugin.js` `recallCandidates`: keeps passages with two or more rare shared words that chance does not explain.
- `plugins/litopys/plugin.js` `meaningRegions`: picks chapters by vector when door B is on.
- `plugins/litopys/plugin.js` `verbatimFor`: builds the "word for word" block.
- `plugins/litopys/plugin.js` `llmRequest`: calls `verbatimFor` before a reply.
- `plugins/litopys/plugin.js` `bookChunks`: turns a chat's record into snapshot chunks, with who knew each fact.
- `plugins/litopys/plugin.js` `bookSave`: writes a snapshot book; an update disables the older version.
- `plugins/litopys/plugin.js` `importChat`: writes an imported chat's snapshot into a card's memory.
- `plugins/litopys/plugin.js` `cardMemoryFor`: builds the character-memory part of a reply.
- `plugins/engine/plugin.js` `searchDatabank`: finds passages by words, then reorders them by meaning.
- `plugins/engine/plugin.js` `chunkVisibleTo`: hides a snapshot passage from a speaker who did not witness it.
- `plugins/engine/plugin.js` `shelfVectorsFor`: reads a Data Bank file's vectors for one model.
- `plugins/engine/plugin.js` `semanticPrep`: sends the scan embedding request before a reply.
- `plugins/engine/plugin.js` `assemble`: injects the top Data Bank passages.
- `plugins/litopys/plugin.js` `vectorGaps`: lists chapters and facts without a current vector.
- `plugins/litopys/plugin.js` `kickEmbedWant`: asks for the next batch of a chat's vectors.
- `plugins/litopys/plugin.js` `kickShelfWant`: asks for the next batch of a Data Bank file's vectors.
- `plugins/litopys/plugin.js` `autoEmbedScan`: asks for missing vectors on the tick, within a token limit.

## Data

- `litopys/links.json`: `{ v, links: { <chatId>: { from, at } } }`. Links to missing chats are dropped on read.
- `litopys/far/<id>.json`: `{ v, chatId, rev, units, facts, turns }`. Dropped by `saveChatFile`.
- `litopys/recall/<id>.json`: passage index (`p`: rare stem to chunk numbers). `<id>.t.json`: passage texts with `t`, `a`, `b`, `c` (cast), `k` (chapter).
- `databank/<id>.json`: `chunks[]` with `i` and `text`. A snapshot adds `kind`, `scope: "chat"`, `scopeChatIds` (at most 24), `source`, and chunks of kind chapter, arc or fact with `cast` or `knownBy` (DATA-FORMATS, "Snapshot books").
- `.cache/litopys/vectors/<chatId>.json`: `{ id: { hash, vector, m? } }`, split into `.pN.json` past about 2 MB.
- `.cache/databank-vectors/<fileId>.json`: `{ v: 1, m, dim, chunks: { "<i>": [numbers] } }`, one model per file.
- `characters/<id>/memory.json`: sources that are snapshots taken at import; the chat is never read again (DATA-FORMATS, "The card's long memory").

## When a model or an embeddings call happens

- No model call builds the backstory or passages. They come from stored records and word lists.
- A reply in a chat with vectors sends an embedding request under `scan`, with kinds `query` for the scan text and `document` for stored texts (`semanticPrep`).
- Chapter and fact vectors are requested under `lit_emb_<chatId>` (`kickEmbedWant`). Data Bank vectors under `lit_db_<fileId>` (`kickShelfWant`).
- Requests start on a click or from the tick (`autoEmbedScan`, when `autoEmbed` is on). One look asks for at most 300,000 tokens. Nothing starts before one embedding call has worked.
- Door B adds the scene's vector to the passage search. The passage search makes no embedding call of its own.

## Flow

1. A chat is archived and a new one continues the story. The user links the new chat to the old (`linkRoute`). The old chat's meta gets `archived: true` unless `archiveOnContinue` is off, and its passage index is built at once. The next reply runs `buildBackstory`, which reads the nearest 3 chats whole and condenses older ones through `farDigest`.
2. A reply in a late chat pulls a passage from an early chat. `llmRequest` calls `verbatimFor` when `verbatim` is on and the chat has a link. `recallChain` lists the earlier chats, and `recallCandidates` keeps chunks with at least two rare shared stems. `witnessed` drops a chunk whose cast did not see the scene. Up to 2 excerpts fit in `verbatimBudget`, under a sentence saying that facts and later events win.
3. A document is added to the Data Bank. The engine writes `databank/<id>.json` through the `/databank` branch of `handleRoute`. Each reply, `assemble` calls `searchDatabank` with the chat's chain. It keeps chunks scoring 2.0 or more and returns the top 3. If vectors exist, passages whose meaning is close to the scene gain up to 2.5 times their score. A passage the words did not find is never added.

## If you change X, also touch Y

- The chain rule: `chatChain` in the engine and `recallChain` or `buildBackstory` in litopys. They are two copies.
- `verbatimBudget` limits: the reserve row "litopys verbatim" in `hookInsertTable` (engine) uses the same clamp.
- The vector file shape: Litopys `SHELF_*` names, engine `shelfVectorsFor`, and the split code on both sides.
- Editing a Data Bank file's text: use the `PATCH` branch of `/databank/:id`, which drops the stale vector (`dropShelfVector`).
- A snapshot book's shape: `bookChunks`, `chunkVisibleTo`, and DATA-FORMATS.
- Who knows what: `bookKnowers` must expand group tokens as the groups do.
- The archive rule: `ARCHIVE_BLOCKED` and `linkRoute` together.

## Traps

- DATA-FORMATS says a chat-scoped file reaches "up to 3 links back". The code walks up to 40 (`CHAIN_WALK_MAX`, `RECALL_CHAIN_MAX`), and COUPLINGS says 40. Treat the DATA-FORMATS line as stale.
- The CONTINUES sentence repeats in every near part, about 130 tokens each. At the default `linkBudget` of 800, a chain of four or more chats leaves the oldest near chat no room (COUPLINGS).
- A snapshot book matches names by spelling. "Sin" does not match "Sina Rose", and a nickname does not match at all (COUPLINGS).
- The profile plugin has no memory code. Character memory from imports is `importChat` in litopys.
- Making a link archives the earlier chat without asking, unless `archiveOnContinue` is off.
- Vectors of another model are ignored, and a file of another model is replaced as a whole.

## Tests that guard it

- `test/rp-verbatim.test.ts`, `test/rp-verbatim-bench.test.ts`, `test/rp-recall-bench.test.ts`
- `test/rp-chat-links.test.ts`, `test/rp-archive.test.ts`, `test/rp-litopys-far-turns.test.ts`
- `test/rp-snapshot-books.test.ts`, `test/rp-book-index.test.ts`
- `test/rp-shelf-vectors.test.ts`, `test/rp-embeddings-visible.test.ts`, `test/rp-memory-m5-vectors.test.ts`, `test/rp-auto-embed.test.ts`
- `test/rp-card-memory.test.ts`

## Not verified

- The archive list in the chat list and its filter. Only the `archived` flag and `ARCHIVE_BLOCKED` were read.
- The body of the `POST /databank` upload. Only its branch was seen.
- The turning-point prompt and parse. Only `turnsFor` was read.
- `verbatimRows`, `recordLitFired` and the trace view.
- The prompt wording of Data Bank passages in `assemble`.
- The contents of the tests. Only file names were checked.
- Whether `saveChatFile` does anything besides removing the far digest. Only that line was read.
