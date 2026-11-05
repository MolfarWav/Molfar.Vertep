// Settings > Memory: the embeddings model that runs on this computer (#255). One button downloads a model and
// connects it; without it the online connection stays as it is. The files and the download are the engine's:
// this screen only asks, shows the progress and can be closed without stopping anything.
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "./ui/cn"
import { Button } from "./ui/button"
import { localEmbedApi, type LocalEmbedStatus, type LocalModelId, type LocalModelStatus } from "./api"
import { tr } from "./i18n/index"

/** What the screen says about each model; sizes and the state come from the engine. */
const MODELS: { id: LocalModelId; recommended: boolean }[] = [
  { id: "bge-m3", recommended: true },
  { id: "embeddinggemma-2", recommended: false },
]

const mb = (bytes: number) => tr("{n} MB", { n: String(Math.max(1, Math.round(bytes / 1e6))) })
const gb = (ramMb: number) => tr("{n} GB", { n: (Math.round(ramMb / 100) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 }) })
const eta = (sec: number | null) => (sec === null ? "" : sec < 60 ? tr("less than a minute left") : tr("about {n} min left", { n: String(Math.round(sec / 60)) }))

function Chip({ tone, children }: { tone: "good" | "busy"; children: string }) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-11 font-medium", tone === "good" ? "border-success text-success" : "border-line text-ink-muted")}>
      {children}
    </span>
  )
}

