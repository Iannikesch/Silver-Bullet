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
    var rest = parseFloat(
      getComputedStyle(el).getPropertyValue('--tx-bore-aim-rest')) || 0.32;

    /* Pinned at rest and no listeners bound at all. */
    if (reduced || noHover) { el.style.setProperty('--bore-aim', rest); return; }

    var barrel = el.querySelector('.bore-barrel');
    var rings  = el.querySelectorAll('.bore-ring');

    /* ---- cached geometry ------------------------------------------
       getBoundingClientRect() forces a synchronous layout. Calling it
       on every mousemove — which this did, and which initTextures did
       again for the same element — means two forced layouts per frame,
       and with Lenis driving the scroll that is a layout thrash on a
       page that is already animating. It is the difference between the
       benchmark being fine and the thing feeling awful in the hand.

       Measured once, then only after a scroll or a resize actually
       invalidates it. The barrel's radius comes from its computed
       width rather than its bounding box, because the box is the
       AXIS-ALIGNED bounds of an element that is rotated 3.2deg, which
       reads about 5% wide. */
    var box = null, radius = 0;
    function measure() {
      box = el.getBoundingClientRect();
      radius = (barrel ? parseFloat(getComputedStyle(barrel).width) : box.width) / 2;
    }
    function invalidate() { box = null; }
    window.addEventListener('scroll', invalidate, { passive: true });
    window.addEventListener('resize', invalidate);

    /* ---- one listener, both signals -------------------------------
       This element does NOT carry data-texture any more. It used to,
       which meant initTextures() bound a second mousemove to it and
       read the rect a second time to drive --light. One listener
       writing both signals off one cached rect is half the work and
       still one writer per variable. */

    /* ---- how the twist follows the pointer -------------------------
       Exponential smoothing on the ticker, NOT a tween per mousemove.

       This was gsap.quickTo with power3.out, and it read as the barrel
       struggling to keep up rather than as a heavy thing moving. That is
       what a restarted ease actually does: quickTo starts a fresh tween
       on every pointer event, power3.out front-loads most of its travel
       into the first few frames, and at sixty events a second the result
       is lunge, crawl, lunge, crawl. The harder you moved, the more it
       looked like it was fighting to catch up.

       A lerp toward the target every frame has no restarts and no ease
       curve to re-enter. It is a constant exponential approach: fastest
       when far from the target, slower as it closes, and it never jumps
       because the pointer moved. That is what mass feels like.

       --tx-bore-follow is the fraction closed per frame at 60fps. Lower
       is heavier. It is normalised against real frame time below, so the
       weight is identical at 60Hz, 120Hz or a stuttering 30. */
    var follow = parseFloat(
      getComputedStyle(el).getPropertyValue('--tx-bore-follow')) || 0.055;

    var touching = false;

    var state  = { aim: rest, x: 34, y: 24 };
    var target = { aim: rest, x: 34, y: 24 };

    function paintAim()   { el.style.setProperty('--bore-aim', state.aim.toFixed(4)); }
    function paintLight() {
      el.style.setProperty('--light',   state.x.toFixed(2));
      el.style.setProperty('--light-y', state.y.toFixed(2));
    }
    paintAim(); paintLight();

    /* The light follows roughly three times faster than the twist. It is a
       reflection and can be quick; the twist is the barrel itself
       appearing to turn. Giving them the same speed made the whole thing
       feel like one slider being dragged. */
    var idle = true;
    function tick(time, delta) {
      if (idle) return;

      /* 1 - (1-k)^(dt/frame): the same closing fraction per unit TIME
         rather than per frame, so frame rate cannot change the feel. */
      var kA = 1 - Math.pow(1 - follow,       delta / 16.667);
      var kL = 1 - Math.pow(1 - follow * 3.2, delta / 16.667);

      state.aim += (target.aim - state.aim) * kA;
      state.x   += (target.x   - state.x)   * kL;
      state.y   += (target.y   - state.y)   * kL;
      paintAim(); paintLight();

      /* Park once it has effectively arrived, so an untouched band costs
         nothing per frame. The threshold is well below what a 0-1 value
         driving a 7deg range can show. */
      if (!touching &&
          Math.abs(target.aim - state.aim) < 0.0008 &&
          Math.abs(target.x   - state.x)   < 0.05 &&
          Math.abs(target.y   - state.y)   < 0.05) {
        state.aim = target.aim; state.x = target.x; state.y = target.y;
        paintAim(); paintLight();
        idle = true;
        promote(false);
      }
    }

    /* GSAP's ticker when it exists, a plain rAF loop when it does not.
       House rule 4: the texture has to work with no JS at all, and the
       weaker claim — no GSAP — has to work too. Same smoothing either
       way, since the step is normalised against real elapsed time. */
    if (smooth) {
      gsap.ticker.add(tick);
    } else {
      var prev = 0;
      (function raf(now) {
        tick(now, prev ? now - prev : 16.667);
        prev = now;
        requestAnimationFrame(raf);
      })(performance.now());
    }

    /* ---- promotion, only while actually on the barrel -------------- */
    function promote(on) {
      Array.prototype.forEach.call(rings, function (r) {
        r.style.willChange = on ? 'transform' : '';
      });
    }

    function release() {
      if (!touching) return;
      touching = false;
      target.aim = rest;
      /* The promotion is dropped by tick() once the unwind has actually
         arrived, not on a timer — releasing the layers while the rings
         are still moving puts the stutter back exactly where it is most
         visible. */
    }

    el.addEventListener('mousemove', function (e) {
      if (!box) measure();

      /* Distance from the middle, as a fraction of the barrel's radius.
         The band is a full-bleed rectangle but the object in it is a
         circle, so "on it" means inside that circle — not anywhere in
         the section. Past the rim nothing is driven at all. */
      var dx = e.clientX - (box.left + box.width  / 2);
      var dy = e.clientY - (box.top  + box.height / 2);
      var r  = radius ? Math.sqrt(dx * dx + dy * dy) / radius : 1;

      if (r > 1) { release(); return; }

      if (!touching) { touching = true; promote(true); }
      idle = false;

      /* Dead centre winds the rifling all the way up; the rim unwinds
         it flat. Radius, not the half-diagonal the first version used —
         that one kept driving out to the corners of the rectangle,
         which are nowhere near the object.

         Only a target is set here. Nothing is written to the DOM on a
         pointer event any more — tick() owns every write, at exactly one
         per frame however fast the mouse is moving. */
      target.aim = 1 - r;
      target.x   = ((e.clientX - box.left) / box.width)  * 100;
      target.y   = ((e.clientY - box.top)  / box.height) * 100;
    }, { passive: true });

    el.addEventListener('mouseleave', function () { release(); idle = false; });
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
      /* Promote the two gradient layers only while the section is on
         screen. They are ~2300px square each; left promoted for the life
         of the page they cost ~161MB of GPU texture doing nothing. */
      onToggle: function (self) {
        el.classList.toggle('is-onstage', self.isActive);
      },
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


