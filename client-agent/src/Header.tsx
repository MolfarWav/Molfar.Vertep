import { ModelSelector, type ModelOption } from "@/components/assistant-ui/elements/model-selector.aui"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CaretDown, Folder, MagnifyingGlass, SidebarSimple } from "@phosphor-icons/react"
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react"
import { focusSidebarSearch } from "./Sidebar"
import { compactTokens, usd } from "@/lib/format"
import { CommandItem } from "@/components/ui/command"
import { currentProjectId, effectiveModel, effectiveReasoning, useAgent } from "./store"
import { Inspector } from "./Inspector"
import { MemoryPanel } from "./MemoryPanel"
import { cn, shortModelName } from "@/lib/utils"

type PickerOption = ModelOption & { group: string; shown: boolean }

/** The composer's model picker: the quick switch from Settings first (the starred models, under
 *  their own names), then the models shown in the pickers, grouped by connection. A search also
 *  finds the hidden ones, behind one row. Which models show and which are starred is set in
 *  Settings > Connections and models only. */
export function ModelPicker({ wide = false }: { wide?: boolean }): ReactNode {
  const models = useAgent((s) => s.models)
  const favorites = useAgent((s) => s.favorites)
  const model = useAgent(effectiveModel)
  const setModel = useAgent((s) => s.setModel)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [showHidden, setShowHidden] = useState(false)

  const options = useMemo<PickerOption[]>(
    () =>
      models
        .map((m) => ({
          id: `${m.provider}/${m.modelId}`,
          // Keep the full provider label searchable when the button is truncated.
          // a quick-switch name wins, in the list and on the button
          name: favorites.find((f) => f.ref === `${m.provider}/${m.modelId}`)?.name || shortModelName(m.label),
          keywords: [m.provider, m.connectionName ?? "", m.label],
          group: m.connectionName ?? m.provider,
          shown: m.shown,
        }))
        .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)),
    [models, favorites],
  )
  if (!options.length) return null
  const first = models.find((m) => m.shown)
  const firstShown = first ? `${first.provider}/${first.modelId}` : undefined

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const hit = (o: PickerOption) => words.every((w) => `${o.name} ${o.id} ${o.group}`.toLowerCase().includes(w))
  // the chosen model stays in the list even when it is hidden
  const visible = options.filter((o) => (o.shown || o.id === model) && hit(o))
  const hiddenHits = words.length ? options.filter((o) => !o.shown && o.id !== model && hit(o)) : []
  const quick = favorites
    .map((f) => {
      const o = options.find((x) => x.id === f.ref)
      return o ? { ...o, name: f.name || o.name } : null
    })
    .filter((o): o is PickerOption => !!o && hit(o))
  const quickIds = new Set(quick.map((o) => o.id))
  const listed = (showHidden ? [...visible, ...hiddenHits].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)) : visible).filter((o) => !quickIds.has(o.id))
  const groups: Array<[string, PickerOption[]]> = quick.length ? [["★ Quick switch", quick]] : []
  for (const o of listed) {
    const last = groups.at(-1)
    if (last && last[0] === o.group) last[1].push(o)
    else groups.push([o.group, [o]])
  }
  const multi = new Set(options.map((o) => o.group)).size > 1

  return (
    <ModelSelector.Root
      models={options}
      // nothing picked yet: the engine runs the first model the pickers offer,
      // in its own order, so name that one
      value={model ?? firstShown}
      onValueChange={setModel}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setQuery("")
          setShowHidden(false)
        }
      }}
    >
      <ModelSelector.Trigger
        variant="ghost"
        size="sm"
        className={cn("h-8 min-w-0 shrink gap-1 rounded-full px-2 [&>span]:truncate [&>span]:gap-1.5", wide ? "max-w-full" : "max-w-60")}
      />
      <ModelSelector.Content align="start" className="w-80">
        <ModelSelector.Search
          value={query}
          onValueChange={(v) => {
            setQuery(v)
            setShowHidden(false)
          }}
        />
        <ModelSelector.List className="max-h-[min(60vh,26rem)]">
          <ModelSelector.Empty>{hiddenHits.length ? "No shown models match." : "No models found."}</ModelSelector.Empty>
          {groups.map(([group, items]) => (
            <ModelSelector.Group key={group} heading={multi || quick.length ? group : undefined}>
              {items.map((o) => (
                <ModelSelector.Item key={`${group}:${o.id}`} model={o}>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className={cn("truncate font-medium", !o.shown && "text-muted-foreground")}>{o.name}</span>
                  </span>
                </ModelSelector.Item>
              ))}
            </ModelSelector.Group>
          ))}
          {hiddenHits.length && !showHidden ? (
            <ModelSelector.Group forceMount>
              <CommandItem forceMount value="__show-hidden" onSelect={() => setShowHidden(true)} className="text-muted-foreground rounded-lg ps-3 text-xs">
                Show {hiddenHits.length} more hidden {hiddenHits.length === 1 ? "model" : "models"}
              </CommandItem>
            </ModelSelector.Group>
          ) : null}
        </ModelSelector.List>
      </ModelSelector.Content>
    </ModelSelector.Root>
  )
}

