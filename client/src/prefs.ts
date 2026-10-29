/** Browser-persisted UI preferences (theme, language, tab strip, split).
 *  Touching localStorage THROWS where a browser blocks site data (private
 *  windows, "block all cookies", an embedded frame). The shell reads these
 *  while it is being constructed, so an unguarded read there takes down the whole
 *  app before it paints. */

/** The keys were chrysalis-* up to 1.7.x (#66). Moved once, before anything
 *  reads them; a key already under the new name wins. The same list is in
 *  client-agent/src/legacy-prefs.ts (the agent page can open on its own). */
const RENAMED_KEYS: [from: string, to: string][] = [
  ["chrysalis-theme", "molfar-theme"],
  ["chrysalis-theme-vars", "molfar-theme-vars"],
  ["chrysalis-theme-scheme", "molfar-theme-scheme"],
  ["chrysalis-lang", "molfar-lang"],
  ["chrysalis-session-tabs", "molfar-session-tabs"],
  ["chrysalis-split-pct", "molfar-split-pct"],
  ["chrysalis-avatar-v", "molfar-avatar-v"],
]
try {
  for (const [from, to] of RENAMED_KEYS) {
    const value = localStorage.getItem(from)
    if (value === null) continue
    if (localStorage.getItem(to) === null) localStorage.setItem(to, value)
    localStorage.removeItem(from)
  }
  // composer drafts: one key per chat
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith("chrysalis.agent.draft.")) continue
    const to = `molfar.agent.draft.${key.slice("chrysalis.agent.draft.".length)}`
    if (localStorage.getItem(to) === null) localStorage.setItem(to, localStorage.getItem(key) ?? "")
    localStorage.removeItem(key)
  }
} catch {
  // blocked site data: nothing was stored, nothing to move
}

export const prefs = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // preference is session-only; never fail the action it rode along with
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // nothing stored means nothing to clear
    }
  },
}
