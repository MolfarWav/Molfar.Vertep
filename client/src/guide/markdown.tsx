// The guide's Markdown renderer: React elements only, never HTML from text.
// The parser is pure and lives in markdown-parse.ts (unit-tested without React).
import type { ReactNode } from "react"
import type { Block, Inline } from "./markdown-parse"

export { parseGuideMarkdown, parseInline } from "./markdown-parse"
export type { Block, Inline } from "./markdown-parse"

export interface GuideLinkEnv {
  /** the book of the page on screen, for [[page]] without a book */
  book: string
  /** does this page exist in the guide? */
  exists: (book: string, page: string) => boolean
  /** the title of a page, for a link without text */
  titleOf: (book: string, page: string) => string | null
  onOpen: (book: string, page: string) => void
}

function renderInline(nodes: Inline[], env: GuideLinkEnv, keyPrefix = ""): ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}${i}`
    switch (n.t) {
      case "text":
        return n.text
      case "bold":
        return (
          <strong key={key} className="font-semibold text-ink">
            {renderInline(n.children, env, `${key}.`)}
          </strong>
        )
      case "italic":
        return <em key={key}>{renderInline(n.children, env, `${key}.`)}</em>
      case "code":
        return (
          <code key={key} className="rounded bg-panel px-1 py-0.5 font-mono text-[0.92em] text-ink">
            {n.text}
          </code>
        )
      case "link":
        return (
          <a key={key} href={n.href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:opacity-80">
            {n.text}
          </a>
        )
      default: {
        const book = n.book ?? env.book
        const text = n.label ?? env.titleOf(book, n.page) ?? n.page
        if (!env.exists(book, n.page)) {
          return (
            <span key={key} className="text-ink-muted">
              {text}
            </span>
          )
        }
        return (
          <button
            key={key}
            type="button"
            onClick={() => env.onOpen(book, n.page)}
            className="inline cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] text-accent underline underline-offset-2 hover:opacity-80 max-md:py-1"
          >
            {text}
          </button>
        )
      }
    }
  })
}

export function GuideMarkdown(props: { blocks: Block[]; env: GuideLinkEnv }) {
  const { blocks, env } = props
  return (
    <div className="max-w-[68ch] text-14 leading-[1.6] text-ink-muted">
      {blocks.map((b, i) => {
        const key = String(i)
        if (b.t === "h") {
          if (b.level === 1) return <h1 key={key} className="mb-3 font-heading text-20 leading-tight text-ink">{renderInline(b.children, env)}</h1>
          if (b.level === 2) return <h2 key={key} className="mb-2 mt-6 font-heading text-16 leading-tight text-ink">{renderInline(b.children, env)}</h2>
          return <h3 key={key} className="mb-1.5 mt-4 font-heading text-14 leading-tight text-ink">{renderInline(b.children, env)}</h3>
        }
        if (b.t === "p") return <p key={key} className="mb-3">{renderInline(b.children, env)}</p>
        if (b.t === "note") {
          return (
            <blockquote key={key} className="mb-3 rounded-lg border border-line border-l-4 bg-panel px-3 py-2 text-ink">
              {renderInline(b.children, env)}
            </blockquote>
          )
        }
        const items = b.items.map((it, j) => <li key={String(j)} className="pl-1">{renderInline(it, env)}</li>)
        return b.t === "ul" ? (
          <ul key={key} className="mb-3 list-disc pl-5">{items}</ul>
        ) : (
          <ol key={key} className="mb-3 list-decimal pl-5">{items}</ol>
        )
      })}
    </div>
  )
}
