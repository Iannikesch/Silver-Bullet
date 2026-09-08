/* ============================================================
   Silver Bullet — texture pack behaviour

   Grain, vignette, brushed metal and etched type are pure CSS
   and work with this file absent. Three textures need JS:

     data-texture="star"   cursor-tracked star
     data-texture="rim"    cursor-reactive rim light
     .tx-sweep             specular sweep on scroll-in
     .tx-bore              pointer-driven rifling twist (initBore)

   Usage:  initTextures();        // once the DOM exists

   GSAP is optional for star and rim (without it they still
   track, just without the lag that makes them feel weighty).
   The sweep needs GSAP + ScrollTrigger and is skipped without.
   ============================================================ */

function initTextures(opts) {
  'use strict';
  opts = opts || {};

  /* On the real site motion.js already publishes --light / --light-y / --lit
     from its own pointer+scroll engine, so the pack must NOT attach a second
     set of listeners. Pass { drive: false } there. In the sandbox, where
     motion.js is absent, the pack drives itself. */
  var drive = opts.drive !== false;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noHover = window.matchMedia('(hover: none)').matches;
  var smooth  = typeof window.gsap !== 'undefined';

  /* ---- motion tokens, read from CSS -------------------------------
     Durations live in tokens, not in this file. Reading them back means
     one source of truth: change --dur-base in CSS and the JS follows.

     The easing curves cannot be shared the same way. CSS wants a
     cubic-bezier() and GSAP wants its own named eases, and neither
     understands the other's format, so those are mirrored by hand. */
  function seconds(name, fallback) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var n = parseFloat(raw);
    if (!n) return fallback;
    return raw.indexOf('ms') > -1 ? n / 1000 : n;   // accepts .42s or 420ms
  }

  var DUR = {
    quick: seconds('--dur-quick', 0.18),
    base:  seconds('--dur-base',  0.42),
    slow:  seconds('--dur-slow',  1.15)
  };
  var EASE = { settle: 'power3.out', metal: 'power2.inOut', snap: 'back.out(1.7)' };


  /* ---- cursor-reactive textures: star and rim --------------------- */

  if (!reduced && !noHover) {
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-texture]'),
      function (el) {

        // One pair of plain numbers per element. CSS derives the rest.
        var light = { x: 50, y: 50, lit: 0 };

        function paint() {
          el.style.setProperty('--light', light.x);
          el.style.setProperty('--light-y', light.y);
          el.style.setProperty('--lit', light.lit);
        }

        // quickTo reuses ONE animation instead of building a new one on
        // every mouse event. Mousemove fires dozens of times a second, so
        // this is the difference between smooth and stuttering. The lag it
        // introduces is the effect: light rolling across a heavy surface
        // rather than a torch welded to the pointer.
        var moveX, moveY;
        if (smooth) {
          moveX = gsap.quickTo(light, 'x', { duration: DUR.base * 0.66, ease: 'power3', onUpdate: paint });
          moveY = gsap.quickTo(light, 'y', { duration: DUR.base * 0.66, ease: 'power3', onUpdate: paint });
        } else {
          moveX = function (v) { light.x = v; paint(); };
          moveY = function (v) { light.y = v; paint(); };
        }

        el.addEventListener('mousemove', function (e) {
          // Measured every move so it stays right after a scroll or resize.
          var box = el.getBoundingClientRect();
          moveX(((e.clientX - box.left) / box.width) * 100);
          moveY(((e.clientY - box.top) / box.height) * 100);
        });

        // Enter and leave happen rarely, so a normal tween is right here.
        // quickTo only earns its keep on constant updates.
        /* How fast the surface lights and unlights, per element. A star
           wants to snap; a torch wants to seep. Reading it off the markup
           keeps "slowly illuminates" a decision you can see in the HTML
           instead of a constant buried in this file. */
        var litIn   = parseFloat(el.getAttribute('data-lit-in'))  || DUR.base;
        var litOut  = parseFloat(el.getAttribute('data-lit-out')) || DUR.base;
        /* A slow light should not overshoot - back.out is the star's snap,
           and on a torch it reads as a flicker. */
        var easeIn  = litIn > DUR.base ? 'power2.out' : EASE.snap;

        el.addEventListener('mouseenter', function () {
          if (smooth) gsap.to(light, { lit: 1, duration: litIn, ease: easeIn, onUpdate: paint });
          else { light.lit = 1; paint(); }
        });
        el.addEventListener('mouseleave', function () {
          if (smooth) gsap.to(light, { lit: 0, duration: litOut, ease: 'power2.inOut', onUpdate: paint });
          else { light.lit = 0; paint(); }
        });
      }
    );
  }


  /* ---- specular sweep --------------------------------------------- */

  if (!reduced && smooth && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    Array.prototype.forEach.call(document.querySelectorAll('.tx-sweep'), function (el) {
      var band = { pos: -200 };

      // Animating a plain number and writing it into a CSS variable is more
      // reliable than asking GSAP to interpolate a string like "-200%".
      function paint() { el.style.setProperty('--tx-sweep-pos', band.pos); }
      paint();

      function sweep() {
        gsap.fromTo(band,
          { pos: -200 },
          { pos: 500, duration: DUR.slow, ease: EASE.metal, onUpdate: paint }
        );
      }

      // once:true throws the trigger away after it fires. A band of light
      // that crosses every time you scroll past is ambient motion.
      ScrollTrigger.create({ trigger: el, start: 'top 78%', once: true, onEnter: sweep });

      el.__txSweep = sweep;   // exposed so a demo page can replay it
    });
  }
}


