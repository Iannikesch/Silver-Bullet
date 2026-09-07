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
- Respect `prefers-color-scheme` — light/dark both need to look intentional.

## Motion

Movement is a priority for this site, not a nice-to-have. Libraries in use:

- **GSAP** — scroll-triggered animation, timelines
- **Lenis** — smooth scroll

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
