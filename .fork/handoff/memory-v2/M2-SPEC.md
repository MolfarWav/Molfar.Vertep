# M2 spec: Litopys 2.0 in shadow mode (Roleplay)

Part of `PLAN.md` (read its Decisions and Data format first). Shadow mode: Litopys 2.0 builds
chapters and facts but injects NOTHING into the prompt; the old Memory (engine plugin summary +
facts) keeps working untouched until M3. Split: M2a plugin core (this spec, sections 1-7), M2b
read-only UI (section 8), M2c engine embeddings (section 9). Clone `.claude/worktrees/rp-memory`,
branch `memory-m2` from `memory-m1`. No version bumps, no CHANGELOG, never commit `bun.lock`.

## 1. Plugin shape (`plugins/litopys/`)
- Litopys 1.x scribe, curator, recap, vault renderer and its `llmRequest` insert are REMOVED
  (the insert was off by default and nothing reads the rest). Keep the id, routes prefix
  `/litopys/`, `moveLegacy` from M1, and the old `data/litopys/store.json` + `proposals.json` on
  disk as a backup (read only by the migration).
- Manifest: name "Litopys", description = chapters + facts per chat, `schedule.intervalMs` 60000,
  permissions unchanged (keep `hooks` declared; the hook export is gone in M2, back in M3).
- Data: `data/litopys/chats/<chatId>.json` exactly as in PLAN "Data format", plus
  `worker: { lastRunAt, lastScene: {from,to}, ok, error?, ms?, usage? }` for the UI.
  Config `data/litopys/config.json` (stored keys override defaults): `model` ("" = chat model),
  `recentMessages` 20, `scene: { minMessages 6, maxMessages 40 }`, `pinLimit` 5, `enabled` true.
  Old 1.x config keys are ignored.

## 2. Scenes (code, no model)
`findScenes(msgs, dash)`: msgs = the chat's active line (skip hidden), dash = the dashboard state
`data/dashboard/state/<chatId>.json` (may be missing). A new scene starts at a message whose
snapshot (`snapshots["<msgId>#<swipe>"]`) has `scene.new === true` (section 4) OR whose place
differs from the previous snapshot's place OR whose clock jumps more than 6 hours. No dashboard
data: every `maxMessages` messages is a boundary. Then: scenes under `minMessages` merge into the
previous one; scenes over `maxMessages` split into parts (`kind: "part"`). A scene is CLOSED when
a later scene has started and its last message is older than the newest `recentMessages`.
Labels: the sensor's `scene.label` of the first message, else the place, else "".

