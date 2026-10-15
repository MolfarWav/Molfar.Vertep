// The Molfar page's guide host: starts the page's tours on a first visit, runs "Show me" for
// the help list. No What's new here (the shell owns it). A tour starts only while the page is
// on screen: the shell keeps this frame mounted but hidden behind another tab.
import { useEffect, useState } from "react"
import { useIsDesktop } from "../Header"
import { currentProjectId, useAgent } from "../store"
import { GUIDE_HELP_EVENT, panel } from "./events"
import { useLocale, useOnScreen } from "./frame"
import { markTourDone, tipText, tourFor, tourSteps, type GuideOpen, type Place, type Tip } from "./guide"
import { HelpList } from "./help-list"
import { useCurrentPlace } from "./place"
import { Spotlight } from "./spotlight"
import { guideNow, loadGuideState, saveGuideState, useGuideState } from "./state"
import { findTarget } from "./target"
import { AGENT_TIPS, AGENT_TOURS } from "./tips"

type Spot =
  | { kind: "single"; tip: Tip }
  | { kind: "tour"; tourId: string; place: Place; steps: Tip[]; index: number }

const TOUR_DELAY_MS = 700
const TOUR_TRIES = 6
/** A dialog or view the guide opens takes this long to be on screen. */
const OPEN_MS = 350

/** "Show me": take the user to the place a tip is about. */
function openPlace(open: GuideOpen, desktop: boolean): void {
  const s = useAgent.getState()
  const name = open.panel ?? "chat"
  const sidebarDrawer = () => {
    if (desktop) s.setSidebarPinned(true)
    else s.setSidebar(true)
  }
  if (name === "sidebar") {
    sidebarDrawer()
    return
  }
  if (name === "memory" || name === "skills") {
    s.showChat()
    if (!desktop) s.setPhoneTab("chat")
    setTimeout(() => panel(name, true), OPEN_MS)
    return
  }
  if (name === "inspector") {
    s.showChat()
    if (!desktop) s.setPhoneTab("chat")
    setTimeout(() => panel("inspector", true), OPEN_MS)
    return
  }
  if (name === "project-chat") {
    // a new chat in the project: its header carries the project-pane button
    const own = currentProjectId(s)
    const pick = s.projects.find((p) => p.id === own) ?? s.projects[0]
    if (pick) s.newChat(pick.id)
    s.showChat()
    return
  }
  if (name === "project" || name === "project-app") {
    // the open chat's project, else the first one (an app's, when checkpoints are the point)
    const own = currentProjectId(s)
    const pick =
      name === "project-app"
        ? s.projects.find((p) => p.kind === "app")
        : s.projects.find((p) => p.id === own) ?? s.projects[0]
    if (pick) s.openProject(pick.id)
    return
  }
  s.showChat()
  if (!desktop) s.setPhoneTab("chat")
}

export function GuideHost() {
  const locale = useLocale()
  const desktop = useIsDesktop()
  const onScreen = useOnScreen()
  const { loaded } = useGuideState()
  const place = useCurrentPlace()
  const [spot, setSpot] = useState<Spot | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  // kept while the user is away on "Show me", so "Back to help" lands on the same search
  const [helpQuery, setHelpQuery] = useState("")

  useEffect(() => {
    void loadGuideState()
  }, [])

  useEffect(() => {
    const on = () => setHelpOpen(true)
    window.addEventListener(GUIDE_HELP_EVENT, on)
    return () => window.removeEventListener(GUIDE_HELP_EVENT, on)
  }, [])

  // A tour starts on the first visit to its place while the page is on screen. Steps whose
  // target is not on screen are left out; none on screen = no tour (and not done).
  useEffect(() => {
    if (!loaded || !onScreen || !place || spot || helpOpen) return
    let tries = 0
    let timer: ReturnType<typeof setTimeout>
    const attempt = () => {
      const tour = tourFor(AGENT_TOURS, place, guideNow())
      if (!tour) return
      const steps = tourSteps(tour, AGENT_TIPS).filter((tip) => findTarget(tip.target))
      if (steps.length > 0) {
        setSpot({ kind: "tour", tourId: tour.id, place, steps, index: 0 })
        return
      }
      // the page may still be loading its content: look a few more times
      if (++tries < TOUR_TRIES) timer = setTimeout(attempt, TOUR_DELAY_MS)
    }
    timer = setTimeout(attempt, TOUR_DELAY_MS)
    return () => clearTimeout(timer)
  }, [loaded, onScreen, place, spot, helpOpen])

  // leaving the place, or the page going out of sight, ends the tour without counting it as done
  useEffect(() => {
    if (spot?.kind === "tour" && (place !== spot.place || !onScreen)) setSpot(null)
  }, [place, onScreen, spot])

  /** A step opened a dialog or the drawer for the user to look at: put it away again. */
  const tidy = (tip: Tip) => {
    const p = tip.open?.panel
    if (p === "memory" || p === "skills") panel(p, false)
    if (p === "inspector") panel("inspector", false)
    if (p === "sidebar" && !desktop) useAgent.getState().setSidebar(false)
  }

  const showFromHelp = (tip: Tip) => {
    setHelpOpen(false)
    if (tip.open) openPlace(tip.open, desktop)
    if (tip.target) setSpot({ kind: "single", tip })
  }
  const helpList = (
    <HelpList open={helpOpen} onClose={() => setHelpOpen(false)} query={helpQuery} onQuery={setHelpQuery} onShowMe={showFromHelp} locale={locale} mobile={!desktop} />
  )

  if (spot?.kind === "single") {
    const tip = spot.tip
    const end = (toHelp: boolean) => {
      tidy(tip)
      setSpot(null)
      if (toHelp) setHelpOpen(true)
    }
    return (
      <>
        {helpList}
        <Spotlight
          target={tip.target}
          title={tipText(tip.title, locale)}
          body={tipText(tip.body, locale)}
          step={0}
          total={1}
          mobile={!desktop}
          primary={{ label: "Back to help", onClick: () => end(true) }}
          secondary={{ label: "Close", onClick: () => end(false) }}
          onEscape={() => end(true)}
        />
      </>
    )
  }

  if (spot?.kind === "tour") {
    const { steps, index } = spot
    const tip = steps[index]
    if (!tip) return null
    const finish = () => {
      saveGuideState((g) => markTourDone(g, spot.tourId))
      setSpot(null)
    }
    // a step whose target went away meanwhile is passed over
    const move = (dir: 1 | -1) => {
      for (let i = index + dir; i >= 0 && i < steps.length; i += dir) {
        const s = steps[i]
        if (s && findTarget(s.target)) {
          setSpot({ ...spot, index: i })
          return
        }
      }
      if (dir === 1) finish()
    }
    const hasPrev = steps.slice(0, index).some((s) => findTarget(s.target))
    const isLast = !steps.slice(index + 1).some((s) => findTarget(s.target))
    return (
      <>
        {helpList}
        <Spotlight
          target={tip.target}
          title={tipText(tip.title, locale)}
          body={tipText(tip.body, locale)}
          step={index}
          total={steps.length}
          mobile={!desktop}
          {...(hasPrev ? { onBack: () => move(-1) } : {})}
          primary={{ label: isLast ? "Done" : "Next", onClick: () => move(1) }}
          secondary={{ label: "Skip", onClick: finish }}
          onEscape={finish}
        />
      </>
    )
  }

  return helpList
}
