// The help list ("Help" in the header and the sidebar): every help tip of this page, searchable,
// grouped. "Show me" hands the tip to the guide host, which closes the list, opens the place
// and points at the element.
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AGENT_HELP_GROUPS, searchHelp, tipText, type AgentHelpGroup, type Tip } from "./guide"
import { AGENT_TIPS } from "./tips"

const GROUP_LABEL: Record<AgentHelpGroup, string> = {
  chat: "Chatting",
  safety: "Safety and undo",
  context: "Context and cost",
  memory: "Memory and skills",
  projects: "Projects and chats",
  help: "Help and bugs",
}

interface Props {
  open: boolean
  onClose: () => void
  query: string
  onQuery: (q: string) => void
  onShowMe: (tip: Tip) => void
  locale: string
  mobile: boolean
}

export function HelpList(p: Props) {
  const found = useMemo(() => searchHelp(AGENT_TIPS, p.query, AGENT_HELP_GROUPS), [p.query])
  const groups = AGENT_HELP_GROUPS.map((g) => ({ id: g, tips: found.filter((tip) => tip.help === g) })).filter((g) => g.tips.length > 0)

  return (
    <Dialog open={p.open} onOpenChange={(o) => !o && p.onClose()}>
      <DialogContent className="flex h-[min(680px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 px-4 pt-4 pr-12 pb-2">
          <DialogTitle className="font-heading text-lg font-normal">Help</DialogTitle>
          <DialogDescription>Short answers about this page. “Show me” takes you to the place.</DialogDescription>
        </DialogHeader>
        <div className="shrink-0 px-4 pb-2">
          <input
            type="search"
            // a phone keyboard would cover the list
            autoFocus={!p.mobile}
            value={p.query}
            onChange={(e) => p.onQuery(e.target.value)}
            placeholder="Search help…"
            aria-label="Search help"
            className="bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-base outline-none focus-visible:ring-1 md:h-8 md:text-sm"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4" data-testid="help-results">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-10 text-center" role="status">
              <p className="font-heading text-base">Nothing found</p>
              <p className="text-muted-foreground max-w-xs text-sm">Try another word, or clear the search.</p>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.id} className="mb-4 last:mb-0" aria-labelledby={`help-group-${g.id}`}>
                <h3 id={`help-group-${g.id}`} className="text-muted-foreground bg-popover sticky top-0 z-10 py-1.5 text-xs font-medium tracking-wider uppercase">
                  {GROUP_LABEL[g.id]}
                </h3>
                <ul className="divide-border flex flex-col divide-y">
                  {g.tips.map((tip) => (
                    <li key={tip.id} className="flex flex-col gap-1.5 py-3 first:pt-1.5">
                      <div className="font-heading text-[15px] leading-tight">{tipText(tip.title, p.locale)}</div>
                      <p className="text-muted-foreground text-sm leading-relaxed">{tipText(tip.body, p.locale)}</p>
                      {tip.target ? (
                        <div>
                          <Button variant="outline" size="sm" className="max-md:h-10" onClick={() => p.onShowMe(tip)}>
                            Show me
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
