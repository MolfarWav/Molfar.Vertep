# 0.8.1 item 2: "Story, move" (one-time nudge from the dashboard's open threads)

Roleplay app (fork MolfarWav/Molfar.Vertep-Roleplay), clone `.claude/worktrees/rp-dashboard`, branch `v081`.
Goal: the user complained the story only reacts. A button by the composer makes the NEXT reply move the
story on its own, pulling on the dashboard's open threads (all of them, or one the user picks).
The nudge rides the model request only. It is never written into the chat file, never shown as a message.
No engine change: it must work on engine 0.8.0 (the app updates separately from the engine).

## Data

File `dashboard/nudge/<chatId>.json` (under the plugin fs root, like `dashboard/notice/`):

```json
{ "v": 1, "threadId": "t3", "at": 1767600000000 }
```

- `threadId`: an id of an OPEN thread from `effectiveThreads(overlay, snap.threads, snap.turn)` (`t*` sensor
  thread or `ut*` user thread), or `null` = all open threads.
- One pending nudge per chat. Arming again replaces it.
- Expires 30 minutes after `at` (`NUDGE_TTL_MS`): an expired file is ignored by the hook and by the view, and
  removed by the hook when it sees it.

## Plugin (`plugins/relations/plugin.js`)

Routes (add to the `handleRoute` if-chain, document them in the header comment at the top of the file):

- `POST /dashboard/nudge {chatId, threadId?: string|null}`
  - 400 on a bad chatId (`CHAT_ID`), 404 when the chat has no dashboard state is NOT required: the nudge
    works without threads too (see the prompt below).
  - `threadId` given: must be an open thread of the current view (overlay applied); otherwise 409
    `{error: "thread not open"}`.
  - Writes the file, answers `{ok: true, nudge: {threadId, at}}`.
- `DELETE /dashboard/nudge?chatId=` removes it, answers `{ok: true, nudge: null}`.
- `stateView` gets `nudge: {threadId, at} | null` (expired = null), so the UI shows the armed state after a
  reload. Reading only: `stateView` and `buildInsert` never remove anything.

Hook (`llmRequest`):

- Applies on `turnOf(ctx).op` in `send`, `next`, `swipe`. Never on `impersonate` or `continue`
  (continue extends a reply; impersonate writes the user's line). Unknown/missing op (older engine with no
  `turn`): apply, like `send`.
- Applies even when `injection.enabled === false` (the user asked for it explicitly). Restructure the early
  return: the insert part keeps its current rules; the nudge part runs independently.
- Consumption: when applied, remove the file (`fsx.remove`). A failed or aborted reply loses the nudge; the
  user arms it again. Accepted trade-off (the hook cannot see the outcome).
- Placement: the END of the request, so it weighs on this reply:
  - if the last message has role `user` and string content: a copy of it with `"\n\n" + nudgeText` appended;
  - otherwise (empty send, `next`, swipe of the last reply): push `{role: "user", content: nudgeText}`.
  - Never mutate `req.messages` or its objects (copy).
  - When both the insert and the nudge apply, return one `{messages}` with both.
