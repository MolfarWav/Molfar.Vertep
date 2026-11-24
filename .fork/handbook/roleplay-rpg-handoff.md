# RPG hand-over: a fight from a chat to the optional RPG app, and the result back
HELD OUT OF `main` (2026-11-25): Roleplay's #203 was reverted in 4.155.2 (fe7b17ac) so the Fight button does not ship before the RPG app is in the Store; the code stays on branch `claude/rpg-handoff` (a8300fa2) and comes back by checking its files out again (a re-merge does nothing, the commits are already in the history). Verified at: molfar.vertep-roleplay a8300fa2 (branch claude/rpg-handoff, not merged); engine 0fda32c (branch claude/open-app-view, not merged); the RPG app at Molfar.Vertep-RPG bfcf24a (not checked by the script).

## What it does
A **Fight** button in the chat header gathers the party, lets a model propose opponents from the scene, and writes an *encounter* file into Roleplay's own data. It then opens the RPG app on it with `openApp('rpg', id)`. The RPG app plays the fight with code (rules, dice, injuries) and writes a *result* file into its own data; it opens Roleplay on the same id, and a card in the chat shows the result and offers its summary as a stage direction. Neither app writes into the other's data. Contract version 0.1; the docs and example files are in the RPG repo (`docs/contract`), copies in `test/fixtures/rpg-contract/`.

## Owners
- roleplay: `plugins/rpg/plugin.js` `handleRoute`: the routes below.
- roleplay: `plugins/rpg/plugin.js` `gatherParty`: the persona as the hero, then the Dashboard's newest snapshot `present` names, at most four, with the Soul numbers from the card.
- roleplay: `plugins/rpg/plugin.js` `buildEncounter`: the file written; every text cut, every number clamped, lists capped.
- roleplay: `plugins/rpg/plugin.js` `cleanFoes`: the opponents as the contract wants them (at most six, an archetype from the list, a level or null).
- roleplay: `plugins/rpg/plugin.js` `parseFoeReply`: the model's JSON, plain, fenced or inside prose.
- roleplay: `plugins/rpg/plugin.js` `cleanResult`: reads a result file; refuses an unknown major version in plain words.
- roleplay: `plugins/rpg/plugin.js` `noteFromResult`: the line for the composer, in the chat's language.
- roleplay: `plugins/rpg/plugin.js` `newEncounterId`: `enc-<time base 36>-<4 random>`, a view name that sorts by time.
- roleplay: `src/lib/rpg.ts` `useRpgUi`: what the chat screen is asked to show (the Fight window, one result card).
- roleplay: `src/components/chat/rpg-fight.tsx` `RpgFight`: the header button, the Fight window and the result card.
- roleplay: `src/components/shell/app-shell.tsx` `AppShell`: hears the id from the RPG app (`onShellView`), finds the chat (`GET /rpg/encounter?id=`), opens it and the card.
- roleplay: `src/lib/shell-bridge.ts` `openShellApp`: `openApp(id, view?)`.
- roleplay: `src/lib/store.ts` `ComposerFill`: kind `note` is the summary offered to the composer.
- engine: `client/public/app-bridge-host.js` `shellRequest`: `open-app` takes an optional `view` (the `VIEW_NAME` rule); an invalid one refuses the whole request.
- engine: `client/public/app-bridge.js` `molfarShell`: `openApp(id, view)`.
- engine: `client/src/App.tsx` `onShellRequest`: after `openApp` it calls `MolfarBridgeHost.openView`, the hand-over the Settings entries already use.

## Data or Reads and writes
- Writes `rpg-outbox/<id>.json` (the newest 20 kept) and `rpg/seen.json` (`{ v: 1, ids }`, the last 200) in Roleplay's data.
- Reads, through `reads` in Roleplay's manifest (granted by the user on Home): `results/*.json` of the app `rpg`. Reads its own chat, Dashboard state, personas, cards, settings.
- Routes: `GET /rpg/party?chatId=`, `POST /rpg/foes`, `POST /rpg/encounter`, `GET /rpg/encounter?id=`, `GET /rpg/results?chatId=`, `POST /rpg/seen`. Shapes: `docs/DATA-FORMATS.md` of Roleplay, "RPG hand-over".

## When a model is called
Only `POST /rpg/foes`: one two-phase request, never reasoning set, 900 tokens; the model is the Dashboard sensor's, else the chat's, else the app's. The answer is read as JSON and cut to the schema; a bad answer is a plain error and the player adds opponents by hand. The fight itself needs no model.

