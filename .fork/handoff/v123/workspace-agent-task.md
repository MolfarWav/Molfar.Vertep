# Task for Molfar (paste into the agent chat on each machine, after updating to Roleplay 4.51.0)

Roleplay 4.51.0 lets one card's Profile describe several characters: the profile's own fields are
the first character, and `extensions.molfar_profile.cast` is a list of the others, with the same keys.
The app's own `edit-large-card` and `card-craft` skills (`apps/roleplay/.skills/`) come with the
update and already describe it. Only my own override copies need the same lines.

1. Look in my workspace for my own copies of `edit-large-card` and `card-craft` that override the
   app's (search `skills/` and any `.skills/` override folders; leave `apps/roleplay/.skills/` alone).
2. In each `edit-large-card` copy, add the bullet that starts "A narrator card may describe several
   characters in one profile" exactly as it stands in `apps/roleplay/.skills/edit-large-card/SKILL.md`,
   right after the bullet about `/extensions/molfar_profile`.
3. In each `card-craft` copy, add the sentence that starts "A narrator card with several people" exactly
   as it stands in step 6 of `apps/roleplay/.skills/card-craft/SKILL.md`, at the end of step 6.
4. If I have no own copies, change nothing and tell me so. Show me the diff before saving.
