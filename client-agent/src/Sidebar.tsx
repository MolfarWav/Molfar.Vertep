// The sidebar: new chat, search, projects with their chats, then the chats
// that belong to no project. Every chat row is the thread list's own item, so
// rename, archive, delete and the running spinner work the same everywhere.
import { CHAT_DRAG_TYPE, ThreadListItem, ThreadListArchived, ThreadListItemGroups, ThreadListSearch } from "@/components/assistant-ui/elements/thread-list.aui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ThreadListPrimitive, useAuiState } from "@assistant-ui/react"
import { AppWindow, CaretRight, Folder, MagnifyingGlass, Plus, Question } from "@phosphor-icons/react"
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { projectsApi, type ProjectSummary } from "./api"
import { MolfarAvatar } from "./MolfarAvatar"
import { currentProjectId, useAgent } from "./store"
import { openHelp } from "./guide/events"

const OPEN_KEY = "agent-ui-projects-open"

function readOpen(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "[]")
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

function writeOpen(ids: string[]): void {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(ids))
  } catch {
    // the expanded state is session-only
  }
}

export function ProjectIcon({ project, className }: { project: Pick<ProjectSummary, "icon" | "kind">; className?: string }): ReactNode {
  if (project.icon) return <span aria-hidden className={cn("shrink-0 leading-none", className)}>{project.icon}</span>
  const Icon = project.kind === "app" ? AppWindow : Folder
  return <Icon aria-hidden className={cn("text-muted-foreground size-4 shrink-0", className)} />
}

export function TagBadge({ tag }: { tag: string }): ReactNode {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-px text-[10px] leading-4 font-medium",
        "border text-[10px] tracking-wide uppercase",
        tag === "app" ? "border-brand-line text-brand bg-brand-soft" : "text-muted-foreground border-border",
      )}
    >
      {tag}
    </span>
  )
}

/** The sidebar's search box, for any search button (rail, header): shows the full sidebar
 *  (desktop: unfolds it, phone: opens the drawer) and puts the cursor in the box. */
export function focusSidebarSearch(): void {
  const state = useAgent.getState()
  if (window.matchMedia("(min-width: 768px)").matches) state.setSidebarPinned(true)
  else state.setSidebar(true)
  // the box exists only once the sidebar has rendered unfolded
  setTimeout(() => {
    const boxes = [...document.querySelectorAll<HTMLInputElement>("input[data-sidebar-search]")]
    boxes.find((b) => b.offsetParent !== null)?.focus()
  }, 80)
}

