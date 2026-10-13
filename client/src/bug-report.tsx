// "Report a bug": a dialog that gathers what a maintainer needs (versions,
// browser, screen, the last errors) and hands it on as a pre-filled GitHub
// issue form or as text to paste into Discord. Nothing is sent from here: the
// user sees every line and decides where it goes.
import { useEffect, useMemo, useRef, useState } from "react"
import { ModalDialog, Dialog } from "./ui/dialog"
import { Button } from "./ui/button"
import { api } from "./api"
import { tr } from "./i18n/index"

const DEFAULT_REPOSITORY = "https://github.com/MolfarWav/Molfar.Vertep"
const DISCORD_INVITE = "https://discord.gg/NMqSehTCTs"
const MAX_ERRORS = 10
// GitHub refuses very long URLs; the error list is cut to stay under this
const MAX_URL = 7000

export interface RecentError {
  at: number
  source: string
  text: string
}

const recent: RecentError[] = []

/** Remember an error for the next bug report (the newest {@link MAX_ERRORS}). */
export function recordClientError(source: string, text: string): void {
  const clean = text.trim().slice(0, 600)
  if (!clean) return
  const last = recent[recent.length - 1]
  if (last && last.source === source && last.text === clean) return
  recent.push({ at: Date.now(), source, text: clean })
  if (recent.length > MAX_ERRORS) recent.splice(0, recent.length - MAX_ERRORS)
}

/** "Windows 10, Chrome 129" from the user agent: a starting point the user can correct. */
export function describeBrowser(ua: string): string {
  const android = /Android ([\d.]+)/.exec(ua)
  const os = /Windows NT 10/.test(ua)
    ? "Windows 10/11"
    : /Windows/.test(ua)
      ? "Windows"
      : android
        ? `Android ${android[1]}`
        : /iPhone|iPad|iPod/.test(ua)
          ? "iOS"
          : /Mac OS X/.test(ua)
            ? "macOS"
            : /Linux/.test(ua)
              ? "Linux"
              : ""
  const pick = (re: RegExp, name: string) => {
    const m = re.exec(ua)
    return m ? `${name} ${m[1]}` : ""
  }
  const browser =
    pick(/Edg(?:A|iOS)?\/(\d+)/, "Edge") ||
    pick(/OPR\/(\d+)/, "Opera") ||
    pick(/SamsungBrowser\/(\d+)/, "Samsung Internet") ||
    pick(/Firefox\/(\d+)/, "Firefox") ||
    pick(/FxiOS\/(\d+)/, "Firefox") ||
    pick(/CriOS\/(\d+)/, "Chrome") ||
    pick(/Chrome\/(\d+)/, "Chrome") ||
    pick(/Version\/(\d+).*Safari/, "Safari")
  return [os, browser].filter(Boolean).join(", ")
}

export interface BugReportContext {
  engineVersion: string | null
  repository: string | null
  /** the app open in front, if any */
  app: { id: string; name: string } | null
}

/** The GitHub address of the issue form, pre-filled. Fields are the ids in
 *  .github/ISSUE_TEMPLATE/bug_report.yml. */
export function issueUrl(repository: string | null, fields: { what: string; version: string; device: string; console: string }): string {
  const base = repository && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(repository) ? repository.replace(/\/$/, "") : DEFAULT_REPOSITORY
  const firstLine = fields.what.trim().split("\n")[0] ?? ""
  const title = firstLine.length > 70 ? `${firstLine.slice(0, 69)}…` : firstLine
  const make = (consoleText: string) => {
    const q = new URLSearchParams({ template: "bug_report.yml", title, what: fields.what, version: fields.version, device: fields.device })
    if (consoleText) q.set("console", consoleText)
    return `${base}/issues/new?${q.toString()}`
  }
  let consoleText = fields.console
  let url = make(consoleText)
  while (url.length > MAX_URL && consoleText) {
    consoleText = consoleText.slice(0, Math.max(0, consoleText.length - 500))
    url = make(consoleText)
  }
  return url
}

async function captureScreen(): Promise<Blob | null> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
  try {
    const video = document.createElement("video")
    video.srcObject = stream
    video.muted = true
    await video.play()
    await new Promise((r) => setTimeout(r, 300))
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    return await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"))
  } finally {
    for (const t of stream.getTracks()) t.stop()
  }
}

const canCapture = () => typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function" && !/Android|iPhone|iPad|iPod/.test(navigator.userAgent)

export function BugReportDialog(props: { open: boolean; onClose: () => void; context: BugReportContext }) {
  // a fresh body (empty text, the latest errors) each time it opens; the
  // panel itself stays mounted so the overlay can play its exit
  const [round, setRound] = useState(0)
  useEffect(() => { if (props.open) setRound((r) => r + 1) }, [props.open])
  return (
    <ModalDialog open={props.open} onClose={props.onClose}>
      <BugReportBody key={round} context={props.context} onClose={props.onClose} />
    </ModalDialog>
  )
}

