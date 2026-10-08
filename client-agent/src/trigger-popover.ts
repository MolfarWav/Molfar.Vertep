import { useCallback, useRef } from "react"

/**
 * Keep the highlighted row inside the scroll box of a trigger popover ("/" and
 * "@" share it).
 *
 * Without this, holding the down arrow walks the highlight past the bottom of
 * the popover and out of sight: the list stays put while the selection keeps
 * going, and the page scrolls instead. The highlight is an attribute the
 * library toggles rather than anything React re-renders here, so a ref
 * callback never sees it — an observer does.
 */
export function useScrollHighlightIntoView(): (el: HTMLDivElement | null) => void {
  const observer = useRef<MutationObserver | undefined>(undefined)
  return useCallback((box: HTMLDivElement | null) => {
    observer.current?.disconnect()
    if (!box) return
    const show = () => box.querySelector<HTMLElement>("[data-highlighted]")?.scrollIntoView({ block: "nearest" })
    observer.current = new MutationObserver(show)
    observer.current.observe(box, { subtree: true, attributes: true, attributeFilter: ["data-highlighted"], childList: true })
    show()
  }, [])
}
