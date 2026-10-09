# Connections and sampling today (read from code 2026-10-09, before item 2)

Researched by a subagent (read-only); line numbers as of `claude/v092` d996b27 and Roleplay `chat-links`.

## Engine
- A connection (`src/connections.ts:23-42`): name + builtin `providerId` | Radius OAuth | custom `api` + `baseUrl`;
  `proxyOf` for a reverse proxy; `models` = "auto" or rows `{id,name?,contextWindow?,maxTokens?,reasoning?}`;
  openai-text `promptFormat`. No sampling params, headers, vision or prices on a connection.
- Disk: `<dataDir>/credentials/<user>/connections.json` (no keys) + `auth.json` (keys, 0600, not encrypted at
  rest; each key bound to its base URL, a URL edit drops the key). Profile export encrypts (`secrets.enc`).
- Routes: GET/POST `/v1/settings/connections`, PATCH/DELETE `/:id` (name, baseUrl, key, models, promptFormat);
  legacy key routes `/v1/settings/providers/:id/key`; OAuth under `/v1/settings/oauth`. No "test connection".
- Shell UI `client/src/settings.tsx`: ApiTab :1494, EditConnection :1670, AddConnection :1759, ProviderForm
  :2046, ModelsEditor :2258, ModelsTab :1567 (shown models only). No context/price UI in the shell.
- Phone: Settings only through the user menu (header gear `max-md:hidden`, App.tsx:527); 767 px drill-down.
- Provider catalog: served by the engine (`GET /v1/settings/providers`, app.ts:1767; pi-ai builtins +
  `CURATED_PROVIDERS` custom.ts:68-216 + providers.json). No platform gating found. Hypothesis for "no
  presets on Android": `useResource` swallows fetch errors (use-resource.ts:31-35), so a failed providers
  fetch shows only sign-ins/Local/Custom tiles silently. Unverified.
- Agent model: engine `settings.json` `model`/`reasoning` (PUT /v1/settings) + client-agent localStorage
  (`agent-ui-model`, per-session map, project default). Order: request > project.json > settings.json >
  config.yaml defaultModel. No dependency on Roleplay.
- Params: no defaults anywhere in the engine; per request `presetParams {temperature,max_tokens,params}` +
  `reasoning` + `thinkingBudget` (models.ts:121-159, applied :1106-1109, :1209-1213). pi-ai honours
  samplingParams on openai-completions/responses/azure only (not anthropic-messages).
- Per-model data already engine-side: `model-overrides.json` (context), `model-pricing.json` (prices),
  `models-shown.json`, connection `models[]` (contextWindow/maxTokens/reasoning), providers.json
  `CustomModelDef` (vision, cost).

## Roleplay
- `connections-view.tsx` is read-only for connections: in-use model (context and price edit), quick switch
  (`library.json` connectionProfiles), provider pills matched by connection NAME, model search.
- Its model: app `data/settings.json {model}` (not the engine's), sent in every request body; per-chat
  `meta.model` exists but the UI never writes it.
- Samplers: `SamplerSettings` (types.ts:259-279; defaults seed.ts:14-24) -> `presetToEngine` writes enabled
  values to preset top-level keys -> plugin `assemble` rebuilds presetParams from them; `studio.samplers` only
  for seed/stop/logit_bias; `extendedSamplers` into params. Per chat only `presetId`.
- Budgets by the preset's `openai_max_context`, not the model's window; `maxOut` always 0.

## Gaps
Context/prices engine-wide but editable only in Roleplay; three context numbers (connection row, overrides,
preset contextSize); samplers in three places in Roleplay; reasoning effort 'min' may fall to off in the
engine (models.ts:1048-1051, unverified); two different "model" settings; providers matched by display
name; reverse proxy settable only at create.

## Where the user sees connection things (user, 2026-10-09, screenshots)
Shell Settings (header gear / user menu), the chat header model picker, the Roleplay rail "Connections",
the Roleplay Settings (bottom of the rail), plus many internal settings.
