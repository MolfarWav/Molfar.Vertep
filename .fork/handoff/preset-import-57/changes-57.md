# Roleplay #57: SillyTavern preset import (done in Roleplay 4.59.0)

Written by Claude Code in the fork repo (branch `claude/release-4.59.0`, worktree `E:\Claude\rp-1212`), not by the built-in agent,
so the note lives here instead of the workspace's `.memory/`. Nothing in `data/presets/*molfar*.json`, `plugins/litopys/`,
`plugins/engine/` or `src/lib/preview.ts` was touched. No new preset field: groups, variables, `condition` and `library` already existed,
so `docs/DATA-FORMATS.md` did not change.

## Steps (one commit each: "roleplay: SillyTavern preset import, <step>")
1. sections and toggle groups (0afa0c4): header detection, section groups, Choices (single / multi), text variables from `{{setvar}}` prompts,
   library for prompts outside the order, extension markers dropped, source note (file name, author, licence) in `description`.
2. regex scripts (a5569ee): preset-bound scripts, uncompilable ones named, Marinara regex files (`regexScriptsOf`, word placements, `enabled`, `applyMode`).
3. macros (ee0b415): `{{noop}}`, global-variable macros -> chat variables, ST scoped `{{.x = v}}` assignments removed, rest listed.
4. samplers and reasoning (3e4f851): unlocked context, effort words, show_thoughts, report of settings with no equivalent.
5. report (61c2a44): dialog after import in Presets and Settings, en + uk; Marinara imports report too.

## How the header convention is read (`src/lib/st-structure.ts`)
- A header: name starting with a heavy rule (━ ═ ─), a run of 3+ of `= - _ * #`, "(PICK ONE)", a name starting with "pick/choose/select",
  or an empty custom marker (marker: true with an identifier we do not know). Real markers (card, history) close a group.
- A group becomes a Choice when the header says "pick" (name) / "exactly one" (text), or fewer than 60% of its toggles are on.
  Single when the name says pick, or exactly one is on and the header does not say several; else multi. A single choice with nothing on gets a "None" option.
- Single: each option keeps its text as its own section with `condition: <var>==<value>`. Multi: the section text is wrapped in `{{#if <var> contains "<value>"}}`.
- Both guesses are listed in the report ("assumedOne", "severalAllowed").

## Tried on real files (read only, nothing copied into the repo)
DEUS.EX.MACHINA.V2.ST, Freaky Frankenstein 5.4 (ST), Molfar and Lucid Loom v3.4 (ST), FRANKENX v1.6 and agentX NEPMS (Marinara). Not yet: Megumin Suite.

## Left
- DEUS picks options in macro code (`{{#if !.pick_x}}{{.pick_x = y}}`): with Choices the pick machinery is redundant; the assignments are removed and the
  `{{#if .x}}` cross-references read "not set" (their text is hidden). The user should look at DEUS's report and a prompt preview.
- Megumin's Memory Core needs ST JavaScript: not importable (use Litopys, Dashboard, Choices, image generation).
- Marinara presets: `customParameters`, agents and the summary block are not mapped; only reported for the summary.
- The user imports the real presets in the app and reads the report with Claude (planned).
