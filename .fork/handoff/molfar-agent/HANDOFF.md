# Handoff: Molfar, the agent: new page and new abilities

Written 2026-10-11 from the user's decisions. A track of its own, separate from the Roleplay versions
(0.9.8 is the card editor): it ships as engine releases when parts are ready. Read `CLAUDE.md` and
`.fork/STATE.md` first. To keep parallel work from colliding on push, this track writes its progress
HERE (and in its own commits), not in STATE.md or START.md, until it is merged and released.
Everything is engine code (`src/agent/`, `client-agent/`), no Roleplay fork changes unless noted.
Supersedes `.fork/handoff/agent-tools/HANDOFF.md` (its four open tools are folded in below; delete that
file when this one ships).

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
