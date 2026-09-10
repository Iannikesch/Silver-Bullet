/* ==========================================================
   Silver Bullet — the verticals rail

   A carousel that never moves on its own.

   DESIGN.md closes the ambient-motion section with "there is no
   fifth", and an auto-advancing card rail would have been exactly
   that. This is the other kind of motion the same document calls
   welcome: it answers a pointer, a drag, a key or a scroll, and it
   is perfectly still when the visitor is. Same argument the reactive
   chrome and the marquee bands make.

   Doctrine follows testimonial-slider.js: self-initialising, no GSAP,
   and the markup works with this file absent. Without it the rail is
   a plain scroll-snap strip of six readable cards — every card at
   full size, nothing hidden, nothing dimmed. This file only adds the
   depth falloff and the arrows.

   The falloff itself is CSS. All this does is publish one number per
   card — --k, 0 at the middle of the rail and 1 out at the edges —
   and let the stylesheet decide what that means.
   ========================================================== */

(function () {
  'use strict';

  var rail = document.querySelector('[data-vrail]');
  if (!rail) return;

  var cards = Array.prototype.slice.call(rail.querySelectorAll('.vcard'));
  if (cards.length < 2) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Where the falloff starts and how far it runs, in card widths from the
     centre of the rail. FLAT keeps the two middle cards at full size and
     full strength - the pair the eye is meant to land on - and RAMP is the
     distance over which everything past them sinks away. */
  var FLAT = 0.62;
  var RAMP = 1.15;

  /* ---- publish --k -------------------------------------------------
     One read pass, then one write pass. Reading a rect inside the same
     loop that writes a transform would force a layout per card, per
     frame, on a strip that is being dragged - the exact read-after-write
     the rest of this site is careful to avoid. */
  var frame = 0;
  function measure() {
    frame = 0;

    var railBox = rail.getBoundingClientRect();

    /* The focus point, not the geometric centre.

       Measuring from the middle of the rail needs the rail padded by half
       its own width so the first card can reach it, and that padding is
       dead space sitting between the heading and the first card. Instead
       the cards start flush with the heading and the focus sits over the
       LEADING PAIR - one card plus half a gap in from the left edge of the
       scrollport. The two cards under it are the two at full strength, and
       everything to the right of them falls away. */
    var gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    var cardW = cards[0].offsetWidth;
    var pairFits = rail.clientWidth >= cardW * 2 + gap;
    var focus = pairFits ? cardW + gap / 2 : cardW / 2;
    var mid = railBox.left + focus;

    var i, boxes = [], widths = [];
    for (i = 0; i < cards.length; i++) {
      boxes.push(cards[i].getBoundingClientRect());
      /* offsetWidth, not box.width. box.width is the width AFTER the scale
         this file is itself responsible for, so dividing by it feeds the
         transform back into its own input: a card shrinks, its measured
         width shrinks, its distance in card-widths grows, and it shrinks
         further. The centre is safe to take from the rect - scale runs
         about the middle, so it does not move - but the divisor has to be
         the layout width, which no transform touches. */
      widths.push(cards[i].offsetWidth);
    }

    for (i = 0; i < cards.length; i++) {
      var box = boxes[i];
      var d = Math.abs((box.left + box.width / 2) - mid) / (widths[i] || 1);
      var k = (d - FLAT) / RAMP;
      k = k < 0 ? 0 : (k > 1 ? 1 : k);
      /* Eased rather than linear: a straight ramp makes the third card
         look like a mistake halfway between two states. */
      k = k * k * (3 - 2 * k);
      cards[i].style.setProperty('--k', k.toFixed(4));
    }
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(measure);
  }

  if (!REDUCED) {
    rail.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    measure();
    /* Images land after first paint and can change nothing about the
       geometry, but fonts and the clamp() card width can, so take one
       more reading once things have settled. */
    window.addEventListener('load', schedule);
  }

  /* ---- arrows ------------------------------------------------------
     Built here rather than authored in the HTML, for the same reason the
     testimonial dots are: a control that cannot do anything is worse than
     no control, and without this file there is nothing for them to do. */
  var nav = document.querySelector('[data-vrail-nav]');
  if (!nav) return;

  /* Steps a PAIR, because the rail presents a pair: moving one card at a
     time would leave the previously-lit card still half lit and read as a
     nudge rather than a turn. On a narrow screen only one card is central,
     so it steps one. */
  function step(dir) {
    var gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    var w = cards[0].offsetWidth + gap;
    var perStep = rail.clientWidth >= (cards[0].offsetWidth * 2 + gap) ? 2 : 1;
    rail.scrollBy({
      left: dir * w * perStep,
      behavior: REDUCED ? 'auto' : 'smooth'
    });
  }

  function button(dir, label, d) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'vrail-btn';
    b.setAttribute('aria-label', label);
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="' + d + '"></path></svg>';
    b.addEventListener('click', function () { step(dir); });
    return b;
  }

  var prev = button(-1, 'Previous', 'M15 6l-6 6l6 6');
  var next = button(1, 'Next', 'M9 6l6 6l-6 6');
  nav.appendChild(prev);
  nav.appendChild(next);

  /* Grey out at the ends rather than wrapping. A rail of six is a list
     with a beginning and an end, and looping it would hide that. */
  function ends() {
    /* 2px of slack: scrollLeft is fractional on a scaled display and on a
       snap-settled rail, so an exact comparison leaves the arrow live at a
       position the rail cannot actually move past. */
    var max = rail.scrollWidth - rail.clientWidth;
    prev.disabled = rail.scrollLeft <= 2;
    next.disabled = rail.scrollLeft >= max - 2;
  }
  rail.addEventListener('scroll', ends, { passive: true });
  window.addEventListener('resize', ends);
  ends();
})();
