# Social: profiles, the import from Roleplay, the user's own page, the picture worker, stickers
Verified at: molfar.vertep-social 748197a

## What it does
Each character is one file, `profiles/<id>.json`. A profile is made by hand, from an idea, or by a one-time digest of a Roleplay card. The user's personas live in `you.json`. Plugins file pictures as pending and the open Social page draws them. Sticker packs name engine assets; the free catalog comes from GitHub.

## Owners
- `plugins/profiles/plugin.js` `cleanProfile`: validates and cuts every profile field.
- `plugins/profiles/plugin.js` `handleRoute`: the route table.
- `plugins/profiles/plugin.js` `scheduleFor`: builds a profile's week from its text and id.
- `plugins/profiles/plugin.js` `buildMaterial`: the only part of a card that reaches the digest model.
- `plugins/profiles/plugin.js` `importRoute`, `digestPass`: one card to one profile.
- `plugins/profiles/plugin.js` `refreshRoute`, `checkRoute`: "Update from Roleplay" and "Update all".
- `plugins/profiles/plugin.js` `avatarRoute`: finds the picture to bring along.
- `plugins/profiles/plugin.js` `youRoute`, `cleanPersona`: the user's personas.
- `plugins/profiles/plugin.js` `resetParts`: what "Start over" clears.
- `plugins/profiles/plugin.js` `suggestRoute`, `fillRoute`: idea drafts and "Fill empty".
- `src/screens/profiles/import-api.ts` `ImportRunner`: runs imports one card at a time.
- `src/screens/profiles/fill.ts` `applyProposals`: fills empty fields only.
- `src/screens/you/api.ts` `importPersona`: brings one Roleplay persona into You.
- `src/lib/roleplay-avatar.ts` `avatarFor`: stores a found picture as a Social asset.
- `src/pictures/worker.ts` `useImageWorker`: draws pending pictures while the page is open.
- `plugins/messenger/plugin.js` `imageRoute`: files a drawn picture, or its failure, into the chat.
- `plugins/stickers/plugin.js` `cleanPacks`, `cleanCatalog`: keep the pack list and the safe catalog packs.
- `src/stickers/catalog.ts` `addCatalogPack`: downloads and uploads one catalog pack.

## The profile file
Written by `PUT /profiles/<id>` (id: letters, digits, `_`, `-`, 60 at most). Each field is cut by `cleanProfile`:
- `id`, `name` (80), `nick` (80, defaults to the name), `hue` (0 to 359).
- `source`: "roleplay" or "own". Only for roleplay: `card`, `cardDate`, `cardHash`, `from` (`{kind, id, key?}`).
- `about` (4000), `interests` (12 of 40), `tags` (8 of 24).
- `habits` (30: `id`, `text` of 200, `by` "you" or "self", `date?`); `habitsAuto` (default true).
- `voice`: `text` (1500), `length` 0 to 2, `emoji` 0 to 2, `formality` 0 to 100, `never` (12 of 60), `words` (12 of 40).
- `forum`: `rank` (60), `signature` (200), `frequency` 0 to 100 (default 35), `opensOwn`, `repliesYou`, `repliesOthers`, `favourites` (20).
- `life`: `on`, `world` (both default true).
- `model`, `imageModel`: "provider/model"; "" or "default" means the app's choice.
- `picture`: a `/v1/assets/<id>` address or "".
- `knows`: "knows", "name" or "stranger"; saved only when set.
- `adult`: true only when marked; `stickerPacks`: pack ids (40 at most), saved only when not empty.
- `schedule`: 8 bands of 3 hours by 7 days, each "online", "away", "dnd", "na" or "off".
- `createdAt`, `updatedAt`: stamped by the plugin on save.

## Making a profile
- By hand: the new-profile screen makes the id `own-<timestamp>`; the editor saves it.
- By fill: an idea goes to `POST /profiles/suggest`, which returns three drafts and up to two questions; nothing is filed until a draft is picked. "Fill empty" posts the profile to `POST /profiles/fill`. The proposals fill only empty fields, after a review, and reach the draft until Save.
- By import:
  1. The user allows Roleplay on Home. `GET /profiles/roleplay` lists `characters/*/card.json` (500 cards and 7 seconds at most). Group and assistant cards are hidden; a narrator with two or more Souls gives one row per Soul.
  2. `ImportRunner` runs the picked rows one card at a time; a failed card stops only itself.
  3. `importOne` posts `POST /profiles/import` with `kind`, `id`, `key?`, `model?`.
  4. If the id (`rp-<card id>`) is already saved, that profile is returned and the card is not read.
  5. Otherwise `digestPass` reads the card, builds the material, hashes it, and asks the import model.
  6. `cleanDigest` and `profileFromDigest` save the profile with default week, voice and forum settings.
  7. `avatarFor` finds and stores a picture; a miss keeps the letter avatar.

## The link to Roleplay
- Grant: root `manifest.json` `reads` names `characters/*/card.json`, `personas/*.json` and `litopys/portraits.json`, with the consent text. Only the profiles plugin has the `peer` permission.
- When: on import, on "Update from Roleplay", and in "Update all". `checkRoute` only hashes the text; changed cards go to `POST /profiles/refresh`, which saves nothing.
- Read (`buildMaterial`): description (5000 characters), personality (2500), scenario (1200), first message (600); for a narrator member, only its `###` part and the shared text before it (1200). Also a Soul line (pronouns, class toward the user, traits, leanings, cues, coping) and structured profile lines the text does not repeat (1800 at most). Identity `age` of 18 or more sets `adult`.
- Never read: example dialogue, system prompt, other card fields. The avatar never reaches a model.
- `cardHash` hashes the material text (FNV-1a, 32 bit, and length), not the card file.

