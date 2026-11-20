# Meanwhile bench (#449, M1a)

Sends the pass's real prompt (`buildPrompt`) on an invented world (`fixture.mjs`, English and Ukrainian) to external models through
`ask-model`, then reads each answer with `parseEvents` and `buildEvents`. Invented data only: any provider may see it.

    RP_DIR=<Roleplay checkout> node run.mjs "nous/meituan/longcat-2.5:free,nanogpt/deepseek/deepseek-v4.1-flash"

Arguments: `provider/model` pairs, comma separated; 2 runs per language, 3 calls in parallel; answers and a `results.json` go to `out/`.
Run it from this folder; needs the keys of the ask-model skill.

## First result (2026-11-20, before M1b)
- 5 models answered 53 events in 22 calls: every answer parsed, all 53 events passed the rules (after one rule was relaxed, see
  below); no model put the player's character or anyone in the scene into `who`; Ukrainian input got Ukrainian text.
- Models: LongCat 2.5 free (Nous), DeepSeek V4.1 Flash, V4 Pro, GLM 5.3 Flash, Muse Spark 1.3 (NanoGPT). Time per call: 3 to 6 s
  for DeepSeek, 30 to 108 s for GLM Flash, Muse Spark and LongCat.
- One empty answer (GLM 5.3 Flash spent the whole token budget thinking): M1b must treat an empty answer as a retry, like World's
  thinking-only retry.
- `poolside/laguna-s-2.1:free` on Nous answers 404 (gone); the ask-model skill still lists it in the `free` chain.
- The rule "a relation effect needs both people in the event" dropped a good event ("Elena begs Bram", Bram only named). Relaxed:
  one side in the event, both off screen.
- Not seen by this bench: an item effect can be silly (DeepSeek Flash moved the stolen ledger as an effect of an unrelated smuggling
  event). The code cannot tell; M1b should apply only front clock and relation effects by itself and show item and NPC moves as
  proposals. Small-window and weak models were not tried.
