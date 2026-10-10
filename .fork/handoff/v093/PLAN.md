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

## Design (decided 2026-10-09 after item 8, `marinara-sources.md`)
- One importer: the plugin's new `POST /fetch/card {url}` only DOWNLOADS (allowlist, 16 MB, 30 s, https,
  no redirect out of the link's service, magic bytes) and returns the bytes; the Store imports them like a
  dropped file (`importCardFiles` in `src/lib/card-import.ts`: PNG, JSON, charx). Reason: the plugin
  sandbox cannot unzip downloaded bytes (the engine zip service reads only the request body), cannot keep
  a cache between passes, has no `store` permission, and cannot downscale an avatar; the browser can.
- Chub keeps its own routes (`/import/url`, search, detail) untouched.
- RisuRealm search reads SvelteKit `__data.json` of its own search page (structured, sturdier than the
  HTML; still unofficial, marked in code). Params verified: `q`, `page`, `nsfw`, `sort=download`; 30 per
  page, no total. Detail = `/character/<id>/__data.json` (description only). Thumbnails `sv.risuai.xyz`.
- CharaVault: `/api/cards` search, `/api/cards/<folder>/<file>` detail (the full card incl. book),
  `/api/cards/download/...`. No thumbnails without downloading the card (not prefetched). robots.txt
  disallows `/api/` and `/cards/`: one request per user action, honest User-Agent, caveat in the UI.
- JannyAI: no network; link -> "open in the browser, download, drop"; drop zone. The one-click
  browser-session download (item 4 option) is not built; Marinara relies on JannyAI's CORS for it.
- 5-minute search cache lives in the client.
- Hosts added to `networkHosts`: realm.risuai.net, sv.risuai.xyz, charavault.net, raw.githubusercontent.com,
  huggingface.co, cdn-lfs.huggingface.co, `*.hf.co` (HF serves files from us.aws.cdn.hf.co), files.catbox.moe,
  cdn.discordapp.com. github.com and huggingface.co "blob" links are rewritten to the file URL (no fetch).

## Findings on the way
- RisuRealm `dynamic` download (20 cards, 2026-10-09): 8 PNG, 6 charx (3 of them a JPEG cover with the zip
  appended), 5 over 16 MB (one 146 MB), 1 deleted (404). Other formats (`json-v3`, `png-v3`...) are refused
  per card by the author ("not allowed"), so only `dynamic` is used.
- Bug fixed (plugin): a V3 PNG whose `ccv3` chunk came first read as "no card" (`ccv3` parsed as bare
  JSON; the spec stores it as base64). Hit 4 of 10 RisuRealm PNGs; chub PNG imports gain full V3 too.
- Bug fixed (client): PNG cards dropped on the Characters page or Home were decoded as latin1 (Cyrillic
  and Korean names came in as mojibake); they now use the Settings reader. Old reader removed.
- Typecheck error on Roleplay main (plugin-panel Select null) fixed.

## Progress
- Server part + tests (`test/rp-card-sources.test.ts`) and the shared helper: Roleplay branch
  `card-sources`, `da8e79b`, `ccccd79`, `f77fead` (pushed to the fork, not main). 772 Roleplay tests.
- UI: spec `UI-SPEC.md`, built by a Sonnet subagent with the browser check.

## 0.9.4 (next): deeper lorebook work
The user brings a Hermes write-up; plan it together then. A lorebook format change updates the
`edit-large-card` skill in the same change (CLAUDE.md rule).

## Round 2 (user, 2026-10-09): every source a full storefront, plus Wyvern, Pygmalion, JannyAI search
- CharaVault: documented keyless API (its site has an "API" section inviting integrations); filters
  tags / exclude_tags / creator / has_book / token_min/max / 10 orderings / origin (a tag); thumbnails
  `/cards/thumb/<folder>/<file>`. Its own site forces SFW for anonymous visitors; its API accepts nsfw=true
  without login; ours defaults to off. Commit `2e44ee1`.
