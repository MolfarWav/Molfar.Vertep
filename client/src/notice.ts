// System notifications (the corner of the screen on Windows) for what Molfar's page reports while
// the user is elsewhere. The page runs in a frame, so the shell, the top document, owns the
// permission, the window state and the notification itself. Rules: notice-rules.ts.
import { tr } from "./i18n"
import { prefs } from "./prefs"
import { noticeTag, shouldShowNotice, type NoticeKind } from "./notice-rules"

const KEY = "molfar-notify"
const ASKED = "molfar-notify-asked"

/** On by default; a browser asks for its permission once, so the switch is per browser. */
export const notifyEnabled = (): boolean => prefs.get(KEY) !== "off"
export const setNotifyEnabled = (on: boolean): void => prefs.set(KEY, on ? "on" : "off")

export type NotifyPermission = NotificationPermission | "unsupported"
export const notifyPermission = (): NotifyPermission => (typeof Notification === "undefined" ? "unsupported" : Notification.permission)

/** Ask the browser once, at the user's first click or key in the shell (browsers want a gesture).
 *  A "no" is the browser's to remember: Settings says how to undo it. */
export function askPermissionOnFirstGesture(): () => void {
  if (!notifyEnabled() || notifyPermission() !== "default" || prefs.get(ASKED)) return () => undefined
  const ask = () => {
    off()
    prefs.set(ASKED, "1")
    void Notification.requestPermission().catch(() => undefined)
  }
  const off = () => {
    window.removeEventListener("pointerdown", ask, true)
    window.removeEventListener("keydown", ask, true)
  }
  window.addEventListener("pointerdown", ask, true)
  window.addEventListener("keydown", ask, true)
  return off
}

/** Settings' own request, from a click. */
export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (typeof Notification === "undefined") return "unsupported"
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

const shown = new Map<string, Notification>()

/** The user came back: what was said to them is no use any more. */
export function closeNotices(): void {
  for (const n of shown.values()) n.close()
  shown.clear()
}

export interface NoticeRequest {
  kind: NoticeKind
  chatId: string
  /** the chat's title, or the question */
  text: string
  /** the user is looking at Molfar's page in the shell */
  agentOnScreen: boolean
  /** click: bring the shell forward and open the chat */
  onOpen: (chatId: string) => void
}

const heading = (kind: NoticeKind): string =>
  kind === "ask" ? tr("Molfar is asking you") : kind === "done" ? tr("Molfar finished") : tr("Molfar stopped with an error")

export function showNotice(req: NoticeRequest): void {
  const ok = shouldShowNotice({
    enabled: notifyEnabled(),
    permission: notifyPermission(),
    visible: document.visibilityState === "visible",
    focused: document.hasFocus(),
    agentOnScreen: req.agentOnScreen,
  })
  if (!ok) return
  try {
    const tag = noticeTag(req.kind, req.chatId)
    const n = new Notification(heading(req.kind), { body: req.text.slice(0, 200), tag })
    n.onclick = () => {
      n.close()
      window.focus()
      req.onOpen(req.chatId)
    }
    n.onclose = () => {
      if (shown.get(tag) === n) shown.delete(tag)
    }
    shown.set(tag, n)
  } catch {
    // a browser that refuses (a locked-down profile): the in-page cards still say it
  }
}

/** Settings' test: shown even while the window is in front, so the user sees what it looks like. */
export function showTestNotice(): void {
  try {
    new Notification(tr("Molfar finished"), { body: tr("This is how Molfar will tell you."), tag: "molfar-test" })
  } catch {
    // see showNotice
  }
}
