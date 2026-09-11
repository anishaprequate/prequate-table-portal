# Design system — information architecture and visual language

Written at the start of the "compartmentalisation" pass: pulling apart pages that
currently mix several concerns into one long scroll, and giving each concern its
own dedicated, clearly bounded space. This document is the reference both this
pass and future UI work should check against, so decisions stay consistent
instead of being re-litigated screen by screen.

Sources: Michael Filipiuk's *UI Design Principles* (navigation, cards, grid,
hierarchy chapters), plus this app's own established brand system (see
`apps/*/tailwind.config.ts` — paper `#FFFFFF`, orange `#FF9633`, deep-orange
`#F96900`, grey `#707070`, ink `#161616`, Product Sans / Awesome Serif italic).

## 1. Brand personality — already decided, stated here so it isn't re-guessed

Filipiuk's personality framework has three archetypes: Playful, Serious/formal,
Neutral. The Prequate Table is **Serious/formal**: muted, low-saturation
palette, an elegant serif for display type, real content over illustration,
formal language. Every new page must read as that same personality — no
playful color pops, no cutesy icons, no illustrations standing in for real
data. This is not a fresh decision each time; it's a constraint everything
below operates inside.

## 2. Navigation architecture — the core of this pass

Filipiuk's three navigation types, and when each applies:

- **Visible navigation** (the sidebar, in this app): always on screen, no
  extra click. Caps out around 5–7 items before it causes cognitive overload.
  Reserve it for top-level destinations only.
- **Hidden navigation** (a sub-nav that only appears once you're inside a
  section): used when a destination has more internal structure than the
  sidebar can hold without crowding it. This is the mechanism for "nested"
  navigation — the sidebar keeps one entry, and a second-level nav appears
  once that entry is open.
- **Contextual navigation** (a link inside content, not a nav element): a
  name that jumps to a detail page, a stat that jumps to its source records.

**The rule this pass follows:** a section that used to be tabs-on-one-page
(Registration/Guests/Blasts, Live/Draft/Archive) or a long vertical scroll of
unrelated blocks (Reports' eleven metrics) becomes a **hub page** — a parent
route holding a short set of summary cards, one per sub-section — plus **one
dedicated page per card**. The sidebar still shows one entry for the whole
area; the hub-and-detail structure lives one level in. This directly matches
Anisha's call: "Reports stays as one [nav item], it has sub pages within once
opened," applied as the template for every other area, not a Reports-only
exception.

**Persistent tree, not dead ends.** Every detail page keeps a way back up:
a breadcrumb-style trail (Reports > The Hour) at minimum, and — for
areas with genuinely deep nesting like an individual event — the parent
context should stay visible, not just a bare "Back" link. The existing
`BackLink` component is the floor, not the ceiling, for this pass.

## 3. Cards as the hub-page unit

Filipiuk: "think of a card as a shorter version of a specific page — figure
out which content from that page is important enough to place on a card."
That is exactly the hub-page pattern above. Each card on a hub page should
show only the 2–4 numbers or facts that help someone decide whether to open
it — not a cramming-down of the full page. A card must look clickable
(a lift on hover, a border or shadow that reads as "raised") and must never
mix two different pieces of unrelated content — one card, one subject.

## 4. Visual hierarchy toolkit (Gestalt, from the Basics/Grid chapters)

These are the actual levers for making previously-crammed content "visually
distinguishable" (the event detail page's ticket-types / edit form /
description problem, named directly):

- **Common region** — a shared border, background tint, or card boundary
  makes everything inside read as one group, and — just as importantly —
  everything *outside* it reads as not that group. This is the single
  biggest fix for "not visually distinguishable": if two sections currently
  share no visual boundary, that's the defect.
- **Proximity** — related things closer together, unrelated things
  further apart. A gap is itself a signal; don't rely on a label alone to
  separate two sections that sit right on top of each other.
- **Alignment** — everything on a shared grid line reads as related; one
  misaligned element reads as a mistake, not as emphasis.
- **Size, color, position** — bigger, bolder, and higher-on-the-page all
  read as "more important, look here first." Use deliberately, not on
  everything at once (Filipiuk: "when everything stands out, nothing
  stands out").

## 5. Grid and spacing

- Prefer a consistent spacing scale over ad hoc pixel values — this app
  already leans on Tailwind's spacing tokens, which is effectively the
  "soft 8pt/4pt grid" Filipiuk recommends (values are multiples of a base
  unit, not necessarily snapped rigidly). Keep using that; don't introduce
  arbitrary one-off spacing values when building new pages.
- Fixed-width layouts (the existing `max-w-*` containers) suit
  content-heavy, form-like pages — keep using them for anything read
  top-to-bottom. Full-width grids suit card layouts (a hub page's card
  grid) so they can respond to viewport width.

## 6. The admin/member split — reaffirmed, not new

- **Admin console: optimize for information density.** More can be visible
  per screen, more metrics per hub, more table columns. The audience is a
  small, trained internal team who wants the full picture without hunting
  for it.
- **Member app: optimize for least clicks and easy navigation.** Fewer
  things per screen, fewer taps to the thing they actually want, more
  guidance and less density. A member should never need to know where
  something "lives" the way an admin might.

This means the *hub-and-detail* pattern above applies to both, but the hub
pages themselves look different: an admin hub page's cards can be
data-dense (numbers, mini-charts); a member hub page's cards stay closer to
Filipiuk's plain example — a title, one supporting line, and a clear sense
of "tap here for more."

## 7. Rollout

Two passes, per Anisha's direction:
- **Pass 1 — Admin console.** The larger, more information-dense rebuild:
  Reports (hub + themed sub-pages, drill-downs become full pages instead of
  slide-overs), Events (Registration/Guests/Blasts and Live/Draft/Archive as
  dedicated pages, Luma import queue separated out), Members (list and
  detail), and any other admin area with the same tabs-crammed-on-one-page
  shape encountered along the way.
- **Pass 2 — Member app.** Applying the same navigation philosophy, but
  optimized for the opposite goal: fewer clicks, not more density.

Nothing is explicitly out of scope for either pass — anywhere the same
crammed-together pattern shows up gets the same treatment.
