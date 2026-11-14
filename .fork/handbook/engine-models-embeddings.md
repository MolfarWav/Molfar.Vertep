# Engine: models, connections, model calls and embeddings
Verified at: molfar.vertep 5b6f37a

## What it does
- A connection is a user's provider entry; its credentials are read by `readAuth`. `UserModelService` in src/models.ts turns connections into a model list and runs every generation.
- Apps never call a provider. A plugin asks through `host.llm.request` or `host.llm.embed`, and the host runs those after the sandbox pass returns.
- Each model can carry a parameter block (model-params.json), merged field by field with the request.
- Embeddings come from the downloaded local model, a local server, or a keyed remote endpoint.
- Image and speech calls are only named here.

## Owners
- `src/connections.ts` `readConnections`: reads the connections file; `readAuth` reads credentials; `createConnection` validates and writes.
- `src/providers/custom.ts` `buildProvider`: builds one provider from a connection; `CURATED_PROVIDERS` holds the presets.
- `src/providers/sse-tolerant.ts` `tolerantSseFetch`: cleans the chat stream before the client reads it.
- `src/models.ts` `resolveModel`: picks the model a call uses.
- `src/models.ts` `generate`: traced entry point for every generation; `generateInner` runs the call.
- `src/models.ts` `withModelParams`: merges the model's parameter block into the request.
- `src/models.ts` `embed`: chooses the embedding source and returns vectors or null.
- `src/models.ts` `embedRequest`: one embeddings POST.
- `src/model-params.ts` `mergeParams`: the rule between block and request.
- `src/model-params.ts` `validateBlock`: checks what a block may hold; refuses credential headers.
- `src/model-params.ts` `acceptsServiceTier`: decides whether `service_tier` is sent.
- `src/cache-probe.ts` `cacheProbe`: sends two identical long prompts and reads whether the second was cached (route `"/v1/models/cache-check"`, src/server/app.ts).
- `src/plugins/runtime.ts` `runPassRequests`: runs one pass's llm and embed requests.
- `src/plugins/runtime.ts` `applyLlmRequestHooks`: lets sibling plugins patch a route's request.
- `src/plugins/sandbox-worker.mjs` `request` (in the `llm` object): records a request inside the sandbox.
- `src/plugins/llm-pace.ts` `Pacer`: spaces request starts and retries rate-limit refusals.
- `src/embed-local/catalog.ts` `LOCAL_MODELS`: the two downloadable models, pinned revision, sizes, sha256.
- `src/embed-local/index.ts` `sharedLocalEmbedder`, `LocalEmbedder`: download, load and embed.
- `src/embed-local/worker-source.ts` `CHILD_SOURCE`: the child process that loads the model.
- `src/embed-model-names.ts` `canonicalEmbedModel`: one name per embedding model.

## A model call from an app plugin
1. The plugin calls `host.llm.request(key, req)`; the call only records the request. At most 16 per pass (`sandbox-worker.mjs`).
2. The host reads the recorded requests in `runPassRequests` and strips `stream`, `wantsTools`, `turn`, `promptSources`, `images` and `tools`.
3. Pictures with no model named get the picture model from `visionModel`.
4. For route calls only, sibling `llmRequest` hooks run (`applyLlmRequestHooks`); only `LLM_PATCH_FIELDS` survive a patch.
5. The host adds `source` (the app), `paramsKey` (the request key), an abort signal and delta callbacks for streams.
6. Without `limits.concurrency` requests run one by one; with it, `Pacer.run` spaces starts and retries rate-limit refusals.
7. `generate` logs the outcome (`llmLogResult`, `llmLogError`); `generateInner` calls `resolveModel`, `withModelParams`, then `generateResolved` and `generateModel`.
8. The result goes to `results.llm[key]`. A failure or cancelled stream becomes an empty generation (`emptyGeneration`), not a throw.
9. The next pass reads `host.llm.results[key]`. The default is 3 passes (`PASSES_DEFAULT`).

## Parameters
- `model`: "provider/id" or a bare id; null means the default. A named model that is missing throws and is never swapped. The default order is the settings file's model, the instance default, then the first shown model (`resolveModel`).
- `messages`: roles user, assistant, system. Leading system entries form the system prompt; later ones go out as user turns (`GenerateRequest`).
- `systemPrompt`: the system prompt. `sessionId`: the key for provider prompt caching.
- `presetParams` (temperature, max_tokens, params): the block wins field by field unless `paramsSource` is "request" (`mergeParams`). `reasoning`, `thinkingBudget`, `reasoningTags` merge the same way.
- `images`: sent with the last user turn; a model without image support refuses. `promptFormat`: text-completion connections only.
- Blocks, chosen by `blockFor`: `chat` (app reply, key "reply", and API callers), `plugins`, `plugin:<app>/<plugin>` over `plugins`, and `molfar` for the built-in agent.
- Dropped: null and undefined values; in a plugin block, keys outside the short list (`validateBlock` throws when a block is checked); credential and transport headers (`HEADER_DENY`); `serviceTier` unless `acceptsServiceTier` says yes.

