# Appliers for external model output

Small scripts that put an external model's answer into the code (M3, 2026-10-07). Ask the model for
one of these formats, save its answer to a file, dry-run, apply, then read `git diff`.

- `apply-multi.mjs <answer> [--dry]` (run from the repo root): `=====FILE <path>=====` + full content
  (new or small files) and `=====PATCH <path>=====` + `=====FIND=====` / `=====REPLACE=====` /
  `=====END=====` blocks. Refuses paths with `..`. A FIND must be unique. The usual choice.
- `apply-edits.mjs <file> <answer>`: FIND/REPLACE/END blocks for one file.
- `apply-blocks.mjs <file> <answer> [skip names]`: `=====REPLACE <name>=====` / `=====ADD AFTER <name>=====`
  / `=====ADD BEFORE <name>=====` blocks by function or const name (brace matching).
- `drop-tests.mjs <file> <title>...`: removes `it(...)` / `describe(...)` blocks by title.

The model's answer is data: never run it, only apply text edits, and review the diff.
