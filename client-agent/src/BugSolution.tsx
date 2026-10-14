// The card under Molfar's bug_solution call (skill fix-bug) and the dialog
// that turns it into a GitHub issue: the fix with its patch (the app's code
// since the checkpoint, from /v1/agent/bug-patch), or a report with what
// Molfar found. Nothing is sent from here: GitHub opens pre-filled and the
// user reads it before posting.

import { useEffect, useMemo, useState } from "react"
import type { ToolCallMessagePartComponent } from "@assistant-ui/react"
import { Bug, CheckCircle, DownloadSimple, GithubLogo, Warning } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "./api"
import { useAgent } from "./store"
import type { ToolResult } from "./tools"

interface BugSolutionArgs {
  solved: boolean
  problem: string
  cause: string
  fix: string
  verify?: string
  app?: string
  checkpoint?: string
}

interface SolutionPatch {
  app: string
  appVersion: string | null
  checkpoint: { id: string; label: string; at: number }
  files: { path: string; status: "added" | "modified" | "deleted"; warnings: string[] }[]
  patch: string
}

interface EngineInfo {
  engine: { version: string; repository: string | null }
}

function describeBrowser(ua: string): string {
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Macintosh|Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : ""
  const edge = ua.match(/Edg\/(\d+)/)
  const chrome = ua.match(/(?:Chrome|CriOS)\/(\d+)/)
  const firefox = ua.match(/(?:Firefox|FxiOS)\/(\d+)/)
  const safari = ua.match(/Version\/(\d+).*Safari\//)
  const browser = edge
    ? `Edge ${edge[1]}`
    : chrome
      ? `Chrome ${chrome[1]}`
      : firefox
        ? `Firefox ${firefox[1]}`
        : safari
          ? `Safari ${safari[1]}`
          : ""
  if (!os && !browser) return ""
  return os && browser ? `${os}, ${browser}` : os || browser
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

function statusClass(status: string): string {
  switch (status) {
    case "added":
      return "text-green-600 dark:text-green-400"
    case "modified":
      return "text-blue-600 dark:text-blue-400"
    case "deleted":
      return "text-destructive"
    default:
      return "text-muted-foreground"
  }
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
  rows = 2,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  textarea?: boolean
  rows?: number
}) {
  const className =
    "w-full rounded-md border bg-transparent px-2.5 py-2 text-sm"
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          className={className}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={className}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  )
}

function Labeled({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-sm">{text}</p>
    </div>
  )
}

export const BugSolutionTool: ToolCallMessagePartComponent<Record<string, unknown>, ToolResult> = (
  p
) => {
  // arguments stream in, and an old chat may hold any shape: strings only
  const raw = (p.args ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === "string" ? v : "")
  const args: BugSolutionArgs = {
    solved: raw.solved !== false,
    problem: str(raw.problem),
    cause: str(raw.cause),
    fix: str(raw.fix),
    ...(str(raw.verify) ? { verify: str(raw.verify) } : {}),
    ...(str(raw.app) ? { app: str(raw.app) } : {}),
    ...(str(raw.checkpoint) ? { checkpoint: str(raw.checkpoint) } : {}),
  }
  const send = useAgent((s) => s.send)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sentStillBroken, setSentStillBroken] = useState(false)

  if (p.status?.type === "running") {
    return (
      <p className="text-sm text-muted-foreground">
        {args.solved === false ? "Preparing the report…" : "Preparing the fix…"}
      </p>
    )
  }

  if (p.result && !p.result.ok) {
    return <p className="text-sm text-destructive">{p.result.summary}</p>
  }

  return (
    <>
      <div className="min-w-0 max-w-full rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          {args.solved === false ? (
            <Bug className="size-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
          )}
          <span className="text-sm font-medium">
            {args.solved === false ? "Not fixed in your copy" : "Fix found"}
          </span>
        </div>
        <p className="mt-1 break-words text-sm text-muted-foreground">{args.problem}</p>

        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            What Molfar found
          </summary>
          <div className="mt-2 space-y-2">
            <Labeled label="Cause" text={args.cause} />
            <Labeled
              label={args.solved === false ? "What was tried" : "Changed"}
              text={args.fix}
            />
            {args.verify && <Labeled label="How to check it" text={args.verify} />}
          </div>
        </details>

        <div className="mt-3 flex flex-wrap gap-2">
          {args.solved === false ? (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              Report it on GitHub
            </Button>
          ) : (
            <>
              <Button size="sm" disabled={sentStillBroken} onClick={() => setDialogOpen(true)}>
                It works, send the fix
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={sentStillBroken}
                onClick={() => {
                  setSentStillBroken(true)
                  void send("Still broken: the fix did not help.")
                }}
              >
                {sentStillBroken ? "Sent to Molfar" : "Still broken"}
              </Button>
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Nothing is sent from here: you check it on GitHub first.
        </p>
      </div>

      {/* mounted while open: each opening starts from the card's texts */}
      {dialogOpen ? <SolutionDialog open onOpenChange={setDialogOpen} args={args} /> : null}
    </>
  )
}

