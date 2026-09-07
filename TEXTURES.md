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
