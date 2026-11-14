# Entity registry: one id per person, thing and place in a chat

Verified at: molfar.vertep-roleplay 91eec33

## What it does

Each chat has one registry file that lists every person, thing and place the story has named. Each entity gets one id: `p1` for a person, `o1` for a thing, `l1` for a place, and `user` for the user's character. Spellings the code can tie to an entity are stored as its aliases. A merge points the old entity at its target, so old references still resolve. The Dashboard offers merge and "apart" for characters only. Design and history: docs/ENTITY-REGISTRY.md.

## Owners

- `src/lib/entity-registry.js` `resolveName`: the one lookup from a word to `{ id, step }`, `{ ambiguous: [ids] }` or null. It calls `regFind`.
- `src/lib/entity-registry.js` `regFind`: the matching steps in order (exact, transliterated key, one word, several words, one letter off).
- `src/lib/entity-registry.js` `regTranslit`: folds Cyrillic, Ukrainian and Latin spellings to one key.
- `src/lib/entity-registry.js` `regLearn`: saves a spelling found by steps 2 to 4 as an alias with src `seen`.
- `src/lib/entity-registry.js` `regMerge`: moves the source's names into the target as `merged` aliases and redirects apart and suggest pairs.
- `src/lib/entity-registry.js` `regLoad`: the chat's own file, else a copy from the `from` chat, else an empty registry.
- `src/lib/entity-registry.js` `regSave`: writes the file (path from `regPath`).
- `src/lib/entity-registry.js` `regValidate`: repairs a file on load, renames old `t#` things to `o#`, and drops malformed entities.
- `scripts/sync-registry.ts` `outOfDate`: lists the plugin copies that differ from the shared source. `generatedBlock` builds the copy.
- `plugins/relations/plugin.js` `personName`: the Dashboard sensor's name step, which calls `resolveName`.
- `plugins/relations/plugin.js` `peopleOp`: the merge and apart operations on Dashboard characters.
- `plugins/relations/plugin.js` `pickVoiceColors`: one voice colour per person id.
- `plugins/world/plugin.js` `applyReport`: writes World records. Its `canonSpace` step sets `holder` and `inside` to canonical names through `regCanon`.
- `plugins/world/plugin.js` `regCanonId`: maps a registry id to its current canonical id, for World record links.
- `plugins/litopys/plugin.js` `makeCanon`: the name canonicaliser used for facts.
- `plugins/litopys/plugin.js` `applyWorkerResult`: writes a fact's `subject` and `knownBy` as canonical names.
- `plugins/agents/plugin.js` `dashNames`: maps registry person ids to Dashboard names. Its caller reads `registry/<chatId>.json`.
- `plugins/engine/plugin.js` `xsTranslit`: a second phonetic key for lorebook matching. It is not generated from the shared source.
- `plugins/engine/plugin.js` `crossScriptKey`: the lorebook step that tries the other script for a key.

## Reads and writes

- The file is `data/registry/<chatId>.json`. In code the path is `registry/<chatId>.json` under the app data root, with characters outside `[A-Za-z0-9_-]` turned into `_`.
- Shape read by `regValidate`: `{ chatId, from, entities: [{ id, kind: person|thing|place, name, aliases: [{ text, src }], src, merged? }], apart: [[a, b]], suggest: [{ a, b, why }] }`.
- Dashboard state keeps `personIds` (name to id), `notPersons` (labels, not people), `notebook` (by name) and `clock.placeId`.
- World state keeps `regIds`: World record id (for example `n3`) to registry id.
- Voice colours live in `dashboard/voices/<chatId>.json` (`VOICE_DIR` in plugins/relations/plugin.js), keyed by person id.
- Routes: `GET /dashboard/voices` and `POST /dashboard/voices` (`voicesRoute`). `POST /dashboard/notes` (`notesRoute`) carries merge and apart into `peopleOp`.

## Who uses it

- Dashboard sensor, `plugins/relations/plugin.js` `personName`: name in, registry id out. The Dashboard's own stores stay keyed by name.
- Dashboard merge UI, `src/components/dashboard/dash-merge.tsx` `useMerge`: sends `merge-character` with Dashboard names.
- Dashboard things, `plugins/relations/plugin.js` (`regAdd`, kind `thing`, ~5393 and ~5509): by id.
- World DM, `plugins/world/plugin.js` `applyReport`: NPC records by record id through `regIds`. `holder` and `inside` by display name.
- Litopys, `plugins/litopys/plugin.js` `applyWorkerResult`: `subject` and `knownBy` by canonical name.
- Voice colours, `plugins/relations/plugin.js` `pickVoiceColors`: by person id. The client in `src/lib/chat-voices.ts` `loadChatVoices` loads them.
- Agents, `plugins/agents/plugin.js` `dashNames`: by registry id in, Dashboard name out.
- Lorebook keys, `plugins/engine/plugin.js` `keyMatch`: by text only. No registry id is involved.

