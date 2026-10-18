import { useEffect, useRef, useState } from "react"
import { api } from "./api"
import { Button } from "./ui/button"
import { Icon, IconSmall } from "./ui/icon"
import { cn } from "./ui/cn"
import { tr, getLocale } from "./i18n/index"
import { Pane, inputClass } from "./settings"

type Scope = { agent: boolean; media: boolean; secrets: boolean }
type ConflictGroup = { id: string; app: string | null; label: string; title?: string; files: string[] }
type Progress = { phase: "scan" | "remote" | "upload" | "download" | "apply" | "finish"; done: number; total: number; bytes: number }
type Job = {
  id: number; kind: "check" | "push" | "pull"; running: boolean; progress: Progress; startedAt: string; finishedAt?: string
  error?: { message: string; status: number; conflicts?: ConflictGroup[]; rev?: number }
  result?: any
}
type CheckResult = { remote: { rev: number; device: string; pushedAt: string } | null; behind: boolean; push: { files: number; bytes: number }; pull: { files: number; bytes: number }; conflicts: ConflictGroup[] }
type SyncView = {
  device: { id: string; name: string }
  scope: Scope
  target: { kind: "drive"; account: string } | { kind: "folder"; path: string } | null
  drive: { available: boolean; ownClient: boolean }
  passphrase: boolean
  last: { rev: number; at: string; direction: "push" | "pull" } | null
  base: number | null
  job: Job | null
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${tr("B")}`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${tr("KB")}`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} ${tr("MB")}`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ${tr("GB")}`
}

function fmtTime(at: string): string {
  return new Date(at).toLocaleString(getLocale(), { dateStyle: "medium", timeStyle: "short" })
}

function LabeledInput(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0 w-full">
      <label className="text-12 text-ink-muted">{props.label}</label>
      <input
        type={props.type || "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        aria-label={props.label}
        className={cn(inputClass, "w-full", props.className)}
      />
    </div>
  )
}

function CheckboxRow(props: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
        className="size-4 shrink-0 accent-[var(--c-contrast)] mt-0.5"
        aria-label={props.label}
      />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={cn("text-13", props.disabled ? "text-ink-faint" : "text-ink")}>{props.label}</span>
        {props.hint && <span className="text-12 text-ink-muted break-words">{props.hint}</span>}
      </div>
    </div>
  )
}

