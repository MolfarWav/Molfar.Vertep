# UI plan: agent sets + install (#138, #139), written before the code (2026-11-01)

Roleplay branch `claude/project-thread-2mut6f`. The plan is compared with the screenshots at the end (section "Compared").

## Decisions taken (and why)

1. **"Used by N chats" = chats that FOLLOW the set** (no own copy of the list). Those are the chats a change or a delete reaches.
   Counted by a new plugin route `GET /agent-usage` that scans `chats/*.meta.json` on demand (only when the Agent sets screen,
   or the chat's set sheet, opens), with a cap of 4000 files and a `partial` flag ("at least N"). No index file: one more thing
   to keep in step with chat deletes, and the scan runs once per screen open. Variant (c) (read it from the client's chat store)
   rejected: the store drops `meta.agents` and goes stale after any edit made in a chat.
2. **Last set per character** mirrors `presetMemory`: chat meta gets `agentsAt` when the person chose a set (the New chat step,
   or the chat's own "use this set"). `GET /agent-memory/:id` returns the pick of the newest such chat (`default`, `none`, or a set
   id that still exists). Chat creation applies it when nothing was sent, so a chat started without the step follows it too.
   The step records even "default" as a choice (otherwise the older explicit pick would come back).
3. **Silence all notes = a chat-level switch**, not a global flag. DESIGN 17.5 puts it in the chat's agents drawer and it is where
   a person wants it (during a scene). It writes `show: log` for every agent in the chat that makes notes, in one call (op `showAll`),
   and "allow" clears it (back to each author's place). Notes only: choices, panels and state are untouched (agents that make them
   are skipped, because `show` moves ALL of an agent's results). A global default for new chats is NOT built (needs precedence rules);
   filed as an issue.
4. **Permissions page** is one dialog, "Allow <agent>", opened from the agent card (the card keeps a one-line summary and one button).
   Three blocks in the order the person decides: models for the roles, permissions one by one (a switch per permission with its
   sentence), then the primary button. Grants are a draft until the button is pressed (`/agents/grant` already takes a token list).
   The agent still runs only when it has all of its permissions: the dialog says so in words.
5. **Model change after the preview.** A model role does not change the agent's needs (they come from its cards), so nothing has to be
   re-granted. What does change is who receives the chat text: the `llm` permission row names the model chosen per role, computed from
   the current choice, so the preview can never be stale. A pure `permissionPreview` is tested for this.
6. **Checker codes**: one pure table (`src/lib/agent-check-text.ts`) maps a code to "what happened" and "what to do", with the card
   title (from the error's `node`) or the quoted names from the message in the sentence. The stable code stays on the line as a chip.
   Used in the Forge check list, the draft details, the installed card and the per-card problem lines. Unknown code: the English message.
7. **Drag to reorder** with pointer events on a grip handle (`touch-action: none`), so a finger works; Up/Down stay as the fallback and
   as the keyboard path. Panels and widgets (and action buttons) use the same hook. No auto-scroll while dragging (a panel list is at
   most 4 panels x 20 widgets).

## Where, what is reused, states

| Screen | Start | Reused | New | States |
|---|---|---|---|---|
| Agent sets, header | Canvas > Agents board | `Select`-like native select, `InfoTip`, `useConfirm`, chip pattern of `as-dirty` | a muted line "Used by N chats" + tip | counting (`...`), none, N, at least N, error (line hidden) |
| Agent sets, Save / Delete | same | `useConfirm` | confirm text with the count (only when N > 0) | N = 0: no extra question |
| Chat > Agents tab, set list | chat quick bar | `AgentsTabItems` rows | the delete in `AgentsSheet` also names the count | same |
| Chat > Agents tab, context bar | same | `Switch`, `InfoTip` | "Notes under replies" switch row | hidden when no agent in the chat makes notes; on / off / mixed ("some agents are quiet") |
| New chat step | "New chat" | its set `Select` | pre-pick + hint "Same as your last chat with X" | no memory: as before; remembered set deleted: default |
| Agent card (chat sheet + Forge) | sheet / Forge install | `InstalledAgent` | summary line + "Review and allow" (primary) / "Permissions" (outline) | waiting, update, allowed, unsupported, errors |
| Allow dialog | the card button | `Dialog`, `Switch`, `SoulModelPicker`, `describeNeed` | `AgentAllow` | models empty, models picked, none granted, some, all, update (new ones flagged), unsupported (disabled with reason), busy, phone = full height, 40 px targets |
| Forge panels | agent in the Forge | `Mover` | grip handle + `useSortable` | idle, dragging, drop target, phone |

Phone (390 px): the Allow dialog is full height with the button pinned at the bottom; switches 40 px; no hover-only help.

## Order of work in the branch
1. check texts, 2. usage, 3. last set + notes switch, 4. Allow dialog, 5. drag.
Each part has a pure helper with a test; engine plugin changes have tests on a fake `fsx`.

## Compared (2026-11-01, browser check on a throwaway engine, mock model; dark, light, 1280 and 390 px, en and uk)
- **Agent sets, header / save / delete**: as planned. "Used by N chats" counts the chats that follow the set (seeded: Lite 2); the save confirm appears only when N > 0 and the items changed; the delete confirm adds one count line (the first draft repeated the delete body, shortened).
- **Chat Agents tab, notes switch**: as planned, chat-level. Default-size `Switch` (the small one was a poor target on a phone). On disk only `show` changes (`{"v":1,"preset":"lite","show":{"scene-recap":"log"}}`), the chat keeps following its set; switching back clears `show`. The row is hidden when no agent of the chat makes notes. While the agent list loads the row is missing and the agent shows its raw id for a moment (seen in uk on a cold load; the same load delay as before).
- **New chat step**: the set is pre-picked from the character's last choice with the hint "Same as your last chat with X". Seen at 1280 dark and 390 light. NOT seen: a remembered set that was deleted afterwards (covered by the unit test of `agentSetMemory`, not in the browser).
- **Allow dialog**: as planned. Models first, then one switch per permission, the footer says "Allowed N of M" and the button "Save N of M". The `llm` row names the model per role ("Sends text to: fast: ..."). Taking a switch on and then changing a model shows the "look again" notice and disables the button until "Looks right". Commit writes `["llm","read:lastReply","show:choices"]`, taking one back leaves two (checked on disk). Phone: full-height dialog, the button 44 px high, switch rows tall enough to hit.
- **Checker texts**: the Forge list names the card, says the fix and keeps the code as a chip (en and uk read well; "Картка «Recap»: вхід без дроту. ...").
- **Drag**: panels reorder with the mouse and with CDP touch events; Up/Down stay. Found and fixed in the check: with a grip plus Up, Down and Delete the panel name box shrank to nothing in the Forge's 320 px column, so the header now wraps and the controls take their own line. Not changed: no auto-scroll while dragging (a drag longer than the visible column needs Up/Down), the lifted card has no placeholder gap.
- **Not checked**: a real model run after an Allow, the Allow dialog of an agent with an unsupported need on a phone, drag on a real phone (only emulated touch), 390 px of the Forge's panel list, light theme of the Forge.
