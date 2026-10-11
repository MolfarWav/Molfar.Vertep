# Task for Molfar (paste into the agent chat on each machine, after the Roleplay update with the Profile tab)

Roleplay 0.9.8 adds a Profile tab to the character editor. A card that has one keeps its structured
fields in `extensions.molfar_profile`, and the app WRITES `description` and `personality` from them.
An edit made to those two texts directly is lost on the next edit in the Profile tab.

1. Look in my workspace for my own copies of the `edit-large-card` skill that override the app's
   (search `skills/` and any `.skills/` override folders; the app's own `apps/roleplay/.skills/` copy
   comes with the update, leave it).
2. In each copy, after the line about `/studio/expressions`, add:
   "A card with `/extensions/molfar_profile` (the Profile tab) has `description` and `personality`
   WRITTEN from that profile: change the profile's fields (DATA-FORMATS, "The profile"), not the two
   texts, or the next edit in the Profile tab overwrites yours. When the profile has `"free": true`,
   edit the texts as usual. A section switched off in `sections` (`"trauma": false`) keeps its fields
   but writes nothing into the text."
   And add `"/extensions/molfar_profile"` to the example `pointers` list of the first `json_get`.
3. If I have no own copies, change nothing and tell me so. Show me the diff before saving.
