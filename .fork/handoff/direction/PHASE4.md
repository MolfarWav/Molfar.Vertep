# Direction phase 4: more genre sets and a draft of a plan from the cards (#496)

Owner's decisions (2026-11-22, asked at the start of phase 4): the new genres live on a wider list of scene kinds (he asked for
harem, slice of life, drama and "more: thriller, detective, explicit, whatever else fits"); the draft is a list of beats written by a
model from the members' cards that the player trims (rules are not model-written; they stay built-in sets); the model is the director's
model. Roleplay branch `claude/direction-phase4`. All numbers (needs, cooldowns, payoffs) are my first guesses, tuned in play.

## What is built (engine side; Roleplay `plugins/direction/plugin.js`, tests `test/rp-direction-sets.test.ts`, 23)
- **Nine sets** (`SETS`): romcom, harem, slice, drama, thriller, detective, steamy ("Steamy romance": night, secret and downtime kinds;
  the owner's "explicit" request, named by what its rules do), adventure, horror. Each has three rules (the same closed conditions and
  the same three actions as in phase 2), `tags` (extra scene kinds), and three beat `templates` (`{ id, text, when, wait }`, no names).
  As before, no rule fires in an explicit Dashboard scene: the guard is unchanged.
- **Scene kinds.** `BASE_TAGS` (the ten of phases 1 to 3) + `EXTRA_TAGS` (work, meal, downtime, argument, travel, danger, investigation,
  secret, night). The director's prompt offers the base list plus the chat's set's own kinds (`tagsFor(setId)`); a chat with no set, or the
  rom-com set, gets the phase 1 prompt text unchanged. `TAGS` (all) is what a report, a rule and a beat may hold.
- **Routes.** `GET /direction/sets` (`{ sets: [{ id, name, tags, rules: [{ id, name, kind }], templates: n }] }`, no chat needed: the
  group editor uses it); `GET /direction/state` now returns `plan.tags` (the chat's offered kinds), `plan.templates` (the set's beat
  templates, `[]` with no set), and `defaults` on every rule item (`{ need, cooldown, k, m, from }`: the built-in numbers, so the client
  needs no copy); `POST /direction/draft { chatId }`: one call on the director's model (`direction_draft`, one retry on an empty or
  rate-limited answer) that reads each member's name, description and personality (700 characters each) with the genre name, the
  offered kinds and the plan's existing beat texts; answers `{ ok: true, beats: [{ text, who, npc: [], when, wait: true }], model }`
  (5 to 8 beats; `when` is `replies` n 1 to 60 or a `tag` from the offered list; names become member ids; repeats of the plan are
  dropped) or `{ ok: false, reason: no-model | not-group | no-chat | bad-reply | empty | error, message? }`. Nothing is saved: the client
  adds the beats it keeps with `PUT /direction/plan`.

## UI plan (text; `ux-review` section 1)
- **Genre picker.** Nine genres do not fit a segmented row: the Rules tab's genre row becomes a select (None first; the plugin's `sets`
  from the state; names through i18n keys when there are some, else the plugin's name), same behaviour as now (picking turns the rules
  on). The group editor's Direction tab default genre reads `GET /direction/sets` (fallback to the rom-com entry when the route is
  missing) in the same select. `RULE_DEFAULTS` in the client is replaced by `rule.defaults` from the state (keep the old table only as a
  fallback for an older plugin).
- **Rule cards of the new sets.** The one-line sentence is composed from the rule's `when` and `kind` (new small keys for: alone with
  one member for N replies, nobody around for N replies, the scene is one of these kinds, at most N here; and the three actions), so
  27 rules need no 27 sentences; the three rom-com rules keep their own sentences. Rule and set names: i18n keys `dir.set.<id>` and
  `dir.rulename.<id>` in English and Ukrainian, fallback the plugin's name.
- **Scene kinds.** The nine new kinds get `dir.tag.<kind>` words (English, Ukrainian) wherever tags are shown (the scene chip, the
  beat editor's Scene select, rule sentences, the log). The Scene select lists `plan.tags`.
- **Plan tab: ready-made beats.** Beside "Add beat" a secondary button "From the genre" opens a list of the set's `plan.templates`
  (text and its "when" in words; a tap picks one) and opens the inline beat editor prefilled (text, when, wait) so the player adds who
  takes part and saves. No genre picked: the button stays visible but disabled with a visible line "Pick a genre in Rules to get
  ready-made beats". An already used text is marked "in the plan" and not offered again.
- **Plan tab: draft from the cards.** A button "Draft from the cards" (outline, with an icon) beside the others: one call (10 to 60
  seconds on a slow model), shown as a busy button "Reading the cards…" that cannot be pressed twice; no director model picked: disabled
  with the visible reason "Pick a director model first"; an error: the plugin's message in a toast plus a visible one-line reason in the
  tab (empty, unreadable answer, failed call). The result opens as a "Draft" card above the list (not saved, said in a hint: closing the
  sheet drops it): one row per beat with a checkbox (all ticked), its text, who takes part (names), its "when" in words; "Add N to the
  plan" (primary, disabled while none is ticked, with the 20-beat cap's visible reason when the plan would overflow) and "Discard".
  Added beats append to the plan (one `PUT /direction/plan` with the existing beats and the kept ones, no ids on the new ones). The
  player edits them afterwards like any beat.
- **States.** Older plugin without `plan.templates` / `sets`: nothing new shows. Phone: rows 40 px or more, no sideways scroll, the draft
  card scrolls with the tab.
- Strings in English and Ukrainian; Ukrainian calls a beat "момент".

## Left on purpose (4)
Rules written by the player or by a model, and their editor; per-set conditions beyond the closed list (place, time, warmth); the
`leave`, `spotlight` and `event` actions; translating a beat template's text (the notes and the story's texts are English anyway);
sharing sets (Store); a Scene tab; editing a drafted beat before adding it.

## Not checked yet
A real model: is the draft sensible and in the cards' voice; do the nine sets' numbers feel right; does the director use the new kinds
well (a free model may stay on the base list); does a set's wider tag list cost accuracy on the base kinds.
