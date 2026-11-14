# Roleplay UI: shell, sections, navigation, themes, shared pieces, languages
Verified at: molfar.vertep-roleplay 56bf594

## What it does
- The shell (`src/components/shell/app-shell.tsx`) draws an icon rail (desktop) or tab bar (phone), one page (`view`), and an optional drawer (`drawer`).
- Section ids: `src/components/shell/sections.ts`; `renderView` maps each to a view.
- Navigation state is a Zustand store in `src/lib/store.ts`; no `useNav` or `use-nav` hook exists.

## Owners
- `src/components/shell/app-shell.tsx` `AppShell`: boot gate, layout rules.
- `src/components/shell/app-shell.tsx` `renderView`: ViewKey to view.
- `src/components/shell/app-shell.tsx` `SectionDrawer`: drawer on desktop and phone.
- `src/components/shell/app-shell.tsx` `IconRail`: rail items.
- `src/components/shell/sections.ts` `SECTIONS`: sections, label keys, groups, hues.
- `src/components/shell/sections.ts` `PHONE_TABS`: the three phone tabs.
- `src/components/shell/section-page.tsx` `SectionPage`: page title row.
- `src/components/shell/master-detail.tsx` `MasterDetail`: two panes.
- `src/components/shell/mobile-tab-bar.tsx` `MobileTabBar`: phone tabs, More sheet.
- `src/components/shell/rail-hues.ts` `RAIL_HUES`: icon tints.
- `src/components/shell/inbox.tsx` `InboxDrawer`: needs-you inbox.
- `src/lib/store.ts` `navigate`: section and chat navigation; `setView` picks page or drawer. On phones, drawers open only over a chat.
- `src/lib/store.ts` `DRAWER_VIEWS`: sections that may be drawers.
- `src/hooks/use-back-close.ts` `useBackClose`: phone back gesture.
- `src/components/theme-applier.tsx` `ThemeApplier`: palette, light/dark class, UI scale.
- `src/lib/i18n.ts` `DICTIONARIES`: the en and uk tables.
- `src/lib/shell-bridge.ts` `onShellView`: outer shell opens Settings.

## Sections
| id | label key | group | opens |
|---|---|---|---|
| home | nav.home | 0 | `HomeView` |
| chats | nav.chats | 0 | `ChatsView` |
| characters | nav.characters | 1 | `CharactersView mode="characters"` |
| groups | nav.groups | 1 | `CharactersView mode="groups"` |
| marketplace | nav.marketplace | 1 | `MarketplaceView` |
| personas | nav.personas | 1 | `PersonasView` |
| lorebooks | nav.lorebooks | 2 | `LorebooksView` |
| litopys (Library) | nav.litopys | 2 | `LitopysView`, in `library/` |
| canvas | nav.canvas | 2 | `CanvasView`, in `canvas/` |
| canvas, id `agents` | nav.agents | 2 | `CanvasView`, board `agents` (a link) |
| world | nav.world | 2 | `WorldView`, in `world/` |
| presets | nav.presets | 3 | `PresetsView` |
| quickreplies (Shortcuts) | nav.quickreplies | 4 | `QuickRepliesView` |
| extensions (Tools) | nav.extensions | 4 | `ExtensionsView` |
| settings (Roleplay settings) | nav.settings | none | `SettingsView`; off the rail |

