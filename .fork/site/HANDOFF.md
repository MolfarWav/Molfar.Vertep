# Project website molfarwav.github.io: handoff (2026-10-16)

Goal: a real project site on GitHub Pages at https://molfarwav.github.io/ with a privacy policy Google
accepts for the "Molfar Vertep" OAuth client (Drive sync, scope `drive.file`), so the consent screen
can go from Testing to In production before 1.1.0 ships. Background: `.fork/handoff/sync/GOOGLE-CLIENT.md`
on branch `claude/nostalgic-mccarthy-136fe6`.

## Decided with the user
- Repo: a separate public repo `MolfarWav/MolfarWav.github.io` (user site; only there can the Search
  Console verification file sit at the domain root). Claude may create it with `gh` and push; the user
  enables Pages if it is not on by itself.
- Several pages: `index.html`, `features.html`, `download.html`, `privacy.html`.
- Languages: English at the root, Ukrainian under `uk/` with the same file names; EN | UA switch.
- Design: variant C "modern product" (bento grid, screenshots, red glow behind the hero GIF), drafted by
  an external model; the full original is `designs/chosen-c.html`. Four variants were shown (A Kimi,
  B/C DeepSeek, D Muse Spark); the user picked C.
- No Google Fonts (would contradict "no trackers"): system font stack.
- Privacy text: approved by the user as written (`privacy-approved-en.md`), contact = GitHub Issues only
  (no email). Already laid out in `src/en/privacy.html` (adds a line that the Download page asks GitHub's
  API for the latest release).

## Facts the privacy text rests on (checked in the sync branch code)
`src/sync/drive.ts`: scope only `drive.file`; PKCE; folder "Molfar Vertep sync" marked by appProperties;
reads `about.user.emailAddress` for display only; refresh token in `data/credentials/<user>/sync.json`
on the device. `DELETE /v1/sync/target` (Disconnect) drops the token locally but does NOT call Google's
revoke endpoint: the policy points to myaccount.google.com/permissions. Possible engine follow-up:
revoke at https://oauth2.googleapis.com/revoke on Disconnect. Keys go to Drive only when switched on,
sealed with a passphrase.

## Layout of this folder
- `build.mjs`: wraps each body fragment in `src/<lang>/` with the shared head/header/footer; English to the
  site root, Ukrainian to `uk/`. A fragment starts with `<!-- title: ... | description: ... -->`.
  Run `node build.mjs` in the site repo root.
- `assets/site.css`: the stylesheet (from design C, plus skip link, `.page-head`, `.prose`, tables, `--link`
  color for contrast).
- Assets NOT copied here (they are in this repo): copy into the site repo's `assets/`:
  `client/public/vertep-logo.svg`, `client/public/favicon-64.png`, `client/public/molfar-512.webp`,
  `.github/assets/divider.svg`, `.github/assets/molfar/molfar-cast.gif`, `.github/assets/social-preview.png`,
  and `.github/assets/screens/*.png` + `molfar-rebuild.gif` into `assets/screens/`.

## Done (2026-10-16, cloud session)
- All four pages in English and Ukrainian (`src/en/`, `src/uk/`). Features and Download drafted by a cheaper
  executor from README facts and reviewed; the Ukrainian text uses the shell's real labels (`client/src/i18n/uk.ts`
  on the sync branch: «Від’єднати», «Підключення API», «Магазин»). Roleplay button names stay in English in «».
- CSS fixes: `pre` blocks (were unstyled, made 663 px wide pages on a phone); header keeps Features/Download and
  hides GitHub/Discord below 1025 px (both are in the footer); below 481 px only the logo shows, so EN | UA
  stays visible; five "ask" cards fit one row at 1280 px.
- `assemble.sh` builds the full site repo into `dist/` (pages, sources, build script, README, LICENSE,
  `.nojekyll`, images copied from this repo, any `google*.html` verification file put in this folder).
  Never edit `dist/` by hand: edit `src/`, run `sh .fork/site/assemble.sh`.
- Headless check (Playwright, 8 pages x dark/light x 1280/390): no horizontal scroll, every image and same-site
  link answers 200, the language switch goes to the same page, no JS errors; the Download script filled
  "Latest: v1.0.10" and direct file links from the GitHub API.
- The cloud session could not create `MolfarWav/MolfarWav.github.io` (GitHub 403: the integration may not create
  repositories). The user creates it (empty, public), then either pushes `dist/` from their machine or adds
  the repo to a cloud session, which pushes.

## Live (2026-10-16)
The user created `MolfarWav/MolfarWav.github.io`; the cloud session attached it (add_repo, push) and pushed `dist/`
to `main` (`c0b9d14`). Pages came on by itself: https://molfarwav.github.io/ and /privacy.html answer 200, as do all
8 pages and the assets; the headless check against the live site is clean except the 885 KB footer GIF
(`molfar-cast.gif`, shown at 64 px on every page) sometimes not finishing in time: heavy for phones, a smaller
copy would help. To update the site: edit `src/`, run `sh .fork/site/assemble.sh`, copy `dist/` over a clone of
the site repo, commit, push.

## Left
1. Search Console: URL-prefix property `https://molfarwav.github.io/`, method "HTML file": the user gives the
   file name; put the file in this folder (content `google-site-verification: googleXXXXXXXX.html`), run
   `assemble.sh`, push to the site repo; the user presses Verify.
2. Google Auth Platform: Branding: App home page `https://molfarwav.github.io/`, Privacy policy
   `https://molfarwav.github.io/privacy.html`, Authorized domains `molfarwav.github.io`; Audience: Publish app.
   Scope stays `drive.file` only.
3. Possible engine follow-up (not promised in the policy): revoke the token at Google on Disconnect.
4. Optional: a lighter footer GIF.
