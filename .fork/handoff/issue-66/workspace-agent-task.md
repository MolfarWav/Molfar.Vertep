# Task for the built-in agent (workspace, not the engine): Roleplay and the #66 rename

Paste this to Molfar in the workspace of each machine. It touches `apps/roleplay` only.

The engine (branch `claude/issue-66-rename`, release after 1.7.0) renamed its internal names from
`chrysalis` to `molfar` / `molfar-vertep`. Everything an app used keeps working under the old
name, so nothing breaks if you do nothing. Move Roleplay to the new names so the old ones can
be dropped from the engine one day:

1. Code that reads `window.chrysalisShell` -> `window.molfarShell` (`src/lib/shell-bridge.ts`),
   `window.chrysalisStorage` -> `window.molfarStorage` (`src/lib/drafts.ts`), the window event
   `"chrysalis:storage"` -> `"molfar:storage"` (`src/components/chat/composer.tsx`), the hot-reload
   event `"chrysalis:beforeFullReload"` -> `"molfar:beforeFullReload"` (`src/main.tsx`).
   Read the new name first and fall back to the old one (`window.molfarShell ?? window.chrysalisShell`),
   because a copy of the app can run on an engine older than the rename.
2. Do NOT rename the keys the app stores (`chrysalis-store-v2`, `chrysalis.roleplay.draft.*`,
   `chrysalis.marketplace.*`, `chrysalis.reload-reason`): renaming them loses the user's saved state.
3. Docs only: `AGENTS.md` mentions `dist/.chrysalis-build.json` (it is `dist/.molfar-build.json` now)
   and "Chrysalis settings" (say Molfar Vertep settings). `README.md` can say Molfar Vertep where it
   describes this fork's engine; keep the sentence that credits the upstream project.
4. Run the app's own checks (`bun run typecheck`, `bun test`) and rebuild; report what changed.
