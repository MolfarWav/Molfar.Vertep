# UI plan: #138 + #139 (written before the code, 2026-11-01)

Branch `claude/project-thread-wyvgk0` in both repos. Roleplay PR stays unmerged and the Roleplay version is not bumped.

## Decisions (verified in code, Roleplay main after PR #49)
1. **"Used by N chats": the client chat store, no index file.** `GET /chats` already returns each chat's full meta, `meta.agents` included; `engineChatToUI` drops it. Carry it as `Chat.agents`. Fresh values come from `useAgentsLive.chats[chatId]` (the resolved list, which the chat panel keeps current after each edit), so an edit made this session wins over the list read at boot. Cost: zero extra reads. An index file would need keeping in step with every binding change (chat create, edit, delete, import, sync) and the plugin sandbox is the slow path (#46, #163). What counts: a chat *follows* a set when it has no own copy and its `preset` is the set, or it has no binding and the set is the default. Chats with their own copy are not counted (deleting or saving a set does not touch them).
2. **Last set per character: the newest chat of that character** (store, by `updatedAt`). Its binding gives `preset` (follows or started from), `own: []` with no preset = no agents, no binding = the default. A set that no longer exists falls back to the default. The New chat step opens on it and says why.
3. **Silence notes: one flag `silentNotes` in `agents/settings.json`.** Silences kind `note` only (under the reply, the feed, toasts); choices, panels and prompt inserts are not touched, and the run log keeps everything. Global, not per chat (DESIGN 17.5 proposed a per-chat override; left out, one line in the PR). Two switches on the same flag: Agent sets header and the chat's Agents tab.
4. **Permissions: a page of rows, honest about all-or-nothing.** The runner starts an agent only when every supported need is allowed, so "one by one" means: each need is explained and has its own switch, the agent starts when the last one is on, and turning one off stops it. `POST /agents/grant` already takes a token list, so no plugin change; the client sends the union.
5. **Model roles before the first run:** the role pickers (today in `AgentOwnLimits`, shown only after Allow) move into the same page as the permissions, above the Allow button. The comment's "invalidate the old preview" case: a role does not change the needs list in this runner (one `llm` token), and the page reads the needs from the installed list that every save re-reads, so a stale preview cannot be shown. A test pins that the rows follow `agent.needs`.
6. **Error texts:** one table `code -> sentence + way out`, en and uk, naming the card (`nodeTitle`) where the checker knows it. The stable code stays visible, small, for diagnostics. Plugin adds `nodeTitle` to the errors in `/agents/list` and `/agents/drafts`.
7. **Drag reorder:** the existing `useDragList` (touch: hold to drag, a quick tap is a click) on the panels list and on the widgets list; Up and Down buttons stay as the keyboard and fallback path.

## Screens
### A. Agent sets (canvas board), header
Where: Canvas > Agent sets, under the set picker. Steps: the person is already here.
- Line under the picker: "Used by 3 chats" (or "No chat follows this set"); the default set says "Used by 3 chats, and every new chat".
- Notes switch row: `Switch` + label "Agents' notes in chats" + one-line hint. Off = "Notes are hidden; the Agents line still has them."
- Dirty + in use: amber callout above Save, "3 chats follow this set. Saving changes them at once." Not blocking.
- Delete: existing confirm gets the count in its body ("3 chats follow it and will have no agents").
- States: loading (no line), 0 chats, N chats, default, dirty, phone 390.
- Reuses: `Switch`, `InfoTip`, `useConfirm`, amber callout classes already on this screen.
- Variants for the usage line: (a) text line under the picker (pick: cheap, always visible), (b) badge in the picker options (lost on a phone `<select>`), (c) a list of chat names behind a button (more work, later).

### B. Chat Agents tab and sheet
- Tab: the notes switch as a row under the context line (`AgentsTabContext`), same flag.
- Sheet, sets list: each set shows "N chats"; delete confirm carries the count.

### C. New chat step
- The set select opens on the character's last set when it differs from the default; hint line under it: "Same as your last chat with Name" (+ the default stays one pick away). Nothing changes when there is no earlier chat.

### D. Install: Permissions page
- Where: agent card (sheet) shows a summary and one button "Review permissions (5)"; waiting agents open it by themselves. Opens a `Sheet`/dialog titled "Permissions of {agent}" (full width on a phone).
- Order: 1) what it does (description), 2) Models (role pickers, hint per role, "default" until picked), 3) Permissions grouped Reads / Writes / Shows / Model calls, each row `Switch` + sentence from `describeNeed`, 4) footer: status ("3 of 5 allowed. The agent starts when all are on."), `Allow all` primary, `Done`.
- Update of an agent (new needs): new rows are marked "new" and sit first, as today.
- Unsupported needs: listed last, switch absent, amber text (unchanged).
- States: nothing allowed, partly, all, saving, error toast, phone 390 (rows 44 px, switch hit area 40 px), uk.
- Variants: (a) sheet from the card (pick: same place the person already looks), (b) a new top-level page (more navigation for a once-per-agent job).

### E. Error texts
- Forge check list, draft list, installed card: sentence first (with the card name), code small after it, English original in the title/`details`. Click on a row still selects the card.

### F. Drag reorder
- Panels list and widgets list in the Forge: a visible grip icon on each row (hint that rows move), drag with mouse or after a hold on touch, drop commits once; Up/Down stay.

## Walk-through at done
Screenshots 1280 dark, 1280 light, 390 light (uk once) for A, C, D, E, F; compare with this file line by line in the PR.
