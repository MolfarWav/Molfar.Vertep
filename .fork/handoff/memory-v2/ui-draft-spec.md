# M4b: the Ledger, a React UI for a story-memory record (shared spec)

You write part of a React 19 + TypeScript + Tailwind v4 UI inside a roleplay chat app ("Roleplay"). The data
comes from a plugin ("Litopys") that keeps, per chat: chapters (summaries of scenes), facts, proposals the
background worker makes, and an activity log. Attached files:
- `src/components/library/litopys-api.ts`: THE data contract: types and the fetch functions. Use only these.
  Every edit call answers the whole new chat view (`LitChat`); the caller replaces its state with it.
- `src/components/library/facts-list.tsx`, `worker-line.tsx`: the old read-only components (style reference;
  they will be replaced by yours).
- `src/components/dashboard/dash-notebook.tsx`: style reference for forms, Select, Badge, buttons in this app.
- `C.html`: the visual mockup "Ledger" (made-up data, its own CSS). Take the layout and the ideas, NOT its CSS:
  build with Tailwind classes and the app's components.
- `i18n-lit-en.txt`: the existing `lit.*` translation keys (English). Reuse them where they fit.

## App conventions (follow exactly)
- UI kit `@/components/ui/*` is shadcn on Base UI (NOT Radix): there is no `asChild`; triggers take a `render`
  prop: `<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={...}><DotsThree /></Button>} />`.
  Exports: Button (variants default|accent|outline|secondary|ghost|destructive|link; sizes default|xs|sm|lg|icon|icon-xs|icon-sm|icon-lg),
  Badge (variants default|secondary|destructive|outline|ghost|link), Input, Textarea, Checkbox,
  Select/SelectTrigger/SelectValue/SelectContent/SelectItem (`<Select value={v} onValueChange={(v) => set(v as T)}>`),
  DropdownMenu/DropdownMenuTrigger/DropdownMenuContent/DropdownMenuItem/DropdownMenuSeparator/DropdownMenuGroup,
  Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter, Tooltip/TooltipTrigger/TooltipContent,
  `useConfirm` from `@/components/ui/confirm`: `const [confirm, confirmDialog] = useConfirm()`; render `{confirmDialog}`
  once; `if (await confirm({ title, description, actionLabel, destructive })) ...` (destructive defaults to true = red
  action; pass `actionLabel` always, the default label is English).
- Icons: `@phosphor-icons/react` (PushPin, PushPinSlash, PencilSimple, Trash, ArrowCounterClockwise, Archive,
  DotsThree, Check, X, ArrowsClockwise, Plus, MagnifyingGlass, CircleNotch, Warning, WarningCircle, Clock ...).
  Icons in buttons: `className="size-3.5"` / `size-4`, `aria-hidden="true"`.
- Strings only through `const t = useT()` from `@/hooks/use-t` (`t('lit.key', { var: 1 })`, `{var}` in the text),
  relative time through `const rel = useRelativeTime()` (`rel(epochMs)`). `MsgKey` is a typed union: every key
  you use must exist; list NEW keys in your i18n output block (see Output). Never build a key from a string at
  runtime; use a switch/map to a literal key.
- Toasts: `import { toast } from 'sonner'` (`toast.success`, `toast.error(message)`, `toast.info`).
- `cn` from `@/lib/utils`. Colors only through theme classes (`text-muted-foreground`, `bg-card`, `border-border`,
  `text-primary`, `text-destructive`, `bg-accent`, `text-amber-600 dark:text-amber-400` for warnings,
  `text-emerald-600 dark:text-emerald-400` for ok). Must look right in dark and light themes.
- Phones (390 px wide): nothing may be clipped or need horizontal scroll; tab strips and filter bars WRAP;
  every row action is reachable through a `⋯` menu button that is always visible; inline hover buttons are an
  extra for `md:` and up only (`hidden md:flex` + `opacity-0 group-hover:opacity-100 focus-within:opacity-100`).
- Touch targets at least 36 px on phones (`size-9 md:size-7` for icon buttons).
- Busy state: disable the row's actions while its request runs; errors → `toast.error(errText(e))` where
  `const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))`.
- Add `data-testid` attributes named below (the browser check uses them).
- No new dependencies. No `any`. Named exports only. Keep each file under ~350 lines.

## Shared props of every tab
```ts
interface TabProps {
  chat: LitChat              // the current view
  onChat: (c: LitChat) => void  // replace the view with an edit call's answer
  onRefresh: () => void      // refetch (after an error that changed the file, e.g. "target gone")
}
```
Chapters cannot change while `chat.rebuilding` is set (the plugin answers 409 "rebuilding"): show the actions
disabled with a hint `t('lit.lockedRebuild')`.

## Pin flow (lives in ledger-facts.tsx, exported, also used by the proposals tab)
```ts
export function usePinFlow(chat: LitChat, onChat: (c: LitChat) => void): {
  /** proposalId: accept that pin proposal instead of pinning directly. */
  pin: (fact: LitFact, proposalId?: string) => Promise<void>
  dialog: React.ReactNode   // render it once in the tab
}
export function PinLimitDialog(props: { open: boolean; subject: string; limit: number; pinned: LitFact[];
  busy?: boolean; onCancel: () => void; onReplace: (replaceId: string) => void }): JSX.Element
```
pin(): calls `pinLitFact(chat.chatId, fact.id)` or `acceptLitProposal(chat.chatId, proposalId)`; on success
`onChat(answer)` + `toast.success(t('lit.pinnedToast'))`. If `isPinLimit(e)`: open PinLimitDialog with
`pinnedOf(chat.facts, fact.subject)` and `chat.pinLimit`; the user picks one (radio list of the pinned facts'
texts) and presses Replace → the same call again with `replace: pickedId`. Title `t('lit.pinLimitTitle',
{ name: subject, n: limit })`, text `t('lit.pinLimitBody')`. `data-testid="pin-limit-dialog"`.

## Output format
Only blocks like these, nothing else (no prose, no code fences around blocks):
```
=====FILE src/components/library/<name>.tsx=====
<full file content>
=====FILE .ledger-i18n/<name>.txt=====
lit.someKey | English text | Ukrainian text
```
One i18n line per NEW key: key, English, Ukrainian, separated by ` | `. Ukrainian: natural, short, no
grammatical gender guesses about the user. Variables keep their `{name}` form in both languages.
