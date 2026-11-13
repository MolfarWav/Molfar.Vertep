# Group dynamics (2026-11-13): interruptions, own goals, voices, Spotlight

Owner brought a Reddit post on multi-character chats (three ideas) and asked to take it together with the open group
issues. Roleplay branch `claude/group-dynamics` (off main 4.120.0), no engine change.

## The three ideas, as built
1. **Interruptions** (`banter`) and 2. **Own goals** (`pushback`): group dials `off` / `can` / `should`. One sentence each
   (about 45 tokens), appended to the scene text (`groupSceneLine`, the "Group scene" part of the prompt). Narrator groups
   address "Characters"; swap and append groups address the speaker by name. `should` is the post's wording, `can` the
   softened one (the post warns that `should` turns every reply into a shouting match).
3. **Voices**: `memberSettings.<id>.voice = { quirks (2 x 120), lines (5 x 240) }`, group-only (the card is untouched,
   its `mes_example` still works). One row per member after the scene text; swap = the speaker's row only. "Same news,
   different reaction" test button NOT built (N model calls and its own screen; left as an issue).

Defaults (owner): new groups `can`, `can`, Spotlight on (`NEW_GROUP_DYNAMICS` in `src/lib/engine.ts`, spread into the two
group-creating calls of the store); an older group has no keys and plays as before. A chat's `turns` can override each of
the three; `mergeChatTurns` drops a key equal to the group's.

## Spotlight (half (a) and (b) of #294, with the plan's numbers)
- (a) `groupTurnPlan` (natural): weight = talkativeness x (1 + min(quiet, 6) x 0.25); named members still win outright;
  muted members are not in the pool. `silentTurns` counts replies since the member's own reply (`charId`).
- (b) narrator and append groups: `spotlightLine`, one line for at most two present members quiet for 6+ replies. In a
  narrator group `charId` is the group, so "quiet" = the name is not in the last 8 replies' text (`mentionAt`).
- Not done: "absent" members (Dashboard `present`) are not excluded from the boost; the member bar shows nothing.
- Decisions taken without asking (plan defaults): both halves, step 0.25, cap 6, on for new groups only.

## UI plan (ux-review section 1)
- Find: group editor > Turns tab (next to who answers) and the chat's Turns button (the per-chat override), where the
  other turn settings already are. Voice: Members tab > a member's "In this group" fold (where talkativeness lives).
- Reused: `Segmented` (`dashboard/soul-controls.tsx`, got `max-md:min-h-10`), `Switch`, `Label`, `Input`, `Textarea`;
  new: `groups/dynamics-fields.tsx` (`DynamicsFields`, `VoiceFields`), drawn the same in both places.
- States: default new group (Can, Can, on), old group (Off, Off, off), chat override (dot on the Turns button, Reset),
  narrator vs each-in-turn (all three apply to both), phone (segments 40 px, popover scrolls).
- Hints: one sentence under each control, one shared line on Can vs Should; no hover-only help.

## Checked
Roleplay typecheck clean (engine's TypeScript, the app has none installed here), `test/rp-group-dynamics.test.ts` (23),
`rp-groups`, `rp-data-formats`; full suite see STATE. Browser check: see STATE.

## Left (issues)
- #294: the attention weight (who the story is about, shrinking faded members, Dashboard focus of 4 blocks), measured on a
  bench first. The Spotlight silent count is its seed.
- The "same stimulus, different response" test button (voices).
- Nothing run on a real model: does `should` flood a small free model with arguments? Try on a free OpenRouter model.
