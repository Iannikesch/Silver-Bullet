/* ==========================================================
   Silver Bullet — testimonial slider

   Turns the stacked quote list in the testimonials band into
   one-at-a-time with dots, matching inboundmedia.co's slider.

   Same doctrine as nav.js: the markup works with this file
   absent. Without it every quote is stacked and readable, so
   there is no state where a visitor sees one quote and no way
   to reach the others. This file only narrows that down, and
   it builds the dots itself for the same reason — a row of
   dots that cannot do anything is worse than no dots.

   Autoplays, but on a short leash. This is the fourth thing
   on the page that moves unasked, which DESIGN.md warned would
   need re-examining - see "The fourth mover" there for why it
   is allowed and what holds it in place.

   The leash, in short: 7s rather than the reference's 4s,
   because a quote is read rather than glanced at; it holds
   still while hovered or focused; it never runs off screen or
   in a background tab; and the first deliberate advance - dot,
   arrow key or swipe - ends it for good. Reduced motion never
   starts it at all.

   Self-initialising rather than routed through boot.js, so it
   does not wait on GSAP and keeps working if the CDN is
   blocked.
   ========================================================== */

(function () {
  'use strict';

  var SWIPE_MIN = 40;     /* px before a drag counts as a swipe */
  var AUTO_MS  = 7000;    /* dwell per quote. Long: this is body copy. */

  var REDUCED   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CAN_HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var root = document.querySelector('[data-testimonials]');
  if (!root) return;

  var list = root.querySelector('[data-tq-list]');
  if (!list) return;

  var slides = Array.prototype.slice.call(list.querySelectorAll('.tq-item'));

  /* One quote is not a slider. Leave it stacked and add nothing —
     no dots, no listeners, no grid collapse. */
  if (slides.length < 2) return;

  var current = 0;

  /* ---- dots ------------------------------------------------------
     Built from the list rather than authored in the HTML, so adding
     or removing a slide is the whole edit. */
  /* A <div role="group">, not a <ul role="tablist">.
     These are carousel dots, not tabs: there is no tabpanel for them to
     control and no tab semantics for a screen reader to act on. The
     tablist markup also failed three axe rules at once, because a tablist
     must contain tabs DIRECTLY - the <li> wrappers broke the required
     parent/child pair, and the <li>s themselves lost their list semantics
     to the role on the <ul>:

       aria-required-children | aria-required-parent | listitem

     Buttons in a labelled group, with aria-current marking the one you are
     on, says exactly what this is and validates clean. */
  var dots = document.createElement('div');
  dots.className = 'tq-dots';
  dots.setAttribute('role', 'group');
  dots.setAttribute('aria-label', 'Choose a testimonial');

  var buttons = slides.map(function (slide, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tq-dot';
    b.setAttribute('aria-label', 'Testimonial ' + (i + 1) + ' of ' + slides.length);
    b.addEventListener('click', function () { surrender(); go(i); });
    dots.appendChild(b);
    return b;
  });

  /* ---- height ----------------------------------------------------
     The slides share one grid cell so the band cannot jump, but that
     means the cell sizes to the TALLEST quote and every shorter one
     leaves the difference as dead space under its attribution. These
     four differ by 111px at desktop, which is about two lines.

     So the cell is measured to the current slide and eased between
     them, matching the reference. Measured off .tq-fig rather than
     the <li>, because the <li> is the grid item and its box is the
     thing being sized. */
  function resize() {
    var fig = slides[current].querySelector('.tq-fig');
    if (!fig) return;
    list.style.height = fig.getBoundingClientRect().height + 'px';
  }

  function go(i) {
    current = (i + slides.length) % slides.length;

    slides.forEach(function (slide, n) {
      var on = n === current;
      slide.classList.toggle('is-current', on);
      /* The off-screen slides stay in the layout to hold the height,
         so they have to be hidden from the accessibility tree and
         from find-in-page explicitly. */
      slide.setAttribute('aria-hidden', on ? 'false' : 'true');
      if ('inert' in slide) slide.inert = !on;
    });

    buttons.forEach(function (b, n) {
      if (n === current) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
      /* Only the active dot is a tab stop; arrow keys move between
         them. Standard roving-tabindex behaviour, and it keeps the band from
         costing a keyboard user three tabs to get past. */
      b.tabIndex = n === current ? 0 : -1;
    });

    resize();
  }

  /* ---- keyboard --------------------------------------------------
     Bound on the dot row, not the document: arrow keys belong to the
     page until focus is actually in here. */
  dots.addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    surrender();
    go(current + d);
    buttons[current].focus();
  });

  /* ---- swipe -----------------------------------------------------
     Pointer events, so it is one path for touch and trackpad drag.
     Horizontal-only test: a vertical drag is the visitor scrolling
     the page and must not be stolen. */
  var startX = 0, startY = 0, tracking = false;

  root.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    tracking = true;
    startX = e.clientX;
    startY = e.clientY;
  });

  root.addEventListener('pointerup', function (e) {
    if (!tracking) return;
    tracking = false;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy)) return;
    surrender();
    go(current + (dx < 0 ? 1 : -1));
  });

  root.addEventListener('pointercancel', function () { tracking = false; });

  /* ---- reflow ----------------------------------------------------
     A measured height is only right until the quote rewraps. Three
     things do that: the viewport changing width, the webfont landing
     after first measure, and the browser's own text-size settings.
     ResizeObserver catches all three by watching the element itself
     rather than guessing at causes - and it fires once on observe,
     which is what sets the initial height. */
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { resize(); });
    slides.forEach(function (s) {
      var fig = s.querySelector('.tq-fig');
      if (fig) ro.observe(fig);
    });
  } else {
    /* No ResizeObserver: width changes are the case that actually
       matters, and this is the last browser generation that needs it. */
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(resize, 150);
    });
  }

  /* ---- autoplay --------------------------------------------------
     Four separate reasons to hold still, resolved in one place rather
     than each handler clearing the timer itself. Same shape as
     applyRate() in motion.js and for the same reason: these overlap
     constantly - hovering a dot also focuses it - and a handler that
     owns the timer directly will cancel the other one's stop.

     `stopped` is the one-way door. Once a visitor has worked the dots,
     the arrows or a swipe they have said which quote they want, and
     the band must never take it away from them again. Under reduced
     motion it starts closed. */
  var timer = null;
  var stopped = REDUCED;
  var hovered = false, focused = false, onScreen = false;

  function autoplayWanted() {
    return !stopped && onScreen && !hovered && !focused && !document.hidden;
  }

  function applyAutoplay() {
    var want = autoplayWanted();
    if (want && !timer) {
      timer = setInterval(function () { go(current + 1); }, AUTO_MS);
    } else if (!want && timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function surrender() {
    stopped = true;
    applyAutoplay();
  }

  /* Hover only where hovering is real. On touch, pointerenter fires on
     tap and the matching pointerleave often never does, which would
     wedge the band paused for the rest of the visit. */
  if (CAN_HOVER) {
    root.addEventListener('pointerenter', function () { hovered = true;  applyAutoplay(); });
    root.addEventListener('pointerleave', function () { hovered = false; applyAutoplay(); });
  }

  /* Focus outranks nothing here - it is simply a fifth reason to stop -
     but it is what gives a keyboard user the pause WCAG 2.2.2 asks for,
     since they cannot hover to get one. */
  root.addEventListener('focusin',  function () { focused = true;  applyAutoplay(); });
  root.addEventListener('focusout', function () { focused = false; applyAutoplay(); });

  document.addEventListener('visibilitychange', applyAutoplay);

  /* Off screen it must not advance. Otherwise the band burns through
     quotes nobody is reading and the visitor scrolls down to find it
     already three in, having missed the one that opens the set. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      applyAutoplay();
    }, { threshold: 0.4 }).observe(root);
  } else {
    onScreen = true;
  }

  /* ---- boot ------------------------------------------------------
     The class goes on last. Until it does, the stacked list is what
     is on screen, so a throw anywhere above this leaves the band in
     its readable state rather than showing one quote with no dots. */
  root.appendChild(dots);
  root.classList.add('is-slider');
  go(0);
  applyAutoplay();
})();
