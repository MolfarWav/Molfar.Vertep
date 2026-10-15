// The What's new card: one tip at a time, non-modal. A corner card on desktop, a
// bottom sheet on phones. It never opens anything by itself.
import { createPortal } from "react-dom"
import { Button, IconButton } from "../ui/button"
import { IconSmall } from "../ui/icon"
import { cn } from "../ui/cn"
import { tr } from "../i18n/index"
import { tipText, type Tip } from "./guide"

interface Props {
  tips: Tip[]
  index: number
  locale: string
  mobile: boolean
  onShowMe: (tip: Tip) => void
  onNext: () => void
  onClose: () => void
}

export function WhatsNewCard({ tips, index, locale, mobile, onShowMe, onNext, onClose }: Props) {
  const tip = tips[index]
  if (!tip) return null
  const last = index === tips.length - 1
  return createPortal(
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="guide-card-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation()
          onClose()
        }
      }}
      className={cn(
        "fixed z-[60] flex flex-col gap-2 border border-line bg-panel-raised p-4 text-ink shadow-[var(--s-raised)]",
        mobile
          ? "inset-x-0 bottom-0 rounded-t-[10px] border-x-0 border-b-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
          : "right-4 bottom-4 w-[340px] max-w-[calc(100vw-2rem)] rounded-[10px]",
      )}
    >
      <div className="flex items-center gap-2">
        <h2 id="guide-card-title" className="min-w-0 flex-1 truncate text-11 font-medium uppercase tracking-wider text-ink-muted">
          {tr("What's new")}
        </h2>
        {tips.length > 1 && <span className="shrink-0 text-11 text-ink-muted">{tr("{n} of {total}", { n: index + 1, total: tips.length })}</span>}
        <IconButton
          icon={<IconSmall name="outline-xmark" />}
          variant="ghost-muted"
          size="small"
          className="-mr-1 shrink-0 max-md:size-10!"
          title={tr("Close")}
          aria-label={tr("Close")}
          onClick={onClose}
        />
      </div>
      <div className="font-heading text-16 leading-tight text-ink">{tipText(tip.title, locale)}</div>
      <p className="text-13 leading-5 text-ink-muted">{tipText(tip.body, locale)}</p>
      <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
        {tip.open && (
          <Button variant="neutral" size="small" className="max-md:h-10!" onClick={() => onShowMe(tip)}>
            {tr("Show me")}
          </Button>
        )}
        <Button variant="primary" size="small" className="max-md:h-10!" onClick={last ? onClose : onNext}>
          {last ? tr("Got it") : tr("Next")}
        </Button>
      </div>
    </div>,
    document.body,
  )
}