/* ============================================================
   Grid arrival sweep. Each cell's own top edge lights in
   reading order and lets go behind the pass, leaving the
   faint warmth on the cell.

   This replaced initGridBeam, which animated a six-segment
   overlay along a route of hardcoded percentages. That route
   only ever described a 3-column, 2-row grid; at 2-up and 1-up
   it drew lines through the middle of the cells.

   Nothing here is positioned or measured. The rim IS the cell's
   top edge, so column count, row count and item count are all
   irrelevant, and only opacity animates.
   ============================================================ */

function initGridSweep(selector) {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof window.gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  Array.prototype.forEach.call(document.querySelectorAll(selector || '.cap-grid'), function (grid) {
    var cells = grid.querySelectorAll(':scope > li');
    if (!cells.length) return;

    /* One stagger value shared by all three tweens, so the rim lighting,
       the rim releasing and the warmth arriving stay locked to the same
       pass rather than drifting apart across the row.

       It has to be large relative to the tween durations or there is no
       pass to see: at 0.12 against a 0.45s rise, every cell was lit before
       the first one had started to let go, which reads as the whole grid
       flashing at once. The front is only legible when a cell is releasing
       while the next is still climbing. */
    var STEP = 0.26;

    var tl = gsap.timeline({ paused: true });

    // 1. the rim lights, cell by cell
    tl.to(cells, {
      '--cap-rim': 1,
      duration: 0.3,
      ease: 'power2.out',
      stagger: { each: STEP, from: 'start' }
    }, 0)

    // 2. and lets go behind the pass. Six gold edges held permanently
    //    would be six amber elements; the palette allows one.
      .to(cells, {
        '--cap-rim': 0,
        duration: 0.7,
        ease: 'power2.inOut',
        stagger: { each: STEP, from: 'start' }
      }, 0.38)

    // 3. the warmth left behind, trailing slightly. This one stays.
      .to(cells, {
        '--cap-lit': 1,
        duration: 1.2,
        ease: 'power2.out',
        stagger: { each: STEP, from: 'start' }
      }, 0.2);

    grid.__sweepTl = tl;        // exposed so it can be scrubbed while tuning

    ScrollTrigger.create({
      trigger: grid,
      start: 'top 82%',
      once: true,               // one orchestrated moment, never a loop
      onEnter: function () { tl.play(); }
    });
  });
}
