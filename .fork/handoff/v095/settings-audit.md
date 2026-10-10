# 0.9.5 item 7: Roleplay Settings audit (what is left or doubled now that models live in the shell)

Draft table by an external model (read settings-view, samplers-panel, settings/*, the shell's settings.tsx and
model-panel.tsx), every claim below checked against the code by the orchestrator (2026-10-10). One claim of the
draft was wrong (a "second embeddings field" in the Litopys section is the arc settings) and is left out.

## Doubled or misleading (verified)
1. **Preset "Context size" is dead whenever the model's window is known.** The reply request sends
   `limits.contextWindow` (the engine's number, the user's override first; `src/lib/model-params.ts modelLimits`),
   and the plugin replaces the preset's `openai_max_context` with it (`plugins/engine/plugin.js withModelLimits`),
   even with the preset's "override" switch on (that switch only drops `maxOutput`). The field in Samplers
   (`samplers-panel.tsx:119`, "Context size (unlocked)") still looks editable.
2. **Preset "Max response tokens"** is replaced by the model's Chat block max output when that block has one
   and the override switch is off; the field gives no sign of it. (The new effective-parameters grid in the chat
   header shows the result, but the Samplers panel does not.)
3. **Temperature, samplers, reasoning** exist on the model (shell) and on the preset; which wins is one switch
   ("override", `samplers-panel.tsx:49-57`) with a one-line text above it. Works as designed; easy to miss.
4. **Embeddings model** (Library settings, `memory-summary-section.tsx:52-60`): a free-text field that writes the
   shell's embeddings config (`PUT /v1/embeddings/config`), the same value Settings > Memory edits there with a
   provider picker.
5. **Interface Language** (`settings-view.tsx:49`, English / Українська) is separate from the shell's language
   (14 locales) and does not follow it: switching the shell to Ukrainian leaves the app in English until this
   is set too.
6. **Backups**: the app's "Export backup (zip)" / "Restore backup (zip)" (Roleplay data only) next to the shell's
   Settings > Backup (whole profile). Different scopes, both useful; the labels do not say so.

## Proposed changes (pick; recommended first)
- A (recommended). Context size: when the model's window is known, show it read-only in Samplers ("32k, from the
  model: Set up") with the field kept only for unknown windows. Max response tokens: the same line when the
  model's Chat block sets it and the override is off.
- B (recommended). Language: default the app to the shell's language (uk/en, else English) until the user picks
  one in the app. Needs a small engine part: the shell keeps its locale in its own localStorage
  (`chrysalis-lang`), which a sandboxed app frame cannot read, so the shell hands it over (the frame URL or a
  bridge call).
- C. Embeddings: replace the free-text field with the status line and a "Set up in Settings" link (the shell owns
  the provider and the key).
- D. Backups: rename to "Export Roleplay data (zip)" / "Restore Roleplay data (zip)" and a hint that Settings >
  Backup saves the whole profile.
- E. Leave the samplers duplication as it is (the preset switch is the design from 0.9.2).

All other controls (appearance, chat behaviour, streaming, themes, Litopys settings, stop strings, logit bias,
prefill) are app-only and stay.
