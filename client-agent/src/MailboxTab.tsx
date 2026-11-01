// The Mailbox tab of "Memory and skills" (#175): proposals Molfar left for later. Accept writes the entry the way
// a card's Save does (a commit, so it can be undone from history); Skip drops it and the agent is told not to bring it back.
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, EnvelopeSimple, X } from "@phosphor-icons/react"
import { useState, type ReactNode } from "react"
import { mailboxApi, type MailItem } from "./api"
import { useMailbox } from "./mailbox"

const FROM: Record<MailItem["from"], string> = {
  "after-run": "Suggested after a long task",
  later: "You chose Later on a card",
  unanswered: "Nobody was there to answer",
}

const KIND = {
  add: { label: "New memory", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", yes: "Save" },
  replace: { label: "Update", chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300", yes: "Replace" },
  retire: { label: "Remove", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300", yes: "Remove" },
} as const

const when = (at: number): string => {
  const days = Math.floor((Date.now() - at) / 86_400_000)
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`
}

function Item({ item, onDone }: { item: MailItem; onDone: (message?: string) => void }): ReactNode {
  const kind = KIND[item.kind]
  const [text, setText] = useState(item.entry ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const act = async (fn: () => Promise<{ text?: string } | unknown>) => {
    setBusy(true)
    setError(null)
    try {
      const r = (await fn()) as { text?: string } | undefined
      onDone(r?.text)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }
  const empty = item.kind !== "retire" && !text.trim()
  return (
    <li className="grid gap-2 rounded-xl border p-3" data-testid="mail-item">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={cn("rounded-full px-2 py-0.5 font-medium", kind.chip)}>{kind.label}</span>
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5">{item.scopeLabel}</span>
        {item.topic ? <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5">topic {item.topic}</span> : null}
        <span className="text-muted-foreground ml-auto">{FROM[item.from]}, {when(item.at)}</span>
      </div>
      {item.kind !== "add" ? (
        <p className="bg-muted/60 text-muted-foreground rounded-lg px-2.5 py-1.5 text-sm">
          {item.kind === "retire" ? "No longer true: " : "Replaces: "}
          {item.target ?? <em>that entry is not in memory any more</em>}
        </p>
      ) : null}
      {item.kind !== "retire" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(8, Math.max(3, Math.ceil(text.length / 40)))}
          aria-label="Entry text. Edit it before you save it."
          className="border-input bg-background focus-visible:ring-ring/50 w-full resize-y rounded-lg border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-1"
        />
      ) : null}
      {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" className="max-md:h-10" disabled={busy} onClick={() => void act(() => mailboxApi.skip(item.id))}>
          <X size={14} /> Skip
        </Button>
        <Button size="sm" className="max-md:h-10" disabled={busy || empty || (item.kind !== "add" && !item.target)} onClick={() => void act(() => mailboxApi.accept(item.id, item.kind === "retire" ? undefined : text))}>
          <Check size={14} /> {kind.yes}
        </Button>
      </div>
    </li>
  )
}

export function MailboxTab({ onChanged }: { onChanged: () => void }): ReactNode {
  const { items, loaded, refresh } = useMailbox()
  const [note, setNote] = useState<string | null>(null)
  const [sure, setSure] = useState(false)
  const done = (message?: string) => {
    setNote(message ? message.split("\n")[0]! : null)
    void refresh()
    // a saved entry changes the memory tab
    onChanged()
  }
  if (!loaded) return <p className="text-muted-foreground text-sm">Loading…</p>
  if (!items.length) {
    return (
      <div className="text-muted-foreground grid justify-items-center gap-2 py-8 text-center text-sm" data-testid="mail-empty">
        <EnvelopeSimple size={28} aria-hidden />
        <p className="text-foreground font-medium">Nothing waiting</p>
        <p className="max-w-sm">When Molfar has a memory to suggest after a long task, or you press Later on a card, it waits here until you decide.</p>
        {note ? <p role="status" className="text-foreground">{note}</p> : null}
      </div>
    )
  }
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm">{items.length} waiting. Nothing is saved until you press the button on its card.</p>
        <Button
          variant={sure ? "destructive" : "ghost"}
          size="sm"
          className="ml-auto max-md:h-10"
          onClick={() => {
            if (!sure) return setSure(true)
            setSure(false)
            void mailboxApi.skipAll().then(() => done())
          }}
          onBlur={() => setSure(false)}
        >
          {sure ? `Skip all ${items.length}?` : "Skip all"}
        </Button>
      </div>
      {note ? <p role="status" className="text-muted-foreground text-sm">{note}</p> : null}
      <ul className="grid gap-2">
        {items.map((i) => <Item key={i.id} item={i} onDone={done} />)}
      </ul>
    </div>
  )
}
