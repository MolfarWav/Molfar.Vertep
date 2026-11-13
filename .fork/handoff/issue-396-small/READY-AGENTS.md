# Ready agents: Repetition guard, Canon guard, Ledger (#396), and Spotlight

Date: 2026-11-13. Released as Roleplay 4.120.0 (PR #136, merged; branch `claude/396-ready-agents`). Task file: the owner's
`TASK-default-agents.md` (kept outside the repo). Everything below was checked in the Roleplay code unless marked.

## 0. The answers (read before building)

**A. Past sweep.** The Spotlight issue is **#294** (open): "Roleplay groups: an attention weight per member". It already
holds the body and the owner's 2026-11-08 decisions (four full Dashboard blocks, the others present never dropped from
the insert). Related: #289 (closed, presence), #393 (closed, @mention), #378 (open, presence follow-ups). Nothing open
about repetition, a ledger or continuity beyond #396 itself. Two new issues came out of the build: #402 (agents cannot
read the Dashboard date), #403 (a missing source skips the whole card).

**B. How a ready agent ships.** There is NO mechanism that installs an agent without the user. What exists:
- Recipes: `.skills/agent-craft/references/recipe-*.vertep-agent.json` -> `bun scripts/sync-agent-recipes.ts` ->
  `src/lib/forge-recipes.ts` (bundled in the client) -> Forge "New agent > Start from a ready agent". Molfar reads the same
  JSON files. Nothing else reads them.
- Install: `PUT /agents/install { file, grant: true | [needs] }` writes the file and records the grants in one call
  (`installRoute` in `plugins/agents/plugin.js`). A new permission always waits for the user's Allow.
- Binding: `agents/settings.json` has `defaultPreset` (a set every chat without its own binding follows), and a chat can
  carry `agents: { preset }`. A set lists only agents that are already installed and allowed.
- Options for "default in releases": (1) as now, found in the Forge only; (2) the #396 item 0 offer in the new-chat step:
  the user switches agents on, the app installs the recipes by id with `grant` (the row texts are the consent), binds a
  set to that chat; needs only a small route over `installRoute`, no new mechanism; (3) install and grant on update by
  itself: NOT recommended, it records permissions the user never saw (agents run code and add text to prompts).
  `defaultPreset` alone is not enough: it needs the agents installed.

**C. Can a `model.ask` json `shape` hold a list?** No. `shapeType` in `agent-check.js` knows `number`, `bool`, `text`,
`enum:a|b`: flat fields. A list in an agent is a state field written by `state.list` cards. The Ledger keeps its rows as
JSON text in a `text` field written by a Script card, not by the model.

**D. What `history` gives.** `give.last` 1 to 60 (default 10), `give.only` `user` | `char`, `give.tokens` (100 to 100000,
the oldest rows go first, the newest always stays), `give.thinking` (default off). Rows are `Name: text`, `Name` the
message's name, else "User" or "Character"; joined by a blank line. So one agent CAN get only the last N replies
(`only: "char", last: N`), and speaker names are in it. A reply with a blank line inside makes the text ambiguous; the
scripts split rows on a blank line followed by `Name: `.

