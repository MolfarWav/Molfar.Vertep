# Task for Molfar: put the World DM P3 test branch into my Roleplay app (paste into the agent chat)

I want to try the unreleased Roleplay branch `claude/world-dm-p3-i5a7bo` of MolfarWav/Molfar.Vertep-Roleplay
(World section, run history, failures in the inbox). My chats, cards and books must not change.

1. Look at `apps/roleplay`: is it a git checkout (`apps/roleplay/.git` exists)? Tell me which commit and branch it is on
   and whether it has uncommitted changes. If it has changes, stop and show me `git status` first.
2. Make a backup copy of the app's code first (everything in `apps/roleplay` except `data/`), named with today's date,
   next to it; tell me where.
3. If it is a git checkout: `git fetch origin claude/world-dm-p3-i5a7bo` and check that branch out. If it is not:
   clone the repository at that branch into a scratch folder and copy its files over the app's code, never touching
   `apps/roleplay/data/` (my chats, cards, books, world states live there).
4. Do not run `bun install` unless the branch's `package.json` dependencies differ from what is installed; if they
   differ, tell me and ask.
5. Tell me to reload the app (Rebuild in the top bar). To go back: the backup from step 2, or check out the previous
   commit.
