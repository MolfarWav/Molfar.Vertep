# #449 Meanwhile and Secrets: decisions and the plan after S1

Written 2026-11-20. The owner left the decisions to me ("recommended ones fit"). The proposal is the issue body (#449) and
`D:\Claude\vertep-ideas\OFFSCREEN-RUMOURS-GROWTH.md` (not in git). Owner's earlier answers inside the issue: card characters act
off-screen too with a per-card switch (2026-11-11); spoilers default to hints (2026-11-18).

## Done
- **S1 the knowledge map** (Roleplay branch `claude/stage-backstage-448-449`, tab "Who knows" in the Library's Details). It showed
  what the data holds: `knownBy` is a list of names or `"all"`; `secret: true` exists since #416; nothing marks a fact the *player's
  persona* does not know, so the map cannot tell "the persona is in the dark" from "everyone but the persona knows". Meanwhile facts
  must carry that explicitly.

## Decisions
1. **A new plugin `plugins/meanwhile/`**, not more lines in `plugins/world/plugin.js` (7.7k lines; AGENTS.md prefers a new plugin).
   Its own state `meanwhile/<chatId>.json`, its own config `meanwhile/config.json`, its own model pick and switch (off by default).
2. **When it runs:** the client asks after a reply (as `triggerWorldUpdate` does); the plugin's `dueReason` says yes when a scene has
   closed since the last pass (Litopys' chapter list is the source: one new chapter) or the Dashboard's story clock jumped by
   at least N hours (start 6). One pass per due; never in a combat; never twice for the same chapter.
3. **Event shape** as in the issue, plus `afterMessageId`, `chapterId`, `status: active | undone`. K starts at 3.
4. **Checks in code** (pure, exported, tested like `cleanFront`): ids must exist in the chat's entity registry; nobody in
   `who` or `witnesses` is present in the scene (Dashboard `present`) or is the player's persona; effects from the closed list;
   a failed event is dropped whole.
5. **Rollback:** events are tied to `afterMessageId`; a run reads the chat's line (`readChat`, as World's `firstGone`/`reconcile`)
   and marks events whose message is gone `undone`; their facts are retired in the same step.
6. **Knowledge goes to Litopys through Litopys itself:** add a small route to `plugins/litopys/plugin.js`
   (`POST /litopys/meanwhile`: add or retire facts with `origin: "meanwhile"`, `eventId`, `knownBy`, `secret`,
   `personaUnaware: true`) that calls its own `saveChatFile`. A second writer of `litopys/chats/<id>.json` would skip the far digest
   removal (handbook trap), so the Meanwhile plugin never writes that file directly.
7. **The persona does not know it:** `knownBy` never holds the persona's name, and the fact is `secret: true` so the existing
   leak check and "who knows what" note already treat it right (#416). A character who knows may bring it up: that is only
   Litopys doing what it does for any fact.
8. **Journal line:** one line in the knower's journal (relations plugin) is a *second* step (M2b), after the facts work.
9. **Spoilers:** a per-chat setting `spoilers: none | hints | all`, default `hints` (owner, 2026-11-18); the panel shows who
   and where, not what, in `hints`.
10. **Panel:** a Stage-side readable list ("Meanwhile": event cards, newest first, with a "hint" or the full text) beside the
    Dashboard tabs; settings (switch, model, K, per-card switch, spoilers) Backstage, in the World DM sheet's neighbourhood.
    This is where #448's split rule is first applied. A text UI plan and `ux-review` before the code (owner: no HTML mocks).
11. **Per-card switch:** `meanwhile: true|false` on the card's extensions (default on for a card the chat has used), read by the
    pass; the World DM's own NPC records with goals are always eligible.
12. **Order** (unchanged from the issue): S1 (done) -> M1 pass, storage, rollback, panel -> M2 Litopys wiring and journal ->
    character growth (#450) -> S2 suspicion and S3 rumours -> M3 letters -> M4 Social feed.

## M1 split into reviewable pieces
- **M1a, M1b and M2a DONE 2026-11-20** (M2a differs: no Litopys route, Litopys reads the Meanwhile file and lays the events over its facts in memory; see STATE). **M1a** (pure, no UI): `plugins/meanwhile/plugin.js` with `cleanEvent`, `checkEvent`, `dueReason`, `reconcile`, the prompt
  builder and the parser; `test/rp-meanwhile.test.ts`. Registry and the Dashboard's `present` are read from files.
- **M1b** the route, the model call under key `meanwhile`, storage, the visible switch and a log of who, why and dice (owner's
  rule for mechanisms under test: a visible switch and a log).
- **M2a** the Litopys route and the wiring. **M1c** the panel and the settings.
Each piece gets the real-browser check on the fake model, and one run on a real free model before the release (the pass's
prompt size measured with `estimateTextTokens`-style counting through the inspector).

## Open and not decided
- Whether a scene closing is better read from Litopys chapters or from the Dashboard's snapshots (`findScenes`): decide in M1a
  after reading both.
- Free models: whether the schema output survives small windows; K = 1 as a fallback.
