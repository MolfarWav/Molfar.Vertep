# Relationship map (Social, MolfarWav/Molfar.Vertep#366): UI plan

Status: plan only (2026-11-10), written for the `ux-review` pass before code. Nothing built. The owner picks the layout variant and the open points at the end. Code goes in Social (`D:\Claude\Molfar.Vertep-Social`, repo MolfarWav/Molfar.Vertep-Social), branch off `main` after PR 37.

## What the user is trying to do
See, in one place, who is what to whom among the characters and their personas (levels, ties, who is at odds), and jump to the profile to change it. Today this is only a per-character list inside a profile's Life tab ("People she has met"), so the whole picture is invisible.

## Where it lives and the steps
Social > **Profiles** tab > a **List | Map** switch at the top of the Profiles screen. Two steps from the start screen; the switch shows what is behind it by its own label. Profiles is where the user already goes to edit characters and their ties, so the map sits next to what it changes. A fourth main tab was rejected (the top bar and the bottom bar are full: Messenger, Forum, Profiles, More).
- Desktop: the Map replaces the list + editor pair; the switch stays in the top bar of the screen. Selecting a person opens a side panel (right, ~320 px).
- Phone: the Map fills the screen (title "Profiles", pills row: List, Map); selecting a person opens a bottom sheet.

## Components, found in the code
Reuse: `Seg` and `Chip` (`src/screens/profiles/ui.tsx`) for the switch; `Avatar` (`src/components/Avatar.tsx`) for the nodes; `Dialog`/sheet (`src/screens/profiles/dialog.tsx`) for the phone sheet; level, feeling and tie words (`levelName`, `feelBand`, `useTieWord` in `tabs/PeopleSection.tsx` and `tabs/RelationEditor.tsx`); the data types in `people-api.ts`; the preview mock pattern of `PeopleSection`.
New: `RelationMap.tsx` (an SVG ring, deterministic, no physics), `MapPanel.tsx` (the selected person), a plugin route `GET /life/graph` in `plugins/life/plugin.js`, strings en and uk, a guide paragraph in `.skills/guide/pages/profiles.md`, preview parameters `view=map` and `select=<id>`.
Why new: nothing in the app draws a graph; the people list is per character and has no cross-character view.

## Data (no model, nothing private)
`GET /life/graph` reads every `life/people/<id>.json` and returns `nodes` (characters, plus the user's personas that appear in some list) and, per ordered pair, `lvl`, the feeling band word, and `ties` (romantic ties only where `romanceFor` allows). Never `note`, `said` or chat text. The page draws one line per pair.

## The picture (variant A, ring + panel)
- Nodes on a ring, avatar with the name under it; the user's personas have a dashed ring and the word "You".
- One line per pair. The strongest fact wins the style: romantic tie = pink line with a small heart mark; rival or at odds (feeling cold or worse) = red dashed; family = blue double line; otherwise grey, thickness by the higher level of the two. Never colour alone: dash, double line and the heart carry the meaning; a one-line legend sits under the map.
- Default: all lines at medium opacity. Selecting a person lights their lines and fades the rest.
- Panel: name, kind, one line "Friend of Boris, rival of Clara"; then a row per other person: both directions in words ("Anna about Boris: close friend, crush. Boris about Anna: friend"); buttons **Open profile** (primary, tonal) and **Edit ties** (outline) that opens that profile's Life tab on the person. Editing stays in the existing editor: the map does not draw or drag links (a wrong drag on a phone would write a tie).

## Layout variants considered
- **A. Ring + side panel** (picked): fixed positions, predictable, lines readable to about 12 people, works with the focus-fade for more. Needs no layout engine.
- **B. Free cluster**: friends sit close, looks alive, but positions change on every open, labels collide above ~10, needs a force engine.
- **C. Matrix**: exact, both directions, scales to 30, phone-friendly; does not read as a map. Kept as the **List** view's job (rows per person with their strongest relations), which also serves screen readers and big communities.

## States
- Loading: skeleton ring (grey circles). Error: one sentence and Retry.
- Empty (fewer than two characters): "Add a second character to see how they relate" with the New profile button. Characters but no meetings or ties: the nodes alone and "Nobody has met yet. Characters meet on the forum; you can also set a tie in a profile's Life tab."
- Default, selected, a selected person with no lines ("No ties or meetings yet" in the panel).
- More than 12 people: names only for the selected person and their neighbours, the rest as avatars with tooltips (tap shows the name); more than 24: the List view opens by default with a note.
- Phone: nodes with at least 44 px tap areas (invisible larger circle); the ring keeps to the screen width, no sideways scroll; the sheet has its own close button.
- Keyboard and a11y: nodes are buttons ("Anna, 3 links"), arrow keys move round the ring, Enter selects, Esc deselects; the List view is the text alternative.
- The remembered choice (List or Map) is kept per viewer in browser storage.

## Not in this step
Family tree (a separate "Family" view from parent, child, spouse and sibling ties, generations as rows): next step, after the map is seen in play. Drag-to-link editing. A time slider. Gossip and jealousy markers on the map (could show "at odds" edges that gossip is about, later).

## Done check (walk-through)
390 px light and 1280 px dark, en and uk, with the preview data of five characters and a persona; selected, empty, one-person, 14-person and 30-person states; the screenshots compared with this plan line by line; the reply carries the "UX check" block.
