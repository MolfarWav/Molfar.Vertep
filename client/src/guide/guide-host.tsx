// The guide's one mounted piece: decides when What's new and the screen tours show.
// Mounted once in the shell. Nothing here opens a view by itself except "Show me",
// which the user pressed.
import { useCallback, useEffect, useState } from "react"
import { connectionsApi } from "../api"
import { tr, useLocale } from "../i18n/index"
import { GUIDE_HELP_EVENT, GUIDE_MENU_EVENT, GUIDE_STORE_EVENT } from "./events"
import { markSeen, markTourDone, tipText, tourFor, tourSteps, whatsNew, type GuideOpen, type Place, type Tip } from "./guide"
import { HelpList } from "./help-list"
import { useIsMobile } from "./mobile"
import { useCurrentPlace } from "./place"
import { Spotlight } from "./spotlight"
import { clearGuideState, guideNow, loadGuideState, saveGuideState, useGuideState } from "./state"
import { findTarget } from "./target"
import { ONLY_WITHOUT_MODEL, TIPS, TOURS } from "./tips"
import { WhatsNewCard } from "./whats-new-card"

/** What the shell lets the guide do. */
export interface GuideActions {
  goHome: () => void
  openAgent: () => void
  /** An app by id; without one, the app in front, else the first installed. */
  openApp: (id?: string) => void
  openSettings: (section?: string) => void
  closeSettings: () => void
}

interface CardState {
  tips: Tip[]
  index: number
  lastVersion: string
}

type Spot =
  /** from: where "Show me" was pressed, so the button back goes there */
  | { kind: "single"; tip: Tip; from: "card" | "help" }
  | { kind: "tour"; tourId: string; place: Place; steps: Tip[]; index: number }

const TOUR_DELAY_MS = 600
const TOUR_TRIES = 5
/** A menu or dialog the guide opens takes this long to be on screen. */
const OPEN_MS = 280

const menu = (detail: "open" | "close") => window.dispatchEvent(new CustomEvent(GUIDE_MENU_EVENT, { detail }))