export function LocalEmbeddings({ onChanged, onCheck, checking }: { onChanged: () => void; onCheck: () => void; checking: boolean }) {
  const [st, setSt] = useState<LocalEmbedStatus | null>(null)
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const [askDelete, setAskDelete] = useState<LocalModelId | null>(null)
  const [freed, setFreed] = useState<number | null>(null)
  const wasRunning = useRef(false)

  const apply = useCallback(
    (next: LocalEmbedStatus) => {
      setSt(next)
      // a download that has just ended (done, cancelled or failed): the config and the check above must follow
      if (wasRunning.current && !next.job) onChanged()
      wasRunning.current = !!next.job
    },
    [onChanged],
  )

  useEffect(() => {
    let live = true
    const load = () =>
      localEmbedApi
        .status()
        .then((r) => live && apply(r))
        .catch((e) => live && setErr(e instanceof Error ? e.message : String(e)))
    void load()
    return () => {
      live = false
    }
  }, [apply])

  // a running download is the engine's: ask how far it is once a second, also after the window was closed and opened again
  const running = !!st?.job
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      localEmbedApi.status().then(apply).catch(() => undefined)
    }, 1000)
    return () => clearInterval(t)
  }, [running, apply])

  const act = async (run: () => Promise<LocalEmbedStatus>, after?: (r: LocalEmbedStatus) => void) => {
    setBusy(true)
    setErr("")
    try {
      const r = await run()
      apply(r)
      after?.(r)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!st) return null
  const job = st.job
  const programSize = mb(85_000_000)

  return (
    <section className="flex flex-col gap-2" aria-labelledby="local-embed-title">
      <h4 id="local-embed-title" className="text-13 font-medium text-ink">{tr("On this computer (optional)")}</h4>
      <p className="text-12 leading-4 text-ink-muted">
        {tr("Free, and after the download nothing goes to the internet. If you skip it, the online connection stays as it is.")}
      </p>

      {!st.supported ? (
        <p className="rounded-lg border border-line bg-panel px-3 py-2 text-12 leading-4 text-ink-muted">
          {tr("This build of the engine cannot run a model on this computer. The online connection is used.")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {MODELS.map((m) => {
            const info = st.models.find((x) => x.id === m.id)
            if (!info) return null
            return (
              <ModelCard
                key={m.id}
                info={info}
                meta={m}
                connected={st.connected === m.id}
                job={job && job.model === m.id ? job : null}
                otherBusy={!!job && job.model !== m.id}
                busy={busy}
                checking={checking}
                lastError={!job && st.lastError && info.state !== "ready" && (!st.models.some((x) => x.state === "partial") || info.state === "partial" || m.recommended) ? st.lastError : ""}
                confirming={askDelete === m.id}
                programSize={programSize}
                onDownload={() => void act(() => localEmbedApi.download(m.id))}
                onCancel={() => void act(async () => {
                  await localEmbedApi.cancel()
                  return localEmbedApi.status()
                })}
                onConnect={() => void act(() => localEmbedApi.connect(m.id), () => onChanged())}
                onCheck={onCheck}
                onAskDelete={() => setAskDelete(m.id)}
                onKeep={() => setAskDelete(null)}
                onDelete={() => {
                  setAskDelete(null)
                  void act(() => localEmbedApi.remove(m.id), (r) => {
                    setFreed(r.freed ?? null)
                    onChanged()
                  })
                }}
              />
            )
          })}
          {freed !== null ? <p className="text-12 text-success" aria-live="polite">{tr("Deleted. {size} freed.", { size: mb(freed) })}</p> : null}
          <p className="text-11 leading-4 text-ink-faint">
            {tr("Before the first download the engine also installs the program that runs the model (about {size}, once for both models). A download starts only after your click.", { size: programSize })}
          </p>
        </div>
      )}

      <p className="text-11 leading-4 text-ink-faint">
        {tr("The model runs on the computer that runs the engine, so a phone here only opens the settings and downloads nothing. If the engine runs on a phone or a small server, about 1 GB of memory may not be enough: keep the online connection there.")}
      </p>
      {err ? <div className="text-12 text-danger" role="alert">{err}</div> : null}
    </section>
  )
}

function ModelCard(props: {
  info: LocalModelStatus
  meta: { id: LocalModelId; recommended: boolean }
  connected: boolean
  job: NonNullable<LocalEmbedStatus["job"]> | null
  otherBusy: boolean
  busy: boolean
  checking: boolean
  lastError: string
  confirming: boolean
  programSize: string
  onDownload: () => void
  onCancel: () => void
  onConnect: () => void
  onCheck: () => void
  onAskDelete: () => void
  onKeep: () => void
  onDelete: () => void
}) {
  const { info, meta, connected, job, otherBusy, busy, checking, lastError, confirming } = props
  const pct = job && job.totalBytes > 0 ? Math.min(100, Math.floor((job.doneBytes / job.totalBytes) * 100)) : 0
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border bg-panel px-3 py-3", connected ? "border-success" : "border-line", otherBusy && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-13 font-medium text-ink">{info.title}</span>
        {connected ? <Chip tone="good">{tr("connected")}</Chip> : meta.recommended && info.state === "absent" ? <Chip tone="good">{tr("recommended")}</Chip> : null}
        {job ? <Chip tone="busy">{tr("downloading")}</Chip> : null}
      </div>

      {job ? (
        <>
          <p className="text-12 leading-4 text-ink-muted">
            {job.step === 1
              ? tr("Step 1 of 2: installing the program that runs the model (about {size}).", { size: props.programSize })
              : tr("Step 2 of 2: the model. Step 1 (the program that runs it) is done.")}
          </p>
          <div
            className="h-2 overflow-hidden rounded-full bg-pressed"
            role="progressbar"
            aria-label={tr("Download progress")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={job.step === 1 ? undefined : pct}
            aria-busy={job.step === 1}
          >
            <div className={cn("h-full rounded-full bg-accent", job.step === 1 && "w-full animate-pulse opacity-50")} style={job.step === 2 ? { width: `${pct}%` } : undefined} />
          </div>
          {job.step === 2 ? (
            <p className="text-12 text-ink-muted" aria-live="polite">
              {[tr("{done} of {total}", { done: String(Math.round(job.doneBytes / 1e6)), total: mb(job.totalBytes) }), eta(job.etaSec)].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="neutral" size="normal" touch onClick={props.onCancel} disabled={busy}>{tr("Cancel")}</Button>
          </div>
          <p className="text-11 leading-4 text-ink-faint">
            {tr("You can close this window: the download goes on in the engine. If it stops, the next click continues from where it stopped.")}
          </p>
        </>
      ) : otherBusy ? (
        <p className="text-12 text-ink-muted">{tr("Not available while another download runs.")}</p>
      ) : info.state === "ready" ? (
        <>
          <p className="text-12 leading-4 text-ink-muted">
            {connected
              ? tr("In use. It comes first in the automatic order; the online connection stays as a backup. It takes memory only while it works.")
              : tr("Downloaded, not in use.")}
            {" "}
            {tr("{disk} on disk · about {ram} of memory while it works · {license} licence", { disk: mb(info.diskBytes), ram: gb(info.ramMb), license: info.license })}
          </p>
          {confirming ? (
            <div className="flex flex-col gap-2">
              <p className="text-12 text-ink">{tr("Delete {model}? You can download it again.", { model: info.title })}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" size="normal" touch disabled={busy} onClick={props.onDelete}>{tr("Delete")}</Button>
                <Button variant="neutral" size="normal" touch onClick={props.onKeep}>{tr("Keep")}</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {connected ? (
                <Button variant="neutral" size="normal" touch disabled={busy || checking} onClick={props.onCheck}>{tr("Check the connection")}</Button>
              ) : (
                <Button variant="primary" size="normal" touch disabled={busy} onClick={props.onConnect}>{tr("Connect")}</Button>
              )}
              <Button variant="ghost" size="normal" touch disabled={busy} onClick={props.onAskDelete}>
                {tr("Delete (frees {size})", { size: mb(info.diskBytes) })}
              </Button>
            </div>
          )}
          {!connected ? (
            <p className="text-11 leading-4 text-ink-faint">
              {tr("If you switch models, vectors made by the other one are not used until they are made again. The app does that by itself: it is free and takes a few minutes.")}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-12 leading-4 text-ink-muted">
            {meta.id === "bge-m3"
              ? tr("Best quality on Ukrainian, Russian and English. The faster of the two: about 15 ms per request.")
              : tr("Almost as good, and smaller: choose it when disk space matters more.")}
          </p>
          <p className="text-12 text-ink-muted">
            {tr("{disk} on disk · about {ram} of memory while it works · {license} licence", { disk: mb(info.diskBytes), ram: gb(info.ramMb), license: info.license })}
          </p>
          {info.state === "partial" ? (
            <p className="text-12 text-ink-muted">{tr("The download was interrupted: {done} of {total}.", { done: String(Math.round(info.downloadedBytes / 1e6)), total: mb(info.diskBytes) })}</p>
          ) : null}
          {lastError ? <p className="text-12 leading-4 text-danger" role="alert">{tr("The download stopped: {error}", { error: lastError })}</p> : null}
          <div className="flex">
            <Button variant={meta.recommended ? "primary" : "outline"} size="normal" touch className="w-full sm:w-auto" disabled={busy} onClick={props.onDownload}>
              {info.state === "partial" ? tr("Continue the download") : tr("Download and connect")}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
