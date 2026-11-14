# Letters and the mailbox: how a character writes to the user outside a chat

Verified at: molfar.vertep-roleplay 91eec33, molfar.vertep 8310b23

## What it does
- A card the user has not played for a while can write one short in-character note. The app picks who is due and asks; the plugin enforces the switch and the limits, and makes the one model call.
- A letter is a file in the plugin's data and shows in the roleplay inbox. It never writes into a chat.
- Off by default. Limits: a per-day cap, a per-card cooldown, one unread letter per card, and a mute list.
- The engine mailbox (`memory/mailbox`) is a separate store for memory proposals. Letters do not use it.

## Owners
- `roleplay:` `plugins/letters/plugin.js`, `writeRoute`: the limits, the model request, saving the letter.
- `roleplay:` `plugins/letters/plugin.js`, `readDay`: today's count, on the UTC day.
- `roleplay:` `plugins/letters/plugin.js`, `hasSouls`: the Soul check for a "nosoul" letter.
- `roleplay:` `plugins/letters/plugin.js`, `dismissRoute`: deletes letter files, keeps the cooldown.
- `roleplay:` `src/lib/letters-core.ts`, `candidatesFor`: who is due, idle chats first.
- `roleplay:` `src/lib/letters.ts`, `runLettersPass`: the client pass that asks the plugin.
- `roleplay:` `src/components/shell/inbox.tsx`, `useInboxRows`, `openLetter`: letter rows; opening one dismisses it.
- `roleplay:` `src/components/shell/needs-you-badge.tsx`, `NeedsYouBadge`: the count pill, red for failures.
- `roleplay:` `src/components/letters/letters-dialog.tsx`, `LettersDialog`: settings and the failure notice.
- `engine:` `src/agent/mailbox.ts`, `queueMail`, `listMail`, `dropMail`: the mailbox store.
- `engine:` `src/agent/memory.ts`, `acceptMail`: how a proposal is accepted into memory.
- `engine:` `src/server/app.ts`, `listMail`: the mailbox routes under `/v1/agent/mailbox`.

## Data
- `letters/config.json` (plugin data root): only fields that differ from the defaults.
- `letters/inbox/<id>.json`: one unread letter `{v, id, characterId, chatId?, why, text, at, model}`.
- `letters/cards/<characterId>.json`: `{v, lastAt, lastWhy, soulAskedAt, muted}`.
- `letters/day.json`: `{day, n}`, letters written on the UTC day.
- Browser localStorage: `rp.letters.fails` (the failure streak), `rp.letters.noask` (cards skipped for a day, or 14 days for has-Soul), `rp.letters.offer` ("Not now").
- Engine `memory/mailbox/<id>.json` holds one `MailItem`; `memory/mailbox/declined.json` holds skipped signatures.

## When a model is called, and what limits it
- The plugin calls the model only after its limits pass: switch on, card not muted, no unread letter for the card, fewer than `perDay` letters today (default 3, range 1 to 10), and the card's last letter older than `perCardDays` (default 30, range 7 to 180).
- Idle candidates need `idleDays` (default 14, range 7 to 90). A "nosoul" letter is written once per card.
- Model: the config's model, else the Litopys model, else the app's model. With none, the reply is `no-model`.
- Request: a fixed system prompt for 2 to 4 sentences, `max_tokens` 400, temperature 0.8. Card fields are cut to 700 characters each. An idle letter adds the chat summary (1200 characters) and the last 5 messages (600 each).
- Reply: fences, quotes and a JSON wrapper are stripped. It must be 12 to 700 characters, or the reply is `bad-reply`.
- The client pass runs 20 seconds after start and every 2.5 hours while the page is visible. It asks at most 6 cards.

