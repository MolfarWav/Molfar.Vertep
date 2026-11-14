# Engine shell client: screens, settings, languages, themes, app framing
Verified at: molfar.vertep 32fc4f6

## What it does
The shell is the signed-in browser page in `client/src`. It shows a tab strip (the Molfar agent page, app tabs, new-tab launch screens) and hosts each app in a sandboxed iframe. `Shell` mounts the Settings dialog, the update dialogs, the bug report and the install dialog; the launch screen mounts the Store. UI preferences (theme, language, tab strip, split size) live in the browser's localStorage through `prefs`, not on the server. The agent page is a separate app in `client-agent/` with no i18n folder.

## Owners
- `client/src/App.tsx` `Shell`: tab strip, active and pinned (split) tabs, the agent frame at `/agent`, the window message handler for `__molfarAgent` messages, and the mounted dialogs.
- `client/src/App.tsx` `AppCanvas`: one app tab; its sandboxed iframe, build and load state, and the handler for `__molfarRuntime` messages from the frame.
- `client/src/App.tsx` `useThemeControl`: theme id, the list from `GET /v1/themes`, and cross-tab sync through the `storage` event.
- `client/src/App.tsx` `LaunchPicker`: the home screen, shown when no app tab is active or the active tab is a new tab.
- `client/src/store.tsx` `useStore`: loads the app catalogue and the "seen" marker. This file is the app Store, not a state container; shell state is `useState` in the Shell component of App.tsx.
- `client/src/prefs.ts` `prefs`: localStorage wrapper that never throws; `RENAMED_KEYS` moves keys from the old `chrysalis-*` names.
- `client/src/api.ts` `api`: same-origin fetch wrapper for `/v1` paths; it throws translated text when the connection is lost.
- `client/src/settings.tsx` `SettingsBody`: the Settings tab list, phone drill-down, and the admin-only tabs.
- `client/src/settings.tsx` `LanguageSection`: the language picker in General.
- `client/src/theme.ts` `applyTheme`: sets `data-color-scheme`, the inline colour variables and the three theme storage keys.
- `client/src/i18n/index.ts` `tr`: string lookup, `{name}` interpolation and fallback.
- `client/src/i18n/locales.ts` `LOCALES`: the list of shipped locales.
- `client/src/model-panel.tsx` `ModelPanel`: one model's parameters, context, price and cache settings.
- `client/src/local-embeddings.tsx` `LocalEmbeddings`: download and check of the local embedding model.
- `client/src/updates-panel.tsx` `UpdatesDialog`: app and engine update list.
- `client/src/app-update.tsx` `useAppUpdate`: per-app update state behind `AppUpdateBanner`.
- `client/src/app-reads.tsx` `AppReadsPanel`: the reads an app asked for, answered via `useAppReads`.
- `client/src/app-notices.tsx` `useAppNotices`: messages from apps shown as `AppToasts`, at most three at a time.
- `client/src/notice-rules.ts` `shouldShowNotice`: when a system notice is allowed; `appNoticeMode` picks popup, system or none.
- `client/src/bug-report.tsx` `BugReportDialog`: the report form and recent client errors.
- `client/src/pwa.tsx` `setupPwa`: registers the service worker (public/sw.js) and keeps the install offer.
- `client/src/guide/guide-host.tsx` `GuideHost`: help guide and tours; `tipText` in `client/src/guide/guide.ts` picks the tip language.
- `client/public/app-bridge-host.js` `frameSrc`: builds an app's frame URL and storage snapshot; `pushTheme` tells frames about a theme change.
- `client/public/app-bridge.js` `applyShellTheme`: the frame side of the theme handshake.
- `client/public/sw.js` `CACHE`: offline cache keyed by engine version.
- `src/themes.ts` `listShellThemes`: reads the workspace's `themes/*.json`.

## Screens and settings panels
- Settings tabs, in order: General, Backup, Storage, Sync, Connections and models, Speech, Images, Molfar, Memory, MCP servers, Developer; Server and Users only for admins (`SettingsBody`).
- Connections and models (`ApiTab`, `ConnectionModels`): `ModelPanel` opens for a chosen model.
- Images (`ImagesTab`, `client/src/image-settings.tsx`): image endpoints and favourites.
- Memory (`MemoryTab`; `MemoryMeaningSection` in `settings.tsx` mounts `LocalEmbeddings`).
- Storage (`StorageTab`, `client/src/storage-settings.tsx`): cleanup plan and skipped files.
- Sync (`SyncTab`, `client/src/sync-settings.tsx`): sync settings, with `ConflictPanel` for conflicts.
- Server (`ServerTab`, `client/src/server-settings.tsx`): paths, phone QR code and engine install via `EngineUpdateButton`.
- App detail (`AppDetail`, `App.tsx`): file tree, `AppUpdateBanner`, `AppReadsPanel`, and `AppNoticeSwitch` for official apps.
- Store (`StoreDialog`, mounted by `LaunchPicker`), install (`InstallDialog`), bug report (`BugReportDialog`) and the guide (`GuideHost`, mounted by `Shell`).

