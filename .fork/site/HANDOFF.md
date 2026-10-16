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

## Done
- `src/en/index.html` (home, 6 screenshots), `src/en/privacy.html`.

## Left
1. `src/en/features.html` and `src/en/download.html`: spec in `spec-features-download.md` (it was sent to an
   external model with `assets/site.css`, `src/en/index.html` and README lines 1-250 attached; the answer was
   lost when the desktop shut down). Review facts against README.
2. Ukrainian versions of all four in `src/uk/` (translation = cheap-model job; review it; privacy translation
   must say exactly the same as the English one).
3. Browser check: dark, light, 390 px, no horizontal scroll (ux-review walk-through).
4. Create `MolfarWav/MolfarWav.github.io`, copy assets, build, push, confirm Pages is on, check
   https://molfarwav.github.io/ and /privacy.html answer 200.
5. Search Console: the user adds a URL-prefix property `https://molfarwav.github.io/`, picks "HTML file",
   gives the file name (`googleXXXXXXXX.html`, content `google-site-verification: googleXXXXXXXX.html`);
   put it at the repo root, push, the user presses Verify.
6. Steps for the user in Google Auth Platform: Branding: App home page `https://molfarwav.github.io/`,
   Privacy policy `https://molfarwav.github.io/privacy.html`, Authorized domains `molfarwav.github.io`;
   Audience: Publish app (In production). Scope stays `drive.file` only (non-sensitive, no review).
