# How the handbook is kept up to date

## The rule
A change that touches a file named in a page updates that page in the same change. This is part
of "done", like tests and lint.

## While working on a change
1. List the pages that name the files you touched:
   `node .fork/tools/check-handbook.mjs .fork/handbook --touched roleplay:plugins/world/plugin.js engine:src/apps/reads.ts`
   (repo words: `engine`, `roleplay`, `social`; paths relative to that repo's root).
2. Re-read only the sections your change affects (usually Owners, Flow, Limits, Traps, "If you
   change X"). Fix what is no longer true. Move an item out of "Not verified" when you read the
   code that settles it.
3. Set the page's "Verified at" line to your commit. If you changed only part of the page, write
   it so: `Verified at: <repo> <new hash> (sections: Flow, Traps); the rest at <old hash>`.
4. Rebuild the collected pages if Traps or "If you change X" changed: the three `cross-*.md`
   files are made from the pages, never edited by hand.
5. Run the full check: `node .fork/tools/check-handbook.mjs .fork/handbook engine=<path>
   roleplay=<path> social=<path>`. It must report 0 missing. A repo you do not have may be left
   out; its lines are counted as skipped.

The app repos (Roleplay, Social) do not hold the handbook. A change there that needs a page
update gets a second small commit in the engine repo, named in the app PR's description.

## A new system (a new plugin, a new app, a new tab with its own data)
Write a new page. Name: `<repo>-<topic>.md`. Sections, in this order: title; `Verified at`;
What it does; Owners (each line: `path/to/file`, then identifiers in backticks, then one line);
Data or Reads and writes; When a model is called; Flow (numbered); What reaches the prompt (if
any); If you change X, also touch Y; Traps; Tests that guard it; Not verified.
Limits: under 11 KB; plain sentences; only what was read in code or docs; anything else goes to
"Not verified"; no model or vendor names in the prose. Add a row to the table in `INDEX.md`.
A cheap model can draft the page from this description if it is told: never read a file over
30 KB whole (grep a name, read 60 lines around it), and check every anchor with grep. The
drafter's "surprising" findings are leads, not facts: about one in three was wrong in the first
four batches. Confirm in code before filing an issue.

## At a release
Run the full check in the release steps. A page that fails blocks nothing, but it is fixed in the
next change that touches its system, and its failure is written into `INDEX.md` under a
"Stale pages" heading until then.

## What does not belong here
The user guide, decisions and their history (`docs/DECISIONS.md`, `.fork/STATE.md`), plans
(`.fork/handoff/`), data formats in full (Roleplay `docs/DATA-FORMATS.md`). Link to them.
