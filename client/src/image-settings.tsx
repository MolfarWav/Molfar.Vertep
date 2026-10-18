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

interface ImageFavorite {
  ref: string
  name?: string
  use?: string
}

interface ImageModel {
  provider: string
  id: string
  label: string
  api: string
  connectionName: string | null
}

const imagesApi = {
  models: () =>
    api<{ models: ImageModel[]; favorites?: ImageFavorite[] }>("GET", "/v1/images/models").then((r) => ({ models: r.models ?? [], favorites: r.favorites ?? [] })),
  setFavorites: (favorites: ImageFavorite[]) => api<{ favorites: ImageFavorite[] }>("PUT", "/v1/images/favorites", { favorites }),
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

  const modelList = models.data?.models ?? []
  const favorites = models.data?.favorites ?? []
  const starred = new Set(favorites.map((f) => f.ref))
  const [busy, setBusy] = useState(false)
  const saveFavorites = async (items: ImageFavorite[]) => {
    setBusy(true)
    setErr("")
    try {
      const r = await imagesApi.setFavorites(items)
      if (models.data) models.mutate({ ...models.data, favorites: r.favorites })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  const star = (ref: string, on: boolean) =>
    void saveFavorites(on ? [...favorites.filter((f) => f.ref !== ref), { ref }] : favorites.filter((f) => f.ref !== ref))

  // models grouped by where they come from; endpoint models are shown on their own rows
  const endpointIds = new Set((endpoints.data ?? []).map((e) => e.id))
  const sources = new Map<string, ImageModel[]>()
  for (const m of modelList) {
    if (endpointIds.has(m.provider)) continue
    const name = m.connectionName ?? m.provider
    sources.set(name, [...(sources.get(name) ?? []), m])
  }
  const refresh = () => {
    endpoints.refetch()
    models.refetch()
  }

  return (
    <Pane title={tr("Images")} description={tr("Picture generation for every app (Roleplay's image generation uses it). Keys stay on your machine.")}>
      <div className="flex flex-col gap-4 pb-4">
        <ImageFavorites favorites={favorites} models={modelList} busy={busy} onSave={(items) => void saveFavorites(items)} />
        <section className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <h3 className="text-13 font-medium text-ink">{tr("From your connections")}</h3>
          {models.loading ? <div className="text-13 text-ink-faint">{tr("Loading…")}</div> : sources.size ? (
            [...sources].map(([name, list]) => (
              <div key={name} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 text-13">
                  <IconSmall name="circle-check" className="shrink-0 text-success" />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="shrink-0 text-12 text-ink-faint">{tr("models: {n}", { n: list.length })}</span>
                </div>
                <SourceModels models={list} starred={starred} busy={busy} onStar={star} />
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
            <EndpointRow key={ep.id} ep={ep} models={modelList.filter((m) => m.provider === ep.id)} starred={starred} busy={busy} onStar={star} onRemoved={refresh} onError={setErr} />
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

const refOf = (m: ImageModel) => `${m.provider}/${m.id}`
const SHOW_MAX = 200

/** A collapsible list of one source's models with a search box and a star to
 *  add a model to (or drop it from) the user's image models. */
function SourceModels(props: { models: ImageModel[]; starred: Set<string>; busy: boolean; onStar: (ref: string, on: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const all = [...props.models].sort((a, b) => Number(props.starred.has(refOf(b))) - Number(props.starred.has(refOf(a))) || a.label.localeCompare(b.label))
  const list = all.filter((m) => !q || `${m.label} ${m.id}`.toLowerCase().includes(q))
  if (!all.length) return null
  return (
    <div className="flex flex-col">
      <button type="button" className="flex items-center gap-2 py-0.5 text-left text-12 text-ink-muted hover:text-ink" aria-expanded={open} onClick={() => setOpen(!open)}>
        <IconSmall name={open ? "chevron-down" : "chevron-right"} size="small" />
        <span className="flex-1">{tr("Models")}</span>
        <span className="text-11 text-ink-faint">{all.length}</span>
      </button>
      {open ? (
        <div className="flex flex-col gap-0.5 pb-1">
          <p className="px-1 pb-1 text-11 text-ink-faint">{tr("Star = add to your image models")}</p>
          {all.length > 8 ? <input className={`${inputClass} mb-1`} type="search" placeholder={tr("Search models…")} aria-label={tr("Search models…")} value={query} onChange={(e) => setQuery(e.currentTarget.value)} /> : null}
          {list.slice(0, SHOW_MAX).map((m) => {
            const ref = refOf(m)
            const on = props.starred.has(ref)
            return (
              <div key={ref} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-hover" data-testid="image-model">
                <span className="min-w-0 flex-1 truncate text-12 text-ink">
                  {m.label}
                  {m.label !== m.id ? <span className="ml-1 text-11 text-ink-faint">{m.id}</span> : null}
                </span>
                <button
                  type="button"
                  className={cn("shrink-0 rounded px-1 text-14 leading-none max-sm:min-h-9 max-sm:min-w-9", on ? "text-ink" : "text-ink-faint hover:text-ink")}
                  disabled={props.busy}
                  aria-pressed={on}
                  title={on ? tr("Remove from your image models") : tr("Add to your image models")}
                  aria-label={on ? tr("Remove from your image models") : tr("Add to your image models")}
                  onClick={() => props.onStar(ref, !on)}
                >
                  {on ? "★" : "☆"}
                </button>
              </div>
            )
          })}
          {list.length > SHOW_MAX ? <div className="px-1 text-11 text-ink-faint">{tr("{n} more: search to find them", { n: list.length - SHOW_MAX })}</div> : null}
          {q && !list.length ? <div className="px-1 text-11 text-ink-faint">{tr("No matches.")}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

/** The user's shortlist: Molfar picks from it by what each model is for, the
 *  first one is the default, and Roleplay lists these first. */
function ImageFavorites(props: { favorites: ImageFavorite[]; models: ImageModel[]; busy: boolean; onSave: (items: ImageFavorite[]) => void }) {
  const [names, setNames] = useState<Record<string, string>>({})
  const [uses, setUses] = useState<Record<string, string>>({})
  const label = (ref: string) => props.models.find((m) => refOf(m) === ref)?.label
  const source = (ref: string) => {
    const m = props.models.find((x) => refOf(x) === ref)
    return m ? (m.connectionName ?? m.provider) : ref
  }
  const move = (i: number, d: number) => {
    const next = [...props.favorites]
    const [it] = next.splice(i, 1)
    if (it) next.splice(i + d, 0, it)
    props.onSave(next)
  }
  const edit = (f: ImageFavorite, key: "name" | "use", value: string) => {
    const v = value.trim()
    if (v === (f[key] ?? "")) return
    props.onSave(props.favorites.map((x) => {
      if (x.ref !== f.ref) return x
      const { [key]: _drop, ...rest } = x
      return { ...rest, ...(v ? { [key]: v } : {}) }
    }))
  }
  return (
    <section className="flex flex-col gap-1.5 rounded-lg border border-line p-3" data-testid="image-favorites">
      <h3 className="text-13 font-medium text-ink">{tr("Your image models")}</h3>
      <p className="text-11 text-ink-faint">{tr("Molfar picks from these by what each is for; the first is the default. Roleplay lists them first in its own picker.")}</p>
      {props.favorites.length === 0 ? <div className="text-12 text-ink-faint">{tr("None yet. Star models below; without a list Molfar uses a local server first, else the first model.")}</div> : null}
      {props.favorites.map((f, i) => {
        const known = label(f.ref) !== undefined
        return (
          <div key={f.ref} className="flex flex-wrap items-center gap-2 border-t border-line pt-1.5 first:border-t-0 first:pt-0">
            <input
              className={cn(inputClass, "min-w-40 flex-1 max-sm:basis-full")}
              aria-label={tr("Name for {model}", { model: f.ref })}
              placeholder={label(f.ref) ?? f.ref}
              maxLength={60}
              value={names[f.ref] ?? f.name ?? ""}
              onChange={(e) => setNames({ ...names, [f.ref]: e.currentTarget.value })}
              onBlur={() => edit(f, "name", names[f.ref] ?? f.name ?? "")}
            />
            <input
              className={cn(inputClass, "min-w-40 flex-1 max-sm:basis-full")}
              aria-label={tr("Used for")}
              placeholder={tr("e.g. backgrounds, cheap")}
              maxLength={120}
              value={uses[f.ref] ?? f.use ?? ""}
              onChange={(e) => setUses({ ...uses, [f.ref]: e.currentTarget.value })}
              onBlur={() => edit(f, "use", uses[f.ref] ?? f.use ?? "")}
            />
            <span title={f.ref} className={cn("min-w-0 flex-1 truncate text-11", known ? "text-ink-faint" : "text-danger")}>{known ? source(f.ref) : tr("{ref} (not available)", { ref: f.ref })}</span>
            <IconButton icon={<IconSmall name="outline-chevron-down" className="rotate-180" />} variant="ghost-muted" size="small" title={tr("Move up")} aria-label={tr("Move up")} disabled={props.busy || i === 0} onClick={() => move(i, -1)} />
            <IconButton icon={<IconSmall name="outline-chevron-down" />} variant="ghost-muted" size="small" title={tr("Move down")} aria-label={tr("Move down")} disabled={props.busy || i === props.favorites.length - 1} onClick={() => move(i, 1)} />
            <IconButton icon={<IconSmall name="outline-xmark" />} variant="ghost-muted" size="small" title={tr("Remove from your image models")} aria-label={tr("Remove from your image models")} disabled={props.busy} onClick={() => props.onSave(props.favorites.filter((x) => x.ref !== f.ref))} />
          </div>
        )
      })}
    </section>
  )
}

/** One server: asks it for its models on open, so a stopped ComfyUI shows
 *  up here and not as a failed picture later. */
function EndpointRow(props: { ep: ImageEndpoint; models: ImageModel[]; starred: Set<string>; busy: boolean; onStar: (ref: string, on: boolean) => void; onRemoved: () => void; onError: (m: string) => void }) {
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
      <SourceModels models={props.models} starred={props.starred} busy={props.busy} onStar={props.onStar} />
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
