// The settings of one model (0.9.2): its context window, its prices, and its parameter blocks by
// caller (chat, plugins, one plugin, Molfar). The engine side is src/model-params.ts; the design is
// .fork/handoff/v092/CONNECTIONS-SPEC.md. A field switched off is not sent at all.
import { useEffect, useMemo, useState } from "react"
import { cn } from "./ui/cn"
import { IconSmall } from "./ui/icon"
import { Button, IconButton } from "./ui/button"
import { Select } from "./ui/select"
import { tr } from "./i18n/index"
import { inputClass } from "./settings"
import { listPlugins, modelParamsApi, modelsApi, type ModelDetails, type ModelParamsEntry, type ParamBlock } from "./api"

type Key = keyof ParamBlock
type Kind = "number" | "int" | "reasoning" | "tags" | "json"
interface FieldDef {
  key: Key
  label: string
  kind: Kind
  min?: number
  max?: number
  step?: number
  /** a sampler pi-ai passes only to OpenAI-style APIs */
  sampler?: boolean
  hint?: string
}

/** One field's raw input: switched on or off, its text (tags: open + close). */
interface FieldState {
  on: boolean
  text: string
  text2?: string
}
type Form = Partial<Record<Key, FieldState>>

const SHORT: Key[] = ["temperature", "max_tokens", "reasoning", "thinkingBudget", "params"]
const DEFAULTS: Record<Key, FieldState> = {
  temperature: { on: true, text: "1" },
  top_p: { on: true, text: "1" },
  top_k: { on: true, text: "40" },
  min_p: { on: true, text: "0.05" },
  repetition_penalty: { on: true, text: "1.05" },
  frequency_penalty: { on: true, text: "0" },
  presence_penalty: { on: true, text: "0" },
  seed: { on: true, text: "0" },
  max_tokens: { on: true, text: "2048" },
  reasoning: { on: true, text: "medium" },
  thinkingBudget: { on: true, text: "2048" },
  reasoningTags: { on: true, text: "<think>", text2: "</think>" },
  params: { on: true, text: "{}" },
  headers: { on: true, text: "{}" },
}

/** Named examples for the "Model:" lines. Names age fast: refresh them each release (last 2026-10). */
const EXAMPLES = {
  chat: "DeepSeek V4 Pro, GLM 5.3, Kimi K2.7",
  molfar: "DeepSeek V4 Pro, GLM 5.3, Kimi K2.7 Code",
  plugins: "DeepSeek V4.1 Flash, GLM 5.3 Flash, Gemini 3.5 Flash",
}

/** What we suggest per block, for people who do not know these knobs: values the "Fill in" button
 *  puts into the form (nothing is saved until Save), and the lines that explain them. */
function recommended(block: string, model: ModelDetails): { values: Partial<Record<Key, FieldState>>; lines: string[] } {
  const reasoningOk = model.reasoning || model.reasoningLevels.length > 0
  if (block === "chat") {
    return {
      values: { temperature: { on: true, text: "0.9" }, min_p: { on: true, text: "0.05" }, repetition_penalty: { on: true, text: "1.05" }, max_tokens: { on: true, text: "1500" } },
      lines: [
        tr("Temperature 0.8 to 1.0 gives lively prose; lower it when characters drift or ramble."),
        tr("Min P 0.05 with repetition penalty 1.05 keeps replies varied without nonsense."),
        tr("Max output 1000 to 2000 tokens is one long reply; thinking models need more, their reasoning counts too."),
        tr("Context window 32k to 128k: more remembers more, and every reply costs more."),
        `${tr("Model: a large model writes best; a thinking variant plans scenes better but answers slower.")} ${tr("For example: {names}.", { names: EXAMPLES.chat })}`,
      ],
    }
  }
  if (block === "molfar") {
    return {
      values: reasoningOk ? { reasoning: { on: true, text: "medium" } } : {},
      lines: [
        tr("Context window at least 64k: Molfar's instructions and tools take about 10k, the files it reads take the rest."),
        tr("Reasoning medium; leave temperature off (the provider's default), or 0.3 to 0.7 for steadier code."),
        `${tr("Model: one that is good at tool calls; small free models often stop after the first tool.")} ${tr("For example: {names}.", { names: EXAMPLES.molfar })}`,
      ],
    }
  }
  return {
    values: { temperature: { on: true, text: "0.3" }, max_tokens: { on: true, text: "2048" }, ...(reasoningOk ? { reasoning: { on: true, text: "off" } } : {}) },
    lines: [
      tr("Temperature 0.2 to 0.3: trackers and memory must answer precisely, not creatively."),
      tr("Reasoning off: faster and cheaper; these answers are short structured data."),
      tr("Max output about 2000 tokens; a context window of 16k is plenty."),
      `${tr("Model: a fast, cheap one (the Flash or mini kind) is enough; choose it in the plugin's own settings in the app.")} ${tr("For example: {names}.", { names: EXAMPLES.plugins })}`,
    ],
  }
}

