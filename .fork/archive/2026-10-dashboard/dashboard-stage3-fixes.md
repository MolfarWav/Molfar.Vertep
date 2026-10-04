# Dashboard stage 3 ("Soul" tab): fixes from the 4th live test (2026-10-04)

Start here in the next session, before stage 4. Context: `.fork/STATE.md` item 0 (stage 3 rounds,
commits up to Roleplay clone `8673434`, all copied to the desktop workspace), contract
`docs/SOUL.md` in the Roleplay clone `.claude/worktrees/rp-dashboard` (branch `dashboard`, local).
The desktop runs the engine with `Molfar-Vertep.bat dev dashboard`.
Working pattern that held up: contract first (me), plugin part to a cheap agent (Haiku) with a
precise spec, UI part to the Sonnet agent with a browser check on a throwaway engine (ports
8796/8797, local Chrome via playwright-core), then my review of every diff (Haiku twice got the
core rule wrong: read its code, not its report), tests, commit, copy to the workspace only after
checking each file still equals the last copy.

## What the user reported (verbatim points, then my reading)

1. **Kind badges in different colours** (Single, Narrator, Group, AI assistant, Other: one colour
   each; today all are the theme accent). And the AI should set the kind by itself: the rating
   already returns `cardType`; today it lands only with "Accept all". Proposal: when a proposal
   carries `cardType` and the card has no kind, the editor applies it at once (the editor is the
   only card writer); also tune the rating prompt so `cardType` is always given.
2. **"was N" marks show too early.** They appeared right after "Rate now", i.e. for every proposal
   at once. The user expects them only after consulting (Molfar / the rating) — clarify with the
   user: probably show the comparison only when the user opens a proposed soul (Review or a chip
   click), not as an automatic overlay of every chip.
3. **Save does not stick on the narrator card ("Yes, My Liege"): the souls stay "update"
   forever.** Only that card. Hypotheses to check first:
   - the proposal file keeps the model's raw keys (Cyrillic "Медли"/"Т'Ша") while GET re-keys
     them to "Medli"/"T'Sha"; Save then calls `DELETE ...&accepted=1&name=Medli`, which looks for
     the exact key in the FILE and finds nothing, so the name never leaves the proposal. Fix:
     re-key on DELETE too (resolve the name through `rekeyToCard`/`soulOf` against the file's
     keys), or rewrite the file re-keyed when it is read for a write.
   - or the chip state compares the working copy with the proposal and never settles.
4. **Save writes the OLD values** when the "was" marks are showing (example: Marianne). The form
   shows the proposed values (overlay) but the working copy saved is still the saved soul.
   Check `soul-tab.tsx`: Save must take what the form shows (overlay applied to the working copy).
5. **"Rate with Molfar" can send all souls by mistake.** The top button builds a draft for every
   name, including minor ones and the narrator itself (the draft listed "Yes, My Liege", "Kefka",
   "стражник"). Fix: the draft never lists the card's own name when the kind is narrator, the
   card's `minor`, or the proposal's `minor`; the top button says "Rate all with Molfar" and shows
   the names it will send (confirm); the per-character action ("not rated" panel) sends one name.

## Also open from earlier rounds
- Sensor wording: "told her not to overwork and wait for his help" was reported as `other`, not
  care (event vocabulary tuning is stage 5).
- The chat has no dashboard view yet (stage 4: strip, wide view, constellation, notebook).
- The phone header has no preset/persona/model switcher at all (separate, not dashboard).
