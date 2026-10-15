// The sections of a project (instructions, memory, skills, checkpoints, files,
// default model, chats), shared by the three layouts of ProjectPage: the pane
// beside the chat, the full page and the phone accordion.
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorRoot,
  ModelSelectorSearch,
  ModelSelectorTrigger,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector"
import { cn, shortModelName } from "@/lib/utils"
import {
  CaretDown,
  CaretRight,
  ChatCircle,
  Cpu,
  DownloadSimple,
  FileText,
  Flag,
  Lightning,
  Notebook,
  Plus,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type DragEvent, type ReactNode } from "react"
import { PROJECT_FILE_ACCEPT, projectFileProblem, projectsApi, type Checkpoint, type ProjectDetail, type ProjectFile } from "./api"
import { restoreConfirm } from "./Checkpoints"
import { useAgent } from "./store"

export type Layout = "pane" | "page" | "phone"
/** how much of a section shows: a pane or phone card, the overview card, a whole tab */
export type Mode = "compact" | "overview" | "tab"
export type TabId = "overview" | "instructions" | "memory" | "skills" | "checkpoints" | "files"

interface LayoutState {
  layout: Layout
  /** phone accordion: the open row */
  openId: string | null
  toggle: (id: string) => void
  /** pane "show all" / "+N": the full page on that tab */
  goTab: (tab: TabId) => void
}
export const LayoutCtx = createContext<LayoutState>({ layout: "page", openId: null, toggle: () => {}, goTab: () => {} })

/** the "show all" of the pane lands on a tab of the page: set before the page opens */
let pendingTab: TabId | null = null
export function takePendingTab(): TabId | null {
  const t = pendingTab
  pendingTab = null
  return t
}
export function openProjectTab(id: string, tab: TabId): void {
  pendingTab = tab
  useAgent.getState().openProject(id)
}

const DEFAULT_MODEL = "__default"
const USER_DEFAULT: ModelOption = { id: DEFAULT_MODEL, name: "User default", keywords: ["default"] }
const INSTRUCTIONS_CLIP = 420

export const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e))

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

