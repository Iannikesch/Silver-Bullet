/* ==========================================================================
   Silver Bullet — motion
   Loaded deferred, after GSAP / ScrollTrigger / SplitText / Lenis.

   Scope, deliberately narrow:
     - Lenis smooth scroll
     - Reactive chrome on exactly two elements (hero headline, bullet)

   The bullet intro sequence is CSS-only and lives in index.html. It does
   not touch GSAP and is not orchestrated from here.

   SplitText is loaded but intentionally unused.
   ========================================================================== */

(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Coarse pointer / no hover = touch. Scroll drives the chrome there. */
  var CAN_HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ------------------------------------------------------------------ *
   * 1. Lenis smooth scroll
   * ------------------------------------------------------------------ */

  var lenis = null;

  function initLenis() {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.6
    });

    /* Drive Lenis from GSAP's ticker instead of its own RAF loop, so the two
       never run competing frame loops and ScrollTrigger reads a settled
       scroll position. */
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);

    /* Anchor links: hand them to Lenis, otherwise native jumps and Lenis's
       virtual scroll position disagree and the page snaps back. */
    document.addEventListener('click', onAnchorClick);
  }

  function lenisRaf(time) {
    /* GSAP ticker reports seconds, Lenis expects milliseconds. */
    lenis.raf(time * 1000);
  }

  function onAnchorClick(e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var target = document.querySelector(id);
    if (!target || !lenis) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -72, duration: 1.1 });
  }

  function destroyLenis() {
    if (!lenis) return;
    gsap.ticker.remove(lenisRaf);
    document.removeEventListener('click', onAnchorClick);
    lenis.destroy();
    lenis = null;
  }

  /* ------------------------------------------------------------------ *
   * 2. Reactive chrome
   *
   * --light is a 0-100 number driving the hard stop positions in the
   * chrome gradient via calc(). Moving it slides the specular band across
   * the surface without ever softening the paired stops.
   *
   * gsap.quickTo eases the value at ~0.3s so the highlight lags behind the
   * cursor. The lag is what gives it mass; instant tracking reads cheap.
   * ------------------------------------------------------------------ */

  var CHROME = [];
  var lastX = null;
  var lastY = null;
  var scrollP = 0;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function registerChrome(el) {
    if (!el) return null;
    var state = { v: 50 };
    /* quickTo eases the value at 0.3s so the highlight LAGS behind the
       cursor. Instant tracking reads cheap; the lag is what gives it mass. */
    var setter = gsap.quickTo(state, 'v', {
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: function () {
        el.style.setProperty('--light', state.v.toFixed(2));
      }
    });
    CHROME.push({ el: el, state: state, set: setter });
  }

  /* Recomputes every chrome target from the current pointer + scroll state.
     Called once per animation frame at most, never once per event. */
  function update() {
    var scrollPct = 10 + scrollP * 80;

    for (var i = CHROME.length - 1; i >= 0; i--) {
      var c = CHROME[i];

      /* The bullet lives inside .intro-layer, which the intro script removes
         once the sequence finishes. Writing a custom property to a detached
         node repaints nothing and costs a frame's work forever, so drop any
         target that has left the document. */
      if (!c.el.isConnected) { CHROME.splice(i, 1); continue; }

      var r = c.el.getBoundingClientRect();
      var v;

      /* Off-screen elements fall back to scroll only. Reflecting a cursor
         onto something nobody can see is wasted paint, and an element far
         above the viewport produces a wildly out-of-range vertical term. */
      var onScreen = r.bottom > 0 && r.top < window.innerHeight;

      if (CAN_HOVER && lastX !== null && r.width && onScreen) {
        /* Cursor position across the element, padded slightly past the edges
           so the band keeps travelling when the pointer leaves the element.
           Both terms are clamped: unbounded input can drive the combined
           value into the ceiling and the highlight stops moving. */
        var p = clamp((lastX - r.left) / r.width, -0.15, 1.15);
        /* A little vertical influence, the way a real surface would shift
           its reflection as your eye moves up and down it. */
        var vert = clamp((lastY - r.top) / (r.height || 1), -0.5, 1.5);
        var pointerPct = (p * 100) + (vert - 0.5) * 12;
        /* Pointer leads, scroll still contributes, so the highlight moves
           when the page moves as well as when the cursor does. */
        v = pointerPct * 0.75 + scrollPct * 0.25;
      } else {
        /* Touch, off-screen, or before the pointer has ever moved. */
        v = scrollPct;
      }

      c.set(clamp(v, -20, 120));
    }
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; update(); });
  }

  function initChrome() {
    registerChrome(document.querySelector('[data-chrome="headline"]'));
    registerChrome(document.querySelector('[data-chrome="bullet"]'));
    if (!CHROME.length) return;

    /* -- pointer: desktop only, rAF-throttled ------------------------ */
    if (CAN_HOVER) {
      window.addEventListener('pointermove', function (e) {
        lastX = e.clientX;
        lastY = e.clientY;
        schedule();
      }, { passive: true });
    }

    /* -- scroll: scrubbed, both directions --------------------------- */
    ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      /* Fires on every scrub tick in both directions, so the highlight
         sweeps forward on the way down and genuinely reverses on the
         way back up. */
      onUpdate: function (self) {
        scrollP = self.progress;
        schedule();
      }
    });

    update();
  }

  /* ------------------------------------------------------------------ *
   * 3. Boot
   * ------------------------------------------------------------------ */

  if (REDUCED) {
    /* Hard bail-out. Nothing is constructed, no listeners are bound, and
       any instance that somehow exists is destroyed. The chrome elements
       keep their static CSS gradient at the default --light. */
    destroyLenis();
    document.documentElement.setAttribute('data-motion', 'reduced');
    return;
  }

  /* Registered past the bail-out so we do no plugin setup we won't use.
     Note the UMD build self-registers on load and binds its own wheel/resize
     listeners regardless; what matters is that no ScrollTrigger is ever
     created under reduced motion, so none of it drives anything. */
  gsap.registerPlugin(ScrollTrigger);

  initLenis();
  initChrome();
  document.documentElement.setAttribute('data-motion', 'full');

  /* Exposed for verification only. */
  window.__sb = {
    get lenis() { return lenis; },
    chrome: CHROME,
    reduced: REDUCED,
    canHover: CAN_HOVER,
    /* test hooks */
    _pointer: function (x, y) { lastX = x; lastY = y; update(); },
    _scroll: function (p) { scrollP = p; update(); },
    _light: function () {
      return CHROME.map(function (c) {
        return { el: c.el.tagName + (c.el.dataset.chrome ? '[' + c.el.dataset.chrome + ']' : ''),
                 light: c.el.style.getPropertyValue('--light') };
      });
    }
  };
})();
