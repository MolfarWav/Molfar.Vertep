# 0.8.1 items 3 + 3a: chat look, progress

Spec: `chat-look-spec.md` (approved). Roleplay worktree `.claude/worktrees/rp-chatlook`, branch `chatlook`
(from `v081` `f014826`, pushed only to `chatlook`). Engine notes branch `claude/v081-chatlook` (from `claude/v081`).
STATE.md is kept by the testing session; this file is the log of this item.

## Spec check against the code (2026-10-05)
Holds: `.mes_text` 15px with `--prose-scale` / `--prose-line-height` (= lineSpacing/100, default 136) /
`--prose-para-gap`; `openCharacterOnTab(id, tab)`; `CardKindBadge`; `useTouchUi()`; `hideStateTag`; sprites already
replace the avatar image; day dividers and `DashLiveLine` in the chat-view message map; `stateView` exported.
Did not hold, and what we do:
- No repeatable ornament in the app. USER (2026-10-05): use the nav rail divider `public/divider-mute.svg` (the
  vine with a flower in the middle), not the mock's diamond tile. Drawn as a CSS mask in ONE theme colour
  (`--cta`), so it follows custom themes. Under the arch: one copy, frame-wide (58px, ~6px high). Scene heading: one
  copy on each side, `mask-size: contain`. The URL comes from `--orn-url`, set inline by chat-view from
  `import.meta.env.BASE_URL` (the app is built in the browser; a root `url(/...)` in CSS breaks under a base path).
- Snapshots are capped at 40, so scenes read from snapshots would vanish in long chats. USER: a separate place log in
  the chat state, `state.places[<msgId>#<swipe>] = { place, day, time, band }`, written with each snapshot, not pruned
  with snapshots (own cap 2000, oldest by insertion dropped). `stateView.scenes` reads it along the active line.
- Settings hydrate: the engine's `settings.ui` overwrites local settings in `hydrate()` (store.ts ~615-633), so the
  `lookVersion` migration runs there, after that merge, and writes back with `PUT /settings {ui}` (like the summary
  normalisation). Idempotent: hydrate runs on every `look_changed`.
- No user/character layout split in message-row today (one markup, `displayMode` styles). The new look replaces it.
- Name colour used the CHAT card's colour (group card in groups); switch to `speaker.colors.name`.
- "Open character" only switched to the Characters view; the avatar menu opens the card itself.
- `stripEchoedName` ran on send, swipe, cancelled only (not next), exact case-sensitive `Name:`, only when names
  ride the prompt. Now: send, next, swipe, cancelled; always; the spec's forms.
- No `dashOpen`; dashboard sheets are local state in `dash-mount.tsx`. Both mounts are always mounted (CSS hides one),
  so each opens only when its media query matches (`(min-width: 1024px)` = strip/wide sheet, else the phone sheet).
- Header: no chat-level tokens or context figure. "i" popover sums `usage.input/output` over active swipes; context
  use = the last reply's `usage.input` against the preset's `samplers.contextSize`, shown only when both are known.
- `@fontsource/noto-serif` is a new dependency (bun.lock of the Roleplay repo changes: that is the app's own lockfile,
  committed there).
- Strings in message-row are hard-coded English; every label we touch moves to `t()` (en + uk).

