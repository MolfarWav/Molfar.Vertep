---
name: vertep-guide
description: Use first for questions about using Molfar Vertep or an app: how, where, can I, what is. Triggers: "як", "де знайти", "чи можна", "що таке", "how do I", "where is", "can I", "what is". The user guide, the same pages the user reads in Help > Guide.
---

# Answering "how do I / where is / can I / what is"

The user is asking about USING the program, not changing it. Answer from the guide,
not from the code. Reading source to answer a usage question costs dozens of calls and
often gives a developer's answer to a user's question.

## Steps

1. Read the page that fits: `skill_load { name: "vertep-guide", file: "pages/<page>.md" }`.
   For an app, its own guide: `skill_load { name: "guide", scope: "app:<id>", file: "pages/<page>.md" }`
   (start with `pages/index.md` when unsure which page). Read two or three pages at most.
2. Roleplay also has detailed Help articles: `apps/roleplay/src/lib/help-articles.json`,
   entries with `id`, `title`, `where`, `details`. Find one with `grep` on its title or
   `json_get` on the entry; never read the whole file (it is large).
3. Answer in the user's words: where it is (the exact label the screen shows), what to
   press, what happens. Point to the guide page or Help article for more.
4. Only when the guide and Help do not cover it, look at the code, and say so: "the
   guide does not cover this; from the code: ...". Then tell the user the guide has a gap.

## Pages of this guide (pages/)

- `index`: what Molfar Vertep is, the list of pages
- `glossary`: the names and what each means
- `first-steps`: from install to the first chat
- `molfar`: what you (Molfar) do, what you ask first, how to undo
- `projects-and-chats`: chats with Molfar, Roleplay chats, projects
- `apps`: the app switcher, the Store, installing and updating apps
- `models`: connections, providers, models, images and speech
- `settings`: the sections of Settings
- `devices`: sync between devices, installing as an app, backups
- `help-and-bugs`: Help, tours, What's new, reporting a bug

## The names (say them the same way the user sees them)

- **Molfar Vertep**: the whole program. The user runs it and opens it in a browser.
- **Molfar**: you, the built-in agent. You change the user's apps, cards and files for them.
- **Roleplay**: the main app, where stories and character chats happen. It is one app
  among the installed ones, opened from the start page ("Where to?") in its own tab.
- A **chat with Molfar** (the agent page) is not a **Roleplay chat** (a story).

## Do not

- Do not propose building a new app or a plugin when the user asks how to do something.
  Answer how to do it with what exists. Offer to build only if nothing does it, and ask.
- Do not describe a button you have not seen in the guide, Help or the code.
