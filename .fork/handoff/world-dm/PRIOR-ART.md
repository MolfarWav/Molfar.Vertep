# World DM P3: prior art the user found (read 2026-10-19)

Five SillyTavern projects, cloned and read (READMEs, prompt constants, settings shapes). Licenses: four MIT, Ultimate
Persona's LICENSE file is AGPL-3.0 (its README says MIT). All compatible with our AGPL-3.0-only; if we port text
or data from one, credit it in the file header and the CHANGELOG. What follows is what to take, not a summary.

## WorldInfo Recommender (WREC, bmen25124)
Suggests lorebook entries from the current chat with an LLM. Worth taking:
- **The prompt is a list of named blocks**, each `{ promptName, enabled, role }`, in an order the user sets
  (`mainContextTemplatePresets`): chat history, platform description, current lorebooks, rejected entries,
  suggested entries, response rules, task. Each block text is a template with an `isDefault` flag and a reset.
  Our DM prompt can be the same: blocks the user can switch, reorder and edit, with the output-format block locked.
  This is our Canvas prompt board idea applied to the DM's own call.
- **What the model reads is a setting** (`contextToSend`): messages none / all / first N / last N / a range,
  the card, the author's note, world info, earlier suggestions. For the DM: a per-chat "what the DM reads" choice.
- **Suggest, then the user accepts, edits or rejects**; a rejected entry goes to a blacklist the next call sees
  ("don't suggest these again"). For our Start (cards, interview): drafts to review in the World hub before they
  are written; in play the DM still writes by itself (decided).
- **Revise session**: a small chat with the model about one entry or the whole set, the reply is the changed data
  plus one friendly line. Later, for the Records tab ("rewrite this NPC darker").
- Their FAQ matches what we saw: RP presets and small RP models break structured output; raise the reply limit.

## Character Creator (CREC, bmen25124)
Same author and engine as WREC, for cards. Worth taking:
- **Output format is a user choice**: XML (`<response>…</response>`), JSON (`{"response": …}`) or plain text, each
  with its own instruction block. The author says small 8B/12B models work if you switch the format. Our parser is
  JSON only; a tolerant fallback (JSON, then a tagged or line format) would help free models. Open question.
- Field-by-field generation with the other fields as context (`targetField`, existing fields, persona, chosen cards
  and lorebooks as context blocks). For "create from cards": one section per call, the earlier sections as context.

## Custom Scenario (bmen25124)
Questions before a card starts; answers become variables in the card's texts. Worth taking:
- **Question shape**: `{ inputId, text, type: text|select|checkbox, options[{value,label}], defaultValue, required,
  showScript }`. Our recipe `questions` should use this shape (minus scripts). `showScript` (a question shown only
  when an earlier answer fits) can be a plain `showIf: { id, equals }`, no JavaScript.
- Our presets already have variables with a choice UI (`PresetChoices` in the new chat step): the interview form
  should reuse that component rather than a new one.
- Not taking: user JavaScript in recipes (a security surface for files people share).

## Writer's Workbench (deiomo)
An offline HTML builder for cards and lorebooks, with live sync into a ST lorebook. Worth taking:
- **Entry templates per kind**, field names we can reuse for recipe sections and the DM's record text:
  scenario {setting, overarching story, technology, mood, what's normal}; location {layout, vibe, ways in and out,
  who's here, what you can do}; item {appearance, what it does, how it's used, limits and costs}; faction {what they
  want, how they operate, outsiders, members, code, relations}; history {what happened, who was there, effect on the
  present}; concept {what it is, how it works, rules and limits}; side character {look, function in story, want,
  quirk, behaviour}. A faction's "what they want" maps straight onto a front's goal.
- **Its sync rule is ours**: it touches only entries it made (`wwId`), never hand-written ones, and removes only its
  own. Same as our `memo: world:` rule. Confirms the design.
- A relationship graph and a "what the AI sees" markdown preview with a token count: the hub's Records tab could
  show the same preview per record.

## Ultimate Persona (BobTheBinChicken)
A persona wizard built from a chosen card, plus plot hooks and alternate greetings. Worth taking:
- **Offline option lists** (vibes, traits, upbringings, life events, motivations, secrets, AU types, romance
  premises, "popular presets" like enemies to lovers, slow burn) in `data.json`: the interview can offer choices
  without a model call; free text stays possible ("combo inputs").
- **Plot hooks in three flavours** (canon, alternate universe, romantic) from a card: a good shape for the first
  fronts and the opening event of "create from cards".
