# Personas, the character Profile and Soul, and the small plugins (profile, polish, tools)

Verified at: molfar.vertep-roleplay 607147f

## What it does
- A persona is the user's side of a chat, stored as `data/personas/<id>.json`; its description reaches the prompt in a knowledge frame.
- The Profile tab's fields compile into the card's `description` and `personality`, which the prompt and exports use.
- The profile plugin's Structure it and Fill empty calls file drafts for the user to accept. Persona ideas and the portrait prompt file nothing.
- The Soul (`extensions.molfar_soul`) is separate: the Soul tab writes it and the relations plugin rates it.
- Polish rewrites the player's draft before sending. The tools plugin defines the tools a model can call during a reply.

## Owners
- `src/lib/persona-new.ts` `fieldsFor`: which profile sections the interview fills, by detail level.
- `src/lib/persona-new-api.ts` `structurePersona` and `fillPersona`: call `/profile/structure` and `/profile/fill` for a persona.
- `src/components/persona/persona-new-interview.tsx` `PersonaNewInterview`: runs the interview from idea to saved persona.
- `src/components/persona/persona-questionnaire.tsx` `PersonaQuestionnaire`: the numbered questionnaire.
- `src/components/persona/persona-tabs.tsx` `'bindings'`: binding mode, auto-lock and bound characters.
- `src/lib/store.ts` `newChat`: picks the persona for a new chat from its bindings.
- `plugins/engine/plugin.js` `chatPersona`: finds a chat's persona. `personaFrame` wraps its text for the prompt.
- `plugins/profile/plugin.js` `handleRoute`: every `/profile` route. `SYSTEM`, `FILL_SYSTEM` and `cleanProfile` shape the calls.
- `plugins/profile/plugin.js` `resolveTaskModel`: picks the card-task model. `draftFromReply` files the draft.
- `src/components/character/profile-tab.tsx` `ProfileTab`: the Profile tab, which renders `ProfileForm`.
- `src/lib/profile.ts` `normalizeProfile` and `compileProfile`: profile to text.
- `src/lib/soul.ts` `SOUL_VERSION`: the Soul module the Dashboard uses.
- `plugins/letters/plugin.js` `hasSouls`: reads `molfar_soul.characters`.
- `plugins/engine/plugin.js` `talkativeness` and `guessTalkativeness`: a group member's speaking weight. `src/lib/talkativeness.ts` `guessTalkativeness` is its UI copy.
- `plugins/polish/plugin.js` `polishRoute`, `polishModel`, `cleanPolish`, `DEFAULT_POLISH`; `src/lib/seed.ts` `DEFAULT_POLISH_PROMPT` mirrors it.
- `plugins/tools/plugin.js` `appTools`, `handleTool`, `rollDice`, `runCustom`, `BUILTINS`.
- `plugins/engine/plugin.js` `toolX`: copies a reply's tool trace onto the message. `src/lib/types.ts` `tools?:` holds it.

## Personas
- The file is `personas/<id>.json`. Fields: `name` (it stands for `{{user}}`), `description`, `title`, `pronouns`, `avatar`, `lorebookIds`, `binding`, `boundCharacterIds`, `autoLock`, `folderId`, `createdAt`, and an optional `profile`.
- Made in three ways. Blank: the default values in the new-persona dialog. Interview: the idea or picture goes to `/profile/persona-ideas`, the chosen draft is saved with `addPersona`, then `structurePersona` files a structure draft and `fillPersona` (merge) adds the sections `fieldsFor` picks. Questionnaire: the numbered form in `PersonaQuestionnaire`.
- Binding modes: `default` (picked by hand), `character` ("Lock to character", for the characters ticked in `boundCharacterIds`), and `chat` (saved, but it does not change which persona a new chat starts with).
- `autoLock`: when two personas are bound to one character, the auto-locked one wins. `newChat` takes the auto-locked bound persona, else the first bound one, else the default.
- A chat's persona is `meta.personaId`, else `personaId` in `settings.json`. `chatPersona` returns it.
- Reaches the prompt: assemble sets `personaDescription` to `personaFrame(userName, description)`. The frame says the sheet is the narrator's knowledge and that other characters know only what the story showed. An empty persona adds nothing.
- The Life Book is not in this repo. A search of `src`, `plugins` and `docs` for "life book" or "lifebook" found nothing.

