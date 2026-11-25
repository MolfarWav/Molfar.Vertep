---
name: browser-check
description: Use to check a Molfar Vertep change in a real browser (agent page or shell), with real agent runs on a fake model and no API keys. Starts a throwaway engine, a mock OpenAI-compatible model, an account and a connection, then gives Playwright helpers. Use before calling any UI change done, and give the same recipe to a subagent that builds UI.
---

# Check a change in a real browser

Without this, every session rebuilds the same setup by hand and trips on the
same things: the engine runs a model from the environment instead of the mock,
a pipe into `tail` hangs on a background process, `pkill` kills your own shell.

## 1. Start
```bash
W=<your scratchpad>/bc          # any folder; it is wiped
bun run build:client            # after UI edits: the engine serves the built client
.claude/skills/browser-check/start.sh $W        # optional: ENGINE_PORT MOCK_PORT (8796 8797)
```
It prints the URL, the account (`molfar` / `test1234`) and the model ref, and
writes `$W/env`:
- `ENGINE_URL`, `ENGINE_PID`, `MOCK_PID`, `MOCK_URL`
- `MODEL_REF`: the mock's model ref
- `DATA`: the user's workspace, for seeding files and checking writes
- `JAR`: the cookie jar, for curl calls

## 2. Seed what the test needs (optional)
- An app: `mkdir -p $DATA/apps/roleplay && echo '{"name":"Roleplay","version":"1","kind":"web","origin":"local"}' > $DATA/apps/roleplay/manifest.json`
- A free project: `curl -b $JAR -H 'content-type: application/json' -H "origin: $ENGINE_URL" -X POST $ENGINE_URL/v1/projects -d '{"title":"Ideas"}'`
- A finished chat without running the model: write `$DATA/agent/sessions/<id>.jsonl`. The first line is `{"type":"start","at":<ms>,"user":"hi"}`, then one `{"type":"run",…}` line per run. Copy the shape from `SessionRunRecord` in `src/agent/agent.ts`.

## 3. Drive it
Write the script in `$W` (`playwright-core` and `pw.mjs` are there):
```js
import { open, send, shot, turns, close, DATA } from "./pw.mjs"
const page = await open()                     // agent page, dark, 1280x800, logged in, mock model picked
await send(page, "what is AGENTS.md?")        // waits for the run to settle
await shot(page, "agent")                     // $W/agent.png; warns when the page scrolls sideways
await turns([{ tool: "write_file", args: { path: "apps/roleplay/data/x.json", content: "{}" } }, { text: "Done." }])
await send(page, "make x")                    // the mock now plays the new script
const phone = await open({ width: 390, theme: "light" })   // also: path "/" (shell), lang "ru"
await shot(phone, "phone")
await close()
```
Run it with `cd $W && bun t.mjs`.
- The mock answers each request with the next turn of its script, cycling. A turn is `{text}` or `{tool, args}`. The default script reads AGENTS.md, then answers.
- An `ask_user` turn opens the card: click it in the page.
- A turn with `drop: true` breaks the connection after its first words (a provider that closes the socket mid-stream); `dropTimes: 2` breaks only the first two requests, then answers.
- Native `confirm()` dialogs: `page.on("dialog", (d) => d.accept())`.
- Controlled checkboxes: `.click()` and wait, not `.check()`.

## 4. Stop
`.claude/skills/browser-check/stop.sh $W` stops the engine and the mock by PID (on Windows also whatever still listens on their ports, through taskkill). Never `pkill -f src/index.ts`: it matches your own shell.

