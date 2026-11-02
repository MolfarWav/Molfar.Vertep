# Script card and html widget mode B (#140), design

Status: written 2026-11-01 before any code, then built on branch `claude/project-thread-zqzmks` (engine and Roleplay).
Scope asked by the owner: the **Script card** and **mode B of the html widget**. `batchKey` is not in this change (no
request for it, nothing measured that argues for it now); it stays open in #140.

Everything below marked "measured" was run in this session on the engine's real sandbox (`src/plugins/sandbox.ts`,
QuickJS-ng WASM in a worker thread). Everything else is design.

## 1. Script card

### 1.1 What it is

A card `code.script` that runs a small piece of the agent author's JavaScript on values from its input wires and
puts the results on its output wires. It exists for logic the other cards cannot express (a formula over three
numbers, a text transform, a small table lookup) so the author does not have to spend a model call on it. It never
touches the chat, the disk or the network; it is a pure function.

```json
{ "id": "calc", "type": "code.script", "title": "Damage",
  "params": {
    "code": "return { dmg: Math.max(0, input.atk - input.def), crit: input.roll >= 18 };",
    "inputs":  [ { "id": "atk", "type": "number" }, { "id": "def", "type": "number" }, { "id": "roll", "type": "number" } ],
    "outputs": [ { "id": "dmg", "type": "number" }, { "id": "crit", "type": "flag" } ] } }
```

- `code` is the **body of a function** `(input, seed)`; `input` is an object keyed by the input ids, `seed` a string.
  It must `return` an object. Strict mode is forced.
- Ports: one `in` port per declared input (typed `text`, `number` or `flag`), an optional `when` signal in, one `out`
  port per declared output, and a `failed` signal out. Same pattern as `data.parse`: if `failed` is wired, a script
  error goes there and the run continues; if not, the run fails with the error as its reason.
- A script whose input is missing data or was skipped is skipped (the usual gate). An output the script leaves out is
  missing data (downstream skips), never a silent zero. An output of the wrong type fails the card.

### 1.2 Where the code runs

Not inside the Agents plugin's own QuickJS context: that context holds the plugin's `host` and the agent file, and
`new Function` would share its global object. Instead the plugin asks the engine, the way it asks for a model call.

- New plugin permission **`script`** (manifest) and a new two-phase host call `host.script.request(key, { code, input, seed })`,
  answered next pass in `host.script.results[key]` as `{ ok: true, value } | { ok: false, error }`. This is the same
  exchange `llm` and `net` already use (`runPassRequests` in `src/plugins/runtime.ts`).
- The engine runs the request on a **dedicated `PluginSandbox`** (its own worker thread, its own wasm heap), never on the
  shared plugin worker. Measured reason: a memory bomb or deep recursion poisons the worker that runs it (see 1.5);
  on the shared worker that takes the Dashboard, Litopys and every other plugin's calls down with it (issue #173 and #162
  are exactly this). On its own worker the damage is one respawn of a worker only scripts use.
- The script worker is started on first use and disposed after 60 s idle, so a user who never uses scripts pays nothing
  and one who does is not holding a second wasm heap all day.
- The module the sandbox loads is constant (`export function run(ctx) { ... new Function("input", "seed", ctx.code) ... }`);
  the author's code travels as **data** in `ctx`, never spliced into module source, so it cannot break out of its wrapper.
- Before the author's code runs, the wrapper removes what the guest would otherwise see: `env` (which holds the
  sandbox's `host`), `process`, `__fs`, `Date`, timers and `performance`; `Math.random` is replaced by a seeded generator.
  The script sees only `input` and `seed`. (Measured: without this the guest sees `env.host.zip.build`, `process.env.host`,
  `__fs` (every call throws "File access is disabled"), `import("node:fs")` (same stub).) Each call is a fresh runtime, so
  nothing a script changes outlives it (measured: a prototype-pollution probe is gone on the next call).

### 1.3 Limits

