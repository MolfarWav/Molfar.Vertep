# Task for Molfar (paste into the agent chat on each machine, after the Roleplay update with Save changes)

The Roleplay card editor now keeps edits as a draft until Save changes (GitHub #103), marks the Profile
sections in exported cards (#105) and lets a card choose the model for its own tasks (#104). Two things
touch the card skill `edit-large-card`.

1. Look in my workspace for my own copies of the `edit-large-card` skill that override the app's
   (search `skills/` and any `.skills/` override folders; the app's own `apps/roleplay/.skills/` copy
   comes with the update, leave it).
2. In each copy, after the bullet about `/extensions/molfar_profile/cast` (ends "Shared world text stays
   in the profile's `notes`."), add these bullets:

   - A card exported with "Mark the profile sections" (the default) carries a heading before each part of
     `description` and `personality` (`## Identity`, `## Appearance`, `## Personality`, `## Behaviors`, ...; a cast
     uses `####` inside its `### Name` parts). The app takes them out again when such a file is imported. In a
     card that is already installed the two texts have no headings: never add them by hand, and do not move
     text between them.
   - The model a card's tasks (Structure it, Fill empty, the Soul rating) run on is not in `card.json`: it is in
     `characters/<id>/card-tasks.json` (`model`, `maxInput`, `maxOutput`), written by the editor's Save changes.
     Leave that file alone.
   - The editor keeps a change as a draft until the user presses Save changes: a card you edit on disk while
     it is open in the editor can meet a draft, and the user then chooses which version to keep.

3. If I have no own copies, change nothing and tell me so. Show me the diff before saving.
