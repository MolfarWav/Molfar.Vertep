# RPG layer next to the Dashboard (long-range idea, user 2026-10-13)

Status: an idea, not planned. Nothing built. Start only on the user's word, with a design pass and the user's
answers first (`ux-review` before building).

## What it is
An optional add-on to the Roleplay app for players who want an adventure campaign rather than a slow burn:
inventory, HP and other resources, skills and stats, conditions, levels. It sits beside the Dashboard (same
sensor pass, its own panel), so a romance chat never pays for it.

## What already exists to build on
- **Dashboard sensor** (`plugins/relations/plugin.js` in the Roleplay fork): after each reply it already reports
  who is present, place, weather, and per character mood, condition, outfit, `holding`, goal, who leads. Inventory
  and conditions can grow out of `holding` and `condition` instead of a second model call.
- **Prompt insert** (`buildInsert`): the way state reaches the next reply; an RPG block would ride it.
- **Dice tool** (`plugins/tools/plugin.js`, `roll_dice`); GitHub #14 adds the reason and difficulty of a roll,
  the natural base for skill checks ("Stealth 1d20+3 vs 14").
- **Group chats**: party members are already modelled as group members.

## Ideas from Discord (a player, 2026-10-13) and SpatialEngine
- SpatialEngine (github.com/dictatenimrod-bot/SpatialEngine): a fragment of someone else's Python app, no license
  (do not copy code, ideas only), not runnable alone. Worth taking as ideas:
  - one canonical id per entity with aliases ("she", "Lilith", "the girl" = one record), so the state does not
    duplicate people and things;
  - a character sheet as its own record attached to a scene entity (HP, mana, stamina, six D&D stats, level, XP,
    inventory, equipped slots, skills, conditions);
  - scene "frames" chained turn to turn (who and what is where, what happened).
  - Its cost lesson: a separate "atomizer" model call per reply made a local reply take 2-3 minutes. Reuse the
    Dashboard sensor's single pass instead.
- A pre-pass over the player's message (GitHub #15 is its first step): tie what the player wrote to known items,
  places and people before the main model sees it; later, pull matching facts from the vector store.

## Open questions for the user
- Rules system: a light own one, or D&D 5e-like stats? Who changes numbers: code from sensor events, or the
  model through tools (`change_hp`, `give_item`)?
- Per chat or per character card (a sheet that travels between chats)?
- The panel on phones: a tab of the Dashboard sheet, or its own?
