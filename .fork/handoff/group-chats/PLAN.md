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

## User's answers (2026-10-11)
- Groups must not get lost among characters: either their own place, or Characters gets a filter by card
  type (cards already carry `molfar_card_type`: single, narrator, group...). A real group card is needed,
  with its own settings (overriding members' first messages and more).
- Default mode: the narrator (one reply voices all), switchable to "each in turn" (the user's favourite;
  cards have talkativeness).
- Chats: only the group part in 1.0.0, plus coloured dialogue and anything else worth borrowing.
- Wanted on the group card: generating a shared scenario, auto or semi-auto.

## Lorebooks in a group (read from code 2026-10-11, not run)
- Scope = global books + every member's own and linked books + the persona's (`scopeBookIds`,
  `src/lib/store.ts` ~67; the engine scans only `meta.lorebookIds`, `plugin.js` ~1458). Muted members'
  books scan too.
- A group has no book of its own: the card editor shows a Lorebook tab for a group, but group edits are
  dropped.
- Entry character filters match the current speaker (`plugin.js` ~1505), fine for "each in turn"; the
  narrator mode has no single speaker, so it must treat every active member as present.

## Progress
- Step 1 (fixes) on the Roleplay fork branch `claude/project-thread-1k7fm5`, not released: group delete
  (DELETE /groups/<id> takes its chats), description by members, Home count, card menu and editor
  without copy/export for groups, favorite kept. `test/rp-groups.test.ts`. Checked live in a throwaway
  engine. Left for step 2: deleting a character leaves its id in groups' memberIds (skipped at runtime);
  the card editor still opens for a group and drops edits (the group editor replaces it).
- Agreed (user, 2026-10-11): the Characters | Groups switch at the top of Characters; the group card
  proposal (`/mnt/project-files/group-chats/group-card-proposal.md`) as written; external models
  (`ask-model`) join the work.
- Step 2 (group card) on the same Roleplay branch, not released. Data: `GroupConfig` in `src/lib/types.ts`
  (scenario, openings, memberSettings {talkativeness, opening, color}, own books, memberBooks), documented
  in the fork's `docs/DATA-FORMATS.md` (test checks every key). Server: shared scenario and talkativeness
  overrides in `chatMembers`, member books by `memberBooks`, muted members' books out, group openings as a
  Narrator message with swipes, per-member opening choice. Client: Characters | Groups switch, group editor
  (`src/components/groups/group-editor.tsx`, tabs overview/members/scene/turns/lore/chats), "Group
  settings" in the member bar, "Edit group" after converting. Deleting a character drops it from groups.
  Checked in a browser (dark 1280, light 390). Not checked: picture upload, the below-2 warning.
  `color` is stored but not used yet (step 3).
- Next, step 3: the narrator mode (one reply voices all members, the default) with coloured dialogue;
  then scene generation, small-model prompt tweaks, the Chats page group part, a type filter.
- Step 3 (narrator mode, coloured dialogue) on the Roleplay branch, not released: `generationMode: "narrator"`
  (default for new groups) = one reply with every unmuted card, stored with charId = group id; colours by
  member (group, card, palette), in narrator replies by the first member named in the line
  (`src/lib/dialogue-voices.ts`). Browser-checked with seeded messages; not yet run against a real model.
  Known: palette yellow is pale on the light theme.
- Next, step 4: scene generation (auto / semi-auto), then small-model prompt tweaks, the Chats page group
  part, the Characters type filter.
