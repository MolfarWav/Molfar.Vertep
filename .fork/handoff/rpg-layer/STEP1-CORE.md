# RPG app, step 1: the core (character sheet) — design

> **Superseded in part, 2026-11-24.** The owner's earlier plan was found outside this repo: `D:\Claude\rpg-issue-123\`
> (`PLAN.md` rev 2 of 2026-11-11, `TASK-P1.md`, mocks `B-v3` battle, `B-v4-zbory` and `B-v5-scroll` muster and inventory,
> screenshots `shot-b3/b4/b5.png`). The owner: "follow the plan, it was refined later and settled". Decisions that stand:
> - Order is the plan's phases: P1 `rules-core` first (pure TypeScript, seeded, tests, simulator), then the app shell and the
>   screens, battle, Roleplay side, muster (backpack, belt, inspector: the "inventory stub" in B-v4 and B-v5), powers.
> - Sheet is per story (one chat run), made when a fighter first needs one, with a "save as default into the card" button
>   (plan, section 9.1). My "per character" idea is dropped. A card write is a Roleplay-side job (the app only reads Roleplay);
>   until then defaults are kept in the RPG app's own data.
> - Five stats (owner chose them over the plan's three): `might`, `agility`, `endurance`, `wits`, `spirit`, 1..10, budget
>   `15 + 3 * level`. In a fight `might` is damage, `agility` is hit chance and flee, `endurance` is HP; `wits` and `spirit`
>   have no fight effect in P1 (courage for timid allies comes from Soul, `wits` waits for powers and skills).
> - Levels come in with rules-core (the plan put them in P7; the owner asked for them now): see "Levels" below.
> - The look is the one in the mocks: dark, red accent, serif headings, mono labels, cyan primary "fight" button, green HP bars,
>   source marks (sensor, code, card, example).

Issue #486 (what is left of #123). Status 2026-11-24: design only, nothing built, no repository yet.
Read first: `IDEAS.md` here (old ideas), `.fork/handbook/engine-apps-bridge.md` (how an app reads another app),
`.fork/handbook/roleplay-entity-registry.md`, Roleplay `docs/SOUL.md`, skill `app-authoring`, skill `ux-review`.
Precedent for a separate app that reads Roleplay: Social (`MolfarWav/Molfar.Vertep-Social`, `manifest.json` `reads`).

## What was found in the past sweep
- #123 is closed; dice (#155), ids (#240), things and outfits (#176), maps (#454, #473), quests (#117), rollback (#75)
  already live in Roleplay. Do not rebuild them.
- #240 phase C (Forge agents addressing persons and things by id, "the RPG contract") was left for this app.
- Soul (`extensions.molfar_soul`) has no courage number: it has `traits` (dominance, confidence, shyness, patience,
  curiosity, 0..100) and `spectra` (`cautious_reckless`). Courage can be derived from them, so the card format stays as it is.
- The status block back into the Dashboard (issue item 4) was last checked 2026-10-27: the agents plugin rejected
  `read:state.*` / `write:state.*` and the Dashboard had no route that sets a field from outside. Recheck before step 1b.

## Scope of step 1 (usable alone, ends before any fight)
1a. The app exists: own repository, manifest with `reads` (Roleplay cards, personas, portraits), a list of characters,
    a sheet per character, generated once from the card by a model and correctable by the user.
1b. (separate PR, needs a Roleplay or engine route) the status block in the Dashboard. Not in 1a.
Out of step 1: combat, the handoff (open the app with a payload, result back), inventory mechanics, model layer in fights.

## The sheet (light own rules, mechanics only, no names or assets of any game)
- Five stats, 1..10: `might`, `agility`, `endurance`, `wits`, `spirit`. Agility will order turns later.
- `level` 1..10. Stat points to spend: `15 + 3 * level` in total (level 1: 18 points, 3.6 per stat). Code enforces it.
- `hp.max = 10 + 3 * endurance + 2 * level`; `hp.now` starts at max. Derived in code, never asked of the model.
- Up to 6 skills `{ name, rank 1..5 }`, ranks total at most `4 + level`.
- `money` an integer and `currency` a short word the world uses ("coins", "gold"); `role` a few words ("scout").
- `note`: why these numbers, one or two lines, from the model (shown to the user, never to a prompt).
- `courage` 0..100: derived once from Soul (`(confidence + (100 - shyness) + reckless) / 3`, where `reckless` is
  `spectra.cautious_reckless`), else 50. Not a stat; used by allies in step 2.
- Numbers above were confirmed by the owner on 2026-11-24 (rules ok, sheet per character).

## Levels (owner: "do not forget the levels")
- `xp` is an integer on the sheet. XP needed to reach level `n`: `50 * n * (n - 1)` (level 2: 100, 3: 300, 4: 600, 5: 1000 ... 10: 4500).
  Table lives in one place in code (`levels.ts`) so it can be retuned.
- Level comes from the model at first generation (a veteran card may start at 4), clamped to 1..10 and never higher than the
  user allows. After that it changes only by "Level up", offered when `xp >= xpFor(level + 1)`. No free typing of the level.
- A level-up gives `+3` stat points and `+1` skill rank point and raises `hp.max` (formula above). The new points are not
  assigned for the user: the sheet shows "Free points: N" and the stat rows get a "+" button each (the way the game that inspired
  it does). Points already spent cannot be taken back except with "Reset to the proposal"; the app keeps the proposal.
- Step 1 gives XP only by hand (a number field with "+10 / +50 / +100" buttons and a note). Combat will award it in step 2, which
  is why `xp` exists now. Level cap 10 for now; a cap is a constant, not a promise.
- Stored: `level`, `xp`, `spent` (stats as the user spent them), so free points = budget(level) - sum(stats) - sum(skill ranks).

## Code judges, the model proposes
- Model returns a closed schema (stats, skills, role, currency, note). Code validates it, drops unknown keys, clamps every
  value, then scales the stats down to the budget. A 9999-strength goblin cannot come out. HP, dice, order: code only.
- No model, or a failed call, or garbage JSON after one retry: a plain sheet from a table. Stats start at 3, Soul traits nudge
  them (confidence and dominance to `spirit` and `might`, curiosity to `wits`, shyness down on `spirit`), no skills.
  The app works without any model.
- A proposal never overwrites a saved sheet (same rule as Soul): it waits as a draft until the user accepts it.

## Data (the app's own `data/`, not Roleplay's)
- `sheets/<key>.json`: the saved sheet. `<key>` = `<characterId>` for a one-character card, `<characterId>.<soulName slug>`
  for a narrator card with several souls. A persona: `persona.<personaId>`.
- `drafts/<key>.json`: `{ v, at, model, sheet, note }` waiting for review.
- `config.json`: only what differs from defaults (the sheet model, the budget numbers if ever exposed).
- Per-chat state (current HP, wounds, gear) is not in step 1: one `hp.now` per sheet for now. Per-chat state arrives with the
  handoff (step 2), when a chat id is known. Say it plainly in the guide page.

## Reading Roleplay
- `reads`: `characters/*/card.json`, `personas/*.json`, `litopys/portraits.json` (like Social), with a `why` that says the card
  text goes to the user's own model once, when a sheet is made.
- The card goes into the sheet prompt (name, description, personality, scenario, the Soul if present), cut to a small budget so
  a free model with a short window copes. Measure with `estimateTextTokens` before settling the cut.
- Model calls: a plugin `sheets` with `POST /sheets/propose`, two-phase (`two-phase-llm`): pass A asks, pass B commits the draft.

## UI plan (before any code; `ux-review` section 1)
Where: its own app tab "RPG" in the shell. App settings through the manifest's `settingsView` (the shell's Settings lists it).
Start: open the tab, you see the character list. Steps to a sheet: 1 tap (row), to "Make sheet": 2 taps.

