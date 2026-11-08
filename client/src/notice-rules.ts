// When Molfar's page asks the shell to tell the user something (a question waits, a run
// finished or failed), and what the notice says. No DOM here, so tests can reach it.

export type NoticeKind = "ask" | "done" | "error"

export const NOTICE_KINDS: readonly NoticeKind[] = ["ask", "done", "error"]

export interface NoticeState {
  /** the user's switch for this browser */
  enabled: boolean
  /** Notification.permission, or "unsupported" */
  permission: string
  /** the shell's page is on screen (not another tab, not minimized) */
  visible: boolean
  /** the browser window has the keyboard focus */
  focused: boolean
  /** Molfar's page is what the user sees in the shell (its tab, or beside an app) */
  agentOnScreen: boolean
}

/** A notice is for someone who is not looking at Molfar. The chat strip and the list marks
 *  cover the user who is; a system notification on top of them would only nag. */
export function shouldShowNotice(s: NoticeState): boolean {
  if (!s.enabled || s.permission !== "granted") return false
  return !(s.visible && s.focused && s.agentOnScreen)
}

/** One notification per chat and meaning: a later one replaces the earlier instead of piling up. */
export const noticeTag = (kind: NoticeKind, chatId: string): string => `molfar-${kind === "ask" ? "ask" : "run"}-${chatId}`

// ---------- messages from apps (issue #310, step 5) ----------

export interface AppNoticeState {
  /** the user's switch for this app (default on) */
  appEnabled: boolean
  /** the user's switch for system notifications in this browser (Settings) */
  systemEnabled: boolean
  /** Notification.permission, or "unsupported" */
  permission: string
  /** the shell's page is on screen */
  visible: boolean
  /** the browser window has the keyboard focus */
  focused: boolean
  /** the app's tab is what the user sees (its tab, or beside Molfar in a split) */
  appOnScreen: boolean
}

/** How a message from an app reaches the user: nothing (its switch is off, or they are looking at the app, which shows
 *  it itself), a short popup in the shell's corner (they are in the shell, elsewhere), or a system notification (the
 *  window is not in front). The count on the app's tab is separate: it follows the app's own number either way. */
export function appNoticeMode(s: AppNoticeState): "none" | "popup" | "system" {
  if (!s.appEnabled) return "none"
  if (s.visible && s.focused) return s.appOnScreen ? "none" : "popup"
  return s.systemEnabled && s.permission === "granted" ? "system" : "none"
}
