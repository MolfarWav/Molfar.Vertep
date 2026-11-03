# Agent forge: card help (#145), UI plan

Owner decision (2026-11-03): the help for a card lives in the panel of the selected card, not as a "?" on the
card itself.

## Why not a "?" on the card
The card header is one fixed-width row (title, then the card type or the call count). A "?" there competes with
dragging the card, is a tiny target on a zoomed-out board and on a phone (390 px), and cannot open a popover
without leaving the pan/zoom layer. The Card tab already shows the short hint under the title
(`card-form.tsx`, `fg.hint.<type>`), so the first line of help is one click away already.

## Where
Roleplay, Canvas > Agents board > open an agent > select a card > Card tab (`src/components/canvas/forge/card-form.tsx`).
Start: Agents in the rail, two clicks (agent, card).

## What is new
1. A folded block "What goes in and out" directly under the short hint. Closed by default (the hint stays the
   first line). Open: two short lists in plain words, "Takes in" and "Gives out", one line per port with its
   kind (text, number, yes/no, signal) and "optional" where it is. Built from `portsOf(node)`, so it follows
   the card's own settings (an Input card lists what it gives, a template lists its slots). No port: the block
   says the card has none (Note).
2. Three Help articles (group canvas): what a card, a wire and a run are; every card type in one line each;
   three worked agents from the ready ones. New strings: English and Ukrainian (Roleplay's rule).

## Reused
`Field`/hint styles of `card-form.tsx`, native `<details>` (no new component), `portsOf` from `src/lib/forge.ts`,
Help articles (`help-articles.json`, validator).

## States
- Empty (no ports): one line. Closed / open: native details. Edited card (ports change): the lists re-render.
- Read-only agent (an installed one): the block is shown, it only reads.
- Phone: full-width list, 44 px summary row, no hover.
- Dark and light: muted text tokens only, no new colours.

## Variants considered
A. Block in the Card tab (picked). B. "?" on each card header (rejected above). C. Popover from the palette entry
(the palette already shows the hint per type).

## Done when
Typecheck, rp tests, validator pass; browser check at 1280 dark/light and 390 px; the "UX check" block in the reply.
