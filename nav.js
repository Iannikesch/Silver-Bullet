/* ==========================================================
   Silver Bullet — nav dropdown

   The dropdown is a <details>, so opening, closing and keyboard
   operation already work with this file absent. Everything here is
   enhancement on top of that:

     - hover to open, on fine pointers only. On touch, hover either
       does not exist or fires on the tap that was meant to open it,
       which produces a menu that opens and shuts in one gesture.
     - a close delay, so crossing the gap between the summary and the
       panel does not shut it in your face.
     - Escape closes and hands focus back to the summary.
     - a click anywhere else closes it.

   Self-initialising like intro.js rather than routed through boot.js,
   so it does not wait on GSAP and does not need a line in a file two
   other things already share.
   ========================================================== */

(function () {
  'use strict';

  var CLOSE_DELAY = 220;   /* ms of grace when the pointer leaves */

  var dd = document.querySelector('.nav-dd');
  if (!dd) return;

  var summary = dd.querySelector('summary');
  if (!summary) return;

  /* Not a media query listener: this is re-read on each event so a
     hybrid device that switches between trackpad and touch gets the
     right behaviour per interaction rather than per page load. */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');

  var shut = null;

  function close() {
    clearTimeout(shut);
    dd.open = false;
  }

  dd.addEventListener('mouseenter', function () {
    if (!fine.matches) return;
    clearTimeout(shut);
    dd.open = true;
  });

  dd.addEventListener('mouseleave', function () {
    if (!fine.matches) return;
    clearTimeout(shut);
    shut = setTimeout(function () { dd.open = false; }, CLOSE_DELAY);
  });

  /* Choosing something closes the menu. Without this the panel is still
     sitting there when the anchor jump lands, over the thing you asked
     to see. */
  dd.addEventListener('click', function (e) {
    if (e.target.closest('.nav-dd__panel a')) close();
  });

  document.addEventListener('click', function (e) {
    if (dd.open && !dd.contains(e.target)) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dd.open) {
      close();
      summary.focus();
    }
  });
})();


/* ==========================================================
   Silver Bullet — mobile nav

   The burger toggles one class on <body>; CSS owns everything
   visual. Kept in this file rather than boot.js for the same
   reason the dropdown is: it does not need GSAP, so it should
   not wait on it.

   Without JS the panel stays closed and the links are
   unreachable below 760px — which is exactly where the site
   already was, so this is not a regression. It is the reason
   the CAPABILITIES dropdown is a <details> and this is not:
   that one had a no-JS story worth keeping, this one is the
   no-JS story being improved.
   ========================================================== */

(function () {
  'use strict';

  var burger = document.querySelector('.nav-burger');
  var nav    = document.getElementById('site-nav');
  if (!burger || !nav) return;

  var MOBILE = window.matchMedia('(max-width: 760px)');

  function setOpen(open) {
    document.body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function isOpen() { return document.body.classList.contains('nav-open'); }

  burger.addEventListener('click', function () { setOpen(!isOpen()); });

  /* Any navigation closes it. Includes the in-page anchors, which would
     otherwise scroll behind a panel that is still covering the page. */
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      burger.focus();          /* hand focus back rather than dropping it */
    }
  });

  /* Rotating a phone or dragging a window past the breakpoint must not
     leave body.nav-open stuck on a layout that has no burger to undo it. */
  function onBreakpoint(e) { if (!e.matches) setOpen(false); }
  if (MOBILE.addEventListener) MOBILE.addEventListener('change', onBreakpoint);
  else if (MOBILE.addListener) MOBILE.addListener(onBreakpoint);
})();
