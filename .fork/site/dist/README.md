# molfarwav.github.io

The website of [Molfar Vertep](https://github.com/MolfarWav/Molfar.Vertep): https://molfarwav.github.io/

Static HTML on GitHub Pages: no cookies, no analytics, no trackers, no external fonts.

- `src/en/*.html`, `src/uk/*.html`: page bodies. Each starts with `<!-- title: ... | description: ... -->`.
- `build.mjs`: wraps every body with the shared head, header and footer. English goes to the root, Ukrainian to `uk/`.
- `assets/`: stylesheet, logo, screenshots.

Edit a body in `src/`, run `node build.mjs`, commit the source and the built pages together.

The site's text and code are under the same license as Molfar Vertep (AGPL-3.0-only).