export function GuideHost(props: {
  /** The engine's version (launch.engine.version); null until the launch list is in. */
  engineVersion: string | null
  /** The installed apps' ids; null until the launch list is in. */
  apps: string[] | null
  actions: GuideActions
}) {
  const locale = useLocale()
  const mobile = useIsMobile()
  const { state: guide, loaded } = useGuideState()
  const place = useCurrentPlace()
  /** At least one connection that works (null = not known yet). */
  const [modelConnected, setModelConnected] = useState<boolean | null>(null)
  const [card, setCard] = useState<CardState | null>(null)
  const [spot, setSpot] = useState<Spot | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  // kept while the user is away on "Show me", so "Back to help" lands on the same search
  const [helpQuery, setHelpQuery] = useState("")

  useEffect(() => {
    void loadGuideState()
    return clearGuideState
  }, [])

  // The shell's own rule for the "Connected" label of a connection (Settings): a key, or an endpoint
  // that needs none. Asked again whenever the user moves to another screen (Settings was just closed).
  // biome-ignore lint/correctness/useExhaustiveDependencies: the place is only the cue to ask again
  useEffect(() => {
    let alive = true
    connectionsApi
      .list()
      .then((list) => {
        if (alive) setModelConnected(list.some((c) => c.hasKey || !(c.providerId || c.oauthProvider)))
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [place])

  const hydrated = loaded && modelConnected !== null && props.apps !== null && props.engineVersion !== null
  // someone who already ran the engine before the guide: a model connected or an app installed
  const usedBefore = modelConnected === true || (props.apps?.length ?? 0) > 0

  // What's new: after the first load, and again whenever the stored state asks for it
  // (Settings → Show what's new again). A build with nothing new just records its version.
  useEffect(() => {
    if (!hydrated || card || !props.engineVersion) return
    const r = whatsNew(TIPS, guide, props.engineVersion, usedBefore)
    if (r.tips.length > 0) setCard({ tips: r.tips, index: 0, lastVersion: r.lastVersion })
    else if (guide?.lastVersion !== r.lastVersion) saveGuideState({ ...guide, lastVersion: r.lastVersion })
  }, [hydrated, guide, usedBefore, card, props.engineVersion])

  const closeCard = useCallback(() => {
    if (!card) return
    saveGuideState(markSeen(guideNow(), card.tips.map((tip) => tip.id), card.lastVersion))
    setCard(null)
    setSpot(null)
    menu("close")
  }, [card])

  // A tour starts on the first visit to its place, once nothing else of the guide is up.
  // Steps whose target is not on screen are left out; none on screen = no tour (and not done).
  // The stored state is read when the attempt runs, so "Show all tours again" takes effect on the
  // next arrival at a screen, not over the Settings the user is looking at.
  useEffect(() => {
    if (!hydrated || !place || card || spot || helpOpen) return
    let tries = 0
    let timer: ReturnType<typeof setTimeout>
    const attempt = () => {
      const tour = tourFor(TOURS, place, guideNow())
      if (!tour) return
      const steps = tourSteps(tour, TIPS).filter((tip) => !(modelConnected && ONLY_WITHOUT_MODEL.includes(tip.id)) && findTarget(tip.target))
      if (steps.length > 0) {
        setSpot({ kind: "tour", tourId: tour.id, place, steps, index: 0 })
        return
      }
      // the screen may still be loading its content: look a few more times
      if (++tries < TOUR_TRIES) timer = setTimeout(attempt, TOUR_DELAY_MS)
    }
    timer = setTimeout(attempt, TOUR_DELAY_MS)
    return () => clearTimeout(timer)
  }, [hydrated, place, card, spot, helpOpen, modelConnected])

  // leaving the place ends its tour, without counting it as done
  useEffect(() => {
    if (spot?.kind === "tour" && place !== spot.place) setSpot(null)
  }, [place, spot])

  // the account menu's Help and the start page's Help link
  useEffect(() => {
    const on = () => setHelpOpen(true)
    window.addEventListener(GUIDE_HELP_EVENT, on)
    return () => window.removeEventListener(GUIDE_HELP_EVENT, on)
  }, [])

  /** "Show me": take the user to the place a tip is about. */
  const openPlace = (open: GuideOpen) => {
    const a = props.actions
    menu("close")
    if (open.view === "home") a.goHome()
    else if (open.view === "agent") a.openAgent()
    else if (open.view === "app") a.openApp(open.app)
    else if (open.view === "settings") a.openSettings(open.section)
    else if (open.view === "store") {
      a.goHome()
      setTimeout(() => window.dispatchEvent(new CustomEvent(GUIDE_STORE_EVENT)), OPEN_MS)
    }
    if (open.menu === "account") setTimeout(() => menu("open"), OPEN_MS)
  }

  /** A step opened a menu or Settings for the user to look at: put them away again. */
  const tidy = (tip: Tip) => {
    if (tip.open?.menu) menu("close")
    if (tip.open?.view === "settings") props.actions.closeSettings()
  }

  const showFromHelp = (tip: Tip) => {
    setHelpOpen(false)
    if (tip.open) openPlace(tip.open)
    // an element to point at: spotlight it; otherwise the place itself is the answer
    if (tip.target) setSpot({ kind: "single", tip, from: "help" })
  }
  const helpList = (
    <HelpList open={helpOpen} onClose={() => setHelpOpen(false)} query={helpQuery} onQuery={setHelpQuery} onShowMe={showFromHelp} locale={locale} />
  )

  if (spot?.kind === "single") {
    const fromHelp = spot.from === "help"
    const tip = spot.tip
    const back = () => {
      tidy(tip)
      setSpot(null)
      if (fromHelp) setHelpOpen(true)
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
          mobile={mobile}
          primary={{ label: fromHelp ? tr("Back to help") : tr("Back to What's new"), onClick: back }}
          secondary={{
            label: tr("Close"),
            onClick: () => {
              tidy(tip)
              if (fromHelp) setSpot(null)
              else closeCard()
            },
          }}
          onEscape={back}
        />
      </>
    )
  }

  if (spot?.kind === "tour") {
    const { steps, index } = spot
    const tip = steps[index]
    if (!tip) return null
    const finish = () => {
      saveGuideState(markTourDone(guideNow(), spot.tourId))
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
          mobile={mobile}
          {...(hasPrev ? { onBack: () => move(-1) } : {})}
          primary={{ label: isLast ? tr("Done") : tr("Next"), onClick: () => move(1) }}
          secondary={{ label: tr("Skip"), onClick: finish }}
          onEscape={finish}
        />
      </>
    )
  }

  if (card) {
    return (
      <>
        {helpList}
        <WhatsNewCard
          tips={card.tips}
          index={card.index}
          locale={locale}
          mobile={mobile}
          onShowMe={(tip) => {
            if (tip.open) openPlace(tip.open)
            setSpot({ kind: "single", tip, from: "card" })
          }}
          onNext={() => setCard({ ...card, index: card.index + 1 })}
          onClose={closeCard}
        />
      </>
    )
  }

  return helpList
}
