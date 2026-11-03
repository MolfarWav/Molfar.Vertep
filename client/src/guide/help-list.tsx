// The help list (account menu, start page): every help tip of the guide, searchable,
// grouped. A dialog. "Show me" hands the tip to the guide host, which closes the list,
// opens the place and points at the element.
import { useCallback, useMemo, useState } from "react"
import { ModalDialog, Dialog } from "../ui/dialog"
import { Button } from "../ui/button"
import { Tabs } from "../ui/tabs"
import { GuideReader } from "./guide-reader"
import { tr } from "../i18n/index"
import { useIsMobile } from "./mobile"
import { HELP_GROUPS, searchHelp, tipText, type HelpGroup, type Tip } from "./guide"
import { TIPS } from "./tips"

const groupLabel = (g: HelpGroup): string =>
  ({
    start: tr("Getting started"),
    apps: tr("Apps"),
    models: tr("Models"),
    molfar: tr("Molfar"),
    updates: tr("Updates"),
    help: tr("Help and bugs"),
  })[g]

const TAB_KEY = "molfar-help-tab"
type HelpTab = "tips" | "guide"
const loadTab = (): HelpTab => {
  try {
    return localStorage.getItem(TAB_KEY) === "guide" ? "guide" : "tips"
  } catch {
    return "tips"
  }
}

interface Props {
  open: boolean
  onClose: () => void
  query: string
  onQuery: (q: string) => void
  onShowMe: (tip: Tip) => void
  locale: string
}

export function HelpList(p: Props) {
  const mobile = useIsMobile()
  const [tab, setTab] = useState<HelpTab>(loadTab)
  // a guide page filling the phone screen: the search box makes room for it
  const [pageView, setPageView] = useState(false)
  const onPageView = useCallback((v: boolean) => setPageView(v), [])
  const pickTab = (v: unknown) => {
    const t: HelpTab = v === "guide" ? "guide" : "tips"
    setTab(t)
    try {
      localStorage.setItem(TAB_KEY, t)
    } catch {
      // site data blocked: Help opens on Tips next time
    }
  }
  const found = useMemo(() => searchHelp(TIPS, p.query), [p.query])
  const groups = HELP_GROUPS.map((g) => ({ id: g, tips: found.filter((tip) => tip.help === g) })).filter((g) => g.tips.length > 0)

  return (
    <ModalDialog open={p.open} onClose={p.onClose}>
      <Dialog
        size={tab === "guide" ? "x-large" : "large"}
        title={tr("Help")}
        description={tab === "guide" ? tr("What each part of Molfar Vertep is and how the parts fit together.") : tr("Short answers about Molfar Vertep. “Show me” takes you to the place.")}
      >
        <div className="flex h-[min(640px,calc(100dvh-9rem))] min-h-0 flex-col">
          <Tabs value={tab} onValueChange={pickTab} className="shrink-0 px-4 pt-3">
            <Tabs.List aria-label={tr("Help")} className="flex gap-1">
              <Tabs.Trigger value="tips" className="w-auto! min-h-10 px-3 md:min-h-8">
                {tr("Tips")}
              </Tabs.Trigger>
              <Tabs.Trigger value="guide" className="w-auto! min-h-10 px-3 md:min-h-8">
                {tr("Guide")}
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs>
          {tab === "guide" && mobile && pageView ? null : (
          <div className="shrink-0 px-4 py-3">
            <input
              type="search"
              // a phone keyboard would cover the list
              autoFocus={!mobile}
              value={p.query}
              onChange={(e) => p.onQuery(e.target.value)}
              placeholder={tr("Search help…")}
              aria-label={tr("Search help…")}
              className="h-10 w-full rounded-lg border border-line bg-panel px-3 text-16 text-ink outline-none placeholder:text-ink-faint focus:border-line-focus md:h-8 md:text-13"
            />
          </div>
          )}
          {tab === "guide" ? (
            <GuideReader locale={p.locale} query={p.query} onPageView={onPageView} />
          ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4" data-testid="help-results">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center" role="status">
                <p className="font-heading text-16 text-ink">{tr("Nothing found")}</p>
                <p className="max-w-xs text-13 text-ink-muted">{tr("Try another word, or clear the search.")}</p>
              </div>
            ) : (
              groups.map((g) => (
                <section key={g.id} className="mb-4 last:mb-0" aria-labelledby={`help-group-${g.id}`}>
                  <h3 id={`help-group-${g.id}`} className="sticky top-0 z-10 bg-base py-1.5 text-11 font-medium uppercase tracking-wider text-ink-muted">
                    {groupLabel(g.id)}
                  </h3>
                  <ul className="flex flex-col divide-y divide-line">
                    {g.tips.map((tip) => (
                      <li key={tip.id} className="flex flex-col gap-1.5 py-3 first:pt-1.5">
                        <div className="font-heading text-15 leading-tight text-ink">{tipText(tip.title, p.locale)}</div>
                        <p className="text-13 leading-5 text-ink-muted">{tipText(tip.body, p.locale)}</p>
                        {(tip.open || tip.target) && (
                          <div>
                            <Button variant="neutral" size="small" className="max-md:h-10!" onClick={() => p.onShowMe(tip)}>
                              {tr("Show me")}
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
          )}
        </div>
      </Dialog>
    </ModalDialog>
  )
}