## The user's own page and personas
- `you.json` holds `{active, personas: [{id, name, hue, about, picture, from?}]}`: 12 personas at most, About of 1500 characters. Personas have no chat, schedule or forum posts.
- Screen: `src/screens/you/index.tsx`.
- Import: `POST /you/import {id}` reads `personas/<id>.json`; the import model writes a short third-person About, or it stays empty when there is no description. The id is `pe-<persona id>`.
- Characters see only the active persona's name and About (600 characters at most). Deleting the active persona passes it to the first left; `forgetPersona` removes its chats and `life/people` entries.
- Deleting a profile (`DELETE /profiles/<id>`) removes its profile file, diary, people file, chats, recall cache and club places. No picture asset is deleted.
- Start over (`POST /settings/reset`): profiles also clear chats and diaries; sticker packs stay.

## The picture worker
1. A character asks for a picture with `[[image: ...]]`, or an `image` field on a forum topic, only when Settings > Pictures is on and the daily cap (`perDay`, 2 by default) is not used.
2. The plugin files the message with `image: {state: "pending", prompt}`. It never draws.
3. `useImageWorker` (mounted in `src/shell/app-shell.tsx`) polls every 20 seconds and at once when a pending picture shows.
4. Each run lists pending items (messenger, forum, stories). A browser-wide lock holds each picture for 5 minutes.
5. The model is the profile's `imageModel`, else `settings.models.image`, else the engine default (`imageModelFor`). `generatePicture` calls `POST /v1/images`.
6. The engine returns `/v1/assets/<id>`; the page posts it to `POST /messenger/image`, and `imageRoute` writes it into `chats/<id>.json`. A failure is filed as failed and not retried.
7. `MsgPicture` shows a waiting placeholder, a short "lost" note, or the picture.
8. With Social closed no worker runs; pending pictures wait for the next open page.

The model never sees a picture; prompts carry `[a picture: ...]` text (DECISIONS.md).

## Stickers and the catalog
- `stickers/packs.json` is read and written whole by `GET` and `PUT /stickers/packs` (40 packs, 200 items each). Items without a `/v1/assets/` address are dropped. A sticker is a whole message (`[[sticker: pack/item]]`); an emoji is `:pack/item:` in text.
- By hand: `src/stickers/Manager.tsx` uploads PNG, JPEG, WebP or GIF files (512 KB at most) and saves with `savePacks`.
- From the catalog: `src/stickers/CatalogView.tsx` lists `GET /stickers/catalog`, which fetches `catalog/index.json` from `raw.githubusercontent.com` (`network` permission) when the list opens. `addCatalogPack` uploads each file and saves the pack with its credit.
- Licences: CC0-1.0, CC-BY-4.0, MIT only.
- Built in: `missingMolfar` adds the bundled "molfar" and "molfar-emoji" packs, with no network.
- An added catalog pack cannot be added again; no update path was found.

## If you change X, also touch Y
- A profile field: `cleanProfile`, `MockProfile` (`src/mock/profiles.ts`), the editor, `test/profiles-plugin.test.ts`.
- Card material (`buildMaterial`, `soulLine`, `partFor`, `DIGEST_SYSTEM`): every imported profile reads "changed" once in "Update all".
- `importId`: imported profiles get new ids and the old ones are orphaned.
- `scheduleFor`: the client copy in `src/mock/schedule.ts` must agree.
- Licences: `LICENSES`, `catalog/README.md`, `test/stickers-catalog.test.ts`.

## Traps
- DECISIONS.md says a card is cut to about 12000 characters. No such cap exists: the parts total about 11100, plus the Soul line. `MAX_TEXT_CHARS` (12000) belongs to the "From a file" path.
- In `cleanProfile` the comment about `knows` sits above the sticker lines; the `knows` line has none.
- The persona section comment says "without a model"; `youRoute` does call the model.
- `importRoute` never re-reads a saved card; only "Update from Roleplay" refreshes it.
- `adult` comes from the card's age only at import; the age line can still reach the digest model.
- `cleanPacks` keeps packs with no items, `cleanCatalog` drops them; `isAdded` compares ids only.
- `catalog/README.md` says every Social update downloads the folder; the plugin fetches from GitHub on open.

## Tests that guard it
- `test/profiles-import.test.ts`, `test/profiles-plugin.test.ts`, `test/profile-schedule.test.ts`.
- `test/import-api.test.ts`, `test/roleplay-avatar.test.ts`, `test/you-plugin.test.ts`, `test/you-model.test.ts`.
- `test/reset.test.ts`, `test/pictures.test.ts`, `test/persist.test.ts`.
- `test/stickers-catalog.test.ts`, `test/stickers-molfar.test.ts`.

## Not verified
- How the engine stores the bytes of `POST /v1/images`, and asset cleanup (outside this repo).
- Whether a real model returns the expected JSON; DECISIONS.md says it was not tried.
- The full review rules of "Update from Roleplay" (`makeDiff`, `update-all.tsx`), the Start over dialog, and whether a catalog pack can be refreshed.
- Whether deleting a profile removes its drawn pictures from the asset store.
- I did not run the tests.
