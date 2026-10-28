# Task for Molfar (paste into the agent chat on each machine)

Roleplay now stores expression sprites in the engine's asset store (issue #167): `studio.expressions` is still
`[{ "name": "joy", "url": "..." }]`, but a new sprite's `url` is `/v1/assets/<id>` (up to 1024 px, WebP) instead of
a base64 data URL inside the card. Older cards keep their data URLs until the sprites are next edited in the editor.

1. Look in my workspace for my own copies of the skill `edit-large-card` (they override the app's):
   search `skills/` and `apps/roleplay/.skills/`.
2. In each copy, replace the line
   "`/studio/expressions` holds the emotion images (base64): never print it."
   with
   "`/studio/expressions` holds the emotion images (a `/v1/assets/<id>` URL, or base64 in older cards): never print a
   base64 value. Do not write sprite images into the card by hand; the editor's Sprites tab stores them."
3. If I have no own copy, change nothing and tell me so. Show me the diff before saving.
