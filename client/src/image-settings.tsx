// Settings > Images: what can draw pictures for apps, and the user's own
// image servers (a local ComfyUI or AUTOMATIC1111/Forge, or any
// OpenAI-compatible images endpoint). Keys are write-only: the engine never
// sends one back.
import { useEffect, useState, type ReactNode } from "react"
import { api } from "./api"
import { Button, IconButton } from "./ui/button"
import { IconSmall } from "./ui/icon"
import { cn } from "./ui/cn"
import { tr } from "./i18n/index"
import { useResource } from "./use-resource"
import { Pane, inputClass } from "./settings"

type Kind = "comfyui" | "a1111" | "openai"

interface ImageEndpoint {
  id: string
  name: string
  kind: Kind
  baseUrl: string
  models?: string[]
  workflow?: string
  width?: number
  height?: number
  steps?: number
  cfg?: number
  negative?: string
  hasKey: boolean
}

interface ImageModel {
  provider: string
  id: string
  label: string
  connectionName: string | null
}

const imagesApi = {
  models: () => api<{ models: ImageModel[] }>("GET", "/v1/images/models").then((r) => r.models ?? []),
  list: () => api<{ endpoints: ImageEndpoint[] }>("GET", "/v1/images/endpoints").then((r) => r.endpoints ?? []),
  create: (body: Record<string, unknown>) => api<{ endpoint: ImageEndpoint }>("POST", "/v1/images/endpoints", body),
  remove: (id: string) => api("DELETE", `/v1/images/endpoints/${encodeURIComponent(id)}`),
  check: (id: string) => api<{ models: { id: string }[] }>("GET", `/v1/images/endpoints/${encodeURIComponent(id)}/models`).then((r) => r.models ?? []),
}

const KINDS: Array<{ value: Kind; label: string; name: string; url: string }> = [
  { value: "comfyui", label: "ComfyUI", name: "ComfyUI", url: "http://127.0.0.1:8188" },
  { value: "a1111", label: "A1111 / Forge", name: "Forge", url: "http://127.0.0.1:7860" },
  { value: "openai", label: "OpenAI-compatible", name: "", url: "" },
]
const kindHint = (k: Kind): string =>
  k === "comfyui" ? tr("A ComfyUI on this computer or your network. Its checkpoints show up as models.")
  : k === "a1111" ? tr("AUTOMATIC1111 or Forge started with --api. Its checkpoints show up as models.")
  : tr("Any service with /images/generations: OpenAI, Together, xAI, a local server.")
const kindLabel = (k: Kind) => KINDS.find((x) => x.value === k)?.label ?? k

