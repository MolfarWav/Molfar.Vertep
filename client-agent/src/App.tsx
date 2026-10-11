import {
  AssistantRuntimeProvider,
  SimpleImageAttachmentAdapter,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react"
import { Thread } from "@/components/assistant-ui/elements/thread.aui"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"
import type { ReadonlyJSONObject } from "assistant-stream/utils"
import { Dialog } from "@base-ui/react/dialog"
import { Info, WarningCircle, X } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Header, SidebarToggle, useIsDesktop } from "./Header"
import { MemoryPanel } from "./MemoryPanel"
import { ProjectPane } from "./ProjectPage"
import { Sidebar, SidebarRail } from "./Sidebar"
import { MolfarAvatar } from "./MolfarAvatar"
import { currentProjectId, PANE_DEFAULT, PANE_MAX, PANE_MIN, useAgent } from "./store"
import { AgentToolFallback, toolConfig } from "./tools"
import { visibleParts, type Msg } from "./runs"

/** The chat never gets narrower than this when the pane is open. */
const MIN_CHAT = 480

const imageAttachments = new SimpleImageAttachmentAdapter()

function toThreadMessage(m: Msg): ThreadMessageLike {
  if (m.role === "user") {
    const content: ThreadMessageLike["content"] = [
      ...(m.images ?? []).map((image) => ({ type: "image" as const, image })),
      ...m.parts.map((p) => ({ type: "text" as const, text: p.kind === "text" ? p.text : "" })),
    ]
    return { id: m.id, role: "user", content }
  }
  return {
    id: m.id,
    role: "assistant",
    ...(m.streaming ? { status: { type: "running" as const } } : {}),
    content: visibleParts(m).map((p) => {
      if (p.kind === "think") return { type: "reasoning" as const, text: p.text }
      if (p.kind === "text") return { type: "text" as const, text: p.text }
      // engine tool args arrive from JSON.parse — display-only cast at this boundary
      return {
        type: "tool-call" as const,
        toolCallId: p.callId,
        toolName: p.name,
        args: p.args as ReadonlyJSONObject,
        isError: p.state === "error",
        ...(p.state === "running"
          ? {}
          : { result: { ok: p.state === "ok", summary: p.summary, output: p.output, diff: p.diff } }),
      }
    }),
  }
}

interface SendImage {
  data: string
  mimeType: string
  url: string
}

function extractSend(message: AppendMessage): { text: string; images?: SendImage[] } {
  let text = ""
  for (const c of message.content) if (c.type === "text") text += c.text
  const images: SendImage[] = []
  for (const a of message.attachments ?? [])
    for (const c of a.content)
      if (c.type === "image" && typeof c.image === "string" && c.image.startsWith("data:")) {
        const m = /^data:([^;]+);base64,(.*)$/s.exec(c.image)
        if (m?.[1] && m[2]) images.push({ mimeType: m[1], data: m[2], url: c.image })
      }
  return { text, images: images.length ? images : undefined }
}

/** The run (its `at`, the engine truncate target) of a user message: its runAt, else the u<at> id.
 *  Ids shown during a live run stay after it settles (keepShownIds), so the id alone may not say. */
function runAtFromId(id: string | null | undefined): number | null {
  if (!id) return null
  const m = useAgent.getState().msgs.find((x) => x.id === id)
  if (m) return m.role === "user" && m.runAt !== undefined ? m.runAt : null
  if (id[0] !== "u") return null
  const at = Number(id.slice(1))
  return Number.isFinite(at) ? at : null
}

