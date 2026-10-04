# Molfar's skills: a lighter index and card skills (queued 2026-10-04)

Order: after the relationship dashboard; where it goes relative to Memory v2 is the user's call.
Raised by the user on 2026-10-04: does Molfar load every skill into the context, and Molfar has no
good skills for creating or adapting character cards.

## Facts (checked in code and on the desktop, 2026-10-04)

- Skill BODIES are not in the context: `skill_load` reads one when a task needs it.
- The system prompt carries an INDEX: one line per skill, name + description (description up to 300
  characters). Small-window mode keeps only the first sentence, cut at 140 characters
  (`skillLine` / `shortSkillLine`, `memoryPromptSection` in `src/agent/memory.ts`).
- Desktop workspace: 11 skills (9 built-in + 2 Roleplay app skills: `edit-large-card`,
  `roleplay-ui-orchestrator`), index about 1.07k tokens (`estimateTextTokens`). Every new skill adds
  about 70-100 tokens to every chat.
- Defect: `memoryPromptSection` calls `listSkills(root)` with no scope, which returns the global ones AND
  every app's and every free project's skills. So app skills ride every chat's index, and are shown
  again by `projectContextFor` the first time the app is touched. App scoping saves nothing today.
- All 9 built-in skills are about changing apps (app-authoring, two-phase-llm, finish-change, ...).
  A chat about a story or a card still carries all of them.

## Part A (engine): a lighter index

1. The system prompt index lists global and built-in skills only. App skills show when the app is
   touched (`projectContextFor`, already there) or in a project chat; free projects likewise.
   Changing what goes into the prompt needs `evictAgents` or a stamp change (CLAUDE.md rule).
2. Consider shorter built-in descriptions (the first sentence carries the trigger) and measure
   before / after with `estimateTextTokens`; keep the full-prompt budget test green.
3. Test: an app skill is not in the base prompt, is in the project context of that app.

## Part B (content): card skills for Molfar

Sources: the user's own skills, `E:\Hermes\profiles\rp-platforms\skills\` on the desktop
(`bot-writer`, `character-depth`, `lore-architect`, `rp-card-adaptation`; maybe parts of
`ai-roleplay-platforms`). Used before through Hermes and Claude to create and adapt cards.

- Where: Roleplay app skills (`apps/roleplay/.skills/<name>/`, shipped in the Roleplay fork), so they
  appear only when Molfar works on the Roleplay app (after Part A), not in every chat.
- Molfar's limits: description one line <= 300 characters, body <= 20 000 characters, at most 8 supporting
  files of <= 50 000 characters each (`bot-writer` has 10 references: merge some).
- Adapt to Molfar Vertep: the card format on disk (`data/characters/<id>/card.json`, the `studio` bag,
  alternates, versions), lorebooks (`data/lorebooks/<id>.json`), souls (`extensions.molfar_soul`,
  Roleplay `docs/SOUL.md`), large cards (`edit-large-card`, later `json_set`), text-only small models.
  Platform-specific parts (RisuAI, JanitorAI, Marinara, SillyTavern import) move to one reference or go.
- Before anything enters the public fork repo: read every file for the user's own chats, names or
  private canon (the Aika canon stays out).
- Work: a cheap model drafts the adaptation from a precise spec, the orchestrator reviews; then a real
  card the user picks, created and adapted by Molfar on a free small model, and the user judges it.

## First step next time
Ask the user (AskUserQuestion): which skills, Part A first or together, and copy the chosen skill
folders into the session's folders (the laptop has no E: drive).
