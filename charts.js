/* ==========================================================
   Silver Bullet — the punchline charts

   Three decorative SVG charts around the "Data-driven performance
   marketing" headline on the home page. The SVG is static and
   complete in index.html; this file only animates it.

     - the line draws itself as the section scrolls into view, and
       the bullet at its tip rides along as it does. Scrubbed to
       scroll position, so it is still when you are and reverses
       when you go back up. That is the reason it is allowed: it
       answers scroll, not a clock (DESIGN.md, Motion).
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

  /* ---- the line: draws with scroll, the bullet rides the tip ---- */
  var svg  = band.querySelector('.ch--line');
  var path = band.querySelector('.ch-path');
  var tip  = band.querySelector('.ch-tip');
  var maskAll  = band.querySelector('.ch-mask__all');
  var maskText = band.querySelector('.ch-mask__text');
  var len = 0;
  var draw = { t: 0 };

  if (svg && path && tip) {
    /* The design is on a 1400 x 700 canvas (data-points, data-height).
       The band is rarely 2:1, and a 2:1 drawing scaled to fit a shorter
       band gets letterboxed: the line stopped 134px short of the corner on
       a 620px band, and the pie crowded its end. So the viewBox is refit
       to the band's real aspect and the points rescaled to it. Uniform
       scale throughout, so the bullet keeps its shape. */
    var pts = svg.getAttribute('data-points').trim().split(/\s+/).map(function (pair) {
      var xy = pair.split(','); return { x: +xy[0], y: +xy[1] };
    });
    var designH = +svg.getAttribute('data-height') || 700;

    function fit() {
      var bw = band.clientWidth, bh = band.clientHeight;
      if (!bw || !bh) return;
      var H = 1400 * bh / bw, k = H / designH;
      svg.setAttribute('viewBox', '0 0 1400 ' + H.toFixed(1));
      path.setAttribute('d', 'M' + pts.map(function (p) { return p.x + ',' + (p.y * k).toFixed(1); }).join(' L'));
      if (maskAll)  { maskAll.setAttribute('height', H.toFixed(1)); }
      if (maskText) { maskText.setAttribute('cy', (H / 2).toFixed(1)); maskText.setAttribute('ry', (105 * k).toFixed(1)); }
      var m = svg.querySelector('#ch-text-mask'); if (m) m.setAttribute('height', H.toFixed(1));
      len = path.getTotalLength();
      path.style.strokeDasharray  = len;
      path.style.strokeDashoffset = len * (1 - draw.t);
      placeTip(draw.t);
    }

    /* The bullet's tail sits at the drawn tip, nose along the tangent, so
       the line runs into it and it reads as having just travelled the
       path. Sampling a little behind the point gives the direction. */
    function placeTip(t) {
      var at = Math.max(0, Math.min(1, t)) * len;
      var p  = path.getPointAtLength(at);
      var q  = path.getPointAtLength(at >= 6 ? at - 6 : at + 6);
      var a  = Math.atan2(p.y - q.y, p.x - q.x) * 180 / Math.PI;
      if (at < 6) a += 180;
      tip.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ') rotate(' + a.toFixed(1) + ') scale(3.2)');
    }

    fit();
    var rs = null;
    window.addEventListener('resize', function () { clearTimeout(rs); rs = setTimeout(fit, 120); });

    gsap.to(draw, {
      t: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: band,
        /* Starts drawing as the band's top clears the bottom of the
           viewport and finishes when the band is centred: the line is
           complete by the time the headline is where you read it. */
        start: 'top bottom',
        end: 'center center',
        scrub: 0.6            /* a beat of lag, so it reads as drawn rather than dragged */
      },
      onUpdate: function () {
        path.style.strokeDashoffset = len * (1 - draw.t);
        placeTip(draw.t);
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