## Contracts (shared by every worker)
### src/lib/message-actions.ts (pure, unit-tested in test/rp-message-actions.test.ts)
```ts
export type MessageActionId = 'copy' | 'translate' | 'speak' | 'bookmark' | 'fork' | 'genData' | 'peek'
  | 'hide' | 'summarize' | 'undoSummary' | 'moveUp' | 'moveDown' | 'delete' | 'deleteBelow'
export type MessageActionGroupId = 'message' | 'story' | 'delete'
export interface MessageActionCtx {
  isUser: boolean; index: number; count: number          // position in chat.messages
  isCutoff: boolean; compactions: number                 // summary cutoff row, chat.compactions
  hidden: boolean; bookmarked: boolean
  translated: boolean; translating: boolean; speaking: boolean
}
export interface MessageActionItem { id: MessageActionId; labelKey: MsgKey; danger?: boolean; disabled?: boolean }
export interface MessageActionGroup { id: MessageActionGroupId; labelKey: MsgKey; items: MessageActionItem[] }
export function messageActions(ctx: MessageActionCtx): MessageActionGroup[]   // empty groups left out
```
Rules: message = copy, translate (`msg.act.translate` / `msg.act.translating` disabled / `msg.act.untranslate`),
speak (`msg.act.speak` / `msg.act.stopSpeak`), bookmark (`msg.act.bookmark` / `msg.act.unbookmark`), fork, genData,
peek. story = hide (`msg.act.hide` / `msg.act.unhide`), undoSummary when `isCutoff && compactions > 0`, else
summarize when `!isCutoff && index > 0`, moveUp when `index > 0`, moveDown when `index < count - 1`. delete = delete,
deleteBelow when `index < count - 1` (both danger). Group headings `msg.grp.message`, `msg.grp.story`,
`msg.grp.delete`. Regenerate and Edit are NOT in the menu (primary row).

### Store (src/lib/store.ts)
`dashOpen: number` (0, not persisted) and `openDashboard(): void` (increments). `DashStripMount` opens its wide
sheet and `DashPhoneMount` its bottom sheet when the counter changes after mount, each only if its media query
matches.

### src/components/chat/avatar-menu.tsx
```tsx
export function AvatarMenu(props: {
  characterId: ID              // the SPEAKER in groups; the group card only in the group chat header
  children: React.ReactElement // the trigger (asChild)
  onViewPortrait?: () => void  // item shown only when given
  align?: 'start' | 'center' | 'end'
}): JSX.Element
```
DropdownMenu. Label: avatar-free header with the card name and `CardKindBadge` (`cardTypeOf(card)`). Items:
Card (`openCharacterOnTab(id, 'core')`), Soul (`openCharacterOnTab(id, 'soul')`; hidden when the card `isGroup` or
the dashboard is not available), Dashboard (`openDashboard()`; hidden when not available), View portrait.
Dashboard available = `useDashMaybe()?.status` is `'empty'` or `'ready'`. Keys `avatar.card`, `avatar.soul`,
`avatar.dashboard`, `avatar.portrait`, `avatar.menu` (trigger aria-label, `{name}`).

### src/components/chat/chat-details.tsx
```tsx
export function ChatDetailsButton(props: {
  title: string; chatIndex: number; chatCount: number      // "chat N of M"
  model: string | null; cost: number | null; costMsgs: number
  tokensIn: number | null; tokensOut: number | null
  context: { used: number; total: number } | null
}): JSX.Element
```
A 32px ghost icon button (Phosphor `Info`), Popover (w-72) with rows: title, chat N of M, model (`ModelMark` +
`shortModel`), spend (`formatCost`, "in / out" tokens with `formatTokens` if that helper exists, else
`toLocaleString`), context (`used / total` + a thin bar) only when given. Keys `details.open`, `details.chat`,
`details.model`, `details.spend`, `details.tokens`, `details.context`, `details.none`.

### src/components/chat/scene-heading.tsx
```tsx
export function SceneHeading(props: { place: string; sub: string | null }): JSX.Element
```
`role="heading" aria-level={3}`; `.ls-scene` markup: band, centred block (place, sub), band. `sub` is formatted by
the caller with the dashboard's existing clock wording (day + band/time).

