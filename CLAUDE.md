# Silver Bullet Agency — site

Marketing site for Silver Bullet Agency. Single-page, static.

## Who this is for

Silver Bullet is a performance-based marketing agency. The hook is skin in the
game — rev share / profit share rather than flat retainers. Target market is
service-based businesses doing $15M/yr and under.

The visitor is an owner-operator, not a marketing director. Write to someone who
runs a business and is skeptical of agencies. No jargon, no "synergy," no
"leverage our proprietary framework."

## Stack

- Vanilla HTML / CSS / JS. No framework, no build step.
- Deployed on Vercel, auto-deploys on push to `main`.
- Repo: github.com/Iannikesch/Silver-Bullet

Keep it buildless. If a change would require a bundler, npm scripts, or a
framework, say so and ask before doing it.

## Conventions

- Semantic HTML. Real `<section>`, `<nav>`, `<header>` — not div soup.
- CSS custom properties for all colors and spacing. Define once at `:root`.
- `clamp()` for type scale. Responsive without breakpoint spam.
- Respect `prefers-reduced-motion` on every animation. Not optional.

## Motion

Movement is a priority for this site, but it is rationed. What moves: the bullet
intro, the reactive chrome on two elements, three marquee bands — the hook
banner, the creative conveyor and the logo band — and one scroll-triggered
reveal on the client wall. Nothing else does.

The client wall reveal is the "one orchestrated moment" DESIGN.md allows, and it
is now spent: heading drops in from above, logos rise from below, once, on
scroll. It is deliberately not a pattern — do not add a second one without
re-opening the argument. Recorded in DESIGN.md under "The one orchestrated
moment".

### What's loaded

CDN script tags only — no bundler, no npm, no build step. Exact versions pinned,
never `@latest`, all `defer`red so they never block first paint.

- **GSAP 3.13.0** — core, from cdnjs
- **ScrollTrigger 3.13.0** — from cdnjs
- **SplitText 3.13.0** — from cdnjs. Loaded and available, currently **unused**.
- **Lenis 1.1.20** — smooth scroll, from jsDelivr. Not on cdnjs; the
  `dist/lenis.min.js` build sets `globalThis.Lenis`, so it works from a plain
  script tag.

Site motion code lives in `motion.js`, loaded deferred after the libraries.

### The bullet intro is CSS-only, and stays that way

The opening sequence — bullet crossing the viewport, drawing the nav rule,
friction heat, glint, wordmark wipe, logo travel — is pure CSS animation
orchestrated by a single `.is-intro` class on `<body>`. It does not use GSAP and
should not be ported to it. The base stylesheet *is* the finished state, so with
JS off or motion reduced the page is simply correct and nothing animates.

Timeline values live in `:root` in `index.html` as `--t-*` custom properties.

### The marquee bands are CSS-only, and they are the ambient exception

Three strips run perpetual right-to-left CSS marquees at deliberately different
speeds: `.ticker` (the hook, ~28px/s, with a pinned amber CTA that does not
scroll), `.conveyor` (creative, four slots in view, ~45px/s) and `.logo-band`
(client logos, ~18px/s). Rates live in `:root`; keep them far apart or the three
read as one striped block.

Every band is `[data-marquee]` wrapping a `[data-marquee-track]`. That pairing is
what the reduced-motion rule and the hover handler both key off, so a new band
gets both behaviours for free.

The hook banner alone also arrives with the intro. It is two nested transforms
that compose: `.ticker__travel` is intro-only and
rides out with the bullet, then returns on a hard ease-out; `.ticker__track` is
the constant-rate loop underneath. Through the return the travel layer sheds
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

## Working with me

I'm not a developer. I'm learning by doing.

- Explain what a change does, briefly, when it's not obvious.
- Push back if I ask for something that'll cause problems later. Don't just do it.
- Don't dump 200 lines and say "done." Tell me what changed and why.

## Still open

These aren't decided yet — ask before assuming:

- Brand colors, typography, logo
- Real copy (current text is placeholder)
- Whether the site stays one page or splits out

## Don't touch without asking

- Anything that changes the deploy setup or Vercel config
- Adding dependencies or a build step
Before writing or changing any UI, read DESIGN.md. Use the CSS variables in tokens.css — never raw hex values.

## sandbox.html

My personal scratch file for learning GSAP. Not part of the site, gitignored.
Don't edit it unless I ask.
