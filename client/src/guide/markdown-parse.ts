// The guide's small Markdown renderer (format: .fork/handoff/guide/FORMAT.md).
// A pure parser (`parseGuideMarkdown`) makes plain data; the renderer turns it into React
// elements (markdown.tsx). Nothing here ever builds HTML from text, so a page cannot inject markup.

export type Inline =
  | { t: "text"; text: string }
  | { t: "bold" | "italic"; children: Inline[] }
  | { t: "code"; text: string }
  /** an external link; only http(s) ever gets here, anything else stays text */
  | { t: "link"; href: string; text: string }
  /** [[page]], [[book:page|text]]; book is null = the book of the page being read */
  | { t: "wiki"; book: string | null; page: string; label: string | null }

export type Block =
  | { t: "h"; level: 1 | 2 | 3; children: Inline[] }
  | { t: "p"; children: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] }
  | { t: "note"; children: Inline[] }

const SAFE_URL = /^https?:\/\/[^\s<>"']+$/i
const WIKI = /^\[\[([^\]\n]+)\]\]/
// one level of brackets inside the address is allowed: [x](javascript:alert(1)) is one link
const LINK = /^\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))*)\)/

export function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  let buf = ""
  const flush = () => {
    if (buf) out.push({ t: "text", text: buf })
    buf = ""
  }
  let i = 0
  while (i < src.length) {
    const rest = src.slice(i)
    const c = src[i]
    if (c === "[") {
      const w = WIKI.exec(rest)
      if (w) {
        const inner = w[1] ?? ""
        const bar = inner.indexOf("|")
        const target = (bar < 0 ? inner : inner.slice(0, bar)).trim().toLowerCase()
        const label = bar < 0 ? "" : inner.slice(bar + 1).trim()
        const colon = target.indexOf(":")
        const book = colon < 0 ? null : target.slice(0, colon)
        const page = colon < 0 ? target : target.slice(colon + 1)
        if (page && book !== "") {
          flush()
          out.push({ t: "wiki", book, page, label: label || null })
          i += w[0].length
          continue
        }
      }
      const l = LINK.exec(rest)
      if (l) {
        flush()
        const text = l[1] ?? ""
        const href = l[2] ?? ""
        // javascript:, data: and the like are shown as their text, not as a link
        if (SAFE_URL.test(href)) out.push({ t: "link", href, text })
        else out.push({ t: "text", text })
        i += l[0].length
        continue
      }
    } else if (c === "`") {
      const end = src.indexOf("`", i + 1)
      if (end > i + 1) {
        flush()
        out.push({ t: "code", text: src.slice(i + 1, end) })
        i = end + 1
        continue
      }
    } else if (c === "*") {
      const strong = src.startsWith("**", i)
      const mark = strong ? "**" : "*"
      let end = src.indexOf(mark, i + mark.length)
      // **b *c*** closes bold on the last two stars of the run
      if (strong) while (end > 0 && src[end + 2] === "*") end++
      if (end > i + mark.length) {
        flush()
        out.push({ t: strong ? "bold" : "italic", children: parseInline(src.slice(i + mark.length, end)) })
        i = end + mark.length
        continue
      }
    }
    buf += c
    i++
  }
  flush()
  return out
}

export function parseGuideMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n")
  const blocks: Block[] = []
  let para: string[] = []
  let list: { t: "ul" | "ol"; items: string[] } | null = null
  let note: string[] = []
  const flushAll = () => {
    if (para.length) blocks.push({ t: "p", children: parseInline(para.join(" ")) })
    if (list) blocks.push({ t: list.t, items: list.items.map(parseInline) })
    if (note.length) blocks.push({ t: "note", children: parseInline(note.join(" ")) })
    para = []
    list = null
    note = []
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    // a comment line (a translation's source hash) is not text
    if (/^<!--.*-->$/.test(line.trim())) continue
    if (!line.trim()) {
      flushAll()
      continue
    }
    const h = /^(#{1,3})\s+(.+)$/.exec(line)
    if (h) {
      flushAll()
      blocks.push({ t: "h", level: (h[1] ?? "#").length as 1 | 2 | 3, children: parseInline((h[2] ?? "").trim()) })
      continue
    }
    const q = /^>\s?(.*)$/.exec(line)
    if (q) {
      if (para.length || list) flushAll()
      note.push((q[1] ?? "").trim())
      continue
    }
    const li = /^\s{0,3}(?:([-*])|(\d+)[.)])\s+(.+)$/.exec(line)
    if (li) {
      const kind = li[1] ? "ul" : "ol"
      if (para.length || note.length || (list && list.t !== kind)) flushAll()
      if (!list) list = { t: kind, items: [] }
      list.items.push((li[3] ?? "").trim())
      continue
    }
    // a wrapped list item continues the last one
    if (list && /^\s+\S/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`
      continue
    }
    if (list || note.length) flushAll()
    para.push(line.trim())
  }
  flushAll()
  return blocks
}
