// Settings → General → Guide: tours on/off, play the tours or What's new again.
import { useEffect, useRef, useState } from "react"
import { Button } from "../ui/button"
import { tr } from "../i18n/index"
import { GUIDE_BASELINE, resetTours } from "./guide"
import { saveGuideState, useGuideState } from "./state"

export function GuideSection() {
  const { state: guide } = useGuideState()
  const [note, setNote] = useState("")
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const say = (text: string) => {
    setNote(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setNote(""), 2500)
  }

  return (
    <div data-guide="settings.guide" className="flex flex-col gap-2">
      <h3 className="text-13 font-medium text-ink">{tr("Guide")}</h3>
      <label className="flex cursor-pointer items-start gap-2.5 text-13 text-ink">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-current"
          checked={guide?.showTours !== false}
          onChange={(e) => {
            const checked = e.target.checked
            saveGuideState((g) => ({ ...g, showTours: checked }))
          }}
        />
        <span className="flex min-w-0 flex-col">
          {tr("Show tours on a first visit")}
          <span className="text-11 text-ink-faint">{tr("A short walk-through the first time you open a screen.")}</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="neutral"
          size="small"
          onClick={() => {
            saveGuideState((g) => resetTours(g))
            say(tr("Tours will show again."))
          }}
        >
          {tr("Show all tours again")}
        </Button>
        <Button
          variant="neutral"
          size="small"
          onClick={() => {
            saveGuideState((g) => ({ ...g, seen: [], lastVersion: GUIDE_BASELINE }))
            say(tr("What's new will show again."))
          }}
        >
          {tr("Show what's new again")}
        </Button>
        {note ? (
          <span className="text-12 text-success" role="status">
            {note}
          </span>
        ) : null}
      </div>
    </div>
  )
}
