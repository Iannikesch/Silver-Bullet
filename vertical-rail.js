/* ==========================================================
   Silver Bullet — the verticals carousel

   A slow, continuous, right-to-left loop of the six industry
   cards. This is the fifth thing on the page that moves on its own,
   and DESIGN.md records it as such under "The fifth mover".

   Doctrine follows testimonial-slider.js: self-initialising, no GSAP,
   and the markup works with this file absent. Without it - or under
   prefers-reduced-motion, where it bails before touching anything -
   the rail is the plain scroll-snap strip the stylesheet declares:
   six readable cards at full size, nothing hidden, nothing dimmed.

   With it, the rail becomes a track you can grab. The cards are cloned until they
   cover the rail plus one full set, the whole strip is driven by one
   number (--x on the rail), and each card gets one number of its own
   (--k, 0 at the centre of the rail and 1 at either edge). The
   stylesheet decides what those numbers mean; this file only
   publishes them.

   Nothing here reads layout per frame. Card positions are arithmetic
   on the owned position, so the loop never forces a layout the way a
   getBoundingClientRect() per card per frame would.
   ========================================================== */

(function () {
  'use strict';

  var rail = document.querySelector('[data-vrail]');
  if (!rail) return;

  var cards = Array.prototype.slice.call(rail.querySelectorAll('.vcard'));
  if (cards.length < 2) return;

  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) return;

  var section = rail.closest('.verticals') || rail;

  /* Seconds for one card pitch (card + gap) to pass a fixed point - so
     roughly how long a card takes to cross the centre. Lives in CSS on
     .verticals next to --vcard-w, the same way the marquee rates live in
     :root, so the pace is tuned in the stylesheet and not here. */
  var dwell = parseFloat(getComputedStyle(section).getPropertyValue('--vrail-dwell')) || 9;

  /* ---- clones ------------------------------------------------------
     A seamless loop needs cards on both sides of the wrap point, so the
     set is duplicated until it covers the rail plus one full set. Clones
     are hidden from assistive tech and their links are pulled out of the
     tab order: a screen reader gets six industries, not eighteen. */
  var all = cards.slice();
  var sets = 1;

  function addSet() {
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i].cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.classList.add('vcard--clone');
      var focusable = c.querySelectorAll('a, button');
      for (var j = 0; j < focusable.length; j++) focusable[j].tabIndex = -1;
      rail.appendChild(c);
      all.push(c);
    }
    sets++;
  }

  /* ---- geometry ----------------------------------------------------
     Read once, and again on resize. Everything the frame loop needs is
     derived from these four numbers. */
  var railW = 0, cardW = 0, gap = 0, pitch = 0, setW = 0;

  function measure() {
    railW = rail.clientWidth;
    cardW = cards[0].offsetWidth;
    gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    pitch = cardW + gap;
    setW = pitch * cards.length;
    /* Enough sets that the last card's right edge is never inside the
       rail, at any position in the loop. */
    var need = Math.ceil((railW + setW + gap) / setW);
    while (sets < need) addSet();
  }

  /* ---- the loop ----------------------------------------------------
     pos is the owned position in px, wrapped over one set width. speed
     is a 0..1 multiplier on the drift rate, eased toward its target so a
     hover slows the track down rather than stopping it dead - and lets
     it pick back up the same way. nudge is a distance the arrows still
     owe the track, paid off with an ease-out over a few frames. */
  var pos = 0;
  var speed = 1;
  var target = 1;
  var nudge = 0;
  var fling = 0;      /* decaying velocity carried out of a throw, px/s */
  var dragging = false;
  var last = 0;
  var frame = 0;
  var lastK = [];

  var MAX_FLING = 3200; /* px/s. Same cap as the marquee bands: a violent
                           flick should not fire the cards off the page. */
  var DRAG_SLOP = 5;    /* px of movement before a press counts as a drag
                           and stops being a click. */

  function tick(now) {
    frame = requestAnimationFrame(tick);

    /* Clamped: a background tab hands back one enormous frame on return,
       and that would throw the track a screen and a half in a single
       step. 50ms is the most any frame is allowed to be worth. */
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    speed += (target - speed) * (1 - Math.exp(-dt / 0.35));

    /* While a drag is in progress the pointer owns pos outright. The rest
       of the time it is the drift, plus whatever a throw left behind. */
    if (!dragging) {
      pos += ((pitch / dwell) * speed + fling) * dt;
      if (fling) {
        /* Decayed per frame-time, not per frame, so the throw travels the
           same distance at 120Hz as at 60. Same constant as motion.js. */
        fling *= Math.pow(0.93, dt / 0.016667);
        if (Math.abs(fling) < 2) fling = 0;
      }
    }

    if (nudge) {
      var step = nudge * (1 - Math.exp(-dt / 0.16));
      pos += step;
      nudge -= step;
      if (Math.abs(nudge) < 0.5) { pos += nudge; nudge = 0; }
    }

    pos = ((pos % setW) + setW) % setW;
    rail.style.setProperty('--x', (-pos).toFixed(2) + 'px');

    /* --k is plain distance from the centre, 0 there and 1 at either
       edge of the rail. Linear on purpose: the brief is a gradual
       brighten-in and dim-out with no flat spot and no snap. */
    var half = railW / 2;
    for (var i = 0; i < all.length; i++) {
      var cx = i * pitch + cardW / 2 - pos;
      var k = Math.abs(cx - half) / half;
      k = k > 1 ? 1 : k;
      k = Math.round(k * 1000) / 1000;
      if (k !== lastK[i]) {
        lastK[i] = k;
        all[i].style.setProperty('--k', k);
      }
    }
  }

  function start() {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  /* ---- what holds it -----------------------------------------------
     Hover, keyboard focus and a finger held on the track all resolve
     through one function rather than each setting the target, so a
     hover ending cannot cancel a focus that is still there. */
  var hover = false, focus = false, held = false;

  function resolve() {
    target = (hover || focus || held) ? 0 : 1;
  }

  rail.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') { hover = true; resolve(); }
  });
  rail.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') { hover = false; resolve(); }
  });

  /* Keyboard focus only. The rail is focusable, so a plain click on it
     to start a drag focuses it too - and without this check the loop
     would stay stopped after every drag until the visitor clicked
     somewhere else. :focus-visible is the browser's own "this focus
     came from the keyboard" signal. */
  rail.addEventListener('focusin', function (e) {
    focus = e.target.matches(':focus-visible');
    resolve();
  });
  rail.addEventListener('focusout', function () { focus = false; resolve(); });

  /* ---- drag and throw ----------------------------------------------
     The same gesture the marquee bands have, on the same rules. A press
     holds the track - which is also what a phone gets instead of hover -
     a drag moves it under the pointer, and letting go at speed throws
     it, the velocity decaying back into the drift. Dragging LEFT moves
     the cards left, so pointer movement is subtracted from pos. */
  var startX = 0, lastX = 0, startPos = 0, lastT = 0, vel = 0, moved = 0;

  rail.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    held = true;
    moved = 0;
    fling = 0;
    nudge = 0;
    vel = 0;
    startX = lastX = e.clientX;
    startPos = pos;
    lastT = performance.now();
    rail.setPointerCapture(e.pointerId);
    rail.classList.add('is-dragging');
    resolve();
  });

  /* Three of the cards carry a photo, and a native image drag would
     cancel the pointer gesture after one move. See motion.js for the
     full account; the fix is the same. */
  rail.addEventListener('dragstart', function (e) { e.preventDefault(); });

  rail.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    pos = startPos - dx;

    var now = performance.now();
    var dt = now - lastT;
    /* Sampled over a few milliseconds rather than every event: a single
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
    held = false;
    rail.classList.remove('is-dragging');
    if (e && e.pointerId != null && rail.hasPointerCapture(e.pointerId)) {
      rail.releasePointerCapture(e.pointerId);
    }
    /* A stale sample would throw the track after the pointer had already
       stopped, so only carry velocity that is actually current. */
    if (performance.now() - lastT > 120) vel = 0;
    fling = Math.max(-MAX_FLING, Math.min(MAX_FLING, -vel));
    resolve();
  }

  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);

  /* A drag that ends over a case-study link must not follow it. Capture
     phase, so this runs before the link's own handling. */
  rail.addEventListener('click', function (e) {
    if (moved > DRAG_SLOP) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* Off screen it holds, so nobody arrives to find the loop already
     wherever it got to, and no frame is spent on a rail nobody can see. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start(); else stop();
    }, { threshold: 0.05 }).observe(rail);
  } else {
    start();
  }

  /* ---- arrows and keys ---------------------------------------------
     Built here rather than authored in the HTML, for the same reason the
     testimonial dots are: without this file there is nothing for them to
     do. Each press moves the track one card. No end state to grey out:
     a loop has no ends. */
  function step(dir) { nudge += dir * pitch; }

  rail.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  var nav = document.querySelector('[data-vrail-nav]');
  var buttons = [];

  function button(dir, label, d) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'vrail-btn';
    b.setAttribute('aria-label', label);
    b.setAttribute('data-track', 'verticals-' + (dir < 0 ? 'prev' : 'next'));
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="' + d + '"></path></svg>';
    b.addEventListener('click', function () { step(dir); });
    return b;
  }

  if (nav) {
    buttons.push(button(-1, 'Previous', 'M15 6l-6 6l6 6'));
    buttons.push(button(1, 'Next', 'M9 6l6 6l-6 6'));
    nav.appendChild(buttons[0]);
    nav.appendChild(buttons[1]);
  }

  /* ---- go ----------------------------------------------------------
     The class is what switches the stylesheet from scroll strip to
     track: overflow hidden, the edge masks, and the falloff. */
  rail.classList.add('vrail--loop');
  measure();
  /* Start with a card dead centre rather than the strip flush left. */
  pos = ((cardW / 2 - railW / 2) % setW + setW) % setW;

  window.addEventListener('resize', measure);
  /* Fonts and the clamp() card width can settle after first paint. */
  window.addEventListener('load', measure);

  /* If the visitor turns reduced motion on mid-session, hand the rail
     back: strip the clones and the class and it is the scroll strip
     again, every card at full strength. */
  function teardown() {
    stop();
    rail.classList.remove('vrail--loop');
    rail.classList.remove('is-dragging');
    rail.style.removeProperty('--x');
    for (var i = all.length - 1; i >= 0; i--) {
      if (i >= cards.length) rail.removeChild(all[i]);
      else all[i].style.removeProperty('--k');
    }
    all = cards.slice();
    for (var j = 0; j < buttons.length; j++) buttons[j].remove();
  }
  if (motion.addEventListener) {
    motion.addEventListener('change', function (e) { if (e.matches) teardown(); });
  }
})();