| What | Limit | Why |
|---|---|---|
| Code length | 8000 characters | a card is a rule, not a program |
| Script cards per agent | 6 | the budget below is per run |
| Inputs / outputs per card | 8 / 8 | |
| Input JSON | 64 KB | |
| Output JSON | 32 KB | measured: a 5 MB string came back whole before this cap |
| CPU per call | 500 ms (QuickJS interrupt) | measured: `while(true){}` stops at 500 ms with a clean error |
| Memory per call | 16 MB | engine default is 64 MB |
| Hard wall-clock per call | 2.5 s, then the worker is terminated | measured: a memory bomb ignored the 500 ms limit and held the worker for the whole 10.5 s default watchdog |
| Script time per pass | 2 s in total; later scripts answer "script budget used up" | 16 requests x 2.5 s would hold a route for 40 s |
| Determinism | `Math.random` seeded by chat+turn+card; no `Date` | the same reply must give the same result, like the Dice card |

A script that times out or runs out of memory is an error of that card (see `failed`), not of the engine.

### 1.4 What data a script can read and write

- Read: only the values wired into its declared inputs. It cannot read the chat, the Dashboard, the agent's state or
  any file unless a card upstream hands the value over, and every such hand-over already carries its own permission
  (`read:...`) on the Input / state cards. A Script card adds **no new data access**.
- Write: nothing directly. Its outputs go on wires; they reach the agent's state, the Dashboard or the prompt only
  through `state.*`, `write.state` and Output cards, which carry `write:...` / `show:...` permissions and the usual
  queue (applied only after a successful run, thrown away on failure).

### 1.5 Permission on the install screen

`derived.needs` gets one new token, **`run:code`**, derived from the presence of any `code.script` card. The Allow
step lists it with its own line: "Run its own small program. The program sees only what the agent passes to it:
no files, no internet, not your chats." The install screen also offers **Show code** (read-only, per Script card) so
the person can read what they allow. A new version that adds Script cards to an agent that had none shows `run:code`
as new and asks again (the existing `asked` / `added` flow). A new version that only changes the code of a granted
`run:code` does not ask again; the sandbox, not the grant, is what contains the code.

An engine without the `script` capability (older than the release that carries this): the plugin finds `host.script`
missing and the agent fails with "This agent has a Script card; update Molfar Vertep", not a crash. The Roleplay
manifest's `engine` range is raised when the pair is released.

### 1.6 Hostile-input tests (engine, `test/script-box.test.ts`, run on a real sandbox)

infinite loop; memory bomb (`new Array(1e5).fill(1)` in a loop); string doubling; deep recursion; huge return value;
deeply nested return; non-JSON return (`undefined`, function, cycle, BigInt); `env`, `process`, `__fs`, `fetch`,
`Date`, `require` not reachable; `import("node:fs")` cannot read; prototype pollution does not persist to the next call;
syntax error; throw of a non-Error; the **plugin worker keeps serving other calls while the script worker is killed**
(the point of the separate worker); and the per-pass budget.
Roleplay (`test/rp-agent-script.test.ts`): checker errors for every param, ports and gating, `failed` wiring, types of
outputs, permission token, old-engine message, a full run through a fake `host.script`.

## 2. html widget, mode B

Mode A (built): `{ "w": "html", "template": "…{{slot}}…" }`. The author writes the markup once, vetted at install
(`TPL_TAGS`, `TPL_BAD` in `agent-check.js`); the model only changes the state the slots show. Looks identical every
turn. The frame is sealed (`sandbox=""`, CSP `default-src 'none'; style-src 'unsafe-inline'; img-src data:`).

### 2.1 What B adds

