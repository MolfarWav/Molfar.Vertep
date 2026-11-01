# Inbox work: #72 letters from cards, #175 Molfar's mailbox (plan, 2026-11-01)

Owner's answers (2026-11-01): #72 first, #175 after on the same line of work; all three triggers, 14-day threshold;
Litopys' model, a letter writes nothing into a chat; #175 first slice = memory and skill proposals.
Owner's note on #72: letters from cards must differ in colour from every other inbox kind.
Base: Roleplay fork `main` at `fd1419e` (PR #49, merged from another account an hour before this thread; it brings the
agents' Dashboard fields, 4.80.2 + that). Engine `main` = `ca073c3` (1.9.1), unchanged. Roleplay branch
`claude/inbox-issues-175-72-4dbebf` in the worktree `E:\Claude\rp-inbox-letters`.

Swept first: #55 (inbox, closed), #82 (rows dismissable, ghost soul drafts), #134 (closed without an inbox entry for
habits, on purpose), #99 (memory proposals as end-of-run cards), #69/#101 named by #175. Already built and reused:
the inbox drawer with filter chips, `InboxItem`, per-kind switches in `settings.attention`, dismiss by key.

## Part 1: #72 letters from cards (Roleplay)

### What a letter is
A short in-character note, 2-4 sentences, in the language of the chat/card. Three reasons (`why`):
- `idle`: a chat nobody answered for 14 days. The model gets the card (name, personality, scenario, 600 chars each), the
  last 5 messages of the chat's active line (or the Litopys summary when there is one) and writes a reminder plus where
  the story stopped. It invents no events.
- `unplayed`: a card imported 14+ days ago with no chat (`lastChatAt` 0 and no chat). Built from the card only.
- `nosoul`: a card with chats but no Soul, 14+ days after its last chat (a gentle push, in character, never mentions
  "Soul" inside the letter; the row says the reason). Decided in the plugin from `card.json`.
Clicking the row opens the old chat (`idle`), starts a chat for the card (`unplayed`) or opens the card on its Soul
tab (`nosoul`). The letter is never written into a chat.

### Where the code lives
- `plugins/letters/` (new plugin, nothing in `plugins/engine/` changes; `permissions: routes, llm, fs`, no schedule).
  The client drives the passes (the app only runs while open, as the issue says); the plugin owns the data, the limits
  and the model call.
  - `GET /letters` -> `{letters: [...], config}` unread letters, newest first.
  - `POST /letters/write {characterId, chatId?, why}` -> validates (switch on, card not muted, per-card cooldown, per-day cap, no
    unread letter of that card already), builds the request, two-phase `__llmPending`, stores `letters/<id>.json`.
    Answers `{ok, letter}` or `{ok:false, reason}` with a reason code (`off|muted|cooldown|daily|waiting|no-model|bad-reply|error`).
  - `DELETE /letters/<id>`, `POST /letters/dismiss {ids}` (letters are deleted; a dismissed one keeps its stamp in the card's
    cooldown record so the card is not asked again at once).
  - `PUT /letters/config {enabled, idleDays, perDay, perCardDays, model}`; `POST /letters/mute {characterId, muted}`.
  - Files (fs root `data/`): `letters/config.json`, `letters/inbox/<id>.json`, `letters/cards/<characterId>.json`
    (`{lastAt, lastWhy, muted}` per card, the cooldown and the opt-out).
- Model: `config.model`, else Litopys' model (`litopys/config.json` `model`), else the app's default. Reasoning stays off.
- Client: `src/lib/letters-core.ts` (pure: candidate choice, thresholds, row shape; unit-tested), `src/lib/letters.ts`
  (store + passes), `InboxRow` kind `letter` in `attention-core.ts`, `InboxItem`/`FilterChips` in `shell/inbox.tsx`,
  the Characters page "Letters" popover, the switch default OFF (an optional feature).
- A pass: at app start (after the library has loaded, 20 s delay) and every 2.5 h of use while the tab is visible. A pass
  picks at most ONE candidate (oldest idle first, chats before unplayed before nosoul) and makes at most `perDay` calls
  per day over the whole app (checked in the plugin too).

### Limits (defaults, all editable in the popover)
- 3 letters per day over the app; 1 per card per 30 days; never a second while one from that card is unread.
- "Stop letters from this card" on every letter row and a muted list with "Allow again" in the popover.
- Idle threshold 14 days (7-90).

### UI plan (ux-review first)
Where: (1) inbox drawer: a new kind `letter` with its own colour, an envelope icon and a "Letter" chip; (2) a filter chip
"Letters N"; (3) Characters page header: an envelope button "Letters" (outline, not loud) opening a popover with the switch,
the three numbers, the model line ("Litopys' model: X"), the muted list; (4) Home's Waiting block already repeats `InboxItem`.
Colour (owner's note): failure red, Library sky, Soul violet, letter **emerald** (green: calm, not a warning, farthest from red and
blue; amber was dropped because the tone system uses it for "warning"). Badge: letters count in the total but never turn the badge red.
Row: envelope icon, chip "Letter", the card's name, the whole letter (up to 4 lines), time, a bell-slash button "Stop letters from X"
and the X dismiss button. Opening a row reads it: it is deleted and the cooldown stays.
States: switch off (dialog says what it does; nothing in the inbox), no model (dialog warns in red, the pass is silent), a failed write
(no row; the pass stops on a model error and tries at the next pass).
Left out on purpose: a failure item after repeated model errors (a broken model is silent here), the full-text dialog variant B.

## Part 2: #175 Molfar's mailbox (engine, agent page): the shape to build

First slice: memory proposals only (add, replace, retire). Skill proposals use the same item shape later (`kind: "skill"`).
Today `proposeEntry` / `proposeRetire` (`src/agent/memory.ts`) ask a blocking card, and the after-run pass (`memory-suggest.ts`)
shows up to three cards at the end of a long run.
- Store: `memory/mailbox/<id>.json` in the user's workspace (already behind the `memory/` write denylist, so the model cannot forge an
  item with a file tool). `{v, id, kind: "add"|"replace"|"retire", scope, entry?, topic?, match?, from: "after-run"|"later"|"unanswered", chatId?, at}`.
  `memory/mailbox/declined.json`: normalized texts the user skipped, so the same suggestion is not queued again.
- Engine: `src/agent/mailbox.ts` (queue, list, accept = the same write as the card plus a commit, skip = delete + remember, dedupe by
  scope + normalized text, cap 50 items). The after-run pass QUEUES instead of asking. The live card gets a third answer "Later"
  (queues it); a card nobody answered (stopped, closed) is queued, not dropped.
- Routes (shell-only, listed in `test/security.test.ts` and `test/malicious-plugin.test.ts`): `GET /v1/agent/mailbox`,
  `POST /v1/agent/mailbox/accept {id, entry?}`, `POST /v1/agent/mailbox/skip {id}`.
- Agent page: a Mailbox button with a counter beside "Memory and skills"; a panel listing items (scope chip, the text editable before Accept,
  "replaces/removes: <old line>", from-where line), Accept and Skip, "Skip all". No interrupting: a quiet counter only; blocking cards stay
  for destructive actions and protected paths.
- Not in the slice: skill proposals, results of background chats (#69), cost hints (#101), reminders.
Open decisions, defaults taken: no expiry; a skipped proposal is remembered; the mailbox is per user, not per chat.

Parts 1 and 2 share nothing in code (different apps); they share the idea and a colour language.