export default function App(): ReactNode {
  const msgs = useAgent((s) => s.msgs)
  const running = useAgent((s) => s.running)
  const sessionId = useAgent((s) => s.sessionId)
  const sessions = useAgent((s) => s.sessions)
  const sidebarOpen = useAgent((s) => s.sidebarOpen)
  const setSidebar = useAgent((s) => s.setSidebar)
  const sidebarPinned = useAgent((s) => s.sidebarPinned)
  const view = useAgent((s) => s.view)

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)")
    const closeDrawer = () => { if (media.matches) setSidebar(false) }
    media.addEventListener("change", closeDrawer)
    return () => media.removeEventListener("change", closeDrawer)
  }, [setSidebar])

  const messages = useMemo(() => msgs.map(toThreadMessage), [msgs])
  const threads = useMemo(
    () => sessions.filter((s) => !s.archived).map((s) => ({ status: "regular" as const, id: s.sessionId, title: s.title?.trim() || "Untitled" })),
    [sessions],
  )
  const archivedThreads = useMemo(
    () => sessions.filter((s) => s.archived).map((s) => ({ status: "archived" as const, id: s.sessionId, title: s.title?.trim() || "Untitled" })),
    [sessions],
  )
  const runtime = useExternalStoreRuntime({
    isRunning: running,
    messages,
    convertMessage: (m) => m,
    adapters: {
      attachments: imageAttachments,
      threadList: {
        threadId: sessionId ?? undefined,
        threads,
        archivedThreads,
        onSwitchToNewThread: () => useAgent.getState().newChat(),
        onSwitchToThread: (id: string) => useAgent.getState().open(id),
        onRename: (id: string, title: string) => useAgent.getState().rename(id, title),
        onArchive: (id: string) => useAgent.getState().archive(id, true),
        onUnarchive: (id: string) => useAgent.getState().archive(id, false),
        onDelete: (id: string) => useAgent.getState().remove(id),
      },
    },
    onNew: async (message) => {
      const { text, images } = extractSend(message)
      if (!text) return
      await useAgent.getState().send(
        text,
        images?.map(({ data, mimeType }) => ({ data, mimeType })),
        images?.map(({ url }) => url),
      )
    },
    onCancel: async () => {
      await useAgent.getState().stop()
    },
    onEdit: async (message) => {
      const { text } = extractSend(message)
      const source = (message as { sourceId?: string }).sourceId
      const at = runAtFromId(source) ?? runAtFromId(message.parentId)
      if (at !== null) await useAgent.getState().editAt(at, text)
    },
    onReload: async (parentId) => {
      const at = runAtFromId(parentId)
      if (at === null) return
      const original = useAgent.getState().msgs.find((m) => m.role === "user" && m.runAt === at)
      const text = original?.parts.find((p) => p.kind === "text")
      if (text && text.kind === "text") await useAgent.getState().editAt(at, text.text)
    },
  })


  const desktop = useIsDesktop()
  const projectId = useAgent((s) => currentProjectId(s))
  const pane = useAgent((s) => s.pane)
  const phoneTab = useAgent((s) => s.phoneTab)
  const setPhoneTab = useAgent((s) => s.setPhoneTab)

  // a new or another chat starts on the Chat tab
  const lastSession = useRef(sessionId)
  useEffect(() => {
    if (lastSession.current === sessionId) return
    lastSession.current = sessionId
    setPhoneTab("chat")
  }, [sessionId, setPhoneTab])
  // on a phone the project page is the Project tab; "Ask Molfar" there (tab -> chat) leaves it
  const prevTab = useRef(phoneTab)
  useEffect(() => {
    if (!desktop && view.kind === "project" && phoneTab !== "project") {
      if (prevTab.current === "project") useAgent.getState().showChat()
      else setPhoneTab("project")
    }
    prevTab.current = phoneTab
  }, [desktop, view.kind, phoneTab, setPhoneTab])
  // leaving the project page (a new chat, or a chat opened from it) lands on the Chat tab
  const prevKind = useRef(view.kind)
  useEffect(() => {
    if (prevKind.current === "project" && view.kind === "chat") setPhoneTab("chat")
    prevKind.current = view.kind
  }, [view.kind, setPhoneTab])

  const fullPage = view.kind === "project"
  const showPane = desktop && !fullPage && !!projectId && pane.open

  return (
    <AssistantRuntimeProvider runtime={runtime} config={toolConfig}>
      <div className="bg-background text-foreground flex h-dvh overflow-hidden">
        <aside
          aria-label="Conversations"
          className={`bg-sidebar text-sidebar-foreground hidden shrink-0 flex-col border-r md:flex ${sidebarPinned ? "w-64" : "w-14"}`}
        >
          {sidebarPinned ? (
            <>
              <div className="font-heading flex h-12 shrink-0 items-center gap-2 px-4 text-base font-normal">
                <MolfarAvatar size={24} />
                Molfar
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2"><Sidebar /></div>
            </>
          ) : (
            <SidebarRail />
          )}
        </aside>
        <Dialog.Root open={sidebarOpen} onOpenChange={setSidebar}>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
            <Dialog.Popup finalFocus={() => document.getElementById("agent-sidebar-toggle")} className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r outline-none">
              <div className="flex h-14 shrink-0 items-center justify-between px-4">
                <Dialog.Title className="text-sm font-semibold">Conversations</Dialog.Title>
                <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Close sidebar" />}><X size={18} /></Dialog.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2"><Sidebar /></div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
        <main className="flex min-h-0 min-w-0 flex-grow flex-col overflow-hidden">
          {!fullPage ? (
            <Header />
          ) : desktop ? (
            // the page has its own header; the memory panel its "edit" buttons open still needs a home
            <div hidden><MemoryPanel /></div>
          ) : (
            <PhoneProjectBar />
          )}
          <BannerStrip />
          {fullPage ? (
            <ProjectPane key={view.id} id={view.id} layout={desktop ? "page" : "phone"} />
          ) : !desktop ? (
            phoneTab === "project" && projectId ? <ProjectPane key={projectId} id={projectId} layout="phone" /> : <Thread components={{ ToolFallback: AgentToolFallback }} />
          ) : (
            <ChatRow showPane={showPane} projectId={projectId} />
          )}
        </main>
      </div>
    </AssistantRuntimeProvider>
  )
}

