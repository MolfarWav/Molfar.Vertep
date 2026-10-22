# Task for Molfar (paste into the agent chat on each machine, after the Roleplay update with the card memory)

The Roleplay card now has a Memory tab: what a character remembers from finished stories lives in
`characters/<id>/memory.json` (GitHub #102), and a chat's "Start clean" on the Dashboard banner also turns off
the Litopys backstory. One thing touches the card skill `edit-large-card`.

1. Look in my workspace for my own copies of the `edit-large-card` skill that override the app's
   (search `skills/` and any `.skills/` override folders; the app's own `apps/roleplay/.skills/` copy
   comes with the update, leave it).
2. In each copy, after the bullet about `card-tasks.json` (ends "Leave that file alone."), add this bullet:

   - What the character remembers from finished stories is not in `card.json` either: it is in
     `characters/<id>/memory.json` (a list of `sources`, each a snapshot of one chat: a short `arc`, the strongest
     `facts`, `notes` and `said` lines, and a copy of the chat's `title`), edited in the card's Memory tab and
     injected into new chats of the card. Do not write it by hand and do not copy its lines into `description`
     or the Soul: the app already leaves out a memory line that the story, the Dashboard or the card's own text
     say. A deleted chat does not change it.

3. If I have no own copies, change nothing and tell me so. Show me the diff before saving.
