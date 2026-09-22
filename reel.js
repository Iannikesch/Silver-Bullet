/* ==========================================================
   Silver Bullet — the hero belt

   A chain of creative coming down one lane like an elevator:

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
   px/s, linear, and dissolves over its last stretch into the hero's
   bottom edge - with the next card CHAIN_GAP px behind it the whole way.

   THE ORDER IS THE MARKUP'S, NOT THIS FILE'S. index.html holds two
   [data-belt-col] elements, and each one's children are that column's
   list, read top to bottom. This file repeats a column's list as many
   times as the lane is long, so to change what appears where you
   reorder the markup and touch nothing here. A card is a <video> or an
   <img>; each keeps its own shape, declared as data-ar, so a square ad
   and a 9:16 clip both sit in the chain without being cropped to match.

   Where the lane is too narrow for two columns it falls back to one,
   and that one column runs BOTH lists interleaved - left, right, left -
   so nothing is dropped at a small window, it just takes longer to come
   round.

   Everything is measured, not assumed. The lane's left edge is the
   widest client rect of the h1's text, and the same measurement writes
   --copy-w so the lead stops where the headline stops (see .hero .lead
   in site.css).

   Same doctrine as nav.js and the slider: self-initialising, no GSAP,
   requestAnimationFrame only, and the page is correct without it - a
   <noscript> rule removes the belt entirely.

   It also decides what gets DOWNLOADED. Nothing in the markup carries a
   real src, only data-src, so the belt costs nothing until this file
   copies one onto the other. It does that once the page has loaded and
   gone idle - after first paint, while the visitor is still on the
   headline - so the belt is already running by the time they reach it.
   It never does it under 760px (the belt is display:none there) or
   under prefers-reduced-motion, where the first card alone is filled in
   and parked at the top of the lane as a still.
   ========================================================== */

