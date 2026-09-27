/* ==========================================================
   Silver Bullet - work belt videos

   The three vertical clips in the creative conveyor. They carry
   data-src rather than src so they cost nothing until the belt is
   near the viewport, which is the same arrangement reel.js uses for
   the hero belt and for the same reason: autoplay forces a browser
   to fetch the file immediately, and 116KB of video arriving at
   202ms starves the stylesheet that gates first paint.

   Nothing visible is deferred by this. Chrome only plays a muted
   video while it is actually in the viewport, so these clips were
   already sitting paused at currentTime 0 until scrolled to.

   Self-initialising and library-free, same as nav.js and roll.js.
   ========================================================== */

(function () {
  'use strict';

  var vids = document.querySelectorAll('video.slot__v[data-src]');
  if (!vids.length) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function load(v) {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    var p = v.getAttribute('data-poster');
    if (p) v.poster = p;
    v.preload = 'auto';
    v.src = v.getAttribute('data-src');
    /* Under reduced motion the clip is a still: the poster is already
       set above, so load the first frame and hold it. */
    if (REDUCED) { v.load(); return; }
    var go = v.play();
    /* play() rejects when the tab is hidden or the clip is off screen.
       That is the browser being correct, not a failure, and it will
       autoplay itself once visible now that a src is attached. */
    if (go && go.catch) go.catch(function () {});
  }

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(vids, load);
    return;
  }

  /* A generous margin because the conveyor travels at 70px/s: a slot
     must already hold a frame by the time it slides into view. */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      load(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: '600px 1200px' });

  Array.prototype.forEach.call(vids, function (v) { io.observe(v); });
})();
