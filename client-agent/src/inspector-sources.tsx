// Sources panel and marked text for the prompt inspector: where each part of
// the request came from, colored marks in the texts, and what did not make it.
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { CaretDown, CaretRight } from "@phosphor-icons/react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { InspectorEntry } from "./api"

type Sources = NonNullable<InspectorEntry["sources"]>
type SourcePart = Sources["parts"][number]
type SourceSpan = Sources["spans"][number]

/** One colour per source kind: a 500 fill for dots, a text shade for labels on
 *  both themes, and the mark tints (class names spelled out for Tailwind). */
const KIND: Record<string, { label: string; fill: string; text: string; mark: string; markActive: string }> = {
  card: { label: "Card", fill: "bg-pink-500", text: "text-pink-700 dark:text-pink-300", mark: "bg-pink-500/15", markActive: "bg-pink-500/35" },
  persona: { label: "Persona", fill: "bg-fuchsia-500", text: "text-fuchsia-700 dark:text-fuchsia-300", mark: "bg-fuchsia-500/15", markActive: "bg-fuchsia-500/35" },
  preset: { label: "Preset", fill: "bg-purple-500", text: "text-purple-700 dark:text-purple-300", mark: "bg-purple-500/15", markActive: "bg-purple-500/35" },
  lorebook: { label: "Lorebook", fill: "bg-indigo-500", text: "text-indigo-700 dark:text-indigo-300", mark: "bg-indigo-500/15", markActive: "bg-indigo-500/35" },
  example: { label: "Examples", fill: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", mark: "bg-blue-500/15", markActive: "bg-blue-500/35" },
  databank: { label: "Data Bank", fill: "bg-cyan-500", text: "text-cyan-700 dark:text-cyan-300", mark: "bg-cyan-500/15", markActive: "bg-cyan-500/35" },
  note: { label: "Author's note", fill: "bg-teal-500", text: "text-teal-700 dark:text-teal-300", mark: "bg-teal-500/15", markActive: "bg-teal-500/35" },
  history: { label: "History", fill: "bg-emerald-600", text: "text-emerald-700 dark:text-emerald-300", mark: "bg-emerald-600/15", markActive: "bg-emerald-600/35" },
  group: { label: "Group", fill: "bg-green-500", text: "text-green-700 dark:text-green-300", mark: "bg-green-500/15", markActive: "bg-green-500/35" },
  memory: { label: "Memory", fill: "bg-lime-600", text: "text-lime-700 dark:text-lime-300", mark: "bg-lime-600/15", markActive: "bg-lime-600/35" },
  dashboard: { label: "Dashboard", fill: "bg-yellow-500", text: "text-yellow-700 dark:text-yellow-300", mark: "bg-yellow-500/20", markActive: "bg-yellow-500/40" },
  utility: { label: "Utility prompt", fill: "bg-orange-400", text: "text-orange-700 dark:text-orange-300", mark: "bg-orange-400/15", markActive: "bg-orange-400/35" },
  prefill: { label: "Prefill", fill: "bg-orange-600", text: "text-orange-700 dark:text-orange-300", mark: "bg-orange-600/15", markActive: "bg-orange-600/35" },
  plugin: { label: "Plugin", fill: "bg-red-500", text: "text-red-700 dark:text-red-300", mark: "bg-red-500/15", markActive: "bg-red-500/35" },
  rules: { label: "Rules", fill: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", mark: "bg-rose-500/15", markActive: "bg-rose-500/35" },
  workspace: { label: "Workspace", fill: "bg-stone-500", text: "text-stone-700 dark:text-stone-300", mark: "bg-stone-500/15", markActive: "bg-stone-500/35" },
  apps: { label: "Apps", fill: "bg-neutral-500", text: "text-neutral-700 dark:text-neutral-300", mark: "bg-neutral-500/15", markActive: "bg-neutral-500/35" },
  docs: { label: "Docs", fill: "bg-zinc-500", text: "text-zinc-700 dark:text-zinc-300", mark: "bg-zinc-500/15", markActive: "bg-zinc-500/35" },
  skills: { label: "Skills", fill: "bg-slate-500", text: "text-slate-700 dark:text-slate-300", mark: "bg-slate-500/15", markActive: "bg-slate-500/35" },
  tools: { label: "Tools", fill: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", mark: "bg-amber-500/15", markActive: "bg-amber-500/35" },
  user: { label: "User", fill: "bg-sky-500", text: "text-sky-700 dark:text-sky-300", mark: "bg-sky-500/15", markActive: "bg-sky-500/35" },
  assistant: { label: "Molfar", fill: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", mark: "bg-emerald-500/15", markActive: "bg-emerald-500/35" },
  toolResult: { label: "Tool result", fill: "bg-violet-500", text: "text-violet-700 dark:text-violet-300", mark: "bg-violet-500/15", markActive: "bg-violet-500/35" },
  other: { label: "Other", fill: "bg-gray-500", text: "text-gray-700 dark:text-gray-300", mark: "bg-gray-500/15", markActive: "bg-gray-500/35" },
}
const OTHER = KIND.other as (typeof KIND)[string]
const kindOf = (kind: string) => KIND[kind] ?? OTHER
/** Keys for lists that may repeat an item (two books with an entry of one name). */
const keyed = <T,>(items: readonly T[], name: (item: T) => string): Array<{ item: T; key: string }> => items.map((item, i) => ({ item, key: `${name(item)}#${i}` }))

const tok = (n: number): string => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))).replace(/\.0(?=[kM]$)/, "")
const pct = (share: number): string => (share > 0 && share < 0.01 ? "<1" : String(Math.round(share * 100)))

/** A row of the table; `index` is the part's place in sources.parts (null: not clickable). */
type Row = { part: Pick<SourcePart, "kind" | "label" | "detail" | "tokens" | "located">; index: number | null }

function SourceRow({ row, active, onPick, total }: { row: Row; active: boolean; onPick: (i: number | null) => void; total: number }): ReactNode {
  const { part, index } = row
  const clickable = index != null && part.located
  return (
    <button
      type="button"
      disabled={!clickable}
      aria-pressed={clickable ? active : undefined}
      onClick={() => clickable && onPick(active ? null : index)}
      className={cn(
        "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 rounded-md px-2 py-1 text-left text-xs",
        clickable && "hover:bg-muted/60",
        active && "bg-primary/10 ring-1 ring-primary/30",
        !clickable && "cursor-default",
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-sm", kindOf(part.kind).fill)} aria-hidden />
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="min-w-0 break-words font-medium">{part.label}</span>
        {part.detail ? (
          <span className="text-muted-foreground min-w-0 truncate" title={part.detail}>
            {part.detail}
          </span>
        ) : null}
        {!part.located ? (
          <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">
            not found in the request
          </Badge>
        ) : null}
      </span>
      <span className="text-muted-foreground text-right whitespace-nowrap">
        {tok(part.tokens)} · {pct(part.tokens / total)}%
      </span>
    </button>
  )
}

/** The sources table: parts grouped by kind (largest group first, request order inside), the tool
 *  definitions, the unlabeled rest, then what was left out and the preset's choices. */
export function SourcesPanel({ entry, active, onPick }: { entry: InspectorEntry; active: number | null; onPick: (part: number | null) => void }): ReactNode {
  const sources = entry.sources
  const total = Math.max(entry.estimate, 1)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [leftOutOpen, setLeftOutOpen] = useState(false)

  const groups = useMemo(() => {
    const byKind = new Map<string, Row[]>()
    sources?.parts.forEach((part, index) => {
      const list = byKind.get(part.kind) ?? []
      list.push({ part, index })
      byKind.set(part.kind, list)
    })
    const out = [...byKind].map(([kind, rows]) => ({ kind, rows, tokens: rows.reduce((n, r) => n + r.part.tokens, 0) }))
    const sizes = entry.tools.sizes
    if (sizes && sizes.length === entry.tools.names.length) {
      const rows: Row[] = entry.tools.names
        .map((label, i) => ({ part: { kind: "tools", label, tokens: sizes[i] ?? 0, located: true }, index: null }))
        .sort((a, b) => b.part.tokens - a.part.tokens)
      if (rows.length) out.push({ kind: "tools", rows, tokens: rows.reduce((n, r) => n + r.part.tokens, 0) })
    }
    return out.sort((a, b) => b.tokens - a.tokens)
  }, [sources, entry.tools])

  if (!sources) return null
  const toggle = (kind: string): void =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })

  return (
    <div className="grid min-w-0 gap-1.5">
      <span className="text-muted-foreground text-xs font-semibold">Sources</span>
      <div className="grid min-w-0 gap-0.5 rounded-lg border p-1.5">
        {groups.map((group) => {
          const k = kindOf(group.kind)
          const open = expanded.has(group.kind)
          const many = group.rows.length > 8
          return (
            <div key={group.kind} className="grid min-w-0 gap-0.5">
              <div className="flex min-w-0 items-center gap-2 px-2 pt-1 text-xs font-semibold">
                <span className={cn("size-2 shrink-0 rounded-sm", k.fill)} aria-hidden />
                <span className={cn("min-w-0 flex-1 truncate", k.text)}>{k.label}</span>
                <span className="text-muted-foreground text-right font-normal whitespace-nowrap">
                  {tok(group.tokens)} · {pct(group.tokens / total)}%
                </span>
              </div>
              {(open ? group.rows : group.rows.slice(0, 8)).map((row) => (
                <SourceRow key={row.index ?? `tool-${row.part.label}`} row={row} total={total} active={row.index != null && row.index === active} onPick={onPick} />
              ))}
              {many ? (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 px-2 py-0.5 text-xs underline-offset-2 hover:underline"
                  aria-expanded={open}
                  onClick={() => toggle(group.kind)}
                >
                  <CaretDown className={cn("size-3 transition-transform", !open && "-rotate-90")} />
                  {open ? "Show fewer" : `Show all ${group.rows.length}`}
                </button>
              ) : null}
            </div>
          )
        })}
        {sources.unlabeled > 0 ? (
          <div className="text-muted-foreground flex min-w-0 items-center justify-between gap-2 rounded-md px-2 py-1 text-xs">
            <span className="min-w-0 flex-1">Unlabeled (separators, wrappers)</span>
            <span className="text-right whitespace-nowrap">
              {tok(sources.unlabeled)} · {pct(sources.unlabeled / total)}%
            </span>
          </div>
        ) : null}
      </div>

      {sources.omitted.length ? (
        <Collapsible open={leftOutOpen} onOpenChange={setLeftOutOpen} className="grid min-w-0 gap-1">
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-xs underline-offset-2 hover:underline">
            <CaretRight className={cn("size-3 transition-transform", leftOutOpen && "rotate-90")} />
            Left out ({sources.omitted.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="grid min-w-0 gap-0.5 rounded-lg border p-1.5">
            {keyed(sources.omitted, (o) => `${o.kind}-${o.label}`).map(({ item: o, key }) => (
              <div key={key} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 rounded-md px-2 py-1 text-xs">
                <span className={cn("mt-1 size-2 shrink-0 rounded-sm", kindOf(o.kind).fill)} aria-hidden />
                <span className="grid min-w-0 gap-0.5">
                  <span className="break-words font-medium">{o.label}</span>
                  <span className="text-muted-foreground break-words">
                    {o.reason}
                    {o.detail ? ` · ${o.detail}` : ""}
                  </span>
                </span>
                {o.tokens != null ? <span className="text-muted-foreground text-right whitespace-nowrap">{tok(o.tokens)}</span> : <span />}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {sources.vars.length ? (
        <div className="grid min-w-0 gap-1">
          <span className="text-muted-foreground text-xs">Preset choices ({sources.vars.length})</span>
          <div className="flex min-w-0 flex-wrap gap-1">
            {keyed(sources.vars, (v) => v.name).map(({ item: v, key }) => (
              <span key={key} className="bg-muted text-muted-foreground max-w-full truncate rounded-md px-1.5 py-0.5 font-mono text-[11px]" title={`${v.label || v.name}: ${v.value}`}>
                {v.label || v.name}: {v.value}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** A block's text with source marks; it collapses when long, opens itself when it holds the
 *  active part and scrolls that mark into view. Marks past the shown (clipped) text are cut. */
export function MarkedText({ text, truncated, spans, parts, active }: {
  text: string
  truncated?: boolean
  spans?: SourceSpan[]
  parts?: SourcePart[]
  active: number | null
}): ReactNode {
  const long = text.length > 600
  const [open, setOpen] = useState(!long)
  const ref = useRef<HTMLDivElement>(null)
  const holdsActive = active != null && !!spans?.some((s) => s.part === active)

  useEffect(() => {
    if (holdsActive) setOpen(true)
  }, [holdsActive])

  useEffect(() => {
    if (!holdsActive || !open) return
    ref.current?.querySelector<HTMLElement>(`[data-part="${active}"]`)?.scrollIntoView({ block: "center" })
  }, [holdsActive, open, active])

  const marked = useMemo(() => {
    if (!spans?.length || !parts?.length) return null
    const out: ReactNode[] = []
    let cursor = 0
    for (const span of [...spans].sort((a, b) => a.start - b.start)) {
      const start = Math.max(span.start, cursor)
      const end = Math.min(span.end, text.length)
      if (end <= start) continue
      if (start > cursor) out.push(text.slice(cursor, start))
      const part = parts[span.part]
      const k = kindOf(part?.kind ?? "other")
      const on = span.part === active
      out.push(
        <mark
          key={`${span.start}-${span.part}`}
          data-part={span.part}
          title={part ? `${part.label}${part.detail ? ` — ${part.detail}` : ""}` : undefined}
          className={cn("rounded-[2px] text-inherit", on ? cn(k.markActive, "ring-2 ring-primary/40") : k.mark)}
        >
          {text.slice(start, end)}
        </mark>,
      )
      cursor = end
    }
    if (cursor < text.length) out.push(text.slice(cursor))
    return out
  }, [spans, parts, text, active])

  return (
    <div className="grid gap-1" ref={ref}>
      <div className="bg-muted/40 min-w-0 rounded-lg p-2.5">
        <pre className={cn("font-mono text-xs leading-relaxed break-words whitespace-pre-wrap", !open && "line-clamp-6")}>{marked ?? (text || "(empty)")}</pre>
      </div>
      {long ? (
        <button type="button" className="text-muted-foreground hover:text-foreground w-fit text-xs underline-offset-2 hover:underline" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Collapse" : `Expand (${text.length.toLocaleString("en-US")} characters)`}
        </button>
      ) : null}
      {truncated ? <p className="text-muted-foreground text-xs">clipped for display; the token count is for the whole message</p> : null}
    </div>
  )
}
