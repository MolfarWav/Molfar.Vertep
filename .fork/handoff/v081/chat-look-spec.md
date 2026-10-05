# 0.8.1 item 3 + 3a: the chat look (mix of A and B) and the path from the chat to the card

Roleplay app, clone `.claude/worktrees/rp-dashboard`, branch `v081`. Mock: `.fork/ui-assets/chat-looks.html`
(desktop only, untracked; variants `.va` = A "book page", `.vb` = B "Vertep stage"; CSS quoted below where needed).

## User decisions (2026-10-04/05)
- A mix of A and B. From A: the plain text of messages (no box or frame around it), the serif type, and the
  message actions that appear on hover. From B: the user's turns offset to the right and narrower, the arched
  portrait frame, scene changes as a heading between ornament bands, and on phones the always-visible action bar.
- The old look is NOT kept. One look for everyone (a visual-novel look "D" comes later as an option, so keep the
  look switch possible in code: a `look` value, today only `stage`).
- Clicking a character's avatar (chat header and message) opens a menu: Card / Soul / Dashboard.
- Also from the 2026-10-04 list: the 15-item message menu becomes 3 primary actions + a grouped More; model and
  cost leave the header for an "i" popover and the message meta; the echoed "Name:" prefix goes; the header no
  longer gets cut off on the right.

## 1. Settings and migration (src/lib/types.ts, seed.ts, theme-applier.tsx, settings-view.tsx, chat-view.tsx)
- `AppSettings.displayMode` keeps its type for compatibility but every stored value renders the new look; remove the
  display-mode control from Settings > Appearance and from the chat's "Display settings" sheet. (Later `look: 'vn'`.)
- Settings that no longer apply in the new look are hidden from the UI, not deleted from storage: `avatarShape`,
  `avatarStyle` (the arch replaces them), `messageTint`. `hideAvatars`, `messageSpacing`, `fontScale`,
  `lineSpacing`, `paragraphSpacing`, `proseFont`, `showTimestamps/Tokens/Cost/GenTimer/ModelIcons/MessageIds/Edited`,
  `expandMessageActions`, `showExpressionSprites`, `chatWidth` keep working.
- New prose font `noto-serif` (`@fontsource/noto-serif`, weights 400/700 + 400 italic, latin + cyrillic + cyrillic-ext;
  import it like `@fontsource/kurale` in src/main.tsx). Add it to `PROSE_FONTS`.
- One-time migration (`settings.lookVersion`, absent = 1, new = 2), applied where settings are hydrated: if
  `proseFont` is the old default → `noto-serif`; if `lineSpacing` is the old default → the value that gives
  line-height 1.8. Then `lookVersion: 2`. A user's own non-default choices stay. New installs get these defaults.
- `.mes_text` base size: 17px (was 15px) times `--prose-scale`; below 600px 16.5px; line-height from
  `--prose-line-height` (default 1.8 now); paragraph gap .8em.

## 2. Message row (src/components/chat/message-row.tsx; new CSS block in src/globals.css under `.look-stage`)
Character turn:
- No border, no background, no rounded box. Grid `58px minmax(0,1fr)`, column gap 20px (phone: `40px` and 12px).
- Portrait in an ARCH frame (mock `.vb .arch`): 58×74, `border-radius: 29px 29px 2px 2px`, 1px `border` colour,
  3px padding, `--card` background; the image inside with radius `26px 26px 0 0`, cover. Under the frame a 5px band of
  the app's existing vyshyvanka ornament (the rail separator ornament already in the app: reuse its asset/CSS; opacity
  .9). Phone: 40×52, radius 20/17. `hideAvatars` hides the column. Expression sprites keep replacing the image.
- The stats column under the avatar is REMOVED. Name line (mock `.va .nm`): name in Kurale 12px, uppercase,
  letter-spacing .16em, in the speaker's name colour (`readableNameColor`, use the SPEAKER's colour in groups, not the
  chat character's); then time (11px Inter, muted). At the right a meta line (11px, muted): model · gen time · tokens ·
  cost (each only when its `show*` setting is on), `opacity: 0`, shown on row hover / focus-within; never on phones.
  "edited", "N cached", bookmark and "hidden from AI" marks stay in the name line as today.
