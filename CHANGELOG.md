# Changelog

Molfar Vertep is a modified version of [Chrysalis Engine](https://github.com/ProjectChrysalis/Chrysalis-Engine)
(AGPL-3.0-only), maintained at [MolfarWav/Molfar.Vertep](https://github.com/MolfarWav/Molfar.Vertep).
Every change below was made in this fork; the upstream project's own history is in git.
Versions here count from 0.1.0 and are independent of upstream's.

## Unreleased

## 1.2.4 (2026-10-18)

- Custom connections (OpenAI-compatible) no longer fail every reply with "malformed server-sent event JSON" (#59). Since 1.2.2 the OpenAI library rejects any stream event that is not JSON; such connections now read the stream through a tolerant reader: `[DONE]` with trailing text ends the stream, several JSON lines in one event are split, and other non-JSON events are skipped and logged (`[custom-provider:<id>] skipped a stream event that is not JSON`). A plain-text error inside a successful stream now shows as an empty reply, with the log line saying why.
- Molfar takes a correction while he works (#70): during a run the message box keeps Stop and also sends (Enter, or the arrow beside Stop); Molfar reads the message at his next step and goes on with it. The message stays in the chat where it landed and in the history later runs see (`steers` on the run record). Text only: attaching waits until the run ends.
- Sync: "Replace the sync with this device" (#45), for a device that does not want what the sync holds. It sits under the "Pull first" notice, behind a confirmation; the sync then holds exactly this device's files (the keys too), and the other devices drop what only the sync had on their next pull (`POST /v1/sync/push {replace: true}`).
- Roleplay 4.52.0 through app updates: the inbox (#55), Consolidate facts (#51) and recency in the story record (#50) in Litopys, previews that hide what the chat hides (#44), plain section names in the Molfar preset (#42).

## 1.2.3 (2026-10-18)

- Molfar's chat takes files besides pictures: text, Markdown, JSON, CSV and other text formats, plus Word and OpenDocument documents (their text). A file is saved under `uploads/<day>/` in the workspace (outside git, kept by backups, read-only for the agent), and the message names it as `@uploads/...`, so the existing mention reader puts it in (64 KB cap, a big JSON as its outline). Notepad's UTF-16 is converted; other encodings and PDFs are refused with the reason on the file's tile (`PUT /v1/agent/uploads/:name`, shell-only). Mentions now take names in any script.
- Files Molfar names in a reply open with a click: a markdown link or an inline workspace path opens `GET /v1/agent/file` (shell-only: what the agent may read, never `.git` or `auth.json`, nothing that leaves the workspace through a link, up to 20 MB; html, svg and scripts are served as plain text under a sandbox policy), with a download icon beside it. Molfar is told to link the files it makes.
- ComfyUI (Settings > Images): a workflow from Export (API) works as it is. Saving it puts `%prompt%`, `%negative_prompt%`, `%seed%`, `%width%`, `%height%` and `%model%` in their places; "Import workflow file…" and "Take the settings from this workflow" also move its steps, CFG, sampler, scheduler, denoise, clip skip and LoRAs into the form (`POST /v1/images/workflow/adapt`, shell-only). The editor's format is refused with how to export the API one.
- OAuth sign-ins (Anthropic and others) no longer break after a refresh: refreshes of one file are queued, and a refresh that changes nothing keeps the stored sign-in instead of deleting it (inferred cause of "invalid_grant" on model checks). The error now says to sign in again under Settings > Connections.
- `Molfar-Vertep.bat` opens a start menu (#65): numbered keys: 1 Start, 2 start without updating, 3 Update, 4 Dev branch, 5 Previous release, 6 Check the setup, 7 Reinstall, 0 Quit; it starts by itself after 10 seconds, and any argument skips it. In a console at least 101 columns wide it shows the star and the name in colour (`scripts/logo.ans`), with the menu beside them; the launcher's messages are coloured by kind (a step, done, a note, a failure).
- The program's new name, step 1 (#66): updates and rollbacks accept `molfar-vertep[.exe]` next to `chrysalis[.exe]`, the command `molfar-vertep` works next to `chrysalis`, and settings read `MOLFAR_VERTEP_*` before `CHRYSALIS_*`. Releases still ship `chrysalis[.exe]`.
- Roleplay 4.51.0 through app updates: the Dashboard no longer shows an earlier persona of the chat as an NPC, and the card Profile can describe several characters.

## 1.2.2 (2026-10-18)

- pi-ai and pi-agent-core 0.85.1 -> 1.2.0, pinned to the exact version (no range: pi breaks its API in minor releases). The built-in catalogs grow from 1227 to 1554 chat models. The agent keeps sending one system prompt with only the visible tools (the library now carries both inside the transcript); image models moved into the main registry. Models the old catalog had and the new one drops (Moonshot's Kimi K2 ids, DeepSeek's `deepseek-v4-flash`, six Z.AI Coding CN models, some OpenCode ids) are no longer offered; a chat set to one asks for another model (#60).
- Anthropic's newest models now come from the library's catalog instead of the engine's copies of older siblings (`src/model-additions.ts` is gone). The copies sent settings those models refuse (inferred cause of the HTTP 400 seen on them through OAuth).
- OpenRouter, DeepSeek and Moonshot add the models their live `/models` lists and the bundled catalog does not know yet (`src/providers/live-catalog.ts`); the catalog stays the source for every model it knows. OpenRouter's list quotes windows and prices; the others leave the window unknown.
- A connection whose model list fails (its `/models` refused, timed out or moved) is now logged with the reason (`[models] <id>: model list failed: ...`); it used to be dropped silently.
- Settings > Connections: typing a second character into a manual model id no longer turns the whole app black (#59).
- The `azure-openai-responses` provider is now `azure`; connections and stored keys move on first start.
- Going back to the version before the last update (`src/rollback.ts`), on a computer: `chrysalis rollback` (a downloaded copy; on Windows also `Restore-previous-version.cmd` next to the program) and `Molfar-Vertep.bat previous` (from source: the release tag before the one checked out). A downloaded copy now keeps the program it replaced (`*.old`) until the next update instead of deleting it after the first healthy start. Every change of version copies the engine's account files (`users.json`, `sessions.json`, `format.json`, `credentials/`) to `data/.update-snapshot` before migrating, kept until the next change of version; a rollback puts them back only when the newer version moved the data format, so sign-ins and accounts changed since stay. Workspaces are git and never touched. The first rollback-ready update is the one from 1.2.2 on; the Android app and apps are not covered yet.

## 1.2.1 (2026-10-18)

- Molfar draws pictures (#54): a new agent tool, `image_generate`, lists the user's image models (the same list as `GET /v1/images/models`), draws one picture through the same backends as `POST /v1/images`, keeps it in the asset store and returns `/v1/assets/<id>`, which Molfar writes into a card's avatar, a gallery or a background. A paid model asks the user before each picture; ComfyUI and AUTOMATIC1111/Forge draw without asking. Not offered in plan mode; its own `image` group in small-window mode. The Roleplay card skill (`edit-large-card`) says where the URL goes.
- Molfar's chat shows each picture it draws under the drawing step (click opens it full size); a failed draw shows as a failed step.
- Settings > Images: your own list of image models (`images.json` `favorites`: ref, name, what it is for), starred from a searchable model list under each connection and server. The first is the default for a call that names no model (before: the first listed); without a list a local ComfyUI/Forge model comes first. Molfar picks from the list by each model's use; `GET /v1/images/models` returns it for apps; `PUT /v1/images/favorites` is shell-only.
- Settings > Images: ComfyUI and Forge servers get the sampling settings Marinara has, and every server can be edited: prompt prefix, sampler and scheduler (picked from the server's own lists, `GET /v1/images/endpoints/:id/options`, shell-only), a fixed seed, denoise (ComfyUI), clip skip, up to five LoRAs with strength, a prompt style (Danbooru tags or a description) and prompt guidance. The built-in ComfyUI workflow chains the LoRAs and a CLIP skip; your own workflow gets `%sampler%`, `%scheduler%`, `%denoise%`, `%clip_skip%`, `%LORA_1%`…`%LORA_5%` and `%LORA_1_strength%`… (an empty slot reads `None`, as rgthree's Lora Loader Stack expects). Forge gets the LoRAs as `<lora:name:strength>` in the prompt. `GET /v1/images/models` returns each server model's style and guidance; Molfar's model list shows them and Roleplay 4.50.0 follows them.
- Roleplay 4.50.0 (#53): a Prompt style setting for image generation, Danbooru tags for tag-trained checkpoints on ComfyUI and Forge; the image model picker lists the user's image models first.

## 1.2.0 (2026-10-17)

- Image generation beyond OpenRouter (`src/images.ts`): NanoGPT (the existing NanoGPT key, its public image catalog with prices) and your own image servers in a new Settings > Images tab: a local ComfyUI (a built-in text-to-image workflow or your own API-format workflow with placeholders), AUTOMATIC1111/Forge, or any OpenAI-compatible `/images/generations`. Their models join `GET /v1/images/models`, so apps such as Roleplay offer them unchanged. Keys live in `auth.json` bound to the server's address; servers may be on this computer or the LAN, never link-local; redirects are not followed; failures come back in plain words with a fitting status instead of a raw 500.
- Plugins: `host.fs.stat(path)` and `host.fs.stat([paths])` give size, change time and a folder flag without reading files (a list in one call), inside the same jail as `fs.read`; apps get a local cache folder `apps/<app>/data/.cache/` kept out of git, backups and sync. Roleplay 4.49.0 builds its character index there and starts with 2,000 characters in about 2 s (#46).

## 1.1.1 (2026-10-16)

- Sync: a Google Drive sync folder in the trash stops check, push and pull with a clear message; Drive takes uploads into a trashed folder, so a push used to land in the trash and report success (#45).
- Sync: the error of a refused push stays on screen (the status check after a push cleared it), and a device that never synced reads "This sync already holds X's files" instead of "X pushed since this device last synced" (#45).

## 1.1.0 (2026-10-16)

- Sync between devices (`src/sync/`, #38): Settings → Sync and "Sync devices" in the account menu. Push and pull like git, by hand: a three-way compare against each device's last sync, content-addressed blobs, only changed files travel, deletions too; files changed on both sides are listed with keep mine / take Drive's, and the version not kept goes to `data/backups/sync-conflicts/`. Stores: Google Drive (`drive.file` scope, a built-in Desktop OAuth client, your own client in Settings) and a folder on this computer. Keys travel only sealed with a passphrase (scrypt + AES-256-GCM, as the profile backup). Design: `.fork/handoff/sync/DESIGN.md`.
- Apps install on drives git does not trust (exFAT USB drives, folders another account owns): git commands the engine runs in a repository it made itself carry `-c safe.directory` for that folder only (#34).
- App frames may start workers from `blob:` URLs (`worker-src blob:`): Roleplay's display regex scripts run in one and were silently blocked, so blocks a preset hides stayed visible (#36).
- Plugins: `host.zip.build([{ name, text }])` packs a zip natively and returns it as base64, without a permission; Roleplay's export uses it (#37).

## 1.0.10 (2026-10-15)

- The in-app guide in the shell (`client/src/guide/`): What's new after an engine update, a first-run tour that starts with connecting a model, tours for the start page, an open app, Settings and the Store, and Help (account menu, start page footer) with a searchable list and Show me. Settings → General → Guide turns tours off or replays them.
- The same guide on Molfar's page (`client-agent/src/guide/`): Help in the header (sidebar on a phone), tours for a chat and a project page; it waits while the Molfar tab is hidden.
- The guide's state is the `guide` key of `/v1/settings`, validated by `src/guide-state.ts`; saving it does not evict agents. Both frames re-read it before a write, so neither drops the other's ids.
- The launcher stops when Git refuses the folder ("dubious ownership") and offers to add that one folder to `safe.directory`; any other Git error stops it too. README notes for the launcher and from source (#33).
- App and plugin imports retry removing a held staging folder, move it aside, or answer 409 naming the folder (`src/clear-dir.ts`), instead of a raw EPERM (#34).
- The built-in `app-authoring` skill: a feature Molfar builds in an app with a guide gets a tip.
- The Roleplay app 4.47.0: the help list with Show me and tours for the chat menu, Dashboard, Soul, Library, Characters, Groups, Lorebooks and Presets.

## 1.0.9 (2026-10-15)

- Molfar fixes a reported bug: "Ask Molfar first" in the bug dialog opens a chat with the report and the `fix-bug` skill; the `bug_solution` card opens a pre-filled GitHub solution form with the app's code since the checkpoint as a patch (`GET /v1/agent/bug-patch`), or the ordinary report when it was not fixed.
- A restored official app checks itself against its repository on both update checks and becomes official again when the code matches; changed code gets "Check needed" with a confirmed exact "Replace with official version", a failed check gets "Check again".
- App storage over the bridge: unchanged writes are not sent, each write is acknowledged or refused with a reason (`window.chrysalisStorage.unsaved()`, `chrysalis:storage`), and a reloaded frame takes the shell's newer copy (Discord tracker BUG-011/013/014, #25, #27, #28).
- An unchanged build records its revision (`POST /v1/apps/:id/build/ack`, shell only), so an edit no module reads no longer causes a full build and reload on the next open (BUG-018, #32).
- The app page header fits a 390 px screen.
- The Roleplay app 4.46.0: What's new and short tours, safer drafts (Write for me bound to its chat and draft, failed sends restored, an unsaved-draft line), a two-row phone composer, number fields without a stuck 0, the context ring on the model's window, Structure it on long cards, faster Dashboard and Litopys ranking (#21-#23, #29, #30).

## 1.0.8 (2026-10-14)

- Anthropic connections list Claude Opus 5.5, Sonnet 5.5 and Haiku 5.5. The bundled pi-ai catalog stops at Opus 5 and Sonnet 5; the engine adds the newer models as copies of their closest sibling with their own limits and prices (`src/model-additions.ts`) until the pi-ai 1.x upgrade.
- Visible names say Molfar Vertep: the network name example in Settings, the profile download (`molfar-vertep-<user>-<date>.zip`) and the git URL examples.
- The Roleplay app 4.44.0: the Canvas Prompt board (every part of a chat's request with its tokens, per-chat switches, the history filter; switched-off Litopys, Dashboard and lorebooks do no work), and the Chat links board filled one chat at a time from a list.
- The Roleplay app 4.45.0: quick moves (Continue, Write for me, Another) and the big editor under a long draft, a half-screen big editor, compact phone pages for Characters and Lorebooks, a clearer empty Library, readable group dialogue colours on light themes, five more Dashboard events.

## 1.0.7 (2026-10-14)

- Apps: a message being typed is no longer wiped when the app reloads itself (a new build of the app landed, or the engine restarted). An app frame's storage now survives its own reload; before, every write since the frame opened was lost (GitHub #18).
- Custom OpenAI-compatible connections send the output limit as `max_tokens`. Chub's endpoints ignored the field the library sent and cut every reply near 500 tokens (GitHub #19). `api.openai.com` keeps `max_completion_tokens`.
- Apps can ask whether a chat's reply is still being written (`GET /v1/apps/<app>/__generating?chatId=`): Roleplay 4.43.0 uses it to keep a reply across a reload (GitHub #13).
- An app request may carry 8 MB instead of 1 MB (GitHub #17).
- The Roleplay app 4.43.0: a texting scene stays in the Dashboard (#16), a reply survives a reload (#13), a full-width message box for long drafts (#20), dice rolls with a reason and difficulty (#14), gallery images in the asset store (#17).

## 1.0.6 (2026-10-13)

- The Roleplay app 4.41.1: a card edited outside the app (by Molfar, a script or by hand) no longer takes the app down with only "Script error" on screen; a page that still fails to draw shows what went wrong, with "Copy details" and "Try again"; on Chrome and Brave for Android the lower part of sheets and menus scrolls by touch again while an expression sprite is shown.
- Windows: Update now no longer fails with a "Can't set time" warning for every file. The downloaded zip is unpacked by Molfar Vertep itself instead of Windows' tar.exe.
- "Report a bug" in the account menu (also inside apps) and the Apps page footer: describe the problem, add the device and browser, take a screenshot on desktop, then open a pre-filled GitHub issue or copy the text for Discord. Versions, screen, language and the last errors the shell and apps caught go with it. Nothing is sent by the engine. The GitHub bug form is rewritten to match and links our Discord.
- App errors in live editing now show their real message ("TypeError: … is not a function") instead of a bare "Script error.": the app's scripts load in CORS mode inside the sandboxed frame.
- Molfar can undo its own edit of an app's data file (a card, a lorebook, settings): checkpoint restore takes the data files to put back, one by one, after you confirm. Chats and saves written since stay. Before, a restore only put back code and answered "nothing to restore" after a card edit.

## 1.0.5 (2026-10-13)

- The Roleplay app 4.41.0 (its own CHANGELOG has the details): a new phone chat header (portrait, scrolling name, a context ring, one Menu button) and a side menu; tab rows on phones show the hidden tabs; chats scroll by touch again on Chrome and Brave for Android; a reply is recovered after the phone locked or switched apps; moving dots while the model writes; swipes keep their own text after Stop; the dashboard skips empty replies; "Save as my default" for preset choices; "Regenerate with a hint"; translation per card field and per lorebook; replies shown as they are written or only when finished.
- Browser check: the mock model can wait before answering and stream a reply word by word.

## 1.0.4 (2026-10-12)

- The Roleplay app 4.40.0 (its own CHANGELOG has the details): a group chat has its own turn settings on top of the group's defaults (a Turns button above the chat, and the generation mode in the new-chat step), so one group can be played by a narrator in one chat and turn by turn in another; "Only the member you pick" gets a "Who answers?" row above the message box; self responses and auto mode get plain names and a line of help; a narrator group left on manual answers again.

## 1.0.3 (2026-10-12)

- The small fixes from the UX audit. Shell: deleting a connection asks first; desktop Settings has a close button; a connection's status dot carries a word; the models counter reads "N shown · M available" and "Show every model" is a checkbox; a hint says what the star and sliders do; "Add connection" is the primary button; the New app dialog has labels and says why Create is off; the theme menu shows a swatch per theme; an app's delete button is a 40 px trash icon on phones.
- Agent page: the mode switch reads "Mode: Full" and each mode says what it allows; chats in the list show their time; "Continue" sits on its own row above the templates; the context shows once ("context 5k of 32k · 16%"); "Apply" is "Apply proposal"; template titles wrap on phones; the phone header names its icons.
- The Roleplay app 4.39.0 (its own CHANGELOG has the details): the Chats panel opens the cards, group, persona, preset and lorebooks it names, and the audit's small fixes across the app.

## 1.0.2 (2026-10-12)

- Molfar: `ux-review` is a built-in skill. When Molfar builds or changes an app or a plugin, it checks that a user can find, understand and use the new UI on desktop and on a phone; `app-authoring` and `finish-change` point to it. The `edit-large-card` card skill writes profile fields and lets the Roleplay app compile the card's text.
- The Roleplay app 4.37.0 and 4.38.0 (their own CHANGELOG has the details): groups get their own colour and generate their own scenario and openings; the Chats page becomes a list grouped by time with a panel for the picked chat, and chats can be pinned; FRANKENX's prose language is a pick of 14 languages; group members differ in how much they talk.

## 1.0.1 (2026-10-12)

- Connections: an OpenAI-compatible connection to a local server (llama.cpp, vLLM, LM Studio) can say its models think. The engine then sends `enable_thinking`, so a preset's reasoning level turns thinking on and Off really turns it off. Before, such a model got no thinking setting at all and could think through its whole reply limit.
- The Roleplay app 4.36.0 (its own CHANGELOG has the details): the relationship dashboard follows the chat preset's thinking settings and no longer comes back empty on thinking models; importing many cards no longer rates each one with a model call; a bigger event vocabulary.

## 1.0.0 (2026-10-12)

- Group chats, through the Roleplay app 4.35.0 (its own CHANGELOG has the details): a group has its own card and editor, a narrator mode voices every member in one reply, each member's dialogue takes its own colour. The engine itself is the same as 0.9.11.

## 0.9.11 (2026-10-11)

- Molfar runs the model its picker shows when you never picked one: it used to show the first model you ticked in Settings > Models but run the first of the whole catalog, which on OpenRouter is the `~anthropic/claude-fable-latest` alias, and bill it.

## 0.9.10 (2026-10-11)

- Molfar never swaps the model you picked: when the picked model (or a project or default one) is not in the engine's list, the request now fails with "The model … is not available" (HTTP 503) instead of quietly running on the next default or the alphabetically first model, which billed one player for a Claude model while Kimi K2.5 was selected. The live model catalogs refresh before the pick.
- Custom OpenAI-compatible connections keep a reply whose stream ends without a `finish_reason` (Chub's Soji did this); it used to vanish halfway with "Stream ended without finish_reason". A `finish_reason` that comes is still read.

## 0.9.9 (2026-10-11)

- Roleplay 4.34.0 through app updates: each tool's settings live with it. Litopys settings (on/off, chapter and arc prompts) open from a gear in the Library, and Settings > Memory points there; the dashboard's own settings gain the note age and the soul, nudge and fast prompts, and a gear before the first build; the Litopys and dashboard panels in Tools are gone. Every built-in prompt restores to its default on its own, including utility prompts in an editable preset copy. "Open dashboard" moves to the top of the strip, in the accent colour.
- README: a download button and the Discord link at the top, the card profile and Persona in "What's already inside", the "Work in progress" block removed.

## 0.9.8 (2026-10-11)

- Roleplay 4.33.0 through app updates: the character card split into fields (identity, appearance with measurements, personality, behaviors, goals, background, circles, trauma, relationships, an opt-in adult block, notes) that write Description and Personality; every section has an on/off switch (an off section keeps its fields and writes nothing); "Structure it" sorts the card's text into the fields, "Fill empty" proposes values for empty fields, "Read from picture" reads the appearance from the portrait or an attached picture, each as a draft to Accept with the old text in Versions; personas get the same form, "Five questions" and "Structure it"; Export offers PNG, CHARX and JSON; editor tabs have icons and groups.
- Vision model: Settings > Connections and models picks the model apps send pictures to (Auto = the cheapest shown model that reads pictures, by catalog price, or the user's choice; `GET /v1/models/vision`, `PUT` from Settings only). Plugin llm requests can carry up to 4 pictures; one with no `model` goes to the vision model, and a model that does not read pictures refuses the request instead of getting a placeholder.
- Molfar's page, redesigned: the sidebar folds to an icon rail; the header holds the model chip, a context meter (amber at 75 %, red at 90 %), the connection dot, inspector, search and memory; the project opens as a resizable pane beside the chat or a full-width page with tabs; on phones a Chat | Project switch and a strip with model, reasoning, context and cost.
- Molfar: task templates (`/card`, `/lorebook`, `/preset`, `/fix`, `/skill`) in the "/" menu and as starter cards in an empty chat; Shorter, Simpler and Apply under the last reply; chips under a reply for the skills it loaded (with their tokens) and the memory entries it looked up, each opening the panel; a per-reply line with steps, tokens and cost.
- Molfar: `run_budget` prices a big task (steps, tokens, cost, files) and asks Go on / Smaller / Stop; writes to an app's code or to more than 3 files wait for that answer (off in Accept and Plan modes).
- Molfar's new tools: `plugin_log` (the last 500 plugin log lines, failed routes and hooks), `app_request` (calls an app's own plugin route as the user, committed like a page's write), `model_try` (one test generation after an ask card with the price ceiling), `web_fetch` (public pages as text, only with the sandbox's internet switch on).
- Android: when the in-app update is stopped (Play Protect), the app offers the download in the browser.
- `ask-model` skill: a repo copy for the laptop and cloud sessions; retries a request when the connection drops.

## 0.9.7 (2026-10-11)

- Roleplay 4.32.0 through app updates: Prompt peek shows where every part of the next request comes from (card fields, persona, preset sections, lorebook entries with why they fired, Data Bank, history with the regex scripts that changed it), what was left out and why, and the preset's choices; sends stay fast with big lorebooks (a 1000-entry book ran past the plugin time limit, now 0.6 s on a desktop) and with many preset regex scripts; counts take the right word form.
- Prompt inspector with sources: a request shows a table of its parts by kind with tokens and share, colored marks in the text (a click scrolls to the part), what the app left out and the preset's choices. Apps label their parts with a host-only `promptSources` beside an llm request (never sent to the model; documented in the `app-authoring` skill); whatever an `llmRequest` hook adds is labeled with the plugin's name by comparing the request before and after it, for any app.
- Molfar's own requests are labeled too: the system prompt by section (rules, workspace layout, installed apps, each instruction doc, notes, memory, project, personal instructions), the history by role, and each tool definition's size. The prompt text is unchanged.
- The inspector keeps up to 200k characters of a system prompt and 50k of a message (was 20k), so late inserts can be shown; the leading system messages were listed twice in an entry and counted twice in its estimate.
- A failed app route names its method and path in the error the app shows (a phone timeout said only "route failed").

## 0.9.6 (2026-10-10)

- Roleplay 4.31.0 through app updates: presets offer options you pick for each chat (one or several, with the tokens each adds) and switches for whole blocks, in a Preset panel in the chat and a short step when a chat starts, remembered per character; switching the preset in a chat changes only that chat, with a muted line saying what changed; Marinara presets import with their options; FRANKENX 1.6 ships as a ready preset, adapted to the app.
- A Discord link beside GitHub at the bottom of the apps page.

## 0.9.5 (2026-10-10)

- Roleplay 4.30.0 through app updates: the chat header's model tab shows the temperature, max output, reasoning and thinking budget a reply is sent with, each marked as the model's, the preset's or the provider's default; a chat that continues a chain of earlier chats gets their stories as backstory (up to three back, one budget); the preset's context size and max output show the model's numbers when the model sets them; the app starts in the shell's language; the embeddings and backup settings point to the shell's Settings.
- `GET /v1/models/params/effective` takes the request side (temperature, max_tokens, reasoning, thinkingBudget, paramsSource) and answers the merged values with the source of each (`applied.from`), the same merge generation does.
- Apps can read the shell's language (`chrysalisShell.locale()`) and open Settings on the Connections, Models, Memory or Backup tab (`chrysalisShell.openSettingsTab(tab)`); trusted apps only.
- Molfar's page: a finished run no longer shows a "2 / 2" branch picker under your message (the live messages' ids were swapped for the saved ones, and the thread kept the old ones as a second branch).
- The recommended values for each parameter block name example models next to the kind of model they describe.

## 0.9.3 (2026-10-10)

- Roleplay 4.28.0 through app updates: the Marketplace has six storefronts (Chub, RisuRealm, CharaVault, Wyvern, Pygmalion, JannyAI) with their own filters, a "paste a card link" box, cards of any size up to 200 MB with their emotion images, translation of cards in the Marketplace and in the character editor (with "Restore original"), expression sprites that follow Ukrainian and Russian replies, and a floating sprite that folds and resizes.
- Apps can pull big files: `GET /v1/apps/:appId/file?url=` streams a remote file up to 200 MB with the image proxy's gate (https, default port, a host an app plugin declared with the network permission granted, every redirect re-checked), as opaque octet-stream. A plugin's own network answer is held in its sandbox (20 MB at most), too small for a card with an image pack.
- The app bridge hands a fetch answer over as bytes (a transferred ArrayBuffer) instead of base64 text, so a large download is not held three times; frames still read base64 from an older shell.
- The app image proxy takes images sent with no type or a generic one when their bytes are PNG, JPEG, GIF or WebP (RisuRealm's thumbnails showed as placeholders); anything else, SVG included, is still refused.

## 0.9.2 (2026-10-09)

- Models in one place: Settings' "API connections" and "Models" tabs are one tab, "Connections and models". One search over every model; under each connection its models, each with "show in the pickers", a star for the quick switch and its own settings.
- A model's settings: its context window and prices, and its parameters in blocks by who calls it: Chat (app replies and API callers: temperature, top P/K, min P, penalties, seed, max output, reasoning, thinking tags, custom parameters JSON, extra headers), Plugins (trackers, memory, translation: a short set), one plugin of your choice, and Molfar. A switched-off field is not sent. The model's values win over what a request carries unless the request asks otherwise (Roleplay's preset switch); stored in `model-params.json` (routes `GET/PUT /v1/models/params`, `GET /v1/models/params/effective`; credential and transport headers are refused; Molfar asks before writing the file). Each block has recommended values with a "fill in" button, and Molfar warns when a model's window is under 64k.
- Quick switch: starred models in your order, each with an optional name of its own (`model-favorites.json`, served with `GET /v1/models`, `PUT /v1/models/favorites`); Molfar's picker and the apps offer them first. Molfar's picker no longer has its own star for hiding models: that is chosen in Settings.
- Apps can open Settings on one model's panel (`chrysalisShell.openSettings(model)`, trusted apps).
- Roleplay 4.27.0 through app updates: models chosen in Settings and switched in the chat (a model per chat), the model's parameters first, chats that continue each other with the earlier story as backstory, Library portraits on the dashboard and in Soul, full-screen drawers.
- The add-connection screen shows a failed provider list with "Try again" instead of offering only the sign-ins (seen on Android).
- The reasoning level "min" from older presets now means "minimal" instead of switching reasoning off.

## 0.9.1 (2026-10-09)

- Roleplay 4.26.0 through app updates: four skills for Molfar (card-craft, card-import, lorebook-craft, preset-craft) built on one reference for card, lorebook and preset files (`docs/DATA-FORMATS.md`, kept current by a test), and the card's id with a copy button in the character editor.
- Molfar spends far fewer tokens and calls: the same card task went from 49 model calls and 1.5M input tokens (0.9.0) to 6–9 calls and 0.1–0.2M. How: `json_get` / `json_set` read and change single fields of a card or lorebook (missing objects are created, the file keeps its format, a JSON file is never left broken); `read_file` and an @-mention show a big JSON file (a card with its portrait) as its fields and sizes; `read_file` takes up to 8 paths and cuts files over 40k characters with a note; older steps and earlier tasks are folded to short notes before each call; the skills index lists app skills by name; app authoring moved into its skill and app tools appear when an app's code is touched; a busy provider (429, 5xx) is retried; sandbox traps that cost calls are gone (python3 follows `cd`, a `set -x` no longer leaks into later commands).
- Molfar's page: the "/" menu scrolls and groups commands and skills, searching their descriptions too; "@" finds characters, lorebooks and presets by name; quick-action chips above the composer start a card, lorebook, preset or import job with its skill; the chat column is wider (56rem); a new chat keeps the composer at the bottom; on a phone the model name has a row of its own; reasoning and tool calls start folded to one line that names the live step.
- Android: the APK is signed with the project's own key, so updates install over the app with its data kept (installs from 0.9.0 and earlier need one reinstall: back up, uninstall, install, restore). "Get update" downloads the APK itself, checks its size, hash, package and key, and hands it to Android's installer; a different key gets a plain explanation instead of "App not installed".
- Android: bash and the file tools work: the workspace guard compared real paths with a root reached through `/data/user/0`, so every file looked outside the workspace and the sandbox stayed empty.
- A profile restored from a backup installs its apps' packages at once (a backup carries no node_modules; Roleplay failed to build until a restart).
- An app update no longer fails with ENOENT on `dist.discard-…`: the old build is moved out of the app before it is deleted, and leftover aside folders are skipped by updates, backups and git.
- Release archives are named `Molfar-Vertep-<version>-<system>` (they were `Chrysalis-*` up to 0.9.0); self-update finds both, so older copies still update.
- README rewritten for people new to the project, with screenshots, GIFs of Molfar rebuilding the app, a pixel Molfar, a work-in-progress and vibe-coding note, what Molfar's skills, projects and memory are for, and Ukrainian and Russian translations (`README.uk.md`, `README.ru.md`); a social preview banner in `.github/assets/`.

## 0.9.0 (2026-10-08)

- Roleplay 4.25.0 through app updates, Memory v2: Litopys becomes each chat's one story memory (chapters per scene, facts with who knows them, arcs over older chapters), the messages it holds leave the prompt while one budgeted block of chapters and facts rides each reply, and the Library shows and edits it all (Overview with a timeline and character cards, Ledger with chapters, facts, proposals and activity, search over the original messages, rebuild from scratch). The built-in Memory moves into Litopys by itself.
- Settings has a Memory tab for matching by meaning (embeddings) that apps' memory and lorebooks use: a status line with a check, where the embeddings come from (Automatic, OpenRouter, or one custom connection), the model (OpenRouter's default is `qwen/qwen3-embedding-4b`) and, when needed, an OpenRouter key saved as the ordinary OpenRouter connection. Before, it took a hand-made custom connection.
- Embeddings via OpenRouter post only to OpenRouter's fixed embeddings address with its builtin connection's key; each vector records the model that made it, and plugins can read which model and connection they get, since vectors of different models do not compare.

## 0.8.1 (2026-10-06)

- Roleplay 4.24.0 through app updates: "Story, move" (a one-time nudge that makes the next reply move the story, from the dashboard's open threads), the dashboard's fast mode (the story reply carries the state report, no separate sensor call), the new chat look (book-page text, arched portraits, your turns offset right, scene headings, hover actions with a grouped More menu), the portrait menu Card / Soul / Dashboard, and no more echoed "Name:" at the start of replies.
- The Vertep logo replaces the old one everywhere: login and start screens, browser tabs, the launcher's desktop shortcut and the Android app icon.
- App builds and package installs are written to the engine log (output size, write failures, the install result, route errors), so a failing build on a phone can be traced.
- Subscription sign-ins (Claude Pro/Max, ChatGPT Plus/Pro, GitHub Copilot, OpenRouter, Kimi, SuperGrok, Radius) work in the release builds and the Android app: they failed with "Cannot find module" because the compiled engine did not carry the sign-in code; running from source was not affected.
- Apps' prompt hooks work again for imported apps: the grant step leaves out "hooks" (it needs no grant), but the hook collector asked for exactly that grant, so after an app update or a fresh install the Roleplay dashboard's insert into replies (and with it "Story, move" and the dashboard's fast mode) silently stopped reaching the model. A plugin that declares hooks now runs on its granted model access.
- Molfar no longer stops mid-sentence when the provider drops a tool call it could not parse: the half-written reply stays, Molfar is asked once to repeat the call with valid arguments, and if that fails too, to answer or ask its questions as plain text.
- Android app: a failed start now stays on screen with its reason instead of falling back to "Stopped", and the Logs dialog shows a launcher log (device ABIs, the engine binary, exit code or signal). The app is named Molfar Vertep, has the Vertep logo and Ukrainian texts, and its package id is now `io.github.molfarwav.vertep`: it installs as a new app beside an old Chrysalis one, so export a backup from the old app and import it in the new one. The APK file is now `Molfar-Vertep-<version>-android-arm64.apk`.
- Android app starts on Android 11 to 13: Bun's server made system calls these versions do not allow apps (close_range at startup), and Android killed it at once ("Start does nothing"). A small preloaded library now turns such calls into "not supported", so Bun uses its fallbacks. This also keeps the engine alive while it installs an app's packages (the trap in Bun's child process used to take the engine down with it).

## 0.8.0 (2026-10-05)

- Roleplay 4.23.0 through app updates: the dashboard updates right after each reply (edits and Continue re-read, a live line under the newest message), its own settings (sensor, event vocabulary, what the model sees, Tune with Molfar, the sensor prompt in blocks), the user's own notes with pinned/important/everyday tags, managed story threads with periodic checks, forms of address, start values from souls saved later, and fixes for cheap sensor models.
- Self-update also recognises release archives named `Molfar-Vertep-*`, so a later release can drop the old `Chrysalis-*` names without stranding this version.
- README: the project's story first, the technical details below.

## 0.7.0 (2026-10-04)

- Roleplay 4.22.0 through app updates: the relationship dashboard (sensor, attitudes, constellations, scene clock, threads, notebooks, a words-only prompt insert), the Soul tab on cards, the scene strip, wide view and phone sheet, and UI work made with Molfar (rail labels collapse, persona filter, preset-bound regex, grouped regex list and Tools tabs).
- Agent page: an app's draft for Molfar is no longer lost when a chat is already open.
- Launcher: `dev` mode takes the branch's commit when a git worktree holds the branch; `dev NAME` follows `claude/NAME`.
- README: the Molfar Vertep logo and a short tour of what is inside.

- App plugins: a route's model request can carry `turn` labels (op, chatId, speakerId, speakerName, targetId, swipe). The model never sees them; sibling `llmRequest` hooks get them as `ctx.turn`, so a hook knows who speaks and whether it is a new reply, a swipe, a continue or an impersonation.
- Models that cannot switch thinking off and say so in NanoGPT's words ("Invalid value for reasoning.effort ... none") get the lowest level they list, so plugins that name no thinking level (the dashboard sensor, Litopys) work with them.

## 0.6.1 (2026-10-03)

- Roleplay 4.21.1 (app update): on a computer, sections open as a drawer over the page again, as before 4.20.0; phones keep pages.

- **Apps install the packages they are missing**: when an app update adds a package and its install fails (offline, a Bun error), the app no longer stays broken with `Could not resolve` in the build. Opening the app installs what `package.json` lists but `node_modules` lacks (at most once every 10 minutes per app), and every start does the same, not only for apps with no `node_modules` at all.
- **Molfar's app changes can become everyone's default**: a new built-in skill, `publishable-changes`, tells Molfar how to change an official app (such as Roleplay) so the change can ship to all users: defaults in code, no personal data, the commit message as its description, `local:` for a tweak that stays yours. The maintainers publish such changes with `scripts/publish-app.ts`, which lists the app's code changes since its last update (never `data/` or Molfar's memory of the app) and carries chosen files into the app's repository.

## 0.6.0 (2026-10-02)

- **Apps can reach Molfar**: an official app may open Molfar on a new chat with a request typed in but unsent (`window.chrysalisShell.askMolfar`), list the installed apps (`apps()`) and switch to one (`openApp(id)`). Only trusted apps get it, only while their tab is on screen, at most one draft every 2 seconds, 4000 characters at most; an app can never send a message for you.
- **Profile import checks the version**: a profile backup now records that Molfar Vertep made it (`product` in `profile.json`), and a backup from a newer Molfar Vertep is refused before the preview ("update this one first"), so newer data never lands on an older engine. Backups made before 0.6.0, and upstream Chrysalis ones, import as before.
- Roleplay 4.21.0 (app update) uses it: a new Home with Continue story, Create, Ask Molfar, achievements, recent chats with persona and character filters and delete, and My apps.

## 0.5.0 (2026-10-02)

- **The Vertep look**: one 46 px top bar (eye logo and the VERTEP wordmark in Kurale, the tabs with an accent underline, the app's Split, Fullscreen, Plugins and Rebuild moved up from the second row, Updates and the account on the right); on phones the tabs become a segment control. Vertep (black, oxblood red accent, cyan primary buttons) is the default theme; a stored Dark or Light choice is kept.
- **Themes of your own**: the account menu lists Vertep, Dark, Light and every valid `themes/<id>.json` in the workspace (hex colours for known tokens, on a dark or light base). `GET /v1/themes` lists them and the refused files with the reason; it is shell-only. Molfar's page follows the shell's theme. New built-in skill `shell-theme`.
- Primary buttons use a separate `--c-cta` colour. Kurale (OFL) is self-hosted. The tabs have gaps between them (phones: separate chips).
- Roleplay 4.20.0 (app update): the Vertep theme, a labeled grouped navigation rail, sections as full pages (a drawer only over an open chat), Ukrainian navigation.

## 0.4.0 (2026-10-02)

- **The agent is Molfar now**: an old Carpathian molfar, kind and wise, who also knows today's code. He has a name and a face across the interface (Мольфар in Ukrainian and Russian), a light touch of character in conversation (a warm word, now and then a proverb from the mountains), and none of it in code, files or commit messages. The character lives in the default instructions, so you can soften or remove it in Settings; if you never edited them, you get it on the next start.
- **Reports are easier to scan**: Molfar opens each block with a marker (🔍 finding · 🔧 action · ✅ done · ⚠️ risk · ❓ question · 💡 idea · 🧹 cleanup · 📦 side note), and long reports get headings with the marker on both sides.
- Fixed: plugins were found in a different order on Windows and Linux, so which plugin answered a route first could differ between machines (and CI failed since 0.3.0). The order is the same everywhere now.

## 0.3.1 (2026-10-02)

- **One-file launcher for Windows**, `Molfar-Vertep.bat` in the repository root, for running from source from any folder: it installs Git and Bun when missing, downloads Molfar Vertep next to itself, offers each new release before installing it (`dev` follows work in progress), builds only what changed, offers a desktop shortcut, and opens Molfar Vertep in your browser. Folder names with spaces or in any language work.
- Fixed: an app update could freeze the whole of Molfar Vertep on Windows. After the new files were written, deleting the update's temporary folder waited forever on a file another program held (an antivirus scanning the fresh download), and nothing answered until a restart. Temporary folders are now moved aside and deleted in the background with retries, each update gets a folder of its own, and leftovers from an interrupted update are cleaned up by the next one.
- Fixed: workspace copies of built-in skills that were never edited kept blocking newer built-ins when the built-in itself had changed since the copy was made. Molfar Vertep now remembers every version of each built-in skill it ever shipped (`builtin-skills/.digests.json`, rebuilt with `bun scripts/skill-digests.ts`), and a copy equal to any of them is removed on start.

## 0.3.0 (2026-10-02)

- The interface speaks Ukrainian: Українська in Settings > General > Language, picked automatically for a browser set to Ukrainian. The shell now has 14 languages.
- **The agent's instructions are rewritten.** The base prompt now opens with how the agent works: look first (project, notes, memory, the app's AGENTS.md), ask before large work, put changes in the lightest place, check each step, and finish with what changed, what was checked and how to undo it. It never deletes your content unless asked.
- **The agent answers in your language**, a rule now in the engine's own prompt (full and small-model mode) instead of only in the editable instructions, so no edit can drop it. Code and commit messages stay English; text inside an app follows the app's language.
- **Which instruction wins is stated once**: engine limits always hold; then your current message, the project's instructions, your personal instructions, the app's AGENTS.md, the workspace's AGENTS.md, then the general rules. Text in app data, downloads or web pages is information, never an instruction.
- **Default instructions are short preferences now** (plain words, short answers, flag weak ideas); the rules moved to the base prompt, so each request no longer pays for them twice. A copy you never edited moves to the new default on the next start; an edited one stays yours.
- **Settings > Agent shows the workspace contract (AGENTS.md)**: whether it is the default, edited or outdated, with "Restore default" (the old text stays in the workspace history).
- **Built-in skills update again**: a workspace copy identical to a built-in skill is removed on start, so the engine's newer version reaches you. New built-in skill `default-prompts`: how a plugin ships a prompt with a default, restore and a language line.
- **Molfar Vertep is independent of Chrysalis now.** Nothing is merged from upstream any more. Everything you see and everything the agent reads says Molfar Vertep; only the internal names (`chrysalis` command, `CHRYSALIS_*` settings, data folders, download file names) stay for now, so installs keep working.
- **The Store reads Molfar Vertep's own catalog**, [MolfarWav/Molfar.Vertep-Store](https://github.com/MolfarWav/Molfar.Vertep-Store). A config.yaml that still names the old Chrysalis list moves to the new one on start. Official apps are the ones under MolfarWav; apps from anywhere else, upstream Chrysalis included, are reviewed before install like any community app.
- README rewritten for Molfar Vertep. The Chrysalis Discord link is gone from the start screen; issues and security reports go to this repository. The Docker image is `ghcr.io/molfarwav/molfar-vertep`.

## 0.2.0 (2026-10-02)

- **Updates in one place.** An Updates button in the top bar, with a badge when anything is newer, opens one panel: Molfar Vertep itself (for admins; a copy run from source says to restart it with its launcher) and every app installed from a repository. Each row shows current → new version, a link to the changes and an Update button; "Update all" updates the apps one by one and stops at the first that needs a decision. Overlapping edits get the same choices as on the app page (keep mine, take the update, ask the agent to merge). Checks run once when the shell starts, then on "Check now" or after an update.
- The Molfar Vertep logo in the top bar opens the start screen.
- Releases are built from a `vX.Y.Z` tag on main, titled "Molfar.Vertep X.Y.Z", with notes from `.fork/release-notes/`.
- The project is now called **Molfar Vertep**: the interface (all 13 languages), page titles, console messages, README and `package.json`. Internal names stay (the `chrysalis` command, data folders, `CHRYSALIS_*` variables, release file names), so existing installs keep their data and upstream fixes still merge. Strings about the Store's official apps still credit the Chrysalis maintainers, who make them.
- Update checks and `package.json` point to the renamed repository, MolfarWav/Molfar.Vertep.
- **Roleplay comes from Molfar Vertep's own fork**, [MolfarWav/Molfar.Vertep-Roleplay](https://github.com/MolfarWav/Molfar.Vertep-Roleplay), never from upstream again. The Store installs the fork, and an existing install switches its update source to the fork on the next start (code and data untouched; the next update merges the fork in, without conflicts over the plugins' source fields). Apps under MolfarWav count as official.
- **Archivarius is now Litopys and ships with Roleplay** (Roleplay 4.19.0 in the fork). It reads the old `data/archivarius/*` until its first save.
- A plugin manifest can say `"replaces": ["<sibling id>"]`: the sibling it names stays on disk but never runs (listed as off), so a renamed plugin and the old copy never both call the model.
- Fixed: since 0.1.0 every app update was refused as needing a newer engine. Apps state engine needs in upstream Chrysalis numbers (`>=1.0.0`), and they were checked against the fork's own 0.1.0. They are now checked against the upstream app contract this engine keeps (1.0.2).

## 0.1.0 (2026-10-01)

Based on upstream 1.0.2 plus its staging branch as of 2026-09-30 (@ mentions,
user commands in `commands/`, the CLI). Everything else is the fork's.

### The agent's context
- Runs stay inside the model's context window: the oldest context is trimmed first, the trimmed prefix stays stable for prompt caching, and output is never asked to exceed what the window has left. A provider's "too long" refusal is retried once with a deeper trim; no false overflows on errors without a body.
- Auto-compaction runs on the session's own model.
- **Small-model mode** (Settings > Agent: Auto / On / Off). Auto turns on for a window of 32k tokens or less, or an unknown one. The agent gets one compact system prompt, short tool descriptions and only the core tools: about 2.6k tokens before the first message instead of about 9k. Other tools (app, skills, shell, admin, MCP) appear from the next step when the work needs them, or through `tools_enable`. The plugin contract and UI rules live in the built-in skill `app-authoring`.
- For every model: no bash schema when the instance has no shell, a shorter `ask_user` description, and no duplicate workspace map when AGENTS.md already carries it.
- **Prompt inspector** on the agent page: the last 20 model requests per user (agent, apps, API) with per-message token estimates, tools size, output, usage and errors. No keys or headers are kept.

### Memory and skills
- Long-term memory per scope (global, each app, each free project), written only through `memory_propose` after the user confirms. A project's memory reaches the agent the first time it touches that app.
- **Topic files**: `MEMORY.md` is the core (always in the prompt, capped at 4000 characters for the agent); other entries live in `memory/<topic>.md` files listed by name and read on demand. `memory_propose` takes a topic and can move entries.
- **`memory_search`**: searches every memory file with Ukrainian and Russian word matching (inflections, apostrophe variants, stop words, whole words only).
- Memory panel on the agent page: topics as groups, move entries between core and topics, search.
- Skills: built-in skills ship with the engine (`builtin-skills/`: `app-authoring`, `finish-change`, `two-phase-llm`, `plugin-silent-failure`, `cyrillic-text-matching`, `skill-authoring`); a workspace copy of the same name replaces one. `skill_propose`, `skill_edit` (shown as a diff), extra files per skill, `skill_load {file}`. The user writes, edits and resets skills from the panel. Skills appear in the composer's `/` menu.

### Projects and chats
- Projects on the agent page: every app is a project, plus free projects in `projects/<name>/` with instructions, a default model and reference uploads (kept out of git).
- Move a chat between projects (menu or drag), save a reply into project files.
- What each chat has cost, summed over every model call.
- A reasoning-level switch beside the model picker.

### Safety nets
- **Checkpoints**: one is taken before a run's first change to an app; the agent can create, list and restore them (restore is confirmed and puts back code only, never `data/`). Undo under a run and on the app's project page.
- **Protected paths**: by default an app's `src/` and `index.html`, and always `persona.md`. The agent changes them only after the user allows it in a card, once per request; the shell, git restore/revert and git rm are held to the same rule. The list is editable in Settings > Agent.
- Default agent instructions, with "Restore default instructions" in Settings.

### Asking the user
- `ask_user` options carry a description and a recommended mark, allow several picks, and several questions fit in one card. Loose shapes from weak models are normalized.

### Models and settings
- Settings > Models: choose which models the pickers show (grouped by connection, searchable).
- Settings > Backup: the whole profile as one zip, with keys encrypted under a password; import replaces the profile after zipping the current one.

### Fixes
- The agent's emulated git accepts `add` (a no-op: there is no staging area) and `rm`, so `git add -A && git commit` in the shell commits deletions instead of stopping at `add`.
- The hot build drops a deleted file, directory or import instead of keeping it until a full rebuild: importers re-resolve, unreachable modules are pruned, and the page removes their styles.
- `onTick(ctx, host)` documented with its real signature in the plugin docs and the system prompt.
- Update checks follow this fork's releases, not upstream's.