## How an app is framed and themed
`AppCanvas` renders an iframe with `sandbox="allow-scripts allow-popups allow-downloads allow-forms"`, so the app has an opaque origin and cannot read shell storage. `frameSrc` returns `/app/<username>/<appId>/` with a base64 storage snapshot in the hash (`__storage=`). The frame's messages are accepted only when `e.source` is its own window and carry `__molfarRuntime: 1`. The frame gets the shell's theme with the handshake and again on each change (`pushTheme`). An app follows it through `window.molfarShell.theme()`, the `molfar:shell-theme` event, or the `data-shell-theme` and `data-shell-scheme` attributes.

## Languages
- Fourteen locales (`LOCALES`): English plus de, es, fr, it, ja, ko, nl, pl, pt, ru, tr, uk, zh. Each has one dictionary file in `client/src/i18n/`.
- A non-English file is `const dict = { "English key": "translation", ... }` with `export default dict`. `en.ts` has the same keys with empty values.
- The key is the English text. Lookup order is the current locale, then English, then the key itself, so a missing string shows in English.
- To add a string: write `tr("...")` with a literal key, run `bun scripts/i18n-keys.ts` from the repo root to regenerate `en.ts`, then add the key to all 13 other files.
- `test/i18n.test.ts` checks every key is translated (non-empty), no extra keys exist, `{placeholders}` match, and the files match `LOCALES`.
- The language is stored per browser under `molfar-lang` (`setLocale`), not on the account.

## Themes
- Built-in: `vertep` (default), `dark` and `light`, defined as `[data-color-scheme="..."]` blocks in `client/src/styles/tokens.css`.
- Custom: a workspace file `themes/<id>.json` with `name`, `scheme` ("dark" by default) and `colors`, where colours are hex values for the 18 keys in `THEME_COLOR_KEYS`. `src/themes.ts` allows at most 50 files of 16 KB each, and refuses built-in ids. Refused files are returned with a reason by `GET /v1/themes`.
- `applyTheme` writes `molfar-theme`, and for custom themes `molfar-theme-vars` and `molfar-theme-scheme`. `applyStoredTheme` runs at import so the first paint is correct.
- The theme reaches apps through `app-bridge-host.js`, which reads those three keys directly.

## If you change X, also touch Y
- A settings tab: the `TabValue` union, the `tabs` array and both render lists in `client/src/settings.tsx` (phone and desktop), plus the admin gate if it is admin-only.
- A shell string: `scripts/i18n-keys.ts` output and all 13 dictionaries.
- A shell-only route: the route lists in `test/security.test.ts` and `test/malicious-plugin.test.ts` (per the repo's rules file).
- A theme key or colour name: `client/src/theme.ts`, `src/themes.ts` (`THEME_COLOR_KEYS`, which the comment says must match), and the reads in `client/public/app-bridge-host.js`.
- A renamed preference key: `RENAMED_KEYS` in both `client/src/prefs.ts` and `client-agent/src/legacy-prefs.ts`.
- The frame handshake or storage snapshot: `client/public/app-bridge.js` and `app-bridge-host.js` together.
- Notice rules: `client/src/notice-rules.ts` and the two notice tests.

## Traps
- `client/src/store.tsx` is the app Store, not shared state.
- No "app rail" exists in the code; the strip holds tabs of kind `agent`, `app` or `new`.
- The settings tab `models` is redirected to `api` (`SettingsBody`).
- The extraction script only sees double-quoted literals in `tr("...")`; a computed key is missed, and no test compares `en.ts` with the call sites.
- A missing translation falls back to English at runtime without a message. Only `test/i18n.test.ts` catches it.
- `tipText` in `client/src/guide/guide.ts` returns Ukrainian tips only for `uk`; every other locale sees the English tip text.
- A custom theme whose file is gone falls back to Vertep when the list loads (`useThemeControl`).
- The three theme storage keys are read by apps and the agent page; a rename breaks both.
- A notice is hidden while Molfar's page is visible, focused and on screen (`shouldShowNotice`).

## Tests that guard it
`test/i18n.test.ts`, `test/themes.test.ts`, `test/app-bridge-theme.test.ts`, `test/app-bridge-storage.test.ts`, `test/app-bridge-view.test.ts`, `test/malicious-plugin.test.ts`, `test/security.test.ts`, `test/notice-rules.test.ts`, `test/notice-rules-apps.test.ts`, `test/guide-shell.test.ts`, `test/guide-pages.test.ts`, `test/pwa.test.ts`

## Not verified
- Full bodies of `App.tsx`, `settings.tsx` and the panel files; only declarations and key regions were read.
- Guide content under `builtin-skills/vertep-guide`, and `scripts/guide-l10n.ts`.
- How `__ENGINE_VERSION__` in `client/public/sw.js` is replaced.
- The value of the storage snapshot size limit (`MAX_SEED`) in `app-bridge-host.js`.
- Whether CI runs `test/i18n.test.ts`; `package.json` and the workflows were not read.
