// This page's own settings of the guide that live in the browser: the shell's language, and
// whether the page is actually on screen (the shell keeps this frame mounted but hidden
// while another tab is in front; a tour must not start then).
import { useEffect, useState } from "react"

const LANG_KEY = "molfar-lang"

/** The shell's language (same-origin localStorage, written by the shell's language switch). */
const readLocale = (): string => {
  try {
    return localStorage.getItem(LANG_KEY) || "en"
  } catch {
    return "en"
  }
}

/** Follows the shell's language switch (the `storage` event reaches the other document). */
export function useLocale(): string {
  const [locale, setLocale] = useState(readLocale)
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === null || e.key === LANG_KEY) setLocale(readLocale())
    }
    window.addEventListener("storage", on)
    return () => window.removeEventListener("storage", on)
  }, [])
  return locale
}

const onScreen = (): boolean => window.innerWidth > 0 && window.innerHeight > 0 && document.visibilityState === "visible"

/** True while the page has a size and its browser tab is visible. A frame of `display: none`
 *  has no size; it fires `resize` when the shell shows it again. */
export function useOnScreen(): boolean {
  const [on, setOn] = useState(onScreen)
  useEffect(() => {
    const check = () => setOn(onScreen())
    window.addEventListener("resize", check)
    document.addEventListener("visibilitychange", check)
    return () => {
      window.removeEventListener("resize", check)
      document.removeEventListener("visibilitychange", check)
    }
  }, [])
  return on
}
