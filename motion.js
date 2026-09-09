/* ==========================================================================
   Silver Bullet — motion
   Loaded deferred, after GSAP / ScrollTrigger / SplitText / Lenis.

   Scope, deliberately narrow:
     - Lenis smooth scroll
     - Reactive chrome on the bullet and the contact bar. The headline
       moved to the texture pack's hover-only driver.

   The bullet intro sequence is CSS-only and lives in index.html. It does
   not touch GSAP and is not orchestrated from here.

   SplitText is loaded but intentionally unused.
   ========================================================================== */

(function () {
  'use strict';

  /* ---- the libraries might not be there ----------------------------
     GSAP, ScrollTrigger and Lenis all come from third-party CDNs. Any
     of them can be missing — a CDN outage, a corporate network, an
     aggressive blocker — and every reference below would then throw.
     Until this guard existed, blocking both CDNs produced an uncaught
     "ReferenceError: gsap is not defined" and left motion.js aborted
     halfway through, with data-motion never set.

     Bailing here costs nothing, because the stylesheet IS the finished
     state: content, nav, CTAs and scrolling all work, and the marquees
     keep running on their CSS animation precisely because bindMarquee
     never gets to cancel it. Same doctrine as the reduced-motion path
     below, which is why it sets the same attribute. */
  if (typeof window.gsap === 'undefined' ||
      typeof window.ScrollTrigger === 'undefined') {
    document.documentElement.setAttribute('data-motion', 'none');
    return;
  }

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Coarse pointer / no hover = touch. Scroll drives the chrome there. */
  var CAN_HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* What a marquee slows to while the pointer is over it. */
  var MARQUEE_HOVER_RATE = 0.4;

  /* ------------------------------------------------------------------ *
   * 1. Lenis smooth scroll
   * ------------------------------------------------------------------ */

  var lenis = null;

  function initLenis() {
    /* Lenis is optional in a way GSAP is not: without it the page simply
       scrolls natively, and everything else in this file still works. */
    if (typeof window.Lenis === 'undefined') return;
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
    /* v   the specular band position, 0-100, the original signal
       vy  the same thing vertically, for textures that need two axes
       lit 0 or 1: is the pointer actually over this element */
    var state = { v: 50, vy: 50, lit: 0 };

    /* One writer for all three, so they can never be published out of step
       with each other. */
    function paint() {
      el.style.setProperty('--light', state.v.toFixed(2));
      el.style.setProperty('--light-y', state.vy.toFixed(2));
      el.style.setProperty('--lit', state.lit.toFixed(3));
    }

    /* quickTo eases the value at 0.3s so the highlight LAGS behind the
       cursor. Instant tracking reads cheap; the lag is what gives it mass. */
    var setter = gsap.quickTo(state, 'v', {
      duration: 0.3, ease: 'power2.out', onUpdate: paint
    });
    var setterY = gsap.quickTo(state, 'vy', {
      duration: 0.3, ease: 'power2.out', onUpdate: paint
    });
    /* Slower on the way in than the band, so a surface "wakes up" rather
       than snapping on. */
    var setterLit = gsap.quickTo(state, 'lit', {
      duration: 0.42, ease: 'power2.out', onUpdate: paint
    });

    CHROME.push({ el: el, state: state, set: setter, setY: setterY, setLit: setterLit });
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

        /* Vertical position across the element, and whether the pointer is
           genuinely inside its box. Textures that draw a point of light need
           to know where it is in BOTH axes and when to stop drawing it. */
        c.setY(clamp(vert * 100, -20, 120));
        c.setLit(
          lastX >= r.left && lastX <= r.right &&
          lastY >= r.top  && lastY <= r.bottom ? 1 : 0
        );
      } else {
        /* Touch, off-screen, or before the pointer has ever moved. */
        v = scrollPct;
        c.setY(scrollPct);
        c.setLit(0);
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
    registerChrome(document.querySelector('[data-chrome="bullet"]'));
    registerChrome(document.querySelector('[data-chrome="contact"]'));
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
   * 3. Marquees — hover, drag, throw
   *
   * Applies to every [data-marquee] band: the hook banner, the creative
   * conveyor and the logo band.
   *
   * The stylesheet declares each loop as a CSS animation, and that is what
   * runs with JS off — the bands still rotate, they just cannot be touched.
   * When this file loads it reads the duration the CSS declared, cancels the
   * animation and drives the same motion from GSAP's ticker instead.
   *
   * That handover is the whole reason for the complexity. A CSS animation's
   * position cannot be scrubbed: there is no way to say "you are now 340px
   * further along" without restarting it. Dragging is exactly that, so the
   * position has to become a number this file owns.
   * ------------------------------------------------------------------ */

  var MAX_FLING = 3200;      /* px/s. A violent flick should not fire the
                                band across several screens. */
  var DRAG_SLOP = 5;         /* px of movement before a press counts as a
                                drag and stops being a click. */

  function initMarquees() {
    var strips = document.querySelectorAll('[data-marquee]');
    for (var i = 0; i < strips.length; i++) bindMarquee(strips[i]);
  }

  /* Clones the set until the track covers the viewport plus one whole set.
     The wrap below repeats every setWidth, so anything narrower than that
     would expose the end of the content on a wide screen. Returns the width
     of a single set, which is the wrap distance. */
  function fillTrack(track) {
    var first = track.firstElementChild;
    if (!first) return 0;
    var setWidth = first.offsetWidth;
    if (!setWidth) return 0;

    var guard = 0;
    while (track.offsetWidth < window.innerWidth + setWidth && guard++ < 20) {
      var copy = first.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      track.appendChild(copy);
    }
    return setWidth;
  }

  function bindMarquee(strip) {
    var track = strip.querySelector('[data-marquee-track]');
    if (!track) return;

    /* The clipping element is what you grab. On the hook banner that is the
       viewport rather than the strip, so the pinned CTA stays clickable
       instead of being a drag handle. */
    var area = strip.hasAttribute('data-marquee-viewport')
      ? strip
      : (strip.querySelector('[data-marquee-viewport]') || strip);

    var setWidth = fillTrack(track);
    if (!setWidth) return;

    /* Speed can be declared two ways.
       data-marquee-speed is px per second and is the one to prefer: it is
       independent of how many items the band holds. The CSS duration is a
       whole-loop time, so speed = setWidth / duration, which means adding or
       removing a single item silently retunes the band. That is exactly what
       happened when the conveyor went from six placeholders to five photos -
       it lost 16% of its speed without anything about motion being touched.
       The CSS duration remains the no-JS fallback and the default. */
    var dur = parseFloat(getComputedStyle(track).animationDuration) || 40;
    track.style.animation = 'none';

    var declared = parseFloat(strip.getAttribute('data-marquee-speed'));
    var baseVel = declared > 0 ? -declared : -setWidth / dur;  /* px/s, negative = leftward */
    var wrapX   = gsap.utils.wrap(-setWidth, 0);

    var pos = 0;        /* the number this file now owns */
    var fling = 0;      /* decaying velocity carried out of a throw */
    var vel = 0;        /* pointer velocity while dragging */
    var dragging = false;
    var moved = 0;
    var startX = 0, startPos = 0, lastX = 0, lastT = 0;

    /* Hover and focus scale the drift. Tweened for the same reason the
       chrome lags behind the cursor: an instant speed change reads as a
       glitch. Each band keeps its own target, so hovering the logos does
       not slow the conveyor. */
    var rate = { v: 1 };
    var setRate = gsap.quickTo(rate, 'v', { duration: 0.35, ease: 'power2.out' });

    /* ---- only run while the band is on screen -------------------------
       Every marquee adds a ticker callback that writes a transform to its
       track on EVERY frame, for the life of the page. Three bands means
       three per-frame writes to large promoted layers, continuing long
       after the band has scrolled away — which showed up as ~394 style
       recalcs during a single scroll of the page.

       An IntersectionObserver rather than a ScrollTrigger: this is one
       boolean per band and it does not need to know the scroll position,
       only whether the thing is visible. rootMargin keeps it running
       slightly before it appears so it is never caught mid-jump.

       Pausing off screen is invisible by definition, and the band simply
       resumes from where it stopped. The class it toggles is also what
       gates will-change and the ticker's CSS animation, in site.css. */
    /* Starts TRUE and stays true until the observer positively says the band
       is off screen. It used to start false, which means the band does not
       move until a callback arrives - so anything that delays or drops that
       first callback leaves a permanently frozen strip. Failing open costs a
       few frames of writing to something off screen; failing closed costs a
       band that never runs. */
    var onstage = true;
    if (typeof IntersectionObserver !== 'undefined') {
      /* Held in a variable deliberately. The observer was previously created
         inline and never referenced by anything, which leaves its lifetime
         resting on the spec's "keep alive while it has observed targets"
         rule and nothing else. One band that never comes back on stage is a
         band that never moves again, so it is not worth the gamble. */
      var io = new IntersectionObserver(function (entries) {
        for (var k = 0; k < entries.length; k++) {
          onstage = entries[k].isIntersecting;
          strip.classList.toggle('is-onstage', onstage);
        }
      }, { rootMargin: '200px 0px' });
      io.observe(strip);
      strip.__io = io;
    } else {
      strip.classList.add('is-onstage');
    }

    gsap.ticker.add(function (time, delta) {
      if (!dragging) {
        pos += (baseVel * rate.v + fling) * (delta / 1000);
        if (fling) {
          /* Exponential decay expressed per-frame-time rather than
             per-frame, so the throw travels the same distance at 120Hz as
             it does at 60. */
          fling *= Math.pow(0.93, delta / 16.667);
          if (Math.abs(fling) < 2) fling = 0;
        }
      }
      /* Off screen we skip the WRITE, not the maths.

         The first version returned early out of the whole callback, which
         froze pos as well — so the band stopped dead while it was out of
         view and resumed exactly where it had stopped. Scroll down and back
         up and it was visibly behind where continuous motion would have put
         it: roughly 90px after a couple of seconds away, which reads as the
         strip stalling and then a different part of the loop rotating in.
         It showed up worst on the inner pages, where this is the only band
         on screen and there is nothing else moving to mask it.

         Advancing pos costs one multiply and an add. The expensive part is
         gsap.set — a style write and a composite on a 3600px promoted layer
         — and that is what stays gated. So the saving is kept and the band
         is always where it should be when it comes back. */
      if (!onstage && !dragging && !fling) return;

      gsap.set(track, { x: wrapX(pos) });
    });

    /* ---- drag ------------------------------------------------------ */

    area.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      moved = 0;
      fling = 0;
      vel = 0;
      startX = lastX = e.clientX;
      startPos = pos;
      lastT = performance.now();
      area.setPointerCapture(e.pointerId);
      area.classList.add('is-dragging');
    });

    area.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      pos = startPos + dx;

      var now = performance.now();
      var dt = now - lastT;
      /* Sampling over a few milliseconds rather than every event: a single
         mouse delta is far too noisy to throw with. */
      if (dt > 12) {
        vel = (e.clientX - lastX) / dt * 1000;
        lastX = e.clientX;
        lastT = now;
      }
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      area.classList.remove('is-dragging');
      if (e && e.pointerId != null && area.hasPointerCapture(e.pointerId)) {
        area.releasePointerCapture(e.pointerId);
      }
      /* A stale sample would throw the band after the pointer had already
         stopped, so only carry velocity that is actually current. */
      if (performance.now() - lastT > 120) vel = 0;
      fling = clamp(vel, -MAX_FLING, MAX_FLING);
    }

    area.addEventListener('pointerup', endDrag);
    area.addEventListener('pointercancel', endDrag);

    /* A drag that ends over a link must not follow it. Capture phase, so
       this runs before the link's own handling. */
    area.addEventListener('click', function (e) {
      if (moved > DRAG_SLOP) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    /* ---- speed ------------------------------------------------------ */

    /* Hover and focus are held as separate states rather than each calling
       setRate directly. Sharing one value meant the last event to fire won,
       so hovering a band that already had focus started it moving again and
       the keyboard stop silently stopped working. */
    var hovered = false;
    var focused = false;

    function applyRate() {
      setRate(focused ? 0 : (hovered ? MARQUEE_HOVER_RATE : 1));
    }

    if (CAN_HOVER) {
      strip.addEventListener('pointerenter', function () { hovered = true;  applyRate(); });
      strip.addEventListener('pointerleave', function () { hovered = false; applyRate(); });
    }

    /* Keyboard focus stops it outright, and outranks hover. Someone tabbing
       through needs the thing to hold still, and this keeps a real stop
       available without a pointer. */
    strip.addEventListener('focusin',  function () { focused = true;  applyRate(); });
    strip.addEventListener('focusout', function () { focused = false; applyRate(); });

    /* Slot widths are viewport-derived, so the wrap distance moves with the
       window. Re-measure once things have settled. */
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var w = fillTrack(track);
        if (!w) return;
        setWidth = w;
        baseVel = -setWidth / dur;
        wrapX = gsap.utils.wrap(-setWidth, 0);
        pos = wrapX(pos);
      }, 180);
    });
  }

  /* ------------------------------------------------------------------ *
   * 4. Boot
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
  initMarquees();
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