/* ============================================================
   Bore twist. Call after initTextures().

   Owns ONE signal: --bore-aim, 0-1, from how close the pointer is
   to the middle of the band. 1 is dead centre and winds the rifling
   up; 0 is the far corner and unwinds it flat.

   It deliberately does NOT touch --light / --light-y. The bore
   carries data-texture, so initTextures() is already driving those
   with the right easing — a second writer would fight it. This is
   the same division of labour as the two engines above: one writer
   per variable, always.
   ============================================================ */

function initBore(selector) {
  'use strict';
  var els = document.querySelectorAll(selector || '.tx-bore');
  if (!els.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noHover = window.matchMedia('(hover: none)').matches;
  var smooth  = typeof window.gsap !== 'undefined';

  Array.prototype.forEach.call(els, function (el) {
    /* Rest comes from CSS so there is one source of truth. If the
       stylesheet has not parsed or the knob is missing, .32 matches
       the documented default rather than collapsing to a flat 0. */
    var rest = parseFloat(
      getComputedStyle(el).getPropertyValue('--tx-bore-aim-rest')) || 0.32;

    /* Pinned at rest and no listeners bound at all — not bound and
       ignored. Touch devices have no hover to track and would sit at
       whatever the last tap happened to be. */
    if (reduced || noHover) { el.style.setProperty('--bore-aim', rest); return; }

    var state = { aim: rest };
    function paint() { el.style.setProperty('--bore-aim', state.aim.toFixed(4)); }
    paint();

    /* Slower than the light. The light is a reflection and can be quick;
       the twist is the barrel itself appearing to turn, and mass reads as
       slow. Matching them made the whole thing feel like a slider. */
    var toAim = smooth
      ? gsap.quickTo(state, 'aim', { duration: 0.62, ease: 'power3.out', onUpdate: paint })
      : function (v) { state.aim = v; paint(); };

    /* Promote the rings to their own compositor layers WHILE interacting,
       and only while. Rotating a blurred, masked element forces the blur
       to re-run every frame — measured at 19.8fps. Promoted, the blur is
       baked into the layer texture once and the rotation is a compositor
       transform: 50.8fps, with no visual difference at all.

       It is removed again after the twist settles, because twenty
       promoted layers is real GPU memory and leaving will-change on
       permanently is the documented way to misuse it. */
    var rings = el.querySelectorAll('.bore-ring');
    var settle;
    function promote(on) {
      Array.prototype.forEach.call(rings, function (r) {
        r.style.willChange = on ? 'transform' : '';
      });
    }

    el.addEventListener('mouseenter', function () {
      clearTimeout(settle);
      promote(true);
    });

    el.addEventListener('mousemove', function (e) {
      /* Measured every move so it survives a scroll or a resize. */
      var box = el.getBoundingClientRect();
      var dx  = (e.clientX - (box.left + box.width  / 2)) / (box.width  / 2);
      var dy  = (e.clientY - (box.top  + box.height / 2)) / (box.height / 2);

      /* Normalised against the half-DIAGONAL, so the far corners are the
         only places that reach a true zero. Normalising against the
         half-width instead would flatten the barrel halfway along every
         edge, and the effect would spend most of its range already spent. */
      var d = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
      toAim(Math.max(0, Math.min(1, 1 - d)));
    });

    /* Back to rest on the way out, so the section is never left parked
       at whatever the pointer happened to be doing when it left. */
    el.addEventListener('mouseleave', function () {
      if (smooth) gsap.to(state, { aim: rest, duration: 0.9, ease: 'power2.inOut', onUpdate: paint });
      else { state.aim = rest; paint(); }
      /* Drop the promotion once the ease home has finished, not on the
         way out — releasing the layers mid-tween puts the stutter back
         exactly where it is most visible. */
      clearTimeout(settle);
      settle = setTimeout(function () { promote(false); }, 1000);
    });
  });
}


/* ============================================================
   Video ground. Call after initTextures().

   Deliberately conservative about even ASKING for the file:
   footage is a luxury, and a phone on cellular should not pay
   for one. The CSS ground underneath is already a background.
   ============================================================ */

function initVideoGround() {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow  = window.matchMedia('(max-width: 780px)').matches;
  // Browsers expose the OS/browser "reduce data" setting here.
  var saveData = navigator.connection && navigator.connection.saveData;

  Array.prototype.forEach.call(document.querySelectorAll('.tx-video-ground'), function (el) {

    // The CSS ground drifts whether or not footage ever arrives. Two clocks
    // with no common factor, so the pair never repeats its arrangement.
    var css = el.querySelector('.vg-css');
    if (css && !reduced && typeof window.gsap !== 'undefined') {
      gsap.to(css, { xPercent: 9, yPercent: -6, duration: 26, ease: 'sine.inOut', repeat: -1, yoyo: true });
      gsap.to(css, { scale: 1.08, duration: 34, ease: 'sine.inOut', repeat: -1, yoyo: true });
    }

    var video = el.querySelector('.vg-video');
    if (!video) return;

    // Any of these and the footage is simply never requested. Not loaded
    // and hidden - never requested, so it costs nothing at all.
    if (reduced || narrow || saveData) { video.removeAttribute('src'); return; }

    // Only reveal it once it can genuinely play through.
    video.addEventListener('canplay', function () { video.classList.add('is-ready'); });
    // If it 404s or the codec is unsupported, the CSS ground just stays.
    video.addEventListener('error', function () { video.classList.remove('is-ready'); });

    video.load();
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* autoplay refused: CSS ground stands */ });
  });
}



