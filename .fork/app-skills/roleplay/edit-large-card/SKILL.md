---
name: edit-large-card
description: Use when reading or changing a character card, lorebook or other data JSON of the Roleplay app, above all a large one (over ~100 KB) or one on a single line. Triggers: "поправ картку", "зміни опис персонажа", "додай запис у лорбук", "знайди в лорбуку", "edit card", "lorebook entry".
---

# Cards and lorebooks: one field at a time, few steps

A card can pass 100 KB, a lorebook several MB. Every step resends the whole conversation, so the
cheapest edit is the one with the fewest steps and nothing big pasted into it. Use `json_get` and
`json_set`; do not measure, slice and rewrite files through bash, jq or python.

## 0. Know the layout
- `apps/roleplay/AGENTS.md` and `apps/roleplay/data/README.md` name the real paths and field shapes.
  Trust them over this skill where they differ.
- Files starting with `_` (for example `_example.json`) are AI-only templates. Copy one to create an
  entity; never edit the template itself.

## 1. Look at the shape, then the fields you need: two calls at most
```
json_get { path: "apps/roleplay/data/characters/<id>/card.json" }
json_get { path: "...card.json", pointers: ["/data/description", "/data/personality", "/data/mes_example"] }
```
- The first call shows keys with types and sizes, never the content of big fields.
- V2 cards keep their fields under `/data`. Avatars and images are base64 strings: never ask for them.
- A lorebook entry: `/data/character_book/entries/3/content` in a card; standalone lorebooks keep
  entries in an object under `/entries`, keyed by uid (`/entries/12/content`).

## 2. Change everything in one json_set
```
json_set { path: "...card.json", edits: [
  { pointer: "/data/description", value: "New text, quotes ' \" and newlines are fine." },
  { pointer: "/data/mes_example", value: "<START>\n{{user}}: ...\n{{char}}: ..." },
  { pointer: "/data/character_book/entries", op: "append", value: { "keys": ["вежа"], "content": "..." } }
] }
```
- The file keeps its format (one line or indented, `\u` escapes), so the diff shows only what changed.
- It commits on its own. Open chats pick the change up within about a second.
- A new standalone lorebook: `write_file` with the whole JSON, then link it the way README.md says.

## 3. Check
- `json_get` the changed fields once, all in one call, if the task needs proof.
- Do not run git status/diff after each edit: json_set already reports what changed and the commit.

## Lorebook keys: Ukrainian and Russian
Keys must match inflected forms (`Київ`, `Києві`, `Києва`). Load the skill `cyrillic-text-matching`:
it explains which forms the matcher catches and when aliases are needed.
