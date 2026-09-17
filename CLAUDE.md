# Silver Bullet Agency — site

Marketing site for a performance-based marketing agency: rev share or profit
share instead of retainers, for service businesses under $15M/yr. The visitor
is an owner-operator who is skeptical of agencies. No jargon.

## Stack

Vanilla HTML, CSS and JS. No framework, no bundler, no build step, no npm.
Libraries come only from pinned CDN script tags, and only with my approval.
Deployed on Vercel, auto-deploys on push to `main`. Repo:
github.com/Iannikesch/Silver-Bullet.

Do not touch the deploy setup or Vercel config, add a dependency, or add a
build step without asking. If a change needs one, stop and make the case.

## File ownership

**Shared. Never edited in a worktree; only on `main`, one change at a time:**
`tokens.css`, `site.css`, `CLAUDE.md`, `DESIGN.md`, `TEXTURES.md`,
`MOTION.md`, `LEARNING.md`, everything under `.claude/`.

**Safe to isolate in a worktree:** one page's HTML, one JS module
(`nav.js`, `booking.js`, `enquire.js`, `roll.js`, `reel.js`, `stack.js`,
`vertical-rail.js`, `testimonial-slider.js`, `capabilities.js`), one texture
file (`bore.css`, `nightfield.css`), assets.

Five branches all editing `site.css` is how the last round went. If a task
touches a shared file while another branch is open, say so first and propose
sequencing instead.

## Tokens

`tokens.css` is the one file every value comes from: colour, spacing, type
scale, radius, alpha, easing, duration. Never hardcode a colour, a spacing
value, a radius or an easing curve. If the value you need is not a token,
say so rather than inventing one inline.

Every `var()` gets a fallback: `var(--light, 50)`. An undefined custom
property silently blanks the element with nothing in the console. This has
cost real time three separate times.

No cache-busters. Vercel revalidates every asset on every load via ETag.
`?v=` strings were hand-bumped for four rounds of merge conflicts and never
changed what a visitor received.

## Copy and content

- **No em dashes anywhere in site copy.** Use a comma, a colon, or a period.
- **No client shown as an approved case study without my sign-off.** Placeholder
  clients, testimonials and results exist from the prototype; none goes on the
  live domain as real until I say so.
- **Every interactive element gets `data-track="{section}-{element}"`** —
  every button, CTA and nav link.

## Motion, in brief

Rationed, and every mover is written down in `MOTION.md`. The bullet intro is
CSS-only and stays that way. There are five ambient movers and two orchestrated
reveals; DESIGN.md records why each was allowed. Adding a mover means
re-opening that argument in DESIGN.md, not slipping one past it. Every
animation respects `prefers-reduced-motion`. Bias toward restraint: if
everything moves, nothing reads as intentional.

## Working with me

I'm not a developer. I'm learning by doing. These rules apply every session.

**1. Refuse vague design requests.** If I ask for something subjective with
no specifics ("make it warmer," "this looks like shit," "make it pop"), do not
start building. Ask me up to three concrete questions with the AskUserQuestion
tool, translating my vibe into levers: which property, which token, which
measurable value. Then restate what you will build in technical terms and get
my confirmation.

**2. Force plan mode on anything structural.** If a request would touch more
than two files, add motion, restructure a section, or add a page, and I am not
in plan mode, stop and tell me to Shift+Tab first. Say why in one line.

**3. Ask for the screenshot.** If I describe a visual problem in words without
attaching an image, ask for a screenshot before building. One sentence, then
wait.

**4. Name the feature I should have used.** End every task with one line:
which Claude Code feature (plan mode, /rewind, /clear, a subagent, a slash
command, a hook, a worktree) would have made this faster or safer, and why.
One line only. No lectures.

**5. Branch discipline check.** If I ask you to start work that touches a
shared file while other branches are open, say so before starting and
recommend sequencing instead.

**6. Keep a learning log.** Maintain `LEARNING.md` at the repo root. After
each session, append a dated entry: what I tried to do, what went wrong, the
feature that would have prevented it, and the one-line lesson. Chronological,
never rewrite past entries, each entry under five lines. When a mistake
repeats three times, flag it at the top under "Still not learned."

**7. Explain in my language.** When you use a term I probably don't know,
define it in half a sentence inline. Don't stop to teach unless I ask.

Also: explain what a change does, briefly, when it's not obvious. Push back
if I ask for something that will cause problems later. Don't dump 200 lines
and say "done" — tell me what changed and why.

## Where the doctrine lives

- `DESIGN.md` — the visual argument. Colour rules, type, the "do not" list,
  why each mover was allowed. Read it before writing or changing any UI.
- `MOTION.md` — how the motion actually works: the intro, the marquee
  handover, reactive chrome, what is loaded and why.
- `TEXTURES.md` — the surface treatment pack and the trap in each one.
- `LEARNING.md` — what I keep getting wrong.

## Still open

Ask before assuming: brand colours and typography beyond what's in
`tokens.css`; real copy (much is placeholder); one page or several.

## sandbox.html

My personal scratch file for learning GSAP. Gitignored, not part of the site.
Don't edit it unless I ask.