- Prose: `.mes_text` as in §1 (Noto Serif). Narration/quote colours unchanged.
- Thinking: the "Thought for Ns" trigger becomes a small chip (mock `.chip`), same behaviour.
User turn (persona):
- Offset right and narrower (mock `.vb .turn.user`): `margin-left: auto; max-width: 62%` (phone 86%), no portrait,
  no box; a 2px left rule in `--cta` at 60% opacity with 16px padding; name line in `--q`-like quote colour
  (use the theme's quote colour var), same meta behaviour.
Actions (both kinds):
- Desktop (fine pointer): a row under the text (mock `.va .tools`), `opacity: 0`, fades in on row hover/focus-within;
  three icon+label buttons Edit, Copy, Regenerate (character turns only), then a "More" button (⋯). Labels hidden below
  600px. Hidden while streaming/editing/sliding, as today.
- Touch (`useTouchUi()`): the same row ALWAYS visible (B's pinned bar), icons only, 36px targets.
- Swipe arrows ("‹ n/N ›") stay visible on the last character turn (not hover-gated), at the start of the actions row.
- "More" menu in three labelled groups (mock `.mh` headings):
  - Message: Copy text, Translate / Remove translation, Speak / Stop, Bookmark / Remove bookmark, Fork here,
    Generation data, Prompt peek.
  - Story: Hide from AI / Unhide, Summarize everything above / Undo last summary, Move up, Move down.
  - Delete (danger colour): Delete this, Delete this and below.
  Put the item list in a pure module `src/lib/message-actions.ts` (ids, group, label key, when shown) and unit-test it.
- All new labels via `t()` (en + uk).
Avatar click (character): opens the avatar menu (§3), replacing today's popover button "Open character". The enlarge
(lightbox) stays as a menu item "View portrait". Persona avatar: "Open persona" only (as today).

## 3. Avatar menu and header (3a)
- New `src/components/chat/avatar-menu.tsx`: a popover/menu for a character id: header with name + `CardKindBadge`;
  items **Card** (`openCharacterOnTab(id, 'core')`), **Soul** (`openCharacterOnTab(id, 'soul')`; hidden for group cards
  and when the dashboard plugin is absent), **Dashboard** (opens the dashboard: see below; hidden when the plugin is
  absent), **View portrait**. In a group chat the menu acts on the SPEAKER (the member), not the group card.
- Dashboard opening: add store state `dashOpen: number` (a counter) + action `openDashboard()`; `DashStripMount`
  opens its wide sheet and `DashPhoneMount` its bottom sheet when the counter changes (whichever is mounted at this
  width).
- Desktop header (chat-view.tsx ~612): the avatar becomes the avatar-menu trigger for the chat's character (group chat:
  the group card's menu with Card only + Dashboard). Remove the model badge and the cost badge; add an "i" button
  that opens a details popover (mock `.details`): chat title, "chat N of M", model, spend (cost, tokens in/out),
  context use if known. Fix the cut-off: title block `min-w-0 flex-1` with truncation, right group `shrink-0`, and the
  quick-switch pill shows only the preset label below `xl`, all three labels from `xl` up.
- Phone header (`md:hidden` nav ~686): add the chat character's avatar (28px, arch-free rounded) right after Back,
  opening the same avatar menu.

## 4. Scene headings (plugins/relations + chat-view)
- Plugin: `stateView` adds `scenes: [{ key, place, day, time, band }]` = for the active line, every snapshot key whose
  `clock.place` differs from the previous snapshot's (the first snapshot with a place counts). Cap 200 entries. Read
  only; unit-test it in test/rp-dashboard.test.ts.
- UI: chat-view inserts a scene heading BEFORE the message whose `<id>#<activeSwipe>` is in `view.scenes` (the place
  changed during that message). Look (mock `.vb .scene`): centred, place in Kurale 19px (phone 16), under it the
  time words ("evening, day 2") in 12px italic muted, a 10px ornament band on each side (flex 1, opacity .8).
  Only when the dashboard plugin is present and has state; otherwise nothing (today's day dividers stay as they are).

## 5. Echoed name (plugins/engine/plugin.js + display)
- `stripEchoedName`: strip a leading echo of the speaker's name whether or not names ride the prompt, when the reply
  starts (after whitespace) with the name followed by `:` — case-insensitive, also `**Name:**`, `*Name:*`,
  `Name :`; only at the very start, once. Apply in send, next, swipe and cancelled (not continue). Tests in the test
  that drives the engine plugin (add cases: plain, bold, different case, not at start → kept, other name → kept).
- Display: `src/lib/echo-name.ts` `hideEchoedName(text, name)` with the same rule, used in message-row for saved
  messages (old ones still carry it). Unit-tested.

## 6. Live line
`DashLiveLine` under the newest message: A style (mock `.va .live`): italic serif 13.5px, aligned with the text column
(left margin = avatar column + gap).

## Checks
typecheck (only the old plugin-panel.tsx:88), `bun test test/`, lint touched files against HEAD (no new rule kinds),
browser check (skill browser-check, throwaway engine + mock model, never the user's data): a solo chat and a group
chat with 6+ turns incl. a user turn, a reasoning reply, a tool reply, a reply starting "Name:" (saved before the
change), a swipe set, two scene changes from the dashboard; 1280 dark uk, 1280 light en, 390 light uk (touch
emulation); hover shows actions and meta on desktop; avatar menu opens Card/Soul/Dashboard (each lands right, in a
group on the member); the "i" popover; the header does not cut off at 800 px and 1024 px; no horizontal scroll at 390.