The **model draws the markup**: the look itself changes with the story (a letter in a hand that fits the mood, a map
with the party's position, a character sheet whose layout the model chose). In A the look is the author's; in B it is
the model's, at the price of tokens, variance and untrusted markup.

```json
{ "w": "html", "bind": "scene", "height": 260 }
```

`bind` names an own **text** field (not `template`; exactly one of the two). Any card writes that field the way it
writes any text: usually `model.ask` (text) -> `state.set`. The widget draws the field's current text. Nothing else about
agents changes, which is the point: no new card, no new permission (`show:panel` already covers a panel).

### 2.2 Why the sealed-frame guarantee still holds

In A the author is vetted once and every value is escaped. In B the markup itself is model output, so it is never
trusted at install or at write. At **render time** it goes through `cleanMarkup` (`src/lib/agent-template.ts`), then into
the same sealed frame. Three layers, any one of which holds on its own:

1. **Allow-list rewrite, not a blacklist.** A small tokenizer reads the text and **re-emits** it: only allowed tags
   (text and layout: `div span p br hr b i em strong u s small sub sup code pre blockquote h1-h6 ul ol li table thead
   tbody tr td th caption`; drawing: `svg g path rect circle ellipse line polyline polygon text tspan defs
   linearGradient radialGradient stop title desc`), only allowed attributes (`style class title width height colspan
   rowspan viewBox fill stroke stroke-width opacity d x y x1 y1 x2 y2 cx cy r rx ry points transform offset
   stop-color stop-opacity text-anchor font-size font-weight preserveAspectRatio xmlns role aria-label lang dir`),
   attribute values re-escaped. Everything else (tags, attributes, comments, CDATA, doctype, processing instructions)
   is dropped; the text inside a dropped tag is kept as text. `<img>`, `<a>`, `<style>`, `<script>`, `<iframe>`,
   `<form>`, `<link>`, `<meta>`, `<base>`, `<foreignObject>`, event handlers, `href`/`src`/`xlink:href` are therefore
   not "filtered", they are not in the vocabulary. Inline `style` values lose any declaration with `url(`, `@import`,
   `expression`, `behavior`, `-moz-binding`, `javascript:` or a backslash escape.
   Unclosed tags are closed; nesting depth is capped at 20; the result is capped at 8192 characters (cut at a token).
2. **The same sealed frame as A.** No scripts (`sandbox=""`), no network (CSP), no access to the app page or its storage.
   Even markup that slipped past layer 1 cannot run or load anything.
3. **Untrusted by construction at the checker.** `bind` must name a `text` field (`E_BIND` otherwise); `template` and
   `bind` together, or neither, is `E_WIDGET`. A template in mode A still goes through its install-time check as before.

Honest limit: layer 1 stops *capabilities*, not *ugliness*. The model can still draw a giant red `svg` or text that
says something rude; the panel is a fixed-height frame with its own border, and the person can hide the panel (the existing
"hide this panel" control). A fake-looking Molfar prompt drawn inside the frame is possible and can only be argued
against by the frame's visible border and title; it cannot ask for anything, because nothing inside the frame is
clickable (no `a`, no `form`, no handlers).

The Forge form for the widget gets a switch: "Fixed look (template)" / "The model draws it (field)". Preview in
mode B shows the field's sample text through the same cleaner so the author sees what survives.

## 3. Order of work and checks

1. Engine: `hardTimeoutMs`, `script` permission and host call, `src/plugins/script-box.ts`, engine tests. `bun run typecheck`, `bun run test`.
2. Roleplay: checker + executor + plugin sync, host (`stepRun`, dry run), `cleanMarkup`, widget, tests.
3. Forge UI (card form, palette, install screen line, mode switch) per `UI-PLAN.md`, then `ux-review` and a browser check.
4. DATA-FORMATS.md, the agent-craft skill reference, CHANGELOG line, `.fork/STATE.md`, issue #140 comment.

## 4. UI plan (for ux-review)

Where: the Forge (agent editor) palette gets one group, "Code", with the Script card. Selecting the card opens `ScriptForm`
in the same side form every card uses: a code box with a character counter, a row editor for inputs and one for outputs
(id + type, up to 8 each), and a collapsed "What the code can and cannot do" note. Reused: `CardForm`, the port row
editors of the Dice/Pick forms, `<details>`, existing issue list. Mode B: the `html` widget form gets a two-way switch
"Fixed look" / "The model draws it" and a text-field select; the tip is a collapsed `<details>` with a sample prompt.
The Allow page (agent permissions dialog) gets a "Code" group; `run:code` reads "Run code the agent author wrote, in a sandbox"
and the group has a "Read the code (N)" `<details>` that lists each script. The Try tab shows "Running the script on the engine..."
while a script is out.
States: empty code, syntax error (`E_SCRIPT_SYNTAX`), too many cards, old engine (the agent fails with the plain message), script
running, script failed (shown on the `failed` wire or as the run's reason), empty bound field ("Nothing drawn yet."), bad bind.
Phones: the forms are single-column already; the Allow page reuses the existing dialog.

## 5. Left out, and open

- `batchKey` (the third part of #140) was not requested and is not built.
- Decisions for the owner: the wording of `run:code`; the limits (500 ms, 16 MB); raising the Roleplay manifest `engine`
  range at release; whether a changed script should ask for the permission again.
