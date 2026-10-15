// Window events between the guide and the parts of the page it points into.

/** detail: { name: "memory" | "skills" | "inspector"; open: boolean }. A dialog opens or closes. */
export const GUIDE_PANEL_EVENT = "agent-guide-panel"
/** The help list opens (the Help buttons). */
export const GUIDE_HELP_EVENT = "agent-guide-help"

export const openHelp = (): void => {
  window.dispatchEvent(new CustomEvent(GUIDE_HELP_EVENT))
}

export const panel = (name: "memory" | "skills" | "inspector", open: boolean): void => {
  window.dispatchEvent(new CustomEvent(GUIDE_PANEL_EVENT, { detail: { name, open } }))
}

/** True when `event` happened on the guide's own overlay: a dialog the guide points into
 *  must not close because the user pressed Next on the bubble. */
export function guideTarget(event: Event | undefined): boolean {
  const near = (n: EventTarget | null | undefined) => n instanceof Element && n.closest("[data-guide-overlay]") !== null
  return near(event?.target) || near((event as FocusEvent | undefined)?.relatedTarget)
}
