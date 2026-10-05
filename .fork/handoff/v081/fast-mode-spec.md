# 0.8.1 item 6: dashboard fast mode (the story reply carries the sensor's JSON)

Roleplay app, clone `.claude/worktrees/rp-dashboard`, branch `v081`. Opt-in, for strong models only.
Default stays the separate sensor call. No engine (Molfar Vertep) change: everything is in the app
(`plugins/engine` = the app's chat plugin, `plugins/relations` = the dashboard, `src/` = UI).

## Idea

Mode `fast` (config `mode`, today `sensor` | `manual`; the client type already lists `fast`):
1. The relations llmRequest hook tells the story model to end its reply with one tag
   `<vertep_state>{...}</vertep_state>` holding exactly what the sensor would return (same OUTPUT_SHAPE).
2. The app's chat plugin cuts the tag out of the reply BEFORE the message is saved (text and `parts`), and
   writes its body to `dashboard/fast/<chatId>.json` under the message key `<msgId>#<swipe>`.
3. The dashboard update after the reply (client trigger, catch-up tick) finds that entry for the key it is
   about to sense, parses it with `parseSensorText` and applies it with `applySensor`: no sensor call.
4. Anything missing or unusable (no tag, bad JSON, continue, edit, resense, impersonate) falls back to the
   separate sensor, exactly as mode `sensor` does today. Fast mode never makes the dashboard worse.
5. The UI never shows the tag, also not while the reply streams.

## Data

`dashboard/fast/<chatId>.json`:

```json
{ "v": 1, "entries": { "<msgId>#<swipe>": { "body": "<raw text between the tags>", "at": 1767600000000, "model": "<reply.model>", "closed": true } } }
```

- `body` cut to 16000 chars. `closed: false` when the reply ended without `</vertep_state>` (cut off by the
  token limit): relations still tries it (`parseSensorText` handles cut JSON, snapshot gets `partial`).
- At most 20 entries per chat; entries older than 24 h are dropped on each write. relations removes an entry
  once it applied or rejected it. `removeOrphans` sweeps the dir.

## plugins/engine/plugin.js (the app's chat plugin)

- `FAST_TAG = "vertep_state"`. Helper `cutStateTag(text)` → `{ text, body: string|null, closed: boolean }`:
  takes the LAST `<vertep_state>` in the text; with a closing tag cuts `<vertep_state>…</vertep_state>`,
  without one cuts from the opening tag to the end; trims trailing whitespace left behind; text without the tag
  is returned unchanged with `body: null`. Also cut the same span from `reply.parts[*].text` where present
  (committed rendering uses `parts` when the reply used tools or was aborted).
- Apply it in pass B of `send`, `next`, `swipe` (generate) right after `replyText = String(reply.text||"").trim()`
  and before `stripEchoedName`; in `continue` and the `cancelled` save path cut the tag too but write nothing
  (fast entries are only for whole replies).
- Write the entry only when `dashboard/config.json` has `mode: "fast"` and `body` is non-empty; write after
  the chat is saved, keyed by the new message id and swipe index (`swipe` route: the new index). A write
  failure never fails the reply (try/catch).
- Always cut the tag, in every mode (a model that keeps writing it after the mode is switched off).
- Regex scripts and everything else after the cut see the clean text.

## plugins/relations/plugin.js

Config: accept `mode: "fast"` (validation at ~R:1545). Panel: mode select gets "Fast (inside the story reply)".

Hook (`llmRequest`), mode `fast`, ops `send`/`next`/`swipe`/"" (not `continue`, not `impersonate`):
- After the normal insert, add a second system message right after it (same leading position) =
  `fastInstructions(state, cfg, vocab, ctx)`:
  - one paragraph: after the reply, append `<vertep_state>` + one JSON object + `</vertep_state>` on its own
    line at the very end; nothing after it; the tag is cut before anyone sees it; describe what happened in
    this turn (the user's last message and this reply), in the shape below;
  - the sensor prompt parts that still apply (truth, events, scene, knowledge, threads; NOT role/language
    preamble about being a sensor), the event vocabulary (`vocabularyText`), `OUTPUT_SHAPE`;
  - the previous state the sensor gets today: `previousStateText` (with thread ids and note ids) and the cast
    line, so ids in the JSON match. Notebook texts only for present characters, as the sensor gets them.
  - Prompt key `fast` in DEFAULT_PROMPTS for the paragraph (config keeps only a change; panel textarea,
    advanced).
- Plus a short reminder appended to the trailing user message (like the nudge, via `withNudge`-style copy):
  `[End this reply with the <vertep_state> tag as instructed.]`. When a nudge also applies, both go in, nudge
  first.
- Measure and report the added size in tokens (`estimateTokens`) for the default vocabulary and a 3-character
  scene; put the number in the panel hint ("adds about N tokens to every reply").

Update (`runUpdate` / `planUpdate`), mode `fast`:
- When the planned key K (op not `resense`) has a fast entry: parse `body` with `parseSensorText`; on success
  apply exactly like a sensor reply (`applySensor`, `commitUpdate`) with `sensorModel` = the entry's `model`
  and snapshot `op` = the original op plus `fast: true` on the snapshot; no LLM pass. Usage counters: count a
  `fast` call (no tokens). Remove the entry. On parse failure: remove the entry, log, fall back to the sensor.
- No entry, or op `resense` (edit/continue), or soul rating needed first: behave like mode `sensor`
  (soul rating pass still runs before when needed, then the fast entry is used if present).
- `sig` stays `textSig(ctx.newMsgs)` over the saved (tag-free) texts, so the next plan sees "unchanged".
- Catch-up tick: same path (it may use a fast entry the client trigger did not get to).

Tests (`test/rp-dashboard.test.ts`, new `describe("fast mode")`; engine plugin cut tests in the test file that
drives the engine routes, e.g. test/rp-prompts.test.ts or a new test/rp-fast-tag.test.ts):
1. `cutStateTag`: closed tag, unclosed tail, two tags (last wins), none, tag in `parts`.
2. Send in fast mode with a reply carrying the tag: saved text and swipes have no tag; the fast file has the
   entry under `<msgId>#0`. Mode `sensor`: tag cut, no file.
3. Swipe (generate): entry under `<msgId>#1`. Continue and cancelled: tag cut, no entry.
4. Update in fast mode with an entry: no `host.llm.request` for the sensor, snapshot applied, `fast: true`,
   entry removed, a second update says unchanged.
5. Entry with bad JSON: falls back to the sensor call. No entry: sensor call. Resense after an edit: sensor.
6. Hook: fast mode adds the instructions (thread ids present) and the reminder; mode sensor adds neither;
   continue/impersonate add neither.

## UI (src/)

- Hide the tag on screen: in the message display pipeline (message-row.tsx before `balanceStreamingMarkdown`,
  for streaming AND committed text) drop `/<vertep_state>[\s\S]*?(<\/vertep_state>|$)/g`, and while streaming
  also a partial opening tag at the very end (`/<(v(e(r(t(e(p(_(s(t(a(t(e)?)?)?)?)?)?)?)?)?)?)?)?$/` or an
  equivalent prefix check). One small exported helper in src/lib (unit-tested), used there.
- Dashboard settings (`dash-settings.tsx`, Sensor section): mode select gains "Fast: inside the story reply",
  with a hint: for strong models; adds about N tokens to every reply; when the model leaves the tag out the
  separate sensor runs. i18n en+uk.
- The live line / sensor footer: when the newest snapshot has `fast: true`, show "read from the reply"
  instead of the sensor model name (i18n en+uk).

## Checks

typecheck, `bun test test/`, lint touched files against HEAD, browser check with the mock model (skill
`browser-check`, throwaway engine, never the user's data): the mock's story reply carries the tag; it never
appears on screen while streaming or after; the chat file has no tag; the dashboard updates without a sensor
request (mock log shows one request, not two); a reply without the tag triggers the sensor (two requests).
Screenshots 1280 dark uk, 390 light uk.
