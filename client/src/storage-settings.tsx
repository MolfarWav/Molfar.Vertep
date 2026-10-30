// Settings > Storage: how much the picture store holds, finding the pictures
// no card or chat uses, and the trash they move to (issue #171). Nothing is
// deleted without a way back: the cleanup moves files to a trash that keeps
// them 30 days; only "Empty trash" (confirmed) removes them for good.
import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "./api"
import { Button } from "./ui/button"
import { IconSmall } from "./ui/icon"
import { Dialog, ModalDialog } from "./ui/dialog"
import { tr } from "./i18n/index"
import { Pane } from "./settings"

type Summary = {
  store: { count: number; bytes: number; limitBytes: number }
  trash: { count: number; bytes: number; trashDays: number }
  graceDays: number
  job: Job | null
}
type Progress = { phase: "scan" | "verify" | "move"; files: number; bytes: number; skipped: number }
type Plan = {
  total: number
  referenced: number
  tooYoung: number
  count: number
  bytes: number
  sample: Array<{ id: string; name: string | null; mime: string; size: number }>
  skipped: Array<{ path: string; reason: "too-large" | "unreadable" }>
  skippedCount: number
  graceDays: number
  trashDays: number
}
type CleanResult = { trashed: number; bytes: number; spared: number; putBack: number; plan: Plan }
type Job = {
  id: number
  kind: "plan" | "clean"
  running: boolean
  progress: Progress
  error?: { message: string; code: string }
  result?: Plan | CleanResult
}
type TrashItem = { id: string; name: string | null; mime: string; size: number; trashedAt: number; expiresAt: number }
type TrashView = { items: TrashItem[]; count: number; bytes: number; trashDays: number }
type RestoreResult = { restored: string[]; already: string[]; kept: string[]; missing: string[] }

const DAY = 24 * 3600 * 1000

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${tr("B")}`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${tr("KB")}`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} ${tr("MB")}`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ${tr("GB")}`
}

/** What the cleanup dialog shows. */
type View =
  | { kind: "closed" }
  | { kind: "running"; job: Job }
  | { kind: "plan"; plan: Plan }
  | { kind: "done"; result: CleanResult }
  | { kind: "error"; message: string; skipped?: Plan["skipped"]; skippedCount?: number }

const isClean = (r: Job["result"]): r is CleanResult => !!r && "trashed" in r

