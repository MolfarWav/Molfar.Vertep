# 0.9.2 item 2: connections in one place, parameters on the model

Decisions: PLAN.md item 2 (user, 2026-10-09). Today's code: `connections-today.md`. Stages S1-S4 below,
each its own commits; S1 and the data format are the orchestrator's, S2/S3 UI drafts go to executors.

## Data: `<workspace>/model-params.json` (next to model-overrides.json and model-pricing.json)
```json
{
  "v": 1,
  "models": {
    "nanogpt/deepseek/deepseek-v4-flash": {
      "chat":    { "temperature": 0.95, "top_p": 0.95, "min_p": 0.05, "repetition_penalty": 1.08,
                   "max_tokens": 4096, "reasoning": "high", "params": { "reasoning_effort": "high" },
                   "headers": { "X-Provider": "deepinfra" } },
      "plugins": { "temperature": 0.3, "max_tokens": 2048, "reasoning": "off" },
      "plugin:roleplay/relations": { "temperature": 0.2, "max_tokens": 1500 },
      "molfar":  { "reasoning": "medium" }
    }
  }
}
```
- Key: the model ref `"<provider>/<model id>"` as `/v1/models` gives it (same as the two override files).
- Blocks: `chat`, `plugins`, `molfar`, and `plugin:<app>/<plugin id>` (the plugin's llm source minus
  `app:`). A field that is absent is NOT sent (the "send / don't send" switch is presence).
- Fields (all optional): `temperature` 0..2, `top_p` 0..1, `top_k` int >= 0, `min_p` 0..1,
  `repetition_penalty` 0..3, `frequency_penalty` -2..2, `presence_penalty` -2..2, `seed` int,
  `max_tokens` int 1..1_000_000, `reasoning` off|minimal|low|medium|high|xhigh|max,
  `thinkingBudget` int >= 0, `reasoningTags` {open, close}, `params` object (custom JSON, merged last into
  sampling params, max 4 KB serialized), `headers` object of string values (max 16, names
  `^[A-Za-z0-9-]{1,64}$`, never Authorization / Cookie / Proxy-* / Host / x-api-key / api-key: refused 400;
  the UI says "no credentials here").
- `plugins` / `plugin:*` blocks accept only temperature, max_tokens, reasoning, thinkingBudget, params
  (the short set); the route refuses other fields there.
- The context window stays in `model-overrides.json` (one source: user override > connection model row >
  catalog). The Roleplay preset's context size stops being a separate truth (S3).
- Prices stay in `model-pricing.json`.
- Writes only through the route (below). `protect.ts`: Molfar asks the user before writing
  `model-params.json` (it changes every generation).

## Which block a request gets (engine, `src/models.ts`) — S1 DONE `e9818a0`
- Agent (Molfar) model calls: `molfar`.
- Plugin calls (source `app:<app>/<plugin>`): a request under the key `reply` (any app: its chat
  replies) gets `chat`; others `plugin:<app>/<plugin>` when that block exists, else `plugins`. The runtime
  sets `paramsKey` after the plugin's fields, so a plugin cannot pose as another.
- As built: the agent path (streamFn) lets the agent's own choices win and the molfar block fills the rest.
- `/v1/chat/completions` and other API callers: `chat` (they are chat-like); `agent-compact`: `molfar`.
- Precedence: the block's fields WIN over the request's own presetParams/reasoning for the fields the
  block has; the request fills the rest. A request may set `paramsSource: "request"` to win instead
  (Roleplay's preset switch "preset samplers override the model").
- The result echoes what was applied: `requestParams` gains `{ block, from: { temperature: "model" | "request", ... } }`
  so the inspector and Roleplay can show "effective value and where it comes from".
- Anthropic-messages and other APIs pi-ai does not pass samplingParams to: only temperature/max_tokens/
  reasoning apply; the UI marks the other fields "not sent by this provider" (from the model's api).

## Routes
- `GET /v1/models/params` -> `{ v, models }` (all). Shell and apps (bridge: read for every app).
- `PUT /v1/models/params { model, blocks: {...} | null }`: replace one model's entry (null removes);
  validates as above; answers the whole file. Shell; apps only when trusted (like `/v1/models/pricing`).
- `GET /v1/models/params/effective?model=&source=&key=` -> `{ block, values, from }` for UIs that show
  the effective value (Roleplay chat header, the shell's "applies to" line).
- The providers fetch on the add-connection screen shows its error + Retry (client `useResource`).

## S2 shell UI (client/src/settings.tsx, all 14 locales)
- Settings > Connections: each connection row expands to its models (the shown ones first); a model
  opens a panel: context window (override), prices, then the blocks as tabs Chat | Plugins | Molfar
  (+ "Add a block for a plugin" listing the installed apps' plugins). Each field: a switch (send/don't)
  and the value; "Custom parameters" JSON and "Extra headers" textareas with validation messages.
- On phones the same through the user menu > Settings (drill-down).
- An `openSettings` message from apps (shell-bridge) opens Settings > Connections on a given model.

## S3 Roleplay (fork, its own release)
- Once (flag in app `data/settings.json`): copy the active preset's enabled samplers + max tokens +
  reasoning into the current model's `chat` block (PUT /v1/models/params), only fields the block lacks.
- Requests stop sending preset samplers unless the preset's new switch `samplersOverrideModel` is on
  (then `paramsSource: "request"`). Presets keep their sampler values (import/export unchanged).
- Budget from the model's context window (GET /v1/models contextWindow with override), not the preset's
  openai_max_context; the preset editor's context field becomes read-only "from the model".
- Connections view: the app's model choice + "Set up in Settings" (opens the shell on that model); context
  and price editing move to the shell. The chat header picker stays; its tooltip/popover shows the
  effective temperature, max output and reasoning with their source.
- Roleplay Settings: model pickers for sensor / Litopys / translation stay as model picks (their params
  come from the model's plugin blocks).
- Update `.fork/app-skills/roleplay/*` and DATA-FORMATS if preset fields change meaning.

## S4 checks
Engine tests for validation, block choice and precedence (faux provider); browser check of the shell
screen (dark, light, 390 px) and of Roleplay; a live run on NanoGPT (inspector shows the applied block).
