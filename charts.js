/* ==========================================================
   Silver Bullet — the punchline charts

   Three decorative SVG charts around the "Data-driven performance
   marketing" headline on the home page. The SVG is static and
   complete in index.html; this file only animates it.

     - the line is a streak: once the section arrives, the bullet
       travels the path on a clock drawing the line, and the line
       fades away behind it from the bottom-left forward, at a
       slower pace, so it reads as a bolt across the band. Runs
       once. The timing is in the constants below, derived exactly
       as briefed.
     - the bars rise from the baseline once, left to right, and the
       pie's slices arrive once, in order, as the section arrives.

   The start states are set HERE, not in CSS, so with this script
   absent, GSAP down, or reduced motion on, every mark is simply
   there. The stylesheet stays the finished state.

   The numbers are made up and mean nothing. To change them, edit the
   heights / percentages / points in the generator that produced the
   markup (recorded in the commit that added this band) and re-run
   it, or just edit the paths in index.html by hand.
   ========================================================== */

(function () {
  'use strict';

  var band = document.querySelector('.punchline');
  if (!band) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---- the line: a streak the bullet draws, that fades behind it ----

     Timing, exactly as briefed (2026-09-18):

       BASE_CROSS  the pace the bullet crossed at before this change,
                   taken as the reference: 1.8s edge to edge.
       CROSS       that pace reduced by 32%:  1.8 / 0.68  = 2.65s.
       FADE        treating the new pace as 100%, the fading edge that
                   follows the bullet moves at 75% of it, so it takes
                   CROSS / 0.75 = 3.53s to sweep the same path. The trail
                   is still a quarter of the line long when the bullet
                   leaves, and is gone 0.88s later.

     Both edges are dash windows on the path: the bright line is visible
     between the fading edge and the bullet, and a dimmer copy trails a
     little behind the fading edge so the tail softens. Runs once, on
     arrival. It is a clock, not a scroll scrub, because "speed" and "the
     fade follows at 75% of it" only mean something against a clock -
     DESIGN.md's record under "The punchline charts" is updated. */
  var BASE_CROSS = 1.8;
  var CROSS = BASE_CROSS / 0.68;       /* 32% slower */
  var FADE  = CROSS / 0.75;            /* the fade edge at 75% of the bullet's speed */
  var TAIL  = 0.12;                    /* the dim copy trails this fraction of the length */

  var svg   = band.querySelector('.ch--line');
  var path  = band.querySelector('.ch-path:not(.ch-path--dim)');
  var dim   = band.querySelector('.ch-path--dim');
  var tip   = band.querySelector('.ch-tip');
  var maskAll  = band.querySelector('.ch-mask__all');
  var maskText = band.querySelector('.ch-mask__text');
  var len = 0;
  var run = { t: 0 };                  /* 0 to 1 over FADE seconds */

  if (svg && path && tip) {
    var pts = svg.getAttribute('data-points').trim().split(/\s+/).map(function (pair) {
      var xy = pair.split(','); return { x: +xy[0], y: +xy[1] };
    });
    var designH = +svg.getAttribute('data-height') || 700;

    /* The design is 1400 wide on a 700-high canvas. The viewBox is refit
       to the band's real aspect and the points rescaled to it, so the
       line runs corner to edge uniformly and the bullet is never sheared. */
    function fit() {
      var bw = band.clientWidth, bh = band.clientHeight;
      if (!bw || !bh) return;
      var H = 1400 * bh / bw, k = H / designH;
      svg.setAttribute('viewBox', '0 0 1400 ' + H.toFixed(1));
      var d = 'M' + pts.map(function (p) { return p.x + ',' + (p.y * k).toFixed(1); }).join(' L');
      path.setAttribute('d', d);
      if (dim) dim.setAttribute('d', d);
      if (maskAll)  maskAll.setAttribute('height', H.toFixed(1));
      if (maskText) { maskText.setAttribute('cy', (H / 2).toFixed(1)); maskText.setAttribute('ry', (105 * k).toFixed(1)); }
      var m = svg.querySelector('#ch-text-mask'); if (m) m.setAttribute('height', H.toFixed(1));
      len = path.getTotalLength();
      paint(run.t);
    }

    /* Show the path only between two arc lengths: one dash as long as
       the window, a gap longer than the path, and the pattern slid
       forward by `from` with a negative offset. (A leading zero-length
       dash would draw as a dot under the round cap, so none is used.)
       An empty window hides the path outright for the same reason. */
    function window_(el, from, to) {
      from = Math.max(0, Math.min(len, from)); to = Math.max(from, Math.min(len, to));
      var span = to - from;
      el.style.visibility = span > 0.01 ? '' : 'hidden';
      el.style.strokeDasharray = span.toFixed(2) + ' ' + (len + 1).toFixed(2);
      el.style.strokeDashoffset = (-from).toFixed(2);
    }

    function placeTip(at) {
      var p = path.getPointAtLength(at);
      var q = path.getPointAtLength(at >= 6 ? at - 6 : at + 6);
      var a = Math.atan2(p.y - q.y, p.x - q.x) * 180 / Math.PI;
      if (at < 6) a += 180;
      tip.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ') rotate(' + a.toFixed(1) + ') scale(3.2)');
    }

    /* t runs 0..1 over FADE seconds. The bullet finishes at CROSS/FADE
       (= 0.75) of that; the fading edge finishes at 1. */
    function paint(t) {
      var head = Math.min(1, t / (CROSS / FADE)) * len;   /* the bullet, at its own speed */
      var foot = t * len;                                  /* the fading edge, at 75% of it */
      window_(path, foot, head);
      /* The dim tail keeps its length until the fading edge is a tail's
         length from the end, then shortens with it, so it leaves the
         band with the line rather than parking a stub at the edge. */
      if (dim) window_(dim, foot - TAIL * len * Math.min(1, (1 - t) / TAIL), foot);
      placeTip(head);
      tip.style.opacity = t < 1 ? 1 : 0;   /* gone with the line once it has left */
    }

    fit();
    var rs = null;
    window.addEventListener('resize', function () { clearTimeout(rs); rs = setTimeout(fit, 120); });

    ScrollTrigger.create({
      trigger: band,
      start: 'top 75%',
      once: true,
      onEnter: function () {
        gsap.to(run, { t: 1, duration: FADE, ease: 'none', onUpdate: function () { paint(run.t); } });
      }
    });
  }

  /* ---- bars and slices: arrive once, as the band arrives ---- */
  var bars   = band.querySelectorAll('.ch-bar');
  var slices = band.querySelectorAll('.ch-slice');

  if (bars.length) gsap.set(bars, { scaleY: 0, transformOrigin: '50% 100%' });
  if (slices.length) gsap.set(slices, { opacity: 0, scale: 0.92, transformOrigin: '50% 50%' });

  ScrollTrigger.create({
    trigger: band,
    start: 'top 70%',
    once: true,
    onEnter: function () {
      if (bars.length) gsap.to(bars, {
        scaleY: 1, duration: 0.9, ease: 'power3.out', stagger: 0.07
      });
      if (slices.length) gsap.to(slices, {
        opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out', stagger: 0.09, delay: 0.2
      });
    }
  });

  /* Loading already scrolled past the band must not leave it blank:
     ScrollTrigger fires onEnter for triggers already past on refresh,
     and the scrub tween lands at its final state. Both are covered. */
})();