### CSS block in src/globals.css, everything under `.look-stage` (set on the chat view's message column)
`.ls-row` (character turn grid `58px minmax(0,1fr)`, gap 20px), `.ls-row.is-user` (offset right, max-width 62%,
2px left rule `--cta` at 60%, padding-left 16px, single column), `.ls-arch` (58x74, radius 29px 29px 2px 2px, 1px
`--border`, 3px padding, `--card` bg; `img` radius 26px 26px 0 0 cover), `.ls-arch::after` (ornament, 6px, opacity
.9), `.ls-head` (name line), `.ls-name` (Kurale 12px uppercase .16em), `.ls-time` (11px muted), `.ls-meta` (11px
muted, opacity 0, shown on `.ls-row:hover` / `:focus-within`, `display:none` under 600px), `.ls-tools` (actions row
under the text, opacity 0 → 1 on hover/focus-within; `.ls-tools.is-pinned` always 1), `.ls-chip` (thinking chip),
`.ls-scene` + `.ls-band` (ornament both sides, 10px high band, opacity .8; place Kurale 19px, sub 12px italic muted),
`.ls-live` (italic serif 13.5px, margin-left 78px; 52px on phones). Phone (<600px): arch 40x52 radius 20/17,
grid `40px` gap 12px, user max-width 86%, scene place 16px. `prefers-reduced-motion`: no fades.

- Scene headings (USER, after seeing regional vyshyvanka samples): the scene bands are our own cross-stitch tile
  (16x13 stitches: rhombus with an inner rhombus, a cross between rhombi, dotted edges; drawn by a script, not
  copied from any image), in TWO theme colours: `public/ornament-stitch-a.svg` (main, `--cta`) and
  `public/ornament-stitch-b.svg` (second, `--foreground` at .45), two masks on `::before`/`::after`, URLs in
  `--stitch-a-url` / `--stitch-b-url`. The arch keeps the rail divider (6px is too small for stitches).
- Paragraph gap: `paragraphSpacing` is in px and always set, so the `.8em` default needs a migration too: 10 → 14.

## Queued by the user here (move into START.md's queue when this branch is merged into claude/v081)
- "Reply ready" notification (user, 2026-10-05): a Settings option, off by default, that shows a popup when a reply
  is ready while the app is in the background (another tab or window, the phone app minimised). Likely the browser
  Notifications API (asks for permission when switched on; fires only when `document.hidden`), click focuses the
  chat; the Android APK needs a look at whether its WebView/engine service can post the notification instead.
  Not part of the chat look; plan and spec it separately.
- 0d. Molfar's token use (user, 2026-10-06), right after 0c: Molfar burns tokens very fast; even simple tasks make
  many model calls, and on longer chats a task can cost several million tokens. Must be solved. Start by
  MEASURING, not guessing: per run, the number of model calls, input/output tokens per call, what makes up the input
  (system prompt, AGENTS.md and docs, skills index, history, tool results), and how much repeats between calls
  (the prompt inspector on the agent page and `estimateTextTokens` in `src/agent/context-budget.ts`). Likely
  suspects to check (guesses): the whole history and every tool result resent on each step, large file reads kept
  in context, the skills index riding every chat (overlaps 0c), provider prompt caching not used, too many small
  tool steps. Then fix by measured share, with the user choosing the trade-offs.

## Log
- 2026-10-05: worktrees made; spec checked by an Explore agent; user answered the open points above.
- Drafts (message-actions, test, avatar-menu, chat-details, scene-heading, CSS block, en/uk keys) by an external
  code model from the contracts; fixes listed in the UI task (missing-card fallback, details rows, uk wording,
  stitch bands).
- Roleplay `f7f4736` (pushed to `chatlook`): relations place log `state.places` (written in `applySensor`, the
  only snapshot writer; dropped with `dropSnapshot`; cap 2000) + `scenesOf` → `stateView.scenes` (cap 200, falls
  back to snapshot clocks); engine plugin `stripEchoedName(text, name)` on send/next/swipe/cancelled, literal
  case-insensitive match of the forms in the spec, no longer tied to names riding the prompt; `src/lib/echo-name.ts`
  `hideEchoedName` (same rule); docs. 542 Roleplay tests. Built by a subagent, reviewed here.
- UI subagent running (settings + migration, message row, avatar menu, header, scenes, live line, browser check).
