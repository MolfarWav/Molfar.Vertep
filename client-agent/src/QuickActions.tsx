import { useEffect, useRef, useState } from "react"
import { Lightning } from "@phosphor-icons/react"
import { unstable_useComposerInput } from "@assistant-ui/react"
import type { ReactNode } from "react"
import { memoryApi, type AgentSkill } from "./api"
import { skillPrefix } from "./SlashCommands"

/** One chip: the skill it loads and what it leaves in the box after the
 *  request to load it. A text ending in "@" is left open for the file picker. */
const ACTIONS = [
  { label: "New character", skill: "card-craft", text: "create a new character: " },
  { label: "Improve a card", skill: "card-craft", text: "improve the card @" },
  { label: "Write a lorebook", skill: "lorebook-craft", text: "write a lorebook for @" },
  { label: "Audit a preset", skill: "preset-craft", text: "audit the preset @" },
  { label: "Import a card", skill: "card-import", text: "import this card: " },
] as const

/**
 * Chips above an empty composer for the jobs people come to Molfar for. Each
 * is the "/" menu's skill request plus the start of a sentence, so the model
 * is told which skill to load instead of being left to notice that one fits.
 * A chip appears only when its skill is installed here: an engine without the
 * Roleplay app has no card-craft, and a chip that loads nothing would mislead.
 *
 * Picking one fills the box and puts the caret at its end; it does not send,
 * because every one of them ends where a name or a path is still to come.
 */
export function QuickActions(): ReactNode {
  const [skills, setSkills] = useState<AgentSkill[]>([])
  const row = useRef<HTMLDivElement>(null)
  const input = unstable_useComposerInput()
  useEffect(() => {
    void memoryApi.get().then((m) => setSkills(m.skills)).catch(() => undefined)
  }, [])

  const chips = ACTIONS.flatMap((a) => {
    const skill = skills.find((k) => k.name === a.skill)
    return skill ? [{ ...a, prefix: skillPrefix(skill) }] : []
  })
  if (!chips.length) return null

  const pick = (text: string) => {
    // found before the text is set: a filled box takes these chips away
    const box = row.current?.closest('[data-slot="aui_thread-viewport"]')?.querySelector<HTMLTextAreaElement>("textarea.aui-composer-input")
    input.setText(text)
    // The box takes the new text on the next render. The caret has to be set
    // after it: that is also what lets a text ending in "@" open the file
    // picker, which only looks at the text up to the caret.
    requestAnimationFrame(() => {
      if (!box) return
      box.focus()
      box.setSelectionRange(text.length, text.length)
    })
  }

  return (
    <div
      ref={row}
      aria-label="Quick actions"
      // one row that scrolls sideways on a narrow screen; the scrollbar is
      // hidden because the cut-off chip already says there is more
      className="-mb-2 flex w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="mx-auto flex shrink-0 items-center gap-1.5 px-0.5">
        <Lightning aria-hidden size={14} className="text-muted-foreground/70 shrink-0" />
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            className="text-muted-foreground hover:bg-muted hover:text-foreground border-border/60 h-7 shrink-0 rounded-full border px-3 text-xs whitespace-nowrap transition-colors"
            onClick={() => pick(c.prefix + c.text)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