- Text: prompt key `nudge` in `DEFAULT_PROMPTS` (config keeps only a changed value, like `soul`; add a
  textarea field next to the soul prompt in the plugin panel, label "Story, move prompt", advanced).
  Default (English, the reply's language is already set elsewhere):

  ```
  [For this reply only: do not just react to the last message. Let the world or another character act on their own and make something concrete happen that moves the story forward{threads}. Stay in character and in the scene; never mention this note.]
  ```

  `{threads}` is replaced by:
  - one picked thread: `, pulling on this open thread: <text>`
  - all, with open threads: `, pulling on one of these open threads: <t1>; <t2>; <t3>`
  - no open threads (or no dashboard state): empty string.
  A custom prompt without `{threads}` gets nothing substituted (the user chose that).
- Thread text: `str(t.text)` cut to 300 chars, as the insert does; no ids, no digits added by code.

Tests (`test/rp-dashboard.test.ts`, new `describe("story, move (nudge)")`, use `mockHost`, `drive`, `ask`,
`withState` helpers already there):

1. POST arms (file written, view.nudge set), DELETE clears, a non-open threadId answers 409, a bad chatId 400.
2. Send with a nudge for all threads: the last user message ends with the note listing open thread texts;
   the request's own array and message objects are unchanged; the file is gone afterwards.
3. One picked thread: only its text appears.
4. Empty send / `next` (last message is the assistant's): a trailing user message carries the note.
5. `impersonate` and `continue`: no note, file kept.
6. Injection off: the note still applies, the insert does not.
7. Expired file (at older than 30 min): ignored and removed; view.nudge null.
8. No dashboard state for the chat: the note applies without `{threads}` text.
9. Custom `nudge` prompt in config is used; a config equal to the default is not stored.

## UI (src/)

- `src/lib/dashboard.ts`: `DashView.nudge?: {threadId: string | null; at: number} | null`; helpers
  `armNudge(chatId, threadId|null)` (POST) and `clearNudge(chatId)` (DELETE) returning the new nudge.
- New `src/components/chat/story-nudge.tsx`, mounted in `composer.tsx` in the controls row, just left of the
  send/stop button. Visible only when `useDashMaybe()` is non-null and its status is `ready` or `empty`
  (status `absent` = no plugin: hide).
- Look: a split button. Main part: icon `Wind` (lucide-react) + label "Story, move" from `md` up, icon only
  below. Chevron part opens a DropdownMenu (same menu component as the composer's `+` menu):
  - "Any open thread" (= all);
  - one item per OPEN thread (text, one line, truncated, full text in `title`), user threads (`by: 'user'`)
    marked with the existing "yours" label style;
  - when there are no open threads: a disabled line "No open threads: something new will happen".
- Behaviour of a click (main part = all; a menu item = that thread):
  - Composer EMPTY and not streaming: arm, then send right away (`sendMessage(chatId, '', ...)`, the same
    empty send the send button does). One click = the story moves now.
  - Composer has text: arm only; the nudge rides the user's next send.
  - While streaming: disabled.
- Armed state (from `view.nudge`, updated from the POST answer at once): the main part gets the accent/CTA
  style, and a small chip above the input row: "Next reply moves the story: <thread text | all open threads>"
  with an × that calls `clearNudge`. After the reply the dashboard reloads (existing `onDashReload`) and the
  chip disappears with `view.nudge = null`.
- Errors: toast with the existing toast helper, text "Could not set the nudge".
- Phone (390 px): the same row; icon-only split button; the chip wraps to one truncated line.
- i18n (`src/lib/i18n.ts`, `en` and `uk`, no grammatical gender in uk):
  - `dash.nudge.button` "Story, move" / "Історія, рухайся"
  - `dash.nudge.tooltip` "Make the next reply move the story on its own" / "Наступна відповідь сама зрушить історію"
  - `dash.nudge.pick` "Push a thread" / "Штовхнути нитку"
  - `dash.nudge.any` "Any open thread" / "Будь-яка відкрита нитка"
  - `dash.nudge.none` "No open threads: something new will happen" / "Відкритих ниток немає: станеться щось нове"
  - `dash.nudge.armed` "Next reply moves the story: {what}" / "Наступна відповідь зрушить історію: {what}"
  - `dash.nudge.all` "all open threads" / "усі відкриті нитки"
  - `dash.nudge.cancel` "Cancel" / "Скасувати"
  - `dash.nudge.error` "Could not set the nudge" / "Не вдалося задати поштовх"

## Docs

- App `docs/` or `data/README.md` wherever `dashboard/notice/` is listed: add `dashboard/nudge/<chatId>.json`
  (one pending "Story, move" nudge, removed when used, 30 min TTL).
- `CHANGELOG.md` of the app, Unreleased: one user-facing line.

## Checks

- `bun run typecheck`, `bun test test/` (all pass except the known old failures, if any: report them).
- Browser check (skill `browser-check`, throwaway engine + mock model, never the user's data): 1280 dark uk,
  1280 light en, 390 light uk. Flows: arm with text then send (the mock's received request ends with the note;
  the chat file has no note); empty composer click = immediate reply; pick one thread; cancel via ×;
  no-threads menu line. Screenshots into the session scratchpad.
