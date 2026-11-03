# Guide pages: format (issue #230, #225)

One guide, two readers: users read it in the shell (Help > Guide), Molfar reads the same
files with `skill_load`. It is the overview layer: what each part is, how the parts fit,
the path for a newcomer, the names. Per-screen detail stays in the apps' own Help.

## Where pages live

- Engine: `builtin-skills/vertep-guide/pages/<page>.md` (English, the source).
- An app: `apps/<id>/.skills/guide/pages/<page>.md` (Roleplay: in its repo, `.skills/guide/`).
- Translations: `<skill>/l10n/<locale>/<page>.md`, locales of `client/src/i18n/locales.ts`
  except `en`. First line: `<!-- source: <hash> -->`, the first 12 hex digits of the sha256
  of the English page's bytes. A missing or stale translation falls back to English.
- Every book has `pages/index.md`: the start page.

## A page

- File name = page id: `[a-z0-9][a-z0-9-]*`, at most 40 characters.
- Line 1: `# Title` (at most 60 characters). Then the text.
- Markdown subset, nothing else: `##`/`###` headings, paragraphs, `- ` and `1. ` lists,
  `**bold**`, `*italic*`, `` `code` `` (sparingly), `[text](https://...)` external links,
  `> ` a note. No HTML, no images, no tables.
- Links between pages: `[[page]]`, `[[page|text]]`; to another book: `[[roleplay:page]]`,
  `[[vertep:page|text]]` (book = `vertep` for the engine, the app id for an app).
- A page is 150 to 700 words. One topic. Start with one or two sentences saying what it is
  and who needs it.

## How to write

- For a user, not a developer: what the screen offers, where it is (exact UI labels in
  quotes, as the English UI shows them), what to press, what is on by default, what it
  does NOT do. No file paths, JSON keys or function names, except on pages meant for
  Molfar's work (none for now).
- Every claim checked against the code or UI strings. A feature with no screen is not
  described as one.
- Name an app's Help article in words, not as a link: "Help > *Soul of a character*".
- Same word for the same thing on every page (see the glossary page).
