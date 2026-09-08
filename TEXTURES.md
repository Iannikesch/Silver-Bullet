# Texture pack — catalogue

Drop-in surface treatments for the Silver Bullet site. Files:

- `textures.css` — every treatment. Load **after** `tokens.css`.
- `textures.js` — behaviour for the three interactive ones. Call `initTextures()`.
- `sandbox.html` — live demo of all of them. **Append-only**: new textures go
  below the existing ones so the page stays a running reference.

No build step, no dependencies beyond GSAP (already on the site).
Nothing here defines a colour of its own — every value comes from `tokens.css`.

---

## 1. Film grain — `.tx-grain`

Put it on `<body>`. Static noise over the whole page, drawn from an inline SVG
data URI, so no request and no library.

- **Needs JS:** no
- **Knob:** `opacity` — the whole effect lives between `0.03` and `0.07`
- **Why static:** moving grain is ambient motion, and it repaints the entire
  viewport every frame

## 2. Vignette — `.tx-vignette`

Also on `<body>`. Darkens toward the edges. Same idea as the grain at a
different scale: stops the background reading as a flat screen.

- **Needs JS:** no
- **Knob:** the `60%` ink mix in the radial gradient
- **Pairs with:** grain. They're designed to be used together.

## 3. Brushed metal — `.tx-brushed`

Machined surface for panels, bars, blocks. Fine directional marks over a
neutral chrome ramp, lit top edge, dark bottom edge, no drop shadow.

- **Needs JS:** no
- **Knobs:** `--tx-brushed-grain` alphas (3% / 11%) — marks should be felt,
  not counted; `--tx-metal-ramp` stops
- **Composes with:** the star, the sweep

## 4. Rim light — `.tx-rim` + `data-texture="rim"`

Cursor-reactive, restrained. The lit top edge brightens and the bright band in
the metal leans toward the pointer. No hot spot, nothing bleeding past edges.

- **Needs JS:** yes (edge transition is pure CSS and works without)
- **Knob:** `--rim-lean` multiplier (`0.45%`) — how far the band travels
- **Use it:** anywhere the star is too much, which is most places
- **Degrades well:** renders correctly with no JS at all

## 5. Star — `data-texture="star"`

Hot core plus two crossed spikes, tracking the cursor. Warm because it is the
room reflecting off the surface, not the surface itself.

- **Needs JS:** yes — invisible until something drives `--lit`
- **Finishes:** `.tx-brushed[data-texture="star"]` on a surface,
  `.tx-metal-text[data-texture="star"]` clipped into letterforms
- **Knobs:** `--star-unit` (em in type, px on surfaces), the `20%` white stop
  in the core, spike lengths (`5.6` / `4.6`), `back.out(1.7)` snap on entry
- **Status:** currently tuned aggressive. Power dial not yet built.

## 6. Specular sweep — `.tx-sweep`

A band of light rakes across once as the element scrolls into view. Not a loop.

- **Needs JS:** yes, plus ScrollTrigger
- **Knobs:** `--dur-slow`, the `75%` gold mid-stop, `skewX(-18deg)` rake angle,
  `start: 'top 78%'` trigger point
- **Cheap:** only a transform animates
- **`once: true`** — a band that crosses on every scroll is ambient motion

## 7. Etched type — `.tx-etched`

Letters pressed *into* the surface: shadow on the top edge, light on the bottom.
The inverse of `.tx-metal-text`.

- **Needs JS:** no
- **Rule:** both offsets have **zero blur**. A blurred text-shadow is glow,
  which the brief rules out; a 1px hard offset is an edge, which it encourages.
- **Use it:** labels, numbers, small caps. Not headlines.

## 8. Motion tokens

Three durations and two curves at `:root`, shared by everything.

    --dur-quick .18s   a state change answering a click or hover
    --dur-base  .42s   the default
    --dur-slow  1.15s  one orchestrated moment, used sparingly
    --ease-settle / --ease-metal

`textures.js` **reads the durations back out of the CSS**, so they are a single
source of truth. The easing curves cannot be shared this way — CSS wants
`cubic-bezier()`, GSAP wants `"power3.out"`, neither parses the other — so those
are mirrored by hand. Change one, change both.