Layout variants:
- A. List and detail (a column of characters, the sheet beside it; on a phone the list, then the sheet as a page). Familiar from
  Social; the sheet has room. Picked.
- B. A grid of party cards. Looks like a game, but a sheet does not fit in a card and editing needs a second screen anyway.

Screens and states:
- Character list: avatar, name, "Sheet ready" or "No sheet", level, HP. Empty (no access to Roleplay): a callout "RPG needs to read
  your Roleplay characters" and a button to the shell's Home, where "Access to other apps" lives (`openHome`). Empty (access
  given, no characters): says to make a character in Roleplay. A "Make sheets for all" button only after one sheet was made by hand.
- Sheet page, top to bottom: header (avatar, name, role, level); Vitals (HP bar with numbers, money); Stats (five rows, a stepper
  each, "points left" counter; over the budget turns the counter to the danger token with an icon and a word, and Save is
  disabled with the reason in visible text); Skills (add, rank, remove); "Why these numbers" (the model's note, plain text).
  Actions: Save (primary, one per screen), Make again (outline), Reset to the proposal (ghost). Phone: Save sits in a bar above
  the keyboard, targets 44 px.
- Draft waiting: a callout at the top "A proposed sheet is waiting. Review it": the sheet is shown with the proposal's values,
  Accept (primary) / Discard.
- Loading: a shimmer and "Reading the card…". Model error: plain words, "Try again" and "Make a plain sheet without a model".
- Reuse: Social's `tokens.css`/`base.css` themes (copied, not linked), shell theme through `molfarShell.theme()`; `Flower`-like
  parts are Social's own, not reused. New: stat row with stepper, HP bar, points counter. The look (Echo for Social) is a decision
  for this app (open question 3).
- 14 locales do not apply (an app has its own strings): `en` and `uk`, a skeleton test that fails when one is missing (as Social).

## Checks and the rest of "done"
- bun test: budget clamp and scaling, the table fallback, schema validation of a model answer (bad keys, text instead of numbers,
  9999), derived HP, courage from Soul, the draft never overwriting a sheet.
- A browser-check at 1280 dark, 390 light; a real free model run on a few cards (the owner's cards live in his workspace, not here).
- Guide page `.skills/guide/pages/` in the new repo; engine handbook page `rpg-app.md` (a new app with its own data); STATE.
- Releases are the app's own (CLAUDE.md, "Addons release on their own"). A Store entry in `Molfar.Vertep-Store/apps.json` comes
  with the first release, not before.

## Open questions for the owner
1. Rules: five stats `might, agility, endurance, wits, spirit` and the budget `15 + 3 * level`, HP `10 + 3 * endurance + 2 * level`: ok?
   Or something closer to D&D (six stats)?
2. Is a sheet per character (travels between chats), with per-chat state arriving in step 2, right? Or per chat from the start?
3. The look of the app: reuse Social's "Echo" family, or a retro look as the issue allows ("a retro look is fine")? Needs a
   mock before code only if you want to choose by eye.
4. Repo name: `MolfarWav/Molfar.Vertep-RPG`, app id `rpg`, name in the shell "RPG". Create it now (public, like the others)?
5. Soul courage: derived from traits as above (no change to the card format). Agree?