function RailButton({ label, onClick, active, primary, guide, children }: { label: string; onClick: () => void; active?: boolean; primary?: boolean; guide?: string; children: ReactNode }): ReactNode {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon" aria-label={label} data-guide={guide} aria-current={active ? "page" : undefined} className={cn("size-9 rounded-lg", active && "bg-brand-soft text-brand ring-brand-line ring-1", primary && "bg-brand text-brand-foreground hover:bg-brand/90 hover:text-brand-foreground size-9 rounded-full")} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

/** The folded sidebar: an icon rail with the face, New chat, Search and one icon per project. */
export function SidebarRail(): ReactNode {
  const projects = useAgent((s) => s.projects)
  const activeProject = useAgent((s) => currentProjectId(s))
  const view = useAgent((s) => s.view)
  const newChat = useAgent((s) => s.newChat)
  const openProject = useAgent((s) => s.openProject)
  return (
    <TooltipProvider>
      <div className="flex h-12 shrink-0 items-center justify-center">
        <MolfarAvatar size={28} />
      </div>
      <nav aria-label="Projects" className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto py-2">
        <RailButton label="New chat" primary onClick={() => newChat()}>
          <Plus size={18} />
        </RailButton>
        <RailButton label="Search chats" guide="agent.search" onClick={focusSidebarSearch}>
          <MagnifyingGlass size={18} />
        </RailButton>
        <div className="bg-border my-1 h-px w-6 shrink-0" />
        {projects.map((p) => (
          <RailButton key={p.id} label={p.title} active={view.kind === "project" ? view.id === p.id : activeProject === p.id} onClick={() => openProject(p.id)}>
            <ProjectIcon project={p} className="size-[18px] text-[16px]" />
          </RailButton>
        ))}
      </nav>
      <div className="flex shrink-0 justify-center pb-2">
        <RailButton label="Help" guide="agent.help" onClick={openHelp}>
          <Question size={18} />
        </RailButton>
      </div>
    </TooltipProvider>
  )
}

function NewProject(): ReactNode {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const done = async (id: string) => {
    await useAgent.getState().refreshProjects()
    useAgent.getState().openProject(id)
    setOpen(false)
    setTitle("")
  }
  const run = async (fn: () => Promise<{ id: string }>) => {
    setBusy(true)
    setError(null)
    try {
      await done((await fn()).id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <PopoverTrigger render={<Button variant="ghost" size="icon-xs" aria-label="New project" title="New project" data-guide="agent.new-project" />}>
        <Plus />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const t = title.trim()
            if (t) void run(() => projectsApi.create({ title: t }))
          }}
        >
          <label className="text-muted-foreground text-xs" htmlFor="new-project-title">
            New project
          </label>
          <Input id="new-project-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" autoFocus disabled={busy} />
          <Button type="submit" size="sm" disabled={busy || !title.trim()}>
            Create
          </Button>
        </form>
        <div className="bg-border h-px" />
        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ""
            if (f) void run(() => projectsApi.importZip(f))
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          Import zip
        </Button>
        {error ? <p className="text-destructive text-xs" role="alert">{error}</p> : null}
      </PopoverContent>
    </Popover>
  )
}

/** Drop target for a dragged chat row: moves the chat into `project` (null: out
 *  of any project). `over` lights the target while a chat hovers it. */
function useChatDrop(project: string | null) {
  const [over, setOver] = useState(false)
  const props = {
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(CHAT_DRAG_TYPE)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      setOver(true)
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
    },
    onDrop: (e: DragEvent) => {
      setOver(false)
      const id = e.dataTransfer.getData(CHAT_DRAG_TYPE)
      if (!id) return
      e.preventDefault()
      const { sessions, move } = useAgent.getState()
      const from = sessions.find((x) => x.sessionId === id)?.project ?? null
      if (from !== project) void move(id, project)
    },
  }
  return { over, props }
}

function ProjectRow({ project, query, expanded, onToggle, indices, ids }: {
  project: ProjectSummary
  query: string
  expanded: boolean
  onToggle: () => void
  indices: number[]
  ids: readonly string[]
}): ReactNode {
  const active = useAgent((s) => s.view.kind === "project" && s.view.id === project.id)
  const openProject = useAgent((s) => s.openProject)
  const open = query ? indices.length > 0 : expanded
  const drop = useChatDrop(project.id)
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-md", drop.over && "bg-muted/60 ring-ring/50 ring-1")} {...drop.props}>
      <div className={cn("hover:bg-muted group relative flex h-8 items-center gap-0.5 rounded-md pe-2 transition-colors", active && "bg-brand-soft hover:bg-brand-soft")}>
        {active ? <span aria-hidden className="bg-brand absolute inset-y-1 start-0 w-[3px] rounded-full" /> : null}
        <button
          type="button"
          aria-label={`${open ? "Collapse" : "Expand"} ${project.title}`}
          aria-expanded={open}
          className="text-muted-foreground hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md"
          onClick={onToggle}
        >
          <CaretRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          className="focus-visible:ring-ring/50 flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md text-start text-sm outline-none focus-visible:ring-1"
          onClick={() => openProject(project.id)}
        >
          <ProjectIcon project={project} />
          <span className="min-w-0 flex-1 truncate">{project.title}</span>
        </button>
        <TagBadge tag={project.tag} />
      </div>
      {open ? (
        <div className="border-border/60 ms-3.5 flex flex-col gap-0.5 border-s ps-1">
          {indices.map((index) => (
            <ThreadListPrimitive.ItemByIndex key={ids[index]} index={index} components={{ ThreadListItem }} />
          ))}
          {!indices.length && !query ? <div className="text-muted-foreground px-2.5 py-1 text-xs">No chats yet</div> : null}
        </div>
      ) : null}
    </div>
  )
}

