# Character card editor: plans for later (user, 2026-10-10)

Roleplay `src/components/views/character-editor.tsx` (header buttons, tabs Core / Dialogue / Advanced /
Soul / Lorebook / Colors / Sprites / Gallery / Regex / Voice). Not scheduled: the user picks the version.
A change to the card format updates `.fork/app-skills/roleplay/edit-large-card/SKILL.md` and
DATA-FORMATS in the same change (CLAUDE.md).

## From the user's screenshot (2026-10-10)
1. Header buttons need labels: every icon button (favourite star, translate, version history, copy
   card id, export) gets a visible label or at least a tooltip saying what it does.
2. The export button shows a download arrow pointing the wrong way for "export": use an export icon.
3. Export loses the emotions: a card with emotion sprites exports as a plain PNG. Offer several
   variants, for example:
   - PNG V2/V3 (portrait + card JSON; V3 with the emotion images as RisuAI-style assets);
   - CHARX (zip with the assets: emotions, gallery);
   - JSON only;
   each with the card's own lorebook as `character_book` (0.9.4 makes the plain export carry the book).
   Check what other clients read (SillyTavern, RisuAI) before picking the asset layout.
4. The additional fields of the card (Advanced and the rest) will be gone through with the user later:
   which stay, which hide, what each does. Ask before designing.

## Related, already planned elsewhere
- 0.9.4: the Lorebook tab lists the card's books (own book: replace, unlink, open; add others);
  exported cards carry their own book; deleting a card offers to delete its own book
  (`.fork/handoff/v094/PLAN.md`).
- Emotion images as full-size files with export embedding them back: below.

## From 0.9.3: Later, on the user's word (deferred 2026-10-10: the downscaled size is good enough for now): emotion images as files, full size
Plugins cannot write binary files and the app serves only its dist/, so expressions live as data URLs
inside card.json (4 MB sandbox write cap) and must be downscaled. Plan: engine `fs.writeBytes` for
plugins (images only by magic bytes, inside the app data dir, size cap), an engine route that serves
those images to the app like the image proxy, Roleplay stores expressions as files
(`characters/<id>/expressions/*.webp`) with a reference in card.json, old inline ones keep working, PNG/charx
export embeds them back. A card format change: update `edit-large-card` and DATA-FORMATS with it.

## Added 2026-10-10 (user): likely 0.9.8, with the persona
5. Data loss first: `updateCharacter` (Roleplay) rewrites the card's whole studio bag with defaults on
   the first edit. Fix and test it before anything else in this version.
6. A new card layout modeled on Lorebary's character card: adapt it as the prototype for ours. Ask the
   user which keys (fields) to take before designing.
7. The user's Persona gets a real card too (today it is one field): update its format and editor.
8. In the Persona tab: generate the user's persona card from a short questionnaire (3-6 questions).
