# Discord server: Molfar Vertep

Language policy: **English everywhere**: forums, rules, help, bugs. **One Ukrainian channel**,
`#загальний`, for casual chat. SFW only for now (an age-restricted category can come later).

## Built (2026-10-10)
- Profile: icon `client/public/icon-512.png`, description, traits. Community enabled
  (verified email, media filter for all members, safety alerts and Discord updates go to `#moderator-only`).
- Roles: Molfar (owner, shown separately), Moderator (manage messages, threads, timeout, kick),
  Contributor, Tester, Creator, Releases ping. `Українська` and `English` roles exist but are no
  longer needed under this policy: delete them.
- Channels:
  - top: `#welcome`, `#rules`, `#announcements` (read-only), `#moderator-only` (private)
  - 💬 Community / Спільнота: `#general`, `#загальний`, `#off-topic`, `#showcase`
  - 🛠 Help / Допомога: forums `help`, `bug-reports`, `ideas`
  - 🎭 Creations / Творчість: forums `characters`, `lorebooks`, `apps-and-skills`; text `#models`
  - 🧩 Plugins / Плагіни: forum `plugins`; text `#plugin-dev`
  - 🔧 Development / Розробка: `#dev-log` (read-only), `#dev-builds`, `#contributing`
  - 🔊 Voice / Голос: `Корчма / Tavern`

## Channel topics
- `#general`: General chat. Українською: #загальний.
- `#загальний`: Балачки українською. Питання й баги пишіть англійською у #help і #bug-reports, так їх побачать усі.
- `#off-topic`: Anything not about Molfar Vertep.
- `#showcase`: Screenshots and clips of what you built or what Molfar rebuilt for you.
- `#models`: Which models, providers and presets work well. Free and small-context models welcome.
- `#plugin-dev`: Writing plugins: the plugin API, questions, review requests.
- `#dev-builds`: Running the newest work (`Molfar-Vertep.bat dev`): what broke, what got better.
- `#contributing`: How to help: bugs, translations, code.
- `#dev-log`: Releases and commits from GitHub.

## Forum tags
- `help`: install, windows, android, models-providers, roleplay-app, molfar-agent, plugins, solved
- `bug-reports`: engine, roleplay, agent, android, plugin, confirmed, fixed
- `ideas`: engine, roleplay, molfar, plugins, planned, done
- `characters`: fantasy, sci-fi, horror, slice-of-life, group, original
- `lorebooks`: fantasy, sci-fi, modern, horror, world
- `apps-and-skills`: app, skill, theme, wip, stable
- `plugins`: roleplay, agent, ui, tools, beta, stable

Default reaction for every forum: 👍.

## Forum post guidelines
**help**
```
One question per post. Tell us what you did, what you expected and what happened instead.
Add your OS, Molfar Vertep version (release tag or `dev`), model and provider.
Never post API keys or tokens, and check your screenshots and logs too.
Add the `solved` tag when it's solved.
```
**bug-reports**
```
One bug per post. Title: a short description of the bug.
Body: steps to reproduce, expected vs actual result, version (release tag or `dev`), OS, model and provider.
Attach logs or screenshots with keys removed.
Confirmed bugs get the `confirmed` tag and a GitHub issue; `fixed` means the fix is released.
```
**ideas**
```
One idea per post. Start with the problem you have, then your idea for solving it.
Vote with 👍. `planned` means it's on the list; `done` means it shipped.
```
**characters**
```
One card per post: name, a short description, tags and the card file.
SFW only. Credit the card's author and the artist, and share only what you have the right to share.
```
**lorebooks**
```
One lorebook or world per post: what it covers, how many entries, which cards it fits, and the file.
SFW only. Credit the authors.
```
**apps-and-skills** and **plugins**
```
One post per app, skill or plugin: what it does, a link or file, the version and how to install it.
When you release a new version, edit the post instead of starting a new one.
```

## Texts

