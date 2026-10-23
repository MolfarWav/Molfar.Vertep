// The agent page runs in the shell's frame; a few things it asks the shell to do.

/** True when the page sits in the shell (not opened on its own at /agent). */
export const inShell = (): boolean => window.parent !== window

/** Tell the shell a question waits for an answer (or that none does): it shows a popup when
 *  this page is not on screen. The answer itself is always given here. */
export function announceAsk(ask: { id: string; question: string; chatId: string } | null): void {
  if (!inShell()) return
  window.parent.postMessage(
    { __chrysalisAgent: "ask", open: ask !== null, ...(ask ? { id: ask.id, chatId: ask.chatId, question: ask.question.slice(0, 300) } : {}) },
    location.origin,
  )
}

/** Tell the shell something happened in a chat the user may not be looking at: a question waits
 *  ("ask"), a run finished ("done") or failed ("error"). The shell decides whether to say it. */
export function announceNotice(n: { kind: "ask" | "done" | "error"; chatId: string; text: string }): void {
  if (!inShell()) return
  window.parent.postMessage({ __chrysalisAgent: "notice", kind: n.kind, chatId: n.chatId, text: n.text.slice(0, 200) }, location.origin)
}

/** Switch the shell to an app's tab (the project pane's "Open app"). */
export function openShellApp(appId: string): void {
  if (inShell()) window.parent.postMessage({ __chrysalisAgent: "open-app", appId }, location.origin)
}
