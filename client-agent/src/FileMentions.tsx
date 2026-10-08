import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BookOpenText, File as FileIcon, SlidersHorizontal, User } from "@phosphor-icons/react"
import { ComposerPrimitive } from "@assistant-ui/react"
import type { Unstable_TriggerAdapter } from "@assistant-ui/core"
import type { ReactNode } from "react"
import { agentFiles, agentMentionables } from "./api"
import { filePathDirective, fileTriggerAdapter, type Mentionable } from "./file-mentions"
import { useScrollHighlightIntoView } from "./trigger-popover"

/**
 * "@" in the composer picks a file out of the workspace, or a character,
 * lorebook or preset of an app by its name, so a request can name one instead
 * of describing it and hoping. A picked character is its card file: the message
 * says `@<path>` either way, and the engine attaches what that path is. The
 * engine does the searching (/v1/agent/files and /v1/agent/mentions), which
 * keeps a workspace of any size to one bounded walk.
 *
 * The trigger adapter is synchronous and the search is not, so `search` answers
 * from what was last fetched and starts the fetch for what was just typed;
 * results land a moment later and the popover re-renders. `isLoading` tells the
 * popover to say so in the meantime.
 */

/** Icon of a character, lorebook or preset row. */
function kindIcon(kind: string): ReactNode {
  if (kind === "character") return <User size={14} className="text-muted-foreground shrink-0 self-center" />
  if (kind === "lorebook") return <BookOpenText size={14} className="text-muted-foreground shrink-0 self-center" />
  return <SlidersHorizontal size={14} className="text-muted-foreground shrink-0 self-center" />
}

/** The folder part, dimmed beside the name. "" for a file at the root. */
function dirOf(rel: string): string {
  const at = rel.lastIndexOf("/")
  return at < 0 ? "" : rel.slice(0, at)
}

export function FileMentions(): ReactNode {
  const popoverRef = useScrollHighlightIntoView()
  const [files, setFiles] = useState<string[]>([])
  const [named, setNamed] = useState<Mentionable[]>([])
  const [loading, setLoading] = useState(false)
  const lastQuery = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fetchFor = useCallback((q: string) => {
    if (lastQuery.current === q) return
    lastQuery.current = q
    clearTimeout(timer.current)
    setLoading(true)
    timer.current = setTimeout(() => {
      // both lists are asked together; one failing must not blank the other
      void Promise.all([
        agentFiles(q).catch(() => null),
        agentMentionables(q).catch(() => null),
      ])
        .then(([names, items]) => {
          // a slower earlier query must not overwrite a later one
          if (lastQuery.current !== q) return
          if (names) setFiles(names)
          if (items) setNamed(items)
        })
        .finally(() => {
          if (lastQuery.current === q) setLoading(false)
        })
    }, 120)
  }, [])

  // the unfiltered head of the list, ready before the first keystroke
  useEffect(() => {
    fetchFor("")
    return () => clearTimeout(timer.current)
  }, [fetchFor])

  const adapter = useMemo<Unstable_TriggerAdapter>(() => fileTriggerAdapter(files, fetchFor, named), [files, fetchFor, named])

  return (
    <ComposerPrimitive.Unstable_TriggerPopover
      char="@"
      adapter={adapter}
      isLoading={loading}
      ref={popoverRef}
      aria-label="Files and characters"
      className="aui-trigger-popover bg-popover text-popover-foreground border-border absolute inset-x-2 bottom-full z-50 mb-2 max-h-72 min-h-11 overflow-y-auto overscroll-contain rounded-xl border p-1 shadow-lg"
    >
      <ComposerPrimitive.Unstable_TriggerPopover.Directive formatter={filePathDirective} />
      <ComposerPrimitive.Unstable_TriggerPopoverItems>
        {(items) =>
          items.length ? (
            items.map((item, i) => (
              <ComposerPrimitive.Unstable_TriggerPopoverItem
                key={item.id}
                item={item}
                index={i}
                className="data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground flex w-full cursor-pointer items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none"
              >
                {item.type === "file" ? (
                  <>
                    <FileIcon size={14} className="text-muted-foreground shrink-0 self-center" />
                    {/* the name is what you are looking for; the folder is only
                        there to tell two files of the same name apart */}
                    <span className="truncate font-medium">{item.label}</span>
                    <span className="text-muted-foreground/70 min-w-0 flex-1 truncate text-right text-xs">
                      {dirOf(item.description ?? item.id)}
                    </span>
                  </>
                ) : (
                  <>
                    {kindIcon(item.type)}
                    <span className="truncate font-medium">{item.label}</span>
                    <span className="text-muted-foreground/70 min-w-0 flex-1 truncate text-right text-xs">
                      {item.type} · {String(item.metadata?.app ?? "")}
                    </span>
                  </>
                )}
              </ComposerPrimitive.Unstable_TriggerPopoverItem>
            ))
          ) : (
            <div className="text-muted-foreground px-2.5 py-2 text-xs">
              {loading ? "Searching…" : "No matching files or characters"}
            </div>
          )
        }
      </ComposerPrimitive.Unstable_TriggerPopoverItems>
    </ComposerPrimitive.Unstable_TriggerPopover>
  )
}
