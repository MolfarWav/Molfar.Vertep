# 0.9.4: deeper lorebooks (plan agreed with the user, 2026-10-10)

Sources: the user's three write-ups (`lorebook_findings_2026_10.md`, `RP_Hermes/lorebook_memory_findings.md`,
`lorebook-tools-guide.md`), compared with the Roleplay code (`plugins/engine/plugin.js` ~l.700-1140,
`src/components/views/lorebooks-view.tsx`). Result: the scanner already has ST parity (logic, regex keys,
sticky/cooldown/delay, inclusion groups, recursion flags, matchSources, vectors with a cache, budget,
formatTemplate). The gaps below are verified in code. Work happens in the Roleplay fork (clone, branch
`lore-v094`); engine side only for the plan, STATE and the card skill.

User decisions: scope = items 1-4; minActivations is implemented (not removed); word forms are ON by
default for Cyrillic keys (per entry or per book switch to turn off).

## 1. Cyrillic keys (engine part: the orchestrator writes it)
`keyMatch` only does whole-word for `[\w\s'-]` keys, so a Ukrainian/Russian key always matches as a plain
substring: short keys give false hits, inflections ("вежі", "вежу") miss, and `lorebook-craft` makes the
model list every case. `stem`/`sameWord`/`tokens` (cyrillic-text-matching) exist in the same file but only
the memory code uses them.
- Unicode-aware word boundaries for any key with letters outside ASCII.
- Word-form matching for Cyrillic keys through `sameWord` (multi-word keys: every word, any order, like
  `matches`), a book switch `settings.wordForms` (default true) and an entry override
  `wordFormsOverride: boolean | null`. Latin keys unchanged. Regex keys unchanged.
- Update the format reference (`docs/DATA-FORMATS.md`), `.fork/app-skills/roleplay/edit-large-card/SKILL.md`
  and the `lorebook-craft` skill: with word forms on, one base form is enough. Tests: stems, short keys,
  apostrophes, a key that must NOT fire, secondary keys, regex untouched.

## 2. Real keyword test (UI)
The "Keyword test" dialog uses `text.includes(key)`: no logic, secondary keys, regex, recursion, sticky.
Make it call the real scanner on the pasted text (a new plugin route, same code path as
`fetchWIStatus`), and show the same rows as item 3. UI draft by an external model from a precise spec,
browser-checked dark/light/390 px.

## 3. Why an entry fired
`ActiveEntriesViewer` shows only "constant"/"keyed". Add to each fired row: the key that hit (primary and
secondary), the recursion pass, "sticky/cooldown/delay/probability/group winner", and for skipped rows the
reason (budget, cooldown, delay, group loser, probability roll). The plugin returns the reasons; it is also
the data for the inspector item 0e in START.md (lorebook entries with book/entry/why).

## 4. minActivations
Declared in types/store/UI, never read by the scanner. Implement as in ST: when fewer than N entries fired
after the passes, scan deeper into the history (scanDepth + step) until N is reached or the history ends.
Test with a mock chat.

## Later, not in 0.9.4
- Litopys facts/chapters -> lorebook entries export (MemoryBooks idea): needs its own design.
- `@@activate` / `@@dont_activate` decorators and outlets in the importer: only if the user meets such books.

## Round 1 (2026-10-10): the scanner, done
Roleplay fork branch `lore-v094` (clone `.claude/worktrees/rp-memory`, from fork main 4.28.0), commit
`a12512c`, pushed (not main). 823 tests.
- Item 1: Cyrillic keys match every form of their words through `sameWord` over a word index of the
  scan window; a multi-word key is a PHRASE (side by side, in order, each word in any form; user's
  choice 2026-10-10, instead of "any order" above). Words of 3 letters or fewer match exactly.
  `settings.wordForms` (absent = on), entry `wordFormsOverride`. Other scripts get Unicode word
  boundaries; Latin and regex keys unchanged. Skills `lorebook-craft`, `card-import`, DATA-FORMATS
  and `edit-large-card` say: one base form per key. Workspace copies of the skills still to update.
- Item 3 (data): fired rows carry `via` (key/constant/sticky/vector), `key`, `secondary`, `pass`,
  `depth`, `probability`, `group`, `score`; `blocked` rows name `reason` (delay, cooldown,
  recursion_delay, non_recursable, secondary, probability, group + winner) and `detail`; budget
  cuts are `skipped` with `reason: "budget"`. Probability is rolled once per activation, never in
  dry runs.
- Item 2 (engine part): `POST /wi-test {text, books | bookIds, chatId?}`, dry run on the pasted text.
- Item 4: minActivations deepens the scan (<= ~50 rounds, `minActivationsDepthMax`).
- Fixed: book caseSensitive/wholeWords/vector threshold never applied (read from the name string);
  the app adapter dropped unknown/imported entry fields and renumbered uids on every save.

## Added by the user 2026-10-10 (for the UI round)
- Binding = ONE source of truth on the character (`studio.embeddedLorebookId` +
  `linkedLorebookIds`): the card's Lorebook tab lists its books (own book: replace / unlink / open;
  add any other), the book shows a computed "used by" list; `Lorebook.linkedCharacterIds` goes.
- Rework the lorebook UI: entry list (search, filters, sort, compact rows with keys and status),
  entry editor (basics first, the rest under "More", hints), phone layout (390 px).
- Check how a book binds to a chat and how it reaches the prompt; is a "chat book filled from the
  chat" replaced by Litopys? (findings below).
- Data Bank: research by an external model (`data-bank.md` in this folder).

## Findings (Sonnet read-only pass + checks by the orchestrator, 2026-10-10)
Verified in code by the orchestrator: [v] ; from the report only: [r].
- [v] The scanner never reads `characterFilter`, `characterFilterExclude`, `tagFilter`,
  `triggerFilters`, `formatTemplate`, `insertionStrategy`, `includeNames` (one grep hit:
  automationId in the export). The editor offers them and DATA-FORMATS promises them.
- [r] Positions before_em/after_em/before_an/after_an/before_examples/after_examples all land in
  `before` (worldInfoBefore). A preset without the worldInfoBefore/After marker drops those entries
  silently; a marker with its own content replaces the WI text.
- [r] Group chats scan only global + persona books: the group pseudo-character has no books, the
  members' books are not in scope (engine.ts groupToCharacter, store.ts scopeBookIds).
- [r] meta.lorebookIds is PATCHed only when the derived set is non-empty (or an empty chat): unlinking
  the last book of a chat with messages leaves the old scope firing.
- [r] Persona books are merged by the engine but not in the client scope, so Litopys and relations
  (they read meta.lorebookIds) miss them.
- [r] No per-chat book UI; nothing writes lorebook entries from the chat. Litopys keeps its own
  per-chat record (chapters, facts, arcs) in data/litopys and injects it through the llmRequest hook:
  it is the "chat book", but not a lorebook (no keys, no editor). The "Litopys -> entries" export
  stays in "Later".
- [r] Card export (PNG/JSON) never writes `character_book`: exported cards lose their book.
  Deleting a character orphans its embedded book; deleting a book leaves dangling ids on cards.
