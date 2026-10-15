// The Molfar page's copy of the guide state: the same `guide` setting the shell keeps, read
// and written through the same store-core (a save is a change applied on the stored state,
// so the shell's ids are never dropped). This page runs no What's new: the shell owns it.
import { useSyncExternalStore } from "react"
import { api } from "../api"
import type { GuideState } from "./guide"
import { createGuideStore, type GuideChange } from "./store-core"

const store = createGuideStore({
  get: () => api<{ guide?: GuideState | null }>("GET", "/v1/settings").then((r) => r.guide ?? undefined),
  put: (guide) => api("PUT", "/v1/settings", { guide }),
})

export const loadGuideState = store.load
export const guideNow = store.state

export const saveGuideState = (change: GuideChange): void => {
  void store.save(change)
}

export function useGuideState(): { state: GuideState | undefined; loaded: boolean } {
  const s = useSyncExternalStore(store.subscribe, store.state, () => undefined)
  const l = useSyncExternalStore(store.subscribe, store.loaded, () => false)
  return { state: s, loaded: l }
}
