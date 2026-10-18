import {
  AuiConfig,
  defineToolkit,
  Tools,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react"
import { CodeDiff, parseDiff } from "@/components/assistant-ui/elements/code-diff"
import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback.aui"
import type { ReactNode } from "react"
import { BugSolutionTool } from "./BugSolution"

export interface ToolResult {
  ok: boolean
  summary?: string
  output?: string
  diff?: string
}

/** One line of plain text where a diff would go: a write that changed nothing,
 *  a refused write, an edit still running. */
function EditNote({ path, note, tone }: { path: string; note: string; tone?: "error" }): ReactNode {
  return (
    <div className="my-1 flex items-center gap-2 px-2.5 py-1.5 font-mono text-[11px]">
      <span className="min-w-0 truncate text-muted-foreground" title={path}>{path}</span>
      <span className={tone === "error" ? "text-destructive" : "text-muted-foreground/70"}>{note}</span>
    </div>
  )
}

const EditTool: ToolCallMessagePartComponent<Record<string, unknown>, ToolResult> = (p): ReactNode => {
  const path = typeof p.args?.path === "string" ? p.args.path : "file"
  if (p.status?.type === "running") return <EditNote path={path} note="writing…" />
  if (p.result && !p.result.ok) return <EditNote path={path} note={p.result.summary ?? "failed"} tone="error" />
  if (!p.result?.diff) {
    // the tool reports a diff for every write that changed the file, so a
    // result without one means the file already held what was written
    return <EditNote path={path} note={p.result ? "no changes" : ""} />
  }
  return (
    <div className="my-1.5">
      <CodeDiff filename={path} diff={parseDiff(p.result.diff)} />
    </div>
  )
}

/** A picture image_generate drew: shown under the step, whatever the model writes
 *  afterwards; click opens it full size in a new tab. */
const ASSET_URL = /\/v1\/assets\/[0-9a-f]{64}/
const ImageTool: ToolCallMessagePartComponent<Record<string, unknown>, ToolResult> = (p): ReactNode => {
  const r = p.result as Partial<ToolResult> | undefined
  const url = r?.ok ? ASSET_URL.exec(`${r.summary ?? ""} ${r.output ?? ""}`)?.[0] : undefined
  if (!url) return <ToolFallback {...p} result={r?.output ?? r?.summary ?? p.result} />
  const prompt = typeof p.args?.prompt === "string" ? p.args.prompt : ""
  return (
    <figure className="my-2 flex flex-col gap-1">
      <a href={url} target="_blank" rel="noreferrer" className="block w-fit" title="Open full size">
        <img src={url} alt={prompt || "Generated picture"} loading="lazy" className="max-h-80 max-w-full rounded-lg border object-contain sm:max-w-sm" />
      </a>
      {prompt ? <figcaption className="line-clamp-2 max-w-sm text-[11px] text-muted-foreground" title={prompt}>{prompt}</figcaption> : null}
    </figure>
  )
}

const toolkit = defineToolkit({
  edit_file: { render: EditTool },
  write_file: { render: EditTool },
  // the card asks the user to act: outside the folded step list
  bug_solution: { render: BugSolutionTool, display: "standalone" },
  // the picture is the result: outside the folded step list
  image_generate: { render: ImageTool, display: "standalone" },
})

export const toolConfig = AuiConfig({ tools: Tools({ toolkit }) })

/** Engine results are `{ ok, summary, output?, diff? }`: the reader gets the
 *  whole output when the engine kept more than the summary. */
export const AgentToolFallback: ToolCallMessagePartComponent = (props) => {
  const r = props.result as Partial<ToolResult> | undefined
  const text = r && typeof r === "object" ? (r.output ?? r.summary) : undefined
  return <ToolFallback {...props} result={text ?? props.result} />
}