- **Relationship dynamic: complement or friction** with the card's character: one interview question.
- Prompts the user can customise in settings, as in ours.

## What changes in P3-PLAN
- The DM's prompt becomes a block list (WREC), output block locked; editing follows Litopys's stored-diff pattern.
- Per-chat "what the DM reads" (WREC `contextToSend`) joins the chat's fine settings.
- Start produces drafts to review, with a "don't suggest" list (WREC); in play nothing changes.
- Recipe questions use the Custom Scenario shape with `showIf`; the form reuses `PresetChoices`.
- Recipe sections use the Workbench kinds and fields; built-in option lists come from our own data file in the
  spirit of Ultimate Persona (written fresh, or ported with credit).
- Open: a second output format for small models (CREC).

# Round 2: seven more projects (read 2026-10-19)

Cloned and read: READMEs, prompt constants, settings and state shapes. **Licenses differ from round 1, so check
before porting text:**
- Game Manager ST (`game-manager-st`), StateSmith, MazeMaster: AGPL-3.0, LICENSE file and README agree. Same
  license as ours: text and data may be ported with credit in the file header and the CHANGELOG.
- Story Engine: no LICENSE, no README, no license field anywhere. By default that is "all rights reserved".
  **Ideas only. Port no text.** Prompt fragments below are paraphrased.
- Forged by Primus: LICENSE and README both say "All Rights Reserved" (view for education only). **Ideas only.**
- Arbiter: no LICENSE, no license claim in README or manifest. **Ideas only.**
- InternalStates (Mezi99): **clone failed** (GitHub asked for a username: the repo is private, renamed or gone).
  Not read. The user can send a working link or the files.

## Game Manager ST (closuretxt) - AGPL-3.0
A "gamemaster" extension: builds a tracked setup (party sheets, shared resources, warnings, progression) from a
scenario plus the card and lorebooks in one call, then runs a cheap router call before every player message and an
update call after every reply. The closest relative of our Start + DM. Worth taking:
- **Inject only what this turn needs.** Two outputs, not one: a *persistent* block (warnings, flagged resources)
  and a *one-shot* block "consumed once per generation" (roll results, a transaction). Empty = zero tokens. This is
  our event model (soft = persistent hint, hard = one-shot) said clearly: two named channels, each costs nothing
  when empty. The README line to copy in spirit: "When nothing applies, it costs one cheap call and zero injected
  tokens."
- **Router before the writer.** One cheap call "judges INTENT, not keywords" and returns optional tags; `<nothing/>`
  is a valid answer; "When in doubt whether something is needed, leave it out." For us: a DM run that answers
  "nothing changed" must be cheap and normal, and the prompt should say so (ours says "empty lists" only once).
- **Degrades, never dies.** If the router fails or returns junk, a keyword fallback builds a synthetic plan. Swipes
  never re-run it. Before any change the state is snapshotted per message (last 5), and a delete or swipe rolls
  back. Our DM has no rollback: a deleted or swiped reply leaves its records and clock ticks. Worth a decision
  (see below).
- **Output is XML tags, all optional, unknown names skipped, malformed blocks dropped with a log line.** Same
  finding as CREC: free and small models handle tags better than one big JSON object. Their wizard asks for "ONLY
  the `<setup>` XML block (no markdown fences, no prose)" and shows a commented example shape inside the prompt.
