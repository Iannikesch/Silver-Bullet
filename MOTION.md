# Motion

How motion.js, intro.js and the CSS animations actually work. The visual
argument for WHAT moves and why is in DESIGN.md; this is the engineering.
Read both before touching anything that moves.

## The inventory

Movement is a priority for this site, but it is rationed. What moves: the bullet
intro, the reactive chrome on two elements, four marquee bands — the word band's
two rows, the creative conveyor and the logo band — the hero reel (two 9:16
clips taking turns in one window beside the headline; `reel.js`, no GSAP,
driven by each clip's own `ended` event, paused off screen and in background
tabs, never fetched under 760px or under reduced motion), two scroll-triggered
reveals (the client wall, and the platform band under "Platforms we work on"), the
testimonial band, which advances itself on a 7s dwell, and the verticals
carousel, which drifts its industry cards on a continuous loop at about 9s per
card. Nothing else does.

The testimonial band is the fourth ambient mover and the verticals carousel is
the fifth. DESIGN.md said a fourth would force a re-examination and that there
would be no fifth; both are written up there, under "The fourth mover" and
"The fifth mover". The carousel is vanilla JS in `vertical-rail.js` — no GSAP —
and is allowed because it yields to hover, focus and touch, holds off screen,
fades everything but the centre card, and never starts under reduced motion.
There is no sixth; the next thing that wants to move on its own is traded for
one of these, not added.

There are two scroll reveals, and they sit on consecutive sections. The client
wall drops its heading in and rises its logos; the platform band slides its head
down and then converges sixteen marks a row at a time, each row in two stages:
the outer pair sweeps in from the two viewport edges, and as it lands the inner
pair chases in behind it from the same edges. Rows are grouped by rendered
position, not index, so the four-across grid can drop to two or one and every
mark still enters from the edge it is nearer to. Both are once-only, both
set their start state from JS so a no-JS or reduced-motion load is simply
visible, and both are in `motion.js` (`initClientReveal`, `initPlatformReveal`).

The ceiling was one, and the second was added deliberately. The argument is
re-opened and recorded in DESIGN.md under "The orchestrated moments" — including
the standing recommendation: if the page reads busy, drop the client wall reveal
rather than adding anything. Do not add a third.

### What's loaded

CDN script tags only — no bundler, no npm, no build step. Exact versions pinned,
never `@latest`, all `defer`red so they never block first paint.

- **GSAP 3.13.0** — core, from cdnjs
- **ScrollTrigger 3.13.0** — from cdnjs
- **Lenis 1.1.20** — smooth scroll, from jsDelivr. Not on cdnjs; the
  `dist/lenis.min.js` build sets `globalThis.Lenis`, so it works from a plain
  script tag.

Site motion code lives in `motion.js`, loaded deferred after the libraries.

One scroll-linked effect lives outside it, on purpose: the **stack** on the
home page, where "A glimpse at our work" pins (CSS `position: sticky`, negative
top) and "Companies who trust us" slides up over it. `stack.js` only measures
the pin height and writes a 0–1 progress that the stylesheet turns into a small
scale-down and dim on the pinned section. No GSAP, same doctrine as `nav.js`:
the markup works with the file absent. Scrubbed and reversible, so it is in the
"answers scroll" category DESIGN.md allows, not a new ambient mover. Off under
768px and under reduced motion the push-back is dropped (the pin stays).