Still keyed by name: the Dashboard `notebook` and `personIds` keys, World `holder` and `inside`, Litopys `subject` and `knownBy`, and lorebook keys.

## Flow

1. A reply names a person. The Dashboard sensor (`personName`) calls `resolveName` with kind `person`.
2. The first step that hits wins. A hit found by steps 2 to 4 is saved with `regLearn` as an alias, so the next lookup is exact.
3. No hit: the caller adds a new entity with `regAdd`. Two entities tying at one step give `{ ambiguous }`, and the caller creates a new entity instead of guessing.
4. The Dashboard records the name in `state.personIds`, mapping that name to the entity id.
5. The user merges two characters in the Dashboard. The UI sends `merge-character`, `POST /dashboard/notes` runs `peopleOp`, and `regMerge` sets the source's `merged` field and moves its names to the target as `merged` aliases.
6. Apart and suggest pairs that named the source now name the target. The caller then saves the file with `regSave`.

## If you change X, also touch Y

- Matching steps (`regFind`, `regTranslit`): edit `src/lib/entity-registry.js`, run `bun scripts/sync-registry.ts`, and keep `xsTranslit` in `plugins/engine/plugin.js` in step. Its comment asks for this.
- File shape or repairs (`regValidate`, `regLoad`): check the old-card repair tests in test/rp-dash-registry.test.ts.
- Thing id prefix: `regValidate`, the `t#` to `o#` rename in plugins/relations/plugin.js (near lines 1615, 2513 and 2526), and the World prompt's `ref` rule (plugins/world/plugin.js near line 2112).
- Merge rules (`regMerge`, `regApart`): the Dashboard merge UI in `src/components/dashboard/dash-merge.tsx` and the `MergeOp` type in `src/lib/dashboard.ts`.
- Anything the World DM stores as a name (`canonSpace` in `applyReport`).
- Voice colours: `voicesRoute`, `pickVoiceColors` and `src/lib/chat-voices.ts`.

## Traps

- World `holder` and `inside` are names on purpose; ids for them are planned, not built. `docs/ENTITY-REGISTRY.md` says so in "Holder, inside and place: names on purpose" (Roleplay branch `claude/handbook-findings`, 0185b00). A reader that needs the id of a thing or place uses the record's link (`state.regIds`) or the Dashboard's items. Do not assume an id in those fields.
- There are two transliteration functions: `regTranslit` (registry) and `xsTranslit` (lorebook). They must agree on the same words. A test checks behaviour, not the two functions directly.
- The sync script copies the source into relations, world and litopys only. The engine and agents plugins have no copy of `resolveName`.
- `resolveName` can return `{ ambiguous }` with no `id`. Check `r.id` before use. Callers check `r.step > 1` before `regLearn`.
- `regLoad` uses the `from` chat's file only when the chat has no file of its own. A malformed file gives an empty registry, not the copy.
- `t#` is a Dashboard thread and a thing is `o#`. Older files are renamed on load. Some test titles still say `t#`, for example test/rp-world-ids.test.ts line 41.
- A Dashboard rename does not change registry names. A stale name in `personIds` is looked up again and dropped if it no longer resolves.

## Tests that guard it

- test/rp-entity-registry.test.ts: `regTranslit`, `resolveName`, `regLearn`, and the copy check through `outOfDate`.
- test/rp-lore-cross-script.test.ts: lorebook matching agrees with `regTranslit` for the same words.
- test/rp-registry-bridges.test.ts: World DM and Litopys against the registry.
- test/rp-world-ids.test.ts: World records linked through `regIds`.
- test/rp-dash-registry.test.ts: Dashboard names, merges, repairs of older registries, and chats that continue another.
- test/rp-dash-merge-ui.test.tsx: the merge UI.
- test/rp-dash-voices.test.ts: voice colours.
- test/rp-dash-things.test.ts and test/rp-agents-plugin.test.ts: not read.

## Not verified

- `data/registry/` is not in this checkout, so no live registry file was read. The shape comes from `regValidate` and `regLoad`.
- The doc says Dashboard items carry a `ref` to the registry. A grep found no `ref` field in plugins/relations/plugin.js. The World prompt does show `"ref":"o3"`.
- Dashboard `stats`, `edges` and `events`, and World `carry`, keyed by name: not checked.
- Phase C (Forge agents and the RPG app reading ids): no RPG app code in this repo. The agents plugin uses `dashNames` only.
- Tests were not run. scripts/sensor-replay.ts was not run.
