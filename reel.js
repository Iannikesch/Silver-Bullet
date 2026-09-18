/* ==========================================================
   Silver Bullet — the hero belt

   Four clips as free cards in one lane, coming down like an elevator.
   The lane is the column to the right of the headline: it opens past
   the end of the headline's widest line ("Growth partner" — the R the
   owner asked for) and runs to the right edge of the viewport. Cards
   sit centred in that column and travel top to bottom. Each card:

     appears  level with the top of the headline with a hard start:
              opacity 0 to 1 in about 1.2s on a steep ease-out. It does
              not slide in from under the VSL; it is simply there, and
              then it is solid.
     drops    at BELT_SPEED px/s, linear, playing on a loop
     leaves   fading to nothing over the last 260px of its centre's
              travel (less on a short lane), so it is half past the
              hero's bottom edge by the time it is gone

   Cards are spaced evenly along a belt whose length is at least the
   lane's height, so once all four are out the belt is continuous and
   the wrap from the bottom back to the top is never seen: a card is
   invisible at both ends. The study this copies (badmarketing.com) runs
   its rows sideways at ~21 and ~44px/s with no fades at all, just a
   clipped edge; the vertical run, the fades and the mouth at the
   headline are ours.

   Everything is measured, not assumed. The lane's left edge is the
   widest client rect of the h1's text, its top is the hero grid's and
   its bottom is the hero ground's, and the same measurement writes
   --copy-w so the lead stops where the headline stops (see .hero .lead
   in site.css).

   Same doctrine as nav.js and the slider: self-initialising, no GSAP,
   requestAnimationFrame only, and the page is correct without it - a
   <noscript> rule removes the belt entirely.

   It also decides what gets DOWNLOADED. The clips carry preload="none"
   and no autoplay attribute, so nothing is fetched until this file says
   so - and it never says so under 760px (the belt is display:none there)
   or under prefers-reduced-motion, where the first clip is asked for its
   first frame only and parked at the top of the lane as a still.
   ========================================================== */

