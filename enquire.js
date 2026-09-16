/* ==========================================================
   Silver Bullet — enquiry form reveal

   The form sits behind a <details> in the contact section, so
   opening, closing and keyboard operation all work with this file
   absent. This is the one thing it adds:

     Arriving on #contact from a CTA elsewhere opens the form.

   Every "Talk to us", "Connect with us" and "See if you qualify"
   on the site links to #contact. A visitor who clicked one of
   those has already pressed a button, and landing on a second
   button that says "Start the conversation" would be asking them
   to do it twice. So a hash of #contact - on load, or on a
   same-page anchor click - opens the panel. Scrolling to the
   section on your own leaves it closed, which is the pattern.

   Self-initialising, GSAP-free, same as nav.js.
   ========================================================== */

(function () {
  'use strict';

  var reveal = document.querySelector('.cform-reveal');
  if (!reveal) return;

  function openIfTargeted() {
    if (location.hash !== '#contact') return;
    if (reveal.open) return;
    reveal.open = true;
  }

  /* On load: a deep link, a reload, or a nav from another page. */
  openIfTargeted();

  /* On a same-page anchor click. Lenis intercepts these and scrolls
     without changing location.hash, so listen for the click itself
     rather than hashchange. Capture phase, so it runs even when the
     smooth-scroll handler later stops propagation. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href$="#contact"]');
    if (!a) return;
    /* Only same-document anchors - a link to index.html#contact from
       another page is a real navigation, and the load path handles it. */
    var href = a.getAttribute('href');
    if (href !== '#contact' && href.indexOf(location.pathname.split('/').pop()) === -1) return;
    reveal.open = true;
  }, true);

  window.addEventListener('hashchange', openIfTargeted);
})();