function ProgressLine(props: { progress: Progress }) {
  const words: Record<Progress["phase"], string> = {
    scan: tr("Looking at your files…"),
    remote: tr("Reading the sync…"),
    upload: tr("Uploading {done} of {total}…", { done: props.progress.done, total: props.progress.total }),
    download: tr("Downloading {done} of {total}…", { done: props.progress.done, total: props.progress.total }),
    apply: tr("Writing {done} of {total}…", { done: props.progress.done, total: props.progress.total }),
    finish: tr("Finishing…"),
  }
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-12 text-ink-muted">{words[props.progress.phase]}</span>
      {props.progress.total > 0 && (
        <div className="h-1 rounded bg-line overflow-hidden">
          <div
            className="h-full bg-[var(--c-contrast)] transition-all duration-300"
            style={{ width: `${Math.min(100, (props.progress.done / props.progress.total) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

function ConflictPanel(props: { conflicts: ConflictGroup[]; rev: number; onResolve: (res: Record<string, "mine" | "theirs">) => void; onCancel: () => void; busy: boolean }) {
  const [choices, setChoices] = useState<Record<string, "mine" | "theirs">>({})
  const allChosen = props.conflicts.every((g) => choices[g.id])
  return (
    <div className="rounded-lg border border-line p-3 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-13 font-medium text-ink">{tr("Changed on both devices")}</h3>
        <p className="text-12 text-ink-muted">{tr("Choose which version to keep. The one you do not keep is saved in the engine's data/backups/sync-conflicts folder for 30 days.")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-12 text-ink-muted self-center">{tr("For all:")}</span>
        <Button variant="outline" size="small" onClick={() => setChoices(Object.fromEntries(props.conflicts.map((g) => [g.id, "mine" as const])))}>{tr("Keep mine")}</Button>
        <Button variant="outline" size="small" onClick={() => setChoices(Object.fromEntries(props.conflicts.map((g) => [g.id, "theirs" as const])))}>{tr("Take the synced one")}</Button>
      </div>
      <div className="flex flex-col">
        {props.conflicts.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 min-w-0">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-13 text-ink break-words">{g.id === "secrets.enc" ? tr("API keys and MCP settings") : g.title || g.label}</span>
              {g.id !== "secrets.enc" && <span className="text-11 text-ink-faint break-all">{g.app ? `${g.app} · ${g.label}` : g.label}</span>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant={choices[g.id] === "mine" ? "contrast" : "ghost"}
                size="small"
                aria-pressed={choices[g.id] === "mine"}
                onClick={() => setChoices((c) => ({ ...c, [g.id]: "mine" }))}
              >{tr("Mine")}</Button>
              <Button
                variant={choices[g.id] === "theirs" ? "contrast" : "ghost"}
                size="small"
                aria-pressed={choices[g.id] === "theirs"}
                onClick={() => setChoices((c) => ({ ...c, [g.id]: "theirs" }))}
              >{tr("Synced")}</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="normal" disabled={!allChosen || props.busy} onClick={() => props.onResolve(choices)}>{tr("Pull with these choices")}</Button>
        <Button variant="ghost" size="normal" disabled={props.busy} onClick={props.onCancel}>{tr("Cancel")}</Button>
      </div>
    </div>
  )
}

/** Your own Google client instead of the built-in one, folded away. */
function AdvancedClient(props: { open: boolean; onToggle: () => void; ownClient: boolean; busy: boolean; onSave: (id: string, secret: string) => void; onClear: () => void }) {
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  return (
    <div className="border-t border-line pt-2">
      <button
        type="button"
        className="flex min-h-8 items-center gap-1 text-12 text-ink-muted hover:text-ink"
        onClick={props.onToggle}
        aria-expanded={props.open}
      >
        <Icon name={props.open ? "chevron-down" : "chevron-right"} />
        {tr("Advanced")}
      </button>
      {props.open && (
        <div className="flex flex-col gap-2 pt-2">
          <span className="text-13 text-ink">{tr("Your own Google client")}</span>
          <span className="text-12 text-ink-muted">{tr("Only if you made your own OAuth client (Desktop app) in Google Cloud.")}</span>
          {props.ownClient ? (
            <div className="flex flex-col gap-1">
              <span className="text-12 text-ink-muted">{tr("Using your own client.")}</span>
              <div><Button variant="ghost" size="small" disabled={props.busy} onClick={props.onClear}>{tr("Use the built-in one")}</Button></div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <LabeledInput label={tr("Client id")} value={clientId} onChange={setClientId} placeholder="….apps.googleusercontent.com" />
              <LabeledInput label={tr("Client secret")} value={clientSecret} onChange={setClientSecret} type="password" />
              <div><Button variant="outline" size="small" disabled={props.busy || !clientId} onClick={() => props.onSave(clientId, clientSecret)}>{tr("Save")}</Button></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SyncTab(props: { isAdmin: boolean }) {
  const [view, setView] = useState<SyncView | null>(null)
  const [error, setError] = useState<string>("")
  const [status, setStatus] = useState<CheckResult | null>(null)
  const [success, setSuccess] = useState<string>("")
  const [busy, setBusy] = useState<string>("")
  const [conflicts, setConflicts] = useState<ConflictGroup[] | null>(null)
  const [conflictRev, setConflictRev] = useState<number | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deviceName, setDeviceName] = useState("")
  const [folderPath, setFolderPath] = useState("")
  const [pasteUrl, setPasteUrl] = useState("")
  const [showPaste, setShowPaste] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(() => sessionStorage.getItem("sync.advanced") === "1")
  const [passphrase, setPassphrase] = useState("")
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    sessionStorage.setItem("sync.advanced", advancedOpen ? "1" : "0")
  }, [advancedOpen])

  useEffect(() => () => {
    alive.current = false
    if (pollTimer.current) clearInterval(pollTimer.current)
    if (reloadTimer.current) clearTimeout(reloadTimer.current)
  }, [])

  const loadView = async () => {
    try {
      const v = await api<SyncView>("GET", "/v1/sync")
      setView(v)
      if (v.device) setDeviceName(v.device.name)
      return v
    } catch (e: any) {
      setError(e.message || String(e))
      return null
    }
  }

  /** Follow a job until it ends, showing its progress, then act on how it ended. */
  const follow = async (first: Job): Promise<void> => {
    let job: Job | null = first
    setView((v) => (v ? { ...v, job } : v))
    while (job?.running && alive.current) {
      await new Promise((r) => setTimeout(r, 700))
      job = (await api<{ job: Job | null }>("GET", "/v1/sync/job")).job
      if (!job || job.id !== first.id) return
      setView((v) => (v ? { ...v, job } : v))
    }
    if (!job || !alive.current) return
    if (job.error) {
      if (job.kind === "pull" && job.error.conflicts?.length) {
        setConflicts(job.error.conflicts)
        setConflictRev(job.error.rev ?? null)
      } else setError(job.error.message || tr("Sync error"))
      return
    }
    const r = job.result as any
    if (job.kind === "check") setStatus(r as CheckResult)
    else if (job.kind === "push") setSuccess(tr("Pushed: {n} changes.", { n: r?.changed ?? 0 }))
    else if (job.kind === "pull") {
      setConflicts(null)
      setConflictRev(null)
      setSuccess(r?.savedTo
        ? tr("Pulled from {device}: {n} files. The versions you did not keep are saved in {path}.", { device: r.device || "", n: r.applied ?? 0, path: r.savedTo })
        : tr("Pulled from {device}: {n} files.", { device: r?.device || "", n: r?.applied ?? 0 }))
      // every open view read the old files
      setReloading(true)
      reloadTimer.current = setTimeout(() => location.reload(), 1500)
    }
  }

  const runJob = async (kind: Job["kind"], body?: unknown, keepError = false) => {
    setBusy(kind)
    if (!keepError) setError("")
    if (kind !== "check") setSuccess("")
    try {
      const { job } = await api<{ job: Job }>("POST", `/v1/sync/${kind}`, body ?? {})
      await follow(job)
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      if (alive.current) setBusy("")
    }
    if (kind === "push" && alive.current) {
      await loadView()
      // keep a refused push's error on screen while the status refreshes
      await runJob("check", undefined, true)
    }
  }
  const runCheck = () => runJob("check")
  const startJob = (kind: "push" | "pull", body?: unknown) => runJob(kind, body)

  const updateScope = async (scope: Partial<Scope>) => {
    try {
      setError("")
      const v = await api<SyncView>("PUT", "/v1/sync/settings", { scope })
      setView(v)
      if (v.target) await runCheck()
    } catch (e: any) {
      setError(e.message || String(e))
    }
  }

  const connectDrive = async () => {
    try {
      setBusy("drive-connect")
      setError("")
      const res = await api<{ url: string; redirect: string }>("POST", "/v1/sync/drive/start")
      window.open(res.url, "_blank", "noopener")
      setShowPaste(true)
      const started = Date.now()
      pollTimer.current = setInterval(async () => {
        try {
          const v = await api<SyncView>("GET", "/v1/sync")
          if (v.target) {
            setView(v)
            if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null }
            setBusy("")
            setShowPaste(false)
            if (v.target) await runCheck()
          } else if (Date.now() - started > 10 * 60 * 1000) {
            if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null }
            setBusy("")
          }
        } catch { /* keep polling */ }
      }, 2000)
    } catch (e: any) {
      setError(e.message || String(e))
      setBusy("")
    }
  }

  const submitPasteUrl = async () => {
    try {
      setBusy("drive-code")
      setError("")
      const v = await api<SyncView>("POST", "/v1/sync/drive/code", { url: pasteUrl })
      setView(v)
      setShowPaste(false)
      setBusy("")
      if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null }
      if (v.target) await runCheck()
    } catch (e: any) {
      setError(e.message || String(e))
      setBusy("")
    }
  }

  const useFolder = async () => {
    try {
      setBusy("folder")
      setError("")
      const v = await api<SyncView>("POST", "/v1/sync/folder", { path: folderPath })
      setView(v)
      setBusy("")
      if (v.target) await runCheck()
    } catch (e: any) {
      setError(e.message || String(e))
      setBusy("")
    }
  }

  const disconnect = async () => {
    if (!window.confirm(tr("Disconnect this device from the sync? Nothing is deleted there; you can connect again later."))) return
    try {
      setBusy("disconnect")
      setError("")
      const v = await api<SyncView>("DELETE", "/v1/sync/target")
      setView(v)
      setStatus(null)
      setBusy("")
    } catch (e: any) {
      setError(e.message || String(e))
      setBusy("")
    }
  }

  const saveDeviceName = async () => {
    try {
      setBusy("rename")
      setError("")
      const v = await api<SyncView>("PUT", "/v1/sync/settings", { deviceName })
      setView(v)
      setRenameOpen(false)
      setBusy("")
    } catch (e: any) {
      setError(e.message || String(e))
      setBusy("")
    }
  }

  const saveOwnClient = async (clientId: string, clientSecret: string) => {
    try {
      setBusy("client")
      setError("")
      const v = await api<SyncView>("PUT", "/v1/sync/settings", { client: { id: clientId, secret: clientSecret } })
      setView(v)
      setBusy("")
    } catch (e: any) {
      setError(e.message || String(e))
      setBusy("")
    }
  }

  const clearOwnClient = async () => {
    try {
      setBusy("client")
      setError("")
      const v = await api<SyncView>("PUT", "/v1/sync/settings", { client: null })
      setView(v)
      setBusy("")
    } catch (e: any) {
      setError(e.message || String(e))
      setBusy("")
    }
  }

  const savePassphrase = async () => {
    if (passphrase.length < 8) {
      setError(tr("The passphrase needs at least 8 characters."))
      return
    }
    try {
      setBusy("passphrase")
      setError("")
      const v = await api<SyncView>("PUT", "/v1/sync/settings", { passphrase })
      setView(v)
      setPassphrase("")
      setShowPassphrase(false)
      setBusy("")
    } catch (e: any) {
      setError(e.message || String(e))
      setBusy("")
    }
  }

  const forgetPassphrase = async () => {
    try {
      setBusy("passphrase")
      setError("")
      const v = await api<SyncView>("PUT", "/v1/sync/settings", { passphrase: "" })
      setView(v)
      setBusy("")
    } catch (e: any) {
      setError(e.message || String(e))
      setBusy("")
    }
  }

  useEffect(() => {
    void (async () => {
      const v = await loadView()
      // a job started before this page opened (another tab, a reload) is followed
      if (v?.job?.running) {
        setBusy(v.job.kind)
        await follow(v.job).catch(() => undefined)
        if (alive.current) setBusy("")
      } else if (v?.target) await runCheck()
    })()
  }, [])

  if (!view) return <Pane title={tr("Sync")} description={tr("Carry your games between devices: push here when you stop, pull on the other device before you go on.")}><div className="text-12 text-ink-muted">{tr("Loading…")}</div></Pane>

  const anyBusy = !!busy || !!view.job?.running
  const showReplaceKeys = error.includes("another passphrase")

  return (
    <Pane title={tr("Sync")} description={tr("Carry your games between devices: push here when you stop, pull on the other device before you go on.")}>
      <div className="flex flex-col gap-4 pb-4 min-w-0">
        {error && !showReplaceKeys && <div className="text-12 text-danger break-words">{error}</div>}
        {error && showReplaceKeys && (
          <div className="flex flex-col gap-2">
            <div className="text-12 text-danger break-words">{error}</div>
            <div>
              <Button variant="warning" size="small" disabled={anyBusy} onClick={() => startJob("push", { replaceKeys: true })}>
                {tr("Replace the keys there with this device's")}
              </Button>
            </div>
          </div>
        )}
        {success && <div className="text-12 text-success break-words">{success}</div>}
        {reloading && <div className="text-12 text-ink-faint">{tr("Reloading…")}</div>}

        {view.target === null ? (
          <div className="rounded-lg border border-line p-3 flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-13 font-medium text-ink">{tr("Where to keep the sync")}</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-13 text-ink">{tr("Google Drive")}</span>
                {view.drive.available ? (
                  <>
                    <span className="text-12 text-ink-muted">{tr("Your own Google Drive. Molfar Vertep sees only the folder it makes there.")}</span>
                    {!showPaste && <div><Button variant="primary" size="normal" disabled={anyBusy} onClick={connectDrive}>{tr("Sign in with Google")}</Button></div>}
                    {showPaste && (
                      <div className="flex flex-col gap-2">
                        <span className="text-12 text-ink-muted">{tr("Signed in but this page did not change? Copy the address from the tab Google opened and paste it here.")}</span>
                        <div className="flex flex-wrap gap-2 items-center">
                          <input
                            type="text"
                            value={pasteUrl}
                            onChange={(e) => setPasteUrl(e.target.value)}
                            placeholder="https://…"
                            aria-label={tr("Paste the address")}
                            className={cn(inputClass, "min-w-0 flex-1 basis-full sm:basis-48")}
                          />
                          <Button variant="primary" size="normal" disabled={anyBusy || !pasteUrl} onClick={submitPasteUrl}>{tr("Connect")}</Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-12 text-ink-muted">{tr("This build has no Google sign-in yet. Add your own Google client under Advanced, or use a folder.")}</div>
                )}
              </div>
              {props.isAdmin && (
                <div className="flex flex-col gap-1 border-t border-line pt-2">
                  <span className="text-13 text-ink">{tr("A folder on this computer")}</span>
                  <span className="text-12 text-ink-muted">{tr("For a synced folder (Syncthing, Google Drive for desktop) or a USB stick.")}</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      type="text"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder={tr("e.g. D:\\Sync\\Molfar")}
                      aria-label={tr("Folder path")}
                      className={cn(inputClass, "min-w-0 flex-1 basis-full sm:basis-48")}
                    />
                    <Button variant="neutral" size="normal" disabled={anyBusy || !folderPath} onClick={useFolder}>{tr("Use this folder")}</Button>
                  </div>
                </div>
              )}
            </div>
            <AdvancedClient open={advancedOpen} onToggle={() => setAdvancedOpen(!advancedOpen)} ownClient={view.drive.ownClient} busy={anyBusy} onSave={saveOwnClient} onClear={clearOwnClient} />
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-line p-3 flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-2 text-13 text-ink break-all">
                <span className="shrink-0"><Icon name="cloud-upload" /></span>
                <span className="min-w-0">
                  {view.target.kind === "drive"
                    ? `${tr("Google Drive")}${view.target.account ? ` · ${view.target.account}` : ""}`
                    : `${tr("Folder")} · ${view.target.path}`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-13 text-ink-muted">{tr("This device:")}</span>
                {renameOpen ? (
                  <div className="flex flex-wrap gap-2 items-center min-w-0 flex-1">
                    <input
                      type="text"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      aria-label={tr("Device name")}
                      className={cn(inputClass, "min-w-0 flex-1 basis-full sm:basis-48")}
                    />
                    <Button variant="primary" size="small" disabled={anyBusy} onClick={saveDeviceName}>{tr("Save")}</Button>
                    <Button variant="ghost" size="small" disabled={anyBusy} onClick={() => { setRenameOpen(false); setDeviceName(view.device.name) }}>{tr("Cancel")}</Button>
                  </div>
                ) : (
                  <>
                    <span className="text-13 text-ink min-w-0 break-all">{view.device.name}</span>
                    <Button variant="ghost" size="small" disabled={anyBusy} onClick={() => { setRenameOpen(true); setDeviceName(view.device.name) }}>{tr("Rename")}</Button>
                  </>
                )}
              </div>
              <div className="text-12 text-ink-muted">
                {view.last
                  ? view.last.direction === "push"
                    ? tr("Last pushed {time}", { time: fmtTime(view.last.at) })
                    : tr("Last pulled {time}", { time: fmtTime(view.last.at) })
                  : tr("Not synced yet on this device")}
              </div>
              {status?.remote && (
                <div className="text-12 text-ink-muted">
                  {tr("In the sync: push {rev} from {device}, {time}", { rev: status.remote.rev, device: status.remote.device, time: fmtTime(status.remote.pushedAt) })}
                </div>
              )}
              {status?.behind && (
                <div className="rounded-md bg-warning-soft text-warning px-2 py-1.5 text-12 flex items-center gap-2">
                  <IconSmall name="info" />
                  {view.base === null
                    ? tr("This sync already holds {device}'s files. Pull first.", { device: status.remote?.device || "" })
                    : tr("{device} pushed since this device last synced. Pull first.", { device: status.remote?.device || "" })}
                </div>
              )}
              {status?.behind && !replaceOpen && (
                <div>
                  <Button variant="ghost" size="small" disabled={anyBusy} onClick={() => setReplaceOpen(true)}>
                    {tr("Don't want what the sync holds? Replace it with this device…")}
                  </Button>
                </div>
              )}
              {status?.behind && replaceOpen && (
                <div className="rounded-md border border-warning p-2 flex flex-col gap-2">
                  <span className="text-13 font-medium text-ink">{tr("Replace the sync with this device")}</span>
                  <span className="text-12 text-ink-muted break-words">
                    {tr("The sync will hold exactly this device's files. What only the sync has from {device} is removed there, and from your other devices when they next pull. Pull first if you want to keep any of it.", { device: status.remote?.device || "" })}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="warning" size="small" disabled={anyBusy} onClick={() => { setReplaceOpen(false); void startJob("push", { replace: true }) }}>
                      {tr("Replace the sync")}
                    </Button>
                    <Button variant="ghost" size="small" disabled={anyBusy} onClick={() => setReplaceOpen(false)}>{tr("Cancel")}</Button>
                  </div>
                </div>
              )}
            </div>

            {conflicts && conflictRev !== null ? (
              <ConflictPanel
                conflicts={conflicts}
                rev={conflictRev}
                busy={anyBusy}
                onCancel={() => { setConflicts(null); setConflictRev(null) }}
                onResolve={async (resolutions) => {
                  await startJob("pull", { rev: conflictRev, resolutions })
                }}
              />
            ) : (
              <>
                <div className="flex flex-wrap gap-2 items-center min-w-0">
                  <Button
                    variant={status?.behind ? "neutral" : "primary"}
                    size="normal"
                    disabled={anyBusy || (!!status && status.push.files === 0 && !!status.remote)}
                    onClick={() => startJob("push")}
                  >
                    {status ? tr("Push ({n})", { n: status.push.files }) : tr("Push")}
                  </Button>
                  <Button
                    variant={status?.behind ? "primary" : "neutral"}
                    size="normal"
                    disabled={anyBusy || (!!status && status.pull.files + status.conflicts.length === 0 && !status.behind)}
                    onClick={() => startJob("pull")}
                  >
                    {status ? tr("Pull ({n})", { n: status.pull.files + status.conflicts.length }) : tr("Pull")}
                  </Button>
                  <Button variant="ghost" size="normal" className="gap-1.5" disabled={anyBusy} onClick={() => void runCheck()}>
                    <IconSmall name="rebuild" />
                    {tr("Check")}
                  </Button>
                  {status && status.push.files === 0 && status.conflicts.length === 0 && status.remote && <span className="text-12 text-ink-muted">{tr("Nothing to push")}</span>}
                </div>
                {status && (
                  <div className="text-12 text-ink-muted flex flex-col gap-1">
                    <span>
                      {tr("To push: {n} files, {size}. To pull: {m} files, {size2}.", { n: status.push.files, size: humanSize(status.push.bytes), m: status.pull.files, size2: humanSize(status.pull.bytes) })}
                    </span>
                    {status.conflicts.length > 0 && (
                      <span className="text-warning">{tr("Changed on both devices: {n}. Pull to choose which version to keep.", { n: status.conflicts.length })}</span>
                    )}
                  </div>
                )}
                {view.job?.running && view.job.progress && <ProgressLine progress={view.job.progress} />}
              </>
            )}

            <div className="rounded-lg border border-line p-3 flex flex-col gap-3">
              <h3 className="text-13 font-medium text-ink">{tr("What travels")}</h3>
              <CheckboxRow
                checked={true}
                disabled
                onChange={() => {}}
                label={tr("Apps, their data and your settings")}
                hint={tr("Chats, cards with pictures, presets, lorebooks, everything apps keep.")}
              />
              <CheckboxRow
                checked={view.scope.agent}
                onChange={(v) => updateScope({ agent: v })}
                label={tr("Molfar's chats and projects")}
              />
              <CheckboxRow
                checked={view.scope.media}
                onChange={(v) => updateScope({ media: v })}
                label={tr("Pictures, sound and video")}
                hint={tr("Off saves space and time; cards then travel without their pictures.")}
              />
              <CheckboxRow
                checked={view.scope.secrets}
                onChange={(v) => updateScope({ secrets: v })}
                label={tr("API keys and MCP settings (encrypted)")}
                hint={tr("Locked with a passphrase that never leaves your devices. Type the same one on every device.")}
              />
              {view.scope.secrets && (
                <div className="pl-6 flex flex-col gap-2">
                  {view.passphrase ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-12 text-ink-muted">{tr("A passphrase is remembered on this device.")}</span>
                      <Button variant="ghost" size="small" disabled={anyBusy} onClick={() => setShowPassphrase(!showPassphrase)}>{tr("Change")}</Button>
                      <Button variant="ghost" size="small" disabled={anyBusy} onClick={forgetPassphrase}>{tr("Forget")}</Button>
                      {showPassphrase && (
                        <div className="flex flex-wrap gap-2 items-center w-full">
                          <input
                            type="password"
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            placeholder={tr("Passphrase")}
                            aria-label={tr("Passphrase")}
                            className={cn(inputClass, "min-w-0 flex-1 basis-full sm:basis-48")}
                          />
                          <Button variant="primary" size="small" disabled={anyBusy || passphrase.length === 0} onClick={savePassphrase}>{tr("Save")}</Button>
                          <Button variant="ghost" size="small" disabled={anyBusy} onClick={() => { setShowPassphrase(false); setPassphrase("") }}>{tr("Cancel")}</Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder={tr("Passphrase, at least 8 characters")}
                        aria-label={tr("Passphrase")}
                        className={cn(inputClass, "min-w-0 flex-1 basis-full sm:basis-48")}
                      />
                      <Button variant="primary" size="small" disabled={anyBusy || passphrase.length === 0} onClick={savePassphrase}>{tr("Save")}</Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <AdvancedClient open={advancedOpen} onToggle={() => setAdvancedOpen(!advancedOpen)} ownClient={view.drive.ownClient} busy={anyBusy} onSave={saveOwnClient} onClear={clearOwnClient} />

            <div className="flex justify-start">
              <Button variant="ghost-muted" size="small" disabled={anyBusy} onClick={disconnect}>
                {tr("Disconnect")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Pane>
  )
}
