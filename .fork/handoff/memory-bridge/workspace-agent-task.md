# Task for Molfar (paste into the agent chat on each machine, after the Roleplay update with the card memory and skills)

The Roleplay card now has a Memory tab: what a character remembers from finished stories lives in
`characters/<id>/memory.json` (GitHub #102), and next to the stories the card keeps its **skills** (GitHub #106):
short rules for how the character acts. A chat's "Start clean" on the Dashboard banner also turns off
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
     say. A deleted chat does not change it. The one part you may write there is `skills`: short rules for how
     the character acts (not abilities), `{ id, name, rule (1-6 lines, one per \n), when (optional, one line),
     on: true, origin: "molfar", state: "proposed" }` appended to `/skills` (`id` "k" plus the next number after
     every id in the file, `nextSkill` is the app's counter). Always `state: "proposed"`: the user confirms it in
     the Memory tab, you never write an accepted one. If the file is missing, write
     `{"v":1,"sources":[],"skills":[]}` first. Keep a skill to habits and reactions worth reusing in every chat,
     not a fact about one story, and not a copy of the card's own text. To choose and write skills, use the skill
     `card-skills`.

3. If I have no own copies, change nothing and tell me so. Show me the diff before saving.