function BugReportBody(props: { context: BugReportContext; onClose: () => void }) {
  const { context } = props
  const [what, setWhat] = useState("")
  const [device, setDevice] = useState(() => describeBrowser(navigator.userAgent))
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shot, setShot] = useState<{ url: string; name: string } | null>(null)
  const [shotErr, setShotErr] = useState("")
  const errors = useRef(recent.slice()).current

  useEffect(() => {
    if (!context.app) return
    let alive = true
    void api<{ manifest?: { version?: string } }>("GET", `/v1/apps/${encodeURIComponent(context.app.id)}/tree`)
      .then((d) => { if (alive && d.manifest?.version) setAppVersion(d.manifest.version) })
      .catch(() => undefined)
    return () => { alive = false }
  }, [context.app])
  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url) }, [shot])

  const version = [
    context.engineVersion ? `Molfar Vertep ${context.engineVersion}` : "",
    context.app ? `${context.app.name}${appVersion ? ` ${appVersion}` : ""}` : "",
  ].filter(Boolean).join(", ")
  const details = useMemo(() => {
    const lines = [
      `Version: ${version || "unknown"}`,
      `Device and browser: ${device || "unknown"}`,
      `Screen: ${window.innerWidth}×${window.innerHeight} @${Math.round(window.devicePixelRatio * 100) / 100}x${window.matchMedia("(pointer: coarse)").matches ? ", touch" : ""}`,
      `Language: ${navigator.language}`,
      `User agent: ${navigator.userAgent}`,
    ]
    return lines.join("\n")
  }, [version, device])
  const errorText = errors.map((e) => `[${new Date(e.at).toISOString().slice(11, 19)}] ${e.source}: ${e.text}`).join("\n")

  const asText = [
    what.trim() || "(describe what happened)",
    "",
    details,
    errorText ? `\nRecent errors:\n${errorText}` : "",
  ].join("\n").trim()

  const openGitHub = () => {
    const url = issueUrl(context.repository, { what: what.trim(), version, device, console: [details, errorText].filter(Boolean).join("\n\n") })
    window.open(url, "_blank", "noopener")
  }
  const copy = () => {
    void navigator.clipboard?.writeText(asText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  const takeShot = async () => {
    setShotErr("")
    try {
      const blob = await captureScreen()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const name = `molfar-vertep-bug-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`
      const a = document.createElement("a")
      a.href = url
      a.download = name
      a.click()
      setShot({ url, name })
    } catch (e) {
      // the user closed the share picker: not an error worth showing
      const err = e as { name?: string; message?: string }
      if (err?.name !== "NotAllowedError" && err?.name !== "AbortError") setShotErr(err?.message ?? String(e))
    }
  }

  const field = "w-full rounded-md border border-line bg-panel px-2.5 py-2 text-13 text-ink placeholder:text-ink-faint focus:border-line-focus focus:outline-none"
  return (
    <Dialog size="large" title={tr("Report a bug")} description={tr("Nothing is sent from here. You check the text, then open it on GitHub or paste it into Discord.")}>
      <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto p-4">
        <label className="flex flex-col gap-1">
          <span className="text-12 font-medium text-ink">{tr("What happened")}</span>
          <textarea
            autoFocus
            rows={4}
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            placeholder={tr("e.g. After Molfar edited a character, its profile page shows “script error”.")}
            className={`${field} resize-y`}
          />
          <span className="text-11 text-ink-faint">{tr("What you did just before, and the exact words of any error.")}</span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-12 font-medium text-ink">{tr("Device and browser")}</span>
          <input value={device} onChange={(e) => setDevice(e.target.value)} placeholder={tr("e.g. Galaxy Z Fold 1, Chrome 129")} className={field} />
          <span className="text-11 text-ink-faint">{tr("Add your phone or computer model if you can.")}</span>
        </label>

        <div className="flex flex-col gap-1.5 rounded-md border border-line bg-panel p-2.5">
          <span className="text-12 font-medium text-ink">{tr("Screenshot")}</span>
          {canCapture() ? <>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="neutral" size="small" onClick={() => void takeShot()}>{shot ? tr("Take another") : tr("Take a screenshot")}</Button>
                {shot ? <a href={shot.url} download={shot.name} className="min-w-0 truncate text-12 text-accent hover:underline">{shot.name}</a> : null}
              </div>
              <span className="text-11 text-ink-faint">
                {shot ? tr("Saved to your downloads. Drag the file into the report on GitHub or Discord.") : tr("Your browser asks which window or tab to capture. The picture is saved as a file.")}
              </span>
              {shotErr ? <span className="text-11 text-danger">{shotErr}</span> : null}
            </> : <span className="text-11 text-ink-faint">{tr("Take a screenshot with your phone, then attach it to the report on GitHub or Discord.")}</span>}
        </div>

        <details className="group min-w-0 rounded-md border border-line">
          <summary className="cursor-pointer select-none px-2.5 py-2 text-12 text-ink-muted hover:text-ink">
            {errors.length
              ? tr("Details that go with the report ({count} recent errors)", { count: String(errors.length) })
              : tr("Details that go with the report")}
          </summary>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words border-t border-line px-2.5 py-2 font-mono text-11 text-ink-muted">
            {[details, errorText ? `\nRecent errors:\n${errorText}` : ""].join("\n").trim()}
          </pre>
        </details>

        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="neutral" size="normal" icon={copied ? "circle-check" : "copy"} onClick={copy}>
              {copied ? tr("Copied") : tr("Copy for Discord")}
            </Button>
            <Button variant="primary" size="normal" icon="outline-square-arrow" onClick={openGitHub}>{tr("Open on GitHub")}</Button>
          </div>
          <span className="text-right text-11 text-ink-faint">
            {tr("GitHub needs a free account.")}{" "}
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer noopener" className="whitespace-nowrap text-accent hover:underline">{tr("Our Discord")}</a>
          </span>
        </div>
      </div>
    </Dialog>
  )
}
