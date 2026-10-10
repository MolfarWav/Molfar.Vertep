# 0.9.7 UI: sources in the prompt inspector and in Roleplay's prompt peek

Data: `PLAN.md` here. Both views show the same three things: a sources table, colored marks in the
texts, and what was left out / the preset's choices. English only on the agent page; Roleplay's peek
dialog is English today, it stays English.

## Agent page: `client-agent/src/Inspector.tsx` (+ a new `client-agent/src/inspector-sources.tsx`)
API (`client-agent/src/api.ts`, `InspectorEntry`), new optional fields from the engine:
```
sources?: {
  parts:   { kind: string; label: string; detail?: string; tokens: number; located: boolean }[]
  spans:   { msg: number; start: number; end: number; part: number }[]   // msg -1 = system prompt
  omitted: { kind: string; label: string; detail?: string; reason: string; tokens?: number }[]
  vars:    { name: string; value: string; label?: string }[]
  unlabeled: number
}
tools: { names: string[]; tokens: number; sizes?: number[] }            // sizes: per tool, same order
```
Kinds and colors (one 500 fill + a text shade + a mark tint per kind, readable on both themes):
card, persona, preset, lorebook, example, databank, note, history, group, memory, dashboard, utility,
prefill, plugin, rules, workspace, apps, docs, skills, tools, user, assistant, toolResult, other.
Pick distinct Tailwind hues; user/assistant/toolResult keep the existing sky/emerald/violet.
Legend labels: Card, Persona, Preset, Lorebook, Examples, Data Bank, Author's note, History, Group,
Memory, Dashboard, Utility prompt, Prefill, Plugin, Rules, Workspace, Apps, Docs, Skills, Tools, User,
Molfar, Tool result, Other.

1. **Sources panel** (only when `entry.sources`), between the context bar and the blocks:
   - Rows grouped by kind, a kind header row with the group's tokens and share of the estimate, then
     its parts: color dot, label, detail (muted, one line, full text in `title`), tokens, share %.
     Parts with `located: false` get a muted "not found in the request" chip and no click.
   - Groups sorted by tokens, largest first; parts inside a group in request order. A group with more
     than 8 parts shows 8 and "Show all N".
   - A "Tools" group from `tools.names` + `tools.sizes` (largest first), when sizes exist.
   - A last row "Unlabeled (separators, wrappers)" with `unlabeled` tokens, when > 0.
   - Click a part: every span of that part gets the active style, the block holding the first span
     expands (if collapsed) and scrolls into view (`block: "center"`). Click again or Esc clears.
   - Below: "Left out (N)" collapsible (closed by default): kind dot, label, reason, detail, tokens.
     "Preset choices (N)": chips `label || name: value`.
2. **Marks in text**: `Text` gets optional `spans` (of that block: system = msg -1, message i = msg i)
   and `parts`; it renders the text as segments, each covered segment in a `<mark>` with the kind's
   tint (background ~15% alpha, no text color change), `title` = "label — detail", the active part
   stronger (~35% alpha + ring). Spans past the shown (clipped) text are cut at its end. A collapsed
   text containing the active part opens.
3. Nothing changes when `sources` is absent (older entries, plain API calls).
4. Phone (390 px): the table stays one column; label wraps, tokens right-aligned; no horizontal scroll.

## Roleplay: `src/components/chat/prompt-peek-dialog.tsx` (+ `src/components/chat/prompt-sources.tsx`)
`promptPreview()` (`src/lib/engine.ts`) gains `sources?` (the PLAN's format: parts with `text`,
omitted, vars) and `sourceSpans?: { msg; start; end; part }[]` (msg -1 = systemPrompt) plus
`located` on each part. Same panel and marks as above, adapted to the dialog's look (Badge, small
text), placed above the blocks, collapsible ("Sources", open by default). Tokens per part via
`estimateTokens(part.text)` from `@/lib/tokens`. The note under the panel: "Plugins (Litopys, the
dashboard) add their parts when the message is sent; they show in Molfar's prompt inspector."

## Checks (`browser-check` skill)
Dark, light, 1280 and 390 px; a Roleplay chat with a card, a persona, a preset with a condition and a
choice, a lorebook with an entry that fires and one that does not, a long history (some trimmed), Litopys
on; open Molfar's inspector on that reply and on one of Molfar's own requests; open the peek dialog.
Screenshots: the table, an active part highlighted in a message, "Left out" open, the phone layout.
