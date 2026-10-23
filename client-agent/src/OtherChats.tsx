// The strip under the header: the other chats that are working, wait for an answer or
// finished while this one was open. The chat list shows the same marks, but on a phone
// the list is behind the drawer button, and a question that waits there would sit unseen.
import { cn } from "@/lib/utils"
import { CheckCircle, CircleNotch, Question } from "@phosphor-icons/react"
import { useMemo, type ReactNode } from "react"
import { otherChats, type OtherChat } from "./parallel"
import { useAgent } from "./store"

const SHOWN = 3

const LABEL = { waiting: "needs your answer", running: "working", finished: "finished" } as const

function Chip({ chat }: { chat: OtherChat }): ReactNode {
  const open = useAgent((s) => s.open)
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-7 max-w-[11rem] min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-start pointer-coarse:min-h-10",
        chat.mark === "waiting" ? "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-300" : "hover:bg-muted",
      )}
      title={`${chat.title}: ${LABEL[chat.mark]}`}
      onClick={() => void open(chat.id)}
    >
      {chat.mark === "running" ? (
        <CircleNotch aria-hidden className="text-muted-foreground size-3.5 shrink-0 animate-spin" />
      ) : chat.mark === "waiting" ? (
        <Question aria-hidden weight="bold" className="size-3.5 shrink-0" />
      ) : (
        <CheckCircle aria-hidden weight="fill" className="size-3.5 shrink-0 text-emerald-500" />
      )}
      <span className="truncate">{chat.title}</span>
      <span className="sr-only">{LABEL[chat.mark]}</span>
    </button>
  )
}

export function OtherChatsStrip(): ReactNode {
  const sessions = useAgent((s) => s.sessions)
  const sessionId = useAgent((s) => s.sessionId)
  const unseen = useAgent((s) => s.unseen)
  const chats = useMemo(() => otherChats(sessions, sessionId, unseen), [sessions, sessionId, unseen])
  if (!chats.length) return null
  const label = chats.some((c) => c.mark === "waiting") ? "Waiting for you:" : chats.some((c) => c.mark === "running") ? "Other chats:" : "Finished while you were away:"
  return (
    <div role="status" aria-label="Other chats" className="flex min-h-9 shrink-0 flex-wrap items-center gap-1.5 border-b px-3 py-1 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      {chats.slice(0, SHOWN).map((c) => (
        <Chip key={c.id} chat={c} />
      ))}
      {chats.length > SHOWN ? <span className="text-muted-foreground">+{chats.length - SHOWN} more in the list</span> : null}
    </div>
  )
}