function fields(): FieldDef[] {
  return [
    { key: "temperature", label: tr("Temperature"), kind: "number", min: 0, max: 2, step: 0.05 },
    { key: "top_p", label: tr("Top P"), kind: "number", min: 0, max: 1, step: 0.01, sampler: true },
    { key: "top_k", label: tr("Top K"), kind: "int", min: 0, max: 100000, sampler: true },
    { key: "min_p", label: tr("Min P"), kind: "number", min: 0, max: 1, step: 0.01, sampler: true },
    { key: "repetition_penalty", label: tr("Repetition penalty"), kind: "number", min: 0, max: 3, step: 0.01, sampler: true },
    { key: "frequency_penalty", label: tr("Frequency penalty"), kind: "number", min: -2, max: 2, step: 0.05, sampler: true },
    { key: "presence_penalty", label: tr("Presence penalty"), kind: "number", min: -2, max: 2, step: 0.05, sampler: true },
    { key: "seed", label: tr("Seed"), kind: "int", min: -2147483648, max: 2147483647, sampler: true },
    { key: "max_tokens", label: tr("Max output tokens"), kind: "int", min: 1, max: 1000000 },
    { key: "reasoning", label: tr("Reasoning"), kind: "reasoning" },
    { key: "thinkingBudget", label: tr("Thinking budget, tokens"), kind: "int", min: 0, max: 1000000 },
    { key: "reasoningTags", label: tr("Thinking tags"), kind: "tags", hint: tr("For models that write their thinking inside tags in the reply.") },
    { key: "params", label: tr("Custom parameters"), kind: "json", hint: tr("A JSON object, sent as it is (for example provider routing).") },
    { key: "headers", label: tr("Extra headers"), kind: "json", hint: tr("A JSON object of text values. No keys or passwords here: the connection carries those.") },
  ]
}

/** The stored block as raw inputs. */
function toForm(block: ParamBlock | undefined): Form {
  const form: Form = {}
  for (const [k, v] of Object.entries(block ?? {}) as [Key, unknown][]) {
    if (v === undefined) continue
    if (k === "reasoningTags") {
      const t = v as { open: string; close: string }
      form[k] = { on: true, text: t.open, text2: t.close }
    } else if (k === "params" || k === "headers") form[k] = { on: true, text: JSON.stringify(v, null, 2) }
    else form[k] = { on: true, text: String(v) }
  }
  return form
}

/** Raw inputs back to a block, or the first problem per field. */
function fromForm(form: Form, defs: FieldDef[]): { block: ParamBlock; errors: Partial<Record<Key, string>> } {
  const block: Record<string, unknown> = {}
  const errors: Partial<Record<Key, string>> = {}
  for (const def of defs) {
    const f = form[def.key]
    if (!f?.on) continue
    if (def.kind === "number" || def.kind === "int") {
      const n = Number(f.text)
      if (!f.text.trim() || !Number.isFinite(n) || (def.kind === "int" && !Number.isInteger(n)) || n < (def.min ?? -Infinity) || n > (def.max ?? Infinity)) {
        errors[def.key] = def.kind === "int" ? tr("A whole number from {min} to {max}", { min: def.min ?? "", max: def.max ?? "" }) : tr("A number from {min} to {max}", { min: def.min ?? "", max: def.max ?? "" })
      } else block[def.key] = n
    } else if (def.kind === "reasoning") block[def.key] = f.text
    else if (def.kind === "tags") {
      if (!f.text.trim() || !f.text2?.trim()) errors[def.key] = tr("Both tags are needed")
      else block[def.key] = { open: f.text.trim(), close: f.text2.trim() }
    } else {
      try {
        const v: unknown = JSON.parse(f.text || "{}")
        if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("not an object")
        if (Object.keys(v).length) block[def.key] = v
      } catch {
        errors[def.key] = tr("Not a JSON object")
      }
    }
  }
  return { block: block as ParamBlock, errors }
}

