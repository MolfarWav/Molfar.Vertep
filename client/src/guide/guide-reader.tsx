// The Guide tab of the Help dialog: the books of guide pages (the engine's and each
// installed app's), a list to pick from, and the page with its own back/forward history.
// Phone: the list is the first view, a page opens full width with "Contents".
import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { tr } from "../i18n/index"
import { Button, IconButton } from "../ui/button"
import { Icon } from "../ui/icon"
import { TextShimmer } from "../ui/text-shimmer"
import { cn } from "../ui/cn"
import { GuideMarkdown, parseGuideMarkdown } from "./markdown"
import { useIsMobile } from "./mobile"

interface GuideBook {
  id: string
  title: string
  pages: Array<{ id: string; title: string }>
}
interface PageData {
  book: string
  id: string
  title: string
  markdown: string
  lang: string
  stale: boolean
}
interface Ref {
  book: string
  id: string
}

const STORE_KEY = "molfar-guide-page"

function loadSaved(): Ref | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null")
    return v && typeof v.book === "string" && typeof v.id === "string" ? { book: v.book, id: v.id } : null
  } catch {
    return null
  }
}
function save(r: Ref | null) {
  try {
    if (r) localStorage.setItem(STORE_KEY, JSON.stringify(r))
  } catch {
    // site data blocked: the guide just opens at the start next time
  }
}

type Load<T> = { s: "loading" } | { s: "error"; status: number } | { s: "ok"; v: T }

