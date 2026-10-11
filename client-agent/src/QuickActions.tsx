import { useEffect, useState } from "react"
import { ArrowsInLineVertical, BookBookmark, Check, Feather, GraduationCap, Lightning, Sliders, UserCircle, Wrench } from "@phosphor-icons/react"
import { unstable_useComposerInput, useAuiState } from "@assistant-ui/react"
import type { Icon } from "@phosphor-icons/react"
import type { ReactNode } from "react"
import { memoryApi, type AgentSkill } from "./api"
import { useAgent } from "./store"
import { availableTemplates, type TaskTemplate } from "./templates"

export type ReadyTemplate = TaskTemplate & { text: string }

const ICONS: Record<string, Icon> = {
  card: UserCircle,
  lorebook: BookBookmark,
  preset: Sliders,
  fix: Wrench,
  skill: GraduationCap,
}

export const templateIcon = (id: string): Icon => ICONS[id] ?? Lightning

/** The templates whose skill is installed here. Skills are read once per mount:
 *  an engine without the Roleplay app has no card-craft, and a tile that loads
 *  nothing would mislead. */
export function useTemplates(): ReadyTemplate[] {
  const [skills, setSkills] = useState<AgentSkill[]>([])
  useEffect(() => {
    void memoryApi.get().then((m) => setSkills(m.skills)).catch(() => undefined)
  }, [])
  return availableTemplates(skills)
}

/**
 * What picking a template does. One that ends where a detail is still to come
 * (`fill`) puts its text in the box with the caret at its end; the others ask
 * their questions in one ask_user card, so they are sent at once.
 */
export function usePickTemplate(): (t: ReadyTemplate) => void {
  const input = unstable_useComposerInput()
  return (t) => {
    if (!t.fill) {
      void useAgent.getState().send(t.text)
      return
    }
    // found before the text is set: a filled box takes the chips away
    const box = document.querySelector<HTMLTextAreaElement>("textarea.aui-composer-input")
    input.setText(t.text)
    // The box takes the new text on the next render. The caret has to be set
    // after it: that is also what lets a text ending in "@" open the file
    // picker, which only looks at the text up to the caret.
    requestAnimationFrame(() => {
      if (!box) return
      box.focus()
      box.setSelectionRange(t.text.length, t.text.length)
    })
  }
}

/**
 * Chips above an empty composer for the jobs people come to Molfar for, driven
 * by the same templates as the "/" menu and the starter cards. Desktop only:
 * the phone shows them as a grid (`QuickGrid`).
 */
export function QuickActions(): ReactNode {
  const templates = useTemplates()
  const pick = usePickTemplate()
  if (!templates.length) return null
  return (
    <div
      aria-label="Quick actions"
      // one row that scrolls sideways on a narrow screen; the scrollbar is
      // hidden because the cut-off chip already says there is more
      className="-mb-2 hidden w-full overflow-x-auto overscroll-x-contain md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="mx-auto flex shrink-0 items-center gap-1.5 px-0.5">
        <Lightning aria-hidden size={14} className="text-muted-foreground/70 shrink-0" />
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.description}
            className="text-muted-foreground hover:bg-muted hover:text-foreground border-border/60 h-7 shrink-0 rounded-full border px-3 text-xs whitespace-nowrap transition-colors"
            onClick={() => pick(t)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Phones: the first four templates as a 2x2 grid above the composer. */
export function QuickGrid(): ReactNode {
  const templates = useTemplates()
  const pick = usePickTemplate()
  if (!templates.length) return null
  return (
    <div aria-label="Quick actions" data-testid="quick-grid" className="grid grid-cols-2 gap-2 md:hidden">
      {templates.slice(0, 4).map((t) => {
        const Icon = templateIcon(t.id)
        return (
          <button
            key={t.id}
            type="button"
            className="bg-card hover:bg-muted border-border/60 flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors"
            onClick={() => pick(t)}
          >
            <Icon aria-hidden size={18} className="text-brand shrink-0" />
            <span className="min-w-0 truncate">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Tinted pills, so the follow-ups read as actions next to the grey icon row;
// Apply, the one that changes things, is filled.
const BTN = "border-brand-line bg-brand-soft text-brand hover:bg-brand hover:text-brand-foreground inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap transition-colors"
const BTN_MAIN = "bg-brand text-brand-foreground hover:bg-brand/90 inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap transition-colors"

/**
 * Quick actions in the action bar of the last reply: shorter, simpler, and
 * apply (when it only proposed). Each is a plain message to Molfar. Undoing a
 * reply that changed an app is the "Changed … · Undo" line under it.
 */
export function ReplyQuickActions(): ReactNode {
  const id = useAuiState((s) => s.message.id)
  const msgs = useAgent((s) => s.msgs)
  const running = useAgent((s) => s.running)
  const send = useAgent((s) => s.send)
  const at = msgs.findIndex((m) => m.id === id)
  const msg = msgs[at]
  if (!msg || at !== msgs.length - 1 || running || msg.streaming) return null
  return (
    <div className="ms-1 flex items-center gap-1.5 border-s ps-2.5" data-testid="reply-actions">
      <button type="button" className={BTN} title="Say the last answer again, shorter" onClick={() => void send("Make your last answer shorter.")}>
        <ArrowsInLineVertical size={13} weight="bold" aria-hidden />
        Shorter
      </button>
      <button type="button" className={BTN} title="Say the last answer again in simpler words" onClick={() => void send("Say your last answer again in simpler words.")}>
        <Feather size={13} weight="bold" aria-hidden />
        Simpler
      </button>
      {!msg.checkpoints?.length ? (
        <button type="button" className={BTN_MAIN} title="Do what Molfar proposed" onClick={() => void send("Apply what you proposed.")}>
          <Check size={13} weight="bold" aria-hidden />
          Apply
        </button>
      ) : null}
    </div>
  )
}
