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
  var path = band.querySelector('.ch-path');
  var tip  = band.querySelector('.ch-tip');
  if (path && tip) {
    var len = path.getTotalLength();
    path.style.strokeDasharray  = len;
    path.style.strokeDashoffset = len;

    /* Place the bullet at a fraction of the path, nose along the tangent.
       Sampling a little behind the point gives the direction; at the very
       start there is nothing behind, so it looks ahead instead. */
    function placeTip(t) {
      var at = Math.max(0, Math.min(1, t)) * len;
      var p  = path.getPointAtLength(at);
      var q  = path.getPointAtLength(at >= 6 ? at - 6 : at + 6);
      var a  = Math.atan2(p.y - q.y, p.x - q.x) * 180 / Math.PI;
      if (at < 6) a += 180;
      tip.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ') rotate(' + a.toFixed(1) + ') scale(1.7)');
    }
    placeTip(0);

    var draw = { t: 0 };
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
