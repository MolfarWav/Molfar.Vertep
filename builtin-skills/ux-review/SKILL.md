---
name: ux-review
description: Use before adding or changing UI in an app or plugin, and before calling it done. Triggers: "додай перемикач", "нове поле", "зроби налаштування", "add a setting", "new panel". Checks the user can find, understand and use it, on a phone too.
---

# Can the user find it, understand it, use it?

The user's rule: a UI change is judged first by how easily people find, understand and use it, on
desktop and on a phone. Working code that nobody finds or understands is not done.

## Before you build: three questions
1. **Find.** Where will the user look for it? Put the control next to what it changes (a chat's
   setting in that chat's panel, a card's in the card editor), not in a far-away Settings page.
2. **Understand.** Can someone who never read the docs tell what it does from its label and one
   line under it? If not, rename it before adding more UI.
3. **Use.** How many taps from where the user already is? Does the default work, so most users never
   touch it?

## Fewer fields, grouped
- Every option has a default that works. Rare options go under a folded "More" / "Advanced".
- Group related controls in one block with a heading and a border. More than about seven controls
  in a block: split it or fold part of it.
- On/off: a switch. Two or three choices: show them all (radio row, segmented buttons). Four or
  more: a select. Free text only where the value really is free.
- One question per field. Placeholders show an example ("e.g. 0.7"), never the only instruction.

## Explain at the right level
1. The label: plain words, a verb for actions, the same term everywhere.
2. One muted line under the control: what it does or when to change it.
3. Longer help: an "i" icon next to the label that opens a popover on click or tap.
Phones have no hover: a `title=` or hover tooltip only repeats something already visible (the name
of an icon button, which also gets `aria-label`). A disabled control says why, in visible text.

## Attention on purpose
- Colours come from the theme's variables (the app's `:root` / `@theme`), never hex: the user's
  themes change them. Accent for the main action, one per view; red for destructive or broken;
  amber for "look at this"; green for done.
- Never colour alone: add an icon or a word.
- Borders and a soft background group things; a callout for an important note gets a soft
  background, a border in the same hue and an icon.
- Check the dark and the light theme.

## Feedback and recovery
- Every action shows a result: loading, done, or an error saying what to do next.
- Deleting asks first or can be undone. An editable default gets "Restore default".
- An empty list says what goes there and offers the first action.
- Small choices (open tab, folded section, sort) are remembered, not reset on every visit.

## Phone
- Below 768 px: tap targets at least 40 px, nothing that appears only on hover, no sideways
  scroll (`min-w-0` on flex children, long text wraps or truncates).
- Big forms become a full-screen page or drawer; the main button stays reachable above the keyboard.
- Ukrainian and Russian text runs about a third longer than English: leave room.

## Before you say "done"
Walk it as a first-time user, then report it in one or two lines next to the `finish-change` report:
1. From where the user starts, can they reach it without knowing where it is?
2. Without hovering, is each new control clear?
3. After a change, do they see it took effect?
4. After a mistake, can they get back?
5. Anything cut off, overlapping, too small to tap or scrolling sideways on a phone?
You cannot see the page yourself: say which of these you could not check, and ask the user to look
at the phone width when it matters.