## 9. Video ground — `.tx-video-ground`

Footage as a background, suppressed until it reads as a room rather than as a
video playing behind the text. The technique on profectusagency.com, sized down.

    <div class="tx-video-ground">
      <span class="vg-css"></span>
      <video class="vg-video" src="ground.mp4" loop muted playsinline preload="none"></video>
      <span class="vg-crush"></span>
    </div>

- **Needs JS:** `initVideoGround()`
- **Knobs:** `--vg-bright` (.32), `--vg-sat` (.55), `--vg-blur` (2px)
- **Three layers:** `.vg-css` a drift ground that ALWAYS works, `.vg-video`
  optional footage over it, `.vg-crush` the vignette and bottom fade
- **The suppression is the technique.** Raw footage behind text looks cheap.
  A third brightness with the edges deleted looks like a lit room.
- **Never requests the file** under reduced-motion, under 780px wide, or with
  the browser's save-data flag set. Footage is a luxury; a phone on cellular
  should not pay for one.
- **Fades in only on `canplay`** — a missing, slow or 404ing file leaves the
  CSS ground standing. Nothing ever falls to black.
- **Budget:** the reference site ships a 26MB loop. Aim for 3-4s and 1-2MB,
  blurred enough that compression artefacts disappear.


---

## 11. Frosted bar — `.tx-frost`

A bar that is invisible at the top of the page and frosts once scrolled, so
content passes under it blurred rather than hidden.

- **Needs JS:** `initFrost(selector, thresholdPx)`
- **Knobs:** `--frost-blur` (7px), `--frost-fill` (58% of `--bg`)
- **The cost control is the two states.** At the top of the page
  `backdrop-filter` is not applied at all — not zero-blur, absent. It only
  exists while `.is-lifted` is on. That matters most over a video hero.
- Toned down from the profectusagency reference: 7px not 10px, and the fill
  is `--bg` rather than white, so it mutes instead of milking.
- **Touch and `prefers-reduced-transparency`** get an opaque pane and no blur.

## 12. Pulse — `.tx-pulse`

A contained heartbeat behind one element. Two beats, then a rest four times
longer than either — the rest is what makes it a pulse rather than a throb.

- **Needs JS:** `initPulse(selector)`
- **Knobs:** `--pulse-pad-x` (30px), `--pulse-pad-y` (16px), the `0.55`
  opacity and `0.07` scale multipliers
- **It is cold, deliberately.** A warm pulse would be a second warm element in
  the same viewport as the ticker's amber CTA. Cold also reads as telemetry
  rather than as a valentine.
- **Inside a frosted bar it sits on top of the pane.** `backdrop-filter` blurs
  what is behind an element, never its own children. Behind the bar it would
  be smeared instead.
- **Currently unused.** The logo carries `.tx-orbit` instead; swapping back
  is one class name plus re-enabling `initPulse('.logo')`.

## 13. Orbit — `.tx-orbit`

The same siloed halo as the pulse, but the light travels instead of beating.
No rhythm and no event — a slow sweep you never catch starting.

- **Needs JS:** no. A registered `@property` makes the angle animatable in
  pure CSS. Without `@property` support the angle stays at 0deg and the halo
  simply sits still, which still looks correct.
- **Knobs:** `--orbit-rate` (64s), `--orbit-pad-x` / `-y`, `--orbit-strength`
- **The element never rotates — only the gradient's angle does.** Rotating the
  element was the first attempt and it was wrong: the halo is wide and short,
  so spinning it swung the corners outside the header and the light bled down
  over the ticker. Animating `from var(--spin)` leaves the footprint put.
- Conic origin is outside the box (`at 50% 140%`) so its hard pinch is never
  visible; a radial mask fades it out inside its own box. That is the silo.
- **Currently unused.** The logo carries `.tx-lung`; swapping is one class name.

## 14. Lung — `.tx-lung`

One mass behind an element, swelling and subsiding. The calmest of the three
halo treatments — no rhythm to read, no travelling light to track.

