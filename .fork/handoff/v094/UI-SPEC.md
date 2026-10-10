# 0.9.4 UI round: lorebooks, the "why" view, card links, Data Bank scope

For a builder working in the Roleplay clone `E:\Claude\Chrysalis-Engine\.claude\worktrees\rp-memory`
(branch `lore-v094`, already checked out; do NOT switch branches, do NOT push to `main`). The engine side
is done and tested (`plugins/engine/plugin.js`, `src/lib/engine.ts`, `src/lib/store.ts`); this round is UI
plus the small client glue named below. Read `docs/DATA-FORMATS.md` (Lorebooks section) first: it says
what every field does now.

## Rules
- Match the surrounding code: React + Tailwind + the components in `src/components/ui/`, icons from
  `@phosphor-icons/react`, `useApp` store, `toast`. Container queries (`@container`, `@[26rem]:`) as the
  file already does: the editor lives in a drawer, a page and a phone screen.
- Every new or changed visible string goes through the app's `t()` (`src/lib/i18n.ts`): add the key to
  BOTH `en` and `uk` (natural Ukrainian; `test/rp-i18n.test.ts` fails otherwise). Look at how existing
  components call `t` (e.g. grep `useT\|t('` in `src/components`). Strings you do not touch may stay.
- No engine/plugin changes. If something in the engine looks wrong or missing, write it in your report.
- Icon-only buttons get `aria-label` AND a tooltip (`title` or the app's Tooltip component).
- Commits on `lore-v094`: one per section below (A-I) or a few grouped, style `area: what changed, in plain
  words` + a short body + the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never
  commit `bun.lock`. Push the branch (`git push`) at the end.

## API you use (already built)
- `POST /wi-status {chatId}` -> `{fired, skipped, blocked, usedChars, budgetChars, scanDepth, contextTokens}`.
- `POST /wi-test {text, books: [EngineLorebook], chatId?}` -> `{fired, skipped, blocked, usedChars, budgetChars}`.
  Build `books` with `lorebookToEngine(book)` from `src/lib/engine.ts` so unsaved edits are tested.
- Row shapes (add these types to `src/lib/engine.ts`, replace `WIStatusRec`/`WIStatus`, add a `wiTest()` next
  to `fetchWIStatus` using the same `j` helper):
  - fired / skipped row: `{book, uid, title, chars, constant, position, sticky?, via: 'key'|'constant'|'sticky'|'vector',
    key?, secondary?: string[], score? (vector), pass: number, depth: number, probability?: number, group?: string,
    reason?: 'budget' (skipped rows only)}`
  - blocked row: `{book, uid, title, reason, detail?, key?, secondary?, winner?}` with reason one of
    `delay` (detail = message number it waits for), `cooldown` (detail = message number it ends),
    `recursion_delay` (detail = level), `non_recursable`, `secondary` (detail = logic, key = the primary hit),
    `probability` (detail = %), `group` (detail = group name, winner = title), `character` (detail =
    'not listed' | 'excluded'), `trigger` (detail = comma list of generation types).
- Store: `deleteCharacter(id, { withBook })`, `deleteLorebook(id)` (now also unlinks the id from cards and
  personas), `updateCharacter`, `updateLorebook`, `addLorebook`, `updateDataBankFile(id, patch)` (PATCH; the
  engine accepts `scope` + `scopeTargetId`), `uploadDataBankFile(name, content, scope)`: extend it with a
  `scopeTargetId` argument and send it in the POST body (the engine reads `scopeTargetId`).
- Book types: `LoreEntry` has new `uid?`, `wordFormsOverride: boolean | null`, `extra?`,
  `delayUntilRecursion: boolean | number`; `Lorebook.settings` has `wordForms?: boolean` (absent = on) and
  `minActivationsDepthMax?: number`. Links between cards and books live ONLY on the character
  (`embeddedLorebookId` = its own book, `linkedLorebookIds` = more books). `Lorebook.linkedCharacterIds` is
  dead: stop showing it anywhere.

## A. Book list (master pane, `lorebooks-view.tsx`)
- Each row: name, Global icon (tooltip "In every chat"), entry count, and who uses it computed from the
  characters: "Own book of Aria" / "Used by 3 cards" / "Not linked" (muted). Drop the old "N linked".
- A search box above the list when there are more than 8 books (filters by name).

## B. Book header and settings
- Header: name input, Global switch (label + tooltip), token total, then labelled buttons: "Test keys"
  (opens E), "Settings", "Used by" (popover: the cards using it with an Open button each, which opens that
  character's editor; empty state "No card uses this book"), Duplicate and Delete (icon + tooltip).
- Settings panel, grouped with a one-line hint under each control (hint texts: write them short and plain):
  - Scanning: Scan depth (messages scanned), Include names ("Name: text" is scanned), Case sensitive,
    Whole words, Word forms (NEW, `settings.wordForms`, default ON when absent: "Ukrainian and Russian keys
    match every form of the word"), Recursive scan, Max recursion, Min activations, Min activations max
    depth (NEW `minActivationsDepthMax`, 0 = whole chat; show only when Min activations > 0).
  - Budget: Context %, Budget cap, Overflow alert.
  - Order: Insertion strategy with the three options explained (Character first: this card's books first;
    Global first; Evenly: by order only).
  - Groups: Group scoring ("in a group, the entry whose keys hit most wins").
  - Format template (keep the existing block; drop the "Diagnose chat" button, Test keys replaces it).

## C. Entry list
- Toolbar: search (title, keys and content; case-insensitive for keys too: today `k.includes(q)` is
  case-sensitive), filter chips: All / On / Off / Constant / Keyed / Vector / "No keys" (keyed entries with
  no keys: they never fire), sort (Order, Title, Tokens, Priority = order high first, Trigger %), Open all /
  Close all, "+ Entry".
- Row (collapsed): status icon, title, up to 3 key chips (+N), small badges only when set: position short
  label (e.g. "before char", "@4 depth"), probability % (<100), sticky/cooldown/delay (icon + number,
  tooltip), group name, filters (a funnel icon when any character/tag/trigger filter is set); tokens; the
  enable switch. On 390 px: two lines, nothing cut, no sideways scroll.
- Bulk (when rows are selected): Select all visible, Enable, Disable, Make constant, Make keyed, Copy to
  book…, Delete (confirm dialog with the count).

## D. Entry editor (expanded row)
- Basics first, always visible:
  - Title; Status as plain words: "Keyed" (normal), "Always on" (constant), "By meaning" (vectorized).
  - Keys: the existing comma input is fine; hint under it: "Ukrainian/Russian: one base form is enough
    (вежа also finds вежі, вежу)". Regex keys switch stays next to it.
  - Content (taller: rows 5, grows), token count.
  - Position with human labels for the 7 engine positions: Before character, After character, Before
    examples (`before_em`), After examples (`after_em`), Top of author's note (`before_an`), Bottom of author's
    note (`after_an`), In chat at depth (`at_depth`, then Depth + Role). Do not offer `before_examples` /
    `after_examples` (same place as `_em`; an entry that has one shows as the `_em` label).
  - Order (hint: "higher = later in the prompt and wins the budget").
- "More options" (collapsible, closed by default; it remembers open/closed per session):
  - Secondary keys + logic with words: "and any of" (AND_ANY), "and all of" (AND_ALL), "but none of"
    (NOT_ANY), "but not all of" (NOT_ALL).
  - Trigger %: BUG to fix: editing it must also set `useProbability: value < 100` (today the value is
    never sent because `useProbability` only changes on load).
  - Timed: Sticky, Cooldown, Delay (in messages, hints).
  - Group: name, weight, "Prioritize in group", Group scoring override (tri-state: book default / on / off).
  - Recursion: "Not triggered by other entries" (nonRecursable), "Does not trigger others"
    (preventFurtherRecursion), "Waits for recursion level" (number; 0 = off; writes `false` for 0, the
    number otherwise).
  - Matching overrides, each tri-state "book default / on / off": Case sensitive, Whole words, Word forms
    (`wordFormsOverride`); Scan depth override (number, empty = book).
  - Filters: Characters (multi-select of the app's characters, stores their ids; show names) + "Exclude
    them instead" switch; Tags (chips picked from all card tags); Generation types (checkboxes: normal, continue,
    impersonate, swipe, regenerate, quiet; none checked = all).
  - Also scan: description / personality / scenario / persona (existing checkboxes), Ignore budget,
    Automation id.
- Actions row: Copy to book, Duplicate, Delete entry.

## E. Keyword test (replace `KeywordTest`)
- Dialog (full-screen sheet on phones): a textarea "Paste a message", an optional "Use chat" select (none by
  default; lists chats, gives timed state and the card for filters), and live results 400 ms after typing
  stops: `wiTest({text, books: [lorebookToEngine(book)], chatId})`. Results with the rows of F. Empty text:
  a short hint, no request.

## F. The "why" rows (one shared component, e.g. `src/components/lore/why-rows.tsx`)
- Fired rows: title (+ book name muted), a "why" line: `key "вежа"` (+ `and "маг"` for secondary hits) /
  Always on / Sticky / By meaning 0.42; extras when present: "recursion pass 2" (pass > 0), "found deeper,
  at message depth 7" (depth > the base scan depth: the response's `scanDepth` is the deepest used; show it
  when a row's depth > the book scan depth), "30% chance" (probability), "won group towers", position label,
  tokens (chars / 4).
- Skipped (budget) rows: "cut by the budget".
- Blocked rows (muted), reason in words: waits until message N / cooling down until message N / waits for
  recursion level N / not triggered by other entries / secondary keys failed (all of) / lost the N% roll /
  lost group X to Y / filtered: speaker not listed / speaker excluded / only on: continue.
- Used in three places: E, the lorebooks "Active" viewer (`ActiveEntriesViewer`), and the chat's
  "Lorebook activity" panel (`src/components/chat/chat-view.tsx` ~l.1120). Header line in the two status
  views: used ~N of ~M tokens budget, context N.

## G. Character editor, Lorebook tab (`src/components/views/character-editor.tsx` ~l.355)
- One list "Books of this character":
  - the own book (if any): name, entries, buttons Open (go to Lorebooks with it selected: find how the app
    navigates between sections, e.g. the store's section/page state), Replace… (pick another book to become
    the own book), Unlink (sets `embeddedLorebookId: null`; the book stays in the library).
  - linked books: name, entries, Open, Unlink.
  - "Add a book…" picker: every book not attached yet (embedded books of other cards included).
  - "New book": creates "<card name> lore" with `addLorebook` + `updateLorebook(name)`, becomes the own book
    when there is none, else linked.
  - A muted line: "Plus N global books in every chat" when there are global books.

## H. Deleting a character (`characters-view.tsx` ~l.454 and the batch delete ~l.483; any other delete)
- When the character has an own book that no other card uses, the confirm shows a checkbox "Also delete
  its lorebook “<name>”" (on by default); pass `{ withBook }`. Shared books: no checkbox, a muted note.

## I. Data Bank tab (`src/components/extensions/data-bank-tab.tsx`)
- Upload: a scope select next to Upload: Everywhere / A character… / A chat… (the second control picks the
  target from the characters / chats lists). Each file row shows its scope ("Everywhere", "Aria", "Chat:
  <title>") and lets the user change it (PATCH `{scope, scopeTargetId}`).
- "Search the bank": an optional chat select; it calls `GET /databank/search?q=…&chatId=…` (the engine
  filters by that chat's scope) and shows each hit's file name, chunk number and score.

## Checks (all before you report)
- In the clone: `bun run typecheck` clean, `bun test test/` all pass.
- Browser check with the engine's skill `E:\Claude\Chrysalis-Engine\.claude\skills\browser-check\SKILL.md`
  (read it whole; run from `E:\Claude\Chrysalis-Engine`). Windows notes from earlier rounds: copy the clone
  into `$DATA/apps/roleplay` (robocopy, with node_modules), open it through the shell's app card and wait up
  to ~2 min for the first build; the app's language/theme come from `$DATA/apps/roleplay/data/settings.json`
  (`ui.language`, `ui.themeMode`); `pw.mjs` may hard-code a Linux Chromium: use the installed Chrome with
  `playwright-core` (`CHROME_PATH`). Scripts and screenshots go in your scratchpad, never in the repo.
- Seed through files in `$DATA/apps/roleplay/data/`: a card "Олена" with an own book (5+ entries: one
  constant, one with a Ukrainian key "вежа", one with a secondary key, one with a character filter, one
  `before_an`), a second card, a global book, a chat with Олена whose messages mention "вежі".
- Flows to prove (screenshot each; dark 1280 px unless said; plus light and 390 px for the lorebook editor
  and the keyword test):
  1. Book list with "Own book of Олена" and the global book.
  2. Settings panel grouped, Word forms on.
  3. Entry list with filter chips and badges; a "No keys" filter hit.
  4. Entry editor: basics + More options open; Trigger % set to 30 -> the file on disk has `probability: 30`.
  5. Keyword test: paste "Ми біля вежі" -> the entry fires with `key "вежа"`; a blocked row with a reason.
  6. Active viewer and the chat's Lorebook activity show the same rows.
  7. Character Lorebook tab: own + linked + Add + Unlink; after Unlink the card file on disk has no id.
  8. Delete a character with the checkbox -> its book file is gone; the other card's links are intact.
  9. Data Bank: upload a text with scope "A chat"; search with that chat selected finds it, with another chat
     it does not.
- Report: what you built per section, commits, every screenshot path, the on-disk read-backs, anything you
  could not do or doubt, and engine problems you noticed.
