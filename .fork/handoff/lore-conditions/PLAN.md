# UI plan: lorebook entry conditions (#547)

- Where: Lorebooks page > book > entry panel (`entry-folds.tsx`).
- Key blocks: fold "Only when", where the secondary keys were. Each block is "rule select + key chips"; the separate
  "Logic" row is gone. "Add condition" under them, X per added block, a line at the cap of five.
- Scene: a new sibling fold "Only in this scene" (place, who is there, time-of-day chips, weather, an "except"
  switch once a list has a word, one-tap names from the open chat). Closed summary: "any scene" or what it asks.
- Variants: (A) everything in "Only when": eleven rows, too long; (B) a sibling fold, picked; (C) one list of
  typed condition rows behind a single "+": hides what is possible and differs from the other filters.
- Reused: `Fold`, `SettingRow`, `Switch`, `Select`, `KeyChips`, the tag toggle chips.
- States: empty, filled, except, at cap, no chat (no suggestions), phone.
- Keyword test: "Scene for this test" only for a book with scene conditions. "What fired": one sentence per reason.