## Flow
1. The player presses Fight. `GET /rpg/party` fills "Your side". "Propose from the scene" calls `POST /rpg/foes`; opponents can be edited or added.
2. "Open the RPG app" calls `POST /rpg/encounter` (the party is gathered again, so it is fresh), then `openShellApp('rpg', id)`. If the shell refuses, the fight stays written and the window says the RPG app can find it.
3. The RPG app reads `rpg-outbox/<id>.json` through its own `reads`, checks it, makes sheets for the party and numbers for the opponents (level and archetype), plays the fight and writes `results/<id>.json` in its data. It opens Roleplay with the same id.
4. Roleplay hears the id (`onShellView`), asks `GET /rpg/encounter?id=` which chat it belongs to, opens that chat and the result card. Without the id (an older engine) the Fight button shows a dot when `GET /rpg/results` finds an unseen result for this chat.
5. "Put the summary in the composer" sets a `note` fill: `[[summary]]`. The composer puts it in when the draft has not changed, else offers it. The stage direction reaches the model as the usual "Stage directions" part. "Mark as dealt with" writes `rpg/seen.json`.

## What reaches the prompt
Only the summary, and only when the player puts it in the composer and sends it, as a stage direction in double brackets. Nothing is added to a prompt by the plugin itself. The Dashboard does not change.

## If you change X, also touch Y
- The contract (fields of the encounter or the result): the RPG repo's `src/contract/index.ts`, its two example files, the copies in `test/fixtures/rpg-contract/`, `buildEncounter`, `cleanResult`, and Roleplay's `docs/DATA-FORMATS.md`. Bump the contract's minor version for an added field; a removed or renamed one is a new major.
- The id rule: the engine's `VIEW_NAME`, the RPG app's `ID_RULE` and the plugin's `ENC`.
- `openApp` or the shell op: the engine's `shellRequest`, `molfarShell`, `onShellRequest`, `test/security.test.ts` and `test/app-bridge-view.test.ts`.
- What the Dashboard shows as present (`present`, `personIds`): `gatherParty`.
- A new composer fill kind: `ComposerFill`, the composer's offer toast, both languages of its text.

## Traps
- The shell op is for official apps only and only from the app on screen. A copy of Roleplay or of the RPG app that is not official gets "not allowed for this app": the Fight window then says the fight is saved.
- The id is a view name (lower case, a letter first, 32 at most). A different id shape is refused by the shell, silently dropped by an old engine.
- `reads` is a grant the user gives on Home, per app and per pattern. Without it `GET /rpg/results` answers `state: "closed"` and the RPG app cannot read the outbox.
- The party is the newest snapshot's `present`, not the chat's cards: a character the Dashboard does not show is not in the fight. The persona is always the hero and always first.
- The RPG app's repository must hold a `data/` folder: without it the engine refuses every write of the app ("path resolves outside app data dir").
- The first open of an app builds it and the shell may make its frame again, so the id handed over by `openApp` can be lost; the RPG app then offers the waiting fight in a banner (the fallback is tested).
- A foe that the Dashboard also lists as present is a party member: the model's opponents are only added by the player's window, never taken from `present` (a test keeps a "Goblin" in `present` as a member, on purpose).
- Results are not applied to the story: injuries stay in the result and the RPG app. Rollback by swipe (plan section 5.4) is not built; the result is tied to a chat, not to a message.
- `cleanResult` and the RPG app's `parseResult` are two copies; the fixtures are what keep them alike.

## Tests that guard it
- The whole round trip in a throwaway engine with the real shell: `.claude/skills/browser-check/rpg-handoff-check.mjs` (run 2026-11-24: all checks passed, no console errors). It found four bugs that the unit tests did not: no `data/` folder in the RPG repo, the reply role `char` (not `assistant`), a load race in the RPG app's sheet list, and a flash in the result card.
- Roleplay `test/rp-rpg-handoff.test.ts`: the id, opponents, the model's answer, the party, the encounter against the example file, the outbox, the two-phase foes route, the result and its note, results per chat and seen.
- Engine `test/security.test.ts` (the shell op list and refusals) and `test/app-bridge-view.test.ts` (the frame sends the view).
- RPG repo `test/contract.test.ts`, `test/encounters-plugin.test.ts`: the same example files, the result builder, the peer reads.

## Not verified
- A real phone, and a real model for the opponents (the check uses the fake model with fenced JSON).
- The Roleplay guide page `rpg` in the other languages, and the Help article for the Fight button.
- That `present` in the newest snapshot is the right list when the newest message has no snapshot yet (the party then comes from the last message that has one).
- Whether a free small model returns the foes JSON reliably (the route falls back to a plain error).
