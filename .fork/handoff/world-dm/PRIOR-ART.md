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