- **Setup wizard prompt rules worth reusing as ideas for "Create from cards":**
  - Split the cast into a few *full* entries (a cap, set in settings) and a *roster* of one-liners "never injected,
    never rolled"; promote a roster name later. Gacha-sized card casts stay small. Our records are already one-liners
    in a book, so this maps to: build full records for the main cast, one short line for the rest.
  - "Every entry gets a short, IN-WORLD description - a fact about the thing itself, never meta commentary" and "NO
    PURPLE PROSE ... Write like a gear tag, not a novel". Good for small models: it keeps record text short.
  - **Drift rule**: anything that changes by itself over time must state the rate and what resets it ("Hunger rises 1
    per scene; a full meal resets it"). Our fronts have a clock but no stated pace: a front's `pace` line ("ticks
    when a day passes") would make ticks consistent.
  - **Ownership test**: if an item is about ONE character it goes on that character, not on the party. For us: a
    fact about one NPC is that NPC's record, not a world fact.
  - Switches in the dialog: "Improved Grounds" (push toward stakes, add pressure when the scenario is slice of
    life) and "Skip Characters" (scenario only). Both are one-line prompt blocks toggled by a checkbox: cheap to copy
    as recipe options.
  - **Refine pass**: a second prompt takes the current proposal plus the user's feedback and returns an improved one,
    "Preserve everything the feedback does not ask to change - especially names and entries the user may have edited
    by hand." Same shape as WREC's revise session; confirms it for Start.
  - **Review before apply**: nothing touches state until the user presses Apply (replace or merge). Third repo that
    agrees with WREC's drafts.
- **Reading the card and lorebooks without dumping them.** "Deep context" (off by default, it costs tokens) sends the
  card's description and scenario, the persona, the author's note and only the *activated* lorebook entries, found by
  running the lorebook match against the recent chat plus the scenario text. Never a whole book. For Start from cards:
  match books against the interview answers and the card text, chunk what is left (as P3 step 3 plans).
- **Settings shape**: every feature has its own toggle (router, wizard, warnings, dice, transactions, context); two
  model profiles (an "agentic" cheap one for the loop, a strong one for the wizard) - the same split as our play and
  build models. They also say it plainly: "For the Scenario Wizard, choose a strong model with lots of thinking."
- **No prompt editing** by design ("I hate extensions that are filled with prompt fields") except custom fields. We
  decided the opposite (editable blocks with reset), but their reason is real: keep the editor behind a fold and
  show the default text first.
- Not taking: dice and skill trees (later layer only), the per-message DOM bubbles.

## Story Engine (ZDOSt) - no license, ideas only
A huge (about 2.5 MB of JS) deterministic RPG layer: a model fills a "semantic ledger" per turn, code runs rolls,
trackers, economy, injuries; then the narrator writes. Mostly the RPG layer, but its world memory is the best
off-screen model of the seven. Worth taking (as ideas):
- **Plans, not threads.** An off-screen plan is `{ id, kind: scheduled|npc|faction|power_actor, actor, objective,
  target, location, cause, resources[], prerequisites[], stage, stageLabel, status, nextCheckpoint (a clock),
  consequences[], evidence[] }`. Compare our front `{ name, goal, clock, size }`. Cheap upgrades for a front: an
  `actor`, a short `stageLabel` per tick ("scouts sent", "gate watched"), and `consequences[]` so a full clock has
  something concrete to do. Cap on plans (18) and on new plans per pass (2) - the same restraint as our 8 changes.
- **Grounded by quotation.** Every create or cancel must carry a `cause` or `reason` that copies a concrete phrase
  from the narration that justifies it. A cheap guard against invented plans: code can check the quote really
  occurs in the unread text and drop the change if not. Small models will fail it sometimes; make it a check that
  drops one change, not the whole run. Worth trying for fronts (a front may only be *added* with a quote).
- **Private by rule.** "WorldProgression is PRIVATE": hidden causes never go into the visible archive unless the
  narration shows them. Matches our Plot tab behind an author-view confirm.
- **Code advances, the model reports.** "Due-plan advancement is deterministic and already resolved before
  narration": the model creates and cancels plans; code moves clocks and decides what is due. The same split as
  Arbiter's threads (below). Our DM ticks clocks by asking the model each run; a code tick (with the model only
  adding fronts and saying why) would be cheaper, steadier on small models, and testable.
- **Never harm the player off screen.** "Off-screen consequences ... must never retroactively injure {{user}}, remove
  {{user}} possessions, force {{user}} actions". A good line for the director/antagonist levels' event rules (our
  antagonist rule says "hurts the characters": add that effects arrive as news, losses elsewhere or threats, not as
  already-done harm to the player).
- **The narrator sees a small slice.** Archive of 72 entries, narrator gets 8, evidence 2 per entry. Our book relies
  on keyword match for the same effect; keep it.
