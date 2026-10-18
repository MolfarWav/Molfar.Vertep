# Task for Molfar (paste into the agent chat on each machine, after updating to engine 1.2.1 and Roleplay 4.50.0)

Engine 1.2.1 gives you a new tool, `image_generate`: it draws a picture with my image models and
returns its URL, `/v1/assets/<id>`. The app's own `edit-large-card` skill (`apps/roleplay/.skills/`)
comes with the Roleplay update and already says where that URL goes. Only my own override copies
need the same section.

1. Look in my workspace for my own copies of the `edit-large-card` skill that override the app's
   (search `skills/` and any `.skills/` override folders; leave `apps/roleplay/.skills/` alone).
2. In each copy, add at the end the section "## Pictures: avatar, background, gallery" exactly as it
   stands at the end of `apps/roleplay/.skills/edit-large-card/SKILL.md`, and add
   "a new avatar, background or gallery picture" plus the triggers "зроби аватар", "намалюй фон",
   "make an avatar" to the copy's `description`.
3. If I have no own copies, change nothing and tell me so. Show me the diff before saving.
