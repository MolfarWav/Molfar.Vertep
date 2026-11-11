# Social Profiles redesign: final UI plan (issue #369)

Approved by the owner on 2026-11-11 after four mocks. **The reference is the clickable mock `proto3.html`** (kept in the session scratchpad; the
owner has the file). Branch in the Social repo: `claude/issue-369-profiles-look`, from `main` 43fb49c (0.13.0, follows already in).
Owner's rule: nothing the original had may be dropped for the design (the second mock did that and was rejected). The reference for what exists
is the code: `src/screens/profiles/tabs/*.tsx`, `editor.tsx`, `fill-ui.tsx`, `RelationEditor.tsx`, `PeopleSection.tsx`, `picture-dialog.tsx`.

## The pattern (all eight tabs)
- **Tab strip:** every tab has an icon in its own colour (About cyan, Relationships rose, Voice violet, Statuses teal, Forum sky, Habits amber,
  Life emerald, Model orange); the active tab is tinted with an underline. Phone: icons, the active one with its name.
- **Section page (every tab except Relationships):** a menu of the tab's sections (desktop: a column on the left; phone: a strip of icons under the
  tabs, the active one with its name) and the sections stacked on the right, each under a heading: 16 px, 600, an outlined tinted icon square, one
  tone per section. A click in the menu scrolls to the section; the menu follows the scroll. The last section per tab is remembered per browser.
- **Relationships:** a people list on the left (search, "Person" and "Relative" buttons, "Map" and "Tree" buttons, one line with the steps and the
  follows count, groups by the seven real levels: collapsed for the lowest two, "Who remembers her" under it) and the editor of the chosen person on
  the right; on a phone the editor opens in a bottom sheet. Feeling is a read-only word, never a control.
- **Person picker** (dialog on desktop, bottom sheet on a phone): search, groups "Already known", "Characters", "Your personas", same-name rows told
  apart by a one-line descriptor. "Relative" mode: "Already in the family" first (tap = open, no questions), below "Add one more": known non-relatives
  with their level, characters, personas; a new relative asks for the type once (family ties only), and that type is kept. Profiles only.
- **Header and save:** unchanged in function (picture dialog, update, the menu with Fill empty / picture / update / delete, save bar); the save bar shows
  why Save is off ("No changes"). One primary button per screen: in Relationships it is the person's "Save"; "Person" is tonal.

## Sections per tab (the mock)
- About: Who she is (card note, Fill empty, nick, About, adult) / Interests / Tags / Habits she wrote.
- Voice: Voice / Length, emoji, tone / How well she knows you / Words (never writes; **signature words, new**) / Sticker packs / How she sounds.
- Statuses: Week (description, brushes, template, grid) / Time shift / Temporary.
- Forum: Rank and signature / How often / Behaviour / Favourite boards (tap to toggle, remove, add by name, tap the existing boards) / Her post.
- Habits: Habits (empty state, add) / Limits / Auto.   Life: Life (two switches) / Mood and plan / Diary.   Model: Text model / Image model.

## Not in this change (own issue)
- **Signature words with "Invent with the model"** (Voice > Words): needs a profile field, a prompt line and a plugin route; the UI step ships without it.

## States, phone, checks
Every state of the original stays (empty, loading, error, busy, fail, none, no model). Touch targets 40 px on a phone; text never below 12 px; no
hover-only control; colour is never alone (title and icon name each section; the level and feeling words stay). Strings in `strings.ts` en and uk
(`test/skeleton.test.ts`); guide page `.skills/guide/pages/` (Profiles, Settings) updated; CHANGELOG "Unreleased". Settings: the Messenger row
"Characters know you" gets `className="stack"` (comment on the issue). Check: `bun test`, typecheck, browser run of the preview (`?screen=profiles&tab=...`)
dark, light, 390 px, en and uk, then the `ux-review` walk-through compared with this plan.
