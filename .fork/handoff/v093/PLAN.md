# 0.9.3: more sources for character cards

Agreed with the user 2026-10-09. The item list, the rules and the verified endpoints are in
`card-sources-prompt.md` (written as a prompt for the built-in agent; the user chose that Claude Code
builds it instead, in the Roleplay fork). Everything below overrides that file where they differ.

## How it is built
- Code: the Roleplay fork `MolfarWav/Molfar.Vertep-Roleplay`, plugin `plugins/studio-import`
  (`plugin.js`, `manifest.json` 1.12.1) and the Store UI `src/components/views/marketplace-view.tsx`
  (plus the URL import in `characters-view.tsx`). Clone: `.claude/worktrees/rp-memory`, a branch
  `card-sources` from fork main 4.27.0. Pushing the fork's main ships to every install: the user's word first.
- Engine branch `claude/v093` holds the notes. An engine change only if a source truly needs one.
- Order (user): item 8 first (how Marinara plugs in sources: research by an external model, report in
  Ukrainian in `marinara-sources.md`), then the shared design of a source (one card shape, a source
  registry if the report supports it), then items 1-7 one at a time, each committed.
- Live check with one real card per source on the desktop, together with the user.

## Facts checked in the engine (2026-10-09)
- `networkHosts` takes exact hosts and `*.domain` (subdomains of one domain) only; no "any host"
  (`src/plugins/runtime.ts` `executeNetRequest`). Item 1 therefore lists the five hosts and tells the
  user to drop the file for any other host.
- The engine re-checks every redirect hop against the allowlist (at most 5 hops). Hugging Face `resolve/`
  links redirect to a CDN host: the item 1 host list must hold the hosts the redirect lands on, or the
  plugin follows redirects manually and rejects a host change (the prompt's rule).

## 0.9.4 (next): deeper lorebook work
The user brings a Hermes write-up; plan it together then. A lorebook format change updates the
`edit-large-card` skill in the same change (CLAUDE.md rule).
