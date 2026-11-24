# Direction phase 3b: people of the World in beats and rules (#496)

Owner's decisions (2026-11-22, asked at the start of 3b): the people come only from the World's bench (its person records), not from the
cast deck; both beats and genre rules can bring them (a rule's choice "Who comes": members / World people / either, default members, so
nothing changes until it is picked); the director is asked about them only for the one reply that carries the note. Roleplay branch
`claude/direction-phase3b`.

## What is built (engine side; Roleplay `plugins/direction/plugin.js`, tests `test/rp-direction-world.test.ts`, 12)
- **People.** `worldPeople` reads `world/state/<chatId>.json` (read only; plugins do not import each other): active `person` records
  with an id `n<digits>` that are not the player and not a member of the group (a member's or the player's name or alias on a record
  means it is that person). `[{ id, name, names, text (first sentence, 160), noReturn }]`, at most 60. A rule's pool (`npcPool`) leaves
  out `noReturn` people and people the Dashboard's newest `present` already names; a beat the player writes may name any of them.
- **Data.** A beat has `npc: [id]`; a rule edit has `from: members | world | any` (`FROMS`); a fire and a queued `next` have `npc: [id]`
  (a note may be a World person alone); a report has `others: [id]` only when the director was asked.
- **Who a rule picks** (`pickWho`, used by `evalRule` and "Fire now"): members (the longest away first, exactly as in phase 2), one
  person of the pool (seeded shuffle), or either (a coin from the seeded generator when both exist). Nothing available = the rule does not
  fire; Fire now says "nobody from the World can come".
- **The note.** `ruleNote` / `beatNote` name the person and add "Who: <name> (<first sentence of the record>). They are not one of the
  group: play them from this description, in character." (`aboutNpc`). The engine's `directionScene` is unchanged: a World person has no
  card, so nothing is counted as present for them.
- **The judgement.** The director reports only members, so for the one reply that carries a note naming World people `inputFor` adds a
  line to the director's prompt ("others: of these people, who are not members: ...") and `{ "others": [...] }` to its answer
  (`buildPrompt({ others })`, `parseReport`, `matchNpc`); `judgeNext`: `came` = named in `others`, `mentioned` = the name or an alias is in
  the reply's text, `sent` = a beat with nobody named, else `missed`. Every other reply's prompt is unchanged.
- **Routes.** `PUT /direction/plan` beats may carry `npc`; `PUT /direction/rules` rule edit may carry `from`; `POST /direction/fire`
  (beat or rule) uses them; `GET /direction/state` returns `world: { people: [{ id, name, text?, noReturn? }] }`, every rule item has
  `from`, every plan beat has `npc`, `next` and `fires` have `npc`, log lines `rule` / `beat` / `result` may have `npc`.

## UI plan (text; `ux-review` section 1)
- **Beat editor.** "Who takes part" keeps the member chips and gets a second group "People from the World" (the same chips; hint: they
  come in for the beat; nobody here has a card for them, the note says who they are; a `noReturn` person is marked). No people in this
  chat's World: one visible line says so (and that the World keeps them). The beat card's "Takes part" lists both; an id no longer
  in `world.people` reads as "someone who has left the story".
- **Rule card.** A segmented row "Who comes": Members / World people / Either, between the status line and "Numbers"; one hint line;
  with no people in the World the two other options are disabled with the visible reason; disabled while the director is off or has no
  model (like the rest). "Restore defaults" resets it to Members. Sent with `setDirectionRules(chatId, { rule: { id, from } })`.
- **Callout, chip, log, mark.** Names of a firing's people include the World people (looked up in `world.people`; fallback the id as
  "someone"); the act lines ("Mr. Sato comes back into the scene") work with a person who is not a member.
- **States.** Older plugin without `world`: nothing new shows. Phone: rows 40 px or more, no sideways scroll.
- Strings in English and Ukrainian (`dir.*`); Ukrainian calls a beat "момент".

## Left on purpose (3b)
The cast deck's people (a card is "who is this?", not the player's choice); making an NPC a member; a rule bringing several World people;
World learning that Direction brought someone (its own bench gap and silence follow the Dashboard as before); an NPC leaving the scene.

## Not checked yet
A real model: does the note make it bring the person in; does the director's `others` agree with the reply; free models may ignore the
extra line (then `mentioned` is the best result).
