# Task for Molfar (paste into the agent chat on each machine)

Roleplay added two lorebook things: an entry field `latch` and a new line in `secret`, `happens`.

- `"latch": true` on an entry: once its keys have hit in a chat, it keeps firing for the rest of that chat (the entry needs keys).
  Use it instead of a very long `sticky` for a fact that must not drop out of the prompt once the story has reached it.
- `"secret": { "knownBy": [...], "cover": "...", "reveal": [...], "happens": "one short sentence" }`: `happens` is a happening
  the Dashboard sensor watches for (for example "Jane is made to eat a clam"); when it says it took place, everyone in the scene
  learns the entry. A trait a character does not know about themself yet is a secret with `knownBy: []`, no cover,
  `status: "constant"`, and a narrow `reveal` phrase or a `happens` sentence.

1. Look in my workspace for my own copies of these skills (they override the app's): `lorebook-craft` and `edit-large-card`
   (search `skills/` and `apps/roleplay/.skills/` overrides).
2. In `edit-large-card`, in the paragraph about secret lorebook entries, add `"happens": "one sentence"` to the shape and one
   sentence on what it does (as above). Add a bullet: `"latch": true` on an entry keeps it firing for the rest of the chat once its
   keys have hit; the entry needs keys.
3. In `lorebook-craft`, after the sentence about `reveal`, add the hidden-trait shape (`knownBy: []`, `cover: ""`,
   `status: "constant"`, a narrow `reveal` phrase or a `happens` sentence) and: for a fact that must stay in the prompt once the story
   has reached it, set `latch: true` (the entry needs keys) instead of a very long `sticky`.
4. If I have no own copies, change nothing and tell me so. Show me the diff before saving.
