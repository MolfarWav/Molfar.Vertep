// The agent page can open on its own (not inside the shell), so it moves the
// browser-stored keys of 1.7.x and older to their new names itself. The same list
// is in client/src/prefs.ts (#66). Import this first: other modules read the keys.
const RENAMED_KEYS: [from: string, to: string][] = [
  ["chrysalis-theme", "molfar-theme"],
  ["chrysalis-theme-vars", "molfar-theme-vars"],
  ["chrysalis-theme-scheme", "molfar-theme-scheme"],
  ["chrysalis-lang", "molfar-lang"],
]
try {
  for (const [from, to] of RENAMED_KEYS) {
    const value = localStorage.getItem(from)
    if (value === null) continue
    if (localStorage.getItem(to) === null) localStorage.setItem(to, value)
    localStorage.removeItem(from)
  }
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith("chrysalis.agent.draft.")) continue
    const to = `molfar.agent.draft.${key.slice("chrysalis.agent.draft.".length)}`
    if (localStorage.getItem(to) === null) localStorage.setItem(to, localStorage.getItem(key) ?? "")
    localStorage.removeItem(key)
  }
} catch {
  // blocked site data: nothing was stored, nothing to move
}
export {}