/** The block name of a plugin from GET /v1/plugins: "roleplay__relations" from "app:roleplay" -> plugin:roleplay/relations. */
function pluginBlock(p: { id: string; source: string }): string {
  if (!p.source.startsWith("app:")) return `plugin:user/${p.id}`.toLowerCase()
  const app = p.source.slice(4)
  const id = p.id.startsWith(`${app}__`) ? p.id.slice(app.length + 2) : p.id
  return `plugin:${app}/${id}`.toLowerCase()
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function ModelPanel(props: { model: ModelDetails; onClose: () => void; onChanged?: () => void }) {
  const { model } = props
  const ref = `${model.provider}/${model.modelId}`
  const defs = useMemo(fields, [])
  const [stored, setStored] = useState<ModelParamsEntry | null>(null)
  const [forms, setForms] = useState<Record<string, Form>>({})
  const [block, setBlock] = useState("chat")
  const [plugins, setPlugins] = useState<{ id: string; source: string; name: string; block: string }[]>([])
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [savedAt, setSavedAt] = useState(0)

  useEffect(() => {
    let live = true
    modelParamsApi
      .all()
      .then((r) => {
        if (!live) return
        const entry = r.models[ref] ?? {}
        setStored(entry)
        setForms(Object.fromEntries(Object.entries(entry).map(([name, b]) => [name, toForm(b)])))
      })
      .catch((e: unknown) => {
        if (!live) return
        setStored({})
        setErr(errText(e))
      })
    listPlugins()
      .then((r) => {
        if (live) setPlugins(r.plugins.map((p) => ({ id: p.id, source: p.source, name: p.manifest.name ?? p.id, block: pluginBlock(p) })))
      })
      .catch(() => {
        // without the list, plugin blocks show their own names
      })
    return () => {
      live = false
    }
  }, [ref])

  const initial = useMemo(() => Object.fromEntries(Object.entries(stored ?? {}).map(([name, b]) => [name, toForm(b)])), [stored])
  const dirty = stored !== null && JSON.stringify(forms) !== JSON.stringify(initial)
  const pluginNames = Object.keys(forms).filter((n) => n.startsWith("plugin:"))
  const labelOf = (name: string) => plugins.find((p) => p.block === name)?.name ?? name.slice(name.indexOf("/") + 1)
  const blockDefs = block === "chat" || block === "molfar" ? defs : defs.filter((d) => SHORT.includes(d.key))
  const form = forms[block] ?? {}
  const checked = fromForm(form, blockDefs)
  const anthropic = model.api === "anthropic-messages"
  const levels = model.reasoningLevels.length ? ["off", ...model.reasoningLevels.filter((l) => l !== "off")] : ["off", "minimal", "low", "medium", "high", "xhigh", "max"]

  const setField = (key: Key, next: FieldState | null) =>
    setForms((all) => {
      const f: Form = { ...(all[block] ?? {}) }
      if (next) f[key] = next
      else delete f[key]
      return { ...all, [block]: f }
    })

  const save = async () => {
    const entry: ModelParamsEntry = {}
    for (const [name, f] of Object.entries(forms)) {
      const r = fromForm(f, name === "chat" || name === "molfar" ? defs : defs.filter((d) => SHORT.includes(d.key)))
      if (Object.keys(r.errors).length) {
        setBlock(name)
        setErr(tr("Fix the marked fields first."))
        return
      }
      if (Object.keys(r.block).length) entry[name] = r.block
    }
    setBusy(true)
    setErr("")
    try {
      const res = await modelParamsApi.put(ref, Object.keys(entry).length ? entry : null)
      const now = res.models[ref] ?? {}
      setStored(now)
      setForms(Object.fromEntries(Object.entries(now).map(([name, b]) => [name, toForm(b)])))
      setSavedAt(Date.now())
      setTimeout(() => setSavedAt(0), 2000)
    } catch (e) {
      setErr(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const blockHint =
    block === "chat"
      ? tr("Chat replies in apps (Roleplay characters) and API callers.")
      : block === "plugins"
        ? tr("Every other plugin call: trackers, memory, translation. A short set.")
        : block === "molfar"
          ? tr("Molfar, the built-in agent. The agent page's own choices (its reasoning switch) still win.")
          : tr("Only this plugin. Fields left off here come from Plugins.")
  const pill = (name: string, label: string) => (
    <button
      key={name}
      type="button"
      aria-pressed={block === name}
      className={cn("rounded-full border px-2.5 py-1 text-12", block === name ? "border-line-focus bg-panel font-medium text-ink" : "border-line text-ink-muted hover:bg-hover")}
      onClick={() => setBlock(name)}
    >
      {label}
      {forms[name] && Object.values(forms[name]).some((f) => f?.on) ? <span className="ml-1 text-ink-faint">•</span> : null}
    </button>
  )

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line-focus p-3" data-testid="model-panel">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-13 font-medium text-ink">{model.label}</span>
          <span className="block truncate text-11 text-ink-faint">{ref}</span>
        </span>
        <IconButton icon={<IconSmall name="outline-xmark" />} variant="ghost-muted" size="small" title={tr("Close")} onClick={props.onClose} />
      </div>

      <ContextRow model={model} refName={ref} onChanged={props.onChanged} />
      <PriceRow model={model} refName={ref} onChanged={props.onChanged} />

      <div className="flex flex-col gap-1 border-t border-line pt-3">
        <h4 className="text-12 font-medium text-ink">{tr("Parameters")}</h4>
        <p className="text-11 text-ink-faint">{tr("What this model is sent, whichever preset or app calls it. A switched-off field is not sent: the provider's default applies.")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {pill("chat", tr("Chat"))}
        {pill("plugins", tr("Plugins"))}
        {pill("molfar", tr("Molfar"))}
        {pluginNames.map((n) => pill(n, labelOf(n)))}
        <button type="button" className="rounded-full border border-dashed border-line px-2.5 py-1 text-12 text-ink-muted hover:bg-hover" onClick={() => setPicking(!picking)}>
          + {tr("Block for a plugin")}
        </button>
      </div>
      {picking ? (
        <div className="flex flex-col gap-0.5 rounded-lg border border-line p-1">
          {plugins.filter((p) => !forms[p.block]).length === 0 ? <div className="px-2 py-1 text-12 text-ink-faint">{tr("Every plugin already has a block, or none is installed.")}</div> : null}
          {plugins
            .filter((p) => !forms[p.block])
            .map((p) => (
              <button
                key={p.block}
                type="button"
                className="rounded px-2 py-1 text-left text-12 text-ink hover:bg-hover"
                onClick={() => {
                  setForms((all) => ({ ...all, [p.block]: {} }))
                  setBlock(p.block)
                  setPicking(false)
                }}
              >
                {p.name} <span className="text-11 text-ink-faint">{p.block.slice(7)}</span>
              </button>
            ))}
        </div>
      ) : null}
      <p className="text-11 text-ink-faint">{blockHint}</p>
      {stored !== null ? (
        <Recommendations
          block={block}
          model={model}
          onFill={(values) => setForms((all) => ({ ...all, [block]: { ...(all[block] ?? {}), ...values } }))}
        />
      ) : null}

      {stored === null ? (
        <div className="text-13 text-ink-faint">{tr("Loading…")}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {blockDefs.map((def) => {
            if (def.key === "thinkingBudget" && (!form.reasoning?.on || form.reasoning.text === "off")) return null
            const notSent = anthropic && !!def.sampler
            return (
              <FieldRow
                key={def.key}
                def={def}
                state={form[def.key]}
                error={checked.errors[def.key]}
                notSent={notSent}
                levels={levels}
                onChange={(s) => setField(def.key, s)}
              />
            )
          })}
          {block.startsWith("plugin:") ? (
            <Button
              variant="ghost"
              size="small"
              className="self-start"
              onClick={() => {
                setForms((all) => {
                  const next = { ...all }
                  delete next[block]
                  return next
                })
                setBlock("plugins")
              }}
            >
              {tr("Remove this block")}
            </Button>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Button variant="neutral" size="normal" disabled={busy || !dirty} onClick={() => void save()}>
          {tr("Save")}
        </Button>
        <Button variant="ghost" size="normal" disabled={busy || !dirty} onClick={() => { setForms(initial); setErr("") }}>
          {tr("Revert")}
        </Button>
        {dirty ? <span className="text-11 text-ink-muted">● {tr("Unsaved changes")}</span> : null}
        {savedAt ? <span className="text-11 text-success">{tr("Saved")}</span> : null}
      </div>
      {err ? <div className="text-12 text-danger">{err}</div> : null}
    </section>
  )
}

function Recommendations(props: { block: string; model: ModelDetails; onFill: (values: Partial<Record<Key, FieldState>>) => void }) {
  const [open, setOpen] = useState(false)
  const rec = recommended(props.block, props.model)
  const smallForMolfar = props.block === "molfar" && !!props.model.contextWindow && props.model.contextWindow < 65536
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-line px-3 py-2" data-testid="model-recommended">
      {smallForMolfar ? <div className="text-12 text-danger">{tr("This model's context window ({n} tokens) is small for Molfar: long tasks will be cut short.", { n: props.model.contextWindow ?? 0 })}</div> : null}
      {/* title and button stack on phones: a long translated title wrapped under the button there */}
      <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
        <button type="button" className="flex w-full min-w-0 items-center gap-1.5 text-left text-12 text-ink-muted sm:w-auto sm:flex-1" aria-expanded={open} onClick={() => setOpen(!open)}>
          <IconSmall name={open ? "chevron-down" : "chevron-right"} size="small" />
          {tr("Recommended settings")}
        </button>
        {Object.keys(rec.values).length ? (
          <Button variant="ghost" size="small" onClick={() => props.onFill(rec.values)}>
            {tr("Fill in the recommended values")}
          </Button>
        ) : null}
      </div>
      {open ? (
        <ul className="flex list-disc flex-col gap-0.5 pl-5 text-11 text-ink-muted">
          {rec.lines.map((l) => <li key={l}>{l}</li>)}
          <li className="text-ink-faint">{tr("The values fill the form; nothing changes until you save.")}</li>
        </ul>
      ) : null}
    </div>
  )
}

function FieldRow(props: { def: FieldDef; state: FieldState | undefined; error?: string; notSent: boolean; levels: string[]; onChange: (s: FieldState | null) => void }) {
  const { def, state, notSent } = props
  const on = !!state?.on && !notSent
  const id = `mp-${def.key}`
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          type="checkbox"
          className="size-4 shrink-0 accent-[var(--c-contrast)]"
          checked={on}
          disabled={notSent}
          aria-label={tr("Send {name}", { name: def.label })}
          onChange={(e) => props.onChange(e.currentTarget.checked ? (state ? { ...state, on: true } : DEFAULTS[def.key]) : null)}
        />
        <label htmlFor={id} className="min-w-32 flex-1 text-12 text-ink-muted">
          {def.label}
          {notSent ? <span className="ml-1 text-11 text-ink-faint">· {tr("not sent by this provider")}</span> : null}
        </label>
        {on && (def.kind === "number" || def.kind === "int") ? (
          <input
            className={cn(inputClass, "max-w-36")}
            type="number"
            inputMode="decimal"
            min={def.min}
            max={def.max}
            step={def.step ?? 1}
            aria-label={def.label}
            value={state?.text ?? ""}
            onChange={(e) => props.onChange({ on: true, text: e.currentTarget.value })}
          />
        ) : null}
        {on && def.kind === "reasoning" ? (
          <Select options={props.levels} current={state?.text ?? "medium"} label={(x) => x} appearance="inline" onSelect={(v) => v && props.onChange({ on: true, text: v })} />
        ) : null}
      </div>
      {on && def.kind === "tags" ? (
        <div className="flex gap-2 pl-6">
          <input className={inputClass} aria-label={tr("Opening tag")} value={state?.text ?? ""} onChange={(e) => props.onChange({ on: true, text: e.currentTarget.value, text2: state?.text2 })} />
          <input className={inputClass} aria-label={tr("Closing tag")} value={state?.text2 ?? ""} onChange={(e) => props.onChange({ on: true, text: state?.text ?? "", text2: e.currentTarget.value })} />
        </div>
      ) : null}
      {on && def.kind === "json" ? (
        <textarea
          className={cn(inputClass, "ml-6 min-h-16 font-mono text-12")}
          aria-label={def.label}
          spellCheck={false}
          value={state?.text ?? ""}
          onChange={(e) => props.onChange({ on: true, text: e.currentTarget.value })}
        />
      ) : null}
      {on && def.hint ? <div className="pl-6 text-11 text-ink-faint">{def.hint}</div> : null}
      {on && props.error ? <div className="pl-6 text-11 text-danger">{props.error}</div> : null}
    </div>
  )
}

function ContextRow(props: { model: ModelDetails; refName: string; onChanged?: () => void }) {
  const [text, setText] = useState(props.model.contextWindow ? String(props.model.contextWindow) : "")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const save = async () => {
    const n = text.trim() ? Number(text) : null
    if (n !== null && (!Number.isInteger(n) || n <= 0)) {
      setErr(tr("A whole number of tokens, or empty for the catalog's number"))
      return
    }
    setBusy(true)
    setErr("")
    try {
      await modelsApi.setContext(props.refName, n)
      props.onChanged?.()
    } catch (e) {
      setErr(errText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="mp-context" className="min-w-32 flex-1 text-12 text-ink-muted">{tr("Context window")}</label>
        <input id="mp-context" className={cn(inputClass, "max-w-36")} type="number" inputMode="numeric" placeholder={tr("catalog")} value={text} onChange={(e) => setText(e.currentTarget.value)} />
        <Button variant="ghost" size="small" disabled={busy} onClick={() => void save()}>{tr("Save")}</Button>
      </div>
      <div className="text-11 text-ink-faint">{tr("Tokens the model can read. Leave empty for the catalog's number.")}</div>
      {err ? <div className="text-11 text-danger">{err}</div> : null}
    </div>
  )
}

function PriceRow(props: { model: ModelDetails; refName: string; onChanged?: () => void }) {
  const p = props.model.pricing
  const [vals, setVals] = useState({ input: p ? String(p.input) : "", output: p ? String(p.output) : "", cacheRead: p?.cacheRead ? String(p.cacheRead) : "", cacheWrite: p?.cacheWrite ? String(p.cacheWrite) : "" })
  const [more, setMore] = useState(!!(p?.cacheRead || p?.cacheWrite))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const put = async (pricing: { input: number; output: number; cacheRead: number; cacheWrite: number } | null) => {
    setBusy(true)
    setErr("")
    try {
      await modelsApi.setPricing(props.refName, pricing)
      if (!pricing) setVals({ input: "", output: "", cacheRead: "", cacheWrite: "" })
      props.onChanged?.()
    } catch (e) {
      setErr(errText(e))
    } finally {
      setBusy(false)
    }
  }
  const save = () => {
    const n = Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, v.trim() ? Number(v) : 0])) as { input: number; output: number; cacheRead: number; cacheWrite: number }
    if (Object.values(n).some((v) => !Number.isFinite(v) || v < 0)) return setErr(tr("Prices are numbers, zero or more."))
    if (!Object.values(n).some((v) => v > 0)) return setErr(tr("Enter at least one price above zero, or use the catalog prices."))
    void put(n)
  }
  const box = (key: keyof typeof vals, label: string) => (
    <label className="flex min-w-24 flex-1 flex-col gap-0.5 text-11 text-ink-faint">
      {label}
      <input className={inputClass} type="number" inputMode="decimal" min={0} value={vals[key]} onChange={(e) => setVals({ ...vals, [key]: e.currentTarget.value })} />
    </label>
  )
  return (
    <div className="flex flex-col gap-1">
      <div className="text-12 text-ink-muted">{tr("Prices, USD per million tokens")}</div>
      <div className="flex flex-wrap items-end gap-2">
        {box("input", tr("Input"))}
        {box("output", tr("Output"))}
        {more ? box("cacheRead", tr("Cache read")) : null}
        {more ? box("cacheWrite", tr("Cache write")) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="small" disabled={busy} onClick={save}>{tr("Save")}</Button>
        <Button variant="ghost" size="small" disabled={busy} onClick={() => void put(null)}>{tr("Use the catalog prices")}</Button>
        {!more ? <Button variant="ghost" size="small" onClick={() => setMore(true)}>{tr("Cache prices")}</Button> : null}
      </div>
      {err ? <div className="text-11 text-danger">{err}</div> : null}
    </div>
  )
}
