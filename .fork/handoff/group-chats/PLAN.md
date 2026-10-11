# Group chats = 1.0.0 (user, 2026-10-11)

The user: "group chats do not work at all: converting gives a card ('Eva & co.') that cannot be deleted".
1.0.0 is group chats; 1.0.1 is the phone version of the app (later). The agent batch (3.7, 2.5) waits.
Research files (shared project folder, not in the repo): `/mnt/project-files/group-chats/`
(`marinara.md`, `other-frontends.md`: SillyTavern, RisuAI, Agnai, Talemate).

## What exists (checked live 2026-10-11 in a throwaway engine, Roleplay 4.34.0)
Groups work at the engine level. Roleplay `plugins/engine/plugin.js` stores `groups/<id>.json`
`{id, name, memberIds, mode, mutedIds, allowSelfResponses, generationMode, autoMode}`; a group chat's meta
has `groupId` and no `characterId`. `groupTurnPlan` (natural: names in the text, else one pick weighted by
talkativeness; list; manual), mutes, swap/append prompt modes, group-only greetings, a speaker nudge.
Client: Characters > Group, chat kebab > Convert to group, the member bar (trigger, mute, reorder) and a
gear "Reply strategy" (activation, generation mode, auto mode, self responses). Verified: a group replies,
Trigger reply works, mutes and List mode write to the group file and take effect.

## What is broken (verified)
- Delete: `deleteCharacter` (`src/lib/store.ts` ~1665) sends `DELETE /characters/<grp id>`; the route
  answers ok and removes nothing, so the group comes back on reload. Nothing calls `DELETE /groups/<id>`.
  Its chats stay too and show in Chats with a blank character, and they do not open.
- The group opens in the card editor (`groupToCharacter`, `src/lib/engine.ts` ~803): edits are dropped
  (`updateCharacter` returns early for groups, store ~1590). No UI to rename, add or remove members,
  or delete.
- Every group's description lists ALL characters: store ~504 passes every solo card to
  `groupToCharacter` instead of the members.
- Groups count as characters (Home count, "group" tag in the filter); the card menu offers Duplicate
  (no-op), Convert to persona, Export PNG.
- A new group chat with no messages is swept as abandoned (store ~563-577); its group file stays: orphans.
- A new group chat starts empty (no opening line).

## Proposed shape (to confirm with the user)
1. Fixes above, first and on their own.
2. A group is its own thing, not a card: a group editor (name, picture or member collage, members add /
   remove / reorder, reply strategy, mutes, a scenario override, group greeting, delete with its chats).
   Groups get their own row in Characters.
3. A "narrator" mode (Marinara's Merged): one reply voices every member, one model call per turn; fits
   free small models. With it, each character's lines in their own colour (queue item 6a; cards already
   have a Colors tab).
4. Prompt for small models: swap plus a short roster of the other members (Agnai), the speaker nudge
   last, output trimmed at `\n<OtherMember>:`.
5. Chats page: group chats show their members; the bigger Chats page redesign (START item 11) is a
   separate step unless the user wants it in 1.0.0.

A Roleplay card/group format change updates `docs/DATA-FORMATS.md`, `edit-large-card` and a workspace
task (CLAUDE.md rule).
