// Task templates: the jobs people come to Molfar for, each a slash command
// (/card, /lorebook, …), a starter card on the empty chat and a tile in the
// phone's quick-action grid. Picking one sends a request that names the skill
// to load and asks Molfar to collect the 2-3 details it needs in ONE ask_user
// card first, so the "form" is the chat's own question card, not a dialog of
// ours that would drift from what the skill actually needs.
import type { AgentSkill } from "./api"
import { skillPrefix } from "./SlashCommands"

export interface TaskTemplate {
  /** the slash command, without "/" */
  id: string
  label: string
  /** one line under the label */
  description: string
  /** the skill it loads; the template is offered only when it is installed */
  skill: string
  /** the task, after the skill request */
  task: string
  /** what Molfar asks about before it starts, in one ask_user card */
  asks: string
  /** true: the text goes into the composer for the user to finish (it ends where a detail is still to come) */
  fill?: boolean
}

export const TEMPLATES: readonly TaskTemplate[] = [
  {
    id: "card",
    label: "New character card",
    description: "From a link, a pasted text or an idea",
    skill: "card-craft",
    task: "make a character card. ",
    asks: "where the card comes from (a link, pasted text or an idea), the language, and how long the description should be",
    fill: true,
  },
  {
    id: "lorebook",
    label: "Build a lorebook",
    description: "Entries, keys and links from your notes",
    skill: "lorebook-craft",
    task: "build a lorebook.",
    asks: "the world or character it is for, what it should cover, and roughly how many entries",
  },
  {
    id: "preset",
    label: "Audit a preset",
    description: "What it sends, what to cut, what is broken",
    skill: "preset-craft",
    task: "audit a preset.",
    asks: "which preset, the model it is used with, and what feels wrong in the replies",
  },
  {
    id: "fix",
    label: "Fix something in an app",
    description: "Describe it, attach a screenshot if you have one",
    skill: "app-authoring",
    task: "fix a problem in an app. ",
    asks: "which app and screen, what happens, and what should happen instead",
    fill: true,
  },
  {
    id: "skill",
    label: "Write a skill",
    description: "Teach Molfar a repeatable job, step by step",
    skill: "skill-authoring",
    task: "write a new skill.",
    asks: "the job it is for, when it should be used, and where it should live (global or this project)",
  },
]

/** The templates whose skill is installed here, with the text each one sends. */
export function availableTemplates(skills: readonly AgentSkill[]): Array<TaskTemplate & { text: string }> {
  return TEMPLATES.flatMap((t) => {
    const skill = skills.find((k) => k.name === t.skill)
    if (!skill) return []
    const text = `${skillPrefix(skill)}${t.task}${t.fill ? "" : " "}Before you start, ask me in ONE ask_user card (2-3 questions, options where they fit): ${t.asks}.${t.fill ? "\n\n" : ""}`
    return [{ ...t, text }]
  })
}
