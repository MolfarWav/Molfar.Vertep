// Checkpoints on the chat side: the confirm text shared with the project page,
// and the "Changed <app> · N files · Undo" line under an assistant message.
import { useAuiState } from "@assistant-ui/react"
import type { ReactNode } from "react"
import type { RunCheckpoint } from "./api"
import { useAgent } from "./store"

/** What a restore says before it runs; `later`: newer runs changed the app too.
 *  `data`: the data files a run's Undo puts back with the code. */
export const restoreConfirm = (app: string, label: string, later = false, data: string[] = [], dataCount = data.length): string => {
  const what = data.length ? "code and the data files the run changed" : "code"
  const names = data.slice(0, 5).map((p) => p.replace(new RegExp(`^apps/${app}/data/`), ""))
  const listed = data.length
    ? ` Data files put back: ${names.join(", ")}${dataCount > names.length ? ` and ${dataCount - names.length} more` : ""}. Other data, chats and uploads stay.`
    : " Data, chats and uploads stay."
  return `Put ${app}'s ${what} back to "${label}"?${listed} The current state is saved first, so you can undo this.${later ? " Later changes to this app are undone too." : ""}`
}

/** "2 files", "3 data files", or both: what the run changed in the app. */
export function runChangeSummary(cp: RunCheckpoint): string {
  const plural = (n: number, what: string) => `${n} ${what}${n === 1 ? "" : "s"}`
  const parts = []
  if (cp.changed) parts.push(plural(cp.changed, "file"))
  const data = cp.dataCount ?? cp.data?.length ?? 0
  if (data) parts.push(plural(data, "data file"))
  return parts.join(" · ")
}

/** One line per app the run changed. Undo restores the checkpoint taken
 *  before the run; the line then reads "Undone". */
export function RunCheckpoints(): ReactNode {
  const id = useAuiState((s) => s.message.id)
  const msgs = useAgent((s) => s.msgs)
  const undone = useAgent((s) => s.undone)
  const restore = useAgent((s) => s.restoreCheckpoint)
  const at = msgs.findIndex((m) => m.id === id)
  const list = at < 0 ? undefined : msgs[at]?.checkpoints
  if (!list?.length || msgs[at]?.streaming) return null
  return (
    <div className="text-muted-foreground ms-2 grid gap-0.5 pt-1 text-xs" data-testid="run-checkpoints" data-guide="agent.run-checkpoints">
      {list.map((cp) => {
        const later = msgs.slice(at + 1).some((m) => m.checkpoints?.some((c) => c.app === cp.app))
        return (
          <p key={cp.id}>
            Changed {cp.app} · {runChangeSummary(cp)} ·{" "}
            {undone[cp.id] ? (
              <span>Undone</span>
            ) : (
              <button
                type="button"
                className="text-link hover:text-foreground font-medium underline underline-offset-2"
                onClick={() => {
                  if (window.confirm(restoreConfirm(cp.app, cp.label, later, cp.data, cp.dataCount))) void restore(cp.app, cp.id, cp.id, cp.data?.length ? { files: cp.data, hashes: cp.dataHash } : undefined)
                }}
              >
                Undo
              </button>
            )}
          </p>
        )
      })}
    </div>
  )
}