- **Needs JS:** no. An `alternate` CSS animation is exactly a breath, and the
  exhale is the inhale reversed, so there is no seam.
- **Knobs:** `--lung-rate` (9s), `--lung-pad-x` (46px), `--lung-pad-y` (22px),
  `--lung-low` / `--lung-high` opacity
- **Sized to cover the whole element, not pool in its middle.** The wordmark is
  a 12:1 box (~196x16), so the halo is wide and shallow and its stops reach to
  74% of the radius — the ends of the mark sit inside the light.
- **Vertical padding is capped** so that at full swell it still fits inside the
  72px header and never bleeds onto the ticker.
- **Currently on:** `.logo`

## Where the pack touches index.html

Five places, and nothing else. If the page is restructured, these are the only
things to re-attach — the pack itself is structure-agnostic and survives a
rebuild untouched.

1. **`<head>`** — `<link href="textures.css">`, loaded after `tokens.css`
2. **`<body class="tx-grain">`** — page-wide grain
3. **`.hero-ground`** — a full-bleed wrapper AROUND `<section class="hero">`,
   carrying `tx-thermal tx-vignette--in` plus two child spans
   (`.th-cold`, `.th-warm`). Wrapped rather than applied to `.hero` directly,
   because `.hero` is a `.wrap` and the ground would stop at the text column.
4. **`.contact__bar`** — the machined bar above the contact heading:
   `tx-brushed tx-rim tx-sweep`, `data-chrome="contact"`, `data-texture="rim"`
5. **Before `</body>`** — `textures.js` plus a boot script calling
   `initTextures({ drive: false })`, `initThermal()`, `initFrost('.site-header', 24)`
   and `initPulse('.logo')`
6. **`<header class="site-header tx-frost">`** — and its `background: var(--bg)`
   removed, or it wins over the frost (the inline `<style>` loads after
   `textures.css`)
7. **`<a class="logo tx-lung">`** — the breathing halo behind the wordmark
   (`.tx-orbit` and `.tx-pulse` are the alternatives; swapping is one class name)

Plus one line in `motion.js`: `registerChrome()` for `[data-chrome="contact"]`.

### Rule while restructuring

Do **not** sprinkle `tx-` classes into new markup as you build it. Get the
structure and the real copy right first, then re-attach all five in one
deliberate pass. Textures scattered during a rebuild is how a three-element
metal budget quietly becomes twelve.

## House rules for the pack

- **Ration the metal.** Two or three metallic moments per page, maximum. If
  every panel is chrome, none of them read as metal. Same logic as the
  one-amber-element-per-viewport rule in `DESIGN.md`.
- **Performance.** Cursor textures repaint their whole background every frame
  while the pointer is over them. Fine on two elements, stutters on twenty.
- **Always give derived variables a `var()` fallback** — `var(--mx-n, 50)`.
  An undefined variable makes the whole declaration invalid and the element
  renders with *no background at all*, silently. This has bitten us three times.
- **Reduced motion and touch** are handled centrally in `initTextures()`.

## Open items

- [ ] **Star power dial** — one `--star-power` scaling core, spikes and warmth
      together, plus a `.tx-star--subtle` preset. Star is currently too hot.
- [ ] **Star reads weaker in type than on a surface** — the metal under the
      letters is bright, so a warm highlight has less to beat. Darkening the
      ramp for the text variant would fix it, at some cost to legibility.
- [ ] **Supply a `ground.mp4`** to see texture 9 with real footage. Nothing in
      the repo yet, so it currently shows its CSS fallback.
- [ ] **Breathing backgrounds** (lung / drift / heartbeat / thermal / orbit)
      live in `sandbox.html` only. Not in the pack: each is ambient, and
      `DESIGN.md` permits one ambient element, currently the ticker.
- [ ] **Precision tick marks** — proposed, not built.
- [ ] **Reticle cursor over metal** — proposed, parked as likely gimmick.
- [ ] **Site bug, unrelated to the pack:** `index.html` overflows horizontally
      on mobile. Pre-existing, confirmed against a pre-session backup. Likely
      the four header nav items never collapsing.
