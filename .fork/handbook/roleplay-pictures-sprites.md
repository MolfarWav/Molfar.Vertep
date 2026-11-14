# Pictures in Roleplay: portraits, sprites and outfits, backgrounds, scene pictures, voice
Verified at: molfar.vertep-roleplay 607147f

## What it does
- A card has one portrait (its avatar) and an optional set of sprites: small pictures per emotion, sorted by outfit and, for a Narrator card, by voice.
- The chat shows the sprite that fits the last reply. Keyword rules in the app pick it. No model is called.
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
- `src/lib/sprite-pick.ts` `pickSprite`: the sprite a reply shows.
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

## Backgrounds
- A chat has a `backgroundId`. "none" hides the picture. When unset, the app's active background is used.
- Backgrounds are image items with tags, kept in folders. A chat's `autoBackground` names a folder, with an on switch and an optional draw flag.
- When auto background is on, `applySceneBackground` runs after each Dashboard update. It asks the world for the picture bound to the current place (`sceneBackgroundId`). Without one, the sensor's pick is used.
- With drawing allowed, a new place can be drawn (`autoDrawBlock`). A chat waits 60 seconds between draws, and a failed place waits 15 minutes (`DRAW_COOLDOWN_MS`, `DRAW_RETRY_MS`).

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
test/rp-expressions.test.ts, test/rp-sprite-sets.test.ts, test/rp-portrait-prompt.test.ts, test/rp-dash-portraits.test.tsx, test/rp-autobg-draw.test.ts, test/rp-world-backgrounds.test.ts, test/rp-image-style.test.ts, test/rp-image-error.test.ts, test/rp-message-image.test.ts, test/rp-dialogue-voices.test.ts, test/rp-tools.test.ts. (File names only; I did not open them.)

## Not verified
- How a generate_image call becomes a drawn picture after the reply. I saw only the comment in `handleTool`.
- Where the engine stores the drawn file. `src/lib/image-gen.ts` says the engine keeps it in its asset store; I did not trace this in the engine repo.
- Whether a picture attached to a chat message reaches the chat model. Attachments are stored on the message, but I found no code that sends them with the chat request.
- What sets `vision.active` in `structure-draft.tsx`, and how the engine catalog's images flag gates the UI.
- How the outfit field in `plugins/agents/plugin.js` relates to sprite outfits.
- Whether auto-play in the speech settings speaks new replies.
- `docs/COUPLINGS.md` has no sprite, portrait, background or image entry.
