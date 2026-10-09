# Task prompt for the built-in agent: more card sources for the Roleplay Store

Written 2026-10-09. This work lives in the user's workspace (the Roleplay app's
`plugins/studio-import` plugin and the Store UI), which Claude Code cannot
reach. The user pastes the prompt below into a new chat on the agent page,
inside the Roleplay project.

Use a model with tool calling and at least a 64k window. Do the items one at a
time, in order; each item is its own commit. If the window is small, run
items 1-2, 3-4 and 5-6 in separate chats.

The probes below were run on 2026-10-09 from outside the app. The agent
must re-verify each endpoint once before building on it (a single request,
shown to the user), because sites change.

---

## Prompt (copy from here)

The Roleplay Store can install character cards only from chub.ai. We add more
sources. Today's code: plugin `plugins/studio-import` (`plugin.js`,
`manifest.json`). It already has `POST /marketplace/search`,
`POST /marketplace/detail` (both take a `source` field and answer 400 for
anything but `"chub"`) and `POST /import/url` (chub links only). Network access
is declared in `manifest.json` under `networkHosts`; a host missing there
cannot be called. Read `plugin.js` around those routes and the Store UI that
calls them, whole, before changing anything. Keep the existing chub behaviour
byte-for-byte.

Rules for every item:
- Cards must end up as `chara_card_v2/v3`-compatible data through the plugin's
  existing importer (the same path chub imports use). Do not write a second
  importer. A downloaded PNG is parsed by the existing PNG path.
- Add every new host to `networkHosts` in `manifest.json`, and nothing else.
- Size limits and a timeout on every fetch (mirror the chub code). Reject
  non-HTTPS URLs. Never follow a redirect to a different host.
- Errors are shown to the user in plain words, never swallowed.
- Show the source name in the Store UI for every card ("RisuRealm",
  "CharaVault"...), so the user knows where it came from.
- After each item: rebuild, run the app's own check, test in the browser with
  one real card from the source, commit with the git tool, and tell me in
  three lines what changed. If something does not work, stop and report; do
  not invent a workaround.

### Item 1: install from a direct URL (any site)

`POST /import/url` accepts a link to a PNG or JSON card on any HTTPS host.
Typical: GitHub raw, Hugging Face, Catbox, Discord CDN.
1. Detect by URL: chub links keep their current branch. Any other HTTPS URL
   goes to a generic branch: fetch with a size cap (use the same cap as chub
   PNG), check the magic bytes (`89 50 4E 47` PNG or valid JSON), then hand it
   to the existing parser.
2. Hosts: a plugin can only reach hosts listed in `networkHosts`. Check whether
   the manifest format allows a wildcard or an "any HTTPS" permission. If it
   does not, do this: add the five hosts above (`raw.githubusercontent.com`,
   `huggingface.co`, `cdn-lfs.huggingface.co`, `files.catbox.moe`,
   `cdn.discordapp.com`) and say plainly in the UI error that other hosts need
   the PNG file dropped instead. Do not ask me for a wildcard.
3. The Store UI: one input "paste a card link", with the error text above.

### Item 2: RisuRealm (realm.risuai.net) by link and by search

Verified:
- Download: `GET https://realm.risuai.net/api/v1/download/dynamic/<uuid>?cors=true`
  with header `x-risu-api-version: 4` returns the card. It answered
  `image/png` (2.6 MB) for a real id; the site's own client also handles
  `application/zip` and `application/charx` (see item 7).
- There is NO JSON search API (`/api/v1/search` is 404).
- Card page: `https://realm.risuai.net/character/<uuid>`.
- Listing / search: the HTML at `https://realm.risuai.net/?q=<text>` contains
  `/character/<uuid>` links; the page is server-rendered.

Do:
1. `/import/url`: accept `https://realm.risuai.net/character/<uuid>`; extract the
   uuid, download as above, import. A PNG answer goes through the existing
   parser.
2. Search: add `source: "risurealm"` to `/marketplace/search`, parsing the
   HTML of `/?q=`. Pull per card: uuid, name, creator, short description,
   thumbnail if present. If the markup has no stable selector, use the
   `<a href="/character/<uuid>">` blocks and `og`/JSON-LD data from the card
   page for detail. Cache a result page for 5 minutes. Say in a code comment
   that this is HTML scraping and may break.
3. The detail view for a hit shows the card page data; "Install" runs step 1.
4. A `charx` / zip answer: for now answer "this card is a .charx; support comes
   with item 7" and do not import. Count how many of ten random cards from
   the first search page answer charx vs png, and tell me.

### Item 3: CharaVault (charavault.net)

Verified, no key needed:
- Search: `GET https://charavault.net/api/cards?q=<text>&limit=<n>&offset=<n>&sort=most_downloaded&nsfw=false`
  returns `{total, limit, offset, results:[{file, folder, name, creator, tags,
  nsfw, description_preview, first_mes_preview, avg_rating, token_count,
  has_lorebook, file_size, ...}]}`.
- Download: `GET https://charavault.net/api/cards/download/<folder>/<file>`
  (url-encode both) returns a PNG V2 card.
