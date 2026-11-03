# Molfar, your agent

Molfar is the AI agent built into Molfar Vertep. Everything here is plain files, and he edits those files for you. Read this page if you want to change something about your apps and do not want to do it by hand.

## Where he lives

Open the "Molfar" row on the start page. He gets his own tab, the agent page. Write in the box and press Enter to send (on a phone, Enter makes a new line and the arrow button sends). Type `/` for commands and templates, or `@` to name a file, character, lorebook or preset so he looks at exactly that one.

With an app open, "Split" puts Molfar on the left and the app live on the right, so you watch it change while you ask. On a phone he is just another tab.

## What he can do

- Change an app: its screens, behavior, colors, layout.
- Create a new app from a starter, then build it out with you.
- Edit data inside apps, for example character cards and lorebooks, even very large ones.
- Add plugins and change themes.
- Generate pictures with the image models you set up.
- Keep notes, and propose memory entries and skills.
- If you are the administrator, help with accounts and server settings. Each such change waits for your approval.

He looks before he changes, works in small steps, checks his work, and finishes with a short report of what changed and how to undo it.

## What he asks first

- **Big or unclear requests.** For a new app or a large feature he asks a few questions with options first.
- **Protected files.** By default an app's source files and its main page are protected, and so are his own standing instructions and the model parameters file. A card asks "Allow" or "Don't allow", and the answer covers that one request only. You edit the list in Settings, Molfar.
- **Cost.** Before a big task, a paid test generation or a paid picture, he shows an estimate and waits for your yes. Change this in Settings, Molfar, Cost checks.
- **Shell commands.** Depending on the mode, below.

## Mode

The mode picker in the header decides what he may do without asking:

- **Full** plans big changes first, then edits and runs commands.
- **Accept** skips the plan step and asks before each shell command.
- **Plan** only reads and plans, and changes nothing. After a plan, "Apply proposal" leaves the mode and carries it out.

## How to undo

Under a reply that changed an app you see "Changed <app> · N files · Undo". Undo asks first, then puts the app's code back as it was before that run. Your chats and uploads stay. An app's project page also has Checkpoints: saved points of the app's code, which Molfar takes before he changes the app. You can add your own with "Save checkpoint", and Restore asks first. Every restore is itself saved, so it can be undone.

## Memory and skills

The brain button opens "Memory and skills". Memory holds what he keeps between chats; he proposes entries and saves one only when you agree. Skills are short instructions for a kind of job; "New skill" writes one and "Improve with Molfar" refines it. See [[projects-and-chats]] for the project-specific ones.

## Good to know

- Small or free models: "Small-model mode" in Settings, Molfar sends a shorter prompt.
- The eye button, the prompt inspector, shows what the model was really sent.
- Long chats can be folded into a summary with "Compact conversation" or `/compact`.
- Words used here are explained in [[glossary]].
