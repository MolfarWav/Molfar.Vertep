// Where the user is, as far as the guide cares: a screen reports its place while it is
// mounted. A tiny module store: the newest report wins, and when it goes away the one
// under it (the start page under the Store) is current again.
import { useEffect, useSyncExternalStore } from "react"
import type { Place } from "./guide"

interface Entry {
  place: Place
}

let stack: Entry[] = []
let current: Place | null = null
const listeners = new Set<() => void>()

const publish = () => {
  const next = stack[stack.length - 1]?.place ?? null
  if (next === current) return
  current = next
  for (const l of listeners) l()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** The screen that draws `place` calls this; `ready` false = it is mounted but not
 *  showing its content yet (loading), so no tour should start on it. */
export function useGuidePlace(place: Place, ready = true): void {
  useEffect(() => {
    if (!ready) return
    const entry: Entry = { place }
    stack.push(entry)
    publish()
    return () => {
      stack = stack.filter((e) => e !== entry)
      publish()
    }
  }, [place, ready])
}

/** The place the user is on now, or null. */
export function useCurrentPlace(): Place | null {
  return useSyncExternalStore(subscribe, () => current, () => null)
}

/** A place report as an element, for a screen that is a conditional branch of a bigger component. */
export function GuidePlace(props: { place: Place; ready?: boolean }): null {
  useGuidePlace(props.place, props.ready ?? true)
  return null
}
