# Task for Molfar (paste into the agent chat on each machine, after updating to the Roleplay release with the World DM)

The Roleplay app has a World DM now: a chat can have its own world book, `lorebooks/world-<chatId>.json`,
with the field `ownerChatId`. The app's own `edit-large-card` skill (`apps/roleplay/.skills/`) comes with
the update and already says how to treat such a book. Only my own override copies need the same lines.

1. Look in my workspace for my own copies of `edit-large-card` that override the app's (search `skills/`
   and any `.skills/` override folders; leave `apps/roleplay/.skills/` alone).
2. In each copy, add the bullet that starts "A book with `ownerChatId`" exactly as it stands in
   `apps/roleplay/.skills/edit-large-card/SKILL.md`, right after the bullet about files starting with `_`.
3. If I have no own copies, change nothing and tell me so. Show me the diff before saving.
