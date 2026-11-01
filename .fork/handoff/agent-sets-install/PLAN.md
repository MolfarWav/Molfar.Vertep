# Agent sets and install screen: #138 + #139 (one Roleplay branch)

Status: researched, no code yet (2026-11-01). Written because the thread that did #132 grew too long to carry a UI job.
Start a fresh thread: read `CLAUDE.md`, `.fork/STATE.md`, this file. Run skill `ux-review` (plan first), then `browser-check`.
Roleplay code: clone `MolfarWav/Molfar.Vertep-Roleplay` (shallow), branch of the session. Checks: `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`.

## What the issues ask
- **#138** (Roleplay UI + a little plugin data): (1) a new chat with a character starts from the set that character's last chat used, not only the global default; (2) the Agent sets screen says "used by N chats" and warns before deleting or changing a set in use; (3) one switch to silence or allow every agent's notes.
- **#139**: (1) a separate Permissions page, each permission explained and grantable one by one; (2) a model picker for the agent's roles (`agent.models`) on the install screen, before the first run; (3) plain-language texts (en, uk) for the checker's codes, each naming the card it blames and a way out; (4) drag to reorder panels and widgets (Up/Down buttons exist). A comment on #139 adds acceptance cases: changing a model role after the permissions preview must invalidate the old preview; every shown error maps to a card and a recovery action while keeping the stable code.

## Facts read from code (Roleplay main after PR #49; nothing run)
- A chat follows a set through chat meta `agents` (`preset`, own items once changed); `chatAgents(fsx, meta)` in `plugins/agents/plugin.js` falls back to `agents/settings.json` `defaultPreset`. Sets live in `agents/presets/<id>.json`.
- The Agent sets screen is `src/components/canvas/forge/agent-sets.tsx` (pure helpers in `src/lib/agent-sets.ts`, API in `src/lib/agents.ts`); the New chat step picks a set (commit 53077e8); the install/review block is in `src/components/chat/agents-panel.tsx` (around lines 299 to 373; unsupported list, `describeNeed`).
- **#139 item 2 is half done:** `src/components/chat/agent-own-limits.tsx` (`AgentOwnLimits`, commit 3183d4c, Roleplay 4.70.0) already lets the user map a role to a model and set a call limit per agent, but only after install (shown when the agent is not waiting). The job is to bring it before the first run, not to build a picker.
- Checker codes that need a sentence: E_BIND E_BUDGET E_CALLS_MISMATCH E_CYCLE E_DASH_FIELD E_DASH_OF E_DASH_TYPE E_DUP_NODE E_EDGE_DIRECTION E_EDGE_NODE E_EDGE_PORT E_ENVELOPE E_FORMAT_VERSION E_HASH E_ID E_IF_EMPTY E_IF_OP E_IF_OPERAND E_INPUT_COUNT E_NEEDS_MISMATCH E_OUTPUT_COUNT E_PANEL E_PARALLEL_INSERT E_PARAM E_PORT_ID E_REGEX E_REGEX_RISK E_ROLE E_ROUNDS E_SHOW_NOT_ALLOWED E_STATE_FIELD E_STATE_LIMIT E_STATE_OP E_STATE_TYPE E_STATE_UNKNOWN E_TPL_* (done in `panels-form.tsx`) E_TRIGGER E_TWO_WIRES E_TYPE E_UNWIRED E_WIDGET; warnings W_ISLAND W_LIMIT W_UNKNOWN_TYPE. About 40 codes x 2 languages: a cheap-model job (translations), but the mapping code to card and recovery action is design.

## Decisions and risks to settle before code
1. **"Used by N chats" cost.** Counting means reading every chat's meta. A plugin route scanning `chats/*.meta.json` runs in the QuickJS sandbox (about 0.3 s per 150 files by the 0.9.7 measurement; limit 10 s a pass), which is a problem on a large library (#46, #163). Options: (a) a small index file `agents/usage.json` kept up to date when a chat's binding changes; (b) count only on demand when the person opens a set, with a cap and "at least N"; (c) read it from the client's chat store if the list already carries `meta.agents` (not checked). Recommend (a) or (c).
2. **Last set per character.** Source of truth: the newest chat of that character with its own binding. Fallback is the global default. Check the New chat step for where the default is applied.
3. **Silence all notes.** Where it lives: `agents/settings.json` (a flag the runner reads when it shows a note) and a switch on the Agent sets screen header and the chat's Agents tab. Open: does it silence choices and panels too, or only notes (DESIGN section 17.5 says notes)?
4. **Permissions page.** A page or a step in the install flow, with each token explained (`describeNeed` exists) and a grant per token; a changed model role must re-run the permissions preview.
5. **Drag reorder** needs touch support (phone) or it fails the ux-review bar; keep Up/Down as the fallback.

## UI plan skeleton (to finish in the new thread, before code)
Where: Agent sets (Canvas board), chat Agents tab, New chat step, install sheet. For each: states (empty, loading, error, default, changed, disabled, folded/open, phone 390 px), reused components (`InfoTip`, `useConfirm`, `Switch`, `ChatPicker`, the shared Fold from the 4.80 redesign), variants with one-line trade-offs, and the pick. Screenshots 1280 dark, 1280 light, 390 light; compare with the plan line by line.
Order inside the branch: (1) texts for error codes, (2) usage count + delete warning, (3) last set per character + silence switch, (4) install: permissions page + model picker, (5) drag reorder last.
