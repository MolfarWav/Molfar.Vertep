// What an app asks to read of OTHER apps (issue #310, step 2; engine side: src/apps/reads.ts). The app says so in its
// manifest; the user answers here, once, and can change the answer any time on the app's page on Home. Read only:
// the plugins of the app get the declared files of an app the user allowed, and nothing else.
import { useCallback, useEffect, useState } from "react"
import { api } from "./api"
import { Button } from "./ui/button"
import { Dialog, ModalDialog } from "./ui/dialog"
import { tr } from "./i18n/index"

export interface AppRead {
  app: string
  name: string
  installed: boolean
  paths: string[]
  why: string
  state: "granted" | "denied" | "ask"
}

/** The reads of one app and a way to answer; `reload` asks the engine again. */
export function useAppReads(appId: string | null): { reads: AppRead[]; answer: (peer: string, granted: boolean) => Promise<string | null>; reload: () => Promise<void> } {
  const [reads, setReads] = useState<AppRead[]>([])
  const reload = useCallback(async () => {
    if (!appId) return setReads([])
    try {
      const r = await api<{ reads: AppRead[] }>("GET", `/v1/apps/${encodeURIComponent(appId)}/reads`)
      setReads(r.reads)
    } catch {
      setReads([])
    }
  }, [appId])
  useEffect(() => {
    void reload()
  }, [reload])
  const answer = useCallback(
    async (peer: string, granted: boolean): Promise<string | null> => {
      if (!appId) return null
      try {
        await api("PUT", `/v1/apps/${encodeURIComponent(appId)}/reads/${encodeURIComponent(peer)}`, { granted })
        await reload()
        return null
      } catch (e) {
        return e instanceof Error ? e.message : String(e)
      }
    },
    [appId, reload],
  )
  return { reads, answer, reload }
}

const FILES = "rounded-md border border-line bg-panel-raised px-2 py-1.5 font-mono text-11 leading-4 text-ink-muted"

/** One question: "Allow <app> to read your <peer> data?" Shown when an app is opened and it has an undecided read.
 *  Closing it without an answer asks again next time; "Don't allow" is an answer. */
export function AppReadsPrompt(props: { appId: string; appName: string }) {
  const { reads, answer } = useAppReads(props.appId)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const ask = reads.find((r) => r.state === "ask" && r.installed && r.app !== dismissed)
  if (!ask) return null
  const reply = async (granted: boolean) => {
    setBusy(true)
    setErr("")
    const e = await answer(ask.app, granted)
    setBusy(false)
    if (e) setErr(e)
  }
  return (
    <ModalDialog open onClose={() => setDismissed(ask.app)}>
      <Dialog title={tr("Allow {app} to read your {peer} data?", { app: props.appName, peer: ask.name })} size="normal">
        <div className="flex flex-col gap-3 p-4 text-13 leading-5 text-ink">
          {ask.why ? <p>{ask.why}</p> : null}
          <p className="text-ink-muted">{tr("{app} asks to read these files of {peer}:", { app: props.appName, peer: ask.name })}</p>
          <div className="flex flex-col gap-1">
            {ask.paths.map((p) => (
              <code key={p} className={FILES}>{p}</code>
            ))}
          </div>
          <p className="text-12 text-ink-muted">
            {tr("Read only: {app} cannot change or delete anything in {peer}. You can change this any time on the app's page on Home.", { app: props.appName, peer: ask.name })}
          </p>
          {err ? <p className="text-12 text-danger">{err}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost-muted" size="small" touch disabled={busy} onClick={() => setDismissed(ask.app)}>{tr("Decide later")}</Button>
            <Button variant="neutral" size="small" touch disabled={busy} onClick={() => void reply(false)}>{tr("Don't allow")}</Button>
            <Button variant="primary" size="small" touch disabled={busy} onClick={() => void reply(true)}>{tr("Allow")}</Button>
          </div>
        </div>
      </Dialog>
    </ModalDialog>
  )
}

/** The app's page on Home: what it asks to read, with the answer and a way to change it. Nothing when it asks for nothing. */
export function AppReadsPanel(props: { appId: string }) {
  const { reads, answer } = useAppReads(props.appId)
  const [err, setErr] = useState("")
  if (!reads.length) return null
  return (
    <div className="flex flex-col gap-2 border-b border-line px-4 py-3">
      <p className="text-12 font-medium text-ink">{tr("Access to other apps")}</p>
      {reads.map((r) => (
        <div key={r.app} className="flex flex-col gap-1.5 rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-13 font-medium text-ink">{tr("Reads your {peer} data", { peer: r.name })}</p>
            <span
              className={
                r.state === "granted"
                  ? "rounded-full bg-success-soft/30 px-2 py-px text-11 text-ink"
                  : "rounded-full border border-line px-2 py-px text-11 text-ink-muted"
              }
            >
              {r.state === "granted" ? tr("Allowed") : r.state === "denied" ? tr("Not allowed") : tr("Not decided yet")}
            </span>
          </div>
          {r.why ? <p className="text-12 text-ink-muted">{r.why}</p> : null}
          <div className="flex flex-col gap-1">
            {r.paths.map((p) => (
              <code key={p} className={FILES}>{p}</code>
            ))}
          </div>
          {!r.installed ? (
            <p className="text-12 text-ink-faint">{tr("{peer} is not installed, so there is nothing to read yet.", { peer: r.name })}</p>
          ) : (
            <div className="flex justify-end gap-2">
              {r.state !== "denied" ? (
                <Button variant="neutral" size="small" touch onClick={() => void answer(r.app, false).then((e) => setErr(e ?? ""))}>
                  {r.state === "granted" ? tr("Stop allowing") : tr("Don't allow")}
                </Button>
              ) : null}
              {r.state !== "granted" ? (
                <Button variant="primary" size="small" touch onClick={() => void answer(r.app, true).then((e) => setErr(e ?? ""))}>
                  {tr("Allow")}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      ))}
      {err ? <p className="text-12 text-danger">{err}</p> : null}
    </div>
  )
}
