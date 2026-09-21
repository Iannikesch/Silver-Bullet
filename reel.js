/* ==========================================================
   Silver Bullet — the hero belt

   A chain of clips coming down one lane like an elevator:

        0
        __
        0
        __
        0

   always connected, always several live at once. The lane is the column
   to the right of the headline: it opens past the end of the headline's
   widest line ("Growth partner" — the R the owner asked for) and runs to
   the right edge of the viewport. Its top is the bottom edge of the VSL
   box and its bottom is the bottom of the hero, and it clips: a card
   slides out from under the VSL box already solid, drops at BELT_SPEED
   px/s, linear, playing on a loop, and dissolves over its last stretch
   into the hero's bottom edge - with the next card CHAIN_GAP px behind
   it the whole way. Where the lane is wide enough the chain runs in two
   columns, staggered by half a card, so four or five are in frame.

   Four clips are not enough to fill a lane at that spacing, so the belt
   holds as many SLOTS as the lane needs and the four clips repeat down
   the chain - the same trick as the study (badmarketing.com), whose two
   rows each hold two copies of their list. The clips in the HTML are the
   list; reel.js clones them into the slots the lane calls for, and a
   slot only plays while it is on screen. Each column's belt is longer
   than the lane by at least a card, so the wrap from the bottom to the
   top is never seen.

   Everything is measured, not assumed. The lane's left edge is the
   widest client rect of the h1's text, and the same measurement writes
   --copy-w so the lead stops where the headline stops (see .hero .lead
   in site.css).

   Same doctrine as nav.js and the slider: self-initialising, no GSAP,
   requestAnimationFrame only, and the page is correct without it - a
   <noscript> rule removes the belt entirely.

   It also decides what gets DOWNLOADED. The clips carry preload="none"
   and no autoplay attribute, so nothing is fetched until this file says
   so. It says so once the page has loaded and gone idle - after first
   paint, while the visitor is on the headline - so the belt is already
   running by the time they reach it; and it never says so under 760px
   (the belt is display:none there) or under prefers-reduced-motion,
   where the first clip is asked for its first frame only and parked at
   the top of the lane as a still.
   ========================================================== */

