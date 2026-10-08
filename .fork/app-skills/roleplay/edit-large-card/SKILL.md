---
name: edit-large-card
description: Use when reading or changing a Roleplay character card or lorebook: fields, example dialogues, a new lorebook, linking it to a character. Triggers: "поправ картку", "зміни опис персонажа", "додай приклади діалогів", "напиши лорбук", "додай запис у лорбук", "edit card", "lorebook entry".
---

# Cards and lorebooks: the whole reference, then five calls

Every step resends the whole conversation, so do not explore: the formats are below. Do not read the
app's code, do not run git, jq or python, do not list folders you do not need. A typical card task is:
one json_get, a new lorebook (one write_file, one json_set), one json_set on the card, a short report.

## The card on disk: `apps/roleplay/data/characters/<id>/card.json`
Fields sit at the TOP level (not under /data):
- `name`, `description`, `personality`, `scenario`, `first_mes`, `mes_example` (strings),
  `alternate_greetings` (array of strings), `creator_notes`, `tags` (array), `extensions` (object).
- `avatar`: a base64 image, tens of KB. Never ask for it, never print it.
- `studio`: the app's own bag (an imported card may have none yet: json_set creates it, no need to check). `studio.linkedLorebookIds` (array of lorebook ids: the books this
  character uses), `studio.embeddedLorebookId` (null or an id), `studio.avatar` (base64 again, never),
  `studio.descVariants` / `personalityVariants` / `scenarioVariants`, `studio.versions`.
- `extensions.molfar_soul` belongs to the dashboard's Soul tab: leave it alone.
- Character id = the folder name. The other characters: one json_get per card is not needed; the
  folder list `apps/roleplay/data/characters/` is enough.

`mes_example` format: blocks that start with `<START>`, turns as `{{user}}: ...` and `{{char}}: ...`:
```
<START>
{{user}}: How long have you lived here?
{{char}}: *She shrugs.* Long enough to know which floorboards creak.
<START>
{{user}}: ...
{{char}}: ...
```

## A lorebook: `apps/roleplay/data/lorebooks/<id>.json`
The id is the file name without `.json`, and the same string in `"id"`. A new book is made in two
calls, never typed out whole: (1) write_file the book below with `"entries": []`, (2) ONE json_set
with an `append` to `/entries` per entry (a long JSON typed as text breaks: stray words, duplicate
keys and uids, `"true"` as a string; json_set values cannot). The shape, with one entry:
```json
{
  "id": "lyriel-lore",
  "name": "Lyriel — World",
  "globalActive": false,
  "linkedCharacterIds": [],
  "entries": [
    {
      "uid": 1, "title": "The Silver Grove", "memo": "",
      "keys": ["срібний гай", "срібного гаю", "срібному гаю", "silver grove"],
      "keysRegex": false, "secondaryKeys": [], "selectiveLogic": "AND_ANY",
      "status": "normal",
      "content": "Two or three sentences the model needs when the place comes up.",
      "position": "before_char", "depth": 4, "role": "system", "order": 100,
      "probability": 100, "enabled": true
    }
  ],
  "settings": { "scanDepth": 4, "contextPercent": 25, "budgetCap": 0, "minActivations": 0, "maxRecursion": 2,
    "insertionStrategy": "character_first", "caseSensitive": false, "wholeWords": true, "groupScoring": false,
    "recursiveScan": true, "includeNames": true, "overflowAlert": true }
}
```
- `status`: `"normal"` fires on a key, `"constant"` rides every message (keep those few and short),
  `"vectorized"` matches by meaning. Never write the old `constant` boolean.
- `uid`: 1, 2, 3… unique in the book. Content: short, concrete, one topic per entry.
- Keys in Ukrainian or Russian: list the inflected forms people will type (`вежа`, `вежі`, `вежу`,
  `вежею`), plus the English or Latin name if the story uses it. That is enough; load the skill
  `cyrillic-text-matching` only when a key keeps failing to fire.
- Files starting with `_` are AI-only templates: never edit them.

## Linking a book to a character
A chat uses the global books, the character's `studio.embeddedLorebookId` and every id in
`studio.linkedLorebookIds`. To link a book, append its id there (the book's own `linkedCharacterIds`
only feeds a counter in the list; leave it):
`json_set { path: card, edits: [{ pointer: "/studio/linkedLorebookIds", op: "append", value: "lyriel-lore" }] }`

## The calls
1. `json_get { path: card, pointers: ["/name", "/description", "/personality", "/scenario", "/mes_example", "/tags", "/studio/linkedLorebookIds", "/studio/embeddedLorebookId"] }`
   One call. If a linked book exists and the task changes it, json_get its `/entries` in the same reply.
2. Write the new texts in your head, in the card's language.
3. A new book: `write_file` the JSON above with `"entries": []`, then ONE json_set:
   `edits: [{ pointer: "/entries", op: "append", value: { "uid": 1, ... } }, { ..."uid": 2... }]`.
   `enabled` is `true`, not `"true"`; uids 1, 2, 3… in order. A change to an existing book: json_set
   on its file (`/entries/3/content` to change one entry). write_file refuses broken JSON, so a
   refusal means fix the text, not patch the file afterwards.
4. ONE json_set on the card with every field change and the link append. It commits on its own and
   open chats pick it up within a second. Do not check with git afterwards; json_set reports what changed.