(function () {
  'use strict';

  var belt = document.querySelector('[data-belt]');
  if (!belt) return;
  var cards = Array.prototype.slice.call(belt.querySelectorAll('.belt__card'));
  if (!cards.length) return;

  var ground = belt.parentNode;                       /* .hero-ground */
  var grid = document.querySelector('.hero__grid');
  var copy = document.querySelector('.hero__copy');
  var h1 = document.querySelector('.hero h1');
  if (!grid || !copy || !h1) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NARROW  = window.matchMedia('(max-width: 760px)');

  /* ---- the numbers -------------------------------------------------- */

  var BELT_SPEED  = 20;    /* px per second. Slow end of the study. */
  var CARD_H      = 391;   /* px, the 9:16 card. Real heights are measured. */
  var MOUTH_GAP   = 28;    /* px between the headline's end and the lane */
  var MIN_GAP     = 56;    /* px between cards, the study's 3.5rem */
  var FADE_IN_PX  = BELT_SPEED * 1.2;   /* 1.2s of travel: the hard start */
  var FADE_OUT_MAX = 260;  /* the centre's last 260px before the edge... */
  var FADE_OUT_FRAC = 0.35; /* ...or 35% of a short lane, so a card is
                               solid for most of a short drop too */
  var MAX_DT      = 50;    /* ms. A throttled tab must not lurch. */

  /* ---- measurement -------------------------------------------------- */

  var laneH = 0, pitch = 0, beltLen = 0, fadeOut = FADE_OUT_MAX;
  var heights = [];

  /* The right edge of the headline's widest LINE, not of its box: the
     box is 13ch wide and the text wraps short of it. */
  function headlineEdge() {
    var range = document.createRange();
    range.selectNodeContents(h1);
    var rects = range.getClientRects();
    var edge = h1.getBoundingClientRect().left;
    for (var i = 0; i < rects.length; i++) if (rects[i].right > edge) edge = rects[i].right;
    return edge;
  }

  function layout() {
    var g = ground.getBoundingClientRect();
    var gr = grid.getBoundingClientRect();
    var edge = headlineEdge();

    copy.style.setProperty('--copy-w', Math.round(edge - copy.getBoundingClientRect().left) + 'px');

    /* The column: from the mouth to the viewport edge. The drop: from
       the top of the copy block to the bottom of the hero ground, so a
       card leaves through the section's own edge, not mid-air. */
    var left = Math.round(edge - g.left + MOUTH_GAP);
    var top = Math.round(gr.top - g.top);
    laneH = Math.max(0, Math.round(g.height - top));
    fadeOut = Math.min(FADE_OUT_MAX, laneH * FADE_OUT_FRAC);
    belt.style.top = top + 'px';
    belt.style.height = laneH + 'px';
    belt.style.left = left + 'px';
    belt.style.width = Math.max(0, Math.round(g.width - left)) + 'px';

    heights = cards.map(function (c) { return c.getBoundingClientRect().height || CARD_H; });
    var sum = heights.reduce(function (a, b) { return a + b; }, 0);
    /* Even spacing, and enough of it that the belt is never shorter than
       the lane - otherwise a card could wrap while still on screen. */
    var gap = Math.max(MIN_GAP, (laneH - sum) / cards.length);
    pitch = sum / cards.length + gap;
    beltLen = pitch * cards.length;
  }

  /* ---- the frame ---------------------------------------------------- */

  var offset = 0;            /* how far the belt has travelled, px */
  var last = 0;
  var raf = 0;
  var running = false;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInQuad(t)   { return t * t; }
  function clamp01(t)      { return t < 0 ? 0 : t > 1 ? 1 : t; }

  function place(i) {
    var card = cards[i];
    var h = heights[i] || CARD_H;
    /* Card i is i pitches behind the belt's head. Negative means it has
       not reached the top yet; it is hidden and waits its turn. */
    var raw = offset - i * pitch;
    if (raw < 0) { card.style.opacity = '0'; keep(card, false); return; }
    var y = raw % beltLen;

    var fadeIn  = easeOutCubic(clamp01(y / FADE_IN_PX));
    var centre  = y + h / 2;
    var leaving = 1 - easeInQuad(clamp01((centre - (laneH - fadeOut)) / fadeOut));
    var o = Math.min(fadeIn, leaving);

    card.style.transform = 'translate3d(-50%, ' + y.toFixed(1) + 'px, 0)';
    card.style.opacity = o.toFixed(3);
    keep(card, o > 0.01 && y < laneH);
  }

  /* Play while it can be seen, pause when it cannot: four clips looping
     off screen is decode work for nothing. */
  function keep(card, playing) {
    if (playing) {
      if (card.paused) { var p = card.play(); if (p && p.catch) p.catch(function () {}); }
    } else if (!card.paused) {
      card.pause();
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(MAX_DT, now - last);
    last = now;
    offset += BELT_SPEED * dt / 1000;
    for (var i = 0; i < cards.length; i++) place(i);
    raf = requestAnimationFrame(frame);
  }

  /* ---- start, and only when it is worth starting ------------------ */

  var started = false;

  function fetchAll() {
    cards.forEach(function (c) {
      if (c.preload !== 'auto') { c.preload = 'auto'; c.load(); }
    });
  }

  function start() {
    if (started || NARROW.matches) return;
    started = true;
    layout();
    fetchAll();
    resume();
  }

  function resume() {
    if (running || !started || NARROW.matches) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function pauseAll() {
    running = false;
    cancelAnimationFrame(raf);
    cards.forEach(function (c) { keep(c, false); });
  }

  /* ---- reduced motion: a still at the top of the lane -------------- */

  if (REDUCED) {
    layout();
    cards[0].preload = 'metadata';
    cards[0].load();
    /* Opacity comes from the stylesheet; only the position is ours. */
    cards[0].style.transform = 'translate3d(-50%, 0, 0)';
    window.addEventListener('resize', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    return;
  }

  /* Off screen or in a background tab the belt holds where it is and the
     clips pause. Back on, it carries on from the same place. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !document.hidden) { start(); resume(); }
      else pauseAll();
    }, { threshold: 0.1 }).observe(belt);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseAll(); else resume();
  });

  /* The lane depends on where the headline wraps, which depends on the
     font: measure again once it is in, and on every resize. */
  var resizeTimer = 0;
  function relayout() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (started) layout(); }, 120);
  }
  window.addEventListener('resize', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (started) layout(); });

  /* Crossing the breakpoint with the belt running: stop it and drop the
     buffers. Crossing back: it starts again from the top. */
  NARROW.addEventListener('change', function (e) {
    if (e.matches) {
      pauseAll(); started = false; offset = 0;
      cards.forEach(function (c) { c.style.opacity = '0'; c.preload = 'none'; c.load(); });
    } else {
      start();
    }
  });
})();