## Embeddings
- `host.llm.embed(key, {texts, model?, kinds?})` in one pass; `embedResults[key]` and `embedInfo[key]` ({model, via}) arrive next pass. At most 8 per pass (`sandbox-worker.mjs`). `kinds` marks query or document text.
- `embed` drops blank texts and cuts each text at 8000 characters; the runtime (`alignEmbeddings` in `src/embed-model-names.ts`) hands a plugin one entry per text, `null` for a blank one, so `texts[i]` pairs with `embedResults[key][i]`. `embedProvider` picks the source: "local" is the downloaded model only; the `OPENROUTER_PROVIDER_ID` value uses the fixed `OPENROUTER_EMBED_URL`; a connection id is that connection only; "auto" tries local file, local-server connections, keyed remote ones, then the fixed endpoint. Null means none answered; callers fall back to lexical search.
- Local: `LocalEmbedder.embed` adds the query or document prefix from the catalog entry, pools as the entry says, and unloads after `idleMs` idle.
- Remote: `embedRequest` POSTs `{model, input}` with a 20 s timeout. A remote address must be https and needs a usable key; a local one may skip the key.
- Names: `embedModelUsed` stores the canonical name. Defaults: `DEFAULT_EMBED_MODEL`, `DEFAULT_OPENROUTER_EMBED_MODEL`.
- Local files: both entries in `LOCAL_MODELS` are int8 (dtype "q8", `onnx/model_quantized.onnx`). The first is about 587 MB and the second about 346 MB. Files go to `<data folder>/embed-local/models/<repo>/`; the runtime package goes to `embed-local/runtime`, installed by Bun from `RUNTIME_LOCK`.
- Download: files come from `HF_HOST` at a pinned revision, resume from `.part`, and sha256 is checked (a mismatch deletes the file). `ramMb` in the catalog is 1100 and 600.
- The model runs in a child Bun process (`childEngine`, `CHILD_SOURCE`), so a crash leaves the engine up.
- Routes: `/v1/embeddings/config` (GET, PUT); `/v1/embeddings/local` and its download, cancel, connect and delete routes (the app.ts comment says no app route reaches them); `/v1/embeddings/probe` (`embedProbe`). No route lets an app embed directly.
- Vectors go back in `results.embed`; no vector store was found on this path (tree not searched).

## Limits and timeouts
- `embedRequest` 20_000 ms; `localEmbedModel` 5_000 ms and a 600_000 ms cache; `detectPromptFormat` 3_000 ms (`FORMAT_DETECT_TTL` 60_000 ms); `postImagePrompt` 10 * 60_000 ms; all inline in src/models.ts.
- `MAX_TOOL_ROUNDS` = 8, inline in `generateModel` (src/models.ts).
- `embed` 8000 characters per text, inline (src/models.ts).
- `DEFAULT_PACE` (src/plugins/llm-pace.ts): minGapMs 250, retries 3, baseDelayMs 2000 doubling; plus up to 250 ms jitter inline in `Pacer.run`.
- `PASSES_DEFAULT` 3, `PASSES_MAX` 12, `CONCURRENCY_MAX` 4 (src/plugins/llm-pace.ts).
- 16 llm and 8 embed requests per pass (src/plugins/sandbox-worker.mjs, inline).
- `CALL_TIMEOUT_MS` 20_000 and `CALL_OVERHEAD_MS` 10_000 (src/plugins/sandbox.ts) bound the sandbox call, not the model call.
- `idleMs` 10 * 60_000 (src/embed-local/index.ts, LocalEmbedder constructor); runtime install timer 15 * 60_000 (`installRuntimeWithBun`).

## If you change X, also touch Y
- A plugin request field: `request` in src/plugins/sandbox-worker.mjs, the strip list in `runPassRequests`, `GenerateRequest` in src/models.ts, and `LLM_PATCH_FIELDS` if hooks may set it.
- A parameter block field: `SHORT`, `NUMERIC`, `validateBlock` and `mergeParams` in src/model-params.ts.
- A local model: `LOCAL_MODELS` (revision, sizes, sha256), the `LocalModelId` type, and `FAMILIES` in src/embed-model-names.ts if a remote copy exists.
- Embedding order or defaults: `embed` and `readEmbedSettings` in src/models.ts, and the PUT check in src/server/app.ts.
- A provider wire: `buildProvider` in src/providers/custom.ts and the registration in src/models.ts. Keep `tolerantSseFetch` on custom connections.
- Pacing: `DEFAULT_PACE` and the bounds in src/plugins/llm-pace.ts.

## Traps
- `embed` drops blank texts before embedding, and `runPassRequests` returns the shorter list unchanged. A plugin can get fewer vectors than texts; check the length and align by position.
- A default model is swapped silently when its connection goes offline; a named one throws.
- Vectors of different models do not compare; `embedInfo` says which model made them.
- `host.llm.results` exists only in the next pass.
- A cancelled stream commits nothing; a rate-limit retry does not happen after streamed text was sent.

## Tests that guard it
Named only; I did not read them: test/models.test.ts, test/model-params.test.ts, test/llm-pace.test.ts, test/cache-probe.test.ts, test/custom-sse-tolerant.test.ts, test/embed-local.test.ts, test/embed-model-names.test.ts, test/embeddings-config.test.ts, test/plugins.test.ts.

## Not verified
- The body of `generateModel` and the provider library it calls, so per-provider parameter drops beyond `acceptsServiceTier` are unconfirmed; no provider-call timeout was seen in src/models.ts.
- `schema` in `LLM_PATCH_FIELDS`; `MAX_TOOL_PASSES` in src/plugins/runtime.ts (scope not read).
- Image and speech details; live-catalog and prompt-format rules; the settings UI and the LLM log file.
