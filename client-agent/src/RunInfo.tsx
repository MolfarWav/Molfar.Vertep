// Under an assistant message: the skills the run loaded (each opens in the
// memory panel) and what the run really took (steps, tokens, price).
import { useAuiState } from "@assistant-ui/react"
import { BookOpen, Brain } from "@phosphor-icons/react"
import type { ReactNode } from "react"
import type { RunSkill, RunSpend } from "./api"
import { compactTokens, usd } from "./lib/format"
import { useAgent } from "./store"

interface SkillChip extends RunSkill {
  count: number
}

/** The same skill (and file) loaded twice is one chip: tokens add up. */
export function mergeSkills(list: readonly RunSkill[]): SkillChip[] {
  const out = new Map<string, SkillChip>()
  for (const s of list) {
    const key = `${s.scope ?? ""}\n${s.name}\n${s.file ?? ""}`
    const known = out.get(key)
    if (known) {
      known.tokens += s.tokens
      known.count += 1
    } else out.set(key, { ...s, count: 1 })
  }
  return [...out.values()]
}

const spendTokens = (s: RunSpend): number => s.input + s.output + s.cacheRead + s.cacheWrite

function spendLabel(s: RunSpend): string {
  const parts: string[] = []
  if (s.calls) parts.push(s.calls === 1 ? "1 step" : `${s.calls} steps`)
  parts.push(`${compactTokens(spendTokens(s))} tok`)
  if (s.cost !== null && s.cost > 0) parts.push(usd(s.cost))
  return parts.join(" · ")
}

function spendTitle(s: RunSpend): string {
  const n = (v: number): string => v.toLocaleString()
  const price = s.cost === null ? "no known price" : usd(s.cost)
  return `This run: input ${n(s.input)}, output ${n(s.output)}, cache read ${n(s.cacheRead)}, cache write ${n(s.cacheWrite)} tokens${s.calls ? `, ${s.calls} model calls` : ""}; ${price}`
}

export function RunInfo(): ReactNode {
  const id = useAuiState((s) => s.message.id)
  const msg = useAgent((s) => s.msgs.find((m) => m.id === id))
  const openSkill = useAgent((s) => s.openSkill)
  const openMemory = useAgent((s) => s.openMemory)
  if (!msg || msg.streaming) return null
  const chips = msg.skills?.length ? mergeSkills(msg.skills) : []
  const spend = msg.spend && spendTokens(msg.spend) > 0 ? msg.spend : null
  const memory = msg.memory ?? []
  if (!chips.length && !memory.length && !spend) return null
  return (
    <div className="text-muted-foreground ms-2 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs" data-testid="run-info">
      {chips.length ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1" data-testid="run-skills">
          <BookOpen size={14} className="shrink-0" aria-hidden />
          {chips.map((c) => {
            const scope = c.scope ?? "global"
            const label = `${c.name}${c.file ? `/${c.file}` : ""} · ${compactTokens(c.tokens)} tok${c.count > 1 ? ` ×${c.count}` : ""}`
            return (
              <button
                key={`${scope}/${c.name}/${c.file ?? ""}`}
                type="button"
                title={`Skill ${c.name} (${scope}) loaded in this run, about ${c.tokens.toLocaleString()} tokens`}
                className="bg-muted/60 hover:bg-muted hover:text-foreground max-w-full truncate rounded-md px-1.5 py-0.5"
                onClick={() => openSkill({ scope, name: c.name, ...(c.file ? { file: c.file } : {}) })}
              >
                {label}
              </button>
            )
          })}
        </div>
      ) : null}
      {memory.length ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1" data-testid="run-memory">
          <Brain size={14} className="shrink-0" aria-hidden />
          {memory.map((m) => (
            <button
              key={`${m.file}|${m.date ?? ""}|${m.text}`}
              type="button"
              title={`From memory (${m.file}): ${m.text}`}
              className="bg-muted/60 hover:bg-muted hover:text-foreground max-w-full truncate rounded-md px-1.5 py-0.5"
              onClick={() => openMemory({ file: m.file, text: m.text, ...(m.scope ? { scope: m.scope } : {}) })}
            >
              from memory: {m.text.length > 40 ? `${m.text.slice(0, 39).trimEnd()}…` : m.text}
            </button>
          ))}
        </div>
      ) : null}
      {spend ? (
        <span className="ms-auto" title={spendTitle(spend)} data-testid="run-spend">
          {spendLabel(spend)}
        </span>
      ) : null}
    </div>
  )
}
