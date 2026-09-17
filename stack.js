/* ==========================================================
   Silver Bullet — the stack

   Two things, both small, for the sticky pair wrapped in [data-stack]:

   1. The pin height. .work pins with a negative sticky top, and CSS
      cannot say "a fifth of my own height" - a percentage top measures
      the viewport. So this measures the section and writes --stack-pin
      in pixels, again on resize. If the section is taller than the
      viewport, the pin is pushed further up so the bottom of it has been
      seen before it holds; nothing gets cut off.

   2. The push-back. As the cover slides up, --stack-progress goes 0 to 1
      and the stylesheet turns that into a 5% scale-down and a 40% dim.
      Read once per frame, only while the stack is on screen, written
      only when it changes. No library: the site's other small scripts
      (nav, booking, the slider) all run without GSAP, and so does this.

   Same doctrine as those: the markup works with this file absent. The
   pin still happens on the CSS fallback (-20vh) and the cover still
   covers; only the measured pin height and the push-back need JS.
   ========================================================== */

(function () {
  'use strict';

  var stack = document.querySelector('[data-stack]');
  if (!stack) return;
  var pinned = stack.querySelector('[data-stack-pinned]');
  var cover  = stack.querySelector('[data-stack-cover]');
  if (!pinned || !cover) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  var NARROW  = window.matchMedia('(max-width: 767px)');

  /* ---- 1. the pin height ------------------------------------------ */
  var pinPx = 0;
  function measure() {
    var h  = pinned.offsetHeight;
    var vh = window.innerHeight;
    /* A fifth of the section, or enough that its bottom clears the
       viewport before it pins - whichever is the bigger offset. */
    pinPx = Math.max(Math.round(h * 0.2), h - vh);
    pinned.style.setProperty('--stack-pin', (-pinPx) + 'px');
  }

  /* ---- 2. the push-back ------------------------------------------- */
  var last = -1;
  var queued = false;

  function progress() {
    /* 0 when the cover's top edge sits at the bottom of the pinned
       section's visible area, 1 once it has reached the top of the
       viewport and the pinned section is fully behind it. Measured from
       the cover, not from scrollY, so it is correct whatever the pin
       height is and however the layout above it changes. */
    var coverTop = cover.getBoundingClientRect().top;
    var visible  = pinned.offsetHeight - pinPx;   /* px of .work on screen when pinned */
    if (visible <= 0) return 0;
    var p = 1 - coverTop / visible;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  function paint() {
    queued = false;
    if (REDUCED.matches || NARROW.matches) {
      if (last !== 0) { pinned.style.setProperty('--stack-progress', '0'); last = 0; }
      return;
    }
    var p = Math.round(progress() * 1000) / 1000;
    if (p === last) return;
    last = p;
    pinned.style.setProperty('--stack-progress', String(p));
  }

  /* Only do the per-frame read while the stack is actually on screen;
     the rest of the page should not pay for it. */
  var onstage = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onstage = entries[0].isIntersecting;
      if (onstage) schedule();
    }, { rootMargin: '120px 0px' }).observe(stack);
  }

  function schedule() {
    if (queued || !onstage) return;
    queued = true;
    requestAnimationFrame(paint);
  }

  window.addEventListener('scroll', schedule, { passive: true });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { measure(); last = -1; schedule(); }, 150);
  });

  /* Fonts and images can change the section's height after first paint;
     re-measure once they have settled. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { measure(); schedule(); });
  }
  window.addEventListener('load', function () { measure(); schedule(); });

  measure();
  schedule();
})();
