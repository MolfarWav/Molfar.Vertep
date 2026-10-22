# Molfar Vertep: project state

Fork of Chrysalis Engine; repo MolfarWav/Molfar.Vertep. Current as of 2026-10-22.
Standing rules: `CLAUDE.md`. The queue of work and how to start a session: `.fork/handoff/START.md`.
History: per release the CHANGELOG, `.fork/release-notes/`, and git history (the long logs that
used to live here and the finished handoffs were removed on 2026-10-10; `git log -- .fork` finds them).

## Memory bridge work (2026-10-22, started): branch `claude/memory-bridge` in both repos, a separate release after 1.2.14
Roleplay worktree `E:\Claude\rp-memory` (fork branch `claude/memory-bridge`, from fork main 4.60.0, pushed). Engine branch only carries notes. Done so far: #100 server part (Roleplay commit 54034e2): `plugins/relations/plugin.js` `buildInherit`/`loadStateFor`/`inheritRoute` (`POST /dashboard/inherit`), `state.inherited`, src `inherit` on carried notes and names, base snapshot from the end of the linked chat; tests `test/rp-dash-inherit.test.ts`; 1369 Roleplay tests pass. Decisions taken: copy once at the start (before the chat's own first snapshot), only what is alive (`freshNotes`), the nearest chat in a chain, switch only until the first own snapshot. Later the same day (Roleplay commits dbe3989, f7170eb, 2eea8b3): the Dashboard banner with the "Start clean" switch (`src/components/dashboard/dash-carried.tsx`, browser-checked by a subagent at 1280 dark, 390 light, uk; fixes after the check: 40 px button on phones, phone empty bar wraps its title, the background catch-up skips a carried chat that only holds a greeting); the owner decided ONE switch for the Dashboard and the Litopys backstory (`buildBackstory` reads `dashboard/state/<id>.json` `inherited.off`); #98 server part: `said` list (`applySaid`, `saidBlock`, `SAID_RULE`, past default `SENSOR_PROMPT_12`, config `said.perTurn` 1-4 default 2 and `said.inject`, view `chars[x].said`, carried with `inherit`, own prompt part "Dashboard · said"), tests `test/rp-dash-said.test.ts`; 1379 Roleplay tests pass, typecheck clean; DATA-FORMATS has a "Dashboard state" section. Design note `.fork/handoff/memory-bridge/DESIGN.md` (card memory file, dedupe with Litopys 4b, deleted chats 4a, skills = short behaviour rule blocks #106). Owner rules from the thread: no duplicate injections between card memory, Litopys and the Dashboard; a deleted chat must break nothing. #98 UI done and browser-checked at 1280 dark, 390 light, uk (Roleplay 0d2085a + a touch-size and label fix after the check, not re-shot): `dash-said.tsx`, config `said` in Dashboard settings, `plugin:said` switch on the Prompt board (engine plugin keys, prompt-order, prompt-board). NOT done: card memory (steps 3-5), #86, #85, the Litopys side of dedupe 4b. The mockups (banner 3 states, Said block, card tab Memory with Skills and Changes, import dialog, phone Chat memory) were shown in the thread and accepted by the owner.
## NEXT THREAD (2026-10-22): the memory plan is GitHub issue #102
Read #102 first: the owner's design (a "memory bridge": continuation of a chat, card long memory with sources and import before a chat is deleted, `said` facts as their own injection, memory by sector), the order of work (#100 first), the open questions, where the code is and what to verify. Linked: #97 #98 #99 #100 #86 #85; siblings #101 (Molfar token use), #95 (World from cards). Open work lives in issues, not here.
## Card editor pass (2026-10-22): #103 Save changes, #104 card task model, #105 section marks. Roleplay fork branch `claude/card-editor-103-105` (worktree `E:\Claude\rp-card`, from fork main 4.59.3), merged into the fork's main on the owner's word as Roleplay 4.60.0 (2026-10-22), pushed; engine 1.2.14 prepared (package.json, CHANGELOG, `.fork/release-notes/1.2.14.md`), the user pushes the tag v1.2.14. After the tag: close #103, #104, #105. Review handoff: `.fork/handoff/card-editor-103/HANDOFF-review.md`; task for the built-in agent: `.fork/handoff/card-editor-103/workspace-agent-task.md`
Checks: typecheck clean, Roleplay tests 1362 pass. Browser-checked by a subagent (throwaway engine with the worktree installed; shots in the session scratchpad `bc\`): draft/Save/Discard/leave guard (back arrow, rail, phone history.back, reload), export/duplicate asks, conflict dialog, export marks and re-import, card model panel, Settings > Card tasks, Structure it in 12 parts on a 30k-character card, 1280 dark/light, 390 light, uk. Fixed after the check: the Save bar text no longer truncates in uk, the unsaved chip is amber, "about N parts", Save refetches the card from the engine first (a change made seconds earlier is now seen as a conflict). Left (not fixed): the bottom-right toast covers part of the Save bar on desktop; the header icon buttons are 28 px tall on phones (older, #88); Soul tab dot next to the unsaved dot; the Profile panel's part count is an estimate (server packs paragraphs, can differ by one).
Deviations from the issues: #105 import is strict (a card is only changed when its text reads back exactly; unmatched lines do NOT go to notes); #104 does not cover card translation or Read from picture (own translator / Portrait model); on a failed Soul rating "Choose another model" sets the sensor model, which a card with its own model overrides. The owner tried the branch on the desktop through `Molfar-Vertep.bat dev` and said it works; `roleplay.source.json` is back on `HEAD`.
## 1.2.13 RELEASED 2026-10-22 (tag v1.2.13 pushed by the user; the release has the 6 archives and the APK). Notes `.fork/release-notes/1.2.13.md`. Checks: typecheck, build:client pass; tests 16 failures, all the known Windows-only ones (source watcher, 0600 x4, edge TTS x2, installing a release x8, sandbox git). After the tag: close #91 (#88 stays open, leftovers in a comment); the owner's `roleplay.source.json` is already back on `HEAD`.
## Merged 2026-10-22 on the owner's word: engine `claude/cost-checks-ui-fixes` fast-forwarded into main; Roleplay `claude/inbox-backgrounds` fast-forwarded into the fork's main as 4.59.3 (an app update, no engine change needed; every install gets it through the Updates panel). The owner played 4.59.3: the notebook fills again (#97 stays open for a few more chats). Open from this thread: #98 (a "said" note kind, owner accepted the shape in the issue), #95 (World from cards), the #97 idea 3 not built on purpose.
## Branch `claude/cost-checks-ui-fixes` (2026-10-21, from main 1.2.12 notes; now merged, see above) + Roleplay 4.59.1 to 4.59.3 (worktree `E:\Claude\rp-inbox`, from fork main 4.59.0)
Issues filed 2026-10-21 from the old notes, grouped: #85-#94 and #95 (World DM "from cards" collects facts instead of inventing). This branch takes #91 and the shell part of #88; the Roleplay branch the Roleplay part of #88 and two owner reports.
- #91 (engine): `ConnectionDef.costChecks` auto|on|off (unset = follow the global switch; the env switch beats both; `src/agent/cost-checks.ts` `effectiveCostChecksMode`, `connectionCostChecks`); `ModelInfo.costChecks` rides the existing `/v1/models` list; the agent page hides price figures (header, run summaries, Inspector) when the model's checks are off (`client-agent/src/lib/cost-display.ts`). Select in the connection Add/Edit form (14 locales). Decided: hiding follows the effective mode, so a global "Never ask" also hides prices. The image_generate ask still uses the run model's mode. Browser-checked with mock prices (shots in `E:\Claude\bc-cost\`, outside the repo). Not seen: a real paid run through the ask cards (unit-tested only); dark 390 and light 1280 of the new select.
- #88 shell: `{files} files · ~{kb} KB` translated, launcher footer wraps in whole items (uk 390), icon-only buttons in Settings > Images are 40 px on phones (`touch` prop on `IconButton`, rule in `ui.css`). Left: engine error messages are English only; text buttons Check/Edit/Add in Images and the footer links are still < 40 px on phones.
- Roleplay 4.59.1 (CHANGELOG): inbox opens at the first click (`inboxClosesOn` in `attention-core.ts`; cause: the rail button closes the open section, the inbox closed itself on that change); the "Change the background by scene" switch is back on the chat's Backgrounds tab (above Folder), gone from the World settings; Prompt board shows one total on a phone; Cancel for card, field and lorebook translation (AbortController; nothing written; requests already sent still run). Tests 1293 pass. Browser-checked (shots `E:\Claude\rp-check\`). Not done in #88: the ~340 px of chrome above the Prompt board list on a phone (a 42 px patch is saved at `E:\Claude\rp-check\prompt-board-header-and-chip.patch`, below the 80 px bar). Note from the check: the new Backgrounds block's "Folder of images" select and the "Folder" block below look like duplicates.
- Roleplay 4.59.2 (same fork branch, owner's requests 2026-10-22; replaces 4.59.1 as the version the branch carries): a place typed in the set builder now draws a ticked chip (`world-bg-set.tsx`; it was in the state and the cost but never rendered); "Add from existing" in a world's Backgrounds (`world-bg-existing.tsx`, helpers `existingGroups`/`copiesInto`: copies library entries, the file is shared, so deleting a copy leaves the original); Tools > Backgrounds search over name, tag and folder name (`searchBackgrounds`, folder select set aside while searching). Browser-checked at 1280 dark / 390 light / uk (shots `E:\Claude\rp-check\existing\`); the native search X was hidden after the check. Found in passing: the Tools tab labels (Image Generation, Data Bank, Backgrounds...) are English strings in `extensions-view.tsx`, not translated in uk (noted on #63). Tests 1298 pass.
- Roleplay 4.59.3 (same fork branch, #97, owner's report 2026-10-22: the sensor stopped writing "learned" facts in ~5 chats): found in `_debug/dashboard.json` that a failing run had `learned.who` = the owner's own character (and the user in `present`); `applyNotebook` drops user-held facts by design, silently. A run a few minutes later had the NPC as holder and 2 notes were stored, so it is intermittent, a model habit; no code regression found (last notes before the stop: 2026-10-19 23:10 local, 4.54.0). Built: prompt says `who` is a present character, never the user's, and `present` never lists the user (`SENSOR_PROMPT_11` keeps the old text as a past default; position-based tests in rp-dashboard/rp-prompts moved by one); `state.keptOut` {user, absent} counted in `applyNotebook`, in the state view, and shown as amber lines by `Notices` (dash-common.tsx; uk reworded to "Не збережено фактів: N." after the check, the plural agreement was wrong); with `debug` on the last 10 sensor runs go to `_debug/dashboard-runs.json`. Browser-checked (shots `E:\Claude\rp-check\kept\`). Tests 1304 pass. Not done on purpose: remapping a user-held fact to the only other present character. #97 stays open until the owner plays a few chats.
- The full tab freeze of the inbox (owner's Chrome: Home > inbox > Soul row > card > inbox again) was NOT reproduced in two headless runs; the race above is the only defect found. The owner tests on 4.59.1; if it still freezes, record a Performance profile at the second click. The owner's `credentials/<user>/app-upstream/roleplay.source.json` was pinned to a session branch (stuck on 4.57.0, which is why #82's fix did not arrive); set back to `HEAD` 2026-10-21 (backup `.bak-2026-10-21`). To test 4.59.1 on the desktop set its `ref` to `claude/inbox-backgrounds`, then back to `HEAD` after the release.

## 1.2.12 = Roleplay 4.59.0 (preset import, #84, #31, #41, #81) + #26: built 2026-10-21, not released (engine branch `claude/release-1.2.12` from main 1.2.11; Roleplay fork branch `claude/release-4.59.0` from main 4.58.0, worktree `E:\Claude\rp-1212`). Notes `.fork/release-notes/1.2.12.md`
Release steps on the user's word: Roleplay branch merged to the fork's main (ships to every install: ask first), engine main fast-forwarded, the user pushes tag v1.2.12; then close #26, #31, #41, #57, #81 and #84 (thank goosebillis for #84, found and fixed through Molfar). #49 was closed (not planned, no reply from the reporter). v1.2.11 is out (main 0c23504, tag exists).
- #26: `src/builder/browser/stale.ts` + host.ts: before each build batch the host compares the deps bundle of the engine's dev meta with its session's and starts a fresh session when they differ. Cause inferred (another tab/device built since), not reproduced.
- #57 (Roleplay, details `.fork/handoff/preset-import-57/changes-57.md`): `src/lib/st-structure.ts` (headers -> groups, Choices, setvar prompts -> variables), `preset-report.ts` (report types, macro scan/rewrite), `import-shapes.ts` (`presetImportFull`, regex, samplers, sourceNote), `components/presets/import-report-dialog.tsx`. Marinara regex files import (`regexScriptsOf`). Tried read-only on DEUS, Freaky Frankenstein 5.4, Molfar, Lucid Loom (ST) and FRANKENX, agentX (Marinara); Megumin not yet. Known gap: DEUS-style macro picks (`{{.x}}`) read "not set".
- #84: patch from the reporter (MessageImage in markdown.tsx, proxy `/v1/apps/<id>/img`, allowlist = plugin `networkHosts`), kept with a per-source failure state and a render test. Checked in a browser: 502/403 from the proxy (cookie is sent from the frame), alt-text link instead of a broken icon.
- #31: unsent attachments go to `/v1/assets` and the draft keeps handles (`lib/drafts.ts`); no delete (the store is content-addressed and shared). #41: `canvas-kit/wire.ts`. #81: `applyThreads` skips an open item resolved in the same report; sensor prompt line + past-default entry.
- Also in Roleplay 4.59.0 after the browser check: unique preset names on re-import, Marinara presets keep top-level `extensions.regex_scripts` (bound to the preset), Chat links board stored in settings `canvasBoard` (migrated from localStorage), hover label fix. #83: no new evidence; this desktop's old log shows 2-3 full builds 12-20 s apart ~25 s after each start and hourly (xx:30, start+1h) without a start; waiting for a 1.2.11 log with `build_needed` from a start that shows the toast.
- Checks: engine typecheck passes; tests 904 pass, the known Windows-only failures plus load flakes (5 s timeouts that pass alone). Roleplay 1277 pass, typecheck clean. Browser-checked by a subagent at 1280 dark / 390 light / uk (shots in the session scratchpad `bc12\`). Open UX notes: the Presets guide tip can sit on top of the report dialog; the import toast is English only; repeated imports make same-named presets; the Canvas board is not remembered.

## 1.2.11 = cost checks, new apps register, card links, sign-in paste box, tidy inbox (RELEASED 2026-10-21): built on branch `claude/release-1.2.11` 2026-10-21 (= `claude/issue-73` + `claude/issues-77-78-58`; Roleplay 4.58.0 on the fork's branch of the same name). Notes `.fork/release-notes/1.2.11.md`
Release steps still to do on the user's word: main fast-forwarded in both repos, the user pushes the tag v1.2.11; then issues are closed (#77, #78, #80, #82, #73) and the Discord post for 1.2.10 + 1.2.11 goes out. #58 and #79 were closed earlier the same day. The reload toast (build_needed) moves to its own issue.
- #73 points 2 and 3: The engine emits `steer_landed` (`agent.ts`, from the injected user message's `message_start`) and the agent page keeps `steerPending` ({id, text}) in the store; `UserMessage` shows the muted line until it lands or the run ends. `answer()` falls back to `send()` (a steer) on "no pending question" during a run. Test in `test/agent-steer.test.ts`. #59 and #24 were closed by the owner's call on 2026-10-21 (reopen if it returns).
- #77 cost checks: `src/agent/cost-checks.ts` (`costChecks` in settings.json auto|on|off, `MOLFAR_VERTEP_COST_CHECKS=off` for an instance). Auto = off when the model's base URL is loopback/LAN/single-label/`.internal|.lan|.home.arpa`. Off removes run_budget, the plan gate, the model_try and image_generate asks, and the prompt sentence. Settings > Molfar "Cost checks" (14 locales). Not done: per-app or per-connection switches (the reporter's wish); the cost figures on run summaries stay.
- #78: `newAppRefusal` (run-tools.ts) blocks write_file into `apps/<id>/` with no manifest and unlocks the app group; prompt rules in both prompts and the app-authoring skill (digests regenerated); small-model budget test 3.75k -> 3.8k. Cause: app_create sits in the hidden "app" group and a local Qwen wrote files by hand.
- #58: the first guess (sandbox `allow-popups-to-escape-sandbox`) was wrong and is reverted: the user's Chrome showed ERR_NETWORK_ACCESS_REVOKED, i.e. the popup inherits the frame's `Connection-Allowlist` (`frameConnections`, only the plugins' `networkHosts`; jannyai.com is not in Roleplay's list, only search./image.jannyai.com). Fix: app-bridge.js sends `open-external` for `<a target=_blank>` / Ctrl-click / `window.open` to another site, app-bridge-host.js opens it with noopener after a user activation, never an engine origin or non-http(s). Tests in app-bridge-storage.test.ts. Not tried in a real browser by me; the user checks on `dev`.
- #80 (OAuth redirect URL on another machine): pi's `manual_code` prompt is parked like a guided step (`askUser` in the oauth start route) and answered through `/answer`; the OAuth form shows the sign-in link above the box; test in provider-signin.test.ts. Only Anthropic's flow was exercised (state-mismatch path, no network); other pi subscriptions that race a callback share the same prompt type.
- The reload toast "Reloaded: live editing could not patch a change in place" (user, 2026-10-21, at start and while playing; = #24): only Roleplay's dev runtime (`src/builder/browser/runtime.ts` fullReload) says it; reasons: an `app_built` full from another build, a hot update missing, a module no component boundary can take. The reason is in the console (`[chrysalis] reloading: ...`, lost on reload without Preserve log); the engine log now says full build vs hot update. Cause not found yet.
- #58 closed by the user 2026-10-21 (JannyAI and Chub open from the app, checked by hand on `dev`). #79 closed (rebrand, answered). #82 (Roleplay inbox, Roleplay fork branch `claude/issues-77-78-58`, a588b6b, not merged, Roleplay "Unreleased"): the "..." rows were soul drafts of deleted cards (6 of 7 in the user's workspace); the relations plugin now skips drafts with no card; every inbox row has Dismiss (failure/Library locally by key, Soul via DELETE /dashboard/soul-draft), Select + Select all + Dismiss N (asks twice with Soul rows). The freeze when reopening the inbox was NOT reproduced (throwaway engine + real Roleplay, from Home and Chats, valid and ghost rows); with the tour overlay up the rail click times out, which looked like a freeze. Ask the user for the steps if it recurs. To test: set `ref` in `data/credentials/<user>/app-upstream/roleplay.source.json` to the branch and update Roleplay.
- Reload toast investigation: `[apps] <user>/<app> build_needed: <files>` is logged now; the user's start at 11:45 UTC had no build at all and no toast, earlier starts had 1-3 full builds with an equal source rev. Open.
- Checks: typecheck, build:client pass; full run 912 tests, the known Windows-only failures only (edge TTS, installing a release, 0600 modes, sandbox git, source watcher). Browser-checked at 1280 dark (Settings section saves `costChecks`, the guard refuses a write and the file is absent); 390 px light and uk not shot (same classes as Small-model mode).

## 1.2.10 = approval cards, question popup, steer arrow, Chub error: RELEASED 2026-10-21 on the user's word (main fast-forwarded to 2f8d506; the user pushes the tag v1.2.10; #76 and #71 closed, #24, #59, #73 stay open). Notes `.fork/release-notes/1.2.10.md`
- #76 (Molfar shows no approval buttons, 10 min timeout). Cause found in code: `edit_file` is a parallel tool, so two edits to one protected app each asked; the page holds ONE `ask`, the second card replaced the first, and the hidden question waited out `app.ts` ask timeout (10 min). Fix: `ask` in `app.ts` queues per chat (`askQueues`, `askEpoch` so Stop drops queued ones), `askToChange` (`tools.ts`) serializes per user+area and re-checks `isAllowed` after the wait (test in `test/protect.test.ts`), `GET /v1/agent/pending?sessionId=` returns the waiting card (shell-only, in both security lists), the page (`store.ts` `syncPendingAsk`) asks on socket open, on tab visible and every 5 s during a run, a late `ask_user_done` no longer closes another card. The reporter's "YOLO mode" is NOT built: it is a decision about the protected-path boundary (a per-chat "allow for this chat" on the card would be the narrow form); say so in the issue.
- #73 point 1 only: a question that times out emits `ask_user_done`. Points 2 and 3 (404 -> steer, "read after the current step" hint) are open.
- Popup (user, 2026-10-21: "Molfar's requests pop up on the right even if the agent window is not on"): the agent page announces its `ask` to the shell (`announceAsk` in `client-agent/src/shell.ts`, store subscription), the shell shows `AgentAskPopup` (App.tsx) bottom-right, full width on phones, only when the agent tab is not active and nothing is pinned; × hides one ask id; a reloaded agent page ("ready") clears it. Strings "Molfar is asking you" / "Open Molfar" in all 14 locales. Not built: an OS/browser notification when the whole browser tab is in the background (Notification API needs a permission step and a setting; backlog item 7).
- Lost update found by the browser check: `edit_file` / `json_set` computed the change before the question, so after one shared Allow the second parallel edit overwrote the first. Both now redo the change on the fresh file after the ask (test in `test/protect.test.ts`). `write_file` is last-write-wins by design.
- #71: `SteerButton` in `thread.aui.tsx` shows for the whole run, `aria-disabled` while the box is empty (not `disabled`, so the tooltip works).
- #59 Chub: the `[DONE]`-after-error fix from `claude/project-thread-tqxguf` (cherry-picked). Compared our request with Marinara's (packages/server/src/services/llm/providers/openai.provider.ts, plain fetch): Marinara sends model, messages, stream, max_tokens, stream_options.include_usage, temperature etc., headers Content-Type + Authorization only (+ identity encoding). Ours differed in `store: false`, the `x-stainless-*` headers, the `pi (...)` user agent and gzip encoding. Only `store` was removed for non-OpenAI hosts (`supportsStore: false` in `custom.ts`); the headers stay. NOT verified against Chub (it answers 403 from our servers, the reporter's own curl hits the same upstream timeout), so the issue stays open and asks for the base URL and model id used in Marinara.
- #24: could not be reproduced. Static reading: `data/` and `plugins/` are not build sources (`HIDDEN_TOP`), so a Prompt-board write cannot rebuild; a frame reload comes from a full build (`output.full`, including an "update" on a cold builder session), another tab's full build, an app update, or the dev runtime's own `fullReload`. The builder now passes the reason to `onReload(why)`; the shell writes it to the console and `recordClientError` (so a bug report carries it). Issue stays open for a report with that line.
- #64 got a status comment (what #52 already does, what is missing). #72, #75, #77-#81 not touched.
- pi stays 1.2.0 (1.3.0 of 2026-10-15 is 5 days old on 2026-10-21; eligible from 2026-10-22).

## 1.2.9 = Check the cache: RELEASED 2026-10-20 on the user's word (main fast-forwarded; the user pushes the tag v1.2.9; no Roleplay change). Notes `.fork/release-notes/1.2.9.md`.
`POST /v1/models/cache-check {model}` (`src/cache-probe.ts`, shell only): ~2.5k-token prompt with a fresh first line, 2 calls in turn (3 on a miss: GLM on NanoGPT misses then hits), max_tokens 16, reasoning off, paramsSource request. Verdict cached/none/silent. A "Prompt cache" row in the model panel (Settings → Connections and models → sliders). Checked live through the engine: NanoGPT Gemma 4 31B cached 2272 of 2298, GLM 5.3 none on that run.

## 1.2.8 = prompt cache + Vertep Lite plan: RELEASED 2026-10-20 on the user's word (main fast-forwarded in both repos; the user pushes the tag v1.2.8; Roleplay 4.57.0 on the fork's main). Brought in the Roleplay half of `claude/project-thread-tqxguf` (Dashboard/Litopys notes before the newest turn); its engine half (Chub SSE `[DONE]` after an error, #59) is still only on that branch. Plan leak: the engine splits `reasoningTags` only when the provider sent no reasoning (`src/models.ts`, `!hasThinking`/`!reasoning`), so Roleplay's `cutInlineThinking` moves the tagged block on commit; an engine-side fix would also cover streaming. NanoGPT cache measured: Gemma 4 31B 3-6 min, GLM 5.3 unreliable.

## 1.2.7 = Polish (#15) + Vertep Lite: RELEASED 2026-10-20 on the user's word (main fast-forwarded in both repos; the user pushes the tag v1.2.7; Roleplay 4.56.0 on the fork's main). Notes `.fork/release-notes/1.2.7.md`. The user's `roleplay.source.json` ref is back on `HEAD`. Close #15 once the tag is out.

### Polish my message (#15): rebuilt 2026-10-20
The workspace version (built by an external agent) always ended in "the helper model gave nothing usable": its
`plugins/polish/plugin.js` answered `{ status, body }`, and `runPluginRoute` passes on only `{ status, json | text }`,
so the page got an empty 200 (verified by running the old plugin through the runtime). Rebuilt in the fork:
`plugins/polish` (plain two-phase llm, `{ status, json }`, no result files or polling), the model is the chat's own
(page `modelFor(chat)` → chat meta → app default), the built-in prompt corrects and enriches the draft keeping its
language, person, actions and speech; `utilityPrompts.polish` (blank = built-in, `DEFAULT_POLISH_PROMPT` mirrors the
plugin, `test/rp-polish.test.ts`); a Polish button in the composer's quick moves (icon-only on a phone) and in the
"+" menu; the result comes back as a composer fill with Undo. Testing: the user's `roleplay.source.json` ref points at
the branch (switch back to `HEAD` after the release); his workspace copy must be dropped first
(task prompt in the project files, `polish-15/workspace-agent-task.md`). No engine change.
Same branch: built-in preset **Vertep Lite** (`data/presets/vertep-lite.json` + `_vertep-lite.json`, generated by
`scripts/vertep-lite.ts`, seeded by `onAppUpdate` from 4.56.0): ~1.9k tokens with default picks (<3k heaviest),
static rules first and only plan/Muse/reply note after the newest message (cache), micro plan in `<plan>` split by
`reasoningTags`, Muse = `{{random}}` creative prompt. Tested on three subscription models (Gemma 4 31B, GLM, DeepSeek
Flash): language and tense hold after moving them to the reply note; DeepSeek Flash still writes short.

## 1.2.5 = #52 World DM: RELEASED 2026-10-18 on the user's word (main fast-forwarded in both repos; the user pushes the tag v1.2.5; Roleplay 4.53.0 on the fork's main). Notes `.fork/release-notes/1.2.5.md`. Checks: engine typecheck, build:client pass, tests 897 pass + the 3 known failures; Roleplay 1130 pass. Also carries the #59 text-only stream fix from the batch branch
Roleplay only; the engine repo gets docs and the card skill copy. Version picked when the release order is clear
(the 18.10 batch on `claude/soji-sse-parse-48vyqm` targets Roleplay 4.52.0; this would be 4.53.0 after it).
- P0 built 2026-10-18: `plugins/world/` (Chronicler level, every N replies + World turn, own model), the chat's own
  world book (`ownerChatId` on the book, `worldBookId` on the chat meta; engine plugin scans/forks/deletes it, the app
  never lists it), sheet "World DM" in the chat menu (en + uk), DATA-FORMATS "World DM", both card skill copies,
  workspace task `.fork/handoff/world-dm/workspace-agent-task.md`. 1094 Roleplay tests pass, typecheck clean.
  Details and the answers to the design's open questions: `.fork/handoff/world-dm/DESIGN.md`, "P0 as built".
- Scope decided P0-P2 (user, 2026-10-18); P3 (interview, create from cards, recipes, carry to a new chat) later.
  Peek accepted: "Look at the world" button behind a spoiler warning, records only; fronts and events stay hidden.
- P1/P2 built 2026-10-18 (Roleplay commit b157928): living/director/antagonist/chaos levels, fronts with clocks,
  one event per reply through the llmRequest hook (missed: re-sent once, then dropped), Dashboard sensor part
  "Direction" (`scene.direction`/`before`; explicit freezes the DM, combat pauses, transition runs it), stagnation
  trigger, toggles, `plugin:world` prompt-board switch, guide tip `help.world-dm`, peek route + dialog.
  Two-language chats: the DM adds the player's spelling of a name as an alias. 1107 Roleplay tests pass.
- Release order (user via coordinator): 1.2.4 / Roleplay 4.52.0 ships first; then merge main into this branch,
  bump to 4.53.0 (manifest, APP_VERSION, tip `since`, CHANGELOG, notes), close #52 with it. The user pushes the tag.
- Roleplay 4.53.0 ready on the branch (version, CHANGELOG, tip `new.world-dm`, Vertep display name cherry-picked from
  the batch branch). Browser check done (dark/light 1280 and 390, uk, peek dialog); fixed: red peek confirm, English
  "last run" time in uk. Shipped as engine 1.2.5 (user's choice). Next: P3 (start a world, carry to a new chat), not scheduled.
- main (1.2.4 / Roleplay 4.52.0) merged into both branches 2026-10-18; no conflicts in code.

## 1.2.4: RELEASED 2026-10-18 on the user's word (main fast-forwarded; the user pushes the tag v1.2.4; Roleplay 4.52.0 on the fork's main)
Checks: typecheck, build:client pass; tests 895 pass, 3 known failures (edge TTS x2 network, hostile plugin). Roleplay 1100 pass.
Branch `claude/soji-sse-parse-48vyqm` (both repos). Details: `.fork/handoff/batch-1018/HANDOFF.md`, CHANGELOG, `.fork/release-notes/1.2.4.md`.
- #59 Soji "malformed server-sent event JSON": custom openai-completions connections read the stream through
  `src/providers/sse-tolerant.ts` (`[DONE]` with trailing text accepted, several JSON `data:` lines split, other non-JSON
  events dropped and logged `[custom-provider:<id>] skipped a stream event that is not JSON`). Cause inferred: pi 1.2.0
  moved the OpenAI SDK 6.40 -> 7.19, which fails on any non-JSON event. Issue stays OPEN until the reporter confirms;
  their log line tells which shape Soji sends. Trade-off: a plain-text error inside a 200 stream shows as an empty reply.
- #70 steer: while Molfar runs, Enter or the arrow next to Stop sends `agent.steer()`; the run record keeps `steers`
  ({text, turn}) so history and the page show the message where it arrived. Attachments wait until the run ends.
- #45 Settings > Sync: "Replace the sync with this device" (`POST /v1/sync/push {replace:true}`: plans against
  base=remote, implies replaceKeys).
- Roleplay 4.52.0: inbox (#55), Litopys Consolidate (#51) and recency (#50), previews run display regex (#44), Molfar
  preset names (#42), Prompt board folds by group / sent-only / search / sticky total (#39 #40 #43, written by Molfar
  in the user's workspace and carried over; group switch fixed on review). Open UX notes from the browser check: the
  phone shows the total twice; once unfolded, the fold state stays unfolded per preset; ~330 px of chrome above the
  phone list.
- Shipped in 1.2.5 / Roleplay 4.53.0: the "Vertep" display name, and the #59 text-only stream fix (f1594e1).
- Not started (user, 2026-10-18): #69 parallel Molfar chats; the user plans the rest through Molfar with free models.

## 1.2.3: RELEASED 2026-10-18 on the user's word (main fast-forwarded; the user pushes the tag v1.2.3; Roleplay 4.51.0 on the fork's main)
Checks: typecheck, build:client pass; tests 875 pass, 3 known failures (edge TTS x2 network, hostile plugin). pi stays 1.2.0 (1.3.0 is under 7 days old).
- Molfar's chat takes text files, JSON, docx/odt (`src/agent/uploads.ts`, `PUT /v1/agent/uploads/:name`, shell-only):
  saved under `uploads/<day>/`, the message names them `@uploads/...`, the existing mention reader puts them in
  (64 KB cap, big JSON as its outline). uploads/ is gitignored, in AGENT_WRITE_DENYLIST, kept by backups. UTF-16
  (Notepad) converted, other non-UTF-8 refused with a reason; PDF refused (no extractor). Mentions take any script.
- #65 start menu in `Molfar-Vertep.bat` (keys 1-7 and 0 = Quit, `choice /t 10 /d 1`; any option skips it; 3 and 4 take the
  update without asking again; 7 = reinstall + rebuild without pulling). Not run on Windows: needs the user's hand test.
  Logo (user, 2026-10-18): `scripts/logo.ans` (UTF-8 + 24-bit colour codes, `-text` in .gitattributes), typed under
  chcp 65001 when `mode con` says >= 101 columns; the menu is drawn beside it with cursor codes. Messages coloured
  through MV_H/S/G/W/E/D/K. Also untested on Windows.
- #66 step 1 of 2: update/rollback accept `molfar-vertep[.exe]` and `chrysalis[.exe]` (`programNames`,
  `previousProgram` in self-update.ts; the restart runs the program the update installed); env vars
  `MOLFAR_VERTEP_*` first, `CHRYSALIS_*` after (`src/env.ts`; vars the engine sets for a child keep the old name,
  the child may be an older version); command alias `molfar-vertep` (install-cli, npm bin), links refreshed at start.
  Still ships `chrysalis[.exe]`. Step 2 (ship the new name) needs the user's word and a choice: a copy on 1.2.2 or
  older that skips 1.2.3 cannot update to a release with only the new name (ship both names for a while, or accept
  a manual download). Not touched: data paths, `logs/chrysalis.log`, `libchrysalis.so`, app-facing identifiers.
- ComfyUI (user, 2026-10-18): a workflow from Export (API) is adapted on save (`adaptComfyWorkflow` in images.ts):
  %prompt%, %negative_prompt%, %seed% on every sampler, %width%/%height% on the first pass's empty latent, %model% on
  checkpoint loaders; steps/CFG/sampler stay. The editor format is refused with how to export the API one.
- ComfyUI import (user, 2026-10-18): Settings > Images "Import workflow file…" and "Take the settings from this
  workflow" (`POST /v1/images/workflow/adapt`, shell-only; `adaptComfyWorkflow(…, {all:true})`) also take steps,
  CFG, sampler, scheduler, denoise, clip skip and up to five LoRAs into the form and put placeholders in their place.
- OAuth "invalid_grant" on Claude 5.5 checks (user, 2026-10-18): inferred cause, not verified on a real token:
  refreshes ran in parallel, and `modify` returning undefined deleted the sign-in. `FileCredentialStore` in models.ts
  now queues per file, re-reads, keeps the entry on undefined, writes through tmp+rename; the error says to sign in
  again (`explainModelError`). The user still has to sign in to Anthropic again once.
- Clickable workspace files in Molfar's replies: `GET /v1/agent/file?path=&download=1` (shell-only; agentReadDenied,
  .git, auth.json, realpath check, 20 MB; html/svg/js served as text/plain under a sandbox CSP); markdown links and
  inline-code workspace paths open it, with a download icon; one Workflow rules line tells Molfar to link files.
  Also a file the chat cannot use (PDF, zip) now gets a tile saying why.
- Roleplay (fork branch `claude/release-1.2.3-63nytl`, CHANGELOG "Unreleased", manifest still 4.50.0):
  the Dashboard counts every name the user wrote under in a chat as the player (a persona switch made the earlier
  persona an NPC); the card Profile takes several characters (`molfar_profile.cast`, DATA-FORMATS, both card
  skills, engine copy `.fork/app-skills/roleplay/edit-large-card`, workspace task `.fork/handoff/v123/`).

## 1.2.2: RELEASED 2026-10-18 on the user's word (main fast-forwarded; the user pushes the tag v1.2.2). pi 1.2.0 + live model lists + #59 + desktop rollback
Asked by the user 2026-10-18 (#60, #59). Ships after 1.2.1; main 1.2.1 merged into the branch 2026-10-18.
`package.json` version not bumped yet (still 1.2.1).
- pi 0.85.1 -> 1.2.0, pinned exactly (rule in CLAUDE.md, user 2026-10-18: >= 7 days old, no hotfix after it).
  1.3.0 (2026-10-15) was too fresh. Since 0.86 the agent loop passes a transcript (prompt and tools in system
  messages): `agent.ts` transformContext drops them, trims the dialogue and puts back one leading system
  message with only the visible tools; streamFn and the inspector read them with getCurrentSystemPrompt /
  getCurrentTools. Images: `builtinModels()` + `getModelsOfType("image")`. `azure-openai-responses` -> `azure`
  (`migrateRenamedProviders`, connections.ts). `model-additions.ts` removed (the catalog has the newer
  Anthropic models). Dropped ids: moonshotai kimi-k2*, deepseek-v4-flash, six zai-coding-cn models.
- Claude 5.5 via OAuth gave HTTP 400 (user, 2026-10-18). Inferred cause: our copies of older siblings sent
  `temperature` (Sonnet/Haiku copies) and allowed thinking levels 5.5 refuses. Confirmed fixed by the user on
  1.2.2 (2026-10-18); `Molfar-Vertep.bat previous` also checked by hand (offers v1.2.1).
- Live lists (`src/providers/live-catalog.ts`): OpenRouter (public, quotes windows and prices), DeepSeek,
  Moonshot add ids the catalog lacks; nothing removed. Other built-ins left static on purpose: own APIs
  (Anthropic, Google, Bedrock, Vertex, Copilot, Codex), fixed plans (coding/token plans), or lists that mix
  non-chat models (Groq, Together, NVIDIA, Hugging Face: check their /models before adding them).
- Failed dynamic lists are logged now (`[models] <id>: model list failed`); pi's refresh never rejects.
- #59 black screen: ModelsEditor read `e.currentTarget` inside a state updater; reproduced and fixed in a
  real browser (shots in the session scratchpad only). Soji discovery: cause unknown, Chub answers 403
  "not available in your country" to our cloud; waiting on the reporter.
- #49 (Z.ai 1113) is not from the old pi: same Coding Plan endpoint and models in 0.85.1 and 1.2.0.
- Rollback, desktop only (user chose "Desktop now", 2026-10-18; APK and apps are separate tasks):
  `src/rollback.ts` + `chrysalis rollback [version]`; `*.old` and `data/.update-snapshot` kept until the next
  update (snapshot stamped from/to; also taken at start on any change of version, so source runs get one);
  data goes back only when format.json's format moved past the snapshot's. `Restore-previous-version.cmd`
  in the Windows archive (copied in by the self-update). `Molfar-Vertep.bat previous`: tag before HEAD's tag
  (on a branch: newest tag), runs the rollback data step if the current code has it, then checks out.
  Defaults taken without the user's answer: keep `*.old` (~100 MB) rather than re-download; one step back.
  Not run on Windows: the .bat path and the exe swap via the .cmd need a hand test.
- Checks: typecheck, build:client pass; tests 860/863 (edge TTS x2 = network 403; hostile plugin fails on
  the old pi too). Left: the agent, OAuth flows and the APK by hand on a real model; release notes
  `.fork/release-notes/1.2.2.md` (draft).

## 1.2.1: RELEASED 2026-10-18 on the user's word (main fast-forwarded in the engine and the Roleplay fork, Roleplay 4.50.0; the tag v1.2.1 is pushed by the user)
#54 Molfar draws: agent tool `image_generate` (`src/agent/run-tools.ts`; lists the user's image models, draws through
`Models.generateImage`, keeps the picture in the asset store, returns `/v1/assets/<id>`; paid models ask per picture,
`comfyui`/`a1111` draw without asking; not in plan mode; group `image` in small-window mode; one prompt rule, ~85 tokens).
Asked by the user the same day: Settings > Images "Your image models", a shortlist (`images.json` `favorites`:
`{ref, name?, use?}`, max 30) starred from a searchable list per connection/server; the first is the default for a call
without a model (else a local server, else the first listed); Molfar sees only the list and picks by `use`;
`GET /v1/images/models` returns `favorites`, `PUT /v1/images/favorites` is shell-only. Card skill `edit-large-card`
(both copies) says where a picture's URL goes (avatar + studio.avatar, studio.gallery, library.json backgrounds).
Workspace override copies: `.fork/handoff/v121/workspace-agent-task.md`.
#53 Roleplay 4.50.0: Prompt style (Auto / Description / Danbooru tags) in Tools > Image Generation; `ui.imageGen.promptStyle`
and `modelApi` (the picked model's api, written by the app) in settings.json; tags rules in the `image-prompt` route and the
generate_image tool wording at send time; the picker lists the engine's favorites first; What's new tip.
Also asked the same day: Marinara-style server settings (`src/images.ts` ImageEndpointDef: prefix, sampler, scheduler, seed,
denoise, clipSkip, loras ≤5, style, instructions; default workflow chains LoraLoader + CLIPSetLastLayer; custom workflows get
%sampler% %scheduler% %denoise% %clip_skip% %LORA_n% %LORA_n_strength%, empty slot "None"; Forge gets `<lora:…>` tags;
`GET /v1/images/endpoints/:id/options` shell-only; servers editable in Settings). Server style and guidance travel in
`/v1/images/models` to Molfar's list and to Roleplay (`ui.imageGen.modelStyle` / `modelInstructions`).
Checks: engine typecheck, build:client pass; tests 850 pass + 3 that fail on main in the cloud container too (edge TTS
403, hostile-plugin dir size); Roleplay 1069 pass. Browser-checked by subagents (shots `/mnt/project-files/images-121/`):
local and paid draws, Draw/Skip card at 390 px, the picture renders in Molfar's chat, the Roleplay tab, Settings > Images.
Notes `.fork/release-notes/1.2.1.md`. Asked, not decided: a Gemini API image backend (Google Flow itself has no API).

## 1.2.0: RELEASED 2026-10-17 on the user's word (main fast-forwarded to the release commit, tag v1.2.0; Roleplay 4.49.0 on the fork's main, merged from `claude/slim-start` + `claude/attention`). Engine = main 1.1.1 + `claude/slim-start-engine` + `claude/image-providers-c9b607` (only conflict: this file). Notes `.fork/release-notes/1.2.0.md`. Not in it: the site branch `claude/hopeful-mccarthy-39ropd`. Checks: typecheck, build:client pass; tests 809 pass, the 15 known Windows-only failures plus 4 load flakes that pass alone; Roleplay 1060 pass, typecheck clean.

## World + DM (#52): P0-P2 released in 1.2.5 / Roleplay 4.53.0; P3 stages 1, 1b, 2 and 3 built (2026-10-19), not released
Design: `.fork/handoff/world-dm/DESIGN.md`; P3 plan, decisions and stages: `.fork/handoff/world-dm/P3-PLAN.md`; mockups
https://claude.ai/artifact/Dq4q3RJkCX2Meiw27y7gKk . Branch `claude/world-dm-p3-i5a7bo` in both repos.
- Stage 1 (Roleplay 512819f + 2629b6c): run history with tokens/limit/errors, error codes in plain words, a retry on a
  thinking-only reply, no lost unread text (fair share per message, catch-up runs without events), lastKey fix, play
  model fallback (World > Dashboard sensor > Litopys > chat > default), routes chats/runs/test; the World rail section
  (Overview, Runs, World settings with a model test), the chat header globe dot, the prompt peek note. Engine: Inspector
  KEEP 50 (commit on this branch).
- Stage 1b (Roleplay 0141eaa): background failures (World DM, Library, Dashboard sensor of the open chat, Soul rating)
  as an inbox kind and as toasts (once each, Open, quiet while looking, 10 min repeat cut, none older than a day), red
  inbox count, the inbox as a drawer with filters, toasts tinted by type. Roleplay 1142 tests pass, browser-checked
  (dark/light 1280, 390 uk). At release: tip `new.inbox-failures` `since` and APP_VERSION go to the release version.
- For the user to try it: `.fork/handoff/world-dm/try-p3-stage1-task.md` (task for the built-in agent).
- Stage 2 (Roleplay 86c9eba engine + 4204014 UI): DM profiles (the five levels as editable built-ins with reset, own
  profiles `world/profiles/p-*.json`, four prompt blocks, locked reply format, options: clocks by model or by code, news
  by clock stage), a profile picker instead of the level radios, hub Chats | Profiles switch, a chat's Records tab
  (`PUT /world/records`, `by: 'player'`), parseReply takes the last reply-shaped object. Non-World failure texts get
  the app's wording for common causes. Shots: /mnt/project-files/world-dm/stage2/.
- Stage 3 (Roleplay f866070 + f3f8d79 engine, e785aa9 UI; decisions in P3-PLAN "Stage 3 decisions"): Start as a
  draft (recipes from-cards / interview, chunks of 6000 chars, build model), events deck (profile option), saved
  worlds library (`world/library/`), carry, the build model drafts the chat's scenario + first message, chat meta
  `worldScenario` read by the engine plugin's assembly. Hub: Chats | Worlds | Profiles, chat tab Start, opening
  dialog, World select in the new-chat step. Not exercised in a browser: interview build, page reload mid-draft.
  Shots: /mnt/project-files/world-dm/stage3/.
- Backgrounds (#61; Roleplay 97e77dd engine, fa69568 UI): new images go to the asset store as WebP, Convert to WebP
  for old data URLs, a world's own folder (kept by saved worlds and carry), sets planned by the build model and drawn
  by the image model, vision naming, chat switch "change background by scene" (off by default; the sensor picks a
  name in the folder). backgroundBlob decodes data URLs itself (the frame's fetch only reaches the engine).
- Molfar's workspace fixes merged (21e25be): #48 Dashboard re-read after an earlier change (reworked: snapshots
  record `base`, off-line swipe snapshots kept, no whole-chat re-read after an old branch) and #63 card editor in
  5 groups. #67/#68 closed (shipped in 4.52.0), #74 closed as duplicate of #48.
- RELEASED 2026-10-19: Roleplay 4.54.0 on main (e75ed3e), engine 1.2.6 on main (release notes .fork/release-notes/1.2.6.md);
  the tag v1.2.6 is the user's. #48 and #61 closed. After the test: record keys written by the DM plus pins and a
  one-call key fill (the old records keyed only by full name rarely fired), image model in its own dialog, places
  from the card books and found in the cards. 4.55.0 work sits on the local Roleplay branch rp-455 (engine for
  "New world" without a chat, commits 8447512, a3a83a5); its UI and the Characters page are next.
- User test of 4.54.0 (2026-10-19) found: Translate fired from its whole label row (fixed f8543ce), last-run summary
  cut mid-word (fixed), editor tab dots and missed clicks, a flat "So far" block, streaming jumps with the Molfar
  preset's regexes (subagent on all three). Decided: 4.54.0 ships after those fixes; 4.55.0 = (1a) "New world" in
  the Worlds tab without a chat (cards or interview -> draft -> accepted into the library; characters come with
  "New chat in this world"), Characters page: tiles without description and "by", chats and tokens bigger in colour,
  lorebook and sprite icons, "0 chats" hidden (2b); tags wrap to two rows + "All tags (N)" with search and sort (3a);
  one header bar: Characters/Groups switch, search, sort, view, Import (download icon), New with Character/Group (4a).
- RELEASED 2026-10-19: Roleplay 4.55.0 on main (e6aeb1d): "New world" in Worlds (start route takes worldId, draft in
  world/library/<id>.draft.json, {worldId, peek:true} reads it without a call) and the Characters page (one header
  bar, tiles with chats/tokens and lore/sprite icons, two-row tags + All tags). The engine plugin's list summary
  carries spriteCount (index cache v2, rebuilt once). No engine release needed. The user's update source is back on
  HEAD. A parallel thread's branch claude/project-thread-tqxguf (prompt-cache reorder) rebases onto this itself.
- Next (old line): browser check of the card editor and the 1280 backgrounds runs; release docs (version, CHANGELOG, guide,
  tips' `since`, APP_VERSION) on the user's word; close #48, #61 with that release. Later: rollback (#75).
- Filed today: #71 (steer arrow), #72 (letters from cards, inbox filters for them), #73 (stale ask card, steer timing).

## Large libraries, P0 (#46): RELEASED in 1.2.0 / Roleplay 4.49.0 (2026-10-17)
Why: a long-time SillyTavern player has 2,000+ cards; Roleplay's `/bootstrap` read every card whole in a 64 MB
sandbox and did not start past ~700 (measured). Findings and the importer plan (P1, not started): `.fork/handoff/st-import/FINDINGS.md`;
P0 design: `.fork/handoff/st-import/P0-DESIGN.md`. Decided with the user: P0 first as its own release; big chats later
split invisibly into segment files inside Roleplay (with P1).
Engine branch `claude/slim-start-engine` (pushed, from main 1.1.1): `host.fs.stat` (one path, or a list in one call:
per-path calls cost ~3 ms each), local app cache `apps/<app>/data/.cache/` (no git, profile backup, sync, app backup),
app-authoring skill + digests. Typecheck passes; tests: only the known Windows-only failures and load flakes (each
re-run alone passes except `app page arms the source watcher`, which fails on main too).
Roleplay branch `claude/slim-start` (worktree `E:\Claude\rp-slim`, from main 4.48.0), CHANGELOG "Unreleased (4.49.0)":
summaries at start from a sharded index in `data/.cache/characters-index/` (checked by size+mtime, so Molfar's and
sync's edits show), whole card on open/chat/export/duplicate, guard against saving a summary (store + plugin 409),
portraits on demand, import in batches of 25, chat counts per card counted once. 2,000 cards: warm start ~0.7-1.8 s
(1-1.7 MB), first start builds the index in ~25 s in the background. Tests 1053 pass. Browser-checked by a subagent
(shots `E:\Claude\guide-shots\slim-start\`): data safety checks pass (favorite on an unopened card keeps its texts).
Roleplay commits `57a4a87`, `7a2ea69` (pushed). A second browser pass checked the UX fixes (filling line, portrait
placeholders, spinner, "~" tokens, search over the first 1,000 characters of a description): shots `fix-*`.
Released as engine 1.2.0 + Roleplay 4.49.0; #46, #47, #55 closed with it.
Dashboard threads (checked 2026-10-16 on the user's request): the sensor closes a thread only when the model lists it in
`resolved` (plus a "Thread check" every 5 turns); nothing expires; at the open limit new threads are dropped silently.
In the user's 8 chats the sensor closed 2 threads in ~40 turns, the user closed others by hand. Bug #47: a hand-added
thread comes back open the turn after the sensor resolves it (Tuesday batch). Proposed, not decided: keep a history of
resolved threads (they vanish after one turn now); retire threads left open after several thread checks.

## Image providers beyond OpenRouter: RELEASED in 1.2.0 (branch `claude/image-providers-c9b607`, 2026-10-17)
Asked by the user 2026-10-17 with Marinara Engine's provider list as the target (it has ~20: OpenAI, NanoGPT,
OpenRouter, Pollinations, Stability, Together, NovelAI, AI Horde, xAI, Venice, Z.ai, fal, Atlas, ComfyUI, SwarmUI,
RunPod ComfyUI, A1111/Forge/Draw Things, Gemini via chat). The user picked the first four: NanoGPT, local ComfyUI,
local A1111/Forge, any OpenAI-compatible /images/generations; set up in a new Settings > Images tab; Roleplay unchanged.
Engine: `src/images.ts` (store `credentials/<user>/images.json`, keys in auth.json as `images/<id>` bound to the
base URL, a changed URL drops the key; backends; plain-word errors with status 401/402/404/429/502/504 instead of
500; result bytes sniffed, only PNG/JPEG/WebP/GIF stored). NanoGPT uses the existing `nanogpt` (or
`nanogpt-subscription`) key, host fixed in code, catalog from the public `/api/v1/image-models` (price in the label,
cached 10 min). ComfyUI: built-in txt2img workflow or the user's API-format workflow with %prompt% etc.; models from
`object_info/CheckpointLoaderSimple`. A1111: `/sdapi/v1/txt2img` with `override_settings.sd_model_checkpoint`.
Apps' "(Avoid: …)" prompt tail becomes the real negative prompt on ComfyUI/A1111. Network rules: configured
endpoints may be loopback/LAN, never link-local (checked on save and by DNS before each call); no redirects
followed; picture links a provider returns are fetched only from the public internet (https) or the endpoint's
own origin, each hop re-checked. Endpoint listing/management is shell-only (`/v1/images/endpoints*`, not in the
app bridge). images.json travels with profile backup and sync (PLAIN_PRIVATE). Tests `test/images.test.ts`
(mock servers for every backend, 20 tests). A timed-out ComfyUI job is taken off ComfyUI's queue. Second opinion
by an external reviewer model: took the base64 size cap, immediate failure on a refused history poll, two
metadata addresses outside link-local; left DNS rebinding (the user picks the host, the key is bound to it) and
Node fetch semantics (the engine runs on Bun). Checked on the user's real ComfyUI (2026-10-17): the checkpoint list
reads and the default workflow passes ComfyUI's validation (queued); the drawing itself was not waited for (the
rig was busy with the user's own job; the test job was removed from the queue). Browser check: Settings > Images
at 1280 dark, 390 light, 390 uk, with a mock ComfyUI (ready) and a stopped Forge (error shown).
Full suite: 806 pass, 19 fail = the 15 known Windows-only + 4 load flakes (pass alone, except the app watcher one,
which fails on Windows by fs.watch reporting the folder). Not done: the other Marinara providers; Roleplay still says
"Add an OpenRouter key" on a 503 (its own text, `src/lib/image-gen.ts`); no edit form for a saved server (delete
and add again); provider error messages are English (engine text); not tried against a real NanoGPT or Forge
generation; delete buttons are 32 px on phones like the Speech tab's.

## 1.1.1: RELEASED 2026-10-16 on the user's word (branch `claude/v111-fixes` from main 1.1.0, main fast-forwarded, tag v1.1.1; notes `.fork/release-notes/1.1.1.md`), urgent part of #45
The phone's first real push (2026-10-16) met a leftover development test push in the user's Drive (removed), then
pushed into that folder after it was moved to the trash: Drive takes uploads into a trashed folder. Fixed: `DriveStore.readHead`
checks the folder (`fields=trashed`; a removed one already gave 404) before every check, push and pull. Sync settings:
a refused push's error no longer vanishes (the re-check after a push cleared it), and a device that never synced reads
"This sync already holds {device}'s files" instead of "pushed since this device last synced". Left in #45 for the
Tuesday batch: a "replace the sync with this device" action. #44 (chat list preview shows reasoning the display regex
hides; Roleplay `cleanPreview` keeps text between tags and runs no display scripts) also waits for Tuesday.
Not browser-checked (text and error-keeping change only). #45 stays open for the rest.

## 1.1.0: RELEASED 2026-10-16 on the user's word (main fast-forwarded to the release commit, tag v1.1.0 pushed from this desktop session; Roleplay 4.48.0 on the fork's main `c9c09e5`). = `claude/v110-fixes` + Drive sync (`claude/nostalgic-mccarthy-136fe6`, see the sync section below and `.fork/handoff/sync/`). Notes `.fork/release-notes/1.1.0.md`. Not in it: the project site branch `claude/beautiful-mccarthy-a159c9` (work in progress). Checks: typecheck, build:client pass; tests 789 pass, the 15 known Windows-only failures plus 4 app-build tests that pass when run alone (load flakes).
Engine branch `claude/v110-fixes` (pushed; from main 1.0.10 + the plan notes): #34 `-c safe.directory` for the
engine's own repositories (app clones, workspace gc) on drives git does not trust, test with
GIT_TEST_ASSUME_DIFFERENT_OWNER; #36 app frame CSP `worker-src blob:` (Roleplay's display regex ran in a blob
worker the CSP blocked, so no display regex ever worked; checked in headless Edge); #37 `host.zip.build` (native zip
for plugins, no permission; app-authoring skill + digest updated). Checks: typecheck, build:client pass; tests 770
pass, 15 known Windows-only failures.
Drive sync (#38): built on branch `claude/nostalgic-mccarthy-136fe6` (cut from `claude/v110-fixes`, pushed, not
merged; merge it into the release with the fixes). Decided with the user 2026-10-16: conflicts listed per thing
with keep mine / take the synced one (the losing copy in data/backups/sync-conflicts, 30 days); the whole
workspace with switches (Molfar's chats and projects, media, keys off by default); passphrase typed once per
device and remembered beside the keys; phone signs in itself with a pasted-address fallback; one shared
"Molfar Vertep" Google client the user registers once (steps `.fork/handoff/sync/GOOGLE-CLIENT.md`, nothing
registered yet: `BUILTIN_CLIENT` in `src/sync/drive.ts` is empty); stores behind one interface (Drive and a
folder for admins). Design and what is left: `.fork/handoff/sync/DESIGN.md`. Settings > Sync + "Sync devices" in
the account menu, guide tip `new.sync` (since 1.1.0), README. Tests 793 pass, 15 known Windows-only failures;
browser-checked (shots `E:\Claude\guide-shots\sync\`). Real Google Drive checked (push, pull, back) with the built-in client (still "Testing"); not tested on a real phone.
Roleplay fork branch `claude/v110` (pushed; worktree `E:\Claude\rp-v110`, from main 4.47.0), CHANGELOG "Unreleased
(4.48.0)": Molfar as a second built-in read-only preset (`data/presets/molfar.json` = `_molfar.json`, 8 regex
scripts in `data/regex/molfar-*.json` + update template `data/_molfar-regex.json`, onAppUpdate 4.48.0 seeds them);
option `hint` field (types, editor, Marinara import, Choices panel list line / chip tooltip + line, DATA-FORMATS)
with hints for all 260 FRANKENX and Molfar options (drafted by an external model, checked) and a 4.48.0 migration
that fills them into read-only built-in copies; preset picker shows tokens with the chat's picks; Canvas Prompt
board searchable chat picker; #35 dashboard notice with counts; #37 export uses host.zip.build (8 MB: 20 s -> 1.2 s
in the real sandbox). Tests 1044 pass. Browser check by a subagent: shots `E:\Claude\guide-shots\v110\` (uk strings
not shot; the tooltip's cost line not exercised with the mock model). Manifest still 4.47.0: the release bumps it.
Molfar converter (ST preset -> Vertep) lives in the session scratchpad only; the source preset is
`E:\Obsidian\Vault\Projects\RP\assets\molfar\Molfar-2026-09-26.json`, the result also at `Molfar-vertep.json` there.
The user's workspace `presets/molfar.json` was replaced by the built-in version (it was the session's own install).
Done in the release: Roleplay 4.48.0 (manifest, CHANGELOG, What's new tip `new.molfar`), engine 1.1.0 (package.json, CHANGELOG, notes);
#35, #36, #37 closed with it; #34 stays open until the reporter confirms.

## 1.0.10 = the guide in the shell and on Molfar's page, #33, #34: main fast-forwarded 2026-10-15, the tag `v1.0.10` is the user's (Roleplay 4.47.0 on the fork's main)
Engine branch `claude/guide-plan` (worktree `.claude/worktrees/readme-canvas`): bug-solution merged (`0619b42`),
launcher fix for GitHub #33 (`8c5ed71`: stops when git refuses the folder, offers safe.directory for that one folder,
README notes; tested with GIT_TEST_ASSUME_DIFFERENT_OWNER and a temp global config, a path with "(x86)" included),
guide step 3 = the shell (`4cd1d07`: `client/src/guide/`, state in `/v1/settings` `guide` checked by
`src/guide-state.ts`, What's new 1.0.9, first-run tour (connect a model), tours home/app/settings/store, Help in the
account menu and start-page footer, Settings > General > Guide; texts fact-checked; shots `E:\Claude\guide-shots\step3\`).
Tests 729 pass, 15 known Windows-only failures. Roleplay fork `claude/guide-kit` (worktree `E:\Claude\rp-guide`) has
steps 1-2 + `0e287b5` (bug tip names Ask Molfar first). Left for the release: Roleplay 4.46.0 (manifest, CHANGELOG,
merge), engine 1.0.9 (package.json, CHANGELOG, release notes incl. #33, close #33 with it), pushes on the user's word.
Issue #34 (Roleplay install EPERM on `apps/.staging/roleplay`, same reporter and drive `E:/oldfar` as #33): `21ca606` clearDir (retry, move aside, a clear 409 naming the folder), checked on Windows with a held file. Root cause on their machine unknown; questions for the reporter drafted, not posted yet. Close #34 with 1.0.9 only if the reporter confirms.
Guide step 4 = Molfar's page (`52f915e`, 2026-10-15): `client-agent/src/guide/` (copies of the pure shell modules:
the agent builder cannot import from client/, `test/guide-agent.test.ts` fails on drift), Help in the header / phone
sidebar, tours agent.chat and agent.project, 21 help items, safety texts fact-checked; shared state store
(`store-core.ts`: a save is a change re-applied on a fresh GET, serialized, a failed save does not block later ones).
No What's new on that page (the shell's owns `lastVersion`). Shots `E:\Claude\guide-shots\step4\`. Tests 746 pass,
15 known Windows-only failures. Guide step 5 done (`4d46cfc` app-authoring skill + publish-app skill; Roleplay AGENTS.md "The in-app guide" `36f5f0b`): all 5 guide steps built. A workspace copy of app-authoring, if the user has one, would shadow the builtin.

## In-app guide, steps 1-2: built, not released, not pushed (Roleplay fork branch `claude/guide-kit`, `b2b8981`, on 4.45.0)
Step 2 (`b2b8981`, 2026-10-15, local commit in the worktree `E:\Claude\rp-guide`; another session works in the main
fork checkout on `claude/mobile-fixes`): help "?" (rail above Settings, phone More sheet, phone chat menu): 44+ items in
7 groups, search en/uk + keywords, Show me; tours for chat menu, Dashboard, Soul, Library, Characters, Groups,
Lorebooks, Presets; Show me opens chat panels, editor tabs, Groups list, a book/preset, the commands reference.
Every text was fact-checked against the code by a second pass (12 wrong, 9 loose, fixed). Tests 1030 pass, 1 expected
fail (APP_VERSION). Browser-checked (shots `E:\Claude\guide-shots\step2\` and `fix\`). Inventory of features:
`E:\Claude\rp-guide-inventory.md` (outside the repo). The user's plan (2026-10-15): steps 2 and 3, then push and
release everything together with engine 1.0.9 (bug-solution already merged into `claude/guide-plan`, local).
Step 1 notes:
Plan: `.fork/handoff/guide/PLAN.md`. Decided with the user 2026-10-14: state in the app setting `guide` (not localStorage),
a player with chats and no state gets What's new for everything after 4.43.0 (a fresh install gets none, only tours),
own small spotlight kit (no library). Code: `src/lib/guide.ts` (format and logic), `src/lib/guide-tips.ts` (5 What's new
tips, tours for Canvas links, Prompt board, composer; en + uk; `APP_VERSION`), `src/components/guide/` (host, spotlight,
card, Settings → Guide block, place hook), `data-guide` attributes. Tests 1027 pass; the one failure is APP_VERSION 4.46.0
vs manifest 4.45.0 until the release bumps it. Browser-checked dark, light, 390 px, uk (shots `E:\Claude\guide-shots\`).
Rough edges: on a phone the Canvas links tour has one visible step (list mode); the What's new card on Home overlaps the
Achievements card; the `new.guide` tip's rail target is inside More on phones (centered bubble). Release (4.46.0: manifest,
CHANGELOG, merge to the fork's main) on the user's word. Next: step 2 (help "?" and the remaining tours).
## 1.0.9: RELEASED 2026-10-15 (tag v1.0.9 on `22c5576`, pushed on the user's word; Roleplay 4.46.0 on the fork main `785de49`; issues closed)
Engine = main + `claude/bug-solution`, `claude/guide-plan`, `claude/affectionate-pasteur-421374` (restored apps re-check
themselves), `claude/recursing-kare-666e77` (app page header at 390 px), `claude/discord-bugs` (Discord tracker); the only
code conflict was the shell-only route list in test/security.test.ts (bug-patch + build/ack, both kept). Roleplay 4.46.0 =
fork branch `claude/release-4.46.0` (`785de49`): main + `claude/discord-bugs` (which contains `claude/mobile-fixes`) +
`claude/guide-kit`; 1035 tests pass. Notes `.fork/release-notes/1.0.9.md`. GitHub #21-#23, #25, #27-#30, #32 close with the
release; #24, #26, #31 stay open (need the reporter's data / a design decision). The sections below describe each part.

## Phone fixes (2026-10-15, Roleplay fork branch `claude/mobile-fixes`, not merged; the user adds more phone reports through the day)
`b483d08`: Profile Structure it reply limit 4000 -> 12000 (Fill 8000), braces before the JSON no longer hide it, the
error says "cut off" vs "not JSON"; shell refusals ("not allowed for this app") explained; number fields keep the typed
text while focused (no "07500"); the context ring and out-of-context line use the model's window (they used the
preset's 8192); phone composer two rows (Write for me + big editor beside "+"/send; Continue/Another in "+").
Cause of "not allowed" on the user's phone, confirmed by the user: the profile was moved there through a Settings
backup, and a restored app is not official (`restored: true` in its `.source.json`) until an update whose code matches
the official tree lands. An up-to-date app never gets that update: engine follow-up to offer "reinstall the official
version" (proposed as a separate session, not started).

## Send a fix from Molfar (for 1.0.9, branch `claude/bug-solution`, not merged; 1.0.9 also takes the in-app guide from `claude/guide-plan`)
Discord idea: a bug goes to Molfar first, and a fix that works goes to GitHub so it ships for everyone. User's choices
(2026-10-14): a pre-filled form (nothing sent by the engine), the entry in the bug dialog, description + patch.
- Shell "Report a bug" dialog: an "Ask Molfar first" block (needs "What happened") opens a new agent chat with the
  report ("Bug report: ... (skill fix-bug)", version, device, recent errors).
- Built-in skill `fix-bug`: checkpoint "bug: ...", reproduce, smallest fix, the user tries it, then `bug_solution`.
- Tool `bug_solution` (`src/agent/bug-solution.ts`; small mode: app group): solved, problem, cause, fix, verify, app,
  checkpoint. Its card on the agent page (`client-agent/src/BugSolution.tsx`, shown outside the folded step list):
  "It works, send the fix" / "Still broken", or "Report it on GitHub" when not solved. The dialog fetches
  `GET /v1/agent/bug-patch` (the app's code since the checkpoint, data/ .memory .skills .project never; git-apply
  format, checked by a test), shows files with warnings (secret, local path, user name; shared with
  `scripts/publish-app.ts`), then opens `.github/ISSUE_TEMPLATE/solution.yml` pre-filled; a patch too long for the
  link is downloaded as `.patch` to drag in.
- Engine bugs Molfar cannot edit end as `solved: false` with what it found (the ordinary bug form).
- The small-model budget test moved 3.7k -> 3.75k (the fix-bug skill line).
- Checked in Chromium (browser-check): card and dialog at 1280 dark and 390 light, no sideways scroll; the GitHub link
  carries every field and the patch; the shell block in en and uk, disabled when empty; the handoff reaches Molfar.
  Not checked: a real model going through the whole skill. Label `solved-by-molfar` created on GitHub (2026-10-14).
- Tests: 707 pass; the failures are the Windows-only ones that fail on main too (0600 modes, tar, edge-tts network).
## In-app guide, step 1: built, not released (Roleplay fork branch `claude/guide-kit`, `df3561b`, on 4.45.0)
Plan: `.fork/handoff/guide/PLAN.md`. Decided with the user 2026-10-14: state in the app setting `guide` (not localStorage),
a player with chats and no state gets What's new for everything after 4.43.0 (a fresh install gets none, only tours),
own small spotlight kit (no library). Code: `src/lib/guide.ts` (format and logic), `src/lib/guide-tips.ts` (5 What's new
tips, tours for Canvas links, Prompt board, composer; en + uk; `APP_VERSION`), `src/components/guide/` (host, spotlight,
card, Settings → Guide block, place hook), `data-guide` attributes. Tests 1027 pass; the one failure is APP_VERSION 4.46.0
vs manifest 4.45.0 until the release bumps it. Browser-checked dark, light, 390 px, uk (shots `E:\Claude\guide-shots\`).
Rough edges: on a phone the Canvas links tour has one visible step (list mode); the What's new card on Home overlaps the
Achievements card; the `new.guide` tip's rail target is inside More on phones (centered bubble). Release (4.46.0: manifest,
CHANGELOG, merge to the fork's main) on the user's word. Next: step 2 (help "?" and the remaining tours).
## Discord bug tracker (2026-10-15, not released): engine and Roleplay branch `claude/discord-bugs` in both
Input: `.fork/handoff/bug-tracker/TRACKER.md` on `claude/discord-bug-tracker` (12 findings, a public audit). All 12 real in
the current code; GitHub #21-#32 (bug label; #31 enhancement). Roleplay branch cut from `claude/mobile-fixes` (not main).
- Fixed, Roleplay: #21/#22 (BUG-001/002) Dashboard and Litopys rankers index the scene once (`sceneMatcher`,
  `scanMatcherM3b`); same order as the pairwise scan on 1,200 random rankings, 40,000-word differential test. #23 (BUG-008)
  a fitting insert removes the old trimmed notice (dashboard test 13 changed). #29 (BUG-015) "Write for me" result kept per
  chat with the draft it started from (`composerDrafts`, `lib/drafts.ts`), goes in only over that draft, else offered.
  #30 (BUG-016) `sendMessage` returns sent / not-sent / stopped (checked against the refreshed transcript); not-sent puts
  text and attachments back. Persist skips unchanged writes (`quietStorage`).
- Fixed, engine: #25/#27/#28 (BUG-011/013/014) `app-bridge*.js`: unchanged writes not sent; every write gets a storage-ack
  (accepted or `app-share-full` / `browser-quota`); refused keys stay in the frame + hash, `window.chrysalisStorage.unsaved()`
  and a `chrysalis:storage` event; the handshake (`init`) carries the shell's copy and a reloaded frame takes it for keys it
  has not written (one guarded reload if the app already read storage). Roleplay shows an amber "not saved" line with Copy.
  #32 (BUG-018) `POST /v1/apps/:id/build/ack`: an unchanged build records its revision (lease holder, current rev, good dev
  build only); shell-only route added to the security lists.
- Open: #24 (BUG-010, needs the reporter's "Reloaded: ..." toast text), #26 (BUG-012, needs logs if it recurs), #31
  (BUG-017, a design decision on asset cleanup). Not done: a shell-owned fallback copy for a refused draft (a full shell
  reload still loses a refused draft; the warning says so).
- Tests: engine 731 pass, 2 fail (edge-tts live network 403 in the cloud, as in 1.0.7); Roleplay 1023 pass.
- Browser check (Chromium, real engine + Roleplay built in the browser): refused draft shows the amber line with Copy at
  1280 and 390 px (wraps to two lines, no sideways scroll), gone after space frees; an in-frame reload keeps the draft.
  Roleplay's own theme stays dark in the "light" runs (only the shell changes). Shots were in the cloud scratchpad, not kept.

## 1.0.8: RELEASED 2026-10-14 (tag v1.0.8; Roleplay 4.44.0 `99d8270` and 4.45.0 `e964362` on the fork's main)
Engine: Claude 5.5 in the Anthropic catalog (`src/model-additions.ts`), visible names. Roleplay 4.44.0: Canvas stage 1b (Prompt board,
switches, history filter, the chat-links shelf). Roleplay 4.45.0: composer quick moves + half-screen big editor, phone Characters and
Lorebooks pages, empty Library, Soul without the Molfar rating buttons, Advanced hints, group colours on light themes, group editor tab
names, five Dashboard events. UX audit (desktop copy, gitignored `data/ux-audit/UX-AUDIT.md`): done items removed; open are item 9
(jargon: Lorebooks, Personas, Tools) and six rows (Light shell vs Roleplay theme, button colours across screens, 11 editor tabs, red
lorebook switches, preset internal ids, Tools tab rows). Open questions for the user: small-model prompt problems in group chats
(no examples yet). Next by the roadmap: settle 4.44/4.45, then Decider (`.fork/handoff/canvas/PLAN.md` section 15).

## Restored apps can become official again (2026-10-15, not released)
Branch `claude/affectionate-pasteur-421374`. The user moved a profile desktop -> phone through a Settings backup: every app came
back `restored: true` (its baseline came with the file), so Roleplay was unofficial and the bridge refused every shell link
("not allowed for this app"). Only an update that landed could clear it, and an app at the latest version is never offered one.
Now automatic (the user: a move that needs a manual step makes no sense): both update checks (`GET /v1/apps/updates`, run
on shell load, and `GET /v1/apps/:id/updates`) call `verifyRestored` for an official app still marked restored: a shallow
clone of the branch head, plugin sources stamped, `readCodeTree` + `sameTree` against the app. Match -> `restored` cleared
and the baseline replaced by the fetched tree; the shell refreshes `/v1/launch`. No match -> `restored: "differs"`
(remembered per remote head + code hash, so no clone on every load); no answer -> `"unchecked"`, tried on the next check.
Only those two show the "Check needed" badge and a note on the app page: "differs" -> "Replace with official version" ->
confirm -> the update route with `theirs` at any head, which for a restored app is an exact replace (`replaceTree` in
`src/apps/update.ts`; the backup's baseline decides nothing); "unchecked" -> "Check again". An app behind the branch head
counts as "differs" (a clone only fetches the head); a plain Update clears it too when the code was not edited. Tests in
`test/app-store.test.ts` (match -> official by itself with the fetched baseline; differs; no answer; plain update keeps
edits; theirs -> official; community source never reported nor cleared).
The Roleplay side (fork branch `claude/mobile-fixes`) explains the refusal. Seen in passing: the app page header at 390 px
is cramped (size line wraps per word, "Launch" cut off) - not touched here.
## App detail header on phones (2026-10-15, branch `claude/recursing-kare-666e77`, not released)
Launcher's app detail pane (`AppDetail` in `client/src/App.tsx`): below the `@4xl` container width the name + Launch share the
first row and Repository / export / update check wrap to a row of their own; name and size line truncate; Launch, back, export and
the update button are 40 px tall on phones. Explicit `[40px]`: the shell's `--spacing` is scaled, `size-10` there is 32.5 px. Desktop
row unchanged. Browser-checked 390 px light (ru default, uk) and 1280 px dark. Not touched: the size line's "files"/"KB" are
untranslated, the launcher footer wraps in Ukrainian at 390 px.

## Batch: visible names, Claude 5.5, phone headers (2026-10-14, not released)
Engine branch `claude/names-models-ux` (worktree `.claude/worktrees/names-models-ux`, on top of the Canvas docs): `44161d7` visible
"chrysalis" texts (network name example, profile download name, git URL examples; the npm package name in the update hint stays
until the internal rename); `754c5af` Claude Opus, Sonnet and Haiku 5.5 added to the Anthropic catalog as copies of their closest
sibling (`src/model-additions.ts`): pi-ai 0.85's Anthropic catalog is static and stops at Opus/Sonnet 5; pi-ai 1.2.0 has them but
moves the system prompt and tools into system messages (`TranscriptContext`, `toolsAdded`), which breaks the agent's tool hiding
and token budget: that upgrade stays queue item 10. Roleplay branch `claude/names-ux` (on 4.44.0): `656ad15` tab title and texts
say Molfar Vertep; `ff41ad0` phone Characters header (switch + New; search, Filter sheet with sort and wrapped tags, More menu;
active tags under the search) and Lorebooks (filter next to search, Import and "Active in the open chat" in a More menu, no
bottom bar). Engine tests: the same 15 Windows-only failures as on main (tar paths, 0600 modes, edge TTS 403, git shell), none new.
Dashboard vocabulary on the user's 8 real chats: 24 `other` events, most routine small talk; candidates for new ids seen:
introducing oneself / learning a name, inviting to meet, standing one's ground ("I am not your student"), an ultimatum, a veiled
leverage threat ("I know what controls you"); one `significant` event came with an empty quote. Asked the user before adding.
UX audit document (desktop copy): items 1-8 and 10 now marked done; item 9 (jargon) open.

## Canvas stage 1b: RELEASED in Roleplay 4.44.0 (fork main `99d8270`, fast-forward from `claude/canvas-prompt-board`, 2026-10-14, on the user's word)
Four commits on top of Roleplay 4.43.0 (`0f79347`): `b971efa` per-chat prompt switches (chat meta `promptBoard`, `assemble()` skips and labels, Litopys and Dashboard check their own switch); `f2415d2` chat-links board starts empty, a shelf on the left (search, sort, drag on and off, "with linked chats"); `f01ff84` keyed sources + `sources.board` in the preview + the history filter, and off books drop even when global or persona-bound; `ea8b418` the Prompt board UI (cards with switches and tokens, "Request to the model" with numbered rows and wires, details with reasons and the history filter, phone list). 1016 tests pass, typecheck clean, browser-checked dark, light, 390 px (shots in `E:\Claude\canvas-shots\`, not in the repo). Release commit `99d8270` (CHANGELOG 4.44.0, manifest). No engine change needed. Left out on purpose: reordering (decided: the preset owns order), Litopys/Dashboard tokens show only at send time. Decisions and steps: `.fork/handoff/canvas/PLAN.md` section 14.

## Canvas stage 1a: RELEASED in Roleplay 4.42.0 (fork main `9e68e44`, 2026-10-13, on the user's word)
A Canvas tab with the chat-links board (Library chats as cards, wires = continues, forks dashed), the Library map as the same board in View mode. Code in the Roleplay fork (`src/canvas-kit/`, `src/components/canvas/`); no engine change; the engine needs no release for it (an app update). Next: stage 1b, the prompt board: its three questions are decided (`PLAN.md` section 14, 2026-10-14: switches in chat meta, `isOff` in `assemble()`, each plugin checks its own switch; build steps a-d). Start with `.fork/handoff/canvas/HANDOFF.md`.

## 1.0.7: RELEASED 2026-10-14 (tag v1.0.7 pushed by the user, release run 31, 6 assets; Roleplay 4.43.0 on the fork main `0f79347`) (branch `claude/tuesday-bug-batch-b41slz` in both)
Engine 1.0.7; Roleplay 4.43.0. GitHub #13, #14, #16-#20 closed with the release; #15 open for the next batch. Before the
release, an external review (GLM through `ask-model`) found 4 real problems, fixed: a generation now counts as
running until its route ends (the commit comes in a later pass), an adopted reply refreshes after Stop, contact is reported every
turn and a new scene drops a carried one, gallery migration only when the add saves. Not taken: an unhandled rejection in
`adoptRunningGeneration` (refreshChat catches its own errors) and the >150 writes/10 s burst (by design; typing stays far below).
- **#18 draft wiped mid-typing** (Discord, Brave; the user saw it on Chrome). Cause verified in Chromium: the frame's storage shim
  is seeded from the `#__storage=` snapshot the shell put in the frame URL, and the app's own `location.reload()` (new build landed,
  engine restarted) reloads that URL, so every write since the frame opened was lost (the draft, the reload-reason note). Fix in
  `client/public/app-bridge.js`: the hash follows each write synchronously (`history.replaceState`; a rewrite in beforeunload is too
  late: Chromium takes the URL at the reload() call), at most 150 per 10 s. Which event reloads the reporter's page is not confirmed;
  with the fix the reload's toast ("Reloaded: ...") now survives and will tell.
