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
- Emotion images as full-size files with export embedding them back (`.fork/handoff/v093/PLAN.md`,
  last section; deferred by the user).