**E. Does an `after` hint reach the next reply?** Yes. `commitRun` writes the agent's inserts to
`agents/inserts/<chatId>.json` (an agent's earlier inserts are replaced on every run), `llmRequest` adds those of the
agents live in the chat to the next `reply` request, at the Output's `position`.

**F. A hint wired to an empty text?** Skipped. `commitRun` keeps only outputs with a non-empty `text`, `llmRequest` trims,
and an Output whose input is missing data is skipped by the executor. An agent that has nothing to say also drops its
earlier insert, so a stale hint never lingers.

**G. Does the Litopys facts text carry `knownBy`?** No: `litopysFactsText` gives `- fact` lines (pinned first, then the
newest, each cut to 400 characters, 4000 in all). So Canon guard cannot judge "who knows what"; left out.

**H. Limits.** A `text` state field and a wire carry up to 20000 characters (`TEXT_MAX`, clipped at the end); a note and a
hint 4000; the `html` widget in mode B 8192. `limits.maxCalls: 0` passes the checker when no card asks a model (the
Script card test uses it; Repetition guard is built so).

Found on the way, not in the task: (1) every slot of an Ask card is required, so a missing source (no card in a group,
no Litopys facts yet, no lorebook hit) silently skips the card (#403); (2) an Output takes exactly one wire, so two
sources for one hint need two Outputs; (3) the executor appends its own "Answer with JSON only ..." line to a json
question; (4) a Script card's first call on a cold sandbox worker took over 2.5 s on this machine and was ended (it
repeated warm in 25 to 45 ms; this is the existing `scriptStuck` territory, seen only in the harness).

## 1. Repetition guard (`repetition-guard`, 0 model calls)

Built as specified, `after`, every reply, `history` `only: char`, `last: 6`, `tokens: 8000`. One Script card, `prompt-insert`
labelled "Repetition guard". Rules decided in code: words are `\p{L}\p{N}` runs, lower-cased, no stemming; a phrase is 3
to 5 words inside one clause (a full stop, `;`, `:` or a line break ends it), in two or more DIFFERENT replies; it must
hold a word of 4 or more letters that is not a name (a capital inside a sentence) and 12 or more letters in all; an
overlap with a longer kept phrase (two consecutive words, one of 4+ letters) is merged away; at most 5, longest first. A
sentence opening is the first two words, 8 or more letters together, used 3 or more times. Insert on the sample chats:
64 to 79 tokens, nothing when nothing repeats. Run on the engine's real sandbox: 25 ms warm; on the largest input
(25 KB Cyrillic or Latin) about 150 to 200 ms of compute.

## 2. Canon guard (`canon-guard`, 1 call every 3rd reply)

`history` `only: char`, `last: 3`, `tokens: 2500`, `card`, `litopysFacts` limit 30. One Ask (json: `found`, `what`, `fix`,
`key`, 200 tokens), an If on `found`, one Script card (words the note and the button, holds back a repeated key). Note
"Canon check" under the reply, ending "If this is the new truth, update the fact in Litopys.", and a `choices` button
(`bottom`) "(OOC: <fix>)" that only fills the message box. Nothing found, or nothing new: no output. Owner's open question
"note only or note plus button": built with the button, a bare note is a dead end.
Differences from the task: the **lorebook is not read** and `knownBy` is not judged (G); a chat without a card (a group) or
without Litopys facts skips the agent (#403); the shown keys are a text `|key|key|` in `seen` (cut to 300 characters), not a
list, because a card cannot read a list into a prompt or a rule, and the repeat check is done in the Script card.
Prompt about 243 tokens without slots; at most about 5k tokens in per run (history 2500, card 1100, facts 1100), so
about 1.7k per reply.

## 3. Ledger (`ledger`, at most 1 call per reply)

State `book` (JSON text, rows `{ name, kind: stock | timer, amount, perDay }`, at most 12) and `html`. Script A reads the
player's `(ledger: ...)` commands (`gold = 500`, `remove gold`, also `timer X = 4`, `X per day = 50`), draws the table and
decides whether to ask the model; the Ask lists changes as lines (`name: -30`, `+30`, `=500`, `name per day: =50`, `timer
name: =4`, `days: 2`); Script B parses (a malformed line is dropped, never repaired), applies, then the days (stocks gain
`perDay * days`, timers lose the days, not below 0). Panel: `float`, `html` widget bound to `html` (What, Now, Per day;
a timer at 0 reads "⚑ now"). Hint "Ledger": "The true numbers, use them and invent no others: gold 470 (+50 a day);
Silver Castle in 4 days." (33 tokens for 3 rows, 138 for 12). Prompt about 158 tokens without slots; story up to 4000
characters of the reply, 1000 of the player's message.
Differences from the task: **kinds are `stock` and `timer`** (a rate is the `perDay` of a stock); the **card is not an
input** (a group chat has none, and the card would skip the agent); **no `text.extract` gate**: Script A is the gate, so
the hand commands work even when no model call is made. **The gate is wider than digits**: the first test ("Two days pass
on the road.") showed a digit-only gate loses every day written in words, so it also opens for number words and time words
(day, week, night, morning, later, and their Ukrainian and Russian forms). Not measured on a real resource game: no such
chat on this machine (25 chats, 294 replies of ordinary roleplay, 35% hold a digit). Dropping the gate is one line
(`CUE.test(...)` to `true` in Script A). Two Outputs carry the hint (one Output takes one wire): A's only when A asks no
question, B's after the sums, so the hint is never doubled. The Dashboard date issue is #402.

## 4. Spotlight: the plan (NOT built; waits for the owner)

It belongs to **#294**. #294 asks for an attention weight (raised by interaction, decaying) and a different Dashboard
focus; the owner's "Spotlight" is its fairness half: a member who has been silent is pulled back in. They pull in
opposite directions for a faded member, so the plan makes Spotlight the first, separate step and lets #294's
attention multiply it later.

- **Where the next speaker is chosen:** `groupTurnPlan` in `plugins/engine/plugin.js` (mode `natural`: the named
  members, else one weighted pick by `talkativeness`). A narrator group (`generationMode: narrator`) has no pick: the
  one narrator card voices everybody, so there only a prompt line can help.
- **The switch:** a group setting `spotlight` (default ON) in the group editor's Turns tab beside "The same member may
  answer twice in a row", with a per-chat override on the chat's Turns button (the same place `allowSelfResponses` and the
  muted list already are). Hint text: "A member who has been quiet for a while gets a better chance to speak."
- **What it does, 0 model calls:** the engine counts, from the chat file, the member messages since each member last
  spoke (silent turns). (a) `natural`: weight = talkativeness * (1 + min(silent, 6) * 0.25), so a member quiet for 4
  turns is twice as likely, never certain; the user's named members still win outright, and muted or absent members
  (#289) are not boosted. (b) narrator and `append` groups: one prompt line, only when a present member has been
  silent for 6 or more turns: "<Name> has been quiet for N turns; give them a natural way into the scene." Which of
  (a) and (b) to ship first is the owner's call: (a) is smaller and testable with a seeded random.
- **Default and sizes:** on for new and old groups; only a group with 3 or more members is affected. The line (b) is
  about 25 tokens, only when it fires.
- **What the user sees:** the switch and its hint. The member bar shows nothing new in step 1 (a dim "quiet" mark
  belongs to #294's focus work). Guide page `characters` (groups) updated in the same change.
- **Checks:** a test with a seeded `random` that a silent member is picked more often and a named one always wins; a
  narrator group gets the line only after 6 silent turns; ux-review before code (switch placement, phone width, the
  per-chat override).
- **Open for the owner:** (a), (b) or both first; the 0.25 step and the 6-turn cap; on by default for old groups too.

## 5. Not done, on purpose

- No run on a real model, no trial on a real chat (nothing here to judge Canon guard or the Ledger gate against a real
  resource game); guide translations of `agents` stale (13 locales); no version bump, no merge to `main`.
- The Help article "Agent editor: three ready agents" is not changed (it names three recipes; its source line numbers
  were already stale: `scripts/validate-help.mjs` reports 430 old errors that this change does not cause).
- The new-chat offer of agents (#396 item 0) is separate, as the task says.

## 6. After the release

Browser check (subagent, throwaway engine, fake model) passed: Ledger table and hint, hand command without a model call, Canon note and button (the button only fills the message box, the same key is not shown twice, no facts means no run), Repetition guard hint and its disappearance when the repeat leaves the 6-reply window. Findings left as they are: Canon guard counts the greeting among the replies (first run after the second user message), at 1280 px the note sits below the fold until the chat is scrolled, Repetition guard can list two phrases that share one word, the Ledger panel is a fixed 220 px high. The panel title was changed to "Numbers" after the check (it read "Ledger Ledger").
