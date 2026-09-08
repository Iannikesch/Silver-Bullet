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

  /* Once per browser session, not once per page load.

     Every page carries .intro-layer, so with this false the full 2.4s
     bullet sequence replayed on every single navigation — click a case
     card and the ticker rides out, comes back, and the amber CTA fades
     in again on the nav's beat. On the home page that reads as the
     intro. Clicking into a case study it just reads as the banner
     glitching, because nobody asked for it a second time.

     A fresh tab still gets the intro. Moving around the site does not. */
  var ONCE_PER_SESSION = true;

  var TOTAL_MS = 2400;         // full sequence, including the page fade
  var KEY = 'sb-intro-seen';

  var body = document.body;
  var layer = document.querySelector('.intro-layer');
  var logo = document.querySelector('.logo');

  /* sessionStorage throws outright in some privacy contexts rather than
     returning null. Both calls were unreachable while ONCE_PER_SESSION was
     false; now they are not, and a throw between adding .is-intro and
     scheduling finish() would leave the class on <body> for good. Treat an
     unreadable store as "not seen" and an unwritable one as a no-op — the
     intro replaying is a far smaller problem than it never ending. */
  function seenThisSession() {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* nothing to do */ }
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = ONCE_PER_SESSION && seenThisSession();

  if (reduced || seen || !layer || !logo) {
    if (layer) layer.remove();
    return;   /* scrollRestoration deliberately left alone — see below */
  }

  /* ---- the page must be at the top for any of this to make sense ----
     Browsers restore the previous scroll position on reload, and the
     intro assumes it is playing at the top of the document: the bullet
     crosses the viewport, draws the nav rule and hands off to the logo,
     while <main> fades up underneath. Reload while scrolled down and
     all of that plays over the middle of the page, which reads as the
     animation glitching rather than as the page being scrolled.

     It only looks broken SOME of the time, which is what makes it hard
     to place: it depends entirely on where you happened to be when you
     hit reload.

     Taken over only on the path where the intro actually runs. The
     early return above leaves scrollRestoration at 'auto', so once
     ONCE_PER_SESSION is flipped on, returning visitors who skip the
     intro keep normal browser behaviour and come back where they were.

     Set before .is-intro is added, and before Lenis exists — motion.js
     loads after this file, so Lenis reads a document already at 0. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

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
  if (ONCE_PER_SESSION) markSeen();

  /* Any sign of impatience skips straight to the finished state. */
  window.addEventListener('wheel', finish, { passive: true, once: true });
  window.addEventListener('touchstart', finish, { passive: true, once: true });
  window.addEventListener('keydown', finish, { once: true });
  window.addEventListener('pointerdown', finish, { once: true });

  setTimeout(finish, TOTAL_MS);
})();
