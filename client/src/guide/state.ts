// The guide's state: the `guide` key of the user's settings (/v1/settings), so two machines
// on one account do not repeat each other. A small module store the host, the Settings
// block and the tests of the shell can share.
import { useSyncExternalStore } from "react"
import { api } from "../api"
import type { GuideState } from "./guide"

let state: GuideState | undefined
let loaded = false
const listeners = new Set<() => void>()
const emit = () => {
  for (const l of listeners) l()
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Read the stored state once the user is signed in. A failure leaves the default (no state). */
export async function loadGuideState(): Promise<void> {
  try {
    const r = await api<{ guide?: GuideState | null }>("GET", "/v1/settings")
    state = r.guide ?? undefined
  } catch {
    state = undefined
  }
  loaded = true
  emit()
}

/** Sign-out: forget it, so the next account loads its own. */
export function clearGuideState(): void {
  state = undefined
  loaded = false
  emit()
}

export const guideNow = (): GuideState | undefined => state

/** Show the new state at once and write it; a failed write keeps the local copy for this visit. */
export function saveGuideState(next: GuideState): void {
  state = next
  emit()
  void api("PUT", "/v1/settings", { guide: next }).catch(() => undefined)
}

export function useGuideState(): { state: GuideState | undefined; loaded: boolean } {
  const s = useSyncExternalStore(subscribe, () => state, () => undefined)
  const l = useSyncExternalStore(subscribe, () => loaded, () => false)
  return { state: s, loaded: l }
}