### #welcome
```
**Molfar Vertep**: a roleplay frontend that lives on your machine, with an agent inside who rebuilds it when you ask.

Cards, personas, lorebooks, group scenes, and Molfar, an old Carpathian sorcerer who edits the app itself. Say "move this button", "add a dice roll" or "make the chat read like a book": he changes the files, and the screen rebuilds a few seconds later.

🔗 GitHub: https://github.com/MolfarWav/Molfar.Vertep
📦 Releases: https://github.com/MolfarWav/Molfar.Vertep/releases
❓ Stuck? Ask in #help, one post per question.
🐞 Found a bug? Post it in #bug-reports.
💡 Ideas go to #ideas.
🎭 Share characters and worlds in #characters and #lorebooks, and plugins in #plugins.

The project is young and changes almost every day, so expect bugs. Reports are gold.

🇺🇦 Українською можна побалакати в #загальний. Решта сервера англійською, щоб нас розуміли всі.
```

### #rules
```
**Rules**

1. Be kind. No harassment, hate speech or personal attacks.
2. SFW only, in every channel and in shared cards and lorebooks.
3. English everywhere except #загальний, our Ukrainian chat.
4. No spam, no unsolicited ads, no invites to other servers.
5. Never post API keys, tokens or personal data, not even in screenshots or logs.
6. Share only what you have the right to share, and credit the card authors and artists.
7. Questions and bugs go to the forums, one post per topic.
8. Follow Discord's Terms of Service and Community Guidelines.

Moderators may remove content and time out or remove members who break the rules.

🇺🇦 Коротко: будьте чемні, лише SFW, ніяких ключів у повідомленнях. Українською можна писати в #загальний, усюди інде англійською.
```

### #contributing
```
**Want to help?**
• Bugs: report them with steps to reproduce in #bug-reports or as GitHub issues.
• Translations: the interface ships in 14 languages, and fixes are welcome as pull requests.
• Testing: run `Molfar-Vertep.bat dev` to get the newest work, then talk about it in #dev-builds.
• Code: the project is openly vibe-coded. Pull requests made with AI agents are fine; just describe what you checked.
```

## Onboarding (Server settings → Адаптация)
- Default channels (Discord needs at least 7, 5 of them open for chat): welcome, rules,
  announcements, general, загальний, off-topic, showcase, help, bug-reports, ideas, Корчма / Tavern.
- Question 1, "What brings you here?" (several answers allowed; every answer needs a role or a channel):
  - I play roleplay → channels: characters, lorebooks, models
  - I make characters and worlds → role Creator; channels: characters, lorebooks, models
  - I build apps, skills or plugins → role Creator; channels: apps-and-skills, plugins, plugin-dev, contributing
  - I want to test dev builds → role Tester; channels: dev-builds, dev-log, contributing
- Question 2, "Get pinged about new releases?": Yes → Releases ping.

## Server Guide (Путеводитель по серверу)
Welcome message:
```
Welcome to Molfar Vertep! This is the place for help, bug reports, ideas and sharing characters, worlds and plugins. Read the rules, say hi, and ask anything in #help. Українською можна в #загальний.
```
New member tasks:
1. Read the rules → #rules
2. Say hi to everyone → #general
3. Ask your first question → #help
4. Show what you built → #showcase
5. Get the latest release → #announcements

Resource pages: Getting started → #welcome; Report a bug → #bug-reports; Share a character → #characters.

## AutoMod (Server settings → Автомод)
- Profile names filter: off.
- Block mention spam: limit 5 mentions.
- Block suspected spam content: on.
- Commonly flagged words: slurs and sexual content on; profanity off (too strict for roleplay, English-only anyway).
- Custom rule "Invite links": `discord.gg/*`, `discord.com/invite/*`.
- Every rule: block message + alert to `#moderator-only`; exempt roles Molfar and Moderator.
- Explicit media filter: all members.

## GitHub webhook (#dev-log)
1. #dev-log → Edit channel → Integrations → Webhooks → New webhook, name "GitHub", copy URL.
2. GitHub → MolfarWav/Molfar.Vertep → Settings → Webhooks → Add webhook:
   payload URL = the copied URL + `/github`, content type `application/json`,
   events: Releases, Issues, Pull requests (Pushes off: every push to `claude/*` branches would land there).
The URL is a secret: never paste it in chat, files or the repo.

## Later
- Age-restricted category `🔞 18+` (Discord's age-restricted flag + a role given by a moderator), with its own rules.
- A bot for role reactions or tickets only if Onboarding is not enough.