/** Phone, the full project page: a bar with the drawer button and the way back to the chat. */
function PhoneProjectBar(): ReactNode {
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b px-2">
      <SidebarToggle />
      <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium">Project</span>
      <Button variant="ghost" size="sm" onClick={() => useAgent.getState().showChat()}>
        Back to chat
      </Button>
      <div hidden><MemoryPanel /></div>
    </header>
  )
}

/** The slim strip under the header: a lost connection, an error or a note, with its actions. */
function BannerStrip(): ReactNode {
  const banner = useAgent((s) => s.banner)
  const setBanner = useAgent((s) => s.setBanner)
  const wsDown = useAgent((s) => s.wsDown)
  if (!banner) return null
  const error = banner.kind === "error"
  const Icon = error ? WarningCircle : Info
  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex min-h-8 shrink-0 items-center gap-2 border-b px-3 py-1 text-xs ${error ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"}`}
    >
      <Icon size={14} className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate" title={banner.text}>{banner.text}</span>
      <span className="flex shrink-0 items-center gap-3">
        {banner.action ? (
          <button className="font-medium underline" onClick={banner.action.run}>
            {banner.action.label}
          </button>
        ) : null}
        {wsDown ? (
          <button className="font-medium underline" onClick={() => void useAgent.getState().reloadCurrent()}>
            Retry
          </button>
        ) : null}
        <button className="underline" onClick={() => setBanner(null)}>
          Dismiss
        </button>
      </span>
    </div>
  )
}

/** The chat and, beside it, the project pane with its drag handle (desktop). The pane gives way
 *  when the window is narrow: the chat keeps 480 px. */
function ChatRow({ showPane, projectId }: { showPane: boolean; projectId: string | null }): ReactNode {
  const pane = useAgent((s) => s.pane)
  const setPane = useAgent((s) => s.setPane)
  const rowRef = useRef<HTMLDivElement>(null)
  const [rowWidth, setRowWidth] = useState(0)
  const [drag, setDrag] = useState<number | null>(null)
  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setRowWidth(el.clientWidth))
    ro.observe(el)
    setRowWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const limit = (w: number) => Math.max(PANE_MIN, Math.min(PANE_MAX, w, rowWidth - MIN_CHAT))
  const width = limit(drag ?? pane.width)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    let last = startW
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const move = (ev: globalThis.PointerEvent) => {
      last = limit(startW + (startX - ev.clientX))
      setDrag(last)
    }
    const up = () => {
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointercancel", up)
      setDrag(null)
      setPane({ width: last })
    }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
    e.preventDefault()
    setPane({ width: limit(width + (e.key === "ArrowLeft" ? 16 : -16)) })
  }

  return (
    <div ref={rowRef} className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Thread components={{ ToolFallback: AgentToolFallback }} />
      </div>
      {showPane && projectId ? (
        <aside aria-label="Project" className="bg-card relative flex min-h-0 shrink-0 flex-col border-l" style={{ width }}>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the project pane"
            aria-valuemin={PANE_MIN}
            aria-valuemax={PANE_MAX}
            aria-valuenow={width}
            tabIndex={0}
            className={`hover:bg-primary/40 focus-visible:bg-primary/40 absolute inset-y-0 -left-0.5 z-10 w-1 cursor-col-resize touch-none outline-none ${drag !== null ? "bg-primary/40" : ""}`}
            onPointerDown={onPointerDown}
            onKeyDown={onKeyDown}
            onDoubleClick={() => setPane({ width: PANE_DEFAULT })}
          />
          <ProjectPane key={projectId} id={projectId} layout="pane" />
        </aside>
      ) : null}
    </div>
  )
}
