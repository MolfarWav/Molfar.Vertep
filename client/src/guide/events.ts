// Window events between the guide and the screens it points into: the screen owns its
// own state, the guide only asks.

/** detail: "open" | "close". The account menu (top right) opens or closes. */
export const GUIDE_MENU_EVENT = "guide-account-menu"
/** The Store dialog opens (the start page must be showing). */
export const GUIDE_STORE_EVENT = "guide-open-store"
/** The help list opens (the account menu's Help, the start page's Help link). */
export const GUIDE_HELP_EVENT = "guide-open-help"

/** True when `event` happened on the guide's own overlay: a dialog the guide points into
 *  must not close because the user pressed Next on the bubble. */
export function guideTarget(event: Event | undefined): boolean {
  // a pointer press has a target; a focus leaving the dialog has the overlay's button as relatedTarget
  const near = (n: EventTarget | null | undefined) => n instanceof Element && n.closest("[data-guide-overlay]") !== null
  return near(event?.target) || near((event as FocusEvent | undefined)?.relatedTarget)
}

export const openHelp = (): void => {
  window.dispatchEvent(new CustomEvent(GUIDE_HELP_EVENT))
}
