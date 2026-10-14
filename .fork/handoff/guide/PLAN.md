# In-app guide: plan (2026-10-14)

Why (user): "we have piled up features, not sure everyone will find them". Many live behind "⋯" menus,
the Canvas tab, the Prompt board, quick moves, Soul, Library. A landing site like
https://pyrxpia.github.io/sola-hub/ was considered and dropped; the README stays as it is.

## Decisions (user, 2026-10-14)
- **All three layers**, one system, shipped in steps:
  1. **What's new**: after an update, each new feature is pointed out once, on its place, with
     "Show me" and "Got it".
  2. **Section tours**: on the first visit to a section, a 2-4 step tour with an arrow on each
     element; skippable.
  3. **Help "?"**: a searchable list of everything the app can do; each item has "Show me", which
     opens the right place and highlights the element.
- **Active**: a tour starts by itself on the first visit (with Skip). Settings get "Show tours"
  (on by default) and "Show all tours again".
- **Where**: Roleplay, the shell, Molfar's page.
- **Languages**: English and Ukrainian. Tips live in their own registry, not in the shell's 14-locale
  i18n; other locales fall back to English. (The `test/i18n.test.ts` rule covers `client/src/i18n`
  strings only; the tip registry is data.)

## Shape
- **A tip** (data, one registry per surface, same format everywhere):
  `{ id, since, surface, target, title: {en, uk}, body: {en, uk}, open? }`
  - `since`: the app or engine version that brought the feature. "What's new" shows tips whose
    `since` is newer than the version the viewer last saw, then records the current one.
  - `target`: a `data-guide="<id>"` attribute on the element (stable, survives restyling; never a
    CSS class or text match).
  - `open`: how to get there for "Show me" (a section/view key, a board, a tab), resolved by the
    surface's own router.
- **A tour**: an ordered list of tip ids for a section, started on the first visit.
- **State**: seen tip ids, finished tours, last seen version, "Show tours" switch. v1 per device
  (localStorage, wrapped in try/catch); later it can move to the user's settings so two machines
  do not repeat each other.
- **UI**: a spotlight (dimmed page with a hole around the target) and a bubble with title, body,
  step dots, Back / Next / Skip. On phones (< 768 px): a bottom sheet with the same text, and the
  target scrolled into view and outlined instead of a floating bubble. Theme tokens only; checked
  in Vertep, dark, light and 390 px. A missing target (element not on screen) skips that step
  quietly, never blocks.
- **Molfar**: a short part in his app-authoring skill: a feature he builds can come with a tip
  entry (same format), so it shows up in What's new.

## Steps (each its own release, with browser checks)
1. **Roleplay kit + What's new + three tours**: the registry, the spotlight / sheet, the state,
   `data-guide` attributes; tours for Canvas (both boards), the Prompt board and the composer;
   What's new for 4.44-4.46 features. Settings switches. Built (`claude/guide-kit`), plus a
   text-only tip `new.report-bug` (user, 2026-10-14): where to report a bug (account menu, the
   start page's footer link). A tip's `target` is optional for things outside the app frame.
   When the bug report that Molfar processes before sending lands (another session, engine
   `client/src/bug-report.tsx`), reword that tip, and the help "?" (step 2) gets the same item.
2. **Roleplay help "?"** in the rail (and the phone More menu) and the remaining tours: Dashboard,
   Soul, Library, Characters / Groups, Lorebooks, presets, chat menu.
3. **Shell**: first run (connect a model, open Roleplay), Split, Updates, Store, Report a bug (spotlight
   on the account-menu item and the start-page link, with how Molfar helps write the report); its
   own "?" in the account menu. The same kit, ported to `client/`.
4. **Molfar's page**: modes (Full / Accept / Plan), checkpoints and restore, skills, projects,
   the context counter. English only on that page today; uk added with the guide.
5. **Molfar's skill**: tips for what he builds.

## Content
The feature list per surface is the first job of each step: walk the app, list every feature a
user decides with, write a one-line "what it does for you" for each. Drafts by an external model
from that list and screenshots; the orchestrator reviews every line against the app (no promise
the code does not keep). Plain words, no jargon (UX rule): "Litopys, the chronicler" once, then
"chapters" and "facts".

## Open
- Order of steps 3-4 vs other queue items: the user's call when step 2 ships.
