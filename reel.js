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

   WHY THE CLIPS ARE PAINTED, NOT SHOWN. A video card on screen is a
   <canvas>, and the <video> behind it is never put in the document.
   Measured in Chrome: with two or more <video> elements playing in the
   page, the compositor drops the WHOLE PAGE to the video's cadence -
   30fps on a 60Hz screen, 50 on a 100Hz one - so the belt stepped
   rather than glided, and so did everything else. Detached videos
   playing into canvases keep the page at the display's full rate (60
   with five clips live). One detached <video> per file, shared by every
   card showing that file, and requestVideoFrameCallback paints only
   when the clip has a new frame, so a 30fps clip costs 30 draws a
   second, not 60.

   WHY THE COLUMN MOVES, NOT THE CARDS. Each frame writes ONE transform
   per column. A card's own transform changes only when it wraps from
   the bottom of the chain to the top, and its opacity only while it is
   in the fade at the bottom edge. Writing both to every card every
   frame cost 1.5-5ms of style recalc a frame; this is a fraction of it.

   It also decides what gets DOWNLOADED. Nothing in the markup carries a
   real src, only data-src, so the belt costs nothing until this file
   copies one onto the other. Once the page has loaded and gone idle it
   fetches the stills and each clip's first-frame poster (data-poster,
   5-22KB each) so no card is ever an empty panel. A clip itself is
   fetched only when the belt is near the viewport AND its card is
   within LOOKAHEAD px of entering the lane - so the first screen pays
   for four or five clips, not all of them, and never before load. It
   never does any of this under 760px (the belt is display:none there),
   and under prefers-reduced-motion the first card alone is filled in -
   its poster - and parked at the top of the lane as a still.
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

  var BELT_SPEED  = 28;    /* px per second. Doubled from 14 on instruction,
                              to get round the chain quicker; the study's
                              two rows run at ~21 and ~44. */
  var CARD_W_TWO  = 190;   /* px card width with two columns, at most... */
  var CARD_W_MIN  = 150;   /* ...and at least, before it drops to one */
  var CARD_W_ONE  = 220;   /* px card width with one column */
  var COL_GAP     = 44;    /* px between the two columns */
  var MOUTH_GAP   = 28;    /* px between the headline's end and the lane */
  var CHAIN_GAP   = 40;    /* px between one card and the next: the __ */
  var FADE_OUT_MAX = 140;  /* the centre's last 140px before the edge... */
  var FADE_OUT_FRAC = 0.25; /* ...or a quarter of a short lane */
  var MAX_DT      = 50;    /* ms. A throttled tab must not lurch. */
  var LOOKAHEAD   = 400;   /* px above the lane at which a clip is fetched:
                              ~14s of travel, time enough on 4G. */
  var NEAR_MARGIN = '50%'; /* belt this close to the viewport = fetch clips */
  var FADE_IN_MS  = 250;   /* a card with nothing to show yet stays at 0 and
                              fades in over this once it has, so the lane
                              never shows an empty panel */
  var PAINT_W     = 450;   /* px, the canvas's backing width before the
                              clip reports its own; the encodes are 450. */

  /* ---- the lists ---------------------------------------------------- */

  /* Read the markup once. Each column's list is an array of items in the
     order they are written; an item is what to show, not an element. */
  function readList(colEl) {
    return Array.prototype.slice.call(colEl.children).map(function (el) {
      var ar = (el.getAttribute('data-ar') || '9/16').split('/');
      return {
        tag: el.tagName.toLowerCase(),
        src: el.getAttribute('data-src') || el.getAttribute('src') || '',
        poster: el.getAttribute('data-poster') || '',
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

  /* ---- the players -------------------------------------------------- */

  /* One detached <video> per file. Every card showing that file is a
     canvas in player.cards; player.live counts the ones in the lane, and
     the clip plays while that is above zero. */
  var players = {};
  var HAS_RVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

  function playerFor(src) {
    if (players[src]) return players[src];
    var v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.preload = 'none';
    var p = players[src] = { src: src, video: v, cards: [], live: 0, loaded: false, painted: false, lastT: -1 };
    if (HAS_RVFC) {
      var onFrame = function () { paintAll(p); v.requestVideoFrameCallback(onFrame); };
      v.requestVideoFrameCallback(onFrame);
    }
    v.addEventListener('loadeddata', function () { paintAll(p); });
    return p;
  }

  function loadPlayer(p) {
    if (p.loaded) return;
    p.loaded = true;
    p.video.preload = 'auto';
    p.video.src = p.src;
  }

  /* Paint the clip's current frame into every card of it that can be
     seen - or into every card, the first time, so none is left on the
     poster once the clip has something better. */
  function paintAll(p) {
    var v = p.video;
    if (v.readyState < 2) return;
    var first = !p.painted;
    p.painted = true;
    p.lastT = v.currentTime;
    for (var i = 0; i < p.cards.length; i++) {
      if (first || p.cards[i]._live) paint(p.cards[i], v);
    }
  }

  function paint(canvas, source) {
    var w = source.videoWidth || source.naturalWidth;
    var h = source.videoHeight || source.naturalHeight;
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    canvas._ctx.drawImage(source, 0, 0, w, h);
    shown(canvas);
  }

  /* The moment a card first has something to show; placeCol fades it
     in from there. */
  function shown(card) {
    if (!card._shownAt) card._shownAt = performance.now();
  }

  /* A card enters or leaves the lane: count it, play or pause its clip,
     and give it the clip's current frame at once rather than at the next
     one, so it never arrives stale. */
  function setLive(card, live) {
    if (card._live === live) return;
    card._live = live;
    var p = card._player;
    if (!p) return;
    p.live += live ? 1 : -1;
    if (live) {
      loadPlayer(p);
      if (p.painted) paint(card, p.video);
      if (running && p.video.paused) {
        var r = p.video.play(); if (r && r.catch) r.catch(function () {});
      }
    } else if (p.live <= 0) {
      p.live = 0;
      if (!p.video.paused) p.video.pause();
    }
  }

  var posters = {};
  function posterFor(card, src) {
    if (!src) return;
    var img = posters[src];
    if (!img) {
      img = posters[src] = new Image();
      img.decoding = 'async';
      img._waiting = [];
      img.onload = function () {
        img._waiting.forEach(function (c) { if (!c._player.painted) paint(c, img); });
        img._waiting = [];
      };
      img.src = src;
    }
    if (img.complete && img.naturalWidth) { if (!card._player.painted) paint(card, img); }
    else img._waiting.push(card);
  }

  /* ---- the slots ---------------------------------------------------- */

  var started = false;
  var active = [];      /* active[c] = { el, list, cards[], starts[], len } */
  var builtCols = 0;    /* how many columns the current slots were built for */

  function makeCard(item) {
    var el;
    if (item.tag === 'video') {
      el = document.createElement('canvas');
      el.width = PAINT_W;
      el.height = Math.round(PAINT_W * item.ratio);
      el._ctx = el.getContext('2d', { alpha: false });
      el._player = playerFor(item.src);
      el._player.cards.push(el);
      el._poster = item.poster;
    } else {
      el = document.createElement('img');
      el.alt = '';
      el.decoding = 'async';
      el.addEventListener('load', function () { shown(el); });
      el.setAttribute('data-src', item.src);
    }
    el.className = 'belt__card';
    el.style.aspectRatio = item.ar;
    el.style.opacity = '0';
    el._live = false;
    el._shownAt = 0;
    if (started) fill(el);
    return el;
  }

  /* The one moment a card costs anything: a still gets its src, a clip
     gets its poster. The clip itself waits for setLive. */
  function fill(el) {
    if (el._player) { posterFor(el, el._poster); return; }
    var want = el.getAttribute('data-src');
    if (!want || el.getAttribute('src') === want) return;
    el.setAttribute('src', want);
  }

  function dropCard(el) {
    if (el._player) {
      setLive(el, false);
      var list = el._player.cards, i = list.indexOf(el);
      if (i >= 0) list.splice(i, 1);
    }
  }

  /* Build (or rebuild) the slots for the column count in hand. Slot j of
     a column shows list[j % list.length], so the list simply repeats. */
  function build(cols) {
    active.forEach(function (col) { col.cards.forEach(dropCard); });
    active = [];
    colEls.forEach(function (el) {
      while (el.firstChild) el.removeChild(el.firstChild);
      el.hidden = false;
      el.style.willChange = 'transform';
    });
    for (var c = 0; c < cols; c++) {
      active.push({
        el: colEls[c],
        list: cols === 1 ? interleaved() : lists[c],
        cards: [], starts: [], heights: [], local: [], op: [], len: 0
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
         any two cards is CHAIN_GAP whatever their heights. The cached
         local position and opacity are cleared so the next frame writes
         them all afresh. */
      col.starts = []; col.heights = []; col.local = []; col.op = [];
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
  var near = false;          /* belt within NEAR_MARGIN of the viewport */

  function easeInQuad(t) { return t * t; }
  function clamp01(t)    { return t < 0 ? 0 : t > 1 ? 1 : t; }

  /* The column travels; its cards sit still inside it. With B the
     column's travel round its own chain (0..len), card j is at B - start
     - h once the column has passed its start, and a whole chain further
     up until then - the same positive modulo as before, split so the
     card's own transform only changes on the frame it wraps. */
  function placeCol(col, c, now) {
    if (!col.len) return;
    var B = (offset - c * stagger) % col.len;
    if (B < 0) B += col.len;
    col.el.style.transform = 'translate3d(0, ' + B.toFixed(2) + 'px, 0)';

    for (var j = 0; j < col.cards.length; j++) {
      var card = col.cards[j];
      var h = col.heights[j] || 0;
      var local = (col.starts[j] <= B ? 0 : col.len) - col.starts[j] - h;
      if (col.local[j] !== local) {
        col.local[j] = local;
        card.style.transform = 'translate3d(0, ' + local + 'px, 0)';
      }

      var y = B + local;
      var inLane = y + h > 0 && y < laneH;
      var centre = y + h / 2;
      var o = inLane ? 1 - easeInQuad(clamp01((centre - (laneH - fadeOut)) / fadeOut)) : 0;
      if (o < 0.01) { o = 0; inLane = false; }
      if (o > 0) o *= card._shownAt ? clamp01((now - card._shownAt) / FADE_IN_MS) : 0;
      var prev = col.op[j];
      if (prev === undefined || (o !== prev && (Math.abs(o - prev) > 0.004 || o === 0 || o === 1))) {
        col.op[j] = o;
        card.style.opacity = o.toFixed(3);
      }

      if (card._player) {
        /* Fetch a clip a little before its card arrives; play it only
           while the card is in the lane. */
        if (near && y + h > -LOOKAHEAD && y < laneH) loadPlayer(card._player);
        setLive(card, running && inLane);
      }
    }
  }

  /* Without requestVideoFrameCallback, paint from the frame loop when
     a live clip's time has moved. */
  function paintFallback() {
    for (var src in players) {
      var p = players[src];
      if (p.live > 0 && p.video.readyState >= 2 && p.video.currentTime !== p.lastT) paintAll(p);
    }
  }

  function placeAll(now) {
    if (now === undefined) now = performance.now();
    for (var c = 0; c < active.length; c++) placeCol(active[c], c, now);
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(MAX_DT, now - last);
    last = now;
    offset += BELT_SPEED * dt / 1000;
    placeAll(now);
    if (!HAS_RVFC) paintFallback();
    raf = requestAnimationFrame(frame);
  }

  /* ---- start, and only when it is worth starting ------------------ */

  function fetchAll() {
    active.forEach(function (col) { col.cards.forEach(fill); });
  }

  /* Only ever reached after load and idle (see the bottom), never from
     the observers: the first IntersectionObserver callback arrives with
     the belt still 0x0 and would otherwise start it before load. */
  var ready = false;
  function start() {
    if (started || !ready || NARROW.matches) return;
    started = true;
    layout();
    fetchAll();
    placeAll();
    reobserve();
  }

  function resume() {
    if (running || !started || !visible || document.hidden || NARROW.matches) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function pauseAll() {
    running = false;
    cancelAnimationFrame(raf);
    active.forEach(function (col) { col.cards.forEach(function (card) { setLive(card, false); }); });
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

  /* Fetch after load and idle: nothing the visitor is waiting for is
     still in flight, so the belt comes in behind the headline. */
  var visible = false;
  function whenIdle(fn) {
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 2500 });
    else setTimeout(fn, 800);
  }
  function onReady() { ready = true; start(); resume(); }
  if (document.readyState === 'complete') whenIdle(onReady);
  else window.addEventListener('load', function () { whenIdle(onReady); });

  /* Two observers. The near one decides when clips may be fetched; the
     visible one runs the belt. Off screen or in a background tab the
     belt holds where it is and the clips pause. Back on, it carries on
     from the same place. */
  var observers = [];
  if ('IntersectionObserver' in window) {
    observers.push(new IntersectionObserver(function (entries) {
      var e = entries[0];
      near = e.isIntersecting && e.boundingClientRect.height > 0;
      if (near && started) placeAll();
    }, { rootMargin: NEAR_MARGIN + ' 0px' }));
    observers.push(new IntersectionObserver(function (entries) {
      var e = entries[0];
      visible = e.isIntersecting && e.boundingClientRect.height > 0;
      if (visible) { near = true; resume(); } else pauseAll();
    }, { threshold: 0.1 }));
    observers.forEach(function (io) { io.observe(belt); });
  } else {
    near = visible = true;
  }

  /* Until start() lays it out the belt is 0x0, and an observer may have
     reported on that and then have no crossing left to report once it
     has a size. Observing afresh always delivers a first reading. */
  function reobserve() {
    observers.forEach(function (io) { io.unobserve(belt); io.observe(belt); });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseAll(); else resume();
  });

  /* The lane depends on where the headline wraps, which depends on the
     font: measure again once it is in, and on every resize. */
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (started) { layout(); placeAll(); } }, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (started) { layout(); placeAll(); } });

  /* Crossing the breakpoint with the belt running: stop it and drop the
     buffers. Crossing back: it starts again, full. */
  NARROW.addEventListener('change', function (e) {
    if (e.matches) {
      pauseAll(); started = false; offset = 0;
      build(0);
      for (var src in players) {
        var v = players[src].video;
        v.removeAttribute('src'); v.load();
      }
      players = {};
    } else {
      start(); resume();
    }
  });
})();
