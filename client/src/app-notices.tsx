// Messages from apps (issue #310, step 5). An official app tells the shell, over the bridge, how many things wait for the
// user ("count": a number on its tab) and, when something new arrives, a short message ("title" and "text": a popup in the
// corner of the shell, or a system notification when the window is not in front). The shell decides how it reaches the
// user (notice-rules.ts, appNoticeMode); the user's switch per app is on the app's page on Home.
import { useCallback, useEffect, useRef, useState } from "react"
import { IconSmall } from "./ui/icon"
import { tr } from "./i18n/index"
import { appNoticeEnabled, askPermissionOnce, notifyEnabled, notifyPermission, setAppNoticeEnabled, showAppSystemNotice } from "./notice"
import { appNoticeMode } from "./notice-rules"

/** What the bridge hands over (app-bridge-host.js, shellRequest "notify"): already cleaned. */
export interface AppNotifyRequest {
  op: "notify"
  count: number | null
  title: string
  text: string
}

export interface AppToast {
  id: number
  appId: string
  appName: string
  title: string
  text: string
}

export const APP_NOTICE_SWITCH_EVENT = "molfar:app-notice-switch"
const MAX_TOASTS = 3
const TOAST_MS = 9000
const MIN_GAP_MS = 5000

export interface AppNoticesDeps {
  /** the app whose tab (or split pane) the user is looking at, if any */
  onScreen: () => string[]
  nameOf: (appId: string) => string
  openApp: (appId: string) => void
}

/** The counts on app tabs, the popups, and the entry point the shell's bridge handler calls. */
export function useAppNotices(deps: AppNoticesDeps) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [toasts, setToasts] = useState<AppToast[]>([])
  const last = useRef<Record<string, number>>({})
  const seq = useRef(0)
  const d = useRef(deps)
  d.current = deps

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  // the user switched an app's notifications off: its number goes too
  useEffect(() => {
    const on = (e: Event) => {
      const { appId, on: enabled } = (e as CustomEvent<{ appId: string; on: boolean }>).detail ?? {}
      if (appId && enabled === false) setCounts((c) => ({ ...c, [appId]: 0 }))
    }
    window.addEventListener(APP_NOTICE_SWITCH_EVENT, on)
    return () => window.removeEventListener(APP_NOTICE_SWITCH_EVENT, on)
  }, [])

  const notify = useCallback((appId: string, req: AppNotifyRequest): { shown: "none" | "popup" | "system" } => {
    const enabled = appNoticeEnabled(appId)
    if (!enabled) {
      setCounts((c) => (c[appId] ? { ...c, [appId]: 0 } : c))
      return { shown: "none" }
    }
    if (req.count !== null) setCounts((c) => (c[appId] === req.count ? c : { ...c, [appId]: req.count! }))
    if (!req.text) return { shown: "none" }
    // an app that talks too much is heard at most once in a few seconds; its number still follows
    const now = Date.now()
    if (now - (last.current[appId] ?? 0) < MIN_GAP_MS) return { shown: "none" }
    const mode = appNoticeMode({
      appEnabled: enabled,
      systemEnabled: notifyEnabled(),
      permission: notifyPermission(),
      visible: document.visibilityState === "visible",
      focused: document.hasFocus(),
      appOnScreen: d.current.onScreen().includes(appId),
    })
    if (mode === "none") return { shown: "none" }
    last.current[appId] = now
    const appName = d.current.nameOf(appId)
    const title = req.title || appName
    if (mode === "popup") {
      const id = ++seq.current
      setToasts((t) => [...t.slice(-(MAX_TOASTS - 1)), { id, appId, appName, title, text: req.text }])
      setTimeout(() => dismiss(id), TOAST_MS)
    } else {
      showAppSystemNotice({ appId, title: req.title ? `${appName}: ${req.title}` : appName, text: req.text, onOpen: d.current.openApp })
    }
    return { shown: mode }
  }, [dismiss])

  return { counts, toasts, notify, dismiss }
}

/** The popups: bottom right, small, one click opens the app. */
export function AppToasts(props: { toasts: AppToast[]; onOpen: (appId: string, toastId: number) => void; onClose: (toastId: number) => void }) {
  if (!props.toasts.length) return null
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[320px] max-w-[calc(100vw-1rem)] flex-col gap-2 max-md:bottom-2 max-md:right-2">
      {props.toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-start gap-2 rounded-[10px] border border-line bg-panel-raised p-3 text-ink shadow-[var(--s-raised)]">
          <button className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => props.onOpen(t.appId, t.id)} title={tr("Open {name}", { name: t.appName })}>
            <span className="block truncate text-13 font-medium">{t.title}</span>
            <span className="mt-0.5 line-clamp-2 block text-12 leading-4 text-ink-muted">{t.text}</span>
          </button>
          <button
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-faint hover:bg-hover hover:text-ink max-md:size-10"
            onClick={() => props.onClose(t.id)}
            aria-label={tr("Close")}
            title={tr("Close")}
          >
            <IconSmall name="xmark-small" />
          </button>
        </div>
      ))}
    </div>
  )
}

/** The number on an app's tab. */
export function TabCount(props: { n: number }) {
  if (props.n <= 0) return null
  return (
    <span
      className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-10 font-semibold leading-none text-white"
      aria-label={tr("{n} new", { n: props.n })}
      title={tr("{n} new", { n: props.n })}
    >
      {props.n > 99 ? "99+" : props.n}
    </span>
  )
}

/** The user's switch for one app, on its page on Home (shown for official apps, the ones that may send messages). */
export function AppNoticeSwitch(props: { appId: string }) {
  const [on, setOn] = useState(() => appNoticeEnabled(props.appId))
  useEffect(() => setOn(appNoticeEnabled(props.appId)), [props.appId])
  return (
    <div className="flex flex-col gap-1 border-b border-line px-4 py-3">
      <label className="flex items-center gap-2 text-13 text-ink">
        <input
          type="checkbox"
          className="size-4 accent-[var(--c-contrast)]"
          checked={on}
          onChange={(e) => {
            const next = e.currentTarget.checked
            setOn(next)
            setAppNoticeEnabled(props.appId, next)
            window.dispatchEvent(new CustomEvent(APP_NOTICE_SWITCH_EVENT, { detail: { appId: props.appId, on: next } }))
            if (next) askPermissionOnce()
          }}
        />
        {tr("Notifications from this app")}
      </label>
      <p className="pl-6 text-12 leading-4 text-ink-muted">{tr("A number on its tab and a short message when it has something new for you.")}</p>
    </div>
  )
}
