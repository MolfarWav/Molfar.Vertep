# 0.9.2 item 3: chat links (backstory) and the map of one chat

Decided with the user 2026-10-09 (PLAN.md item 3). Roleplay-only, in the Litopys plugin
(`plugins/litopys/plugin.js`) and the Library UI (`src/components/library/chats-map.tsx`).

## Data: `litopys/links.json`
```json
{ "v": 1, "links": { "<chatId>": { "from": "<earlier chatId>", "at": 1791527976692 } } }
```
- Keyed by the LATER chat: a chat has at most one predecessor ("continues"), an earlier chat may
  be continued by several (chain + branches).
- Written only by `POST /litopys/links`; read by the insert, `GET /litopys/chats` and the map.
- A link to a chat that no longer exists is ignored when read (and dropped on the next write).
- Message forks (`meta.parentChatId`, engine-made) are NOT stored here: the map draws them from
  the chat list, dashed.

## Routes
- `POST /litopys/links {chatId, from}`: set the predecessor of `chatId`; `from: null` removes it.
  Refused (400): unsafe ids, `from === chatId`, either chat missing or temporary, a cycle (walking
  `from`'s chain back reaches `chatId`). Answers `{ links }` (the whole map).
- `GET /litopys/chats`: each item gains `continues: <chatId> | null`.

## Backstory in the model request (llmRequest)
- When the chat has a predecessor, a second system block goes after the leading system block and
  BEFORE the chat's own Litopys insert (it is the older story): `[Backstory (Litopys): the earlier story this chat continues ("<title>"). Background
  only: do not retell it, do not contradict it.]`
- Built from the predecessor's Litopys file as it is now (edits there show at once), never copied.
  Content and fill order (whole items, stop a group at the first that does not fit):
  1. pinned active facts known to all or to a name present now, and world facts;
  2. the predecessor's LAST chapter (where the new chat starts);
  3. key-weight active facts (`weight: "key"`), newest first;
  4. fresh arcs, then chapters no fresh arc holds, newest first; rendered in story order.
- It applies from the new chat's FIRST reply: a chat with no Litopys file or no messages yet still
  gets the backstory (today llmRequest returns early there; the backstory must not).
- "Present" for the fact filter: the names of the new chat's recent messages + the speaker + the
  user's name, as buildInsert does without a dashboard snapshot.
- Budget: config `linkBudget` (default 800 tokens, 0 = off, clamp 0..3000), separate from `budget`.
- Chain: only the direct predecessor is read in this step (its own predecessor's story reaches the
  new chat only through what the middle chat's memory kept). Revisit if the user asks.
- `litopys/insert/<chatId>.json` gains `backstory: { from, tokens, facts, chapters }` (the
  inspector and the Library show it).

## Map of one chat (UI)
- The map button in the Library opens the map of the SELECTED chat (no chat selected: the button
  is disabled with a hint).
- Nodes: the chat, its chain back (predecessors via links, parents via forks), its branches
  forward (chats that continue it or were forked from it), each with its sphere (size by chapters,
  title, counts). Solid line = backlink (continues), dashed = message fork.
- "Continues from…" field above the map: search the chat list by title or character (the same
  data as GET /litopys/chats); picking one places its sphere, draws the line and saves the link;
  an existing predecessor shows with a remove (unlink) button. A pick that would make a cycle is
  disabled with the reason.
- Click a node: open that chat's map (the selected chat changes); a second action opens the chat.
