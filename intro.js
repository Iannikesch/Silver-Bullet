/* ==========================================================
   Silver Bullet — the bullet intro

   Deliberately free of dependencies, and loaded BEFORE the motion
   libraries so it never waits on a CDN. As a deferred script placed
   after them it would only start once GSAP, ScrollTrigger, SplitText
   and Lenis had all downloaded — the page would sit in its finished
   state and then suddenly play the intro.

   The sequence itself is CSS, orchestrated by .is-intro on <body>.
   ========================================================== */

(function () {
  'use strict';

  /* Flip to true to show the intro only once per browser session.
     Left false so it replays on every reload while we're tuning it. */
  var ONCE_PER_SESSION = false;

  var TOTAL_MS = 2400;         // full sequence, including the page fade
  var KEY = 'sb-intro-seen';

  var body = document.body;
  var layer = document.querySelector('.intro-layer');
  var logo = document.querySelector('.logo');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = ONCE_PER_SESSION && sessionStorage.getItem(KEY) === '1';

  if (reduced || seen || !layer || !logo) {
    if (layer) layer.remove();
    return;
  }

  /* Measure the logo where it naturally sits, then work out how far right
     it would have to start to be dead centre. The animation runs that in
     reverse: centre -> resting place. */
  var box = logo.getBoundingClientRect();
  var shift = (window.innerWidth / 2) - (box.left + box.width / 2);
  document.documentElement.style.setProperty('--logo-shift', shift + 'px');

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    body.classList.remove('is-intro');
    if (layer) layer.remove();
    window.removeEventListener('wheel', finish);
    window.removeEventListener('touchstart', finish);
    window.removeEventListener('keydown', finish);
    window.removeEventListener('pointerdown', finish);
  }

  body.classList.add('is-intro');
  if (ONCE_PER_SESSION) sessionStorage.setItem(KEY, '1');

  /* Any sign of impatience skips straight to the finished state. */
  window.addEventListener('wheel', finish, { passive: true, once: true });
  window.addEventListener('touchstart', finish, { passive: true, once: true });
  window.addEventListener('keydown', finish, { once: true });
  window.addEventListener('pointerdown', finish, { once: true });

  setTimeout(finish, TOTAL_MS);
})();