## Roleplay and the Agent forge (issue #141)
The real Roleplay app can run in the throwaway engine, with the fake model, in its own light theme.
```bash
W=<scratchpad>/bc
.claude/skills/browser-check/start.sh $W
.claude/skills/browser-check/install-roleplay.sh $W <Roleplay checkout>     # copies it in, bun install; the first open builds it in the browser (~40 s)
cd $W && bun forge/forge-check.mjs            # 10 checks, exit code 1 on a failure; shots in $W/forge-shots/
```
- Run it on a **fresh** engine (start.sh wipes the data): the checks start a chat and install agents, so a second run on the same engine fails at "Start chat".
- `roleplay.mjs` has the helpers (`openRp`, `setAppTheme`, `startChat`, `openAgentSheet`, `uploadAgent`, `allowAgent`, `addAgentToChat`, `sendAndWait`, `skipTours`). Roleplay is an iframe of the shell, so each takes the shell `page` and the app `app` frame. After a phone-width `openRp` the frame is a new object: take it from the return value.
- The mock also answers `POST .../embeddings` (8 numbers from the words of each text, so texts that share words are near): `curl -X POST $MOCK_URL/__embed -d '{"fail":true}'` makes it fail, `delayMs` slows it, `GET $MOCK_URL/__embed` counts the calls. It is a local endpoint, so "Automatic" embeddings use it first.
- The mock routes by request text: a turn with `match: "text"` answers every request that contains it, the rest cycle. The checks use `FORGE-ECHO` (the Echo board agent's question), `You are the scene sensor` and `You are the world keeper` (answered `{}`, so no failure toast covers the screen). `mockLog()` (from `pw.mjs`) says what was asked, to count an agent's calls.
- `forge/agents.mjs` builds agents as objects and compiles them with the app's own checker (the hash and `derived` are always right). `forge/fixtures/echo-board.vertep-agent.json` is the same agent as a file, for hand tests.
- `forge/script-check.mjs` (Script card, #140): the permissions dialog lists the code, a script runs in a chat, hostile markup from the script does not reach the sealed frame. Run it on a fresh engine too.
- What the 10 checks prove: Daylight theme on the app, installing by file with Allow, a run through the model, hostile text in an `html` widget (escaped, `sandbox=""`, CSP `default-src 'none'`, no request to the hostile host, no script ran), an update that asks for a new permission (waits for Allow, no model call before it), drafts (four recipes pass, a broken one is marked), the Forge editor/Try/sets pages, a contrast sweep (nothing under 2.2:1), no console errors, 390 px wide (no sideways scroll). What they cannot prove: how a real model behaves; see `.fork/handoff/forge-checks/MANUAL.md`.
- Traps: the shell's tours ("Your apps", "Tabs", "What's new") and the app's tour sit over the page and block clicks (`skipTours`); the shell page does not see inside the app frame (`page.getByRole` never finds app buttons); on a phone the app opens by a tap on its row (no Launch button); the engine logs "Unrecognized Content-Security-Policy directive 'webrtc'" in the browser console (harmless, filtered).

## Traps
- `/v1/models` without `?all=1` lists only shown models; start.sh writes `models-shown.json` so the mock is the only one.
- The agent page theme comes from `localStorage["molfar-theme"]`, not the OS.
- The browser: the cloud image's /opt/pw-browsers, else an installed Chrome or Edge (Windows, macOS, Linux); `CHROME_PATH` overrides.
- Screens prove layout. A behavior claim needs the file on disk (`$DATA/...`) or an API read too.
- A subagent building UI gets this file's path and runs the same steps; ask it for screenshot paths and look at them yourself.

## The places map of Roleplay (issue #454)
A scripted end-to-end check with assertions and an exit code (about 30 checks): icons, drag, lock, full name and rename, picture and
reload, roads from the Dashboard's scene place, phone. Same setup as above, then:
```bash
cd $W && bun placemap-check.mjs            # optional: MAP_PICTURE=<a real map image> for the picture step
```
It seeds six places itself and runs in one session (a second `openRp` wipes the app's data). Screenshots `pm-*.png` land in `$W`.

Map levels and "Draw a map" (#473, #475) have their own script, `placemap-levels-check.mjs` (about 45 checks, on a FRESH engine): maps, scale, places on a map, a map of a place, travel by scale, the draw window with `POST /v1/images` faked in the page (a picture stored in the engine), the light theme and a 390 px phone; screenshots `pml-*.png`.

Hiding places (the owner's request, 2026-11-25): `placemap-hide-check.mjs` (21 checks, FRESH engine: the card's "Hide from all maps" and Undo, a reload, the gear's "Hide places..." list, a whole place with its rooms, everything hidden, a 390 px phone) and `group-mute-check.mjs` (#504, 9 checks: a group seeded by file and `PUT /groups/<id>`, the Members tab's "Mute" label, tooltip, muted mark and the all-muted warning, 390 px).

## A fight from a chat to the RPG app and back (issue #486)
`rpg-handoff-check.mjs` plays the whole round trip with the real shell: the Fight button in a Roleplay chat, opponents from the fake model, the
encounter file, the RPG app opening on the muster, a fight to the end, the result file, and the result card back in Roleplay. The setup (the
engine branch with `openApp(id, view)`, both apps, the "official" records and the two read grants) is in the script's header. Run it on a fresh engine.