- Card page: `https://charavault.net/cards/<folder>/<file>`.
- Caveats to show the user in the UI, not hide: it is an archive that mixes
  cards from chub, JannyAI and character.ai; its `robots.txt` has
  `Disallow: /api/`. Keep requests light: one search per user action, no
  prefetching of downloads, send a descriptive User-Agent
  (`Molfar-Vertep/<version>`), honor 429 by telling the user to wait.

Do: `source: "charavault"` in `/marketplace/search` and `/marketplace/detail`,
with the NSFW filter wired to the Store's existing NSFW switch (default off).
Label the source "CharaVault (archive of third-party cards)" in the Store.

### Item 4: JannyAI through the site and a drop zone

JannyAI cannot be called from our server (Cloudflare challenge on server
traffic), and we do not bypass protections. The user opens the site, downloads
the card themselves and gives us the PNG.

Do:
1. Store UI: a source "JannyAI" that shows a short explanation (3 lines, in the
   UI language the Store uses), a button that opens
   `https://jannyai.com/characters/search` in a new browser tab, and a big drop
   zone "drop the downloaded PNG here" that feeds the existing PNG import.
   Also accept several files at once.
2. Paste of a `jannyai.com/characters/<id>...` or `janitorai.com/characters/<id>...`
   link in the item 1 input: do not fetch it; answer "open it in the browser,
   download the card, then drop it here" and open the page on one click.
3. No network permission is needed for this item. Do not add `jannyai.com`
   to `networkHosts`.
4. Optional, only if it is cheap and I confirm after seeing 1-3: a one-click
   path where the user's own browser calls
   `POST https://api.jannyai.com/api/v1/download {characterId}` with
   `credentials: "include"` and then downloads the returned signed `downloadUrl`,
   falling back to the drop zone on any failure. This is how Marinara does it;
   the open question is whether that API sends CORS headers that allow our
   page's origin. Test it from the app page in the browser and report the
   result; do not build it before I say so.

### Item 5: Store polish for multiple sources

1. A source switcher in the Store (chub, RisuRealm, CharaVault, JannyAI). Remember
   the last choice. Search state per source.
2. One shared "Install" result: success shows the new character's name and a
   link to it; failure shows the plain error.
3. Update the docs in the plugin's README or the app's docs page, if it has
   one: list of sources, what each needs, the known caveats.

### Item 6: card and lorebook format notes

If any imported card carries a lorebook (CharaVault `has_lorebook: true`, a
chub card with a `character_book`), confirm it lands in
`data/lorebooks/<id>.json` linked from the card, as chub imports do today.
If it does not, stop and report; the engine owner updates the format skill
`edit-large-card` together with any change to the format.

### Item 7: charx support (a sub-task of item 2, done last)

RisuRealm sometimes returns `application/charx` (a zip). The CharX spec is
public (RisuAI's `charx` format: a zip with `card.json` in the
chara_card_v3 shape, plus `assets/` and `x_meta`).
1. Look at how the plugin already handles zip input (`/import/zip`, permission
   `zip`). Reuse it.
2. For a charx: read `card.json`, convert to the plugin's internal card shape
   the same way a PNG V3 card is converted, take the main icon from the
   `assets/` entry marked as the icon (`type: "icon"`, `name: "main"`) or the
   first image, ignore other asset types (emotion images, backgrounds, audio)
   and tell the user how many were skipped.
3. Embedded lorebook (`data.character_book`) goes through the same lorebook
   path as item 6.
4. A `.charx` file dropped into the item 4 drop zone, or a direct `.charx`
   URL from item 1, must work as well.
5. Test: one `charx` card from RisuRealm, imported, with the icon and the
   first message visible in the app. Report what was dropped.

### Item 8: research only, no code: how Marinara connects extra card sources

Marinara Engine (github.com/Pasta-Devs/Marinara-Engine, MIT-style open source;
read-only, we take ideas, not code) has a "Card Browser" with ChubAI, JannyAI,
Pygmalion, Wyvern and DataCat (CharacterTavern is listed as unavailable).
I want a short report (one page, in Ukrainian) on how it plugs in sources
beyond what we have, and what is worth taking. Read, with the `gh` tool or the
web pages if you have them:
- `docs/characters/bot-browser.md`, `docs/TROUBLESHOOTING.md`
- `packages/server/src/routes/bot-browser-*.routes.ts` (one per provider)
- `packages/server/src/services/bot-browser/`
- `packages/client/src/components/bot-browser/BotBrowserView.tsx`
For each of Pygmalion, Wyvern, DataCat and CharacterTavern answer in a table:
how the search and the download work (endpoint kind, auth, token),
how fragile it is, whether it needs a login or a session, what Marinara does
when a site blocks the server, and whether we may use the same approach
without bypassing a protection. Then list the 3-5 design ideas worth taking
for our Store (for example: a client-side download with the user's own
session and a server fallback; a provider registry with one common card shape;
a login modal for age-gated sources; a "save as PNG" button for every
provider). Do not implement anything. Do not copy code.
