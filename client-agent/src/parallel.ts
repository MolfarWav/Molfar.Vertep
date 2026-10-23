// Several chats run at once (#69). The page shows one chat; a run whose chat
// is left keeps going on the engine, and these helpers keep what the page
// needs to show it again: the messages the stream built so far, the marks
// the chat list and the strip under the header show.
import type { EngineSession } from "./api.js"
import { applyStreamEvent, type Msg } from "./runs.js"
import type { StreamEvent } from "./streaming.js"

/** A run the page keeps while its chat is not the open one. The stream goes on
 *  filling it, so opening the chat again shows the live progress. */
export interface ParkedRun {
  msgs: Msg[]
  /** id of the assistant message the stream writes into */
  liveId: string | null
  /** corrections the model has not read yet */
  steerPending: { id: string; text: string }[]
  spend: unknown
  usage: unknown
}

let seq = 0

/** The id of a new chat. The engine accepts the page's own id, so the page knows it
 *  from the first click on Send and can leave the chat while its first run goes on. */
export function newSessionId(now: Date = new Date(), rand: () => number = Math.random): string {
  const tail = Math.floor(rand() * 36 ** 6)
    .toString(36)
    .padStart(6, "0")
  seq = (seq + 1) % 36
  return `${now.toISOString().slice(0, 10)}-${tail}${seq.toString(36)}`
}

/** One stream event of a parked run, folded into its messages (in place: the page
 *  no longer holds this array). */
export function foldParked(run: ParkedRun, ev: StreamEvent): void {
  if (ev.type === "steer_landed") {
    const at = run.steerPending.findIndex((p) => p.text === ev.text)
    if (at >= 0) run.steerPending = run.steerPending.filter((_, i) => i !== at)
    return
  }
  if (ev.type !== "text" && ev.type !== "thinking" && ev.type !== "thinking_end" && ev.type !== "tool_start" && ev.type !== "tool_end" && ev.type !== "retry") return
  let at = -1
  for (let i = run.msgs.length - 1; i >= 0 && at < 0; i--) if (run.msgs[i]?.id === run.liveId) at = i
  if (at < 0) {
    // the first event of a message the page has not drawn yet
    run.liveId ??= `live-${Date.now().toString(36)}`
    run.msgs.push({ id: run.liveId, role: "assistant", parts: [], streaming: true })
    at = run.msgs.length - 1
  }
  const m = run.msgs[at]
  if (m) run.msgs[at] = { ...m, parts: applyStreamEvent(m.parts, ev) }
}

export type RowMark = "waiting" | "running" | "finished" | null

/** What the chat list shows beside a chat that is not the open one. A question
 *  that waits beats a run in progress, and both beat a finished run nobody opened. */
export function rowMark(row: Pick<EngineSession, "sessionId"> & Partial<Pick<EngineSession, "running" | "waiting">>, openId: string | null, unseen: Readonly<Record<string, true>>): RowMark {
  if (row.sessionId === openId) return null
  if (row.waiting) return "waiting"
  if (row.running) return "running"
  return unseen[row.sessionId] ? "finished" : null
}

export interface OtherChat {
  id: string
  title: string
  mark: Exclude<RowMark, null>
}

/** The chats beside the open one that want a look: waiting first, then working, then finished. */
export function otherChats(sessions: readonly EngineSession[], openId: string | null, unseen: Readonly<Record<string, true>>): OtherChat[] {
  const order = { waiting: 0, running: 1, finished: 2 } as const
  const out: OtherChat[] = []
  for (const s of sessions) {
    if (s.archived) continue
    const mark = rowMark(s, openId, unseen)
    if (mark) out.push({ id: s.sessionId, title: s.title?.trim() || "Untitled", mark })
  }
  return out.sort((a, b) => order[a.mark] - order[b.mark])
}
