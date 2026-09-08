# Texture pack

Reusable surface treatments for the Silver Bullet site. Buildless — no bundler,
no dependencies beyond GSAP, which the site already loads.

| File | What it is |
|---|---|
| `textures.css` | every treatment. Load **after** `tokens.css`. |
| `textures.js` | behaviour for the treatments that need it. |
| `sandbox.html` | live demo of all of them. **Append-only** — new demos go below. |
| `TEXTURES.md` | this file. |

Nothing in the pack defines a colour of its own. Every value comes from
`tokens.css`, so retheming the site retextures it too.

---

## Quickstart: the pack on a new page

Four steps. Copy this into any new page and everything below is available.

```html
<head>
  <link rel="stylesheet" href="tokens.css?v=2">
  <link rel="stylesheet" href="textures.css?v=2">   <!-- AFTER tokens.css -->
</head>

<body class="tx-grain">                              <!-- page-wide grain -->

  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js"></script>
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js"></script>
  <script defer src="textures.js?v=2"></script>
  <script>
    window.addEventListener('DOMContentLoaded', function () {
      initTextures();                    // cursor-reactive textures
      initThermal();                     // any .tx-thermal on the page
      initFrost('.site-header', 24);     // if the page has a sticky bar
      initHalo();                        // only if you use .tx-halo--pulse
      initVideoGround();                 // only if you use .tx-video-ground
    });
  </script>
</body>
```

**The one page-specific difference.** On `index.html`, `motion.js` also runs and
publishes the same signals for its own elements, so the call there is
`initTextures({ drive: false })` — see *Two engines* below. On a page **without**
`motion.js`, call plain `initTextures()` so the pack drives everything itself.

`defer` does nothing on an inline `<script>`, which is why the boot code waits
for `DOMContentLoaded`. Deferred files have all run by the time it fires.

---

## Conventions

### Naming

Every knob the pack owns is `--tx-<texture>-<property>`:

```
--tx-halo-pad-x     --tx-frost-blur      --tx-star-size
--tx-halo-rate      --tx-frost-fill      --tx-torch-color
```

Shared concepts share a name across textures — `pad-x`, `pad-y`, `rate`,
`size`, `strength`, `low`, `high`. You should be able to guess a knob rather
than look it up.

### The shared signal contract

Five variables are **not** prefixed, because they are the interface between the
pack and `motion.js` rather than any one texture's setting:

| Variable | Range | Meaning |
|---|---|---|
| `--light` | 0–100 | where the specular band sits horizontally |
| `--light-y` | 0–100 | the same, vertically |
| `--lit` | 0–1 | is this element currently lit |
| `--mx` / `--my` | % | derived in CSS from the two above |

Anything that writes these must ease them. Instant tracking reads cheap; the
lag is what gives light mass.

### Two engines, and which owns what

- **`[data-chrome]`** → `motion.js`. One global per-frame loop, blends pointer
  *with scroll*, always active. Currently the intro bullet and the contact bar.
- **`[data-texture]` without `data-chrome`** → the pack. Per-element hover
  listeners, active only while the pointer is on the element. Cheaper, and it
  is what "hover-only" actually means.

`initTextures()` skips any element carrying `data-chrome`, so the two can never
fight over one variable.

### House rules

1. **Ration the metal.** Two or three metallic moments per page. If every panel
   is chrome, none of them read as metal.
2. **Metal is an object, never a text background.** Chrome runs to `#E1E1E1`
   and steel type on it is unreadable.
3. **Always give a derived variable a `var()` fallback** — `var(--light, 50)`.
   An undefined variable makes the whole declaration invalid and the element
   renders with *no background at all*, silently, with nothing in the console.
   This has cost real time three separate times.
4. **A texture must render correctly with no JS.** JavaScript only improves it.
5. **Bump `?v=` on any file you change**, or returning visitors get a stale
   cached copy. This was missed for four commits and shipped stale CSS.
6. **Nothing reaches a page before it exists in `sandbox.html`.**
7. **Percentages are invalid for a `circle` radius** — lengths only. `ellipse`
   takes both.
8. **A custom property resolves its `var()`s where it is DECLARED**, not where
   it is used. Anything referencing a per-element value must be declared on
   that element.

---

## Catalogue

