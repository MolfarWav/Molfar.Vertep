# Handoff: Molfar, the agent: new page and new abilities

Written 2026-10-11 from the user's decisions. A track of its own, separate from the Roleplay versions
(0.9.8 is the card editor): it ships as engine releases when parts are ready. Read `CLAUDE.md` and
`.fork/STATE.md` first. To keep parallel work from colliding on push, this track writes its progress
HERE (and in its own commits), not in STATE.md or START.md, until it is merged and released.
Everything is engine code (`src/agent/`, `client-agent/`), no Roleplay fork changes unless noted.
Supersedes `.fork/handoff/agent-tools/HANDOFF.md` (its four open tools are folded in below; delete that
file when this one ships).

## Progress (newest first)
- 2026-10-11, follow-up after PR #7 merged (same branch, new PR): a skill clicked in the project pane opened with its
  SKILL.md path as a "supporting file" ("is not a skill file path"); it now opens the skill. Under the last reply,
  Shorter/Simpler are brand-tinted pills with icons, Apply is filled, the icon row tints on hover, and "Undo" on the
  changed-files line is in the link colour. The user liked it.
- 2026-10-11, branch `claude/project-thread-c3878l` (merged into main as PR #7, not released): part 2, the page.
  - Layout (`App.tsx`, `Header.tsx`, `Sidebar.tsx`): the sidebar folds to a 56 px rail (avatar, new chat, search,
    project icons). Header right: model chip (the only desktop model picker), context meter (amber 75 %, red 90 %; a
    reopened chat takes it from its last run, `lastUsage` in `store.ts`), connection dot ("Offline" only when down),
    inspector (now an eye icon), search, memory panel, pane toggle. Banners are a slim strip under the header.
  - Project pane (`ProjectPage.tsx` `ProjectPane {id, layout: "pane"|"page"|"phone"}`, sections in
    `ProjectSections.tsx`): one set of sections, three layouts. Pane width and fold state in `store.ts` `pane`
    (localStorage `agent-ui-pane`), drag handle, double-click resets, arrows resize. `view.kind === "project"` is the
    full page with tabs. "Open app" posts `{__chrysalisAgent: "open-app"}` to the shell (`shell.ts`, handled in
    `client/src/App.tsx`, installed apps only).
  - Phone: Chat | Project segmented control (`phoneTab`), a strip with model, reasoning, meter, tokens and cost, one
    combined model/reasoning/mode chip in the composer, the project as an accordion with a sticky footer.
  - Thread: composer and messages up to 1100 px; empty chat = 2x3 starter cards ("Continue: <last chat>" + templates);
    phones list the last 3 chats and show the templates as a 2x2 grid. `MolfarAvatar` falls back to an "M" circle.
  - 3.5 templates: `client-agent/src/templates.ts` (`/card`, `/lorebook`, `/preset`, `/fix`, `/skill`): each names its
    skill and asks Molfar for ONE ask_user card of 2-3 questions before it starts; offered only when the skill is
    installed. Same list in the "/" menu (group Templates), the starter cards, the phone grid and the chip row.
  - 3.4 quick actions under the last reply: Shorter, Simpler, Apply (only when it changed nothing). Undo stays the
    "Changed <app> · Undo" line under the reply (a second button there was a duplicate).
  - 3.3 plan first: `planGate` in `src/agent/run-tools.ts`, called from `beforeToolCall` in `agent.ts`: write_file /
    edit_file / json_set on an app's code (`appCodeTouched`) or on a 4th distinct file (`PLAN_FILES = 3`) is refused
    until run_budget (now with `files`, listed on the card) gets "Go on" or "Smaller"; "Stop" refuses every write of
    the run. Off in Accept and Plan modes and without an ask channel. Bash is not gated.
  - 3.6 memory marks: memory_search returns its top 3 hits as `details.hits`; the run keeps them as `memory`
    (`RunMemory`, max 6); `RunInfo` shows "from memory: …" chips that open the memory panel on that entry
    (`openMemory`). Limit: notes the model reads from the always-present memory section of the prompt are not marked;
    only memory_search lookups are.
  - Checked: typecheck, full test run (new tests for the gate, the run_budget files and memory_search details), client
    build, lint on touched files, browser check with a mock model at 1440, 1024 and 390 px, dark and light. Not checked
    live: the gate on a real model (does a small model recover from the refusal with run_budget?), the shell's Open app
    from inside the frame, Restore from the pane with a real checkpoint, the "Offline" state.
  - Colour pass (user, 2026-10-11: "the point was to make the main things stand out"): tokens `brand` (the shell's
    accent: Vertep red, blue on Dark/Light, a custom theme's accent), `link` (cyan, actions that leave the page) and
    `font-heading` (Kurale on Vertep only, self-hosted in `client-agent/src/fonts/kurale`) in `globals.css`. Filled brand:
    New chat, Send, Save checkpoint, the ask card's recommended option and send. Brand bar + tint: active chat, open
    project, selected tab, phone segment. Vertep only: dot grid behind the thread, the Vertep mark behind the welcome
    avatar (`MolfarHalo`). Check screens in the vertep theme: browser-check's `open()` defaults to "dark".
  - Next: part 3 (3.7 skills that learn, then 2.5 app_screenshot).
- 2026-10-11, branch `claude/project-thread-eed1tv` (pushed, not merged, not released): part 1 of the order below.
  - 2.1 `plugin_log`: `src/plugins/plugin-log.ts` keeps 500 lines per user in memory (host.log and console
    lines, failed routes, hooks and tools), fed from `printLogs`/`logFailure` in `runtime.ts` through the new
    `PluginRuntimeDeps.owner`. Skill `plugin-silent-failure` now starts from it.
  - 2.2 `app_request {id, method, path, body}`: `dispatchAppRoute` passed from `app.ts` as `appRequest`; route
    writes are committed like a page's (`app(<id>): METHOD path`), revertable with git. No checkpoint: checkpoints
    cover code, a route writes data. Plan mode: GET only.
  - 2.3 `model_try`: one generation through `svc.generate` with `source: "agent:try"`, an ask card with the model and
    a price ceiling first (input estimate + maxTokens; default 1024, cap 4096). Not in WRITE_TOOLS (costs, writes
    nothing).
  - 2.4 `web_fetch`: built only when the sandbox internet switch is on, re-read per call; `assertInternetHost` in
    `net-guard.ts` refuses localhost, private literals, private DNS answers and unresolvable names on every redirect
    hop (DNS rebinding between check and fetch stays possible, as for plugin egress). HTML -> text, 30k chars.
  - 3.1 run budget: tool `run_budget {steps, plan}` prices `steps` calls on the current context
    (`steps*context + 1500*steps*(steps-1)/2` in, 400 out per step, no cache discount) and asks Go on / Smaller /
    Stop; one line in the full prompt asks for it before 10+ step runs. After the run: `RunSpend.calls` and the
    per-run line under each reply (`3 steps · 16.5k tok · $0.004`).
  - 3.2 skills chip: `skill_load` result details `{skill, scope, file?, tokens}` -> run `skills` (result and session
    record) -> `client-agent/src/RunInfo.tsx` chips under the reply; a click opens the skill in the memory panel
    (on the file for a file load).
  - Small mode: the new tools are in the app group (`web_fetch` in a new `web` group); `run_budget` is app-group in
    small mode only (`FULL_ALWAYS`), since the core set must stay under 3.7k tokens.
  - Checked: typecheck, full test run (`test/run-tools.test.ts` new), client build, lint (no new warnings except
    `!` in the new test, the test files' style), browser check of the chip and the cost line (dark, light, 390 px)
    with a mock model. Not checked live: `web_fetch` against a real site, `model_try` on a real model, a file-load
    chip in the browser, the `$` part of the line (the mock has no price).
  - Trap: the cloud clone is shallow; `bun scripts/skill-digests.ts` then drops old digests. `git fetch --unshallow
    origin main` first.
  - Next: part 2, the page (section 1 with 3.3-3.6).

## Decisions (the user, 2026-10-11): do not ask again
- Design: **variant A as the base** + **the right side panel from variant C** (the project beside the
  chat; it can expand to the full width, which is the project page). **Phone: variant C's phone**
  (segmented control Chat | Project at the top). Mockups: `.fork/ui-assets/molfar-page/variant-a.html`,
  `variant-c.html` (+ PNGs), brief `BRIEF.md` there.
- Abilities: everything planned for the agent before (the four open tools of the old handoff, the skill
  chip) + every ★ idea of 2026-10-11 + "skills that learn". The rest goes to the drawer below.

## 1. The page (client-agent)
Files today: `client-agent/src/App.tsx` (layout, thread, composer), `Header.tsx`, `Sidebar.tsx`,
`ProjectPage.tsx`, `ProjectChat.tsx`, `Checkpoints.tsx`, `MemoryPanel.tsx`, `QuickActions.tsx`,
`SlashCommands.tsx`, `Inspector.tsx`, `MolfarAvatar.tsx`. English only (no i18n on this page).
From A:
- The conversation and composer take the width (composer ~1000 px at 1440, cap ~1100, grows with the
  window); the sidebar folds to an icon rail.
- Header right: one status cluster: model chip (the ONE model picker; remove the composer's), context
  meter `38k / 128k` (amber from 75 %, red from 90 %; the inspector's numbers), connection dot (a word
  only when not green), inspector, search, settings. The red "Connection lost" banner becomes a slim
  strip under the header with Retry and Dismiss.
- Composer keeps: project chip, +, attach, reasoning level, context mode, tokens and cost, compact, send.
- Empty chat: avatar, greeting, a 2x3 grid of starter cards ("Continue: <last chat>", and the task
  templates of 3.5 below) instead of the small recent-chat chips.
From C:
- A right **Project pane** (~340 px, resizable, collapsible, remembered per user) beside the chat:
  Open app, Instructions (summary + edit + show all), Memory (notes + edit), Skills (chips, count),
  Checkpoints (label + Save now, the last few with restore), Files (drop zone), Default model.
- The pane's expand button turns it into the **full-width project page** (tabs: Overview, Instructions,
  Memory, Skills, Checkpoints, Files; the Overview is today's ProjectPage content); "Back to pane"
  returns. One component, two widths: no second project page to maintain.
- Header and composer elements of C that A lacks are not taken unless listed here.
Phone (C):
- Top: hamburger (projects and chats drawer), title, inspector, connection dot; under it a segmented
  control **Chat | Project**; a one-line strip with model, reasoning, a context meter and cost.
- Chat: starter list, the quick actions (3.5) as a 2x2 grid above the composer when empty; the composer
  pinned at the bottom with one combined model/reasoning/context chip.
- Project: an accordion (Instructions open), a sticky footer with "Save checkpoint" and "Ask Molfar".
- No horizontal scroll at 390 px; the token/cost text never clips (variant A's phone strip clipped it).
Fixes on the way:
- `MolfarAvatar`: when the image fails (engine offline), show a styled fallback (initial on the avatar's
  colors), never the alt text over the circle (seen 2026-10-11).
Checks: `browser-check` skill, dark and light, 1440, 1024 and 390 px; screenshots for the user.

## 2. Tools (the old handoff's four, still open)
Each: its small-model group (`src/agent/small-window.ts` GROUP_OF + compact description), plan-mode
behavior (`WRITE_TOOLS` in `src/agent/tools.ts`), tests, a line in the prompt or a skill.
2.1 ★ `plugin_log {app?, plugin?, limit?}`: plugin `host.log` and guest console output reach only the
    engine log (`src/plugins/runtime.ts`, `printLogs`). Keep a per-user ring buffer (like `app_console` /
    `src/inspector.ts`) and read it back. Group: app. The root of the `plugin-silent-failure` skill.
2.2 ★ `app_request {app, method, path, body?}`: call the app's own plugin route in-process as the user
    (the `/v1/apps/<id>/<path>` path); writes count as app writes (checkpoint; protected paths do not
    cover data/). Group: app. Lets Molfar test the backend it just wrote.
2.3 ★ `model_try {model?, system?, messages, maxTokens?}`: one test generation through `svc.generate`
    with `source: "agent:try"` (the inspector shows it). Costs money: one ask card per request with the
    model and an estimate; cap maxTokens. Group: app or a new "try".
2.4 `web_fetch {url, maxBytes?}`: engine-side, `src/net-guard.ts` (public hosts only), honoring the
    sandbox internet switch (`readSandboxSettings(p.sandbox).internet`); HTML stripped to text, capped.
    Group: web (new), offered only when internet is on.
2.5 ★ `app_screenshot {app, path?, width?}`: the engine renders the app's page headless and returns the
    image to a vision model (text-only models get a short "cannot see images" result). Own apps only,
    after the user allows it once per chat. Check what the engine can run on Windows, Linux, Android
    (Android likely: not available, say so). The strongest check for UI work; the most expensive item.

## 3. Behavior and the chat
3.1 ★ **Run budget**: before a big task (a plan with many steps, or app src/ edits) Molfar estimates
    steps, tokens and cost and asks to go on; after the run the chat shows what it really took. Numbers
    from the inspector (`src/inspector.ts` usage) and `context-budget.ts`.
3.2 ★ **Skills chip** (queued since 0.9.1): the chat shows which skills Molfar loaded in this run and
    what each costs in tokens; a click opens the skill.
3.3 ★ **Plan first for big tasks**: when a task touches more than N files or an app's `src/`, Molfar
    shows a plan card ("changing 4 files: …") and waits for yes. Plan mode exists (`PLAN_MODE_PROMPT`,
    `WRITE_TOOLS`): switch it on by task size, not only by the user's toggle. N to be tuned (start 3).
3.4 ★ **Quick actions on a message**: on Molfar's replies: "shorter", "simpler", "apply", "undo these
    changes" (to the run's checkpoint). On the user's: edit, retry (exist).
3.5 ★ **Task templates**: slash commands with a small form, each loading its skill and asking 2-3 things
    through `ask_user`: `/card` (link or text -> card), `/lorebook`, `/preset`, `/fix` (with a screenshot),
    `/skill`. `SlashCommands.tsx` and `QuickActions.tsx` exist: extend them. The empty chat's starter
    cards and the phone's quick-action grid show the same templates.
3.6 ★ **Memory you can see working**: when a reply relies on a memory note, Molfar marks it ("from
    memory: replies in Ukrainian") with a link to the note, so a stale note is easy to fix. Needs
    `memory_search` hits and the memory section to be traceable in the reply (a tag in the tool result
    the UI can render).
3.7 **Skills that learn**: when Molfar does the same kind of job a third time (by skill-less runs with
    similar first requests, or the user saying "again"), it proposes a skill from it (`skill_propose`
    exists, confirmed by the user as today). Needs a light history of past run summaries per project.

## Order (suggested)
1. Tools 2.1-2.4 (small, a handoff-ready spec) + 3.2 skills chip + 3.1 run budget.
2. The page: section 1 (A + C pane + C phone), with 3.4 quick actions, 3.5 templates, 3.3 plan-first
   and 3.6 memory marks built into it.
3. 3.7 skills that learn; 2.5 app_screenshot last.
Release notes per part; each part on its own `claude/molfar-*` branch from main.

## The drawer (kept, not scheduled)
- "What I changed" report card after each run (files, diff, roll back to the checkpoint).
- Auto-compaction with an explanation at ~70 % of the window.
- Read cache: an unchanged file read again in the same chat returns "unchanged, ~N lines".
- Import files into a project (PDF, DOCX, EPUB -> text in `.project/files`), tied to the Data Bank's
  "document -> entries".
- A sandbox copy ("try it on a copy"): Molfar changes a branch of the app, the user merges or drops it.
- A screenshot as input with a paste-from-clipboard path (vision models already read images).
- Voice input on phones (Web Speech API).
- A periodic memory review that offers to merge duplicates and drop stale notes.
- Later still: tests run after each change (apps with `test/`), a cheaper model for routine steps,
  image generation as a tool, an action log page, "continue the run" after a reconnect, a clearer split
  of project memory vs memory about the user, a skill catalog in the Store.
