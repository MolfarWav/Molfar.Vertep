// What each app's builder is doing right now (#524). The builder lives in the
// shell page (src/builder/browser/host.ts) and reports to whichever pane
// watches the app; this small store lets the other places that show a build
// (the account menu's Rebuild, the Developer settings) see the same state.
import { useEffect, useState, useSyncExternalStore } from "react"

export type AppBuildEntry = {
  phase: AppBuildStatus["phase"]
  since?: number
  step?: "app" | "packages"
  message?: string
}

const entries = new Map<string, AppBuildEntry>()
const listeners = new Set<() => void>()

/** The pane that watches an app calls this on every status; null when it stops watching. */
export function setAppBuild(id: string, s: AppBuildStatus | null): void {
  if (!s) entries.delete(id)
  else entries.set(id, { phase: s.phase, since: s.since, step: s.step, message: s.message })
  for (const l of listeners) l()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAppBuild(id: string): AppBuildEntry | undefined {
  return useSyncExternalStore(subscribe, () => entries.get(id))
}

/** Every app that is being built now, by id. */
export function useBuildingApps(): Record<string, AppBuildEntry> {
  const [, bump] = useState(0)
  useEffect(() => {
    const off = subscribe(() => bump((n) => n + 1))
    return () => {
      off()
    }
  }, [])
  return Object.fromEntries([...entries].filter(([, e]) => isBuilding(e)))
}

/** A build is running (or about to): the app is not ready to show what was just changed. */
export function isBuilding(e: AppBuildEntry | undefined): boolean {
  return e?.phase === "building" || e?.phase === "checking"
}

/** The current time, ticking each second while `active`. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [active])
  return now
}

/** 83 seconds is "1:23". */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/** How long the build has run, or "" when it did not say when it started. */
export function elapsedOf(e: AppBuildEntry | undefined, now: number): string {
  return e && isBuilding(e) && e.since ? formatElapsed(now - e.since) : ""
}
