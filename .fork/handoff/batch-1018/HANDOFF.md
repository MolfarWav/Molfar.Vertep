# Batch on `claude/soji-sse-parse-48vyqm` (2026-10-18): state and what is left

Engine and Roleplay fork both use the branch `claude/soji-sse-parse-48vyqm`. Not released; the user wants
more fixes on it first (2026-10-18). Target: engine 1.2.4 (1.2.3 is released from another thread) with
Roleplay 4.52.0.

## Done (pushed)
- Engine `49c2724` #59: custom openai-completions connections read the chat stream through
  `src/providers/sse-tolerant.ts` (OpenAI SDK 7.x rejects non-JSON events; see STATE).
  A draft reply to the reporter is in the project thread, not posted.
- Roleplay `1d1f788` #50: Litopys recency/use factor in `rankFacts` (group d only); use record in
  `litopys/insert/<chat>.json` `used`.
- Roleplay `c2969e5` #51: Consolidate facts. Engine part in `plugins/litopys/plugin.js` (#51 block:
  batches, request, parse, proposals, `consolidateStep` in the tick after `arcStep`, route
  `POST /litopys/consolidate`, view field `consolidate`); UI `src/components/library/consolidate.tsx`
  in the Facts tab; en + uk strings. Not done: a command for Molfar (the issue's "and a command").
- Roleplay `0eb607f` #42: plain Molfar section names; migration in `onAppUpdate` under
  `olderThan(from, "4.52.0")`: if the release gets another number, change that line.
- Roleplay `a597964` #44: list previews run the chat's display regex (`src/lib/display-scripts.ts`,
  shared with message-row) and drop reasoning blocks (`src/lib/preview.ts`).
- #34 closed on GitHub (user's word).

## Left, in order
1. #55 rest (user agreed 2026-10-18): a "needs you" inbox over what exists today: Litopys proposals
   (incl. Consolidate's), soul proposals. Dashboard "thread to close" waits until the sensor has
   such a state. Source: `src/lib/attention.ts` (Roleplay 4.49.0). Run `ux-review` first.
2. #45 rest (user, 2026-10-18): the "replace the sync with this device" action (engine sync, see the
   issue's comments and STATE 1.1.1).
3. Browser check (`browser-check` + `ux-review`, dark, light, 390 px) of the Consolidate bar
   (Facts tab: idle, too few, working, failed, done), the Chats / Recent chats previews, and the
   #55 inbox. Not done for anything on this branch yet.
4. Release prep per `.fork/RELEASE.md`: Roleplay `APP_VERSION` in `src/lib/guide-tips.ts` still says
   4.50.0 on main (4.51.0 forgot it; `test/rp-guide*` fails on main) - bump with the release.
   Close #42, #44, #50, #51 (and #55 / #45 if finished) with the release; post the #59 reply.

## Checks run
Engine: typecheck clean, client build ok, tests 877/880 (the 3 fail on main too: edge TTS needs
network, hostile plugin). Roleplay: typecheck clean, tests all pass except the APP_VERSION one.
