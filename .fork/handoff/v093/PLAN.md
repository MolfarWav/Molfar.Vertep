# 0.9.3: what 0.9.2 left open

Collected 2026-10-09 at the 0.9.2 release (user: "what is not finished goes to the next patch"). Not yet
ordered with the user: ask for the order before starting. Engine branch to create: `claude/v093` from main.

## Left from 0.9.2 item 2 (models in one place)
1. **Effective parameters in the chat.** The spec wanted the chat header switch to show the model's
   effective temperature, max output and reasoning and where each comes from (model / preset). The
   Connections page that showed the Chat block's summary is gone with round 2, so today nothing in the chat
   shows them. Use `GET /v1/models/params/effective` (engine) and the reply's `requestParams.from`.
2. **A live run on a real provider** (NanoGPT): the prompt inspector shows the applied block and the
   values; a plugin block for the dashboard sensor actually changes its temperature. Only the mock was used.
3. **Android provider list.** The add-connection screen now shows why the list failed; the cause is still
   unknown. Ask the user for the error text from the phone.
4. **Backstory reads only the direct predecessor** of a linked chat (A -> B -> C: C gets B's story only).
   Decide with the user whether the chain should reach further (budget split, oldest first).
5. **Recommendations name kinds of models, not models.** Offered named examples to the user; waiting for
   which names, if any.
6. The one-time "preset samplers -> model" and "profiles -> quick switch" flags live in the app's
   settings AND its localStorage store; a second device runs the move again (harmless: existing values are
   kept). Read the flag from the engine side only, if it ever matters.
7. Roleplay Settings audit (agreed as a later item): what in the app's own Settings is left or duplicated
   now that models live in the shell.

## Seen during 0.9.2 checks, not fixed
8. **React "two children with the same key"** (a chat id) once, after "Create editable copy" of a preset
   with the Presets drawer open. Not reproduced in the third check. Find the list that renders a chat twice.
9. **Engine test "S5 in-browser builder: the builder frame is sandboxed…" times out** (5 s) on the desktop
   since late 0.9.2; it also fails with the 0.9.1 bridge file, so likely the environment, but it passed
   earlier the same day. Run it alone on a clean checkout of v0.9.1 to settle it.
10. The chat header switch sometimes needs a second click to open (the popover toggles); seen by the
    browser-check agent, not by the user.

## Older open bugs (from the 0.9.1 showcase notes, still open)
11. Molfar's message shows "2 / 2" versions after a run that went through the protected-files approval.
12. The Ukrainian Roleplay Home clips the "Повідомлень" achievements tile.
13. Enter does not send in Molfar's composer on a phone (maybe intended: decide with the user).

## Housekeeping
14. DONE 2026-10-09 (user's word): remote `claude/showcase` and `claude/v081` deleted; every old local worktree removed (engine: dashboard, molfar, publish-app, ui-redesign, v081, memory-v2, showcase, v091, v092; Roleplay: rp-links, rp-params, rp-example, the old rp-dashboard clone); merged local branches deleted. Left: the main checkout (detached at v0.9.1, the launcher's) with its untracked `.fork/ui-assets/` and `start-chrysalis.bat`, and the Roleplay clone `.claude/worktrees/rp-memory` on main. The C: path `C:UserssulazChrysalis-Engine` is a link to the E: checkout.
15. The `@earendil-works/pi-ai` upgrade for newer builtin models stays its own careful step (user's word):
    branch, full test run, the agent and every OAuth flow checked on desktop and APK.