- **#19 replies cut near 500 tokens on Chub** (`c_custom-openai-compatible`). pi-ai sends `max_completion_tokens` to unknown hosts;
  custom connections now set `compat.maxTokensField: "max_tokens"` (not api.openai.com). That Chub ignores the other field is
  inference; the reporter confirms after the update.
- **#16 texting scene**: the sensor counts remote contacts as present with `chars.<name>.contact` (text/call/video/letter, carried
  while they stay present); the insert says "Not in the same place as ..., in touch from elsewhere: X by text messages" and the
  character block repeats it. Old default prompt kept as SENSOR_PROMPT_8.
- **#13 lost replies**: engine `GET /v1/apps/:app/__generating?chatId=` (live count beside `genAborts`, `genDone` from the plugin
  runtime). Roleplay: `adoptRunningGeneration` (on chat open and after each hydrate) shows "Writing" for a run the page did not
  start; Stop on such a run only stops waiting (the user's message is not stored yet, a cancel would lose it). `watchForCommit`
  ends the wait with an error when the engine is idle twice with no reply. Part (1) of the report (Writing counts forever) was
  never reproduced; this covers it only if the run really ended. Reporter's bridge type still unknown.
- **#20 composer**: once a draft wraps (box > 44 px), at every width (the user, desktop screenshot) the textarea takes the full row and the buttons go under it;
  back when the box is empty.
- **#14 dice**: `reason` (required) and `dc`; a stored dice tool equal to the old default parameters is upgraded.
- **#17 gallery**: images go to `PUT /v1/assets`, the card keeps `/v1/assets/<id>`; data-URL items move on the next add; a failed
  character save rolls back and names the size; app body cap 8 MB. Known gap: the Roleplay studio backup zip does not carry asset
  bytes (true for generated pictures before too); the engine's profile backup does.
- Not done: **#15** "Polish my message": rebuilt 2026-10-20, see its section at the top.
- Browser check (Chromium, real engine + Roleplay build): #20 at 390 px dark/light and 1280 px (desktop unchanged), no sideways
  scroll; #18 draft kept after an in-frame reload 1 s, 10 ms and 0 ms after the last key. Shots: project files `bug-batch-1014/`.
- Tests: Roleplay 999 pass. Engine 713 pass, 2 fail: edge-tts (live network 403 in the cloud). Lint adds nothing on changed lines.

## 1.0.6: RELEASED 2026-10-13 (tag v1.0.6 pushed by the user, release run 30, 6 assets) (the user's word: ship the three fixes as 1.0.6, not "1.0.5a": `isNewer` and the launcher read only `X.Y.Z`). Engine = the updater fix + bug report (`p3ljej`, PR #12) + script-error fix (`dzndzt`), merged. Roleplay 4.41.1 = fork branch `claude/project-thread-xhqa4w` (`dzndzt` + version bump + the menu-scroll follow-up below), 971 tests pass. Menu scroll follow-up (Discord: "solved for main chat, still persists in the menus"; screenshot: Dashboard settings sheet, lower ~42% dead = the sprite panel's default spot): on `pointer: coarse`, `body:has([role=dialog|menu|listbox]) [data-expression-panel]` is hidden. The sprite link is inferred: a synthetic overlay test in headless Chromium did NOT reproduce a touch-action leak; the rule's toggle was checked, the real app on a phone was not. Both mains fast-forwarded on the user's word (2026-10-13); the user pushes tag `v1.0.6`. Deferred to 1.0.7: lost replies on a phone browser (START.md item 00).

## Script error after a card edit (Discord report, 2026-10-13): engine and Roleplay fork, branch `claude/project-thread-dzndzt` in both, in 1.0.6 / Roleplay 4.41.1
Report: after Molfar edited a character, the Roleplay app showed only "script error" on the character's page, froze,
an update did not help, and Molfar could not revert to the checkpoint it named. Three causes, all reproduced in a real
browser (shots: project files `script-error/`). (1) The Roleplay fork read card.json on trust: a profile list written
as one string (`"nicknames": "Dzvin, Bell"`) made the Profile tab's chip field call `.filter` on a string, React
unmounted the whole app. Fixed in the fork: `cardToCharacter` and `normalizeProfile` coerce every known field
(string lists split, numbers to text, wrong shapes dropped, unknown keys kept); an `ErrorBoundary`
(`ui/error-boundary.tsx`) wraps views, drawer sections and the Profile and Soul tabs with Copy details / Try again.
(2) The engine's dev build loaded app scripts as classic cross-origin scripts in the opaque-origin frame, so every
uncaught app error reached the page as "Script error.". Fixed: `crossorigin` on the dev page's scripts and on hot
updates (the frame files already answer with CORS). Not on `runtime.js`: 1.0.5 serves it without CORS, and a build
saved by this engine must still load after switching back (seen: a blank app until Rebuild). (3) Checkpoint restore
skipped `apps/<id>/data/`, so after a card edit it said "nothing to restore". Now the tool lists data files changed
since the checkpoint and restores the ones named in `data` (only paths git knows at either point; others untouched),
after the confirm card. The agent page's per-run Undo still restores code only. "Update does not clear": updates
never touch `data/`, so a broken card outlives them; the fork fix reads it anyway.

## 1.0.5: RELEASED 2026-10-13 (tag v1.0.5 pushed by the user). Ships Roleplay 4.41.0 (fork's main `8b9c8f0`, on the user's word): everything in the section below.

Cleanup on main the same day (the user's ask): removed `.fork/ui-assets/` (design mockups of finished work, ~3.4 MB)
and the unused README images (five `molfar-*.gif` besides `molfar-cast.gif`, `screens/chat-light.png`); all in git history.
The Roleplay fork's main had nothing to remove (`_frankenx.json` duplicates `frankenx.json` on purpose: the update template).

## Windows self-update "Can't set time" (Discord report, 2026-10-13): in 1.0.6
A Windows 10 user pressed Update now and the update failed with one "Can't set time" warning per file.
`src/self-update.ts` unpacked the release zip with `System32\tar.exe`; that tar exits non-zero on such
warnings, so `execFile` rejected and the update failed. The exact reason Windows refuses the time is not
known (no Windows box in the cloud). Fix: the zip is unpacked in-process with fflate (`unzipTo`, streamed,
refuses `..`/absolute/drive paths); tar stays for the macOS/Linux tar.gz. Tests: zip install + unsafe path
in `test/self-update.test.ts`. Copies on 1.0.5 or older still use tar: an affected user updates by hand once
(download the zip from the release), the fixed in-app update works from the next version on.

## Bug report form (2026-10-13): branch `claude/project-thread-p3ljej`, in 1.0.6
The user is turning on GitHub Issues for Discord players. `.github/ISSUE_TEMPLATE/bug_report.yml` (inherited, still said
"Chrysalis") is rewritten: where it happens (Roleplay / Molfar agent / engine / other app), what happened, steps,
expected, version (Apps page footer and app details), how you run it, device model + browser (required), model and
provider, screenshots, browser console, server log. `config.yml` adds the Discord link for questions.

Same branch: an in-app "Report a bug" dialog (`client/src/bug-report.tsx`), from the account menu (also inside apps)
and the Apps page footer. A description, device + browser (guessed from the user agent, editable), a screenshot
through screen sharing on desktop (saved as a file; phones get a hint), details (versions incl. the open app's
manifest version, screen, language, user agent, the last 10 errors the shell and app frames caught). "Open on GitHub"
pre-fills the issue form by field id (URL capped at 7000 chars); "Copy for Discord" copies the same text. Nothing is
sent by the engine. Browser-checked dark 1280, light 390, uk 390 (shots: project files `bug-report/`). The user
plans to ship this with the updater and script-error fixes as a small release after 1.0.5.
Known red CI, not this branch's: `test/speech.test.ts` gets 403 from the Edge read-aloud endpoint (red on main since
1.0.4); `src/speech.ts` sends Edge version 143, a likely cause, unverified.

## Mobile Chromium scroll (Discord report, 2026-10-13): Roleplay fork branch `claude/mobile-chromium-scroll-ym4h2f`, commit `99544e3`, released in Roleplay 4.41.0
Report: on Chrome/Brave (Android) the lower half of a chat does not touch-scroll; Firefox is fine; the composer
"sometimes vanishes". Scroll cause, reproduced at 390 px with touch emulation: the expression sprite panel
(`expression-panel.tsx`, fixed, `touch-action: none`, 42% of the window above the composer) sat at opacity 0
until its image loaded; a sprite that never loads left an invisible box that ate the drag. Firefox draws a broken
image as a small alt line, so no box. Fixed: hidden from hit testing until loaded, gone when the image fails.
The vanishing composer did NOT reproduce in emulation (keyboard resize, focus, viewport changes all keep it);
waiting on details from the reporter. Suspect, unverified: Brave's bottom toolbar vs the shell height.
Same branch, commit `0fa7690`: UX audit item 8 (phone tab rows): a shared `ui/scroll-strip.tsx` fades the side
with hidden tabs, adds a paging arrow and keeps the open tab in view (card, group and preset editors, samplers);
Tools wraps its tabs. Browser-checked 390 dark and light (shots: project files `ux-audit/item8/`). The audit
document now marks done (✅) and partly done (◐) items. Item 10 (phone chat header): four mockups for the user to
pick from, https://claude.ai/artifact/NUdHs8aKAvJKeDMdyZDctr. The user picked a mix of C and A; built in commit
`634491c`: phone header = back, portrait (menu: card, soul, full portrait), marquee name + chat title, context
ring with the percent (opens chat details), labelled "Menu". The menu is a right sheet: persona on top, Preset and
Model buttons that unfold the palette inline, "This chat" actions, "Go to" sections at the bottom. The preset /
persona / model strip under the phone header is gone. The composer "+" keeps generate and compose only; new chat,
delete messages, chat files moved to the chat menu (also the desktop kebab). Dashboard strip got a gauge chip.
Browser-checked 390 dark and light, desktop 1280 (shots: project files `ux-audit/item10/`). Released in Roleplay 4.41.0 with items 8, 10
and the scroll fix; the audit document marks them done.
Same branch, 2026-10-13, a second Discord batch. Commit `a87ad47` (bugs): a reply hung on "…" after the phone
hid the page (the store now races the POST against `watchForCommit`, which re-reads the chat on visibility/online);
moving dots plus "Writing · n s" while empty; a faster typewriter; swipe facts kept per swipe in `extra.swipeMeta`
(Stop then arrows showed one text on every swipe); relations skips a newest reply with no text; the new-chat step's
late memory no longer overrides early picks. Commit `9058471` (features, see the fork's CHANGELOG): "Save as my
default" preset choices (`data/preset-defaults.json`, order: step picks, the character's last chat, my default);
"Regenerate with a hint…" (swipe body `guidance`, depth-0 system line, never stored); per-field card translate
buttons and a lorebook translate popover; setting `replyDisplay` live/whole. Browser-checked 390 dark and light
(shots: project files `ux-audit/discord-batch2/`). Not done on purpose: translating preset prompts (the user:
macros and block references would break). The mock model takes `wordMs` to stream word by word.

## 1.0.4: RELEASED 2026-10-12 (tag v1.0.4 pushed by the user). Ships Roleplay 4.40.0. The user deleted every merged `claude/*` branch in both repos the same day.

## Group turns per chat: Roleplay 4.40.0 on the fork's main `ee998bb` (2026-10-12, on the user's word)
User report: a group on "Each in turn" + "Only when you trigger a member" "never answers"; and turn settings should
belong to the chat, not the group card. Cause: manual mode works as designed (the send stores the user's message
only) but its trigger hid in a member chip's popover and a staged reply bubble flashed and vanished. Now: chat meta
`turns` overrides the group's defaults per chat (engine `chatGroup`/`withChatTurns`, client `chatGroupSettings`/
`mergeChatTurns`, `setChatTurns`); a "Turns" button above the chat, "Use the group's settings", the generation mode
in the new-chat step; manual is "Only the member you pick" with a "Who answers?" row above the composer. Fixed with
it: narrator + leftover manual never answered; `refreshChat` dropped `groupSettings`. Tests in
`test/rp-groups.test.ts`; browser-checked dark 1280 and 390 (shots in project files `group-chats/turns-per-chat/`).
Follow-up the same day (user: "no labels, nothing is clear"): self responses and auto mode got plain names and a
line of help ("The same member may answer twice in a row", "Keep the scene going on its own"); auto mode is hidden
and paused under "you pick" (its bare send made nobody answer). The user looked at it and said ship it.

## 1.0.3: RELEASED 2026-10-12 (tag v1.0.3 pushed by the user). Ships Roleplay 4.39.0 (pushed to the fork's main `d1fde1b`): clickable Chats panel details and every S item of the UX audit (see "UX audit backlog").

## 1.0.2: RELEASED 2026-10-12 (tag v1.0.2 pushed by the user; release workflow run 26). Ships Roleplay 4.37.0 and 4.38.0 (4.38.0 pushed to the fork's main `65b38ac` on the user's word) and the built-in ux-review skill.
Group scene generation (START.md 1c), Roleplay fork commits `fb2db99`..`e68b02d`: the group editor's Scene tab
generates the shared scenario (mode "From the cards" or "Something wild", an optional wish whose language sets the
reply's language), then openings one at a time from the scenario (unlike the group's existing ones). Each result is
an editable draft with Use / Try again / Discard, filed by the profile plugin (1.1.0) in
`profile-drafts/group-<id>.json`; the plugin never writes the group file. Model (user, 2026-10-12): the model of the
group's latest chat, else the app's chat model; muted members are left out; cards are cut shorter as the group
grows. `test/rp-group-scene.test.ts`. Browser-checked (dark 1280, light 390) with a mock model; not yet run against
a real model. Chats page (user picked layout A of three previews, https://claude.ai/artifact/D9LyEPuS1SHPQq2q535PD3,
with stronger colours): commits `32d5386`, `eba5275`. A list grouped Pinned / Today / This week / Earlier (each
heading its own `--when-*` token), All / One-on-one / Groups chips, sorts, Select for bulk move and delete; a panel
with Continue, Pin, New chat, Litopys chapters, the last three messages in speaker colours, persona, preset, model,
history size, lorebooks, turns. Pins: new chat meta `pinned` (PATCH key; does not touch updatedAt). Pure logic in
`src/lib/chat-list.ts` (`test/rp-chat-list.test.ts`). Browser-checked dark 1280, light 1280 and 390.

## 0.9.7: RELEASED 2026-10-11 (tag v0.9.7 pushed on the user's word, release built with 6 assets; Roleplay 4.32.0 on the fork main `fa15553`)
The prompt inspector with sources: apps send a host-only `promptSources` (`src/prompt-sources.ts`: sanitize,
hook diff, locate), hook inserts are labeled for any app, Molfar's own prompt by section (byte-identical text),
a sources table + marks + "Left out" + choices on Molfar's page and in Roleplay's Prompt peek. Roleplay labels
every part in `assemble()`; drafts by external models (Kimi K2.7 Code, DeepSeek V4 Pro), reviewed and fixed;
peek port and browser check by a Sonnet subagent. Live test by the user: works; fixed after it: long system
prompts clipped at 20k hid late inserts (now 200k/50k), the view slid sideways (min-w-0 on the params rows).
Speed (a Discord player's phone timeouts): lorebook keys by indexOf (1000 entries 10+ s -> 0.6 s), macros and
regex scripts once per pass (400 messages with 150 scripts 3.3 s -> 1.3 s); bench in `.fork/bench/`.
Plurals: `t()` reads `{n|one|other}` by `Intl.PluralRules`; the i18n placeholder test works again.
Plan and UI spec were in `.fork/handoff/inspector-sources/` (git history).
The Discord player's timeouts turned out to be a Roleplay that had not finished building on their phone
(2026-10-11); the speed work stays (measured, and it removed real 10 s cases). CLOSED.
Android update 0.9.2 -> 0.9.7 (2026-10-11, user's Xiaomi): the in-app update was stopped by Play Protect ("never
checked apps from this developer", "Install anyway" not tappable); OK closed it silently (the session reports
ABORTED). Same APK downloaded from GitHub in the browser installed fine. MERGED into main (PR 3, `5f7fed7`):
ABORTED now shows "download in the browser"; shipped in 0.9.8 (it changes the installed app, so it helps from the
update after that). Not yet seen on a real phone. For good: Android developer verification (user's Google account).
CI lint on main was red from the `.fork/ui-assets` HTML mockups (3 duplicate CSS properties): `.fork/**/*.html`
is out of the lint now (`878c0e2`); main CI green again. On Windows, a local `bun run test` fails the 0600 and
`tar` tests (Windows-only, CI on Linux passes); `client-agent` needs its own `bun install` in a fresh worktree.

## 0.9.8: RELEASED 2026-10-11 (tag v0.9.8 on `70bc6c3`, release built with 6 assets; Roleplay 4.33.0 on the fork main `6be41bb`)
The card in fields (Profile tab, section switches, Structure it / Fill empty / Read from picture, the persona's
form and five questions, PNG/CHARX/JSON export), the vision model setting (`model-vision.json`, `GET/PUT
/v1/models/vision`, pictures in plugin llm requests), and the Molfar agent track (PRs 6, 7, 9: tools, run budget,
the new agent page; `.fork/handoff/molfar-agent/HANDOFF.md`). The user tested the card editor before the tag.
1.0.0 (user, 2026-10-11, revised the same evening): group chats, not the agent batch; 0.9.8 stays as released, agent included.
0.9.8's notes miss the agent page's colour pass and the "M" avatar fallback; the user may add them to the GitHub
release text by hand. Card editor leftovers: `.fork/handoff/card-editor/PLAN.md` (rewritten as a short "later" list).
The user's workspace copies of `edit-large-card`: `.fork/handoff/card-editor/workspace-agent-task.md`.

## 0.9.9: RELEASED 2026-10-11 (tag v0.9.9 on `24ffcec`; Roleplay 4.34.0 on the fork main `d3fa432`)
The user asked for "0.9.8.1"; the launcher and release.yml accept only vX.Y.Z, so it is 0.9.9.
Prompt restore audit: every prompt a user can edit has a way back to its default. Engine: Molfar's instructions,
workspace AGENTS.md, built-in skills already had one. Roleplay 4.34.0: utility prompts in editable preset copies got
a per-field Restore; Litopys and dashboard prompts restore one by one. Left on purpose: a copy's Main Prompt (its
"default" is its source preset, which a copy does not record).
"App settings live in the apps": Litopys settings open from a Library gear (Settings > Memory points there), the
dashboard's in-chat settings got note age + soul/nudge/fast prompts and a gear before the first build, the Tools
panels of both plugins are gone (no `uiPanel` export). "Open dashboard" sits at the top of the strip.
README (3 languages): download and Discord badges, profile.png and persona.png rows, "Work in progress" removed.

## 1.0.0: PREPARED 2026-10-12 (main fast-forwarded; the tag v1.0.0 is the user's to push). Group chats ship as Roleplay 4.35.0 (pushed to the fork's main on the user's word); the engine is unchanged from 0.9.11. Still open for groups: scene generation, the Chats page group part, the Characters type filter, small-model prompt tweaks, a workspace-agent task for the edit-large-card skill copy, a darker palette yellow on light themes.

## 1.0.1: PREPARED 2026-10-12 (main fast-forwarded; the tag v1.0.1 is the user's to push). Dashboard on local thinking models + the bigger event vocabulary, both in Roleplay 4.36.0 (pushed to the fork's main on the user's word). Local `bun run test`: 2 edge-tts tests fail in the cloud sandbox (live network 403), unrelated.
Reddit report: local Fenrir-X-26B-A4B (Gemma 4 finetune), default preset; the dashboard flooded the endpoint and came back
empty with cut-off thinking; Russian cards answered in English. Not the 0.9.10 Soji fix (that one threw away a finished
reply on a stream with no finish_reason; here the model spends the whole limit thinking and writes no answer). Fixed in
the Roleplay `relations` plugin: sensor and soul rating calls take the chat preset's reasoning level, thinking budget and
tags (a budget adds to the reply limit); an all-thinking answer names the cause; an inline `<think>` block before the JSON
is skipped; a bulk card import no longer rates every card (one card still is); the insert and the fast note say the reply
stays in the story's language. Inferred, not verified: a local OpenAI-compatible model the engine does not know as a
reasoning model gets no thinking fields at all, so on such a server only the server's own settings bound the thinking.
Engine part (same day, the user's word: "if not too big"): a chat completions connection has a "The models think (local
server)" switch in Settings (Add and Edit; `ConnectionDef.thinking`, `templateThinking` in `src/providers/custom.ts`).
On: every model of the connection counts as thinking and gets `chat_template_kwargs.enable_thinking` (true when the
preset asks for reasoning, false on Off). No budget field is sent: which per-request budget field llama.cpp reads is
unknown here. Tested against a fake server (`test/custom-template-thinking.test.ts`), not against a real llama.cpp.
Browser-checked (dark/light 1280, light 390). Text completion connections are untouched.

## UX audit backlog (2026-10-12; user: fix it bit by bit, together with the next releases)
**Done (2026-10-12, released in 1.0.3 / Roleplay 4.39.0):** every
item sized S. Engine: connection delete confirm, desktop Settings close button, connection status word, models
counter "N shown · M available", star/sliders hint, primary Add connection, New app labels, theme swatches,
app delete as a 40 px trash icon; agent page: "Mode: Full" with what each mode does, chat list time line,
Continue row above the templates, phone header captions, one context counter, "Apply proposal", wrapping tiles.
Roleplay: see its CHANGELOG "Unreleased" (with the clickable Chats panel details). Defaults taken: Switch "on"
is `cta` app-wide; Library is the section name, Litopys the chronicler. Found: Roleplay's "no model" chip calls
the shell's `openSettings`, which the bridge allows only for trusted apps, so an `origin: local` install
gets a toast instead. Left: the M/L items (phone tab rows, jargon round, chat header icons, theme follows
shell, editor tabs), Store "Install" on an installed app (check on a normal install).
Five external vision models reviewed screenshots (129 kept) (shell, agent page, Roleplay 4.37.0; 1280/390; all
themes) against `ux-review`; findings checked against the code, wrong ones dropped. The document (Ukrainian,
ranked by impact/effort, exact screens and files) is NOT in the repo: desktop
`E:\Claude\Chrysalis-Engine\data\ux-audit\UX-AUDIT.md` (gitignored `data/`; screenshots in `screens/`, raw
reports in `reports/`), also in the project files `/mnt/project-files/ux-audit/`. The laptop has no copy; the
user copies it when needed. Take items into releases as the user picks; mark them done in the document.
Top items: connection delete has no confirm (`client/src/settings.tsx` ~1586); dashboard errors show "sensor reply
was not JSON" to users (`plugins/relations/plugin.js` ~2744); agent page "Full" is the permission mode with no
hint (`client-agent/src/Header.tsx` ~160); Roleplay Home "no model" chip did nothing in the test run and is hidden
on phones (`home-view.tsx`); desktop Settings dialog has no close button; Groups tab header says "Characters 0";
stock preset shows two notices and two copy buttons; tab rows overflow on phones (Tools, card editor, preset
editor); jargon without hints (Advanced tab, lorebooks, personas, Library/Litopys, Shortcuts).

## UX rule for UI work (2026-10-12; engine merged into main, Roleplay 4.37.0 on the fork's main `97b7c3b`, both on the user's word)
The user's rule: every UI change is judged first by how easily a user finds, understands and uses it, desktop and phone.
Skill `.claude/skills/ux-review/` (checklist on real components, tokens and breakpoints + a walk-through), a CLAUDE.md
rule and "done means" line, a "Usability" part in the built-in `app-authoring` skill (digests updated), and a pointer
in the Roleplay fork's AGENTS.md (same branch name there).
Round 2 (same day, same branches): `ux-review` is also a built-in skill for Molfar (`builtin-skills/ux-review`,
`app-authoring` and `finish-change` point to it; the small-model prompt stays under 3.7k). Roleplay 4.37.0: Characters/Groups tabs with a violet group colour (`--group` token, also group tiles and group
chats in the Chats list); FRANKENX Prose language is a pick of 14 languages + "Same as my messages" (migration in
`onAppUpdate` for presets that still have the text field); talkativeness: a card's own value, else (missing or the
usual 0.5) a word-list guess from its text, shown in the group editor (`src/lib/talkativeness.ts` mirrors the engine
plugin, test compares); a profile written without `compiled` is compiled on the app's next load, and Molfar's card
skills write profile fields. Group scene generation: see "Next Roleplay" above. Gaps found: no shared tap-friendly info-popover component in
the shell or Roleplay (hints are inline text; `title=` tooltips do nothing on phones); `size-8` icon buttons are 32 px.

## Dashboard event vocabulary, bigger (2026-10-11, in Roleplay 4.36.0 with the thinking fix)
19 new events in `EVENT_ROWS` (`plugins/relations/plugin.js`), 3 meanings widened (protected_her, protected_her_standing,
insult); `trust.shared_secret`-style ids count. Draft by an external model, reviewed and cut. Measured on 72 scenes
(uk/ru/en, `/mnt/project-files/dashboard-vocab/`): DeepSeek V4.1 Flash 39 -> 2-6 turns with no usable event; Gemma 4
26B A4B improves but swings between runs and often invents ids. +~300 tokens on the sensor prompt. Not yet: what lands
in `other` on the user's real chats (debug `unknownEvents`).

## 0.9.11: RELEASED 2026-10-11 (tag v0.9.11 pushed by the user). Fix: with no model picked, Molfar runs the first shown model, not the catalog's first (OpenRouter "~anthropic/claude-fable-latest").

## 0.9.10: RELEASED 2026-10-11 (tag v0.9.10 pushed by the user)
Two Discord fixes, engine only (Roleplay unchanged at 4.34.0): the agent model pick and the custom stream end, below.

## Agent model pick: no quiet swap (2026-10-11, in 0.9.10)
A Discord player picked Kimi K2.5 for Molfar and was billed for a Claude model. `UserAgent.create` fell through
request model -> project -> user default -> instance default -> the alphabetically first model whenever a named one
was missing (the cause for that player is inferred, not seen). Now the first named model must exist, else a clear
error (503), like `models.ts` resolveModel; the dynamic catalogs refresh before the pick. Tests in
`test/agent-memory.test.ts`. Not checked in a browser: how the agent page shows that error.

## Custom connections: a stream without finish_reason keeps its reply (2026-10-11, in 0.9.10)
A Discord player on Chub's Soji (`https://inference.chub.ai/soji/v1`, custom OpenAI-compatible) saw replies vanish
with "Stream ended without finish_reason". pi-ai throws when `compat.supportsFinishReason` is on and the stream ends
without one; custom openai-completions models now carry `supportsFinishReason: false` (`src/providers/custom.ts`
toModel), so the stream end counts as done and a finish_reason that comes is still read. Reproduced and covered in
`test/custom-finish-reason.test.ts`; not tried against Soji itself (no key). Trade-off: a stream cut mid-way by the
network now reads as a finished short reply on custom endpoints.

## Next: 1.0.0 = group chats (user, 2026-10-11)
Looked into live: groups work in the engine, but a group cannot be deleted (wrong route), opens in the card
editor where edits are dropped, and has no UI for members. Plan: `.fork/handoff/group-chats/PLAN.md`. Steps 1-2 done on the Roleplay branch (not released); step 3 = the narrator mode.
1.0.1 = the phone version; the agent batch (3.7, 2.5) comes after.

## Repos (checked 2026-10-11, after 0.9.8)
- Engine: every `claude/*` branch except `claude/upstream-context-fixes` is fully in main (0 commits ahead):
  `android-update-fallback`, `project-thread-c3878l`, `-eed1tv`, `-mqq0gh`, `-ukmmm7`, `-a2fc82`, `v098-card`.
  `claude/upstream-context-fixes` stays (the open upstream PR, CLAUDE.md).
- Roleplay fork: `claude/v098-card` and `quick-fixes` are fully in main.
- The session's proxy cannot delete remote branches: the user deletes the merged ones on GitHub.

## Open, from 0.9.4-0.9.6
- Presets: "Make default" still moves chats that rode the old default (store behavior). The studio bag hole and
  the "Use in this chat" / "Make default" split shipped in Roleplay 4.33.0.
- One first reply on NanoGPT GLM 5.2 thinking carried the preset's planning as plain text (no think tags);
  the user chose to leave it.
- Lesson from 0.9.6: after copying Roleplay files into a workspace, check the app's manifest `source.head` and
  re-verify the files after the first engine start (an app update can merge the released versions back).
- Plans for later: the queue in START.md.

## Released (details: CHANGELOG, `.fork/release-notes/`, git history)
Tags are pushed by the user; `release.yml` builds the archives, the APK and the Docker image.
- 0.9.8 (2026-10-11; Roleplay 4.33.0): the card in fields, one vision model for apps, Molfar's new page, run
  budget and four new tools, the Android update fallback.
- 0.9.7 (2026-10-11; Roleplay 4.32.0): where each part of the prompt comes from (inspector and Prompt peek),
  Molfar's own prompt labeled, fast sends with big lorebooks and preset regex, plurals.
- 0.9.6 (2026-10-10; Roleplay 4.31.0): presets with options per chat (`meta.presetVars`, `{{#if}}`, section
  conditions, notes, per-character memory, option costs), Marinara import, FRANKENX 1.6 built in
  (`.fork/presets/frankenx/adapt.ts`), a Discord link in the apps page footer. Plan: git history of `.fork/handoff/chat-presets/`.
- 0.9.5 (2026-10-10; Roleplay 4.30.0): effective parameters in the chat (`GET /v1/models/params/effective`),
  backstory along a chain of up to 3 chats, named examples in model recommendations, Roleplay settings next to
  the shell (language, embeddings and backup links), duplicate chat ids, the agent page's picker on live runs.
- 0.9.4 (2026-10-10; Roleplay 4.29.0, no engine release): deeper lorebooks (word forms in Cyrillic keys, why an
  entry fired, keyword test, every SillyTavern field working, links on the card, Data Bank scope), card saves
  send only changed fields.
- 0.9.3 (2026-10-10; Roleplay 4.28.0): six card storefronts, paste-a-link, cards up to 200 MB through
  the engine file route, RisuAI emotion images, card translation. The first v0.9.3 tag sat on the old
  main and release.yml failed; the user moved it to `8f9c58f` and the release is out (6 assets).
- 0.9.2 (2026-10-09; Roleplay 4.27.0): connections and models in one Settings tab with a quick switch,
  parameters on the model (model-params.json), a model per chat, chats that continue each other
  (backstory), Library portraits on the dashboard and in Soul.
- 0.9.1 (2026-10-09; Roleplay 4.26.x): Molfar's skills index and card skills, token use measured and
  cut, card id copy, release-signed APKs.
- 0.9.0 (2026-10-08): Memory v2, one story memory per chat (Litopys) with matching by meaning.
- 0.8.0-0.8.1 (2026-10-05..06; Roleplay 4.22-4.23): relationship dashboard v2 (sensor, event vocabulary, what the
  model sees), then fixes (dashboard hooks, subscription sign-ins in downloads and Android).
- 0.2.0-0.7.0 (2026-10-02..04): launcher, Updates panel, Ukrainian locale, independence from
  upstream (own Store catalog), Molfar's name and avatar, the shell redesign round 1.

## What the engine has (all shipped; details in the CHANGELOG)
- Agent context: `src/agent/context-budget.ts`, `compact.ts`; small-model mode (`small-window.ts`, Settings > Agent: Auto/On/Off, auto at window <= 32k or unknown, ~2.6k tokens before the first message); prompt inspector (`src/inspector.ts`, last 20 requests per user).
- Memory and skills: `src/agent/memory.ts` (core MEMORY.md + topic files, `memory_search`, written only through confirmed cards); `builtin-skills/` ship with the engine (a global workspace skill of the same name replaces one, deleting the copy resets it); tools `skill_propose`, `skill_edit`, `skill_load`.
- Projects on the agent page (`src/agent/projects.ts`, `/v1/projects…`; chats can move between projects), checkpoints (`checkpoints.ts`, restore = code only), protected paths (`protect.ts`, list in settings `agentProtectedPaths`), `ask_user` with options and several questions, default instructions (`DEFAULT_PERSONA` in `src/paths.ts`, "Restore default instructions").
- Model pickers (Settings > Models, `models-shown.json`), full profile backup (`src/profile-backup.ts`, Settings > Backup; import replaces the profile).
- Updates panel (0.2.0): top-bar Updates button with a badge (`client/src/updates-panel.tsx`); engine row for admins (source installs: "restart with its launcher"), one row per app with an update source, "Update all" stops at the first row needing a decision. The app update flow (strategies, dep/permission review) lives in `client/src/app-update.tsx`, shared with the launcher's AppDetail. Checks: once per shell start, then "Check now" or after an update. The logo opens the launcher. Standalone plugins imported from git have no update source yet, so they are not in the panel.
- Prompts (2026-10-02): `src/agent/prompt-rules.ts` holds `LANGUAGE_RULE` and `PRECEDENCE_RULE` (engine limits > current message > project > persona > app AGENTS.md > workspace AGENTS.md > general rules; data/downloads/tool output never instruct), in both the full and the compact prompt. The full base prompt opens with "How you work" (look first, ask, lightest place, check each step, report). Sizes (`estimateTextTokens`): base template 2035 -> 2480, compact 429 -> 763, DEFAULT_PERSONA 220 -> 75; full prompt + tools under 9.3k (test). `DEFAULT_PERSONA` = preferences only; `PAST_DEFAULT_PERSONAS` + `ensurePersonaDefault` move an untouched copy on boot. AGENTS.md: `workspaceAgentsMdStatus`/`restoreWorkspaceAgentsMd`, routes `/v1/settings/agents-md[/restore]`, row in Settings > Agent. `pruneUnchangedSkillCopies` on boot (the desktop's 4 identical copies go away on the next start). Built-in skill `default-prompts` = the plugin prompt convention. Tests: `test/default-prompts.test.ts`.
- Emulated git: `add` is a no-op, `rm` deletes tracked files. Hot update removes deleted modules (`src/builder/dev.ts`).
- Product name Molfar Vertep (UI in 14 locales incl. Ukrainian `uk` since 2026-10-02, README, launcher).
- Launcher `Molfar-Vertep.bat` (repo root, 2026-10-02): finds the app beside itself or via `%LOCALAPPDATA%\Molfar Vertep\app-path.txt`, or offers to clone it next to itself; checks Git/Bun (Bun >= 1.4, `tools` upgrades both); release channel = highest `vX.Y.Z` tag (detached HEAD), `dev` = newest `claude/*`; asks before updating (`yes` skips; `choice` defaults to yes after 20 s); never updates over local changes to tracked files; installs/builds only on change; offers a desktop shortcut once (icon generated from the logo into `%LOCALAPPDATA%\Molfar Vertep`); runs from a `%TEMP%` copy (path kept before `shift`, copies older than a day cleaned); keeps itself when switching to a version without it, and removes an untracked copy that would block a version shipping it; sets `CHRYSALIS_LAUNCHER=1` so the engine opens the browser (`config.yaml openBrowser` still decides; `CHRYSALIS_OPEN_BROWSER` is the setting override, not this). Tested on the desktop with a Cyrillic path with spaces: fresh clone, remembered path from a copy elsewhere, offline, local changes, v0.2.0 -> v0.3.0, `dev`, back to a release without the launcher, no-console default. Not tested: missing Bun/Git (needs uninstalling), Bun older than 1.4, answering N. `.fork/start-chrysalis.bat` forwards to it; `.fork/Chrysalis.bat` removed.
- Independent of upstream (2026-10-02, user's decision): no merges from ProjectChrysalis, no new upstream PRs (the open `claude/upstream-context-fixes` stays). Store catalog: own repo `MolfarWav/Molfar.Vertep-Store` (`apps.json`, `scripts/validate.ts --clone`, CI), `DEFAULT_STORE_URL` points there, `PAST_DEFAULT_STORE_URLS` moves old config.yaml values on load. `OFFICIAL_SOURCES` = MolfarWav only. Visible strings and prompts say Molfar Vertep; workspace AGENTS.md is version 14. Docker image and issue/security links are ours. Internal names stay (`chrysalis` command, `CHRYSALIS_*`, data paths, `Chrysalis-*` archives, window globals like `ChrysalisBuilder`) until a rename handoff on the user's word.

## Roleplay and Litopys
- Roleplay never updates from ProjectChrysalis again: it lives in `MolfarWav/Molfar.Vertep-Roleplay` (fork of Roleplay-Chrysalis). Code on disk: `data/users/<name>/apps/roleplay` (desktop `molfarwav2`); no separate checkout; assembled in a scratch copy for releases.
- Engine: `FORKED_APPS`/`forkOf`/`adoptForkedApps` (`src/apps/store.ts`, run on boot) switch existing installs to the fork source and restamp the baseline's plugin manifests; `OFFICIAL_SOURCES` includes `https://github.com/MolfarWav/`. Plugin manifest `replaces: [ids]` keeps a sibling on disk but never runs it.
- Roleplay 4.19.1 (fork `8e273d2`): Litopys replaces Archivarius (reads the legacy `archivarius/*` until its first save); prompts are defaults in code (`DEFAULT_PROMPTS`, config keeps only changes, `PAST_DEFAULT_PROMPTS`, "Restore default prompts"). Checked live with a mock model and on DeepSeek V4.1 Flash with a Ukrainian scene.
- Roleplay 4.19.2 (2026-10-02): PUSHED to the fork's main (`5cf9cb7`, user allowed). The summary prompt is `DEFAULT_SUMMARY_PROMPT` in `plugins/engine/plugin.js` (settings keep only a changed prompt, `PAST_DEFAULT_SUMMARY_PROMPTS`, route `GET settings/summary-prompt`, Reset clears), summary and memory-extract prompts rewritten and given language lines (checked on DeepSeek V4.1 Flash and Nemotron free with a Ukrainian scene), image prompt says it stays English, `test/rp-prompts.test.ts`. Browser-checked in a throwaway engine.
- Workspace work (apps, plugins, skills, memory) belongs to the built-in agent; for it write a copy-pasteable prompt (example: `.fork/handoff/v094/workspace-agent-task.md`).

## Open, known, not fixed
- Workspace `data/_debug/` still exists on the desktop.
- 12 engine tests fail on Windows (shell, 0600 modes, self-update, the source watcher) and on main too.
- Fixing a syntax error may not hot-apply (`runtime.ts` `apply` re-runs only modules that were live); a guess from reading, untested. The runtime part of the deleted-module fix is not checked in a browser.
- Not tested on Windows: the profile import's folder swap (fails safe on locked files).
- The workspace has no backup off the user's disk (no remote).

## Traps
- Bun: session containers ship 1.3.14, the project needs 1.4.0 (`npm i -g bun@1.4.0`).
- `/v1/models` without `?all=1` returns only the shown models.
- The app bridge allowlist exists twice (`appBridgeAllows` in `app.ts`, `client/public/app-bridge-host.js`); new shell-only routes need no change there, but go into the lists in `test/security.test.ts` and `test/malicious-plugin.test.ts`.
- A session's system prompt is cached per agent instance: anything that changes it must `evictAgents` or change the docs/project stamp.
- The workspace AGENTS.md is overwritten on boot when the engine's marker version is newer (a user's edited copy keeps its text only through the digest).
- Browser checks: skill `browser-check` (`.claude/skills/browser-check/`). Real model runs need a mock OpenAI-compatible server (the skill has one).
- Launcher: edit `Molfar-Vertep.bat` as ASCII with CRLF line endings (`.gitattributes` has `*.bat -text`); `shift` moves `%0`; no paths inside `( )` blocks (a `)` in a folder name ends the block); test with a separate `LOCALAPPDATA` and a pre-made `shortcut-asked` marker, or the test puts a shortcut on the real desktop. The laptop's `D:\ROLEPlay\Chrysalis.bat` is an old external copy (newest `claude/*`); an untracked `start-chrysalis.bat` in the desktop repo root is an old copy too.
- Known Windows-only test failures (13, 2026-10-02): file mode 0600 (credential relocation x3, home flow), sandbox shell prelude git, app foundation source watcher, S5 session id path separators, installing a release x6 (`tar`). CI on Linux is the reference.
- `browser-check` on Windows: `pw.mjs` finds the installed Chrome or Edge; `stop.sh` also stops what listens on the engine and mock ports (taskkill), since killing the Git Bash PID can leave bun.exe running (fixed 2026-10-11).
- Tags are pushed by the user from a terminal (the session proxy cannot push tags); `release.yml` creates the GitHub release itself (title "Molfar.Vertep X.Y.Z", body from `.fork/release-notes/X.Y.Z.md`, Docker image to ghcr.io/molfarwav). Release assets keep upstream's `Chrysalis-*` names (`self-update.ts` matches them).
- `APP_API_VERSION` (1.0.2, `src/install.ts`): what app `engine` ranges are checked against; raise it only when an upstream merge changes the app contract.

## Closed with the user: do not reopen
- UI redesign: designed by Hermes; the brief is queued (handoff 4), do not start it before the user says so.
- Release 0.1.0 title on GitHub reads "Molfar.Vertep 0.1.0"; update checks read `tag_name`.
- Delegation rule (Opus/Fable orchestrate, other models execute) is in `CLAUDE.md` and `~/.claude/CLAUDE.md`. `ask-model`: the personal copy on the desktop (`~/.claude/skills/ask-model`, keys in its `keys.env`) and, since 2026-10-11, a repo copy `.claude/skills/ask-model` for the laptop and cloud (keys from env; in the cloud also the hosts in Allowed domains, set by the user in the project's cloud environment); `adaptive-agent` is a Claude Code skill pair, not for Hermes.
- Launcher: one `.bat`, source mode, update channel = latest release tag, `dev` = newest `claude/*`. Versions: significant = minor, patch = patch.