(function () {
  'use strict';

  var belt = document.querySelector('[data-belt]');
  if (!belt) return;
  var sources = Array.prototype.slice.call(belt.querySelectorAll('.belt__card'));
  if (!sources.length) return;

  var ground = belt.parentNode;                       /* .hero-ground */
  var grid = document.querySelector('.hero__grid');
  var copy = document.querySelector('.hero__copy');
  var h1 = document.querySelector('.hero h1');
  var vsl = document.querySelector('.hero__video');
  if (!grid || !copy || !h1) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NARROW  = window.matchMedia('(max-width: 760px)');

  /* ---- the numbers -------------------------------------------------- */

  var BELT_SPEED  = 14;    /* px per second. Under the study's slow row. */
  var CARD_W_TWO  = 190;   /* px card width with two columns, at most... */
  var CARD_W_MIN  = 150;   /* ...and at least, before it drops to one */
  var CARD_W_ONE  = 220;   /* px card width with one column */
  var COL_GAP     = 44;    /* px between the two columns */
  var MOUTH_GAP   = 28;    /* px between the headline's end and the lane */
  var CHAIN_GAP   = 40;    /* px between one card and the next: the __ */
  var FADE_OUT_MAX = 140;  /* the centre's last 140px before the edge... */
  var FADE_OUT_FRAC = 0.25; /* ...or a quarter of a short lane */
  var MAX_DT      = 50;    /* ms. A throttled tab must not lurch. */

  /* ---- the slots ---------------------------------------------------- */

  /* The list: what each clip is, read once from the HTML. */
  var clips = sources.map(function (v) {
    return { src: v.getAttribute('src'), tall: !v.classList.contains('belt__card--4x5') };
  });
  var cards = sources.slice();   /* every slot, the HTML's four first */
  var started = false;

  /* More slots, cloned from the first. A clone is a fresh <video> with
     preload="none"; which clip it shows is dealt in layout(), and it
     fetches only once the belt has started. */
  function ensureSlots(n) {
    while (cards.length < n) {
      var clone = sources[0].cloneNode(false);
      clone.preload = started ? 'auto' : 'none';
      clone.style.opacity = '0';
      belt.appendChild(clone);
      cards.push(clone);
    }
  }

  /* Deal the clips down the columns so every column runs through all
     four in turn and no clip sits beside, under or diagonal to itself:
     slot i in column c, row k, shows clip (k + 2c) mod 4, the second
     column half the list ahead of the first. Only touched when it
     changes, since setting src restarts the video. */
  function deal(i, cols) {
    var card = cards[i];
    var lead = Math.ceil(clips.length / cols);
    var clip = clips[(Math.floor(i / cols) + (i % cols) * lead) % clips.length];
    if (card.getAttribute('src') !== clip.src) {
      card.setAttribute('src', clip.src);
      if (started) { card.preload = 'auto'; card.load(); }
    }
    card.classList.toggle('belt__card--4x5', !clip.tall);
  }

  /* ---- measurement -------------------------------------------------- */

  var laneH = 0, laneW = 0, cols = 1, colLen = 0, stagger = 0, fadeOut = FADE_OUT_MAX;
  var heights = [], starts = [], colX = [0, 0], perCol = 0;

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

  function cardHeight(w, i) {
    var c = cards[i];
    var r = c.getBoundingClientRect();
    if (r.height) return r.height;
    return c.classList.contains('belt__card--4x5') ? w * 5 / 4 : w * 16 / 9;
  }

  function layout() {
    var g = ground.getBoundingClientRect();
    var gr = grid.getBoundingClientRect();
    var edge = headlineEdge();

    copy.style.setProperty('--copy-w', Math.round(edge - copy.getBoundingClientRect().left) + 'px');

    /* The lane: from the mouth to the viewport edge; from under the VSL
       box (or the top of the copy block if there is none) to the bottom
       of the hero ground. Both ends clip. */
    var left = Math.round(edge - g.left + MOUTH_GAP);
    var topEdge = vsl ? vsl.getBoundingClientRect().bottom : gr.top;
    var top = Math.round(topEdge - g.top);
    laneW = Math.max(0, Math.round(g.width - left));
    laneH = Math.max(0, Math.round(g.height - top));
    fadeOut = Math.min(FADE_OUT_MAX, laneH * FADE_OUT_FRAC);
    belt.style.top = top + 'px';
    belt.style.height = laneH + 'px';
    belt.style.left = left + 'px';
    belt.style.width = laneW + 'px';

    /* Two columns when they fit, centred as a pair, the cards narrowing
       to make them fit before giving up and going to one column, centred.
       The card width reaches the stylesheet as --card-w. */
    var fit = Math.floor((laneW - COL_GAP - 2 * MOUTH_GAP) / 2);
    cols = fit >= CARD_W_MIN ? 2 : 1;
    var w = cols === 2 ? Math.min(CARD_W_TWO, fit) : CARD_W_ONE;
    belt.style.setProperty('--card-w', w + 'px');
    var span = cols * w + (cols - 1) * COL_GAP;
    colX[0] = Math.round((laneW - span) / 2);
    colX[1] = colX[0] + w + COL_GAP;

    /* How many slots a column needs: enough that its belt is longer than
       the lane by a card and a gap, so the wrap happens off screen. Every
       column gets the same count; slots are dealt round-robin. */
    var tallest = Math.round(w * 16 / 9);
    perCol = Math.ceil((laneH + tallest + CHAIN_GAP) / (tallest + CHAIN_GAP)) + 1;
    perCol = Math.max(perCol, Math.ceil(sources.length / cols));
    ensureSlots(perCol * cols);
    for (var d = 0; d < cards.length; d++) deal(d, cols);

    /* Each slot's start down its column, cumulative, so the gap between
       any two cards is CHAIN_GAP whatever their heights. */
    heights = cards.map(function (c, i) { return cardHeight(w, i); });
    starts = [];
    var run = [0, 0];
    for (var i = 0; i < cards.length; i++) {
      var col = i % cols;
      starts[i] = run[col];
      run[col] += heights[i] + CHAIN_GAP;
    }
    colLen = Math.max(run[0], run[1]);
    /* The second column runs half a card behind the first, so the two
       read as one chain rather than two rows of pairs. */
    stagger = (heights[0] + CHAIN_GAP) / 2;
  }

  /* ---- the frame ---------------------------------------------------- */

  var offset = 0;            /* how far the belt has travelled, px */
  var last = 0;
  var raf = 0;
  var running = false;

  function easeInQuad(t) { return t * t; }
  function clamp01(t)    { return t < 0 ? 0 : t > 1 ? 1 : t; }

  function place(i) {
    var card = cards[i];
    var h = heights[i] || 0;
    var col = i % cols;
    /* Where the card is down its column's belt, positive modulo so the
       belt is full from the first frame. Minus its own height: a card at
       the start of the belt is just above the lane's top edge, and slides
       out from under the VSL box as it goes. */
    var y = (offset - starts[i] - col * stagger) % colLen;
    if (y < 0) y += colLen;
    y -= h;

    var centre  = y + h / 2;
    var o = 1 - easeInQuad(clamp01((centre - (laneH - fadeOut)) / fadeOut));

    card.style.transform = 'translate3d(' + colX[col] + 'px, ' + y.toFixed(1) + 'px, 0)';
    card.style.opacity = o.toFixed(3);
    keep(card, o > 0.01 && y + h > 0 && y < laneH);
  }

  /* Play while it can be seen, pause when it cannot: a chain of clips
     looping off screen is decode work for nothing. */
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

  function fetchAll() {
    cards.forEach(function (c) {
      if (c.preload !== 'auto') { c.preload = 'auto'; c.load(); }
    });
  }

  /* Measure and fetch. This is what the page's idle moment calls, so
     the clips are streaming while the visitor reads the headline and
     the belt is already running when they reach it - the drift itself
     waits for the belt to be in view (resume, from the observer). */
  function start() {
    if (started || NARROW.matches) return;
    started = true;
    layout();
    fetchAll();
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
    sources[0].preload = 'metadata';
    sources[0].load();
    /* Opacity comes from the stylesheet; only the position is ours. */
    function still() { sources[0].style.transform = 'translate3d(' + colX[0] + 'px, 0, 0)'; }
    still();
    window.addEventListener('resize', function () { layout(); still(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); still(); });
    return;
  }

  /* Fetch early: once the page has loaded and the browser is idle,
     nothing the visitor is waiting for is still in flight, so the clips
     can come in behind the headline. Everyone who lands here sees the
     hero, so the bytes are spent either way; this just spends them
     before the belt is looked at rather than as it is. */
  function whenIdle(fn) {
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 2500 });
    else setTimeout(fn, 800);
  }
  if (document.readyState === 'complete') whenIdle(start);
  else window.addEventListener('load', function () { whenIdle(start); });

  /* Off screen or in a background tab the belt holds where it is and the
     clips pause. Back on, it carries on from the same place. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !document.hidden) { start(); resume(); }
      else pauseAll();
    }, { threshold: 0.1 }).observe(belt);
  } else {
    start(); resume();
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
     buffers. Crossing back: it starts again, full. */
  NARROW.addEventListener('change', function (e) {
    if (e.matches) {
      pauseAll(); started = false; offset = 0;
      cards.forEach(function (c) { c.style.opacity = '0'; c.preload = 'none'; c.load(); });
    } else {
      start(); resume();
    }
  });
})();
