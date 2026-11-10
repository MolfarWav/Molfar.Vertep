// The mailbox (#175): what Molfar left for the user to settle later. One shared list, read once, then every half
// minute while the page is visible, and at once when something that fills it happens (a run ends, a card is answered),
// so the badge on the Memory button and the Mailbox tab show the same count without waiting for the next poll.
import { create } from "zustand"
import { mailboxApi, type MailItem } from "./api"
import { useAgent } from "./store"

interface MailboxState {
  items: MailItem[]
  /** the first read finished (a missing answer is an empty mailbox, not an error) */
  loaded: boolean
  refresh: () => Promise<void>
}

export const useMailbox = create<MailboxState>((set) => ({
  items: [],
  loaded: false,
  refresh: async () => {
    try {
      const { items } = await mailboxApi.list()
      set({ items, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },
}))

let started = false
/** Start the shared reader once, however many Memory buttons are on the page. */
export function startMailboxPolling(): void {
  if (started || typeof window === "undefined") return
  started = true
  const tick = () => {
    if (document.visibilityState === "visible") void useMailbox.getState().refresh()
  }
  tick()
  setInterval(tick, 30_000)
  window.addEventListener("focus", tick)
  // A run that ends (the after-run pass queues before it does), a chat that finishes in the background and a card
  // that was answered ("Later" queues a moment after the answer) all change the list: read it again shortly after.
  let timer: number | undefined
  const soon = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(tick, 500)
  }
  const running = (sessions: readonly { running?: boolean }[]): number => sessions.filter((x) => x.running).length
  useAgent.subscribe((s, prev) => {
    if ((prev.running && !s.running) || (prev.ask && !s.ask) || running(s.sessions) < running(prev.sessions)) soon()
  })
}
