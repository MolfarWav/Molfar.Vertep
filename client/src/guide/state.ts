// The guide's state: the `guide` key of the user's settings (/v1/settings), so two machines
// on one account do not repeat each other. The Molfar page (another document of the same
// account) writes it too, so a save is a change applied on the stored state (store-core.ts).
import { useSyncExternalStore } from "react"
import { api } from "../api"
import type { GuideState } from "./guide"
import { createGuideStore, type GuideChange } from "./store-core"

const store = createGuideStore({
  get: () => api<{ guide?: GuideState | null }>("GET", "/v1/settings").then((r) => r.guide ?? undefined),
  put: (guide) => api("PUT", "/v1/settings", { guide }),
})

export const loadGuideState = store.load
export const clearGuideState = store.clear
export const guideNow = store.state

/** Show the change at once and write it on top of what is stored (never losing the other frame's ids). */
export const saveGuideState = (change: GuideChange): void => {
  void store.save(change)
}

export function useGuideState(): { state: GuideState | undefined; loaded: boolean } {
  const s = useSyncExternalStore(store.subscribe, store.state, () => undefined)
  const l = useSyncExternalStore(store.subscribe, store.loaded, () => false)
  return { state: s, loaded: l }
}
