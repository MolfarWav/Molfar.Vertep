# Family tree (Social, MolfarWav/Molfar.Vertep#366): UI plan

Status: plan only (2026-11-10), for the `ux-review` pass before code. Nothing built. Follows the relationship map (Social PR 38); code goes in Social on a branch stacked on it.

## What the user is trying to do
See a family as a family: who is whose parent, child, spouse or sibling, in generations, instead of reading ties one by one in a profile's Life tab or as lines on the map. The data already exists: family ties are set by the user in the Life tab and mirror onto the other side (parent / child, spouse / spouse, brother or sister / brother or sister, relative / relative), and `GET /life/graph` already carries them. No new route is needed.

## Where it lives and the steps
Profiles tab > the switch at the top becomes **List | Map | Family** (a third segment of the same `ViewSwitch`). Two steps from the Profiles tab. A third segment is found where the other two are; a filter inside the map was rejected (a layout that changes under the same switch is a blind step), and a per-person tree in the Life tab was rejected as the first version (a family is about several people).

## Components, found in the code
Reuse: `ViewSwitch` and `Seg` (`MapScreen.tsx`, `ui.tsx`), the selected-person panel and the phone sheet (`MapPanel`, `Dialog`), `Avatar` and the node look of `RelationMap.tsx`, the tie words (`useTieWord`), `loadGraph` and `map-model.ts` (`Graph`, `GLink`), the tokens `--rel-family`, the keyboard and a11y pattern of the ring.
New: `family-model.ts` (pure: groups, generations, order, connectors; tested), `FamilyTree.tsx` (the SVG), an outline (indented list) view, strings en and uk, a guide paragraph in `profiles.md`, preview parameters `view=family`, `select`, `mapstate=nofamily`.

## How a tree is built (rules, no model, no guessing)
- A **family group** is a set of people joined by family ties (spouse, parent, child, brother or sister, relative). Each group is one tree; groups are stacked with a thin rule between them. People with no family tie are not drawn; a line under the trees says how many ("5 people have no family ties").
- **Generations** come only from parent and child ties: a parent is one row above a child; spouses and siblings share a row. A person with only "relative" ties is placed beside the person they are related to and joined by a dotted line (the app does not know the degree). No grandparents, in-laws or ages are inferred.
- **Order in a row:** spouses side by side, siblings side by side, rows ordered by their parents' order (a deterministic barycentre walk like `ringOrder`), so the same data is always drawn the same way.
- **Lines:** a double short line between spouses; parents with a spouse send one line from the middle of the couple down to their children; a single parent, or parents not tied as spouses, send a line each; siblings with no known parent are joined by a dotted bar.
- **Ties that do not add up** (a cycle: someone is their own ancestor, or a spouse in two generations): the tree is still drawn from the first consistent reading, the affected people get a small warning mark and the panel says which tie conflicts. Never an empty screen.

## Layout variants considered
- **A. Generations as rows, couples joined** (picked): the familiar family-tree shape, readable for 2 to 4 generations and about 8 people a row, no layout engine.
- **B. Indented outline** (parents with their children nested): fits a phone and a screen reader and handles a big family, but is not a picture. Built as the list version of A (same toggle as the map's "Show as list"), and the default on a phone when a row is wider than 4 people.
- **C. Radial (people round the person you pick):** good for "who is X's family", poor for several generations. Not built; the map already centres on a pick.

## States
- Loading and error as the map (skeleton, one sentence, Retry).
- Empty (no family tie anywhere): a teaching note, "Family ties you set in a character's Life tab show up here as a tree" with a button to the Map and a line saying which ties count (spouse, parent, child, brother or sister, relative).
- One group, several groups, people with no family (counted under the trees), a conflict mark, a persona in a family (dashed ring, as on the map).
- Wide family: the drawing sits in its own scroll area (the page never scrolls sideways) and starts centred; on a phone the outline opens instead when a row is wider than 4.
- Picked person: their branch lights up (parents, partner, children, siblings), the rest fades; the same panel as the map, with **Open profile** and **Edit ties**; nothing on the tree writes.
- Keyboard: Tab through people in reading order (top row first, left to right), Enter picks, Escape puts it down; the outline is the text version.

## Not in this step
Ages, birth order, in-laws and grandparent inference, half-sibling logic, a persona's own tree, editing by drag, a family photo export, a tie that appears from play.

## Done check
390 px light and 1280 px dark, en and uk, preview data: a three-generation family with a couple and three children, one single parent, a second group of two, a person with only "relative", one conflicting tie, a persona in a family; the empty state; a 12-person row; screenshots compared with this plan line by line; the reply carries the "UX check" block.
