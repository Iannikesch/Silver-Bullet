/* ============================================================
   Silver Bullet — texture pack behaviour

   Grain, vignette, brushed metal and etched type are pure CSS
   and work with this file absent. Three textures need JS:

     data-texture="star"   cursor-tracked star
     data-texture="rim"    cursor-reactive rim light
     .tx-sweep             specular sweep on scroll-in

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