const capitalize = (l: string): string => (l[0]?.toUpperCase() ?? "") + l.slice(1)

/** Reasoning level of the current chat's model, next to the model picker.
 *  Hidden while the model has no levels to choose from. */
function ReasoningSelect(): ReactNode {
  const models = useAgent((s) => s.models)
  const model = useAgent(effectiveModel)
  const reasoning = useAgent(effectiveReasoning)
  const setReasoning = useAgent((s) => s.setReasoning)
  // no model picked: the engine runs the first shown one
  const current = model ? models.find((m) => `${m.provider}/${m.modelId}` === model) : models.find((m) => m.shown)
  const levels = current?.reasoning ? current.reasoningLevels : []
  if (!levels.length) return null
  return (
    <Select
      items={levels.map((l) => ({ label: capitalize(l), value: l }))}
      value={levels.includes(reasoning) ? reasoning : null}
      onValueChange={(v) => {
        if (v) setReasoning(v)
      }}
    >
      <SelectTrigger className="h-8 shrink-0 gap-1 rounded-full border-0 bg-transparent px-1.5 text-xs" aria-label="Reasoning">
        <SelectValue placeholder="Reasoning" />
      </SelectTrigger>
      <SelectContent>
        {levels.map((l) => (
          <SelectItem key={l} value={l} className="text-xs">
            {capitalize(l)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const MODE_LABEL = { normal: "Full", accept: "Accept", plan: "Plan" } as const

function ModeSelect({ className }: { className?: string }): ReactNode {
  const mode = useAgent((s) => s.mode)
  const setMode = useAgent((s) => s.setMode)
  return (
    <Select
      items={[
        { label: "Full", value: "full" },
        { label: "Accept", value: "accept" },
        { label: "Plan", value: "plan" },
      ]}
      value={mode === "normal" ? "full" : mode}
      onValueChange={(v) => {
        const next = v === "full" ? "normal" : v
        if (next === "accept" || next === "plan" || next === "normal") setMode(next)
      }}
    >
      <SelectTrigger className={cn("h-8 shrink-0 gap-1 rounded-full border-0 bg-transparent px-1.5 text-xs", className)} aria-label="Mode">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="full" className="text-xs">
          Full
        </SelectItem>
        <SelectItem value="accept" className="text-xs">
          Accept
        </SelectItem>
        <SelectItem value="plan" className="text-xs">
          Plan
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

/** The window is at the desktop layout (md and up). One header renders at a time, so the
 *  inspector and memory panel are never mounted twice. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(min-width: 768px)")
      m.addEventListener("change", cb)
      return () => m.removeEventListener("change", cb)
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => true,
  )
}

/** The model the chat runs and its short name (the starred name wins); none picked: the first shown. */
function useCurrentModel(): { name: string | null; contextWindow: number | null } {
  const models = useAgent((s) => s.models)
  const favorites = useAgent((s) => s.favorites)
  const model = useAgent(effectiveModel)
  const m = model ? models.find((x) => `${x.provider}/${x.modelId}` === model) : models.find((x) => x.shown)
  if (!m) return { name: null, contextWindow: null }
  const ref = `${m.provider}/${m.modelId}`
  return { name: favorites.find((f) => f.ref === ref)?.name || shortModelName(m.label), contextWindow: m.contextWindow }
}

/** The combined chip of a phone composer: model · reasoning · mode, one sheet for all three. */
function PhoneComposerChip(): ReactNode {
  const { name } = useCurrentModel()
  const models = useAgent((s) => s.models)
  const model = useAgent(effectiveModel)
  const reasoning = useAgent(effectiveReasoning)
  const mode = useAgent((s) => s.mode)
  const current = model ? models.find((m) => `${m.provider}/${m.modelId}` === model) : models.find((m) => m.shown)
  const hasLevels = !!current?.reasoning && current.reasoningLevels.includes(reasoning)
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="sm" className="h-9 min-w-0 max-w-full shrink justify-start gap-1 rounded-full px-2.5 text-xs font-normal" aria-label="Model, reasoning and mode" />}
      >
        <span className="truncate font-medium">{name ?? "Model"}</span>
        {hasLevels ? <span className="text-muted-foreground shrink-0">· {capitalize(reasoning)}</span> : null}
        <span className="text-muted-foreground shrink-0">· {MODE_LABEL[mode]}</span>
        <CaretDown size={12} className="shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="grid w-[min(20rem,calc(100vw-2rem))] gap-2">
        <div className="text-muted-foreground text-xs">Model</div>
        <ModelPicker wide />
        {current?.reasoning && current.reasoningLevels.length ? (
          <>
            <div className="text-muted-foreground text-xs">Reasoning</div>
            <div className="flex"><ReasoningSelect /></div>
          </>
        ) : null}
        <div className="text-muted-foreground text-xs">Mode</div>
        <div className="flex"><ModeSelect /></div>
      </PopoverContent>
    </Popover>
  )
}

/** Desktop: reasoning and mode (the model lives in the header). Phone: the one combined chip. */
export function ComposerSettings(): ReactNode {
  const desktop = useIsDesktop()
  if (!desktop) return <PhoneComposerChip />
  return (
    <div className="flex min-w-0 items-center gap-1">
      <ReasoningSelect />
      <ModeSelect />
    </div>
  )
}

/** Context fill of the last run against the model's window, as in the composer's ring:
 *  `38k / 128k` and a thin bar; amber from 75 %, red from 90 %. Hidden while unknown. */
export function ContextMeter({ compact = false }: { compact?: boolean }): ReactNode {
  const usage = useAgent((s) => s.usage)
  const { contextWindow } = useCurrentModel()
  if (!usage || !contextWindow) return null
  const used = usage.input + usage.cacheRead
  const ratio = used / contextWindow
  const tone = ratio >= 0.9 ? "destructive" : ratio >= 0.75 ? "amber" : "normal"
  return (
    <span
      className={cn("flex shrink-0 items-center gap-2 text-xs tabular-nums", tone === "destructive" ? "text-destructive" : tone === "amber" ? "text-amber-500" : "text-muted-foreground")}
      title={`Context: ${used.toLocaleString()} of ${contextWindow.toLocaleString()} tokens (${Math.round(ratio * 100)} %)`}
      role="img"
      aria-label={`Context ${Math.round(ratio * 100)} percent full`}
    >
      <span className="bg-muted h-1 w-14 overflow-hidden rounded-full" aria-hidden>
        <span
          className={cn("block h-full rounded-full", tone === "destructive" ? "bg-destructive" : tone === "amber" ? "bg-amber-500" : "bg-linear-to-r from-link to-amber-400")}
          style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
        />
      </span>
      <span className={compact ? "" : "text-foreground"}>
        {compactTokens(used)} / {compactTokens(contextWindow)}
      </span>
    </span>
  )
}

/** Green dot while the live connection holds; a red dot and "Offline" when it does not. */
export function ConnectionDot(): ReactNode {
  const wsDown = useAgent((s) => s.wsDown)
  return wsDown ? (
    <span className="text-destructive flex shrink-0 items-center gap-1.5 text-xs font-medium" role="status">
      <span className="bg-destructive size-2 rounded-full" />
      Offline
    </span>
  ) : (
    <span role="status" aria-label="Connected" title="Connected" className="flex size-4 shrink-0 items-center justify-center">
      <span className="size-2 rounded-full bg-emerald-500" />
    </span>
  )
}

export function SidebarToggle(): ReactNode {
  const sidebarOpen = useAgent((s) => s.sidebarOpen)
  const sidebarPinned = useAgent((s) => s.sidebarPinned)
  const toggleSidebar = () => {
    const state = useAgent.getState()
    if (window.matchMedia("(min-width: 768px)").matches) state.setSidebarPinned(!sidebarPinned)
    else state.setSidebar(!sidebarOpen)
  }
  return (
    <Button id="agent-sidebar-toggle" variant="ghost" size="icon" className="size-9 shrink-0" aria-label="Toggle sidebar" onClick={toggleSidebar}>
      <SidebarSimple size={18} />
    </Button>
  )
}

function useHeaderProject() {
  const sessionId = useAgent((s) => s.sessionId)
  const title = useAgent((s) => s.sessions.find((item) => item.sessionId === sessionId)?.title)
  const project = useAgent((s) => {
    const id = currentProjectId(s)
    return id ? (s.projects.find((p) => p.id === id) ?? null) : null
  })
  return { title: title?.trim() || "New chat", project }
}

function DesktopHeader(): ReactNode {
  const { title, project } = useHeaderProject()
  const openProject = useAgent((s) => s.openProject)
  const paneOpen = useAgent((s) => s.pane.open)
  const setPane = useAgent((s) => s.setPane)
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-3 md:px-4">
      <SidebarToggle />
      {project ? (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex min-w-0 max-w-[30%] shrink items-center gap-1.5 truncate text-sm"
          onClick={() => openProject(project.id)}
          title={`Open the ${project.title} project`}
        >
          {project.icon ? <span aria-hidden>{project.icon}</span> : <Folder size={14} aria-hidden />}
          <span className="truncate">{project.title}</span>
          <span aria-hidden>/</span>
        </button>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
      <div className="flex min-w-0 shrink-[2] items-center gap-2" role="group" aria-label="Chat status">
        <div className="flex min-w-0 shrink items-center"><ModelPicker /></div>
        <ContextMeter />
        <ConnectionDot />
        <div className="flex shrink-0 items-center">
          <Inspector />
          <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label="Search chats" title="Search chats" onClick={focusSidebarSearch}>
            <MagnifyingGlass size={18} />
          </Button>
          <MemoryPanel />
          {project ? (
            <Button
              variant="ghost"
              size="icon"
              className={cn("size-9 shrink-0", paneOpen && "bg-muted")}
              aria-label={paneOpen ? "Hide the project pane" : "Show the project pane"}
              aria-pressed={paneOpen}
              title={paneOpen ? "Hide the project pane" : "Show the project pane"}
              onClick={() => setPane({ open: !paneOpen })}
            >
              <SidebarSimple size={18} className="-scale-x-100" weight={paneOpen ? "fill" : "regular"} />
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  )
}

/** Phone: a top bar, the Chat | Project switch under it, and a one-line strip with model, context and cost. */
function PhoneHeader(): ReactNode {
  const { title, project } = useHeaderProject()
  const phoneTab = useAgent((s) => s.phoneTab)
  const setPhoneTab = useAgent((s) => s.setPhoneTab)
  const spend = useAgent((s) => s.spend)
  const reasoning = useAgent(effectiveReasoning)
  const models = useAgent((s) => s.models)
  const model = useAgent(effectiveModel)
  const { name } = useCurrentModel()
  const current = model ? models.find((m) => `${m.provider}/${m.modelId}` === model) : models.find((m) => m.shown)
  const hasLevels = !!current?.reasoning && current.reasoningLevels.includes(reasoning)
  const priced = !!spend && spend.cost > 0
  return (
    <header className="shrink-0 border-b">
      <div className="flex h-14 items-center gap-1 px-2">
        <SidebarToggle />
        <div className="min-w-0 flex-1 px-1">
          {project ? <div className="text-muted-foreground truncate text-xs leading-4">{project.title}</div> : null}
          <div className="truncate text-sm leading-5 font-medium">{title}</div>
        </div>
        <Inspector />
        <MemoryPanel />
        <ConnectionDot />
      </div>
      {project ? (
        <div role="tablist" aria-label="Chat or project" className="bg-muted mx-4 mb-2 grid grid-cols-2 gap-1 rounded-lg p-1">
          {(["chat", "project"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={phoneTab === tab}
              className={cn(
                "h-9 rounded-md border-b-2 text-sm font-medium capitalize transition-colors",
                phoneTab === tab ? "bg-card text-foreground border-brand shadow-xs" : "text-muted-foreground border-transparent",
              )}
              onClick={() => setPhoneTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      ) : null}
      <div className="text-muted-foreground flex h-8 items-center gap-2 px-4 text-xs">
        <span className="flex min-w-0 shrink items-center gap-1">
          <span className="text-foreground truncate font-medium">{name ?? "No model"}</span>
          {hasLevels ? <span className="shrink-0">· {capitalize(reasoning)}</span> : null}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <ContextMeter compact />
          {spend ? <span className="shrink-0 tabular-nums">{compactTokens(spend.tokens)} tok{priced ? ` · ${spend.unpriced ? "≥" : ""}${usd(spend.cost)}` : ""}</span> : null}
        </span>
      </div>
    </header>
  )
}

export function Header(): ReactNode {
  return useIsDesktop() ? <DesktopHeader /> : <PhoneHeader />
}
