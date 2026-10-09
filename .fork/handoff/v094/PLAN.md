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
