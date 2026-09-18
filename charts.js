/* ==========================================================
   Silver Bullet — the punchline charts

   Three decorative SVG charts around the "Data-driven performance
   marketing" headline on the home page. The SVG is static and
   complete in index.html; this file only animates it.

     - the line is static; this file only refits its viewBox to the
       band's aspect so it runs corner to edge uniformly.
     - the bars rise from the baseline once, left to right, and the
       pie's slices arrive once, in order, as the section arrives.
     - the five small motifs (heatmap, isotype grid, stacked area,
       stacked bars, horizontal bars) start together as the pie lands,
       each drawing itself in its own direction, all done within about
       a second.

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

  /* ---- the line: static, refitted to the band ----
     The design is 1400 wide on a 700-high canvas. The viewBox is refit
     to the band's real aspect and the points rescaled to it, so the line
     runs corner to edge uniformly whatever the band's proportions. */
  var svg   = band.querySelector('.ch--line');
  var path  = band.querySelector('.ch-path');
  var maskAll  = band.querySelector('.ch-mask__all');
  var maskText = band.querySelector('.ch-mask__text');

  if (svg && path) {
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
      if (maskAll)  maskAll.setAttribute('height', H.toFixed(1));
      if (maskText) { maskText.setAttribute('cy', (H / 2).toFixed(1)); maskText.setAttribute('ry', (105 * k).toFixed(1)); }
      var m = svg.querySelector('#ch-text-mask'); if (m) m.setAttribute('height', H.toFixed(1));
    }

    fit();
    var rs = null;
    window.addEventListener('resize', function () { clearTimeout(rs); rs = setTimeout(fit, 120); });
  }

  /* ---- bars and slices arrive once, as the band arrives; the five
          small motifs draw in together as those finish ---- */
  var bars   = band.querySelectorAll('.ch-bar');
  var slices = band.querySelectorAll('.ch-slice');
  var cells  = band.querySelectorAll('.ch-cell');
  var segs   = band.querySelectorAll('.ch-seg');
  var people = band.querySelectorAll('.ch-person');
  var hbars  = band.querySelectorAll('.ch-hbar');
  var bands  = band.querySelectorAll('.ch-band');

  if (bars.length)   gsap.set(bars,   { scaleY: 0, transformOrigin: '50% 100%' });
  if (slices.length) gsap.set(slices, { opacity: 0, scale: 0.92, transformOrigin: '50% 50%' });
  if (cells.length)  gsap.set(cells,  { opacity: 0 });
  if (segs.length)   gsap.set(segs,   { scaleX: 0, transformOrigin: '0% 50%' });
  if (people.length) gsap.set(people, { opacity: 0, scale: 0.8, transformOrigin: '50% 50%' });
  if (hbars.length)  gsap.set(hbars,  { scaleX: 0, transformOrigin: '0% 50%' });
  if (bands.length)  gsap.set(bands,  { opacity: 0, scaleY: 0, transformOrigin: '50% 100%' });

  ScrollTrigger.create({
    trigger: band,
    start: 'top 70%',
    once: true,
    onEnter: function () {
      var tl = gsap.timeline();
      /* the bars, then the pie, as before */
      if (bars.length) tl.to(bars, {
        scaleY: 1, duration: 0.9, ease: 'power3.out', stagger: 0.07
      }, 0);
      if (slices.length) tl.to(slices, {
        opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out', stagger: 0.09
      }, 0.2);
      /* the five small motifs all start together as the pie lands, each
         drawing itself in its own direction, and all done within a
         second so the band is still by about 2s:
           heatmap    cell by cell from the top-left corner
           figures    from the bottom-right back to the top-left
           stacked    segments growing from the left
           h. bars    growing from the left
           area       the bottom band first, rising */
      var AT = 1.1;
      if (cells.length) tl.to(cells, {
        opacity: 1, duration: 0.4, ease: 'power2.out',
        stagger: { amount: 0.6, grid: [10, 16], from: 'start' }
      }, AT);
      if (people.length) tl.to(people, {
        opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out',
        stagger: { amount: 0.55, from: 'end' }
      }, AT);
      if (segs.length) tl.to(segs, {
        scaleX: 1, duration: 0.6, ease: 'power3.out', stagger: 0.05
      }, AT);
      if (hbars.length) tl.to(hbars, {
        scaleX: 1, duration: 0.6, ease: 'power3.out', stagger: 0.07
      }, AT);
      if (bands.length) tl.to(bands, {
        opacity: 1, scaleY: 1, duration: 0.7, ease: 'power3.out',
        stagger: { each: 0.12, from: 'end' }
      }, AT);
    }
  });

  /* Loading already scrolled past the band must not leave it blank:
     ScrollTrigger fires onEnter for triggers already past on refresh. */
})();
