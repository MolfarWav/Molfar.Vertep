# Task for Molfar (paste into the agent chat on each machine)

Roleplay renamed a character's "skills" to "habits" (Roleplay 4.67.0, issue #111). The card's data keys
changed too: `skills` -> `habits`, `nextSkill` -> `nextHabit`, `inject.skillsMaxTokens` -> `inject.habitsMaxTokens`.
The app still reads the old keys and writes the new ones, so nothing is lost, but my skill copy must follow.

1. Look in my workspace for my own copy of the skill `card-skills` (search `skills/` and
   `apps/roleplay/.skills/`). If there is one, rename the folder to `card-habits` and change inside it:
   `name: card-skills` -> `name: card-habits`; every "skill" about a character -> "habit"; the file key
   `/skills` -> `/habits`, `"skills":[]` -> `"habits":[]`, `nextSkill` -> `nextHabit`; the block name "Skills"
   -> "Habits" (Ukrainian: "Звички"). Keep the trigger words in Ukrainian and add "звички персонажа".
2. In my own copy of `edit-large-card` (if there is one), change the line that points to `card-skills`
   to `card-habits`.
3. Do not touch other skills. The word "skills" stays for your own skills.
4. Tell me which copies you changed (paths), and nothing else.
