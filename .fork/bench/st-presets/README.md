# SillyTavern presets against SillyTavern's own macro engine (#516)

Two checks for the Roleplay engine's `expandMacros` on real SillyTavern presets. Neither ships a preset: they read a
folder of the owner's own files (third-party presets never go into this public repo).

## compare-st.mjs: our macros against SillyBunny's macro engine

Runs SillyBunny's `public/scripts/macros` (SillyTavern's newer MacroEngine) headless in Bun: `preload.ts` serves
the browser-only modules it imports from `stubs/` (names, a variable store in memory, no UI), `st.mjs` registers the
core, env and variable macros and leaves `random`, `pick`, `roll` and the clock raw so the app fills both sides alike.
For every preset with variables in the folder it expands the enabled prompts of `prompt_order` 100001 (the shipped
switches) in order, with one shared variable store, on both sides, and compares them with whitespace folded.

```
SILLYBUNNY=D:/ROLEPlay/SillyBunny bun --preload ./preload.ts compare-st.mjs "<presets folder>" <roleplay>/plugins/engine/plugin.js [name filter]
```

`ALL_DIFFS=1` prints every differing section, `ST_DEBUG=1` shows SillyBunny's own warnings. If Bun keeps an old
resolution after a stub changes, add `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0`.

Known differences (2026-11-25, 12 presets): a setvar value holding a `|` (SillyTavern's newer parser fails on it and
drops the setvar; we keep it, as its older engine did), `\{` (SillyTavern drops the backslash), unknown macros
(`{{mesExamples}}`, `{{group}}`, `{{outlet}}`), whitespace, and presets already in Vertep's own format (their
conditions are the app's, which SillyTavern cannot read).

## import-all.ts: what the importer gives

Imports each preset through the app's importer and expands the enabled sections with the imported defaults, as a chat
would; prints an estimate of the tokens (chars / 4), the `{{`/`}}` left over and the macros the import report calls
unknown. Run it on two checkouts (a `git worktree` of `main` with its `node_modules` linked) for before and after.

```
bun import-all.ts <roleplay checkout> "<presets folder>"
```
