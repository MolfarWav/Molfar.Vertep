# st-to-vertep: a SillyTavern variable preset as a native Vertep preset

Built for **Sola V5 Flame** by Pyrxpia (https://pyrxpia.github.io/sola-hub/), shipped in Roleplay 4.160.0 as the
built-in `sola` with her permission. Use it again for a new Sola version.

Why a compile and not a plain import: when this was written, the engine could not read SillyTavern's nested macros
(#516, fixed later in Roleplay 4.156.0). The compiled form is still the shipped one: every module becomes a section
with a condition, or a `{{#if}}` on a Choices toggle or pick, so the prompt carries no variable machinery. Wrapper tags
become xml groups, and the card goes through the app's markers.

## Files
- `stmacro.py`: SillyTavern macro parser, a concrete reference evaluator (`ev`) and the symbolic compiler (`sev`, `render`).
  App feature flags (`{{#if vertep.<name>}}`) are kept for the engine to decide.
- `sola_v5_port.py <ST preset.json> <base.json> <out.json>`: the Sola-specific part. It drops trackers the app keeps,
  edits text, adds the dialogue colours and dynamic styling, then compiles and writes the regex scripts.
  `<base.json>` is any Vertep preset whose studio has the marker sections; use the Roleplay repo's `data/presets/sola.json`.
  It writes `<out>.meta.json` and `<out>.src.json` for the checker. Environment:
  - `SOLA_NAME`: the preset name;
  - `SOLA_NO_DESK=1`: leave out Sola's Desk;
  - `SOLA_CUE=1`: add the experimental cue card for the helpers.
- `sola_desk.py`, `sola_leakfix.py`, `sola_length.py`, `sola_cue.py`: parts the port runs (Sola's Desk; her asides kept out
  of the helpers' story view, see #85; reply length: a capped planning sheet and length targets that do not shrink, Roleplay
  4.160.1; the cue card).
- `verify.py <out.json> N`: N random sets of switches and app features. It compares the SillyTavern reference with the
  engine's own `sectionCondPasses` and `expandIfBlocks` (through `vsim.mjs`). It must print `mismatches 0`.
- `fullsim.mjs <out.json> <out.txt>`: full `expandMacros` with group wraps for the default picks. Leftover braces must be 0.
- `build_stock.ts <out.json> <roleplay repo>`: writes `data/presets/sola.json`, `_sola.json`, `data/_sola-regex.json` and
  `data/regex/sola-*.json`. It runs through the app's own import (`presetImportFull`, `presetToEngine`, `regexToEngine`)
  and adds the credit.
- `import_test.ts <out.json>`, `render_test.tsx <out.json>`: the app's importer on the file, and the regex scripts on a
  sample reply through the app's Markdown sanitizer.

## Run
Set `ROLEPLAY_DIR` to a Roleplay checkout that has `bun install` done. Run the Python steps from this folder with
`python -I`. Run the `.ts` / `.tsx` steps with the current folder set to `ROLEPLAY_DIR` (its tsconfig paths).
They write to `OUT_DIR` (default: the temp folder), never into the Roleplay folder.

    SOLA_NAME="Sola V5 Flame (Vertep)" python -I sola_v5_port.py "<Sola ST>.json" "$ROLEPLAY_DIR/data/presets/sola.json" out/sola.json
    python -I verify.py out/sola.json 300
    (cd "$ROLEPLAY_DIR" && bun <this folder>/build_stock.ts <this folder>/out/sola.json "$ROLEPLAY_DIR")

Then run in Roleplay: `bun test ./test/rp-preset-choices.test.ts ./test/rp-chat-features.test.ts`, bump the version,
and add a CHANGELOG entry. Keep the credit to Pyrxpia in the preset's description, the README "Credits" and the Help
article `kb.presets`.

## Traps
- Each prompt-only script that deletes a match without a depth limit is also applied to what the Dashboard sensor,
  Litopys and the World DM read (`storyView`). A script with any `minDepth` (even 0) touches only the writer's prompt.
- In a shell heredoc, backslashes in Python string literals get mangled. Edit these files with an editor.