## 3. Worker (one model call per closed scene)
`onTick`: for each chat updated in the last 7 days (skip temporary chats, `enabled: false`),
migrate if needed (section 5), recompute `sig` of existing chapters (FNV-1a of the covered
messages' active texts; mismatch = `stale: true`), then pick the OLDEST closed scene that has no
chapter or a stale one; at most ONE model call per tick across all chats.
Request: `reasoning` off exactly as the dashboard sensor sends it (look at REL), `maxTokens` 2000,
model = config `model` or the chat's. Messages: system = the prompt below; user = previous
chapter text (if any) + "Known facts" (active facts whose subject or knownBy names a character of
the scene, max 40, each `id: text`) + "Scene messages" (`[name] text`, each cut to 1500 chars).
Prompt rules (write it as `DEFAULT_PROMPTS.chapter`, English, with the language line):
- the chapter states consequences, not a retelling: who won or lost, who is hurt, what was gained
  or lost, how people's feelings toward each other changed, what was decided or promised, who
  learned what; 3-6 sentences, past tense, third person, names not pronouns;
- facts: durable things only, one short self-contained sentence each, at most 8; `subject` (a
  name, the user's character's name, or "world"), `knownBy` (names who witnessed or were told,
  or "all"), `type` event|trait|change|relation|world|plan, `weight` everyday|important|key;
  `change` = a lasting change that overrides the character card (a lost arm, a new scar, a title);
- to change a known fact: `{op:"update", id, text}` or `{op:"retire", id, reason}`; new facts
  `{op:"add", ...}`; never repeat a known fact;
- write in the language the story is written in; use only what the messages say, never invent.
Reply JSON: `{"chapter": {"label": "...", "text": "..."}, "facts": [ops]}`. Parse like the
dashboard sensor (first `{` to last `}`, tolerate a cut reply: keep the chapter if complete).
Applying (code): add → skip when trigram Dice >= 0.85 with an active fact of the same subject
(reuse the M1 helper from REL; copy it); `weight: "key"` → `pinProposed: true` (never pinned by
code); update/retire of an existing fact → a proposal, EXCEPT `type: "change"` updates, which
apply at once (old fact `superseded`, new one `supersedes` it). Ids `c<n>`, `f<n>`, `p<n>` from
counters. A failed call records `worker.error` and waits 10 minutes before that chat again.

## 4. Sensor fields (relations plugin)
- Sensor output (and the fast-mode tag, same shape) gains `scene: { new: boolean, label: string }`
  ("new" = this turn starts a new scene: a fight starts or ends, a conversation ends and someone
  leaves, a new place or a time skip; label = 2-5 words in the story's language). Stored on the
  snapshot. Missing or malformed = `{new:false}`.
- Notebook notes gain `weight` everyday|important|key from the sensor (missing = everyday).
  A `key` note shows nothing new yet (the pin proposal UI is M4); just store it.
- Prompt change through the existing `sensorParts` blocks (the output-shape block); the old
  default goes into the PAST list as the plugin already does for prompt versions.

## 5. Migration (code, once per chat, `migrated: true` in the chat file)
- Litopys 1.x `store.json` `chats[chatId].worldFacts` → facts (`origin: "migrated"`, kind
  place/item/lore/manual → `world`, npc → `trait`, event → `event`; status kept; subject "world",
  knownBy "all", weight `important`). `storySoFar` and `chronicle` are not carried.
- `chats/<chatId>.memories.json` → facts (`importance` 1-2 everyday, 3-4 important, 5 key;
  `pinned` kept; `vector` moved to the sidecar keyed by the new fact id + text hash).
- `chats/<chatId>.meta.json` `summary` with `memoryCutoffMessageId` → chapter `c1`
  `{kind:"merged", from: first message id, to: cutoff id, label: "", text: summary}`. Litopys
  only READS meta and the vault; it never writes the engine plugin's files.

## 6. Fork and delete
- A chat whose meta has `parentChatId` and no Litopys file: copy the parent's chapters and facts
  whose `src.to` / `to` is at or before `parentMessageId` in the parent's line.
- Extend M1 `pruneOrphans` to delete `chats/<id>.json` and the sidecar of deleted chats.

## 7. Vectors
After a successful worker run, embed the new chapter and added facts (`host.llm.embed`, one call,
next pass) into `data/litopys/vectors/<chatId>.json` `{ id: { hash, vector } }`. A missing
embeddings connection is fine (skip silently; remember the failure for 1 hour like ENG's
`embed-status.json`).

## Tests (M2a)
findScenes (sensor boundary, place change, time jump, no dashboard, merge short, split long,
closed vs open); worker picks the oldest closed scene and makes one call per tick; request has
reasoning off and the language line; reply parsing incl. a cut reply; apply ops (dedup, key →
pinProposed, update → proposal, change → superseded); migration of all three sources and that it
runs once; fork copy; prune; the sensor stores `scene` and note `weight`; Litopys adds nothing to
a reply request. Use made-up names and texts only.

## 8. M2b: read-only view (after M2a is reviewed)
Rail section "Litopys" / uk "Літопис" next to Lorebooks (`src/components/shell/sections.ts`),
page `src/components/library/`: chat picker; per chat the chapters (label, message range, text,
stale badge), facts (text, subject, knownBy, type, weight, pinned / pin proposed, status),
proposals, and the worker line (last run, scene, ok or error, time). Routes
`GET /litopys/chats` (id, title, counts, worker) and `GET /litopys/chat?chatId=`. No editing.
Strings en+uk in `src/lib/i18n.ts`. Browser check (skill `browser-check`): 1280 dark uk, light en, 390.

## 9. M2c: embeddings for memory, a Settings section in the shell (user, 2026-10-06)
Goal: a user with no custom connection gets matching by meaning with one step: paste an
OpenRouter key (a ~$5 top-up lasts a very long time for embeddings). Engine-wide, not Roleplay.
- Verify first (provider docs, no live calls with the user's keys) that OpenRouter serves an
  OpenAI-style `/embeddings` and which models (e.g. `openai/text-embedding-3-small`); same check
  for NanoGPT. Only providers that do get offered.
- `src/models.ts` `embed()`: besides custom connections, use the chosen provider's builtin
  connection when it exists (an OpenRouter connection already set up = no second key).
- Shell Settings section "Memory: matching by meaning" (all 14 locales; `en.ts` empty value per
  the i18n rule): status line (works via X / words only), provider choice (OpenRouter default,
  any custom connection), model, a key field when no connection exists (stored like any
  connection key), and a short note: what it is for (memory and lorebooks find things by meaning,
  not only by words), that it is optional, and the rough cost. The Roleplay Settings field becomes
  a status line with a link to this section.
- Confirmed by the user 2026-10-06: OpenRouter serves `POST /embeddings` (OpenAI style) and lists
  ~37 embedding models, some free (e.g. `liquid/lfm2.5-embedding-350m:free`, 512 context; its page
  says requests and embeddings may be retained and used for training).
- Model choice: free first, then a cheap paid fallback (e.g. `openai/text-embedding-3-small`).
  A model that may train on inputs is NEVER picked silently: the user opts in after a plain
  warning (chats can be private), otherwise the list starts at the paid model.
- Vectors from different models do not compare (different spaces, often different sizes). Every
  stored vector keeps its `model`; a query is compared only with vectors of the same model. When
  the active model changes (fallback or the user's choice), old vectors are re-embedded lazily in
  the background, and until then those items match by words only. No mixing within one search.
- Tests in `test/models.test.ts`; shell-only routes go into the security test lists.
