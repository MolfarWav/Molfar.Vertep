// The guide's state holder without React or the HTTP client, so the shell and the Molfar page
// (two documents of one account, both writing the `guide` setting) share it and a test can
// drive it with a fake transport.
//
// A save is a CHANGE (a function of the state), not a finished state. It shows at once on this
// frame's copy, then is applied again on top of what the server holds right before the write,
// so ids the other frame saved meanwhile are never dropped. Writes of one frame are serialized.
import type { GuideState } from "./guide.js"

export interface GuideIo {
  /** The stored state (`undefined` = none yet); rejects when it cannot be read. */
  get: () => Promise<GuideState | undefined>
  put: (state: GuideState) => Promise<unknown>
}

export type GuideChange = (current: GuideState | undefined) => GuideState

export function createGuideStore(io: GuideIo) {
  let state: GuideState | undefined
  let loaded = false
  let queue: Promise<unknown> = Promise.resolve()
  const listeners = new Set<() => void>()
  const emit = () => {
    for (const l of listeners) l()
  }
  return {
    subscribe(l: () => void) {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    state: (): GuideState | undefined => state,
    loaded: (): boolean => loaded,
    /** Read the stored state; a failure leaves the default (none). */
    async load(): Promise<void> {
      try {
        state = await io.get()
      } catch {
        state = undefined
      }
      loaded = true
      emit()
    },
    /** Sign-out: forget it, so the next account loads its own. */
    clear(): void {
      state = undefined
      loaded = false
      emit()
    },
    /** Apply `change` here at once, then on the freshly read stored state, and write that. */
    save(change: GuideChange): Promise<void> {
      state = change(state)
      emit()
      const job = queue.then(async () => {
        let fresh: GuideState | undefined
        try {
          fresh = await io.get()
        } catch {
          // cannot read it: keep this frame's copy and write it as it is
          fresh = state
        }
        const next = change(fresh)
        state = next
        emit()
        await io.put(next).catch(() => undefined)
      })
      // a failed save must not stop the ones after it
      queue = job.catch(() => undefined)
      return job
    },
  }
}