export function Sidebar(): ReactNode {
  const [search, setSearch] = useState("")
  const projects = useAgent((s) => s.projects)
  const sessions = useAgent((s) => s.sessions)
  const newChat = useAgent((s) => s.newChat)
  const activeProject = useAgent((s) => currentProjectId(s))
  const threadIds = useAuiState((s) => s.threads.threadIds)
  const threadItems = useAuiState((s) => s.threads.threadItems)
  const [expanded, setExpanded] = useState<string[]>(readOpen)

  const toggle = (id: string) =>
    setExpanded((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
      writeOpen(next)
      return next
    })

  // reaching a chat of a project (from search, a link, a reload) shows it in its project
  useEffect(() => {
    if (!activeProject) return
    setExpanded((cur) => {
      if (cur.includes(activeProject)) return cur
      const next = [...cur, activeProject]
      writeOpen(next)
      return next
    })
  }, [activeProject])

  const query = search.trim().toLowerCase()
  const known = useMemo(() => new Set(projects.map((p) => p.id)), [projects])
  const projectOf = useMemo(() => new Map(sessions.map((s) => [s.sessionId, s.project ?? null])), [sessions])
  const titles = useMemo(() => new Map(threadItems.map((item) => [item.id, (item.title || "New Chat").toLowerCase()])), [threadItems])
  const matches = useCallback((id: string) => !query || (titles.get(id) ?? "new chat").includes(query), [query, titles])
  // chats of a project that no longer exists still belong somewhere
  const plain = useCallback(
    (id: string) => {
      const p = projectOf.get(id)
      return !p || !known.has(p)
    },
    [projectOf, known],
  )

  const byProject = useMemo(() => {
    const out = new Map<string, number[]>()
    threadIds.forEach((id, index) => {
      const p = projectOf.get(id)
      if (!p || !matches(id)) return
      out.set(p, [...(out.get(p) ?? []), index])
    })
    return out
  }, [threadIds, projectOf, matches])

  const plainDrop = useChatDrop(null)
  const anyHit = threadIds.some((id) => matches(id))
  const plainHit = threadIds.some((id) => plain(id) && matches(id))

  return (
    <ThreadListPrimitive.Root
      data-slot="aui_thread-list-root"
      className="flex flex-col gap-0.5"
      // Clicking the chat that is already open never reaches the store (the
      // runtime sees no switch), so from the project page a click on any chat
      // row brings the chat view back itself.
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-slot="aui_thread-list-item-trigger"]')) useAgent.getState().showChat()
      }}
    >
      <Button className="bg-brand text-brand-foreground hover:bg-brand/90 mb-1 h-9 w-full justify-start gap-2 rounded-lg px-3 text-sm font-medium" onClick={() => newChat()}>
        <Plus className="size-4 shrink-0" weight="bold" />
        <span className="flex-1 text-start">New chat</span>
      </Button>
      <ThreadListSearch value={search} onValueChange={setSearch} placeholder="Search chats" aria-label="Search chats" data-sidebar-search="" data-guide="agent.search" />

      <div data-guide="agent.projects" className="text-muted-foreground flex items-center justify-between ps-2.5 pe-1 pt-3 pb-1 text-[11px] font-medium tracking-wider uppercase">
        <span>Projects</span>
        <NewProject />
      </div>
      {projects.map((p) => (
        <ProjectRow
          key={p.id}
          project={p}
          query={query}
          expanded={expanded.includes(p.id)}
          onToggle={() => toggle(p.id)}
          indices={byProject.get(p.id) ?? []}
          ids={threadIds}
        />
      ))}
      {!projects.length ? <div className="text-muted-foreground px-2.5 py-1 text-xs">No projects yet</div> : null}

      <div className={cn("flex flex-col gap-0.5 rounded-md", plainDrop.over && "bg-muted/60 ring-ring/50 ring-1")} {...plainDrop.props}>
        {!query || plainHit ? (
          <div className="text-muted-foreground ps-2.5 pt-3 pb-1 text-[11px] font-medium tracking-wider uppercase">Chats</div>
        ) : null}
        <div className="flex min-h-8 flex-col gap-0.5">
          <ThreadListItemGroups searchQuery={search} include={plain} emptyLabel={false} />
          {query && !anyHit ? <div className="text-muted-foreground px-2.5 py-2 text-sm">No chats found</div> : null}
        </div>
      </div>
      <ThreadListArchived />
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground mt-2 h-9 justify-start gap-2 px-3 md:hidden"
        data-guide="agent.help"
        onClick={() => {
          useAgent.getState().setSidebar(false)
          openHelp()
        }}
      >
        <Question className="size-4" />
        Help
      </Button>
    </ThreadListPrimitive.Root>
  )
}
