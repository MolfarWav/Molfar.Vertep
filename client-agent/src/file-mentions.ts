import type {
  Unstable_DirectiveFormatter,
  Unstable_TriggerAdapter,
  Unstable_TriggerItem,
} from "@assistant-ui/core"
import type { Mentionable } from "./api"

/**
 * What a picked file leaves in the message: the path, after the "@" that opened
 * the picker. The stock formatter writes the directive syntax it uses to render
 * mentions as chips (`:file[plugin.js]{name=plugins/…}`), which is not what
 * anyone meant to say, and is what the model would have read.
 */
export const filePathDirective: Unstable_DirectiveFormatter = {
  serialize: (item) => `@${item.id}`,
  // the result is ordinary text, so there is nothing to parse back out
  parse: (text) => [{ kind: "text", text }],
}

export const fileTriggerItem = (path: string): Unstable_TriggerItem => ({
  id: path,
  type: "file",
  label: path.split("/").pop() || path,
  description: path,
})

/** A character, lorebook or preset as a picker row. Its id is its file, so it
 *  serializes exactly like a picked file: `@<path>`. */
export const mentionableTriggerItem = (m: Mentionable): Unstable_TriggerItem => ({
  id: m.path,
  type: m.kind,
  label: m.name,
  description: m.path,
  metadata: { app: m.app },
})

/**
 * A flat trigger adapter over a list of workspace paths.
 *
 * Flat matters: offering a category makes the popover open on a folder to drill
 * into rather than on the files, and since it only renders items once a
 * category is active or a search is running, it opens as an empty sliver and
 * stays that way until something is typed.
 *
 * `mentionables` come from their own endpoint and, like `files`, are what was
 * last fetched. `onQuery` is how the caller refreshes `files` from the engine — the adapter
 * contract is synchronous, so a search answers from what is already loaded and
 * asks for what was just typed.
 */
export function fileTriggerAdapter(
  files: readonly string[],
  onQuery: (q: string) => void,
  mentionables: readonly Mentionable[] = [],
): Unstable_TriggerAdapter {
  return {
    categories: () => [],
    categoryItems: () => [],
    search: (query: string) => {
      const q = query.toLowerCase()
      onQuery(q)
      // characters, lorebooks and presets first: they are what a person
      // means by a name, and their files are also in the list below
      const named = mentionables
        .filter((m) => m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q))
        .map(mentionableTriggerItem)
      const taken = new Set(named.map((i) => i.id))
      return [...named, ...files.filter((p) => !taken.has(p) && p.toLowerCase().includes(q)).map(fileTriggerItem)]
    },
  }
}