function SolutionDialog({
  open,
  onOpenChange,
  args,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  args: BugSolutionArgs
}) {
  const [engine, setEngine] = useState<EngineInfo | null>(null)
  const [patch, setPatch] = useState<SolutionPatch | null>(null)
  const [loading, setLoading] = useState(false)
  const [patchError, setPatchError] = useState<string | null>(null)
  const [patchNote, setPatchNote] = useState(false)
  const [copied, setCopied] = useState(false)

  const [what, setWhat] = useState(args.problem)
  const [cause, setCause] = useState(args.cause)
  const [changed, setChanged] = useState(args.fix)
  const [verify, setVerify] = useState(args.verify ?? "")
  const [version, setVersion] = useState("Molfar Vertep")
  const [device, setDevice] = useState(() =>
    typeof navigator !== "undefined" ? describeBrowser(navigator.userAgent) : ""
  )

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setPatchError(null)
    setPatchNote(false)
    setEngine(null)
    setPatch(null)
    setVersion("Molfar Vertep")

    api<EngineInfo>("GET", "/v1/launch")
      .then((e) => {
        if (!active) return
        setEngine(e)
        setVersion(`Molfar Vertep ${e.engine.version}`)
        if (args.solved && args.app && args.checkpoint) {
          return api<SolutionPatch>(
            "GET",
            `/v1/agent/bug-patch?app=${encodeURIComponent(args.app)}&checkpoint=${encodeURIComponent(args.checkpoint)}`
          )
        }
        return null
      })
      .then((p) => {
        if (!active) return
        if (p) {
          setPatch(p)
          if (p.appVersion) {
            setVersion((v) => `${v.split(",")[0]}, ${p.app} ${p.appVersion}`)
          }
        }
      })
      .catch((err) => {
        if (!active) return
        setPatchError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [open, args.solved, args.app, args.checkpoint])

  const filename = useMemo(
    () => `molfar-fix-${patch?.app ?? args.app ?? "app"}-${formatDate(new Date())}.patch`,
    [patch, args.app]
  )

  const hasWarnings = patch ? patch.files.some((f) => f.warnings.length > 0) : false

  async function handleCopy() {
    if (!patch?.patch) return
    await navigator.clipboard.writeText(patch.patch)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleDownload() {
    const body = patch?.patch ?? ""
    const blob = new Blob([body], { type: "text/x-diff" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function handleOpenGitHub() {
    const repoUrl = (
      engine?.engine.repository &&
      /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(engine.engine.repository)
        ? engine.engine.repository
        : "https://github.com/MolfarWav/Molfar.Vertep"
    ).replace(/\/$/, "")

    const first = what.trim().split("\n")[0] ?? ""
    const title = first.length > 70 ? `${first.slice(0, 69)}…` : first

    if (args.solved) {
      let params = new URLSearchParams({
        template: "solution.yml",
        title,
        what,
        cause,
        fix: changed,
        verify,
        version,
        device,
        patch: patch?.patch ?? "",
      })
      let url = `${repoUrl}/issues/new?${params.toString()}`
      if (url.length > 7000) {
        params = new URLSearchParams({
          template: "solution.yml",
          title,
          what,
          cause,
          fix: changed,
          verify,
          version,
          device,
          patch: `The patch is attached as a file: ${filename}`,
        })
        url = `${repoUrl}/issues/new?${params.toString()}`
        handleDownload()
        setPatchNote(true)
      }
      window.open(url, "_blank", "noopener")
    } else {
      const tried = `Molfar looked into it:\nCause: ${cause}\nTried: ${changed}`
      let whatValue = `${what}\n\n${tried}`
      let params = new URLSearchParams({
        template: "bug_report.yml",
        title,
        what: whatValue,
        version,
        device,
      })
      let url = `${repoUrl}/issues/new?${params.toString()}`
      while (url.length > 7000 && whatValue.length > 500) {
        whatValue = whatValue.slice(0, whatValue.length - 500)
        params = new URLSearchParams({
          template: "bug_report.yml",
          title,
          what: whatValue,
          version,
          device,
        })
        url = `${repoUrl}/issues/new?${params.toString()}`
      }
      window.open(url, "_blank", "noopener")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{args.solved ? "Send the fix" : "Report the bug"}</DialogTitle>
          <DialogDescription>Read it before posting: GitHub issues are public.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading details…</p>
        ) : (
          <div className="min-w-0 space-y-4">
            {patchError && <p className="text-sm text-destructive">{patchError}</p>}

            <Field label="What happened" value={what} onChange={setWhat} textarea rows={2} />
            <Field label="Cause" value={cause} onChange={setCause} textarea rows={2} />
            <Field
              label={args.solved ? "What Molfar changed" : "What was tried"}
              value={changed}
              onChange={setChanged}
              textarea
              rows={3}
            />
            <Field label="How to check it" value={verify} onChange={setVerify} textarea rows={2} />
            <Field label="Version" value={version} onChange={setVersion} />
            <Field label="Device and browser" value={device} onChange={setDevice} />

            {args.solved && args.app && args.checkpoint && patch && (
              <section>
                <h4 className="mb-2 text-xs font-medium text-muted-foreground">Files in the fix</h4>
                {patch.files.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No code changed: only the description goes.
                  </p>
                ) : (
                  <>
                    {hasWarnings && (
                      <div className="mb-3 flex gap-2 rounded-md border border-amber-600/20 bg-amber-600/10 p-2 text-xs text-amber-700 dark:text-amber-300">
                        <Warning className="size-4 shrink-0" />
                        Some files may hold private things. Check them in the patch below; remove
                        what should not be public before posting.
                      </div>
                    )}
                    <ul className="space-y-1.5">
                      {patch.files.map((f) => (
                        <li key={f.path} className="font-mono text-xs">
                          <span className={statusClass(f.status)}>{f.status}</span>{" "}
                          <span className="break-all">{f.path}</span>
                          {f.warnings.length > 0 && (
                            <div className="mt-0.5 space-y-0.5">
                              {f.warnings.map((w) => (
                                <p key={w} className="text-amber-600 dark:text-amber-400">
                                  {w}
                                </p>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                        Patch
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre rounded-md border bg-muted p-2 font-mono text-xs">
                        {patch.patch}
                      </pre>
                    </details>
                  </>
                )}
              </section>
            )}

            {patchNote && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                The patch was too long for the link: it was saved to your downloads. Drag the file
                into the Patch field on GitHub.
              </p>
            )}

            <DialogFooter className="flex flex-wrap justify-end gap-2">
              {patch?.patch && (
                <>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? "Copied" : "Copy patch"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <DownloadSimple className="mr-1.5 size-4" />
                    Download .patch
                  </Button>
                </>
              )}
              <Button size="sm" onClick={handleOpenGitHub}>
                <GithubLogo className="mr-1.5 size-4" />
                Open on GitHub
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
