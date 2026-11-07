# Task for Molfar: two agents that help a weak model keep a card's rules

Paste everything below the line into Molfar's chat (the agent page).

---

Build two Roleplay agents with your `agent-craft` skill. Read the skill first and follow its procedure: copy the closest recipe, write each agent as one draft in `apps/roleplay/data/agents/drafts/<id>.vertep-agent.json`, run `agent_dry_run` on a real chat (no `live`), fix, then hand them over. Answer me in Ukrainian.

**Why.** A player runs a long roleplay with strict rules in the card and lorebook. Strong models keep them; cheaper ones (GLM and similar) break them: they say the name of a character the others never name, call him "he" instead of "it", and play jealous, unstable characters as calm and reasonable people who ask permission and back off. A rule written at the top of the card is tens of thousands of tokens away from the reply in a long chat. These agents put the rules right next to the reply, and point out a broken rule as soon as it happens. Both must be generic: other players will install them from a file, so nothing about this one story is hard-coded except the example values I name below.

## Agent 1: `rule-keeper` ("Rule keeper")

- **Trigger:** `before`, every reply, the reply waits (the default). No model call at all: only a Script card, so it costs nothing and adds no noticeable wait. `limits.maxCalls: 0` if the checker allows it; otherwise say what it wants.
- **Input:** `lastReply` only. Do not check `lastUserMessage`: the player may use the name themselves.
- **Script card**, with two constants at the very top of the code, each with a one-line comment telling the player to edit them:
  - `FORBIDDEN`: words the characters must never write, for example `["Kenji", "Kenji's"]` (an example only; say in the comment that the player puts their own words here).
  - `RULES`: the rules to repeat before every reply, 1 to 6 short lines, for example: `"Never say the name of the man the characters despise. Call him it, that, or trash. Never he or him."`
  - Match `FORBIDDEN` case-insensitively on whole words, Unicode-safe (no `\b`: use a letter class with the `u` flag, so Cyrillic and Japanese names work too).
  - Outputs: `reminder` (text, always: `RULES`, plus one extra line when a word was found: `In your previous reply you wrote "<word>". That breaks the rules above. Do not repeat it.`) and `warning` (text, **only** when a word was found; leave it out of the returned object otherwise, so the note card is skipped).
- **Outputs:** `prompt-insert` from `reminder` (label "Rules", shown in the inspector); `note` from `warning` (title "Rule keeper", text like `The previous reply wrote "<word>". Swipe or edit it.`).
- **He/him is not checked by the code:** the check would also fire for every other man in the story. It stays in `RULES` only. Say this in the description.
- **Dry run:** once with a word that really appears in the last reply of the chat you test on (so the warning branch fires), once with a word that does not (no note, the reminder alone). Then put the example values back.
- **Check one more thing:** open the Canvas Prompt board for that chat (or read the dry run) and tell me where the `prompt-insert` lands in the request: near the end, after the history (what we want), or near the top. If it lands near the top, say so plainly; do not work around it.

## Agent 2: `temperament` ("Temperament")

- **Job:** keep a jealousy / instability meter for the character and turn it into a concrete instruction for the reply, because weak models smooth adjectives like "unstable" and "jealous" into calm behaviour but follow a plain stage direction placed right before the reply.
- **Trigger:** `before`, every reply. One `model.ask` (role `fast`, `maxTokens` about 60, JSON only, answer an `enum`), so `maxCalls: 1`. In the hand-over, tell me the cost: one extra call per reply, and on free OpenRouter models it eats the daily request limit; suggest `everyN: 2` for players on free models.
- **Input:** `lastUserMessage` and `lastReply`. No `history`.
- **Question:** which of these the player's last message shows: `hesitates` (holds back, says no, wants to slow down), `other` (attention to someone else, mentions another person warmly), `close` (affection or closeness toward the character), `none`. The model names the event; it never counts.
- **Own state:** `heat`, number 0 to 10, start 3. `hesitates` +2, `other` +3, `close` -1, `none` -1. The code counts with `state.add`; min/max clamp it.
- **Hint:** three bands by `heat` (`logic.if`, then a `text.template` per band, merged into one `prompt-insert`, label "Temperament"):
  - 0 to 3: the character is intense and takes the initiative; acts on impulse rather than asking.
  - 4 to 6: jealousy shows in what they do; they do not wait for permission and do not step back when {{user}} hesitates; their reasoning is emotional, not sensible.
  - 7 to 10: they are barely in control; possessive, unpredictable, no calm explanations; they push instead of retreating.
  Word each band as a short stage direction in English, about the character's behaviour and emotions; keep it about initiative, jealousy and instability, nothing explicit. Use `{{char}}` / `{{user}}` only if the app fills them in a template; check that in the dry run and use plain words if it does not.
- **Panel:** a `meter` bound to `heat` in `top1`, titled "Temper".
- **Dry run:** pass `replies` for the model card with each enum value, an empty answer and a nonsense answer; the meter must move as described and nothing may crash on the bad answers.

## Hand-over

For each agent say in plain words: what it does, model calls per reply, the permissions it asks for, what I will see after a reply and where, what the dry run showed, and how the player edits `FORBIDDEN`, `RULES` and the band texts later (the editor's Card tab). Then tell me how to export each one as a file ("Export as a file" in the editor) so I can send both to the player.
