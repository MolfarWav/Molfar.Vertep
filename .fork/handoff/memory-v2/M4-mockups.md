# Library mockups: the parts the user picked (inventory)

Drafted by an external model from the untracked mockups in the desktop main checkout `.fork/ui-assets/library/` (A Chronicle, B Codex, C Ledger, D Threads; made-up data). Read the HTML itself for exact look; this list is the map.

## A — Chronicle

**Timeline**
- Layout: main left column, `flex: 3`, `min-width: 0`; sits inside `.main-grid` with right rail.
- Data per chapter: title, message range, badges (`Застаріло`, `Частина довгої сцени`, `Відредаговано`), summary text.
- Fact rows nested under each chapter: sentence, type badge, weight badge, state badge, hover actions.
- Controls: hover action buttons — Edit, Pin, Unpin, Delete; pin opens modal.
- Empty/loading: not specified.
- Tokens: `--panel`, `--raised`, `--text`, `--muted`, `--line`, `--accent`, `--timeline-pin`, badge colours red/blue/amber/green/purple/cyan/soft.

**Cast Rail (right)**
- Layout: `flex: 1.2`, `min-width: 230px`, sticky top 12px, `.right-rail`.
- Data per character: name, pinned count, total facts, lasting changes list.
- Controls: none.
- Tokens: `--raised`, `--line`, `--muted`, `--faint`.

**Proposals Tab**
- Layout: inside `.tabs-panel` below timeline, left column.
- Data per item: type (merge/rewrite/pin), description text.
- Controls: Accept button, Reject button; tab switch between Proposals and Bridges.
- Tokens: `--raised`, `--line`, `--muted`, `--warning`, `--accent`.

**Bridges Tab**
- Layout: same `.tabs-panel`, hidden by default.
- Data per item: source → target, fact count, chapter count.
- Controls: none.
- Tokens: `--raised`, `--line`, `--muted`.

**Compact Drawer**
- Layout: bottom of app, `max-width: 360px`, left-aligned, margin-top 28px.
- Data per item: fact sentence.
- Controls: Edit, Pin, Unpin, Delete icon buttons (always visible).
- Tokens: `--panel`, `--line`.

**Pin Limit Modal**
- Layout: fixed overlay, centered, `max-width: 480px`.
- Data: list of 5 pinned facts with radio selection.
- Controls: Cancel, Replace buttons.
- Tokens: `--panel`, `--line`, `--accent`, `--muted`.

**Worker Line**
- Layout: top bar right side.
- Data: green/red dot, last run time, scene range, status.
- Controls: none.
- Tokens: `--success`, `--danger`, `--muted`.

---

## B — Codex

**Chapters Strip**
- Layout: full width, horizontal scroll, `flex: 0 0 240px` cards, padding-bottom 16px.
- Data per card: label, message range, summary text, badges (`Застаріло`, `Частина довгої сцени`, `Відредаговано`).
- Controls: hover actions — Edit, Pin, Unpin, Remove, Delete.
- Tokens: `--panel`, `--line`, badge-stale, badge-long, badge-edited.

**Character Cards (Codex Grid)**
- Layout: grid `auto-fill minmax(250px, 1fr)`, `flex: 2.2`; world card spans 2 columns.
- Data per card: arch portrait, name, subtitle, pinned facts list, traits badges, lasting changes text, "knows about others" text.
- Controls: none on card.
- Tokens: `--panel`, `--raised`, `--accent` portrait border, `--cta` list border, `--faint` subdivision labels.

**Proposals Column**
- Layout: right side, `flex: 0.8`, `min-width: 240px`, `height: fit-content`.
- Data per item: proposal type, description.
- Controls: Accept, Reject buttons.
- Tokens: `--warning` left border, `--success`, `--danger`.

**Worker Line**
- Layout: below top bar, full width, pill.
- Data: green dot, last run time, scene range, status, error message (`429 rate limit`).
- Controls: "Bridge between chats" toggle button to show/hide bridge list.
- Tokens: `--success`, `--danger`, `--muted`.

**Bridge List**
- Layout: inside worker line, hidden until toggled.
- Data: source → target, fact count, chapter count.
- Tokens: `--panel`, `--line`.

**Compact Drawer**
- Layout: bottom, `width: 360px`, `margin-top: 8px`.
- Data: current chat name, fact text with state.
- Controls: none.
- Tokens: `--deeper`, `--line`, state colours.

**Pin Limit Modal**
- Layout: fixed overlay, centered, `max-width: 420px`.
- Data: 5 pinned facts with radio selection.
- Controls: Cancel, Replace.
- Tokens: `--raised`, `--accent` border and title.

---

## C — Ledger

**Chat List (left pane)**
- Layout: `width: 280px`, `flex-shrink: 0`, scrollable to 520px.
- Data per item: chat title, status dot (ok/warn/error), fact count, chapter count, participant names.
- Controls: none (chat selection).
- Tokens: `--success`, `--warning`, `--danger`, `--muted`, `--faint`.

**Tabs**
- Layout: right pane top, horizontal flex wrap, border-bottom.
- Tabs: Chapters, Facts, Proposals, Activity.
- Active tab: `--accent` background, white text.
- Controls: click to switch panes.

**Filter Bar**
- Layout: below tabs, visible on Facts tab; flex wrap.
- Controls: search input, type select, weight select, who select, state select.
- Tokens: `--raised`, `--line`, `--muted`.