function whenLabel(at: number | null): string {
  if (!at) return ""
  const d = new Date(at)
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  if (d.getTime() >= startOfToday) return "today"
  if (d.getTime() >= startOfToday - 86_400_000) return "yesterday"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function agoLabel(at: number): string {
  const min = Math.floor((Date.now() - at) / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min} min ago`
  if (min < 24 * 60) return `${Math.floor(min / 60)} h ago`
  return `${Math.floor(min / (24 * 60))} d ago`
}

export const memoryNotes = (detail: ProjectDetail): string[] =>
  detail.memory.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2))

const inlineLink = "text-brand hover:text-brand/80 underline underline-offset-2"
const basename = (p: string): string => p.split("/").at(-1) ?? p

/** A section: a card on the pane and the page, an accordion row on the phone. */
function Shell({ id, icon, title, aside, summary, children, className, ...rest }: {
  id: string
  icon: ReactNode
  title: string
  /** card header, right side */
  aside?: ReactNode
  /** phone row, right side */
  summary?: ReactNode
  children: ReactNode
  className?: string
} & Omit<ComponentProps<"section">, "title">): ReactNode {
  const { layout, openId, toggle } = useContext(LayoutCtx)
  if (layout === "phone") {
    const open = openId === id
    return (
      <section className={cn("bg-card min-w-0 rounded-xl border", className)} data-section={id} data-guide={`agent.section.${id}`} {...rest}>
        <button type="button" aria-expanded={open} className="flex min-h-12 w-full items-center gap-3 px-3.5 text-start" onClick={() => toggle(id)}>
          <span className="text-brand/80 shrink-0 [&_svg]:size-[18px]">{icon}</span>
          <span className="font-heading shrink-0 text-sm font-normal">{title}</span>
          <span className="text-muted-foreground ms-auto min-w-0 truncate text-xs">{summary}</span>
          {open ? <CaretDown className="text-muted-foreground size-3.5 shrink-0" /> : <CaretRight className="text-muted-foreground size-3.5 shrink-0" />}
        </button>
        {open ? <div className="border-t p-3.5">{children}</div> : null}
      </section>
    )
  }
  return (
    <section className={cn("bg-card min-w-0 rounded-xl border p-4", className)} data-section={id} data-guide={`agent.section.${id}`} {...rest}>
      <h3 className="font-heading mb-2.5 flex items-baseline justify-between gap-3 text-base font-normal">
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-brand/80 [&_svg]:size-4 [&_svg]:translate-y-0.5">{icon}</span>
          {title}
        </span>
        {aside ? <span className="text-muted-foreground min-w-0 truncate font-sans text-xs font-normal">{aside}</span> : null}
      </h3>
      {children}
    </section>
  )
}

export function InstructionsSection({ detail, mode }: { detail: ProjectDetail; mode: Mode }): ReactNode {
  const { layout, goTab } = useContext(LayoutCtx)
  const setProjectDetail = useAgent((s) => s.setProjectDetail)
  const refreshProjects = useAgent((s) => s.refreshProjects)
  const setBanner = useAgent((s) => s.setBanner)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [all, setAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const text = detail.instructions
  const lines = text.split("\n")
  const compact = mode === "compact"
  const long = compact ? lines.length > 6 : mode === "overview" && (text.length > INSTRUCTIONS_CLIP || lines.length > 8)
  const shown = compact && !all ? lines.slice(0, 6).join("\n") : text
  const showAll = () => (layout === "pane" ? goTab("instructions") : setAll((v) => !v))
  const startEdit = () => {
    setDraft(text)
    setEditing(true)
  }

  const save = async () => {
    setBusy(true)
    try {
      setProjectDetail(await projectsApi.update(detail.id, { instructions: draft }))
      void refreshProjects()
      setEditing(false)
    } catch (e) {
      setBanner({ kind: "error", text: errText(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell
      id="instructions"
      icon={<FileText />}
      title="Instructions"
      summary={basename(detail.paths.instructions)}
      aside={
        <>
          <span className="font-mono">{basename(detail.paths.instructions)}</span>
          {editing ? null : (
            <>
              {" · "}
              <button type="button" className={inlineLink} onClick={startEdit}>
                edit
              </button>
            </>
          )}
        </>
      }
    >
      {editing ? (
        <div className="grid gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Project instructions"
            autoFocus
            rows={mode === "tab" ? 22 : 10}
            className="bg-muted/40 focus-visible:ring-ring/50 w-full resize-y rounded-lg border p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-1"
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void save()}>
              Save
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : text.trim() ? (
        <div className="grid gap-1.5">
          <pre
            className={cn(
              "bg-muted/40 rounded-lg p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap",
              mode === "overview" && long && !all && "max-h-36 overflow-hidden",
            )}
          >
            {shown}
          </pre>
          {layout === "phone" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11" onClick={startEdit}>
                Edit
              </Button>
              {long ? (
                <Button variant="outline" className="h-11" onClick={showAll}>
                  {all ? "Show less" : `Show all · ${lines.length} lines`}
                </Button>
              ) : null}
            </div>
          ) : long ? (
            <button type="button" className={cn("text-muted-foreground w-fit text-xs", inlineLink)} onClick={showAll}>
              {layout !== "pane" && all ? "show less" : `show all · ${lines.length} lines`}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid justify-items-start gap-2">
          <p className="text-muted-foreground text-sm">No instructions yet.</p>
          {layout === "phone" ? (
            <Button variant="outline" className="h-11" onClick={startEdit}>
              Edit
            </Button>
          ) : null}
        </div>
      )}
    </Shell>
  )
}

/** the memory panel and the skill view live in the chat's header: from the page, go back to the chat first */
function useChatFirst(): () => void {
  const { layout } = useContext(LayoutCtx)
  const showChat = useAgent((s) => s.showChat)
  return () => {
    if (layout === "page") showChat()
  }
}

export function MemorySection({ detail }: { detail: ProjectDetail; mode: Mode }): ReactNode {
  const { layout, goTab } = useContext(LayoutCtx)
  const openMemory = useAgent((s) => s.openMemory)
  const chatFirst = useChatFirst()
  const notes = memoryNotes(detail)
  const limit = layout === "pane" ? 3 : notes.length
  const edit = () => {
    chatFirst()
    openMemory({ file: detail.paths.memory, text: "" })
  }
  return (
    <Shell
      id="memory"
      icon={<Notebook />}
      title="Memory"
      summary={`${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
      aside={
        <>
          <span className="font-mono">{basename(detail.paths.memory)}</span>
          {" · "}
          <button type="button" className={inlineLink} onClick={edit}>
            edit
          </button>
        </>
      }
    >
      {notes.length ? (
        <ul className="grid gap-1.5 text-sm">
          {notes.slice(0, limit).map((m, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: notes can repeat
            <li key={`${i}-${m}`} className="flex gap-2">
              <span aria-hidden className="text-brand">•</span>
              <span className={cn("min-w-0 break-words", layout === "pane" && "line-clamp-2")}>{m}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Nothing yet</p>
      )}
      {notes.length > limit ? (
        <button type="button" className={cn("text-muted-foreground mt-2 text-xs", inlineLink)} onClick={() => goTab("memory")}>
          +{notes.length - limit} more {notes.length - limit === 1 ? "note" : "notes"}
        </button>
      ) : null}
      {layout === "phone" ? (
        <Button variant="outline" className="mt-3 h-11 w-full" onClick={edit}>
          Edit memory
        </Button>
      ) : null}
    </Shell>
  )
}

export function SkillsSection({ detail, mode }: { detail: ProjectDetail; mode: Mode }): ReactNode {
  const { layout, goTab } = useContext(LayoutCtx)
  const openSkill = useAgent((s) => s.openSkill)
  const chatFirst = useChatFirst()
  const skills = detail.skills
  const limit = layout === "pane" ? 4 : skills.length
  const open = (s: ProjectDetail["skills"][number]) => {
    chatFirst()
    openSkill({ scope: s.scope, name: s.name })
  }
  const chip = "bg-muted/60 hover:bg-muted max-w-full truncate rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors"
  return (
    <Shell
      id="skills"
      icon={<Lightning />}
      title="Skills"
      aside=".skills/ + global"
      summary={skills.length ? `${skills.length} · ${skills.slice(0, 2).map((s) => s.name).join(", ")}` : "none"}
    >
      {!skills.length ? (
        <p className="text-muted-foreground text-sm">No skills yet</p>
      ) : mode === "tab" ? (
        <ul className="grid gap-2">
          {skills.map((s) => (
            <li key={`${s.scope}/${s.file}`}>
              <button type="button" className="bg-muted/30 hover:bg-muted/60 grid w-full gap-0.5 rounded-lg border px-3 py-2 text-start transition-colors" onClick={() => open(s)}>
                <span className="font-mono text-xs font-medium">{s.name}</span>
                {s.description ? <span className="text-muted-foreground text-xs">{s.description}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, limit).map((s) => (
            <button key={`${s.scope}/${s.file}`} type="button" title={s.description} className={cn(chip, layout === "phone" && "min-h-9")} onClick={() => open(s)}>
              {s.name}
            </button>
          ))}
          {skills.length > limit ? (
            <button type="button" className={cn(chip, "text-primary")} onClick={() => goTab("skills")}>
              +{skills.length - limit}
            </button>
          ) : null}
        </div>
      )}
    </Shell>
  )
}

// ---- checkpoints ----

export interface CheckpointsState {
  list: Checkpoint[] | null
  busy: boolean
  /** saves a point; `announce` says so in a banner (the phone's footer button has no other feedback) */
  save: (label: string, announce?: boolean) => Promise<boolean>
}
export const CheckpointsCtx = createContext<CheckpointsState>({ list: null, busy: false, save: async () => false })

/** One load of an app's checkpoints, shared by the section and the phone footer. */
export function useCheckpoints(detail: ProjectDetail | null): CheckpointsState {
  const setBanner = useAgent((s) => s.setBanner)
  const rev = useAgent((s) => s.checkpointsRev)
  const id = detail?.kind === "app" ? detail.id : null
  const [list, setList] = useState<Checkpoint[] | null>(null)
  const [busy, setBusy] = useState(false)

  // rev: a restore elsewhere (the banner's Undo, a chat message) changes the list
  // biome-ignore lint/correctness/useExhaustiveDependencies: rev only triggers the reload
  useEffect(() => {
    if (!id) return
    projectsApi.checkpoints(id).then(setList, (e) => {
      setList([])
      setBanner({ kind: "error", text: errText(e) })
    })
  }, [id, rev, setBanner])

  const save = useCallback(
    async (label: string, announce = false) => {
      if (!id) return false
      setBusy(true)
      try {
        const cp = await projectsApi.createCheckpoint(id, label.trim() || "saved by hand")
        const same = list?.some((c) => c.id === cp.id)
        if (same) setBanner({ kind: "info", text: `Nothing changed since "${cp.label}"` })
        else if (announce) setBanner({ kind: "info", text: `Checkpoint saved: "${cp.label}"` })
        setList(await projectsApi.checkpoints(id))
        return true
      } catch (e) {
        setBanner({ kind: "error", text: errText(e) })
        return false
      } finally {
        setBusy(false)
      }
    },
    [id, list, setBanner],
  )
  return { list, busy, save }
}

const CHECKPOINTS_SHOWN = { compact: 3, overview: 8, tab: Number.POSITIVE_INFINITY } as const

/** An app's code history: saved points it can go back to. Restore never
 *  touches data, chats or uploads, and saves the current state first. */
export function CheckpointsSection({ detail, mode }: { detail: ProjectDetail; mode: Mode }): ReactNode {
  const { layout, goTab } = useContext(LayoutCtx)
  const { list, busy, save } = useContext(CheckpointsCtx)
  const restore = useAgent((s) => s.restoreCheckpoint)
  const app = detail.id.replace(/^app:/, "")
  const [label, setLabel] = useState("")
  const max = layout === "phone" ? 20 : CHECKPOINTS_SHOWN[mode]
  const shown = list?.slice(0, max)
  const last = list?.[0]
  return (
    <Shell
      id="checkpoints"
      icon={<Flag />}
      title="Checkpoints"
      aside={layout === "pane" ? undefined : "the app's code, not its data"}
      summary={list ? (list.length && last ? `${list.length} · last ${agoLabel(last.at)}` : "none") : "…"}
      data-testid="checkpoints"
    >
      {layout === "phone" ? null : (
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!busy) void save(label).then((ok) => ok && setLabel(""))
          }}
        >
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" aria-label="Checkpoint label" maxLength={120} disabled={busy} className="min-w-0" />
          <Button type="submit" disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90 shrink-0">
            {layout === "pane" ? "Save now" : "Save checkpoint"}
          </Button>
        </form>
      )}
      {!list ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : list.length ? (
        <ul className="flex flex-col gap-1">
          {shown?.map((c) => (
            <li key={c.id} className={cn("bg-muted/40 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm", layout === "phone" && "min-h-11")}>
              <span className="min-w-0 flex-1">
                <span className="block truncate" title={c.label}>
                  {c.label}
                </span>
                {layout === "pane" ? <span className="text-muted-foreground block text-[11px]">{agoLabel(c.at)}</span> : null}
              </span>
              {c.auto ? <span className="text-muted-foreground shrink-0 rounded-full border px-1.5 text-[10px]">auto</span> : null}
              {layout === "pane" ? null : <span className="text-muted-foreground shrink-0 text-xs">{agoLabel(c.at)}</span>}
              <Button
                variant="ghost"
                size="xs"
                className={layout === "phone" ? "h-8 px-3" : undefined}
                onClick={() => {
                  if (window.confirm(restoreConfirm(app, c.label))) void restore(app, c.id)
                }}
              >
                Restore
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No checkpoints yet. Molfar takes one before it changes the app, or save one yourself.</p>
      )}
      {list && list.length > max ? (
        <button type="button" className={cn("text-muted-foreground mt-2 text-xs", inlineLink)} onClick={() => goTab("checkpoints")}>
          Show all {list.length}
        </button>
      ) : null}
    </Shell>
  )
}

// ---- files ----

function FileTile({ pid, file, onDelete }: { pid: string; file: ProjectFile; onDelete: () => void }): ReactNode {
  const url = projectsApi.fileUrl(pid, file.name)
  return (
    <div className="group bg-background relative overflow-hidden rounded-lg border">
      <a href={url} target="_blank" rel="noreferrer" className="block outline-none" title={file.name}>
        <div className="bg-muted/50 flex h-20 items-center justify-center">
          {file.type === "image" ? (
            <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <FileText className="text-muted-foreground size-7" weight="duotone" />
          )}
        </div>
        <div className="border-t px-2 py-1.5">
          <div className="truncate text-xs">{file.name}</div>
          <div className="text-muted-foreground text-[11px]">
            {file.type} · {formatSize(file.size)}
          </div>
        </div>
      </a>
      <Button
        variant="secondary"
        size="icon-xs"
        aria-label={`Delete ${file.name}`}
        title="Delete file"
        className="absolute end-1.5 top-1.5 opacity-0 shadow-sm group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
        onClick={onDelete}
      >
        <Trash />
      </Button>
    </div>
  )
}

export function FilesSection({ detail, mode }: { detail: ProjectDetail; mode: Mode }): ReactNode {
  const { layout } = useContext(LayoutCtx)
  const loadProject = useAgent((s) => s.loadProject)
  const refreshProjects = useAgent((s) => s.refreshProjects)
  const setBanner = useAgent((s) => s.setBanner)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(0)
  const pid = detail.id
  const bytes = detail.fileList.reduce((n, f) => n + f.size, 0)
  const count = `${detail.fileList.length} ${detail.fileList.length === 1 ? "file" : "files"}, ${formatSize(bytes)}`

  const reload = async () => {
    await Promise.all([loadProject(pid, true), refreshProjects()])
  }

  const upload = async (list: File[]) => {
    if (!list.length) return
    const problems: string[] = []
    const ok: File[] = []
    for (const f of list) {
      const p = projectFileProblem(f)
      if (p) problems.push(p)
      else ok.push(f)
    }
    setUploading(ok.length)
    for (const f of ok) {
      try {
        await projectsApi.putFile(pid, f)
      } catch (e) {
        problems.push(`${f.name}: ${errText(e)}`)
      }
      setUploading((n) => n - 1)
    }
    setUploading(0)
    if (problems.length) setBanner({ kind: "error", text: `Not added. ${problems.join("; ")}` })
    await reload()
  }

  const remove = async (f: ProjectFile) => {
    if (!window.confirm(`Delete "${f.name}" from this project?`)) return
    try {
      await projectsApi.deleteFile(pid, f.name)
      await reload()
    } catch (e) {
      setBanner({ kind: "error", text: errText(e) })
    }
  }

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    setDragging(false)
    void upload([...e.dataTransfer.files])
  }

  const compact = mode === "compact"
  return (
    <Shell
      id="files"
      icon={<UploadSimple />}
      title="Files"
      data-dragging={dragging}
      className={cn("transition-colors", dragging && "border-ring border-dashed")}
      summary={count}
      aside={compact ? count : <><span className="font-mono">{detail.paths.files}</span>{` · ${count}`}</>}
      onDragOver={(e: DragEvent<HTMLElement>) => {
        if (![...e.dataTransfer.types].includes("Files")) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e: DragEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <div className={cn("grid gap-2.5", compact ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4")}>
        {compact
          ? null
          : detail.fileList.map((f) => <FileTile key={f.name} pid={pid} file={f} onDelete={() => void remove(f)} />)}
        <button
          type="button"
          className={cn(
            "text-muted-foreground hover:bg-muted/40 hover:text-foreground focus-visible:ring-ring/50 flex flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed p-2 text-center text-xs outline-none transition-colors focus-visible:ring-1",
            compact ? "min-h-14 flex-row gap-2" : "min-h-28",
            layout === "phone" && "min-h-12",
          )}
          onClick={() => inputRef.current?.click()}
        >
          <UploadSimple className="size-4" />
          <span>{compact ? "Drop files here" : "Drop images or text files"}</span>
          {compact ? null : <span className="text-[11px] opacity-80">or click to upload</span>}
        </button>
      </div>
      {compact && detail.fileList.length ? (
        <ul className="mt-2 grid gap-1 text-xs">
          {detail.fileList.slice(0, layout === "phone" ? 20 : 3).map((f) => (
            <li key={f.name} className="flex items-center gap-2">
              <a href={projectsApi.fileUrl(pid, f.name)} target="_blank" rel="noreferrer" className="hover:text-foreground text-muted-foreground min-w-0 flex-1 truncate" title={f.name}>
                {f.name}
              </a>
              <span className="text-muted-foreground shrink-0 text-[11px]">{formatSize(f.size)}</span>
              <button type="button" aria-label={`Delete ${f.name}`} className="text-muted-foreground hover:text-destructive shrink-0 pointer-coarse:p-2" onClick={() => void remove(f)}>
                <Trash className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={PROJECT_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const list = [...(e.target.files ?? [])]
          e.target.value = ""
          void upload(list)
        }}
      />
      {uploading ? (
        <p className="text-muted-foreground mt-2 text-xs" role="status">
          Uploading {uploading} {uploading === 1 ? "file" : "files"}…
        </p>
      ) : null}
    </Shell>
  )
}

// ---- chats, default model, actions ----

export function ChatsSection({ detail }: { detail: ProjectDetail }): ReactNode {
  const sessions = useAgent((s) => s.sessions)
  const open = useAgent((s) => s.open)
  const newChat = useAgent((s) => s.newChat)
  const chats = useMemo(
    () => sessions.filter((s) => s.project === detail.id && !s.archived).sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0)),
    [sessions, detail.id],
  )
  return (
    <Shell id="chats" icon={<ChatCircle />} title="Chats in this project" aside={String(chats.length)} summary={String(chats.length)}>
      {chats.length ? (
        <ul className="divide-y">
          {chats.map((c) => (
            <li key={c.sessionId}>
              <button
                type="button"
                className="hover:bg-muted/40 flex min-h-11 w-full items-center gap-2.5 rounded-md px-1 py-2 text-start text-sm"
                onClick={() => void open(c.sessionId)}
              >
                <ChatCircle className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{c.title?.trim() || "Untitled"}</span>
                <span className="text-muted-foreground shrink-0 text-xs">{whenLabel(c.lastAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No chats yet.</p>
      )}
      <Button className="bg-brand text-brand-foreground hover:bg-brand/90 mt-3 h-9 rounded-full px-4" onClick={() => newChat(detail.id)}>
        <Plus /> New chat in {detail.title}
      </Button>
    </Shell>
  )
}

export function DefaultModelSection({ detail }: { detail: ProjectDetail }): ReactNode {
  const models = useAgent((s) => s.models)
  const setProjectDetail = useAgent((s) => s.setProjectDetail)
  const refreshProjects = useAgent((s) => s.refreshProjects)
  const setBanner = useAgent((s) => s.setBanner)

  const [open, setOpen] = useState(false)

  const groups = useMemo(() => {
    const rows: Array<ModelOption & { group: string }> = models
      .map((m) => ({
        id: `${m.provider}/${m.modelId}`,
        name: shortModelName(m.label),
        // the full label and the connection stay searchable
        keywords: [m.label, m.modelId, m.provider, m.connectionName ?? ""],
        group: m.connectionName ?? m.provider,
      }))
      .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
    // a default naming a model that is no longer listed must still show
    if (detail.model && !rows.some((r) => r.id === detail.model)) rows.push({ id: detail.model, name: detail.model, group: "Other" })
    const out: Array<[string, typeof rows]> = []
    for (const r of rows) {
      const last = out.at(-1)
      if (last && last[0] === r.group) last[1].push(r)
      else out.push([r.group, [r]])
    }
    return out
  }, [models, detail.model])
  const options = useMemo<ModelOption[]>(() => [USER_DEFAULT, ...groups.flatMap(([, rows]) => rows)], [groups])

  const change = async (v: string) => {
    if (v === (detail.model ?? DEFAULT_MODEL)) return
    try {
      setProjectDetail(await projectsApi.update(detail.id, { model: v === DEFAULT_MODEL ? null : v }))
      void refreshProjects()
    } catch (e) {
      setBanner({ kind: "error", text: errText(e) })
    }
  }

  const multi = groups.length > 1
  const current = options.find((o) => o.id === (detail.model ?? DEFAULT_MODEL))?.name ?? "User default"
  return (
    <Shell id="model" icon={<Cpu />} title="Default model" aside="new chats start with it" summary={current}>
      <ModelSelectorRoot
        models={options}
        value={detail.model ?? DEFAULT_MODEL}
        onValueChange={(v) => void change(v)}
        open={open}
        onOpenChange={setOpen}
      >
        <ModelSelectorTrigger className="w-full justify-between [&>span]:truncate" aria-label="Default model" />
        <ModelSelectorContent align="start" className="w-(--anchor-width) min-w-80">
          <ModelSelectorSearch />
          <ModelSelectorList className="max-h-[min(60vh,26rem)]">
            <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
            <ModelSelectorGroup>
              <ModelSelectorItem model={USER_DEFAULT} />
            </ModelSelectorGroup>
            {groups.map(([group, rows]) => (
              <ModelSelectorGroup key={group} heading={multi ? group : undefined}>
                {rows.map((r) => (
                  <ModelSelectorItem key={r.id} model={r}>
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate font-medium" title={r.name}>
                        {r.name}
                      </span>
                      {multi ? null : <span className="text-muted-foreground ms-auto shrink-0 text-xs">{group}</span>}
                    </span>
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            ))}
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelectorRoot>
    </Shell>
  )
}

export function ProjectActions({ detail }: { detail: ProjectDetail }): ReactNode {
  const refreshProjects = useAgent((s) => s.refreshProjects)
  const showChat = useAgent((s) => s.showChat)
  const setBanner = useAgent((s) => s.setBanner)
  if (detail.kind === "app") return <p className="text-muted-foreground px-1 text-xs">The project goes with the app when the app is exported.</p>
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={projectsApi.exportUrl(detail.id)}
        download
        className="bg-muted/70 text-foreground hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium"
      >
        <DownloadSimple className="size-4" /> Export zip
      </a>
      <Button
        variant="destructive"
        onClick={async () => {
          if (!window.confirm(`Delete the project "${detail.title}" and its files? Its chats stay.`)) return
          try {
            await projectsApi.remove(detail.id)
            await refreshProjects()
            showChat()
          } catch (e) {
            setBanner({ kind: "error", text: errText(e) })
          }
        }}
      >
        <Trash /> Delete project
      </Button>
    </div>
  )
}
