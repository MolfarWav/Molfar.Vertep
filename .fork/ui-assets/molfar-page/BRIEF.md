# Molfar's page: redesign variants (brief, 2026-10-11)

Molfar is the built-in AI agent of Molfar Vertep (a local engine; the user builds and changes apps,
characters and roleplay tools by talking to Molfar). Its page is `client-agent/` (React 19, Tailwind v4,
shadcn-style components, Phosphor icons, dark and light themes). Two screens need a better design, each
for desktop (1440x900) and phone (390x844): **the chat window** and **the project page**.

Static mockups only: self-contained HTML (inline CSS, no external scripts; Google Fonts allowed), not
app code. Each variant is ONE file with four labeled frames: Desktop chat, Desktop project, Phone chat,
Phone project (phones as 390x844 device frames side by side). Dark theme first; a light toggle on the
page is a plus. Use realistic content (below), Ukrainian chat titles as in the real app.

## What is there today (keep every function, rearrange freely)
**Left sidebar**: Molfar avatar + name; New chat; Search chats; PROJECTS (each a folder with a badge:
`app` for an app project like "Roleplay", `free` for free projects like "Test", "UI Changes"; chats nested
under each, a "⋯" menu per chat); CHATS (chats without a project).
**Chat header**: sidebar toggle; breadcrumb `UI Changes / <chat title>`; connection state ("Reconnecting");
search; the prompt inspector button (shows exactly what the model received, with sources); settings.
A red banner "Connection lost. Is the engine running?" with Dismiss.
**Empty chat**: Molfar avatar, "How can I help you today?", "Recent chats" chips.
**Composer**: project chip (`UI Changes`); text area; + (quick actions / slash commands); attach file;
model picker ("NanoGPT muse-spark-1.3-contri…"); reasoning level ("High"); context mode ("Full");
token use and cost ("69.4k tok · $0.0050"); compact-context button; send.
In a running chat: messages, tool calls as collapsible rows, ask_user cards with options, permission
cards (protected paths), checkpoints.
**Project page** (`Projects / Roleplay  apps/roleplay`): title + "A project is the app's folder: what you
put here reaches every chat started in it." Cards: **Instructions** (AGENTS.md preview, "edit", "show all");
**Files** (drop zone, "0 files, 0 B"); **Checkpoints** ("the app's code, not its data"; label input + Save
checkpoint; empty text); **Chats in this project** (list with dates). Right column: **Default model**
("new chats start with it", select "User default"); **Memory** (`.memory/MEMORY.md`, bullet notes);
**Skills** (chips: card-craft, card-import, edit-large-card, lorebook-craft, preset-craft, app-authoring,
finish-change, two-phase-llm, …; ".skills/ + global"); note "The project goes with the app when the app
is exported."

## What the user asked (2026-10-11, screenshots)
- The composer must be **much wider** on desktop: the empty chat wastes the screen.
- The header's right side: "maybe something is worth adding there". Ideas to weigh (pick, don't cram):
  a context meter (tokens used of the model's window), the active model, quick buttons for the project's
  memory / skills / instructions, the inspector, checkpoints, the project's app ("open Roleplay").
- The page should feel like one product with the Roleplay app and the shell (dark, a little warm,
  readable; the approved shell style is `.fork/ui-assets/2026-10-01_ui-style-c-mock-v4.html` with the
  ornament SVGs in `.fork/ui-assets/ornament/`: use them as taste, not as a rule).
- Phones: the sidebar becomes a drawer or a bottom bar; the composer stays thumb-friendly; the project
  page's cards stack or turn into tabs.

## Deliverables (per variant)
- `.fork/ui-assets/molfar-page/variant-<x>.html`
- Screenshots: `.fork/ui-assets/molfar-page/variant-<x>-{desktop-chat,desktop-project,phone-chat,phone-project}.png`
  (render the file with `playwright-core` driving the installed Chrome:
  `C:/Program Files/Google/Chrome/Application/chrome.exe`; install playwright-core in a scratch folder,
  never globally; no `playwright install`).
- A short note at the top of the HTML: the idea in 3-5 lines, what moved where and why.
