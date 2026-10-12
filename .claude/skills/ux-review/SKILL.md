---
name: ux-review
description: Use before building and before calling done any UI change (a new setting, switch, field, block, dialog, question, page) in the shell, the agent page, the Roleplay app, a plugin panel or a new app. Checks that a user can find it, understand it and use it, on desktop and on a phone.
---

# UX review: can the user find, understand and use it?

The rule (CLAUDE.md, user 2026-10-12): every UI change is judged first by how
easily a user finds it, understands it and uses it. A feature nobody finds or
understands is not done, however well the code works. This applies to the
shell (`client/`), the agent page (`client-agent/`), the Roleplay app, plugin
panels and anything new.

Run it twice: section 1 before writing the UI, sections 2-7 before calling it
done (together with `browser-check`). Report the result in the reply as a short
"UX check" block: what you checked, what you changed because of it, what is
left on purpose.

## 1. Before building: three questions

1. **Find.** Where will the user look for this? Put a control next to the
   thing it changes (decided 2026-10-11: app settings live in the apps, not in
   the shell's Settings). A setting that affects one chat sits in that chat's
   panel; one that affects one card sits in the card editor.
2. **Understand.** Can a user who never read the docs tell what it does from
   the label and one line under it? If not, rename it or add the hint
   (section 3) before adding more UI.
3. **Use.** How many taps from where the user already is? Does it work with
   its default, so most users never touch it?

If the answer to any of them is bad, fix the design, not the wording.

## 2. Fewer fields, grouped

- **Default first.** Every new option has a default that works. The control is
  for the few who need another value.
- **Basics visible, the rest folded.** Show what most users need; put the rest
  under a collapsed "More" / "Advanced" section that remembers its state (the
  Roleplay lorebook entry editor's "more" toggle in
  `src/components/lore/entry-editor.tsx` keeps it in `sessionStorage`).
- **Group by task, not by data type.** Related controls go into one block with
  a heading and a border (`border-line` / `bg-panel` in the shell, `border` /
  `bg-card` in Roleplay). Three to seven controls per block; more means split
  it or fold part of it.
- **Pick the lightest control.** On/off: a switch or checkbox. Two or three
  choices: a segmented control or radio row, so all choices are visible. Four
  or more: a select. Free text only where the value really is free.
- **One question per field.** A field that means two things becomes two fields
  or one choice.
- **Examples in placeholders** for free text ("e.g. 0.7", "e.g. Kyiv, 1918"),
  never an instruction that disappears on the first keystroke.

## 3. Explain at the right level

Three levels, from cheapest to richest. Use the lowest one that is enough.

1. **Label.** Plain words, a verb for actions ("Rate the scene", not "Scene
   rating execution"). Same term everywhere for the same thing.
2. **Inline hint.** One sentence under the control, small and muted: what it
   does or when to change it. Existing patterns: `hint` on `Toggle` in
   `client/src/server-settings.tsx` and on fields in `client/src/model-panel.tsx`
   (shell, `text-11`/`text-12`, `text-ink-muted`/`text-ink-faint`);
   `FieldDescription` from `src/components/ui/field.tsx` or the local `Hint`
   in the lore entry editor (Roleplay, `text-muted-foreground`).
3. **Info button ("i").** For anything longer than one sentence: an `info`
   icon next to the label that opens a popover on **click or tap**. Roleplay
   and the agent page have `ui/popover.tsx`; the shell uses `@base-ui/react`
   (`Popover`). The shell already uses the `info` icon (`IconSmall
   name="info"`, the app list in `client/src/App.tsx`).

Hover-only help is invisible on a phone. A `title=` attribute or a hover
`Tooltip` is fine only as a duplicate of something already visible (the name
of an icon button, which also gets `aria-label`). Anything the user needs to
know never lives only in a tooltip.

A disabled control says why, in visible text next to it, not in a tooltip.

## 4. Draw attention on purpose

- **Colour carries meaning, from tokens only.** Shell: `accent` / `cta` for the
  main action, `warning` + `warning-soft` for "look at this", `danger` +
  `danger-soft` for destructive or broken, `success` for done
  (`client/src/styles/tokens.css`). Roleplay: `primary` / `cta`,
  `destructive`, `muted` (`src/globals.css`). No hex values: custom themes
  override single tokens and a hex ignores them.
- **One primary action per view.** Everything else is a secondary or ghost
  button. Two bright buttons side by side means nobody knows which to press.
- **Never colour alone.** Pair it with an icon or a word (colour-blind users,
  and themes where two tokens come out close).
- **Borders and backgrounds group, outlines mark state.** A callout for an
  important note: a soft background + a border in the same hue + an icon. The
  accept-mode amber outline on the agent composer (`client/src/styles/shell.css`)
  is the model for "this needs you now".
- **Check every theme.** Vertep (default), dark, light. A colour that works on
  dark often vanishes on light (open item: the palette yellow on light themes).

## 5. Feedback and recovery

- **Every action shows a result.** Loading: a skeleton or `TextShimmer`, never a
  frozen button. Done: a toast (`sonner` in Roleplay) or a visible change. Error:
  what went wrong and what to do next, in plain words.
- **Destructive actions** ask first (`ui/confirm.tsx` / `alert-dialog.tsx` in
  Roleplay, `Dialog` in the shell) or offer undo. Undo is better when it is
  cheap to build.
- **A way back.** Anything the user can edit that has a default gets a
  "Restore default" (the 0.9.9 prompt restore audit set this for prompts; it
  holds for every new editable default).
- **Empty states teach.** An empty list says what goes there and offers the
  first action (`ui/empty.tsx` in Roleplay), never just "Nothing here".
- **Remember small choices** per viewer: the open tab, a folded section, the
  last sort. Not a setting, just not resetting them on every visit.

## 6. Phone and desktop

Breakpoints: below 768 px is a phone (shell `@media (max-width: 767px)` in
`shell.css`; Roleplay `MOBILE_BREAKPOINT` in `src/hooks/use-mobile.ts`, wide
rail from 1200 px).

- **Touch targets at least 40 px** on phones (`size-10`). The common `size-8`
  icon button (32 px) is fine with a mouse; on phones give it more room or
  space it out so a thumb hits one thing.
- **Nothing hover-only.** Controls that appear on hover on desktop are always
  visible on phones (the shell's app list does this: `group-hover/app:opacity-100
  @max-4xl:opacity-100`).
- **No sideways scroll.** Long names, code and JSON wrap or truncate; flex
  children get `min-w-0` (the 0.9.7 prompt inspector slid sideways without it).
  `browser-check`'s `shot` warns when a page scrolls sideways.
- **Big forms become pages.** On phones a large dialog is full screen (the
  shell's x-large dialog) and a section is a page or a drawer (Roleplay
  `SectionPage`, `opensAsDrawer`). Put the main action where the thumb is and
  keep it above the keyboard.
- **Long translations.** Ukrainian and Russian strings run about a third longer
  than English. Check the 390 px screenshot with `lang: "ru"` or `"uk"` when the
  layout is tight.

## 7. Text and access

- New shell strings go into all 14 locales (CLAUDE.md rule); Roleplay nav and
  page titles go through `t()`.
- Short, plain, verb first. Numbers carry their unit ("tokens", "s", "%").
- Every input has a label tied to it; every icon-only button has `aria-label`.
- Keyboard works: Tab reaches it in a sensible order, Enter submits, Esc closes,
  focus is visible (`line-focus` / `ring`).
- Reuse the existing component before inventing a new pattern. A second way to
  do the same thing is a bug in waiting.

## 8. The walk-through (before done)

With `browser-check`, open the change at 390 px light and 1280 px dark and walk
it as a first-time user:

1. From the place the user starts, can you reach it without knowing where it is?
2. Without hovering, can you tell what each new control does?
3. Change a value. Do you see that it took effect?
4. Make a mistake (wrong value, delete something). Can you get back?
5. Is anything cut off, overlapping, sideways-scrolling or too small to tap?

Any "no" is fixed before done, or named in the reply as left on purpose, with
the reason.