One web font, self-hosted: `Assets/fonts/bebas-neue-latin.woff2` (Bebas Neue,
the wordmark's face, OFL, 8.6KB latin subset). Used only by the word band.
Preloaded from every `<head>`; `motion.js` re-measures the marquees on
`document.fonts.ready` so the loop seam never goes stale. No Google Fonts
origin — keep it that way, it is a privacy-policy line the moment it changes.

### The bullet intro is CSS-only, and stays that way

The opening sequence — bullet crossing the viewport, drawing the nav rule,
friction heat, glint, wordmark wipe, logo travel — is pure CSS animation
orchestrated by a single `.is-intro` class on `<body>`. It does not use GSAP and
should not be ported to it. The base stylesheet *is* the finished state, so with
JS off or motion reduced the page is simply correct and nothing animates.

It plays on every **arrival** — fresh visit, refresh, typed URL, external link —
and not on a click between pages of this site, which used to read as the banner
glitching. `intro.js` decides from the Navigation Timing type and the referrer,
and stores nothing. Consequence to know: a refresh while scrolled down returns
you to the top, because the sequence needs the top of the page.

Timeline values live in `:root` in `index.html` as `--t-*` custom properties.

### The marquee bands are CSS-only, and they are the ambient exception

Four strips run perpetual right-to-left marquees at deliberately different
speeds: the word band's two rows (`.ticker__row`, ~38 and ~30px/s - big hollow
words with a lit subset, modelled on thearmcandy.com's client-partners strip;
the pinned amber CTA it used to carry is gone), `.conveyor` (creative, four slots
in view, ~49px/s) and `.logo-band` (client logos, ~16px/s). Speeds are
`data-marquee-speed` in the markup, px/s; the `:root` rates are the no-JS
fallback. Keep them apart or they read as one striped block - the two word rows
are close on purpose so they slide against each other as one band, and that is
the only pair allowed to be.

Every band is `[data-marquee]` wrapping a `[data-marquee-track]`. That pairing is
what the reduced-motion rule and the hover handler both key off, so a new band
gets both behaviours for free.

The word band alone also arrives with the intro. Each row is two nested
transforms that compose: `.ticker__travel` is intro-only and rides out with the
bullet, then returns on a hard ease-out; `.ticker__track` is the constant-rate
loop underneath. Both rows carry their own travel so the ride-out hits both. Through the return the travel layer sheds
speed while the track holds its pace, so the composite runs from the bullet's
own velocity down to the drift with no seam.

This moves on its own, which DESIGN.md otherwise rules out. That exception is
deliberate and recorded there — do not "fix" it, and do not extend it to
anything else.

**The stylesheet declares each loop as a CSS animation, and `motion.js` takes it
over at runtime.** It reads the duration the CSS declared, sets
`animation: none`, and drives the same motion from GSAP's ticker. With JS off
the CSS animation is what runs, so the bands still rotate — they just cannot be
touched.

That handover exists because a CSS animation's position cannot be scrubbed:
there is no way to say "you are now 340px further along" without restarting it,
and dragging is exactly that. Once the position is a number this file owns, drag,
throw and speed all fall out of the same value.

Per band: `pos` is the owned position, wrapped with `gsap.utils.wrap` over one
set width; hover and focus are held as separate booleans and resolved by
`applyRate()` (focus outranks hover) rather than each calling the setter, which
is what stopped the keyboard stop from being cancelled by a hover; a throw
becomes a decaying `fling` velocity, clamped, and decayed per frame-time so it
travels the same distance at 120Hz as at 60.

### GSAP does reactive chrome and scroll-linked motion only

- **Lenis** owns scrolling. It runs off GSAP's ticker rather than its own RAF
  loop so the two never compete, and `lenis.on('scroll', ScrollTrigger.update)`
  keeps ScrollTrigger in sync. Anchor links are routed through `lenis.scrollTo`.
- **Reactive chrome** drives a `--light` custom property (0–100) that slides the
  hard stop positions in the chrome gradients via `calc()`. Fed by pointer
  position on desktop and by ScrollTrigger scrub everywhere, eased through
  `gsap.quickTo` at 0.3s so the highlight lags behind the cursor.

Applied to **exactly two elements**: the hero headline and the bullet. Updating a
custom property that drives a gradient repaints that element every frame, so this
does not scale — and per DESIGN.md, if everything shines, nothing does.

Everything bails out completely under `prefers-reduced-motion`: Lenis is
destroyed, no pointer listeners are bound, and the chrome gradients stay static
at their default `--light: 50`.

Use `use context7` when writing GSAP or Lenis code so the API is current.

Bias toward restraint. Slow, weighty, purposeful. If everything moves, nothing
reads as intentional.
