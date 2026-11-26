# Sola preset: observations and open questions (2026-11-26)

Handoff for whoever works on the built-in Sola next. Written from one long thread with the owner. Everything marked
"measured" comes from the saved chat files; everything marked "my reading" is a guess from the preset text, not a test.
No chat text or card names are kept here on purpose (the repo is public).

Shipped from this thread: Roleplay 4.163.0 (PR 215, merge `ae64c158`), issue #534 (language). Generator changes in
`.fork/tools/st-to-vertep/` (`sola_length.py`, `sola_v5_port.py`, `verify.py`).

## 1. What was measured: reply length across models

One chat (Russian, one card), the same preset (Sola V5 Flame, Mind Kitsune, Style Murakami, length Bookey 400-500),
same user message, models swapped on the same reply with swipes. "Story" is the words before `<sola_hud>`.

| Model | Story words | Wrote a sheet | Named the target | HUD / chatterbox / cue |
|---|---|---|---|---|
| Gemma 4 31B | 327-372 | yes | yes (~450) | all |
| Gemini 3.8 Flash (before the note) | 137-169 | no | no | all |
| Gemini 4 Argon (before the note) | 128-169 | no | no | all |
| MiMo 2.6 Pro | 174 | yes | yes (~400) | none |
| DeepSeek v4 Pro | 154 | yes | no ("length: usual") | none |
| GLM 5.3, card caps in place | 229 | partly | moderate | none |
| GLM 5.3, card caps removed | 280, 331 | yes | yes (~430) | all / all but chatterbox |
| DeepSeek v4.1 flash (after the note) | 273 | no | yes | none |
| Gemma 4 31B (after the note) | 365 | yes | yes (~450) | all |
| Gemini 3.8 Flash (after the note) | 426 | no | yes | HUD, cue |