## Profile and Soul of a character
- Fields (`SHAPE` in `plugins/profile/plugin.js`): identity, appearance (height, weight, measurements among the text fields), lists (strengths, flaws, traits, values, fears and others), behaviors, goals, background, trauma, sexuality, and relationships. No field is called needs, preferences or braveness; `traits` is the closest.
- Stored as `extensions.molfar_profile`, with a hash of the compiled text so a hand edit is detected.
- Filled by Structure it (`/profile/structure`, which reads long cards in parts) and Fill empty (`/profile/fill`, which fills only empty fields and can take a portrait). The model comes from the request, then `characters/<id>/card-tasks.json`, then `ui.cardTasks.model`, then the Dashboard sensor model, then the app default.
- Read by the prompt, presets and exports through the compiled text. The talkativeness guess reads that text when the card has no talkativeness value or the unset 0.5.
- The Soul is read by the Dashboard (`src/lib/soul.ts`) and by Letters (`hasSouls`). No Dashboard component was found reading the profile fields.

## The polish plugin
- `POST /polish/chats/:id` with `{ text, model? }` runs the draft through the chat's model with the preset's `polish` prompt, else `DEFAULT_POLISH`. It returns `{ text }` and stores nothing; the composer keeps an Undo.
- The draft may be 8000 characters at most. The model also sees recent messages and the character names, for tense and style.
- Temperature 0.7. Two passes, as in the other routes. `cleanPolish` strips fences and lead-ins; an empty answer is an error.

## The tools plugin (tools, dice, custom tools)
- Definitions are JSON files in `data/tools/<id>.json`; `BUILTINS` seeds the built-ins. `appTools` returns the enabled ones for a reply the engine marks `wantsTools`.
- `handleTool` routes by name: dice (`rollDice`), picture (drawn after the reply lands), toy control (`controlToy`), or a custom tool (`runCustom`, which runs the stored handler text).
- Dice: `roll_dice` takes `count` (up to 20), `sides` (up to 1000), `modifier` and an optional `dc`. It uses `Math.random` with no seed, and it is off by default.
- Each call and its result are kept on the reply through `toolX`.

## If you change X, also touch Y
- The persona frame text (`personaFrame`): the litopys `PERSONA_MEMORY_RULE` and the presets' own lines (docs/COUPLINGS.md, "The persona text carries a knowledge frame"). Run `test/rp-persona-frame.test.ts`.
- The profile fields (`SHAPE`, `FIELDS`): the prompts, `src/lib/profile.ts`, and docs/DATA-FORMATS.md.
- `DEFAULT_POLISH`: `src/lib/seed.ts`. `test/rp-polish.test.ts` checks that the two are equal.
- The talkativeness rule: the engine copy and `src/lib/talkativeness.ts`. `test/rp-talkativeness.test.ts` compares them.
- The dice (`roll_dice`): do not feed it into the World DM check (docs/COUPLINGS.md, "Two kinds of dice").
- The binding rule: `newChat` in `src/lib/store.ts`, and the fallback in `chatPersona`.
- The Soul fields: docs/SOUL.md, `src/lib/soul.ts`, `hasSouls` in letters, and the relations plugin.

## Traps
- The profile plugin never writes a card or a persona, and it never writes `molfar_soul`. Only the Soul tab writes the Soul.
- A card's compiled text is overwritten on the next save after a hand edit, once the app has asked.
- `chatPersona` must not call `chatUserName`: the comment in the engine says the recursion overflowed the stack.
- Helper calls with no chat leave `{{user}}` raw on purpose.
- Binding mode `chat` does not change which persona a new chat starts with.
- Editing the profile text changes group speaking weights for cards with no talkativeness value.
- The persona frame adds about 45 tokens to every request for every preset (docs/COUPLINGS.md).
- `roll_dice` is not seeded, so a swipe gives a new number. The World DM check is seeded.
- Custom tool handlers are stored code run with the host object. Treat imported tools as code.

## Tests that guard it
- `test/rp-profile.test.ts`, `test/rp-profile-structure.test.ts`, `test/rp-profile-ideas.test.ts`, `test/rp-profile-cast.test.ts`, `test/rp-profile-marks.test.ts`
- `test/rp-persona-frame.test.ts`, `test/rp-persona-new.test.ts`, `test/rp-persona-list.test.ts`, `test/rp-persona-page.test.ts`
- `test/rp-polish.test.ts`, `test/rp-tools.test.ts`, `test/rp-dice-note.test.ts`, `test/rp-talkativeness.test.ts`, `test/rp-soul.test.ts`

## Not verified
- The Life Book: no match in `src`, `plugins` or `docs`, so I treat it as absent.
- The needs, preferences and braveness fields: no match in `src` or `plugins`.
- That the questionnaire has exactly five questions: `docs/DATA-FORMATS.md` says five; I did not count `QUESTIONS`.
- Which component draws tool results in the chat: I confirmed the `tools` field, not the renderer.
- The internals of the relations plugin's soul rating: I confirmed only the `soul/rate` route name.
- The test suite was not run.
