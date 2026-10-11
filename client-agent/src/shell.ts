// The agent page runs in the shell's frame; a few things it asks the shell to do.

/** True when the page sits in the shell (not opened on its own at /agent). */
export const inShell = (): boolean => window.parent !== window

/** Switch the shell to an app's tab (the project pane's "Open app"). */
export function openShellApp(appId: string): void {
  if (inShell()) window.parent.postMessage({ __chrysalisAgent: "open-app", appId }, location.origin)
}
