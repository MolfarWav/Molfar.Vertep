# Character card editor: what is left after 0.9.8

The card in fields, the persona's form, the header labels, the export icon and the PNG/CHARX/JSON export
shipped in 0.9.8 (Roleplay 4.33.0). The full plan with the decisions is in git history
(`git log -- .fork/handoff/card-editor/PLAN.md`). Open, each on the user's word:

- The card's additional fields (Advanced and the rest): go through them with the user (which stay, which
  hide, what each does). Ask before designing.
- Lorebary extras: pickers and colour swatches, per-field suggest buttons, a "card ID" preview, Attached
  Content, record/history.
- A card or persona format change updates, in the same change, the Roleplay fork's `docs/DATA-FORMATS.md`,
  Molfar's `edit-large-card` skill (`.fork/app-skills/roleplay/edit-large-card/SKILL.md`) and a task for the
  built-in agent for the workspace copies (CLAUDE.md).

## From 0.9.3: Later, on the user's word (deferred 2026-10-10: the downscaled size is good enough for now): emotion images as files, full size
Plugins cannot write binary files and the app serves only its dist/, so expressions live as data URLs
inside card.json (4 MB sandbox write cap) and must be downscaled. Plan: engine `fs.writeBytes` for
plugins (images only by magic bytes, inside the app data dir, size cap), an engine route that serves
those images to the app like the image proxy, Roleplay stores expressions as files
(`characters/<id>/expressions/*.webp`) with a reference in card.json, old inline ones keep working, PNG/charx
export embeds them back. A card format change: update `edit-large-card` and DATA-FORMATS with it.