export function GuideReader(props: {
  locale: string
  query: string
  /** tells the dialog that a page fills the phone screen (it hides the search box then) */
  onPageView: (open: boolean) => void
}) {
  const mobile = useIsMobile()
  const { locale, query, onPageView } = props
  const [books, setBooks] = useState<Load<GuideBook[]>>({ s: "loading" })
  const [tick, setTick] = useState(0)
  // history: a stack of pages and where we are in it
  const [hist, setHist] = useState<{ stack: Ref[]; at: number }>(() => {
    const s = loadSaved()
    return s ? { stack: [s], at: 0 } : { stack: [], at: -1 }
  })
  const current = hist.stack[hist.at] ?? null
  const [page, setPage] = useState<Load<PageData>>({ s: "loading" })
  const [pageTick, setPageTick] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: tick is the "try again" cue
  useEffect(() => {
    let alive = true
    setBooks({ s: "loading" })
    api<{ books: GuideBook[] }>("GET", `/v1/guide?lang=${encodeURIComponent(locale)}`)
      .then((r) => alive && setBooks({ s: "ok", v: r.books }))
      .catch((e) => alive && setBooks({ s: "error", status: e?.status ?? 0 }))
    return () => {
      alive = false
    }
  }, [locale, tick])

  const list = books.s === "ok" ? books.v : null

  // no saved page: the start page of the first book (desktop only; a phone starts at the list)
  useEffect(() => {
    if (!list || current || mobile) return
    const b = list[0]
    if (b?.pages[0]) setHist({ stack: [{ book: b.id, id: b.pages[0].id }], at: 0 })
  }, [list, current, mobile])

  // biome-ignore lint/correctness/useExhaustiveDependencies: pageTick is the "try again" cue
  useEffect(() => {
    if (!current) return
    let alive = true
    setPage({ s: "loading" })
    api<PageData>("GET", `/v1/guide/${encodeURIComponent(current.book)}/${encodeURIComponent(current.id)}?lang=${encodeURIComponent(locale)}`)
      .then((r) => alive && setPage({ s: "ok", v: r }))
      .catch((e) => alive && setPage({ s: "error", status: e?.status ?? 0 }))
    return () => {
      alive = false
    }
  }, [current?.book, current?.id, locale, pageTick])

  // a saved page that no longer exists would be a dead end: keep it, the 404 state offers the start page
  useEffect(() => save(current), [current])
  // on a phone a page open = the search box is hidden
  useEffect(() => {
    onPageView(mobile && current !== null)
  }, [mobile, current, onPageView])

  const open = useCallback((book: string, id: string) => {
    setHist((h) => {
      const now = h.stack[h.at]
      if (now && now.book === book && now.id === id) return h
      return { stack: [...h.stack.slice(0, h.at + 1), { book, id }], at: h.at + 1 }
    })
  }, [])
  const go = (d: -1 | 1) => setHist((h) => (h.at + d >= 0 && h.at + d < h.stack.length ? { ...h, at: h.at + d } : h))
  const contents = () => setHist({ stack: [], at: -1 })

  const pagesOf = useMemo(() => {
    const m = new Map<string, Map<string, string>>()
    for (const b of list ?? []) m.set(b.id, new Map(b.pages.map((p) => [p.id, p.title])))
    return m
  }, [list])

  const q = query.trim().toLowerCase()
  const shown = useMemo(
    () =>
      (list ?? [])
        .map((b) => ({ ...b, pages: q ? b.pages.filter((p) => p.title.toLowerCase().includes(q)) : b.pages }))
        .filter((b) => b.pages.length > 0),
    [list, q],
  )

  const retry = (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center" role="alert">
      <p className="text-13 text-ink-muted">{tr("Could not load the guide.")}</p>
      <Button variant="neutral" size="small" className="max-md:h-10!" onClick={() => setTick((n) => n + 1)}>
        {tr("Try again")}
      </Button>
    </div>
  )

  const nav = (
    <nav aria-label={tr("Guide pages")} data-testid="guide-nav" className={cn("min-h-0 overflow-y-auto overscroll-contain px-4 pb-4", mobile ? "flex-1" : "w-52 shrink-0 border-r border-line pr-2 lg:w-56")}>
      {books.s === "loading" ? (
        <p className="py-6 text-13 text-ink-muted"><TextShimmer text={tr("Loading…")} /></p>
      ) : books.s === "error" ? (
        retry
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-2 py-10 text-center" role="status">
          <p className="font-heading text-16 text-ink">{tr("Nothing found")}</p>
          <p className="text-13 text-ink-muted">{tr("Try another word, or clear the search.")}</p>
        </div>
      ) : (
        shown.map((b) => (
          <section key={b.id} className="mb-4 last:mb-0">
            <h3 className="sticky top-0 z-10 bg-base py-1.5 text-11 font-medium uppercase tracking-wider text-ink-muted">{b.title}</h3>
            <ul className="flex flex-col gap-0.5">
              {b.pages.map((p) => {
                const on = current?.book === b.id && current.id === p.id
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      aria-current={on ? "page" : undefined}
                      onClick={() => open(b.id, p.id)}
                      className={cn(
                        "flex min-h-10 w-full cursor-pointer items-center rounded-lg border-0 px-2.5 py-1.5 text-left text-13 md:min-h-8",
                        on ? "bg-pressed font-medium text-ink" : "bg-transparent text-ink-muted hover:bg-hover hover:text-ink",
                      )}
                    >
                      {p.title}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </nav>
  )

  const canBack = hist.at > 0
  const canFwd = hist.at < hist.stack.length - 1
  const toolbar = (
    <div className="flex shrink-0 items-center gap-1 border-b border-line px-3 py-1.5 md:px-4">
      {mobile && (
        <Button variant="ghost" size="small" icon="chevron-left" className="max-md:h-10!" onClick={contents}>
          {tr("Contents")}
        </Button>
      )}
      <span className="flex-1" />
      <IconButton
        variant="ghost"
        touch
        aria-label={tr("Back")}
        title={tr("Back")}
        disabled={!canBack}
        onClick={() => go(-1)}
        icon={<Icon name="chevron-left" />}
        className={cn(!canBack && "opacity-40")}
      />
      <IconButton
        variant="ghost"
        touch
        aria-label={tr("Forward")}
        title={tr("Forward")}
        disabled={!canFwd}
        onClick={() => go(1)}
        icon={<Icon name="chevron-right" />}
        className={cn(!canFwd && "opacity-40")}
      />
    </div>
  )

  const env = {
    book: current?.book ?? "",
    exists: (b: string, p: string) => pagesOf.get(b)?.has(p) ?? false,
    titleOf: (b: string, p: string) => pagesOf.get(b)?.get(p) ?? null,
    onOpen: open,
  }
  const blocks = useMemo(() => (page.s === "ok" ? parseGuideMarkdown(page.v.markdown) : []), [page])

  const startOf = current ? list?.find((b) => b.id === current.book)?.pages[0]?.id : undefined
  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6" data-testid="guide-page">
      {page.s === "loading" ? (
        <p className="text-13 text-ink-muted"><TextShimmer text={tr("Loading…")} /></p>
      ) : page.s === "error" && page.status === 404 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="font-heading text-16 text-ink">{tr("This page does not exist")}</p>
          {current && startOf && startOf !== current.id && (
            <Button variant="neutral" size="small" className="max-md:h-10!" onClick={() => open(current.book, startOf)}>
              {tr("Open the start page")}
            </Button>
          )}
        </div>
      ) : page.s === "error" ? (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-13 text-ink-muted">{tr("Could not load the guide.")}</p>
          <Button variant="neutral" size="small" className="max-md:h-10!" onClick={() => setPageTick((n) => n + 1)}>
            {tr("Try again")}
          </Button>
        </div>
      ) : (
        <>
          {page.v.stale && (
            <p className="mb-3 text-12 text-ink-muted">{tr("This page changed in English; showing the English version until its translation is updated.")}</p>
          )}
          <GuideMarkdown blocks={blocks} env={env} />
        </>
      )}
    </div>
  )

  if (mobile) {
    return current ? (
      <div className="flex min-h-0 flex-1 flex-col">
        {toolbar}
        {body}
      </div>
    ) : (
      nav
    )
  }
  return (
    <div className="flex min-h-0 flex-1">
      {nav}
      <div className="flex min-w-0 flex-1 flex-col">
        {toolbar}
        {body}
      </div>
    </div>
  )
}
