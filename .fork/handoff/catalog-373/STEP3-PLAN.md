# #373 step 3: the World DM offers names from the catalog (plan, 2026-11-20)

## What it does
The DM's model tends to name every new person, place and group the same way. With the switch on, each DM run (and each Start step of a
world built in a chat) carries a short list of names from the shared catalog that the world does not use yet, for new records to take
when one fits. The model may change a name to suit the story and never renames an existing record. Nothing is checked by code afterwards:
it is a nudge, not a rule.

## Scope and what was left out
- In: a per-chat switch with the style (genres) and the name cultures; the DM run; the Start steps (records and cast) when the switch is
  on while Start runs; a status line that says whether the catalog can be read.
- Out, on purpose: the `cat` pointer on a record that matches a catalog entry (nothing reads it yet; a record format change for a
  consumer that does not exist: wait for the RPG kinds table, #123); Start of a world made on the Worlds tab (no chat sheet there to
  switch it on); picking names for the user's own persona.
- The catalog needs engine 1.19 or later (the `/v1/catalog` routes of step 2) and the Store repository's `catalog/` on `main`. Without
  either the switch is disabled and says why in visible text.

## Where it lives and the steps
Chat > World DM sheet (the gear in the World panel) > a card "Names from the catalog", after the cast deck cards. Three steps from the chat:
open the sheet, find the card (its closed summary says "Off" or "On: dark fantasy · Ukrainian"), switch it on. The default is off.

## Components (found in the app)
- `Section` (`src/components/ui/section.tsx`) and `SettingRow` (`ui/setting-row.tsx`) with `Switch` (`ui/switch.tsx`), as `CastDeckCard`
  in `src/components/world/world-cast-deck.tsx` does; chips are `Button` `variant="default"|"outline"` `size="sm"` with a `Check`
  (the pattern of the place chips in `world-bg-set.tsx`). No `Fold`: four controls at most, and two short rows must not be folded.
- New: `src/components/world/world-names.tsx` (`NamesCard`) and `src/lib/names-pool.ts` (reads the catalog and picks the pool).

## States
- Catalog unavailable (an engine without the routes, the Store off, offline with no copy): the switch is disabled; one muted line says
  "The catalog is not available: update the engine or turn the Store on." No chips.
- Loading the vocabulary: the line "Checking the catalog..." and a disabled switch (a status role, no skeleton: it is one line).
- Off (default): the switch and its one-line hint; chips hidden.
- On: two chip groups under their headings, "Style" (genres) and "Name culture" (cultures); none picked means any. A line says how many
  entries the choice offers ("About 240 places, 180 groups, 360 names") so the user sees that the choice has an effect.
- Error saving: the same toast as the other cards. The DM off for the chat: the card is dimmed like the cast cards, with the reason.
- Phone: chips wrap, 40 px targets (`max-md:h-10`), no sideways scroll.

## Variants considered
1. A card in the chat's sheet, per chat (picked): the style differs from story to story, and the card sits beside the other per-chat
   levers.
2. A global setting in the World settings dialog: one style for every chat; wrong for a user who plays dark fantasy and cyberpunk.
3. An automatic style from the card's text by a model call: costs a call and guesses wrong; left for later.