## The chat screen's panels
All in src/components/chat/; `chat-view.tsx` mounts the screen.
- `agent-block.tsx`: one agent write, as a line.
- `agent-grid.tsx`: agent grid widget.
- `agent-html.tsx`: agent html widget, sealed.
- `agent-issue.tsx`: one checker finding.
- `agent-notes-switch.tsx`: notes switch for all agents.
- `agent-notes.tsx`: agent notes under a reply.
- `agent-own-limits.tsx`: one agent's limits.
- `agent-panels.tsx`: where an agent panel sits.
- `agent-permissions.tsx`: one agent's permissions.
- `agents-panel.tsx`: data hook for a chat's agents.
- `archived-banner.tsx`: archived-chat band.
- `attachment-gallery.tsx`: attachment thumbnails.
- `avatar-menu.tsx`: portrait menu.
- `carries-panel.tsx`: stories not reaching this chat.
- `carries-stories.tsx`: story switches.
- `changes-note.tsx`: "what changed" line.
- `chat-css-sheet.tsx`: per-chat CSS examples.
- `chat-details.tsx`: context ring, details button.
- `chat-filters.tsx`: persona and character selects.
- `chat-log-import-dialog.tsx`: import a text log.
- `chat-preview-text.tsx`: message text as shown.
- `chat-quick-bar.tsx`: header pill (preset/persona/model).
- `chat-tools.tsx`: story tools menu.
- `chat-view.tsx`: the chat screen, `ChatView`.
- `composer-autocomplete.tsx`: macro autocomplete.
- `composer.tsx`: message input, `Composer`.
- `convert-to-group-dialog.tsx`: chat to group.
- `create-group-dialog.tsx`: create a group.
- `dice-note.tsx`: dice mark.
- `direction-chips.tsx`: stage directions as chips.
- `effective-params.tsx`: temperature, output, reasoning.
- `expanded-editor.tsx`: full-height writing surface.
- `expression-panel.tsx`: expressions.
- `field-variant-picker.tsx`: fields with alternates.
- `fired-panel.tsx`: "What fired" panel.
- `fired-tabs.tsx`: its tabs.
- `gallery-dialog.tsx`: characters gallery.
- `group-member-bar.tsx`: group member bar.
- `header-tint.ts`: `headerTint`, header buttons.
- `help-dialog.tsx`: /help reference.
- `image-gen-dialog.tsx`: image generation.
- `leak-note.tsx`: secret-knowledge note.
- `manage-chats-dialog.tsx`: manage chats.
- `message-row.tsx`: one message, `MessageRow`.
- `new-chat-step.tsx`: step before a chat starts.
- `opening-hint.tsx`: greeting hint, continued stories.
- `pending-reply.tsx`: reply before its first word.
- `pov-menu.tsx`: continue from one view.
- `preset-choices.tsx`: preset picks hook.
- `preset-note.tsx`: transcript line on preset change.
- `preset-panel.tsx`: chat's Preset panel.
- `prompt-peek-dialog.tsx`: assembled prompt preview.
- `prompt-sources.tsx`: sources in the peek.
- `qr-bar.tsx`: quick-reply chips.
- `regenerate-hint-dialog.tsx`: regenerate with a hint.
- `request-size.tsx`: request-size button.
- `scene-heading.tsx`: story time of a scene.
- `scene-mark-dialog.tsx`: sets messages apart as a scene.
- `story-nudge.tsx`: "Story, move" chip.
- `use-avatar-extra.ts`: side portrait space.
- `voice-colors-dialog.tsx`: per-character colours.
- `window-unknown-note.tsx`: unknown window note.
- `world-sheet.tsx`: World DM sheet.

Dashboard: `src/components/dashboard/dash-mount.tsx` (`DashStripMount`, `DashPhoneMount`).

## Settings tabs and Library tabs
- Roleplay settings, `src/components/views/settings-view.tsx` (`SECTIONS`, `navItems`): appearance, chat, streaming, themes, prose, custom-css, card-tasks, studio-import, data, guide.
- Library, `src/components/library/litopys-view.tsx` (`ModeSwitch`): overview, ledger.
- Library Ledger, `src/components/library/ledger.tsx` (`TAB_IDS`): chapters, facts, turns, proposals, habits, activity, settings.
- Dashboard, `src/components/dashboard/dash-tabs.tsx` (`DashTabId`): person, here, quests, notes, history.

## Play-like vs settings-like
Judged by what each section opens. World is placed by its head.

| Play-like (what the reader sees) | Settings-like (how the story is made) |
|---|---|
| Home | Characters |
| Chats | Groups |
| Library, Overview tab | Marketplace |
| | Personas |
| | Lorebooks |
| | Library, Ledger tab |
| | Canvas and Agents |
| | World (head opens World settings) |
| | Presets |
| | Shortcuts |
| | Tools |
| | Roleplay settings |

## Themes and tokens
- Built-in presets (`src/lib/seed.ts`): Vertep (default), Void, Charcoal, Daylight.
- `ThemeApplier` writes palette variables on `<html>`, clearing them when no preset matches; `--cta` uses `legibleFill`.
- Background luminance sets `settings.themeMode` and the `dark`/`light` class.
- `src/globals.css` `:root` holds light tokens, `.dark` dark ones. `src/shadcn-theme.css` holds keyframes and variants, no colour tokens.

