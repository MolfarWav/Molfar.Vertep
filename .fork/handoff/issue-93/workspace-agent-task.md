# Task for Molfar (paste into the agent chat on each machine)

Roleplay now colours a Narrator card's speakers (issue #93). A card lists them in `studio.voices`
(`[{ "name": "Aria", "color": "#e06c75" }]`, an empty colour takes the app's palette). The app's
`edit-large-card` skill has a new section for it, and `DATA-FORMATS.md` a new row in the `studio` table.

1. Look in my workspace for my own copies of the skill `edit-large-card` (they override the app's):
   search `skills/` and `apps/roleplay/.skills/`.
2. In each copy, add this section before "Pictures: avatar, background, gallery":

   ## Voices: one Narrator card, several speakers
   A card that plays several characters (`extensions.molfar_card_type` = `narrator`) lists them in
   `/studio/voices`: `[{ "name": "Aria", "color": "#e06c75" }]`. In a chat each voice's quoted speech gets its
   colour; the speaker is the name that leads a paragraph before a colon (`**Aria:** "..."`) or the first name
   in the line, outside quotes. An empty `color` takes the app's palette by position. Set the whole list in ONE
   `json_set` (`{ pointer: "/studio/voices", op: "set", value: [...] }`); it is a display aid, not text for the
   model.

3. If I have no own copy, change nothing and tell me so. Show me the diff before saving.
