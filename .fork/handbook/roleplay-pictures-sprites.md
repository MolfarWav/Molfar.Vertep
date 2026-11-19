# Pictures in Roleplay: portraits, sprites and outfits, backgrounds, scene pictures, voice
Verified at: molfar.vertep-roleplay 9ca09bf (branch claude/sprites-phone-464, Roleplay 4.139.1: the phone lines and the prose-narrator emotion); Backgrounds at 89fedb8

## What it does
- A card has one portrait (its avatar) and an optional set of sprites: small pictures per emotion, sorted by outfit and, for a Narrator card, by voice.
- The chat shows the sprite that fits the last reply. Keyword rules in the app pick it. No model is called. A chat can have up to 8 sprite windows, each with one character (#456).
- Backgrounds are a library per world. A chat shows one behind its messages, set by hand or switched by scene.
- Pictures can be drawn during play. The chat model writes the description, the engine draws it, and the result is posted as a hidden picture message.

## Owners
- `src/lib/portraits.ts` `usePortraitMap`: the name-to-portrait map every cast list uses.
- `src/lib/portrait-draw.ts` `needsPortrait`: decides which cards still lack a portrait.
- `src/lib/portrait-draw.ts` `drawCardPortrait`: describes one card, then draws it.
- `src/components/portraits/portrait-dialogs.tsx` `CardPortraitDialog`: the single-card portrait dialog.
- `src/components/portraits/image-model-select.tsx` `ImageModelSelect`: the "Draw with" picker.
- `src/lib/expressions.ts` `STANDARD_EXPRESSIONS`: the emotion list the editor and batch dialog offer.
- `src/lib/expressions.ts` `parseSpriteFile`: reads emotion, voice and copy number from a file name.
- `src/lib/expressions.ts` `resolveSprite`: picks a sprite from matched labels, within one outfit.
- `src/lib/sprite-pick.ts` `pickSprite`: the sprite a reply shows. `pickSpriteFor`: the sprite of one known speaker, which `pickSprite` and the windows end in.
- `src/lib/sprite-stage.ts`: the pure parts of the sprite windows: `stageMembers` (who can be shown), `contributions` (a member's last line; `linesOf` reads a voice's labelled lines, else the sentences that name them), `speakerOf`, `sceneKeys`, `assignSlots`, `resolveWindows`, `arrange`, `fitIn` (a box moved the least that puts it inside an area), `loadLayout` / `saveLayout`, `outfitsFor`.
- `src/components/chat/expression-panel.tsx` `ExpressionPanel`, `SpriteWindow`, `StageMenu`, `CastStrip`, `useComposer`: the floating windows, their gear menu, a phone's row of chips, and the phone's reading of the message box.
- `src/lib/sprite-batch.ts` `planBatch`: what a batch of dropped files adds or replaces.
- `src/components/character/sprites-panel.tsx` `SpritesPanel`: the Sprites tab of the card editor.
- `src/components/character/sprite-batch-dialog.tsx` `SpriteBatchDialog`: the dialog for many files at once.
- `src/lib/image-gen.ts` `generateImage`: sends the prompt to the engine's image route.
- `src/lib/image-gen.ts` `postPicture`: posts a finished picture into the chat.
- `src/lib/world-backgrounds.ts` `applySceneBackground`: switches a chat's background by scene.
- `src/lib/tts.ts` `speakText`: reads a reply aloud.
- `plugins/engine/plugin.js` `IMAGE_PROMPT_MODES`: the instructions the chat model gets per picture mode.
- `plugins/tools/plugin.js` `handleTool`: runs the model's generate_image call.
- `plugins/profile/plugin.js` `portraitRoute`: describes a card for a portrait.

## Portraits
- A portrait is the card's `avatar`. A card with no avatar, or the default avatar image, needs one. A lazy card is never redrawn. Groups are skipped.
- Drawing takes two steps. The profile plugin writes one description, as tags or prose depending on the picked model (`portraitPrompt`). The image is then drawn from it (`drawPrompt`).
- Bulk drawing runs one card at a time. A failed card is listed with its reason and the run goes on.
- The caller stores the returned URL.
- Lookup for a name, last wins: persona, character cards, the chat's own cards, then the user's own portrait from Litopys.

## Sprites and outfits
- A card keeps sprites in `expressions`: name, URL, optional `character` and `outfit`. Two sprites share a slot when character, outfit and name match, ignoring case (`spriteKey`).
- A dropped image is stored at full quality with transparency. The card keeps only the URL (`storeSprite`).
- The expression list is the 30 labels in `RULES` plus "neutral". Other names are accepted.
- The batch dialog reads each file name: a trailing copy number is dropped, a voice name is matched as words, and the emotion is matched to the list or its synonyms. The user sets character and outfit per group, then picks a clash mode: replace, keep both, or skip (`planBatch`).
- Choosing a sprite for a reply (`pickSprite`), only when expression sprites are on:
  1. For a Narrator card with voices, `lastSpeaker` finds the voice that speaks last, and its sprites are used. Otherwise the card's sprites are used.
  2. Labels come from keyword rules over that voice's lines, or the whole reply if none match. Rules are English, with Ukrainian and Russian stems.
  3. The outfit is the chat's choice for that speaker, else the card's outfit, else "default", else the first (`pickOutfit`).
  4. `resolveSprite` takes the first matched label the character has. Failing that: default expression, then neutral, then the first sprite.

## Sprite windows (#456)
- A window shows one character. `stageMembers` lists who can be shown: a group's members that own sprites, a Narrator card's voices that own sprites (plus the card itself when it has shared sprites), or the one card. Keys: `m:<card id>`, `v:<voice>`, `c:<card id>`.
- A member's emotion comes from their last line (`contributions`, 40 assistant messages back): their own message, or their `Name:` lines in a narrator message; a Narrator card's voice with no labelled line in a message takes the sentences that name them (`linesOf`, only for members without an owner, ranked below any label and by where the name first stands). `memberSprite` falls back to the whole message when the lines show no emotion, as `pickSprite` does. It stays until they speak again. A settled message is read once (`lineCache`).
- A window's `who` is `speaker`, `auto` or a member key. A `speaker` window is the spotlight: the `auto` windows show the others. An `auto` window keeps its member while they are in the scene (`assignSlots`, kept in the layout's `slots`); a leaver blanks it, a newcomer takes a free one.
- The scene is the Dashboard's `present` names when they match members (`sameName`: equal, or a first word equal to the other name), else the members who spoke in the last 6 assistant messages, else everyone.
- The layout (`StageLayout`: windows with position, height, folded, transparent; `hideEmpty`; `slots`) is in `localStorage` under `rp.stage.<chat id>`, per browser. A chat with none starts from the old single window's keys (`expr-panel-pos`, `expr-panel-height`, `expr-panel-minimized`).
- `arrange` and `addWindow` place windows inside the chat column (`[data-chat-id]`), from an estimated sprite width of 0.6 of the height.
- A transparent window is `pointer-events: none` except its buttons; it is moved by its grip.
- `StageLayout.place`: `front` (windows over the chat text, as before), `behind` (each window is two boxes: the picture at `z-[5]`, under the chat log's `z-10`, and a copy at `z-30` whose picture is invisible and which carries the buttons; the grip moves it) or `reserve` (the chat log gets `margin-bottom: var(--stage-reserve)`, set by `ExpressionPanel` on `[data-chat-id]` to the tallest shown window plus 8 px, at most 60% of the chat; the windows are anchored to the strip's bottom, `anchorBottom`, and move sideways only). In `behind`, `ExpressionPanel` sets `data-stage-behind` and `--stage-scrim` (percent, `StageLayout.scrim`, default 55) on `[data-chat-id]`; `globals.css` gives `.look-stage .ls-col` a page-colour backing (`color-mix` with `--background`) of that strength, as wide as the text (`fit-content`). `StageLayout.visible` (35 to 100, default 100) is the share of each picture that shows from the top: the window is `overflow-hidden` and `h` is the visible height, the picture is drawn `h * 100 / visible` tall; `arrange` widens its width estimate by the same factor. A phone ignores `place` and `visible`. The row preset takes a smaller window height in a strip (`rowHeight` of `arrange`). `stageArea` lays windows out across the message column (`[data-chat-log]`), not the Dashboard strip beside it.
- A phone (#464) shows window 1 and a row of chips (`CastStrip`: an Auto pill, then everyone in the scene in chat order, a ring on the shown one, a pin on the pinned one). A tap pins that character; a tap on the pinned one or on Auto releases it (not saved). `useComposer` reads the top of `[data-chat-composer]` (the root of `composer.tsx`) and the top of `[data-chat-log]`, and whether a composer text field holds a draft; the window and the row return null while one does. The window stands above the box: default `right: 0.5rem; bottom: innerHeight - boxTop + 6`, height shrunk to the room (min 96), a placed window pulled inside by a layout effect (`fitIn`, transient patch), the drag clamp the same. The picture is `pointer-events-none` (a swipe scrolls the chat), the window moves by its grip, the gear sits under the grip (`max-md:` classes). Unfolding fits the window into the screen (it used to keep the chip's corner and leave it); a press moving under `TAP_SLOP` (8 px) is a tap.
- A group member's outfit choice is `spriteOutfits["@<card id>"]`; a solo card keeps `""`, a voice its name (`outfitsFor`, `memberSprite`).

## Backgrounds
- A chat has a `backgroundId`. "none" hides the picture. When unset, the app's active background is used.
- Backgrounds are image items with tags, kept in folders. A chat's `autoBackground` names a folder, with an on switch and an optional draw flag.
- When auto background is on, `applySceneBackground` runs after each Dashboard update. It asks the world for the picture bound to the current place (`sceneBackgroundId`). Without one, the sensor's pick is used.
- A name is matched by its words (#278): `placeWordKey` drops small words, time of day and weather, so "Lyra's quarters at night" is `lyra_quarters`; "mill" and "mill cellar" stay apart. The sensor plugin keeps a copy (`backdropWordKey` in `plugins/relations/plugin.js`, inside a `lexicon` block; a test keeps the two equal) and matches picture names only; the app (`findForPlace`) also matches tags and, through `sceneRecordFor`, the names of the scene's World record.
- With drawing allowed, a new place can be drawn (`autoDrawBlock`). A chat waits 60 seconds between draws, and a failed place waits 15 minutes (`DRAW_COOLDOWN_MS`, `DRAW_RETRY_MS`). A drawn picture is tagged with the place's names and bound to the scene's World record (`editWorldRecord`, `background`) when that record has the same words and no picture yet.

## Pictures drawn during play
1. A draw starts one of two ways. The model calls the Picture tool (`handleTool`), which answers "being drawn" and tells the model not to describe it. Or the user types /imagine (`parseImagineArg`), with a mode word (scene, character, portrait, me, background) or a free description.
2. For a mode word, the chat model writes the description (`IMAGE_PROMPT_MODES`, route `image-prompt`). It reads the last 12 turns and the character's text. A prose reply is cut to 1500 characters. For the tool call, the model writes the prompt itself.
3. `buildImagePrompt` adds the server's prompt prefix. `generateImage` adds the negative prompt as an "(Avoid: ...)" clause.
4. `imageTargetOf` picks the model: the one chosen for this draw, else the app's image model. The engine's `/v1/images` returns a URL.
5. `postPicture` posts a hidden message with `picture: true`, the character as speaker, and one attachment named with the prompt. The message stays out of the model's prompt. The chat shows it as an attachment gallery.
- The "Draw with" picker appears only in the portrait dialogs. Its first choice is the app's model. The pick is saved under the local key `rp.portrait.model` and does not change the app's setting.

## Voice
Text to speech has three modes: None, browser voices, or the engine's speech endpoint (`speakText`). Before reading, code blocks and asterisk actions are dropped. With `onlyQuotes` on, only quoted speech is read. `voiceFor` swaps in a character's own voice provider and voice when the card sets one. Settings live in `src/components/extensions/tts-tab.tsx`.

## If you change X, also touch Y
- Emotion list (`RULES`, `STANDARD_EXPRESSIONS`): the Cyrillic stems, `SYNONYMS` and `parseSpriteFile` in `src/lib/expressions.ts`, and the datalist in `sprite-batch-dialog.tsx`.
- Window layout or who a window shows: `src/lib/sprite-stage.ts` and `StageMenu` in `expression-panel.tsx`, the guide page `.skills/guide/pages/sprites.md` and the help article `kb.sprite-windows`.
- Sprite shape: `mergeSprites` in `src/lib/sprite-batch.ts`, `SpritesPanel`, and `keepStoredSpriteImages` in `plugins/engine/plugin.js`, which keeps stored images on save.
- Picture modes: `IMAGE_PROMPT_MODES` in `plugins/engine/plugin.js` and `IMAGE_MODES` in `src/lib/image-gen.ts`.
- Picture tool text: `handleTool` and `IMAGE_TAGS_DESCRIPTION` in `plugins/tools/plugin.js`.
- Portrait text: `portraitRoute` in `plugins/profile/plugin.js` and `portraitPrompt` in `src/lib/portrait-draw.ts`.
- Any call that sends a picture: `images: [img]` in `fillRoute` and `structureRoute` (`plugins/profile/plugin.js`), and the warning in `structure-draft.tsx`.

## Traps
- A sprite with no URL is an empty slot. `spritePool` leaves it out.
- Deleting the default sprite moves the default to the first one left. Deleting an outfit's last sprite clears the card's outfit (`sprites-panel.tsx`).
- Sprites show only when `showExpressionSprites` is true. An unset value counts as on in the expression panel, but off in the message row.
- Keyword rules match word starts, so one stray word can pick the wrong label.
- When the vision branch is off, the structure draft sends no picture and shows no warning. The warning appears only when a portrait cannot be read.
- A portrait for a group is never drawn (`missingPortraits`).
- A hidden picture is out of the model's history, but its prompt is visible in the attachment name.
- No image model gives a 503 with a plain message (`generateImage`).

## Tests that guard it
test/rp-expressions.test.ts, test/rp-sprite-sets.test.ts, test/rp-sprite-stage.test.ts, test/rp-portrait-prompt.test.ts, test/rp-dash-portraits.test.tsx, test/rp-autobg-draw.test.ts, test/rp-world-backgrounds.test.ts, test/rp-image-style.test.ts, test/rp-image-error.test.ts, test/rp-message-image.test.ts, test/rp-dialogue-voices.test.ts, test/rp-tools.test.ts. (File names only; I did not open them.)

## Not verified
- Phone behaviour (#464) was run only in headless Chromium with touch emulation at 390 px: no Android keyboard (a keyboard that resizes the page is not covered), no real device.
- Sprite windows were run in a browser only with drawn test sprites and a group seeded by hand: no real art, no real Dashboard scene, no streaming reply over several windows, no touch device.
- How a generate_image call becomes a drawn picture after the reply. I saw only the comment in `handleTool`.
- Where the engine stores the drawn file. `src/lib/image-gen.ts` says the engine keeps it in its asset store; I did not trace this in the engine repo.
- Whether a picture attached to a chat message reaches the chat model. Attachments are stored on the message, but I found no code that sends them with the chat request.
- What sets `vision.active` in `structure-draft.tsx`, and how the engine catalog's images flag gates the UI.
- How the outfit field in `plugins/agents/plugin.js` relates to sprite outfits.
- Whether auto-play in the speech settings speaks new replies.
- `docs/COUPLINGS.md` has no sprite, portrait, background or image entry.
