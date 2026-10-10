# 0.9.7: the prompt inspector with sources

Started 2026-10-10. Engine branch `claude/v097-inspector`; Roleplay clone `.claude/worktrees/rp-memory`,
branch `inspector-sources` (from the fork main 4.31.0). Roleplay ships as 4.32.0.

## The user's decisions (2026-10-10)
- Both places: Molfar's prompt inspector (real requests) and Roleplay's prompt peek in the chat (a dry run).
- A table of sources with tokens and share; a click highlights that part in the text; the text carries
  colored marks with the label on hover.
- Also shown: what did NOT make it (lorebook entries that did not fire or did not fit, with the reason;
  history the budget cut; messages Litopys holds as chapters; Data Bank chunks over the room; preset
  sections off by a condition, a trigger or a switch), regex changes (which script changed which message),
  the preset's choices in effect.
- Molfar's own requests labeled too (system prompt parts, memory, skills, persona, tools), in 0.9.7.

## How it works
Labels never ride the text. The app sends, beside the request, a host-only list "this exact text came from
here"; the engine finds each text in the final request and stores ranges. Merges (section groups, squashed
system messages, post-processing, a single user message, text-completion flattening) only join texts, so
every part stays a substring. What a llmRequest hook adds is labeled by the engine itself: it compares the
request before and after each hook, so any app with hooks gets this without code.

### App contract: `promptSources` on a route's llm request (host-only, never sent to a provider)
```
promptSources: {
  v: 1,
  parts:   [{ kind, label, detail?, text }],      // text exactly as it is in the request
  omitted: [{ kind, label, detail?, reason, tokens? }],
  vars:    [{ name, value, label? }]              // the preset's choices in effect
}
```
- `kind` (legend and color; unknown -> `other`): `card`, `persona`, `preset`, `lorebook`, `example`,
  `databank`, `note`, `history`, `group`, `memory`, `dashboard`, `utility`, `prefill`, `plugin`, `other`.
  Molfar's own: `rules`, `workspace`, `apps`, `docs`, `memory`, `skills`, `persona`, `tools`.
- Caps (sanitized like `sanitizeTurn`; anything else dropped): parts <= 2000, omitted <= 500, vars <= 100,
  label <= 120 chars, detail/reason <= 300, value <= 200, all part texts together <= 4 MB (past it the
  last parts lose their text and show as "not located").
- Stripped in `runPluginPass` beside `stream`/`wantsTools`/`turn`, so a hook never sees it and cannot
  rewrite another plugin's labels. Older engines ignore the field (GenerateRequest fields are picked by
  name), so Roleplay 4.32.0 still runs on 0.9.6, without sources.
- A llmRequest hook may return `promptSources: { parts, omitted }` beside its patch: added to the list,
  never replacing. What the hook inserted that its own parts do not cover becomes
  `{ kind: "plugin", label: <plugin name> }`.
- Hook diff: messages aligned by content (LCS on the message texts); a new message is the hook's whole;
  a changed one gives the middle between the common prefix and suffix; a changed systemPrompt the same.

### Engine: inspector entry
`InspectorEntry.sources?` (absent when nothing was labeled; never in the list summary):
```
{ parts:   [{ kind, label, detail?, tokens, located }],
  spans:   [{ msg, start, end, part }],          // msg -1 = system prompt; offsets in the unclipped text
  omitted: [...], vars: [...],
  unlabeled: tokens }                            // glue: separators, wrappers, engine text
```
Locate: parts in order, each searched from the end of the previous match in the same message first, then
anywhere not yet claimed; a short text (< 12 chars) is matched only from the cursor. Tokens per part:
`estimateTextTokens(text)`. Spans past `TEXT_MAX` are kept; the view highlights what it shows.
Molfar's requests: `systemPromptFor` returns its parts beside the text (base, rules, workspace layout,
installed apps, admin tools, each instruction doc, memory notes index, personal instructions), cached with
the agent instance; history messages labeled by role, the compaction summary as `memory`, tools with
per-tool tokens.

### Roleplay: what `assemble()` labels
- Card fields per member (`card`, "{name} · description" etc.), the card's system prompt vs the preset's
  main section, persona, scenario, examples, post-history instructions, the group scene line (`group`).
- Preset sections: "{preset} · {section}" (`preset`); group wrappers are glue.
- Lorebook entries one by one: "{book} · {entry}", detail = why it fired (0.9.4 why rows); entries that
  did not fire or did not fit go to `omitted` with the reason (`activateWorldInfo` returns placed parts
  beside its strings; `trace`/`skipped`/`blocked` already hold the why).
- Data Bank chunks "{file} #{n}", over-room chunks omitted; author's note; depth injections; utility
  prompts; prefill; compact history.
- History: one part per message ("{name} · #{n}"), detail "regex: {script names}" when a prompt-stage
  script changed it (`runRegexScripts` reports the scripts that changed the text). Omitted: messages the
  budget trimmed (count + range), messages held by Litopys as chapters (count).
- Sections off: omitted with reason `condition {expr}`, `trigger {types}`, `off`.
- `vars`: `resolvePresetVars` result with the option labels.
- Litopys and relations hooks return their own parts (Litopys: chapters / facts / backstory chain;
  relations: the dashboard insert, the nudge, the fast reminder).
- The peek route (`POST /prompt/preview`) returns `sources` with spans located in the plugin (same
  algorithm, a small copy) since no engine call happens. The peek does not run hooks (as today); it says so.

## Steps
1. Engine: contract, sanitizer, strip, hook diff attribution, inspector locate, tests (orchestrator).
2. Engine: Molfar's own parts (orchestrator).
3. Roleplay: assemble labels, omitted, vars, regex names, hooks' own parts, peek route, tests (draft by an
   external code model from this spec, reviewed and tested by the orchestrator).
4. UI: agent page Inspector (sources table, highlight, omitted, choices, legend) and Roleplay's peek
   dialog; Roleplay strings in its locales (cheap model). Drafts by an external model, integrated and
   browser-checked by a Sonnet subagent (dark, light, 390).
5. Docs: `builtin-skills/app-authoring` (the contract), Roleplay `docs/DATA-FORMATS.md` if it lists
   request fields; release notes; live test by the user; release 0.9.7 + Roleplay 4.32.0 on the user's word.
6. Last before the release (user, 2026-10-10): the lorebook UI's plurals, "1 entries" / "1 global books"
   (Roleplay). Remind the user before pushing that this should be fixed in this patch.