**Chapter Rows**
- Layout: list container, `max-height: 560px`, scrollable.
- Data: title, message range, badges, description text.
- Controls: hover actions — Edit, Pin, Restore, Delete.
- Tokens: `--raised`, row border, badge styles.

**Fact Rows**
- Layout: same list container.
- Data: fact text; badges for subject, knows, type, weight, state.
- Controls: hover actions — Edit, Pin, Remove, Delete; pin opens modal.
- Tokens: type badge colours (event, omen, world, relation, constant, plan), weight badges (domestic, important, key), state badges (active, pinned, removed, replaced, proposed).

**Proposal Rows**
- Layout: same list container.
- Data: title, description.
- Controls: Accept, Reject buttons.
- Tokens: row styling, `--cta`, `--danger`.

**Activity Rows**
- Layout: same list container.
- Data: worker label in `--cta`, log text.
- Controls: none.
- Tokens: `--cta`, `--muted`.

**Worker Line**
- Layout: left pane bottom, `margin-top: auto`.
- Data: last run time, scene range, status.
- Tokens: `--raised`, `--line`, `--muted`.

**Bridge Button**
- Layout: left pane below worker line.
- Controls: toggle button "Bridge between chats"; toggles bridge list visibility.
- Tokens: `--raised`, `--line`.

**Compact Drawer**
- Layout: bottom of app, `max-width: 360px`.
- Data: chat name, fact list.
- Controls: none.
- Tokens: `--deep`, `--line`, `--accent` heading.

**Pin Limit Modal**
- Layout: fixed backdrop, centered, `max-width: 520px`.
- Data: 5 pinned facts with radio.
- Controls: Cancel, Replace.
- Tokens: `--panel`, `--accent` radio accent.

---

## D — Threads

**Chat Canvas Panel**
- Layout: right side, `flex: 1.2`, `min-width: 320px`, sticky top 16px, `max-height: calc(100vh - 40px)`.
- Data: SVG network of chat nodes (circle radius = fact count), bridge lines (solid = active, dashed = inactive).
- Controls: node click selects; bridge button activates "draw a bridge" mode.
- Tokens: `--accent` node stroke, `--cta` active bridge, `--line` inactive bridge.

**Node Detail Panel**
- Layout: inside right panel, below SVG.
- Data: selected chat name, recent facts, first two chapters.
- Controls: none.
- Tokens: `--panel`, `--accent` title.

**Chapters List (left main)**
- Layout: `flex: 2`, vertical list.
- Data per chapter: label, range, badges (outdated, long scene, edited), summary.
- Controls: hover actions — Edit, Pin, Remove.
- Tokens: `--raised`, `--accent` left border, badge colours.

**Facts List (left main)**
- Layout: below chapters.
- Data per fact: text, type chip, subject chip, knows chip, weight chip, state chip.
- Controls: hover actions — Edit, Pin, Unpin, Remove, Restore, Delete.
- Tokens: type chip colours (event, omen, change, rel, world, plan), weight key red, state colours.

**Proposals (left main)**
- Layout: below facts.
- Data per item: action title, detail text.
- Controls: Accept, Reject.
- Tokens: `--bg-deeper`, dashed border, `--accent` title.

**Bridge List**
- Layout: below proposals, flex wrap chips.
- Data: source → target, fact count, chapter count.
- Tokens: `--cta` text.

**Bridge Button**
- Layout: above bridge list.
- Controls: toggle "draw bridge" mode; outline accent when active; hint text shown.

**Compact Chat Panel**
- Layout: bottom of left main, `max-width: 420px`.
- Data: chat name, fact list.
- Tokens: `--bg-deeper`, `--line`.

**Worker Line**
- Layout: top of left main.
- Data: green dot, last run, scene range, error message.
- Tokens: `--success`, `--danger`.

**Pin Limit Modal**
- Layout: fixed overlay, centered, `max-width: 460px`.
- Data: 5 pinned facts with radio.
- Controls: Cancel, Replace.
- Tokens: `--panel`, `--accent` title.

---

## Shared

- **Fact chip**: small rounded badge, system-ui font, 10–12px, padding 2–10px; type chips use distinct background colours (event/omen/change/relation/world/plan); weight chip `ключове` uses accent red background, white text, bold; state chips use success green (active), accent red (pinned), warning amber (proposed), muted grey with line-through (removed), purple (replaced).
- **Weight badge**: everyday in muted grey border; important in amber/brown; key in accent red filled.
- **Type icon**: no dedicated icon; type shown as text badge with colour coding (blue event, amber omen, green change, purple relation, cyan world, grey plan).
- **Pin control**: icon buttons labelled "Закріпити" / "Відкріпити"; pin action opens a modal when limit reached; modal shows radio list of currently pinned facts with Cancel and Replace buttons; pinned facts get accent left border or filled state badge.
- **Worker line**: repeated across all files — green/amber/red status dot, last run time, scene range, error messages; pill or rounded container.
- **Theme toggle**: all files include dark/light toggle button (`🌓 Тема`, `🌙 Тема`, `Світло / Тінь`, `Темна / Світла`).
- **Compact drawer**: all files show a bottom drawer with current chat facts, max-width 360–420px.
- **Common tokens**: `--bg`, `--panel`, `--raised`, `--text`, `--muted`, `--faint`, `--line`, `--accent` (#e2213a), `--cta` (#39d5ff), `--success`, `--warning`, `--danger`.
