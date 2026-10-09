# 0.9.2: portraits everywhere, connections in one place

Agreed with the user 2026-10-09. Engine branch `claude/v092` (create it from `main` in a worktree:
`git worktree add -b claude/v092 .claude/worktrees/v092 origin/main`). Roleplay parts in the clone
`.claude/worktrees/rp-memory`, on a new branch from the fork's main (4.26.1). Pushing the Roleplay
fork's main ships to every install: ask the user first.

## Carried over from 0.9.1 (check first, all small)
- The in-app APK updater (`android/.../Updater.java`, "Get update"): first real test is on the user's
  phone, a test 0.9.0 build signed with the release key, updating to 0.9.1. Ask how it went; on a
  failure get Logs > Copy and a screenshot.
- Roleplay 4.26.0/4.26.1 UI was not browser-checked: the card id copy button in the character
  editor, the Library map toggle, "Story, move" with an empty composer. Ask the user, or check with
  the `browser-check` skill (it works on Windows now; Roleplay must be installed in its workspace).

Carry-over results (2026-10-09): the APK updater WORKED (user). Roleplay 4.26.x looked at live by the
user: the Library map toggle works; the card id copy failed ("writeText ... blocked by permissions
policy": the app is a sandboxed frame) -> fixed with the shared `copyText` fallback; "Story, move"
from an empty box sent at once and read as an empty message (the empty Jude bubble in the user's
screenshot was a reply they stopped after 8 s of thinking) -> user's choice: the button only ARMS
the note, Send/Enter carries it (empty send with a note armed = no user turn).

Done in the Roleplay clone, branch `portraits` (pushed to the fork, not main; on top of 4.26.1):
`720b41e` story move arms only, `047eec5` copy, `cec2db6` portraits (item 1), `dac290b` drawer full
screen (item 4), `7b3a7c4` price rounding (item 5). 751 tests, typecheck only the old plugin-panel
error. Browser check by a subagent: see STATE.

## Items, in order
1. **Library portraits on the dashboard and in Soul** (user, 2026-10-08; small, reuse M4c).
   The dashboard strip, wide view and phone sheet (`useAvatars` in Roleplay
   `src/components/dashboard/dash-mount.tsx`) and the Soul tab's characters match names only against
   the chat's card and its group members, so narrator-card and lorebook characters show initials.
   Use the Library's portraits the same way: read `GET /litopys/portraits` (`litopys/portraits.json`,
   one image per lower-cased name, for every chat) and let it win over the card match, then initials;
   open the same `PortraitDialog` (`src/components/library/portrait-dialog.tsx`: upload, take from any
   card/alternate/persona, or remove) from a click on a character's avatar wherever the dashboard
   lists its regular cast (strip, wide view, Soul). One store for both places, so a portrait set in
   the Library shows on the dashboard and back. Branch `memory-m4` holds the code to reuse (`94a7ec7`).
   Roleplay-only: ships as a Roleplay release.
2. **Connections in one place** (user, 2026-10-05; the main item of 0.9.2). BEFORE ANY DESIGN: ask the
   user for the Marinara screenshot of its connection screen. What is wanted:
   - Everything about a connection on one screen: provider, key, model and the model's parameters.
   - Sampling values (temperature, top_p and the like) belong to the model/connection, not to the
     preset. Needs a migration plan for presets that carry them today (Roleplay presets keep samplers
     at the top level and in `studio.samplers`; see the fork's `docs/DATA-FORMATS.md`).
   - Molfar's connections and model must not depend on the Roleplay app (when Roleplay does not build,
     Molfar has no model): connections live in the shell Settings, used by the agent and the apps.
   - Android shows no ready-made provider presets (NanoGPT, OpenRouter...) that the desktop has. Found
     earlier: the catalog is compiled in and the same on Android; on phones Settings hides behind the
     user menu. Confirm and make it reachable.
   - NOT in this item unless the user says so: the `@earendil-works/pi-ai` upgrade for newer builtin
     models (Opus 5.5, Sonnet 5.5). The user wants it as its own careful step (branch, full test run,
     the agent and every OAuth flow checked on desktop and APK).
   Plan with the user (AskUserQuestion) after the screenshot: what moves where, the data format of a
   connection's parameters, the preset migration, what the agent page shows.

   The user sent Marinara's connection screen (2026-10-09, 7 screenshots): a Connections list
   (Defaults, Local Model, Text to Speech, then each saved connection: name, provider, model) and a
   connection editor on one page: name, provider tiles, API key, management token (NanoGPT),
   subscription usage, base URL, model picker + id, max context, max output override, max parallel
   agent jobs, max requests per minute, local/custom endpoint switch, prompt preset override, then
   "Default chat parameters" with per-field switches (temperature, max output, top P, frequency,
   presence, post-processing, assistant prefill, reasoning prefill, thinking tags, custom
   parameters JSON, custom headers, service tier, reasoning effort, image captioning), connection
   tests. The user crossed out the Semantic search (embeddings) block: "we already have it
   separately in Memory". Plan the design with the user (AskUserQuestion) from this.
3. **Map of chats per chat, linked like backlinks** (user, 2026-10-09; replaces the all-chats
   forest in `chats-map.tsx`). Today the map shows every chat at once in a row that scrolls
   sideways. Wanted: the map opens for ONE chat; a search field finds another chat (like the link
   field of a text editor, the user's analogy: an SEO backlink from one page to another); the found
   chat's sphere is placed on the map and a line joins the old chat to the new one. The link is
   stored, not only drawn (the disabled "Draw a bridge" button was the placeholder). DECIDED with
   the user 2026-10-09: (a) the link is a BACKSTORY: the new chat's model requests carry the old
   chat's Litopys memory (arcs/chapters + pinned facts) as "what happened before", within the token
   budget; (b) a chat has at most one predecessor, a chat may have several continuations (chain +
   branches; the map of a chat shows its chain back and its branches forward); (c) the map opens
   from the Library as now, but for the selected chat; (d) message forks (parentChatId) show on
   the same map with a dashed line, backlinks with a solid one.
   BUILT 2026-10-09 (spec `LINKS-SPEC.md`), Roleplay worktree `.claude/worktrees/rp-links`, branch
   `chat-links` from `portraits` (pushed to the fork, not main): `88f08a6` plugin (links.json, POST/GET
   /litopys/links, backstory block before the chat's own insert, linkBudget 800, `continues` in GET
   /litopys/chats, 6 tests), `f8d042b` UI (chats-map.tsx drafted by an external model, layout/search
   fixed in review; graph in chats-graph.ts, 3 tests; Backstory budget field in the Library settings).
   760 tests. Not browser-checked yet.
4. **Section drawer full screen** (user, 2026-10-09): DONE `dac290b` (a button in the drawer header,
   remembered; every desktop drawer section).
5. **Price noise** seen in the same screenshot ("$0.42000000000000004"): DONE `7b3a7c4`.

## Done means (as always)
`bun run typecheck`, `bun run test` (13 known Windows failures, listed in STATE), `bun run build:client`,
lint of touched files, a browser check of UI changes (dark, light, 390 px), `.fork/STATE.md` updated,
committed and pushed.
