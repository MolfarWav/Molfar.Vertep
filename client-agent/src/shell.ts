// The agent page runs in the shell's frame; a few things it asks the shell to do.

/** True when the page sits in the shell (not opened on its own at /agent). */
export const inShell = (): boolean => window.parent !== window

/** Tell the shell a question waits for an answer (or that none does): it shows a popup when
 *  this page is not on screen. The answer itself is always given here. */
export function announceAsk(ask: { id: string; question: string } | null): void {
  if (!inShell()) return
  window.parent.postMessage(
    { __chrysalisAgent: "ask", open: ask !== null, ...(ask ? { id: ask.id, question: ask.question.slice(0, 300) } : {}) },
    location.origin,
  )
}

/** Switch the shell to an app's tab (the project pane's "Open app"). */
export function openShellApp(appId: string): void {
  if (inShell()) window.parent.postMessage({ __chrysalisAgent: "open-app", appId }, location.origin)
}
