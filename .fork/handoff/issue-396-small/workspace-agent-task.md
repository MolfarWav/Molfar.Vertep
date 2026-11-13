# Task for the built-in agent: workspace copies after the "How they changed" change (#396)

Paste this to Molfar (the built-in agent) in the user's workspace after Roleplay is updated. It only touches skills, never cards.

1. The card skill `edit-large-card` (workspace copy `.skills/edit-large-card/SKILL.md`) must say, next to the paragraph about
   `characters/<id>/memory.json` and `habits`, that how a character changed over play is in `characters/<id>/growth.json`
   (the living portrait: blocks `{ section, kind, text, state }`), written only by the app's agents and the card's Memory tab, and that it is left alone:
   never written by hand, never copied into `description`, `personality` or the Soul. If the workspace copy is the one that ships
   inside the app, an Update on Roleplay replaces it and nothing is left to do; compare it with the app's copy and say which it is.
2. The agent skill `agent-craft` (workspace copy `.skills/agent-craft/`): the app's copy now lists the seventh ready agent
   `recipe-growth.vertep-agent.json`, the card `write.growth` and the Input source `growth` (`references/cards.md`). Same rule:
   an app update replaces it; otherwise bring the two files in line with the app's copies.
3. Do not edit any card, `growth.json` or `memory.json`. Report which files changed, in two lines.
