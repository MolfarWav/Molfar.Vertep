// The mailbox (#175): what Molfar left for the user to settle later. One shared list, read once and then every
// half minute while the page is visible, so the badge on the Memory button and the Mailbox tab show the same count.
import { create } from "zustand"
import { mailboxApi, type MailItem } from "./api"

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
}
