# #396, first batch: three small items (Roleplay branch `claude/issue-396-agents-small`, off main 4.118.0)

Owner's picks (2026-11-13): small and safe first; the card field is per character, switched per chat (later batch);
reply correction stays last, as a checklist only.

## A. Scan depth for keyword triggers
- Today `keywordsOk` (`plugins/agents/plugin.js`) looks at `msgs.slice(-2)`.
- New optional `trigger.scan`: an integer 1 to 50 (Marinara allows 200; our run view is not that long). Missing = 2, so every
  installed agent behaves as before. Checker: `E_TRIGGER` when it is not an integer in range (`agent-check.js`, then
  `bun scripts/sync-agents-plugin.ts`). `formatVersion` stays 1: an older Roleplay ignores the field.
- UI: the Forge's Agent tab, next to the keywords, "Look back N messages" (only meaningful with keywords).
- Docs: DATA-FORMATS "Agents", guide page `agents`, `cards.md` of the agent-craft skill.

## B. Cost before enabling
- The Agents tab and the install/permissions page already say "up to N model calls". Missing: tokens, and a total.
- `GET /agents/list` gets `cost: { calls, tokensIn, tokensOut }` per agent. `calls` = the Ask cards in the file (`agent.derived`).
  `tokensOut` = the sum of the cards' `maxTokens` (an upper bound). `tokensIn` = each card's prompt template plus a nominal size
  for every Input source it reads (last reply 500, last user message 80, history = last x 150 or its token cap, card 800,
  persona 300, author's note 100, Litopys facts limit x 25, lorebook 400). A number is shown as "about", never exact.
- UI: a line "about 1 call, 700 tokens per reply" on each agent row and a total for the chat's active agents (also the
  line the new-chat offer will reuse). Cadence (`everyN`) divides it: "about 1 call per 3 replies".
- Not done on purpose: the real size of the chat's last reply (the list is not per chat); real token counts from past runs
  (the run log does not hold tokens).

## C. Prompt patch
- Today a `prompt-insert` output is appended to the last user message. The output already stores a `position`
  ('after-history') that nothing reads.
- `position` becomes a checked choice: `after-history` (today), `system-start` (before the first system message's text),
  `system-end` (after the last system message's text). Same permission `write:prompt`, same label in the Prompt board, same
  4000-character clip. An unknown position is `E_OUTPUT`.
- `replace` (Marinara) is left out: a model-written find/replace on the outgoing prompt can silently break it and no
  use case is named. Revisit with one.
- UI: a "Where" select on the Output card of kind `prompt-insert`; the Allow page sentence names the place.
- A parallel agent still cannot insert a prompt (`E_PARALLEL_INSERT`).

## Walk-through at done
`ux-review` and `browser-check` (dark, light, 390 px) for B and the select of A and C; tests for each checker rule and the plugin paths.