export function StorageTab() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [trash, setTrash] = useState<TrashView | null>(null)
  const [view, setView] = useState<View>({ kind: "closed" })
  const [loadError, setLoadError] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([api<Summary>("GET", "/v1/storage/assets"), api<TrashView>("GET", "/v1/storage/assets/trash")])
      if (!alive.current) return
      setSummary(s)
      setTrash(t)
      setLoadError("")
      // a cleanup started earlier and still going: show it again
      if (s.job?.running) setView((v) => (v.kind === "closed" ? { kind: "running", job: s.job as Job } : v))
    } catch (e: any) {
      if (alive.current) setLoadError(e.message ?? String(e))
    }
  }, [])

  useEffect(() => {
    alive.current = true
    void refresh()
    return () => {
      alive.current = false
    }
  }, [refresh])

  // poll the running job; the dialog follows it to the end
  const running = view.kind === "running" ? view.job.id : null
  useEffect(() => {
    if (running === null) return
    let stop = false
    const tick = async () => {
      try {
        const { job } = await api<{ job: Job | null }>("GET", "/v1/storage/assets/job")
        if (stop || !job || job.id !== running) return
        if (job.running) {
          setView({ kind: "running", job })
          return
        }
        if (job.error) setView({ kind: "error", message: job.error.message })
        else if (job.kind === "plan" && job.result && !isClean(job.result)) setView({ kind: "plan", plan: job.result })
        else if (isClean(job.result)) setView({ kind: "done", result: job.result })
        stop = true
        void refresh()
      } catch (e: any) {
        if (!stop) setView({ kind: "error", message: e.message ?? String(e) })
        stop = true
      }
    }
    const timer = setInterval(() => void tick(), 600)
    void tick()
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [running, refresh])

  const start = async (kind: "plan" | "clean") => {
    setNote("")
    try {
      const { job } = await api<{ job: Job }>("POST", kind === "plan" ? "/v1/storage/assets/plan" : "/v1/storage/assets/clean", kind === "clean" ? {} : undefined)
      setView({ kind: "running", job })
    } catch (e: any) {
      setView({ kind: "error", message: e.message ?? String(e) })
    }
  }

  const restore = async (ids: string[] | null) => {
    setBusy(true)
    setNote("")
    try {
      const r = await api<RestoreResult>("POST", "/v1/storage/assets/trash/restore", ids ? { ids } : { all: true })
      const ok = r.restored.length + r.already.length
      const left = r.kept.length + r.missing.length
      setNote(left ? `${tr("Restored: {count}.", { count: ok })} ${tr("Could not restore: {count}. They stay in the trash.", { count: left })}` : tr("Restored: {count}.", { count: ok }))
    } catch (e: any) {
      setNote(e.message ?? String(e))
    } finally {
      setBusy(false)
      await refresh()
    }
  }

  const empty = async () => {
    setConfirmEmpty(false)
    setBusy(true)
    setNote("")
    try {
      const r = await api<{ removed: number; bytes: number }>("POST", "/v1/storage/assets/trash/empty", { confirm: true })
      setNote(tr("Deleted for good: {count} ({size}).", { count: r.removed, size: humanSize(r.bytes) }))
    } catch (e: any) {
      setNote(e.message ?? String(e))
    } finally {
      setBusy(false)
      await refresh()
    }
  }

  const trashDays = trash?.trashDays ?? 30
  const running_ = summary?.job?.running === true

  return (
    <Pane title={tr("Storage")} description={tr("Pictures that your cards, chats and sprites use.")}>
      <div className="flex flex-col gap-5 pb-4">
        {loadError ? <div className="text-12 text-danger">{loadError}</div> : null}

        <section className="flex flex-col gap-2" aria-labelledby="storage-pictures">
          <h3 id="storage-pictures" className="text-13 font-medium text-ink">{tr("Pictures")}</h3>
          {summary ? <>
              <p className="text-13 text-ink">
                {tr("In the store: {count} ({size} of {limit})", { count: summary.store.count, size: humanSize(summary.store.bytes), limit: humanSize(summary.store.limitBytes) })}
              </p>
              <div className="h-1.5 max-w-[320px] overflow-hidden rounded bg-line" role="presentation">
                <div className="h-full bg-[var(--c-contrast)]" style={{ width: `${Math.min(100, (summary.store.bytes / Math.max(1, summary.store.limitBytes)) * 100)}%` }} />
              </div>
            </> : !loadError ? <p className="text-12 text-ink-muted">{tr("Loading…")}</p> : null}
          <p className="text-12 leading-4 text-ink-muted">
            {tr("A picture stays in the store after the card or chat that used it is deleted or changed. Find the ones nothing uses and move them to the trash.")}
          </p>
          <div>
            <Button variant="primary" size="normal" touch disabled={!summary || busy || running_} onClick={() => void start("plan")}>
              {tr("Find unused pictures")}
            </Button>
          </div>
          {running_ ? <p className="text-12 text-ink-muted">{tr("A cleanup is running…")}</p> : null}
        </section>

        <section className="flex flex-col gap-2 border-t border-line pt-4" aria-labelledby="storage-trash">
          <h3 id="storage-trash" className="text-13 font-medium text-ink">
            {trash && trash.count > 0 ? tr("Trash: {count} ({size})", { count: trash.count, size: humanSize(trash.bytes) }) : tr("Trash")}
          </h3>
          {note ? <div className="break-words text-12 text-success" role="status">{note}</div> : null}
          {trash && trash.count === 0 ? <p className="text-12 leading-4 text-ink-muted">{tr("The trash is empty. Pictures you clean up wait here for {days} days before they are deleted.", { days: trashDays })}</p> : null}
          {trash && trash.count > 0 ? <>
              <p className="text-12 leading-4 text-ink-muted">{tr("Pictures wait here for {days} days, then they are deleted. Restore puts a picture back where it was.", { days: trashDays })}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="neutral" size="normal" touch disabled={busy} onClick={() => void restore(null)}>
                  {tr("Restore all")}
                </Button>
                <Button variant="danger" size="normal" touch disabled={busy} onClick={() => setConfirmEmpty(true)}>
                  {tr("Empty trash…")}
                </Button>
              </div>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2">
                {trash.items.map((it) => {
                  const left = Math.max(0, Math.ceil((it.expiresAt - Date.now()) / DAY))
                  return (
                    <li key={it.id} className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-panel p-1.5">
                      <img
                        src={`/v1/storage/assets/trash/${it.id}/file`}
                        alt={it.name ?? ""}
                        loading="lazy"
                        className="aspect-square w-full rounded-md bg-line object-cover"
                      />
                      <span className="truncate text-11 text-ink-muted" title={it.name ?? it.id}>{it.name ?? it.id.slice(0, 8)}</span>
                      <span className="text-11 text-ink-faint">{humanSize(it.size)} · {tr("{days} d left", { days: left })}</span>
                      <Button variant="outline" size="small" touch disabled={busy} onClick={() => void restore([it.id])}>
                        {tr("Restore")}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </> : null}
        </section>
      </div>

      <ModalDialog open={view.kind !== "closed"} onClose={() => setView({ kind: "closed" })}>
        <Dialog title={tr("Unused pictures")} size="large">
          <div className="min-h-0 min-w-0 overflow-y-auto p-4">
            <CleanupBody view={view} onMove={() => void start("clean")} onClose={() => setView({ kind: "closed" })} />
          </div>
        </Dialog>
      </ModalDialog>

      <ModalDialog open={confirmEmpty} onClose={() => setConfirmEmpty(false)}>
        <Dialog title={tr("Empty the trash?")} size="normal">
          <div className="flex flex-col gap-3 p-4">
            <p className="text-13 text-ink">{tr("Everything in the trash ({count}) will be deleted for good. This cannot be undone.", { count: trash?.count ?? 0 })}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" size="normal" touch onClick={() => void empty()}>{tr("Empty trash")}</Button>
              <Button variant="ghost" size="normal" touch onClick={() => setConfirmEmpty(false)}>{tr("Cancel")}</Button>
            </div>
          </div>
        </Dialog>
      </ModalDialog>
    </Pane>
  )
}

function SkippedList(props: { files: Plan["skipped"]; count: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-warning bg-warning-soft p-3">
      <p className="flex items-start gap-2 text-13 text-ink">
        <IconSmall name="info" />
        <span>{tr("Files that could not be read: {count}. A picture could be used in one of them without being found, so nothing was changed.", { count: props.count })}</span>
      </p>
      <ul className="flex flex-col gap-0.5 text-11 text-ink-muted">
        {props.files.slice(0, 5).map((f) => (
          <li key={f.path} className="break-all">{f.path}</li>
        ))}
      </ul>
      <p className="text-12 leading-4 text-ink-muted">{tr("Close whatever has these files open, or make them smaller, and try again.")}</p>
    </div>
  )
}

function CleanupBody(props: { view: View; onMove: () => void; onClose: () => void }) {
  const v = props.view
  const close = (
    <Button variant="ghost" size="normal" touch onClick={props.onClose}>
      {tr("Close")}
    </Button>
  )
  if (v.kind === "running") {
    const pr = v.job.progress
    const text = pr.phase === "move" ? tr("Moving to the trash…") : pr.phase === "verify" ? tr("Checking once more…") : tr("Looking through your files… {files} read", { files: pr.files })
    return (
      <div className="flex flex-col gap-3" role="status">
        <p className="text-13 text-ink">{text}</p>
        <div className="h-1 overflow-hidden rounded bg-line">
          <div className="h-full w-1/3 animate-pulse bg-[var(--c-contrast)]" />
        </div>
        <p className="text-12 text-ink-muted">{tr("You can close this: it keeps going.")}</p>
        <div>{close}</div>
      </div>
    )
  }
  if (v.kind === "error") {
    return (
      <div className="flex flex-col gap-3">
        <p className="break-words rounded-md bg-danger-soft px-2 py-1.5 text-13 text-danger" role="alert">{v.message}</p>
        <div>{close}</div>
      </div>
    )
  }
  if (v.kind === "done") {
    const r = v.result
    return (
      <div className="flex flex-col gap-3" role="status">
        <p className="text-13 text-ink">
          {r.trashed > 0
            ? tr("Moved to the trash: {count} ({size}). You can restore them for {days} days.", { count: r.trashed, size: humanSize(r.bytes), days: r.plan.trashDays })
            : tr("Nothing was moved.")}
        </p>
        {r.putBack > 0 ? <p className="text-12 text-ink-muted">{tr("Put back because something started using them: {count}.", { count: r.putBack })}</p> : null}
        <div>
          <Button variant="primary" size="normal" touch onClick={props.onClose}>{tr("Done")}</Button>
        </div>
      </div>
    )
  }
  if (v.kind === "plan") {
    const pl = v.plan
    if (pl.skippedCount > 0) {
      return (
        <div className="flex flex-col gap-3">
          <SkippedList files={pl.skipped} count={pl.skippedCount} />
          <div>{close}</div>
        </div>
      )
    }
    if (pl.count === 0) {
      return (
        <div className="flex flex-col gap-3">
          <p className="text-13 text-ink">{tr("Nothing to clean up. Every picture is in use, or was added in the last {days} days.", { days: pl.graceDays })}</p>
          <div>{close}</div>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        <p className="text-14 font-medium text-ink">{tr("Not used by any card or chat: {count} ({size})", { count: pl.count, size: humanSize(pl.bytes) })}</p>
        <ul className="flex flex-wrap gap-1.5">
          {pl.sample.map((s) => (
            <li key={s.id}>
              <img src={`/v1/assets/${s.id}`} alt={s.name ?? ""} title={s.name ?? s.id} loading="lazy" className="size-12 rounded-md bg-line object-cover" />
            </li>
          ))}
        </ul>
        <p className="text-12 leading-4 text-ink-muted">{tr("Unused means: no card, chat or note mentions the picture, and it was added more than {days} days ago.", { days: pl.graceDays })}</p>
        <p className="text-12 leading-4 text-ink-muted">
          {tr("Nothing is deleted yet. The pictures wait in the trash for {days} days and you can restore them. If you have an unsent draft with a picture, or another device that still uses these pictures, restore them from the trash.", { days: pl.trashDays })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="normal" touch onClick={props.onMove}>{tr("Move to the trash")}</Button>
          <Button variant="ghost" size="normal" touch onClick={props.onClose}>{tr("Cancel")}</Button>
        </div>
      </div>
    )
  }
  return null
}