| Class | Category | Needs JS | Status |
|---|---|---|---|
| `.tx-grain` | ground | no | on site — `<body>` |
| `.tx-vignette` | ground | no | sandbox only |
| `.tx-vignette--in` | ground | no | on site — hero |
| `.tx-thermal` | ground | yes | on site — hero |
| `.tx-video-ground` | ground | yes | sandbox only, no footage yet |
| `.tx-bore` | ground | no | sandbox only |
| `.tx-brushed` | surface | no | on site — contact bar |
| `.tx-metal-text` | type | no | sandbox only |
| `.tx-etched` | type | no | built, unused |
| `.tx-rim` | cursor | yes | on site — contact bar |
| `.tx-rim-text` | cursor | yes | on site — hero `h1` |
| `.tx-glare` | cursor | yes | on site — 3 CTAs |
| `.tx-torch` | cursor | yes | on site — 2 hero CTAs |
| `[data-texture="star"]` | cursor | yes | sandbox only |
| `.tx-sweep` | entrance | yes | on site — contact bar |
| `.tx-frost` | bar | yes | on site — header |
| `.tx-halo--lung` | halo | no | on site — logo |
| `.tx-halo--orbit` | halo | no | built, unused |
| `.tx-halo--pulse` | halo | yes | built, unused |

---

## Grounds

### `.tx-grain`
Static film grain over the whole page, from an inline SVG data URI — no request,
no library. Put it on `<body>`.
- **Knob:** `opacity`. The whole effect lives between `0.03` and `0.07`.
- Sits at `z-index: 70`, just above `.intro-layer`.
- **Never animate it.** Moving grain is ambient motion and repaints the entire
  viewport every frame.

### `.tx-vignette` / `.tx-vignette--in`
Edge falloff. The plain class is `position: fixed` and darkens the whole
viewport; the `--in` variant is absolute and darkens one section.
- **Use `--in` near a sticky header.** The fixed version sits over the header
  and dims the ticker's amber CTA, and a dimmed accent is no longer an accent.

### `.tx-thermal`
Cold ground with warmth rising underneath and receding.
- **Needs:** `initThermal()`, GSAP + ScrollTrigger.
- **Markup:** `<div class="tx-thermal"><span class="th-cold"></span><span class="th-warm"></span> … </div>`
- **Bound to scroll, never to a clock.** `DESIGN.md` permits one element that
  moves with no input and the ticker holds it. `--tx-heat` follows a sine arc
  across the section's scroll range: nothing as it arrives, peak when it fills
  the screen, gone as it leaves. A linear ramp would be brightest at one edge.
- **Wrap, don't apply.** On `index.html` it wraps the hero rather than sitting
  on `.hero`, which is a `.wrap` — the ground would have stopped at the text
  column instead of running full width.

### `.tx-bore`
Looking straight down a rifled barrel, drawn entirely in gradients. No image
request, no canvas, no JS. Built as the ground for the punchline band.
- **Knobs:** `--tx-bore-size`, `-crown`, `-step`, `-throat`, `-twist`, `-feather`,
  `-key` / `-key-x` / `-key-y` / `-fill`, `-depth`, `-dof`, `-marks`, `-turn`,
  `-grain`, `-warm`
- **Markup:** `.tx-bore` > `.bore-barrel` > `.bore-crown`, twenty
  `.bore-ring` spans carrying `--i:0`…`19`, then `.bore-throat`, `.bore-fall`,
  `.bore-key`, `.bore-fill`. Content goes in a sibling `.bore-content`.
- **Ring count is the whole illusion.** Each ring is inset further and rotated
  further round; that rotation is the rifling twist. Ten rings at 6deg read as a
  stair-stepped gear stack. Twenty at 2.2deg cover the same total twist and
  resolve into a continuous helix.
- **Every inset is from all four sides, so 50% is zero diameter.** The first
  version had `crown + 6 * step` land past 50%, and the throat and the last two
  rings silently had negative size. Keep `--tx-bore-throat` well under 50%.
- **Rings are masked to a feathered outer band** (`--tx-bore-feather`). Unmasked,
  each ring paints a full disc and the one inside covers it with a hard circular
  edge — plates on a spindle, not a tunnel.
