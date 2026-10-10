# Character card editor and the user's Persona: 0.9.8

## Start here (new session, 2026-10-11)
- Engine: a worktree `claude/v098-card` from main (v0.9.7 and the closing notes). Roleplay: `.claude/worktrees/rp-memory`
  (a clone of the fork), a branch from the fork main `fa15553` (4.32.0). Engine code is only needed if export
  or images need it (see "emotion images as files" below).
- Order: 5 (data loss) first, alone, with a test; then the questions at the end of "Structured card" below
  (AskUserQuestion) before building 6, 7, 8 and 4; the user already gave Lorebary's fields (screenshots,
  catalog below); what the Persona card holds, the
  questionnaire's 3-6 questions and what it fills in, which export variants matter most (3). Then 1 and 2
  (small, any time).
- A card or persona format change updates, in the same change, the Roleplay fork's `docs/DATA-FORMATS.md`,
  Molfar's `edit-large-card` skill (`.fork/app-skills/roleplay/edit-large-card/SKILL.md`) and a task for the
  built-in agent for the workspace copies (CLAUDE.md).
- Tools from 0.9.7 that help: the prompt inspector shows what each card field costs in a real request;
  `.fork/bench/` times a send in the plugin sandbox (a card's size matters on phones).


## Structured card, modeled on Lorebary (user, 2026-10-11): DRAFT, decisions open
The user's screenshots of Lorebary's character editor (Elias Thorne) are the reference. Today an imported
card's text lands in `description` / `personality`, which is fine for imports. The card gains structured
fields, and a button, like the Soul tab's proposal, fills them from the free text and cleans the free text
of what moved. Not every Lorebary field is needed: take the most used first.

### What Lorebary has (from the screenshots)
Left rail: Name & Card, Identity, Appearance (+ Expressions), Personality (Spectrum, Traits, Behaviors,
Goals, Sexuality, Bio), Background (Origin, History, Trauma, Record, Circles, Summary), Relationships,
Scenario, Example Chats, Opening Message, Finished Prompt, Attached Content; a **Free write** switch
("write everything as one free text"); a token count per section; a helper ("Bary") and per-field
suggest (lightbulb) / randomize (shuffle) buttons; a "card ID" preview (name, alias, gender, age, born).
- **Identity**: chat name, title, first name, family name, middle names (list), birth name, nicknames
  (list, "by whom"), age, birthday, zodiac, voice, a private comment ("nobody else ever sees this").
- **Appearance** (a chip bar picks which parts to show; each part = a picker + free text): face, eyes
  (shape + color), hair (texture, length, color), teeth, body (build + height), breasts, genitals, skin
  (tone), marks & scars, wounds, attire, voice, scent, other.
- **Personality / Spectrum**: 8 sliders: introvert-extrovert, cautious-reckless, stoic-emotional,
  lawful-chaotic, suspicious-trusting, pessimist-optimist, practical-analytical, laid-back-intense,
  each rendered as words ("somewhat introvert", "balanced").
- **Personality / Traits** (short chip lists with limits): strengths, flaws, traits, values, fears, wishes,
  secrets, pet peeves, guilty pleasures, core beliefs, triggers, coping.
- **Personality / Behaviors** (text): quirks, motivations, speech, habits, social, under stress, body
  language, hobbies.
- **Personality / Goals** (text): life goals, short-term, career, growth, relationships, unfinished.
- **Personality / Sexuality** ("only for adult characters"): orientation, romantic, relationship,
  libido, position, experience (selects); kinks, turn-ons, turn-offs (chips); boundaries; notes.
- **Background / Origin**: birthplace, nationality, ethnicity, culture, social class, current location,
  living conditions, neighborhood. **Trauma** (optional switch): experiences, triggers, coping.
  **Circles**: affiliations, political views, religious beliefs, social circle. **Summary**: backstory
  (free text, up to 3000 chars). History and Record: not in the screenshots.

### Proposed first set (0.9.8), the rest later
- Identity: full name parts (first, family, title, nicknames), age, gender + pronouns, a private comment.
- Appearance: free text per part (face, eyes, hair, body with height, skin, marks & scars, attire, voice,
  scent, other); NO pickers or color swatches yet (they are UI weight, text carries the meaning).
- Personality: the spectrum sliders; traits lists (strengths, flaws, traits, values, fears, wishes,
  secrets); behaviors (speech, quirks, habits, under stress, body language); goals (life, short-term).
- Background: origin (birthplace, current location, social class, culture), circles (affiliations,
  social circle), summary (backstory).
- Relationships: a list `{ name, relation, notes }`.
- Sexuality: an optional block, hidden until switched on per card (adult content stays opt-in).
- Later: pickers and swatches, zodiac/birthday, trauma block, record/history, per-field suggest buttons,
  a "card ID" preview, Attached Content.

### Data format (draft)
`card.json` → `extensions.molfar_profile` (like `molfar_soul`: travels inside V2 exports, other clients
keep unknown extensions):
```json
{ "v": 1,
  "identity":   { "first": "", "family": "", "title": "", "nicknames": [], "age": "", "gender": "", "pronouns": "he", "comment": "" },
  "appearance": { "face": "", "eyes": "", "hair": "", "body": "", "height": "", "skin": "", "marks": "", "attire": "", "voice": "", "scent": "", "other": "" },
  "spectrum":   { "introvert_extrovert": 35, "cautious_reckless": 45, "stoic_emotional": 30, "lawful_chaotic": 55, "suspicious_trusting": 30, "pessimist_optimist": 45, "practical_analytical": 80, "laidback_intense": 35 },
  "lists":      { "strengths": [], "flaws": [], "traits": [], "values": [], "fears": [], "wishes": [], "secrets": [] },
  "behaviors":  { "speech": "", "quirks": "", "habits": "", "underStress": "", "bodyLanguage": "" },
  "goals":      { "life": "", "shortTerm": "" },
  "background": { "birthplace": "", "location": "", "socialClass": "", "culture": "", "affiliations": [], "circle": "", "summary": "" },
  "relationships": [ { "name": "", "relation": "", "notes": "" } ],
  "sexuality":  { "enabled": false, "orientation": "", "experience": "", "turnOns": [], "turnOffs": [], "kinks": [], "boundaries": "" },
  "compiled":   { "at": 0, "hash": "" } }
```
Every key optional; unknown keys kept; empty fields never reach the prompt.

### How it reaches the model (recommended: compile, not assemble)
The profile is the editing form; `description` and `personality` stay the fields the prompt and every
export use. Saving the profile COMPILES them (identity + appearance + background + relationships ->
`description`; spectrum words + lists + behaviors + goals + sexuality -> `personality`), skipping empty
fields, lists joined in one line. So: old presets' `{{description}}` keeps working, exports to
SillyTavern/RisuAI carry readable text, and the prompt inspector shows the compiled parts as today.
- **Free write** (Lorebary's switch): edit `description`/`personality` directly; the profile is marked
  out of date (`compiled.hash` differs) and the editor offers "Structure again" or "Keep free text".
- Compile format: labeled lines (`Speech: ...`) by default; per card: Markdown headings or XML-like tags
  (the user's own prompts use `<lore>` blocks). One setting, not per field.
- Per-section token counts in the editor (Lorebary shows them; our estimate is `estimateTokens`).

### The "Structure it" button (like the Soul proposal)
1. Reads `description`, `personality` (and optionally `scenario`, `mes_example` for speech) and asks the
   model for the profile as JSON (the engine's `schema` structured output; small windows: one call per
   group: identity+appearance, personality, background).
2. Writes a DRAFT, never the card: `data/characters/<id>/profile-draft.json` (like `soul-drafts/`), with
   `leftover.description` / `leftover.personality`: the free text that fits no field (it stays).
3. The editor shows the draft per section with the text each field came from; accept all, per section,
   or discard. Accepting snapshots the card first (`studio.versions`, one click back), fills the profile,
   recompiles `description`/`personality` from it plus the leftovers. Nothing is lost: moved text lives
   in the fields, the rest stays as leftover.
4. Runs on demand (a button on Identity and on the import result), never by itself on import.
5. Molfar can do the same through its card skill (`edit-large-card`): the skill learns the profile.

### Links to what exists
- **Soul**: its `spectra` (6 axes) overlap the profile's spectrum (8). Proposal: the profile's spectrum
  is the source when present; the Soul tab shows it and keeps its own only for the 3 soul-only knobs
  (traits like dominance/shyness). Needs the user's yes.
- **Persona** (today: name, title, description, pronouns, avatar, lorebooks, bindings): reuses a subset
  of the same profile (identity, appearance, personality short, background short) under
  `persona.profile`, compiled into `persona.description`; the questionnaire (3-6 questions) fills it.
- **Translate** (`molfar_translation`) must learn the profile's text fields, or translate the compiled
  text only. Decide with the user.
- Card format change: DATA-FORMATS, `edit-large-card`, a built-in agent task (CLAUDE.md rule).

### Questions for the user before building
1. Compile into `description`/`personality` (recommended) or assemble the profile at prompt time?
2. The first field set above: confirm, add, cut.
3. Pickers and swatches now or later (recommended later)?
4. Sexuality block: in 0.9.8, hidden by default?
5. Spectrum shared with Soul?
6. Compile format: labeled lines, Markdown, XML tags, or a per-card choice?
7. The persona questionnaire: which questions, and what it fills.
8. Per-field suggest buttons (lightbulb) now or later?

Roleplay `src/components/views/character-editor.tsx` (header buttons, tabs Core / Dialogue / Advanced /
Soul / Lorebook / Colors / Sprites / Gallery / Regex / Voice).
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
6. A structured card modeled on Lorebary's: see "Structured card" above (draft, questions open).
7. The user's Persona gets a real card too (today it is one field): update its format and editor.
8. In the Persona tab: generate the user's persona card from a short questionnaire (3-6 questions).