Findings:
1. **The target lived only in the planning sheet** (SHAPE line), which a model writes in its thinking. Gemini has its own
   thinking and never wrote the sheet, so the target did not exist for it. Fixed in 4.163.0 by a plain depth-0 note taken
   from the pick (Vertep Medium's "This reply" pattern). Gemini: 137-169 -> 426.
2. **A card can cap narration.** A card (description and scenario) carried "narration will be kept short / not exceed 2
   paragraphs / never more than 2 segments of dialogue / not verbose". GLM quoted it in its reasoning and chose it over
   the preset. With the caps removed: 229 -> 280-331 and the HUD came back. Many third-party cards have such lines. The
   note now says it replaces card-side length limits; not yet measured on a card that still has the caps.
3. **Models that do write a sheet still undershoot by 20-35%** even when the sheet names the target (Gemma wrote "~450"
   and 365; GLM "~430" and 331; DeepSeek 273 for 400-500). Not fixed. Possible causes: the sheet splits the turn into beats
   ("one beat per 120-150 words"); the Murakami style allows "a pause can be the whole turn"; Russian words are longer than
   English ones, so the same text has fewer words (weakened by Gemini hitting 426 on the same Russian chat). Options: ask a
   little above the pick in the note (Vertep Medium's "Medium" asks 450-600 for "~500"); test with the Epic pick first.
4. **The sheet ignores its own size cap.** The preset says "under 200 words"; GLM wrote ~980 words of reasoning, MiMo ~330.
5. **HUD, chatterbox and cue are skipped by MiMo and DeepSeek**, and by GLM while the card caps were in. Unexplained for
   MiMo and DeepSeek. The HUD rule exists in two places (the Secret Drawer and a check line in the sheet), both in Sola's
   first-person voice, deep in the prompt. A plain format note at the end (story, then HUD, chatterbox, cue) would be the
   next thing to try; it was left out of 4.163.0 on purpose to keep one change at a time.
6. **Why Vertep Medium never had this**: its note is at depth 0, impersonal, comes from the selector, and its default pick
   is "Long" ("at least 700 words, aim 800-1000, a short reply is a failure"); the plan is capped at 50-80 words. Sola's
   400-500 and Medium's 700+ are not the same ask.
7. **Sola's language** was a switch that wrote a fixed "Spanish" line; with it off there was no language instruction at all,
   so models followed the user's messages. Replaced in 4.163.0 by a Story language choice like Vertep Medium's plus
   "Other" with a text box (#534).

## 2. The owner's observations (not tasks)

- **Vertep Medium**: writes long and well, but at some point the prose slides into descriptions of what characters wear,
  pressing a letter or some "important" object. Not alive. It does create many side quests.
- **Sola**: gives little room to clothing, precise and clear, does not loop on a detail. Quests close easily and simply,
  but she almost never creates side quests or secondary threads, which Vertep Medium did all the time.
- **Models**: Gemma is often too positive. Gemini 3.8 Flash can be sharper. Argon almost always ends with two hidden
  options you are supposed to pick from (not yet looked at in the raw text).
- Mind vs Style: the owner wants the conflict between them written down (below).

Ideas that follow, none started: a thread-producing nudge for Sola (a Desk or turn-director cue that opens a secondary
thread now and then, see issue #401 for the director); a wardrobe-budget line for Vertep Medium; look at Argon's trailing
options and decide whether a rule should stop them.

## 3. Minds and Styles: what they do and where they collide (my reading, not measured)

**Mind** (8 voices) is who Sola is: the voice of her planning sheet, HUD notes, chatterbox and out-of-character asides.
The prose is meant to be hers only indirectly ("the prose is the stage, I am not in it"). Each Mind has one sentence about
the story she wants, and that is what leaks into the prose:
Golden: small moments, the argument that is really about something else. Gremlin: fresh and punchy. Velvet: the story
should purr, never hurried. Riot: physical and heavy, cuts hesitation and cheap theatrics. Mystic: leaves gaps on purpose.
Scholar: language chosen with care, people who believe something. Kitsune: dramatic, tender, shameless, passionate to the
point of embarrassing. Doomer: slow burn, deeply invested in the characters getting something good.

**Style** (5 + Off) is a real prose rule list plus one "Voice Check" line in the sheet: Hemingway (short sentences, feeling
never named, starts at the action), McCarthy (stark, physical, no pity or caption), Murakami (cool, observant, slight
distance, unhurried, "a pause can be the whole turn", stillness means something), Steinbeck (plain vernacular, work and
land, humane without sermon), Chekhov (ordinary talk, missed wounds, anticlimax is correct, no speeches or confessions).

**Who wins when they disagree:** a Style is a bullet list of concrete rules, a Mind is one sentence of wish. In the prose I
expect the Style to win and the Mind to survive in the notes. The result is a split: quiet prose, cheerful notes. The
owner's chat is exactly that (Murakami prose; Kitsune sheet and HUD).

Collisions (Mind wish against Style rule):
- **Kitsune x Murakami** (the owner's current pair): "dramatic, shameless, passionate" against "cool, distance, stillness,
  a pause can be the whole turn". Also Kitsune x Chekhov (anticlimax, no confession), Kitsune x Hemingway (feeling never
  named) and Kitsune x McCarthy (no cushion). Kitsune sits well only with Steinbeck's warmth.
- **Velvet x Hemingway**: "never hurried, lamplight" against "start at the action, no throat-clearing". Velvet x McCarthy
  (no cushion). Velvet x Murakami agree (unhurried).
- **Riot x Murakami**: "heavy, a riff that lands" against "quiet, a pause is the turn". Riot agrees with Hemingway and McCarthy.
- **Golden x McCarthy**: kindness the character cannot accept against unsparing, no pity. Golden agrees with Chekhov.
- **Scholar x Steinbeck**: chosen, careful language against plain vernacular. Scholar agrees with Hemingway.
- **Mystic**: leaves gaps; agrees with Murakami and with Hemingway's iceberg.
- **Doomer**: slow burn; agrees with Murakami and Chekhov.
- **Gremlin**: punchy; agrees with Hemingway, fights the others.

Effect on length (the reason this belongs next to section 1): Murakami and Chekhov both permit a turn that is a pause or an
anticlimax, and Kitsune/Velvet add nothing that forces words. A pair that collides gives the model licence to settle on the
shorter reading. The depth-0 length note does not know about the style.

**Cheap tests to run next (same chat, same message, swipe on one model):**
1. Style Off versus Murakami: do the story words change? (Tests the "a pause can be the whole turn" effect.)
2. Mind Kitsune versus Riot with Murakami fixed: does the prose temperature change, or only the notes?
3. Length Novelistic Epic on Gemma: if 500-650 words appear, the undershoot is a calibration problem (ask above the pick).
4. A card that still has narration caps, with the 4.163.0 note: does the "replaces card limits" line win?

## 4. How to re-measure

Chats are `data/users/<name>/apps/roleplay/data/chats/<id>.jsonl` (one JSON per message) with `.meta.json` beside it.
Per character message: `swipes` (all variants) and `extra.swipeMeta[i]` (model, usage, params), `extra.reasoning` for the
current swipe (the sheet, when the model wrote one in `<plan>` or in thinking). Story words = words before `<sola_hud>`.
The prompt a model really got is in the prompt inspector (the eye button on the Molfar page, memory only): look at the end
of the last `app:roleplay/engine` request for `[This reply: ...]` and `[Language: ...]`.

## 5. Not done / not verified

- The new Story language choice was not looked at in the Preset panel in a browser (generic choice and text variables,
  the same as Vertep Medium's), and "Other" was not tried in a live chat.
- Existing imported copies of Sola in a workspace do not get the new sections by themselves; only the built-in `sola`
  refreshes on update. The owner's active copy got both by hand.
- The Vertep Lite test "stays light" (3007 tokens against 3000) fails on a clean main too.
