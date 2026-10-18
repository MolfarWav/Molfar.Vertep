/**
 * Files the built-in agent names in its replies. A markdown link to a
 * workspace-relative path, or an inline code span that is one, opens the file
 * through GET /v1/agent/file (src/server/app.ts).
 */

/** Top folders of the workspace: only these make a bare code span a link. */
const WORKSPACE_ROOTS = new Set(["apps", "projects", "uploads", "notes", "plugins", "commands", "skills", "memory", "characters", "lorebooks"])
const FILE_NAME = /\.[A-Za-z0-9]{1,8}$/

/** The workspace path a markdown link points at, or null for anything else
 *  (a web address, an anchor, a root-relative or mailto link). */
export function linkedWorkspacePath(href: string | undefined): string | null {
  if (!href) return null
  let raw = href.trim()
  // the markdown renderer resolves a relative link against this page's origin
  // before it reaches us, so "projects/a.json" and "/projects/a.json" both
  // arrive as http://<this host>/projects/a.json
  if (raw.startsWith(`${window.location.origin}/`)) raw = raw.slice(window.location.origin.length + 1)
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw) || raw.startsWith("#") || raw.startsWith("/") || raw.startsWith("\\")) return null
  raw = raw.replace(/[?#].*$/, "")
  try {
    raw = decodeURIComponent(raw)
  } catch {
    /* keep as written */
  }
  raw = raw.replace(/^(\.\/)+/, "").replace(/^@/, "")
  if (!raw || raw.split("/").includes("..") || !FILE_NAME.test(raw)) return null
  return raw
}

/** An inline code span that reads as a path inside the workspace. */
export function codeWorkspacePath(text: string): string | null {
  const t = text.trim().replace(/^(\.\/)+/, "")
  if (!/^[\p{L}\p{N}_.\-]+(\/[\p{L}\p{N}_.\-]+)+$/u.test(t)) return null
  const [first = ""] = t.split("/")
  if (!WORKSPACE_ROOTS.has(first) || t.split("/").includes("..") || !FILE_NAME.test(t)) return null
  return t
}

export const workspaceFileUrl = (rel: string, download = false) =>
  `/v1/agent/file?path=${encodeURIComponent(rel)}${download ? "&download=1" : ""}`

type HastNode = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[]; value?: string }
const textOf = (n: HastNode): string => (n.type === "text" ? (n.value ?? "") : (n.children ?? []).map(textOf).join(""))

/** rehype plugin: an inline `code` span naming a workspace file becomes a link
 *  (code blocks and spans already inside a link stay as they are). */
export function rehypeWorkspacePaths() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (node.tagName === "pre" || node.tagName === "a") return
      const kids = node.children
      if (!kids) return
      for (let i = 0; i < kids.length; i++) {
        const k = kids[i]!
        if (k.type === "element" && k.tagName === "code") {
          const rel = codeWorkspacePath(textOf(k))
          if (rel) kids[i] = { type: "element", tagName: "a", properties: { href: rel }, children: [k] }
        } else walk(k)
      }
    }
    walk(tree)
  }
}