- RisuRealm orderings checked: none = recommended, trending, date, random, download (only with a query).
- Wyvern (`api.wyvern.chat`, public JSON, SFW only without an account; linked lorebooks 404 without one,
  named as skipped) and Pygmalion (`server.pygmalion.chat` Connect GET, SFW only without an account, tag
  filter returns nothing anonymously so not offered): search, detail, install as a built V2 JSON card with
  the avatar from the listing. JannyAI (user chose option 2): search only through the public Meilisearch
  index its site queries (search-only key in code; a 401/403 says the key rotated); install = the user's
  browser + drop. No browser headers faked anywhere. Commit `a74cfd1`. 775 Roleplay tests (765 + 10; an earlier "782" here was a miscount).
- App pages run with `connect-src 'none'` in an opaque-origin sandbox: browser-side calls to other sites
  (Marinara's JannyAI one-click) are impossible by design; not to be loosened for this.

## Round 3: the real sandbox (2026-10-09)
- The browser check (Sonnet subagent, UI commits `174d85b`, `431ccc5`) found what bun tests could not: the
  engine's QuickJS sandbox has no atob/btoa/TextDecoder/TextEncoder and gives a route 10 s. Fixed in
  `81ebda7`: plain-JS base64/UTF-8, PNGs checked by chunk headers only (11 MB PNG in 0.6 s, measured in
  the real sandbox with `PluginSandbox`); the card-sources tests now run with those globals removed. The
  old PNG reader had the same flaw and failed silently, so chub imports always used the detail JSON; they
  now read the card PNG.
- Engine `f8384b6` (this branch): the app image proxy takes untyped raster images (RisuRealm's CDN sends
  no content-type; SVG/HTML still refused). Needed for RisuRealm thumbnails: ships with engine 0.9.3.
- `e1631c9`: a charx with a large main icon (3.9 MB seen) gets a browser-downscaled portrait.
- Re-check without patches: RisuRealm thumbnails 30/30; installs from all six sources on disk with
  portraits and linked books; no sandbox errors in the engine log.
- External review of the UI (DeepSeek V4 Pro; GLM 5.3 hung 15 min and was killed): 5 of its findings
  taken (detail request guard, close detail on source switch, hasMore reset, empty-state filter count,
  scroll to top), the rest rejected as non-defects.
- The engine worktree's typecheck shows 7 errors in client-agent/src/file-mentions.ts and
  test/agent-composer.test.ts, also on clean main there (fresh `bun install` in the worktree); check before
  the release on the main checkout.

## Round 4 (user's live look, 2026-10-09)
- Asked: translate a card in the Store (button in the detail dialog; translated preview; installing while
  translated installs a translated card and its lorebook, keys added next to the originals, originals kept
  in `extensions.molfar_translation`), coloured Lorebook / Emotions badges, "Open Characters" opening the
  character itself. UI with the Sonnet subagent.
- RisuAI emotion images (`x-risu-asset`, in PNG as `chara-ext-asset_:N` chunks) now import (`aa6227a`),
  downscaled in the browser to what the pack's 3 MB budget allows (`002448d`: 768 px down, 20-30 images
  stay ~512-640 px); what does not fit is named in a note.
- Expressions follow Ukrainian and Russian replies (`6194bba`).

## Later, on the user's word (deferred 2026-10-10: the downscaled size is good enough for now): emotion images as files, full size
Plugins cannot write binary files and the app serves only its dist/, so expressions live as data URLs
inside card.json (4 MB sandbox write cap) and must be downscaled. Plan: engine `fs.writeBytes` for
plugins (images only by magic bytes, inside the app data dir, size cap), an engine route that serves
those images to the app like the image proxy, Roleplay stores expressions as files
(`characters/<id>/expressions/*.webp`) with a reference in card.json, old inline ones keep working, PNG/charx
export embeds them back. A card format change: update `edit-large-card` and DATA-FORMATS with it.
