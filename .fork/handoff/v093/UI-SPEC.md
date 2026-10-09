# 0.9.3 Store UI: more card sources (spec for the UI executor)

Repo: the Roleplay fork clone `E:\Claude\Chrysalis-Engine\.claude\worktrees\rp-memory`, branch
`card-sources` (already has the server part and the shared import helper; do not change those unless a
bug blocks you, and then say so). Commit on this branch with clear messages (style:
`area: what changed, in plain words`, a body saying why, end with
`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Do NOT push. Do NOT touch `bun.lock`.

## What exists (read these first, whole)
- `plugins/studio-import/plugin.js`: routes
  - `POST /marketplace/search` `{source: "chub"|"risurealm"|"charavault", search, page, first, sort, nsfw, ...chub filters}`
    -> `{source, count, page, first, hasMore?, results: Item[]}`. Item = today's `MarketplaceItem` plus
    `source`, `hasLore`, `pageUrl` (non-chub only). RisuRealm pages are 30 items (`first: 30` comes back),
    no total: use `hasMore`. CharaVault: `count` is the total, `hasMore` given. RisuRealm items have an
    `avatar` (thumbnail on sv.risuai.xyz, works through `ProxyImage`); CharaVault items have `avatar: null`
    (no thumbnails without downloading the card; show the existing placeholder). `nsfw` per item is always
    false on RisuRealm (unknown).
  - `POST /marketplace/detail` `{source, id}` -> today's `MarketplaceDetail`; RisuRealm adds `partial: true`
    (only the author's description, as `creatorNotes`; `lorebookEntries: -1` means "has a lorebook, count
    unknown").
  - `POST /fetch/card` `{url}`: download only (used through the helper below).
- `src/lib/card-import.ts`: `importCardFiles(files, hydrate)` (PNG, JSON, .charx incl. JPEG-covered;
  returns `{characters: ids[], names[]}`; shows its own toasts), `importCardFromLink(url, hydrate)`
  (RisuRealm / CharaVault / direct links; throws an Error with a plain-words message; returns ids, names,
  `sourceLabel`), `browserOnlyLink(url)` (JannyAI/JanitorAI page -> the URL to open, else null),
  `isChubLink(url)`.
- `src/components/views/marketplace-view.tsx`: the Store. `SOURCES` (chub only), browse state in
  sessionStorage (`BROWSE_KEY`), filters in localStorage (`FILTERS_KEY`), chub-only controls (Trending,
  sort, tags, creator, Filters panel), grid, detail dialog, `download()` via `/import/url`.
- `src/components/views/characters-view.tsx` `importFromUrl`: the Characters page "import from link"
  dialog (chub only today).
- UI strings in these files are English literals (no i18n keys); keep that.

## Build
1. **Source switcher** (existing Select): Chub, RisuRealm, CharaVault, JannyAI. Widen the trigger so the
   names fit. The last choice is remembered (already part of the browse state; keep it working when the
   stored value is one of the new ids).
2. **Search state per source**: query, applied, page (and chub's sort/trending/tags/creator) are kept per
   source, so switching back returns to where that source was. Store them in the same browse record,
   keyed by source. Old stored records (flat, chub) must still load.
3. **Controls per source**: chub keeps everything exactly as today. RisuRealm and CharaVault show only the
   search box, a "Show adult cards" toggle (a small switch or toggle button; default OFF for both; remember
   per source in localStorage), and for RisuRealm a sort Select with two values: Recommended (no sort sent)
   and Most downloaded (`sort: "downloads"`). Hide Trending, tags, creator, Filters for them. Send
   `nsfw: true|false` from that toggle (do not reuse chub's maturity filter for these two).
4. **Client cache**: a search answer for (source, query, page, sort, nsfw) is reused for 5 minutes within
   the session (a Map in module scope is enough). Chub may use it too.
5. **Pagination** for non-chub: Previous/Next using `hasMore`; show "page N" (no "of M" when there is no
   total).
6. **Source on every card**: a small label on each grid tile and in the detail dialog header with the
   source name: "Chub", "RisuRealm", "CharaVault". A "Lorebook" badge when `hasLore`.
7. **Caveats shown, not hidden** (one muted line under the header when that source is active):
   - CharaVault: "CharaVault is an archive of cards collected from chub, JannyAI and character.ai. Check the
     original author before you share a card." Label the source in the switcher "CharaVault (archive)".
   - RisuRealm: "RisuRealm has no public search API; the app reads its search page, which may change."
8. **Detail dialog for non-chub**: same dialog. For RisuRealm `partial: true`, show the description and a
   note "RisuRealm shows the card itself only after download." For `lorebookEntries: -1` show "Has a
   lorebook". A link "Open on <source>" to `item.pageUrl` (new tab, rel noopener).
9. **Install for non-chub**: the existing Download/Install button calls
   `importCardFromLink(item.pageUrl, hydrate)`. Chub keeps `download()` exactly as today. One shared
   result for both: success toast "<name> added to Characters" with an action "Open" that goes to the
   character (look at how other places open a character: `setView` / the store's selected character;
   find the existing way, do not invent a new route), and mark the tile downloaded. Failure: toast with
   the plain error text from the thrown Error (the plugin's words). Never swallow an error.
10. **JannyAI source** (no network at all): instead of the grid, a panel with
    - three lines: "JannyAI blocks apps from downloading cards, so this takes two steps." / "Open JannyAI,
      find a character and press its download button (PNG)." / "Drop the downloaded files here."
    - a button "Open JannyAI" -> `https://jannyai.com/characters/search` in a new tab;
    - a large drop zone (also click-to-pick, `accept=".png,.json,.charx"`, multiple) that feeds
      `importCardFiles(files, hydrate)`; show the imported names after it finishes.
11. **"Paste a card link"** input in the Store header (all sources), one line, with an Import button:
    - `browserOnlyLink(url)` -> do not fetch; show the inline message "JannyAI cards must be downloaded in the
      browser: open the page, download the card, then drop it in the JannyAI tab." with a button that opens
      that page in a new tab and switches the source to JannyAI;
    - `isChubLink(url)` -> the existing chub path (`/import/url`, same as the Characters page);
    - anything else -> `importCardFromLink`.
    - Errors show as text ABOVE the input (not only a toast) until the input changes.
12. **Characters page link import** (`characters-view.tsx` `importFromUrl`): non-chub links go through the
    same three-way logic (keep chub exactly as is). Put that logic in one exported function (e.g.
    `importAnyCardLink(url, hydrate)` in `src/lib/card-import.ts`) used by both places; JannyAI there
    shows the message as an error toast with an "Open" action.
13. **Drop anywhere in the Store** is NOT needed; only the JannyAI drop zone.
14. **Docs**: the app has `docs/`; add a short section to the most fitting existing doc (look for one that
    covers the Store/marketplace or importing; else `README.md`) titled "Card sources": the four sources,
    what each needs (none / none / none / the user's own browser download), direct links (GitHub raw,
    Hugging Face, Catbox, Discord CDN; any other host: download and drop), the caveats above, limits
    (16 MB, https only, RisuRealm cards larger than 16 MB must be downloaded and dropped).
15. Phones (390 px): the header wraps cleanly, the drop zone and the link input fit, no sideways scroll.

## Checks (all must pass before you report)
- `bun run typecheck` (clean) and `bun test test/` (all pass) in the clone.
- Browser check with the engine's skill `E:\Claude\Chrysalis-Engine\.claude\skills\browser-check\SKILL.md`
  (read it whole), run from `E:\Claude\Chrysalis-Engine`. Windows notes from earlier checks: copy the clone
  into `$DATA/apps/roleplay` (robocopy, with node_modules), open it through the shell's app card and wait
  up to ~2 min for the first build; the app's language/theme come from `$DATA/apps/roleplay/data/settings.json`
  (`ui.language`, `ui.themeMode`); `pw.mjs` may hard-code a Linux Chromium: use the installed Chrome with
  `playwright-core` (`CHROME_PATH`). Put scripts and screenshots in your scratchpad folder, not in the repo.
  The throwaway engine makes REAL requests to the sites; keep it light (one search per source, one install
  per source).
- Flows to prove (screenshot + where it matters a read-back from `$DATA/apps/roleplay/data/characters/`):
  1. Chub search still works and looks as before (one screenshot).
  2. RisuRealm: search "knight", open a card's detail, Install one PNG card -> it exists on disk with its
     name (not mojibake) and an avatar.
  3. CharaVault: search "elf" with adult off, Install one card -> on disk; if it carried a lorebook
     (`hasLore`), check `data/lorebooks/<id>.json` exists and the card links it (look at how chub imports
     link books in `writeCardWithBook` in the plugin) and report what you see.
  4. A RisuRealm charx card (search until one installs as charx; report how many tries) -> on disk.
  5. Paste link: `https://github.com/SillyTavern/SillyTavern/blob/release/default/content/default_Seraphina.png`
     -> installed; `https://jannyai.com/characters/x` -> the inline message, no request made;
     `https://example.com/a.png` -> the plain error above the input.
  6. JannyAI tab: drop zone imports a local PNG card (export one from the Characters page or use the
     Seraphina PNG saved locally).
  7. Switching sources keeps each source's query and page; reload keeps the chosen source.
  8. Screens: 1280 dark, 1280 light, 390 light; console without errors.
- Stop the engine with the skill's stop.sh.

## Report (your final message)
- Commits (hash + subject), files touched.
- Each flow 1-8: PASS/FAIL with the screenshot paths and what was read back from disk.
- Anything you could not do, any bug you saw in the server part or the helper (do not paper over it), and
  the charx count from flow 4.