/* ============================================================
   Thermal ground. Scroll-bound, never clock-bound.
   ============================================================ */

function initThermal() {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof window.gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  Array.prototype.forEach.call(document.querySelectorAll('.tx-thermal'), function (el) {
    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      onUpdate: function (self) {
        /* A sine arc, not a straight ramp: heat is nothing as the section
           arrives, peaks as it fills the screen, and is gone by the time it
           leaves. A linear map would have it brightest at one edge. */
        var heat = Math.sin(self.progress * Math.PI);
        el.style.setProperty('--tx-heat', heat.toFixed(3));
      }
    });
  });
}


/* ============================================================
   Frosted bar. Adds .is-lifted once the page is scrolled.

   A plain scroll listener rather than ScrollTrigger: this has to
   be right on the very first frame, and it is one boolean.
   ============================================================ */

function initFrost(selector, threshold) {
  'use strict';
  var el = document.querySelector(selector || '.tx-frost');
  if (!el) return;
  var trigger = threshold || 24;   // px of scroll before the pane appears
  var queued = false;
  var lifted = null;               // null so the first run always writes

  function apply() {
    queued = false;
    var now = window.scrollY > trigger;
    if (now === lifted) return;    // only touch the DOM when it actually changes
    lifted = now;
    el.classList.toggle('is-lifted', now);
  }

  // Scroll fires far more often than the state can change, so coalesce to
  // one check per frame.
  window.addEventListener('scroll', function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }, { passive: true });

  apply();   // a reload halfway down the page must start in the right state
}


/* ============================================================
   Halo. Only the --pulse variant needs JS; --lung and --orbit
   are pure CSS and run without this being called.

   Two beats close together, then a rest four times longer than
   either. The REST is what makes it read as a pulse; without it
   the same two beats read as a throb.
   ============================================================ */

function initHalo(selector) {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof window.gsap === 'undefined') return;

  Array.prototype.forEach.call(document.querySelectorAll(selector || '.tx-halo--pulse'), function (el) {
    var beat = { v: 0 };
    function paint() { el.style.setProperty('--tx-beat', beat.v.toFixed(3)); }

    gsap.timeline({ repeat: -1 })
      .to(beat, { v: 1.00, duration: 0.17, ease: 'power2.out',   onUpdate: paint })
      .to(beat, { v: 0.28, duration: 0.24, ease: 'power2.in',    onUpdate: paint })
      .to(beat, { v: 0.70, duration: 0.15, ease: 'power2.out',   onUpdate: paint })
      .to(beat, { v: 0.00, duration: 0.55, ease: 'power2.inOut', onUpdate: paint })
      .to({},   { duration: 2.6 });   // the rest
  });
}
