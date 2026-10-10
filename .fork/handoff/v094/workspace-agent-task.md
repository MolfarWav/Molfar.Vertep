# Task for Molfar (paste into the agent chat on each machine)

Roleplay 4.29.0 changed how lorebook keys match: Ukrainian and Russian keys now match every form of
their words, so one base form per key is enough, and entry `uid`s must never be renumbered.

1. Look in my workspace for my own copies of these skills (they override the app's): `lorebook-craft`,
   `card-import`, `edit-large-card` (search `skills/` and `apps/roleplay/.skills/` overrides).
2. In each copy, replace any instruction to "list the inflected forms" of Ukrainian/Russian keys
   (e.g. "вежа, вежі, вежу, вежею") with: "Ukrainian and Russian keys: one base form each; word forms
   match on their own. List extra forms only when the stem changes (дім / дому) and for words of 3
   letters or fewer." In `edit-large-card`, after the line about `json_set` on `/entries/<index>/<field>`,
   add: "never renumber `uid`".
3. If I have no own copies, change nothing and tell me so. Show me the diff before saving.
