import { useEffect, useState } from "react"

/** Below 768 px the shell is a phone layout (shell.css, Tailwind `md`). */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const fn = () => setMobile(mq.matches)
    mq.addEventListener("change", fn)
    return () => mq.removeEventListener("change", fn)
  }, [])
  return mobile
}