- **`.bore-fall` is the layer that sells it.** Light entering a barrel does not
  come back out. Without that inward falloff the rings stay evenly bright to the
  middle and it reads as a target. It also beds the headline: the type sits in
  the dark part of the art rather than on a scrim over it.
- **`.bore-key` is `overlay`, not `soft-light`.** On a base this dark soft-light
  did nothing and the bore had no light direction at all.
- **Ships neutral.** `--tx-bore-warm` tints the key toward `--amber` and is
  nicer, but metal is neutral per `tokens.css` and the band spends its one accent
  on a CTA. Dial, not a default.
- **One per page.** Twenty blurred layers plus two blend modes. It is static so
  it composites once and never repaints — but do not animate anything that would
  force the blurred rings to re-render.

### `.tx-video-ground`
Footage as a background, suppressed until it reads as a room.
- **Needs:** `initVideoGround()`.
- **Knobs:** `--tx-video-brightness` (.32), `--tx-video-saturation` (.55),
  `--tx-video-blur` (2px)
- **Three layers:** `.vg-css` a drift ground that ALWAYS works, `.vg-video`
  optional footage over it, `.vg-crush` the vignette and bottom fade.
- **The suppression is the technique.** Raw footage behind text looks cheap; a
  third brightness with the edges deleted looks like a lit room.
- **Never requests the file** under reduced-motion, below 780px, or with
  save-data set. Fades in only on `canplay`, so a missing or slow file leaves
  the CSS ground standing. Nothing ever falls to black.
- **Budget:** 3–4s and 1–2MB. The reference site ships a 26MB loop.

## Surfaces and type

### `.tx-brushed`
Machined metal: fine directional marks over a neutral chrome ramp, lit top
edge, dark bottom edge, no drop shadow.
- Marks should be felt, not counted.
- Composes with `.tx-rim` and `.tx-sweep`. Both set `background-image`, so
  `.tx-brushed.tx-rim` is declared explicitly — without it the later rule wins
  and the marks silently vanish.

### `.tx-metal-text`
Metal painted inside letterforms. Falls back to readable grey if
`background-clip: text` is unsupported.

### `.tx-etched`
Type stamped *into* a surface: shadow on the top edge, light on the bottom.
- **Both offsets have zero blur.** A blurred text-shadow is glow, which the
  brief rules out; a 1px hard offset is an edge, which it encourages.
- For labels and numbers, not headlines.

## Cursor-reactive

### `.tx-rim` / `.tx-rim-text`
The restrained one. The lit top edge brightens and the bright band leans toward
the cursor. No hot spot, nothing bleeding past the edge. `-text` paints the same
ramp into letterforms and takes no borders.
- **Knob:** `--tx-rim-lean` (0.45%)
- Renders correctly with no JS at all — the ramp just stops leaning.

### `[data-texture="star"]`
Hot core plus two crossed spikes.
- **Knobs:** `--tx-star-size` (em in type, px on surfaces), and four colours:
  `--tx-star-hot` / `-warm` / `-mid` / `-pool`
- **Invisible until something drives `--lit`.**
- **Too aggressive for small elements.** On a button it reads as an event, on a
  surface you are only passing over on the way to clicking.
- **Restate the colours on a warm or bright surface.** White-and-gold on amber
  is nearly invisible; cold gives hue contrast as well as luminance.

### `.tx-glare`
A moving specular band laid OVER an element instead of replacing its surface.
- For anything with a colour it must keep. `.tx-rim` on an amber CTA replaces
  the fill with chrome and the viewport loses its accent entirely.

### `.tx-torch`
The pointer becomes a light source. One soft pool, no core, no spikes.
- **Knobs:** `--tx-torch-size` (120px), `--tx-torch-color`
- **Speed lives in the markup:** `data-lit-in` / `data-lit-out`, in seconds.
- A slow ramp automatically uses `power2.out`, not the star's `back.out` — an
  overshoot on a slow light reads as a flicker.

## Entrances

### `.tx-sweep`
A band of light rakes across once as the element enters view.
- **Needs:** `initTextures()`, GSAP + ScrollTrigger.
- `once: true`. A band that crosses on every scroll is ambient motion.
- Only a transform animates, so it is cheap enough for a real page.

## Bars

