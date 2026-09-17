/* ==========================================================
   Silver Bullet — nav dropdown

   Each dropdown is a <details>, so opening, closing and keyboard
   operation already work with this file absent. Everything here is
   enhancement on top of that:

     - hover to open, on fine pointers only. On touch, hover either
       does not exist or fires on the tap that was meant to open it,
       which produces a menu that opens and shuts in one gesture.
     - a close delay, so crossing the gap between the summary and the
       panel does not shut it in your face.
     - Escape closes and hands focus back to the summary.
     - a click anywhere else closes it.
     - opening one dropdown closes any other.
     - inside Capabilities, the group columns are accordions on a
       phone and held-open columns on desktop.

   Self-initialising like intro.js rather than routed through boot.js,
   so it does not wait on GSAP and does not need a line in a file two
   other things already share.
   ========================================================== */

(function () {
  'use strict';

  var CLOSE_DELAY = 220;   /* ms of grace when the pointer leaves */

  /* Every dropdown on the page, not just the first: Capabilities and
     Resources both use this, and a third would get it for free. */
  var dds = Array.prototype.slice.call(document.querySelectorAll('.nav-dd'));
  if (!dds.length) return;

  /* Not a media query listener: this is re-read on each event so a
     hybrid device that switches between trackpad and touch gets the
     right behaviour per interaction rather than per page load. */
  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)');
  var MOBILE = window.matchMedia('(max-width: 760px)');

  function closeAll(except) {
    dds.forEach(function (d) { if (d !== except) d.open = false; });
  }

  dds.forEach(function (dd) {
    var summary = dd.querySelector(':scope > summary');
    if (!summary) return;

    var shut = null;

    function close() {
      clearTimeout(shut);
      dd.open = false;
    }

    dd.addEventListener('mouseenter', function () {
      if (!fine.matches) return;
      clearTimeout(shut);
      closeAll(dd);
      dd.open = true;
    });

    dd.addEventListener('mouseleave', function () {
      if (!fine.matches) return;
      clearTimeout(shut);
      shut = setTimeout(function () { dd.open = false; }, CLOSE_DELAY);
    });

    /* Opening one by click or keyboard shuts the other, so two panels
       are never open side by side. */
    dd.addEventListener('toggle', function () {
      if (dd.open) closeAll(dd);
    });

    /* Choosing something closes the menu. Without this the panel is still
       sitting there when the anchor jump lands, over the thing you asked
       to see. */
    dd.addEventListener('click', function (e) {
      if (e.target.closest('.nav-dd__panel a')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dd.open) {
        close();
        summary.focus();
      }
    });
  });

  document.addEventListener('click', function (e) {
    dds.forEach(function (dd) {
      if (dd.open && !dd.contains(e.target)) dd.open = false;
    });
  });

  /* ---- the group accordions inside Capabilities -----------------
     Each group column is its own <details>. On desktop they are held
     open and read as headed columns; on a phone they start closed, so
     the menu is "Capabilities > B2B / B2C > the list" rather than
     twelve rows at once. The summaries are taken out of the tab order
     on desktop so Tab walks the links, not the column heads. */
  function syncGroups() {
    var groups = document.querySelectorAll('.nav-dd__group');
    Array.prototype.forEach.call(groups, function (g) {
      var head = g.querySelector(':scope > summary');
      if (MOBILE.matches) {
        g.open = false;
        if (head) head.removeAttribute('tabindex');
      } else {
        g.open = true;
        if (head) head.setAttribute('tabindex', '-1');
      }
    });
  }

  /* A desktop toggle on a group (Enter on a summary that got focus
     somehow) must not collapse a column. */
  document.addEventListener('toggle', function (e) {
    var g = e.target;
    if (g.classList && g.classList.contains('nav-dd__group') && !MOBILE.matches && !g.open) g.open = true;
  }, true);

  syncGroups();
  if (MOBILE.addEventListener) MOBILE.addEventListener('change', syncGroups);
  else if (MOBILE.addListener) MOBILE.addListener(syncGroups);
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
