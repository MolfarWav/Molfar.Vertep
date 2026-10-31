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

Run it twice: section 1 before writing the UI, sections 2-9 before calling it
done (together with `browser-check`). Report the result in the reply as a short
"UX check" block: what you checked, what you changed because of it, what is
left on purpose.

## The bar (user, 2026-10-31)

Roleplay's front is a website in all but name. "It works" is the floor, not the
goal. Four words judge every screen:

- **Practical.** The common task takes the fewest steps; defaults do the work.
- **Native.** It behaves like the platform people already know: Esc closes, the
  back button goes back, targets fit a thumb, nothing is hover-only.
- **Designed.** One type scale, one spacing rhythm, a clear hierarchy, room to
  breathe. The screen looks like one product, not like many sessions' work.
- **Client-first.** Words and structure follow what the person is trying to do,
  not how the data is stored.

If a screen is not good to look at or not clear at a glance, say so and
propose redesigning it, even when that is more than the task asked: propose
first, with variants; never restyle silently, and never ship a worse screen
because it is "consistent with the old one".

**Depth, not "three clicks".** The three-click rule is a myth: people leave when
a step gives no sign it leads to what they want, not at click four. So for a new
feature name where the user starts and count the steps, and make sure every step
shows where it leads (a clear label, or a summary of what is behind it). A
control whose purpose is clear only after opening it is a blind step: redesign it.

## 1. Before building: the plan and three questions

**Write the UI plan first and keep it** (in the task notes or the PR text):

- Where it lives and the steps from the screen the user starts on.
- Which existing components it uses, by file path, found by searching the app,
  not from memory; and what is new and why the existing ones do not fit.
- Every state: empty, loading, error, default, changed, disabled, folded and
  open, phone.
- For anything bigger than one control: two or three layout variants with a
  one-line trade-off each, and the pick. Show variants (a quick HTML mock in
  the browser) before the code when the user's taste decides it.

At done, compare the screenshots with this plan line by line (walk-through 6).
A difference is fixed or reported, never shipped silently.

Then the three questions:

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
- **Fold last, not first.** A long screen is fixed first by cutting words,
  grouping under real headings and ordering by use. Fold only what most people
  never need (numeric limits, expert switches). Never fold two or three short
  rows: a fold hides more than it saves. A wall of text turned into five folds
  is still a wall, only closed (the World DM panel, 2026-10-31).
- **A fold must look like a fold.** The header is a full-width button, at least
  40 px high, with a caret of 16 px or more in the text colour (not faint), and
  a hover and focus state. Closed, it shows a one-line summary of what is
  inside or its current values ("Records · every 5 replies · 800 characters");
  a count of changed settings is the minimum. No folds inside folds. The open
  state is remembered. Use the app's one shared fold component (section 7).
- **Group by task, not by data type.** Related controls go into one block with
  a heading and a border (`border-line` / `bg-panel` in the shell, `border` /
  `bg-card` in Roleplay). Three to seven controls per block; more means split
  it or fold part of it (by the fold rules above).
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
- Reuse before inventing. Search the app's components (`ui/` and the folder of
  the screen) for the same job (fold, setting row, section, card, empty state)
  and use it. If it does not fit, extend it in place so every user of it gets
  better; do not write a local copy next to it. A second way to do the same
  thing is a bug in waiting (Roleplay already has several differently styled
  folds, one of them added for the World DM panel).

## 8. Looks right

- **One type scale.** Use the app's steps only. New text is never below 12 px
  (hints and captions 12, body 14); `text-[10px]` and the like are not for new
  work, and the ones already in the code go when their screen is redone.
- **Hierarchy.** At most three levels on a screen: title, section heading, row.
  Levels differ by size, weight and space, not by colour alone; a section
  heading is visibly more than a row.
- **Rhythm.** Spacing steps of 4 px (4, 8, 12, 16, 24). The same gap between
  things of the same level; related things closer than unrelated ones.
- **Affordance.** What can be pressed looks pressable at a glance (shape, fill,
  underline, hover); state (the current tab) looks different from an action.
  A control that looks like a plain label is a bug: an inactive segmented
  option, a fold header.
- **One pattern per job on a screen.** Do not mix a bordered card, a hairline
  list and a coloured-edge card for the same kind of block in one panel.
- **Density.** A screen of equally weighted rows has no hierarchy. It needs
  headings, grouping or fewer rows.
- **Squint test.** Look at the screenshot small or blurred: can you still see
  the title, the groups, what is a button and where the main action is? If not,
  redo the hierarchy before polishing anything.

## 9. The walk-through (before done)

With `browser-check`, open the change at 390 px light and 1280 px dark and walk
it as a first-time user:

1. From the place the user starts, can you reach it without knowing where it is?
2. Without hovering, can you tell what each new control does?
3. Change a value. Do you see that it took effect?
4. Make a mistake (wrong value, delete something). Can you get back?
5. Is anything cut off, overlapping, sideways-scrolling or too small to tap?
6. Compare with the UI plan from section 1: same place, same components, same
   states? Name every difference.
7. Look at the screenshots yourself (not only the DOM): squint test and the
   section 8 list, on the 1280 px and the 390 px one.

Any "no" is fixed before done, or named in the reply as left on purpose, with
the reason.
