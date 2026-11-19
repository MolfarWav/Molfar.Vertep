# #373: the shared catalog of standard things (names, places, organizations, items): design of intake and sources

Status: a proposal for the owner's word (2026-11-19). No code. It answers the two questions the owner left open on 2026-11-11
(how entries get in, and where an app pulls from) and keeps his other decisions: a folder in the Store repo, short descriptions,
variety as the second purpose, check before creating, identity by id, no binding to a named world.

## What past work gives us (sweep, 2026-11-19)
- **The stickers catalog (#348, Social 0.6.0 and 0.7.0)** is the template: `catalog/index.json` plus a folder per pack in a GitHub repo,
  read from `main` through `raw.githubusercontent.com`, ids and file names checked before a URL is built, a licence key per pack
  (CC0, CC-BY, MIT), only the owner adds packs. Its weakness for this job: the *app* holds the network permission, so every app that
  wants the catalog would need its own.
- **The Store list** (`MolfarWav/Molfar.Vertep-Store`, `apps.json`, `OFFICIAL_SOURCES` in `src/apps/store.ts`): the engine reads it,
  extra sources are the user's own choice, "official" is MolfarWav only. The same trust model fits the catalog.
- **Consumers already waiting:** the World DM (Roleplay) builds worlds with records and NPCs now; Social's City step C6 (place packs)
  was parked until this catalog exists (Social DECISIONS, City); the RPG app (#123) later.
- **Related and closed:** nothing else covers it (`gh issue list --state all --search catalog`).

## 1. The entry
One JSON object, plain data, no mechanics (the RPG app keeps stats; the catalog is identity and tags, answering the issue's last question):

```
{ "id": "ash-gate",                // stable inside its pack, [a-z0-9-]{1,40}
  "kind": "place",                 // name | place | organization | item
  "name": "Ash Gate",              // what the model would write
  "desc": "A burnt-out city gate where smugglers meet.",   // one or two sentences, at most 200 characters
  "aliases": { "uk": ["Попелясті ворота"], "ru": [] },      // optional, for look-up by name in other languages
  "tags": ["dark_fantasy", "medieval"],                    // from the fixed vocabulary
  "culture": "slavic", "gender": "f"                       // only for kind "name"
}
```
- Full id = `<author>/<pack>:<id>` (the pack is the namespace; the issue's "id plus nick").
- **A fixed tag vocabulary** in `catalog/tags.json` (versioned): genres (`fantasy`, `dark_fantasy`, `science_fiction`, `modern`, `cyberpunk`,
  `post_apocalyptic`, `historical`, `horror`, `steampunk`, ...; several per entry), kinds, cultures or languages for names, gender for
  person names. No world names anywhere: a tag says "fantasy", never "World of Ash".
- Size limits like the stickers: a pack file at most 200 KB and 500 entries; at most 8 tags per entry.

## 2. Where it lives and how an app reads it
- **Repo:** `catalog/` in `MolfarWav/Molfar.Vertep-Store`: `index.json` (packs: id, name, author, licence, description, kinds, tag counts,
  entry count, content hash), `tags.json`, `packs/<author>/<pack>.json`.
- **The engine reads it once**, not each app (the owner's consequence from 2026-11-11, and the stickers weakness above): fetch, cache in the
  engine's `.cache` (derived data, left out of sync and backups), refresh on a timer and on demand; apps get read-only routes
  (`GET /v1/catalog/search?kind=&tags=&q=&limit=`, `GET /v1/catalog/lookup?name=`), no network permission in any app. This is the one engine
  change and it is small: a fetcher that only builds URLs under `catalog/` of known sources, a schema check, the cache, two read routes.
- **Sources:** the official one (MolfarWav, built in) plus extra repos the user adds (Settings, same dialog idea as the Store's extra
  sources); an extra source is shown as unofficial and is never read for anything but `catalog/index.json` and the pack files it names.
- **Look-up (check before creating):** exact normalised name, then aliases, then (later, optional) the local embeddings that exist since
  1.17. A hit returns the id; the app reuses it instead of creating a duplicate.

## 3. What the user "holds" and how updates work
- Reading the live catalog needs no local copy. What the user *holds* is small: entries they took on purpose (a pack, a tag selection or a
  single entry) and entries a chat or world already points to (`cat: "<author>/<pack>:<id>"`, the one optional pointer on a registry item).
  The record lives in the user's workspace (`catalog/held.json`: source, pack, id, content hash of the entry when taken, the user's
  local edit if any).
- **Pulling a newer pack version touches only held entries, matched by id** (the owner's rule): unchanged locally and changed upstream is
  updated; edited locally and changed upstream asks (the app updates' three-way idea); removed upstream is marked retired, never deleted;
  new entries in the pack are only announced ("12 new in this pack, take some?"), never added by themselves.

## 4. Intake: how an entry gets in (the open question 1)
Principle: nobody writes to the repo from the app (no token, no server). The app produces a clean pack file; a person submits it; a robot
checks it; the owner merges a clean diff in one click.

1. **Donate from the app** (Roleplay lorebook entries, the World DM's records and NPCs, a chat's registry, or a hand-made list): the user ticks
   entries, picks a kind, a licence (CC0 or CC-BY with their nick) and a pack name.
2. **World-free pass, in the app, before anything leaves** (the owner's rule 2):
   - a model pass on the user's own model rewrites each description without the world's name, unique events and other proper names, and
     suggests tags from the vocabulary;
   - a deterministic guard: the capitalised words of the source book (entry titles, keys, character names) that are not the entry's own
     name must not appear in the description; a hit is shown red and has to be edited or the entry dropped;
   - the donor sees before and after for every entry and edits; nothing is sent without that review.
3. **Duplicate check in the app** against the catalog by id, name and alias (and embeddings later); a hit is shown with "already there:
   <id>" and the entry is dropped from the pack.
4. **Hand-over:** the app writes `<nick>.<pack>.json` and offers two ways: *Open a prefilled GitHub pull request* (needs the donor's own
   GitHub account; the app only opens a link with the file's text, as the issue's "prefilled issue or PR"), or *Save the file* and send
   it to the owner (Discord). No token, no secret, nothing stored.
5. **Robot (GitHub Action in the Store repo):** schema, tag vocabulary, size limits, no URLs, no markup, ids unique, duplicates by
   normalised name within kind and tag across all packs, licence present and allowed, `author` equals the PR's author or is
   marked as handed over by the owner. It posts a report on the PR. The owner reads one clean diff and merges.
6. **What stays manual:** adult content, copyrighted names (the rule: names from published works are not accepted) and quality: the
   owner's merge is the review. Auto-merge for trusted donors is possible later and is not designed now.

## 5. Order of work (each step ships on its own)
1. **Repo and schema:** `catalog/` in the Store repo, `tags.json`, the schema, the Action, and a seed pack by the owner (a few hundred
   names per culture and a few dozen places and organizations per genre; written with a model, CC0, no names from published works).
2. **Engine read route** (this repo): fetcher, cache, search and look-up routes, handbook page, tests; an engine release.
3. **First consumer: the World DM** offers a few unused names from the matching tags as suggestions in its prompt (cheap, fine for small
   free models) and checks look-up before creating an NPC or a place.
4. **Donation flow in Roleplay** (the world-free pass, the review screen, the hand-over); UI judged by the `ux-review` skill with a
   written UI plan first.
5. **Later:** the `cat:` pointer on registry items and the RPG kinds table (#123), Social City packs (C6), extra sources in Settings.

## 6. Questions for the owner (answers change the work)
1. **Seed content:** who writes the first packs and from what? Proposal: the owner with a strong model, CC0, checked by the robot for
   duplicates; no scraping of any site or book.
2. **Adult content:** names, places and items rarely need it. Proposal: not accepted into the official packs (a flag exists for
   extra sources only).
3. **Donor needs a GitHub account?** Proposal: no; "Save the file" and send it is always there, the prefilled PR is a shortcut.
4. **Language of entries:** English `name` and `desc`, other languages only as `aliases`? Names of persons are the exception: a Ukrainian or
   Slavic name pool is worth having as its own culture tag, with the native spelling as `name`.
5. **A user's own tags:** none in the official vocabulary; a donor asks for a new tag in the PR (the owner adds it to `tags.json`).
6. **Start at step 1 or step 2?** Step 2 is useless without content; step 1 is useless without a reader, but the seed pack can be
   written and checked by hand while the reader is built.
