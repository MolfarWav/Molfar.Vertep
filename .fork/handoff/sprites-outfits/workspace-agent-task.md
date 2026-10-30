# Task for Molfar (paste into the agent chat on each machine)

Roleplay now lets a sprite belong to a character and an outfit (GitHub issues #169 and #170). In a card,
`studio.expressions` is `[{ "name": "joy", "url": "...", "character": "Aria", "outfit": "dress" }]`: `character`
names one of the card's `studio.voices` (a Narrator card that plays several people; absent = the card itself or
sprites shared by all), `outfit` is a set of clothes (absent = "default"). The same `name` can now appear many times,
once per character and outfit. `studio.outfit` is the outfit worn by default. A chat keeps its own choice in its meta
(`spriteOutfits`), not in the card. In a CHARX the sprites are `emotion` assets named `joy`, `dress__joy` or
`Aria__dress__joy`.

1. Look in my workspace for my own copies of the skill `edit-large-card` (they override the app's): search `skills/`
   and `apps/roleplay/.skills/`.
2. In each copy, replace the line that starts with "`/studio/expressions` holds the emotion images" (the whole bullet)
   with:
   "`/studio/expressions` holds the emotion images, `[{ name, url, character?, outfit? }]` (`url` is a
   `/v1/assets/<id>` URL, or base64 in older cards): never print a base64 value. `character` names one of the card's
   `/studio/voices` (absent: the card itself or sprites shared by all), `outfit` a set of clothes (absent: `default`);
   the same `name` repeats across characters and outfits, so a sprite is told apart by (character, outfit, name),
   never by `name` alone. `/studio/outfit` is the outfit worn by default. A chat's own choice lives in its meta
   (`spriteOutfits`), not in the card. Do not write sprite images into the card by hand; the editor's Sprites tab
   stores them."
3. In my copy of the Roleplay docs (`apps/roleplay/docs/DATA-FORMATS.md`), if it has its own edits, change the row
   "`expressions`, `defaultExpression`" to also name `outfit` and the new fields `character` and `outfit` of a sprite,
   and add that a chat's choice is `spriteOutfits` in `chats/<id>.meta.json` (`{ "<voice name>": "<outfit>" }`, key `""`
   for the card itself). If I have no own copy of the file, change nothing: the app's update brings it.
4. If I have no own copy of the skill, change nothing and tell me so. Show me the diff before saving.