### `.tx-frost`
Invisible at the top of the page, frosts once scrolled, so content passes under
it blurred rather than hidden.
- **Needs:** `initFrost(selector, thresholdPx)`
- **Knobs:** `--tx-frost-blur` (7px), `--tx-frost-fill` (58% of `--bg`)
- **The two states are the cost control.** While unscrolled, `backdrop-filter`
  is not applied at all — not zero-blur, absent. It is one of the most
  expensive things a browser composites, and worst over playing video.
- Touch and `prefers-reduced-transparency` get an opaque pane and no blur.
- The bar must have no background of its own, or it wins over the pane.

## Halos

### `.tx-halo` + `--lung` / `--orbit` / `--pulse`
A contained field of light behind one element. One body, three characters.
- **Knobs:** `--tx-halo-pad-x` / `-pad-y`, `--tx-halo-rate`, `--tx-halo-low` /
  `-high`, `--tx-halo-strength` (orbit)
- **`--lung`** swells and subsides. CSS only. `alternate` makes the exhale the
  inhale reversed, so the loop has no seam.
- **`--orbit`** light travels around it. CSS only, via a registered
  `@property`. **The element never rotates, only the gradient's angle** —
  rotating a wide, short box swings its corners outside its container and the
  light escapes.
- **`--pulse`** a cardiac lub-dub. Needs `initHalo()`. The rest between beats is
  what makes it a pulse rather than a throb.
- **Sized to cover the whole element**, not pool under its middle. Colour carries
  to 74% of the radius.
- **All three are cold.** A warm halo would be a second warm element in the same
  viewport as the ticker's amber CTA.
- **Inside a frosted bar a halo sits on top of the pane** — `backdrop-filter`
  blurs what is behind an element, never its own children.

## Motion tokens

```
--dur-quick  .18s   a state change answering a click or hover
--dur-base   .42s   the default
--dur-slow   1.15s  one orchestrated moment, used sparingly
--ease-settle / --ease-metal
```

`textures.js` reads the durations back out of CSS, so they are one source of
truth. **The easing curves cannot be shared** — CSS wants `cubic-bezier()`,
GSAP wants `"power3.out"`, neither parses the other — so those are mirrored by
hand. Change one, change both.

---

## Where the pack touches index.html

Seven places. If the page is restructured these are the only things to
re-attach; the pack itself is structure-agnostic.

1. `<head>` — `<link href="textures.css?v=2">`, after `tokens.css`
2. `<body class="tx-grain">`
3. `.hero-ground` — a full-bleed wrapper AROUND `<section class="hero">`, with
   `tx-thermal tx-vignette--in` and two child spans (`.th-cold`, `.th-warm`)
4. `.contact__bar` — `tx-brushed tx-rim tx-sweep`, `data-chrome="contact"`,
   `data-texture="rim"`
5. Before `</body>` — `textures.js` plus the boot script
6. `<header class="site-header tx-frost">`, with its own `background` removed
7. `<a class="logo tx-halo tx-halo--lung">`

Plus in `motion.js`: `registerChrome()` for `[data-chrome="contact"]` and the
bullet. The headline's registration was removed when it moved to the hover-only
driver.

### Rule while restructuring

Do **not** sprinkle `tx-` classes into new markup as you build. Get the
structure and the real copy right first, then re-attach in one deliberate pass.
Textures scattered during a rebuild is how a three-element metal budget quietly
becomes twelve.

---

## Open items

- [ ] **Star power dial** — one knob scaling core, spikes and warmth together,
      plus a subtle preset. Currently tuned aggressive.
- [ ] **Star reads weaker in type than on a surface** — the metal under the
      letters is bright, so a warm highlight has less to beat.
- [ ] **Supply a `ground.mp4`** to see `.tx-video-ground` with real footage.
- [ ] **`.tx-etched` has no home** — the obvious one is eyebrow labels above
      headings, which `DESIGN.md` bans. Needs a different use before it ships.
- [ ] **Precision tick marks** — proposed, not built.
- [ ] **`DESIGN.md` Motion section is out of date** — it permits one ambient
      element; the site now has the ticker and the breathing logo.
- [ ] **Site bug:** `index.html` overflows horizontally on mobile. Pre-existing,
      likely the four header nav items never collapsing.