- **Descriptive archive: update in place, evidence quote per update, omitted details are preserved** ("output only
  new or changed facts"). Our `update` already does this; the evidence quote is the only new piece.
- **Opening override (the open need).** The engine does not touch the card. In an *empty* chat (no greeting at all)
  it offers "Start adventure": a one-shot hidden instruction sent as the first generation, built as `GENRE OPENING:
  You MUST begin in the selected genre: X`, one "Genre flavor" line per genre (fantasy "magic, myth, wilderness,
  old ruins, factions"...), a "PREMADE CHARACTER RULE" (keep the character's body, gear, backstory; the opening
  "may relocate, reveal, pressure, or contextualize"), and a reminder "Begin the opening scene now. Do not explain
  the setup." The result is a real message in the chat. It arms only when the chat has no messages: a card greeting
  means the card already opened the scene. Take: (a) an opening is one *generation* with a hidden instruction, not
  a swap of the card's text; (b) the genre-flavor lines are a ready model for our recipe "tone" options; (c) the
  "premade character" clause is exactly what a world built from a card needs.
- **Small models.** A structural repair step (`repairUnambiguous...`) fixes only what has one right answer and never
  invents rows; one retry when the ledger is structurally invalid, before narration. Same rule as our retry-once.
- Not taking: the rank/stat/economy engines, the 800 KB of tracker code.

## StateSmith (Atlas4285) - AGPL-3.0
A per-chat tracker: the user defines fields (number, progress, text, toggle, tag, dropdown); the model updates them
through **one function tool** `update_state` whose JSON Schema is built from the fields. Worth taking:
- **Field definition as data**: `{ name, label, description, type, config {default, min, max, options, maxLength} }`
  and a published JSON Schema for the config file. A World "custom tracker" (a weather, a faction standing, a day
  counter) in a recipe or profile can use exactly this shape; the schema also gives free validation of shared files.
- **The state goes in as JSON, one prompt with `{{state}}` and `{{toolName}}`, injected at depth 0 as a system
  message**; the tool description lists the fields through `{{fields}}`. The default text is two short sentences:
  "Treat these values as authoritative ... submitting only the fields that are about to change." Good wording for
  how the writer reads our records.
- **Only changed fields are sent**; a change that no longer fits a redefined field falls back to the default. Same
  tolerance we need when a profile's block list changes under a chat.
- **Export/import one config per file**, confirm before overwriting a same-named one. Matches the saved-worlds
  library export.
- Function calling needs a model that supports it; their README warns about it. Free OpenRouter models often do
  not, so for us tools are an option at most. JSON or tags in text stays the base.
- State lives in the chat's metadata as the latest snapshot, no history. We keep a log; fine.

## Forged by Primus (Manjove1) - all rights reserved, ideas only
Not code: a prompt "portfolio" for one fixed setting (Transformers): a director prompt that calls modules, a
gated character creation, a state footer, a recovery protocol. As documentation of failure modes it is useful.
- **Director plus modules called by name** (`[CALL: ...]`, with a fixed priority order when several apply). For us:
  profile blocks, each switchable, with an order. Same as WREC's block list; nothing new, a confirmation.
- **State footer as an anchor**: a short mechanical line the writer repeats, "the most recent footer is the absolute
  truth", and "Summaries must NEVER alter numerical values" (state is rebuilt from the footer, not the summary).
  For us: clock values and the pending event are in the state file, not in the chat, so a summary cannot drift them.
  Worth keeping that way (do not let Litopys or a summary carry clock numbers).
- **Core cast rule**: add to the core cast only if at least two criteria hold (appears across missions, has ties,
  stays relevant, would be missed); keep only while two still hold; a captured or missing person stays, marked
  "temporarily unavailable". Better than "matters beyond this scene" for deciding which records to keep, and the
  "unavailable" mark fits records (a status, not a retire). Our `retire` has only gone-for-good.
- **Gated creation**: one question per message, a silent checkpoint, 12 steps, a final export for the user to confirm
  before the story starts. This is the chat-style interview we decided *not* to do (decision 5: a form). Their
  own notes say batching and skipping were the failure; a form has neither. Keep the form. Take the last step: a
  summary of the built world the user confirms before play.
- **Era scripts** (Golden Era, Cybertron War, War on Earth): one big setting file per period, called only when
  active. Maps to a *recipe or saved world per era* with its own section prompts; also to "Remix: change the era".
- Nothing to port: the text is all rights reserved.

## Arbiter (brucestarkallen) - no license, ideas only
Dice-based outcome referee plus a background world: "World Threads" and three event tiers. The RPG parts are for the
later layer; the background world is for us now.
- **Code rolls, the model only classifies.** A free local gate (verb heuristics, no model) decides whether a message
  could be a risky attempt; about 90% pass untouched. If it may be, a tiny call (about 400 in, 120 out, "STRICT
  JSON", own connection profile) returns the *parameters*; the extension does the math and the dice. Binding result
  injected for one generation only, cleared after, "never saved into your chat". Later layer: this is the shape for
  skill checks, and a free pre-gate is how to keep a per-message call off most messages.
- **Threads as ladders.** `{ name, desc, rung, maxRung 5-12, bias -3..3, pace 1-10, lastTickAt, done }`. On a
  quiet turn, every `pace` turns, code rolls once: bias tilts the odds; a good roll +1 rung (a great one +2), a
  disaster -1. **No model call per tick.** Compare our fronts: `clock/size` is the same ladder, but ticks come from
  the model. Take: `bias` and `pace` fields, code ticks, and a **setback** (-1) so a front can lose ground (ours
  only goes up).
- **Hint strength follows the rung**, a fixed three-step table: under a third "a subtle sign or secondhand rumor",
  under two thirds "a visible development or a direct brush with it", above that "an unmistakable escalation". Add
  to our soft/hard event text: the clock position picks the wording, so the same front reads differently at 2/6
  and 5/6. Completion: "it's no longer deniable. Bring it into the open this scene or the next."
- **At most one hint per turn, by priority** (completion > collision > world shift > encounter > progress >
  surprise); the rest advance silently and are logged; no hints during a fight; the same hint replays on a swipe.
  We already send one event; the priority list is the missing rule once code ticks several fronts.
- **Collision**: two threads advancing in one tick roll against each other, the winner +1, the loser -1, and the
  friction is shown. A cheap way to make fronts interact without a model call.
- **Pity timer** for random events: three tiers (ambient, encounter, world) whose chance rises every quiet turn
  and resets when fired. "The longer nothing happens, the likelier something fires." For the director level,
  "event every N replies" is the dumb version; a pity timer is the smooth one.
- **Seeding is the only model call** and it is story-aware: one prompt reads the transcript and memory and returns
  threads, a pool of concrete encounters and a pool of world events ("each SPECIFIC to this story's setting, cast,
  tone... never generic filler"). Pools are consumed once, then refilled. This is "build the first fronts and a
  deck of events when the world starts": a good shape for our Start output (`fronts` plus an `events` deck) and
  it lets play run on fewer calls. The prompt also says "Do NOT include the player's own active goals - all of
  these are what moves WITHOUT the player."
- **Rewind**: every turn commits a snapshot, last 12; deleting messages or branching rewinds threads and engines to
  the surviving timeline; an edited resend never double-applies a tick. Same finding as Game Manager.
- **Small-model output**: `extractJsonCandidates` scans for several balanced `{...}` objects, strips code fences,
  and tries each: thinking models write reasoning with braces before the real object. Our `parseReply` should
  do the same (take the last parseable object that has our keys), not only the first.
- Not taking: the rating scale and duel/battle/war engines (later layer).

## MazeMaster (mechamarmot) - AGPL-3.0
A roguelike maze game inside ST with mini games (turn-based, QTE, dice, stealth, puzzle, negotiation). The model
only writes flavor. Only for the later layer:
- **Everything mechanical is a named profile in data**: themes x difficulty tiers (31 profiles per encounter type),
  combat profiles, quest profiles, XP rates, all selected by name and listed automatically in the UI ("custom
  profiles appear automatically"). The same pattern as our built-in `_` profiles plus user copies.
- **The model never owns a result and always has a fallback**: room text, minion names and the story intro are
  generated with a small token cap (`llmMaxTokens` 250, a 2-sentence prompt with `{{roomType}}`, `{{theme}}`,
  `{{sessionNotes}}`) and on any failure the original text is used. For us: every DM-written flourish (event text,
  record text) has a plain fallback and nothing blocks play.
- **Session memory**: events are stored as short notes and passed into later prompts as `{{sessionNotes}}`.
- **Fairness (pity) thresholds as profile data**: key pity after N chests, healing boost under an HP fraction,
  mercy unlock. Tunable per difficulty. Reuse the idea for loot and rolls in the RPG layer.
- Quest profiles that *gate* zones instead of clearing rooms: a quest is a clock-like gate. Fits fronts: a front's
  full clock can unlock a place.
- Not taking: the renderer, the mini games, the 2.5 MB bundle.

## The open need: override the card's scenario and first message
What each repo does about it:
- **None rewrites the card.** Game Manager and StateSmith ignore the greeting; Game Manager's guard skips the
  greeting when it arrives. Arbiter and MazeMaster do not touch it.
- **Story Engine's way is the one to copy**: leave the card alone, let a hidden instruction produce the opening as a
  new generation, only when the chat has no opening yet (see above).
- Our options, mapped:
  1. **Chat-level override fields**: the chat stores `scenarioOverride` and `firstMessageOverride`; the prompt
     builder uses them in place of the card's `scenario` and `first_mes` when set; the card file stays untouched
     (the chat's own copy, like a saved world's own copy). The greeting is written as the chat's first message at
     chat creation (the New chat step).
  2. **A generated opening**: the build model writes the opening from the world plus the card (Story Engine's
     "GENRE OPENING" plus "PREMADE CHARACTER RULE" shape), the user reviews it as a draft, then it becomes the
     first message. Same review step as other Start drafts.
  3. The scenario text can also live as a first record of the world (kind `scenario`) that the DM keeps current;
     then the card's scenario is switched off for that chat. Needs a per-chat "ignore the card's scenario" flag.
  Recommended: 1 plus 2. The override is plain data on the chat; the generation is optional.

## What this changes in our plan
Stage 1 (section shell, Runs, token control):
- `parseReply`: scan for several balanced objects, strip fences, take the last one with our keys (Arbiter).
- The system prompt says outright that "nothing changed" is the normal answer (Game Manager).
- Run history keeps whether the run changed nothing: most runs should cost little; show "quiet runs" separately.
- Decide rollback: a swipe or delete of the reply that carried an event or a clock tick should rewind the world to
  the state before that reply (snapshots, last 5-12). Not in P3 unless the user wants it; open question.

Stage 2 (Records, profiles, prompts):
- Profile blocks stay as planned. Add two cheap block types: **"Improved Grounds"** (push toward stakes) and a
  **hint-by-position** block (the three-step wording table) as editable text, not code.
- Fronts get optional fields: `actor`, `stageLabel` (what the last tick was), `consequence` (what a full clock does),
  `pace` (stated tick rate), and a profile default `bias`. Records get a status `unavailable` besides `retire`.
- Move clock ticks into code as an option per profile: "model ticks" (today) or "code ticks every N replies with
  bias" (Arbiter). Model only adds fronts and says why. Default stays today's behaviour until tested.
- Fronts may only be added with a short quote from the text (Story Engine), as a check that drops one change.
- Events: hint wording follows clock position; at most one event per run (already true); add the priority order
  once several fronts are due. Antagonist/director rule: losses and pressure arrive as news or threats, never as
  harm already done to the player's character.
- Two named injection channels in the Prompt peek and the Inspector: "persistent" and "one-shot", each shows 0
  tokens when empty (Game Manager).
- Records tab: "what the writer sees" preview with token count (round 1) stays; add the **roster** idea: main
  cast full, the rest one line.

Stage 3 (Start):
- Start from cards: use lorebook **match** against card text plus interview answers, not whole books (Game Manager
  deep context); chunking as planned.
- Build output = records plus first fronts plus an **events deck** (3-6 encounters, 2-4 world events, concrete to
  this world, consumed once, refilled when empty) in one build call (Arbiter seeding). The deck makes play cheaper.
- A **refine** call: the user types feedback, the build model returns the changed set, "preserve everything the
  feedback does not ask to change" (Game Manager, WREC). Review before apply; Apply = replace or merge.
- Recipe options as one-line prompt blocks with a checkbox: Improved Grounds, Skip characters, tone/genre flavor
  lines (Story Engine). Keep the interview a form; end it with a summary the user confirms (Forged).
- Opening override: chat-level `scenarioOverride` and `firstMessageOverride`, an optional generated opening
  written by the build model with the "keep the premade character" clause, shown as a draft. Needs a short
  design note and a decision from the user (card format is untouched, so no card-skill change; the chat meta gains
  two fields, so DATA-FORMATS.md gets a line).
- Saved worlds export/import one world per file with a confirm on overwrite (StateSmith). Optional JSON Schema
  for the world file so shared worlds validate.
- Open: a second output format for small models (round 1) now has three votes (CREC, Game Manager tags, Arbiter's
  tolerant JSON). Cheapest first step is the tolerant JSON scan; tags only if free models still fail.

Later RPG layer (`.fork/handoff/rpg-layer/IDEAS.md`; mention only, not edited here):
- Code rolls, the model classifies (Arbiter): a free pre-gate, then a tiny call returning parameters; binding
  result injected one-shot and never saved in the chat.
- Mechanics as named data profiles with auto-listed user copies (MazeMaster), pity thresholds in the profile.
- Custom trackers as field definitions with a JSON Schema (StateSmith); function calling only as an option.
- Optional deterministic plans (Story Engine) when the RPG layer wants stricter off-screen rules.
- Snapshot per message with rollback (Game Manager, Arbiter) becomes necessary once numbers exist.