(function () {
  'use strict';

  var belt = document.querySelector('[data-belt]');
  if (!belt) return;
  var colEls = Array.prototype.slice.call(belt.querySelectorAll('[data-belt-col]'));
  if (!colEls.length) return;

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

  /* ---- the lists ---------------------------------------------------- */

  /* Read the markup once. Each column's list is an array of items in the
     order they are written; an item is what to show, not an element. */
  function readList(colEl) {
    return Array.prototype.slice.call(colEl.children).map(function (el) {
      var ar = (el.getAttribute('data-ar') || '9/16').split('/');
      return {
        tag: el.tagName.toLowerCase(),
        src: el.getAttribute('data-src') || el.getAttribute('src') || '',
        ar: el.getAttribute('data-ar') || '9/16',
        ratio: (parseFloat(ar[1]) || 16) / (parseFloat(ar[0]) || 9)  /* h per 1 w */
      };
    });
  }

  var lists = colEls.map(readList);
  if (!lists[0].length) return;

  /* One column has to carry everything, so it takes both lists turn and
     turn about rather than dropping the second. */
  function interleaved() {
    var out = [], i = 0, more = true;
    while (more) {
      more = false;
      for (var c = 0; c < lists.length; c++) {
        if (i < lists[c].length) { out.push(lists[c][i]); more = true; }
      }
      i++;
    }
    return out;
  }

  /* ---- the slots ---------------------------------------------------- */

  var started = false;
  var active = [];      /* active[c] = { el, list, cards[], starts[], len } */
  var builtCols = 0;    /* how many columns the current slots were built for */

  function makeCard(item) {
    var el = document.createElement(item.tag);
    el.className = 'belt__card';
    el.style.aspectRatio = item.ar;
    el.style.opacity = '0';
    if (item.tag === 'video') {
      el.muted = true; el.loop = true; el.playsInline = true;
      el.setAttribute('muted', ''); el.setAttribute('playsinline', '');
      el.preload = 'none';
    } else {
      el.alt = '';
      el.decoding = 'async';
    }
    el.setAttribute('data-src', item.src);
    if (started) fill(el);
    return el;
  }

  /* data-src onto src: the one moment a card costs anything. */
  function fill(el) {
    var want = el.getAttribute('data-src');
    if (!want || el.getAttribute('src') === want) return;
    if (el.tagName.toLowerCase() === 'video') el.preload = 'auto';
    el.setAttribute('src', want);
    if (el.tagName.toLowerCase() === 'video') el.load();
  }

  /* Build (or rebuild) the slots for the column count in hand. Slot j of
     a column shows list[j % list.length], so the list simply repeats. */
  function build(cols) {
    active = [];
    colEls.forEach(function (el) {
      while (el.firstChild) el.removeChild(el.firstChild);
      el.hidden = false;
    });
    for (var c = 0; c < cols; c++) {
      active.push({
        el: colEls[c],
        list: cols === 1 ? interleaved() : lists[c],
        cards: [], starts: [], len: 0
      });
    }
    for (var h = cols; h < colEls.length; h++) colEls[h].hidden = true;
    builtCols = cols;
  }

  function ensureSlots(col, n) {
    while (col.cards.length < n) {
      var item = col.list[col.cards.length % col.list.length];
      var card = makeCard(item);
      col.el.appendChild(card);
      col.cards.push(card);
    }
  }

  /* ---- measurement -------------------------------------------------- */

  var laneH = 0, laneW = 0, cols = 1, stagger = 0, fadeOut = FADE_OUT_MAX;

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
    var edge = headlineEdge();

    copy.style.setProperty('--copy-w', Math.round(edge - copy.getBoundingClientRect().left) + 'px');

    /* The lane: from the mouth to the viewport edge; from under the VSL
       box (or the top of the copy block if there is none) to the bottom
       of the hero ground. Both ends clip. */
    var left = Math.round(edge - g.left + MOUTH_GAP);
    var topEdge = vsl ? vsl.getBoundingClientRect().bottom : grid.getBoundingClientRect().top;
    var top = Math.round(topEdge - g.top);
    laneW = Math.max(0, Math.round(g.width - left));
    laneH = Math.max(0, Math.round(g.height - top));
    fadeOut = Math.min(FADE_OUT_MAX, laneH * FADE_OUT_FRAC);
    belt.style.top = top + 'px';
    belt.style.height = laneH + 'px';
    belt.style.left = left + 'px';
    belt.style.width = laneW + 'px';

    /* Two columns when they fit, centred as a pair, the cards narrowing
       to make them fit before giving up and going to one, centred. */
    var fit = Math.floor((laneW - COL_GAP - 2 * MOUTH_GAP) / 2);
    cols = (colEls.length > 1 && fit >= CARD_W_MIN) ? 2 : 1;
    var w = cols === 2 ? Math.min(CARD_W_TWO, fit) : CARD_W_ONE;
    belt.style.setProperty('--card-w', w + 'px');

    if (cols !== builtCols) build(cols);

    var span = cols * w + (cols - 1) * COL_GAP;
    var x0 = Math.round((laneW - span) / 2);

    /* Enough slots that a column's chain is longer than the lane by a
       card and a gap, so the wrap from bottom to top happens off screen
       - and never fewer than the list, or an item would never show. */
    active.forEach(function (col, c) {
      col.el.style.left = (x0 + c * (w + COL_GAP)) + 'px';
      col.el.style.width = w + 'px';

      var tallest = 0;
      col.list.forEach(function (it) { tallest = Math.max(tallest, it.ratio * w); });
      var need = Math.ceil((laneH + tallest + CHAIN_GAP) / (tallest + CHAIN_GAP)) + 1;
      ensureSlots(col, Math.max(need, col.list.length));

      /* Each slot's start down the chain, cumulative, so the gap between
         any two cards is CHAIN_GAP whatever their heights. */
      col.starts = []; col.heights = [];
      var run = 0;
      for (var j = 0; j < col.cards.length; j++) {
        var it = col.list[j % col.list.length];
        var h = Math.round(it.ratio * w);
        col.heights[j] = h;
        col.starts[j] = run;
        run += h + CHAIN_GAP;
      }
      col.len = run;
    });

    /* The second column runs half a card behind the first, so the two
       read as one chain rather than two rows of pairs. */
    stagger = ((active[0] && active[0].heights[0]) || 0) / 2 + CHAIN_GAP / 2;
  }

  /* ---- the frame ---------------------------------------------------- */

  var offset = 0;            /* how far the belt has travelled, px */
  var last = 0;
  var raf = 0;
  var running = false;

  function easeInQuad(t) { return t * t; }
  function clamp01(t)    { return t < 0 ? 0 : t > 1 ? 1 : t; }

  function place(col, c, j) {
    var card = col.cards[j];
    var h = col.heights[j] || 0;
    /* Where this card is down its column's chain, positive modulo so the
       chain is full from the first frame. Minus its own height: a card at
       the start is just above the lane, and slides out from under the
       VSL box as it goes. */
    var y = (offset - col.starts[j] - c * stagger) % col.len;
    if (y < 0) y += col.len;
    y -= h;

    var centre  = y + h / 2;
    var o = 1 - easeInQuad(clamp01((centre - (laneH - fadeOut)) / fadeOut));

    card.style.transform = 'translate3d(0, ' + y.toFixed(1) + 'px, 0)';
    card.style.opacity = o.toFixed(3);
    if (card.tagName.toLowerCase() === 'video') {
      keep(card, o > 0.01 && y + h > 0 && y < laneH);
    }
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
    for (var c = 0; c < active.length; c++) {
      for (var j = 0; j < active[c].cards.length; j++) place(active[c], c, j);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ---- start, and only when it is worth starting ------------------ */

  function fetchAll() {
    active.forEach(function (col) { col.cards.forEach(fill); });
  }

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
    active.forEach(function (col) {
      col.cards.forEach(function (card) {
        if (card.tagName.toLowerCase() === 'video') keep(card, false);
      });
    });
  }

  /* ---- reduced motion: a still at the top of the lane -------------- */

  if (REDUCED) {
    var still = function () {
      layout();
      var first = active[0] && active[0].cards[0];
      if (!first) return;
      fill(first);
      first.style.opacity = '1';
      first.style.transform = 'translate3d(0, 0, 0)';
    };
    still();
    window.addEventListener('resize', still);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(still);
    return;
  }

  /* Fetch early: once the page has loaded and the browser is idle,
     nothing the visitor is waiting for is still in flight, so the belt
     can come in behind the headline. */
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
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (started) layout(); }, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (started) layout(); });

  /* Crossing the breakpoint with the belt running: stop it and drop the
     buffers. Crossing back: it starts again, full. */
  NARROW.addEventListener('change', function (e) {
    if (e.matches) {
      pauseAll(); started = false; offset = 0; builtCols = 0;
      colEls.forEach(function (el) { while (el.firstChild) el.removeChild(el.firstChild); });
      active = [];
    } else {
      start(); resume();
    }
  });
})();
