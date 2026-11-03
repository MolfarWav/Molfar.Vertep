# Help > Guide: UI plan (issue #225, #230)

## Where and how a user gets there
The existing Help dialog (`client/src/guide/help-list.tsx`, opened from the account menu
and the start page, host `client/src/guide/guide-host.tsx`). It gets two tabs at the top:
"Tips" (the current list, unchanged) and "Guide" (new). Steps: account menu > Help > Guide.
The dialog remembers the last tab and the last page per viewer (localStorage, wrapped in
try/catch), so Help opens where the user left it.

## Data
- `GET /v1/guide?lang=<locale>` -> `{ books: [{ id, title, pages: [{ id, title }] }] }`
  (engine book `vertep` first, start page `index` first in each book).
- `GET /v1/guide/<book>/<page>?lang=<locale>` -> `{ book, id, title, markdown, lang, stale }`, 404 when missing.
- Locale: the shell's current locale (the one `tr` uses).
- Fetch through the shell's existing API helper in `client/src/api.ts` (find how other GETs are done).

## Layout
Desktop (>= 768 px), dialog size "large" (same height as Tips):
- Left column, 200-220 px, scrollable: each book as a small uppercase heading
  (same style as Tips group headings), its pages as rows; the current page highlighted
  (state look, not a button look). Above it, the dialog's search input filters page titles
  (shared with Tips: the search box already exists; on the Guide tab it filters pages).
- Right: a toolbar row (Back, Forward icon buttons with aria-labels, disabled when there
  is no history) then the page, scrollable, max text width ~68ch, text 14 px, line height 1.6.
Phone (< 768 px): one column. The list of books and pages is the first view; tapping a
page opens it full width with a toolbar: "Contents" (back to the list), Back, Forward.
Targets 40 px.

## The page
A small Markdown renderer of our own (`client/src/guide/markdown.tsx`), React elements only,
never innerHTML. Subset: `#`, `##`, `###`, paragraphs, `- ` and `1. ` lists (one level),
`**bold**`, `*italic*`, `` `code` ``, `> ` note (soft panel with a border), `[text](https://...)`
(new tab, rel="noopener noreferrer", only http/https; anything else is plain text),
`[[page]]`, `[[page|text]]`, `[[book:page]]`, `[[book:page|text]]` (a link styled as a link,
a button underneath; it opens that page in the reader and pushes history). A link to a page
or book that does not exist renders as muted text, no link. The page's own `# Title` is the
page heading (font-heading). Keep the parser pure and exported (`parseGuideMarkdown`) so it
is unit-tested in `test/guide-markdown.test.ts`.

## States
- Loading: `TextShimmer` (`client/src/ui/text-shimmer.tsx`) in the page area.
- Error (list or page): one line saying it could not load + "Try again" button.
- Stale translation (`stale: true`): a muted line above the page: "This page changed in
  English; showing the English version until its translation is updated." When `lang` is
  "en" and the shell locale is not English and not stale: nothing (missing translation is
  simply English).
- No match for the search: same empty state as Tips ("Nothing found").
- Page not found (404 from a link): "This page does not exist" + link to the book's start page.

## Components to reuse
`client/src/ui/tabs.tsx`, `ui/dialog.tsx` (`ModalDialog`, `Dialog`), `ui/button.tsx`,
`ui/icon.tsx` (pick existing arrow icons), `ui/text-shimmer.tsx`, `useIsMobile` from
`guide/mobile.ts`. Tokens only (`text-ink`, `text-ink-muted`, `border-line`, `bg-panel`,
`accent` for links). No hex colours.

## Strings
Every new string in all 14 `client/src/i18n/*.ts` files (`en.ts` value empty, as the
others there; `test/i18n.test.ts` enforces it).