export function ImagesTab() {
  const models = useResource(() => imagesApi.models())
  const endpoints = useResource(() => imagesApi.list())
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState("")

  // models grouped by where they come from; endpoint models are shown on their own rows
  const endpointIds = new Set((endpoints.data ?? []).map((e) => e.id))
  const sources = new Map<string, number>()
  for (const m of models.data ?? []) {
    if (endpointIds.has(m.provider)) continue
    const name = m.connectionName ?? m.provider
    sources.set(name, (sources.get(name) ?? 0) + 1)
  }
  const refresh = () => {
    endpoints.refetch()
    models.refetch()
  }

  return (
    <Pane title={tr("Images")} description={tr("Picture generation for every app (Roleplay's image generation uses it). Keys stay on your machine.")}>
      <div className="flex flex-col gap-4 pb-4">
        <section className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <h3 className="text-13 font-medium text-ink">{tr("From your connections")}</h3>
          {models.loading ? <div className="text-13 text-ink-faint">{tr("Loading…")}</div> : sources.size ? (
            [...sources].map(([name, count]) => (
              <div key={name} className="flex items-center gap-2 text-13">
                <IconSmall name="circle-check" className="shrink-0 text-success" />
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <span className="shrink-0 text-12 text-ink-faint">{tr("models: {n}", { n: count })}</span>
              </div>
            ))
          ) : (
            <p className="text-12 text-ink-muted">{tr("None yet. An OpenRouter or NanoGPT connection (Connections and models) adds its image models here.")}</p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="flex-1 text-13 font-medium text-ink">{tr("Your image servers")}</h3>
            {!adding ? <Button variant="neutral" size="small" className="gap-1.5" onClick={() => { setErr(""); setAdding(true) }}>
                <IconSmall name="grid-plus" />
                {tr("Add server")}
              </Button> : null}
          </div>
          {endpoints.loading ? <div className="text-13 text-ink-faint">{tr("Loading…")}</div> : (endpoints.data ?? []).map((ep) => (
            <EndpointRow key={ep.id} ep={ep} onRemoved={refresh} onError={setErr} />
          ))}
          {!endpoints.loading && (endpoints.data ?? []).length === 0 && !adding ? (
            <div className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-13 text-ink-faint">
              {tr("No image servers. Add a local ComfyUI or Forge to draw on your own graphics card.")}
            </div>
          ) : null}
          {adding ? <AddImageEndpoint onCancel={() => setAdding(false)} onCreated={() => { setAdding(false); refresh() }} /> : null}
          {err ? <div className="text-12 text-danger">{err}</div> : null}
        </section>
      </div>
    </Pane>
  )
}

/** One server: asks it for its models on open, so a stopped ComfyUI shows
 *  up here and not as a failed picture later. */
function EndpointRow(props: { ep: ImageEndpoint; onRemoved: () => void; onError: (m: string) => void }) {
  const { ep } = props
  const [state, setState] = useState<{ busy: boolean; count?: number; error?: string }>({ busy: true })
  const [confirming, setConfirming] = useState(false)
  const check = () => {
    setState({ busy: true })
    imagesApi.check(ep.id).then(
      (ms) => setState({ busy: false, count: ms.length }),
      (e: Error) => setState({ busy: false, error: e.message ?? String(e) }),
    )
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: checked once per endpoint
  useEffect(check, [ep.id])

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-line px-3 py-2 text-13">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{ep.name}</span>
          <span className="block truncate text-11 text-ink-faint">
            {kindLabel(ep.kind)} · {ep.baseUrl}{ep.hasKey ? ` · ${tr("key saved")}` : ""}
          </span>
        </span>
        <Button variant="ghost-muted" size="small" disabled={state.busy} onClick={check}>
          {state.busy ? tr("Checking…") : tr("Check")}
        </Button>
        {confirming ? (
          <Button variant="danger" size="small" onClick={async () => {
            try {
              await imagesApi.remove(ep.id)
              props.onRemoved()
            } catch (e: any) {
              props.onError(e.message ?? String(e))
            }
          }}>{tr("Delete")}</Button>
        ) : (
          <IconButton icon={<IconSmall name="trash" />} variant="ghost-muted" size="small" title={tr("Delete server")} aria-label={tr("Delete server")} onClick={() => setConfirming(true)} />
        )}
      </div>
      {!state.busy ? (
        <div className={cn("flex items-start gap-1.5 text-12", state.error ? "text-danger" : state.count ? "text-success" : "text-warning")}>
          <IconSmall name={state.error ? "circle-ban-sign" : "circle-check"} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">
            {state.error ?? (state.count ? tr("Ready · models: {n}", { n: state.count }) : tr("Reachable, but it offers no models yet"))}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function AddImageEndpoint(props: { onCancel: () => void; onCreated: () => void }) {
  const [kind, setKind] = useState<Kind>("comfyui")
  const [name, setName] = useState("ComfyUI")
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:8188")
  const [key, setKey] = useState("")
  const [modelList, setModelList] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [steps, setSteps] = useState("")
  const [cfg, setCfg] = useState("")
  const [negative, setNegative] = useState("")
  const [workflow, setWorkflow] = useState("")
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const local = kind !== "openai"

  const pickKind = (k: Kind) => {
    const old = KINDS.find((x) => x.value === kind)!
    const next = KINDS.find((x) => x.value === k)!
    // keep what the user typed; replace only the suggestions
    if (!name || name === old.name) setName(next.name)
    if (!baseUrl || baseUrl === old.url) setBaseUrl(next.url)
    setKind(k)
  }

  const num = (s: string) => (s.trim() ? Number(s) : undefined)
  const submit = async () => {
    setBusy(true)
    setErr("")
    try {
      await imagesApi.create({
        name, kind, baseUrl,
        ...(key ? { key } : {}),
        ...(kind === "openai" ? { models: modelList } : {}),
        ...(num(width) !== undefined ? { width: num(width) } : {}),
        ...(num(height) !== undefined ? { height: num(height) } : {}),
        ...(local && num(steps) !== undefined ? { steps: num(steps) } : {}),
        ...(local && num(cfg) !== undefined ? { cfg: num(cfg) } : {}),
        ...(local && negative.trim() ? { negative } : {}),
        ...(kind === "comfyui" && workflow.trim() ? { workflow } : {}),
      })
      props.onCreated()
    } catch (e: any) {
      setErr(e.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  const field = (label: string, input: ReactNode, hint?: string) => (
    <label className="flex flex-col gap-1">
      <span className="text-12 font-medium text-ink">{label}</span>
      {input}
      {hint ? <span className="text-11 text-ink-faint">{hint}</span> : null}
    </label>
  )

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line p-3">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-13 font-medium text-ink">{tr("New image server")}</h3>
        <IconButton icon={<IconSmall name="outline-xmark" />} variant="ghost-muted" size="small" title={tr("Cancel")} aria-label={tr("Cancel")} onClick={props.onCancel} />
      </div>
      <div role="radiogroup" aria-label={tr("Kind")} className="grid grid-cols-3 gap-1 rounded-lg border border-line p-1 max-sm:grid-cols-1">
        {KINDS.map((k) => (
          <button key={k.value} type="button" role="radio" aria-checked={kind === k.value}
            className={cn("min-h-9 rounded-md px-2 text-13 transition-colors max-sm:min-h-10", kind === k.value ? "bg-pressed font-medium text-ink" : "text-ink-muted hover:bg-hover")}
            onClick={() => pickKind(k.value)}>
            {k.label}
          </button>
        ))}
      </div>
      <p className="text-12 text-ink-muted">{kindHint(kind)}</p>
      {field(tr("Name"), <input className={inputClass} placeholder={tr("e.g. My ComfyUI")} value={name} onChange={(e) => setName(e.currentTarget.value)} />)}
      {field(tr("Address"), <input className={inputClass} placeholder={kind === "openai" ? "e.g. https://api.openai.com/v1" : "e.g. http://127.0.0.1:8188"} value={baseUrl} onChange={(e) => setBaseUrl(e.currentTarget.value)} />)}
      {kind === "openai" ? field(tr("Models"), <input className={inputClass} placeholder="e.g. gpt-image-1, dall-e-3" value={modelList} onChange={(e) => setModelList(e.currentTarget.value)} />, tr("Image model ids, separated by commas.")) : null}
      {field(local ? tr("API key (optional)") : tr("API key"), <input className={inputClass} type="password" autoComplete="off" placeholder={tr("Stored on this machine only")} value={key} onChange={(e) => setKey(e.currentTarget.value)} />, local ? tr("Only if your server sits behind a proxy that asks for one.") : undefined)}
      <details className="group flex flex-col gap-2">
        <summary className="cursor-pointer select-none text-12 font-medium text-ink-muted">{tr("More settings")}</summary>
        <div className="mt-2 flex flex-col gap-3">
          <div className="flex gap-2">
            {field(tr("Width"), <input className={inputClass} inputMode="numeric" placeholder="1024" value={width} onChange={(e) => setWidth(e.currentTarget.value)} />)}
            {field(tr("Height"), <input className={inputClass} inputMode="numeric" placeholder="1024" value={height} onChange={(e) => setHeight(e.currentTarget.value)} />)}
          </div>
          {local ? <>
            <div className="flex gap-2">
              {field(tr("Steps"), <input className={inputClass} inputMode="numeric" placeholder="25" value={steps} onChange={(e) => setSteps(e.currentTarget.value)} />)}
              {field(tr("CFG"), <input className={inputClass} inputMode="decimal" placeholder="6" value={cfg} onChange={(e) => setCfg(e.currentTarget.value)} />)}
            </div>
            {field(tr("Always avoid"), <input className={inputClass} placeholder="e.g. lowres, bad hands, watermark" value={negative} onChange={(e) => setNegative(e.currentTarget.value)} />, tr("Added to every picture's negative prompt."))}
          </> : null}
          {kind === "comfyui" ? field(
            tr("Your own workflow (optional)"),
            <textarea className={cn(inputClass, "min-h-24 font-mono text-12")} spellCheck={false} placeholder='{"3": {"class_type": "KSampler", …}}' value={workflow} onChange={(e) => setWorkflow(e.currentTarget.value)} />,
            tr("Paste a workflow saved with Save (API Format). Mark where things go: %prompt%, %negative_prompt%, %model%, %width%, %height%, %seed%, %steps%, %cfg%. Empty: a simple text-to-image workflow."),
          ) : null}
        </div>
      </details>
      {err ? <div className="text-12 text-danger">{err}</div> : null}
      <Button variant="primary" size="small" className="self-start" disabled={busy || !name.trim() || !baseUrl.trim()} onClick={submit}>
        {busy ? tr("Saving…") : tr("Save server")}
      </Button>
    </section>
  )
}
