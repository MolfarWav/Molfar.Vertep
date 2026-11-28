# Personas, the character Profile and Soul, and the small plugins (profile, polish, tools)

Verified at: molfar.vertep-roleplay 607147f (the Personas section and the Lorebooks tab at branch claude/personas-import-463, 4ac7ac0); Fill empty, the Models panel and the Profile tab actions (#528 to #530) at branch claude/profile-fill-528-530, 8368f3f (Roleplay 4.162.0, PR 214 merged); the Soul rating model (#505) at 22071cf2

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
- `src/components/character/profile-tab.tsx` `ProfileTab`: the Profile tab, which renders `ProfileIntro`, `CardModelPanel`, `ProfileActions` and `ProfileForm`. The persona page does the same in `src/components/persona/persona-profile.tsx` `PersonaProfilePanel`.
- `src/components/profile/profile-actions.tsx` `ProfileIntro` (the line about what the fields write, and Free write) and `ProfileActions` (Structure it, Fill empty, Read from picture, each with the model it uses).
- `src/components/character/card-model-panel.tsx` `CardModelPanel`: the "Models" panel, the text model and "Reading the portrait".
- `src/components/character/structure-draft.tsx` `useVisionModel` (the card's picture model), `useFillEmpty` (splits one Fill empty into calls), `useProfileDraft` `runFillSteps` (runs them and chains them with `mergeAt`).
- `plugins/profile/plugin.js` `cardTextFor`: which pieces of a long card a Fill empty call sends.
- `src/lib/profile.ts` `normalizeProfile` and `compileProfile`: profile to text.
- `src/lib/soul.ts` `SOUL_VERSION`: the Soul module the Dashboard uses.
- `plugins/letters/plugin.js` `hasSouls`: reads `molfar_soul.characters`.
- `plugins/engine/plugin.js` `talkativeness` and `guessTalkativeness`: a group member's speaking weight. `src/lib/talkativeness.ts` `guessTalkativeness` is its UI copy.
- `plugins/polish/plugin.js` `polishRoute`, `polishModel`, `cleanPolish`, `DEFAULT_POLISH`; `src/lib/seed.ts` `DEFAULT_POLISH_PROMPT` mirrors it.
- `plugins/tools/plugin.js` `appTools`, `handleTool`, `rollDice`, `runCustom`, `BUILTINS`.
- `plugins/engine/plugin.js` `toolX`: copies a reply's tool trace onto the message. `src/lib/types.ts` `tools?:` holds it.

## Personas
- The file is `personas/<id>.json`. Fields: `name` (it stands for `{{user}}`), `description`, `title`, `pronouns`, `avatar`, `lorebookIds`, `binding`, `boundCharacterIds`, `autoLock`, `folderId`, `createdAt`, and an optional `profile`, `ownLorebookId` and (in an exported file only) `lorebook` (#463).
- The Lorebooks tab is the shared `BookLinks` list (`src/components/lore/book-links.tsx`, also the card's tab): the books the persona carries, not the whole library; an id the library lacks shows as a "Not in your library" row to unlink. `ownLorebookId` marks the one linked book that is the persona's own: it is also in `lorebookIds`, so the prompt engine is unchanged. `src/lib/persona-book.ts`: `bookSetOf` / `bookPatchOf` (tab to file), `personaForExport` (Export, Backup, the page's Export: the own book inline as `lorebook`), `adoptInlineBook` + `storeInlineBook` (import: a new id, a free name `Name (2)`, linked first, the old own id dropped). Restoring a backup over the same persona refills its own book instead of making a second one, unless a card or another persona carries it (`addRecords` in `personas-view.tsx`).
- Import (`importFiles`, `parsePersonaFile` in `src/lib/persona-new.ts`): an array is a backup and keeps its records whole; one object with a `name` and a `description` is one persona from another app and goes through `foreignPersona` (only name, description, title, pronouns, tags (also a JSON text), `lorebookIds`, a hex `dialogueColor`, `profile`); an object whose values are all strings is a `{ name: description }` map; any other object is refused. A persona that names books the library lacks is imported with a warning naming them. The New persona dialog's From a file uses the same reader.
- Made in three ways. Blank: the default values in the new-persona dialog. Interview: the idea or picture goes to `/profile/persona-ideas`, the chosen draft is saved with `addPersona`, then `structurePersona` files a structure draft and `fillPersona` (merge) adds the sections `fieldsFor` picks. Questionnaire: the numbered form in `PersonaQuestionnaire`.
- Binding modes: `default` (picked by hand), `character` ("Lock to character", for the characters ticked in `boundCharacterIds`), and `chat` (saved, but it does not change which persona a new chat starts with).
- `autoLock`: when two personas are bound to one character, the auto-locked one wins. `newChat` takes the auto-locked bound persona, else the first bound one, else the default.
- A chat's persona is `meta.personaId`, else `personaId` in `settings.json`. `chatPersona` returns it.
- Reaches the prompt: assemble sets `personaDescription` to `personaFrame(userName, description)`. The frame says the sheet is the narrator's knowledge and that other characters know only what the story showed. An empty persona adds nothing.
- The Life Book is not in this repo. A search of `src`, `plugins` and `docs` for "life book" or "lifebook" found nothing.

## Profile and Soul of a character
- Fields (`SHAPE` in `plugins/profile/plugin.js`): identity, appearance (height, weight, measurements among the text fields), lists (strengths, flaws, traits, values, fears and others), behaviors, goals, background, trauma, sexuality, and relationships. No field is called needs, preferences or braveness; `traits` is the closest.
- Stored as `extensions.molfar_profile`, with a hash of the compiled text so a hand edit is detected.
- Filled by Structure it (`/profile/structure`, which reads long cards in parts) and Fill empty (`/profile/fill`, which fills only empty fields). The model comes from the request, then `characters/<id>/card-tasks.json`, then `ui.cardTasks.model`, then the Dashboard sensor model, then the app default.
- The portrait goes only with the `appearance` fields (#528). `useFillEmpty` makes a text call (every other field, the card's task model, no picture) and an Appearance call (the portrait, the card's picture model, that model's own limits); the second names the first draft with `mergeAt` and `fillRoute` joins them (`models` lists both). The picture model is `visionModel` in `card-tasks.json` (`none`, `settings` or a ref; a persona keeps it in `cardTasks`); the old browser key `rp.profile.visionModel` is read only while a card has none. Read from picture reads with the Vision model even when the choice is `none`.
- A card longer than `limits.inputChars` (#529): `cardTextFor` sends pieces by the fields asked (Personality text first for lists, behaviors, goals, trauma, sexuality; Description first for the rest; both in turn for a mixed request), and the draft has `read: { used, total }`. Structure it still reads every part.
- The Soul rating runs on `soulModel` in `plugins/relations/plugin.js`: the card's `card-tasks.json` model, `ui.cardTasks.model`, the Dashboard sensor model, the chat's model, the app default. `POST /dashboard/soul/rate` takes `taskModel` over that chain (#505). In the Soul tab (`soul-tab.tsx`, given the editor's `useCardTasks`) "Choose another model" writes the pick where the model in force is set: `ui.cardTasks.model` when that runs, else the card's own (`saveModel`, written at once); never the sensor model.
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
- `test/rp-profile-fill-split.test.ts`
- `test/rp-persona-frame.test.ts`, `test/rp-persona-new.test.ts`, `test/rp-persona-list.test.ts`, `test/rp-persona-page.test.ts`
- `test/rp-polish.test.ts`, `test/rp-tools.test.ts`, `test/rp-dice-note.test.ts`, `test/rp-talkativeness.test.ts`, `test/rp-soul.test.ts`

## Not verified
- The Life Book: no match in `src`, `plugins` or `docs`, so I treat it as absent.
- The needs, preferences and braveness fields: no match in `src` or `plugins`.
- That the questionnaire has exactly five questions: `docs/DATA-FORMATS.md` says five; I did not count `QUESTIONS`.
- Which component draws tool results in the chat: I confirmed the `tools` field, not the renderer.
- The internals of the relations plugin's soul rating beyond its model chain: not read.
- The test suite was not run for the original page; #528 to #530 ran 179 related tests, typecheck and a browser check on the mock model (a real model that reads pictures and a real long card on a small window were not tried).