## Flow
1. A day passes and the app's pass runs. `runLettersPass` reads `GET /letters` and builds the candidate list with `candidatesFor`.
2. For each candidate, the client posts `/letters/write`. The plugin checks the limits. A card refusal sets a skip for that card (24 hours, or 14 days for has-Soul); `off`, `daily`, `no-model` or `error` stops the pass.
3. On success the plugin writes the letter file, sets the card's `lastAt`, and adds one to today's count. The client clears the streak and shows a toast with an Open action.
4. The user opens the inbox. A letter row shows its text. Opening it dismisses it and goes to the old chat, a new chat with the card, or the card's Soul tab. The mute button calls `muteCard`, which also deletes that card's unread letters.
5. Dismissing calls `POST /letters/dismiss`. It deletes the files and leaves the cooldown in place.
6. Three passes fail. A pass that asked a card and got `error`, `no-model` or `bad-reply` adds one to the streak. At `FAIL_AFTER` (3) the streak shows as a red failure row and in the Letters dialog (`letters-failing`). A letter, a new model, or switching letters off clears it. A pass that asked nobody, or was refused only for card reasons, leaves it as it was.

## How another feature could deliver through this
- Letters is not a general channel. The plugin accepts only `why` = `idle`, `unplayed` or `nosoul`. A new kind needs changes in the plugin and in `letters-core.ts`.
- A new roleplay feature would write its own store and add its own row kind in `inboxRows` (`src/lib/attention-core.ts`).
- A plugin cannot reach the engine mailbox. Its manifest grants only `routes`, `llm` and `fs`. An engine feature calls `queueMail` with a `MailDraft` of kind `skill`, `add`, `replace` or `retire`, and a `from` value.
- Nothing may write into a chat.

## If you change X, also touch Y
- Adding a letter `why`: `WHYS` and `buildLetterRequest` in `plugins/letters/plugin.js`; `LetterWhy`, `candidatesFor` and `CARD_REFUSALS` in `src/lib/letters-core.ts`; `openLetter` in `src/components/shell/inbox.tsx`. Then the tests below.
- Changing a default limit: `DEFAULT_CONFIG` in `plugins/letters/plugin.js` and `DEFAULT_LETTERS_CONFIG` in `src/lib/letters-core.ts` both hold the same values. Change both, and the ranges in `cleanConfig`.
- Changing the streak: `FAIL_AFTER` and `MODEL_FAILURES` in `src/lib/letters-core.ts`; the streak tests.
- Changing the helper names: the `expandNames` copies (`plugins/letters` is one of five) listed in `docs/COUPLINGS.md`.
- Changing mailbox item kinds: `MailItem` and `valid` in `src/agent/mailbox.ts`, `acceptMail` in `src/agent/memory.ts`, and the preview in `listMail` in `src/server/app.ts`.

## Traps
- The premise that the engine mailbox holds letters or finished chats is wrong. Its kinds are `skill`, `add`, `replace` and `retire`. Roleplay has no reference to `/v1/agent/mailbox` or `queueMail`.
- The failure streak lives in the browser's localStorage, not on the server. Another browser does not see it.
- The day cap counts only letters that were written, on the UTC day. A failed pass does not use up the cap.
- The plugin's Soul check (`hasSouls`, the card file) and the client's (`soulsOf`) can disagree. The plugin decides.
- `dismissLetters` keeps the cooldown, so a dismissed card waits. Opening a letter also dismisses it.
- `{{user}}` stays raw in unplayed and nosoul letters on purpose (`docs/COUPLINGS.md`).
- `docs/COUPLINGS.md` has no Letters section. Letters appear only under "Names in helper requests".

## Tests that guard it
- `roleplay:` `test/rp-letters-plugin.test.ts` (config, limits, write route, dismiss, helpers)
- `roleplay:` `test/rp-letters-core.test.ts` (candidates, `lettersOf`, inbox rows, offer card, failure streak)
- `roleplay:` `test/rp-helper-names.test.ts` (the letter request carries the card name)
- `engine:` `test/mailbox.test.ts` (store, Later and Skip, accept, routes, skills)

## Not verified
- The badge arithmetic in `inboxRows` (`src/lib/attention-core.ts`). I read only its signature and the test titles.
- The host side of `__llmPending` in `src/plugins/runtime.ts`. I read only lines 918 to 935 and 998 to 1020.
- The `/v1/apps/roleplay/` route prefix. It comes from the plugin's header comment.
- Who sets `from: "unanswered"` beyond `src/agent/memory.ts`.
- The Letters UI components beyond their names and the lines I grepped.