## Shared UI pieces and the state of docs/UI-CATALOG.md
Files in src/components/ui/ (38):
- `alert-dialog.tsx`: confirm dialog.
- `avatar.tsx`: avatar.
- `badge.tsx`: Badge.
- `button.tsx`: Button.
- `card.tsx`: card, "rows" variant.
- `checkbox.tsx`: checkbox.
- `collapsible.tsx`: bare collapsible.
- `command.tsx`: command list.
- `confirm.tsx`: `useConfirm`.
- `dialog.tsx`: dialog.
- `dropdown-menu.tsx`: dropdown menu.
- `empty.tsx`: empty state.
- `error-boundary.tsx`: `ErrorBoundary`.
- `field.tsx`: form field.
- `fold.tsx`: `Fold`, settings block.
- `image-viewer.tsx`: image overlay.
- `info-tip.tsx`: (i) popover.
- `input-group.tsx`: input with addons.
- `input.tsx`: Input.
- `label.tsx`: Label.
- `marquee-text.tsx`: `MarqueeText`.
- `pager.tsx`: `Pager`.
- `popover.tsx`: popover.
- `scroll-area.tsx`: ScrollArea.
- `scroll-strip.tsx`: strip with fades.
- `section.tsx`: `Section`, `Chip`.
- `select.tsx`: select.
- `separator.tsx`: Separator.
- `setting-row.tsx`: `SettingRow`.
- `sheet.tsx`: Sheet, `sheetClasses`.
- `slider.tsx`: Slider.
- `sonner.tsx`: Toaster.
- `switch.tsx`: Switch.
- `tabs.tsx`: Tabs.
- `textarea.tsx`: Textarea.
- `toggle-chip.tsx`: `ToggleChip`.
- `tone.ts`: `TONES`.
- `tooltip.tsx`: Tooltip.

docs/UI-CATALOG.md (lines 1 to 80 read): status "not built", building waits. Stale: `ui/fold.tsx`, `ui/section.tsx`, `ui/setting-row.tsx` and `ui/tone.ts` now exist. 
## Languages
- Where: `src/lib/i18n.ts`. No locales folder; no script checks strings.
- How many: two, `Lang = 'en' | 'uk'`, 5,245 keys each (grep count).
- Adding a string: add the key to `en` and `uk` (`uk` is `Record<MsgKey, string>`, so typecheck catches a gap). Read with `t('key')` or `useT()`.
- Language choice: `resolveLanguage`; `store.ts` follows the shell locale until the user picks.

## If you change X, also touch Y
- Add a section: `SECTIONS` in `sections.ts`, `ViewKey` in `store.ts`, `renderView`, `RAIL_HUES`, `DRAWER_VIEWS` if a drawer, and both languages.
- Add a settings tab: `SECTIONS` or `navItems` in `settings-view.tsx`.
- Change a palette token: `globals.css` `:root` and `.dark`, and `ThemeApplier`'s key list.
- Change Dashboard tabs: `DashTabId`, `TONE_TAB` (`dash-common.tsx`).
- Change Canvas boards: `CanvasBoardKey` (`src/lib/canvas-board.ts`) and the Agents item.

## Traps
- `settings` has group `'none'` (off the rail); Home's Settings button opens it.
- Two arrays are named `SECTIONS`: `sections.ts` and `settings-view.tsx`.
- Agents and Canvas share the key `canvas`, so `SectionDrawer` titles an open Agents drawer "Canvas".
- `ViewKey` also holds `connections` (shows Home) and `chat`; neither is in `SECTIONS`.
- On desktop a persisted section view becomes a drawer over Home; `drawer` is not persisted.
- Settings nav mixes hard-coded English labels with translated ones.
- `ThemeApplier`'s doc comment sits above `PROSE_FONTS`, not the component.

## Tests that guard it
`test/rp-i18n.test.ts`, `test/rp-shell-view.test.ts`, `test/ui-mobile-tab-bar.test.tsx`, `test/rp-themes.test.ts`, `test/rp-legible-fill.test.ts`, `test/rp-chat-header-tint.test.ts`, `test/ui-sheet-width.test.ts`, `test/ui-fold.test.tsx`, `test/ui-section.test.tsx`, `test/ui-setting-row.test.tsx`, `test/type-scale.test.ts`. No test imports `app-shell`, `use-back-close` or `inbox`.

## Not verified
- How the outer shell's theme reaches the app (`shell-bridge.ts` has no theme call).
- Whether `CanvasView` titles the Agents board itself.
- Most of `use-back-close.ts` and `inbox.tsx`; the 1024 px Dashboard switch (comments only); the rest of `docs/UI-CATALOG.md`.
- One-liners for files with no header comment were inferred from names.