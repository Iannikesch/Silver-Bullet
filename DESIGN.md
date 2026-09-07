# Silver Bullet Agency — Design Brief

Read this before writing or modifying any UI code. All color values come from
`tokens.css`. Use the CSS variables, never raw hex, so the palette stays in one place.

## What this is

Silver Bullet is a performance-based marketing firm for service businesses under
$15M in revenue. Compensation is tied to results — rev share and profit share.
The site's job is to make that credible.

The design should read as a **precision instrument**: cold, exact, high contrast,
nothing decorative. It should not read as a creative agency portfolio, and it should
not read as a SaaS product page.

## Color rules

The palette is derived from a specific reference: cold steel subject, warm environment
behind it, deep ink shadows. Three rules carry it.

**1. No pure black, no pure white.**
Background is `#0A0D0E`, not `#000000`. Peak white is `#E8F1F2`, not `#FFFFFF`.
Every neutral is tinted toward cyan. This is what makes greys read as cold metal
rather than as grayscale. Pure values break it immediately.

**2. White is light, not surface.**
The brightest values in the reference are rim highlights and hot spots — small, and
the brightest thing in frame. White backgrounds are wrong here. `--white` is spent on
headlines and on nothing else. Body copy is `--steel-300`. If a block of white text
grows past a headline, step it down the steel ramp.

**3. Warmth appears once.**
The entire color story is cold steel against warm amber. `--amber` marks the primary
action and nothing else. One amber element per viewport. A second one cancels the
first. Secondary actions stay in steel — they do not get warmth.

Saturated color is 7% of the reference frame. Keep it near that. The palette includes
a magenta; it is under 1% of the source and should be used as a single small detail or
an error state, never as a theme.

## Separation without shadows

Panels and cards are not defined by fills or drop shadows. They are defined by a lit
top edge — 1px `--border-lit` on top, `--border` on the sides, `--ink` on the bottom.
Light falls from above and the bottom edge disappears into the page. See `.panel` in
`tokens.css`. Do not add `box-shadow` to establish depth.

### Rim light vs. glow

These are opposites and the distinction matters.

**Rim light is correct.** In the reference, highlights sit directly on the subject's
contours: hard-edged, tight to the form, tracing where light catches an edge. In CSS
that means a 1px border or a sharp inset highlight on the top or leading edge of an
element. A few small blown-out hot spots at `--white` are also right — points, not
fields. Highlights define edges. They never bleed.

**Ambient glow is wrong.** A soft colored halo radiating outward into empty space —
`box-shadow: 0 0 40px`, neon bloom, `text-shadow` on headlines — is the opposite
effect. It smears edges instead of sharpening them and reads as a template dark theme.

If a highlight has a blur radius larger than a couple of pixels, it has become glow.

## Typography

The reference has hard linework and heavy weight contrast. The type has to carry that.

- Display: condensed, heavy, tight tracking at large sizes. Set in `--white`.
- Body: clearly lighter and smaller, set in `--steel-300`, under 80 characters per line.
- Two families maximum, and they must be obviously distinct from each other.

Wide, thin, evenly-weighted type will flatten the whole design. Weight contrast between
display and body is the point.

## Do not

- `box-shadow` for depth, or any soft grey shadow under cards
- Soft ambient glow: `box-shadow` with a large blur and no offset, or colored halos
  bleeding into the space around an element. Rim light is a different thing and is
  encouraged — see below.
- Gradient washes as decoration, especially purple-blue
- `#FFFFFF` or `#000000` anywhere
- Tracked-out all-caps eyebrow labels above headings
- Identical rounded cards with one border-radius applied to everything
- An arrow appended to link or button text
- Fade-and-slide-up entrance animations on each section
- Monospace for small labels
- Meta strings joined with middle dots

## Motion

One orchestrated moment, if any. Motion that answers a click — opening, expanding,
confirming — is welcome because it shows what changed. Ambient motion is not.
Respect `prefers-reduced-motion`.

## Floor

Responsive to mobile. Visible keyboard focus on every interactive element. Contrast
checked against `--bg`; `--steel-700` and darker are for meta text only, not body copy.
