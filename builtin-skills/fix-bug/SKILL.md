---
name: fix-bug
description: A bug to fix, or a "Bug report:" message. Ends with bug_solution.
---

# Fix a reported bug

The user hit a bug and asked you before reporting it. A fix you make here helps
everyone only if it is small, proven and described well: the maintainers read
your text and the patch, then ship it in a release.

## 1. Before touching anything
- Restate the bug in one sentence and ask for what is missing (steps, which
  chat or character, the exact error) with `ask_user`. Do not guess.
- Find the app it is in. Then `checkpoint { action: "create", app, label: "bug: <short title>" }`
  and keep the id: `bug_solution` needs it, and the patch is everything since it.

## 2. Find the cause
- Reproduce it: `app_console`, `plugin_log`, `app_request`, read the code.
  Name the file and function that is wrong before you edit.
- The cause is in the engine (the shell, Settings, the agent, a route you
  cannot edit): you cannot fix it. Collect what you found and go to step 5
  with `solved: false`.

## 3. Fix
- The smallest change that removes the cause. No refactoring, no unrelated
  tweaks: they end up in the patch.
- A broken card, lorebook or setting of this user only: fix the data, and say
  in `fix` what was wrong with it (data never goes into the patch).
- Prove it: skill `finish-change` (`app_check`, the console).

## 4. Let the user try it
Ask them to repeat what broke (`ask_user`: "It works" / "Still broken").
Still broken: back to step 2. Three failed tries: step 5 with `solved: false`.

## 5. Close with `bug_solution`
- `solved`, `problem` (the bug in their words), `cause`, `fix`, `verify`
  (steps to check), `app` and `checkpoint` when app code changed.
- Write these in English: they go to GitHub. Keep private things out: no
  chat text, card contents, names, keys.
- The tool lists the files in the patch and warns about any that look
  private. A file you changed that is not part of the fix: restore it first
  (`git restore --source <commit> -- <path>`), then call again.
- Tell the user in their language: the card under the message sends the fix
  ("It works, send the fix") or the report. Nothing leaves without their click.
