// A project beside the chat: instructions, memory, skills, checkpoints, files,
// default model and chats. Apps are projects of their own folder; free projects
// live in projects/<name>. What is put here reaches every chat started in the
// project. One set of sections, three layouts: the pane (desktop, beside the
// chat), the full page (tabs) and the phone (an accordion).
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowSquareOut, ArrowsOut, ChatCircle, Flag, X } from "@phosphor-icons/react"
import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { ProjectDetail } from "./api"
import { SidebarToggle } from "./Header"
import {
  CheckpointsCtx,
  CheckpointsSection,
  ChatsSection,
  DefaultModelSection,
  FilesSection,
  InstructionsSection,
  LayoutCtx,
  MemorySection,
  ProjectActions,
  SkillsSection,
  memoryNotes,
  openProjectTab,
  takePendingTab,
  useCheckpoints,
  type Layout,
  type TabId,
} from "./ProjectSections"
import { openShellApp, inShell } from "./shell"
import { ProjectIcon, TagBadge } from "./Sidebar"
import { useAgent } from "./store"

/** `apps/<id>` or `projects/<name>`: the folder a project id stands for */
export function projectFolder(id: string): string {
  return id.startsWith("app:") ? `apps/${id.slice(4)}` : `projects/${id.replace(/^project:/, "")}`
}

function useProject(id: string) {
  const detail = useAgent((s) => s.projectDetails[id])
  const summary = useAgent((s) => s.projects.find((p) => p.id === id))
  const loadProject = useAgent((s) => s.loadProject)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    void loadProject(id, true).then((d) => live && setFailed(!d))
    return () => {
      live = false
    }
  }, [id, loadProject])
  return { detail, failed, title: detail?.title ?? summary?.title ?? id }
}

function OpenAppButton({ detail, className }: { detail: ProjectDetail; className?: string }): ReactNode {
  if (detail.kind !== "app" || !inShell()) return null
  return (
    <Button variant="outline" className={cn("border-link/50 text-link hover:bg-link/10 hover:text-link", className)} onClick={() => openShellApp(detail.id.replace(/^app:/, ""))}>
      <ArrowSquareOut /> Open {detail.title}
    </Button>
  )
}

function Unavailable({ failed, layout }: { failed: boolean; layout: Layout }): ReactNode {
  const showChat = useAgent((s) => s.showChat)
  const setPhoneTab = useAgent((s) => s.setPhoneTab)
  if (!failed) return <p className="text-muted-foreground p-6 text-sm">Loading…</p>
  return (
    <div className="grid justify-items-start gap-3 p-6 text-sm">
      <p className="text-muted-foreground">This project could not be loaded. It may have been deleted.</p>
      <Button variant="outline" onClick={() => (layout === "phone" ? setPhoneTab("chat") : showChat())}>
        Back to chat
      </Button>
    </div>
  )
}

function PaneView({ detail, id }: { detail: ProjectDetail; id: string }): ReactNode {
  const openProject = useAgent((s) => s.openProject)
  const setPane = useAgent((s) => s.setPane)
  const app = detail.kind === "app"
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="flex shrink-0 items-start gap-2.5 px-3.5 pt-3 pb-2">
        <ProjectIcon project={detail} className="mt-0.5 text-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="font-heading truncate text-base leading-tight font-normal">{detail.title}</h2>
          <p className="text-muted-foreground truncate font-mono text-[11px]">{projectFolder(id)}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Open the full project page" title="Open the full project page" onClick={() => openProject(id)}>
          <ArrowsOut />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Fold the project pane" title="Fold the project pane" onClick={() => setPane({ open: false })}>
          <X />
        </Button>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-3 overflow-x-hidden overflow-y-auto px-3 pt-1 pb-4">
        <OpenAppButton detail={detail} className="w-full" />
        <InstructionsSection key={detail.instructions} detail={detail} mode="compact" />
        <MemorySection detail={detail} mode="compact" />
        <SkillsSection detail={detail} mode="compact" />
        {app ? <CheckpointsSection detail={detail} mode="compact" /> : null}
        <FilesSection detail={detail} mode="compact" />
        <DefaultModelSection detail={detail} />
      </div>
    </div>
  )
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "instructions", label: "Instructions" },
  { id: "memory", label: "Memory" },
  { id: "skills", label: "Skills" },
  { id: "checkpoints", label: "Checkpoints" },
  { id: "files", label: "Files" },
]

