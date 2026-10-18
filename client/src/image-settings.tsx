// Settings > Images: what can draw pictures for apps, and the user's own
// image servers (a local ComfyUI or AUTOMATIC1111/Forge, or any
// OpenAI-compatible images endpoint). Keys are write-only: the engine never
// sends one back.
import { useEffect, useRef, useState, type ReactNode } from "react"
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
  prefix?: string
  sampler?: string
  scheduler?: string
  seed?: number
  denoise?: number
  clipSkip?: number
  loras?: Array<{ name: string; strength: number }>
  style?: "tags" | "description"
  instructions?: string
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
  update: (id: string, body: Record<string, unknown>) => api<{ endpoint: ImageEndpoint }>("PATCH", `/v1/images/endpoints/${encodeURIComponent(id)}`, body),
  options: (id: string) => api<{ samplers?: string[]; schedulers?: string[]; loras?: string[] }>("GET", `/v1/images/endpoints/${encodeURIComponent(id)}/options`).then((r) => ({ samplers: r.samplers ?? [], schedulers: r.schedulers ?? [], loras: r.loras ?? [] })),
  remove: (id: string) => api("DELETE", `/v1/images/endpoints/${encodeURIComponent(id)}`),
  adaptWorkflow: (workflow: string) => api<{ workflow: string; filled: string[]; values: WorkflowValues }>("POST", "/v1/images/workflow/adapt", { workflow }),
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
  const [editing, setEditing] = useState<string | null>(null)
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
            {!adding ? <Button variant="neutral" size="small" className="gap-1.5" onClick={() => { setErr(""); setEditing(null); setAdding(true) }}>
                <IconSmall name="grid-plus" />
                {tr("Add server")}
              </Button> : null}
          </div>
          {endpoints.loading ? <div className="text-13 text-ink-faint">{tr("Loading…")}</div> : (endpoints.data ?? []).map((ep) => (
            editing === ep.id ? <ImageEndpointForm key={ep.id} ep={ep} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); refresh() }} /> :
            <EndpointRow key={ep.id} ep={ep} onEdit={() => { setErr(""); setAdding(false); setEditing(ep.id) }} models={modelList.filter((m) => m.provider === ep.id)} starred={starred} busy={busy} onStar={star} onRemoved={refresh} onError={setErr} />
          ))}
          {!endpoints.loading && (endpoints.data ?? []).length === 0 && !adding ? (
            <div className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-13 text-ink-faint">
              {tr("No image servers. Add a local ComfyUI or Forge to draw on your own graphics card.")}
            </div>
          ) : null}
          {adding ? <ImageEndpointForm onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); refresh() }} /> : null}
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
function EndpointRow(props: { ep: ImageEndpoint; onEdit: () => void; models: ImageModel[]; starred: Set<string>; busy: boolean; onStar: (ref: string, on: boolean) => void; onRemoved: () => void; onError: (m: string) => void }) {
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
        <Button variant="ghost-muted" size="small" onClick={props.onEdit}>{tr("Edit")}</Button>
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

const MAX_LORAS = 5

/** Everything the form edits, as text the inputs can hold. */
interface FormState {
  kind: Kind
  name: string
  baseUrl: string
  modelList: string
  width: string
  height: string
  steps: string
  cfg: string
  seed: string
  denoise: string
  clipSkip: string
  prefix: string
  negative: string
  style: "" | "tags" | "description"
  instructions: string
  sampler: string
  scheduler: string
  loras: Array<{ id: number; name: string; strength: string }>
  workflow: string
}

let loraId = 0
const formFrom = (ep?: ImageEndpoint): FormState => {
  const s = (v: number | undefined) => (v === undefined || v === null ? "" : String(v))
  const kind = ep?.kind ?? "comfyui"
  const k = KINDS.find((x) => x.value === kind) ?? KINDS[0]
  return {
    kind,
    name: ep?.name ?? k?.name ?? "",
    baseUrl: ep?.baseUrl ?? k?.url ?? "",
    modelList: (ep?.models ?? []).join(", "),
    width: s(ep?.width), height: s(ep?.height), steps: s(ep?.steps), cfg: s(ep?.cfg),
    seed: s(ep?.seed), denoise: s(ep?.denoise), clipSkip: s(ep?.clipSkip),
    prefix: ep?.prefix ?? "", negative: ep?.negative ?? "", style: ep?.style ?? "", instructions: ep?.instructions ?? "",
    sampler: ep?.sampler ?? "", scheduler: ep?.scheduler ?? "",
    loras: (ep?.loras ?? []).map((l) => ({ id: ++loraId, name: l.name, strength: String(l.strength) })),
    workflow: ep?.workflow ?? "",
  }
}

/** The request body for a state: a cleared field is null or "", so a PATCH can
 *  empty it; a create drops those. Fields that do not apply to the kind are left out. */
const bodyFrom = (f: FormState): Record<string, unknown> => {
  const local = f.kind !== "openai"
  // a non-number goes through as text, so the engine answers with its own message
  const num = (s: string): unknown => (s.trim() ? (Number.isNaN(Number(s)) ? s : Number(s)) : null)
  const b: Record<string, unknown> = {
    name: f.name.trim(), baseUrl: f.baseUrl.trim(),
    width: num(f.width), height: num(f.height),
    style: f.style, instructions: f.instructions.trim(),
  }
  if (f.kind === "openai") b.models = f.modelList
  if (local) {
    Object.assign(b, {
      steps: num(f.steps), cfg: num(f.cfg), seed: num(f.seed), clipSkip: num(f.clipSkip),
      prefix: f.prefix.trim(), negative: f.negative.trim(), sampler: f.sampler.trim(), scheduler: f.scheduler.trim(),
      loras: f.loras.filter((l) => l.name.trim()).map((l) => ({ name: l.name.trim(), strength: l.strength.trim() ? num(l.strength) : 1 })),
    })
  }
  if (f.kind === "comfyui") {
    b.denoise = num(f.denoise)
    b.workflow = f.workflow.trim()
  }
  return b
}

const isEmpty = (v: unknown) => v === null || v === "" || (Array.isArray(v) && v.length === 0)

interface ServerOptions { samplers: string[]; schedulers: string[]; loras: string[] }

/** What an imported workflow was set to (src/images.ts ComfyWorkflowValues). */
interface WorkflowValues {
  width?: number; height?: number; steps?: number; cfg?: number; sampler?: string; scheduler?: string
  denoise?: number; clipSkip?: number; loras?: Array<{ name: string; strength: number }>
}

/** The add form and, with `ep`, the edit form of one server. An edit sends only
 *  what changed; the key is never shown, only replaced or removed. */
function ImageEndpointForm(props: { ep?: ImageEndpoint; onCancel: () => void; onSaved: () => void }) {
  const { ep } = props
  const [f, setF] = useState<FormState>(() => formFrom(ep))
  const [key, setKey] = useState("")
  const [clearKey, setClearKey] = useState(false)
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const [opts, setOpts] = useState<{ loading: boolean; data?: ServerOptions; error?: string }>({ loading: !!ep && ep.kind !== "openai" })
  const kind = f.kind
  const local = kind !== "openai"
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((x) => ({ ...x, [k]: v }))
  const [taken, setTaken] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)

  /** An exported workflow into the form: its settings fill the fields above,
   *  and the workflow gets placeholders where they go. */
  const importWorkflow = async (text: string) => {
    setErr("")
    setTaken("")
    try {
      const r = await imagesApi.adaptWorkflow(text)
      const v = r.values
      const str = (n: number | string | undefined) => (n === undefined ? undefined : String(n))
      const from: Partial<FormState> = {
        width: str(v.width), height: str(v.height), steps: str(v.steps), cfg: str(v.cfg), sampler: v.sampler, scheduler: v.scheduler,
        denoise: str(v.denoise), clipSkip: str(v.clipSkip),
        loras: v.loras?.map((l) => ({ id: ++loraId, name: l.name, strength: String(l.strength) })),
      }
      for (const k of Object.keys(from) as (keyof FormState)[]) if (from[k] === undefined) delete from[k]
      setF((x) => ({ ...x, ...from, workflow: r.workflow }))
      const labels: Record<string, string> = {
        width: tr("Width"), height: tr("Height"), steps: tr("Steps"), cfg: tr("CFG"), sampler: tr("Sampler"), scheduler: tr("Scheduler"),
        denoise: tr("Denoise"), clipSkip: tr("Clip skip"), loras: tr("LoRAs"),
      }
      const names = Object.keys(from).map((k) => labels[k] ?? k)
      setTaken(names.length ? tr("Taken from the workflow: {list}. Change them in the fields above.", { list: names.join(", ") }) : tr("The workflow is ready; it had no settings for the fields above."))
    } catch (e: any) {
      setErr(e.message ?? String(e))
    }
  }
  const pickFile = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = ""
    if (file) await importWorkflow(await file.text())
  }

  // the server's own lists, asked for once when a saved local server is edited
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per server
  useEffect(() => {
    if (!ep || ep.kind === "openai") return
    let live = true
    imagesApi.options(ep.id).then(
      (data) => live && setOpts({ loading: false, data }),
      (e: Error) => live && setOpts({ loading: false, error: e.message ?? String(e) }),
    )
    return () => { live = false }
  }, [ep?.id])

  const pickKind = (k: Kind) => {
    const old = KINDS.find((x) => x.value === kind)!
    const next = KINDS.find((x) => x.value === k)!
    // keep what the user typed; replace only the suggestions
    setF((x) => ({
      ...x, kind: k,
      name: !x.name || x.name === old.name ? next.name : x.name,
      baseUrl: !x.baseUrl || x.baseUrl === old.url ? next.url : x.baseUrl,
    }))
  }

  const submit = async () => {
    setBusy(true)
    setErr("")
    try {
      const now = bodyFrom(f)
      if (ep) {
        const was = bodyFrom(formFrom(ep))
        const patch: Record<string, unknown> = {}
        for (const k of Object.keys(now)) if (JSON.stringify(now[k]) !== JSON.stringify(was[k])) patch[k] = now[k]
        if (key) patch.key = key
        else if (clearKey) patch.clearKey = true
        if (Object.keys(patch).length) await imagesApi.update(ep.id, patch)
      } else {
        const body: Record<string, unknown> = { kind }
        for (const [k, v] of Object.entries(now)) if (!isEmpty(v) || k === "name" || k === "baseUrl") body[k] = v
        if (key) body.key = key
        await imagesApi.create(body)
      }
      props.onSaved()
    } catch (e: any) {
      setErr(e.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  const field = (label: string, input: ReactNode, hint?: string) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-12 font-medium text-ink">{label}</span>
      {input}
      {hint ? <span className="text-11 text-ink-faint">{hint}</span> : null}
    </label>
  )
  const group = (title: string) => <h4 className="border-t border-line pt-3 text-12 font-medium text-ink-muted">{title}</h4>
  const text = (k: "prefix" | "negative" | "workflow" | "instructions" | "name" | "baseUrl" | "width" | "height" | "steps" | "cfg" | "seed" | "denoise" | "clipSkip", placeholder?: string, mode?: "numeric" | "decimal") => (
    <input className={inputClass} inputMode={mode} placeholder={placeholder} value={f[k]} onChange={(e) => set(k, e.currentTarget.value)} />
  )
  // a pick list when the server told us its names, else free text
  const pick = (k: "sampler" | "scheduler", list: string[] | undefined, placeholder: string) =>
    list?.length ? (
      <select className={inputClass} value={f[k]} onChange={(e) => set(k, e.currentTarget.value)}>
        <option value="">{tr("Server default")}</option>
        {f[k] && !list.includes(f[k]) ? <option value={f[k]}>{f[k]}</option> : null}
        {list.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    ) : <input className={inputClass} placeholder={placeholder} value={f[k]} onChange={(e) => set(k, e.currentTarget.value)} />
  const setLora = (i: number, patch: Partial<{ name: string; strength: string }>) =>
    set("loras", f.loras.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const listId = "image-loras"

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line p-3">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-13 font-medium text-ink">{ep ? tr("Edit image server") : tr("New image server")}</h3>
        <IconButton icon={<IconSmall name="outline-xmark" />} variant="ghost-muted" size="small" title={tr("Cancel")} aria-label={tr("Cancel")} onClick={props.onCancel} />
      </div>
      {ep ? null : (
        <div role="radiogroup" aria-label={tr("Kind")} className="grid grid-cols-3 gap-1 rounded-lg border border-line p-1 max-sm:grid-cols-1">
          {KINDS.map((k) => (
            <button key={k.value} type="button" role="radio" aria-checked={kind === k.value}
              className={cn("min-h-9 rounded-md px-2 text-13 transition-colors max-sm:min-h-10", kind === k.value ? "bg-pressed font-medium text-ink" : "text-ink-muted hover:bg-hover")}
              onClick={() => pickKind(k.value)}>
              {k.label}
            </button>
          ))}
        </div>
      )}
      <p className="text-12 text-ink-muted">{kindHint(kind)}</p>
      {field(tr("Name"), text("name", tr("e.g. My ComfyUI")))}
      {field(tr("Address"), text("baseUrl", kind === "openai" ? "e.g. https://api.openai.com/v1" : "e.g. http://127.0.0.1:8188"))}
      {kind === "openai" ? field(tr("Models"), <input className={inputClass} placeholder="e.g. gpt-image-1, dall-e-3" value={f.modelList} onChange={(e) => set("modelList", e.currentTarget.value)} />, tr("Image model ids, separated by commas.")) : null}
      {field(
        local ? tr("API key (optional)") : tr("API key"),
        <input className={inputClass} type="password" autoComplete="off" placeholder={ep?.hasKey ? tr("Saved — leave empty to keep") : tr("Stored on this machine only")} value={key} onChange={(e) => { setKey(e.currentTarget.value); if (e.currentTarget.value) setClearKey(false) }} />,
        local ? tr("Only if your server sits behind a proxy that asks for one.") : undefined,
      )}
      {ep?.hasKey && !key ? (
        <label className="flex items-center gap-2 text-12 text-ink-muted max-sm:min-h-9">
          <input type="checkbox" checked={clearKey} onChange={(e) => setClearKey(e.currentTarget.checked)} />
          {tr("Remove the saved key")}
        </label>
      ) : null}
      <details className="group flex flex-col gap-2" open={!!ep}>
        <summary className="cursor-pointer select-none text-12 font-medium text-ink-muted">{tr("More settings")}</summary>
        <div className="mt-2 flex flex-col gap-3">
          {group(tr("Prompts"))}
          {local ? field(tr("Prompt prefix"), text("prefix", "e.g. masterpiece, best quality"), tr("Put in front of every prompt, such as quality tags.")) : null}
          {local ? field(tr("Always avoid"), text("negative", "e.g. lowres, bad hands, watermark"), tr("Added to every picture's negative prompt.")) : null}
          {field(
            tr("Prompt style"),
            <select className={inputClass} value={f.style} onChange={(e) => set("style", e.currentTarget.value as FormState["style"])}>
              <option value="">{tr("Default for this kind")}</option>
              <option value="tags">{tr("Danbooru tags")}</option>
              <option value="description">{tr("Plain description")}</option>
            </select>,
            tr("Tags suit SDXL, Illustrious and Pony checkpoints; descriptions suit Flux and similar."),
          )}
          {field(
            tr("Prompt guidance"),
            <textarea className={cn(inputClass, "min-h-16")} maxLength={1000} placeholder={tr("e.g. Always name the art style first.")} value={f.instructions} onChange={(e) => set("instructions", e.currentTarget.value)} />,
            tr("Extra guidance for whoever writes the prompt (Molfar, the Roleplay app)."),
          )}

          {group(tr("Size and sampling"))}
          <div className="flex gap-2">
            {field(tr("Width"), text("width", "1024", "numeric"))}
            {field(tr("Height"), text("height", "1024", "numeric"))}
          </div>
          {local ? <>
            <div className="flex gap-2">
              {field(tr("Steps"), text("steps", "25", "numeric"))}
              {field(tr("CFG"), text("cfg", "6", "decimal"))}
            </div>
            <div className="flex gap-2 max-sm:flex-col">
              {field(tr("Sampler"), pick("sampler", opts.data?.samplers, kind === "comfyui" ? "euler_ancestral" : "Euler a"))}
              {field(tr("Scheduler"), pick("scheduler", opts.data?.schedulers, kind === "comfyui" ? "normal" : tr("Server default")))}
            </div>
            {ep ? (opts.loading ? <p className="text-11 text-ink-faint">{tr("Asking the server for its samplers and LoRAs…")}</p>
              : opts.error ? <p className="break-words text-11 text-ink-faint">{tr("Could not read the server's lists ({error}). Type the names instead.", { error: opts.error })}</p> : null)
              : <p className="text-11 text-ink-faint">{tr("Once the server is saved, its own samplers and LoRAs can be picked here.")}</p>}
            <div className="flex gap-2">
              {field(tr("Seed"), text("seed", tr("-1 (random)"), "numeric"))}
              {kind === "comfyui" ? field(tr("Denoise"), text("denoise", "1", "decimal")) : null}
              {field(tr("Clip skip"), text("clipSkip", "", "numeric"))}
            </div>
            <p className="-mt-2 text-11 text-ink-faint">{tr("Clip skip 2 is common for anime, Illustrious and Pony checkpoints. A fixed seed draws the same picture every time.")}</p>

            {group(tr("LoRAs"))}
            <datalist id={listId}>{(opts.data?.loras ?? []).map((n) => <option key={n} value={n} />)}</datalist>
            {f.loras.map((l, i) => (
              <div key={l.id} className="flex items-end gap-2">
                <label className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-11 text-ink-faint">{tr("LoRA file")}</span>
                  <input className={inputClass} list={listId} placeholder="e.g. detail.safetensors" value={l.name} onChange={(e) => setLora(i, { name: e.currentTarget.value })} />
                </label>
                <label className="flex w-20 shrink-0 flex-col gap-1">
                  <span className="text-11 text-ink-faint">{tr("Strength")}</span>
                  <input className={inputClass} type="number" step="0.05" min={-5} max={5} placeholder="1" value={l.strength} onChange={(e) => setLora(i, { strength: e.currentTarget.value })} />
                </label>
                <IconButton icon={<IconSmall name="outline-xmark" />} variant="ghost-muted" size="small" title={tr("Remove LoRA")} aria-label={tr("Remove LoRA")} onClick={() => set("loras", f.loras.filter((_, j) => j !== i))} />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Button variant="neutral" size="small" disabled={f.loras.length >= MAX_LORAS} onClick={() => set("loras", [...f.loras, { id: ++loraId, name: "", strength: "1" }])}>{tr("Add LoRA")}</Button>
              <span className="text-11 text-ink-faint">{f.loras.length >= MAX_LORAS ? tr("Up to {n} LoRAs.", { n: MAX_LORAS }) : tr("Strength 1 is the usual; up to {n} LoRAs.", { n: MAX_LORAS })}</span>
            </div>
          </> : null}

          {kind === "comfyui" ? <>
            {group(tr("Workflow"))}
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void pickFile(e.currentTarget.files?.[0])} />
              <Button variant="neutral" size="small" onClick={() => fileInput.current?.click()}>{tr("Import workflow file…")}</Button>
              {f.workflow.trim() && !f.workflow.includes("%steps%") ? (
                <Button variant="neutral" size="small" onClick={() => void importWorkflow(f.workflow)}>{tr("Take the settings from this workflow")}</Button>
              ) : null}
            </div>
            {taken ? <div className="text-12 text-ink-muted" role="status">{taken}</div> : null}
            {field(
              tr("Your own workflow (optional)"),
              <textarea className={cn(inputClass, "min-h-24 font-mono text-12")} spellCheck={false} placeholder='{"3": {"class_type": "KSampler", …}}' value={f.workflow} onChange={(e) => { set("workflow", e.currentTarget.value); setTaken("") }} />,
              tr("Import a workflow exported with Workflow > Export (API): the fields above take its size, steps, CFG, sampler, scheduler, denoise, CLIP skip and LoRAs, and each picture gets its own prompt, seed and model. A pasted workflow gets %prompt%, %negative_prompt%, %seed%, %width%, %height% and %model% when saved; mark others yourself: %steps%, %cfg%, %sampler%, %scheduler%, %denoise%, %clip_skip%, %LORA_1% to %LORA_5% and %LORA_1_strength% and so on (empty slots get None). Empty: a simple text-to-image workflow."),
            )}
          </> : null}
        </div>
      </details>
      {err ? <div className="text-12 text-danger">{err}</div> : null}
      <Button variant="primary" size="small" className="self-start" disabled={busy || !f.name.trim() || !f.baseUrl.trim()} onClick={submit}>
        {busy ? tr("Saving…") : ep ? tr("Save changes") : tr("Save server")}
      </Button>
    </section>
  )
}