function PageView({ detail, tab, setTab }: { detail: ProjectDetail; tab: TabId; setTab: (t: TabId) => void }): ReactNode {
  const showChat = useAgent((s) => s.showChat)
  const { list } = useContext(CheckpointsCtx)
  const app = detail.kind === "app"
  const counts: Partial<Record<TabId, number>> = {
    memory: memoryNotes(detail).length,
    skills: detail.skills.length,
    checkpoints: list?.length,
    files: detail.fileList.length,
  }
  const tabs = TABS.filter((t) => t.id !== "checkpoints" || app)
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:px-4">
        <SidebarToggle />
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-sm" onClick={showChat}>
          <ArrowLeft /> Back to chat
        </Button>
        <span className="text-muted-foreground hidden min-w-0 truncate text-sm sm:inline">Projects / {detail.title}</span>
        <OpenAppButton detail={detail} className="ms-auto h-8" />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 pt-5 md:px-6">
          <div className="flex items-center gap-3">
            <ProjectIcon project={detail} className="text-3xl" />
            <div className="min-w-0">
              <h1 className="font-heading flex min-w-0 items-center gap-2 text-2xl font-normal">
                <span className="truncate">{detail.title}</span>
                <TagBadge tag={detail.tag} />
              </h1>
              <p className="text-muted-foreground truncate font-mono text-xs">{projectFolder(detail.id)}</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            {app
              ? "A project is the app's folder: what you put here reaches every chat started in it."
              : "What you put here reaches every chat started in this project."}
          </p>
          <div role="tablist" aria-label="Project sections" data-guide="agent.project-tabs" className="mt-4 flex gap-1 overflow-x-auto border-b">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={cn(
                  "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
                  tab === t.id ? "border-brand text-foreground font-medium" : "text-muted-foreground hover:text-foreground border-transparent",
                )}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {counts[t.id] !== undefined ? <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-[11px] leading-4">{counts[t.id]}</span> : null}
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
          {tab === "overview" ? (
            <div className="grid items-start gap-4 lg:grid-cols-3">
              <div className="grid min-w-0 gap-4 lg:col-span-2">
                <InstructionsSection key={detail.instructions} detail={detail} mode="overview" />
                <FilesSection detail={detail} mode="overview" />
                {app ? <CheckpointsSection detail={detail} mode="overview" /> : null}
                <ChatsSection detail={detail} />
              </div>
              <div className="grid min-w-0 gap-4">
                <DefaultModelSection detail={detail} />
                <MemorySection detail={detail} mode="overview" />
                <SkillsSection detail={detail} mode="overview" />
                <ProjectActions detail={detail} />
              </div>
            </div>
          ) : (
            <div className="max-w-4xl">
              {tab === "instructions" ? <InstructionsSection key={detail.instructions} detail={detail} mode="tab" /> : null}
              {tab === "memory" ? <MemorySection detail={detail} mode="tab" /> : null}
              {tab === "skills" ? <SkillsSection detail={detail} mode="tab" /> : null}
              {tab === "checkpoints" && app ? <CheckpointsSection detail={detail} mode="tab" /> : null}
              {tab === "files" ? <FilesSection detail={detail} mode="tab" /> : null}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function PhoneView({ detail }: { detail: ProjectDetail }): ReactNode {
  const setPhoneTab = useAgent((s) => s.setPhoneTab)
  const { busy, save } = useContext(CheckpointsCtx)
  const app = detail.kind === "app"
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pt-3 pb-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="bg-card grid size-12 shrink-0 place-items-center rounded-xl border">
            <ProjectIcon project={detail} className="text-2xl [&]:size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading truncate text-xl leading-tight font-normal">{detail.title}</h2>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span className="truncate font-mono">{projectFolder(detail.id)}</span>
              {app ? <TagBadge tag="app" /> : null}
            </p>
          </div>
          <OpenAppButton detail={detail} className="h-11 shrink-0 px-4 [&]:gap-1.5" />
        </div>
        <div className="grid gap-2.5">
          <InstructionsSection key={detail.instructions} detail={detail} mode="compact" />
          <MemorySection detail={detail} mode="compact" />
          <SkillsSection detail={detail} mode="compact" />
          {app ? <CheckpointsSection detail={detail} mode="compact" /> : null}
          <FilesSection detail={detail} mode="compact" />
          <DefaultModelSection detail={detail} />
          <ChatsSection detail={detail} />
          <ProjectActions detail={detail} />
        </div>
      </div>
      <div className="bg-background flex shrink-0 gap-2 border-t p-3">
        {app ? (
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90 h-11 min-w-0 flex-1" disabled={busy} onClick={() => void save("saved by hand", true)}>
            <Flag /> Save checkpoint
          </Button>
        ) : null}
        <Button variant="outline" className="h-11 min-w-0 flex-1" onClick={() => setPhoneTab("chat")}>
          <ChatCircle /> Ask Molfar
        </Button>
      </div>
    </div>
  )
}

export function ProjectPane({ id, layout }: { id: string; layout: Layout }): ReactNode {
  const { detail, failed } = useProject(id)
  const cps = useCheckpoints(detail ?? null)
  const [tab, setTab] = useState<TabId>(() => takePendingTab() ?? "overview")
  const [openId, setOpenId] = useState<string | null>("instructions")
  const toggle = useCallback((x: string) => setOpenId((cur) => (cur === x ? null : x)), [])
  const goTab = useCallback(
    (t: TabId) => {
      if (layout === "pane") openProjectTab(id, t)
      else if (layout === "page") setTab(t)
    },
    [id, layout],
  )
  const ctx = useMemo(() => ({ layout, openId, toggle, goTab }), [layout, openId, toggle, goTab])

  // a project that has no Checkpoints tab (not an app) cannot keep that tab
  const shownTab = tab === "checkpoints" && detail?.kind !== "app" ? "overview" : tab

  return (
    <LayoutCtx.Provider value={ctx}>
      <CheckpointsCtx.Provider value={cps}>
        {!detail ? (
          layout === "page" ? (
            <>
              <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:px-4">
                <SidebarToggle />
              </header>
              <Unavailable failed={failed} layout={layout} />
            </>
          ) : (
            <Unavailable failed={failed} layout={layout} />
          )
        ) : layout === "pane" ? (
          <PaneView detail={detail} id={id} />
        ) : layout === "phone" ? (
          <PhoneView detail={detail} />
        ) : (
          <PageView detail={detail} tab={shownTab} setTab={setTab} />
        )}
      </CheckpointsCtx.Provider>
    </LayoutCtx.Provider>
  )
}

export function ProjectPage({ id }: { id: string }): ReactNode {
  return <ProjectPane id={id} layout="page" />
}
